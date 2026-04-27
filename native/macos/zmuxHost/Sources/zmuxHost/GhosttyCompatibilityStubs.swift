import AppKit

final class BaseTerminalController: NSWindowController {
    var commandPaletteIsShowing: Bool {
        false
    }

    var focusFollowsMouse: Bool {
        false
    }

    var surfaceTree: SplitTree<Ghostty.SurfaceView> {
        SplitTree()
    }

    var focusedSurface: Ghostty.SurfaceView?

    var titleOverride: String?

    @IBAction func changeTabTitle(_ sender: Any?) {}

    func toggleBackgroundOpacity() {}

    func promptTabTitle() {}
}

enum TerminalRestoreError: Error {
    case delegateInvalid
}

class TerminalWindow: NSWindow {
    func isTabBar(_ controller: NSTitlebarAccessoryViewController) -> Bool {
        false
    }
}

final class HiddenTitlebarTerminalWindow: TerminalWindow {}
