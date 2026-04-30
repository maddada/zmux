import Foundation

enum HostCommand: Decodable {
  case createTerminal(CreateTerminal)
  case createWebPane(CreateWebPane)
  case closeTerminal(SessionCommand)
  case closeWebPane(SessionCommand)
  case focusTerminal(SessionCommand)
  case focusWebPane(SessionCommand)
  case startT3CodeRuntime(StartT3CodeRuntime)
  case stopT3CodeRuntime
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
  case persistSharedSidebarStorage(PersistSharedSidebarStorage)
  case playSound(PlaySound)
  case runProcess(RunProcess)
  case syncGhosttyTerminalSettings(SyncGhosttyTerminalSettings)
  case applyGhosttyConfigSettings(ApplyGhosttyConfigSettings)
  case openGhosttyConfigFile
  case openExternalUrl(OpenExternalUrl)
  case openBrowserWindow(OpenBrowserWindow)
  case showBrowserWindow
  case setSidebarSide(SetSidebarSide)
  case configureZedOverlay(ConfigureZedOverlay)
  case openZedWorkspace(OpenZedWorkspace)
  case sidebarCliCommand(SidebarCliCommand)

  private enum CodingKeys: String, CodingKey {
    case type
  }

  private enum CommandType: String, Decodable {
    case createTerminal
    case createWebPane
    case closeTerminal
    case closeWebPane
    case focusTerminal
    case focusWebPane
    case startT3CodeRuntime
    case stopT3CodeRuntime
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
    case persistSharedSidebarStorage
    case playSound
    case runProcess
    case syncGhosttyTerminalSettings
    case applyGhosttyConfigSettings
    case openGhosttyConfigFile
    case openExternalUrl
    case openBrowserWindow
    case showBrowserWindow
    case setSidebarSide
    case configureZedOverlay
    case openZedWorkspace
    case sidebarCliCommand
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    switch try container.decode(CommandType.self, forKey: .type) {
    case .createTerminal:
      self = .createTerminal(try CreateTerminal(from: decoder))
    case .createWebPane:
      self = .createWebPane(try CreateWebPane(from: decoder))
    case .closeTerminal:
      self = .closeTerminal(try SessionCommand(from: decoder))
    case .closeWebPane:
      self = .closeWebPane(try SessionCommand(from: decoder))
    case .focusTerminal:
      self = .focusTerminal(try SessionCommand(from: decoder))
    case .focusWebPane:
      self = .focusWebPane(try SessionCommand(from: decoder))
    case .startT3CodeRuntime:
      self = .startT3CodeRuntime(try StartT3CodeRuntime(from: decoder))
    case .stopT3CodeRuntime:
      self = .stopT3CodeRuntime
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
    case .persistSharedSidebarStorage:
      self = .persistSharedSidebarStorage(try PersistSharedSidebarStorage(from: decoder))
    case .playSound:
      self = .playSound(try PlaySound(from: decoder))
    case .runProcess:
      self = .runProcess(try RunProcess(from: decoder))
    case .syncGhosttyTerminalSettings:
      self = .syncGhosttyTerminalSettings(try SyncGhosttyTerminalSettings(from: decoder))
    case .applyGhosttyConfigSettings:
      self = .applyGhosttyConfigSettings(try ApplyGhosttyConfigSettings(from: decoder))
    case .openGhosttyConfigFile:
      self = .openGhosttyConfigFile
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
    case .openZedWorkspace:
      self = .openZedWorkspace(try OpenZedWorkspace(from: decoder))
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

struct CreateWebPane: Decodable {
  let cwd: String?
  let sessionId: String
  let title: String
  let url: String
}

struct SessionCommand: Decodable {
  let sessionId: String
}

struct StartT3CodeRuntime: Decodable {
  let cwd: String
}

struct WriteTerminalText: Decodable {
  let sessionId: String
  let text: String
}

struct SetActiveTerminalSet: Decodable {
  let activeSessionIds: [String]
  let attentionSessionIds: [String]?
  let backgroundColor: String?
  let focusedSessionId: String?
  let layout: NativeTerminalLayout?
  let paneGap: Double?
  let sessionActivities: [String: NativeTerminalActivity]?
  let sessionTitles: [String: String]?
}

struct SetTerminalLayout: Decodable {
  let layout: NativeTerminalLayout
}

enum NativeTerminalActivity: String, Decodable {
  case attention
  case working
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

struct PersistSharedSidebarStorage: Decodable {
  let key: String
  let payloadJson: String
}

struct PlaySound: Decodable {
  let fileName: String
  let volume: Double?
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
  let mouseScrollMultiplierDiscrete: Double
  let mouseScrollMultiplierPrecision: Double
  let reloadImmediately: Bool?
}

struct ApplyGhosttyConfigSettings: Decodable {
  let lines: [String]
  let managedKeys: [String]
  let reloadImmediately: Bool?
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

struct OpenZedWorkspace: Decodable {
  let targetApp: ZedOverlayTargetApp
  let workspacePath: String
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
  case nativeHotkey(actionId: String)
  case terminalReady(sessionId: String, ttyName: String?, foregroundPid: Int?)
  case terminalTitleChanged(sessionId: String, title: String)
  case terminalTitleBarAction(sessionId: String, action: TerminalTitleBarAction)
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
    case action
    case actionId
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
    case .nativeHotkey(let actionId):
      /**
       CDXC:Hotkeys 2026-04-28-06:15
       AppKit-matched hotkeys must travel over the typed native host event bus
       instead of an optional JavaScript global. This makes the native-to-sidebar
       boundary observable and avoids silently dropping shortcuts before the
       sidebar action executor can run.
       */
      try container.encode("nativeHotkey", forKey: .type)
      try container.encode(actionId, forKey: .actionId)
    case .terminalReady(let sessionId, let ttyName, let foregroundPid):
      try container.encode("terminalReady", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encodeIfPresent(ttyName, forKey: .ttyName)
      try container.encodeIfPresent(foregroundPid, forKey: .foregroundPid)
    case .terminalTitleChanged(let sessionId, let title):
      try container.encode("terminalTitleChanged", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encode(title, forKey: .title)
    case .terminalTitleBarAction(let sessionId, let action):
      try container.encode("terminalTitleBarAction", forKey: .type)
      try container.encode(sessionId, forKey: .sessionId)
      try container.encode(action, forKey: .action)
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

enum TerminalTitleBarAction: String, Encodable {
  case close
  case fork
  case reload
  case rename
  case sleep
}
