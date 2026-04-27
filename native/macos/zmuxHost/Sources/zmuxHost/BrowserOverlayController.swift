import AppKit
import ApplicationServices
import Foundation
import OSLog

@MainActor
final class BrowserOverlayController {
  static let chromeCanaryBundleIdentifier = "com.google.Chrome.canary"

  private static let logger = Logger(subsystem: "com.madda.zmux.host", category: "browser-overlay")
  private static let chromeCanaryAppName = "Google Chrome Canary.app"
  private static let chromeCanaryFallbackPath = "/Applications/Google Chrome Canary.app"
  private static let chromeCanaryNewTabURL = URL(string: "chrome://newtab")!
  private static let windowPlacementRetryCount = 14
  private static let windowPlacementRetryDelay: TimeInterval = 0.15
  private static let measuredHiddenTopRight = CGPoint(x: -1437, y: 1022)

  private weak var window: NSWindow?
  private let workareaFrameProvider: () -> NSRect?
  private let setCompanionBrowserActive: (Bool) -> Void
  private var activeBrowserApplication: NSRunningApplication?
  private var activeBrowserWindow: AXUIElement?
  private var visibleBrowserFrame: NSRect?
  private var isBrowserVisibleInAttachment = false
  private var isBrowserMovedOffscreen = false

  /**
   CDXC:BrowserOverlay 2026-04-26-05:22
   Browser actions are native window orchestration: open the requested URL in
   Chrome Canary, move that browser window over the current zmux workarea
   instead of the sidebar chrome, and temporarily let Chrome be the foreground
   app so it can sit above attached zmux without Terminal or webview browser
   fallbacks.
   */
  init(
    window: NSWindow,
    workareaFrameProvider: @escaping () -> NSRect?,
    setCompanionBrowserActive: @escaping (Bool) -> Void
  ) {
    self.window = window
    self.workareaFrameProvider = workareaFrameProvider
    self.setCompanionBrowserActive = setCompanionBrowserActive
  }

  func open(_ command: OpenBrowserWindow) {
    appendReproLog(
      "open.request",
      [
        "url": command.url,
        "state": stateSnapshot(),
      ])
    guard let url = URL(string: command.url) else {
      appendReproLog(
        "open.invalidUrl",
        [
          "url": command.url,
          "state": stateSnapshot(),
        ])
      return
    }
    guard let applicationURL = chromeCanaryApplicationURL() else {
      Self.logger.error("Google Chrome Canary.app was not found")
      appendReproLog(
        "open.canaryAppMissing",
        [
          "state": stateSnapshot()
        ])
      return
    }

    setCompanionBrowserActive(true)
    window?.level = .normal

    let configuration = NSWorkspace.OpenConfiguration()
    configuration.activates = true
    NSWorkspace.shared.open([url], withApplicationAt: applicationURL, configuration: configuration)
    { [weak self] app, error in
      DispatchQueue.main.async {
        guard let self else {
          return
        }
        if let error {
          Self.logger.error(
            "Failed to open Chrome Canary: \(error.localizedDescription, privacy: .public)")
          self.appendReproLog(
            "open.failed",
            [
              "error": error.localizedDescription,
              "state": self.stateSnapshot(),
            ])
          return
        }
        self.appendReproLog(
          "open.workspaceOpened",
          [
            "appPid": app?.processIdentifier as Any,
            "state": self.stateSnapshot(),
          ])
        self.positionChromeCanary(app: app, remainingAttempts: Self.windowPlacementRetryCount)
      }
    }
  }

