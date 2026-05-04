import AppKit
import Combine
import GhosttyKit
import QuartzCore
import WebKit

private func nativePaneImage(fromDataUrl dataUrl: String?, isTemplate: Bool = false) -> NSImage? {
  guard let dataUrl,
    let commaIndex = dataUrl.firstIndex(of: ",")
  else {
    return nil
  }
  let metadata = dataUrl[..<commaIndex]
  let payload = String(dataUrl[dataUrl.index(after: commaIndex)...])
  let data: Data?
  if metadata.contains(";base64") {
    data = Data(base64Encoded: payload)
  } else {
    data = payload.removingPercentEncoding?.data(using: .utf8)
  }
  guard let data else {
    return nil
  }
  guard let image = NSImage(data: data) else {
    return nil
  }
  image.isTemplate = isTemplate
  return image
}

private func nativePaneColor(fromHex hex: String?) -> NSColor? {
  guard let hex else {
    return nil
  }
  let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
  guard value.count == 6, let rgb = UInt32(value, radix: 16) else {
    return nil
  }
  return NSColor(
    calibratedRed: CGFloat((rgb >> 16) & 0xff) / 255,
    green: CGFloat((rgb >> 8) & 0xff) / 255,
    blue: CGFloat(rgb & 0xff) / 255,
    alpha: 1
  )
}

private let nativeTerminalColorEnvironmentKeys = [
  "ANSI_COLORS_DISABLED",
  "CI",
  "CLICOLOR",
  "CLICOLOR_FORCE",
  "COLORTERM",
  "FORCE_COLOR",
  "NO_COLOR",
  "NODE_DISABLE_COLORS",
  "TERM",
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
]

private func nativeTerminalColorEnvironmentSnapshot(_ environment: [String: String]) -> [String: Any] {
  /**
   CDXC:AgentCliColorDiagnostics 2026-05-04-15:39
   Agent CLIs can render without color when their PTY process inherits
   color-disabling environment values. Capture both the app process env and the
   sidebar-provided Ghostty env overlay at surface creation without changing
   launch behavior.
   */
  var snapshot: [String: Any] = [:]
  for key in nativeTerminalColorEnvironmentKeys {
    snapshot[key] = environment[key] ?? NSNull()
  }
  return snapshot
}

@MainActor
final class TerminalWorkspaceView: NSView {
  private struct TerminalSession {
    let sessionId: String
    let view: Ghostty.SurfaceView
    let scrollView: SurfaceScrollView
    let searchBarView: TerminalSearchBarView
    let titleBarView: TerminalSessionTitleBarView
    let borderView: TerminalPaneBorderView
    var foregroundPid: Int?
    var ttyName: String?
    var cancellables: Set<AnyCancellable> = []
  }

  private struct WebPaneSession {
    let browserTitleObservation: NSKeyValueObservation?
    let diagnosticsBridge: T3CodePaneDiagnosticsBridge
    let hostView: WebPaneHostView
    let isManagedT3Pane: Bool
    let projectId: String?
    let sessionId: String
    let threadId: String?
    let title: String
    let workspaceRoot: String?
    let browserProfileID: UUID?
    let webView: WKWebView
    let titleBarView: TerminalSessionTitleBarView
    let borderView: TerminalPaneBorderView
  }

  private struct PaneResizeHit {
    let availableLength: CGFloat
    let boundaryIndex: Int
    let direction: NativeTerminalLayout.SplitDirection
    let path: String
    let rect: CGRect
    let trackCount: Int
  }

  private struct PaneResizeDrag {
    let availableLength: CGFloat
    let boundaryIndex: Int
    let direction: NativeTerminalLayout.SplitDirection
    let minimumAfter: CGFloat
    let minimumBefore: CGFloat
    let path: String
    let startCoordinate: CGFloat
    let startRatios: [CGFloat]
  }

  private struct PaneHeaderDrag {
    var isDragging: Bool
    let sourceSessionId: String
    let startPoint: CGPoint
    var targetSessionId: String?
  }

  private static let terminalTitleBarHeight: CGFloat = 33
  private static let defaultPaneGap: CGFloat = 12
  private static let singlePaneInset: CGFloat = 1
  private static let paneResizeMinimumHeight: CGFloat = 160
  private static let paneResizeMinimumWidth: CGFloat = 220
  private static let paneHeaderDragThreshold: CGFloat = 6
  private static let paneHeaderDragGhostMaxWidth: CGFloat = 230
  private static let browserPaneApplicationNameForUserAgent = "Version/18.4 Safari/605.1.15"
  private static let defaultWorkspaceBackgroundColor = NSColor(
    calibratedRed: 0.071, green: 0.071, blue: 0.071, alpha: 1)
  private let ghostty: Ghostty.App
  private let sendEvent: (HostEvent) -> Void
  private var sessions: [String: TerminalSession] = [:]
  private var webPaneSessions: [String: WebPaneSession] = [:]
  private var webPaneFaviconTasksBySessionId: [String: Task<Void, Never>] = [:]
  private var completedWebPaneLoadSessionIds = Set<String>()
  private var pendingAuthenticatedWebPaneLoadSessionIds = Set<String>()
  private var t3ThreadRouteRetryAttemptsBySessionId = [String: Int]()
  private var activeSessionIds = Set<String>()
  private var attentionSessionIds = Set<String>()
  private var sessionAgentIconColors = [String: String]()
  private var sessionAgentIconDataUrls = [String: String]()
  private var sessionActivities = [String: NativeTerminalActivity]()
  private var sessionTitles = [String: String]()
  private var focusedSessionId: String?
  private var lastEmittedFocusedSessionId: String?
  private var paneGap = TerminalWorkspaceView.defaultPaneGap
  private var programmaticFocusDepth = 0
  private var terminalLayout: NativeTerminalLayout?
  private var paneResizeHits: [PaneResizeHit] = []
  private var paneResizeRatiosByPath: [String: [CGFloat]] = [:]
  private var paneResizeDrag: PaneResizeDrag?
  private var paneResizeHandleViews: [TerminalWorkspacePaneResizeHandleView] = []
  private var paneHeaderDrag: PaneHeaderDrag?
  private var paneHeaderActionPress: (sessionId: String, action: TerminalTitleBarAction)?
  private var paneHeaderEventMonitor: Any?
  private var paneHeaderDragGhostView: TerminalPaneHeaderDragGhostView?
  private var paneHeaderDragTargetView: TerminalPaneHeaderDragTargetView?
  private var resizeLogSignatureBySessionId = [String: String]()
  private var exitPollTimer: Timer?

  /**
   CDXC:NativeTerminals 2026-04-26-06:44
   Project switching should show only the selected project's terminals.
   Inactive terminal surfaces are moved offscreen, and sidebar/native id
   translation decides which native Ghostty session is active.
   */
  init(ghostty: Ghostty.App, sendEvent: @escaping (HostEvent) -> Void) {
    self.ghostty = ghostty
    self.sendEvent = sendEvent
    super.init(frame: .zero)
    wantsLayer = true
    layer?.backgroundColor = Self.defaultWorkspaceBackgroundColor.cgColor
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  deinit {
    if let paneHeaderEventMonitor {
      NSEvent.removeMonitor(paneHeaderEventMonitor)
    }
  }

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    uninstallPaneHeaderEventMonitor()
    if window != nil {
      installPaneHeaderEventMonitor()
    }
  }

