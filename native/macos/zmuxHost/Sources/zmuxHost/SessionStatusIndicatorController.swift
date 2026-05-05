import AppKit
import CoreGraphics

@MainActor
final class SessionStatusIndicatorController {
  private static let defaultScreenMargin: CGFloat = 22

  private let panel: NSPanel
  private let indicatorView: SessionStatusIndicatorView
  private var hasUserPositionedPanel = false

  /**
   CDXC:SessionStatusIndicators 2026-05-05-19:47
   Session counts must be rendered by AppKit, not SwiftUI, so the floating
   status UI can live outside the zmux content view, default to the built-in or
   primary display, and support Shift-drag repositioning without webview hit
   testing.
   */
  init(onClick: @escaping (NativeSessionStatusIndicatorStatus) -> Void) {
    let view = SessionStatusIndicatorView(
      onClick: { status in
        NSApp.activate(ignoringOtherApps: true)
        onClick(status)
      },
      onShiftDrag: {})
    let panel = NSPanel(
      contentRect: NSRect(origin: .zero, size: view.preferredSize),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    self.indicatorView = view
    self.panel = panel
    panel.backgroundColor = .clear
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
    panel.contentView = indicatorView
    panel.hasShadow = true
    panel.hidesOnDeactivate = false
    panel.ignoresMouseEvents = false
    panel.isFloatingPanel = true
    panel.isOpaque = false
    panel.isReleasedWhenClosed = false
    panel.level = .floating
    view.onShiftDrag = { [weak self] in
      self?.hasUserPositionedPanel = true
    }
  }

  func apply(_ command: SetSessionStatusIndicators) {
    let items = Self.visibleItems(for: command)
    indicatorView.items = items
    guard !items.isEmpty else {
      panel.orderOut(nil)
      return
    }

    let nextSize = indicatorView.preferredSize
    let nextOrigin =
      hasUserPositionedPanel
      ? Self.clampedOrigin(panel.frame.origin, size: nextSize)
      : Self.defaultOrigin(size: nextSize)
    panel.setFrame(NSRect(origin: nextOrigin, size: nextSize), display: true)
    panel.orderFrontRegardless()
  }

  private static func visibleItems(
    for command: SetSessionStatusIndicators
  ) -> [SessionStatusIndicatorItem] {
    /**
     CDXC:SessionStatusIndicators 2026-05-05-19:47
     Attention and running counts are action states and should suppress the
     gray available-session total whenever either exists. The gray circle is
     only a quiet all-available summary for the fully idle case.
     */
    if command.attentionCount > 0 || command.runningCount > 0 {
      return [
        command.attentionCount > 0
          ? SessionStatusIndicatorItem(
            status: .attention,
            count: command.attentionCount,
            color: NSColor.systemGreen)
          : nil,
        command.runningCount > 0
          ? SessionStatusIndicatorItem(
            status: .running,
            count: command.runningCount,
            color: NSColor.systemOrange)
          : nil,
      ].compactMap { $0 }
    }

    guard command.availableCount > 0 else {
      return []
    }
    return [
      SessionStatusIndicatorItem(
        status: .available,
        count: command.availableCount,
        color: NSColor.systemGray)
    ]
  }

  private static func defaultOrigin(size: NSSize) -> NSPoint {
    let screen = defaultScreen()
    let frame = screen.visibleFrame
    return NSPoint(
      x: frame.maxX - size.width - defaultScreenMargin,
      y: frame.minY + defaultScreenMargin)
  }

  private static func clampedOrigin(_ origin: NSPoint, size: NSSize) -> NSPoint {
    guard let screen = screen(containing: origin) ?? defaultScreenOptional() else {
      return origin
    }
    let frame = screen.visibleFrame
    let maxX = max(frame.minX, frame.maxX - size.width)
    let maxY = max(frame.minY, frame.maxY - size.height)
    return NSPoint(
      x: min(max(origin.x, frame.minX), maxX),
      y: min(max(origin.y, frame.minY), maxY))
  }

  private static func screen(containing origin: NSPoint) -> NSScreen? {
    NSScreen.screens.first { $0.frame.contains(origin) }
  }

  private static func defaultScreen() -> NSScreen {
    defaultScreenOptional() ?? NSScreen.main ?? NSScreen.screens.first!
  }

  private static func defaultScreenOptional() -> NSScreen? {
    NSScreen.screens.first(where: isBuiltInScreen) ?? NSScreen.main ?? NSScreen.screens.first
  }

  private static func isBuiltInScreen(_ screen: NSScreen) -> Bool {
    let key = NSDeviceDescriptionKey("NSScreenNumber")
    guard let displayNumber = screen.deviceDescription[key] as? NSNumber else {
      return false
    }
    return CGDisplayIsBuiltin(CGDirectDisplayID(displayNumber.uint32Value)) != 0
  }
}

private struct SessionStatusIndicatorItem {
  let status: NativeSessionStatusIndicatorStatus
  let count: Int
  let color: NSColor
}

@MainActor
private final class SessionStatusIndicatorView: NSView {
  private struct ShiftDragState {
    let mouseStart: NSPoint
    let windowOriginStart: NSPoint
  }

