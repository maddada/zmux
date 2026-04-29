import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function appendAgentShellDebugLog(
  event: string,
  details?: unknown,
  logFilePath =
    process.env.zmux_AGENT_SHELL_DEBUG_LOG_PATH?.trim() ||
    process.env.VSMUX_AGENT_SHELL_DEBUG_LOG_PATH?.trim(),
): Promise<void> {
  const normalizedLogFilePath = logFilePath?.trim();
  if (!normalizedLogFilePath) {
    return;
  }

  try {
    /**
     * CDXC:AgentTerminalResize 2026-04-29-08:13
     * Agent launch diagnostics must persist wrapper TTY and child process
     * details so embedded-terminal resize regressions can be verified against
     * the same process-group evidence visible in normal terminal sessions.
     */
    await mkdir(dirname(normalizedLogFilePath), { recursive: true });
    await appendFile(
      normalizedLogFilePath,
      `${JSON.stringify({
        event,
        details,
        timestamp: new Date().toISOString(),
      })}\n`,
      "utf8",
    );
  } catch {
    // Diagnostics must not break agent launch.
  }
}