  func moveBrowserOffscreen() {
    appendReproLog(
      "moveOffscreen.request",
      [
        "state": stateSnapshot()
      ])
    guard isBrowserVisibleInAttachment else {
      appendReproLog(
        "moveOffscreen.skippedNotVisibleInAttachment",
        [
          "state": stateSnapshot()
        ])
      return
    }
    guard let application = activeBrowserApplication ?? runningChromeCanaryApplication(),
      let chromeWindow = activeBrowserWindow ?? frontmostChromeCanaryWindow(for: application)
    else {
      appendReproLog(
        "moveOffscreen.skippedNoWindow",
        [
          "state": stateSnapshot()
        ])
      return
    }
    /**
     CDXC:BrowserOverlay 2026-04-26-07:19
     When Zed is clicked, tuck Chrome Canary away with zmux rather than
     closing or minimizing it. Store the visible workarea-sized frame so the
     native zmux button can restore the browser exactly into the workarea.
     CDXC:BrowserOverlay 2026-04-26-09:11
     Restore should preserve the last attached browser state. If Canary was
     merely running but had not been shown above zmux, do not capture and
     restore it when the native zmux button brings the app forward again.
     */
    let frame = visibleBrowserFrame ?? workareaFrameProvider() ?? window?.frame
    guard let frame else {
      appendReproLog(
        "moveOffscreen.skippedNoFrame",
        [
          "state": stateSnapshot(application: application, chromeWindow: chromeWindow)
        ])
      return
    }
    activeBrowserApplication = application
    activeBrowserWindow = chromeWindow
    visibleBrowserFrame = frame
    setChromeWindow(chromeWindow, toAppKitFrame: offscreenFrame(preserving: frame))
    isBrowserVisibleInAttachment = false
    isBrowserMovedOffscreen = true
    appendReproLog(
      "moveOffscreen.applied",
      [
        "preservedFrame": describe(frame),
        "state": stateSnapshot(application: application, chromeWindow: chromeWindow),
      ])
  }

  func restoreBrowserIfNeeded() {
    appendReproLog(
      "restoreIfNeeded.request",
      [
        "state": stateSnapshot()
      ])
    guard isBrowserMovedOffscreen else {
      appendReproLog(
        "restoreIfNeeded.skippedNotMovedOffscreen",
        [
          "state": stateSnapshot()
        ])
      return
    }
    positionChromeCanary(
      app: activeBrowserApplication ?? runningChromeCanaryApplication(),
      remainingAttempts: Self.windowPlacementRetryCount
    )
  }

  func showRunningChromeCanary() {
    appendReproLog(
      "showRunning.request",
      [
        "state": stateSnapshot()
      ])
    guard let application = runningChromeCanaryApplication() else {
      appendReproLog(
        "showRunning.skippedNoRunningApp",
        [
          "state": stateSnapshot()
        ])
      return
    }
    /**
     CDXC:BrowserOverlay 2026-04-26-07:37
     The sidebar Browsers section now has a single control when Chrome
     Canary is running. That control must show the existing Canary window
     over the zmux workarea, not open another URL or fall back to a webview.
     */
    setCompanionBrowserActive(true)
    window?.level = .normal
    if hasNoChromeCanaryWindows(for: application) {
      /**
       CDXC:BrowserOverlay 2026-04-27-01:44
       The sidebar Chrome Canary button must still produce a visible
       browser surface when Canary is running with all windows closed.
       Ask Canary for a real new-tab window, then place that created
       window over the zmux workarea through the same AX placement path.
       */
      openNewTabForRunningChromeCanary(application)
      return
    }
    positionChromeCanary(app: application, remainingAttempts: Self.windowPlacementRetryCount)
  }

  func logAttachmentEvent(_ event: String) {
    appendReproLog(
      event,
      [
        "state": stateSnapshot()
      ])
  }

  func markBrowserNoLongerShownInAttachment(reason: String) {
    /**
     CDXC:BrowserOverlay 2026-04-26-09:25
     If the user clicks back into zmux/sidebar while Canary had been shown
     above the workarea, the browser is no longer the visible attachment
     state. Clear the restore bit immediately so a later Zed title-bar hide
     does not tuck and restore a browser the user already moved away from.
     */
    appendReproLog(
      "markBrowserNoLongerShown.request",
      [
        "reason": reason,
        "state": stateSnapshot(),
      ])
    isBrowserVisibleInAttachment = false
    isBrowserMovedOffscreen = false
    appendReproLog(
      "markBrowserNoLongerShown.applied",
      [
        "reason": reason,
        "state": stateSnapshot(),
      ])
  }

