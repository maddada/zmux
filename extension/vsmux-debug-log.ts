import * as vscode from "vscode";
import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";

const SETTINGS_SECTION = "VSmux";
const DEBUGGING_MODE_SETTING = "debuggingMode";
const DEBUG_LOG_FILE_NAME = "vsmux-debug.log";

let outputChannel: vscode.OutputChannel | undefined;
let debugLogFilePath: string | undefined;
let fileWriteQueue: Promise<void> = Promise.resolve();

export function initializeVSmuxDebugLog(context: vscode.ExtensionContext): void {
  debugLogFilePath = path.join(context.globalStorageUri.fsPath, DEBUG_LOG_FILE_NAME);
}

export function resetVSmuxDebugLog(): void {
  outputChannel?.clear();
}

export function logVSmuxDebug(event: string, details?: unknown): void {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  const output = getOutputChannel();
  const suffix = details === undefined ? "" : ` ${safeSerialize(details)}`;
  const line = `${new Date().toISOString()} ${event}${suffix}`;
  output.appendLine(line);
  queueDebugLogFileAppend(`${line}\n`);
}

export function disposeVSmuxDebugLog(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}

function getOutputChannel(): vscode.OutputChannel {
  outputChannel ??= vscode.window.createOutputChannel("VSmux Debug");
  return outputChannel;
}

function isDebugLoggingEnabled(): boolean {
  return (
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<boolean>(DEBUGGING_MODE_SETTING) ??
    false
  );
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

function queueDebugLogFileAppend(text: string): void {
  if (!debugLogFilePath) {
    return;
  }

  const logFilePath = debugLogFilePath;

  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const parentDir = path.dirname(logFilePath);
      await mkdir(parentDir, { recursive: true });
      await appendFile(logFilePath, text, "utf8");
    });
}
