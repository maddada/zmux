import Foundation

enum ZmuxAppStorage {
  private struct SharedSidebarStorageFile {
    let fileName: String
    let localStorageKey: String
  }

  private static let sharedSidebarStorageFiles: [String: SharedSidebarStorageFile] = [
    "projects": SharedSidebarStorageFile(
      fileName: "native-sidebar-projects.json",
      localStorageKey: "zmux-native-projects"),
    "previousSessions": SharedSidebarStorageFile(
      fileName: "native-sidebar-previous-sessions.json",
      localStorageKey: "zmux-native-previous-sessions"),
    "settings": SharedSidebarStorageFile(
      fileName: "native-sidebar-settings.json",
      localStorageKey: "zmux-native-settings"),
  ]

  /**
   CDXC:DevAppFlavor 2026-04-28-02:01
   zmux-dev must keep diagnostic logs under ~/.zmux-dev, while hooks,
   workspaces, and session state stay shared with the default app under
   ~/.zmux. Bundle metadata owns both directory names so LaunchServices
   launches get the same storage split as shell-launched builds.
   */
  static var diagnosticsHomeDirectoryName: String {
    let candidate = Bundle.main.object(forInfoDictionaryKey: "ZMUXHomeDirectoryName") as? String
    let trimmed = candidate?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? ".zmux" : trimmed
  }

  static var sharedHomeDirectoryName: String {
    let candidate = Bundle.main.object(forInfoDictionaryKey: "ZMUXSharedHomeDirectoryName")
      as? String
    let trimmed = candidate?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? ".zmux" : trimmed
  }

  static var diagnosticsRootDirectory: URL {
    FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(
      diagnosticsHomeDirectoryName, isDirectory: true)
  }

  static var sharedRootDirectory: URL {
    FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(
      sharedHomeDirectoryName, isDirectory: true)
  }

  static var sharedStateDirectory: URL {
    sharedRootDirectory.appendingPathComponent("state", isDirectory: true)
  }

  static var logsDirectory: URL {
    diagnosticsRootDirectory.appendingPathComponent("logs", isDirectory: true)
  }

  static var sharedSidebarSettingsURL: URL {
    sharedStateDirectory.appendingPathComponent("native-sidebar-settings.json")
  }

  static func readSharedSidebarStorage() -> [String: String] {
    sharedSidebarStorageFiles.reduce(into: [String: String]()) { result, entry in
      let key = entry.key
      let file = entry.value
      let sharedValue = readSharedSidebarStorageFile(file.fileName)
      let legacyValue = readLegacyDefaultAppLocalStorageValue(key: file.localStorageKey)
      let selectedValue = selectSharedSidebarStorageValue(
        key: file.localStorageKey,
        sharedValue: sharedValue,
        legacyValue: legacyValue
      )
      if selectedValue == legacyValue, sharedValue != legacyValue, let selectedValue {
        try? persistSharedSidebarStorage(key: key, payloadJson: selectedValue)
      }
      if let selectedValue,
        selectedValue == sharedValue,
        !isSharedSidebarStorageFileNormalized(file.fileName, payloadJson: selectedValue)
      {
        try? persistSharedSidebarStorage(key: key, payloadJson: selectedValue)
      }
      if let selectedValue {
        result[key] = selectedValue
      }
    }
  }

  static func persistSharedSidebarStorage(key: String, payloadJson: String) throws {
    guard let file = sharedSidebarStorageFiles[key] else {
      throw NSError(
        domain: "ZmuxAppStorage",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Unknown shared sidebar storage key: \(key)"])
    }
    guard let data = payloadJson.data(using: .utf8) else {
      throw NSError(
        domain: "ZmuxAppStorage",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "Shared sidebar storage payload is not UTF-8."])
    }
    _ = try JSONSerialization.jsonObject(with: data)
    try FileManager.default.createDirectory(
      at: sharedStateDirectory, withIntermediateDirectories: true)
    try data.write(to: sharedStateDirectory.appendingPathComponent(file.fileName), options: [.atomic])
  }

  private static func readSharedSidebarStorageFile(_ fileName: String) -> String? {
    let url = sharedStateDirectory.appendingPathComponent(fileName)
    guard let data = try? Data(contentsOf: url) else {
      return nil
    }
    return decodeJsonStorageData(data)
  }

  private static func isSharedSidebarStorageFileNormalized(
    _ fileName: String,
    payloadJson: String
  ) -> Bool {
    let url = sharedStateDirectory.appendingPathComponent(fileName)
    guard let existingData = try? Data(contentsOf: url),
      let normalizedData = payloadJson.data(using: .utf8)
    else {
      return false
    }
    return existingData == normalizedData
  }

  private static func selectSharedSidebarStorageValue(
    key: String,
    sharedValue: String?,
    legacyValue: String?
  ) -> String? {
    guard let sharedValue else {
      return legacyValue
    }
    guard let legacyValue else {
      return sharedValue
    }
    if key == "zmux-native-projects",
      projectSnapshotScore(legacyValue) > projectSnapshotScore(sharedValue)
    {
      return legacyValue
    }
    if key == "zmux-native-previous-sessions",
      previousSessionsSnapshotScore(legacyValue) > previousSessionsSnapshotScore(sharedValue)
    {
      return legacyValue
    }
    return sharedValue
  }

