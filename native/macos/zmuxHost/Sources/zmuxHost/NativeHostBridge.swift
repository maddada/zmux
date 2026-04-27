import Foundation
import Network

@MainActor
final class NativeHostBridge {
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()
  private let listener: NWListener
  private var clients: [WebSocketClient] = []
  private let onCommand: (HostCommand) -> Void

  init(port: UInt16 = 58743, onCommand: @escaping (HostCommand) -> Void) throws {
    self.onCommand = onCommand

    let parameters = NWParameters.tcp
    let websocket = NWProtocolWebSocket.Options()
    websocket.autoReplyPing = true
    parameters.defaultProtocolStack.applicationProtocols.insert(websocket, at: 0)
    self.listener = try NWListener(using: parameters, on: NWEndpoint.Port(rawValue: port)!)
  }

  func start() {
    listener.newConnectionHandler = { [weak self] connection in
      Task { @MainActor in
        self?.accept(connection)
      }
    }
    listener.start(queue: .main)
  }

  func send(_ event: HostEvent) {
    guard let data = try? encoder.encode(event),
      let text = String(data: data, encoding: .utf8)
    else {
      return
    }
    clients.forEach { $0.send(text) }
  }

  private func accept(_ connection: NWConnection) {
    let client = WebSocketClient(connection: connection) { [weak self] text in
      self?.handle(text)
    } onClose: { [weak self] closedClient in
      self?.clients.removeAll { $0 === closedClient }
    }
    clients.append(client)
    client.start()
    client.sendEvent(.hostReady)
  }

  private func handle(_ text: String) {
    guard let data = text.data(using: .utf8) else {
      return
    }
    do {
      onCommand(try decoder.decode(HostCommand.self, from: data))
    } catch {
      send(.terminalError(sessionId: "bridge", message: error.localizedDescription))
    }
  }
}

private final class WebSocketClient {
  private let connection: NWConnection
  private let encoder = JSONEncoder()
  private let onMessage: (String) -> Void
  private let onClose: (WebSocketClient) -> Void

  init(
    connection: NWConnection,
    onMessage: @escaping (String) -> Void,
    onClose: @escaping (WebSocketClient) -> Void
  ) {
    self.connection = connection
    self.onMessage = onMessage
    self.onClose = onClose
  }

  func start() {
    connection.stateUpdateHandler = { [weak self] state in
      guard let self else { return }
      if case .cancelled = state {
        self.onClose(self)
      }
      if case .failed = state {
        self.onClose(self)
      }
    }
    connection.start(queue: .main)
    receive()
  }

  func sendEvent(_ event: HostEvent) {
    guard let data = try? encoder.encode(event),
      let text = String(data: data, encoding: .utf8)
    else {
      return
    }
    send(text)
  }

  func send(_ text: String) {
    let metadata = NWProtocolWebSocket.Metadata(opcode: .text)
    let context = NWConnection.ContentContext(identifier: "zmux-host-event", metadata: [metadata])
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
        self.onClose(self)
        return
      }
      if let metadata = context?.protocolMetadata(definition: NWProtocolWebSocket.definition)
        as? NWProtocolWebSocket.Metadata,
        metadata.opcode == .close
      {
        self.onClose(self)
        return
      }
      if let data,
        let text = String(data: data, encoding: .utf8)
      {
        self.onMessage(text)
      }
      self.receive()
    }
  }
}
