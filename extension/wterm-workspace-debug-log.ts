import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";

const DEBUG_LOG_DIR_NAME = ".vsmux";
const DEBUG_LOG_FILE_NAME = "wterm-debug.log";
const DEBUG_LOG_TAG = "[wterm-debug]";

let fileWriteQueue: Promise<void> = Promise.resolve();

export function getWtermWorkspaceDebugLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, DEBUG_LOG_DIR_NAME, DEBUG_LOG_FILE_NAME);
}

export async function appendWtermWorkspaceDebugLog(
  workspaceRoot: string,
  event: string,
  details?: unknown,
): Promise<void> {
  const logFilePath = getWtermWorkspaceDebugLogPath(workspaceRoot);
  const line = buildLogLine(event, details);

  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await mkdir(path.dirname(logFilePath), { recursive: true });
      await appendFile(logFilePath, `${line}\n`, "utf8");
    })
    .catch(() => undefined);

  await fileWriteQueue;
}

function buildLogLine(event: string, details?: unknown): string {
  const suffix = details === undefined ? "" : ` ${safeSerialize(details)}`;
  return `${new Date().toISOString()} ${DEBUG_LOG_TAG} ${event}${suffix}`;
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
