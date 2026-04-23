import * as path from "node:path";
import * as vscode from "vscode";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const LOG_DIR_NAME = ".vsmux";
const LOG_FILE_NAME = "storybook-browser-tab-debug.log";

export function getStorybookBrowserTabDebugLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, LOG_DIR_NAME, LOG_FILE_NAME);
}

export function logStorybookBrowserTabDebug(event: string, details?: unknown): void {
  void appendWorkspaceDebugLogLine({
    details,
    enabled: true,
    event,
    fileName: LOG_FILE_NAME,
    workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  });
}
