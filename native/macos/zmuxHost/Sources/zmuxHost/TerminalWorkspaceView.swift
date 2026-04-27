import AppKit
import Combine
import GhosttyKit
import QuartzCore

@MainActor
final class TerminalWorkspaceView: NSView {
  private struct TerminalSession {
    let sessionId: String
    let view: Ghostty.SurfaceView
    let scrollView: SurfaceScrollView
    let titleBarView: TerminalSessionTitleBarView
    let borderView: TerminalPaneBorderView
    var cancellables: Set<AnyCancellable> = []
  }

  private static let terminalTitleBarHeight: CGFloat = 33
  private let ghostty: Ghostty.App
  private let sendEvent: (HostEvent) -> Void
  private var sessions: [String: TerminalSession] = [:]
  private var activeSessionIds = Set<String>()
  private var attentionSessionIds = Set<String>()
  private var sessionActivities = [String: NativeTerminalActivity]()
  private var focusedSessionId: String?
  private var lastEmittedFocusedSessionId: String?
  private var programmaticFocusDepth = 0
  private var terminalLayout: NativeTerminalLayout?
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
    layer?.backgroundColor = NSColor.black.cgColor
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  func createTerminal(_ command: CreateTerminal) {
    if sessions[command.sessionId] != nil {
      focusTerminal(sessionId: command.sessionId, reason: "createTerminalExisting")
      if let initialInput = command.initialInput, !initialInput.isEmpty {
        writeTerminalText(sessionId: command.sessionId, text: initialInput)
      }
      return
    }

    guard let app = ghostty.app else {
      sendEvent(
        .terminalError(sessionId: command.sessionId, message: "Ghostty runtime is not ready"))
      return
    }

    var config = Ghostty.SurfaceConfiguration()
    config.workingDirectory = command.cwd
    config.environmentVariables = command.env ?? [:]
    config.initialInput = command.initialInput
    let surfaceView = ZmuxGhosttySurfaceView(app, baseConfig: config)
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
    let titleBarView = TerminalSessionTitleBarView(
      title: normalizedTerminalSessionTitle(command.title, sessionId: command.sessionId)
    )
    titleBarView.translatesAutoresizingMaskIntoConstraints = false
    titleBarView.onMouseDown = { [weak self] in
      self?.focusTerminal(sessionId: command.sessionId, reason: "nativeTitleBarMouseDown")
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
      titleBarView: titleBarView,
      borderView: borderView)
    surfaceView.$title
      .removeDuplicates()
      .sink { [weak self] title in
        guard !title.isEmpty else { return }
        self?.sessions[command.sessionId]?.titleBarView.setTitle(
          normalizedTerminalSessionTitle(title, sessionId: command.sessionId)
        )
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

    sessions[command.sessionId] = session
    activeSessionIds.insert(command.sessionId)
    addSubview(scrollView)
    addSubview(titleBarView)
    addSubview(borderView)
    terminalLayout = terminalLayout ?? .leaf(sessionId: command.sessionId)
    needsLayout = true
    focusTerminal(sessionId: command.sessionId, reason: "createTerminalNew")

    sendEvent(
      .terminalReady(
        sessionId: command.sessionId,
        ttyName: surfaceView.surfaceModel?.ttyName,
        foregroundPid: surfaceView.surfaceModel?.foregroundPID
      ))
    sendEvent(.terminalCwdChanged(sessionId: command.sessionId, cwd: command.cwd))
    startExitPollingIfNeeded()
  }

  func closeTerminal(sessionId: String) {
    guard let session = sessions.removeValue(forKey: sessionId) else {
      return
    }
    activeSessionIds.remove(sessionId)
    sessionActivities.removeValue(forKey: sessionId)
    if let surface = session.view.surface {
      ghostty.requestClose(surface: surface)
    }
    session.scrollView.removeFromSuperview()
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
      moveOffscreen(session.titleBarView)
      moveOffscreen(session.borderView)
    }
    session.scrollView.isHidden = false
    session.titleBarView.isHidden = !visible
    session.borderView.isHidden = !visible
    needsLayout = true
    updateTerminalBorder(for: sessionId)
  }

  func setActiveTerminalSet(_ command: SetActiveTerminalSet) {
    let responderBefore = responderSnapshot()
    activeSessionIds = Set(command.activeSessionIds)
    attentionSessionIds = Set(command.attentionSessionIds ?? [])
    sessionActivities = command.sessionActivities ?? [:]
    focusedSessionId = command.focusedSessionId
    terminalLayout = command.layout
    for session in sessions.values {
      session.scrollView.isHidden = false
      session.titleBarView.isHidden = false
      session.borderView.isHidden = false
      if !activeSessionIds.contains(session.sessionId) {
        moveOffscreen(session.scrollView)
        moveOffscreen(session.titleBarView)
        moveOffscreen(session.borderView)
      }
    }
    needsLayout = true
    layoutSubtreeIfNeeded()
    updateAllTerminalBorders()
    TerminalFocusDebugLog.append(
      event: "nativeWorkspace.setActiveTerminalSet.applied",
      details: [
        "activeSessionIds": Array(activeSessionIds).sorted(),
        "attentionSessionIds": Array(attentionSessionIds).sorted(),
        "focusedSessionId": nullableString(command.focusedSessionId),
        "responderAfterLayout": responderSnapshot(),
        "responderBefore": responderBefore,
        "visibleSessionIds": orderedVisibleSessionIds(),
      ])
    if let focusedSessionId = command.focusedSessionId,
      activeSessionIds.contains(focusedSessionId)
    {
      focusTerminal(sessionId: focusedSessionId, reason: "setActiveTerminalSet")
    }
  }

