import Foundation

enum HostCommand: Decodable {
  case createTerminal(CreateTerminal)
  case closeTerminal(SessionCommand)
  case focusTerminal(SessionCommand)
  case activateApp
  case writeTerminalText(WriteTerminalText)
  case sendTerminalEnter(SessionCommand)
  case setActiveTerminalSet(SetActiveTerminalSet)
  case setTerminalLayout(SetTerminalLayout)
  case setTerminalVisibility(SetTerminalVisibility)
  case pickWorkspaceFolder
  case pickWorkspaceIcon(PickWorkspaceIcon)
  case showMessage(ShowMessage)
  case appendAgentDetectionDebugLog(AppendAgentDetectionDebugLog)
  case appendTerminalFocusDebugLog(AppendTerminalFocusDebugLog)
  case appendRestoreDebugLog(AppendRestoreDebugLog)
  case appendSessionTitleDebugLog(AppendSessionTitleDebugLog)
  case appendWorkspaceDockIndicatorDebugLog(AppendWorkspaceDockIndicatorDebugLog)
  case runProcess(RunProcess)
  case syncGhosttyTerminalSettings(SyncGhosttyTerminalSettings)
  case openExternalUrl(OpenExternalUrl)
  case openBrowserWindow(OpenBrowserWindow)
  case showBrowserWindow
  case setSidebarSide(SetSidebarSide)
  case configureZedOverlay(ConfigureZedOverlay)
  case sidebarCliCommand(SidebarCliCommand)

  private enum CodingKeys: String, CodingKey {
    case type
  }

  private enum CommandType: String, Decodable {
    case createTerminal
    case closeTerminal
    case focusTerminal
    case activateApp
    case writeTerminalText
    case sendTerminalEnter
    case setActiveTerminalSet
    case setTerminalLayout
    case setTerminalVisibility
    case pickWorkspaceFolder
    case pickWorkspaceIcon
    case showMessage
    case appendAgentDetectionDebugLog
    case appendTerminalFocusDebugLog
    case appendRestoreDebugLog
    case appendSessionTitleDebugLog
    case appendWorkspaceDockIndicatorDebugLog
    case runProcess
    case syncGhosttyTerminalSettings
    case openExternalUrl
    case openBrowserWindow
    case showBrowserWindow
    case setSidebarSide
    case configureZedOverlay
    case sidebarCliCommand
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    switch try container.decode(CommandType.self, forKey: .type) {
    case .createTerminal:
      self = .createTerminal(try CreateTerminal(from: decoder))
    case .closeTerminal:
      self = .closeTerminal(try SessionCommand(from: decoder))
    case .focusTerminal:
      self = .focusTerminal(try SessionCommand(from: decoder))
    case .activateApp:
      self = .activateApp
    case .writeTerminalText:
      self = .writeTerminalText(try WriteTerminalText(from: decoder))
    case .sendTerminalEnter:
      self = .sendTerminalEnter(try SessionCommand(from: decoder))
    case .setActiveTerminalSet:
      self = .setActiveTerminalSet(try SetActiveTerminalSet(from: decoder))
    case .setTerminalLayout:
      self = .setTerminalLayout(try SetTerminalLayout(from: decoder))
    case .setTerminalVisibility:
      self = .setTerminalVisibility(try SetTerminalVisibility(from: decoder))
    case .pickWorkspaceFolder:
      self = .pickWorkspaceFolder
    case .pickWorkspaceIcon:
      self = .pickWorkspaceIcon(try PickWorkspaceIcon(from: decoder))
    case .showMessage:
      self = .showMessage(try ShowMessage(from: decoder))
    case .appendAgentDetectionDebugLog:
      self = .appendAgentDetectionDebugLog(try AppendAgentDetectionDebugLog(from: decoder))
    case .appendTerminalFocusDebugLog:
      self = .appendTerminalFocusDebugLog(try AppendTerminalFocusDebugLog(from: decoder))
    case .appendRestoreDebugLog:
      self = .appendRestoreDebugLog(try AppendRestoreDebugLog(from: decoder))
    case .appendSessionTitleDebugLog:
      self = .appendSessionTitleDebugLog(try AppendSessionTitleDebugLog(from: decoder))
    case .appendWorkspaceDockIndicatorDebugLog:
      self = .appendWorkspaceDockIndicatorDebugLog(
        try AppendWorkspaceDockIndicatorDebugLog(from: decoder))
    case .runProcess:
      self = .runProcess(try RunProcess(from: decoder))
    case .syncGhosttyTerminalSettings:
      self = .syncGhosttyTerminalSettings(try SyncGhosttyTerminalSettings(from: decoder))
    case .openExternalUrl:
      self = .openExternalUrl(try OpenExternalUrl(from: decoder))
    case .openBrowserWindow:
      self = .openBrowserWindow(try OpenBrowserWindow(from: decoder))
    case .showBrowserWindow:
      self = .showBrowserWindow
    case .setSidebarSide:
      self = .setSidebarSide(try SetSidebarSide(from: decoder))
    case .configureZedOverlay:
      self = .configureZedOverlay(try ConfigureZedOverlay(from: decoder))
    case .sidebarCliCommand:
      self = .sidebarCliCommand(try SidebarCliCommand(from: decoder))
    }
  }
}

struct CreateTerminal: Decodable {
  let cwd: String
  let env: [String: String]?
  let initialInput: String?
  let sessionId: String
  let title: String?
}

struct SessionCommand: Decodable {
  let sessionId: String
}

struct WriteTerminalText: Decodable {
  let sessionId: String
  let text: String
}

