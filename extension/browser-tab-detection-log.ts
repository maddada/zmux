import * as path from "node:path";
import * as vscode from "vscode";
import { getDebuggingMode } from "./native-terminal-workspace/settings";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const LOG_DIR_NAME = ".zmux";
const LOG_FILE_NAME = "browser-tab-detection-debug.log";

export function getBrowserTabDetectionLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, LOG_DIR_NAME, LOG_FILE_NAME);
}

export function logBrowserTabDetection(event: string, details?: unknown): void {
  void appendWorkspaceDebugLogLine({
    details,
    enabled: getDebuggingMode(),
    event,
    fileName: LOG_FILE_NAME,
    workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  });
}
