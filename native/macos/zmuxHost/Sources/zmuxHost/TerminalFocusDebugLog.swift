import Foundation

enum TerminalFocusDebugLog {
  /**
   CDXC:NativeTerminalFocus 2026-04-26-21:32
   Split Ghostty focus debugging must land in a completely separate
   ~/.zmux/logs file. These native entries record AppKit first-responder
   state around focus-sensitive actions so a repro can distinguish sidebar,
   bridge, layout-sync, and Ghostty responder causes.
   */
  static func append(event: String, details: [String: Any] = [:]) {
    let logsDirectory = FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent(".zmux/logs", isDirectory: true)
    let logURL = logsDirectory.appendingPathComponent("native-terminal-focus-debug.log")
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS ZZZZ"
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current

    var payload = details
    payload["event"] = event
    let serializedPayload = serialize(payload)
    let line = "[\(formatter.string(from: Date()))] \(serializedPayload)\n"

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
      NSLog("failed to write terminal focus debug log: \(error.localizedDescription)")
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

func nullableLogString(_ value: String?) -> Any {
  value ?? NSNull()
}
