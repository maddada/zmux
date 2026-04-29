import AppKit
import ApplicationServices
import GhosttyKit
import OSLog
import UniformTypeIdentifiers
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, GhosttyAppDelegate {
  static let logger = Logger(subsystem: "com.madda.zmux.host", category: "app")
  private static let logDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS ZZZZ"
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    return formatter
  }()
  private static var createdLogDirectories = Set<String>()

  nonisolated(unsafe) let ghostty: Ghostty.App
  let undoManager = UndoManager()
  private let ghosttyConfigSelection: GhosttyConfigSelection

  private var bridge: NativeHostBridge?
  private var tickTimer: Timer?
  private var window: NSWindow?
  private var workspacePath =
    ProcessInfo.processInfo.environment["zmux_WORKSPACE_PATH"]
    ?? FileManager.default.currentDirectoryPath
  private weak var workspaceView: TerminalWorkspaceView?
  private var zedOverlayController: ZedOverlayController?
  private var browserOverlayController: BrowserOverlayController?
  private var hasPresentedAccessibilityPermissionDialog = false
  private var pendingZedOverlayConfiguration: ConfigureZedOverlay?
  private var pendingGhosttyConfigReloadTimer: Timer?
  private weak var attachToIdeTitlebarButton: NSButton?
  private let nativeSettingsStore = NativeSettingsStore()
  private var t3CodeRuntimeProcess: Process?

  override init() {
    let configSelection = Self.preferredGhosttyConfig()
    /**
     CDXC:NativeTerminals 2026-04-26-06:50
     Embedded Ghostty terminals should use the same user configuration as
     Ghostty itself. Honor GHOSTTY_CONFIG_PATH when provided; otherwise let
     Ghostty load its normal default config files from the user's machine.
     */
    ghosttyConfigSelection = configSelection
    ghostty = Ghostty.App(configPath: configSelection.path)
    super.init()
    ghostty.delegate = self
    logGhosttyConfigStartup()
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)
    Self.appendNativeHostLifecycleLog(
      "applicationDidFinishLaunching pid=\(ProcessInfo.processInfo.processIdentifier) workspacePath=\(workspacePath)"
    )
    MainActor.assumeIsolated {
      /**
       CDXC:NativeTerminals 2026-04-28-12:06
       Persistent helper mode was removed by request. Native terminals now
       always use the in-process embedded Ghostty SurfaceView backend from
       startup, so no restart-survival helper client is created.
       */
      makeWindow()
      startBridge()
      presentAccessibilityPermissionDialogIfNeeded()
    }
    tickTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
      self?.ghostty.appTick()
    }
  }

  func applicationWillTerminate(_ notification: Notification) {
    Self.appendNativeHostLifecycleLog(
      "applicationWillTerminate pid=\(ProcessInfo.processInfo.processIdentifier) windowVisible=\(window?.isVisible ?? false) keyWindow=\(window?.isKeyWindow ?? false)"
    )
  }

  func applicationWillBecomeActive(_ notification: Notification) {
    /**
     CDXC:IDEAttachment 2026-04-29-03:08
     Dock-click surfacing needs native activation breadcrumbs outside the
     overlay controller so a repro can distinguish "macOS never activated
     zmux" from "the overlay activation branch made the wrong ordering call."
     */
    Self.appendNativeHostLifecycleLog(
      "applicationWillBecomeActive pid=\(ProcessInfo.processInfo.processIdentifier) windowVisible=\(window?.isVisible ?? false) keyWindow=\(window?.isKeyWindow ?? false) frontmost=\(NSWorkspace.shared.frontmostApplication?.localizedName ?? "<missing>")"
    )
    BrowserOverlayRestoreReproLog.append(
      "appDelegate.applicationWillBecomeActive",
      [
        "frontmostApplication": NSWorkspace.shared.frontmostApplication?.localizedName as Any,
        "keyWindow": window?.isKeyWindow as Any,
        "windowVisible": window?.isVisible as Any,
      ])
  }

  func applicationDidBecomeActive(_ notification: Notification) {
    Self.appendNativeHostLifecycleLog(
      "applicationDidBecomeActive pid=\(ProcessInfo.processInfo.processIdentifier) windowVisible=\(window?.isVisible ?? false) keyWindow=\(window?.isKeyWindow ?? false) frontmost=\(NSWorkspace.shared.frontmostApplication?.localizedName ?? "<missing>")"
    )
    BrowserOverlayRestoreReproLog.append(
      "appDelegate.applicationDidBecomeActive",
      [
        "frontmostApplication": NSWorkspace.shared.frontmostApplication?.localizedName as Any,
        "keyWindow": window?.isKeyWindow as Any,
        "windowFrame": window.map {
          "x=\($0.frame.minX),y=\($0.frame.minY),w=\($0.frame.width),h=\($0.frame.height)"
        } as Any,
        "windowLevel": window?.level.rawValue as Any,
        "windowVisible": window?.isVisible as Any,
      ])
  }

  private struct GhosttyConfigSelection {
    let path: String?
    let source: String
  }

  private static func preferredGhosttyConfig() -> GhosttyConfigSelection {
    let value = ProcessInfo.processInfo.environment["GHOSTTY_CONFIG_PATH"]?.trimmingCharacters(
      in: .whitespacesAndNewlines)
    if value?.isEmpty == false {
      return GhosttyConfigSelection(path: value, source: "GHOSTTY_CONFIG_PATH")
    }

    let appSupportURL = FileManager.default.urls(
      for: .applicationSupportDirectory, in: .userDomainMask
    ).first
    let macOSConfigPaths = [
      appSupportURL?.appendingPathComponent("com.mitchellh.ghostty/config").path,
      appSupportURL?.appendingPathComponent("com.ghostty.org/config").path,
      appSupportURL?.appendingPathComponent("Ghostty/config").path,
    ].compactMap { $0 }
    /**
     CDXC:NativeTerminals 2026-04-26-06:53
     Installed Ghostty for macOS stores user settings in Application Support
     on this machine. Prefer that real app config before falling back to
     Ghostty's default loader so embedded terminals match the user's app.
     */
    if let path = macOSConfigPaths.first(where: { FileManager.default.fileExists(atPath: $0) }) {
      return GhosttyConfigSelection(path: path, source: "macOS Application Support")
    }

    return GhosttyConfigSelection(path: nil, source: "Ghostty default loader")
  }

  private func logGhosttyConfigStartup() {
    /**
     CDXC:NativeTerminals 2026-04-26-07:12
     User Ghostty configuration must be diagnosable without noisy runtime
     traces. Log one startup snapshot with the selected config path,
     resource availability, representative loaded values, and diagnostics.
     */
    let resourcePath = Bundle.main.resourceURL?.appendingPathComponent("ghostty").path
    let themesPath = Bundle.main.resourceURL?.appendingPathComponent("ghostty/themes").path
    let fileManager = FileManager.default
    let configPath = ghosttyConfigSelection.path ?? "<default>"
    let configExists =
      ghosttyConfigSelection.path.map { fileManager.fileExists(atPath: $0) } ?? false
    let resourceExists = resourcePath.map { fileManager.fileExists(atPath: $0) } ?? false
    let themesExists = themesPath.map { fileManager.fileExists(atPath: $0) } ?? false
    let fontSize = ghosttyConfigFloat("font-size").map { String($0) } ?? "<unreadable>"
    let cursorStyle = ghosttyConfigString("cursor-style") ?? "<unreadable>"
    let background = ghosttyConfigColorHex("background") ?? "<unreadable>"
    let diagnostics =
      ghostty.config.errors.isEmpty ? "none" : ghostty.config.errors.joined(separator: " | ")
    let logFields = [
      "source=\(ghosttyConfigSelection.source)",
      "configPath=\(configPath)",
      "configExists=\(configExists)",
      "resourcePath=\(resourcePath ?? "<missing>")",
      "resourceExists=\(resourceExists)",
      "themesExists=\(themesExists)",
      "font-size=\(fontSize)",
      "cursor-style=\(cursorStyle)",
      "background=\(background)",
      "diagnostics=\(diagnostics)",
    ]
    Self.appendGhosttyConfigLog(logFields.joined(separator: " "))
  }

  private func ghosttyConfigString(_ key: String) -> String? {
    guard let config = ghostty.config.config else {
      return nil
    }
    var value: UnsafePointer<Int8>?
    guard ghostty_config_get(config, &value, key, UInt(key.lengthOfBytes(using: .utf8))),
      let value
    else {
      return nil
    }
    return String(cString: value)
  }

  private func ghosttyConfigFloat(_ key: String) -> Float32? {
    guard let config = ghostty.config.config else {
      return nil
    }
    var value: Float32 = 0
    guard ghostty_config_get(config, &value, key, UInt(key.lengthOfBytes(using: .utf8))) else {
      return nil
    }
    return value
  }

  private func ghosttyConfigColorHex(_ key: String) -> String? {
    guard let config = ghostty.config.config else {
      return nil
    }
    var color = ghostty_config_color_s()
    guard ghostty_config_get(config, &color, key, UInt(key.lengthOfBytes(using: .utf8))) else {
      return nil
    }
    return String(format: "#%02X%02X%02X", color.r, color.g, color.b)
  }

  private static func appendGhosttyConfigLog(_ message: String) {
    guard NativeDebugLogging.isEnabled else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("native-ghostty-config.log")
    appendLogLine(
      message, to: logURL, logsDirectory: logsDirectory, label: "Ghostty config startup")
  }

  fileprivate static func appendSessionTitleDebugLog(event: String, details: String?) {
    /**
     CDXC:SessionTitleDiagnostics 2026-04-26-08:03
     The native packaged app must write session-title diagnostics into the
     same app storage logs location as the Bun controller so missing Codex
     auto-renames can be correlated with native Ghostty title events.
     */
    guard NativeDebugLogging.isEnabled else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("session-title-sync-debug.log")
    let message = details.map { "\(event) \($0)" } ?? event
    appendLogLine(message, to: logURL, logsDirectory: logsDirectory, label: "session title debug")
  }

  fileprivate static func appendAgentDetectionDebugLog(event: String, details: String?) {
    /**
     CDXC:AgentDetection 2026-04-26-11:14
     Agent-icon debugging needs a dedicated app storage logs file so native
     title events, detector output, and sidebar projection can be correlated
     without mixing them with session rename diagnostics.
     */
    guard NativeDebugLogging.isEnabled else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("agent-detection-debug.log")
    let message = details.map { "\(event) \($0)" } ?? event
    appendLogLine(message, to: logURL, logsDirectory: logsDirectory, label: "agent detection debug")
  }

  fileprivate static func appendTerminalFocusDebugLog(event: String, details: String?) {
    TerminalFocusDebugLog.append(
      event: event,
      details: [
        "details": nullableLogString(details),
        "source": "native-sidebar",
      ])
  }

  fileprivate static func appendRestoreDebugLog(event: String, details: String?) {
    /**
     CDXC:WorkspaceRestore 2026-04-26-10:00
     The packaged native sidebar owns workspace/session persistence. Write
     restore diagnostics into a dedicated app storage logs file so project load,
     localStorage persistence, and native terminal recreation can be traced
     independently from session-title logs.
     */
    guard NativeDebugLogging.isEnabled else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("workspace-restore-debug.log")
    let message = details.map { "\(event) \($0)" } ?? event
    appendLogLine(
      message, to: logURL, logsDirectory: logsDirectory, label: "workspace restore debug")
  }

  fileprivate static func appendWorkspaceDockIndicatorDebugLog(event: String, details: String?) {
    /**
     CDXC:WorkspaceDock 2026-04-27-04:23
     Native workspace rail indicator repros need a dedicated log file under
     app storage logs because this UI is rendered from the native sidebar webview,
     not the older Electrobun mainview dock.
     */
    guard NativeDebugLogging.isEnabled else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("workspace-dock-indicator-debug.log")
    let message = details.map { "\(event) \($0)" } ?? event
    appendLogLine(
      message, to: logURL, logsDirectory: logsDirectory, label: "workspace dock indicator debug")
  }

  fileprivate static func appendAppModalErrorLog(area: String, message: String, stack: String?) {
    /**
     CDXC:AppModals 2026-04-27-14:25
     Full-window modal failures must be persisted outside React debug mode.
     Every modal host exception writes an area-tagged timestamped line under
     app storage logs so missing bridge, render, and command routing failures can
     be diagnosed after the UI has already failed.
     */
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("app-modal-errors.log")
    let stackText = stack.map { " stack=\($0)" } ?? ""
    appendLogLine(
      "[\(area)] \(message)\(stackText)", to: logURL, logsDirectory: logsDirectory,
      label: "app modal error")
  }

  fileprivate static func appendNativeHostLifecycleLog(_ message: String) {
    /**
     CDXC:CrashDiagnostics 2026-04-27-17:38
     When the app disappears from the Dock, native lifecycle breadcrumbs must
     survive outside WebKit and JS logs so close-button, last-window, and
     termination paths can be separated from renderer crashes.
     */
    guard NativeDebugLogging.isEnabled else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("native-host-lifecycle.log")
    appendLogLine(message, to: logURL, logsDirectory: logsDirectory, label: "native host lifecycle")
  }

  fileprivate static func persistSharedSidebarStorage(_ command: PersistSharedSidebarStorage) {
    do {
      try ZmuxAppStorage.persistSharedSidebarStorage(
        key: command.key, payloadJson: command.payloadJson)
    } catch {
      appendRestoreDebugLog(
        event: "nativeSidebar.sharedStorage.persistFailed",
        details: jsonObjectString([
          "error": error.localizedDescription,
          "key": command.key,
        ]))
    }
  }

  private static func appendLogLine(
    _ message: String,
    to logURL: URL,
    logsDirectory: URL,
    label: String
  ) {
    /**
     CDXC:Diagnostics 2026-04-29-09:16
     Native logging can be called from title/focus paths. Reuse timestamp
     formatting and avoid recreating the logs directory on every append so
     enabled diagnostics do not become the app's hot path.
     */
    let line = "[\(logDateFormatter.string(from: Date()))] \(message)\n"

    do {
      if !createdLogDirectories.contains(logsDirectory.path) {
        try FileManager.default.createDirectory(at: logsDirectory, withIntermediateDirectories: true)
        createdLogDirectories.insert(logsDirectory.path)
      }
      if FileManager.default.fileExists(atPath: logURL.path) {
        let handle = try FileHandle(forWritingTo: logURL)
        try handle.seekToEnd()
        if let data = line.data(using: .utf8) {
          try handle.write(contentsOf: data)
        }
        try handle.close()
      } else {
        try line.write(to: logURL, atomically: true, encoding: .utf8)
      }
    } catch {
      logger.warning("failed to write \(label) log: \(error.localizedDescription)")
    }
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    /**
     CDXC:CrashDiagnostics 2026-04-27-18:31
     The native host should terminate after its last window closes, and this
     delegate decision must be an explicit Bool return so Swift compilation
     cannot depend on expression-style behavior that methods do not support.
     */
    Self.appendNativeHostLifecycleLog("applicationShouldTerminateAfterLastWindowClosed result=true")
    return true
  }

  func windowWillClose(_ notification: Notification) {
    persistMainWindowSize()
    Self.appendNativeHostLifecycleLog(
      "windowWillClose title=\(window?.title ?? "<missing>") visibleBeforeClose=\(window?.isVisible ?? false)"
    )
  }

  func windowDidResize(_ notification: Notification) {
    persistMainWindowSize()
  }

  func findSurface(forUUID uuid: UUID) -> Ghostty.SurfaceView? {
    MainActor.assumeIsolated {
      workspaceView?.subviews.compactMap { $0 as? Ghostty.SurfaceView }.first { $0.id == uuid }
    }
  }

  func performGhosttyBindingMenuKeyEquivalent(with event: NSEvent) -> Bool {
    NSApp.mainMenu?.performKeyEquivalent(with: event) ?? false
  }

  @IBAction nonisolated func checkForUpdates(_ sender: Any?) {}

  @IBAction nonisolated func closeAllWindows(_ sender: Any?) {}

  @IBAction nonisolated func toggleQuickTerminal(_ sender: Any?) {}

  nonisolated func toggleVisibility(_ sender: Any?) {}

  nonisolated func syncFloatOnTopMenu(_ window: NSWindow) {}

  nonisolated func setSecureInput(_ mode: Ghostty.SetSecureInput) {}

  @MainActor
  private func makeWindow() {
    let root = zmuxRootView(
      ghostty: ghostty,
      sendEvent: { [weak self] event in
        self?.bridge?.send(event)
        (self?.window?.contentView as? zmuxRootView)?.postHostEvent(event)
      },
      configureZedOverlay: { [weak self] command in
        self?.handle(.configureZedOverlay(command))
      },
      syncGhosttyTerminalSettings: { [weak self] command in
        self?.handle(.syncGhosttyTerminalSettings(command))
      },
      applyGhosttyConfigSettings: { [weak self] command in
        self?.handle(.applyGhosttyConfigSettings(command))
      },
      openGhosttyConfigFile: { [weak self] in
        self?.handle(.openGhosttyConfigFile)
      },
      openBrowserWindow: { [weak self] command in
        self?.handle(.openBrowserWindow(command))
      },
      openZedWorkspace: { [weak self] command in
        self?.handle(.openZedWorkspace(command))
      },
      showBrowserWindow: { [weak self] in
        self?.handle(.showBrowserWindow)
      }
    )
    workspaceView = root.workspaceView

    let initialWindowFrame = restoredInitialWindowFrame()
    let window = zmuxFocusReportingWindow(
      contentRect: initialWindowFrame,
      styleMask: [.closable, .miniaturizable, .resizable, .titled],
      backing: .buffered,
      defer: false
    )
    window.onFirstResponderChanged = { [weak root] responder in
      root?.workspaceView.windowFirstResponderChanged(responder, reason: "windowMakeFirstResponder")
    }
    window.onKeyEquivalent = { [weak root] event in
      root?.handleHotkeyEquivalent(event) ?? false
    }
    window.title = "zmux"
    window.titleVisibility = .hidden
    window.contentView = root
    window.delegate = self
    installAttachToIdeTitlebarButton(on: window)
    window.makeKeyAndOrderFront(nil)
    self.window = window
    let zedOverlayController = ZedOverlayController(
      window: window,
      initialWindowSize: initialWindowFrame.size,
      didActivateAttachment: { [weak self] in
        self?.browserOverlayController?.markBrowserNoLongerShownInAttachment(
          reason: "zmuxActivated"
        )
      },
      didHideAttachment: { [weak self] in
        self?.browserOverlayController?.logAttachmentEvent(
          "appDelegate.didHideAttachment.beforeMoveBrowser")
        self?.browserOverlayController?.moveBrowserOffscreen()
        self?.browserOverlayController?.logAttachmentEvent(
          "appDelegate.didHideAttachment.afterMoveBrowser")
      },
      didShowAttachment: { [weak self] in
        self?.browserOverlayController?.logAttachmentEvent(
          "appDelegate.didShowAttachment.beforeRestoreBrowser")
        self?.browserOverlayController?.restoreBrowserIfNeeded()
        self?.browserOverlayController?.logAttachmentEvent(
          "appDelegate.didShowAttachment.afterRestoreBrowser")
      },
      didRequestDetach: { [weak self] targetApp in
        self?.detachZedOverlayFromNativeButton(targetApp: targetApp)
      }
    )
    self.zedOverlayController = zedOverlayController
    self.browserOverlayController = BrowserOverlayController(
      window: window,
      workareaFrameProvider: { [weak root] in
        root?.workspaceScreenFrame()
      },
      setCompanionBrowserActive: { [weak zedOverlayController] active in
        zedOverlayController?.setCompanionApplicationBundleIdentifiers(
          active ? [BrowserOverlayController.chromeCanaryBundleIdentifier] : []
        )
      }
    )
    if let pendingZedOverlayConfiguration {
      zedOverlayController.configure(pendingZedOverlayConfiguration)
      updateAttachToIdeTitlebarButton(
        enabled: pendingZedOverlayConfiguration.enabled,
        targetApp: pendingZedOverlayConfiguration.targetApp
      )
      self.pendingZedOverlayConfiguration = nil
    } else if let initialZedOverlayConfiguration = initialZedOverlayConfiguration() {
      zedOverlayController.configure(initialZedOverlayConfiguration)
      updateAttachToIdeTitlebarButton(
        enabled: initialZedOverlayConfiguration.enabled,
        targetApp: initialZedOverlayConfiguration.targetApp
      )
    }
    NSApp.activate(ignoringOtherApps: true)
  }

  private func restoredInitialWindowFrame() -> NSRect {
    /**
     CDXC:NativeWindowChrome 2026-04-28-05:44
     Startup should use the previous close/resize size as the source of truth.
     Position remains a stable default, while standalone size is bounded only
     by native window minimums. IDE-attached startup applies its own existing
     maximum-size constraint after this saved size is loaded.
     */
    let stored = nativeSettingsStore.readMainWindowChrome()
    let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
    let width = max(stored.width ?? 1440, 320)
    let height = max(stored.height ?? 900, 240)
    let x = screenFrame.minX + min(100, max(0, screenFrame.width - width))
    let y = screenFrame.minY + min(80, max(0, screenFrame.height - height))
    return NSRect(x: x, y: y, width: width, height: height)
  }

  private func persistMainWindowSize() {
    guard let window else {
      return
    }
    nativeSettingsStore.persistMainWindowSize(window.frame.size)
  }

  @MainActor private func installAttachToIdeTitlebarButton(on window: NSWindow) {
    /**
     CDXC:IDEAttachment 2026-04-27-00:54
     The attach action belongs at the center of the native title bar and
     should read as a text button, matching the rounded AppKit style of the
     floating Show zmux/Show IDE buttons instead of using a blue link icon.
     Its label names the currently selected IDE in the shortest requested
     form and switches between Attach/Detach from the persisted
     attach-enabled state.
     */
    let stored = nativeSettingsStore.readZedOverlay()
    let targetApp = stored.targetApp ?? .zedPreview
    let button = NSButton(
      title: attachToIdeTitlebarButtonTitle(enabled: stored.enabled ?? false, targetApp: targetApp),
      target: self,
      action: #selector(handleAttachToIdeTitlebarButton)
    )
    button.bezelStyle = .rounded
    button.controlSize = .small
    button.font = .systemFont(ofSize: 12, weight: .semibold)
    button.toolTip = "Attach to IDE"
    button.setButtonType(.momentaryPushIn)
    button.translatesAutoresizingMaskIntoConstraints = false

    guard let titlebarView = window.standardWindowButton(.closeButton)?.superview else {
      return
    }
    titlebarView.addSubview(button)
    let centerYAnchor =
      window.standardWindowButton(.closeButton)?.centerYAnchor ?? titlebarView.centerYAnchor
    NSLayoutConstraint.activate([
      button.centerXAnchor.constraint(equalTo: titlebarView.centerXAnchor),
      button.centerYAnchor.constraint(equalTo: centerYAnchor),
      button.heightAnchor.constraint(equalToConstant: 24),
      button.widthAnchor.constraint(greaterThanOrEqualToConstant: 132),
    ])
    attachToIdeTitlebarButton = button
  }

  @objc @MainActor private func handleAttachToIdeTitlebarButton() {
    let stored = nativeSettingsStore.readZedOverlay()
    let targetApp = stored.targetApp ?? .zedPreview
    let nextEnabled = !(stored.enabled ?? false)
    let command = ConfigureZedOverlay(
      enabled: nextEnabled,
      targetApp: targetApp,
      workspacePath: workspacePath
    )
    handle(.configureZedOverlay(command))
    if nextEnabled {
      (window?.contentView as? zmuxRootView)?.applyNativeZedOverlayAttached(targetApp: targetApp)
    } else {
      (window?.contentView as? zmuxRootView)?.applyNativeZedOverlayDetached(targetApp: targetApp)
    }
  }

  @MainActor private func updateAttachToIdeTitlebarButton(
    enabled: Bool,
    targetApp: ZedOverlayTargetApp
  ) {
    attachToIdeTitlebarButton?.title = attachToIdeTitlebarButtonTitle(
      enabled: enabled,
      targetApp: targetApp
    )
  }

  private func attachToIdeTitlebarButtonTitle(
    enabled: Bool,
    targetApp: ZedOverlayTargetApp
  ) -> String {
    let action = enabled ? "Detach" : "Attach"
    switch targetApp {
    case .zed:
      return "\(action) Zed"
    case .zedPreview:
      return "\(action) Zed"
    case .vscode:
      return "\(action) VS Code"
    case .vscodeInsiders:
      return "\(action) VS Code"
    }
  }

  @MainActor
  private func startBridge() {
    do {
      let bridge = try NativeHostBridge { [weak self] command in
        self?.handle(command)
      }
      self.bridge = bridge
      bridge.start()
    } catch {
      workspaceView?.createTerminal(
        CreateTerminal(
          cwd: FileManager.default.currentDirectoryPath,
          env: nil,
          initialInput: "printf 'Failed to start zmux bridge: \(error.localizedDescription)\\n'\r",
          sessionId: "bridge-error",
          title: "Bridge error"
        ))
    }
  }

  @MainActor
  private func handle(_ command: HostCommand) {
    switch command {
    case .createTerminal(let command):
      workspaceView?.createTerminal(command)
    case .createWebPane(let command):
      workspaceView?.createWebPane(command)
    case .closeTerminal(let command):
      workspaceView?.closeTerminal(sessionId: command.sessionId)
    case .closeWebPane(let command):
      workspaceView?.closeWebPane(sessionId: command.sessionId)
    case .focusTerminal(let command):
      workspaceView?.focusTerminal(sessionId: command.sessionId)
    case .focusWebPane(let command):
      workspaceView?.focusWebPane(sessionId: command.sessionId)
    case .startT3CodeRuntime(let command):
      startT3CodeRuntime(command)
    case .activateApp:
      activateAppWindow()
    case .writeTerminalText(let command):
      workspaceView?.writeTerminalText(sessionId: command.sessionId, text: command.text)
    case .sendTerminalEnter(let command):
      workspaceView?.sendTerminalEnter(sessionId: command.sessionId)
    case .setActiveTerminalSet(let command):
      workspaceView?.setActiveTerminalSet(command)
    case .setTerminalLayout(let command):
      workspaceView?.setTerminalLayout(command.layout)
    case .setTerminalVisibility(let command):
      workspaceView?.setTerminalVisibility(sessionId: command.sessionId, visible: command.visible)
    case .pickWorkspaceFolder:
      break
    case .pickWorkspaceIcon:
      break
    case .showMessage(let command):
      showMessage(command)
    case .appendAgentDetectionDebugLog(let command):
      Self.appendAgentDetectionDebugLog(event: command.event, details: command.details)
    case .appendTerminalFocusDebugLog(let command):
      Self.appendTerminalFocusDebugLog(event: command.event, details: command.details)
    case .appendRestoreDebugLog(let command):
      Self.appendRestoreDebugLog(event: command.event, details: command.details)
    case .appendSessionTitleDebugLog(let command):
      Self.appendSessionTitleDebugLog(event: command.event, details: command.details)
    case .appendWorkspaceDockIndicatorDebugLog(let command):
      Self.appendWorkspaceDockIndicatorDebugLog(event: command.event, details: command.details)
    case .persistSharedSidebarStorage(let command):
      Self.persistSharedSidebarStorage(command)
    case .playSound(let command):
      NativeSoundPlayer.shared.play(command)
    case .runProcess(let command):
      runProcess(command) { [weak self] event in
        self?.bridge?.send(event)
      }
    case .syncGhosttyTerminalSettings(let command):
      syncGhosttyTerminalSettings(command)
    case .applyGhosttyConfigSettings(let command):
      applyGhosttyConfigSettings(command)
    case .openGhosttyConfigFile:
      openGhosttyConfigFile()
    case .openExternalUrl(let command):
      openExternalUrl(command)
    case .openBrowserWindow(let command):
      browserOverlayController?.open(command)
    case .showBrowserWindow:
      browserOverlayController?.showRunningChromeCanary()
    case .setSidebarSide(let command):
      (window?.contentView as? zmuxRootView)?.setSidebarSide(command.side)
    case .configureZedOverlay(let command):
      if let workspacePath = command.workspacePath {
        self.workspacePath = workspacePath
      }
      updateAttachToIdeTitlebarButton(enabled: command.enabled, targetApp: command.targetApp)
      nativeSettingsStore.persistZedOverlay(command)
      guard let zedOverlayController else {
        /**
         CDXC:ZedOverlay 2026-04-26-03:29
         The sidebar webview can send saved Zed overlay settings while
         the AppKit window is still being assembled. Preserve that
         command and apply it once the native overlay controller exists.
         */
        pendingZedOverlayConfiguration = command
        return
      }
      zedOverlayController.configure(command)
    case .openZedWorkspace(let command):
      self.workspacePath = command.workspacePath
      zedOverlayController?.openWorkspace(
        targetApp: command.targetApp, workspacePath: command.workspacePath)
    case .sidebarCliCommand(let command):
      runSidebarCliCommand(command)
    }
  }

  /**
   CDXC:T3Code 2026-04-30-02:38
   Native T3 Code launches must use desktop/no-browser mode before the WKWebView
   pane loads localhost. Running the plain CLI would open an external browser,
   which is the behavior this integration replaces.
   */
  @MainActor
  private func startT3CodeRuntime(_ command: StartT3CodeRuntime) {
    if let process = t3CodeRuntimeProcess, process.isRunning {
      return
    }

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = [
      "npx", "--yes", "t3",
      "--mode", "desktop",
      "--host", "127.0.0.1",
      "--port", "3774",
      "--no-browser",
    ]
    process.currentDirectoryURL = URL(fileURLWithPath: command.cwd, isDirectory: true)
    process.standardInput = FileHandle.nullDevice
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
      t3CodeRuntimeProcess = process
    } catch {
      Self.logger.error("Failed to start T3 Code runtime: \(error.localizedDescription)")
    }
  }

  @MainActor private func activateAppWindow() {
    /**
     CDXC:AgentManagerXBridge 2026-04-27-20:34
     Agent Manager focus commands for zmux sessions should bring the native
     workarea forward before selecting the requested Ghostty surface.
     */
    NSApp.activate(ignoringOtherApps: true)
    window?.makeKeyAndOrderFront(nil)
  }

  @MainActor private func presentAccessibilityPermissionDialogIfNeeded() {
    guard !hasPresentedAccessibilityPermissionDialog, !AXIsProcessTrusted() else {
      return
    }
    hasPresentedAccessibilityPermissionDialog = true
    NSApp.activate(ignoringOtherApps: true)
    window?.makeKeyAndOrderFront(nil)

    /**
     CDXC:AccessibilityPermissions 2026-04-28-16:57
     Accessibility permission should be requested on first startup when it is
     missing, independent of whether the user has enabled IDE attachment. Keep
     the copy narrow: zmux uses this permission only to move/resize the
     integrated browser window and attach to Zed, VS Code, or other supported
     IDE windows.
     */
    let alert = NSAlert()
    alert.messageText = "Accessibility Permissions Required"
    alert.informativeText =
      "zmux uses Accessibility only to move the integrated browser to the correct position and size, and to attach to Zed, VS Code, or other IDE windows. Click OK to open System Settings and enable Accessibility for zmux. A restart may be required after granting permission."
    alert.alertStyle = .warning
    alert.addButton(withTitle: "OK")
    alert.addButton(withTitle: "Cancel")

    if let primaryButton = alert.buttons.first {
      primaryButton.keyEquivalent = "\r"
      primaryButton.bezelColor = .controlAccentColor
    }
    if alert.buttons.count > 1 {
      alert.buttons[1].keyEquivalent = "\u{1b}"
    }

    let result = alert.runModal()
    guard result == .alertFirstButtonReturn else {
      return
    }
    openAccessibilityPreferences()
  }

  private func openAccessibilityPreferences() {
    guard
      let url = URL(
        string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
    else {
      return
    }
    NSWorkspace.shared.open(url)
  }

  @MainActor private func runSidebarCliCommand(_ command: SidebarCliCommand) {
    /**
     CDXC:DebugCli 2026-04-27-07:18
     The CLI must exercise the same sidebar/runtime code paths as a user
     click. Forward debug commands into the sidebar webview and return the
     JSON result through the existing bridge instead of creating orphan
     native terminals behind the sidebar's state.
     */
    guard let sidebarView = (window?.contentView as? zmuxRootView)?.sidebarWebView else {
      bridge?.send(
        .sidebarCliResult(
          requestId: command.requestId,
          ok: false,
          payloadJson: #"{"error":"sidebar-webview-missing"}"#
        ))
      return
    }
    guard
      let actionJson = Self.javascriptStringLiteral(command.action),
      let payloadJson = Self.javascriptStringLiteral(command.payloadJson ?? "{}")
    else {
      bridge?.send(
        .sidebarCliResult(
          requestId: command.requestId,
          ok: false,
          payloadJson: #"{"error":"sidebar-cli-command-encoding-failed"}"#
        ))
      return
    }
    let script = """
      (async () => {
        const handler = window.__zmux_NATIVE_CLI__;
        if (!handler || typeof handler.handleCommand !== 'function') {
          return JSON.stringify({ ok: false, error: 'sidebar-cli-handler-missing' });
        }
        return JSON.stringify(await handler.handleCommand(\(actionJson), JSON.parse(\(payloadJson))));
      })()
      """
    sidebarView.evaluateJavaScript(script) { [weak self] result, error in
      let payloadJson: String
      let ok: Bool
      if let error {
        ok = false
        payloadJson = Self.jsonObjectString(["error": error.localizedDescription])
      } else if let result = result as? String {
        ok = !result.contains(#""ok":false"#)
        payloadJson = result
      } else {
        ok = false
        payloadJson = #"{"error":"sidebar-cli-result-missing"}"#
      }
      self?.bridge?.send(
        .sidebarCliResult(
          requestId: command.requestId,
          ok: ok,
          payloadJson: payloadJson
        ))
    }
  }

  private static func javascriptStringLiteral(_ value: String) -> String? {
    guard let data = try? JSONEncoder().encode(value) else {
      return nil
    }
    return String(data: data, encoding: .utf8)
  }

  fileprivate static func jsonObjectString(_ value: [String: String]) -> String {
    guard let data = try? JSONEncoder().encode(value),
      let text = String(data: data, encoding: .utf8)
    else {
      return #"{"error":"json-encoding-failed"}"#
    }
    return text
  }

  @MainActor private func detachZedOverlayFromNativeButton(targetApp: ZedOverlayTargetApp) {
    /**
     CDXC:ZedOverlay 2026-04-26-10:54
     The native Detach button must behave like turning off the sidebar
     attach checkbox: persist the disabled attach setting, apply standalone
     window behavior immediately, and update the sidebar settings UI.
     */
    let command = ConfigureZedOverlay(
      enabled: false,
      targetApp: targetApp,
      workspacePath: workspacePath
    )
    handle(.configureZedOverlay(command))
    (window?.contentView as? zmuxRootView)?.applyNativeZedOverlayDetached(targetApp: targetApp)
  }

  private func initialZedOverlayConfiguration() -> ConfigureZedOverlay? {
    let environment = ProcessInfo.processInfo.environment
    let stored = nativeSettingsStore.readZedOverlay()
    let enabledValue =
      environment["zmux_ZED_OVERLAY_ENABLED"].map { value in
        value == "1" || value.lowercased() == "true"
      } ?? stored.enabled
    guard let enabledValue else {
      return nil
    }
    let targetApp =
      environment["zmux_ZED_OVERLAY_TARGET_APP"]
      .flatMap(ZedOverlayTargetApp.init(rawValue:))
      ?? stored.targetApp
      ?? .zedPreview
    return ConfigureZedOverlay(
      enabled: enabledValue,
      targetApp: targetApp,
      workspacePath: workspacePath
    )
  }

  private func syncGhosttyTerminalSettings(_ command: SyncGhosttyTerminalSettings) {
    /**
     CDXC:TerminalSettings 2026-04-26-19:02
     zmux settings run in the native sidebar webview and must write the
     same Ghostty config file selected for embedded terminals. Keep the
     merge narrow so themes, keybinds, and unrelated Ghostty settings stay
     user-owned.
     */
    do {
      let configURL =
        ghosttyConfigSelection.path.map { URL(fileURLWithPath: $0) }
        ?? Self.defaultWritableGhosttyConfigURL()
      let existingConfig = (try? String(contentsOf: configURL, encoding: .utf8)) ?? ""
      let mergedConfig = Self.mergeGhosttyTerminalSettings(existingConfig, command)
      try FileManager.default.createDirectory(
        at: configURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      try mergedConfig.write(to: configURL, atomically: true, encoding: .utf8)
      scheduleGhosttyConfigReload(immediate: command.reloadImmediately == true)
    } catch {
      Self.logger.error("Failed to sync Ghostty terminal settings: \(error.localizedDescription)")
    }
  }

  private func applyGhosttyConfigSettings(_ command: ApplyGhosttyConfigSettings) {
    /**
     CDXC:GhosttySettings 2026-04-30-01:48
     Ghostty config action buttons must edit the real selected config file,
     not only zmux sidebar state. Merge only managed keys so reset restores
     Ghostty defaults without discarding unrelated user configuration.
     */
    do {
      let configURL =
        ghosttyConfigSelection.path.map { URL(fileURLWithPath: $0) }
        ?? Self.defaultWritableGhosttyConfigURL()
      let existingConfig = (try? String(contentsOf: configURL, encoding: .utf8)) ?? ""
      let mergedConfig = Self.mergeGhosttyConfigSettings(
        existingConfig,
        lines: command.lines,
        managedKeys: Set(command.managedKeys)
      )
      try FileManager.default.createDirectory(
        at: configURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      try mergedConfig.write(to: configURL, atomically: true, encoding: .utf8)
      scheduleGhosttyConfigReload(immediate: command.reloadImmediately == true)
    } catch {
      Self.logger.error("Failed to apply Ghostty config settings: \(error.localizedDescription)")
    }
  }

  private func scheduleGhosttyConfigReload(immediate: Bool = false) {
    /**
     CDXC:TerminalSettings 2026-04-26-20:21
     Slider drags can emit many terminal-setting writes. Reload embedded
     Ghostty automatically only after the user stops changing values for
     three seconds, matching Ghostty's reloadConfig API without causing
     repeated font/metric rebuilds during a continuous drag.

     CDXC:TerminalScrollSettings 2026-04-29-08:56
     Mouse scroll multiplier changes do not rebuild font metrics and need
     immediate feedback, so scroll-only changes bypass the delayed reload.
     */
    pendingGhosttyConfigReloadTimer?.invalidate()
    if immediate {
      pendingGhosttyConfigReloadTimer = nil
      ghostty.reloadConfig()
      return
    }
    pendingGhosttyConfigReloadTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: false) {
      [weak self] _ in
      MainActor.assumeIsolated {
        guard let self else {
          return
        }
        self.pendingGhosttyConfigReloadTimer = nil
        self.ghostty.reloadConfig()
      }
    }
  }

  private static func defaultWritableGhosttyConfigURL() -> URL {
    let appSupport = FileManager.default.urls(
      for: .applicationSupportDirectory, in: .userDomainMask)[0]
    return appSupport.appendingPathComponent("com.mitchellh.ghostty/config")
  }

  private static func mergeGhosttyTerminalSettings(
    _ config: String,
    _ command: SyncGhosttyTerminalSettings
  ) -> String {
    var retainedLines =
      config
      .components(separatedBy: .newlines)
      .filter { shouldRetainGhosttyConfigLine($0) }
    while retainedLines.last?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true {
      retainedLines.removeLast()
    }
    let lines =
      retainedLines + [
        "font-family = \(formatGhosttyString(command.fontFamily))",
        "font-size = \(formatGhosttyNumber(command.fontSize))",
        "font-thicken = \(command.fontThicken ? "true" : "false")",
        "font-thicken-strength = \(max(0, min(255, command.fontThickenStrength)))",
        "adjust-cell-height = \(formatGhosttyPercent(command.adjustCellHeightPercent))",
        "adjust-cell-width = \(formatGhosttyNumber(command.adjustCellWidth))",
        /**
         CDXC:TerminalScrollSettings 2026-04-29-08:56
         zmux manages Ghostty scroll speed through the documented prefixed
         mouse-scroll-multiplier values so precision devices and discrete
         mouse wheels keep separate settings in the shared Ghostty config.
         */
        "mouse-scroll-multiplier = precision:\(formatGhosttyNumber(command.mouseScrollMultiplierPrecision)),discrete:\(formatGhosttyNumber(command.mouseScrollMultiplierDiscrete))",
      ]
    return lines.joined(separator: "\n") + "\n"
  }

  private static func mergeGhosttyConfigSettings(
    _ config: String,
    lines: [String],
    managedKeys: Set<String>
  ) -> String {
    var retainedLines =
      config
      .components(separatedBy: .newlines)
      .filter { !managedKeys.contains(readGhosttyConfigKey($0)) }
    while retainedLines.last?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true {
      retainedLines.removeLast()
    }
    var nextLines = retainedLines + lines
    while nextLines.last?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true {
      nextLines.removeLast()
    }
    return nextLines.isEmpty ? "" : nextLines.joined(separator: "\n") + "\n"
  }

  private static func shouldRetainGhosttyConfigLine(_ line: String) -> Bool {
    let managedKeys: Set<String> = [
      "adjust-cell-height",
      "adjust-cell-width",
      "font-family",
      "font-size",
      "font-thicken",
      "font-thicken-strength",
      "mouse-scroll-multiplier",
    ]
    let key = readGhosttyConfigKey(line)
    if managedKeys.contains(key) {
      return false
    }
    if key != "font-variation" {
      return true
    }
    return !readGhosttyConfigValue(line)
      .split(separator: ",")
      .contains {
        $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().hasPrefix("wght=")
      }
  }

  private static func readGhosttyConfigKey(_ line: String) -> String {
    let trimmedLine = line.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmedLine.isEmpty || trimmedLine.hasPrefix("#") {
      return ""
    }
    return trimmedLine.split(separator: "=", maxSplits: 1).first.map {
      String($0).trimmingCharacters(in: .whitespacesAndNewlines)
    } ?? ""
  }

  private static func readGhosttyConfigValue(_ line: String) -> String {
    guard let equalsIndex = line.firstIndex(of: "=") else {
      return ""
    }
    return String(line[line.index(after: equalsIndex)...]).trimmingCharacters(
      in: .whitespacesAndNewlines)
  }

  private static func formatGhosttyString(_ value: String) -> String {
    "\"\(value.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\""))\""
  }

  private static func formatGhosttyNumber(_ value: Double) -> String {
    if value.rounded() == value {
      return String(Int(value))
    }
    return String(format: "%.2f", value)
      .replacingOccurrences(of: #"0+$"#, with: "", options: .regularExpression)
      .replacingOccurrences(of: #"\.$"#, with: "", options: .regularExpression)
  }

  private static func formatGhosttyPercent(_ value: Double) -> String {
    "\(formatGhosttyNumber(value * 100))%"
  }

  private func showMessage(_ command: ShowMessage) {
    let alert = NSAlert()
    switch command.level {
    case .info:
      alert.alertStyle = .informational
    case .warning:
      alert.alertStyle = .warning
    case .error:
      alert.alertStyle = .critical
    }
    alert.messageText = "zmux"
    alert.informativeText = command.message
    alert.addButton(withTitle: "OK")
    if let window {
      alert.beginSheetModal(for: window)
    } else {
      alert.runModal()
    }
  }

  private func openExternalUrl(_ command: OpenExternalUrl) {
    guard let url = URL(string: command.url) else {
      return
    }
    NSWorkspace.shared.open(url)
  }

  private func openGhosttyConfigFile() {
    /**
     CDXC:GhosttySettings 2026-04-30-01:48
     The settings modal's config-file button should open the selected Ghostty
     config path directly. Create an empty file when missing so the editor has
     a concrete target instead of opening only the parent directory.
     */
    do {
      let configURL =
        ghosttyConfigSelection.path.map { URL(fileURLWithPath: $0) }
        ?? Self.defaultWritableGhosttyConfigURL()
      try FileManager.default.createDirectory(
        at: configURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      if !FileManager.default.fileExists(atPath: configURL.path) {
        try "".write(to: configURL, atomically: true, encoding: .utf8)
      }
      NSWorkspace.shared.open(configURL)
    } catch {
      Self.logger.error("Failed to open Ghostty config file: \(error.localizedDescription)")
    }
  }

  private func runProcess(_ command: RunProcess, sendEvent: @escaping (HostEvent) -> Void) {
    Task.detached {
      let process = Process()
      process.executableURL = URL(fileURLWithPath: command.executable)
      process.arguments = command.args
      if let cwd = command.cwd {
        process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
      }
      if let env = command.env {
        process.environment = ProcessInfo.processInfo.environment.merging(env) { _, newValue in
          newValue
        }
      }
      let stdoutPipe = Pipe()
      let stderrPipe = Pipe()
      process.standardInput = FileHandle.nullDevice
      process.standardOutput = stdoutPipe
      process.standardError = stderrPipe

      do {
        try process.run()
        process.waitUntilExit()
        let stdoutData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
        let stderrData = stderrPipe.fileHandleForReading.readDataToEndOfFile()
        let stdout = String(data: stdoutData, encoding: .utf8) ?? ""
        let stderr = String(data: stderrData, encoding: .utf8) ?? ""
        await MainActor.run {
          sendEvent(
            .processResult(
              requestId: command.requestId,
              exitCode: process.terminationStatus,
              stdout: stdout,
              stderr: stderr
            ))
        }
      } catch {
        await MainActor.run {
          sendEvent(
            .processResult(
              requestId: command.requestId,
              exitCode: 127,
              stdout: "",
              stderr: error.localizedDescription
            ))
        }
      }
    }
  }
}

private struct NativeZedOverlaySettings {
  let enabled: Bool?
  let targetApp: ZedOverlayTargetApp?
}

private struct NativeSidebarChromeSettings {
  let width: CGFloat?
}

private struct NativeMainWindowChromeSettings {
  let width: CGFloat?
  let height: CGFloat?
}

private final class NativeSettingsStore {
  private static let logger = Logger(subsystem: "com.madda.zmux.host", category: "settings")
  private static let defaultHotkeys: [String: String] = [
    "createSession": "cmd+alt+n",
    "focusDown": "cmd+alt+shift+down",
    "focusGroup1": "cmd+alt+shift+1",
    "focusGroup2": "cmd+alt+shift+2",
    "focusGroup3": "cmd+alt+shift+3",
    "focusGroup4": "cmd+alt+shift+4",
    "focusLeft": "cmd+alt+shift+left",
    "focusNextSession": "cmd+alt+]",
    "focusPreviousSession": "cmd+alt+[",
    "focusRight": "cmd+alt+shift+right",
    "focusSessionSlot1": "cmd+alt+1",
    "focusSessionSlot2": "cmd+alt+2",
    "focusSessionSlot3": "cmd+alt+3",
    "focusSessionSlot4": "cmd+alt+4",
    "focusSessionSlot5": "cmd+alt+5",
    "focusSessionSlot6": "cmd+alt+6",
    "focusSessionSlot7": "cmd+alt+7",
    "focusSessionSlot8": "cmd+alt+8",
    "focusSessionSlot9": "cmd+alt+9",
    "focusUp": "cmd+alt+shift+up",
    "moveSidebar": "cmd+alt+b",
    "openSettings": "cmd+alt+,",
    "renameActiveSession": "cmd+alt+r",
    "showFour": "cmd+alt+s 4",
    "showNine": "cmd+alt+s 9",
    "showOne": "cmd+alt+s 1",
    "showSix": "cmd+alt+s 6",
    "showThree": "cmd+alt+s 3",
    "showTwo": "cmd+alt+s 2",
  ]

  /**
   CDXC:ZedOverlay 2026-04-26-04:14
   The all-native host must keep the Zed overlay setting in native app state,
   not only WKWebView localStorage. Reading and writing the same settings file
   used by the packaged app keeps the overlay button enabled after restarts.
   */
  func readZedOverlay() -> NativeZedOverlaySettings {
    guard let settings = readSettingsDictionary() else {
      return NativeZedOverlaySettings(enabled: nil, targetApp: nil)
    }
    return NativeZedOverlaySettings(
      enabled: settings["zedOverlayEnabled"] as? Bool,
      targetApp: (settings["zedOverlayTargetApp"] as? String).flatMap(
        ZedOverlayTargetApp.init(rawValue:))
    )
  }

  func persistZedOverlay(_ command: ConfigureZedOverlay) {
    do {
      let url = settingsURL()
      var settings = readSettingsDictionary() ?? [:]
      settings["zedOverlayEnabled"] = command.enabled
      settings["zedOverlayTargetApp"] = command.targetApp.rawValue
      let data = try JSONSerialization.data(
        withJSONObject: settings, options: [.prettyPrinted, .sortedKeys])
      try FileManager.default.createDirectory(
        at: url.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      try data.write(to: url, options: [.atomic])
    } catch {
      Self.logger.error("Failed to persist Zed overlay settings: \(error.localizedDescription)")
    }
  }

  /**
   CDXC:NativeSidebarChrome 2026-04-26-07:16
   The native sidebar width is user-resized AppKit chrome, so it must be
   stored in the shared native settings file and restored before the first
   layout after an app restart.
   */
  func readSidebarChrome() -> NativeSidebarChromeSettings {
    guard let settings = readSettingsDictionary() else {
      return NativeSidebarChromeSettings(width: nil)
    }
    return NativeSidebarChromeSettings(width: Self.readCGFloat(settings["sidebarWidth"]))
  }

  func readHotkeys() -> [String: String] {
    guard let settings = readSharedSidebarSettingsDictionary() else {
      return Self.defaultHotkeys
    }
    var hotkeys = Self.defaultHotkeys
    if let customHotkeys = settings["hotkeys"] as? [String: Any] {
      for (key, value) in customHotkeys {
        if let text = value as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        {
          hotkeys[key] = Self.normalizeHotkeyText(text)
        }
      }
    }
    return hotkeys
  }

  func persistSidebarWidth(_ width: CGFloat) {
    do {
      let url = settingsURL()
      var settings = readSettingsDictionary() ?? [:]
      settings["sidebarWidth"] = width
      let data = try JSONSerialization.data(
        withJSONObject: settings, options: [.prettyPrinted, .sortedKeys])
      try FileManager.default.createDirectory(
        at: url.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      try data.write(to: url, options: [.atomic])
    } catch {
      Self.logger.error("Failed to persist sidebar width: \(error.localizedDescription)")
    }
  }

  /**
   CDXC:NativeWindowChrome 2026-04-28-05:44
   The native host must reopen at the same main-window size the user last
   closed or resized. Store only width and height in the shared native settings
   file so startup can preserve the user's size without reviving stale screen
   positions or offscreen IDE attachment coordinates.
   */
  func readMainWindowChrome() -> NativeMainWindowChromeSettings {
    guard let settings = readSettingsDictionary() else {
      return NativeMainWindowChromeSettings(width: nil, height: nil)
    }
    return NativeMainWindowChromeSettings(
      width: Self.readCGFloat(settings["mainWindowWidth"]),
      height: Self.readCGFloat(settings["mainWindowHeight"])
    )
  }

  func persistMainWindowSize(_ size: CGSize) {
    do {
      let url = settingsURL()
      var settings = readSettingsDictionary() ?? [:]
      settings["mainWindowWidth"] = size.width
      settings["mainWindowHeight"] = size.height
      let data = try JSONSerialization.data(
        withJSONObject: settings, options: [.prettyPrinted, .sortedKeys])
      try FileManager.default.createDirectory(
        at: url.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      try data.write(to: url, options: [.atomic])
    } catch {
      Self.logger.error("Failed to persist main window size: \(error.localizedDescription)")
    }
  }

  private func readSettingsDictionary() -> [String: Any]? {
    let url = settingsURL()
    guard let data = try? Data(contentsOf: url),
      let object = try? JSONSerialization.jsonObject(with: data),
      let settings = object as? [String: Any]
    else {
      return nil
    }
    return settings
  }

  private func readSharedSidebarSettingsDictionary() -> [String: Any]? {
    let url = ZmuxAppStorage.sharedStateDirectory.appendingPathComponent(
      "native-sidebar-settings.json")
    guard let data = try? Data(contentsOf: url),
      let object = try? JSONSerialization.jsonObject(with: data),
      let settings = object as? [String: Any]
    else {
      return nil
    }
    return settings
  }

  private static func normalizeHotkeyText(_ text: String) -> String {
    text.trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
      .replacingOccurrences(of: "command", with: "cmd")
      .replacingOccurrences(of: "option", with: "alt")
      .replacingOccurrences(of: "control", with: "ctrl")
      .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
  }

  private func settingsURL() -> URL {
    if let override = ProcessInfo.processInfo.environment["zmux_SETTINGS_PATH"], !override.isEmpty {
      return URL(fileURLWithPath: override)
    }

    let appSupport = FileManager.default.urls(
      for: .applicationSupportDirectory, in: .userDomainMask)[0]
    /**
     CDXC:Distribution 2026-04-27-08:37
     The notarized brew app stores new native settings under its
     com.madda.zmux.host bundle identity, while still reading older local
     development paths so existing sidebar preferences survive the 1.0.0
     distribution rename.
     */
    let existingCandidates = [
      appSupport.appendingPathComponent("com.madda.zmux.host/state/settings.json"),
      appSupport.appendingPathComponent("dev.maddada.zmux/dev/state/settings.json"),
      appSupport.appendingPathComponent("com.zmux.host/state/settings.json"),
    ]
    return existingCandidates.first { FileManager.default.fileExists(atPath: $0.path) }
      ?? existingCandidates[0]
  }

  private static func readCGFloat(_ value: Any?) -> CGFloat? {
    if let number = value as? NSNumber {
      return CGFloat(truncating: number)
    }
    if let string = value as? String, let double = Double(string) {
      return CGFloat(double)
    }
    return nil
  }

  private static func readDouble(_ value: Any?) -> Double? {
    if let number = value as? NSNumber {
      return Double(truncating: number)
    }
    if let string = value as? String, let double = Double(string) {
      return double
    }
    return nil
  }
}

final class zmuxRootView: NSView {
  private static let logger = Logger(subsystem: "com.madda.zmux.host", category: "webview")

  private static let workspaceBarWidth: CGFloat = 54
  private static let sidebarMinWidth: CGFloat = 220
  private static let sidebarMaxWidth: CGFloat = 520
  private static let dividerWidth: CGFloat = 6
  private static let defaultSidebarWidth: CGFloat = 260
  private static let sidebarResetWidth: CGFloat = 260

  let workspaceView: TerminalWorkspaceView
  var sidebarWebView: WKWebView { sidebarView }
  private let sidebarView: WKWebView
  private let modalHostView: WKWebView
  private let scriptBridge: SidebarScriptBridge
  private let sidebarCommandRouter = SidebarCommandRouter()
  private let divider: PaneResizeHandleView
  private let eventEncoder = JSONEncoder()
  private let configureZedOverlay: (ConfigureZedOverlay) -> Void
  private let syncGhosttyTerminalSettings: (SyncGhosttyTerminalSettings) -> Void
  private let applyGhosttyConfigSettings: (ApplyGhosttyConfigSettings) -> Void
  private let openGhosttyConfigFile: () -> Void
  private let openBrowserWindow: (OpenBrowserWindow) -> Void
  private let openZedWorkspace: (OpenZedWorkspace) -> Void
  private let showBrowserWindow: () -> Void
  private let sendHostEvent: (HostEvent) -> Void
  private let nativeSettingsStore = NativeSettingsStore()
  private var isModalHostReady = false
  private var pendingModalHostOpenMessage: [String: Any]?
  private var latestModalHostSidebarState: [String: Any]?
  private var pendingHotkeyPrefix: String?
  private var pendingHotkeyPrefixExpiresAt: Date?
  private var t3CodeRuntimeProcess: Process?
  private var sidebarWidth: CGFloat
  private var sidebarSide: SidebarSide = .left

  /**
   CDXC:NativeWorkspaceChrome 2026-04-26-00:47
   Native zmux keeps the project/workspace rail and main sidebar in one React
   webview, and uses an AppKit drag handle to resize that combined sidebar
   without disturbing the embedded Ghostty terminal area.
   CDXC:NativeSidebarChrome 2026-04-28-01:16
   Users need sidebar restarts and drag resizing to honor a 200px minimum,
   increasing the previous 190px lower bound by 10px without adding fallback
   width behavior.
   CDXC:NativeSidebarChrome 2026-04-28-02:21
   New sidebar sessions should start at 260px, and double-clicking the native
   resize handle should snap the sidebar back to the same 260px width.
   */
  init(
    ghostty: Ghostty.App,
    sendEvent: @escaping (HostEvent) -> Void,
    configureZedOverlay: @escaping (ConfigureZedOverlay) -> Void,
    syncGhosttyTerminalSettings: @escaping (SyncGhosttyTerminalSettings) -> Void,
    applyGhosttyConfigSettings: @escaping (ApplyGhosttyConfigSettings) -> Void,
    openGhosttyConfigFile: @escaping () -> Void,
    openBrowserWindow: @escaping (OpenBrowserWindow) -> Void,
    openZedWorkspace: @escaping (OpenZedWorkspace) -> Void,
    showBrowserWindow: @escaping () -> Void
  ) {
    self.workspaceView = TerminalWorkspaceView(
      ghostty: ghostty,
      sendEvent: sendEvent
    )
    self.scriptBridge = SidebarScriptBridge(router: sidebarCommandRouter)
    self.configureZedOverlay = configureZedOverlay
    self.syncGhosttyTerminalSettings = syncGhosttyTerminalSettings
    self.applyGhosttyConfigSettings = applyGhosttyConfigSettings
    self.openGhosttyConfigFile = openGhosttyConfigFile
    self.openBrowserWindow = openBrowserWindow
    self.openZedWorkspace = openZedWorkspace
    self.showBrowserWindow = showBrowserWindow
    self.sendHostEvent = sendEvent
    self.sidebarWidth = nativeSettingsStore.readSidebarChrome().width ?? Self.defaultSidebarWidth
    let configuration = WKWebViewConfiguration()
    configuration.userContentController.add(scriptBridge, name: "zmuxNativeHost")
    configuration.userContentController.add(scriptBridge, name: "zmuxAppModalHost")
    configuration.userContentController.add(scriptBridge, name: "zmuxNativeHostDiagnostics")
    let modalHostConfiguration = WKWebViewConfiguration()
    modalHostConfiguration.userContentController.add(scriptBridge, name: "zmuxAppModalHost")
    let cwd =
      ProcessInfo.processInfo.environment["zmux_WORKSPACE_PATH"]
      ?? FileManager.default.currentDirectoryPath
    let workspaceName = URL(fileURLWithPath: cwd).lastPathComponent
    var bootstrap: [String: Any] = [
      "accessibilityPermissionGranted": AXIsProcessTrusted(),
      "cwd": cwd,
      "homeDir": FileManager.default.homeDirectoryForCurrentUser.path,
      "zmuxHomeDir": ZmuxAppStorage.sharedRootDirectory.path,
      "sharedSidebarStorage": ZmuxAppStorage.readSharedSidebarStorage(),
      "workspaceName": workspaceName.isEmpty ? "zmux" : workspaceName,
    ]
    let storedZedOverlay = nativeSettingsStore.readZedOverlay()
    if let enabled = storedZedOverlay.enabled {
      bootstrap["zedOverlayEnabled"] = enabled
    }
    if let targetApp = storedZedOverlay.targetApp {
      bootstrap["zedOverlayTargetApp"] = targetApp.rawValue
    }
    if let zedOverlayEnabled = ProcessInfo.processInfo.environment["zmux_ZED_OVERLAY_ENABLED"] {
      bootstrap["zedOverlayEnabled"] =
        zedOverlayEnabled == "1" || zedOverlayEnabled.lowercased() == "true"
    }
    if let zedOverlayTargetApp = ProcessInfo.processInfo.environment["zmux_ZED_OVERLAY_TARGET_APP"]
    {
      bootstrap["zedOverlayTargetApp"] = zedOverlayTargetApp
    }
    if let data = try? JSONSerialization.data(withJSONObject: bootstrap),
      let json = String(data: data, encoding: .utf8)
    {
      let bootstrapScript = WKUserScript(
        source: "window.__zmux_NATIVE_HOST__ = \(json);",
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
      )
      /**
       CDXC:AccessibilityPermissions 2026-04-28-16:57
       Settings are rendered in the full-window modal host, while the sidebar
       state lives in the sidebar webview. Inject the native Accessibility
       grant state into both webviews so settings can show a short disabled
       notice without asking the React layer to infer macOS privacy state.
       */
      configuration.userContentController.addUserScript(bootstrapScript)
      modalHostConfiguration.userContentController.addUserScript(bootstrapScript)
    }
    configuration.userContentController.addUserScript(
      WKUserScript(
        source: Self.diagnosticsScript,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
      ))
    self.sidebarView = WKWebView(frame: .zero, configuration: configuration)
    self.modalHostView = WKWebView(frame: .zero, configuration: modalHostConfiguration)
    self.divider = PaneResizeHandleView()
    super.init(frame: .zero)

    sidebarCommandRouter.onCommand = { [weak self] command in
      self?.handleSidebarCommand(command)
    }
    sidebarCommandRouter.onAppModalHostMessage = { [weak self] body in
      self?.handleAppModalHostMessage(body)
    }
    divider.onDrag = { [weak self] deltaX in
      self?.resizeSidebar(by: deltaX)
    }
    divider.onDragEnded = { [weak self] in
      self?.persistSidebarWidth()
    }
    divider.onDoubleClick = { [weak self] in
      self?.resetSidebarWidth()
    }

    wantsLayer = true
    layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
    sidebarView.setValue(false, forKey: "drawsBackground")
    modalHostView.setValue(false, forKey: "drawsBackground")
    modalHostView.isHidden = true
    sidebarView.navigationDelegate = self
    addSubview(workspaceView)
    /**
     CDXC:NativeWorkspaceChrome 2026-04-26-05:40
     Ghostty surfaces can keep native subviews/layers that draw and receive
     events aggressively. Add the terminal workspace behind the sidebar
     chrome so project/session controls always own their visible hit area.
     */
    addSubview(sidebarView)
    addSubview(divider)
    /**
     CDXC:AppModals 2026-04-26-15:10
     Sidebar dialogs need a full-window React host because WKWebView portals
     cannot escape the sidebar's frame. Keep this transparent overlay above
     terminal and sidebar chrome, and show it only while a modal is active.
     */
    addSubview(modalHostView)
    loadSidebar()
    loadModalHost()
  }

  func postHostEvent(_ event: HostEvent) {
    guard let data = try? eventEncoder.encode(event),
      let json = String(data: data, encoding: .utf8)
    else {
      return
    }
    sidebarView.evaluateJavaScript(
      """
      window.dispatchEvent(new CustomEvent('zmux-native-host-event', { detail: \(json) }));
      /**
       CDXC:NativeBridge 2026-04-29-22:03
       Native-to-sidebar event delivery is signaled through DOM events; return
       undefined so WebKit never treats a CustomEvent return object as a bridge
       failure.
       */
      undefined;
      """)
  }

  func applyNativeZedOverlayDetached(targetApp: ZedOverlayTargetApp) {
    guard let data = try? JSONSerialization.data(withJSONObject: targetApp.rawValue),
      let json = String(data: data, encoding: .utf8)
    else {
      return
    }
    sidebarView.evaluateJavaScript(
      """
      window.__zmux_NATIVE_SETTINGS__?.detachZedOverlay(\(json));
      """)
  }

  func applyNativeZedOverlayAttached(targetApp: ZedOverlayTargetApp) {
    guard let data = try? JSONSerialization.data(withJSONObject: targetApp.rawValue),
      let json = String(data: data, encoding: .utf8)
    else {
      return
    }
    sidebarView.evaluateJavaScript(
      """
      window.__zmux_NATIVE_SETTINGS__?.attachZedOverlay(\(json));
      """)
  }

  private func handleSidebarCommand(_ command: HostCommand) {
    switch command {
    case .createTerminal(let command):
      workspaceView.createTerminal(command)
    case .createWebPane(let command):
      workspaceView.createWebPane(command)
    case .closeTerminal(let command):
      workspaceView.closeTerminal(sessionId: command.sessionId)
    case .closeWebPane(let command):
      workspaceView.closeWebPane(sessionId: command.sessionId)
    case .focusTerminal(let command):
      workspaceView.focusTerminal(sessionId: command.sessionId)
    case .focusWebPane(let command):
      workspaceView.focusWebPane(sessionId: command.sessionId)
    case .startT3CodeRuntime(let command):
      startT3CodeRuntime(command)
    case .activateApp:
      activateAppWindow()
    case .writeTerminalText(let command):
      workspaceView.writeTerminalText(sessionId: command.sessionId, text: command.text)
    case .sendTerminalEnter(let command):
      workspaceView.sendTerminalEnter(sessionId: command.sessionId)
    case .setActiveTerminalSet(let command):
      workspaceView.setActiveTerminalSet(command)
    case .setTerminalLayout(let command):
      workspaceView.setTerminalLayout(command.layout)
    case .setTerminalVisibility(let command):
      workspaceView.setTerminalVisibility(sessionId: command.sessionId, visible: command.visible)
    case .pickWorkspaceFolder:
      presentWorkspaceFolderPicker()
    case .pickWorkspaceIcon(let command):
      presentWorkspaceIconPicker(command)
    case .showMessage(let command):
      showMessage(command)
    case .appendAgentDetectionDebugLog(let command):
      AppDelegate.appendAgentDetectionDebugLog(event: command.event, details: command.details)
    case .appendTerminalFocusDebugLog(let command):
      AppDelegate.appendTerminalFocusDebugLog(event: command.event, details: command.details)
    case .appendRestoreDebugLog(let command):
      AppDelegate.appendRestoreDebugLog(event: command.event, details: command.details)
    case .appendSessionTitleDebugLog(let command):
      AppDelegate.appendSessionTitleDebugLog(event: command.event, details: command.details)
    case .appendWorkspaceDockIndicatorDebugLog(let command):
      AppDelegate.appendWorkspaceDockIndicatorDebugLog(
        event: command.event, details: command.details)
    case .persistSharedSidebarStorage(let command):
      AppDelegate.persistSharedSidebarStorage(command)
    case .playSound(let command):
      /**
       CDXC:NativeSound 2026-04-29-16:30
       Sidebar-driven completion sounds are intentionally routed through
       AppDelegate so the native app owns playback and settings previews even
       when the sidebar webview has never unlocked browser audio.
       */
      NativeSoundPlayer.shared.play(command)
    case .runProcess(let command):
      runProcess(command)
    case .syncGhosttyTerminalSettings(let command):
      syncGhosttyTerminalSettings(command)
    case .applyGhosttyConfigSettings(let command):
      applyGhosttyConfigSettings(command)
    case .openGhosttyConfigFile:
      openGhosttyConfigFile()
    case .openExternalUrl(let command):
      openExternalUrl(command)
    case .openBrowserWindow(let command):
      /**
       CDXC:BrowserOverlay 2026-04-26-05:14
       Browser action buttons are routed out of the sidebar webview and
       into AppDelegate so the native host can launch and position Chrome
       Canary above the active zmux attachment window.
       */
      openBrowserWindow(command)
    case .showBrowserWindow:
      /**
       CDXC:BrowserOverlay 2026-04-26-07:37
       The restored Browsers sidebar section uses this command to raise
       the already-running Canary window through AppDelegate, preserving
       native workarea placement without creating a new browser tab.
       */
      showBrowserWindow()
    case .setSidebarSide(let command):
      setSidebarSide(command.side)
    case .configureZedOverlay(let command):
      /**
       CDXC:ZedOverlay 2026-04-26-03:29
       Zed overlay configuration comes from the sidebar webview, but the
       native overlay controller lives in AppDelegate beside the window it
       moves. Forward this command instead of consuming it in the sidebar
       router so the native button can be positioned over Zed Preview.
       */
      configureZedOverlay(command)
    case .openZedWorkspace(let command):
      /**
       CDXC:ZedOverlay 2026-04-28-05:29
       Sidebar workspace-open commands must use the same native overlay
       path as bridge commands so the selected Zed-family target receives
       the workspace request instead of leaving HostCommand non-exhaustive.
       */
      openZedWorkspace(command)
    case .sidebarCliCommand:
      /**
       CDXC:DebugCli 2026-04-27-07:18
       Sidebar CLI commands are handled by AppDelegate before this
       view-level router. Keep this case explicit so adding the command to
       HostCommand does not make the sidebar command switch non-exhaustive.
       */
      break
    }
  }

  /**
   CDXC:T3Code 2026-04-30-02:38
   Native sidebar T3 Code panes must start the provider in desktop/no-browser
   mode and then render localhost inside the workarea WKWebView. This preserves
   the reference pane model instead of launching an external browser window.
   */
  private func startT3CodeRuntime(_ command: StartT3CodeRuntime) {
    if let process = t3CodeRuntimeProcess, process.isRunning {
      return
    }

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = [
      "npx", "--yes", "t3",
      "--mode", "desktop",
      "--host", "127.0.0.1",
      "--port", "3774",
      "--no-browser",
    ]
    process.currentDirectoryURL = URL(fileURLWithPath: command.cwd, isDirectory: true)
    process.standardInput = FileHandle.nullDevice
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
      t3CodeRuntimeProcess = process
    } catch {
      zmuxRootView.logger.error("Failed to start T3 Code runtime: \(error.localizedDescription)")
    }
  }

  private func activateAppWindow() {
    NSApp.activate(ignoringOtherApps: true)
    window?.makeKeyAndOrderFront(nil)
  }

  func handleHotkeyEquivalent(_ event: NSEvent) -> Bool {
    guard event.type == .keyDown else {
      return false
    }
    let hotkeyText = Self.hotkeyText(for: event)
    if Self.isHotkeyCandidate(event) {
      logNativeHotkeyDebug(
        "nativeHotkeys.appKitKeyEquivalent",
        [
          "characters": event.charactersIgnoringModifiers ?? "",
          "hotkeyText": hotkeyText ?? "<none>",
          "keyCode": String(event.keyCode),
        ])
    }
    guard let hotkeyText,
      let actionId = matchedHotkeyActionId(for: hotkeyText)
    else {
      if Self.isHotkeyCandidate(event) {
        logNativeHotkeyDebug(
          "nativeHotkeys.appKitNoAction",
          [
            "hotkeyText": hotkeyText ?? "<none>",
            "keyCode": String(event.keyCode),
          ])
      }
      return false
    }
    logNativeHotkeyDebug(
      "nativeHotkeys.appKitMatched",
      [
        "actionId": actionId,
        "hotkeyText": hotkeyText,
      ])
    dispatchNativeHotkey(actionId)
    return true
  }

  private func matchedHotkeyActionId(for hotkeyText: String) -> String? {
    /**
     CDXC:Hotkeys 2026-04-28-05:20
     Terminal surfaces receive key equivalents before the sidebar webview can
     observe DOM keyboard events, so AppKit matches only configured zmux app
     hotkeys and dispatches their action id into the existing sidebar executor.
     */
    let hotkeys = nativeSettingsStore.readHotkeys()
    let now = Date()
    if let expiresAt = pendingHotkeyPrefixExpiresAt, expiresAt <= now {
      pendingHotkeyPrefix = nil
      pendingHotkeyPrefixExpiresAt = nil
    }
    let sequence =
      pendingHotkeyPrefix.map { "\($0) \(hotkeyText)" } ?? hotkeyText
    if let match = hotkeys.first(where: { $0.value == sequence }) {
      logNativeHotkeyDebug(
        "nativeHotkeys.appKitSequenceMatch",
        [
          "actionId": match.key,
          "configuredCount": String(hotkeys.count),
          "hotkeyText": hotkeyText,
          "sequence": sequence,
        ])
      pendingHotkeyPrefix = nil
      pendingHotkeyPrefixExpiresAt = nil
      return match.key
    }
    if hotkeys.values.contains(where: { $0.hasPrefix("\(hotkeyText) ") }) {
      logNativeHotkeyDebug(
        "nativeHotkeys.appKitPrefixStarted",
        [
          "configuredCount": String(hotkeys.count),
          "hotkeyText": hotkeyText,
        ])
      pendingHotkeyPrefix = hotkeyText
      pendingHotkeyPrefixExpiresAt = now.addingTimeInterval(1)
      return nil
    }
    logNativeHotkeyDebug(
      "nativeHotkeys.appKitNoMatch",
      [
        "configuredCount": String(hotkeys.count),
        "hotkeyText": hotkeyText,
        "pendingPrefix": pendingHotkeyPrefix ?? "",
        "sequence": sequence,
      ])
    pendingHotkeyPrefix = nil
    pendingHotkeyPrefixExpiresAt = nil
    return nil
  }

  private func dispatchNativeHotkey(_ actionId: String) {
    /**
     CDXC:Hotkeys 2026-04-28-06:15
     06:12 diagnostics showed AppKit matched shortcuts but the optional
     window.__zmux_NATIVE_HOTKEYS__ call never reached the sidebar executor.
     Emit a typed host event through the same native event bus as terminal
     focus/title updates so hotkeys cannot disappear at an optional JS bridge.
     */
    logNativeHotkeyDebug("nativeHotkeys.dispatchHostEvent", ["actionId": actionId])
    sendHostEvent(.nativeHotkey(actionId: actionId))
  }

  private func logNativeHotkeyDebug(_ event: String, _ details: [String: String]) {
    /**
     CDXC:Hotkeys 2026-04-28-05:36
     AppKit owns shortcuts while Ghostty has first responder, so hotkey
     diagnostics must be written before dispatching into the sidebar webview.
     */
    AppDelegate.appendTerminalFocusDebugLog(
      event: event,
      details: AppDelegate.jsonObjectString(details))
  }

  private static func hotkeyText(for event: NSEvent) -> String? {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    guard let key = normalizedHotkeyKey(event) else {
      return nil
    }
    var parts: [String] = []
    if flags.contains(.command) {
      parts.append("cmd")
    }
    if flags.contains(.control) {
      parts.append("ctrl")
    }
    if flags.contains(.option) {
      parts.append("alt")
    }
    if flags.contains(.shift) {
      parts.append("shift")
    }
    parts.append(key)
    return parts.joined(separator: "+")
  }

  private static func isHotkeyCandidate(_ event: NSEvent) -> Bool {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    return !flags.isDisjoint(with: [.command, .control, .option, .shift])
  }

  private static func normalizedHotkeyKey(_ event: NSEvent) -> String? {
    switch event.keyCode {
    case 126:
      return "up"
    case 124:
      return "right"
    case 125:
      return "down"
    case 123:
      return "left"
    default:
      break
    }
    let characters = event.charactersIgnoringModifiers
    guard let characters, !characters.isEmpty else {
      return nil
    }
    return characters.lowercased()
  }

  private func showMessage(_ command: ShowMessage) {
    let alert = NSAlert()
    switch command.level {
    case .info:
      alert.alertStyle = .informational
    case .warning:
      alert.alertStyle = .warning
    case .error:
      alert.alertStyle = .critical
    }
    alert.messageText = "zmux"
    alert.informativeText = command.message
    alert.addButton(withTitle: "OK")
    if let window {
      alert.beginSheetModal(for: window)
    } else {
      alert.runModal()
    }
  }

  func setSidebarSide(_ side: SidebarSide) {
    sidebarSide = side
    needsLayout = true
  }

  func workspaceScreenFrame() -> NSRect? {
    guard let window = workspaceView.window else {
      return nil
    }
    /**
     CDXC:BrowserOverlay 2026-04-26-05:22
     Chrome Canary should cover only the zmux workarea, leaving the
     workspace switcher rail and sidebar visible for project/session
     context while the browser is open above the attached app.
     */
    let windowFrame = workspaceView.convert(workspaceView.bounds, to: nil)
    return window.convertToScreen(windowFrame)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override func layout() {
    super.layout()
    let maxSidebarWidth = currentMaxSidebarWidth()
    let sidebarWidth = min(max(self.sidebarWidth, Self.sidebarMinWidth), maxSidebarWidth)
    self.sidebarWidth = sidebarWidth
    let chromeWidth = Self.workspaceBarWidth + sidebarWidth + Self.dividerWidth
    let chromeX: CGFloat = sidebarSide == .left ? 0 : max(bounds.width - chromeWidth, 0)
    let workspaceX: CGFloat = sidebarSide == .left ? chromeWidth : 0
    let workspaceWidth = max(bounds.width - chromeWidth, 1)

    sidebarView.frame = CGRect(
      x: chromeX,
      y: 0,
      width: Self.workspaceBarWidth + sidebarWidth,
      height: bounds.height
    )
    divider.frame = CGRect(
      x: chromeX + Self.workspaceBarWidth + sidebarWidth,
      y: 0,
      width: Self.dividerWidth,
      height: bounds.height
    )
    workspaceView.frame = CGRect(
      x: workspaceX,
      y: 0,
      width: workspaceWidth,
      height: bounds.height
    )
    modalHostView.frame = bounds
  }

  private func resizeSidebar(by deltaX: CGFloat) {
    let maxSidebarWidth = currentMaxSidebarWidth()
    let effectiveDelta = sidebarSide == .left ? deltaX : -deltaX
    sidebarWidth = min(max(sidebarWidth + effectiveDelta, Self.sidebarMinWidth), maxSidebarWidth)
    needsLayout = true
  }

  private func resetSidebarWidth() {
    sidebarWidth = min(max(Self.sidebarResetWidth, Self.sidebarMinWidth), currentMaxSidebarWidth())
    needsLayout = true
    persistSidebarWidth()
  }

  private func currentMaxSidebarWidth() -> CGFloat {
    max(
      Self.sidebarMinWidth,
      min(Self.sidebarMaxWidth, bounds.width - Self.workspaceBarWidth - Self.dividerWidth - 240))
  }

  private func persistSidebarWidth() {
    nativeSettingsStore.persistSidebarWidth(sidebarWidth)
  }

  private func handleAppModalHostMessage(_ body: Any) {
    guard let message = body as? [String: Any],
      let type = message["type"] as? String
    else {
      AppDelegate.appendAppModalErrorLog(
        area: "AppModals:nativeBridge",
        message: "Malformed modal host message: \(String(describing: body))",
        stack: nil
      )
      return
    }

    switch type {
    case "logError":
      let area = message["area"] as? String ?? "AppModals:unknown"
      let errorMessage = message["message"] as? String ?? String(describing: message)
      let stack = message["stack"] as? String
      AppDelegate.appendAppModalErrorLog(area: area, message: errorMessage, stack: stack)
    case "ready":
      isModalHostReady = true
      if let latestModalHostSidebarState {
        dispatchModalHostMessage(latestModalHostSidebarState)
      }
      if let pendingModalHostOpenMessage {
        dispatchModalHostMessage(pendingModalHostOpenMessage)
        self.pendingModalHostOpenMessage = nil
      }
    case "open":
      /**
       CDXC:AppModals 2026-04-28-12:06
       Persistent helper mode was removed, so full-window modal presentation no
       longer pauses or resurfaces external terminal windows. The modal host
       only needs to show its overlay above the embedded terminal view.
       */
      modalHostView.isHidden = false
      pendingModalHostOpenMessage = isModalHostReady ? nil : message
      if let latestModalHostSidebarState {
        dispatchModalHostMessage(latestModalHostSidebarState)
      }
      dispatchModalHostMessage(message)
    case "close":
      dispatchModalHostMessage(["type": "close"])
      pendingModalHostOpenMessage = nil
      modalHostView.isHidden = true
    case "sidebarState":
      latestModalHostSidebarState = message
      dispatchModalHostMessage(message)
    case "sidebarCommand":
      guard let sidebarMessage = message["message"] else {
        return
      }
      dispatchSidebarModalCommand(sidebarMessage)
    default:
      AppDelegate.appendAppModalErrorLog(
        area: "AppModals:nativeBridge",
        message: "Unknown modal host message type: \(type)",
        stack: nil
      )
    }
  }

  private func dispatchModalHostMessage(_ message: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(message),
      let data = try? JSONSerialization.data(withJSONObject: message),
      let json = String(data: data, encoding: .utf8)
    else {
      AppDelegate.appendAppModalErrorLog(
        area: "AppModals:nativeBridge",
        message: "Failed to serialize modal host message: \(message)",
        stack: nil
      )
      return
    }
    modalHostView.evaluateJavaScript(
      """
      window.dispatchEvent(new CustomEvent('zmux-app-modal-host-message', { detail: \(json) }));
      /**
       CDXC:AppModals 2026-04-29-22:03
       WKWebView reports a successful dispatch as an error when the evaluated
       script returns the CustomEvent object. Return undefined so only actual
       modal bridge failures reach the app-modal error log.
       */
      undefined;
      """
    ) { _, error in
      if let error {
        AppDelegate.appendAppModalErrorLog(
          area: "AppModals:nativeBridge",
          message: "Failed to dispatch modal host message: \(error.localizedDescription)",
          stack: nil
        )
      }
    }
  }

  private func dispatchSidebarModalCommand(_ message: Any) {
    guard JSONSerialization.isValidJSONObject(message),
      let data = try? JSONSerialization.data(withJSONObject: message),
      let json = String(data: data, encoding: .utf8)
    else {
      AppDelegate.appendAppModalErrorLog(
        area: "AppModals:sidebarCommand",
        message: "Failed to serialize sidebar modal command: \(message)",
        stack: nil
      )
      return
    }
    sidebarView.evaluateJavaScript(
      """
      window.__zmux_NATIVE_MODAL_BRIDGE__?.handleSidebarMessage(\(json));
      /**
       CDXC:AppModals 2026-04-29-22:03
       Sidebar modal commands are fire-and-forget at the WebKit boundary; state
       changes carry the result, so the evaluated script should return nothing.
       */
      undefined;
      """
    ) { _, error in
      if let error {
        AppDelegate.appendAppModalErrorLog(
          area: "AppModals:sidebarCommand",
          message: "Failed to dispatch sidebar modal command: \(error.localizedDescription)",
          stack: nil
        )
      }
    }
  }

  private func presentWorkspaceFolderPicker() {
    /**
     CDXC:NativeWorkspacePicker 2026-04-26-00:47
     The workspace rail plus button must use the native folder picker. The
     selected project is sent back into the sidebar webview, which owns the
     per-project session/sidebar state.
     */
    let panel = NSOpenPanel()
    panel.canChooseDirectories = true
    panel.canChooseFiles = false
    panel.allowsMultipleSelection = false
    panel.canCreateDirectories = true
    panel.prompt = "Add Project"
    panel.message = "Choose a project folder to add to zmux."

    let completion: (NSApplication.ModalResponse) -> Void = { [weak self] response in
      guard response == .OK,
        let url = panel.url
      else {
        return
      }
      self?.addWorkspaceProject(path: url.path, name: url.lastPathComponent)
    }

    if let window {
      panel.beginSheetModal(for: window, completionHandler: completion)
    } else {
      completion(panel.runModal())
    }
  }

  private func addWorkspaceProject(path: String, name: String) {
    let payload = ["path": path, "name": name]
    guard let data = try? JSONSerialization.data(withJSONObject: payload),
      let json = String(data: data, encoding: .utf8)
    else {
      return
    }
    sidebarView.evaluateJavaScript(
      """
      (() => {
        const project = \(json);
        window.__zmux_NATIVE_WORKSPACE_BAR__?.addProject(project.path, project.name);
      })();
      """)
  }

  private func presentWorkspaceIconPicker(_ command: PickWorkspaceIcon) {
    /**
     CDXC:WorkspaceDock 2026-04-27-08:53
     Workspace icon selection must use the native macOS picker because the
     React context menu lives inside WKWebView, where hidden file inputs can
     fail to open from synthetic/custom menu activation. Return a PNG/SVG
     data URL to the React workspace API so persistence stays with the
     workspace record.
     */
    let panel = NSOpenPanel()
    panel.canChooseDirectories = false
    panel.canChooseFiles = true
    panel.allowsMultipleSelection = false
    panel.allowedContentTypes = [.png, UTType(filenameExtension: "svg") ?? .image]
    panel.prompt = "Pick Icon"
    panel.message = "Choose a PNG or SVG icon for this workspace."

    let completion: (NSApplication.ModalResponse) -> Void = { [weak self] response in
      guard response == .OK,
        let url = panel.url
      else {
        return
      }
      do {
        let data = try Data(contentsOf: url)
        let mimeType = url.pathExtension.lowercased() == "svg" ? "image/svg+xml" : "image/png"
        self?.setWorkspaceIcon(
          projectId: command.projectId,
          iconDataUrl: "data:\(mimeType);base64,\(data.base64EncodedString())"
        )
      } catch {
        self?.showMessage(
          ShowMessage(
            level: .error, message: "Could not read workspace icon: \(error.localizedDescription)"))
      }
    }

    if let window {
      panel.beginSheetModal(for: window, completionHandler: completion)
    } else {
      completion(panel.runModal())
    }
  }

  private func setWorkspaceIcon(projectId: String, iconDataUrl: String) {
    let payload = ["projectId": projectId, "iconDataUrl": iconDataUrl]
    guard let data = try? JSONSerialization.data(withJSONObject: payload),
      let json = String(data: data, encoding: .utf8)
    else {
      return
    }
    sidebarView.evaluateJavaScript(
      """
      (() => {
        const icon = \(json);
        window.__zmux_NATIVE_WORKSPACE_BAR__?.setProjectIcon(icon.projectId, icon.iconDataUrl);
      })();
      """)
  }

  private func openExternalUrl(_ command: OpenExternalUrl) {
    guard let url = URL(string: command.url) else {
      return
    }
    NSWorkspace.shared.open(url)
  }

  /**
   CDXC:NativeCommandBridge 2026-04-26-03:16
   Sidebar actions that need shell access, such as Git commit/push/PR, must
   run in the background without opening macOS Terminal. Process output is
   returned to the sidebar webview through HostEvent.processResult.
   */
  private func runProcess(_ command: RunProcess) {
    Task.detached { [weak self] in
      let process = Process()
      process.executableURL = URL(fileURLWithPath: command.executable)
      process.arguments = command.args
      if let cwd = command.cwd {
        process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
      }
      if let env = command.env {
        process.environment = ProcessInfo.processInfo.environment.merging(env) { _, newValue in
          newValue
        }
      }
      let stdoutPipe = Pipe()
      let stderrPipe = Pipe()
      process.standardInput = FileHandle.nullDevice
      process.standardOutput = stdoutPipe
      process.standardError = stderrPipe

      let result: HostEvent
      do {
        try process.run()
        process.waitUntilExit()
        let stdoutData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
        let stderrData = stderrPipe.fileHandleForReading.readDataToEndOfFile()
        result = .processResult(
          requestId: command.requestId,
          exitCode: process.terminationStatus,
          stdout: String(data: stdoutData, encoding: .utf8) ?? "",
          stderr: String(data: stderrData, encoding: .utf8) ?? ""
        )
      } catch {
        result = .processResult(
          requestId: command.requestId,
          exitCode: 127,
          stdout: "",
          stderr: error.localizedDescription
        )
      }
      await MainActor.run { [weak self] in
        guard let self else {
          return
        }
        self.postHostEvent(result)
      }
    }
  }

  private func loadSidebar() {
    if let urlString = ProcessInfo.processInfo.environment["zmux_SIDEBAR_URL"],
      let url = URL(string: urlString)
    {
      Self.logger.info("Loading sidebar URL \(url.absoluteString, privacy: .public)")
      sidebarView.load(URLRequest(url: url))
      return
    }

    let webAssets = Self.resolveWebAssets()
    let builtSidebar = webAssets.appendingPathComponent("index.html")
    if FileManager.default.fileExists(atPath: builtSidebar.path) {
      Self.logger.info("Loading built sidebar from \(builtSidebar.path, privacy: .public)")
      sidebarView.loadFileURL(builtSidebar, allowingReadAccessTo: webAssets)
      return
    }

    Self.logger.error("Built sidebar not found at \(builtSidebar.path, privacy: .public)")
    let repoRoot = Self.resolveRepoRoot()
    let html = """
      <!doctype html>
      <html>
        <body style="margin:0;background:#111827;color:#d1d5db;font:13px -apple-system,BlinkMacSystemFont,sans-serif;height:100vh">
          <div style="padding:18px;line-height:1.45">
            <h1 style="font-size:14px;margin:0 0 14px">zmux Native Ghostty</h1>
            <button id="shell" style="width:100%;margin:0 0 8px;padding:9px">New shell</button>
            <button id="codex" style="width:100%;margin:0 0 8px;padding:9px">Codex agent</button>
            <button id="close" style="width:100%;padding:9px">Close active</button>
            <p style="color:#9ca3af;margin-top:16px">
              Set zmux_SIDEBAR_URL to load the full sidebar bundle.
            </p>
          </div>
          <script>
            let activeSessionId = "";
            function send(command) {
              window.webkit.messageHandlers.zmuxNativeHost.postMessage(command);
            }
            function create(title, input) {
              activeSessionId = crypto.randomUUID();
              send({
                type: "createTerminal",
                sessionId: activeSessionId,
                cwd: "\(NSHomeDirectory())",
                title,
                initialInput: input || ""
              });
            }
            shell.onclick = () => create("Shell", "");
            codex.onclick = () => create("Codex", "codex\\r");
            close.onclick = () => activeSessionId && send({ type: "closeTerminal", sessionId: activeSessionId });
          </script>
        </body>
      </html>
      """
    sidebarView.loadHTMLString(html, baseURL: repoRoot)
  }

  private func loadModalHost() {
    let webAssets = Self.resolveWebAssets()
    let builtModalHost = webAssets.appendingPathComponent("modal-host.html")
    if FileManager.default.fileExists(atPath: builtModalHost.path) {
      Self.logger.info("Loading modal host from \(builtModalHost.path, privacy: .public)")
      modalHostView.loadFileURL(
        builtModalHost,
        allowingReadAccessTo: webAssets
      )
      return
    }

    Self.logger.error("Built modal host not found at \(builtModalHost.path, privacy: .public)")
    let repoRoot = Self.resolveRepoRoot()
    modalHostView.loadHTMLString(
      "<!doctype html><html><body style=\"margin:0;background:transparent\"></body></html>",
      baseURL: repoRoot
    )
  }

  private static func resolveWebAssets() -> URL {
    // CDXC:NativeSidebar 2026-04-27-06:19: Sidebar assets should be loaded
    // from the app bundle first because users normally launch the installed
    // app from /Applications, where FileManager.currentDirectoryPath is not
    // the repository root.
    if let bundledWebAssets = Bundle.main.resourceURL?.appendingPathComponent(
      "Web", isDirectory: true),
      FileManager.default.fileExists(
        atPath: bundledWebAssets.appendingPathComponent("index.html").path)
    {
      return bundledWebAssets
    }

    return resolveRepoRoot().appendingPathComponent("native/macos/zmuxHost/Web", isDirectory: true)
  }

  private static func resolveRepoRoot() -> URL {
    if let repoRootPath = ProcessInfo.processInfo.environment["zmux_REPO_ROOT"],
      !repoRootPath.isEmpty
    {
      return URL(fileURLWithPath: repoRootPath, isDirectory: true)
    }

    // CDXC:PublicRelease 2026-04-27-05:36: The native host must discover
    // local development assets without committing maintainer-specific
    // absolute paths into public source.
    let currentDirectory = FileManager.default.currentDirectoryPath
    return URL(fileURLWithPath: currentDirectory, isDirectory: true)
  }

  private static let diagnosticsScript = """
    (() => {
      const post = (payload) => {
        try {
          window.webkit?.messageHandlers?.zmuxNativeHostDiagnostics?.postMessage(payload);
        } catch {}
      };
      window.addEventListener("error", (event) => {
        post({
          type: "error",
          message: String(event.message || ""),
          source: String(event.filename || ""),
          line: event.lineno || 0,
          column: event.colno || 0,
          stack: event.error && event.error.stack ? String(event.error.stack) : ""
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        post({
          type: "unhandledrejection",
          message: reason && reason.message ? String(reason.message) : String(reason || ""),
          stack: reason && reason.stack ? String(reason.stack) : ""
        });
      });
      const originalError = console.error.bind(console);
      console.error = (...args) => {
        post({ type: "console.error", message: args.map((arg) => String(arg)).join(" ") });
        originalError(...args);
      };
      post({ type: "diagnostics-ready", href: location.href });
    })();
    """

  private static let workspaceBarHTML = """
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          :root {
            color-scheme: dark;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          }
          * { box-sizing: border-box; }
          html, body {
            height: 100%;
            margin: 0;
            overflow: hidden;
            width: 100%;
          }
          body {
            align-items: center;
            background: #080d14;
            color: #d8e1f1;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 10px 7px;
          }
          #projects {
            align-items: center;
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 8px;
            min-height: 0;
            overflow: hidden auto;
            width: 100%;
          }
          button {
            appearance: none;
            align-items: center;
            background: #121a26;
            border: 1px solid #263346;
            border-radius: 12px;
            color: #d8e1f1;
            cursor: default;
            display: flex;
            font: 700 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            height: 40px;
            justify-content: center;
            padding: 0;
            position: relative;
            width: 40px;
          }
          button[data-dragging="true"] {
            opacity: 0.28;
            transform: scale(0.96);
          }
          #drop-line {
            background: #8fb4ff;
            border-radius: 999px;
            box-shadow:
              0 0 0 1px rgba(143, 180, 255, 0.34),
              0 0 12px rgba(143, 180, 255, 0.42);
            height: 3px;
            left: 8px;
            opacity: 0;
            pointer-events: none;
            position: fixed;
            top: 0;
            transform: translateY(-50%);
            transition: opacity 90ms ease;
            width: 38px;
            z-index: 20;
          }
          #drop-line[data-visible="true"] {
            opacity: 1;
          }
          #drag-ghost {
            align-items: center;
            background: #121a26;
            border: 1px solid #263346;
            border-radius: 12px;
            color: #d8e1f1;
            display: none;
            font: 700 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            height: 40px;
            justify-content: center;
            left: 0;
            opacity: 0.92;
            pointer-events: none;
            position: fixed;
            top: 0;
            transform: translate(-50%, -50%);
            width: 40px;
            z-index: 21;
          }
          #drag-ghost[data-visible="true"] {
            display: flex;
          }
          button:hover {
            background: #172235;
            border-color: #3b4e69;
          }
          button[data-active="true"] {
            background: #1e3762;
            border-color: #5b8df6;
            box-shadow: 0 0 0 2px rgba(91, 141, 246, 0.18);
          }
          .indicators {
            /* CDXC:WorkspaceDock 2026-04-27-06:58: Done and working badges sit
               together at the top-right of the workspace button, ordered green
               then orange from left to right. The orange badge uses "working"
               to match session-card activity and avoid overloading "active". */
            align-items: center;
            display: flex;
            gap: 1px;
            pointer-events: none;
            position: absolute;
            right: -1px;
            top: -7px;
            z-index: 2;
          }
          .indicator {
            align-items: center;
            border: 2px solid #080d14;
            border-radius: 999px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
            color: #ffffff;
            display: grid;
            font: 800 9px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            height: 18px;
            justify-content: center;
            min-width: 18px;
            padding: 0 4px;
            white-space: nowrap;
          }
          .indicator[data-status="working"] {
            background: #d08a2d;
          }
          .indicator[data-status="done"] {
            background: #2e9d68;
          }
          .indicator[data-status="running"] {
            /* CDXC:WorkspaceDock 2026-04-27-06:27: The gray total-running
               terminal count belongs at the bottom-left of each workspace
               button, distinct from top-right done/working session badges. */
            background: #6f7785;
            bottom: -7px;
            left: -1px;
            position: absolute;
          }
          #add {
            flex: 0 0 auto;
          }
        </style>
      </head>
      <body>
        <div id="projects"></div>
        <div id="drop-line"></div>
        <div id="drag-ghost"></div>
        <button id="add" title="New workspace">+</button>
        <script>
          const projectsElement = document.getElementById("projects");
          const addButton = document.getElementById("add");
          const dropLineElement = document.getElementById("drop-line");
          const dragGhostElement = document.getElementById("drag-ghost");
          let state = { projects: [], activeProjectId: "" };
          const pointerDrag = {
            button: null,
            didDrag: false,
            ghostText: "",
            placeAfterTarget: false,
            pointerId: undefined,
            projectId: "",
            startX: 0,
            startY: 0,
            targetProjectId: "",
          };
          const post = (message) => {
            window.webkit?.messageHandlers?.zmuxWorkspaceBar?.postMessage(message);
          };
          const initials = (title, index) => {
            const trimmed = String(title || "").trim();
            if (!trimmed) return String(index + 1);
            const words = trimmed.split(/\\s+/).filter(Boolean);
            if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
            return trimmed.slice(0, 2).toUpperCase();
          };
          const render = () => {
            projectsElement.replaceChildren();
            state.projects.forEach((project, index) => {
              const button = document.createElement("button");
              button.type = "button";
              button.dataset.projectId = project.projectId;
              button.dataset.active = project.isActive ? "true" : "false";
              const running = Number(project.sessionCounts?.running || 0);
              const done = Number(project.sessionCounts?.done || 0);
              const working = Number(project.sessionCounts?.working || 0);
              const summary = [
                running > 0 ? `${running} running` : "",
                working > 0 ? `${working} working` : "",
                done > 0 ? `${done} done` : "",
              ].filter(Boolean).join(", ");
              button.title = summary ? `${project.path || project.title} - ${summary}` : (project.path || project.title);
              button.textContent = initials(project.title, index);
              const focusProject = () => post({ type: "focusProject", projectId: project.projectId });
              /**
               * CDXC:WorkspaceDock 2026-04-27-08:30
               * Project selection used to run on pointerdown to avoid dropped
               * clicks during rail re-renders. Native HTML drag cannot start
               * after that preventDefault, so the rail now owns a tiny pointer
               * drag recognizer: release without movement selects; movement
               * reorders and persists workareas. Drag feedback is a faded
               * source button, a plain floating ghost, and an insertion line
               * only when release would change the order.
               */
              button.onpointerdown = (event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                pointerDrag.button = button;
                pointerDrag.didDrag = false;
                pointerDrag.ghostText = button.textContent || "";
                pointerDrag.placeAfterTarget = false;
                pointerDrag.pointerId = event.pointerId;
                pointerDrag.projectId = project.projectId;
                pointerDrag.startX = event.clientX;
                pointerDrag.startY = event.clientY;
                pointerDrag.targetProjectId = "";
                button.setPointerCapture?.(event.pointerId);
              };
              button.onpointermove = (event) => {
                if (pointerDrag.pointerId !== event.pointerId || pointerDrag.projectId !== project.projectId) return;
                const deltaX = event.clientX - pointerDrag.startX;
                const deltaY = event.clientY - pointerDrag.startY;
                if (!pointerDrag.didDrag && Math.hypot(deltaX, deltaY) < 5) return;
                pointerDrag.didDrag = true;
                button.dataset.dragging = "true";
                const dropTarget = getDropTarget(event.clientY, pointerDrag.projectId);
                const target = dropTarget?.button;
                clearDragState(button);
                updateDragGhost(event.clientX, event.clientY);
                if (target && wouldReorder(pointerDrag.projectId, target.dataset.projectId, dropTarget.placeAfterTarget)) {
                  const bounds = target.getBoundingClientRect();
                  pointerDrag.targetProjectId = target.dataset.projectId;
                  pointerDrag.placeAfterTarget = dropTarget.placeAfterTarget;
                  updateDropLine(bounds, pointerDrag.placeAfterTarget);
                } else {
                  pointerDrag.targetProjectId = "";
                  hideDropLine();
                }
              };
              button.onpointerup = (event) => {
                if (pointerDrag.pointerId !== event.pointerId || pointerDrag.projectId !== project.projectId) return;
                event.preventDefault();
                button.releasePointerCapture?.(event.pointerId);
                const sourceProjectId = pointerDrag.projectId;
                const didDrag = pointerDrag.didDrag;
                const targetProjectId = pointerDrag.targetProjectId;
                const placeAfterTarget = pointerDrag.placeAfterTarget;
                resetPointerDrag();
                if (!didDrag) {
                  focusProject();
                  return;
                }
                if (targetProjectId) {
                  reorderProjects(sourceProjectId, targetProjectId, placeAfterTarget);
                }
              };
              button.onpointercancel = (event) => {
                if (pointerDrag.pointerId !== event.pointerId) return;
                resetPointerDrag();
              };
              button.onclick = (event) => {
                if (event.detail > 0) return;
                focusProject();
              };
              if (done > 0 || working > 0) {
                const indicators = document.createElement("span");
                indicators.className = "indicators";
                if (done > 0) {
                  const doneIndicator = document.createElement("span");
                  doneIndicator.className = "indicator";
                  doneIndicator.dataset.status = "done";
                  doneIndicator.textContent = formatCount(done);
                  indicators.appendChild(doneIndicator);
                }
                if (working > 0) {
                  const workingIndicator = document.createElement("span");
                  workingIndicator.className = "indicator";
                  workingIndicator.dataset.status = "working";
                  workingIndicator.textContent = formatCount(working);
                  indicators.appendChild(workingIndicator);
                }
                button.appendChild(indicators);
              }
              if (running > 0) {
                const runningIndicator = document.createElement("span");
                runningIndicator.className = "indicator";
                runningIndicator.dataset.status = "running";
                runningIndicator.textContent = formatCount(running);
                button.appendChild(runningIndicator);
              }
              projectsElement.appendChild(button);
            });
          };
          const clearDragState = (except) => {
            projectsElement.querySelectorAll("[data-dragging]").forEach((element) => {
              if (element !== except) delete element.dataset.dragging;
            });
          };
          const resetPointerDrag = () => {
            pointerDrag.button?.releasePointerCapture?.(pointerDrag.pointerId);
            pointerDrag.button = null;
            pointerDrag.didDrag = false;
            pointerDrag.ghostText = "";
            pointerDrag.placeAfterTarget = false;
            pointerDrag.pointerId = undefined;
            pointerDrag.projectId = "";
            pointerDrag.startX = 0;
            pointerDrag.startY = 0;
            pointerDrag.targetProjectId = "";
            hideDragGhost();
            hideDropLine();
            clearDragState();
          };
          const updateDragGhost = (clientX, clientY) => {
            dragGhostElement.textContent = pointerDrag.ghostText;
            dragGhostElement.style.left = `${clientX}px`;
            dragGhostElement.style.top = `${clientY}px`;
            dragGhostElement.dataset.visible = "true";
          };
          const hideDragGhost = () => {
            delete dragGhostElement.dataset.visible;
          };
          const updateDropLine = (targetBounds, placeAfterTarget) => {
            dropLineElement.style.left = `${targetBounds.left + 1}px`;
            dropLineElement.style.top = `${placeAfterTarget ? targetBounds.bottom + 4 : targetBounds.top - 4}px`;
            dropLineElement.style.width = `${Math.max(34, targetBounds.width - 2)}px`;
            dropLineElement.dataset.visible = "true";
          };
          const hideDropLine = () => {
            delete dropLineElement.dataset.visible;
          };
          const getDropTarget = (clientY, sourceProjectId) => {
            const buttons = Array.from(projectsElement.querySelectorAll("button[data-project-id]"))
              .filter((button) => button.dataset.projectId !== sourceProjectId);
            if (buttons.length === 0) return undefined;
            for (const button of buttons) {
              const bounds = button.getBoundingClientRect();
              if (clientY < bounds.top + bounds.height / 2) {
                return { button, placeAfterTarget: false };
              }
            }
            return { button: buttons[buttons.length - 1], placeAfterTarget: true };
          };
          const nextProjectOrder = (sourceProjectId, targetProjectId, placeAfterTarget) => {
            if (!sourceProjectId || !targetProjectId || sourceProjectId === targetProjectId) return;
            const ids = state.projects.map((project) => project.projectId);
            const fromIndex = ids.indexOf(sourceProjectId);
            const toIndex = ids.indexOf(targetProjectId);
            if (fromIndex < 0 || toIndex < 0) return;
            const [movedProjectId] = ids.splice(fromIndex, 1);
            const adjustedTargetIndex = ids.indexOf(targetProjectId);
            ids.splice(adjustedTargetIndex + (placeAfterTarget ? 1 : 0), 0, movedProjectId);
            return ids;
          };
          const wouldReorder = (sourceProjectId, targetProjectId, placeAfterTarget) => {
            const nextIds = nextProjectOrder(sourceProjectId, targetProjectId, placeAfterTarget);
            if (!nextIds) return false;
            return nextIds.some((projectId, index) => projectId !== state.projects[index]?.projectId);
          };
          const reorderProjects = (sourceProjectId, targetProjectId, placeAfterTarget) => {
            clearDragState();
            const ids = nextProjectOrder(sourceProjectId, targetProjectId, placeAfterTarget);
            if (!ids) return;
            if (!ids.some((projectId, index) => projectId !== state.projects[index]?.projectId)) return;
            post({ type: "reorderProjects", projectIds: ids });
          };
          const formatCount = (count) => count > 99 ? "99+" : String(count);
          window.addEventListener("zmux-workspace-bar-state", (event) => {
            state = event.detail || state;
            render();
          });
          addButton.onclick = () => post({ type: "pickProject" });
          post({ type: "workspaceBarReady" });
        </script>
      </body>
    </html>
    """
}

final class zmuxFocusReportingWindow: NSWindow {
  var onFirstResponderChanged: ((NSResponder?) -> Void)?
  var onKeyEquivalent: ((NSEvent) -> Bool)?

  /**
   CDXC:NativeTerminalFocus 2026-04-26-21:32
   User clicks inside split Ghostty surfaces change AppKit's first responder
   without going through sidebar focus commands. Report every successful
   responder transition so native terminal focus becomes the source that
   updates sidebar/store focus before the next layout sync.
   */
  override func makeFirstResponder(_ responder: NSResponder?) -> Bool {
    let previousResponder = firstResponder
    let didBecomeFirstResponder = super.makeFirstResponder(responder)
    if didBecomeFirstResponder && firstResponder !== previousResponder {
      onFirstResponderChanged?(firstResponder)
    }
    return didBecomeFirstResponder
  }

  override func performKeyEquivalent(with event: NSEvent) -> Bool {
    if onKeyEquivalent?(event) == true {
      return true
    }
    return super.performKeyEquivalent(with: event)
  }
}

final class PaneResizeHandleView: NSView {
  var onDrag: ((CGFloat) -> Void)?
  var onDragEnded: (() -> Void)?
  var onDoubleClick: (() -> Void)?
  private var lastDragX: CGFloat = 0

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    wantsLayer = true
    layer?.backgroundColor = NSColor.clear.cgColor
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    wantsLayer = true
    layer?.backgroundColor = NSColor.clear.cgColor
  }

  override func resetCursorRects() {
    addCursorRect(bounds, cursor: .resizeLeftRight)
  }

  /**
   CDXC:NativeSidebarChrome 2026-04-26-07:27
   The resize hit target stays wide enough to drag comfortably, but the
   visible sidebar edge should be a subtle true-pixel #343434 separator
   instead of the previous filled black gutter or Retina-scaled two-pixel line.
   */
  override func draw(_ dirtyRect: NSRect) {
    super.draw(dirtyRect)
    NSColor(calibratedRed: 0x34 / 255, green: 0x34 / 255, blue: 0x34 / 255, alpha: 1).setFill()
    let backingScale = window?.backingScaleFactor ?? NSScreen.main?.backingScaleFactor ?? 1
    let separatorWidth = 1 / backingScale
    let separatorX = floor(bounds.midX * backingScale) / backingScale
    NSRect(x: separatorX, y: 0, width: separatorWidth, height: bounds.height).fill()
  }

  override func mouseDown(with event: NSEvent) {
    if event.clickCount >= 2 {
      onDoubleClick?()
      return
    }
    lastDragX = convert(event.locationInWindow, from: nil).x
  }

  override func mouseDragged(with event: NSEvent) {
    let currentX = convert(event.locationInWindow, from: nil).x
    let deltaX = currentX - lastDragX
    lastDragX = currentX
    onDrag?(deltaX)
  }

  override func mouseUp(with event: NSEvent) {
    onDragEnded?()
  }
}

extension zmuxRootView: WKNavigationDelegate {
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    Self.logger.info("Sidebar webview finished loading")
    webView.evaluateJavaScript(
      "JSON.stringify({ text: document.body.innerText.slice(0, 240), rootHTML: document.getElementById('root')?.innerHTML.slice(0, 240) || '', bootError: window.__zmux_BOOT_ERROR__ || null })"
    ) { result, error in
      if let error {
        Self.logger.error(
          "Sidebar DOM probe failed: \(error.localizedDescription, privacy: .public)")
        return
      }
      Self.logger.info("Sidebar DOM probe: \(String(describing: result), privacy: .public)")
    }
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    Self.logger.error(
      "Sidebar webview navigation failed: \(error.localizedDescription, privacy: .public)")
  }

  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    Self.logger.error(
      "Sidebar webview provisional navigation failed: \(error.localizedDescription, privacy: .public)"
    )
  }

  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
    /**
     CDXC:CrashDiagnostics 2026-04-27-17:38
     WebKit renderer exits can look like an app crash from the UI. Persist
     this delegate callback so native process exits are not confused with
     web content process termination.
     */
    Self.logger.error("Sidebar webview content process terminated")
    AppDelegate.appendNativeHostLifecycleLog(
      "sidebarWebContentProcessDidTerminate url=\(webView.url?.absoluteString ?? "<missing>")")
  }
}

final class SidebarScriptBridge: NSObject, WKScriptMessageHandler {
  private static let logger = Logger(subsystem: "com.madda.zmux.host", category: "webview")
  private let decoder = JSONDecoder()
  private let router: SidebarCommandRouter

  init(router: SidebarCommandRouter) {
    self.router = router
  }

  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    if message.name == "zmuxNativeHostDiagnostics" {
      let diagnostic = String(describing: message.body)
      if diagnostic.contains("diagnostics-ready") {
        Self.logger.info("Sidebar diagnostic: \(diagnostic, privacy: .public)")
      } else {
        Self.logger.error("Sidebar diagnostic: \(diagnostic, privacy: .public)")
      }
      return
    }

    if message.name == "zmuxAppModalHost" {
      router.onAppModalHostMessage?(message.body)
      return
    }

    guard JSONSerialization.isValidJSONObject(message.body),
      let data = try? JSONSerialization.data(withJSONObject: message.body),
      let command = try? decoder.decode(HostCommand.self, from: data)
    else {
      return
    }
    router.onCommand?(command)
  }
}

final class SidebarCommandRouter {
  var onAppModalHostMessage: ((Any) -> Void)?
  var onCommand: ((HostCommand) -> Void)?
}
