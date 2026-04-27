import AppKit
import ApplicationServices
import Foundation
import OSLog

enum ZedOverlayTargetApp: String, Decodable {
  case zed
  case zedPreview = "zed-preview"
  case vscode
  case vscodeInsiders = "vscode-insiders"
}

@MainActor
final class ZedOverlayController: NSObject {
  private struct TargetApp {
    let buttonName: String
    let bundleName: String
    let commandName: String
    let commandReuseWindowArgument: String
    let processName: String
  }

  private struct TargetWindowFrame {
    let axTopLeft: CGPoint
    let size: CGSize
    let screen: NSScreen
  }

  private static let logger = Logger(subsystem: "com.madda.zmux.host", category: "zed-overlay")
  private static let toggleButtonSize = CGSize(width: 132, height: 24)
  private static let buttonPanelSize = toggleButtonSize
  private static let attachedWindowInset: CGFloat = 40
  private static let measuredHiddenTopRight = CGPoint(x: -1437, y: 1022)

  private weak var window: NSWindow?
  private let workspacePathProvider: () -> String?
  private let didActivateAttachment: () -> Void
  private let didHideAttachment: () -> Void
  private let didShowAttachment: () -> Void
  private let didRequestDetach: (ZedOverlayTargetApp) -> Void
  private var enabled = false
  private var targetApp: ZedOverlayTargetApp = .zedPreview
  private var workspacePath: String?
  private var buttonPanel: NSPanel?
  private weak var toggleButton: NSButton?
  private var followTimer: Timer?
  private var isWindowVisibleInAttachment = true
  private var shouldRestoreWindowWhenZedReturns = false
  private var visibleWindowFrame: NSRect?
  private var attachedWindowWidth: CGFloat?
  private var attachedWindowHeight: CGFloat?
  private var activationObserver: NSObjectProtocol?
  private var companionApplicationBundleIdentifiers: Set<String> = []
  private var hasRequestedAccessibilityPermission = false

  /**
   CDXC:IDEAttachment 2026-04-26-22:38
   IDE attachment is implemented with AppKit/Accessibility APIs, not web UI.
   The overlay button follows the configured IDE process; VS Code resolves by
   its Code/Code - Insiders app names and reopens workspaces with
   code/code-insiders instead of the Zed command.
   */
  init(
    window: NSWindow,
    workspacePathProvider: @escaping () -> String?,
    didActivateAttachment: @escaping () -> Void,
    didHideAttachment: @escaping () -> Void,
    didShowAttachment: @escaping () -> Void,
    didRequestDetach: @escaping (ZedOverlayTargetApp) -> Void
  ) {
    self.window = window
    self.workspacePathProvider = workspacePathProvider
    self.didActivateAttachment = didActivateAttachment
    self.didHideAttachment = didHideAttachment
    self.didShowAttachment = didShowAttachment
    self.didRequestDetach = didRequestDetach
    self.visibleWindowFrame = window.frame
    super.init()
    self.buttonPanel = makeButtonPanel()
    self.activationObserver = NSWorkspace.shared.notificationCenter.addObserver(
      forName: NSWorkspace.didActivateApplicationNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      guard
        let application = notification.userInfo?[NSWorkspace.applicationUserInfoKey]
          as? NSRunningApplication
      else {
        return
      }
      Task { @MainActor in
        self?.handleActivatedApplication(application, userInitiatedActivation: true)
      }
    }
  }

  deinit {
    if let activationObserver {
      NSWorkspace.shared.notificationCenter.removeObserver(activationObserver)
    }
    followTimer?.invalidate()
  }

