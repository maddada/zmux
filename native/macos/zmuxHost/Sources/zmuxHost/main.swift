import AppKit
import GhosttyKit

/**
 CDXC:ChromiumBrowserPanes 2026-05-04-16:38
 Chromium browser panes require CEF's NSApplication subclass before AppKit
 creates the shared application. Prepare it first; the app still reports a
 browser-pane error instead of using WebKit if the CEF runtime is not bundled.
 */
let preparedCEFApplication = ZmuxCEFPrepareApplication()

/**
 CDXC:NativeTerminals 2026-04-26-07:21
 Ghostty resolves bundled themes from global runtime state created during
 `ghostty_init`. Set the embedded app's resource directory first so named
 themes from the user's Ghostty config, such as GitHub Dark Default, load
 from zmux.app/Contents/Resources/ghostty.
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
let runsCEFMessageLoop =
  preparedCEFApplication && ZmuxCEFInitialize(Int32(CommandLine.argc), CommandLine.unsafeArgv)
if runsCEFMessageLoop {
  app.finishLaunching()
  ZmuxCEFRunMessageLoop()
  ZmuxCEFShutdown()
} else {
  app.run()
}
