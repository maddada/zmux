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

struct NativeT3RuntimeLaunch {
  let outputCapture: NativeT3RuntimeOutputCapture
  let process: Process
}

enum NativeT3RuntimeLauncher {
  private static let host = "127.0.0.1"
  private static let port = 3774
  private static let staleRuntimeShutdownTimeout: TimeInterval = 2.0

  /**
   CDXC:T3Code 2026-04-30-03:39
   Native T3 panes must own the localhost provider they render. If zmux has no
   tracked runtime but a previous T3 desktop process still owns port 3774, kill
   only that T3-looking listener before launching so the pane does not attach to
   stale unauthenticated UI and new launches do not fail with EADDRINUSE.
   */
  static func clearStaleRuntimeIfNeeded(logPrefix: String) {
    let listeners = listeningProcesses(onPort: port)
    if listeners.isEmpty {
      NativeT3CodePaneReproLog.append("\(logPrefix).t3Runtime.port.available", [
        "port": port
      ])
      return
    }

    for listener in listeners {
      guard isManagedT3RuntimeCommand(listener.command) else {
        NativeT3CodePaneReproLog.append("\(logPrefix).t3Runtime.port.occupiedByForeignProcess", [
          "command": listener.command,
          "pid": listener.pid,
          "port": port,
        ])
        continue
      }

      NativeT3CodePaneReproLog.append("\(logPrefix).t3Runtime.staleProcess.terminate", [
        "command": listener.command,
        "pid": listener.pid,
        "port": port,
      ])
      terminate(pid: listener.pid)
      waitForPortToClear(port)
    }
  }

  /**
   CDXC:T3Code 2026-04-30-03:39
   The reference T3 pane starts the provider with a desktop bootstrap credential
   on fd 3. Plain `npx --yes t3 --mode desktop` reaches the pairing route, so
   native zmux must provide the same bootstrap envelope at launch time instead
   of relying on an unauthenticated browser flow. Use npx only to resolve the
   cached T3 executable, then exec that bin directly because npm/npx does not
   preserve fd 3 reliably for the provider process.
   */
  static func createLaunch(cwd: String) throws -> NativeT3RuntimeLaunch {
    let bootstrapURL = try writeBootstrapJsonFile()
    let bootstrapPath = shellQuote(bootstrapURL.path)
    let t3ExecutablePath = try resolveT3ExecutablePath()
    let t3Executable = shellQuote(t3ExecutablePath)
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/bin/zsh")
    process.arguments = [
      "-lc",
      [
        "exec 3< \(bootstrapPath)",
        "rm -f \(bootstrapPath)",
        "exec \(t3Executable) --mode desktop --host \(host) --port \(port) --no-browser --bootstrap-fd 3",
      ].joined(separator: "\n"),
    ]
    process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
    process.environment = createRuntimeEnvironment()
    process.standardInput = FileHandle.nullDevice
    let outputCapture = NativeT3RuntimeOutputCapture()
    outputCapture.attach(to: process)
    return NativeT3RuntimeLaunch(outputCapture: outputCapture, process: process)
  }

  private static func createRuntimeEnvironment() -> [String: String] {
    var environment = ProcessInfo.processInfo.environment
    environment["T3CODE_AUTO_BOOTSTRAP_PROJECT_FROM_CWD"] = "false"
    environment["T3CODE_HOME"] = t3HomeDirectory().path
    environment["T3CODE_HOST"] = host
    environment["T3CODE_NO_BROWSER"] = "true"
    environment["T3CODE_PORT"] = String(port)
    return environment
  }

  private static func writeBootstrapJsonFile() throws -> URL {
    try FileManager.default.createDirectory(
      at: t3HomeDirectory(), withIntermediateDirectories: true)
    let payload: [String: Any] = [
      "desktopBootstrapToken": UUID().uuidString,
      "host": host,
      "mode": "desktop",
      "noBrowser": true,
      "port": port,
      "t3Home": t3HomeDirectory().path,
    ]
    let data = try JSONSerialization.data(withJSONObject: payload, options: [])
    let bootstrapURL = t3HomeDirectory().appendingPathComponent(
      "bootstrap-\(UUID().uuidString).json")
    try data.write(to: bootstrapURL, options: [.atomic])
    return bootstrapURL
  }