  private func chromeCanaryApplicationURL() -> URL? {
    if let url = NSWorkspace.shared.urlForApplication(
      withBundleIdentifier: Self.chromeCanaryBundleIdentifier)
    {
      return url
    }

    let fallback = URL(fileURLWithPath: Self.chromeCanaryFallbackPath, isDirectory: true)
    if FileManager.default.fileExists(atPath: fallback.path) {
      return fallback
    }

    return NSWorkspace.shared.runningApplications
      .first {
        $0.bundleIdentifier == Self.chromeCanaryBundleIdentifier
          || $0.bundleURL?.lastPathComponent == Self.chromeCanaryAppName
      }?
      .bundleURL
  }

  private func positionChromeCanary(app: NSRunningApplication?, remainingAttempts: Int) {
    appendReproLog(
      "position.request",
      [
        "remainingAttempts": remainingAttempts,
        "incomingAppPid": app?.processIdentifier as Any,
        "state": stateSnapshot(),
      ])
    guard remainingAttempts > 0 else {
      Self.logger.info("Chrome Canary window was not available through Accessibility")
      appendReproLog(
        "position.failedNoAttempts",
        [
          "state": stateSnapshot()
        ])
      return
    }

    let application = app ?? runningChromeCanaryApplication()
    guard let application else {
      appendReproLog(
        "position.retryNoApplication",
        [
          "remainingAttempts": remainingAttempts,
          "state": stateSnapshot(),
        ])
      retryPositioning(app: nil, remainingAttempts: remainingAttempts)
      return
    }

    guard let frame = workareaFrameProvider() ?? window?.frame,
      let chromeWindow = frontmostChromeCanaryWindow(for: application)
    else {
      appendReproLog(
        "position.retryNoFrameOrWindow",
        [
          "remainingAttempts": remainingAttempts,
          "hasFrame": (workareaFrameProvider() ?? window?.frame) != nil,
          "state": stateSnapshot(application: application),
        ])
      retryPositioning(app: application, remainingAttempts: remainingAttempts)
      return
    }

    setChromeWindow(chromeWindow, toAppKitFrame: frame)
    activeBrowserApplication = application
    activeBrowserWindow = chromeWindow
    visibleBrowserFrame = frame
    isBrowserVisibleInAttachment = true
    isBrowserMovedOffscreen = false
    AXUIElementPerformAction(chromeWindow, kAXRaiseAction as CFString)
    application.activate(options: [.activateIgnoringOtherApps])
    appendReproLog(
      "position.applied",
      [
        "targetFrame": describe(frame),
        "state": stateSnapshot(application: application, chromeWindow: chromeWindow),
      ])
  }

