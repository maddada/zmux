import { appendFile, mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { ensureWorkspaceGitExcludeEntry } from "./git/local-exclude";

const SETTINGS_SECTION = "VSmux";
const DEBUGGING_MODE_SETTING = "debuggingMode";
const DEBUG_LOG_DIR_NAME = ".vsmux";
const DEBUG_LOG_FILE_NAME = "full-reload-terminal-reconnect.log";
const DEBUG_EVENT_PREFIX_ALLOWLIST = [
  "workspace.webview.workspace.terminal",
  "daemon.runtime.",
  "controller.fullReloadSession.",
  "controller.waitForTerminalFrontendConnectionAfterReload.",
] as const;
const DEBUG_EVENT_ALLOWLIST = new Set<string>([
  "backend.daemon.sessionPresentationChanged",
  "backend.daemon.sessionPresentationDiff",
  "backend.daemon.syncSessionLeases.failed",
]);

let fileWriteQueue: Promise<void> = Promise.resolve();

export function initializeVSmuxDebugLog(context: vscode.ExtensionContext): void {
  queueDebugLogWorkspaceIgnore();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration(`${SETTINGS_SECTION}.${DEBUGGING_MODE_SETTING}`) &&
        isDebugLoggingEnabled()
      ) {
        queueDebugLogWorkspaceIgnore();
      }
    }),
  );
}

export function resetVSmuxDebugLog(): void {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }
  const logFilePath = getVSmuxDebugLogPath(workspaceRoot);

  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureDebugLogWorkspaceIgnored(workspaceRoot);
      await mkdir(path.dirname(logFilePath), { recursive: true });
      await writeFile(logFilePath, "", "utf8");
    })
    .catch(() => undefined);
}

export function logVSmuxDebug(event: string, details?: unknown): void {
  if (!isDebugLoggingEnabled() || !shouldLogDebugEvent(event)) {
    return;
  }

  queueDebugLogFileAppend(buildLogLine(event, details));
}

export function logVSmuxReproTrace(event: string, details?: unknown): void {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  queueDebugLogFileAppend(buildLogLine(event, details));
}

export function disposeVSmuxDebugLog(): void {}

export function getVSmuxDebugLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, DEBUG_LOG_DIR_NAME, DEBUG_LOG_FILE_NAME);
}

function buildLogLine(event: string, details?: unknown): string {
  const suffix = details === undefined ? "" : ` ${safeSerialize(details)}`;
  return `${new Date().toISOString()} ${event}${suffix}\n`;
}

function resolveWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function ensureDebugLogWorkspaceIgnored(workspaceRoot: string): Promise<void> {
  await ensureWorkspaceGitExcludeEntry(workspaceRoot, `${DEBUG_LOG_DIR_NAME}/`);
}

function queueDebugLogFileAppend(text: string): void {
  const workspaceRoot = resolveWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }
  const logFilePath = getVSmuxDebugLogPath(workspaceRoot);

  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await ensureDebugLogWorkspaceIgnored(workspaceRoot);
      await mkdir(path.dirname(logFilePath), { recursive: true });
      await appendFile(logFilePath, text, "utf8");
    })
    .catch(() => undefined);
}

function queueDebugLogWorkspaceIgnore(): void {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  void ensureDebugLogWorkspaceIgnored(workspaceRoot).catch(() => undefined);
}

function isDebugLoggingEnabled(): boolean {
  return (
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<boolean>(DEBUGGING_MODE_SETTING) ??
    false
  );
}

function shouldLogDebugEvent(event: string): boolean {
  if (DEBUG_EVENT_ALLOWLIST.has(event)) {
    return true;
  }

  return DEBUG_EVENT_PREFIX_ALLOWLIST.some((prefix) => event.startsWith(prefix));
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