struct SetActiveTerminalSet: Decodable {
  let activeSessionIds: [String]
  let attentionSessionIds: [String]?
  let focusedSessionId: String?
  let layout: NativeTerminalLayout?
}

struct SetTerminalLayout: Decodable {
  let layout: NativeTerminalLayout
}

struct SetTerminalVisibility: Decodable {
  let sessionId: String
  let visible: Bool
}

struct PickWorkspaceIcon: Decodable {
  let projectId: String
}

struct ShowMessage: Decodable {
  let level: MessageLevel
  let message: String
}

struct AppendAgentDetectionDebugLog: Decodable {
  let details: String?
  let event: String
}

struct AppendTerminalFocusDebugLog: Decodable {
  let details: String?
  let event: String
}

struct AppendSessionTitleDebugLog: Decodable {
  let details: String?
  let event: String
}

struct AppendRestoreDebugLog: Decodable {
  let details: String?
  let event: String
}

struct AppendWorkspaceDockIndicatorDebugLog: Decodable {
  let details: String?
  let event: String
}

enum MessageLevel: String, Decodable {
  case info
  case warning
  case error
}

struct RunProcess: Decodable {
  let args: [String]
  let cwd: String?
  let env: [String: String]?
  let executable: String
  let requestId: String
}

struct SyncGhosttyTerminalSettings: Decodable {
  let adjustCellHeightPercent: Double
  let adjustCellWidth: Double
  let fontFamily: String
  let fontSize: Double
  let fontThicken: Bool
  let fontThickenStrength: Int
}

struct OpenExternalUrl: Decodable {
  let url: String
}

struct OpenBrowserWindow: Decodable {
  let url: String
}

struct SetSidebarSide: Decodable {
  let side: SidebarSide
}

enum SidebarSide: String, Decodable {
  case left
  case right
}

struct ConfigureZedOverlay: Decodable {
  let enabled: Bool
  let targetApp: ZedOverlayTargetApp
  let workspacePath: String?
}

struct SidebarCliCommand: Decodable {
  let action: String
  let payloadJson: String?
  let requestId: String
}

enum NativeTerminalLayout: Decodable {
  case leaf(sessionId: String)
  case split(direction: SplitDirection, ratio: Double?, children: [NativeTerminalLayout])

  enum SplitDirection: String, Decodable {
    case horizontal
    case vertical
  }

  private enum CodingKeys: String, CodingKey {
    case children
    case direction
    case kind
    case ratio
    case sessionId
  }

  private enum Kind: String, Decodable {
    case leaf
    case split
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    switch try container.decode(Kind.self, forKey: .kind) {
    case .leaf:
      self = .leaf(sessionId: try container.decode(String.self, forKey: .sessionId))
    case .split:
      self = .split(
        direction: try container.decode(SplitDirection.self, forKey: .direction),
        ratio: try container.decodeIfPresent(Double.self, forKey: .ratio),
        children: try container.decode([NativeTerminalLayout].self, forKey: .children)
      )
    }
  }
}

enum HostEvent: Encodable {
  case hostReady
  case terminalReady(sessionId: String, ttyName: String?, foregroundPid: Int?)
  case terminalTitleChanged(sessionId: String, title: String)
  case terminalCwdChanged(sessionId: String, cwd: String)
  case terminalExited(sessionId: String, exitCode: Int?)
  case terminalFocused(sessionId: String)
  case terminalBell(sessionId: String)
  case terminalError(sessionId: String, message: String)
  case processResult(requestId: String, exitCode: Int32, stdout: String, stderr: String)
  case sidebarCliResult(requestId: String, ok: Bool, payloadJson: String)

  private enum CodingKeys: String, CodingKey {
    case exitCode
    case cwd
    case foregroundPid
    case message
    case protocolVersion
    case sessionId
    case stderr
    case stdout
    case title
    case ttyName
    case type
    case requestId
    case ok
    case payloadJson
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    switch self {
    case .hostReady:
      try container.encode("hostReady", forKey: .type)
      try container.encode(1, forKey: .protocolVersion)
    case .terminalReady(let sessionId, let ttyName, let foregroundPid):
      try container.encode("terminalReady", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encodeIfPresent(ttyName, forKey: .ttyName)
      try container.encodeIfPresent(foregroundPid, forKey: .foregroundPid)
    case .terminalTitleChanged(let sessionId, let title):
      try container.encode("terminalTitleChanged", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encode(title, forKey: .title)
    case .terminalCwdChanged(let sessionId, let cwd):
      try container.encode("terminalCwdChanged", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encode(cwd, forKey: .cwd)
    case .terminalExited(let sessionId, let exitCode):
      try container.encode("terminalExited", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encodeIfPresent(exitCode, forKey: .exitCode)
    case .terminalFocused(let sessionId):
      try container.encode("terminalFocused", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
    case .terminalBell(let sessionId):
      try container.encode("terminalBell", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
    case .terminalError(let sessionId, let message):
      try container.encode("terminalError", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encode(message, forKey: .message)
    case .processResult(let requestId, let exitCode, let stdout, let stderr):
      try container.encode("processResult", forKey: .type)
      try container.encode(requestId, forKey: .requestId)
      try container.encode(exitCode, forKey: .exitCode)
      try container.encode(stdout, forKey: .stdout)
      try container.encode(stderr, forKey: .stderr)
    case .sidebarCliResult(let requestId, let ok, let payloadJson):
      try container.encode("sidebarCliResult", forKey: .type)
      try container.encode(requestId, forKey: .requestId)
      try container.encode(ok, forKey: .ok)
      try container.encode(payloadJson, forKey: .payloadJson)
    }
  }
}