  func configure(_ command: ConfigureZedOverlay) {
    enabled = command.enabled
    targetApp = command.targetApp
    workspacePath = command.workspacePath
    Self.logger.info(
      "Configured Zed overlay enabled=\(command.enabled) target=\(command.targetApp.rawValue, privacy: .public)"
    )

    guard let window else {
      return
    }

    if enabled {
      /**
       CDXC:IDEAttachment 2026-04-27-01:12
       Re-enabling attach after Detach must not inherit a stale hidden
       attachment state. Treat the current standalone window as visible,
       then immediately re-apply IDE sizing/positioning so the title-bar
       controls and attached window return without requiring a restart.
       */
      isWindowVisibleInAttachment = true
      visibleWindowFrame = window.frame
      if let frame = readTargetWindowFrame() {
        applyWindowResizeLimits(attachedTo: frame)
        let nextFrame = windowFrame(attachedTo: frame)
        window.setFrame(nextFrame, display: true)
        visibleWindowFrame = nextFrame
      }
      window.level = .floating
      updateButtonPosition()
      handleActivatedApplication(
        NSWorkspace.shared.frontmostApplication, userInitiatedActivation: false)
    } else {
      stopFollowingTargetWindow()
      hideButton()
      shouldRestoreWindowWhenZedReturns = false
      resetWindowResizeLimits()
      if restoreWindowIfOffscreen() {
        didShowAttachment()
      }
      window.level = .normal
    }
  }

  func setCompanionApplicationBundleIdentifiers(_ identifiers: Set<String>) {
    /**
     CDXC:BrowserOverlay 2026-04-26-05:14
     Chrome Canary is a companion foreground app while a browser action is
     open. Keep the Zed attachment warm behind it instead of treating the
     browser activation as a signal to move zmux offscreen.
     */
    companionApplicationBundleIdentifiers = identifiers
  }

  private func handleActivatedApplication(
    _ application: NSRunningApplication?, userInitiatedActivation: Bool
  ) {
    guard enabled else {
      return
    }
    /**
     CDXC:BrowserOverlay 2026-04-26-09:16
     Browser restore debugging needs the Zed attachment activation branch
     beside BrowserOverlayController state, because the stale restore only
     appears after clicking between Canary, zmux/sidebar, Zed, and the
     native title-bar button.
     */
    BrowserOverlayRestoreReproLog.append(
      "zedOverlay.activation",
      [
        "bundleIdentifier": application?.bundleIdentifier as Any,
        "companionBundles": Array(companionApplicationBundleIdentifiers).sorted(),
        "isTargetApplication": application.map { isTargetApplication($0) } as Any,
        "isUserInitiated": userInitiatedActivation,
        "isWindowVisibleInAttachment": isWindowVisibleInAttachment,
        "localizedName": application?.localizedName as Any,
        "processIdentifier": application?.processIdentifier as Any,
        "shouldRestoreWindowWhenZedReturns": shouldRestoreWindowWhenZedReturns,
      ])

    if let application, isTargetApplication(application) {
      window?.level = .floating
      startFollowingTargetWindow()
      if userInitiatedActivation, isWindowVisibleInAttachment {
        /**
         CDXC:ZedOverlay 2026-04-26-07:19
         Clicking the attached Zed window is an intentional request to
         tuck zmux and any companion browser window away while leaving
         the native button available for restoring the prior view.
        */
        moveWindowOffscreen(openWorkspaceInZed: false)
        updateButtonPosition()
      } else {
        showButtonAndRestoreWindowIfNeeded()
      }
      return
    }

    if let application, application.processIdentifier == ProcessInfo.processInfo.processIdentifier {
      window?.level = .floating
      didActivateAttachment()
      startFollowingTargetWindow()
      updateButtonPosition()
      return
    }

    if let application,
      let bundleIdentifier = application.bundleIdentifier,
      companionApplicationBundleIdentifiers.contains(bundleIdentifier)
    {
      window?.level = .normal
      startFollowingTargetWindow()
      updateButtonPosition()
      return
    }

    /**
     CDXC:ZedOverlay 2026-04-26-07:19
     Activating unrelated apps should not move the attached zmux window
     offscreen. Drop zmux back to normal ordering and hide only the native
     Zed button until the configured IDE is foreground again.
     */
    window?.level = .normal
    hideButton()
    stopFollowingTargetWindow()
  }

  private func showButtonAndRestoreWindowIfNeeded() {
    updateButtonPosition()
    if shouldRestoreWindowWhenZedReturns {
      showWindow()
      shouldRestoreWindowWhenZedReturns = false
    }
  }

