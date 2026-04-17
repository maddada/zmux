import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";

export async function appendAgentShellDebugLog(
  event: string,
  details?: unknown,
  logFilePath = process.env.VSMUX_AGENT_SHELL_DEBUG_LOG_PATH?.trim(),
): Promise<void> {
  if (!logFilePath) {
    return;
  }

  const line = buildAgentShellDebugLogLine(event, details);
  await mkdir(path.dirname(logFilePath), { recursive: true }).catch(() => undefined);
  await appendFile(logFilePath, `${line}\n`, "utf8").catch(() => undefined);
}

function buildAgentShellDebugLogLine(event: string, details?: unknown): string {
  const suffix = details === undefined ? "" : ` ${safeSerialize(details)}`;
  return `${new Date().toISOString()} ${event}${suffix}`;
}

function safeSerialize(details: unknown): string {
  try {
    return JSON.stringify(details);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
}