  private static let circleDiameter: CGFloat = 36
  private static let contentInset: CGFloat = 2
  private static let itemGap: CGFloat = 8
  private static let minimumTextPadding: CGFloat = 16
  private static let textAttributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.monospacedDigitSystemFont(ofSize: 15, weight: .bold),
    .foregroundColor: NSColor.white,
  ]

  var items: [SessionStatusIndicatorItem] = [] {
    didSet {
      needsDisplay = true
    }
  }

  var preferredSize: NSSize {
    let itemWidths = items.map { diameter(for: $0) }
    let width =
      itemWidths.reduce(0, +)
      + CGFloat(max(items.count - 1, 0)) * Self.itemGap
      + Self.contentInset * 2
    let height = (itemWidths.max() ?? Self.circleDiameter) + Self.contentInset * 2
    return NSSize(width: width, height: height)
  }

  private let onClick: (NativeSessionStatusIndicatorStatus) -> Void
  var onShiftDrag: () -> Void
  private var mouseDownStatus: NativeSessionStatusIndicatorStatus?
  private var shiftDragState: ShiftDragState?

  init(
    onClick: @escaping (NativeSessionStatusIndicatorStatus) -> Void,
    onShiftDrag: @escaping () -> Void
  ) {
    self.onClick = onClick
    self.onShiftDrag = onShiftDrag
    super.init(frame: NSRect(origin: .zero, size: .zero))
    wantsLayer = true
    layer?.backgroundColor = NSColor.clear.cgColor
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override var isOpaque: Bool {
    false
  }

  override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
    true
  }

  override func draw(_ dirtyRect: NSRect) {
    super.draw(dirtyRect)
    for (item, rect) in itemRects() {
      item.color.setFill()
      NSBezierPath(ovalIn: rect).fill()

      let label = NSAttributedString(
        string: "\(item.count)",
        attributes: Self.textAttributes)
      let labelSize = label.size()
      label.draw(
        at: NSPoint(
          x: rect.midX - labelSize.width / 2,
          y: rect.midY - labelSize.height / 2 + 0.5))
    }
  }

  override func mouseDown(with event: NSEvent) {
    mouseDownStatus = nil
    if event.modifierFlags.contains(.shift) {
      beginShiftDrag()
      return
    }
    mouseDownStatus = status(at: convert(event.locationInWindow, from: nil))
  }

  override func mouseDragged(with event: NSEvent) {
    if shiftDragState == nil, event.modifierFlags.contains(.shift) {
      beginShiftDrag()
    }
    guard let shiftDragState, let window else {
      return
    }
    let mouseLocation = NSEvent.mouseLocation
    window.setFrameOrigin(
      NSPoint(
        x: shiftDragState.windowOriginStart.x + mouseLocation.x - shiftDragState.mouseStart.x,
        y: shiftDragState.windowOriginStart.y + mouseLocation.y - shiftDragState.mouseStart.y))
    onShiftDrag()
  }

  override func mouseUp(with event: NSEvent) {
    if shiftDragState != nil {
      shiftDragState = nil
      return
    }
    guard let mouseDownStatus else {
      return
    }
    defer {
      self.mouseDownStatus = nil
    }
    if status(at: convert(event.locationInWindow, from: nil)) == mouseDownStatus {
      onClick(mouseDownStatus)
    }
  }

  private func beginShiftDrag() {
    guard let window else {
      return
    }
    shiftDragState = ShiftDragState(
      mouseStart: NSEvent.mouseLocation,
      windowOriginStart: window.frame.origin)
    mouseDownStatus = nil
    onShiftDrag()
  }

  private func status(at point: NSPoint) -> NativeSessionStatusIndicatorStatus? {
    itemRects().first { _, rect in rect.contains(point) }?.0.status
  }

  private func itemRects() -> [(SessionStatusIndicatorItem, NSRect)] {
    var x = Self.contentInset
    let centerY = bounds.midY
    return items.map { item in
      let diameter = diameter(for: item)
      let rect = NSRect(
        x: x,
        y: centerY - diameter / 2,
        width: diameter,
        height: diameter)
      x += diameter + Self.itemGap
      return (item, rect)
    }
  }

  private func diameter(for item: SessionStatusIndicatorItem) -> CGFloat {
    let label = NSAttributedString(
      string: "\(item.count)",
      attributes: Self.textAttributes)
    return max(Self.circleDiameter, ceil(label.size().width + Self.minimumTextPadding))
  }
}
