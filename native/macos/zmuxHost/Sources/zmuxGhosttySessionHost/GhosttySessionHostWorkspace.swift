import AppKit
import Combine
import GhosttyKit

/**
 CDXC:NativeTerminalSurvival 2026-04-27-23:45
 Helper-owned terminal windows are borderless because zmux supplies the chrome,
 but they must still become key/main windows. Without this, AppKit can show the
 real Ghostty surface while refusing keyboard focus after a restart/reconnect.
 */
private final class GhosttyTerminalWindow: NSWindow {
    var sessionId: String?
    var onBecameKey: ((String) -> Void)?

    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }

    override func becomeKey() {
        super.becomeKey()
        if let sessionId {
            onBecameKey?(sessionId)
        }
    }
}

@MainActor
final class GhosttySessionHostWorkspace {
    private struct TerminalSession {
        let sessionId: String
        let view: Ghostty.SurfaceView
        let window: NSWindow
        let borderView: NativeGhosttyTerminalBorderView
        var cancellables: Set<AnyCancellable> = []
        var isActive = true
        var isVisible = true
    }

    private let ghostty: Ghostty.App
    private let sendEvent: (GhosttySessionHostEvent) -> Void
    private var sessions: [String: TerminalSession] = [:]
    private var activeSessionIds = Set<String>()
    private var attentionSessionIds = Set<String>()
    private var focusedSessionId: String?
    private var programmaticFocusSuppressionExpiresAtBySessionId: [String: Date] = [:]
    private var isLeased = false
    private var lastLoggedVisibilityBySessionId: [String: Bool] = [:]

    init(ghostty: Ghostty.App, sendEvent: @escaping (GhosttySessionHostEvent) -> Void) {
        self.ghostty = ghostty
        self.sendEvent = sendEvent
    }