  func createTerminal(_ command: CreateTerminal) {
    let activateOnCreate = command.activateOnCreate ?? true
    /**
     CDXC:CrashDiagnostics 2026-05-04-09:10
     Rapid sidebar agent launches must identify whether the crash happens
     before Ghostty surface allocation, during mount, or after ready events.
     Keep these breadcrumbs in the native focus log alongside layout sync.
     */
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.createTerminal.received",
      details: [
        "activateOnCreate": activateOnCreate,
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "hasInitialInput": command.initialInput?.isEmpty == false,
        "knownSessionIds": Array(sessions.keys).sorted(),
        "requestedSessionId": command.sessionId,
        "title": command.title ?? "",
      ])
    if sessions[command.sessionId] != nil {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.createTerminal.existing",
        details: [
          "activeSessionIds": Array(activeSessionIds).sorted(),
          "requestedSessionId": command.sessionId,
        ])
      focusTerminal(sessionId: command.sessionId, reason: "createTerminalExisting")
      if let initialInput = command.initialInput, !initialInput.isEmpty {
        writeTerminalText(sessionId: command.sessionId, text: initialInput)
      }
      return
    }

    guard let app = ghostty.app else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.createTerminal.ghosttyMissing",
        details: [
          "requestedSessionId": command.sessionId,
          "title": command.title ?? "",
        ])
      sendEvent(
        .terminalError(sessionId: command.sessionId, message: "Ghostty runtime is not ready"))
      return
    }

    var config = Ghostty.SurfaceConfiguration()
    config.workingDirectory = command.cwd
    config.environmentVariables = command.env ?? [:]
    config.initialInput = command.initialInput
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.createTerminal.surfaceInit.start",
      details: [
        "commandColorEnv": nativeTerminalColorEnvironmentSnapshot(config.environmentVariables),
        "envCount": config.environmentVariables.count,
        "hasInitialInput": command.initialInput?.isEmpty == false,
        "processColorEnv": nativeTerminalColorEnvironmentSnapshot(ProcessInfo.processInfo.environment),
        "requestedSessionId": command.sessionId,
        "title": command.title ?? "",
        "workingDirectory": command.cwd,
      ])
    let surfaceView = ZmuxGhosttySurfaceView(app, baseConfig: config)
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.createTerminal.surfaceInit.completed",
      details: [
        "hasSurfaceModel": surfaceView.surfaceModel != nil,
        "requestedSessionId": command.sessionId,
      ])
    surfaceView.translatesAutoresizingMaskIntoConstraints = false
    /**
     CDXC:NativeTerminals 2026-04-28-03:09
     Embedded Ghostty terminals must expose the same visible scrollback
     scrollbar as Ghostty windows. Mount the surface through Ghostty's native
     scroll wrapper so scrollbar state, dragging, and scrollback positioning
     are driven by the terminal core instead of a separate overlay.
    */
    let scrollView = SurfaceScrollView(contentSize: .zero, surfaceView: surfaceView)
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    let searchBarView = TerminalSearchBarView(surfaceView: surfaceView)
    searchBarView.translatesAutoresizingMaskIntoConstraints = false
    let titleBarView = TerminalSessionTitleBarView(
      title: normalizedTerminalSessionTitle(command.title, sessionId: command.sessionId)
    )
    titleBarView.translatesAutoresizingMaskIntoConstraints = false
    titleBarView.onMouseDown = { [weak self] event in
      self?.handlePaneTitleBarMouseDown(
        event,
        sessionId: command.sessionId,
        focusReason: "nativeTitleBarMouseDown")
    }
    titleBarView.onMouseDragged = { [weak self] event in
      self?.handlePaneTitleBarMouseDragged(event, sessionId: command.sessionId)
    }
    titleBarView.onMouseUp = { [weak self] event in
      self?.handlePaneTitleBarMouseUp(event, sessionId: command.sessionId)
    }
    titleBarView.resizeCursorForPoint = { [weak self, weak titleBarView] point in
      guard let self, let titleBarView else {
        return nil
      }
      let workspacePoint = self.convert(point, from: titleBarView)
      return self.paneResizeCursor(at: workspacePoint)
    }
    titleBarView.onAction = { [weak self] action in
      self?.focusTerminal(sessionId: command.sessionId, reason: "nativeTitleBarAction")
      self?.sendEvent(.terminalTitleBarAction(sessionId: command.sessionId, action: action))
    }
    let borderView = TerminalPaneBorderView()
    borderView.translatesAutoresizingMaskIntoConstraints = false

    var session = TerminalSession(
      sessionId: command.sessionId,
      view: surfaceView,
      scrollView: scrollView,
      searchBarView: searchBarView,
      titleBarView: titleBarView,
      borderView: borderView,
      foregroundPid: nil,
      ttyName: nil)
    surfaceView.$title
      .removeDuplicates()
      .sink { [weak self] title in
        guard !title.isEmpty else { return }
        /**
         CDXC:NativeTerminals 2026-04-30-03:41
         Ghostty terminal/window titles are still forwarded to the sidebar for
         agent detection, but they must not directly replace the native pane
         title. The pane title comes from setActiveTerminalSet.sessionTitles so
         already-ellipsized OSC/window titles cannot poison AppKit chrome.
         */
        self?.sendEvent(.terminalTitleChanged(sessionId: command.sessionId, title: title))
      }
      .store(in: &session.cancellables)
    surfaceView.$bell
      .removeDuplicates()
      .sink { [weak self] didRing in
        if didRing {
          self?.sendEvent(.terminalBell(sessionId: command.sessionId))
        }
      }
      .store(in: &session.cancellables)
    surfaceView.$searchState
      .receive(on: DispatchQueue.main)
      .sink { [weak searchBarView] searchState in
        searchBarView?.setSearchState(searchState)
      }
      .store(in: &session.cancellables)
    surfaceView.$cellSize
      .removeDuplicates()
      .receive(on: DispatchQueue.main)
      .sink { [weak self] _ in
        /**
         CDXC:NativeTerminalResize 2026-04-29-07:29
         Cell-stepped embedded terminal layout depends on Ghostty's measured
         cell size. Relayout when the initial measurement arrives or font
         settings change so pane geometry stays aligned to terminal columns.
         */
        self?.needsLayout = true
      }
      .store(in: &session.cancellables)

    sessions[command.sessionId] = session
    addSubview(scrollView)
    addSubview(searchBarView)
    addSubview(titleBarView)
    addSubview(borderView)
    if activateOnCreate {
      activeSessionIds.insert(command.sessionId)
      terminalLayout = terminalLayout ?? .leaf(sessionId: command.sessionId)
    } else {
      /**
       CDXC:CrashRootCause 2026-05-04-09:19
       Sidebar-created terminals are mounted inactive because the sidebar sends
       setActiveTerminalSet immediately after creation. This prevents rapid
       launches from transiently laying out and focusing both the previous and
       new Ghostty surfaces before the authoritative visible-session snapshot
       arrives.
       */
      moveOffscreen(scrollView)
      moveOffscreen(searchBarView)
      moveOffscreen(titleBarView)
      moveOffscreen(borderView)
      searchBarView.isHidden = true
      titleBarView.isHidden = true
      borderView.isHidden = true
    }
    needsLayout = true
    if activateOnCreate {
      focusTerminal(sessionId: command.sessionId, reason: "createTerminalNew")
    }

    let ttyName = surfaceView.surfaceModel?.ttyName
    let foregroundPid = surfaceView.surfaceModel?.foregroundPID
    sessions[command.sessionId]?.ttyName = ttyName
    sessions[command.sessionId]?.foregroundPid = foregroundPid
    sendEvent(
      .terminalReady(
        sessionId: command.sessionId,
        ttyName: ttyName,
        foregroundPid: foregroundPid
      ))
    sendEvent(.terminalCwdChanged(sessionId: command.sessionId, cwd: command.cwd))
    startExitPollingIfNeeded()
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.createTerminal.completed",
      details: [
        "activateOnCreate": activateOnCreate,
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "foregroundPid": foregroundPid ?? 0,
        "requestedSessionId": command.sessionId,
        "ttyName": ttyName ?? "",
        "visibleSessionIds": orderedVisibleSessionIds(),
      ])
  }

  func closeTerminal(sessionId: String) {
    guard let session = sessions.removeValue(forKey: sessionId) else {
      return
    }
    activeSessionIds.remove(sessionId)
    sessionActivities.removeValue(forKey: sessionId)
    sessionAgentIconDataUrls.removeValue(forKey: sessionId)
    sessionTitles.removeValue(forKey: sessionId)
    resizeLogSignatureBySessionId.removeValue(forKey: sessionId)
    if let surface = session.view.surface {
      ghostty.requestClose(surface: surface)
    }
    NativeTerminalProcessMonitor.terminateSessionProcesses(
      ttyName: session.view.surfaceModel?.ttyName ?? session.ttyName,
      foregroundPid: session.view.surfaceModel?.foregroundPID ?? session.foregroundPid,
      reason: "closeTerminal")
    session.scrollView.removeFromSuperview()
    session.searchBarView.removeFromSuperview()
    session.titleBarView.removeFromSuperview()
    session.borderView.removeFromSuperview()
    terminalLayout = prunedLayout(removing: sessionId, from: terminalLayout)
    attentionSessionIds.remove(sessionId)
    if focusedSessionId == sessionId {
      focusedSessionId = nil
    }
    needsLayout = true
    sendEvent(.terminalExited(sessionId: sessionId, exitCode: nil))
    stopExitPollingIfIdle()
  }

  /**
   CDXC:T3Code 2026-04-30-02:38
   T3 Code is a web pane in the reference workspace, not a terminal command.
   Native zmux therefore mounts a WKWebView surface in the same pane layout so
   the T3 button embeds the app instead of typing `npx --yes t3` into Ghostty.
   */
  func createWebPane(_ command: CreateWebPane) {
    let initialUrl = URL(string: command.url)
    let isManagedT3Pane = initialUrl.map(NativeT3RuntimeLauncher.isManagedRuntimeURL) ?? false
    if let existingSession = webPaneSessions[command.sessionId] {
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.create.reused", [
        "sessionId": command.sessionId,
        "threadId": command.threadId ?? NSNull(),
        "url": command.url,
      ])
      if existingSession.isManagedT3Pane, isManagedT3Pane {
        webPaneSessions[command.sessionId] = WebPaneSession(
          browserTitleObservation: existingSession.browserTitleObservation,
          diagnosticsBridge: existingSession.diagnosticsBridge,
          hostView: existingSession.hostView,
          isManagedT3Pane: existingSession.isManagedT3Pane,
          projectId: command.projectId,
          sessionId: existingSession.sessionId,
          threadId: command.threadId,
          title: command.title,
          workspaceRoot: command.cwd ?? existingSession.workspaceRoot,
          browserProfileID: existingSession.browserProfileID,
          webView: existingSession.webView,
          titleBarView: existingSession.titleBarView,
          borderView: existingSession.borderView
        )
        existingSession.titleBarView.setTitle(
          normalizedTerminalSessionTitle(command.title, sessionId: command.sessionId))
        if let url = initialUrl {
          completedWebPaneLoadSessionIds.remove(command.sessionId)
          pendingAuthenticatedWebPaneLoadSessionIds.remove(command.sessionId)
          loadWebPane(sessionId: command.sessionId, url: url, reason: "createWebPaneExistingReroute")
        }
      }
      focusWebPane(sessionId: command.sessionId, reason: "createWebPaneExisting")
      return
    }

    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.create.start", [
      "sessionId": command.sessionId,
      "title": command.title,
      "url": command.url,
      "workspaceRoot": command.cwd ?? NSNull(),
    ])
    let configuration = WKWebViewConfiguration()
    configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
    configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
    if !isManagedT3Pane {
      /**
       CDXC:BrowserPanes 2026-05-03-02:08
       Public sites such as Google serve legacy/basic markup to WKWebView's
       bare default user agent because it lacks Safari's Version/Safari product
       token. Browser panes should identify as Safari-compatible WebKit so page
       styling matches Safari while T3 panes keep their managed runtime path.
       */
      configuration.applicationNameForUserAgent = Self.browserPaneApplicationNameForUserAgent
    }
    let browserProfileID = isManagedT3Pane ? nil : NativeBrowserProfileStore.shared.effectiveLastUsedProfileID
    configuration.websiteDataStore = browserProfileID.map {
      NativeBrowserProfileStore.shared.websiteDataStore(for: $0)
    } ?? .default()
    let diagnosticsBridge = T3CodePaneDiagnosticsBridge(
      sessionId: command.sessionId,
      onThreadChanged: { [weak self] sessionId, threadId, title in
        self?.sendEvent(.t3ThreadChanged(sessionId: sessionId, threadId: threadId, title: title))
      })
    configuration.userContentController.add(
      diagnosticsBridge,
      name: T3CodePaneDiagnosticsBridge.messageHandlerName
    )
    configuration.userContentController.addUserScript(
      WKUserScript(
        source: Self.t3WebPaneDiagnosticsScript,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: false
      ))
    if isManagedT3Pane {
      configuration.userContentController.addUserScript(
        WKUserScript(
          source: Self.t3WebPaneBridgeScript(
            sessionId: command.sessionId, title: command.title, workspaceRoot: command.cwd),
          injectionTime: .atDocumentStart,
          forMainFrameOnly: true
        ))
    }
    let webView = WKWebView(frame: .zero, configuration: configuration)
    if #available(macOS 13.3, *) {
      webView.isInspectable = true
    }
    webView.translatesAutoresizingMaskIntoConstraints = true
    webView.allowsBackForwardNavigationGestures = true
    webView.navigationDelegate = self
    webView.uiDelegate = self
    /**
     CDXC:T3Code 2026-04-30-19:17
     Native T3 panes must use WKWebView's default opaque drawing path. The
     accessibility tree can report a live T3 DOM even when transparent WebKit
     compositing only shows the workspace's gray backing layer, so do not make
     the embedded app transparent while debugging or rendering production panes.
     */
    webView.wantsLayer = true
    webView.layer?.masksToBounds = true
    webView.underPageBackgroundColor = NSColor(calibratedRed: 0.086, green: 0.086, blue: 0.086, alpha: 1)
    /**
     CDXC:BrowserPanes 2026-05-02-16:58
     Browser panes need in-pane navigation chrome like the embedded browser
     reference: back/forward/reload, a URL field, and browser tooling buttons.
     The chrome is owned by the native pane host, not an overlay, so the pane
     still participates in the same splitter layout as T3 Code and terminals.
     */
    let hostView = WebPaneHostView(
      webView: webView,
      showsBrowserToolbar: !isManagedT3Pane,
      initialAddress: command.url,
      onFocus: { [weak self] in
        self?.focusWebPane(sessionId: command.sessionId, reason: "browserToolbar")
      },
      onOpenDevTools: { [weak self] in
        self?.openBrowserDevTools(sessionId: command.sessionId)
      },
      onInjectReactGrab: { [weak self] in
        self?.injectBrowserReactGrab(sessionId: command.sessionId)
      },
      onShowProfilePicker: { [weak self] in
        self?.showBrowserProfilePicker(sessionId: command.sessionId)
      },
      onShowImportSettings: { [weak self] in
        self?.showBrowserImportSettings(sessionId: command.sessionId)
      }
    )
    hostView.translatesAutoresizingMaskIntoConstraints = false

    let titleBarView = TerminalSessionTitleBarView(
      title: normalizedTerminalSessionTitle(command.title, sessionId: command.sessionId),
      actions: isManagedT3Pane ? TerminalSessionTitleBarView.defaultActions : [.close]
    )
    titleBarView.translatesAutoresizingMaskIntoConstraints = false
    titleBarView.onMouseDown = { [weak self] event in
      self?.handlePaneTitleBarMouseDown(
        event,
        sessionId: command.sessionId,
        focusReason: "nativeWebTitleBarMouseDown")
    }
    titleBarView.onMouseDragged = { [weak self] event in
      self?.handlePaneTitleBarMouseDragged(event, sessionId: command.sessionId)
    }
    titleBarView.onMouseUp = { [weak self] event in
      self?.handlePaneTitleBarMouseUp(event, sessionId: command.sessionId)
    }
    titleBarView.resizeCursorForPoint = { [weak self, weak titleBarView] point in
      guard let self, let titleBarView else {
        return nil
      }
      let workspacePoint = self.convert(point, from: titleBarView)
      return self.paneResizeCursor(at: workspacePoint)
    }
    titleBarView.onAction = { [weak self] action in
      self?.focusWebPane(sessionId: command.sessionId, reason: "nativeWebTitleBarAction")
      self?.sendEvent(.terminalTitleBarAction(sessionId: command.sessionId, action: action))
    }
    let borderView = TerminalPaneBorderView()
    borderView.translatesAutoresizingMaskIntoConstraints = false
    /**
     CDXC:BrowserPanes 2026-05-03-01:58
     Browser panes should name native chrome from the loaded page, not the
     launch URL or localhost wrapper. Observe WKWebView title changes and feed
     them through the existing session-title sync path so later layout syncs do
     not overwrite the AppKit title bar with the initial browser card title.
     */
    let browserTitleObservation =
      isManagedT3Pane
      ? nil
      : webView.observe(\.title, options: [.new]) { [weak self, weak webView] _, _ in
        Task { @MainActor in
          guard let webView else { return }
          self?.updateWebPanePageMetadata(for: webView, reason: "titleObservation")
        }
      }

    webPaneSessions[command.sessionId] = WebPaneSession(
      browserTitleObservation: browserTitleObservation,
      diagnosticsBridge: diagnosticsBridge,
      hostView: hostView,
      isManagedT3Pane: isManagedT3Pane,
      projectId: command.projectId,
      sessionId: command.sessionId,
      threadId: command.threadId,
      title: command.title,
      workspaceRoot: command.cwd,
      browserProfileID: browserProfileID,
      webView: webView,
      titleBarView: titleBarView,
      borderView: borderView
    )
    activeSessionIds.insert(command.sessionId)
    addSubview(hostView)
    addSubview(titleBarView)
    addSubview(borderView)
    orderWebPaneViewsToFront(webPaneSessions[command.sessionId])
    terminalLayout = terminalLayout ?? .leaf(sessionId: command.sessionId)

    if let url = initialUrl {
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.requested", [
        "isManagedT3Pane": isManagedT3Pane,
        "sessionId": command.sessionId,
        "url": url.absoluteString,
        "workspaceRoot": command.cwd ?? NSNull(),
      ])
      loadWebPaneStatus(
        sessionId: command.sessionId,
        title: command.title,
        message: isManagedT3Pane ? "Loading T3 Code…" : "Loading Browser…",
        caption: isManagedT3Pane ? "Preparing the embedded workspace" : url.absoluteString,
        loading: true,
        reason: "createWebPane")
      loadWebPane(sessionId: command.sessionId, url: url, reason: "initial")
    } else {
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.invalidUrl", [
        "sessionId": command.sessionId,
        "url": command.url,
      ])
    }

    needsLayout = true
    scheduleDeferredWebPaneLayout(sessionId: command.sessionId, reason: "createWebPaneNew")
    focusWebPane(sessionId: command.sessionId, reason: "createWebPaneNew")
  }

  func closeWebPane(sessionId: String) {
    guard let session = webPaneSessions.removeValue(forKey: sessionId) else {
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.close.missing", [
        "sessionId": sessionId,
      ])
      return
    }
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.close.start", [
      "currentUrl": session.webView.url?.absoluteString ?? NSNull(),
      "sessionId": sessionId,
    ])
    activeSessionIds.remove(sessionId)
    sessionActivities.removeValue(forKey: sessionId)
    sessionAgentIconDataUrls.removeValue(forKey: sessionId)
    completedWebPaneLoadSessionIds.remove(sessionId)
    pendingAuthenticatedWebPaneLoadSessionIds.remove(sessionId)
    t3ThreadRouteRetryAttemptsBySessionId.removeValue(forKey: sessionId)
    webPaneFaviconTasksBySessionId.removeValue(forKey: sessionId)?.cancel()
    session.webView.navigationDelegate = nil
    session.webView.uiDelegate = nil
    session.webView.configuration.userContentController.removeScriptMessageHandler(
      forName: T3CodePaneDiagnosticsBridge.messageHandlerName
    )
    session.webView.stopLoading()
    session.hostView.removeFromSuperview()
    session.titleBarView.removeFromSuperview()
    session.borderView.removeFromSuperview()
    terminalLayout = prunedLayout(removing: sessionId, from: terminalLayout)
    attentionSessionIds.remove(sessionId)
    if focusedSessionId == sessionId {
      focusedSessionId = nil
    }
    needsLayout = true
    sendEvent(.terminalExited(sessionId: sessionId, exitCode: nil))
  }

  func focusWebPane(sessionId: String, reason: String = "explicitFocusWebPaneCommand") {
    guard let session = webPaneSessions[sessionId] else {
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.focus.missing", [
        "knownSessionIds": Array(webPaneSessions.keys).sorted(),
        "reason": reason,
        "sessionId": sessionId,
      ])
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.focusWebPane.missingSession",
        details: [
          "activeSessionIds": Array(activeSessionIds).sorted(),
          "knownSessionIds": Array(webPaneSessions.keys).sorted(),
          "reason": reason,
          "requestedSessionId": sessionId,
      ])
      return
    }
    let view = session.webView
    focusedSessionId = sessionId
    orderWebPaneViewsToFront(session)
    updateAllTerminalBorders()
    _ = window?.makeFirstResponder(view)
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.focus.applied", [
      "currentUrl": view.url?.absoluteString ?? NSNull(),
      "reason": reason,
      "sessionId": sessionId,
    ])
    sendEvent(.terminalFocused(sessionId: sessionId))
  }

  func openBrowserDevTools(sessionId: String) {
    guard let session = webPaneSessions[sessionId] else {
      return
    }
    focusWebPane(sessionId: sessionId, reason: "browserDevTools")
    if !NativeBrowserDevTools.toggle(for: session.webView) {
      NSSound.beep()
    }
  }

  func injectBrowserReactGrab(sessionId: String) {
    guard let session = webPaneSessions[sessionId] else {
      return
    }
    focusWebPane(sessionId: sessionId, reason: "browserReactGrab")
    Task { @MainActor in
      await NativeBrowserReactGrabInjector.toggleOrInject(into: session.webView)
    }
  }

  func showBrowserProfilePicker(sessionId: String) {
    guard let session = webPaneSessions[sessionId] else {
      return
    }
    focusWebPane(sessionId: sessionId, reason: "browserProfilePicker")
    NativeBrowserProfileUI.showPicker(
      parentWindow: window,
      currentProfileID: session.browserProfileID
    )
  }

  func showBrowserImportSettings(sessionId: String) {
    guard webPaneSessions[sessionId] != nil else {
      return
    }
    focusWebPane(sessionId: sessionId, reason: "browserImportSettings")
    NativeBrowserProfileUI.showImportSettings(parentWindow: window)
  }

  func reloadWebPane(sessionId: String) {
    guard let session = webPaneSessions[sessionId] else {
      return
    }
    focusWebPane(sessionId: sessionId, reason: "browserPaneReload")
    /**
     CDXC:BrowserPanes 2026-05-02-17:39
     Browser-pane title-bar reload must operate on the embedded WKWebView,
     because browser panes are first-class AppKit panes and their title-bar
     controls should not be terminal-only no-ops.
     */
    if session.webView.isLoading {
      session.webView.stopLoading()
    } else {
      session.webView.reload()
    }
  }

  func focusTerminal(sessionId: String, reason: String = "explicitFocusTerminalCommand") {
    guard let view = sessions[sessionId]?.view else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.focusTerminal.missingSession",
        details: [
          "activeSessionIds": Array(activeSessionIds).sorted(),
          "knownSessionIds": Array(sessions.keys).sorted(),
          "reason": reason,
          "requestedSessionId": sessionId,
          "responderBefore": responderSnapshot(),
        ])
      return
    }
    focusedSessionId = sessionId
    updateAllTerminalBorders()
    let didChangeFocus = window?.firstResponder !== view
    let responderBefore = responderSnapshot()
    programmaticFocusDepth += 1
    let makeFirstResponderResult = window?.makeFirstResponder(view) ?? false
    programmaticFocusDepth -= 1
    let responderAfter = responderSnapshot()
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.focusTerminal.completed",
      details: [
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "didChangeFocus": didChangeFocus,
        "makeFirstResponderResult": makeFirstResponderResult,
        "reason": reason,
        "requestedSessionId": sessionId,
        "responderAfter": responderAfter,
        "responderBefore": responderBefore,
        "viewFrame": describeFrame(view.frame),
        "visibleSessionIds": orderedVisibleSessionIds(),
        "windowIsKey": window?.isKeyWindow ?? false,
      ])
  }

  func windowFirstResponderChanged(_ responder: NSResponder?, reason: String) {
    if programmaticFocusDepth > 0 {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.windowFirstResponderChanged.programmaticSkipped",
        details: [
          "programmaticFocusDepth": programmaticFocusDepth,
          "reason": reason,
          "responder": responder.map { String(describing: type(of: $0)) } ?? "nil",
        ])
      return
    }
    guard let responder else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.windowFirstResponderChanged.nil",
        details: [
          "lastEmittedFocusedSessionId": nullableString(lastEmittedFocusedSessionId),
          "reason": reason,
        ])
      return
    }
    emitFocusedSessionIfNeeded(for: responder, reason: reason)
  }

  func writeTerminalText(sessionId: String, text: String) {
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.writeTerminalText",
      details: [
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "requestedSessionId": sessionId,
        "responderBefore": responderSnapshot(),
        "textLength": text.count,
        "textPreview": summarizeTerminalText(text),
        "visibleSessionIds": orderedVisibleSessionIds(),
      ])
    sessions[sessionId]?.view.surfaceModel?.sendText(text)
  }

  /**
   CDXC:SessionTitleSync 2026-04-26-10:04
   The sidebar stages `/rename <title>` as terminal text, then submits it with
   a real Return key event. Ghostty treats text carriage returns differently
   in Codex, so Enter must travel through the same key path as a user press.
   */
  func sendTerminalEnter(sessionId: String) {
    guard let view = sessions[sessionId]?.view else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.sendTerminalEnter.missingSession",
        details: [
          "activeSessionIds": Array(activeSessionIds).sorted(),
          "requestedSessionId": sessionId,
          "responderBefore": responderSnapshot(),
          "visibleSessionIds": orderedVisibleSessionIds(),
        ])
      return
    }
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.sendTerminalEnter.start",
      details: [
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "requestedSessionId": sessionId,
        "responderBefore": responderSnapshot(),
        "visibleSessionIds": orderedVisibleSessionIds(),
      ])
    focusTerminal(sessionId: sessionId, reason: "sendTerminalEnter")
    guard
      let event = NSEvent.keyEvent(
        with: .keyDown,
        location: .zero,
        modifierFlags: [],
        timestamp: ProcessInfo.processInfo.systemUptime,
        windowNumber: view.window?.windowNumber ?? 0,
        context: nil,
        characters: "\r",
        charactersIgnoringModifiers: "\r",
        isARepeat: false,
        keyCode: 36
      )
    else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.sendTerminalEnter.eventCreationFailed",
        details: [
          "requestedSessionId": sessionId,
          "responderAfterFocus": responderSnapshot(),
        ])
      return
    }
    view.keyDown(with: event)
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.sendTerminalEnter.sent",
      details: [
        "requestedSessionId": sessionId,
        "responderAfter": responderSnapshot(),
      ])
  }

  func setTerminalLayout(_ nextLayout: NativeTerminalLayout) {
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.setTerminalLayout",
      details: [
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "responderBefore": responderSnapshot(),
        "visibleSessionIds": orderedVisibleSessionIds(),
      ])
    terminalLayout = nextLayout
    paneResizeRatiosByPath.removeAll()
    paneResizeDrag = nil
    needsLayout = true
  }

  func setTerminalVisibility(sessionId: String, visible: Bool) {
    guard let session = sessions[sessionId] else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.setTerminalVisibility.missingSession",
        details: [
          "activeSessionIds": Array(activeSessionIds).sorted(),
          "requestedSessionId": sessionId,
          "responderBefore": responderSnapshot(),
          "visible": visible,
        ])
      return
    }
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.setTerminalVisibility",
      details: [
        "activeSessionIdsBefore": Array(activeSessionIds).sorted(),
        "requestedSessionId": sessionId,
        "responderBefore": responderSnapshot(),
        "visible": visible,
      ])
    if visible {
      activeSessionIds.insert(sessionId)
    } else {
      activeSessionIds.remove(sessionId)
      moveOffscreen(session.scrollView)
      moveOffscreen(session.searchBarView)
      moveOffscreen(session.titleBarView)
      moveOffscreen(session.borderView)
    }
    session.scrollView.isHidden = false
    session.searchBarView.isHidden = !visible || session.view.searchState == nil
    session.titleBarView.isHidden = !visible
    session.borderView.isHidden = !visible
    needsLayout = true
    updateTerminalBorder(for: sessionId)
  }

  func setActiveTerminalSet(_ command: SetActiveTerminalSet) {
    let responderBefore = responderSnapshot()
    activeSessionIds = Set(command.activeSessionIds)
    attentionSessionIds = Set(command.attentionSessionIds ?? [])
    sessionAgentIconColors = command.sessionAgentIconColors ?? [:]
    sessionAgentIconDataUrls = command.sessionAgentIconDataUrls ?? [:]
    sessionActivities = command.sessionActivities ?? [:]
    sessionTitles = command.sessionTitles ?? [:]
    focusedSessionId = command.focusedSessionId
    terminalLayout = command.layout
    paneGap = Self.clampedPaneGap(command.paneGap)
    /**
     CDXC:WorkspaceLayout 2026-04-28-06:08
     The terminal workspace background is user-configurable from Settings.
     Apply the chosen color directly to the AppKit backing layer so the
     visible space created by Pane Gap uses the user's color.
     */
    layer?.backgroundColor = Self.workspaceBackgroundColor(command.backgroundColor).cgColor
    for session in sessions.values {
      session.scrollView.isHidden = false
      session.searchBarView.isHidden =
        !activeSessionIds.contains(session.sessionId) || session.view.searchState == nil
      session.titleBarView.isHidden = false
      session.borderView.isHidden = false
      if let title = sessionTitles[session.sessionId] {
        session.titleBarView.setTitle(
          normalizedTerminalSessionTitle(title, sessionId: session.sessionId)
        )
      }
      session.titleBarView.setAgentIconDataUrl(
        sessionAgentIconDataUrls[session.sessionId],
        colorHex: sessionAgentIconColors[session.sessionId])
      if !activeSessionIds.contains(session.sessionId) {
        moveOffscreen(session.scrollView)
        moveOffscreen(session.searchBarView)
        moveOffscreen(session.titleBarView)
        moveOffscreen(session.borderView)
      }
    }
    for session in webPaneSessions.values {
      session.hostView.isHidden = false
      session.titleBarView.isHidden = false
      session.borderView.isHidden = false
      session.titleBarView.setAgentIconDataUrl(
        sessionAgentIconDataUrls[session.sessionId],
        colorHex: sessionAgentIconColors[session.sessionId])
      if !activeSessionIds.contains(session.sessionId) {
        moveOffscreen(session.hostView)
        moveOffscreen(session.titleBarView)
        moveOffscreen(session.borderView)
      }
    }
    needsLayout = true
    layoutSubtreeIfNeeded()
    scheduleDeferredWebPaneLayout(sessionId: command.focusedSessionId, reason: "setActiveTerminalSet")
    updateAllTerminalBorders()
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.setActiveTerminalSet.applied",
      details: [
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "attentionSessionIds": Array(attentionSessionIds).sorted(),
        "backgroundColor": command.backgroundColor ?? "default",
        "focusedSessionId": nullableString(command.focusedSessionId),
        "paneGap": Double(paneGap),
        "responderAfterLayout": responderSnapshot(),
        "responderBefore": responderBefore,
        "visibleSessionIds": orderedVisibleSessionIds(),
      ])
    if let focusedSessionId = command.focusedSessionId,
      activeSessionIds.contains(focusedSessionId)
    {
      if shouldPreserveNonTerminalFirstResponder() {
        /**
         CDXC:ScratchPadFocus 2026-04-28-05:35
         Passive sidebar state sync must not steal typing focus from the
         full-window modal host or other WKWebView controls. Explicit terminal
         focus commands still call focusTerminal directly; only
         setActiveTerminalSet preserves a non-terminal first responder.
         */
        TerminalFocusDebugLog.append(
          event: "nativeWorkspace.setActiveTerminalSet.focusPreserved",
          details: [
            "focusedSessionId": focusedSessionId,
            "responder": responderSnapshot(),
          ])
        return
      }
      if sessions[focusedSessionId] != nil {
        focusTerminal(sessionId: focusedSessionId, reason: "setActiveTerminalSet")
      } else if webPaneSessions[focusedSessionId] != nil {
        focusWebPane(sessionId: focusedSessionId, reason: "setActiveTerminalSet")
      }
    }
  }

  override func layout() {
    super.layout()
    paneResizeHits.removeAll()
    let visibleSessionIds = orderedVisibleSessionIds()
    guard !visibleSessionIds.isEmpty else {
      hidePaneResizeHandleViews()
      discardCursorRects()
      return
    }
    if let terminalLayout {
      layoutTree(terminalLayout, in: layoutBounds(forVisibleCount: visibleSessionIds.count), path: "root")
    } else {
      layoutGrid(visibleSessionIds, in: layoutBounds(forVisibleCount: visibleSessionIds.count))
    }
    updateBottomRightPaneBorderCorner()
    syncPaneResizeHandleViews()
    window?.invalidateCursorRects(for: self)
  }

  private func hidePaneResizeHandleViews() {
    for handleView in paneResizeHandleViews {
      handleView.isHidden = true
      handleView.frame = .zero
    }
  }

  private func syncPaneResizeHandleViews() {
    /**
     CDXC:NativePaneResize 2026-05-04-08:21
     The transparent splitter must own hover cursor feedback from a native
     AppKit handle view, while leaving the existing layout math and drag
     behavior in TerminalWorkspaceView.
     CDXC:NativePaneResize 2026-05-04-08:27
     The resize target must be large enough to acquire intentionally while still
     staying transparent and layout-neutral.
     CDXC:NativePaneResize 2026-05-04-08:41
     AppKit layout must not remove and re-add resize handle views, so layout
     only resizes persistent handles and hides unused ones.
     CDXC:NativePaneResize 2026-05-04-08:52
     Splitter handles must live in the actual native pane gap and match the
     configured gap size. Do not overlap terminal or web pane content to force
     cursor precedence; the gap itself is the drag target.
     */
    while paneResizeHandleViews.count < paneResizeHits.count {
      let handleView = TerminalWorkspacePaneResizeHandleView()
      handleView.onMouseDown = { [weak self] event in
        _ = self?.beginPaneResize(with: event)
      }
      handleView.onMouseDragged = { [weak self] event in
        _ = self?.continuePaneResize(with: event)
      }
      handleView.onMouseUp = { [weak self] event in
        _ = self?.endPaneResize(with: event)
      }
      paneResizeHandleViews.append(handleView)
    }

    for (index, handleView) in paneResizeHandleViews.enumerated() {
      guard index < paneResizeHits.count else {
        handleView.isHidden = true
        handleView.frame = .zero
        continue
      }
      let hit = paneResizeHits[index]
      handleView.configure(cursor: paneResizeCursor(for: hit.direction))
      handleView.frame = hit.rect
      handleView.isHidden = false
      handleView.layer?.zPosition = 210
      if handleView.superview == nil {
        addSubview(handleView)
      }
      window?.invalidateCursorRects(for: handleView)
    }
  }

  private func bringPaneResizeHandleViewsToFront() {
    for handleView in paneResizeHandleViews where handleView.superview === self {
      handleView.layer?.zPosition = 210
      window?.invalidateCursorRects(for: handleView)
    }
  }

  private func updateBottomRightPaneBorderCorner() {
    /**
     CDXC:NativePaneChrome 2026-05-04-02:36
     The visible bottom-right pane should always preserve a rounded bottom-right
     active/done border corner in native AppKit layout. Apply the radius to the
     border overlay after split/grid frames are assigned so the rule follows
     pane reorders, split resizing, web panes, and terminal panes uniformly.
     */
    var visibleBorders: [(sessionId: String, borderView: TerminalPaneBorderView)] = []
    for (sessionId, session) in sessions where activeSessionIds.contains(sessionId) {
      visibleBorders.append((sessionId: sessionId, borderView: session.borderView))
    }
    for (sessionId, session) in webPaneSessions where activeSessionIds.contains(sessionId) {
      visibleBorders.append((sessionId: sessionId, borderView: session.borderView))
    }

    let bottomRightSessionId = visibleBorders.max { left, right in
      let leftFrame = left.borderView.frame
      let rightFrame = right.borderView.frame
      if abs(leftFrame.maxX - rightFrame.maxX) > 0.5 {
        return leftFrame.maxX < rightFrame.maxX
      }
      if abs(leftFrame.minY - rightFrame.minY) > 0.5 {
        return leftFrame.minY > rightFrame.minY
      }
      return left.sessionId < right.sessionId
    }?.sessionId

    for (sessionId, borderView) in visibleBorders {
      borderView.setBottomRightCornerRounded(sessionId == bottomRightSessionId)
    }
  }

  private func layoutBounds(forVisibleCount visibleCount: Int) -> CGRect {
    let inset = visibleCount <= 1 ? Self.singlePaneInset : paneGap
    return bounds.insetBy(dx: inset, dy: inset)
  }

  private func orderedVisibleSessionIds() -> [String] {
    let fromLayout =
      terminalLayout.map(leafSessionIds) ?? Array(sessions.keys) + Array(webPaneSessions.keys)
    return fromLayout.filter { activeSessionIds.contains($0) }
  }

  private func layoutTree(_ node: NativeTerminalLayout, in rect: CGRect, path: String) {
    switch node {
    case .leaf(let sessionId):
      setFrame(rect, for: sessionId)
    case .split(let direction, let ratio, let children):
      let visibleChildren = children.filter {
        !leafSessionIds($0).allSatisfy { !activeSessionIds.contains($0) }
      }
      guard !visibleChildren.isEmpty else { return }
      if visibleChildren.count == 1 {
        layoutTree(visibleChildren[0], in: rect, path: "\(path).0")
        return
      }
      /**
       CDXC:WorkspaceLayout 2026-04-28-06:01
       Native split panes must use the same Pane Gap setting as the sidebar
       control. Apply the gap as real AppKit layout space between split
       siblings instead of hardcoded 1px child insets.
       */
      let gap = splitGap(forChildCount: visibleChildren.count)
      let defaultRatios = defaultPaneResizeRatios(
        childCount: visibleChildren.count,
        firstRatio: ratio.map { CGFloat($0) })
      let ratios = normalizedPaneResizeRatios(for: path, defaultRatios: defaultRatios)
      var nextOrigin = direction == .horizontal ? rect.minX : rect.maxY
      let availableLength = max(
        (direction == .horizontal ? rect.width : rect.height)
          - gap * CGFloat(max(visibleChildren.count - 1, 0)),
        CGFloat(visibleChildren.count)
      )
      let ratioTotal = max(ratios.reduce(0, +), 1)
      var childRects: [CGRect] = []
      for (index, child) in visibleChildren.enumerated() {
        let isLast = index == visibleChildren.count - 1
        let childLength: CGFloat
        if isLast {
          childLength =
            direction == .horizontal
            ? max(rect.maxX - nextOrigin, 1)
            : max(nextOrigin - rect.minY, 1)
        } else {
          childLength = max(floor(availableLength * (ratios[index] / ratioTotal)), 1)
        }
        let childRect: CGRect
        if direction == .horizontal {
          childRect = CGRect(
            x: nextOrigin, y: rect.minY, width: childLength, height: rect.height)
          nextOrigin += childLength + gap
        } else {
          childRect = CGRect(
            x: rect.minX, y: nextOrigin - childLength, width: rect.width, height: childLength)
          nextOrigin -= childLength + gap
        }
        childRects.append(childRect)
        layoutTree(child, in: childRect, path: "\(path).\(index)")
      }
      recordPaneResizeHits(
        childRects: childRects,
        direction: direction,
        path: path,
        rect: rect
      )
      if paneResizeRatiosByPath[path]?.count != visibleChildren.count {
        paneResizeRatiosByPath[path] = ratios
      }
    }
  }

  private func layoutGrid(_ sessionIds: [String], in rect: CGRect) {
    let columns = Int(ceil(sqrt(Double(sessionIds.count))))
    let rows = Int(ceil(Double(sessionIds.count) / Double(columns)))
    let gap = splitGap(forChildCount: sessionIds.count)
    let cellWidth = max((rect.width - gap * CGFloat(max(columns - 1, 0))) / CGFloat(columns), 1)
    let cellHeight = max((rect.height - gap * CGFloat(max(rows - 1, 0))) / CGFloat(rows), 1)
    for (index, sessionId) in sessionIds.enumerated() {
      let column = index % columns
      let row = index / columns
      let cell = CGRect(
        x: rect.minX + CGFloat(column) * (cellWidth + gap),
        y: rect.maxY - CGFloat(row + 1) * cellHeight - CGFloat(row) * gap,
        width: cellWidth,
        height: cellHeight
      )
      setFrame(cell, for: sessionId)
    }
  }

  private func splitGap(forChildCount childCount: Int) -> CGFloat {
    childCount <= 1 ? 0 : paneGap
  }

  /**
   CDXC:NativePaneResize 2026-05-02-16:44
   Native Ghostty and WKWebView panes sit above the React workspace DOM, so
   split resizing must be owned by AppKit. The workspace view records cursor
   and mouse bands in the actual configured pane gaps, clamps panes to
   terminal-usable dimensions, and double-click equalizes only split groups
   matching the clicked orientation.
   */
  private func defaultPaneResizeRatios(childCount: Int, firstRatio: CGFloat?) -> [CGFloat] {
    guard childCount > 0 else { return [] }
    guard childCount > 1, let firstRatio else {
      return Array(repeating: 1, count: childCount)
    }
    let first = min(max(firstRatio, 0.05), 0.95)
    let remaining = max(1 - first, 0.05)
    let trailing = remaining / CGFloat(childCount - 1)
    return [first] + Array(repeating: trailing, count: childCount - 1)
  }

  private func normalizedPaneResizeRatios(for path: String, defaultRatios: [CGFloat]) -> [CGFloat] {
    guard let current = paneResizeRatiosByPath[path], current.count == defaultRatios.count,
      current.allSatisfy({ $0 > 0 })
    else {
      return defaultRatios
    }
    return current
  }

  private func recordPaneResizeHits(
    childRects: [CGRect],
    direction: NativeTerminalLayout.SplitDirection,
    path: String,
    rect: CGRect
  ) {
    guard childRects.count > 1 else { return }
    let hitSize = splitGap(forChildCount: childRects.count)
    guard hitSize > 0 else { return }
    for boundaryIndex in 1..<childRects.count {
      let previous = childRects[boundaryIndex - 1]
      let next = childRects[boundaryIndex]
      let hitRect: CGRect
      switch direction {
      case .horizontal:
        let centerX = (previous.maxX + next.minX) / 2
        hitRect = CGRect(
          x: centerX - hitSize / 2,
          y: max(previous.minY, next.minY),
          width: hitSize,
          height: min(previous.maxY, next.maxY) - max(previous.minY, next.minY)
        )
      case .vertical:
        let centerY = (previous.minY + next.maxY) / 2
        hitRect = CGRect(
          x: rect.minX,
          y: centerY - hitSize / 2,
          width: rect.width,
          height: hitSize
        )
      }
      if hitRect.width > 0, hitRect.height > 0 {
        paneResizeHits.append(
          PaneResizeHit(
            availableLength: max(
              (direction == .horizontal ? rect.width : rect.height)
                - splitGap(forChildCount: childRects.count)
                  * CGFloat(max(childRects.count - 1, 0)),
              CGFloat(childRects.count)
            ),
            boundaryIndex: boundaryIndex,
            direction: direction,
            path: path,
            rect: hitRect,
            trackCount: childRects.count
          ))
      }
    }
  }

  override func resetCursorRects() {
    super.resetCursorRects()
    for hit in paneResizeHits {
      addCursorRect(
        hit.rect,
        cursor: hit.direction == .horizontal ? .resizeLeftRight : .resizeUpDown)
    }
  }

  private func paneResizeCursor(at point: CGPoint) -> NSCursor? {
    guard let hit = paneResizeHit(at: point) else {
      return nil
    }
    return paneResizeCursor(for: hit.direction)
  }

  private func paneResizeCursor(for direction: NativeTerminalLayout.SplitDirection) -> NSCursor {
    direction == .horizontal ? .resizeLeftRight : .resizeUpDown
  }

  override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
    true
  }

  override func mouseDown(with event: NSEvent) {
    guard beginPaneResize(with: event) else {
      super.mouseDown(with: event)
      return
    }
  }

  @discardableResult
  private func beginPaneResize(with event: NSEvent) -> Bool {
    let point = convert(event.locationInWindow, from: nil)
    guard let hit = paneResizeHit(at: point) else {
      return false
    }

    if event.clickCount >= 2 {
      equalizePaneResizeRatios(matching: hit.direction)
      paneResizeCursor(for: hit.direction).set()
      return true
    }

    let currentRatios =
      paneResizeRatiosByPath[hit.path]
      ?? Array(repeating: 1, count: hit.trackCount)
    paneResizeDrag = PaneResizeDrag(
      availableLength: hit.availableLength,
      boundaryIndex: hit.boundaryIndex,
      direction: hit.direction,
      minimumAfter: paneResizeMinimumLength(direction: hit.direction)
        * CGFloat(hit.trackCount - hit.boundaryIndex),
      minimumBefore: paneResizeMinimumLength(direction: hit.direction) * CGFloat(hit.boundaryIndex),
      path: hit.path,
      startCoordinate: hit.direction == .horizontal ? point.x : point.y,
      startRatios: currentRatios
    )
    paneResizeCursor(for: hit.direction).set()
    return true
  }

  override func mouseDragged(with event: NSEvent) {
    guard continuePaneResize(with: event) else {
      super.mouseDragged(with: event)
      return
    }
  }

  @discardableResult
  private func continuePaneResize(with event: NSEvent) -> Bool {
    guard let drag = paneResizeDrag else {
      return false
    }

    let point = convert(event.locationInWindow, from: nil)
    paneResizeCursor(for: drag.direction).set()
    let coordinate = drag.direction == .horizontal ? point.x : point.y
    let delta = drag.direction == .horizontal
      ? coordinate - drag.startCoordinate
      : drag.startCoordinate - coordinate
    paneResizeRatiosByPath[drag.path] = resizePaneRatios(
      drag.startRatios,
      boundaryIndex: drag.boundaryIndex,
      delta: delta,
      availableLength: drag.availableLength,
      minimumBefore: drag.minimumBefore,
      minimumAfter: drag.minimumAfter)
    needsLayout = true
    layoutSubtreeIfNeeded()
    return true
  }

  override func mouseUp(with event: NSEvent) {
    if endPaneResize(with: event) {
      return
    }
    paneHeaderDrag = nil
    endPaneHeaderDragFeedback()
    super.mouseUp(with: event)
  }

  @discardableResult
  private func endPaneResize(with event: NSEvent) -> Bool {
    guard paneResizeDrag != nil else {
      return false
    }
    paneResizeDrag = nil
    let point = convert(event.locationInWindow, from: nil)
    paneResizeCursor(at: point)?.set()
    return true
  }

  /**
   CDXC:NativePaneReorder 2026-05-03-02:50
   Pane title bars contain AppKit controls, text fields, Ghostty surfaces, and
   WKWebViews that can consume mouse events before TerminalWorkspaceView sees
   them. A window-local monitor observes the same native event stream and starts
   header drags from the laid-out title-bar frames, while still letting normal
   button and text events continue through AppKit. Title-bar actions are also
   resolved here because native pane layers can keep the title-bar view itself
   from receiving button mouse events.
   */
  private func installPaneHeaderEventMonitor() {
    guard paneHeaderEventMonitor == nil else {
      return
    }
    paneHeaderEventMonitor = NSEvent.addLocalMonitorForEvents(
      matching: [.leftMouseDown, .leftMouseDragged, .leftMouseUp]
    ) { [weak self] event in
      guard let self, event.window === self.window else {
        return event
      }
      self.handlePaneHeaderMonitorEvent(event)
      return event
    }
  }

  private func uninstallPaneHeaderEventMonitor() {
    guard let paneHeaderEventMonitor else {
      return
    }
    NSEvent.removeMonitor(paneHeaderEventMonitor)
    self.paneHeaderEventMonitor = nil
  }

  private func handlePaneHeaderMonitorEvent(_ event: NSEvent) {
    switch event.type {
    case .leftMouseDown:
      let point = convert(event.locationInWindow, from: nil)
      if let titleBarAction = paneTitleBarAction(at: point) {
        /**
         CDXC:BrowserPanes 2026-05-03-11:06
         Browser-pane close uses the same AppKit title-bar buttons as T3 panes.
         The window-level header-drag monitor also tracks action presses
         because WKWebView and layer-backed title bars can keep the underlying
         NSButton from receiving a normal click. Recording the action here makes
         close reliable without turning title-bar button clicks into pane drags.
         */
        paneHeaderActionPress = titleBarAction
        return
      }
      guard paneResizeHit(at: point) == nil,
        let sessionId = paneTitleBarSessionId(at: point)
      else {
        return
      }
      handlePaneTitleBarMouseDown(
        event,
        sessionId: sessionId,
        focusReason: "nativeTitleBarMonitorMouseDown")
    case .leftMouseDragged:
      if paneHeaderActionPress != nil {
        return
      }
      /**
       CDXC:NativePaneResize 2026-05-03-06:11
       Active split resizing shares the same native mouse-drag stream as
       title-bar pane reordering. The resize cursor owns that stream until
       mouse-up, so the header monitor must not briefly restore the grab cursor
       while the pointer is on a transparent resize line.
       */
      if let resizeDrag = paneResizeDrag {
        paneResizeCursor(for: resizeDrag.direction).set()
        return
      }
      guard let sessionId = paneHeaderDrag?.sourceSessionId else {
        return
      }
      NSCursor.closedHand.set()
      handlePaneTitleBarMouseDragged(event, sessionId: sessionId)
    case .leftMouseUp:
      if let pressedAction = paneHeaderActionPress {
        paneHeaderActionPress = nil
        let point = convert(event.locationInWindow, from: nil)
        guard let releasedAction = paneTitleBarAction(at: point),
          releasedAction.sessionId == pressedAction.sessionId,
          releasedAction.action == pressedAction.action
        else {
          return
        }
        focusSession(sessionId: pressedAction.sessionId, reason: "nativeTitleBarMonitorAction")
        sendEvent(
          .terminalTitleBarAction(
            sessionId: pressedAction.sessionId,
            action: pressedAction.action))
        return
      }
      guard let sessionId = paneHeaderDrag?.sourceSessionId else {
        return
      }
      handlePaneTitleBarMouseUp(event, sessionId: sessionId)
    default:
      return
    }
  }

  private func paneResizeHit(at point: CGPoint) -> PaneResizeHit? {
    paneResizeHitRecord(at: point)?.hit
  }

  private func paneResizeHitRecord(at point: CGPoint) -> (index: Int, hit: PaneResizeHit)? {
    paneResizeHits.enumerated()
      .filter { $0.element.rect.contains(point) }
      .min { left, right in
        let leftDistance = paneResizeDistance(from: point, to: left.element)
        let rightDistance = paneResizeDistance(from: point, to: right.element)
        return leftDistance < rightDistance
      }
      .map { (index: $0.offset, hit: $0.element) }
  }

  private func paneResizeDistance(from point: CGPoint, to hit: PaneResizeHit) -> CGFloat {
    switch hit.direction {
    case .horizontal:
      abs(point.x - hit.rect.midX)
    case .vertical:
      abs(point.y - hit.rect.midY)
    }
  }

  private func paneResizeMinimumLength(direction: NativeTerminalLayout.SplitDirection) -> CGFloat {
    direction == .horizontal ? Self.paneResizeMinimumWidth : Self.paneResizeMinimumHeight
  }

  private func resizePaneRatios(
    _ ratios: [CGFloat],
    boundaryIndex: Int,
    delta: CGFloat,
    availableLength: CGFloat,
    minimumBefore: CGFloat,
    minimumAfter: CGFloat
  ) -> [CGFloat] {
    let ratioTotal = ratios.reduce(0, +)
    guard ratios.count > 1, boundaryIndex > 0, boundaryIndex < ratios.count, ratioTotal > 0,
      availableLength > minimumBefore + minimumAfter
    else {
      return ratios
    }
    let beforeRatio = ratios.prefix(boundaryIndex).reduce(0, +)
    let afterRatio = ratioTotal - beforeRatio
    guard beforeRatio > 0, afterRatio > 0 else { return ratios }
    let beforeLength = beforeRatio / ratioTotal * availableLength
    let nextBeforeLength = min(
      max(beforeLength + delta, minimumBefore),
      availableLength - minimumAfter)
    let nextBeforeRatio = nextBeforeLength / availableLength * ratioTotal
    let nextAfterRatio = ratioTotal - nextBeforeRatio
    let beforeScale = nextBeforeRatio / beforeRatio
    let afterScale = nextAfterRatio / afterRatio
    return ratios.enumerated().map { index, ratio in
      ratio * (index < boundaryIndex ? beforeScale : afterScale)
    }
  }

  private func equalizePaneResizeRatios(matching direction: NativeTerminalLayout.SplitDirection) {
    equalizePaneResizeRatios(in: terminalLayout, path: "root", matching: direction)
    needsLayout = true
    layoutSubtreeIfNeeded()
  }

  private func equalizePaneResizeRatios(
    in node: NativeTerminalLayout?,
    path: String,
    matching direction: NativeTerminalLayout.SplitDirection
  ) {
    guard let node else { return }
    switch node {
    case .leaf:
      return
    case .split(let splitDirection, _, let children):
      if splitDirection == direction {
        paneResizeRatiosByPath[path] = Array(repeating: 1, count: children.count)
      }
      for (index, child) in children.enumerated() {
        equalizePaneResizeRatios(in: child, path: "\(path).\(index)", matching: direction)
      }
    }
  }

  /**
   CDXC:NativePaneReorder 2026-05-02-17:33
   Native Ghostty and T3 panes are AppKit/WKWebView surfaces above the React
   workspace DOM, so pane header drag-to-reorder must be detected in AppKit and
   reported to the sidebar state owner. A short movement threshold preserves
   normal title-bar clicks for focus while drags swap the source pane with the
   pane under the release point.
   */
  private func handlePaneTitleBarMouseDown(
    _ event: NSEvent,
    sessionId: String,
    focusReason: String
  ) {
    focusSession(sessionId: sessionId, reason: focusReason)
    paneHeaderDrag = PaneHeaderDrag(
      isDragging: false,
      sourceSessionId: sessionId,
      startPoint: convert(event.locationInWindow, from: nil),
      targetSessionId: nil)
  }

  private func handlePaneTitleBarMouseDragged(_ event: NSEvent, sessionId: String) {
    guard var drag = paneHeaderDrag, drag.sourceSessionId == sessionId else {
      return
    }
    let point = convert(event.locationInWindow, from: nil)
    if !drag.isDragging,
      hypot(point.x - drag.startPoint.x, point.y - drag.startPoint.y)
        < Self.paneHeaderDragThreshold
    {
      return
    }
    if !drag.isDragging {
      drag.isDragging = true
      paneHeaderDrag = drag
      beginPaneHeaderDragFeedback(for: drag.sourceSessionId, at: point)
    }
    updatePaneHeaderDragFeedback(for: drag.sourceSessionId, at: point)
  }

  private func handlePaneTitleBarMouseUp(_ event: NSEvent, sessionId: String) {
    guard let drag = paneHeaderDrag, drag.sourceSessionId == sessionId else {
      return
    }
    paneHeaderDrag = nil
    endPaneHeaderDragFeedback()
    guard drag.isDragging else {
      return
    }
    let point = convert(event.locationInWindow, from: nil)
    guard let targetSessionId = paneSessionId(at: point), targetSessionId != drag.sourceSessionId
    else {
      return
    }
    sendEvent(
      .paneReorderRequested(
        sourceSessionId: drag.sourceSessionId,
        targetSessionId: targetSessionId))
  }

  /**
   CDXC:NativePaneReorder 2026-05-03-03:57
   Reordering panes needs immediate native feedback because AppKit/WKWebView
   pane surfaces do not show the React session-card drag affordances. While a
   title bar is dragged, show a compact header ghost capped at 230px and outline
   the pane that will receive the drop.
   */
  private func beginPaneHeaderDragFeedback(for sessionId: String, at point: CGPoint) {
    let ghostView = paneHeaderDragGhostView ?? TerminalPaneHeaderDragGhostView()
    paneHeaderDragGhostView = ghostView
    if ghostView.superview !== self {
      addSubview(ghostView)
    }
    ghostView.configure(
      title: paneHeaderDisplayTitle(for: sessionId),
      favicon: paneHeaderFavicon(for: sessionId),
      agentIconDataUrl: sessionAgentIconDataUrls[sessionId],
      agentIconColorHex: sessionAgentIconColors[sessionId],
      maxWidth: Self.paneHeaderDragGhostMaxWidth
    )
    ghostView.layer?.zPosition = 230
    ghostView.alphaValue = 0.92
    ghostView.isHidden = false
    NSCursor.closedHand.set()
    updatePaneHeaderDragFeedback(for: sessionId, at: point)
  }

  private func updatePaneHeaderDragFeedback(for sourceSessionId: String, at point: CGPoint) {
    NSCursor.closedHand.set()
    paneHeaderDragGhostView?.frame.origin = paneHeaderDragGhostOrigin(
      for: paneHeaderDragGhostView?.frame.size ?? .zero,
      cursorPoint: point)
    let targetSessionId = paneSessionId(at: point)
    updatePaneHeaderDropTarget(sourceSessionId: sourceSessionId, targetSessionId: targetSessionId)
    if var drag = paneHeaderDrag, drag.sourceSessionId == sourceSessionId {
      drag.targetSessionId = targetSessionId == sourceSessionId ? nil : targetSessionId
      paneHeaderDrag = drag
    }
  }

  private func endPaneHeaderDragFeedback() {
    let hadDragFeedback = paneHeaderDragGhostView != nil || paneHeaderDragTargetView != nil
    paneHeaderDragGhostView?.removeFromSuperview()
    paneHeaderDragGhostView = nil
    paneHeaderDragTargetView?.removeFromSuperview()
    paneHeaderDragTargetView = nil
    if hadDragFeedback {
      NSCursor.openHand.set()
    }
  }

  private func updatePaneHeaderDropTarget(sourceSessionId: String, targetSessionId: String?) {
    guard let targetSessionId, targetSessionId != sourceSessionId,
      let targetFrame = paneFrame(for: targetSessionId)
    else {
      paneHeaderDragTargetView?.removeFromSuperview()
      paneHeaderDragTargetView = nil
      return
    }
    let targetView = paneHeaderDragTargetView ?? TerminalPaneHeaderDragTargetView()
    paneHeaderDragTargetView = targetView
    if targetView.superview !== self {
      addSubview(targetView)
    }
    targetView.layer?.zPosition = 220
    targetView.frame = targetFrame.insetBy(dx: 2, dy: 2)
    targetView.isHidden = false
  }

  private func paneHeaderDragGhostOrigin(for size: CGSize, cursorPoint point: CGPoint) -> CGPoint {
    let margin: CGFloat = 8
    let hotSpot = CGPoint(x: 10, y: size.height / 2)
    let maxX = max(margin, bounds.width - size.width - margin)
    let maxY = max(margin, bounds.height - size.height - margin)
    return CGPoint(
      x: min(max(point.x - hotSpot.x, margin), maxX),
      y: min(max(point.y - hotSpot.y, margin), maxY)
    )
  }

  private func paneFrame(for sessionId: String) -> CGRect? {
    if let session = sessions[sessionId] {
      return session.borderView.frame
    }
    if let session = webPaneSessions[sessionId] {
      return session.borderView.frame
    }
    return nil
  }

  private func paneHeaderDisplayTitle(for sessionId: String) -> String {
    if let session = sessions[sessionId] {
      return session.titleBarView.displayTitle
    }
    if let session = webPaneSessions[sessionId] {
      return session.titleBarView.displayTitle
    }
    return normalizedTerminalSessionTitle(sessionTitles[sessionId], sessionId: sessionId)
  }

  private func paneHeaderFavicon(for sessionId: String) -> NSImage? {
    webPaneSessions[sessionId]?.titleBarView.displayFavicon
  }

  private func focusSession(sessionId: String, reason: String) {
    if sessions[sessionId] != nil {
      focusTerminal(sessionId: sessionId, reason: reason)
    } else if webPaneSessions[sessionId] != nil {
      focusWebPane(sessionId: sessionId, reason: reason)
    }
  }

  private func paneSessionId(at point: CGPoint) -> String? {
    for (sessionId, session) in sessions where activeSessionIds.contains(sessionId) {
      if session.borderView.frame.contains(point) {
        return sessionId
      }
    }
    for (sessionId, session) in webPaneSessions where activeSessionIds.contains(sessionId) {
      if session.borderView.frame.contains(point) {
        return sessionId
      }
    }
    return nil
  }

  private func paneTitleBarSessionId(at point: CGPoint) -> String? {
    for (sessionId, session) in sessions where activeSessionIds.contains(sessionId) {
      if paneTitleBarView(session.titleBarView, containsDraggablePoint: point) {
        return sessionId
      }
    }
    for (sessionId, session) in webPaneSessions where activeSessionIds.contains(sessionId) {
      if paneTitleBarView(session.titleBarView, containsDraggablePoint: point) {
        return sessionId
      }
    }
    return nil
  }

  private func paneTitleBarAction(at point: CGPoint) -> (
    sessionId: String, action: TerminalTitleBarAction
  )? {
    for (sessionId, session) in sessions where activeSessionIds.contains(sessionId) {
      guard session.titleBarView.frame.contains(point) else {
        continue
      }
      let titleBarPoint = convert(point, to: session.titleBarView)
      if let action = session.titleBarView.actionButtonAction(at: titleBarPoint) {
        return (sessionId, action)
      }
    }
    for (sessionId, session) in webPaneSessions where activeSessionIds.contains(sessionId) {
      guard session.titleBarView.frame.contains(point) else {
        continue
      }
      let titleBarPoint = convert(point, to: session.titleBarView)
      if let action = session.titleBarView.actionButtonAction(at: titleBarPoint) {
        return (sessionId, action)
      }
    }
    return nil
  }

  private func paneTitleBarView(
    _ titleBarView: TerminalSessionTitleBarView,
    containsDraggablePoint point: CGPoint
  ) -> Bool {
    guard titleBarView.frame.contains(point) else {
      return false
    }
    let titleBarPoint = convert(point, to: titleBarView)
    return titleBarView.isDraggableHeaderPoint(titleBarPoint)
  }

  private func setFrame(_ rect: CGRect, for sessionId: String) {
    if let webPane = webPaneSessions[sessionId] {
      setWebPaneFrame(rect, for: webPane)
      return
    }

    guard let session = sessions[sessionId] else {
      return
    }
    /**
     CDXC:NativeTerminals 2026-04-28-12:49
     Non-persistent native Ghostty panes must show the same per-session title
     bar that the reference workspace renders in React. The AppKit surface is
     therefore laid out below native chrome instead of covering the full pane.
     */
    let titleBarHeight = min(Self.terminalTitleBarHeight, max(rect.height, 0))
    let titleBarRect = CGRect(
      x: rect.minX,
      y: rect.maxY - titleBarHeight,
      width: rect.width,
      height: titleBarHeight
    )
    let availableTerminalRect = CGRect(
      x: rect.minX,
      y: rect.minY,
      width: rect.width,
      height: max(rect.height - titleBarHeight, 1)
    )
    /**
     CDXC:NativeTerminalResize 2026-05-02-17:19
     Pane chrome and the terminal renderer must share the same body width.
     Remove the previous whole-cell stepping here because it created visible
     chrome/body width drift and did not resolve the prior terminal resize bug.
     */
    let terminalRect = availableTerminalRect
    session.titleBarView.frame = titleBarRect
    session.titleBarView.needsLayout = true
    session.titleBarView.layoutSubtreeIfNeeded()
    session.scrollView.frame = availableTerminalRect
    session.scrollView.needsLayout = true
    session.scrollView.layoutSubtreeIfNeeded()
    session.searchBarView.frame = searchBarFrame(in: terminalRect)
    session.borderView.frame = rect
    logTerminalResizeIfNeeded(
      session: session,
      paneRect: rect,
      titleBarRect: titleBarRect,
      availableTerminalRect: availableTerminalRect,
      terminalRect: terminalRect)
    updateTerminalBorder(for: sessionId)
  }

  private func setWebPaneFrame(_ rect: CGRect, for session: WebPaneSession) {
    let resolvedRect: CGRect
    if rect.width <= 1 || rect.height <= Self.terminalTitleBarHeight + 1 {
      resolvedRect = layoutBounds(forVisibleCount: max(orderedVisibleSessionIds().count, 1))
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.layout.fallbackRect", [
        "inputRect": describeFrame(rect),
        "resolvedRect": describeFrame(resolvedRect),
        "sessionId": session.sessionId,
        "workspaceBounds": describeFrame(bounds),
      ])
    } else {
      resolvedRect = rect
    }
    let titleBarHeight = min(Self.terminalTitleBarHeight, max(resolvedRect.height, 0))
    let titleBarRect = CGRect(
      x: resolvedRect.minX,
      y: resolvedRect.maxY - titleBarHeight,
      width: resolvedRect.width,
      height: titleBarHeight
    )
    let contentRect = CGRect(
      x: resolvedRect.minX,
      y: resolvedRect.minY,
      width: resolvedRect.width,
      height: max(resolvedRect.height - titleBarHeight, 1)
    )
    session.titleBarView.frame = titleBarRect
    session.titleBarView.needsLayout = true
    session.titleBarView.layoutSubtreeIfNeeded()
    session.hostView.translatesAutoresizingMaskIntoConstraints = true
    session.hostView.frame = contentRect
    session.hostView.refreshHostedWebView(reason: "setWebPaneFrame")
    session.borderView.frame = resolvedRect
    if focusedSessionId == session.sessionId {
      orderWebPaneViewsToFront(session)
    }
    updateTerminalBorder(for: session.sessionId)
  }

  private func scheduleDeferredWebPaneLayout(sessionId: String?, reason: String) {
    guard let sessionId, webPaneSessions[sessionId] != nil else {
      return
    }
    DispatchQueue.main.async { [weak self] in
      guard let self, self.webPaneSessions[sessionId] != nil else {
        return
      }
      self.superview?.needsLayout = true
      self.superview?.layoutSubtreeIfNeeded()
      self.needsLayout = true
      self.layoutSubtreeIfNeeded()
      if let session = self.webPaneSessions[sessionId] {
        /**
         CDXC:T3Code 2026-05-01-14:10
         WKWebView panes can be created before the native workspace receives
         its final AppKit bounds. If split layout initially gives the web pane a
         zero rect, pin the pane host to the resolved workspace pane during the
         deferred layout pass so the web content is rendered as an inline pane,
         not an accessibility-only webview hidden behind the workspace layer.
         */
        if session.hostView.frame.width <= 1 || session.hostView.frame.height <= 1,
          self.bounds.width > 1, self.bounds.height > Self.terminalTitleBarHeight + 1
        {
          let rect = self.layoutBounds(
            forVisibleCount: max(self.orderedVisibleSessionIds().count, 1))
          NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.layout.deferredPin", [
            "hostFrame": self.describeFrame(session.hostView.frame),
            "reason": reason,
            "resolvedRect": self.describeFrame(rect),
            "sessionId": sessionId,
            "workspaceBounds": self.describeFrame(self.bounds),
          ])
          self.setWebPaneFrame(rect, for: session)
        }
        NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.layout.deferred", [
          "hostFrame": self.describeFrame(session.hostView.frame),
          "reason": reason,
          "sessionId": sessionId,
          "workspaceBounds": self.describeFrame(self.bounds),
        ])
        session.hostView.refreshHostedWebView(reason: "\(reason).deferred")
      }
    }
  }

  /**
   CDXC:T3Code 2026-04-30-19:17
   The T3 Code pane is a native WKWebView, not React DOM inside the sidebar.
   Keep the WebKit surface inside the pane host so it participates in split
   layout and z-order like a browser pane instead of floating over the app.
   */
  private func orderWebPaneViewsToFront(_ optionalSession: WebPaneSession?) {
    guard let session = optionalSession else {
      return
    }
    if session.hostView.superview !== self {
      session.hostView.removeFromSuperview()
      addSubview(session.hostView)
    }
    session.hostView.alphaValue = 1
    session.hostView.layer?.zPosition = 100
    if session.titleBarView.superview === self {
      session.titleBarView.removeFromSuperview()
    }
    addSubview(session.titleBarView)
    session.titleBarView.wantsLayer = true
    session.titleBarView.layer?.zPosition = 110
    if session.borderView.superview === self {
      session.borderView.removeFromSuperview()
    }
    addSubview(session.borderView)
    session.borderView.layer?.zPosition = 120
    bringPaneResizeHandleViewsToFront()
  }

  private func scheduleWebPaneReload(sessionId: String, url: URL, remainingAttempts: Int) {
    guard remainingAttempts > 0 else {
      return
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) { [weak self] in
      guard let self, let session = self.webPaneSessions[sessionId] else {
        return
      }
      guard !self.completedWebPaneLoadSessionIds.contains(sessionId) else {
        return
      }
      if session.webView.isLoading {
        NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.retry.waiting", [
          "remainingAttempts": remainingAttempts,
          "sessionId": sessionId,
          "url": url.absoluteString,
        ])
        self.scheduleWebPaneReload(
          sessionId: sessionId,
          url: url,
          remainingAttempts: remainingAttempts - 1
        )
        return
      }

      /**
       CDXC:T3Code 2026-04-30-03:47
       WKWebView keeps `url` populated after a provisional localhost failure,
       so retrying only when `webView.url == nil` strands T3 Code on a gray
       pane if the first load races provider startup. Retry until navigation
       actually finishes, then stop.
       */
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.retry", [
        "currentUrl": session.webView.url?.absoluteString ?? NSNull(),
        "remainingAttempts": remainingAttempts,
        "sessionId": sessionId,
        "url": url.absoluteString,
      ])
      self.loadWebPane(sessionId: sessionId, url: url, reason: "retry")
    }
  }

  private func loadWebPane(sessionId: String, url: URL, reason: String) {
    guard webPaneSessions[sessionId] != nil else {
      return
    }
    guard NativeT3RuntimeLauncher.isManagedRuntimeURL(url) else {
      guard let session = webPaneSessions[sessionId] else {
        return
      }
      /**
       CDXC:BrowserPanes 2026-05-02-06:35
       Non-T3 browser panes use the generic WKWebView loading path directly.
       The T3 authentication/thread-route bootstrap is intentionally gated to
       the managed localhost runtime so normal web URLs do not call T3-only APIs
       or emit T3 thread-ready events.
       */
      NativeT3CodePaneReproLog.append("nativeWorkspace.browserWebPane.load.start", [
        "cachePolicy": reason == "initial" ? "reloadIgnoringLocalCacheData" : "useProtocolCachePolicy",
        "reason": reason,
        "sessionId": sessionId,
        "url": url.absoluteString,
      ])
      session.webView.load(Self.browserPaneURLRequest(url: url, reason: reason))
      return
    }
    guard !pendingAuthenticatedWebPaneLoadSessionIds.contains(sessionId) else {
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.authPending", [
        "reason": reason,
        "sessionId": sessionId,
        "url": url.absoluteString,
      ])
      return
    }
    pendingAuthenticatedWebPaneLoadSessionIds.insert(sessionId)
    NativeT3RuntimeBrowserAuth.prepareManagedWebSession(for: url, sessionId: sessionId) {
      [weak self] in
      guard let self, let session = self.webPaneSessions[sessionId] else {
        return
      }
      self.pendingAuthenticatedWebPaneLoadSessionIds.remove(sessionId)
      self.completedWebPaneLoadSessionIds.remove(sessionId)
      NativeT3RuntimeSessionBootstrap.prepareThreadRoute(
        origin: url,
        projectId: session.projectId,
        sessionId: sessionId,
        threadId: session.threadId,
        title: session.title,
        workspaceRoot: session.workspaceRoot
      ) { [weak self] result in
        guard let self, let session = self.webPaneSessions[sessionId] else {
          return
        }
        switch result {
        case .success(let route):
          self.t3ThreadRouteRetryAttemptsBySessionId.removeValue(forKey: sessionId)
          self.sendEvent(
            .t3ThreadReady(
              sessionId: sessionId,
              projectId: route.projectId,
              threadId: route.threadId,
              serverOrigin: "\(url.scheme ?? "http")://\(url.host ?? "127.0.0.1")\(url.port.map { ":\($0)" } ?? "")",
              workspaceRoot: session.workspaceRoot ?? ""
            )
          )
          NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.start", [
            "reason": reason,
            "routeUrl": route.url.absoluteString,
            "sessionId": sessionId,
            "url": url.absoluteString,
            "workspaceRoot": session.workspaceRoot ?? NSNull(),
          ])
          session.webView.load(URLRequest(url: route.url))
          self.scheduleWebPaneReload(sessionId: sessionId, url: route.url, remainingAttempts: 16)
        case .failure(let error):
          NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.threadRouteFailed", [
            "error": error.localizedDescription,
            "reason": reason,
            "sessionId": sessionId,
            "url": url.absoluteString,
            "workspaceRoot": session.workspaceRoot ?? NSNull(),
          ])
          if self.retryT3ThreadRouteIfStartupIsStillSettling(
            sessionId: sessionId,
            url: url,
            error: error
          ) {
            return
          }
          self.loadWebPaneError(session: session, message: error.localizedDescription)
        }
      }
    }
  }

  private static func browserPaneURLRequest(url: URL, reason: String) -> URLRequest {
    /**
     CDXC:BrowserPanes 2026-05-03-02:18
     Browser panes set a Safari-compatible WebKit UA, but sites can still get a
     stale disk-cached document from an older bare-WKWebView UA on app restore.
     Bypass only the local cache for initial browser-pane navigations so the
     first visible load receives markup for the current UA; user reloads and
     in-page navigations keep normal browser cache semantics.
     */
    let cachePolicy: URLRequest.CachePolicy =
      reason == "initial" ? .reloadIgnoringLocalCacheData : .useProtocolCachePolicy
    return URLRequest(url: url, cachePolicy: cachePolicy, timeoutInterval: 60)
  }

  private func retryT3ThreadRouteIfStartupIsStillSettling(
    sessionId: String,
    url: URL,
    error: Error
  ) -> Bool {
    guard NativeT3RuntimeLauncher.isManagedRuntimeURL(url) else {
      return false
    }
    let message = error.localizedDescription
    guard Self.isTransientT3ThreadRouteError(message) else {
      return false
    }
    let attempt = (t3ThreadRouteRetryAttemptsBySessionId[sessionId] ?? 0) + 1
    guard attempt <= 80 else {
      t3ThreadRouteRetryAttemptsBySessionId.removeValue(forKey: sessionId)
      NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.threadRouteRetry.exhausted", [
        "attempt": attempt,
        "error": message,
        "sessionId": sessionId,
        "url": url.absoluteString,
      ])
      return false
    }
    t3ThreadRouteRetryAttemptsBySessionId[sessionId] = attempt
    /**
     CDXC:T3Code 2026-05-02-00:55
     The native T3 pane must not paint a permanent error while the forked
     desktop server is still warming its embed API surface. During startup the
     listener can return 404 for auth/environment endpoints before the same
     process becomes ready; retry route resolution so users see the T3 Code app
     once the real APIs are available instead of a blank or white pane.
     */
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.load.threadRouteRetry.scheduled", [
      "attempt": attempt,
      "error": message,
      "sessionId": sessionId,
      "url": url.absoluteString,
    ])
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard self?.webPaneSessions[sessionId] != nil else {
        return
      }
      self?.loadWebPane(sessionId: sessionId, url: url, reason: "threadRouteRetry")
    }
    return true
  }

  private static func isTransientT3ThreadRouteError(_ message: String) -> Bool {
    message.contains("Could not connect to the server")
      || message.contains("timed out")
      || message.contains("returned 404")
      || message.contains("returned 503")
  }

  private func loadWebPaneStatus(
    sessionId: String,
    title: String,
    message: String,
    caption: String?,
    loading: Bool,
    reason: String
  ) {
    guard let session = webPaneSessions[sessionId] else {
      return
    }
    /**
     CDXC:T3Code 2026-05-02-03:16
     Native T3 panes spend startup time authenticating and resolving the
     managed thread route before the real app URL can load. Show the same
     embedded-workspace loading surface as the webview implementation so users
     do not see an empty gray WKWebView while startup is still valid work.
     */
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.status.load", [
      "loading": loading,
      "message": message,
      "reason": reason,
      "sessionId": sessionId,
    ])
    session.webView.loadHTMLString(
      Self.t3WebPaneStatusHtml(title: title, message: message, caption: caption, loading: loading),
      baseURL: nil
    )
  }

  private static func t3WebPaneStatusHtml(
    title: String,
    message: String,
    caption: String?,
    loading: Bool
  ) -> String {
    let escapedTitle = escapeHtmlText(title.isEmpty ? "T3 Code" : title)
    let escapedMessage = escapeHtmlText(message)
    let escapedCaption = caption.map(escapeHtmlText)
    let spinnerHtml = loading ? #"<div class="spinner" aria-hidden="true"></div>"# : ""
    let captionHtml = escapedCaption.map { #"<div class="caption">\#($0)</div>"# } ?? ""

    return """
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>\(escapedTitle)</title>
          <style>
            html, body {
              background: #101722;
              color: #d8e1ee;
              font-family: ui-sans-serif, system-ui, sans-serif;
              height: 100%;
              margin: 0;
            }

            body {
              align-items: center;
              display: flex;
              justify-content: center;
              padding: 24px;
            }

            .status {
              align-items: center;
              color: #d8e1ee;
              display: flex;
              flex-direction: column;
              font-size: 14px;
              gap: 10px;
              letter-spacing: 0.02em;
              opacity: 0.86;
              text-align: center;
            }

            .spinner {
              animation: spin 0.9s linear infinite;
              border: 2px solid rgba(216, 225, 238, 0.18);
              border-radius: 999px;
              border-top-color: rgba(216, 225, 238, 0.95);
              height: 18px;
              width: 18px;
            }

            .caption {
              font-size: 12px;
              opacity: 0.66;
            }

            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="status">
            \(spinnerHtml)
            <div>\(escapedMessage)</div>
            \(captionHtml)
          </div>
        </body>
      </html>
      """
  }

  private func loadWebPaneError(session: WebPaneSession, message: String) {
    let escaped = Self.escapeHtmlText(message)
    session.webView.loadHTMLString(
      """
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; background: #1f1f1f; color: #f5f5f5; font: 13px -apple-system, BlinkMacSystemFont, sans-serif; }
            main { padding: 24px; }
            pre { white-space: pre-wrap; color: #ffb4ab; }
          </style>
        </head>
        <body><main><h1>T3 Code failed to open</h1><pre>\(escaped)</pre></main></body>
      </html>
      """,
      baseURL: nil
    )
  }

  private static func escapeHtmlText(_ value: String) -> String {
    value
      .replacingOccurrences(of: "&", with: "&amp;")
      .replacingOccurrences(of: "<", with: "&lt;")
      .replacingOccurrences(of: ">", with: "&gt;")
  }

  private func sessionId(for webView: WKWebView) -> String? {
    webPaneSessions.first { _, session in session.webView === webView }?.key
  }

  private func updateWebPanePageMetadata(for webView: WKWebView, reason: String) {
    guard let sessionId = sessionId(for: webView),
      let session = webPaneSessions[sessionId],
      !session.isManagedT3Pane
    else {
      return
    }

    let displayTitle = webPaneDisplayTitle(for: webView, fallbackTitle: session.title)
    session.titleBarView.setTitle(normalizedTerminalSessionTitle(displayTitle, sessionId: sessionId))
    sendEvent(.terminalTitleChanged(sessionId: sessionId, title: displayTitle))
    if let url = webView.url?.absoluteString, !url.isEmpty {
      /**
       CDXC:BrowserPanes 2026-05-03-03:41
       Browser pane restore must use the real committed WKWebView URL, not the
       initial local wrapper URL used to create the pane. Persist URL changes
       alongside title metadata so quitting and reopening zmux restores the
       same page the user was viewing.
       */
      sendEvent(.browserUrlChanged(sessionId: sessionId, url: url))
    }
    updateWebPaneFavicon(for: session, pageURL: webView.url, reason: reason)
    NativeT3CodePaneReproLog.append("nativeWorkspace.browserPane.metadata.updated", [
      "reason": reason,
      "sessionId": sessionId,
      "title": displayTitle,
      "url": webView.url?.absoluteString ?? NSNull(),
    ])
  }

  private func webPaneDisplayTitle(for webView: WKWebView, fallbackTitle: String) -> String {
    let title = webView.title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if !title.isEmpty {
      return title
    }
    if let host = webView.url?.host, !host.isEmpty {
      return host
    }
    let fallback = fallbackTitle.trimmingCharacters(in: .whitespacesAndNewlines)
    return fallback.isEmpty ? "Browser" : fallback
  }

  private func updateWebPaneFavicon(for session: WebPaneSession, pageURL: URL?, reason: String) {
    guard let pageURL,
      pageURL.scheme == "http" || pageURL.scheme == "https"
    else {
      session.titleBarView.setFavicon(nil)
      sendEvent(.browserFaviconChanged(sessionId: session.sessionId, faviconDataUrl: nil))
      return
    }

    let sessionId = session.sessionId
    let webView = session.webView
    webPaneFaviconTasksBySessionId.removeValue(forKey: sessionId)?.cancel()
    webPaneFaviconTasksBySessionId[sessionId] = Task { @MainActor in
      guard self.webPaneSessions[sessionId]?.webView === webView else { return }
      let faviconURL = await self.faviconURL(for: webView, pageURL: pageURL)
      guard !Task.isCancelled, let faviconURL else {
        session.titleBarView.setFavicon(nil)
        self.sendEvent(.browserFaviconChanged(sessionId: sessionId, faviconDataUrl: nil))
        return
      }
      do {
        let (data, response) = try await URLSession.shared.data(from: faviconURL)
        guard !Task.isCancelled,
          let image = NSImage(data: data),
          self.webPaneSessions[sessionId]?.webView.url?.host == pageURL.host
        else {
          return
        }
        session.titleBarView.setFavicon(image)
        let mimeType =
          (response as? HTTPURLResponse)?.mimeType
          ?? response.mimeType
          ?? Self.faviconMimeType(for: faviconURL)
        /**
         CDXC:BrowserPanes 2026-05-03-11:28
         The sidebar browser card should show the same tab favicon as the
         native browser pane title bar. Send the resolved favicon as a data URL
         so React can render it without re-fetching from the page origin, and
         so the browser session can persist the icon for app restore.
         */
        self.sendEvent(
          .browserFaviconChanged(
            sessionId: sessionId,
            faviconDataUrl: Self.dataUrl(for: data, mimeType: mimeType)))
        NativeT3CodePaneReproLog.append("nativeWorkspace.browserPane.favicon.updated", [
          "faviconUrl": faviconURL.absoluteString,
          "reason": reason,
          "sessionId": sessionId,
        ])
      } catch {
        session.titleBarView.setFavicon(nil)
        self.sendEvent(.browserFaviconChanged(sessionId: sessionId, faviconDataUrl: nil))
        NativeT3CodePaneReproLog.append("nativeWorkspace.browserPane.favicon.failed", [
          "error": error.localizedDescription,
          "faviconUrl": faviconURL.absoluteString,
          "reason": reason,
          "sessionId": sessionId,
        ])
      }
    }
  }

  private func faviconURL(for webView: WKWebView, pageURL: URL) async -> URL? {
    let script = """
      (() => {
        const links = Array.from(document.querySelectorAll('link[rel]'));
        const icon = links.find((link) => /(^|\\s)(icon|shortcut icon|apple-touch-icon|mask-icon)(\\s|$)/i.test(link.rel || ''));
        return icon?.href || '';
      })()
      """
    if let href = try? await webView.evaluateJavaScript(script) as? String,
      let resolved = resolvedFaviconURL(href: href, pageURL: pageURL)
    {
      return resolved
    }
    return fallbackFaviconURL(for: pageURL)
  }

  private func resolvedFaviconURL(href: String, pageURL: URL) -> URL? {
    let trimmedHref = href.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedHref.isEmpty else {
      return nil
    }
    return URL(string: trimmedHref, relativeTo: pageURL)?.absoluteURL
  }

  private func fallbackFaviconURL(for pageURL: URL) -> URL? {
    guard let scheme = pageURL.scheme,
      scheme == "http" || scheme == "https",
      let host = pageURL.host
    else {
      return nil
    }
    var components = URLComponents()
    components.scheme = scheme
    components.host = host
    components.port = pageURL.port
    components.path = "/favicon.ico"
    return components.url
  }

  private static func dataUrl(for data: Data, mimeType: String?) -> String {
    "data:\(mimeType ?? "image/png");base64,\(data.base64EncodedString())"
  }

  private static func faviconMimeType(for url: URL) -> String {
    switch url.pathExtension.lowercased() {
    case "ico":
      return "image/x-icon"
    case "svg":
      return "image/svg+xml"
    case "jpg", "jpeg":
      return "image/jpeg"
    case "webp":
      return "image/webp"
    default:
      return "image/png"
    }
  }

  /**
   CDXC:T3Code 2026-04-30-15:42
   Native T3 panes must install the same desktop bridge contract before the T3
   bundle runs. Directly loading `/{projectId}/{threadId}` without this bridge
   leaves the React route waiting for environment bootstrap and the pane remains
   on the gray boot shell even though WK navigation finishes successfully.
   */
  private static func t3WebPaneBridgeScript(
    sessionId: String, title: String, workspaceRoot: String?
  ) -> String {
    let encodedSessionId = javascriptStringLiteral(sessionId)
    let encodedTitle = javascriptStringLiteral(title.isEmpty ? "T3 Code" : title)
    let encodedWorkspaceRoot = javascriptStringLiteral(workspaceRoot ?? "")
    return """
      (() => {
        const isManagedT3Origin = () => {
          try {
            return location.protocol === "http:" &&
              (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
              location.port === "3774";
          } catch {
            return false;
          }
        };
        if (!isManagedT3Origin()) {
          return;
        }
        const sessionId = \(encodedSessionId);
        const sessionTitle = \(encodedTitle);
        const workspaceRoot = \(encodedWorkspaceRoot);
        const handler = window.webkit?.messageHandlers?.\(T3CodePaneDiagnosticsBridge.messageHandlerName);
        const threadIdFromPath = () => {
          const parts = location.pathname.split("/").filter(Boolean);
          return parts.length >= 2 ? parts[1] : "";
        };
        const wsUrl = () => `${location.origin.replace(/^http/i, "ws")}/ws`;
        const currentThreadId = () => threadIdFromPath();
        let lastReportedThreadId = "";
        let lastReportedThreadTitle = "";
        const normalizeThreadTitle = (value) =>
          typeof value === "string" ? value.replace(/\\s+/g, " ").trim() : "";
        const isUsableThreadTitle = (value) => {
          const title = normalizeThreadTitle(value);
          if (!title) {
            return false;
          }
          const lower = title.toLowerCase();
          return lower !== "t3 code" &&
            lower !== "t3 code (alpha)" &&
            lower !== "no active thread" &&
            lower !== "pick a thread to continue";
        };
        const visibleThreadTitle = () => {
          const candidates = [
            window.__VSMUX_T3_ACTIVE_THREAD_TITLE__,
            document.querySelector("header h2[title]")?.getAttribute("title"),
            document.querySelector("header h2")?.textContent,
            document.querySelector("header [title]")?.getAttribute("title")
          ];
          for (const candidate of candidates) {
            if (isUsableThreadTitle(candidate)) {
              return normalizeThreadTitle(candidate);
            }
          }
          return "";
        };
        const reportThreadChange = (payload, reason) => {
          const threadId = String(payload?.threadId || "").trim();
          const title =
            (isUsableThreadTitle(payload?.title) ? normalizeThreadTitle(payload?.title) : "") ||
            visibleThreadTitle() ||
            String(document.title || "");
          const normalizedTitle = normalizeThreadTitle(title);
          if (
            !threadId ||
            (threadId === lastReportedThreadId && normalizedTitle === lastReportedThreadTitle)
          ) {
            return;
          }
          lastReportedThreadId = threadId;
          lastReportedThreadTitle = normalizedTitle;
          try {
            handler?.postMessage({
              href: String(location.href || ""),
              reason,
              threadId,
              title,
              type: "thread-changed"
            });
          } catch {}
        };
        /**
         * CDXC:T3Code 2026-05-04-03:06
         * The embedded T3 app performs client-side thread navigation, so native
         * zmux must observe route changes inside the WKWebView and let the
         * sidebar preserve one zmux card per T3 thread instead of silently
         * rebinding the currently visible card.
         *
         * CDXC:T3Code 2026-05-04-04:03
         * T3's own sidebar emits `vsmuxT3ThreadChanged` via postMessage when a
         * user clicks another thread. WKWebView hosts the app as the top-level
         * page, so the bridge listens for that same-window message in addition
         * to URL/history changes; sidebar-thread clicks must create/focus a
         * sibling zmux card just like route changes.
         *
         * CDXC:T3Code 2026-05-04-04:41
         * Thread titles can arrive after the route/thread id event. De-dupe by
         * thread id plus normalized title so later same-thread title updates
         * still reach the sidebar card title sync path.
         *
         * CDXC:T3Code 2026-05-04-06:23
         * The title shown in the T3 header is the user-facing thread title. Use
         * T3's `__VSMUX_T3_ACTIVE_THREAD_TITLE__` bridge value and the visible
         * header `<h2>` as title sources because `document.title` remains the
         * generic app label and early postMessage payloads may omit the title.
         */
        const reportActiveThread = (reason) => {
          const threadId = currentThreadId();
          reportThreadChange({ threadId, title: document.title }, reason);
        };
        window.addEventListener("message", (event) => {
          const data = event?.data;
          if (!data || typeof data !== "object" || data.type !== "vsmuxT3ThreadChanged") {
            return;
          }
          reportThreadChange(data, "vsmux-message");
        });
        const wrapHistoryMethod = (method) => {
          const original = history[method];
          if (typeof original !== "function") {
            return;
          }
          history[method] = function(...args) {
            const result = original.apply(this, args);
            setTimeout(() => reportActiveThread(method), 0);
            return result;
          };
        };
        wrapHistoryMethod("pushState");
        wrapHistoryMethod("replaceState");
        window.addEventListener("popstate", () => setTimeout(() => reportActiveThread("popstate"), 0));
        window.addEventListener("hashchange", () => setTimeout(() => reportActiveThread("hashchange"), 0));
        setTimeout(() => reportActiveThread("bootstrap"), 0);
        setInterval(() => reportActiveThread("poll"), 1000);
        window.__VSMUX_T3_ACTIVE_THREAD_ID__ = currentThreadId();
        window.__VSMUX_T3_COMPOSER_FOCUS_ENABLED__ = false;
        window.__VSMUX_T3_BOOTSTRAP__ = {
          embedMode: "vsmux-mobile",
          httpOrigin: location.origin,
          sessionId,
          threadId: currentThreadId(),
          workspaceRoot,
          wsUrl: wsUrl()
        };
        const serverExposureState = {
          advertisedHost: null,
          endpointUrl: null,
          mode: "local-only"
        };
        const updateState = {
          canRetry: false,
          checkedAt: null,
          checkedVersion: null,
          downloadPercent: null,
          downloadedVersion: null,
          errorContext: null,
          message: null,
          phase: "idle"
        };
        window.desktopBridge = {
          browser: {
            close: async () => null,
            closeTab: async () => null,
            getState: async (input) => ({
              activeTabId: null,
              lastError: null,
              open: false,
              tabs: [],
              threadId: input?.threadId ?? currentThreadId()
            }),
            goBack: async () => null,
            goForward: async () => null,
            hide: async () => undefined,
            navigate: async () => null,
            newTab: async () => null,
            onState: () => () => undefined,
            open: async () => null,
            openDevTools: async () => undefined,
            reload: async () => null,
            selectTab: async () => null,
            setPanelBounds: async () => null
          },
          confirm: async (message) => window.confirm(String(message)),
          getClientSettings: async () => null,
          getLocalEnvironmentBootstrap: () => ({
            bootstrapToken: "",
            httpBaseUrl: location.origin,
            label: sessionTitle || "T3 Code",
            wsBaseUrl: wsUrl()
          }),
          getWsUrl: () => wsUrl(),
          getSavedEnvironmentRegistry: async () => [],
          getSavedEnvironmentSecret: async () => null,
          getServerExposureState: async () => serverExposureState,
          notifications: {
            isSupported: async () => false,
            show: async () => false
          },
          getUpdateState: async () => updateState,
          installUpdate: async () => ({ accepted: false, completed: false, state: updateState }),
          checkForUpdate: async () => ({ checked: false, state: updateState }),
          downloadUpdate: async () => ({ accepted: false, completed: false, state: updateState }),
          onMenuAction: () => () => undefined,
          onUpdateState: () => () => undefined,
          openExternal: async (url) => {
            try {
              window.open(String(url), "_blank", "noopener,noreferrer");
              return true;
            } catch {
              return false;
            }
          },
          pickFolder: async () => null,
          removeSavedEnvironmentSecret: async () => undefined,
          setClientSettings: async () => undefined,
          setSavedEnvironmentRegistry: async () => undefined,
          setSavedEnvironmentSecret: async () => false,
          setServerExposureMode: async () => serverExposureState,
          setTheme: async () => undefined,
          showContextMenu: async () => null
        };
      })();
      """
  }

  private static func javascriptStringLiteral(_ value: String) -> String {
    guard let data = try? JSONSerialization.data(withJSONObject: [value], options: []),
      let json = String(data: data, encoding: .utf8),
      json.hasPrefix("["),
      json.hasSuffix("]")
    else {
      return "\"\""
    }
    return String(json.dropFirst().dropLast())
  }

  private static let t3WebPaneDiagnosticsScript = """
    (() => {
      const handler = window.webkit?.messageHandlers?.\(T3CodePaneDiagnosticsBridge.messageHandlerName);
      if (!handler) {
        return;
      }
      const summarize = (value) => {
        try {
          if (value instanceof Error) {
            return value.stack || value.message || String(value);
          }
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(value);
          }
          return String(value);
        } catch {
          return String(value);
        }
      };
      const post = (payload) => {
        try {
          handler.postMessage({
            href: String(location.href || ""),
            readyState: String(document.readyState || ""),
            timestamp: new Date().toISOString(),
            ...payload
          });
        } catch {}
      };
      window.addEventListener("error", (event) => {
        const target = event.target;
        const isResourceError = target && target !== window;
        post({
          column: event.colno || 0,
          line: event.lineno || 0,
          message: String(event.message || ""),
          resourceHref: isResourceError ? String(target.src || target.href || "") : "",
          source: String(event.filename || ""),
          stack: event.error && event.error.stack ? String(event.error.stack) : "",
          type: isResourceError ? "resource-error" : "error"
        });
      }, true);
      window.addEventListener("unhandledrejection", (event) => {
        post({
          message: summarize(event.reason),
          stack: event.reason && event.reason.stack ? String(event.reason.stack) : "",
          type: "unhandledrejection"
        });
      });
      for (const method of ["error", "warn"]) {
        const original = console[method]?.bind(console);
        console[method] = (...args) => {
          post({ message: args.map(summarize).join(" "), type: `console.${method}` });
          original?.(...args);
        };
      }
      post({ type: "diagnostics-ready" });
    })();
    """

  private func searchBarFrame(in terminalRect: CGRect) -> CGRect {
    let width = min(CGFloat(300), max(terminalRect.width - 16, 180))
    let height = CGFloat(34)
    return CGRect(
      x: terminalRect.maxX - width - 8,
      y: terminalRect.maxY - height - 8,
      width: width,
      height: height
    )
  }

  private func logTerminalResizeIfNeeded(
    session: TerminalSession,
    paneRect: CGRect,
    titleBarRect: CGRect,
    availableTerminalRect: CGRect,
    terminalRect: CGRect
  ) {
    /**
     CDXC:NativeTerminalResize 2026-04-29-02:22
     Narrow-pane Claude Code rendering regressions need geometry diagnostics
     from every native resize layer. Log only changed signatures so PTY size,
     Ghostty surface size, scroll content size, and visible pane dimensions can
     be compared without flooding the app log during no-op layout passes.
     */
    let nestedScrollView = firstNestedScrollView(in: session.scrollView)
    let publishedSurfaceSize = session.view.surfaceSize
    let surfaceSize = session.view.surface.map { ghostty_surface_size($0) } ?? publishedSurfaceSize
    let surfacePadding = session.view.surface.map { ghostty_surface_padding($0) }
    let cellSize = session.view.cellSize
    let estimatedColumns =
      cellSize.width > 0 ? Int(floor(terminalRect.width / cellSize.width)) : nil
    let estimatedRows =
      cellSize.height > 0 ? Int(floor(terminalRect.height / cellSize.height)) : nil
    /**
     CDXC:NativeTerminalResize 2026-04-29-07:50
     Claude Code/Ink rerenders from the PTY rows and columns that Ghostty
     reports after subtracting terminal padding. Log synchronous core size,
     published AppKit size, backing-pixel metrics, actual Ghostty padding, and
     residual non-grid space so resize bugs can distinguish stale Swift state
     from Ghostty grid math.
     */
    let coreSurfaceSize = surfaceSize.map { size in
      session.view.convertFromBacking(
        NSSize(width: Double(size.width_px), height: Double(size.height_px)))
    }
    let inferredHorizontalPaddingPx = surfaceSize.map {
      Int($0.width_px) - Int($0.columns) * Int($0.cell_width_px)
    }
    let inferredVerticalPaddingPx = surfaceSize.map {
      Int($0.height_px) - Int($0.rows) * Int($0.cell_height_px)
    }
    let inferredPadding = inferredPaddingPoints(
      view: session.view,
      horizontalPx: inferredHorizontalPaddingPx,
      verticalPx: inferredVerticalPaddingPx)
    let actualPadding = actualPaddingPoints(view: session.view, padding: surfacePadding)
    let paddingAwareEstimatedColumns = paddingAwareEstimatedCellCount(
      available: terminalRect.width,
      padding: actualPadding?.width,
      cell: cellSize.width)
    let paddingAwareEstimatedRows = paddingAwareEstimatedCellCount(
      available: terminalRect.height,
      padding: actualPadding?.height,
      cell: cellSize.height)
    let signature = [
      roundedSignature(paneRect.size.width),
      roundedSignature(paneRect.size.height),
      roundedSignature(terminalRect.size.width),
      roundedSignature(terminalRect.size.height),
      roundedSignature(session.scrollView.bounds.size.width),
      roundedSignature(session.scrollView.bounds.size.height),
      roundedSignature(session.view.frame.size.width),
      roundedSignature(session.view.frame.size.height),
      String(surfaceSize?.columns ?? 0),
      String(surfaceSize?.rows ?? 0),
      String(estimatedColumns ?? 0),
      String(estimatedRows ?? 0),
      String(paddingAwareEstimatedColumns ?? 0),
      String(paddingAwareEstimatedRows ?? 0),
      String(surfaceSize?.width_px ?? 0),
      String(surfaceSize?.height_px ?? 0),
    ].joined(separator: "x")
    if resizeLogSignatureBySessionId[session.sessionId] == signature {
      return
    }
    resizeLogSignatureBySessionId[session.sessionId] = signature
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.terminalResize",
      details: [
        "cellSize": describeSize(cellSize),
        "coreSurfaceSizeLogical": coreSurfaceSize.map { describeSize($0) } ?? NSNull(),
        "coreSurfaceSizePixels": surfaceSize.map {
          ["height": Int($0.height_px), "width": Int($0.width_px)]
        } ?? NSNull(),
        "coreSurfaceCellSizePixels": surfaceSize.map {
          ["height": Int($0.cell_height_px), "width": Int($0.cell_width_px)]
        } ?? NSNull(),
        "coreSurfaceGridSizePixels": surfaceSize.map {
          [
            "height": Int($0.rows) * Int($0.cell_height_px),
            "width": Int($0.columns) * Int($0.cell_width_px),
          ]
        } ?? NSNull(),
        "estimatedColumns": nullableInt(estimatedColumns),
        "estimatedRows": nullableInt(estimatedRows),
        "focusedSessionId": nullableString(focusedSessionId),
        "inferredPaddingPixels": inferredHorizontalPaddingPx.map { horizontal in
          [
            "horizontal": horizontal,
            "vertical": inferredVerticalPaddingPx ?? 0,
          ]
        } ?? NSNull(),
        "inferredPaddingPoints": inferredPadding.map { describeSize($0) } ?? NSNull(),
        "surfacePaddingPixels": surfacePadding.map {
          [
            "bottom": Int($0.bottom_px),
            "left": Int($0.left_px),
            "right": Int($0.right_px),
            "top": Int($0.top_px),
          ]
        } ?? NSNull(),
        "surfacePaddingPoints": actualPadding.map { describeSize($0) } ?? NSNull(),
        "nestedScrollContentSize": nestedScrollView.map { describeSize($0.contentSize) }
          ?? NSNull(),
        "nestedScrollDocumentVisibleRect": nestedScrollView.map {
          describeFrame($0.contentView.documentVisibleRect)
        } ?? NSNull(),
        "paneGap": Double(paneGap),
        "paneRect": describeFrame(paneRect),
        "paddingAwareEstimatedColumns": nullableInt(paddingAwareEstimatedColumns),
        "paddingAwareEstimatedRows": nullableInt(paddingAwareEstimatedRows),
        "publishedSurfaceSizeColumns": publishedSurfaceSize.map { Int($0.columns) } ?? NSNull(),
        "publishedSurfaceSizeRows": publishedSurfaceSize.map { Int($0.rows) } ?? NSNull(),
        "rawTerminalRect": describeFrame(availableTerminalRect),
        "scrollViewBounds": describeFrame(session.scrollView.bounds),
        "scrollViewFrame": describeFrame(session.scrollView.frame),
        "sessionId": session.sessionId,
        "surfaceFrame": describeFrame(session.view.frame),
        "surfaceSizeColumns": surfaceSize.map { Int($0.columns) } ?? NSNull(),
        "surfaceSizeRows": surfaceSize.map { Int($0.rows) } ?? NSNull(),
        "terminalRect": describeFrame(terminalRect),
        "titleBarRect": describeFrame(titleBarRect),
        "visibleSessionIds": orderedVisibleSessionIds(),
      ])
  }

  private func inferredPaddingPoints(
    view: NSView,
    horizontalPx: Int?,
    verticalPx: Int?
  ) -> NSSize? {
    guard let horizontalPx, let verticalPx else {
      return nil
    }
    let backingSize = NSSize(width: Double(horizontalPx), height: Double(verticalPx))
    return view.convertFromBacking(backingSize)
  }

  private func actualPaddingPoints(
    view: NSView,
    padding: ghostty_surface_padding_s?
  ) -> NSSize? {
    guard let padding else {
      return nil
    }
    let backingSize = NSSize(
      width: Double(padding.left_px + padding.right_px),
      height: Double(padding.top_px + padding.bottom_px))
    return view.convertFromBacking(backingSize)
  }

  private func paddingAwareEstimatedCellCount(
    available: CGFloat,
    padding: CGFloat?,
    cell: CGFloat
  ) -> Int? {
    guard let padding, cell > 0 else {
      return nil
    }
    return Int(floor(max(available - padding, 0) / cell))
  }

  private func firstNestedScrollView(in view: NSView) -> NSScrollView? {
    if let scrollView = view as? NSScrollView {
      return scrollView
    }
    for subview in view.subviews {
      if let scrollView = firstNestedScrollView(in: subview) {
        return scrollView
      }
    }
    return nil
  }

  private func roundedSignature(_ value: CGFloat) -> String {
    String(Int(value.rounded()))
  }

  private func moveOffscreen(_ view: NSView) {
    let size =
      view.frame.size.width > 1 && view.frame.size.height > 1
      ? view.frame.size
      : bounds.size
    view.frame = CGRect(
      x: bounds.maxX + 10_000,
      y: bounds.maxY + 10_000,
      width: max(size.width, 1),
      height: max(size.height, 1)
    )
  }

  private func updateAllTerminalBorders() {
    for sessionId in sessions.keys {
      updateTerminalBorder(for: sessionId)
    }
    for sessionId in webPaneSessions.keys {
      updateTerminalBorder(for: sessionId)
    }
  }

  private func updateTerminalBorder(for sessionId: String) {
    if let session = webPaneSessions[sessionId] {
      let isActive = activeSessionIds.contains(sessionId)
      session.hostView.isHidden = !isActive
      session.titleBarView.isHidden = !isActive
      session.borderView.isHidden = !isActive
      session.titleBarView.setState(activity: sessionActivities[sessionId])
      session.borderView.setState(
        isFocused: focusedSessionId == sessionId,
        isAttention: attentionSessionIds.contains(sessionId)
      )
      return
    }

    guard let session = sessions[sessionId] else {
      return
    }
    let isActive = activeSessionIds.contains(sessionId)
    session.titleBarView.isHidden = !isActive
    session.searchBarView.isHidden = !isActive || session.view.searchState == nil
    session.borderView.isHidden = !isActive
    session.titleBarView.setState(
      activity: sessionActivities[sessionId]
    )
    session.borderView.setState(
      isFocused: focusedSessionId == sessionId,
      isAttention: attentionSessionIds.contains(sessionId)
    )
  }

  private func responderSnapshot() -> [String: Any] {
    guard let responder = window?.firstResponder else {
      return [
        "className": "nil",
        "sessionId": NSNull(),
      ]
    }
    return [
      "className": String(describing: type(of: responder)),
      "sessionId": nullableString(sessionId(containing: responder)),
    ]
  }

  private func shouldPreserveNonTerminalFirstResponder() -> Bool {
    guard let responder = window?.firstResponder else {
      return false
    }
    return sessionId(containing: responder) == nil
  }

  private func sessionId(containing responder: NSResponder) -> String? {
    guard let responderView = responder as? NSView else {
      return sessions.first { _, session in responder === session.view }?.key
    }
    for (sessionId, session) in sessions {
      if responderView === session.view || responderView.isDescendant(of: session.view) {
        return sessionId
      }
    }
    for (sessionId, session) in webPaneSessions {
      if responderView === session.hostView || responderView.isDescendant(of: session.hostView)
        || responderView === session.webView || responderView.isDescendant(of: session.webView)
      {
        return sessionId
      }
    }
    return nil
  }

  private func emitFocusedSessionIfNeeded(for responder: NSResponder, reason: String) {
    /**
     CDXC:NativeTerminalFocus 2026-04-26-22:22
     Only user/AppKit-originated first-responder changes should update the
     sidebar focus store. Programmatic focus calls from setActiveTerminalSet
     already came from sidebar state; echoing them back creates a feedback
     loop where each layout sync can make another pane active.
     */
    guard let focusedSessionId = sessionId(containing: responder) else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.focusedResponderIgnored",
        details: [
          "reason": reason,
          "responder": String(describing: type(of: responder)),
        ])
      return
    }
    guard activeSessionIds.contains(focusedSessionId) else {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.focusedInactiveSessionIgnored",
        details: [
          "activeSessionIds": Array(activeSessionIds).sorted(),
          "reason": reason,
          "sessionId": focusedSessionId,
        ])
      return
    }
    if lastEmittedFocusedSessionId == focusedSessionId {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.terminalFocused.duplicateSkipped",
        details: [
          "reason": reason,
          "sessionId": focusedSessionId,
        ])
      return
    }
    lastEmittedFocusedSessionId = focusedSessionId
    self.focusedSessionId = focusedSessionId
    updateAllTerminalBorders()
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.terminalFocused.emitted",
      details: [
        "reason": reason,
        "sessionId": focusedSessionId,
      ])
    sendEvent(.terminalFocused(sessionId: focusedSessionId))
  }

  private func describeFrame(_ frame: CGRect) -> [String: Double] {
    [
      "height": Double(frame.height),
      "maxX": Double(frame.maxX),
      "maxY": Double(frame.maxY),
      "minX": Double(frame.minX),
      "minY": Double(frame.minY),
      "width": Double(frame.width),
    ]
  }

  private func describeSize(_ size: CGSize) -> [String: Double] {
    [
      "height": Double(size.height),
      "width": Double(size.width),
    ]
  }

  private func summarizeTerminalText(_ text: String) -> String {
    String(
      text.replacingOccurrences(of: "\r", with: "\\r")
        .replacingOccurrences(of: "\n", with: "\\n")
        .prefix(160))
  }

  private func nullableString(_ value: String?) -> Any {
    value ?? NSNull()
  }

  private func nullableInt(_ value: Int?) -> Any {
    value ?? NSNull()
  }

  private static func clampedPaneGap(_ value: Double?) -> CGFloat {
    guard let value, value.isFinite else {
      return defaultPaneGap
    }
    return CGFloat(min(48, max(0, value)))
  }

  private static func workspaceBackgroundColor(_ value: String?) -> NSColor {
    guard let color = parseHexColor(value?.trimmingCharacters(in: .whitespacesAndNewlines)) else {
      return defaultWorkspaceBackgroundColor
    }
    return color
  }

  private static func parseHexColor(_ value: String?) -> NSColor? {
    guard let value else {
      return nil
    }
    let pattern = #"^#?([0-9a-fA-F]{6})$"#
    guard
      let match = value.range(of: pattern, options: .regularExpression),
      match == value.startIndex..<value.endIndex
    else {
      return nil
    }
    let hex = value.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    guard let rawValue = Int(hex, radix: 16) else {
      return nil
    }
    return NSColor(
      calibratedRed: CGFloat((rawValue >> 16) & 0xff) / 255,
      green: CGFloat((rawValue >> 8) & 0xff) / 255,
      blue: CGFloat(rawValue & 0xff) / 255,
      alpha: 1
    )
  }

  private func startExitPollingIfNeeded() {
    guard exitPollTimer == nil else { return }
    exitPollTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
      MainActor.assumeIsolated {
        self?.pollExitedSurfaces()
      }
    }
  }

  private func stopExitPollingIfIdle() {
    if sessions.isEmpty {
      exitPollTimer?.invalidate()
      exitPollTimer = nil
    }
  }

  private func pollExitedSurfaces() {
    let exitedSessionIds = sessions.compactMap { sessionId, session in
      session.view.processExited ? sessionId : nil
    }
    for sessionId in exitedSessionIds {
      closeTerminal(sessionId: sessionId)
    }
  }

  private func leafSessionIds(_ node: NativeTerminalLayout) -> [String] {
    switch node {
    case .leaf(let sessionId):
      return [sessionId]
    case .split(_, _, let children):
      return children.flatMap(leafSessionIds)
    }
  }

  private func prunedLayout(removing sessionId: String, from node: NativeTerminalLayout?)
    -> NativeTerminalLayout?
  {
    guard let node else { return nil }
    switch node {
    case .leaf(let existingSessionId):
      return existingSessionId == sessionId ? nil : node
    case .split(let direction, let ratio, let children):
      let nextChildren = children.compactMap { prunedLayout(removing: sessionId, from: $0) }
      if nextChildren.count == 1 {
        return nextChildren[0]
      }
      return nextChildren.isEmpty
        ? nil : .split(direction: direction, ratio: ratio, children: nextChildren)
    }
  }
}