  private static func resolveT3ExecutablePath() throws -> String {
    if let localPath = resolveCommand(["/bin/zsh", "-lc", "command -v t3"]),
      FileManager.default.isExecutableFile(atPath: localPath)
    {
      NativeT3CodePaneReproLog.append("nativeT3Runtime.executable.resolved", [
        "path": localPath,
        "source": "path",
      ])
      return localPath
    }

    if let npxPath = resolveCommand([
      "/usr/bin/env", "npx", "--yes", "--package", "t3", "sh", "-c", "command -v t3",
    ]), FileManager.default.isExecutableFile(atPath: npxPath) {
      NativeT3CodePaneReproLog.append("nativeT3Runtime.executable.resolved", [
        "path": npxPath,
        "source": "npx-package-cache",
      ])
      return npxPath
    }

    throw NSError(
      domain: "NativeT3RuntimeLauncher",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "Unable to resolve the T3 Code executable."])
  }

  private static func resolveCommand(_ command: [String]) -> String? {
    guard let executable = command.first else {
      return nil
    }
    let process = Process()
    let stdout = Pipe()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = Array(command.dropFirst())
    process.standardOutput = stdout
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
      process.waitUntilExit()
    } catch {
      return nil
    }
    guard process.terminationStatus == 0 else {
      return nil
    }
    return String(data: stdout.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
      .split(separator: "\n", omittingEmptySubsequences: true)
      .first
      .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
  }

  private static func t3HomeDirectory() -> URL {
    ZmuxAppStorage.sharedRootDirectory
      .appendingPathComponent("t3-runtime", isDirectory: true)
      .appendingPathComponent("managed-home-t3code-0.0.0", isDirectory: true)
  }

  private static func listeningProcesses(onPort port: Int) -> [NativeT3ListeningProcess] {
    let process = Process()
    let pipe = Pipe()
    process.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
    process.arguments = ["-nP", "-tiTCP:\(port)", "-sTCP:LISTEN"]
    process.standardOutput = pipe
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
      process.waitUntilExit()
    } catch {
      NativeT3CodePaneReproLog.append("nativeT3Runtime.lsof.failed", [
        "error": error.localizedDescription,
        "port": port,
      ])
      return []
    }
    return String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
      .split(separator: "\n", omittingEmptySubsequences: true)
      .compactMap { Int($0.trimmingCharacters(in: .whitespacesAndNewlines)) }
      .map { NativeT3ListeningProcess(command: processCommand(pid: $0), pid: $0) } ?? []
  }

  private static func processCommand(pid: Int) -> String {
    let process = Process()
    let pipe = Pipe()
    process.executableURL = URL(fileURLWithPath: "/bin/ps")
    process.arguments = ["-p", String(pid), "-o", "command="]
    process.standardOutput = pipe
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
      process.waitUntilExit()
    } catch {
      return ""
    }
    return String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  }

  private static func isManagedT3RuntimeCommand(_ command: String) -> Bool {
    let normalized = command.lowercased()
    return normalized.contains("t3")
      && normalized.contains("--mode desktop")
      && normalized.contains("--port \(port)")
  }

  private static func terminate(pid: Int) {
    kill(pid_t(pid), SIGTERM)
  }

  private static func shellQuote(_ value: String) -> String {
    "'\(value.replacingOccurrences(of: "'", with: "'\\''"))'"
  }

  private static func waitForPortToClear(_ port: Int) {
    let deadline = Date().addingTimeInterval(staleRuntimeShutdownTimeout)
    while Date() < deadline {
      if listeningProcesses(onPort: port).isEmpty {
        return
      }
      Thread.sleep(forTimeInterval: 0.1)
    }
  }
}

private struct NativeT3ListeningProcess {
  let command: String
  let pid: Int
}
