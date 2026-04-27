import Foundation

enum NativeGhosttyTerminalEnvironment {
  /**
   CDXC:NativeTerminalColors 2026-04-27-23:30
   Native Ghostty terminals must not inherit Codex build-runner color
   suppression such as NO_COLOR=1 or TERM=dumb. Agent CLIs like Codex and
   Claude respect those variables and render without ANSI color even though
   the embedded Ghostty renderer and theme are working correctly.
   */
  static func sanitizeProcessEnvironmentBeforeGhosttyInit() {
    unsetenv("NO_COLOR")
  }

  /**
   CDXC:NativeTerminalColors 2026-04-27-23:30
   Preserve zmux session metadata while making the spawned shell environment
   explicitly color-capable. Ghostty itself owns TERM, COLORTERM, TERMINFO,
   TERM_PROGRAM, and TERM_PROGRAM_VERSION; zmux only avoids inherited
   no-color flags and sets generic CLI color opt-in where appropriate.
   */
  static func surfaceEnvironment(from env: [String: String]?) -> [String: String] {
    var sanitized = env ?? [:]
    sanitized.removeValue(forKey: "NO_COLOR")
    sanitized["CLICOLOR"] = "1"
    return sanitized
  }
}