extension TerminalWorkspaceView: WKNavigationDelegate {
  func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
    if let sessionId = sessionId(for: webView) {
      completedWebPaneLoadSessionIds.remove(sessionId)
    }
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.navigation.start", [
      "sessionId": sessionId(for: webView) ?? NSNull(),
      "url": webView.url?.absoluteString ?? NSNull(),
    ])
  }

  func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.navigation.commit", [
      "sessionId": sessionId(for: webView) ?? NSNull(),
      "url": webView.url?.absoluteString ?? NSNull(),
    ])
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    let sessionId = sessionId(for: webView)
    if let sessionId {
      completedWebPaneLoadSessionIds.insert(sessionId)
    }
    updateWebPanePageMetadata(for: webView, reason: "navigationFinish")
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.navigation.finish", [
      "sessionId": sessionId ?? NSNull(),
      "title": webView.title ?? NSNull(),
      "url": webView.url?.absoluteString ?? NSNull(),
    ])
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    if let sessionId = sessionId(for: webView) {
      completedWebPaneLoadSessionIds.remove(sessionId)
    }
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.navigation.fail", [
      "error": error.localizedDescription,
      "errorCode": (error as NSError).code,
      "errorDomain": (error as NSError).domain,
      "sessionId": sessionId(for: webView) ?? NSNull(),
      "url": webView.url?.absoluteString ?? NSNull(),
    ])
  }

  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    if let sessionId = sessionId(for: webView) {
      completedWebPaneLoadSessionIds.remove(sessionId)
    }
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.navigation.provisionalFail", [
      "error": error.localizedDescription,
      "errorCode": (error as NSError).code,
      "errorDomain": (error as NSError).domain,
      "sessionId": sessionId(for: webView) ?? NSNull(),
      "url": webView.url?.absoluteString ?? NSNull(),
    ])
  }

  func webView(
    _ webView: WKWebView,
    decidePolicyFor navigationAction: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    let requestedUrl = navigationAction.request.url
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.navigation.action", [
      "isMainFrame": navigationAction.targetFrame?.isMainFrame ?? false,
      "method": navigationAction.request.httpMethod ?? NSNull(),
      "navigationType": String(describing: navigationAction.navigationType),
      "sessionId": sessionId(for: webView) ?? NSNull(),
      "targetFrameMissing": navigationAction.targetFrame == nil,
      "url": requestedUrl?.absoluteString ?? NSNull(),
    ])
    if navigationAction.targetFrame == nil,
      let requestedUrl,
      requestedUrl.scheme == "http" || requestedUrl.scheme == "https"
    {
      /**
       CDXC:BrowserPanes 2026-05-03-03:59
       Embedded browser panes are single-pane browsers. Links that ask WebKit
       for a new tab/window, including many search-result links, must retarget
       into the existing WKWebView because zmux does not create overlay windows
       for browser-pane navigation.
       */
      NativeT3CodePaneReproLog.append("nativeWorkspace.browserPane.navigation.retargetBlank", [
        "sessionId": sessionId(for: webView) ?? NSNull(),
        "url": requestedUrl.absoluteString,
      ])
      webView.load(navigationAction.request)
      decisionHandler(.cancel)
      return
    }
    decisionHandler(.allow)
  }

  func webView(
    _ webView: WKWebView,
    decidePolicyFor navigationResponse: WKNavigationResponse,
    decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
  ) {
    let httpResponse = navigationResponse.response as? HTTPURLResponse
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.navigation.response", [
      "isForMainFrame": navigationResponse.isForMainFrame,
      "mimeType": navigationResponse.response.mimeType ?? NSNull(),
      "sessionId": sessionId(for: webView) ?? NSNull(),
      "statusCode": httpResponse?.statusCode ?? 0,
      "url": navigationResponse.response.url?.absoluteString ?? NSNull(),
    ])
    decisionHandler(.allow)
  }

  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.process.terminated", [
      "sessionId": sessionId(for: webView) ?? NSNull(),
      "url": webView.url?.absoluteString ?? NSNull(),
    ])
  }
}

