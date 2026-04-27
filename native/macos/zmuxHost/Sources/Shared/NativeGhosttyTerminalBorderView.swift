import AppKit
import QuartzCore

final class NativeGhosttyTerminalBorderView: NSView {
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
         CDXC:NativeSessionStatus 2026-04-27-23:46
         Helper-owned Ghostty terminals still need the same workspace status
         chrome as in-process panes: blue for the focused session and pulsing
         green for done/attention. The overlay never handles hit-testing so
         native terminal keyboard and mouse input keep going to Ghostty.
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
