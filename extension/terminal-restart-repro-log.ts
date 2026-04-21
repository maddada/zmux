import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";
import { ensureWorkspaceGitExcludeEntry } from "./git/local-exclude";

const REPRO_LOG_DIR_NAME = ".vsmux";
const REPRO_LOG_FILE_NAME = "terminal-restart-repro.log";

let fileWriteQueue: Promise<void> = Promise.resolve();

export function getTerminalRestartReproLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, REPRO_LOG_DIR_NAME, REPRO_LOG_FILE_NAME);
}

export function appendTerminalRestartReproLog(
  workspaceRoot: string | undefined,
  event: string,
  details?: unknown,
): Promise<void> {
  if (!workspaceRoot) {
    return Promise.resolve();
  }

  const logFilePath = getTerminalRestartReproLogPath(workspaceRoot);
  const logLine = buildLogLine(event, details);
  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureWorkspaceGitExcludeEntry(workspaceRoot, `${REPRO_LOG_DIR_NAME}/`);
      await mkdir(path.dirname(logFilePath), { recursive: true });
      await appendFile(logFilePath, logLine, "utf8");
    })
    .catch(() => undefined);

  return fileWriteQueue;
}

function buildLogLine(event: string, details?: unknown): string {
  const suffix = details === undefined ? "" : ` ${safeSerialize(details)}`;
  return `${new Date().toISOString()} ${event}${suffix}\n`;
}

function safeSerialize(details: unknown): string {
  try {
    return JSON.stringify(details, (_key, value) => {
      if (value instanceof Error) {
        return {
          message: value.message,
          name: value.name,
          stack: value.stack,
        };
      }

      return value;
    });
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
}
