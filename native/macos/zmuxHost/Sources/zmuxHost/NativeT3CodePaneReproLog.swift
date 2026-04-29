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

final class NativeT3RuntimeOutputCapture {
  private static let maxCapturedBytes = 64 * 1024
  private let lock = NSLock()
  private let stderrPipe = Pipe()
  private let stdoutPipe = Pipe()
  private var stderrData = Data()
  private var stderrTruncatedBytes = 0
  private var stdoutData = Data()
  private var stdoutTruncatedBytes = 0

  /**
   CDXC:T3Code 2026-04-30-03:18
   The gray native T3 pane repro needs the provider process stderr/stdout, not
   only the exit status. Capture bounded output from the desktop/no-browser
   launch so pairing/bootstrap failures can be diagnosed without changing the
   launch behavior or risking unbounded log growth.
   */
  func attach(to process: Process) {
    process.standardOutput = stdoutPipe
    process.standardError = stderrPipe
    stdoutPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
      self?.append(handle.availableData, stream: "stdout")
    }
    stderrPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
      self?.append(handle.availableData, stream: "stderr")
    }
  }

  func finish() -> [String: Any] {
    stdoutPipe.fileHandleForReading.readabilityHandler = nil
    stderrPipe.fileHandleForReading.readabilityHandler = nil
    return snapshot()
  }

  private func append(_ data: Data, stream: String) {
    guard !data.isEmpty else {
      return
    }
    lock.lock()
    defer { lock.unlock() }
    if stream == "stdout" {
      append(data, to: &stdoutData, truncatedBytes: &stdoutTruncatedBytes)
      return
    }
    append(data, to: &stderrData, truncatedBytes: &stderrTruncatedBytes)
  }

  private func append(_ data: Data, to target: inout Data, truncatedBytes: inout Int) {
    let availableBytes = max(Self.maxCapturedBytes - target.count, 0)
    if availableBytes > 0 {
      target.append(data.prefix(availableBytes))
    }
    if data.count > availableBytes {
      truncatedBytes += data.count - availableBytes
    }
  }

  private func snapshot() -> [String: Any] {
    lock.lock()
    defer { lock.unlock() }
    return [
      "stderr": decode(stderrData),
      "stderrBytes": stderrData.count + stderrTruncatedBytes,
      "stderrTruncatedBytes": stderrTruncatedBytes,
      "stdout": decode(stdoutData),
      "stdoutBytes": stdoutData.count + stdoutTruncatedBytes,
      "stdoutTruncatedBytes": stdoutTruncatedBytes,
    ]
  }

  private func decode(_ data: Data) -> String {
    String(data: data, encoding: .utf8) ?? "<non-utf8 \(data.count) bytes>"
  }
}