extension TerminalWorkspaceView: WKUIDelegate {
  func webView(
    _ webView: WKWebView,
    createWebViewWith configuration: WKWebViewConfiguration,
    for navigationAction: WKNavigationAction,
    windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    if navigationAction.targetFrame == nil,
      let requestedUrl = navigationAction.request.url,
      requestedUrl.scheme == "http" || requestedUrl.scheme == "https"
    {
      /**
       CDXC:BrowserPanes 2026-05-03-03:59
       JavaScript/window-open navigations use WKUIDelegate instead of the
       normal committed navigation path. Keep them in the same embedded pane so
       user clicks remain in-layout and never require an external overlay.
       */
      NativeT3CodePaneReproLog.append("nativeWorkspace.browserPane.navigation.uiRetargetBlank", [
        "sessionId": sessionId(for: webView) ?? NSNull(),
        "url": requestedUrl.absoluteString,
      ])
      webView.load(navigationAction.request)
    }
    return nil
  }
}

private final class T3CodePaneDiagnosticsBridge: NSObject, WKScriptMessageHandler {
  static let messageHandlerName = "zmuxT3CodePaneDiagnostics"

  private let onThreadChanged: (String, String, String?) -> Void
  private let sessionId: String

  init(sessionId: String, onThreadChanged: @escaping (String, String, String?) -> Void) {
    self.onThreadChanged = onThreadChanged
    self.sessionId = sessionId
  }

  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    var details = normalizeBody(message.body)
    let type = (details["type"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
    details["frameInfoIsMainFrame"] = message.frameInfo.isMainFrame
    details["sessionId"] = sessionId
    if type == "thread-changed", message.frameInfo.isMainFrame {
      let threadId = (details["threadId"] as? String)?
        .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      let title = (details["title"] as? String)?
        .trimmingCharacters(in: .whitespacesAndNewlines)
      if !threadId.isEmpty {
        onThreadChanged(sessionId, threadId, title?.isEmpty == false ? title : nil)
      }
    }
    NativeT3CodePaneReproLog.append(
      "nativeWorkspace.t3WebPane.javascript.\(type?.isEmpty == false ? type! : "message")",
      details
    )
  }

  private func normalizeBody(_ body: Any) -> [String: Any] {
    if let dictionary = body as? [String: Any] {
      return dictionary.reduce(into: [String: Any]()) { result, entry in
        result[entry.key] = normalizeValue(entry.value)
      }
    }
    return ["body": String(describing: body)]
  }

  private func normalizeValue(_ value: Any) -> Any {
    if value is NSNull {
      return NSNull()
    }
    if let string = value as? String {
      return string
    }
    if let number = value as? NSNumber {
      return number
    }
    if let bool = value as? Bool {
      return bool
    }
    if let array = value as? [Any] {
      return array.map(normalizeValue)
    }
    if let dictionary = value as? [String: Any] {
      return dictionary.reduce(into: [String: Any]()) { result, entry in
        result[entry.key] = normalizeValue(entry.value)
      }
    }
    return String(describing: value)
  }
}

private func normalizedTerminalSessionTitle(_ title: String?, sessionId: String) -> String {
  let trimmedTitle = title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  return trimmedTitle.isEmpty ? sessionId : trimmedTitle
}

private enum NativeTerminalProcessMonitor {
  /**
   CDXC:NativeTerminals 2026-04-29-09:16
   Closing a managed Ghostty surface should also clean up processes still bound
   to that terminal tty. This prevents agent helper trees from becoming
   launchd-owned orphans after the user closes or restores terminal sessions.
   */
  static func terminateSessionProcesses(ttyName: String?, foregroundPid: Int?, reason: String) {
    if let normalizedTtyName = normalizedTTYName(ttyName) {
      signalProcesses(attachedToTTY: normalizedTtyName, signal: "TERM", reason: reason)
      DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
        signalProcesses(attachedToTTY: normalizedTtyName, signal: "KILL", reason: reason)
      }
      return
    }

