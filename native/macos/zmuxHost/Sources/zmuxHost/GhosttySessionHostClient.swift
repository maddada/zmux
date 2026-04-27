import AppKit
import Foundation
import Network
import OSLog

private let ghosttySessionHostClientLogger = Logger(
    subsystem: "com.zmux.host",
    category: "ghostty-session-host"
)

@MainActor
final class GhosttySessionHostClient {
    private let appInstanceId = UUID().uuidString
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private let onHostEvent: (HostEvent) -> Void
    private var connection: NWConnection?
    private var pendingCommands: [GhosttySessionHostCommand] = []
    private var isConnectionReady = false
    private var isReleasingLease = false
    private var reconnectAttempt = 0
    private var reconnectWorkItem: DispatchWorkItem?
    private var resurfaceWorkItem: DispatchWorkItem?
    private var lastLaunchRequestAt: Date?
    private var connectAttempt = 0
    private var hostedTerminals: [String: GhosttyHostedCreateTerminal] = [:]
    private var hostedTerminalFrames: [String: (frame: GhosttyHostFrame, visible: Bool)] = [:]
    private var hostedActiveTerminalSet = GhosttyHostedActiveTerminalSet(
        sessionIds: [],
        focusedSessionId: nil,
        attentionSessionIds: []
    )
    private var isHostAppActive = false
    private var isModalPresentationActive = false
    private var timeoutSeconds: TimeInterval

    init(timeoutSeconds: TimeInterval, onHostEvent: @escaping (HostEvent) -> Void) {
        self.timeoutSeconds = timeoutSeconds
        self.onHostEvent = onHostEvent
    }

    func start() {
        isReleasingLease = false
        connect()
    }

    func configureTimeout(seconds: TimeInterval) {
        timeoutSeconds = max(0, seconds)
        send(.configureLease(timeoutSeconds: timeoutSeconds))
    }

    func releaseLease() {
        isReleasingLease = true
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        resurfaceWorkItem?.cancel()
        resurfaceWorkItem = nil
        send(.releaseLease(appInstanceId: appInstanceId))
        connection?.cancel()
        connection = nil
        isConnectionReady = false
    }

    func createTerminal(_ command: CreateTerminal, frame: GhosttyHostFrame?, visible: Bool) {
        let hostedCommand = GhosttyHostedCreateTerminal(
            cwd: command.cwd,
            env: command.env,
            frame: frame,
            initialInput: command.initialInput,
            sessionId: command.sessionId,
            title: command.title,
            visible: visible
        )
        hostedTerminals[command.sessionId] = hostedCommand
        if let frame {
            hostedTerminalFrames[command.sessionId] = (frame: frame, visible: visible)
        }
        send(.createTerminal(commandForModalPresentation(hostedCommand)))
    }

    func closeTerminal(sessionId: String) {
        hostedTerminals.removeValue(forKey: sessionId)
        hostedTerminalFrames.removeValue(forKey: sessionId)
        hostedActiveTerminalSet.sessionIds.removeAll { $0 == sessionId }
        hostedActiveTerminalSet.attentionSessionIds.removeAll { $0 == sessionId }
        if hostedActiveTerminalSet.focusedSessionId == sessionId {
            hostedActiveTerminalSet.focusedSessionId = nil
        }
        send(.closeTerminal(sessionId: sessionId))
    }

    func focusTerminal(sessionId: String) {
        guard !isModalPresentationActive else {
            GhosttySessionHostDebugLog.append(
                event: "client.focusTerminal.skippedForModal",
                details: ["sessionId": sessionId])
            return
        }
        send(.focusTerminal(sessionId: sessionId))
    }

    func writeTerminalText(sessionId: String, text: String) {
        send(.writeTerminalText(sessionId: sessionId, text: text))
    }

    func sendTerminalEnter(sessionId: String) {
        send(.sendTerminalEnter(sessionId: sessionId))
    }

