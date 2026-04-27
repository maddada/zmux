import AppKit
import Combine
import GhosttyKit
import QuartzCore

@MainActor
final class TerminalWorkspaceView: NSView {
    private struct TerminalSession {
        let sessionId: String
        let view: Ghostty.SurfaceView
        let borderView: TerminalPaneBorderView
        var cancellables: Set<AnyCancellable> = []
    }

    private let ghostty: Ghostty.App
    private let sendEvent: (HostEvent) -> Void
    private var sessions: [String: TerminalSession] = [:]
    private var activeSessionIds = Set<String>()
    private var attentionSessionIds = Set<String>()
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
            sendEvent(.terminalError(sessionId: command.sessionId, message: "Ghostty runtime is not ready"))
            return
        }

        var config = Ghostty.SurfaceConfiguration()
        config.workingDirectory = command.cwd
        config.environmentVariables = command.env ?? [:]
        config.initialInput = command.initialInput
        let surfaceView = Ghostty.SurfaceView(app, baseConfig: config)
        surfaceView.translatesAutoresizingMaskIntoConstraints = false
        let borderView = TerminalPaneBorderView()
        borderView.translatesAutoresizingMaskIntoConstraints = false

        var session = TerminalSession(sessionId: command.sessionId, view: surfaceView, borderView: borderView)
        surfaceView.$title
            .removeDuplicates()
            .sink { [weak self] title in
                guard !title.isEmpty else { return }
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
        addSubview(surfaceView)
        addSubview(borderView)
        terminalLayout = terminalLayout ?? .leaf(sessionId: command.sessionId)
        needsLayout = true
        focusTerminal(sessionId: command.sessionId, reason: "createTerminalNew")

        sendEvent(.terminalReady(
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
        if let surface = session.view.surface {
            ghostty.requestClose(surface: surface)
        }
        session.view.removeFromSuperview()
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
            TerminalFocusDebugLog.append(event: "nativeWorkspace.focusTerminal.missingSession", details: [
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
        TerminalFocusDebugLog.append(event: "nativeWorkspace.focusTerminal.completed", details: [
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
            TerminalFocusDebugLog.append(event: "nativeWorkspace.windowFirstResponderChanged.programmaticSkipped", details: [
                "programmaticFocusDepth": programmaticFocusDepth,
                "reason": reason,
                "responder": responder.map { String(describing: type(of: $0)) } ?? "nil",
            ])
            return
        }
        guard let responder else {
            TerminalFocusDebugLog.append(event: "nativeWorkspace.windowFirstResponderChanged.nil", details: [
                "lastEmittedFocusedSessionId": nullableString(lastEmittedFocusedSessionId),
                "reason": reason,
            ])
            return
        }
        emitFocusedSessionIfNeeded(for: responder, reason: reason)
    }

    func writeTerminalText(sessionId: String, text: String) {
        TerminalFocusDebugLog.append(event: "nativeWorkspace.writeTerminalText", details: [
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
            TerminalFocusDebugLog.append(event: "nativeWorkspace.sendTerminalEnter.missingSession", details: [
                "activeSessionIds": Array(activeSessionIds).sorted(),
                "requestedSessionId": sessionId,
                "responderBefore": responderSnapshot(),
                "visibleSessionIds": orderedVisibleSessionIds(),
            ])
            return
        }
        TerminalFocusDebugLog.append(event: "nativeWorkspace.sendTerminalEnter.start", details: [
            "activeSessionIds": Array(activeSessionIds).sorted(),
            "requestedSessionId": sessionId,
            "responderBefore": responderSnapshot(),
            "visibleSessionIds": orderedVisibleSessionIds(),
        ])
        focusTerminal(sessionId: sessionId, reason: "sendTerminalEnter")
        guard let event = NSEvent.keyEvent(
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
        ) else {
            TerminalFocusDebugLog.append(event: "nativeWorkspace.sendTerminalEnter.eventCreationFailed", details: [
                "requestedSessionId": sessionId,
                "responderAfterFocus": responderSnapshot(),
            ])
            return
        }
        view.keyDown(with: event)
        TerminalFocusDebugLog.append(event: "nativeWorkspace.sendTerminalEnter.sent", details: [
            "requestedSessionId": sessionId,
            "responderAfter": responderSnapshot(),
        ])
    }

    func setTerminalLayout(_ nextLayout: NativeTerminalLayout) {
        TerminalFocusDebugLog.append(event: "nativeWorkspace.setTerminalLayout", details: [
            "activeSessionIds": Array(activeSessionIds).sorted(),
            "responderBefore": responderSnapshot(),
            "visibleSessionIds": orderedVisibleSessionIds(),
        ])
        terminalLayout = nextLayout
        needsLayout = true
    }

    func setTerminalVisibility(sessionId: String, visible: Bool) {
        guard let session = sessions[sessionId] else {
            TerminalFocusDebugLog.append(event: "nativeWorkspace.setTerminalVisibility.missingSession", details: [
                "activeSessionIds": Array(activeSessionIds).sorted(),
                "requestedSessionId": sessionId,
                "responderBefore": responderSnapshot(),
                "visible": visible,
            ])
            return
        }
        TerminalFocusDebugLog.append(event: "nativeWorkspace.setTerminalVisibility", details: [
            "activeSessionIdsBefore": Array(activeSessionIds).sorted(),
            "requestedSessionId": sessionId,
            "responderBefore": responderSnapshot(),
            "visible": visible,
        ])
        if visible {
            activeSessionIds.insert(sessionId)
        } else {
            activeSessionIds.remove(sessionId)
            moveOffscreen(session.view)
            moveOffscreen(session.borderView)
        }
        session.view.isHidden = false
        session.borderView.isHidden = !visible
        needsLayout = true
        updateTerminalBorder(for: sessionId)
    }

    func setActiveTerminalSet(_ command: SetActiveTerminalSet) {
        let responderBefore = responderSnapshot()
        activeSessionIds = Set(command.activeSessionIds)
        attentionSessionIds = Set(command.attentionSessionIds ?? [])
        focusedSessionId = command.focusedSessionId
        terminalLayout = command.layout
        for session in sessions.values {
            session.view.isHidden = false
            session.borderView.isHidden = false
            if !activeSessionIds.contains(session.sessionId) {
                moveOffscreen(session.view)
                moveOffscreen(session.borderView)
            }
        }
        needsLayout = true
        layoutSubtreeIfNeeded()
        updateAllTerminalBorders()
        TerminalFocusDebugLog.append(event: "nativeWorkspace.setActiveTerminalSet.applied", details: [
            "activeSessionIds": Array(activeSessionIds).sorted(),
            "attentionSessionIds": Array(attentionSessionIds).sorted(),
            "focusedSessionId": nullableString(command.focusedSessionId),
            "responderAfterLayout": responderSnapshot(),
            "responderBefore": responderBefore,
            "visibleSessionIds": orderedVisibleSessionIds(),
        ])
        if let focusedSessionId = command.focusedSessionId,
           activeSessionIds.contains(focusedSessionId) {
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
        case let .leaf(sessionId):
            setFrame(rect, for: sessionId)
        case let .split(direction, ratio, children):
            let visibleChildren = children.filter { !leafSessionIds($0).allSatisfy { !activeSessionIds.contains($0) } }
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
                    childRect = CGRect(x: remaining.minX, y: remaining.minY, width: width, height: remaining.height)
                    remaining = remaining.divided(atDistance: width, from: .minXEdge).remainder
                } else {
                    let height = isLast ? remaining.height : floor(rect.height * firstRatio)
                    childRect = CGRect(x: remaining.minX, y: remaining.maxY - height, width: remaining.width, height: height)
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
        let view = session.view
        view.frame = rect
        view.sizeDidChange(rect.size)
        session.borderView.frame = rect
        updateTerminalBorder(for: sessionId)
    }

    private func moveOffscreen(_ view: Ghostty.SurfaceView) {
        moveOffscreen(view as NSView)
    }

    private func moveOffscreen(_ view: NSView) {
        let size = view.frame.size.width > 1 && view.frame.size.height > 1
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
        session.borderView.isHidden = !isActive
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
            TerminalFocusDebugLog.append(event: "nativeWorkspace.focusedResponderIgnored", details: [
                "reason": reason,
                "responder": String(describing: type(of: responder)),
            ])
            return
        }
        guard activeSessionIds.contains(focusedSessionId) else {
            TerminalFocusDebugLog.append(event: "nativeWorkspace.focusedInactiveSessionIgnored", details: [
                "activeSessionIds": Array(activeSessionIds).sorted(),
                "reason": reason,
                "sessionId": focusedSessionId,
            ])
            return
        }
        if lastEmittedFocusedSessionId == focusedSessionId {
            TerminalFocusDebugLog.append(event: "nativeWorkspace.terminalFocused.duplicateSkipped", details: [
                "reason": reason,
                "sessionId": focusedSessionId,
            ])
            return
        }
        lastEmittedFocusedSessionId = focusedSessionId
        self.focusedSessionId = focusedSessionId
        updateAllTerminalBorders()
        TerminalFocusDebugLog.append(event: "nativeWorkspace.terminalFocused.emitted", details: [
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
        String(text.replacingOccurrences(of: "\r", with: "\\r")
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
        case let .leaf(sessionId):
            return [sessionId]
        case let .split(_, _, children):
            return children.flatMap(leafSessionIds)
        }
    }

    private func prunedLayout(removing sessionId: String, from node: NativeTerminalLayout?) -> NativeTerminalLayout? {
        guard let node else { return nil }
        switch node {
        case let .leaf(existingSessionId):
            return existingSessionId == sessionId ? nil : node
        case let .split(direction, ratio, children):
            let nextChildren = children.compactMap { prunedLayout(removing: sessionId, from: $0) }
            if nextChildren.count == 1 {
                return nextChildren[0]
            }
            return nextChildren.isEmpty ? nil : .split(direction: direction, ratio: ratio, children: nextChildren)
        }
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
