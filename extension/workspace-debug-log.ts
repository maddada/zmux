import { appendFile, mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { ensureWorkspaceGitExcludeEntry } from "./git/local-exclude";

const LOG_DIR_NAME = ".zmux";

type WorkspaceDebugLogWriteOptions = {
  details?: unknown;
  enabled: boolean;
  event: string;
  fileName: string;
  workspaceRoot: string | undefined;
};

type WorkspaceDebugLogResetOptions = {
  enabled: boolean;
  fileName: string;
  workspaceRoot: string | undefined;
};

const fileWriteQueueByPath = new Map<string, Promise<void>>();

export function getWorkspaceDebugLogPath(workspaceRoot: string, fileName: string): string {
  return path.join(workspaceRoot, LOG_DIR_NAME, fileName);
}

export function appendWorkspaceDebugLogLine(options: WorkspaceDebugLogWriteOptions): Promise<void> {
  const workspaceRoot = normalizeWorkspaceRoot(options.workspaceRoot);
  if (!options.enabled || !workspaceRoot) {
    return Promise.resolve();
  }

  const logPath = getWorkspaceDebugLogPath(workspaceRoot, options.fileName);
  const text = buildLogLine(options.event, options.details);
  return queueWorkspaceDebugLogWrite(logPath, async () => {
    await ensureWorkspaceGitExcludeEntry(workspaceRoot, `${LOG_DIR_NAME}/`);
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, text, "utf8");
  });
}

export function resetWorkspaceDebugLogFile(options: WorkspaceDebugLogResetOptions): Promise<void> {
  const workspaceRoot = normalizeWorkspaceRoot(options.workspaceRoot);
  if (!options.enabled || !workspaceRoot) {
    return Promise.resolve();
  }

  const logPath = getWorkspaceDebugLogPath(workspaceRoot, options.fileName);
  return queueWorkspaceDebugLogWrite(logPath, async () => {
    await ensureWorkspaceGitExcludeEntry(workspaceRoot, `${LOG_DIR_NAME}/`);
    await mkdir(path.dirname(logPath), { recursive: true });
    await writeFile(logPath, "", "utf8");
  });
}

function normalizeWorkspaceRoot(workspaceRoot: string | undefined): string | undefined {
  const normalized = workspaceRoot?.trim();
  return normalized ? normalized : undefined;
}

function buildLogLine(event: string, details?: unknown): string {
  const suffix = details === undefined ? "" : ` ${safeSerialize(details)}`;
  return `${new Date().toISOString()} ${event}${suffix}\n`;
}

function safeSerialize(details: unknown): string {
  try {
    return JSON.stringify(details, (_key, value) => serializeLogValue(value));
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? serializeError(error) : String(error),
      unserializable: true,
    });
  }
}

function serializeLogValue(value: unknown): unknown {
  if (value instanceof Error) {
    return serializeError(value);
  }

  return value;
}

function serializeError(error: Error) {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

function queueWorkspaceDebugLogWrite(
  logPath: string,
  operation: () => Promise<void>,
): Promise<void> {
  const previous = fileWriteQueueByPath.get(logPath) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(operation)
    .catch(() => undefined)
    .finally(() => {
      if (fileWriteQueueByPath.get(logPath) === next) {
        fileWriteQueueByPath.delete(logPath);
      }
    });
  fileWriteQueueByPath.set(logPath, next);
  return next;
}