    func setTerminalFrame(sessionId: String, frame: GhosttyHostFrame, visible: Bool) {
        hostedTerminalFrames[sessionId] = (frame: frame, visible: visible)
        send(.setTerminalFrame(
            sessionId: sessionId,
            frame: frame,
            visible: visible && !isModalPresentationActive
        ))
    }

    func setActiveTerminalSet(_ command: SetActiveTerminalSet) {
        hostedActiveTerminalSet = GhosttyHostedActiveTerminalSet(
            sessionIds: command.activeSessionIds,
            focusedSessionId: command.focusedSessionId,
            attentionSessionIds: command.attentionSessionIds ?? []
        )
        /**
         CDXC:NativeSessionStatus 2026-04-27-23:47
         Durable helper-owned terminals cannot use the UI process overlay
         views, so focus and done/attention state must cross the helper
         protocol with the active set. The helper draws the same borders on
         its native terminal windows.
         */
        sendHostedActiveTerminalSet()
    }

    func setHostAppActive(_ active: Bool) {
        isHostAppActive = active
        send(.setHostAppActive(active: active))
    }

    func setModalPresentationActive(_ active: Bool) {
        guard isModalPresentationActive != active else { return }
        isModalPresentationActive = active
        /**
         CDXC:AppModals 2026-04-28-10:58
         Full-window modals must remain above helper-owned Ghostty windows.
         While a modal is open, hide helper windows and keep all frame/focus
         state cached in the UI process; when the modal closes, replay the
         cached visible frames and active-set state before resurfacing.
         */
        GhosttySessionHostDebugLog.append(
            event: "client.modalPresentationActiveChanged",
            details: [
                "active": active,
                "frameIds": Array(hostedTerminalFrames.keys).sorted(),
            ])
        if active {
            resurfaceWorkItem?.cancel()
            resurfaceWorkItem = nil
            hostedTerminalFrames.forEach { sessionId, state in
                send(.setTerminalFrame(sessionId: sessionId, frame: state.frame, visible: false))
            }
            return
        }
        hostedTerminalFrames.forEach { sessionId, state in
            send(.setTerminalFrame(sessionId: sessionId, frame: state.frame, visible: state.visible))
        }
        sendHostedActiveTerminalSet()
        requestResurfaceVisibleTerminals(reason: "modalClosed")
    }

