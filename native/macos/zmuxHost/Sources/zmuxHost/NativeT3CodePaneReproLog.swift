import Foundation
import OSLog

enum NativeT3CodePaneReproLog {
  private static let logger = Logger(
    subsystem: "com.madda.zmux.host", category: "native-t3-code-pane-repro")
  private static let logDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS ZZZZ"
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    return formatter
  }()
  private static var didCreateLogsDirectory = false

  /**
   CDXC:T3Code 2026-04-30-03:02
   Native T3 Code blank-pane repros need a dedicated log file separate from
   terminal focus and sidebar lifecycle logs. Capture runtime launch, WKWebView
   navigation, HTTP response, and injected page diagnostics when debugging mode
   is enabled so gray-pane failures can be reproduced without changing behavior.
   */
  static func append(_ event: String, _ details: [String: Any] = [:]) {
    guard NativeDebugLogging.isEnabled else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("native-t3-code-pane-repro.log")

    var payload = details
    payload["event"] = event
    let line = "[\(logDateFormatter.string(from: Date()))] \(serialize(payload))\n"

    do {
      if !didCreateLogsDirectory {
        try FileManager.default.createDirectory(at: logsDirectory, withIntermediateDirectories: true)
        didCreateLogsDirectory = true
      }
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
      logger.warning("failed to write T3 Code pane repro log: \(error.localizedDescription)")
    }
  }

  private static func serialize(_ payload: [String: Any]) -> String {
    guard JSONSerialization.isValidJSONObject(payload),
      let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
      let json = String(data: data, encoding: .utf8)
    else {
      return "{\"event\":\"serializationFailed\"}"
    }
    return json
  }
}

