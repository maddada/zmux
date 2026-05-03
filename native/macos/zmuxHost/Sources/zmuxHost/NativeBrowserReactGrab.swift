import AppKit
import CryptoKit
import Foundation
import WebKit

enum NativeBrowserReactGrabSettings {
  static let defaultVersion = "0.1.29"
  static let knownHashes = [
    "0.1.29": "4a1e71090e8ad8bb6049de80ccccdc0f5bb147b9f8fb88886d871612ac7ca04b"
  ]

  static func scriptURL(for version: String) -> URL {
    URL(string: "https://unpkg.com/react-grab@\(version)/dist/index.global.js")!
  }
}

/**
 CDXC:BrowserPanes 2026-05-02-06:35
 Browser panes need the same React Grab injection capability as the native
 browser implementation. Keep the loader integrity-checked and cached so the
 action does not silently execute a changed CDN payload.
 */
enum NativeBrowserReactGrabScriptLoader {
  private static var cachedScript: String?
  private static var cachedVersion: String?

  static func fetch() async -> String? {
    let version = NativeBrowserReactGrabSettings.defaultVersion
    if cachedVersion == version, let cachedScript {
      return cachedScript
    }

    let url = NativeBrowserReactGrabSettings.scriptURL(for: version)
    do {
      let (data, _) = try await URLSession.shared.data(from: url)
      if let expectedHash = NativeBrowserReactGrabSettings.knownHashes[version] {
        let hash = SHA256.hash(data: data)
        let hex = hash.compactMap { String(format: "%02x", $0) }.joined()
        guard hex == expectedHash else {
          NSLog("ReactGrab: integrity mismatch for v%@ (got %@)", version, hex)
          return nil
        }
      }
      guard let script = String(data: data, encoding: .utf8) else {
        return nil
      }
      cachedScript = script
      cachedVersion = version
      return script
    } catch {
      NSLog("ReactGrab: fetch failed for v%@: %@", version, error.localizedDescription)
      return nil
    }
  }
}

@MainActor
enum NativeBrowserReactGrabInjector {
  static func toggleOrInject(into webView: WKWebView) async {
    guard let scriptSource = await NativeBrowserReactGrabScriptLoader.fetch() else {
      NSSound.beep()
      return
    }

    let combined = """
      (function() {
        if (window.__REACT_GRAB__) {
          window.__REACT_GRAB__.toggle();
          return;
        }
        window.addEventListener('react-grab:init', function(event) {
          var api = event.detail;
          if (!api) return;
          api.activate();
        }, { once: true });
      })();
      \(scriptSource)
      """

    do {
      _ = try await webView.evaluateJavaScript(combined)
    } catch {
      NSLog("ReactGrab: injection failed: %@", error.localizedDescription)
      NSSound.beep()
    }
  }
}
