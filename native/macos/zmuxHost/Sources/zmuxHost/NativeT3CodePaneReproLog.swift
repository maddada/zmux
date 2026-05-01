import Foundation
import OSLog
import WebKit

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

private struct NativeT3RuntimeCommand {
  let command: String
  let entrypoint: String
  let kind: String
  let runtime: String
}

enum NativeT3RuntimeLauncher {
  static let host = "127.0.0.1"
  static let port = 3774
  private static let bootstrapCredentialLock = NSLock()
  private static var bootstrapCredential: String?
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
      guard isAnyT3RuntimeCommand(listener.command) else {
        NativeT3CodePaneReproLog.append("\(logPrefix).t3Runtime.port.occupiedByForeignProcess", [
          "command": listener.command,
          "pid": listener.pid,
          "port": port,
        ])
        continue
      }

      NativeT3CodePaneReproLog.append("\(logPrefix).t3Runtime.staleProcess.terminate", [
        "command": listener.command,
        "parentCommand": listener.parentCommand,
        "parentPid": listener.parentPid,
        "pid": listener.pid,
        "port": port,
      ])
      if isT3RuntimeSupervisorCommand(listener.parentCommand) {
        terminate(pid: listener.parentPid)
      }
      terminate(pid: listener.pid)
      waitForPortToClear(port)
    }
  }

  static func hasManagedRuntimeListener() -> Bool {
    listeningProcesses(onPort: port).contains { isOwnedT3RuntimeProcess($0) }
  }

  /**
   CDXC:T3Code 2026-05-01-07:04
   Native T3 panes must use the same managed t3code-embed runtime shape as the
   reference project: bundled assets run through Node from `dist/bin.mjs`, while
   the sibling/custom checkout runs through Bun from `apps/server/src/bin.ts`.
   zmux still supplies the desktop bootstrap envelope on fd 3 so the WKWebView
   renders the authenticated provider without opening a browser.
   */
  static func createLaunch(cwd: String) throws -> NativeT3RuntimeLaunch {
    let bootstrap = try writeBootstrapJsonFile()
    rememberBootstrapCredential(bootstrap.credential)
    let bootstrapPath = shellQuote(bootstrap.url.path)
    let runtimeCommand = try resolveManagedT3RuntimeCommand()
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/bin/zsh")
    process.arguments = [
      "-lc",
      [
        "exec 3< \(bootstrapPath)",
        "rm -f \(bootstrapPath)",
        "exec \(runtimeCommand.command) --mode desktop --host \(host) --port \(port) --no-browser --bootstrap-fd 3",
      ].joined(separator: "\n"),
    ]
    process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
    process.environment = createRuntimeEnvironment()
    process.standardInput = FileHandle.nullDevice
    let outputCapture = NativeT3RuntimeOutputCapture()
    outputCapture.attach(to: process)
    return NativeT3RuntimeLaunch(outputCapture: outputCapture, process: process)
  }

  static func currentBootstrapCredential() -> String? {
    bootstrapCredentialLock.lock()
    defer { bootstrapCredentialLock.unlock() }
    return bootstrapCredential
  }

  static func clearBootstrapCredential(_ credential: String) {
    bootstrapCredentialLock.lock()
    defer { bootstrapCredentialLock.unlock() }
    if bootstrapCredential == credential {
      bootstrapCredential = nil
    }
  }

  static func isManagedRuntimeURL(_ url: URL) -> Bool {
    url.host == host && url.port == port
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

  private static func writeBootstrapJsonFile() throws -> NativeT3BootstrapFile {
    try FileManager.default.createDirectory(
      at: t3HomeDirectory(), withIntermediateDirectories: true)
    let credential = UUID().uuidString
    let payload: [String: Any] = [
      "desktopBootstrapToken": credential,
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
    return NativeT3BootstrapFile(credential: credential, url: bootstrapURL)
  }

  private static func rememberBootstrapCredential(_ credential: String) {
    bootstrapCredentialLock.lock()
    bootstrapCredential = credential
    bootstrapCredentialLock.unlock()
    NativeT3CodePaneReproLog.append("nativeT3Runtime.bootstrapCredential.remembered", [
      "credentialPresent": true
    ])
  }

  private static func resolveManagedT3RuntimeCommand() throws -> NativeT3RuntimeCommand {
    if let bundledEntrypoint = bundledRuntimeEntrypointPath() {
      let nodePath = try resolveCommandPath("node")
      NativeT3CodePaneReproLog.append("nativeT3Runtime.executable.resolved", [
        "entrypoint": bundledEntrypoint,
        "kind": "bundled",
        "runtime": nodePath,
      ])
      return NativeT3RuntimeCommand(
        command: "\(shellQuote(nodePath)) \(shellQuote(bundledEntrypoint))",
        entrypoint: bundledEntrypoint,
        kind: "bundled",
        runtime: nodePath)
    }

    let repoRoot = try resolveManagedT3RepoRoot()
    let entrypoint = repoRoot.appendingPathComponent("apps/server/src/bin.ts").path
    guard FileManager.default.fileExists(atPath: entrypoint) else {
      throw NSError(
        domain: "NativeT3RuntimeLauncher",
        code: 1,
        userInfo: [
          NSLocalizedDescriptionKey:
            "The managed T3 Code runtime source is missing. Expected: \(entrypoint)."
        ])
    }
    let nodeModulesPath = repoRoot.appendingPathComponent("node_modules").path
    guard FileManager.default.fileExists(atPath: nodeModulesPath) else {
      throw NSError(
        domain: "NativeT3RuntimeLauncher",
        code: 2,
        userInfo: [
          NSLocalizedDescriptionKey:
            "Managed T3 Code dependencies are missing. Expected: \(nodeModulesPath). Run 'bun install' in \(repoRoot.path)."
        ])
    }
    let bunPath = try resolveCommandPath("bun")
    NativeT3CodePaneReproLog.append("nativeT3Runtime.executable.resolved", [
      "entrypoint": entrypoint,
      "kind": "external",
      "repoRoot": repoRoot.path,
      "runtime": bunPath,
    ])
    return NativeT3RuntimeCommand(
      command: "\(shellQuote(bunPath)) \(shellQuote(entrypoint))",
      entrypoint: entrypoint,
      kind: "external",
      runtime: bunPath)
  }

  private static func resolveManagedT3RepoRoot() throws -> URL {
    let environment = ProcessInfo.processInfo.environment
    let configuredRoot =
      environment["VSMUX_T3CODE_REPO_ROOT"]?.trimmingCharacters(in: .whitespacesAndNewlines)
      ?? environment["zmux_T3CODE_REPO_ROOT"]?.trimmingCharacters(in: .whitespacesAndNewlines)
    let candidates =
      configuredRoot?.isEmpty == false
      ? [configuredRoot!]
      : [
        FileManager.default.homeDirectoryForCurrentUser
          .appendingPathComponent("dev/_active/t3code-embed", isDirectory: true).path
      ]
    for candidate in candidates {
      let repoRoot = URL(fileURLWithPath: candidate, isDirectory: true)
      if FileManager.default.fileExists(
        atPath: repoRoot.appendingPathComponent("apps/server/src/bin.ts").path)
      {
        return repoRoot
      }
    }
    throw NSError(
      domain: "NativeT3RuntimeLauncher",
      code: 3,
      userInfo: [
        NSLocalizedDescriptionKey:
          "Unable to resolve the managed t3code-embed checkout. Set VSMUX_T3CODE_REPO_ROOT or place it at ~/dev/_active/t3code-embed."
      ])
  }

  private static func bundledRuntimeEntrypointPath() -> String? {
    let bundledDirectoryName = "t3code-server"
    var candidates: [URL] = []
    if let resourceURL = Bundle.main.resourceURL {
      candidates.append(
        resourceURL.appendingPathComponent("out/\(bundledDirectoryName)/dist/bin.mjs"))
      candidates.append(resourceURL.appendingPathComponent("\(bundledDirectoryName)/dist/bin.mjs"))
    }
    candidates.append(
      URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
        .appendingPathComponent("out/\(bundledDirectoryName)/dist/bin.mjs"))
    candidates.append(
      URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
        .appendingPathComponent("\(bundledDirectoryName)/dist/bin.mjs"))
    return candidates.first { FileManager.default.fileExists(atPath: $0.path) }?.path
  }

  private static func resolveCommandPath(_ command: String) throws -> String {
    let process = Process()
    let pipe = Pipe()
    process.executableURL = URL(fileURLWithPath: "/bin/zsh")
    process.arguments = ["-lc", "command -v \(shellQuote(command))"]
    process.standardOutput = pipe
    process.standardError = FileHandle.nullDevice
    try process.run()
    process.waitUntilExit()
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    let resolved = String(data: data, encoding: .utf8)?
      .split(whereSeparator: \.isNewline)
      .first
      .map(String.init)
    if process.terminationStatus == 0, let resolved, !resolved.isEmpty {
      return resolved
    }
    throw NSError(
      domain: "NativeT3RuntimeLauncher",
      code: 4,
      userInfo: [NSLocalizedDescriptionKey: "Unable to resolve required runtime command: \(command)."])
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
      .compactMap { Int(String($0).trimmingCharacters(in: .whitespacesAndNewlines)) }
      .map {
        let parentPid = processParentPid(pid: $0)
        return NativeT3ListeningProcess(
          command: processCommand(pid: $0),
          parentCommand: parentPid.map { processCommand(pid: $0) } ?? "",
          parentPid: parentPid ?? 0,
          pid: $0
        )
      } ?? []
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

  private static func processParentPid(pid: Int) -> Int? {
    let process = Process()
    let pipe = Pipe()
    process.executableURL = URL(fileURLWithPath: "/bin/ps")
    process.arguments = ["-p", String(pid), "-o", "ppid="]
    process.standardOutput = pipe
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
      process.waitUntilExit()
    } catch {
      return nil
    }
    let raw = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return Int(raw)
  }

  private static func isAnyT3RuntimeCommand(_ command: String) -> Bool {
    let normalized = command.lowercased()
    return normalized.contains("t3")
      && normalized.contains("--mode desktop")
      && normalized.contains("--port \(port)")
  }

  /**
   CDXC:T3Code 2026-05-01-12:59
   Attached zmux windows may share the T3 provider launched by the VS Code
   extension supervisor. Reuse that supervised provider instead of killing it;
   the native WKWebView authenticates through an owner-issued browser pairing
   credential. For unsupervised listeners, only reuse runtimes from this app's
   managed home, bundled resources, or the local t3code-embed checkout.
   */
  private static func isOwnedT3RuntimeProcess(_ process: NativeT3ListeningProcess) -> Bool {
    guard isAnyT3RuntimeCommand(process.command) else {
      return false
    }

    if isT3RuntimeSupervisorCommand(process.parentCommand) {
      return true
    }

    let normalized = process.command.lowercased()
    var ownedMarkers = [
      t3HomeDirectory().path,
      FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("dev/_active/t3code-embed/apps/server/src/bin.ts").path,
    ].map { $0.lowercased() }
    if let resourcePath = Bundle.main.resourceURL?.path {
      ownedMarkers.append(resourcePath.lowercased())
    }
    ownedMarkers.append(Bundle.main.bundleURL.path.lowercased())
    return ownedMarkers.contains { normalized.contains($0) }
  }

  private static func isT3RuntimeSupervisorCommand(_ command: String) -> Bool {
    let normalized = command.lowercased()
    return normalized.contains("t3-runtime-supervisor.js")
      && normalized.contains(".vscode/extensions/maddada.vsmux")
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

private struct NativeT3BootstrapFile {
  let credential: String
  let url: URL
}

struct NativeT3ThreadRoute {
  let projectId: String
  let threadId: String
  let url: URL
}

enum NativeT3RuntimeSessionBootstrap {
  private static let defaultModelSelection: [String: Any] = [
    "model": "gpt-5-codex",
    "provider": "codex",
  ]

  /**
   CDXC:T3Code 2026-04-30-09:23
   T3 Code's desktop root URL is only a boot shell. Native panes must create
   the same project/thread records as the reference app, then load the concrete
   `/{projectId}/{threadId}` route so WKWebView renders the T3 workspace page
   instead of the blank gray splash surface.
   */
  static func prepareThreadRoute(
    origin: URL,
    sessionId: String,
    title: String,
    workspaceRoot: String?,
    completion: @escaping (Result<URL, Error>) -> Void
  ) {
    guard NativeT3RuntimeLauncher.isManagedRuntimeURL(origin) else {
      DispatchQueue.main.async { completion(.success(origin)) }
      return
    }
    guard let workspaceRoot, !workspaceRoot.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      DispatchQueue.main.async {
        completion(.failure(error("T3 Code pane is missing its workspace root.")))
      }
      return
    }

    getSnapshot(origin: origin, sessionId: sessionId) { result in
      switch result {
      case .success(let snapshot):
        createThreadRoute(
          origin: origin,
          sessionId: sessionId,
          snapshot: snapshot,
          title: title,
          workspaceRoot: workspaceRoot,
          completion: completion
        )
      case .failure(let error):
        DispatchQueue.main.async { completion(.failure(error)) }
      }
    }
  }

  private static func createThreadRoute(
    origin: URL,
    sessionId: String,
    snapshot: [String: Any],
    title: String,
    workspaceRoot: String,
    completion: @escaping (Result<URL, Error>) -> Void
  ) {
    let project = findProject(in: snapshot, workspaceRoot: workspaceRoot)
    let ensureProject: (@escaping (Result<[String: Any], Error>) -> Void) -> Void = { callback in
      if let project {
        callback(.success(project))
        return
      }
      createProject(origin: origin, sessionId: sessionId, workspaceRoot: workspaceRoot, completion: callback)
    }

    ensureProject { projectResult in
      switch projectResult {
      case .success(let project):
        guard let projectId = project["id"] as? String else {
          DispatchQueue.main.async { completion(.failure(error("T3 project is missing an id."))) }
          return
        }
        let threadId = UUID().uuidString
        let modelSelection = (project["defaultModelSelection"] as? [String: Any])
          ?? defaultModelSelection
        let command: [String: Any] = [
          "branch": NSNull(),
          "commandId": UUID().uuidString,
          "createdAt": isoNow(),
          "interactionMode": "default",
          "modelSelection": modelSelection,
          "projectId": projectId,
          "runtimeMode": "full-access",
          "threadId": threadId,
          "title": title.isEmpty ? "T3 Code" : title,
          "type": "thread.create",
          "worktreePath": NSNull(),
        ]
        dispatchCommand(origin: origin, sessionId: sessionId, command: command) { dispatchResult in
          switch dispatchResult {
          case .success:
            guard let route = routeURL(origin: origin, projectId: projectId, threadId: threadId) else {
              DispatchQueue.main.async {
                completion(.failure(error("Failed to build T3 thread route URL.")))
              }
              return
            }
            NativeT3CodePaneReproLog.append("nativeT3Runtime.threadRoute.ready", [
              "projectId": projectId,
              "routeUrl": route.absoluteString,
              "sessionId": sessionId,
              "threadId": threadId,
              "workspaceRoot": workspaceRoot,
            ])
            DispatchQueue.main.async { completion(.success(route)) }
          case .failure(let error):
            DispatchQueue.main.async { completion(.failure(error)) }
          }
        }
      case .failure(let error):
        DispatchQueue.main.async { completion(.failure(error)) }
      }
    }
  }

  private static func getSnapshot(
    origin: URL,
    sessionId: String,
    completion: @escaping (Result<[String: Any], Error>) -> Void
  ) {
    guard let url = endpointURL(origin: origin, path: "/api/orchestration/snapshot") else {
      completion(.failure(error("Invalid T3 snapshot URL.")))
      return
    }
    requestJSON(url: url, sessionId: sessionId, method: "GET", body: nil) { result in
      if case .success(let payload) = result {
        NativeT3CodePaneReproLog.append("nativeT3Runtime.snapshot.loaded", [
          "projectCount": (payload["projects"] as? [Any])?.count ?? 0,
          "sessionId": sessionId,
          "threadCount": (payload["threads"] as? [Any])?.count ?? 0,
        ])
      }
      completion(result)
    }
  }

  private static func createProject(
    origin: URL,
    sessionId: String,
    workspaceRoot: String,
    completion: @escaping (Result<[String: Any], Error>) -> Void
  ) {
    let projectId = UUID().uuidString
    let now = isoNow()
    let title = URL(fileURLWithPath: workspaceRoot).lastPathComponent.isEmpty
      ? "project"
      : URL(fileURLWithPath: workspaceRoot).lastPathComponent
    let project: [String: Any] = [
      "createdAt": now,
      "defaultModelSelection": defaultModelSelection,
      "deletedAt": NSNull(),
      "id": projectId,
      "title": title,
      "updatedAt": now,
      "workspaceRoot": workspaceRoot,
    ]
    let command: [String: Any] = [
      "commandId": UUID().uuidString,
      "createdAt": now,
      "defaultModelSelection": defaultModelSelection,
      "projectId": projectId,
      "title": title,
      "type": "project.create",
      "workspaceRoot": workspaceRoot,
    ]
    dispatchCommand(origin: origin, sessionId: sessionId, command: command) { result in
      switch result {
      case .success:
        NativeT3CodePaneReproLog.append("nativeT3Runtime.project.created", [
          "projectId": projectId,
          "sessionId": sessionId,
          "workspaceRoot": workspaceRoot,
        ])
        completion(.success(project))
      case .failure(let error):
        completion(.failure(error))
      }
    }
  }

  private static func dispatchCommand(
    origin: URL,
    sessionId: String,
    command: [String: Any],
    completion: @escaping (Result<[String: Any], Error>) -> Void
  ) {
    guard let url = endpointURL(origin: origin, path: "/api/orchestration/dispatch") else {
      completion(.failure(error("Invalid T3 dispatch URL.")))
      return
    }
    let body = try? JSONSerialization.data(withJSONObject: command, options: [])
    requestJSON(url: url, sessionId: sessionId, method: "POST", body: body, completion: completion)
  }

  private static func requestJSON(
    url: URL,
    sessionId: String,
    method: String,
    body: Data?,
    completion: @escaping (Result<[String: Any], Error>) -> Void
  ) {
    var request = URLRequest(url: url)
    request.cachePolicy = .reloadIgnoringLocalCacheData
    request.httpMethod = method
    request.timeoutInterval = 30
    /**
     CDXC:T3Code 2026-05-01-13:13
     T3 orchestration APIs are owner-only management endpoints. Native panes
     still bootstrap the browser with a paired client cookie, but project and
     thread creation must use the VS Code owner bearer directly and avoid
     automatic cookies so the paired browser role does not shadow ownership.
     */
    if let ownerBearerToken = NativeT3RuntimeBrowserAuth.readVSmuxOwnerBearerToken() {
      request.httpShouldHandleCookies = false
      request.setValue("Bearer \(ownerBearerToken)", forHTTPHeaderField: "authorization")
    }
    if let body {
      request.httpBody = body
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }
    URLSession.shared.dataTask(with: request) { data, response, requestError in
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
      NativeT3CodePaneReproLog.append("nativeT3Runtime.api.response", [
        "bodyBytes": data?.count ?? 0,
        "error": requestError?.localizedDescription ?? NSNull(),
        "method": method,
        "sessionId": sessionId,
        "statusCode": statusCode,
        "url": url.absoluteString,
      ])
      if let requestError {
        completion(.failure(requestError))
        return
      }
      guard (200..<300).contains(statusCode) else {
        let bodyText = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        completion(.failure(error("T3 API \(method) \(url.path) returned \(statusCode): \(bodyText)")))
        return
      }
      guard let data, !data.isEmpty else {
        completion(.success([:]))
        return
      }
      guard let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        completion(.failure(error("T3 API \(method) \(url.path) did not return JSON.")))
        return
      }
      completion(.success(payload))
    }.resume()
  }

  private static func findProject(in snapshot: [String: Any], workspaceRoot: String) -> [String: Any]? {
    guard let projects = snapshot["projects"] as? [[String: Any]] else {
      return nil
    }
    return projects.first { project in
      let deletedAt = project["deletedAt"]
      let isDeleted = !(deletedAt == nil || deletedAt is NSNull)
      return !isDeleted && project["workspaceRoot"] as? String == workspaceRoot
    }
  }

  private static func endpointURL(origin: URL, path: String) -> URL? {
    var components = URLComponents()
    components.scheme = origin.scheme ?? "http"
    components.host = origin.host
    components.port = origin.port
    components.path = path
    return components.url
  }

  private static func routeURL(origin: URL, projectId: String, threadId: String) -> URL? {
    var components = URLComponents()
    components.scheme = origin.scheme ?? "http"
    components.host = origin.host
    components.port = origin.port
    components.path = "/\(projectId)/\(threadId)"
    return components.url
  }

  private static func isoNow() -> String {
    ISO8601DateFormatter().string(from: Date())
  }

  private static func error(_ message: String) -> NSError {
    NSError(
      domain: "NativeT3RuntimeSessionBootstrap",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }
}

enum NativeT3RuntimeBrowserAuth {
  private static let authRetryDelay: TimeInterval = 0.5
  private static let authRequestTimeout: TimeInterval = 3
  private static let maxAuthAttempts = 40
  private static let queue = DispatchQueue(label: "com.madda.zmux.t3-browser-auth")
  private static var isAuthenticating = false
  private static var pendingCompletions: [(sessionId: String, completion: () -> Void)] = []

  /**
   CDXC:T3Code 2026-04-30-09:10
   Native T3 Code panes must render the already-owned desktop provider, not the
   unauthenticated pairing shell. Before WKWebView loads the app, exchange the
   desktop bootstrap credential for T3's browser-session cookie through the
   provider's documented `/api/auth/bootstrap` endpoint. Serialize exchanges
   because the desktop bootstrap credential is single-use. If the pane command
   arrives before the runtime-start command registers that credential, retry
   auth instead of loading the unauthenticated boot shell.
   */
  static func prepareManagedWebSession(
    for url: URL,
    sessionId: String,
    completion: @escaping () -> Void
  ) {
    guard NativeT3RuntimeLauncher.isManagedRuntimeURL(url) else {
      DispatchQueue.main.async(execute: completion)
      return
    }

    queue.async {
      pendingCompletions.append((sessionId: sessionId, completion: completion))
      guard !isAuthenticating else {
        NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.queued", [
          "pendingCount": pendingCompletions.count,
          "sessionId": sessionId,
        ])
        return
      }
      isAuthenticating = true
      checkSession(origin: url, attemptsRemaining: maxAuthAttempts)
    }
  }

  private static func checkSession(origin: URL, attemptsRemaining: Int) {
    guard let sessionURL = endpointURL(origin: origin, path: "/api/auth/session") else {
      finishPending(reason: "invalidSessionUrl")
      return
    }
    var request = URLRequest(url: sessionURL)
    request.cachePolicy = .reloadIgnoringLocalCacheData
    /**
     CDXC:T3Code 2026-04-30-09:30
     Native T3 panes can begin auth while the managed provider is being
     replaced. Session probes must fail quickly so the existing retry loop
     can catch the newly launched provider instead of leaving a gray pane
     until URLSession's default timeout expires.
     */
    request.timeoutInterval = authRequestTimeout
    URLSession.shared.dataTask(with: request) { data, response, error in
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
      let authenticated = parseAuthenticated(data)
      NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.session.response", [
        "authenticated": authenticated ?? NSNull(),
        "error": error?.localizedDescription ?? NSNull(),
        "statusCode": statusCode,
        "url": sessionURL.absoluteString,
      ])

      if authenticated == true {
        finishPending(reason: "alreadyAuthenticated")
        return
      }
      exchangeBootstrapCredential(origin: origin, attemptsRemaining: attemptsRemaining)
    }.resume()
  }

  private static func exchangeBootstrapCredential(origin: URL, attemptsRemaining: Int) {
    guard let credential = NativeT3RuntimeLauncher.currentBootstrapCredential() else {
      exchangeExtensionPairingCredential(
        origin: origin,
        attemptsRemaining: attemptsRemaining,
        originalReason: "missingCredential"
      )
      return
    }
    exchangeBrowserCredential(
      origin: origin,
      credential: credential,
      credentialSource: "nativeDesktopBootstrap",
      clearStoredCredentialOnSuccess: true,
      attemptsRemaining: attemptsRemaining
    )
  }

  private static func exchangeBrowserCredential(
    origin: URL,
    credential: String,
    credentialSource: String,
    clearStoredCredentialOnSuccess: Bool,
    attemptsRemaining: Int
  ) {
    guard let bootstrapURL = endpointURL(origin: origin, path: "/api/auth/bootstrap") else {
      finishPending(reason: "invalidBootstrapUrl")
      return
    }

    var request = URLRequest(url: bootstrapURL)
    request.cachePolicy = .reloadIgnoringLocalCacheData
    request.httpMethod = "POST"
    request.timeoutInterval = authRequestTimeout
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONSerialization.data(withJSONObject: ["credential": credential])
    NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.bootstrap.start", [
      "credentialPresent": true,
      "credentialSource": credentialSource,
      "url": bootstrapURL.absoluteString,
    ])
    URLSession.shared.dataTask(with: request) { data, response, error in
      guard let httpResponse = response as? HTTPURLResponse else {
        NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.bootstrap.noResponse", [
          "error": error?.localizedDescription ?? NSNull(),
          "url": bootstrapURL.absoluteString,
        ])
        retryAuth(origin: origin, reason: "bootstrapNoResponse", attemptsRemaining: attemptsRemaining)
        return
      }

      let headers = httpResponse.allHeaderFields.reduce(into: [String: String]()) { result, entry in
        if let key = entry.key as? String {
          result[key] = String(describing: entry.value)
        }
      }
      let cookies = HTTPCookie.cookies(withResponseHeaderFields: headers, for: bootstrapURL)
      NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.bootstrap.response", [
        "authenticated": parseAuthenticated(data) ?? NSNull(),
        "cookieCount": cookies.count,
        "credentialSource": credentialSource,
        "error": error?.localizedDescription ?? NSNull(),
        "statusCode": httpResponse.statusCode,
        "url": bootstrapURL.absoluteString,
      ])

      guard httpResponse.statusCode == 200 else {
        if credentialSource == "nativeDesktopBootstrap", httpResponse.statusCode == 401 {
          exchangeExtensionPairingCredential(
            origin: origin,
            attemptsRemaining: attemptsRemaining,
            originalReason: "bootstrapStatus401"
          )
          return
        }
        retryAuth(
          origin: origin,
          reason: "bootstrapStatus\(httpResponse.statusCode)",
          attemptsRemaining: attemptsRemaining
        )
        return
      }
      if clearStoredCredentialOnSuccess {
        NativeT3RuntimeLauncher.clearBootstrapCredential(credential)
      }
      setCookies(cookies, reason: "bootstrapComplete")
    }.resume()
  }

  /**
   CDXC:T3Code 2026-05-01-12:59
   When zmux is attached to VS Code, the extension may already own the desktop
   T3 provider and consume the single-use desktop bootstrap through the bearer
   endpoint. Native WKWebView panes must then mint a browser pairing credential
   from the extension-owned owner bearer and exchange that one-time credential
   for cookies, instead of retrying the stale desktop token until the pane
   falls through to the gray/500 error surface.
   */
  private static func exchangeExtensionPairingCredential(
    origin: URL,
    attemptsRemaining: Int,
    originalReason: String
  ) {
    guard let ownerBearerToken = readVSmuxOwnerBearerToken() else {
      retryAuth(origin: origin, reason: originalReason, attemptsRemaining: attemptsRemaining)
      return
    }
    guard let pairingURL = endpointURL(origin: origin, path: "/api/auth/pairing-token") else {
      finishPending(reason: "invalidPairingUrl")
      return
    }

    var request = URLRequest(url: pairingURL)
    request.cachePolicy = .reloadIgnoringLocalCacheData
    request.httpMethod = "POST"
    request.timeoutInterval = authRequestTimeout
    /**
     CDXC:T3Code 2026-05-01-13:08
     T3 authenticates cookies before bearer headers. Native pairing requests
     must not inherit stale URLSession cookies, otherwise the server rejects
     the old cookie and never evaluates the valid VS Code owner bearer.
     */
    request.httpShouldHandleCookies = false
    request.httpBody = Data()
    request.setValue("0", forHTTPHeaderField: "Content-Length")
    request.setValue("Bearer \(ownerBearerToken)", forHTTPHeaderField: "authorization")
    NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.pairing.start", [
      "ownerBearerLength": ownerBearerToken.count,
      "originalReason": originalReason,
      "url": pairingURL.absoluteString,
    ])
    URLSession.shared.dataTask(with: request) { data, response, error in
      guard let httpResponse = response as? HTTPURLResponse else {
        NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.pairing.noResponse", [
          "error": error?.localizedDescription ?? NSNull(),
          "originalReason": originalReason,
          "url": pairingURL.absoluteString,
        ])
        retryAuth(origin: origin, reason: originalReason, attemptsRemaining: attemptsRemaining)
        return
      }

      let credential = parseCredential(data)
      NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.pairing.response", [
        "credentialPresent": credential != nil,
        "error": error?.localizedDescription ?? NSNull(),
        "originalReason": originalReason,
        "statusCode": httpResponse.statusCode,
        "url": pairingURL.absoluteString,
      ])
      guard httpResponse.statusCode == 200, let credential else {
        retryAuth(
          origin: origin,
          reason: "pairingStatus\(httpResponse.statusCode)",
          attemptsRemaining: attemptsRemaining
        )
        return
      }
      exchangeBrowserCredential(
        origin: origin,
        credential: credential,
        credentialSource: "extensionOwnerPairing",
        clearStoredCredentialOnSuccess: false,
        attemptsRemaining: attemptsRemaining
      )
    }.resume()
  }

  private static func retryAuth(origin: URL, reason: String, attemptsRemaining: Int) {
    guard attemptsRemaining > 0 else {
      NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.retry.exhausted", [
        "reason": reason,
        "url": origin.absoluteString,
      ])
      finishPending(reason: reason)
      return
    }

    NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.retry.scheduled", [
      "attemptsRemaining": attemptsRemaining,
      "reason": reason,
      "url": origin.absoluteString,
    ])
    queue.asyncAfter(deadline: .now() + authRetryDelay) {
      checkSession(origin: origin, attemptsRemaining: attemptsRemaining - 1)
    }
  }

  private static func setCookies(_ cookies: [HTTPCookie], reason: String) {
    DispatchQueue.main.async {
      guard !cookies.isEmpty else {
        finishPending(reason: "\(reason)NoCookies")
        return
      }

      let group = DispatchGroup()
      let store = WKWebsiteDataStore.default().httpCookieStore
      for cookie in cookies {
        group.enter()
        store.setCookie(cookie) {
          NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.cookie.set", [
            "domain": cookie.domain,
            "expiresDate": cookie.expiresDate?.description ?? NSNull(),
            "name": cookie.name,
            "path": cookie.path,
          ])
          group.leave()
        }
      }
      group.notify(queue: .main) {
        finishPending(reason: reason)
      }
    }
  }

  private static func finishPending(reason: String) {
    queue.async {
      let completions = pendingCompletions
      pendingCompletions = []
      isAuthenticating = false
      NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.finish", [
        "completionCount": completions.count,
        "reason": reason,
        "sessionIds": completions.map(\.sessionId),
      ])
      DispatchQueue.main.async {
        completions.forEach { $0.completion() }
      }
    }
  }

  private static func endpointURL(origin: URL, path: String) -> URL? {
    var components = URLComponents()
    components.scheme = origin.scheme ?? "http"
    components.host = origin.host
    components.port = origin.port
    components.path = path
    return components.url
  }

  private static func parseAuthenticated(_ data: Data?) -> Bool? {
    guard let data,
      let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let authenticated = payload["authenticated"] as? Bool
    else {
      return nil
    }
    return authenticated
  }

  private static func parseCredential(_ data: Data?) -> String? {
    guard let data,
      let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let credential = payload["credential"] as? String,
      !credential.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      return nil
    }
    return credential
  }

  fileprivate static func readVSmuxOwnerBearerToken() -> String? {
    let authStateURL = FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent(
        "Library/Application Support/Code/User/globalStorage/maddada.vsmux/t3-runtime/auth-state.json"
      )
    let authStateMtime = (try? FileManager.default.attributesOfItem(atPath: authStateURL.path)[.modificationDate])
      as? Date
    guard let data = try? Data(contentsOf: authStateURL),
      let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let ownerBearerToken = payload["ownerBearerToken"] as? String,
      !ownerBearerToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.pairing.authStateMissing", [
        "path": authStateURL.path
      ])
      return nil
    }
    /**
     CDXC:T3Code 2026-05-01-13:10
     Owner-bearer pairing is the native/VS Code handoff for attached zmux
     windows. Log only non-secret auth-state metadata so a 401 can be
     distinguished between stale file reads and rejected HTTP credentials.
     */
    NativeT3CodePaneReproLog.append("nativeT3Runtime.browserAuth.pairing.authStateRead", [
      "ownerBearerLength": ownerBearerToken.count,
      "path": authStateURL.path,
      "mtime": authStateMtime.map { ISO8601DateFormatter().string(from: $0) } ?? NSNull(),
    ])
    return ownerBearerToken
  }
}

private struct NativeT3ListeningProcess {
  let command: String
  let parentCommand: String
  let parentPid: Int
  let pid: Int
}
