import AppKit
import GhosttyKit

NativeGhosttyTerminalEnvironment.sanitizeProcessEnvironmentBeforeGhosttyInit()

/**
 CDXC:NativeTerminalSurvival 2026-04-27-16:12
 The session host is a long-lived AppKit process that owns real
 Ghostty.SurfaceView instances and their PTYs while the zmux UI app updates or
 restarts. It sets the same bundled resource directory before ghostty_init so
 helper-owned terminals render with the user's Ghostty themes and terminfo.
 */
if let resourcesPath = Bundle.main.resourceURL?.appendingPathComponent("ghostty").path {
    setenv("GHOSTTY_RESOURCES_DIR", resourcesPath, 1)
}

if ghostty_init(UInt(CommandLine.argc), CommandLine.unsafeArgv) != GHOSTTY_SUCCESS {
    Ghostty.logger.critical("ghostty_init failed")
    exit(1)
}

private let app = NSApplication.shared
private let delegate = AppDelegate()

app.delegate = delegate
app.run()
