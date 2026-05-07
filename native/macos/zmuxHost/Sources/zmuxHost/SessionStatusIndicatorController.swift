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
    panel.hasShadow = false
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
    indicatorView.sizeSetting = command.size
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
            color: NSColor(calibratedRed: 0.13, green: 0.54, blue: 0.20, alpha: 1))
          : nil,
        command.runningCount > 0
          ? SessionStatusIndicatorItem(
            status: .running,
            count: command.runningCount,
            color: NSColor(calibratedRed: 0.70, green: 0.36, blue: 0.10, alpha: 1))
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
        color: NSColor(calibratedWhite: 0.32, alpha: 1))
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
  private struct IndicatorMetrics {
    let scale: CGFloat

    var circleDiameter: CGFloat { 52 * scale }
    var horizontalInset: CGFloat { 11 * scale }
    var verticalInset: CGFloat { 8 * scale }
    var itemGap: CGFloat { 6 * scale }
    var minimumTextPadding: CGFloat { 20 * scale }
    var countFont: NSFont {
      NSFont.monospacedDigitSystemFont(ofSize: 23 * scale, weight: .bold)
    }

    var backdropInset: CGFloat { 3 * scale }
    var backdropShadowBlur: CGFloat { 14 * scale }
    var backdropShadowOffset: CGFloat { -3 * scale }
    var backdropStrokeWidth: CGFloat { max(0.6, 1.4 * scale) }
    var innerBackdropInset: CGFloat { 2.5 * scale }
    var topHighlightInset: CGFloat { 5 * scale }
    var badgeShadowBlur: CGFloat { 8 * scale }
    var badgeShadowOffset: CGFloat { -2 * scale }
    var badgeRingInset: CGFloat { 2 * scale }
    var badgeFillInset: CGFloat { 5.5 * scale }
    var badgeStrokeWidth: CGFloat { max(0.5, 1.2 * scale) }
    var textBaselineOffset: CGFloat { 0.5 * scale }
  }

  private struct ShiftDragState {
    let mouseStart: NSPoint
    let windowOriginStart: NSPoint
  }

  /**
   CDXC:SessionStatusIndicators 2026-05-07-16:42
   Counts should read clearly at default size, and a future user-facing size
   setting should scale a small set of base metrics instead of rewriting draw
   logic. Keep the default number visually dominant inside the indicator.
   CDXC:SessionStatusIndicators 2026-05-07-17:36
   The indicator should use a polished glass capsule with circular status
   badges, matching the approved visual direction while preserving the
   inactive-only-when-no-action-state visibility rule in visibleItems.
   CDXC:SessionStatusIndicators 2026-05-07-18:02
   A single visible status must not collapse the backdrop into a square-looking
   button. Keep a horizontal capsule minimum and draw all shadows inside the
   view so transparent NSPanel edges never create rectangular chrome.
   CDXC:SessionStatusIndicators 2026-05-07-18:20
   The current polished indicator size is X-Large. Medium is the default and
   scales every drawing metric to 50% of X-Large; Large and Small are named
   settings values that reuse the same AppKit drawing path.
   CDXC:SessionStatusIndicators 2026-05-07-18:32
   The capsule should fit the visible badges tightly, including the single
   badge case. Badge fill colors stay darker for text contrast, and numbers
   render as full white rather than tinted text.
   */
  private static func metrics(for size: NativeSessionStatusIndicatorSize) -> IndicatorMetrics {
    switch size {
    case .small:
      return IndicatorMetrics(scale: 0.4)
    case .medium:
      return IndicatorMetrics(scale: 0.5)
    case .large:
      return IndicatorMetrics(scale: 0.75)
    case .xLarge:
      return IndicatorMetrics(scale: 1)
    }
  }

  var items: [SessionStatusIndicatorItem] = [] {
    didSet {
      needsDisplay = true
    }
  }

  var sizeSetting: NativeSessionStatusIndicatorSize = .medium {
    didSet {
      needsDisplay = true
    }
  }

  var preferredSize: NSSize {
    let metrics = currentMetrics
    let itemWidths = items.map { diameter(for: $0) }
    let contentWidth =
      itemWidths.reduce(0, +)
      + CGFloat(max(items.count - 1, 0)) * metrics.itemGap
      + metrics.horizontalInset * 2
    let width = contentWidth
    let height = (itemWidths.max() ?? metrics.circleDiameter) + metrics.verticalInset * 2
    return NSSize(width: width, height: height)
  }

  private var currentMetrics: IndicatorMetrics {
    Self.metrics(for: sizeSetting)
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
    let metrics = currentMetrics
    drawBackdrop(metrics: metrics)
    for (item, rect) in itemRects() {
      drawBadge(item, in: rect, metrics: metrics)

      let label = NSAttributedString(
        string: "\(item.count)",
        attributes: textAttributes(metrics: metrics))
      let labelSize = label.size()
      label.draw(
        at: NSPoint(
          x: rect.midX - labelSize.width / 2,
          y: rect.midY - labelSize.height / 2 + metrics.textBaselineOffset))
    }
  }

  private func drawBackdrop(metrics: IndicatorMetrics) {
    let rect = bounds.insetBy(dx: metrics.backdropInset, dy: metrics.backdropInset)
    let radius = rect.height / 2
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)

    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowBlurRadius = metrics.backdropShadowBlur
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.58)
    shadow.shadowOffset = NSSize(width: 0, height: metrics.backdropShadowOffset)
    shadow.set()
    NSColor(calibratedWhite: 0.06, alpha: 0.72).setFill()
    path.fill()
    NSGraphicsContext.restoreGraphicsState()

    NSGradient(colors: [
      NSColor(calibratedWhite: 0.31, alpha: 0.90),
      NSColor(calibratedWhite: 0.16, alpha: 0.84),
      NSColor(calibratedWhite: 0.07, alpha: 0.88),
    ])?.draw(in: path, angle: -90)

    NSColor.white.withAlphaComponent(0.28).setStroke()
    path.lineWidth = metrics.backdropStrokeWidth
    path.stroke()

    let innerRect = rect.insetBy(dx: metrics.innerBackdropInset, dy: metrics.innerBackdropInset)
    let innerPath = NSBezierPath(
      roundedRect: innerRect,
      xRadius: innerRect.height / 2,
      yRadius: innerRect.height / 2)
    NSColor.black.withAlphaComponent(0.52).setStroke()
    innerPath.lineWidth = 1
    innerPath.stroke()

    let topHighlightRect = NSRect(
      x: rect.minX + metrics.topHighlightInset,
      y: rect.midY,
      width: rect.width - metrics.topHighlightInset * 2,
      height: rect.height * 0.42)
    NSGradient(colors: [
      NSColor.white.withAlphaComponent(0.18),
      NSColor.white.withAlphaComponent(0.0),
    ])?.draw(
      in: NSBezierPath(
        roundedRect: topHighlightRect,
        xRadius: topHighlightRect.height / 2,
        yRadius: topHighlightRect.height / 2),
      angle: -90)
  }

  private func drawBadge(
    _ item: SessionStatusIndicatorItem,
    in rect: NSRect,
    metrics: IndicatorMetrics
  ) {
    let outerRingPath = NSBezierPath(ovalIn: rect)
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowBlurRadius = metrics.badgeShadowBlur
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.52)
    shadow.shadowOffset = NSSize(width: 0, height: metrics.badgeShadowOffset)
    shadow.set()
    NSColor(calibratedWhite: 0.03, alpha: 0.76).setFill()
    outerRingPath.fill()
    NSGraphicsContext.restoreGraphicsState()

    NSGradient(colors: [
      NSColor.white.withAlphaComponent(0.30),
      NSColor.black.withAlphaComponent(0.42),
    ])?.draw(in: outerRingPath, angle: -90)

    let ringPath = NSBezierPath(
      ovalIn: rect.insetBy(dx: metrics.badgeRingInset, dy: metrics.badgeRingInset))
    NSGradient(colors: [
      NSColor(calibratedWhite: 0.72, alpha: 0.34),
      NSColor(calibratedWhite: 0.08, alpha: 0.70),
    ])?.draw(in: ringPath, angle: -90)

    let fillRect = rect.insetBy(dx: metrics.badgeFillInset, dy: metrics.badgeFillInset)
    let fillPath = NSBezierPath(ovalIn: fillRect)
    NSGradient(colors: [
      item.color.highlight(withLevel: 0.20) ?? item.color,
      item.color,
      item.color.shadow(withLevel: 0.52) ?? item.color,
    ])?.draw(in: fillPath, angle: -90)

    NSColor.black.withAlphaComponent(0.34).setStroke()
    fillPath.lineWidth = metrics.badgeStrokeWidth
    fillPath.stroke()

    item.color.highlight(withLevel: 0.2)?.withAlphaComponent(0.70).setStroke()
    NSBezierPath(ovalIn: fillRect.insetBy(dx: 1, dy: 1)).stroke()

    let highlightRect = NSRect(
      x: fillRect.minX + fillRect.width * 0.17,
      y: fillRect.midY + fillRect.height * 0.10,
      width: fillRect.width * 0.66,
      height: fillRect.height * 0.34)
    NSGradient(colors: [
      NSColor.white.withAlphaComponent(0.30),
      NSColor.white.withAlphaComponent(0.0),
    ])?.draw(
      in: NSBezierPath(ovalIn: highlightRect),
      angle: -90)
  }

  private func textAttributes(metrics: IndicatorMetrics) -> [NSAttributedString.Key: Any] {
    let shadow = NSShadow()
    shadow.shadowBlurRadius = 2 * metrics.scale
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.58)
    shadow.shadowOffset = NSSize(width: 0, height: -1 * metrics.scale)
    return [
      .font: metrics.countFont,
      .foregroundColor: NSColor.white,
      .shadow: shadow,
    ]
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
    let metrics = currentMetrics
    let centerY = bounds.midY
    let itemWidths = items.map { diameter(for: $0) }
    let groupWidth =
      itemWidths.reduce(0, +)
      + CGFloat(max(items.count - 1, 0)) * metrics.itemGap
    var x = (bounds.width - groupWidth) / 2
    return items.map { item in
      let diameter = diameter(for: item)
      let rect = NSRect(
        x: x,
        y: centerY - diameter / 2,
        width: diameter,
        height: diameter)
      x += diameter + metrics.itemGap
      return (item, rect)
    }
  }

  private func diameter(for item: SessionStatusIndicatorItem) -> CGFloat {
    let metrics = currentMetrics
    let label = NSAttributedString(
      string: "\(item.count)",
      attributes: [.font: metrics.countFont])
    return max(metrics.circleDiameter, ceil(label.size().width + metrics.minimumTextPadding))
  }
}