    guard let foregroundPid, foregroundPid > 1 else {
      return
    }
    _ = kill(pid_t(foregroundPid), SIGHUP)
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
      _ = kill(pid_t(foregroundPid), SIGTERM)
    }
  }

  private static func normalizedTTYName(_ ttyName: String?) -> String? {
    let trimmed = ttyName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !trimmed.isEmpty else {
      return nil
    }
    return URL(fileURLWithPath: trimmed).lastPathComponent
  }

  private static func signalProcesses(attachedToTTY ttyName: String, signal: String, reason: String) {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/pkill")
    process.arguments = ["-\(signal)", "-t", ttyName]
    process.standardOutput = Pipe()
    process.standardError = Pipe()
    do {
      try process.run()
    } catch {
      TerminalFocusDebugLog.append(
        event: "nativeWorkspace.processMonitor.signalFailed",
        details: [
          "error": error.localizedDescription,
          "reason": reason,
          "signal": signal,
          "ttyName": ttyName,
        ])
    }
  }
}

private final class ZmuxGhosttySurfaceView: Ghostty.SurfaceView {
  /**
   CDXC:NativeTerminals 2026-04-29-08:57
   Embedded Ghostty terminals should use the default pointer cursor instead
   of advertising a text-selection I-beam at all times. Keep this scoped to
   zmux's SurfaceView subclass so Ghostty.app cursor behavior is unchanged.
   */
  override func resetCursorRects() {
    addCursorRect(bounds, cursor: .arrow)
  }