  private func toggleWindow() {
    guard enabled else {
      return
    }

    if isWindowVisibleInAttachment {
      moveWindowOffscreen(openWorkspaceInZed: true)
    } else {
      showWindow()
    }
  }

  private func showWindow() {
    guard let window else {
      return
    }
    BrowserOverlayRestoreReproLog.append(
      "zedOverlay.showWindow.request",
      [
        "isWindowVisibleInAttachment": isWindowVisibleInAttachment,
        "shouldRestoreWindowWhenZedReturns": shouldRestoreWindowWhenZedReturns,
        "visibleWindowFrame": visibleWindowFrame.map {
          "x=\($0.minX),y=\($0.minY),w=\($0.width),h=\($0.height)"
        } as Any,
        "windowFrame":
          "x=\(window.frame.minX),y=\(window.frame.minY),w=\(window.frame.width),h=\(window.frame.height)",
      ])

    if let frame = readTargetWindowFrame() {
      applyWindowResizeLimits(attachedTo: frame)
      let nextFrame = windowFrame(attachedTo: frame)
      window.setFrame(nextFrame, display: true)
      visibleWindowFrame = nextFrame
    } else if let visibleWindowFrame {
      window.setFrame(visibleWindowFrame, display: true)
    }

    window.level = .floating
    window.orderFrontRegardless()
    /**
     CDXC:ZedOverlay 2026-04-26-07:22
     Restoring zmux from the native Zed overlay button should also transfer
     macOS focus to zmux so keyboard input goes to the terminal/workarea
     instead of remaining in the Zed editor underneath.
     */
    NSApp.activate(ignoringOtherApps: true)
    window.makeKeyAndOrderFront(nil)
    isWindowVisibleInAttachment = true
    didShowAttachment()
    BrowserOverlayRestoreReproLog.append(
      "zedOverlay.showWindow.applied",
      [
        "isWindowVisibleInAttachment": isWindowVisibleInAttachment,
        "windowFrame":
          "x=\(window.frame.minX),y=\(window.frame.minY),w=\(window.frame.width),h=\(window.frame.height)",
      ])
    updateButtonPosition()
  }

  private func moveWindowOffscreen(openWorkspaceInZed shouldOpenWorkspaceInZed: Bool) {
    guard let window else {
      return
    }
    BrowserOverlayRestoreReproLog.append(
      "zedOverlay.moveWindowOffscreen.request",
      [
        "isWindowVisibleInAttachment": isWindowVisibleInAttachment,
        "shouldOpenWorkspaceInZed": shouldOpenWorkspaceInZed,
        "visibleWindowFrame": visibleWindowFrame.map {
          "x=\($0.minX),y=\($0.minY),w=\($0.width),h=\($0.height)"
        } as Any,
        "windowFrame":
          "x=\(window.frame.minX),y=\(window.frame.minY),w=\(window.frame.width),h=\(window.frame.height)",
      ])

    if isWindowVisibleInAttachment {
      visibleWindowFrame = window.frame
    }

    let sourceFrame = visibleWindowFrame ?? window.frame
    window.setFrame(offscreenFrame(preserving: sourceFrame), display: false)
    pushHiddenWindowFurtherLeftAfterDelay()
    isWindowVisibleInAttachment = false
    didHideAttachment()
    BrowserOverlayRestoreReproLog.append(
      "zedOverlay.moveWindowOffscreen.applied",
      [
        "isWindowVisibleInAttachment": isWindowVisibleInAttachment,
        "sourceFrame":
          "x=\(sourceFrame.minX),y=\(sourceFrame.minY),w=\(sourceFrame.width),h=\(sourceFrame.height)",
        "windowFrame":
          "x=\(window.frame.minX),y=\(window.frame.minY),w=\(window.frame.width),h=\(window.frame.height)",
      ])

    if shouldOpenWorkspaceInZed {
      openWorkspaceInZed()
    }
  }

  private func restoreWindowIfOffscreen() -> Bool {
    guard !isWindowVisibleInAttachment, let window, let visibleWindowFrame else {
      return false
    }
    window.setFrame(visibleWindowFrame, display: true)
    window.orderFrontRegardless()
    isWindowVisibleInAttachment = true
    return true
  }