  override func layout() {
    super.layout()
    let visibleSessionIds = orderedVisibleSessionIds()
    guard !visibleSessionIds.isEmpty else {
      return
    }
    if let terminalLayout {
      layoutTree(terminalLayout, in: bounds)
    } else {
      layoutGrid(visibleSessionIds, in: bounds)
    }
  }

  private func orderedVisibleSessionIds() -> [String] {
    let fromLayout = terminalLayout.map(leafSessionIds) ?? Array(sessions.keys)
    return fromLayout.filter { activeSessionIds.contains($0) }
  }

  private func layoutTree(_ node: NativeTerminalLayout, in rect: CGRect) {
    switch node {
    case .leaf(let sessionId):
      setFrame(rect, for: sessionId)
    case .split(let direction, let ratio, let children):
      let visibleChildren = children.filter {
        !leafSessionIds($0).allSatisfy { !activeSessionIds.contains($0) }
      }
      guard !visibleChildren.isEmpty else { return }
      if visibleChildren.count == 1 {
        layoutTree(visibleChildren[0], in: rect)
        return
      }
      let firstRatio = CGFloat(ratio ?? (1.0 / Double(visibleChildren.count)))
      var remaining = rect
      for (index, child) in visibleChildren.enumerated() {
        let isLast = index == visibleChildren.count - 1
        let childRect: CGRect
        if direction == .horizontal {
          let width = isLast ? remaining.width : floor(rect.width * firstRatio)
          childRect = CGRect(
            x: remaining.minX, y: remaining.minY, width: width, height: remaining.height)
          remaining = remaining.divided(atDistance: width, from: .minXEdge).remainder
        } else {
          let height = isLast ? remaining.height : floor(rect.height * firstRatio)
          childRect = CGRect(
            x: remaining.minX, y: remaining.maxY - height, width: remaining.width, height: height)
          remaining.size.height -= height
        }
        layoutTree(child, in: childRect.insetBy(dx: 1, dy: 1))
      }
    }
  }

  private func layoutGrid(_ sessionIds: [String], in rect: CGRect) {
    let columns = Int(ceil(sqrt(Double(sessionIds.count))))
    let rows = Int(ceil(Double(sessionIds.count) / Double(columns)))
    let cellWidth = rect.width / CGFloat(columns)
    let cellHeight = rect.height / CGFloat(rows)
    for (index, sessionId) in sessionIds.enumerated() {
      let column = index % columns
      let row = index / columns
      let cell = CGRect(
        x: rect.minX + CGFloat(column) * cellWidth,
        y: rect.maxY - CGFloat(row + 1) * cellHeight,
        width: cellWidth,
        height: cellHeight
      )
      setFrame(cell.insetBy(dx: 1, dy: 1), for: sessionId)
    }
  }

  private func setFrame(_ rect: CGRect, for sessionId: String) {
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
    let terminalRect = CGRect(
      x: rect.minX,
      y: rect.minY,
      width: rect.width,
      height: max(rect.height - titleBarHeight, 1)
    )
    session.titleBarView.frame = titleBarRect
    session.titleBarView.needsLayout = true
    session.titleBarView.layoutSubtreeIfNeeded()
    session.scrollView.frame = terminalRect
    session.view.sizeDidChange(terminalRect.size)
    session.scrollView.needsLayout = true
    session.scrollView.layoutSubtreeIfNeeded()
    session.borderView.frame = rect
    updateTerminalBorder(for: sessionId)
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
  }