  override func performKeyEquivalent(with event: NSEvent) -> Bool {
    if handleZmuxSearchKeyEquivalent(event) {
      return true
    }
    return super.performKeyEquivalent(with: event)
  }

  /**
   CDXC:NativeTerminals 2026-04-29-08:53
   Once Cmd+F opens embedded Ghostty search, Escape should dismiss search
   before terminal programs receive the key. This mirrors normal find panels
   and keeps Escape from leaking into the shell while search is active.
   */
  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53, searchState != nil {
      searchState = nil
      return
    }
    super.keyDown(with: event)
  }

  /**
   CDXC:NativeTerminals 2026-04-28-03:17
   Embedded Ghostty terminals must not paste text on middle click. Ghostty's
   default selection-clipboard behavior always maps middle-button events to
   paste, so zmux consumes button 2 before the terminal core sees it.
   */
  override func otherMouseDown(with event: NSEvent) {
    if event.buttonNumber == 2 {
      return
    }
    super.otherMouseDown(with: event)
  }

  override func otherMouseUp(with event: NSEvent) {
    if event.buttonNumber == 2 {
      return
    }
    super.otherMouseUp(with: event)
  }

  override func otherMouseDragged(with event: NSEvent) {
    if event.buttonNumber == 2 {
      return
    }
    super.otherMouseDragged(with: event)
  }

  /**
   CDXC:NativeTerminals 2026-04-28-05:13
   Embedded Ghostty surfaces do not use Ghostty's SwiftUI terminal wrapper or
   app main menu, so search shortcuts must be handled at the surface level and
   routed to Ghostty's native search actions.
   */
  private func handleZmuxSearchKeyEquivalent(_ event: NSEvent) -> Bool {
    guard event.type == .keyDown, focused else {
      return false
    }
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    guard flags.contains(.command), flags.isDisjoint(with: [.control, .option]) else {
      return false
    }
    switch event.charactersIgnoringModifiers?.lowercased() {
    case "f":
      find(nil)
      return true
    case "g":
      if flags.contains(.shift) {
        _ = navigateSearchToPrevious()
      } else {
        _ = navigateSearchToNext()
      }
      return true
    default:
      return false
    }
  }
}

private final class BrowserAddressTextFieldCell: NSTextFieldCell {
  private static let verticalTextOffset: CGFloat = 1.5

  override func drawingRect(forBounds rect: NSRect) -> NSRect {
    adjustedTextFrame(super.drawingRect(forBounds: rect))
  }

  override func edit(
    withFrame rect: NSRect,
    in controlView: NSView,
    editor textObj: NSText,
    delegate: Any?,
    event: NSEvent?
  ) {
    super.edit(
      withFrame: adjustedTextFrame(rect),
      in: controlView,
      editor: textObj,
      delegate: delegate,
      event: event)
  }

  override func select(
    withFrame rect: NSRect,
    in controlView: NSView,
    editor textObj: NSText,
    delegate: Any?,
    start selStart: Int,
    length selLength: Int
  ) {
    super.select(
      withFrame: adjustedTextFrame(rect),
      in: controlView,
      editor: textObj,
      delegate: delegate,
      start: selStart,
      length: selLength)
  }

  private func adjustedTextFrame(_ frame: NSRect) -> NSRect {
    var nextFrame = frame
    /**
     CDXC:BrowserPanes 2026-05-03-02:08
     The browser address field frame aligns with toolbar controls, but AppKit
     draws the text slightly high. Offset only the cell text/edit rect down two
     pixels in AppKit field coordinates so the surrounding toolbar layout
     remains unchanged.
     */
    nextFrame.origin.y += Self.verticalTextOffset
    return nextFrame
  }
}

private final class TerminalSearchTextField: NSTextField {
  var onClose: (() -> Void)?
  var onFindNext: (() -> Void)?
  var onFindPrevious: (() -> Void)?

  override func performKeyEquivalent(with event: NSEvent) -> Bool {
    guard event.type == .keyDown else {
      return super.performKeyEquivalent(with: event)
    }
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    if flags.contains(.command),
      flags.isDisjoint(with: [.control, .option]),
      event.charactersIgnoringModifiers?.lowercased() == "g"
    {
      if flags.contains(.shift) {
        onFindPrevious?()
      } else {
        onFindNext?()
      }
      return true
    }
    return super.performKeyEquivalent(with: event)
  }

  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53 {
      onClose?()
      return
    }
    super.keyDown(with: event)
  }

  override func cancelOperation(_ sender: Any?) {
    onClose?()
  }
}

private final class TerminalSearchBarView: NSView, NSTextFieldDelegate {
  private static let backgroundColor = NSColor(
    calibratedRed: 0x12 / 255,
    green: 0x16 / 255,
    blue: 0x20 / 255,
    alpha: 0.96
  ).cgColor
  private static let borderColor = NSColor(
    calibratedRed: 0x7C / 255,
    green: 0x8D / 255,
    blue: 0xAA / 255,
    alpha: 0.38
  ).cgColor

  private weak var surfaceView: Ghostty.SurfaceView?
  private var searchState: Ghostty.SurfaceView.SearchState?
  private var cancellables = Set<AnyCancellable>()
  private let textField = TerminalSearchTextField()
  private let countLabel = NSTextField(labelWithString: "")
  private let previousButton = NSButton()
  private let nextButton = NSButton()
  private let closeButton = NSButton()