    func createTerminal(_ command: GhosttyHostedCreateTerminal) {
        GhosttySessionHostDebugLog.append(
            event: "helper.createTerminal.begin",
            details: [
                "sessionId": command.sessionId,
                "hasExistingSession": sessions[command.sessionId] != nil,
                "hasGhosttyApp": ghostty.app != nil,
                "isLeased": isLeased,
                "visible": command.visible,
            ])
        if var session = sessions[command.sessionId] {
            /**
             CDXC:NativeTerminalSurvival 2026-04-27-17:16
             Recreating a durable session id from a relaunched zmux app means
             attach to the existing Ghostty PTY/window. Do not replay initial
             input into a shell that already survived the app restart.
             */
            session.isVisible = command.visible
            sessions[command.sessionId] = session
            if let frame = command.frame {
                setTerminalFrame(sessionId: command.sessionId, frame: frame, visible: command.visible)
            } else {
                updateWindowVisibility(sessionId: command.sessionId)
            }
            sendEvent(.terminalReady(
                sessionId: command.sessionId,
                ttyName: session.view.surfaceModel?.ttyName,
                foregroundPid: session.view.surfaceModel?.foregroundPID
            ))
            focusTerminal(sessionId: command.sessionId)
            return
        }
        guard let app = ghostty.app else {
            GhosttySessionHostDebugLog.append(
                event: "helper.createTerminal.error",
                details: ["sessionId": command.sessionId, "message": "Ghostty runtime is not ready"])
            sendEvent(.terminalError(sessionId: command.sessionId, message: "Ghostty runtime is not ready"))
            return
        }

        var config = Ghostty.SurfaceConfiguration()
        config.workingDirectory = command.cwd
        config.environmentVariables = NativeGhosttyTerminalEnvironment.surfaceEnvironment(
            from: command.env)
        config.initialInput = command.initialInput
        let surfaceView = Ghostty.SurfaceView(app, baseConfig: config)
        let frame = command.frame.map(nsRect) ?? NSRect(x: 200, y: 200, width: 800, height: 600)
        let window = GhosttyTerminalWindow(
            contentRect: frame,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-16:17
         Helper-owned Ghostty sessions survive zmux UI restarts by remaining
         real native AppKit windows. The UI app drives exact screen frames; the
         helper keeps leased active terminals visible as normal windows so the
         user can watch long-running shells while using another app. PTYs close
         only on timeout or explicit terminal close.
         */
        window.isReleasedWhenClosed = false
        window.sessionId = command.sessionId
        window.onBecameKey = { [weak self] sessionId in
            self?.handleTerminalWindowBecameKey(sessionId: sessionId)
        }
        let contentView = NSView(frame: NSRect(origin: .zero, size: frame.size))
        contentView.wantsLayer = true
        contentView.layer?.backgroundColor = NSColor.black.cgColor
        let borderView = NativeGhosttyTerminalBorderView(frame: contentView.bounds)
        borderView.autoresizingMask = [.width, .height]
        window.backgroundColor = .black
        window.contentView = contentView
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        window.level = .normal
        surfaceView.frame = contentView.bounds
        surfaceView.autoresizingMask = [.width, .height]
        contentView.addSubview(surfaceView)
        contentView.addSubview(borderView)

        var session = TerminalSession(
            sessionId: command.sessionId,
            view: surfaceView,
            window: window,
            borderView: borderView
        )
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
        session.isVisible = command.visible
        sessions[command.sessionId] = session
        activeSessionIds.insert(command.sessionId)
        focusedSessionId = command.sessionId
        GhosttySessionHostDebugLog.append(
            event: "helper.createTerminal.created",
            details: [
                "sessionId": command.sessionId,
                "windowNumber": window.windowNumber,
                "frame": "\(NSStringFromRect(window.frame))",
            ])
        updateWindowVisibility(sessionId: command.sessionId)
        updateTerminalBorder(for: command.sessionId)
        sendEvent(.terminalReady(
            sessionId: command.sessionId,
            ttyName: surfaceView.surfaceModel?.ttyName,
            foregroundPid: surfaceView.surfaceModel?.foregroundPID
        ))
    }

    func closeTerminal(sessionId: String) {
        guard let session = sessions.removeValue(forKey: sessionId) else { return }
        activeSessionIds.remove(sessionId)
        attentionSessionIds.remove(sessionId)
        if focusedSessionId == sessionId {
            focusedSessionId = nil
        }
        if let surface = session.view.surface {
            ghostty.requestClose(surface: surface)
        }
        session.window.orderOut(nil)
        session.window.contentView = nil
        lastLoggedVisibilityBySessionId.removeValue(forKey: sessionId)
        sendEvent(.terminalExited(sessionId: sessionId, exitCode: nil))
    }

    func closeAll(reason: String) {
        for sessionId in Array(sessions.keys) {
            closeTerminal(sessionId: sessionId)
        }
    }

    func focusTerminal(sessionId: String) {
        guard let session = sessions[sessionId] else { return }
        focusedSessionId = sessionId
        updateAllTerminalBorders()
        GhosttySessionHostDebugLog.append(
            event: "helper.focusTerminal.begin",
            details: [
                "sessionId": sessionId,
                "eligible": isWindowEligibleForDisplay(session),
                "windowNumber": session.window.windowNumber,
                "canBecomeKey": session.window.canBecomeKey,
                "isKeyBefore": session.window.isKeyWindow,
                "isMainBefore": session.window.isMainWindow,
                "firstResponderBefore": session.window.firstResponder.map { String(describing: type(of: $0)) } ?? "nil",
            ])
        if isWindowEligibleForDisplay(session) {
            programmaticFocusSuppressionExpiresAtBySessionId[sessionId] =
                Date().addingTimeInterval(0.75)
            NSApp.activate(ignoringOtherApps: true)
            session.window.makeKeyAndOrderFront(nil)
            session.window.makeFirstResponder(session.view)
        }
        GhosttySessionHostDebugLog.append(
            event: "helper.focusTerminal.end",
            details: [
                "sessionId": sessionId,
                "isKeyAfter": session.window.isKeyWindow,
                "isMainAfter": session.window.isMainWindow,
                "firstResponderAfter": session.window.firstResponder.map { String(describing: type(of: $0)) } ?? "nil",
            ])
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-23:59
         Programmatic helper focus is an instruction from the sidebar, not a
         new user-focus event. Echoing it back makes the sidebar re-publish
         focus and can alternate key windows between durable split terminals.
         */
    }

    func writeTerminalText(sessionId: String, text: String) {
        sessions[sessionId]?.view.surfaceModel?.sendText(text)
    }

    func sendTerminalEnter(sessionId: String) {
        guard let session = sessions[sessionId],
              let event = NSEvent.keyEvent(
                with: .keyDown,
                location: .zero,
                modifierFlags: [],
                timestamp: ProcessInfo.processInfo.systemUptime,
                windowNumber: session.window.windowNumber,
                context: nil,
                characters: "\r",
                charactersIgnoringModifiers: "\r",
                isARepeat: false,
                keyCode: 36
              ) else {
            GhosttySessionHostDebugLog.append(
                event: "helper.sendTerminalEnter.skipped",
                details: ["sessionId": sessionId])
            return
        }
        focusTerminal(sessionId: sessionId)
        GhosttySessionHostDebugLog.append(
            event: "helper.sendTerminalEnter.dispatch",
            details: [
                "sessionId": sessionId,
                "isKeyWindow": session.window.isKeyWindow,
                "firstResponder": session.window.firstResponder.map { String(describing: type(of: $0)) } ?? "nil",
            ])
        session.view.keyDown(with: event)
    }

    func setTerminalFrame(sessionId: String, frame: GhosttyHostFrame, visible: Bool) {
        guard var session = sessions[sessionId] else { return }
        session.isVisible = visible
        sessions[sessionId] = session
        let rect = nsRect(frame)
        session.window.setFrame(rect, display: true)
        session.view.sizeDidChange(rect.size)
        updateWindowVisibility(sessionId: sessionId)
        updateTerminalBorder(for: sessionId)
    }

    func setActiveTerminalSet(
        sessionIds: Set<String>,
        focusedSessionId: String?,
        attentionSessionIds: Set<String>
    ) {
        activeSessionIds = sessionIds
        self.focusedSessionId = focusedSessionId
        self.attentionSessionIds = attentionSessionIds
        GhosttySessionHostDebugLog.append(
            event: "helper.setActiveTerminalSet",
            details: [
                "sessionIds": Array(sessionIds).sorted(),
                "focusedSessionId": focusedSessionId ?? "nil",
                "attentionSessionIds": Array(attentionSessionIds).sorted(),
            ])
        for sessionId in sessions.keys {
            updateWindowVisibility(sessionId: sessionId)
            updateTerminalBorder(for: sessionId)
        }
    }

    func setLeased(_ leased: Bool) {
        isLeased = leased
        GhosttySessionHostDebugLog.append(
            event: "helper.setLeased",
            details: ["leased": leased])
        for sessionId in sessions.keys {
            updateWindowVisibility(sessionId: sessionId)
            updateTerminalBorder(for: sessionId)
        }
    }

    func setHostAppActive(_ active: Bool) {
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-23:27
         App activation is no longer a visibility gate. Users need to watch
         native Ghostty terminals while working in other apps, so the helper
         keeps leased active terminal windows visible and lets normal macOS
         window stacking decide what covers them.
         */
        GhosttySessionHostDebugLog.append(
            event: "helper.setHostAppActive",
            details: ["active": active])
    }

    func resurfaceVisibleTerminals() {
        let visibleSessionIds = sessions.keys.sorted().filter { sessionId in
            guard let session = sessions[sessionId] else { return false }
            return isWindowEligibleForDisplay(session)
        }
        GhosttySessionHostDebugLog.append(
            event: "helper.resurfaceVisibleTerminals",
            details: ["sessionIds": visibleSessionIds])
        for sessionId in visibleSessionIds {
            guard let session = sessions[sessionId] else { continue }
            session.window.orderFrontRegardless()
            updateTerminalBorder(for: sessionId)
        }
    }

    func setHelperAppActive(_ active: Bool) {
        /**
         CDXC:NativeTerminalSurvival 2026-04-27-23:15
         Helper activation is logged for diagnostics, but it is not a
         visibility gate. A normal helper-owned terminal window should remain
         watchable until the UI hides that terminal, the lease ends, or the
         user closes it.
         */
        GhosttySessionHostDebugLog.append(
            event: "helper.setHelperAppActive",
            details: ["active": active])
    }

    func surface(for uuid: UUID) -> Ghostty.SurfaceView? {
        sessions.values.first { $0.view.id == uuid }?.view
    }

    private func handleTerminalWindowBecameKey(sessionId: String) {
        guard sessions[sessionId] != nil else { return }
        focusedSessionId = sessionId
        updateAllTerminalBorders()
        if shouldSuppressProgrammaticFocusEvent(sessionId: sessionId) {
            GhosttySessionHostDebugLog.append(
                event: "helper.terminalFocused.programmaticSkipped",
                details: ["sessionId": sessionId])
            return
        }
        /**
         CDXC:NativeTerminalFocus 2026-04-27-23:59
         Helper-owned Ghostty windows live outside the zmux UI process, so a
         direct click on a terminal must report terminalFocused back through
         the helper bridge. Otherwise the sidebar keeps the old focused card
         and re-sends stale border state on the next layout sync.
         */
        GhosttySessionHostDebugLog.append(
            event: "helper.terminalFocused.emitted",
            details: ["sessionId": sessionId])
        sendEvent(.terminalFocused(sessionId: sessionId))
    }

    private func shouldSuppressProgrammaticFocusEvent(sessionId: String) -> Bool {
        guard let expiresAt = programmaticFocusSuppressionExpiresAtBySessionId[sessionId] else {
            return false
        }
        if expiresAt >= Date() {
            programmaticFocusSuppressionExpiresAtBySessionId.removeValue(forKey: sessionId)
            return true
        }
        programmaticFocusSuppressionExpiresAtBySessionId.removeValue(forKey: sessionId)
        /**
         CDXC:NativeTerminalFocus 2026-04-27-23:51
         Helper window key callbacks may arrive after makeKeyAndOrderFront
         returns. Programmatic sidebar focus therefore uses a short per-session
         suppression window instead of stack depth, while direct terminal
         clicks outside that window still publish terminalFocused.
         */
        return false
    }

    private func updateWindowVisibility(sessionId: String) {
        guard let session = sessions[sessionId] else { return }
        let shouldShow = isWindowEligibleForDisplay(session)
        if lastLoggedVisibilityBySessionId[sessionId] != shouldShow {
            lastLoggedVisibilityBySessionId[sessionId] = shouldShow
            GhosttySessionHostDebugLog.append(
                event: "helper.updateWindowVisibility",
                details: [
                    "sessionId": sessionId,
                    "shouldShow": shouldShow,
                    "isLeased": isLeased,
                    "isVisible": session.isVisible,
                    "isActive": activeSessionIds.contains(sessionId),
                    "windowNumber": session.window.windowNumber,
                ])
        }
        if shouldShow {
            session.window.orderFrontRegardless()
        } else {
            session.window.orderOut(nil)
        }
    }

    private func updateAllTerminalBorders() {
        for sessionId in sessions.keys {
            updateTerminalBorder(for: sessionId)
        }
    }

    private func updateTerminalBorder(for sessionId: String) {
        guard let session = sessions[sessionId] else { return }
        session.borderView.isHidden = !isWindowEligibleForDisplay(session)
        session.borderView.setState(
            isFocused: focusedSessionId == sessionId,
            isAttention: attentionSessionIds.contains(sessionId)
        )
    }

    private func isWindowEligibleForDisplay(_ session: TerminalSession) -> Bool {
        isLeased && session.isVisible && activeSessionIds.contains(session.sessionId)
    }

    private func nsRect(_ frame: GhosttyHostFrame) -> NSRect {
        NSRect(
            x: frame.x,
            y: frame.y,
            width: max(frame.width, 1),
            height: max(frame.height, 1)
        )
    }
}