    func requestResurfaceVisibleTerminals(reason: String) {
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-23:58
         Clicking the zmux sidebar can make the main AppKit window order above
         helper-owned Ghostty terminal windows. Debounce resurfacing for 500ms
         so ordinary sidebar clicks, layout sync, and activation bursts restore
         the embedded terminal window order without command spam.
         */
        guard !isModalPresentationActive else {
            GhosttySessionHostDebugLog.append(
                event: "client.resurfaceVisibleTerminals.skippedForModal",
                details: ["reason": reason])
            return
        }
        resurfaceWorkItem?.cancel()
        let workItem = DispatchWorkItem { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.resurfaceWorkItem = nil
                GhosttySessionHostDebugLog.append(
                    event: "client.resurfaceVisibleTerminals",
                    details: ["reason": reason])
                self.send(.resurfaceVisibleTerminals)
            }
        }
        resurfaceWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: workItem)
    }

    private func connect() {
        guard connection == nil else {
            GhosttySessionHostDebugLog.append(
                event: "client.connect.skipped",
                details: ["reason": "connectionAlreadyExists"])
            return
        }
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        connectAttempt += 1
        let parameters = NWParameters.tcp
        let websocket = NWProtocolWebSocket.Options()
        websocket.autoReplyPing = true
        parameters.defaultProtocolStack.applicationProtocols.insert(websocket, at: 0)
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-22:56
         Network.framework WebSocket connections must use a URL endpoint here.
         Host/port TCP endpoints can connect then abort before hostReady, which
         leaves hosted Ghostty terminals invisible after a zmux restart.
         */
        let url = URL(string: "ws://127.0.0.1:\(GhosttySessionHostProtocol.port)/")!
        let connection = NWConnection(to: .url(url), using: parameters)
        self.connection = connection
        GhosttySessionHostDebugLog.append(
            event: "client.connect.start",
            details: ["attempt": connectAttempt, "url": url.absoluteString])
        connection.stateUpdateHandler = { [weak self] state in
            Task { @MainActor in
                self?.handleConnectionState(state, for: connection)
            }
        }
        connection.start(queue: .main)
        receive(on: connection)
    }

    private func handleConnectionState(_ state: NWConnection.State, for stateConnection: NWConnection) {
        GhosttySessionHostDebugLog.append(
            event: "client.connection.state",
            details: ["state": state.debugDescription])
        switch state {
        case .ready:
            guard connection === stateConnection else { return }
            reconnectAttempt = 0
            isConnectionReady = true
            GhosttySessionHostDebugLog.append(event: "client.ready")
            ghosttySessionHostClientLogger.info("connected to Ghostty session host")
            send(.forceCloseIncompatibleHelpers(protocolVersion: GhosttySessionHostProtocol.version))
            acquireLease()
            replayHostedTerminalState()
            flushPendingCommands()
        case let .waiting(error):
            /**
             CDXC:NativeTerminalSurvival 2026-04-27-23:42
             A restart can leave Network.framework in a non-ready waiting
             state while the sidebar keeps sending layout/focus commands. Treat
             waiting as a reconnectable transport failure so durable Ghostty
             terminals do not become visible but uncontrollable.
             */
            if connection === stateConnection {
                stateConnection.cancel()
                handleDisconnected(reason: "waiting: \(error.localizedDescription)")
            }
        case let .failed(error):
            if connection === stateConnection {
                handleDisconnected(reason: "failed: \(error.localizedDescription)")
            }
        case .cancelled:
            if connection === stateConnection {
                handleDisconnected(reason: "cancelled")
            }
        default:
            break
        }
    }

    private func handleDisconnected(reason: String) {
        isConnectionReady = false
        connection = nil
        GhosttySessionHostDebugLog.append(
            event: "client.disconnected",
            details: ["reason": reason, "pendingCount": pendingCommands.count])
        guard !isReleasingLease else { return }
        ghosttySessionHostClientLogger.info("Ghostty session host connection \(reason, privacy: .public); reconnecting")
        scheduleReconnect()
    }

    private func scheduleReconnect() {
        guard reconnectWorkItem == nil else { return }
        reconnectAttempt += 1
        let delay = min(2.0, 0.25 * Double(reconnectAttempt))
        let workItem = DispatchWorkItem { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.reconnectWorkItem = nil
                self.launchSessionHostIfNeeded()
                self.connect()
            }
        }
        reconnectWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    private func launchSessionHostIfNeeded() {
        let now = Date()
        if let lastLaunchRequestAt,
           now.timeIntervalSince(lastLaunchRequestAt) < 3 {
            return
        }
        lastLaunchRequestAt = now
        launchSessionHost()
    }

    private func launchSessionHost() {
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-16:21
         The UI app launches a separate Ghostty session host instead of owning
         PTYs directly. App updates may restart zmux, but the helper process
         keeps real Ghostty terminals alive until the lease timeout expires.
         */
        let candidates = sessionHostApplicationCandidates()
        guard let applicationURL = candidates.first(where: { FileManager.default.fileExists(atPath: $0.path) }) else {
            ghosttySessionHostClientLogger.error("zmuxGhosttySessionHost.app not found")
            onHostEvent(.terminalError(sessionId: "session-host", message: "zmuxGhosttySessionHost.app not found"))
            return
        }
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = false
        NSWorkspace.shared.openApplication(at: applicationURL, configuration: configuration) { _, error in
            if let error {
                ghosttySessionHostClientLogger.error("failed to launch session host: \(error.localizedDescription)")
            }
        }
    }

    private func sessionHostApplicationCandidates() -> [URL] {
        if let override = ProcessInfo.processInfo.environment["ZMUX_GHOSTTY_SESSION_HOST_APP"],
           !override.isEmpty {
            return [URL(fileURLWithPath: override)]
        }
        let builtProductsDirectory = Bundle.main.bundleURL.deletingLastPathComponent()
        return [
            builtProductsDirectory.appendingPathComponent("zmuxGhosttySessionHost.app"),
            Bundle.main.bundleURL
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .appendingPathComponent("Helpers/zmuxGhosttySessionHost.app"),
        ]
    }

    private func acquireLease() {
        send(.acquireLease(GhosttyHostLease(
            appInstanceId: appInstanceId,
            protocolVersion: GhosttySessionHostProtocol.version,
            timeoutSeconds: timeoutSeconds
        )))
    }

    private func replayHostedTerminalState() {
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-22:52
         The UI process stores only desired hosted-terminal state. When the
         local WebSocket reconnects, it must resend create, frame, visibility,
         and active-set intent so real Ghostty surfaces remain visible without
         depending on tmux, replay streams, or in-process PTYs.
         */
        GhosttySessionHostDebugLog.append(
            event: "client.replayHostedTerminalState",
            details: [
                "hostedTerminalIds": Array(hostedTerminals.keys).sorted(),
                "frameIds": Array(hostedTerminalFrames.keys).sorted(),
                "activeSessionIds": hostedActiveTerminalSet.sessionIds,
                "attentionSessionIds": hostedActiveTerminalSet.attentionSessionIds,
                "focusedSessionId": hostedActiveTerminalSet.focusedSessionId ?? "nil",
                "isHostAppActive": isHostAppActive,
            ])
        hostedTerminals.values.forEach { send(.createTerminal(commandForModalPresentation($0))) }
        hostedTerminalFrames.forEach { sessionId, state in
            send(.setTerminalFrame(
                sessionId: sessionId,
                frame: state.frame,
                visible: state.visible && !isModalPresentationActive
            ))
        }
        sendHostedActiveTerminalSet()
        send(.setHostAppActive(active: isHostAppActive))
    }

    private func sendHostedActiveTerminalSet() {
        send(.setActiveTerminalSet(
            sessionIds: isModalPresentationActive ? [] : hostedActiveTerminalSet.sessionIds,
            focusedSessionId: isModalPresentationActive ? nil : hostedActiveTerminalSet.focusedSessionId,
            attentionSessionIds: isModalPresentationActive ? [] : hostedActiveTerminalSet.attentionSessionIds
        ))
    }

    private func commandForModalPresentation(
        _ command: GhosttyHostedCreateTerminal
    ) -> GhosttyHostedCreateTerminal {
        guard isModalPresentationActive else { return command }
        return GhosttyHostedCreateTerminal(
            cwd: command.cwd,
            env: command.env,
            frame: command.frame,
            initialInput: command.initialInput,
            sessionId: command.sessionId,
            title: command.title,
            visible: false
        )
    }

    private func send(_ command: GhosttySessionHostCommand) {
        guard let connection, isConnectionReady else {
            pendingCommands.append(command)
            compactPendingCommandsIfNeeded()
            GhosttySessionHostDebugLog.append(
                event: "client.queueCommand",
                details: ["command": command.debugName, "pendingCount": pendingCommands.count])
            return
        }
        guard let data = try? encoder.encode(command) else { return }
        if command.shouldLogSend {
            GhosttySessionHostDebugLog.append(
                event: "client.sendCommand",
                details: ["command": command.debugName])
        }
        let metadata = NWProtocolWebSocket.Metadata(opcode: .text)
        let context = NWConnection.ContentContext(identifier: "zmux-ghostty-session-host-command", metadata: [metadata])
        connection.send(
            content: data,
            contentContext: context,
            isComplete: true,
            completion: .contentProcessed { _ in }
        )
    }

    private func compactPendingCommandsIfNeeded() {
        guard pendingCommands.count > 500 else { return }
        var compacted: [GhosttySessionHostCommand] = []
        var latestFrameBySessionId: [String: GhosttySessionHostCommand] = [:]
        var latestFocusBySessionId: [String: GhosttySessionHostCommand] = [:]
        var latestActiveSet: GhosttySessionHostCommand?
        var latestHostActive: GhosttySessionHostCommand?
        for command in pendingCommands {
            switch command {
            case let .setTerminalFrame(sessionId, _, _):
                latestFrameBySessionId[sessionId] = command
            case let .focusTerminal(sessionId):
                latestFocusBySessionId[sessionId] = command
            case .setActiveTerminalSet:
                latestActiveSet = command
            case .setHostAppActive:
                latestHostActive = command
            case .resurfaceVisibleTerminals:
                break
            default:
                compacted.append(command)
            }
        }
        compacted.append(contentsOf: latestFrameBySessionId.values)
        compacted.append(contentsOf: latestFocusBySessionId.values)
        if let latestActiveSet {
            compacted.append(latestActiveSet)
        }
        if let latestHostActive {
            compacted.append(latestHostActive)
        }
        GhosttySessionHostDebugLog.append(
            event: "client.queueCompacted",
            details: ["before": pendingCommands.count, "after": compacted.count])
        pendingCommands = compacted
    }

    private func flushPendingCommands() {
        let commands = pendingCommands
        pendingCommands.removeAll()
        commands.forEach(send)
    }

    private func receive(on receivingConnection: NWConnection) {
        receivingConnection.receiveMessage { [weak self] data, context, _, error in
            guard let self else { return }
            Task { @MainActor in
                if error != nil {
                    if self.connection === receivingConnection {
                        self.connection?.cancel()
                    }
                    return
                }
                if let metadata = context?.protocolMetadata(definition: NWProtocolWebSocket.definition)
                    as? NWProtocolWebSocket.Metadata,
                   metadata.opcode == .close {
                    if self.connection === receivingConnection {
                        self.connection?.cancel()
                    }
                    return
                }
                if let data {
                    self.handleEventData(data)
                }
                if self.connection === receivingConnection {
                    self.receive(on: receivingConnection)
                }
            }
        }
    }

    private func handleEventData(_ data: Data) {
        do {
            let event = try decoder.decode(GhosttySessionHostEvent.self, from: data)
            GhosttySessionHostDebugLog.append(
                event: "client.receiveEvent",
                details: ["eventName": event.debugName])
            switch event {
            case let .hostReady(protocolVersion, _):
                if protocolVersion != GhosttySessionHostProtocol.version {
                    onHostEvent(.terminalError(
                        sessionId: "session-host",
                        message: "Incompatible Ghostty session host protocol \(protocolVersion)"
                    ))
                }
            case let .terminalReady(sessionId, ttyName, foregroundPid):
                onHostEvent(.terminalReady(sessionId: sessionId, ttyName: ttyName, foregroundPid: foregroundPid))
            case let .terminalTitleChanged(sessionId, title):
                onHostEvent(.terminalTitleChanged(sessionId: sessionId, title: title))
            case let .terminalExited(sessionId, exitCode):
                onHostEvent(.terminalExited(sessionId: sessionId, exitCode: exitCode))
            case let .terminalFocused(sessionId):
                onHostEvent(.terminalFocused(sessionId: sessionId))
            case let .terminalBell(sessionId):
                onHostEvent(.terminalBell(sessionId: sessionId))
            case let .terminalError(sessionId, message):
                onHostEvent(.terminalError(sessionId: sessionId, message: message))
            }
        } catch {
            onHostEvent(.terminalError(sessionId: "session-host", message: error.localizedDescription))
        }
    }
}

private extension GhosttySessionHostCommand {
    var shouldLogSend: Bool {
        switch self {
        case .setActiveTerminalSet, .setTerminalFrame, .resurfaceVisibleTerminals:
            false
        default:
            true
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
        case let .waiting(error):
            "waiting(\(error.localizedDescription))"
        case let .failed(error):
            "failed(\(error.localizedDescription))"
        case .cancelled:
            "cancelled"
        @unknown default:
            "unknown"
        }
    }
}
