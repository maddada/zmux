import Foundation
import Network

@MainActor
final class GhosttySessionHostBridge {
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private let listener: NWListener
    private var clients: [GhosttySessionHostWebSocketClient] = []
    private let onCommand: (GhosttySessionHostCommandEnvelope) -> Void
    private let onAllClientsDisconnected: () -> Void

    init(
        port: UInt16 = GhosttySessionHostProtocol.port,
        onCommand: @escaping (GhosttySessionHostCommandEnvelope) -> Void,
        onAllClientsDisconnected: @escaping () -> Void
    ) throws {
        self.onCommand = onCommand
        self.onAllClientsDisconnected = onAllClientsDisconnected

        let parameters = NWParameters.tcp
        let websocket = NWProtocolWebSocket.Options()
        websocket.autoReplyPing = true
        parameters.defaultProtocolStack.applicationProtocols.insert(websocket, at: 0)
        self.listener = try NWListener(using: parameters, on: NWEndpoint.Port(rawValue: port)!)
    }

    func start() {
        GhosttySessionHostDebugLog.append(
            event: "helper.listener.start",
            details: ["port": GhosttySessionHostProtocol.port])
        listener.newConnectionHandler = { [weak self] connection in
            Task { @MainActor in
                self?.accept(connection)
            }
        }
        listener.stateUpdateHandler = { state in
            GhosttySessionHostDebugLog.append(
                event: "helper.listener.state",
                details: ["state": state.debugDescription])
        }
        listener.start(queue: .main)
    }

    func send(_ event: GhosttySessionHostEvent) {
        guard let data = try? encoder.encode(event),
              let text = String(data: data, encoding: .utf8) else {
            return
        }
        clients.forEach { $0.send(text) }
    }

    private func accept(_ connection: NWConnection) {
        GhosttySessionHostDebugLog.append(event: "helper.acceptClient")
        let client = GhosttySessionHostWebSocketClient(connection: connection) { [weak self] text in
            self?.handle(text)
        } onClose: { [weak self] closedClient in
            guard let self else { return }
            self.clients.removeAll { $0 === closedClient }
            if self.clients.isEmpty {
                self.onAllClientsDisconnected()
            }
        }
        clients.append(client)
        client.start()
        client.sendEvent(.hostReady(
            protocolVersion: GhosttySessionHostProtocol.version,
            buildId: Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "dev"
        ))
    }

    private func handle(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        do {
            let command = try decoder.decode(GhosttySessionHostCommandEnvelope.self, from: data)
            if command.shouldLogReceive {
                GhosttySessionHostDebugLog.append(
                    event: "helper.receiveCommand",
                    details: ["command": command.debugName])
            }
            onCommand(command)
        } catch {
            GhosttySessionHostDebugLog.append(
                event: "helper.decodeCommandFailed",
                details: ["message": error.localizedDescription, "text": text])
            send(.terminalError(sessionId: "session-host", message: error.localizedDescription))
        }
    }
}

private extension GhosttySessionHostCommandEnvelope {
    var shouldLogReceive: Bool {
        switch self {
        case .setActiveTerminalSet, .setTerminalFrame:
            false
        default:
            true
        }
    }
}

private final class GhosttySessionHostWebSocketClient {
    private let connection: NWConnection
    private let encoder = JSONEncoder()
    private let onMessage: (String) -> Void
    private let onClose: (GhosttySessionHostWebSocketClient) -> Void
    private var didClose = false

    init(
        connection: NWConnection,
        onMessage: @escaping (String) -> Void,
        onClose: @escaping (GhosttySessionHostWebSocketClient) -> Void
    ) {
        self.connection = connection
        self.onMessage = onMessage
        self.onClose = onClose
    }

    func start() {
        connection.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            GhosttySessionHostDebugLog.append(
                event: "helper.client.state",
                details: ["state": state.debugDescription])
            if case .cancelled = state {
                self.close()
            }
            if case .failed = state {
                self.close()
            }
        }
        connection.start(queue: .main)
        receive()
    }

    func sendEvent(_ event: GhosttySessionHostEvent) {
        guard let data = try? encoder.encode(event),
              let text = String(data: data, encoding: .utf8) else {
            return
        }
        send(text)
    }

    func send(_ text: String) {
        GhosttySessionHostDebugLog.append(event: "helper.sendEvent")
        let metadata = NWProtocolWebSocket.Metadata(opcode: .text)
        let context = NWConnection.ContentContext(identifier: "zmux-ghostty-session-host-event", metadata: [metadata])
        connection.send(
            content: text.data(using: .utf8),
            contentContext: context,
            isComplete: true,
            completion: .contentProcessed { _ in }
        )
    }

    private func receive() {
        connection.receiveMessage { [weak self] data, context, _, error in
            guard let self else { return }
            if error != nil {
                self.close()
                return
            }
            if let metadata = context?.protocolMetadata(definition: NWProtocolWebSocket.definition)
                as? NWProtocolWebSocket.Metadata,
               metadata.opcode == .close {
                self.close()
                return
            }
            if let data,
               let text = String(data: data, encoding: .utf8) {
                self.onMessage(text)
            }
            self.receive()
        }
    }

    private func close() {
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-22:57
         Failed restart reconnects must release helper-side accepted sockets.
         Otherwise dead clients remain in CLOSE_WAIT and hide the real reason
         the UI app never receives hostReady or terminalReady.
         */
        guard !didClose else { return }
        didClose = true
        connection.cancel()
        onClose(self)
    }
}

private extension NWListener.State {
    var debugDescription: String {
        switch self {
        case .setup:
            "setup"
        case .waiting(let error):
            "waiting(\(error.localizedDescription))"
        case .ready:
            "ready"
        case .failed(let error):
            "failed(\(error.localizedDescription))"
        case .cancelled:
            "cancelled"
        @unknown default:
            "unknown"
        }
    }
}

private extension NWConnection.State {
    var debugDescription: String {
        switch self {
        case .setup:
            "setup"
        case .preparing:
            "preparing"
        case .ready:
            "ready"
        case .waiting(let error):
            "waiting(\(error.localizedDescription))"
        case .failed(let error):
            "failed(\(error.localizedDescription))"
        case .cancelled:
            "cancelled"
        @unknown default:
            "unknown"
        }
    }
}