  private static func projectSnapshotScore(_ payloadJson: String) -> Int {
    guard let data = payloadJson.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let projects = object["projects"] as? [Any]
    else {
      return 0
    }
    let sessionCount = projects.reduce(0) { count, project in
      count + projectSessionCount(project)
    }
    return (projects.count * 100_000) + (sessionCount * 1_000) + payloadJson.count
  }

  private static func projectSessionCount(_ project: Any) -> Int {
    guard let project = project as? [String: Any],
      let workspace = project["workspace"] as? [String: Any],
      let groups = workspace["groups"] as? [[String: Any]]
    else {
      return 0
    }
    return groups.reduce(0) { count, group in
      guard let snapshot = group["snapshot"] as? [String: Any],
        let sessions = snapshot["sessions"] as? [Any]
      else {
        return count
      }
      return count + sessions.count
    }
  }

  private static func previousSessionsSnapshotScore(_ payloadJson: String) -> Int {
    guard let data = payloadJson.data(using: .utf8),
      let sessions = try? JSONSerialization.jsonObject(with: data) as? [Any]
    else {
      return 0
    }
    return (sessions.count * 1_000) + payloadJson.count
  }

  private static func readLegacyDefaultAppLocalStorageValue(key: String) -> String? {
    /**
     CDXC:DevAppFlavor 2026-04-28-02:01
     Existing user state lives in the default app's WKWebView localStorage under
     com.madda.zmux.host. zmux-dev has a separate bundle WebKit container, so
     import missing shared settings/workspace snapshots from that production
     localStorage before falling back to empty defaults.
     */
    let webKitRoot = FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent("Library/WebKit/com.madda.zmux.host", isDirectory: true)
    guard let enumerator = FileManager.default.enumerator(
      at: webKitRoot,
      includingPropertiesForKeys: nil,
      options: [.skipsHiddenFiles]
    ) else {
      return nil
    }
    for case let url as URL in enumerator where url.lastPathComponent == "localstorage.sqlite3" {
      if let value = readLocalStorageValue(databaseURL: url, key: key) {
        return value
      }
    }
    return nil
  }

  private static func readLocalStorageValue(databaseURL: URL, key: String) -> String? {
    let escapedKey = key.replacingOccurrences(of: "'", with: "''")
    let process = Process()
    let output = Pipe()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/sqlite3")
    process.arguments = [
      "-readonly",
      databaseURL.path,
      "select hex(value) from ItemTable where key = '\(escapedKey)' limit 1;",
    ]
    process.standardOutput = output
    process.standardError = FileHandle.nullDevice
    do {
      try process.run()
      let data = output.fileHandleForReading.readDataToEndOfFile()
      process.waitUntilExit()
      guard process.terminationStatus == 0 else {
        return nil
      }
      let hexValue = String(data: data, encoding: .utf8)?
        .trimmingCharacters(in: .whitespacesAndNewlines)
      guard let hexValue, !hexValue.isEmpty, let valueData = dataFromHexString(hexValue) else {
        return nil
      }
      return decodeJsonStorageData(valueData)
    } catch {
      return nil
    }
  }

  private static func decodeJsonStorageData(_ data: Data) -> String? {
    /**
     CDXC:DevAppFlavor 2026-04-28-03:05
     WKWebView localStorage stores sidebar snapshots as UTF-16 blobs on this
     machine. Shared zmux-dev state must normalize those blobs to UTF-8 JSON
     before the sidebar can read or rewrite them, otherwise the dev app starts
     from an empty fallback workspace and persists that over the shared file.
     */
    for encoding in [String.Encoding.utf8, .utf16LittleEndian, .utf16] {
      guard let value = String(data: data, encoding: encoding),
        !value.contains("\u{0}"),
        let jsonData = value.data(using: .utf8),
        (try? JSONSerialization.jsonObject(with: jsonData)) != nil
      else {
        continue
      }
      return value
    }
    return nil
  }

  private static func dataFromHexString(_ hex: String) -> Data? {
    guard hex.count.isMultiple(of: 2) else {
      return nil
    }
    var data = Data()
    data.reserveCapacity(hex.count / 2)
    var index = hex.startIndex
    while index < hex.endIndex {
      let nextIndex = hex.index(index, offsetBy: 2)
      guard let byte = UInt8(hex[index..<nextIndex], radix: 16) else {
        return nil
      }
      data.append(byte)
      index = nextIndex
    }
    return data
  }
}

enum NativeDebugLogging {
  /**
   CDXC:Diagnostics 2026-04-29-09:16
   Non-error native diagnostics must honor the sidebar Settings debug switch so
   routine title, focus, restore, and workspace updates cannot create persistent
   memory and disk pressure when debugging UI is disabled.
   */
  static var isEnabled: Bool {
    guard let data = try? Data(contentsOf: ZmuxAppStorage.sharedSidebarSettingsURL),
      let object = try? JSONSerialization.jsonObject(with: data),
      let settings = object as? [String: Any]
    else {
      return false
    }
    return settings["debuggingMode"] as? Bool ?? false
  }
}
