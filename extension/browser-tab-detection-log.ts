import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

const LOG_DIR_NAME = ".vsmux";
const LOG_FILE_NAME = "browser-tab-detection-debug.log";

let fileWriteQueue: Promise<void> = Promise.resolve();

export function getBrowserTabDetectionLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, LOG_DIR_NAME, LOG_FILE_NAME);
}

export function logBrowserTabDetection(event: string, details?: unknown): void {
  const logFilePath = resolveBrowserTabDetectionLogPath();
  if (!logFilePath) {
    return;
  }

  const text = buildLogLine(event, details);
  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await mkdir(path.dirname(logFilePath), { recursive: true });
      await appendFile(logFilePath, text, "utf8");
    })
    .catch(() => undefined);
}

function resolveBrowserTabDetectionLogPath(): string | undefined {
  const workspaceRoot = vscode.workspace?.workspaceFolders?.[0]?.uri.fsPath;
  return workspaceRoot ? getBrowserTabDetectionLogPath(workspaceRoot) : undefined;
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