  private func updateTerminalBorder(for sessionId: String) {
    guard let session = sessions[sessionId] else {
      return
    }
    let isActive = activeSessionIds.contains(sessionId)
    session.titleBarView.isHidden = !isActive
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

  private func sessionId(containing responder: NSResponder) -> String? {
    guard let responderView = responder as? NSView else {
      return sessions.first { _, session in responder === session.view }?.key
    }
    for (sessionId, session) in sessions {
      if responderView === session.view || responderView.isDescendant(of: session.view) {
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

  private func summarizeTerminalText(_ text: String) -> String {
    String(
      text.replacingOccurrences(of: "\r", with: "\\r")
        .replacingOccurrences(of: "\n", with: "\\n")
        .prefix(160))
  }

  private func nullableString(_ value: String?) -> Any {
    value ?? NSNull()
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

private func normalizedTerminalSessionTitle(_ title: String?, sessionId: String) -> String {
  let trimmedTitle = title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  return trimmedTitle.isEmpty ? sessionId : trimmedTitle
}

private final class ZmuxGhosttySurfaceView: Ghostty.SurfaceView {
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

  private let titleLabel = NSTextField(labelWithString: "")
  private let activityIndicatorView = NSView(frame: .zero)
  private let bottomBorderView = NSView(frame: .zero)
  private let actionButtons: [(action: TerminalTitleBarAction, button: NSButton)]
  private var activity: NativeTerminalActivity?
  var onMouseDown: (() -> Void)?
  var onAction: ((TerminalTitleBarAction) -> Void)?

  override var isFlipped: Bool {
    true
  }

  init(title: String) {
    actionButtons = [
      (.rename, Self.makeActionButton(systemSymbolName: "pencil", fallbackTitle: "R", tooltip: "Rename Session")),
      (.fork, Self.makeActionButton(systemSymbolName: "arrow.triangle.branch", fallbackTitle: "F", tooltip: "Fork Session")),
      (.reload, Self.makeActionButton(systemSymbolName: "arrow.clockwise", fallbackTitle: "R", tooltip: "Reload Session")),
      (.sleep, Self.makeActionButton(systemSymbolName: "moon", fallbackTitle: "S", tooltip: "Sleep Session")),
      (.close, Self.makeActionButton(systemSymbolName: "xmark", fallbackTitle: "X", tooltip: "Close Session")),
    ]
    super.init(frame: .zero)
    wantsLayer = true
    layer?.backgroundColor = Self.backgroundColor
    layer?.borderColor = Self.borderColor
    layer?.borderWidth = 0

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
    onMouseDown?()
    super.mouseDown(with: event)
  }

  override func layout() {
    super.layout()
    let insetX: CGFloat = 10
    let buttonSize: CGFloat = 20
    let buttonGap: CGFloat = 6
    let indicatorSize: CGFloat = 8
    let indicatorGap: CGFloat = 6
    let centerY = floor((bounds.height - buttonSize) / 2)
    var trailingX = bounds.width - insetX

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
    let titleTrailing = trailingX
    let maxTitleWidth = max(
      titleTrailing - insetX - (activity == nil ? 2 : indicatorSize + indicatorGap + 2),
      0
    )
    let titleWidth = min(ceil(titleLabel.intrinsicContentSize.width), maxTitleWidth)
    titleLabel.frame = CGRect(
      x: insetX,
      y: floor((bounds.height - 16) / 2),
      width: titleWidth,
      height: 16
    )
    activityIndicatorView.frame = CGRect(
      x: titleLabel.frame.maxX + indicatorGap,
      y: floor((bounds.height - indicatorSize) / 2),
      width: indicatorSize,
      height: indicatorSize
    )
    bottomBorderView.frame = CGRect(x: 0, y: bounds.height - 1, width: bounds.width, height: 1)
  }

  func setTitle(_ title: String) {
    if titleLabel.stringValue != title {
      titleLabel.stringValue = title
    }
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

final class TerminalPaneBorderView: NSView {
  private enum BorderState: Equatable {
    case attention
    case focused
    case none
  }

  private static let pulseAnimationKey = "zmux-terminal-attention-border-pulse"
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
  private static let attentionDimBorderColor = NSColor(
    calibratedRed: 0x65 / 255,
    green: 0xE5 / 255,
    blue: 0x8A / 255,
    alpha: 0.34
  ).cgColor

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

  func setState(isFocused: Bool, isAttention: Bool) {
    /**
     CDXC:NativeSessionStatus 2026-04-27-08:02
     Native Ghostty panes are outside the React workspace DOM. Mirror the
     existing workspace UX with a blue selected border and a pulsing green
     border for done/attention sessions, without stealing terminal input.
     */
    let nextState: BorderState = isAttention ? .attention : isFocused ? .focused : .none
    guard nextState != state else {
      return
    }
    state = nextState
    switch nextState {
    case .attention:
      layer?.borderWidth = 2
      layer?.borderColor = Self.attentionBorderColor
      layer?.shadowColor = Self.attentionBorderColor
      layer?.shadowOpacity = 0.28
      startAttentionPulse()
    case .focused:
      stopAttentionPulse()
      layer?.borderWidth = 2
      layer?.borderColor = Self.focusedBorderColor
      layer?.shadowColor = Self.focusedBorderColor
      layer?.shadowOpacity = 0.18
    case .none:
      stopAttentionPulse()
      layer?.borderWidth = 0
      layer?.borderColor = NSColor.clear.cgColor
      layer?.shadowOpacity = 0
    }
  }

  private func startAttentionPulse() {
    guard layer?.animation(forKey: Self.pulseAnimationKey) == nil else {
      return
    }
    let animation = CABasicAnimation(keyPath: "borderColor")
    animation.fromValue = Self.attentionDimBorderColor
    animation.toValue = Self.attentionBorderColor
    animation.duration = 0.72
    animation.autoreverses = true
    animation.repeatCount = .infinity
    animation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    layer?.add(animation, forKey: Self.pulseAnimationKey)
  }

  private func stopAttentionPulse() {
    layer?.removeAnimation(forKey: Self.pulseAnimationKey)
  }
}