  init(surfaceView: Ghostty.SurfaceView) {
    self.surfaceView = surfaceView
    super.init(frame: .zero)
    isHidden = true
    wantsLayer = true
    layer?.backgroundColor = Self.backgroundColor
    layer?.borderColor = Self.borderColor
    layer?.borderWidth = 1
    layer?.cornerRadius = 8
    layer?.masksToBounds = true

    configureTextField()
    configureCountLabel()
    configureButton(previousButton, symbolName: "chevron.up", action: #selector(findPrevious))
    configureButton(nextButton, symbolName: "chevron.down", action: #selector(findNext))
    configureButton(closeButton, symbolName: "xmark", action: #selector(closeSearch))
    addSubview(textField)
    addSubview(countLabel)
    addSubview(previousButton)
    addSubview(nextButton)
    addSubview(closeButton)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override func layout() {
    super.layout()
    /**
     CDXC:NativeTerminals 2026-04-29-02:00
     Native Ghostty search must stay a compact floating control. Manual
     AppKit frames prevent stack-view expansion from stretching the search
     input across the terminal pane and obscuring terminal content.
     */
    let inset = CGFloat(7)
    let buttonSize = CGFloat(24)
    let gap = CGFloat(4)
    let contentHeight = max(bounds.height - inset * 2, 20)
    var right = bounds.maxX - inset

    closeButton.frame = CGRect(
      x: right - buttonSize, y: inset - 1, width: buttonSize, height: contentHeight + 2)
    right = closeButton.frame.minX - gap
    nextButton.frame = CGRect(
      x: right - buttonSize, y: inset - 1, width: buttonSize, height: contentHeight + 2)
    right = nextButton.frame.minX - gap
    previousButton.frame = CGRect(
      x: right - buttonSize, y: inset - 1, width: buttonSize, height: contentHeight + 2)
    right = previousButton.frame.minX - gap
    countLabel.frame = CGRect(x: right - 50, y: inset, width: 50, height: contentHeight)
    right = countLabel.frame.minX - gap
    textField.frame = CGRect(
      x: inset + 2,
      y: inset,
      width: max(right - inset - 2, 80),
      height: contentHeight
    )
  }

  func setSearchState(_ nextSearchState: Ghostty.SurfaceView.SearchState?) {
    searchState = nextSearchState
    cancellables.removeAll()
    guard let nextSearchState else {
      isHidden = true
      return
    }

    isHidden = false
    updateNeedle(nextSearchState.needle)
    updateCount(selected: nextSearchState.selected, total: nextSearchState.total)
    nextSearchState.$needle
      .receive(on: DispatchQueue.main)
      .sink { [weak self] needle in
        self?.updateNeedle(needle)
      }
      .store(in: &cancellables)
    nextSearchState.$selected
      .combineLatest(nextSearchState.$total)
      .receive(on: DispatchQueue.main)
      .sink { [weak self] selected, total in
        self?.updateCount(selected: selected, total: total)
      }
      .store(in: &cancellables)
    DispatchQueue.main.async { [weak self] in
      guard let self, !self.isHidden else { return }
      self.window?.makeFirstResponder(self.textField)
    }
  }

  func controlTextDidChange(_ notification: Notification) {
    guard notification.object as? NSTextField === textField else {
      return
    }
    searchState?.needle = textField.stringValue
  }

  func control(
    _ control: NSControl,
    textView: NSTextView,
    doCommandBy commandSelector: Selector
  ) -> Bool {
    guard control === textField else {
      return false
    }
    if commandSelector == #selector(NSResponder.cancelOperation(_:)) {
      closeSearch()
      return true
    }
    return false
  }

  private func configureTextField() {
    textField.delegate = self
    textField.placeholderString = "Search"
    textField.focusRingType = .none
    textField.isBezeled = false
    textField.drawsBackground = false
    textField.font = NSFont.systemFont(ofSize: 13)
    textField.textColor = NSColor(calibratedWhite: 0.94, alpha: 1)
    textField.onClose = { [weak self] in self?.closeSearch() }
    textField.onFindNext = { [weak self] in self?.findNext() }
    textField.onFindPrevious = { [weak self] in self?.findPrevious() }
  }

  private func configureCountLabel() {
    countLabel.alignment = .right
    countLabel.font = NSFont.monospacedDigitSystemFont(ofSize: 11, weight: .regular)
    countLabel.textColor = NSColor(calibratedWhite: 0.72, alpha: 1)
    countLabel.lineBreakMode = .byTruncatingMiddle
  }

  private func configureButton(_ button: NSButton, symbolName: String, action: Selector) {
    button.bezelStyle = .regularSquare
    button.image = NSImage(systemSymbolName: symbolName, accessibilityDescription: nil)
    button.imagePosition = .imageOnly
    button.isBordered = false
    button.target = self
    button.action = action
  }

  private func updateNeedle(_ needle: String) {
    if textField.stringValue != needle {
      textField.stringValue = needle
    }
  }

  private func updateCount(selected: UInt?, total: UInt?) {
    if let selected {
      countLabel.stringValue = "\(selected + 1)/\(total.map(String.init) ?? "?")"
    } else if let total {
      countLabel.stringValue = "-/\(total)"
    } else {
      countLabel.stringValue = ""
    }
  }

  @objc private func findNext() {
    _ = surfaceView?.navigateSearchToNext()
  }

  @objc private func findPrevious() {
    _ = surfaceView?.navigateSearchToPrevious()
  }

  @objc private func closeSearch() {
    surfaceView?.searchState = nil
    if let surfaceView {
      window?.makeFirstResponder(surfaceView)
    }
  }
}

private final class TerminalPaneHeaderDragTargetView: NSView {
  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    wantsLayer = true
    layer?.borderWidth = 2
    layer?.cornerRadius = 6
    layer?.borderColor = NSColor(calibratedRed: 0.44, green: 0.68, blue: 1, alpha: 0.95).cgColor
    layer?.backgroundColor = NSColor(calibratedRed: 0.18, green: 0.42, blue: 0.86, alpha: 0.12).cgColor
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }
}

private final class TerminalPaneHeaderDragGhostView: NSView {
  private static let height: CGFloat = 32
  private static let horizontalPadding: CGFloat = 8
  private static let iconSize: CGFloat = 16
  private static let iconGap: CGFloat = 7

  private let iconImageView = NSImageView(frame: .zero)
  private let titleLabel = NSTextField(labelWithString: "")

  override var isFlipped: Bool {
    true
  }

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    wantsLayer = true
    layer?.backgroundColor = NSColor(calibratedRed: 0.08, green: 0.09, blue: 0.11, alpha: 0.96).cgColor
    layer?.borderColor = NSColor(calibratedWhite: 1, alpha: 0.18).cgColor
    layer?.borderWidth = 1
    layer?.cornerRadius = 7
    layer?.shadowColor = NSColor.black.cgColor
    layer?.shadowOpacity = 0.32
    layer?.shadowOffset = CGSize(width: 0, height: -5)
    layer?.shadowRadius = 12

    iconImageView.imageScaling = .scaleProportionallyDown
    iconImageView.wantsLayer = true
    iconImageView.layer?.cornerRadius = 3
    iconImageView.layer?.masksToBounds = true
    addSubview(iconImageView)

    titleLabel.font = NSFont.systemFont(ofSize: 12, weight: .semibold)
    titleLabel.textColor = NSColor(calibratedWhite: 0.94, alpha: 1)
    titleLabel.lineBreakMode = .byTruncatingTail
    addSubview(titleLabel)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  func configure(
    title: String,
    favicon: NSImage?,
    agentIconDataUrl: String?,
    agentIconColorHex: String?,
    maxWidth: CGFloat
  ) {
    titleLabel.stringValue = title
    let agentIconImage = nativePaneImage(fromDataUrl: agentIconDataUrl, isTemplate: true)
    iconImageView.image = favicon ?? agentIconImage
    iconImageView.contentTintColor =
      favicon == nil && agentIconImage != nil
      ? nativePaneColor(fromHex: agentIconColorHex) ?? NSColor.white : nil
    let measuredTitleWidth = ceil(
      (title as NSString).size(withAttributes: [
        .font: titleLabel.font ?? NSFont.systemFont(ofSize: 12, weight: .semibold)
      ]).width
    )
    let width = min(
      maxWidth,
      max(96, Self.horizontalPadding * 2 + Self.iconSize + Self.iconGap + measuredTitleWidth)
    )
    frame.size = CGSize(width: width, height: Self.height)
    needsLayout = true
    layoutSubtreeIfNeeded()
  }

  override func layout() {
    super.layout()
    iconImageView.frame = CGRect(
      x: Self.horizontalPadding,
      y: floor((bounds.height - Self.iconSize) / 2),
      width: Self.iconSize,
      height: Self.iconSize
    )
    let titleX = iconImageView.frame.maxX + Self.iconGap
    titleLabel.frame = CGRect(
      x: titleX,
      y: floor((bounds.height - 16) / 2),
      width: max(0, bounds.width - titleX - Self.horizontalPadding),
      height: 16
    )
  }

}

private final class TerminalSessionTitleBarView: NSView {
  private static let borderColor = NSColor(
    calibratedRed: 0x58 / 255,
    green: 0x6F / 255,
    blue: 0x95 / 255,
    alpha: 0.24
  ).cgColor
  private static let backgroundColor = NSColor(
    calibratedRed: 0x05 / 255,
    green: 0x06 / 255,
    blue: 0x08 / 255,
    alpha: 0.96
  ).cgColor
  private static let titleColor = NSColor(
    calibratedRed: 0xE1 / 255,
    green: 0xE1 / 255,
    blue: 0xE1 / 255,
    alpha: 1
  )
  private static let workingIndicatorColor = NSColor(
    calibratedRed: 0xF5 / 255,
    green: 0x9E / 255,
    blue: 0x0B / 255,
    alpha: 1
  ).cgColor
  private static let attentionIndicatorColor = NSColor(
    calibratedRed: 0x65 / 255,
    green: 0xE5 / 255,
    blue: 0x8A / 255,
    alpha: 1
  ).cgColor

  private let faviconImageView = NSImageView(frame: .zero)
  private let titleLabel = NSTextField(labelWithString: "")
  private let activityIndicatorView = NSView(frame: .zero)
  private let bottomBorderView = NSView(frame: .zero)
  private let actionButtons: [(action: TerminalTitleBarAction, button: NSButton)]
  private var agentIconColor: NSColor?
  private var agentIconImage: NSImage?
  private var activity: NativeTerminalActivity?
  private var faviconImage: NSImage?
  private var pendingMouseDownAction: TerminalTitleBarAction?
  private var hoverTrackingArea: NSTrackingArea?
  var onMouseDown: ((NSEvent) -> Void)?
  var onMouseDragged: ((NSEvent) -> Void)?
  var onMouseUp: ((NSEvent) -> Void)?
  var onAction: ((TerminalTitleBarAction) -> Void)?
  var resizeCursorForPoint: ((NSPoint) -> NSCursor?)?

  override var isFlipped: Bool {
    true
  }

  var displayTitle: String {
    titleLabel.stringValue
  }

  var displayFavicon: NSImage? {
    faviconImage
  }

  static let defaultActions: [TerminalTitleBarAction] = [.rename, .fork, .reload, .sleep, .close]

  init(title: String, actions: [TerminalTitleBarAction] = TerminalSessionTitleBarView.defaultActions) {
    /**
     CDXC:BrowserPanes 2026-05-03-03:48
     Browser panes have navigation/tooling controls in their dedicated browser
     toolbar. Their pane title bar should only keep close, while terminals and
     managed T3 panes keep the full session action set.
     */
    actionButtons = actions.map { action in
      (action, Self.makeActionButton(for: action))
    }
    super.init(frame: .zero)
    wantsLayer = true
    layer?.backgroundColor = Self.backgroundColor
    layer?.borderColor = Self.borderColor
    layer?.borderWidth = 0

    faviconImageView.imageScaling = .scaleProportionallyDown
    faviconImageView.isHidden = true
    faviconImageView.wantsLayer = true
    faviconImageView.layer?.cornerRadius = 3
    faviconImageView.layer?.masksToBounds = true

    titleLabel.stringValue = title
    titleLabel.font = NSFont.systemFont(ofSize: 12, weight: .bold)
    titleLabel.textColor = Self.titleColor
    titleLabel.lineBreakMode = .byTruncatingTail

    activityIndicatorView.wantsLayer = true
    activityIndicatorView.layer?.backgroundColor = NSColor.clear.cgColor
    activityIndicatorView.layer?.cornerRadius = 4
    activityIndicatorView.isHidden = true

    bottomBorderView.wantsLayer = true
    bottomBorderView.layer?.backgroundColor = Self.borderColor

    addSubview(faviconImageView)
    addSubview(titleLabel)
    addSubview(activityIndicatorView)
    for item in actionButtons {
      item.button.target = self
      item.button.action = #selector(performTitleBarAction(_:))
      addSubview(item.button)
    }
    addSubview(bottomBorderView)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override func mouseDown(with event: NSEvent) {
    let point = convert(event.locationInWindow, from: nil)
    if let action = actionButtonAction(at: point) {
      pendingMouseDownAction = action
      return
    }
    onMouseDown?(event)
  }

  override func mouseDragged(with event: NSEvent) {
    if pendingMouseDownAction != nil {
      return
    }
    onMouseDragged?(event)
  }

  override func mouseUp(with event: NSEvent) {
    if let action = pendingMouseDownAction {
      pendingMouseDownAction = nil
      let point = convert(event.locationInWindow, from: nil)
      if actionButtonAction(at: point) == action {
        onAction?(action)
      }
      return
    }
    onMouseUp?(event)
  }

  func isDraggableHeaderPoint(_ point: NSPoint) -> Bool {
    guard bounds.contains(point) else {
      return false
    }
    if resizeCursorForPoint?(point) != nil {
      return false
    }
    return actionButtonAction(at: point) == nil
  }

  override func hitTest(_ point: NSPoint) -> NSView? {
    guard bounds.contains(point) else {
      return nil
    }
    /**
     CDXC:NativePaneReorder 2026-05-03-03:42
     Pane headers are draggable from the visible title and empty title-bar
     chrome, but action buttons must remain normal controls. Check the
     laid-out button frames inside this title-bar view so the window-level drag
     monitor never starts a header drag or focuses the terminal before a button
     click can be resolved on mouse-up.

     CDXC:BrowserPanes 2026-05-03-11:06
     Delegate action-button hit testing to AppKit so browser pane close is a
     normal NSButton click, matching T3 Code panes and preserving
     Accessibility activation. The title-bar view itself still owns empty
     chrome for pane dragging.
     */
    if let hitView = super.hitTest(point), hitView !== self {
      return hitView
    }
    return self
  }

  func actionButtonAction(at point: NSPoint) -> TerminalTitleBarAction? {
    for item in actionButtons where item.button.frame.contains(point) {
      return item.action
    }
    /**
     CDXC:BrowserPanes 2026-05-03-11:06
     Browser title bars currently expose only close. Give that close action a
     forgiving right-edge hit target so users can close browser panes like T3
     panes even when the tiny borderless AppKit button does not receive the
     click through the WKWebView pane stack.
     */
    if actionButtons.count == 1,
      actionButtons.first?.action == .close,
      CGRect(x: max(0, bounds.maxX - 44), y: 0, width: 44, height: bounds.height).contains(point)
    {
      return .close
    }
    return nil
  }

  override func resetCursorRects() {
    super.resetCursorRects()
    /**
     CDXC:NativePaneResize 2026-05-03-05:06
     Gap-sized native resize bands can border title-bar hit testing when pane
     gaps are small. Cursor precedence must favor split resizing at the pane
     boundary, so the title bar registers resize cursor rects for any boundary
     overlap before falling back to the pane-reorder hand cursor.
     */
    let firstActionButtonX = actionButtons.map(\.button.frame.minX).min() ?? bounds.maxX
    let probeStep: CGFloat = 2
    var cursorRunStart: CGFloat?
    var cursorRunCursor: NSCursor?
    var x: CGFloat = 0
    while x <= bounds.width {
      let probePoint = CGPoint(x: min(x, bounds.width), y: bounds.midY)
      let resizeCursor = resizeCursorForPoint?(probePoint)
      let cursor = resizeCursor ?? (probePoint.x < firstActionButtonX ? NSCursor.openHand : nil)
      let cursorChanged = cursor !== cursorRunCursor
      if cursorChanged {
        if let cursorRunStart, let cursorRunCursor {
          addCursorRect(
            CGRect(
              x: cursorRunStart,
              y: 0,
              width: max(1, x - cursorRunStart),
              height: bounds.height),
            cursor: cursorRunCursor)
        }
        cursorRunStart = cursor == nil ? nil : x
        cursorRunCursor = cursor
      }
      x += probeStep
    }
    if let cursorRunStart, let cursorRunCursor {
      addCursorRect(
        CGRect(
          x: cursorRunStart,
          y: 0,
          width: max(1, bounds.width - cursorRunStart),
          height: bounds.height),
        cursor: cursorRunCursor)
    }
  }

  override func updateTrackingAreas() {
    super.updateTrackingAreas()
    if let hoverTrackingArea {
      removeTrackingArea(hoverTrackingArea)
    }
    let trackingArea = NSTrackingArea(
      rect: .zero,
      options: [.activeInKeyWindow, .cursorUpdate, .inVisibleRect, .mouseEnteredAndExited, .mouseMoved],
      owner: self,
      userInfo: nil
    )
    hoverTrackingArea = trackingArea
    addTrackingArea(trackingArea)
  }

  override func cursorUpdate(with event: NSEvent) {
    setHeaderCursor(for: event)
  }

  override func mouseEntered(with event: NSEvent) {
    setHeaderCursor(for: event)
  }

  override func mouseMoved(with event: NSEvent) {
    setHeaderCursor(for: event)
  }

  override func mouseExited(with event: NSEvent) {
    NSCursor.arrow.set()
  }

  private func setHeaderCursor(for event: NSEvent) {
    let point = convert(event.locationInWindow, from: nil)
    if let resizeCursor = resizeCursorForPoint?(point) {
      resizeCursor.set()
      return
    }
    if isDraggableHeaderPoint(point) {
      NSCursor.openHand.set()
    } else {
      NSCursor.arrow.set()
    }
  }

  override func layout() {
    super.layout()
    let insetX: CGFloat = 8
    let buttonSize: CGFloat = 18
    let buttonGap: CGFloat = 3
    let indicatorSize: CGFloat = 8
    let indicatorGap: CGFloat = 6
    let centerY = floor((bounds.height - buttonSize) / 2)
    var trailingX = bounds.width - insetX

    /**
     CDXC:NativeTerminals 2026-04-28-05:18
     Terminal titles should not truncate before reaching the right-side action
     cluster. Keep title-bar actions compact so pane names use the available
     chrome width while still leaving a non-overlapping hit target per action.

     CDXC:BrowserPanes 2026-05-03-01:58
     Browser pane title bars keep only normal session controls on the right.
     Browser navigation/tooling belongs in the address toolbar, while the
     webpage favicon and title identify the page on the left.
     */
    for item in actionButtons.reversed() {
      trailingX -= buttonSize
      item.button.frame = CGRect(x: trailingX, y: centerY, width: buttonSize, height: buttonSize)
      trailingX -= buttonGap
    }

    /**
     CDXC:NativeTerminals 2026-04-28-03:37
     Per-terminal title bars must not show the blue focused-session dot. Keep
     focus state visible through the pane border while preserving a small
     card-matched activity dot immediately after the title for done/working.
     */
    let faviconSize: CGFloat = 16
    let faviconGap: CGFloat = 6
    /**
     CDXC:NativePaneReorder 2026-05-03-04:52
     Pane title bars should identify terminal/T3 sessions with the same agent
     logo shown on the session card, using the existing favicon placement to
     avoid adding new chrome. Browser favicons remain higher priority because
     they identify the loaded page more specifically than the generic browser
     logo. Sidebar agent SVGs are mask assets, so native AppKit renders them as
     template images tinted with the same per-agent color as the session card
     instead of using their black source fill on dark chrome.
     */
    let identityImage = faviconImage ?? agentIconImage
    let hasIdentityImage = identityImage != nil
    faviconImageView.image = identityImage
    faviconImageView.contentTintColor =
      faviconImage == nil && agentIconImage != nil ? agentIconColor ?? Self.titleColor : nil
    if hasIdentityImage {
      faviconImageView.isHidden = false
      faviconImageView.frame = CGRect(
        x: insetX,
        y: floor((bounds.height - faviconSize) / 2),
        width: faviconSize,
        height: faviconSize
      )
    } else {
      faviconImageView.isHidden = true
      faviconImageView.frame = CGRect(
        x: insetX,
        y: floor((bounds.height - faviconSize) / 2),
        width: 0,
        height: 0
      )
    }
    let titleX = hasIdentityImage ? insetX + faviconSize + faviconGap : insetX
    let titleTrailing = trailingX
    let maxTitleWidth = max(
      titleTrailing - titleX - (activity == nil ? 2 : indicatorSize + indicatorGap + 2),
      0
    )
    /**
     CDXC:NativeTerminals 2026-05-01-02:18
     AppKit truncating text fields need a frame as wide as the title's usable
     area. Measuring the raw title is only for placing the activity dot; the
     label itself must span maxTitleWidth so native text drawing does not
     ellipsize against a stale or too-small intrinsic width.
     */
    let measuredTitleWidth = ceil(
      (titleLabel.stringValue as NSString).size(withAttributes: [
        .font: titleLabel.font ?? NSFont.systemFont(ofSize: 12, weight: .bold)
      ]).width
    )
    titleLabel.frame = CGRect(
      x: titleX,
      y: floor((bounds.height - 16) / 2),
      width: maxTitleWidth,
      height: 16
    )
    let visibleTitleWidth = min(measuredTitleWidth, maxTitleWidth)
    activityIndicatorView.frame = CGRect(
      x: titleLabel.frame.minX + visibleTitleWidth + indicatorGap,
      y: floor((bounds.height - indicatorSize) / 2),
      width: indicatorSize,
      height: indicatorSize
    )
    bottomBorderView.frame = CGRect(x: 0, y: bounds.height - 1, width: bounds.width, height: 1)
    /**
     CDXC:NativePaneReorder 2026-05-03-04:42
     Header drag affordance must stay visible after the pointer settles, not
     only during mouse-moved events. AppKit builds cursor rectangles from the
     laid-out action-button frames, so refresh them after layout changes the
     draggable title-bar width.
     */
    window?.invalidateCursorRects(for: self)
  }

  func setTitle(_ title: String) {
    if titleLabel.stringValue != title {
      titleLabel.stringValue = title
      needsLayout = true
    }
  }

  func setFavicon(_ image: NSImage?) {
    faviconImage = image
    needsLayout = true
  }

  func setAgentIconDataUrl(_ dataUrl: String?, colorHex: String?) {
    agentIconImage = nativePaneImage(fromDataUrl: dataUrl, isTemplate: true)
    agentIconColor = nativePaneColor(fromHex: colorHex)
    needsLayout = true
  }

  func setState(activity nextActivity: NativeTerminalActivity?) {
    activity = nextActivity
    switch nextActivity {
    case .attention:
      activityIndicatorView.isHidden = false
      activityIndicatorView.layer?.backgroundColor = Self.attentionIndicatorColor
    case .working:
      activityIndicatorView.isHidden = false
      activityIndicatorView.layer?.backgroundColor = Self.workingIndicatorColor
    case .none:
      activityIndicatorView.isHidden = true
      activityIndicatorView.layer?.backgroundColor = NSColor.clear.cgColor
    }
    needsLayout = true
  }

  @objc private func performTitleBarAction(_ sender: NSButton) {
    guard let item = actionButtons.first(where: { $0.button === sender }) else {
      return
    }
    onAction?(item.action)
  }

  private static func makeActionButton(for action: TerminalTitleBarAction) -> NSButton {
    switch action {
    case .rename:
      return makeActionButton(systemSymbolName: "pencil", fallbackTitle: "R", tooltip: "Rename Session")
    case .fork:
      return makeActionButton(systemSymbolName: "arrow.triangle.branch", fallbackTitle: "F", tooltip: "Fork Session")
    case .reload:
      return makeActionButton(systemSymbolName: "arrow.clockwise", fallbackTitle: "R", tooltip: "Reload Session")
    case .sleep:
      return makeActionButton(systemSymbolName: "moon", fallbackTitle: "S", tooltip: "Sleep Session")
    case .close:
      return makeActionButton(systemSymbolName: "xmark", fallbackTitle: "X", tooltip: "Close Session")
    }
  }

  private static func makeActionButton(
    systemSymbolName: String,
    fallbackTitle: String,
    tooltip: String
  ) -> NSButton {
    let button = NSButton(title: "", target: nil, action: nil)
    button.bezelStyle = .texturedRounded
    button.isBordered = false
    button.imagePosition = .imageOnly
    button.toolTip = tooltip
    button.contentTintColor = NSColor(calibratedWhite: 0.88, alpha: 0.72)
    if let image = NSImage(systemSymbolName: systemSymbolName, accessibilityDescription: tooltip) {
      button.image = image
    } else {
      button.title = fallbackTitle
      button.font = NSFont.systemFont(ofSize: 11, weight: .bold)
    }
    return button
  }
}

final class WebPaneHostView: NSView, NSTextFieldDelegate {
  private enum BrowserPaneThemeMode: String {
    case system
    case light
    case dark

    var title: String {
      switch self {
      case .system:
        return "System"
      case .light:
        return "Light"
      case .dark:
        return "Dark"
      }
    }

    var symbolName: String {
      switch self {
      case .system:
        return "circle.lefthalf.filled"
      case .light:
        return "sun.max"
      case .dark:
        return "moon"
      }
    }
  }

  private static let browserToolbarHeight: CGFloat = 40
  private static let toolbarButtonSize = CGSize(width: 28, height: 28)
  private static let toolbarHorizontalPadding: CGFloat = 12
  private static let toolbarItemGap: CGFloat = 10
  private static let addressMinimumWidth: CGFloat = 180

  private let webView: WKWebView
  private let showsBrowserToolbar: Bool
  private let onFocus: (() -> Void)?
  private let onOpenDevTools: (() -> Void)?
  private let onInjectReactGrab: (() -> Void)?
  private let onShowProfilePicker: (() -> Void)?
  private let onShowImportSettings: (() -> Void)?
  private let toolbarView = NSView(frame: .zero)
  private let backButton = WebPaneHostView.makeToolbarButton(
    systemSymbolName: "chevron.left",
    fallbackTitle: "<",
    tooltip: "Back"
  )
  private let forwardButton = WebPaneHostView.makeToolbarButton(
    systemSymbolName: "chevron.right",
    fallbackTitle: ">",
    tooltip: "Forward"
  )
  private let reloadButton = WebPaneHostView.makeToolbarButton(
    systemSymbolName: "arrow.clockwise",
    fallbackTitle: "R",
    tooltip: "Reload"
  )
  private let securityIcon = NSImageView(frame: .zero)
  private let addressField = NSTextField(frame: .zero)
  private let devToolsButton = WebPaneHostView.makeToolbarButton(
    systemSymbolName: "wrench.and.screwdriver",
    fallbackTitle: "D",
    tooltip: "Toggle DevTools"
  )
  private let reactGrabButton = WebPaneHostView.makeToolbarButton(
    systemSymbolName: "cursorarrow.click.2",
    fallbackTitle: "RG",
    tooltip: "React Grab"
  )
  private let profileButton = WebPaneHostView.makeToolbarButton(
    systemSymbolName: "person.crop.circle",
    fallbackTitle: "P",
    tooltip: "Browser Profile"
  )
  private let appearanceButton = WebPaneHostView.makeToolbarButton(
    systemSymbolName: "circle.lefthalf.filled",
    fallbackTitle: "A",
    tooltip: "Toggle Page Appearance"
  )
  private var navigationObservations: [NSKeyValueObservation] = []
  private var addressFieldKeyMonitor: Any?
  private var browserThemeMode: BrowserPaneThemeMode = .system
  private var isEditingAddress = false

  init(
    webView: WKWebView,
    showsBrowserToolbar: Bool = false,
    initialAddress: String? = nil,
    onFocus: (() -> Void)? = nil,
    onOpenDevTools: (() -> Void)? = nil,
    onInjectReactGrab: (() -> Void)? = nil,
    onShowProfilePicker: (() -> Void)? = nil,
    onShowImportSettings: (() -> Void)? = nil
  ) {
    self.webView = webView
    self.showsBrowserToolbar = showsBrowserToolbar
    self.onFocus = onFocus
    self.onOpenDevTools = onOpenDevTools
    self.onInjectReactGrab = onInjectReactGrab
    self.onShowProfilePicker = onShowProfilePicker
    self.onShowImportSettings = onShowImportSettings
    super.init(frame: .zero)
    translatesAutoresizingMaskIntoConstraints = true
    autoresizesSubviews = true
    wantsLayer = true
    layer?.backgroundColor = NSColor(calibratedRed: 0.086, green: 0.086, blue: 0.086, alpha: 1)
      .cgColor
    layer?.masksToBounds = true
    webView.translatesAutoresizingMaskIntoConstraints = true
    webView.autoresizingMask = [.width, .height]
    webView.frame = bounds
    if showsBrowserToolbar {
      configureBrowserToolbar(initialAddress: initialAddress)
      addSubview(toolbarView)
    }
    addSubview(webView)
    updateBrowserToolbarState()
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  deinit {
    uninstallAddressFieldKeyMonitor()
  }

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    uninstallAddressFieldKeyMonitor()
    if window != nil {
      installAddressFieldKeyMonitor()
    }
  }

  override func layout() {
    super.layout()
    if showsBrowserToolbar, toolbarView.superview !== self {
      toolbarView.removeFromSuperview()
      addSubview(toolbarView)
    }
    if webView.superview !== self {
      webView.removeFromSuperview()
      addSubview(webView)
    }
    let webFrame: CGRect
    if showsBrowserToolbar {
      let toolbarHeight = min(Self.browserToolbarHeight, max(0, bounds.height))
      toolbarView.frame = CGRect(
        x: 0,
        y: bounds.height - toolbarHeight,
        width: bounds.width,
        height: toolbarHeight
      )
      layoutBrowserToolbar()
      webFrame = CGRect(x: 0, y: 0, width: bounds.width, height: max(0, bounds.height - toolbarHeight))
    } else {
      webFrame = bounds
    }
    if webView.frame != webFrame {
      webView.frame = webFrame
    }
  }

  func refreshHostedWebView(reason: String) {
    if showsBrowserToolbar, toolbarView.superview !== self {
      toolbarView.removeFromSuperview()
      addSubview(toolbarView)
    }
    if webView.superview !== self {
      webView.removeFromSuperview()
      addSubview(webView)
    }
    let toolbarHeight = showsBrowserToolbar ? min(Self.browserToolbarHeight, max(0, bounds.height)) : 0
    if showsBrowserToolbar {
      toolbarView.frame = CGRect(
        x: 0,
        y: bounds.height - toolbarHeight,
        width: bounds.width,
        height: toolbarHeight
      )
      layoutBrowserToolbar()
    }
    webView.frame = CGRect(x: 0, y: 0, width: bounds.width, height: max(0, bounds.height - toolbarHeight))
    updateBrowserToolbarState()
    needsLayout = true
    needsDisplay = true
    webView.needsLayout = true
    webView.needsDisplay = true
    layoutSubtreeIfNeeded()
    webView.layoutSubtreeIfNeeded()
    displayIfNeeded()
    webView.displayIfNeeded()
    NativeT3CodePaneReproLog.append("nativeWorkspace.t3WebPane.host.refresh", [
      "hostFrame": Self.describeFrame(frame),
      "reason": reason,
      "webFrame": Self.describeFrame(webView.frame),
      "webUrl": webView.url?.absoluteString ?? NSNull(),
      "windowNumber": window?.windowNumber ?? NSNull(),
    ])
  }

  override func mouseDown(with event: NSEvent) {
    onFocus?()
    super.mouseDown(with: event)
  }

  func controlTextDidBeginEditing(_ obj: Notification) {
    isEditingAddress = true
  }

  func controlTextDidEndEditing(_ obj: Notification) {
    isEditingAddress = false
    if isReturnTextMovement(obj) {
      /**
       CDXC:BrowserPanes 2026-05-03-04:09
       AppKit can finish NSTextField editing on Return without sending the
       target/action first. Commit here too so typed browser URLs navigate
       instead of being overwritten by the previous WKWebView URL.
       */
      commitAddress()
      return
    }
    updateBrowserToolbarState()
  }

  private func isReturnTextMovement(_ notification: Notification) -> Bool {
    guard let movement = notification.userInfo?["NSTextMovement"] as? Int else {
      return false
    }
    return movement == NSReturnTextMovement
  }

  func control(
    _ control: NSControl,
    textView: NSTextView,
    doCommandBy commandSelector: Selector
  ) -> Bool {
    guard control === addressField else {
      return false
    }
    if commandSelector == #selector(NSResponder.insertNewline(_:)) {
      /**
       CDXC:BrowserPanes 2026-05-03-03:59
       Address-bar Return must always drive WKWebView navigation. Handling the
       text command directly avoids AppKit swallowing the field action after a
       page focus transition or autocomplete interaction.
       */
      commitAddress()
      window?.makeFirstResponder(webView)
      return true
    }
    if commandSelector == #selector(NSResponder.insertNewlineIgnoringFieldEditor(_:)) {
      commitAddress()
      window?.makeFirstResponder(webView)
      return true
    }
    if commandSelector == #selector(NSResponder.cancelOperation(_:)) {
      isEditingAddress = false
      updateBrowserToolbarState()
      window?.makeFirstResponder(webView)
      return true
    }
    return false
  }

