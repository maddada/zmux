import Foundation

enum GhosttySessionHostDebugLog {
    /**
     CDXC:NativeTerminalSurvival 2026-04-27-23:11
     Durable Ghostty terminals cross the zmux/helper process boundary, so
     visibility bugs need a shared file log that records command delivery,
     helper session state, and AppKit window decisions in one timeline.
     */
    static func append(event: String, details: [String: Any] = [:]) {
        let logsDirectory = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".zmux/logs", isDirectory: true)
        let logURL = logsDirectory.appendingPathComponent("ghostty-session-host-debug.log")
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS ZZZZ"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current

        var payload = details
        payload["event"] = event
        let line = "[\(formatter.string(from: Date()))] \(serialize(payload))\n"

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
            NSLog("failed to write Ghostty session host debug log: \(error.localizedDescription)")
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
