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
    let searchBarView: TerminalSearchBarView
    let titleBarView: TerminalSessionTitleBarView
    let borderView: TerminalPaneBorderView
    var foregroundPid: Int?
    var ttyName: String?
    var cancellables: Set<AnyCancellable> = []
  }

  private static let terminalTitleBarHeight: CGFloat = 33
  private static let defaultPaneGap: CGFloat = 12
  private static let singlePaneInset: CGFloat = 1
  private static let defaultWorkspaceBackgroundColor = NSColor(
    calibratedRed: 0.071, green: 0.071, blue: 0.071, alpha: 1)
  private let ghostty: Ghostty.App
  private let sendEvent: (HostEvent) -> Void
  private var sessions: [String: TerminalSession] = [:]
  private var activeSessionIds = Set<String>()
  private var attentionSessionIds = Set<String>()
  private var sessionActivities = [String: NativeTerminalActivity]()
  private var focusedSessionId: String?
  private var lastEmittedFocusedSessionId: String?
  private var paneGap = TerminalWorkspaceView.defaultPaneGap
  private var programmaticFocusDepth = 0
  private var terminalLayout: NativeTerminalLayout?
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
    let searchBarView = TerminalSearchBarView(surfaceView: surfaceView)
    searchBarView.translatesAutoresizingMaskIntoConstraints = false
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
      searchBarView: searchBarView,
      titleBarView: titleBarView,
      borderView: borderView,
      foregroundPid: nil,
      ttyName: nil)
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
    activeSessionIds.insert(command.sessionId)
    addSubview(scrollView)
    addSubview(searchBarView)
    addSubview(titleBarView)
    addSubview(borderView)
    terminalLayout = terminalLayout ?? .leaf(sessionId: command.sessionId)
    needsLayout = true
    focusTerminal(sessionId: command.sessionId, reason: "createTerminalNew")

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
  }

  func closeTerminal(sessionId: String) {
    guard let session = sessions.removeValue(forKey: sessionId) else {
      return
    }
    activeSessionIds.remove(sessionId)
    sessionActivities.removeValue(forKey: sessionId)
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
    sessionActivities = command.sessionActivities ?? [:]
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
      if !activeSessionIds.contains(session.sessionId) {
        moveOffscreen(session.scrollView)
        moveOffscreen(session.searchBarView)
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
      layoutTree(terminalLayout, in: layoutBounds(forVisibleCount: visibleSessionIds.count))
    } else {
      layoutGrid(visibleSessionIds, in: layoutBounds(forVisibleCount: visibleSessionIds.count))
    }
  }

  private func layoutBounds(forVisibleCount visibleCount: Int) -> CGRect {
    let inset = visibleCount <= 1 ? Self.singlePaneInset : paneGap
    return bounds.insetBy(dx: inset, dy: inset)
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
      /**
       CDXC:WorkspaceLayout 2026-04-28-06:01
       Native split panes must use the same Pane Gap setting as the sidebar
       control. Apply the gap as real AppKit layout space between split
       siblings instead of hardcoded 1px child insets.
       */
      let gap = splitGap(forChildCount: visibleChildren.count)
      let firstRatio = CGFloat(ratio ?? (1.0 / Double(visibleChildren.count)))
      var nextOrigin = direction == .horizontal ? rect.minX : rect.maxY
      let availableLength = max(
        (direction == .horizontal ? rect.width : rect.height)
          - gap * CGFloat(max(visibleChildren.count - 1, 0)),
        CGFloat(visibleChildren.count)
      )
      for (index, child) in visibleChildren.enumerated() {
        let isLast = index == visibleChildren.count - 1
        let childLength: CGFloat
        if isLast {
          childLength =
            direction == .horizontal
            ? max(rect.maxX - nextOrigin, 1)
            : max(nextOrigin - rect.minY, 1)
        } else {
          childLength = max(floor(availableLength * firstRatio), 1)
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
        layoutTree(child, in: childRect)
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
    let availableTerminalRect = CGRect(
      x: rect.minX,
      y: rect.minY,
      width: rect.width,
      height: max(rect.height - titleBarHeight, 1)
    )
    let terminalRect = steppedTerminalRect(availableTerminalRect, for: session.view)
    session.titleBarView.frame = titleBarRect
    session.titleBarView.needsLayout = true
    session.titleBarView.layoutSubtreeIfNeeded()
    session.scrollView.frame = terminalRect
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

  private func steppedTerminalRect(_ rect: CGRect, for surfaceView: Ghostty.SurfaceView) -> CGRect {
    /**
     CDXC:NativeTerminalResize 2026-04-29-08:00
     Embedded Ghostty panes should resize like Ghostty windows with
     `window-step-resize`: terminal content advances in whole character-cell
     increments, but Ghostty subtracts effective terminal padding before
     computing PTY rows and columns. Step the whole surface to
     `padding + N * cellSize` so TUIs such as Claude Code receive the same
     grid size that a real Ghostty window would report during resize.
     */
    let cellSize = surfaceView.cellSize
    guard cellSize.width > 0, cellSize.height > 0, let surface = surfaceView.surface else {
      return rect
    }
    let padding = ghostty_surface_padding(surface)
    let totalPadding = surfaceView.convertFromBacking(
      NSSize(
        width: Double(padding.left_px + padding.right_px),
        height: Double(padding.top_px + padding.bottom_px)))
    let steppedWidth = steppedTerminalLength(
      available: rect.width,
      cell: cellSize.width,
      padding: totalPadding.width)
    let steppedHeight = steppedTerminalLength(
      available: rect.height,
      cell: cellSize.height,
      padding: totalPadding.height)
    return CGRect(
      x: rect.minX,
      y: rect.maxY - steppedHeight,
      width: min(steppedWidth, rect.width),
      height: min(steppedHeight, rect.height)
    )
  }

  private func steppedTerminalLength(available: CGFloat, cell: CGFloat, padding: CGFloat) -> CGFloat {
    guard available > 1, cell > 0, padding >= 0, available > padding else {
      return max(available, 1)
    }
    let cells = max(floor((available - padding) / cell), 1)
    return max(min(padding + cells * cell, available), 1)
  }

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
  }

  private func updateTerminalBorder(for sessionId: String) {
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