  private func startFollowingTargetWindow() {
    if followTimer != nil {
      return
    }
    followTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
      Task { @MainActor in
        self?.updateButtonPosition()
        self?.repositionVisibleWindow()
      }
    }
  }

  private func stopFollowingTargetWindow() {
    followTimer?.invalidate()
    followTimer = nil
  }

  private func repositionVisibleWindow() {
    guard isWindowVisibleInAttachment, let frame = readTargetWindowFrame() else {
      return
    }
    applyWindowResizeLimits(attachedTo: frame)
    window?.setFrame(windowFrame(attachedTo: frame), display: true)
  }

  private func updateButtonPosition() {
    guard let frame = readTargetWindowFrame() else {
      hideButton()
      return
    }
    showButton(attachedTo: frame)
  }

  private func showButton(attachedTo frame: TargetWindowFrame) {
    guard let panel = buttonPanel else {
      return
    }
    updateButtonTitle()
    let buttonTopLeft = CGPoint(
      x: frame.axTopLeft.x + frame.size.width / 2 - Self.buttonPanelSize.width / 2,
      y: frame.axTopLeft.y + 5
    )
    let appKitButtonTopLeft = appKitTopLeftPoint(fromAccessibilityTopLeft: buttonTopLeft)
    panel.setContentSize(Self.buttonPanelSize)
    panel.setFrameTopLeftPoint(appKitButtonTopLeft)
    Self.logger.debug(
      "Showing Zed overlay button ax=(\(buttonTopLeft.x), \(buttonTopLeft.y)) appkit=(\(appKitButtonTopLeft.x), \(appKitButtonTopLeft.y))"
    )
    panel.orderFrontRegardless()
  }

  private func updateButtonTitle() {
    /**
     CDXC:ZedOverlay 2026-04-26-09:56
     The floating native button labels the destination of the next click:
     visible zmux offers switching back to Zed, while hidden zmux offers
     switching back to zmux.
     */
    toggleButton?.title =
      isWindowVisibleInAttachment ? "Show \(targetAppConfiguration().buttonName)" : "Show zmux"
  }

  private func hideButton() {
    buttonPanel?.orderOut(nil)
  }

  private func makeButtonPanel() -> NSPanel {
    let panel = ZedOverlayButtonPanel(
      contentRect: NSRect(origin: CGPoint(x: -10_000, y: -10_000), size: Self.buttonPanelSize),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    panel.isReleasedWhenClosed = false
    panel.hasShadow = true
    panel.backgroundColor = .clear
    panel.isOpaque = false
    panel.level = .statusBar
    panel.hidesOnDeactivate = false
    /**
     CDXC:ZedOverlay 2026-04-26-03:22
     The native button must remain clickable without activating zmux and must
     be able to appear over Zed Preview when that window lives on another
     display or Space. Visibility is still gated by the configured Zed app.
     */
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
    panel.ignoresMouseEvents = false

    let button = NSButton(title: "Show Zed", target: self, action: #selector(handleButtonClick))
    /**
     CDXC:ZedOverlay 2026-04-27-01:16
     The native IDE title-bar panel should expose only the Show Zed/Show
     zmux toggle. Detach remains a settings-level attach-state action, not
     a second title-bar button beside the primary switch.
     */
    button.bezelStyle = .rounded
    button.controlSize = .small
    button.font = .systemFont(ofSize: 12, weight: .semibold)
    button.frame = NSRect(origin: .zero, size: Self.toggleButtonSize)
    self.toggleButton = button

    let contentView = NSView(frame: NSRect(origin: .zero, size: Self.buttonPanelSize))
    contentView.addSubview(button)
    panel.contentView = contentView
    panel.orderOut(nil)
    return panel
  }

  @objc private func handleButtonClick() {
    toggleWindow()
  }

  private func readTargetWindowFrame() -> TargetWindowFrame? {
    let shouldPromptForAccessibility = enabled && !hasRequestedAccessibilityPermission
    guard isAccessibilityTrusted(promptIfNeeded: shouldPromptForAccessibility) else {
      if shouldPromptForAccessibility {
        hasRequestedAccessibilityPermission = true
      }
      /**
       CDXC:IDEAttachment 2026-04-27-01:08
       Attach mode depends on Accessibility to read the IDE window frame.
       If macOS has not granted zmux permission, request it at the moment
       attach is enabled and keep the native button hidden until the same
       signed /Applications/zmux.app identity is allowed.
       Only prompt once per app run; the follow timer keeps polling so the
       button appears after the user grants access without prompt spam.
       */
      BrowserOverlayRestoreReproLog.append(
        "zedOverlay.readTargetWindowFrame.accessibilityDenied",
        [
          "targetApp": targetApp.rawValue
        ])
      Self.logger.info(
        "Accessibility permission is required before the target editor frame can be read")
      return nil
    }
    hasRequestedAccessibilityPermission = false

    let applications = runningTargetApplications()
    guard !applications.isEmpty else {
      Self.logger.debug("Configured target Zed app is not running")
      return nil
    }

    /**
     CDXC:IDEAttachment 2026-04-27-01:08
     Re-enabling attach must anchor the button to the actual editor window,
     not to a helper process that happens to share the target .app bundle.
     Iterate matching regular apps and return the first process exposing
     real Accessibility windows so Zed/Zed Preview title-bar controls come
     back immediately after the setting is toggled on.
     */
    for application in applications {
      if let frame = readTargetWindowFrame(for: application) {
        return frame
      }
    }

    Self.logger.info("Could not read any target editor windows through Accessibility")
    return nil
  }

  private func readTargetWindowFrame(for application: NSRunningApplication) -> TargetWindowFrame? {
    let axApplication = AXUIElementCreateApplication(application.processIdentifier)
    var windowsValue: CFTypeRef?
    let windowsResult = AXUIElementCopyAttributeValue(
      axApplication,
      kAXWindowsAttribute as CFString,
      &windowsValue
    )
    guard windowsResult == .success,
      let windows = windowsValue as? [AXUIElement],
      let window = windows.first
    else {
      Self.logger.info(
        "Could not read target editor windows through Accessibility pid=\(application.processIdentifier)"
      )
      return nil
    }

    var positionValue: CFTypeRef?
    var sizeValue: CFTypeRef?
    guard
      AXUIElementCopyAttributeValue(window, kAXPositionAttribute as CFString, &positionValue)
        == .success,
      AXUIElementCopyAttributeValue(window, kAXSizeAttribute as CFString, &sizeValue) == .success,
      let position = positionValue,
      let size = sizeValue
    else {
      Self.logger.info("Could not read target Zed window position/size through Accessibility")
      return nil
    }

    var topLeft = CGPoint.zero
    var windowSize = CGSize.zero
    guard CFGetTypeID(position) == AXValueGetTypeID(),
      CFGetTypeID(size) == AXValueGetTypeID(),
      AXValueGetValue(position as! AXValue, .cgPoint, &topLeft),
      AXValueGetValue(size as! AXValue, .cgSize, &windowSize),
      windowSize.width > 0,
      windowSize.height > 0
    else {
      return nil
    }

    let screen = screen(containingAccessibilityTopLeft: topLeft) ?? NSScreen.main
    guard let screen else {
      Self.logger.info("Could not map target editor Accessibility frame to an NSScreen")
      return nil
    }
    let appKitTopLeft = appKitTopLeftPoint(fromAccessibilityTopLeft: topLeft)
    Self.logger.debug(
      "Read target editor frame pid=\(application.processIdentifier) ax=(\(topLeft.x), \(topLeft.y)) size=(\(windowSize.width), \(windowSize.height)) appkit=(\(appKitTopLeft.x), \(appKitTopLeft.y)) screen=\(screen.localizedName, privacy: .public)"
    )
    return TargetWindowFrame(axTopLeft: topLeft, size: windowSize, screen: screen)
  }

  private func isAccessibilityTrusted(promptIfNeeded shouldPrompt: Bool) -> Bool {
    let options =
      [
        kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: shouldPrompt
      ] as CFDictionary
    return AXIsProcessTrustedWithOptions(options)
  }

  private func windowFrame(attachedTo frame: TargetWindowFrame) -> NSRect {
    /**
     CDXC:ZedOverlay 2026-04-26-10:46
     Attached zmux stays resizable, but its maximum attached size is inset
     40 points from every IDE edge so a border of the Zed window remains
     visible behind the floating window. If the user has not established a
     previous attached size yet, the first restore should use that maximum
     allowed size instead of inheriting the standalone app window size.
     */
    let maxWidth = max(520, frame.size.width - Self.attachedWindowInset * 2)
    let maxHeight = max(320, frame.size.height - Self.attachedWindowInset * 2)
    let currentWidth = attachedWindowWidth ?? maxWidth
    let currentHeight = attachedWindowHeight ?? maxHeight
    let width = max(520, min(currentWidth, maxWidth))
    let height = max(320, min(currentHeight, maxHeight))
    let topLeft = CGPoint(
      x: frame.axTopLeft.x + (frame.size.width - width) / 2,
      y: frame.axTopLeft.y + (frame.size.height - height) / 2
    )
    let appKitTopLeft = appKitTopLeftPoint(fromAccessibilityTopLeft: topLeft)
    attachedWindowWidth = width
    attachedWindowHeight = height
    return NSRect(x: topLeft.x, y: appKitTopLeft.y - height, width: width, height: height)
  }

  private func applyWindowResizeLimits(attachedTo frame: TargetWindowFrame) {
    guard let window else {
      return
    }
    let maxWidth = max(520, frame.size.width - Self.attachedWindowInset * 2)
    let maxHeight = max(320, frame.size.height - Self.attachedWindowInset * 2)
    window.minSize = CGSize(width: min(520, maxWidth), height: min(320, maxHeight))
    window.maxSize = CGSize(width: maxWidth, height: maxHeight)
    if attachedWindowWidth != nil {
      attachedWindowWidth = min(max(window.frame.width, 520), maxWidth)
    }
    if attachedWindowHeight != nil {
      attachedWindowHeight = min(max(window.frame.height, 320), maxHeight)
    }
  }

  private func resetWindowResizeLimits() {
    guard let window else {
      return
    }
    window.minSize = CGSize(width: 320, height: 240)
    window.maxSize = CGSize(width: 100_000, height: 100_000)
    attachedWindowWidth = nil
    attachedWindowHeight = nil
  }

  private func offscreenFrame(preserving frame: NSRect) -> NSRect {
    /**
     CDXC:ZedOverlay 2026-04-26-10:42
     Hidden attached windows should place their top-right corner at the
     exact measured offscreen point the user selected: (-1437, 1022) in
     macOS Accessibility top-left coordinates, then perform one delayed
     35px left nudge from the resulting frame because the first AppKit move
     can still leave a visible strip in the lower-left corner.
     */
    let topLeft = hiddenAccessibilityTopLeft(preserving: frame)
    let appKitTopLeft = appKitTopLeftPoint(fromAccessibilityTopLeft: topLeft)
    return NSRect(
      x: topLeft.x,
      y: appKitTopLeft.y - frame.height,
      width: frame.width,
      height: frame.height
    )
  }

  private func pushHiddenWindowFurtherLeftAfterDelay() {
    /**
     CDXC:ZedOverlay 2026-04-26-10:42
     The requested hidden-position correction is intentionally simple:
     after the normal offscreen move settles, wait 200ms and move the
     current hidden frame exactly 35px further left.
     */
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
      guard let self, let window = self.window, !self.isWindowVisibleInAttachment else {
        return
      }
      var frame = window.frame
      frame.origin.x -= 35
      window.setFrame(frame, display: false)
      BrowserOverlayRestoreReproLog.append(
        "zedOverlay.moveWindowOffscreen.delayedLeftNudge",
        [
          "windowFrame":
            "x=\(window.frame.minX),y=\(window.frame.minY),w=\(window.frame.width),h=\(window.frame.height)"
        ])
    }
  }

  private func hiddenAccessibilityTopLeft(preserving frame: NSRect) -> CGPoint {
    CGPoint(
      x: Self.measuredHiddenTopRight.x - frame.width,
      y: Self.measuredHiddenTopRight.y
    )
  }

  private func appKitTopLeftPoint(fromAccessibilityTopLeft point: CGPoint) -> CGPoint {
    CGPoint(x: point.x, y: accessibilityOriginTopY() - point.y)
  }

  /**
   CDXC:ZedOverlay 2026-04-26-03:22
   Accessibility reports window origins in a global top-left coordinate space
   anchored to the primary display. AppKit windows use bottom-left screen
   coordinates, so vertically stacked displays require conversion through the
   primary display height before selecting the destination screen.
   */
  private func screen(containingAccessibilityTopLeft point: CGPoint) -> NSScreen? {
    let appKitPoint = appKitTopLeftPoint(fromAccessibilityTopLeft: point)
    return NSScreen.screens.first { screen in
      let xMatches =
        appKitPoint.x >= screen.frame.minX - 80 && appKitPoint.x <= screen.frame.maxX + 80
      let yMatches =
        appKitPoint.y >= screen.frame.minY - 80 && appKitPoint.y <= screen.frame.maxY + 80
      return xMatches && yMatches
    }
  }

  private func accessibilityOriginTopY() -> CGFloat {
    NSScreen.screens.first { screen in
      screen.frame.origin == .zero
    }?.frame.maxY ?? NSScreen.main?.frame.maxY ?? NSScreen.screens.first?.frame.maxY ?? 0
  }

  private func runningTargetApplications() -> [NSRunningApplication] {
    let candidates = NSWorkspace.shared.runningApplications
      .filter { !$0.isTerminated && isTargetApplication($0) }

    return candidates.sorted { lhs, rhs in
      if lhs.isActive != rhs.isActive {
        return lhs.isActive
      }
      if lhs.activationPolicy != rhs.activationPolicy {
        return lhs.activationPolicy == .regular
      }
      if lhs.localizedName != rhs.localizedName {
        return lhs.localizedName == targetAppConfiguration().processName
      }
      return lhs.processIdentifier < rhs.processIdentifier
    }
  }

  private func isTargetApplication(_ application: NSRunningApplication) -> Bool {
    let target = targetAppConfiguration()
    if application.localizedName == target.processName {
      return true
    }
    return application.bundleURL?.lastPathComponent == target.bundleName
  }

  private func targetAppConfiguration() -> TargetApp {
    switch targetApp {
    case .zed:
      TargetApp(
        buttonName: "Zed", bundleName: "Zed.app", commandName: "zed",
        commandReuseWindowArgument: "--existing", processName: "Zed")
    case .zedPreview:
      TargetApp(
        buttonName: "Zed", bundleName: "Zed Preview.app", commandName: "zed",
        commandReuseWindowArgument: "--existing", processName: "Zed Preview")
    case .vscode:
      TargetApp(
        buttonName: "VS Code", bundleName: "Visual Studio Code.app", commandName: "code",
        commandReuseWindowArgument: "--reuse-window", processName: "Code")
    case .vscodeInsiders:
      TargetApp(
        buttonName: "VS Code", bundleName: "Visual Studio Code - Insiders.app",
        commandName: "code-insiders", commandReuseWindowArgument: "--reuse-window",
        processName: "Code - Insiders")
    }
  }

  private func openWorkspaceInZed() {
    /**
     CDXC:ZedOverlayWorkspace 2026-04-26-00:47
     When the user hides zmux from a different workspace, reopen the active
     project in the existing Zed window using a background process so macOS
     Terminal never appears.
     */
    let path = workspacePath ?? workspacePathProvider()
    guard let path, !path.isEmpty else {
      return
    }

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    let target = targetAppConfiguration()
    process.arguments = [target.commandName, path, target.commandReuseWindowArgument]
    process.standardInput = FileHandle.nullDevice
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
    } catch {
      Self.logger.error("Failed to open workspace in Zed: \(error.localizedDescription)")
    }
  }
}

private final class ZedOverlayButtonPanel: NSPanel {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}