  private func installAddressFieldKeyMonitor() {
    guard addressFieldKeyMonitor == nil else {
      return
    }
    addressFieldKeyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
      guard let self else {
        return event
      }
      guard self.shouldCommitAddress(forKeyDown: event) else {
        return event
      }
      /**
       CDXC:BrowserPanes 2026-05-03-04:22
       Embedded browser panes use native AppKit address chrome. Some field
       editor paths consume Return before NSTextField target/action or delegate
       callbacks run, so commit Return/keypad-Enter at the pane level while this
       address field is actively edited. This keeps typed URLs navigating in the
       embedded pane instead of leaving stale page content behind the new text.
       */
      self.commitAddress()
      self.window?.makeFirstResponder(self.webView)
      return nil
    }
  }

  private func uninstallAddressFieldKeyMonitor() {
    if let addressFieldKeyMonitor {
      NSEvent.removeMonitor(addressFieldKeyMonitor)
    }
    addressFieldKeyMonitor = nil
  }

  private func shouldCommitAddress(forKeyDown event: NSEvent) -> Bool {
    guard showsBrowserToolbar else {
      return false
    }
    guard event.window === window, window?.isKeyWindow == true else {
      return false
    }
    guard addressField.currentEditor() != nil || isEditingAddress else {
      return false
    }
    guard window?.fieldEditor(false, for: addressField) === window?.firstResponder else {
      return false
    }
    if event.keyCode == 36 || event.keyCode == 76 {
      return true
    }
    return event.characters == "\r" || event.characters == "\n"
  }

  private func configureBrowserToolbar(initialAddress: String?) {
    toolbarView.translatesAutoresizingMaskIntoConstraints = true
    toolbarView.autoresizesSubviews = false
    toolbarView.wantsLayer = true
    toolbarView.layer?.backgroundColor = NSColor.black.cgColor

    [backButton, forwardButton, reloadButton, reactGrabButton, profileButton, appearanceButton, devToolsButton].forEach {
      button in
      button.target = self
      toolbarView.addSubview(button)
    }
    backButton.action = #selector(goBack)
    forwardButton.action = #selector(goForward)
    reloadButton.action = #selector(reloadPage)
    devToolsButton.action = #selector(openDevTools)
    reactGrabButton.action = #selector(injectReactGrab)
    profileButton.action = #selector(showProfilePicker)
    appearanceButton.action = #selector(showAppearanceMenu)

    securityIcon.image = NSImage(systemSymbolName: "lock.fill", accessibilityDescription: "Secure connection")
    securityIcon.contentTintColor = NSColor(calibratedWhite: 0.78, alpha: 0.9)
    securityIcon.imageScaling = .scaleProportionallyDown
    toolbarView.addSubview(securityIcon)

    addressField.cell = BrowserAddressTextFieldCell(textCell: "")
    addressField.stringValue = initialAddress ?? ""
    addressField.delegate = self
    addressField.target = self
    addressField.action = #selector(commitAddress)
    addressField.isBordered = false
    addressField.drawsBackground = false
    addressField.isEditable = true
    addressField.isSelectable = true
    addressField.focusRingType = .none
    addressField.font = NSFont.systemFont(ofSize: 13, weight: .medium)
    addressField.textColor = NSColor(calibratedWhite: 0.94, alpha: 0.95)
    addressField.placeholderString = "Search or enter address"
    addressField.lineBreakMode = .byTruncatingMiddle
    addressField.cell?.lineBreakMode = .byTruncatingMiddle
    addressField.cell?.usesSingleLineMode = true
    addressField.cell?.wraps = false
    toolbarView.addSubview(addressField)

    /**
     CDXC:BrowserPanes 2026-05-02-17:03
     The address bar is native AppKit chrome for embedded browser panes. It
     normalizes typed URLs/searches and drives the pane's own WKWebView, keeping
     browser navigation inside the pane instead of opening external overlays.
     */
    navigationObservations = [
      webView.observe(\.url, options: [.initial, .new]) { [weak self] _, _ in
        Task { @MainActor in self?.updateBrowserToolbarState() }
      },
      webView.observe(\.canGoBack, options: [.initial, .new]) { [weak self] _, _ in
        Task { @MainActor in self?.updateBrowserToolbarState() }
      },
      webView.observe(\.canGoForward, options: [.initial, .new]) { [weak self] _, _ in
        Task { @MainActor in self?.updateBrowserToolbarState() }
      },
      webView.observe(\.isLoading, options: [.initial, .new]) { [weak self] _, _ in
        Task { @MainActor in self?.updateBrowserToolbarState() }
      },
    ]
  }

  private func layoutBrowserToolbar() {
    guard showsBrowserToolbar else {
      return
    }
    let height = toolbarView.bounds.height
    var x = Self.toolbarHorizontalPadding
    let buttonY = floor((height - Self.toolbarButtonSize.height) / 2)
    for button in [backButton, forwardButton, reloadButton] {
      button.frame = CGRect(origin: CGPoint(x: x, y: buttonY), size: Self.toolbarButtonSize)
      x += Self.toolbarButtonSize.width + Self.toolbarItemGap
    }

    /**
     CDXC:BrowserPanes 2026-05-02-17:13
     The browser address row should match the reference chrome exactly: React
     Grab, profile, theme, and DevTools live to the right of the URL field.
     Import remains a profile-menu action instead of a fifth always-visible
     toolbar button so the pane chrome does not drift from the expected layout.
     */
    let rightButtons = [reactGrabButton, profileButton, appearanceButton, devToolsButton]
    var rightX = toolbarView.bounds.width - Self.toolbarHorizontalPadding
    for button in rightButtons.reversed() {
      rightX -= Self.toolbarButtonSize.width
      button.frame = CGRect(origin: CGPoint(x: rightX, y: buttonY), size: Self.toolbarButtonSize)
      rightX -= Self.toolbarItemGap
    }

    let addressX = x + 18
    let addressRight = rightX - 14
    let availableAddressWidth = max(0, addressRight - addressX)
    /**
     CDXC:BrowserPanes 2026-05-03-01:58
     The embedded browser URL text must read like toolbar chrome, not a page
     heading. Keep the field compact and vertically centered next to the lock
     icon so long URLs do not dominate the pane.
     */
    let addressHeight: CGFloat = 20
    let addressY = floor((height - addressHeight) / 2)
    securityIcon.frame = CGRect(x: addressX, y: floor((height - 14) / 2), width: 14, height: 14)
    addressField.frame = CGRect(
      x: addressX + 22,
      y: addressY,
      width: max(0, availableAddressWidth - 22),
      height: addressHeight
    )
  }

  private func updateBrowserToolbarState() {
    guard showsBrowserToolbar else {
      return
    }
    backButton.isEnabled = webView.canGoBack
    forwardButton.isEnabled = webView.canGoForward
    reloadButton.toolTip = webView.isLoading ? "Stop Loading" : "Reload"
    let lockSymbol = webView.url?.scheme == "https" ? "lock.fill" : "globe"
    securityIcon.image = NSImage(systemSymbolName: lockSymbol, accessibilityDescription: nil)
    if !isEditingAddress {
      addressField.stringValue = webView.url?.absoluteString ?? addressField.stringValue
    }
  }

  private static func browserPaneNavigationRequest(url: URL) -> URLRequest {
    /**
     CDXC:BrowserPanes 2026-05-03-02:28
     Address-bar navigations create a fresh top-level page, just like restored
     browser panes. Ignore stale local document cache here too so sites that
     vary HTML by user agent do not display old bare-WKWebView markup until the
     user manually reloads.
     */
    URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
  }

  @objc private func goBack() {
    onFocus?()
    if webView.canGoBack {
      webView.goBack()
    }
  }

  @objc private func goForward() {
    onFocus?()
    if webView.canGoForward {
      webView.goForward()
    }
  }

  @objc private func reloadPage() {
    onFocus?()
    if webView.isLoading {
      webView.stopLoading()
    } else {
      webView.reload()
    }
  }

  @objc private func commitAddress() {
    /**
     CDXC:BrowserPanes 2026-05-03-04:36
     Address-bar commits must snapshot the edited text before focusing the pane.
     Focusing can end AppKit field editing and refresh toolbar state from the
     previous WKWebView URL, which made pasted URLs appear accepted but navigate
     back to the old page when Return was pressed.
     */
    let input = addressField.stringValue
    guard let url = Self.url(fromAddressInput: input) else {
      NSSound.beep()
      updateBrowserToolbarState()
      return
    }
    onFocus?()
    NativeT3CodePaneReproLog.append("nativeWorkspace.browserPane.address.commit", [
      "input": input,
      "url": url.absoluteString,
    ])
    addressField.stringValue = url.absoluteString
    webView.load(Self.browserPaneNavigationRequest(url: url))
  }

  @objc private func openDevTools() {
    onOpenDevTools?()
  }

  @objc private func injectReactGrab() {
    onInjectReactGrab?()
  }

  @objc private func showProfilePicker() {
    onShowProfilePicker?()
  }

  @objc private func showAppearanceMenu() {
    onFocus?()
    let menu = NSMenu(title: "Browser Theme")
    for mode in [BrowserPaneThemeMode.system, .light, .dark] {
      let item = NSMenuItem(title: mode.title, action: #selector(selectAppearanceMode(_:)), keyEquivalent: "")
      item.identifier = NSUserInterfaceItemIdentifier(mode.rawValue)
      item.target = self
      item.state = mode == browserThemeMode ? .on : .off
      menu.addItem(item)
    }
    NSMenu.popUpContextMenu(
      menu,
      with: syntheticMenuEvent(),
      for: appearanceButton
    )
  }

  @objc private func selectAppearanceMode(_ sender: NSMenuItem) {
    guard let rawValue = sender.identifier?.rawValue,
      let mode = BrowserPaneThemeMode(rawValue: rawValue)
    else {
      return
    }
    /**
     CDXC:BrowserPanes 2026-05-02-17:32
     The browser theme top-bar control mirrors the reference System/Light/Dark
     menu. Apply the choice directly to the embedded WKWebView so compatible
     pages update in place without replacing the browser pane or using overlay UI.
     */
    browserThemeMode = mode
    switch mode {
    case .system:
      webView.appearance = nil
    case .light:
      webView.appearance = NSAppearance(named: .aqua)
    case .dark:
      webView.appearance = NSAppearance(named: .darkAqua)
    }
    appearanceButton.image = NSImage(systemSymbolName: mode.symbolName, accessibilityDescription: "Browser Theme")
  }

  @objc private func showImportSettings() {
    onShowImportSettings?()
  }

  private static func url(fromAddressInput value: String) -> URL? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      return nil
    }
    if let url = URL(string: trimmed), url.scheme != nil {
      return url
    }
    if trimmed == "localhost" || trimmed.hasPrefix("localhost:") || trimmed.hasPrefix("127.0.0.1") {
      return URL(string: "http://\(trimmed)")
    }
    if trimmed.contains(".") && !trimmed.contains(" ") {
      return URL(string: "https://\(trimmed)")
    }
    var components = URLComponents(string: "https://www.google.com/search")
    components?.queryItems = [URLQueryItem(name: "q", value: trimmed)]
    return components?.url
  }

  private static func makeToolbarButton(
    systemSymbolName: String,
    fallbackTitle: String,
    tooltip: String
  ) -> NSButton {
    let button = NSButton(title: "", target: nil, action: nil)
    button.bezelStyle = .texturedRounded
    button.isBordered = false
    button.imagePosition = .imageOnly
    button.toolTip = tooltip
    button.contentTintColor = NSColor(calibratedWhite: 0.86, alpha: 0.82)
    button.focusRingType = .none
    if let image = NSImage(systemSymbolName: systemSymbolName, accessibilityDescription: tooltip) {
      button.image = image
    } else {
      button.title = fallbackTitle
      button.font = NSFont.systemFont(ofSize: 12, weight: .semibold)
    }
    return button
  }

  private func syntheticMenuEvent() -> NSEvent {
    if let currentEvent = NSApp.currentEvent {
      return currentEvent
    }
    return NSEvent.mouseEvent(
      with: .rightMouseDown,
      location: NSEvent.mouseLocation,
      modifierFlags: [],
      timestamp: ProcessInfo.processInfo.systemUptime,
      windowNumber: window?.windowNumber ?? 0,
      context: nil,
      eventNumber: 0,
      clickCount: 1,
      pressure: 1
    )!
  }

  private static func describeFrame(_ frame: CGRect) -> [String: Double] {
    [
      "height": Double(frame.height),
      "width": Double(frame.width),
      "x": Double(frame.minX),
      "y": Double(frame.minY),
    ]
  }
}

private final class TerminalWorkspacePaneResizeHandleView: NSView {
  var onMouseDown: ((NSEvent) -> Void)?
  var onMouseDragged: ((NSEvent) -> Void)?
  var onMouseUp: ((NSEvent) -> Void)?
  private var cursor: NSCursor = .arrow
  private var hoverTrackingArea: NSTrackingArea?

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    wantsLayer = true
    layer?.backgroundColor = NSColor.clear.cgColor
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  func configure(cursor: NSCursor) {
    if self.cursor !== cursor {
      self.cursor = cursor
      window?.invalidateCursorRects(for: self)
    }
  }

  override func hitTest(_ point: NSPoint) -> NSView? {
    bounds.contains(point) ? self : nil
  }

  override func resetCursorRects() {
    super.resetCursorRects()
    addCursorRect(bounds, cursor: cursor)
  }

  override func updateTrackingAreas() {
    super.updateTrackingAreas()
    if let hoverTrackingArea {
      removeTrackingArea(hoverTrackingArea)
    }
    let trackingArea = NSTrackingArea(
      rect: .zero,
      options: [.activeInKeyWindow, .cursorUpdate, .inVisibleRect, .mouseEnteredAndExited, .mouseMoved],
      owner: self,
      userInfo: nil
    )
    hoverTrackingArea = trackingArea
    addTrackingArea(trackingArea)
  }

  override func cursorUpdate(with event: NSEvent) {
    cursor.set()
  }

  override func mouseEntered(with event: NSEvent) {
    cursor.set()
  }

  override func mouseMoved(with event: NSEvent) {
    cursor.set()
  }

  override func mouseExited(with event: NSEvent) {
    NSCursor.arrow.set()
  }

  override func mouseDown(with event: NSEvent) {
    onMouseDown?(event)
  }

  override func mouseDragged(with event: NSEvent) {
    onMouseDragged?(event)
  }

  override func mouseUp(with event: NSEvent) {
    onMouseUp?(event)
  }
}

final class TerminalPaneBorderView: NSView {
  private enum BorderState: Equatable {
    case attention
    case focused
    case none
  }

  private static let focusedBorderColor = NSColor(
    calibratedRed: 0x5A / 255,
    green: 0x86 / 255,
    blue: 0xFF / 255,
    alpha: 0.95
  ).cgColor
  private static let attentionBorderColor = NSColor(
    calibratedRed: 0x65 / 255,
    green: 0xE5 / 255,
    blue: 0x8A / 255,
    alpha: 1
  ).cgColor
  private static let bottomRightCornerRadius: CGFloat = 12
  private static let borderWidth: CGFloat = 2

  private var isBottomRightCornerRounded = false
  private var state: BorderState = .none

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    wantsLayer = true
    layer?.backgroundColor = NSColor.clear.cgColor
    layer?.borderWidth = 0
    layer?.cornerRadius = 0
    layer?.masksToBounds = false
    layer?.shadowRadius = 16
    layer?.shadowOffset = .zero
    layer?.shadowOpacity = 0
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override func hitTest(_ point: NSPoint) -> NSView? {
    nil
  }

  override func draw(_ dirtyRect: NSRect) {
    super.draw(dirtyRect)
    guard let borderColor = currentBorderColor() else {
      return
    }

    let path = borderPath(in: bounds)
    borderColor.setStroke()
    path.lineWidth = Self.borderWidth
    path.stroke()
  }

  func setBottomRightCornerRounded(_ isRounded: Bool) {
    /**
     CDXC:NativePaneChrome 2026-05-04-06:26
     The active/done pane border must have a real rounded visual bottom-right
     corner. Draw the transparent native overlay's border path directly instead
     of relying on CALayer's single-corner border masking. In this unflipped
     AppKit view, the visible bottom-right border corner is max-X/min-Y.
     Use a larger radius so the corner is visibly rounded at the pane edge.
     */
    guard isBottomRightCornerRounded != isRounded else {
      return
    }
    isBottomRightCornerRounded = isRounded
    needsDisplay = true
  }

  func setState(isFocused: Bool, isAttention: Bool) {
    /**
     CDXC:NativeSessionStatus 2026-04-27-08:02
     Native Ghostty panes are outside the React workspace DOM. Mirror the
     existing workspace UX with a blue selected border and a green border for
     done/attention sessions, without stealing terminal input.
     */
    let nextState: BorderState = isAttention ? .attention : isFocused ? .focused : .none
    guard nextState != state else {
      return
    }
    state = nextState
    switch nextState {
    case .attention:
      layer?.shadowColor = Self.attentionBorderColor
      layer?.shadowOpacity = 0.28
    case .focused:
      layer?.shadowColor = Self.focusedBorderColor
      layer?.shadowOpacity = 0.18
    case .none:
      layer?.shadowOpacity = 0
    }
    needsDisplay = true
  }

  private func currentBorderColor() -> NSColor? {
    switch state {
    case .attention:
      return NSColor(cgColor: Self.attentionBorderColor)
    case .focused:
      return NSColor(cgColor: Self.focusedBorderColor)
    case .none:
      return nil
    }
  }

  private func borderPath(in bounds: CGRect) -> NSBezierPath {
    let inset = Self.borderWidth / 2
    let rect = bounds.insetBy(dx: inset, dy: inset)
    let radius = isBottomRightCornerRounded
      ? min(Self.bottomRightCornerRadius, rect.width / 2, rect.height / 2)
      : 0
    let path = NSBezierPath()
    path.move(to: CGPoint(x: rect.minX, y: rect.minY))
    path.line(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
    if radius > 0 {
      path.curve(
        to: CGPoint(x: rect.maxX, y: rect.minY + radius),
        controlPoint1: CGPoint(x: rect.maxX - radius * 0.4477, y: rect.minY),
        controlPoint2: CGPoint(x: rect.maxX, y: rect.minY + radius * 0.4477)
      )
    }
    path.line(to: CGPoint(x: rect.maxX, y: rect.maxY))
    path.line(to: CGPoint(x: rect.minX, y: rect.maxY))
    path.close()
    return path
  }
}