  private func retryPositioning(app: NSRunningApplication?, remainingAttempts: Int) {
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.windowPlacementRetryDelay) {
      [weak self] in
      self?.positionChromeCanary(app: app, remainingAttempts: remainingAttempts - 1)
    }
  }

  private func runningChromeCanaryApplication() -> NSRunningApplication? {
    NSWorkspace.shared.runningApplications.first {
      $0.bundleIdentifier == Self.chromeCanaryBundleIdentifier
        || $0.bundleURL?.lastPathComponent == Self.chromeCanaryAppName
    }
  }

  private func hasNoChromeCanaryWindows(for application: NSRunningApplication) -> Bool {
    let axApplication = AXUIElementCreateApplication(application.processIdentifier)
    var windowsValue: CFTypeRef?
    guard
      AXUIElementCopyAttributeValue(axApplication, kAXWindowsAttribute as CFString, &windowsValue)
        == .success,
      let windows = windowsValue as? [AXUIElement]
    else {
      return false
    }
    return windows.isEmpty
  }

  private func openNewTabForRunningChromeCanary(_ application: NSRunningApplication) {
    appendReproLog(
      "showRunning.openNewTab.request",
      [
        "appPid": application.processIdentifier,
        "url": Self.chromeCanaryNewTabURL.absoluteString,
        "state": stateSnapshot(application: application),
      ])
    guard let applicationURL = chromeCanaryApplicationURL() ?? application.bundleURL else {
      appendReproLog(
        "showRunning.openNewTab.missingAppUrl",
        [
          "appPid": application.processIdentifier,
          "state": stateSnapshot(application: application),
        ])
      return
    }

    let configuration = NSWorkspace.OpenConfiguration()
    configuration.activates = true
    NSWorkspace.shared.open(
      [Self.chromeCanaryNewTabURL], withApplicationAt: applicationURL, configuration: configuration
    ) { [weak self] app, error in
      DispatchQueue.main.async {
        guard let self else {
          return
        }
        if let error {
          Self.logger.error(
            "Failed to create Chrome Canary tab: \(error.localizedDescription, privacy: .public)")
          self.appendReproLog(
            "showRunning.openNewTab.failed",
            [
              "error": error.localizedDescription,
              "state": self.stateSnapshot(application: application),
            ])
          return
        }
        self.appendReproLog(
          "showRunning.openNewTab.opened",
          [
            "appPid": app?.processIdentifier as Any,
            "state": self.stateSnapshot(application: app ?? application),
          ])
        self.positionChromeCanary(
          app: app ?? application,
          remainingAttempts: Self.windowPlacementRetryCount
        )
      }
    }
  }

  private func frontmostChromeCanaryWindow(for application: NSRunningApplication) -> AXUIElement? {
    let axApplication = AXUIElementCreateApplication(application.processIdentifier)

    var focusedWindowValue: CFTypeRef?
    if AXUIElementCopyAttributeValue(
      axApplication, kAXFocusedWindowAttribute as CFString, &focusedWindowValue) == .success,
      let focusedWindow = focusedWindowValue
    {
      return (focusedWindow as! AXUIElement)
    }

    var windowsValue: CFTypeRef?
    guard
      AXUIElementCopyAttributeValue(axApplication, kAXWindowsAttribute as CFString, &windowsValue)
        == .success,
      let windows = windowsValue as? [AXUIElement]
    else {
      return nil
    }
    return windows.first
  }

  private func setChromeWindow(_ chromeWindow: AXUIElement, toAppKitFrame frame: NSRect) {
    var position = CGPoint(x: frame.minX, y: accessibilityOriginTopY() - frame.maxY)
    var size = CGSize(width: frame.width, height: frame.height)
    guard let positionValue = AXValueCreate(.cgPoint, &position),
      let sizeValue = AXValueCreate(.cgSize, &size)
    else {
      return
    }
    AXUIElementSetAttributeValue(chromeWindow, kAXPositionAttribute as CFString, positionValue)
    AXUIElementSetAttributeValue(chromeWindow, kAXSizeAttribute as CFString, sizeValue)
  }

  private func stateSnapshot(
    application suppliedApplication: NSRunningApplication? = nil,
    chromeWindow suppliedChromeWindow: AXUIElement? = nil
  ) -> [String: Any] {
    let application =
      suppliedApplication ?? activeBrowserApplication ?? runningChromeCanaryApplication()
    let chromeWindow = suppliedChromeWindow ?? activeBrowserWindow
    return [
      "activeBrowserPid": activeBrowserApplication?.processIdentifier as Any,
      "activeWindowKnown": activeBrowserWindow != nil,
      "canaryPid": application?.processIdentifier as Any,
      "canaryRunning": application != nil,
      "chromeAxFrame": chromeWindow.flatMap { describeChromeWindowFrame($0) } as Any,
      "frontmostBundle": NSWorkspace.shared.frontmostApplication?.bundleIdentifier as Any,
      "frontmostName": NSWorkspace.shared.frontmostApplication?.localizedName as Any,
      "isBrowserMovedOffscreen": isBrowserMovedOffscreen,
      "isBrowserVisibleInAttachment": isBrowserVisibleInAttachment,
      "visibleBrowserFrame": visibleBrowserFrame.map { describe($0) } as Any,
      "windowFrame": window.map { describe($0.frame) } as Any,
      "windowLevel": window?.level.rawValue as Any,
    ]
  }

  private func describeChromeWindowFrame(_ chromeWindow: AXUIElement) -> String? {
    var positionValue: CFTypeRef?
    var sizeValue: CFTypeRef?
    guard
      AXUIElementCopyAttributeValue(chromeWindow, kAXPositionAttribute as CFString, &positionValue)
        == .success,
      AXUIElementCopyAttributeValue(chromeWindow, kAXSizeAttribute as CFString, &sizeValue)
        == .success,
      let positionValue,
      let sizeValue
    else {
      return nil
    }
    var position = CGPoint.zero
    var size = CGSize.zero
    guard AXValueGetValue((positionValue as! AXValue), .cgPoint, &position),
      AXValueGetValue((sizeValue as! AXValue), .cgSize, &size)
    else {
      return nil
    }
    return "x=\(position.x),y=\(position.y),w=\(size.width),h=\(size.height)"
  }

  private func describe(_ frame: NSRect) -> String {
    "x=\(frame.minX),y=\(frame.minY),w=\(frame.width),h=\(frame.height)"
  }

  private func appendReproLog(_ event: String, _ details: [String: Any] = [:]) {
    BrowserOverlayRestoreReproLog.append(event, details)
  }

  private func offscreenFrame(preserving frame: NSRect) -> NSRect {
    let topLeft = CGPoint(
      x: Self.measuredHiddenTopRight.x - frame.width,
      y: Self.measuredHiddenTopRight.y
    )
    let appKitTopLeftY = accessibilityOriginTopY() - topLeft.y
    return NSRect(
      x: topLeft.x,
      y: appKitTopLeftY - frame.height,
      width: frame.width,
      height: frame.height
    )
  }

  private func accessibilityOriginTopY() -> CGFloat {
    NSScreen.screens.first { screen in
      screen.frame.origin == .zero
    }?.frame.maxY ?? NSScreen.main?.frame.maxY ?? NSScreen.screens.first?.frame.maxY ?? 0
  }
}

