import Foundation

enum TerminalFocusDebugLog {
  private static let noisyEvents = Set([
    "nativeSidebar.postNative",
    "nativeSidebar.terminalFocused.applied",
    "nativeSidebar.terminalFocused.duplicateSkipped",
    "nativeWorkspace.focusTerminal.completed",
    "nativeWorkspace.sendTerminalEnter.sent",
    "nativeWorkspace.sendTerminalEnter.start",
    "nativeWorkspace.setActiveTerminalSet.focusSkipped",
    "nativeWorkspace.setTerminalLayout",
    "nativeWorkspace.setTerminalVisibility",
    "nativeWorkspace.windowFirstResponderChanged.nil",
    "nativeWorkspace.windowFirstResponderChanged.programmaticSkipped",
    "nativeWorkspace.writeTerminalText",
  ])
  private static let logDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS ZZZZ"
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    return formatter
  }()
  private static var didCreateLogsDirectory = false

  /**
   CDXC:NativeTerminalFocus 2026-04-29-09:16
   Split Ghostty focus debugging must land in a completely separate
   app storage logs file. These native entries record AppKit first-responder
   state only when debugging mode is enabled, with high-frequency focus/layout
   events suppressed so normal terminal use cannot generate oversized logs.
   */
  static func append(event: String, details: [String: Any] = [:]) {
    guard NativeDebugLogging.isEnabled, !noisyEvents.contains(event) else {
      return
    }
    let logsDirectory = ZmuxAppStorage.logsDirectory
    let logURL = logsDirectory.appendingPathComponent("native-terminal-focus-debug.log")

    var payload = details
    payload["event"] = event
    let serializedPayload = serialize(payload)
    let line = "[\(logDateFormatter.string(from: Date()))] \(serializedPayload)\n"

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
