import AppKit
import Combine
import GhosttyKit
import OSLog

final class AppDelegate: NSObject, NSApplicationDelegate, GhosttyAppDelegate {
    static let logger = Logger(subsystem: "com.zmux.ghostty-session-host", category: "app")

    nonisolated(unsafe) let ghostty: Ghostty.App
    let undoManager = UndoManager()

    private var bridge: GhosttySessionHostBridge?
    private var tickTimer: Timer?
    private var workspace: GhosttySessionHostWorkspace?
    private var leaseTimer: Timer?
    private var activeLeaseAppInstanceId: String?
    private var detachedTimeoutSeconds: TimeInterval = 15 * 60

    override init() {
        ghostty = Ghostty.App(configPath: Self.preferredGhosttyConfigPath())
        super.init()
        ghostty.delegate = self
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        workspace = GhosttySessionHostWorkspace(ghostty: ghostty) { [weak self] event in
            self?.bridge?.send(event)
        }
        do {
            let bridge = try GhosttySessionHostBridge { [weak self] command in
                self?.handle(command)
            } onAllClientsDisconnected: { [weak self] in
                self?.releaseActiveLease(reason: "allClientsDisconnected")
            }
            self.bridge = bridge
            bridge.start()
        } catch {
            Self.logger.error("failed to start session host bridge: \(error.localizedDescription)")
            NSApp.terminate(nil)
        }
        tickTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
            self?.ghostty.appTick()
        }
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        MainActor.assumeIsolated {
            workspace?.setHelperAppActive(true)
        }
    }

    func applicationDidResignActive(_ notification: Notification) {
        MainActor.assumeIsolated {
            workspace?.setHelperAppActive(false)
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        workspace?.closeAll(reason: "hostTerminated")
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func findSurface(forUUID uuid: UUID) -> Ghostty.SurfaceView? {
        MainActor.assumeIsolated {
            workspace?.surface(for: uuid)
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
    private func handle(_ command: GhosttySessionHostCommandEnvelope) {
        switch command {
        case let .acquireLease(lease):
            guard lease.protocolVersion == GhosttySessionHostProtocol.version else {
                /**
                 CDXC:NativeTerminalSurvival 2026-04-27-16:14
                 Incompatible helpers must force-close instead of becoming
                 stale hidden owners of live PTYs. A new zmux version may only
                 reuse helpers that speak the exact durable terminal protocol.
                 */
                workspace?.closeAll(reason: "incompatibleAcquireLease")
                NSApp.terminate(nil)
                return
            }
            activeLeaseAppInstanceId = lease.appInstanceId
            detachedTimeoutSeconds = max(0, lease.timeoutSeconds)
            leaseTimer?.invalidate()
            leaseTimer = nil
            workspace?.setLeased(true)
            bridge?.send(.hostReady(
                protocolVersion: GhosttySessionHostProtocol.version,
                buildId: Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "dev"
            ))
        case let .releaseLease(appInstanceId):
            if appInstanceId == activeLeaseAppInstanceId {
                releaseActiveLease(reason: "explicitReleaseLease")
            }
        case let .configureLease(timeoutSeconds):
            detachedTimeoutSeconds = max(0, timeoutSeconds)
        case let .createTerminal(command):
            workspace?.createTerminal(command)
        case let .closeTerminal(sessionId):
            workspace?.closeTerminal(sessionId: sessionId)
        case let .focusTerminal(sessionId):
            workspace?.focusTerminal(sessionId: sessionId)
        case let .sendTerminalEnter(sessionId):
            workspace?.sendTerminalEnter(sessionId: sessionId)
        case let .writeTerminalText(sessionId, text):
            workspace?.writeTerminalText(sessionId: sessionId, text: text)
        case let .setTerminalFrame(sessionId, frame, visible):
            workspace?.setTerminalFrame(sessionId: sessionId, frame: frame, visible: visible)
        case let .setActiveTerminalSet(sessionIds, focusedSessionId, attentionSessionIds):
            workspace?.setActiveTerminalSet(
                sessionIds: Set(sessionIds),
                focusedSessionId: focusedSessionId,
                attentionSessionIds: Set(attentionSessionIds)
            )
        case let .setHostAppActive(active):
            workspace?.setHostAppActive(active)
        case .resurfaceVisibleTerminals:
            workspace?.resurfaceVisibleTerminals()
        case let .forceCloseIncompatibleHelpers(protocolVersion):
            if protocolVersion != GhosttySessionHostProtocol.version {
                workspace?.closeAll(reason: "forceCloseIncompatibleHelpers")
                NSApp.terminate(nil)
            }
        }
    }

    @MainActor
    private func releaseActiveLease(reason: String) {
        guard activeLeaseAppInstanceId != nil else { return }
        activeLeaseAppInstanceId = nil
        workspace?.setLeased(false)
        scheduleDetachedShutdown(reason: reason)
    }

    @MainActor
    private func scheduleDetachedShutdown(reason: String) {
        leaseTimer?.invalidate()
        if detachedTimeoutSeconds <= 0 {
            workspace?.closeAll(reason: "\(reason):timeoutDisabled")
            NSApp.terminate(nil)
            return
        }
        leaseTimer = Timer.scheduledTimer(withTimeInterval: detachedTimeoutSeconds, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.workspace?.closeAll(reason: "\(reason):timeoutExpired")
                NSApp.terminate(nil)
            }
        }
    }

    private static func preferredGhosttyConfigPath() -> String? {
        let value = ProcessInfo.processInfo.environment["GHOSTTY_CONFIG_PATH"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        if value?.isEmpty == false {
            return value
        }
        let appSupportURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        return [
            appSupportURL?.appendingPathComponent("com.mitchellh.ghostty/config").path,
            appSupportURL?.appendingPathComponent("com.ghostty.org/config").path,
            appSupportURL?.appendingPathComponent("Ghostty/config").path,
        ].compactMap { $0 }.first { FileManager.default.fileExists(atPath: $0) }
    }
}