enum BrowserOverlayRestoreReproLog {
  private static let logger = Logger(
    subsystem: "com.madda.zmux.host", category: "browser-overlay-repro")

  /**
   CDXC:BrowserOverlay 2026-04-26-09:16
   The browser restore issue needs a dedicated native trace because the
   failure depends on AppKit activation order, sidebar focus, and whether the
   tracked Canary window was actually shown when zmux was tucked. Keep these
   traces in a separate file so a repro can be inspected without general logs.
   */
  static func append(_ event: String, _ details: [String: Any] = [:]) {
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("browser-overlay-restore-repro.log")
    let line = "[\(timestamp())] \(event) \(serialize(details))\n"

    do {
      try FileManager.default.createDirectory(at: logsDirectory, withIntermediateDirectories: true)
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
      logger.warning(
        "failed to write browser overlay restore repro log: \(error.localizedDescription)")
    }
  }

  private static func timestamp() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS ZZZZ"
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    return formatter.string(from: Date())
  }

  private static func serialize(_ value: Any) -> String {
    if let dictionary = value as? [String: Any] {
      return dictionary.keys.sorted().map { key in
        "\(key)=\(serialize(dictionary[key] as Any))"
      }.joined(separator: " ")
    }
    if let array = value as? [Any] {
      return "[" + array.map { serialize($0) }.joined(separator: ",") + "]"
    }
    if value is NSNull {
      return "nil"
    }
    let mirror = Mirror(reflecting: value)
    if mirror.displayStyle == .optional {
      if let child = mirror.children.first {
        return serialize(child.value)
      }
      return "nil"
    }
    return String(describing: value)
      .replacingOccurrences(of: "\n", with: "\\n")
  }
}
