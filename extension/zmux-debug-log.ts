import * as path from "node:path";
import * as vscode from "vscode";
import { getDebuggingMode } from "./native-terminal-workspace/settings";
import { appendWorkspaceDebugLogLine, resetWorkspaceDebugLogFile } from "./workspace-debug-log";

const DEBUG_LOG_DIR_NAME = ".zmux";
const DEBUG_LOG_FILE_NAME = "full-reload-terminal-reconnect.log";
const DEBUG_EVENT_PREFIX_ALLOWLIST = [
  "sidebar.provider.",
  "sidebar.webview.",
  "workspace.webview.focus.",
  "workspace.webview.terminal.",
  "workspace.webview.workspace.sessionStatePaneSummary",
  "workspace.webview.workspace.terminalPresentationChanged",
  "workspace.webview.workspace.terminalLayerSummary",
  "workspace.webview.workspace.terminalHost",
  "workspace.webview.workspace.lifecycle.",
  "workspace.webview.workspace.generation",
  "workspace.webview.workspace.mainPane",
  "workspace.webview.workspace.paneMeasuredBounds",
  "workspace.webview.workspace.hiddenPaneParkingSummary",
  "workspace.webview.workspace.activeGroupLayoutSummary",
  "workspace.webview.workspace.terminalPortalTargetChanged",
  "workspace.webview.workspace.paneView",
  "workspace.webview.workspace.terminal",
  "controller.activitySuppression.",
  "controller.refreshWorkspacePanel.",
  "controller.createWorkspacePanelMessage.",
  "controller.handleSidebarMessage.",
  "controller.focusSession.",
  "controller.focusGroup.",
  "controller.reloadWorkspacePanel.",
  "backend.daemon.sessionActivity.",
  "daemon.runtime.",
  "controller.fullReloadSession.",
  "controller.destroyWorkspaceTerminalRuntime.",
  "controller.waitForTerminalFrontendConnectionAfterReload.",
  "controller.initialize",
  "workspace.panel.",
  "controller.refreshWorkspacePanel.",
] as const;
const DEBUG_EVENT_ALLOWLIST = new Set<string>([
  "backend.daemon.sessionPresentationChanged",
  "backend.daemon.sessionPresentationDiff",
  "backend.daemon.syncSessionLeases.failed",
]);

export function initializezmuxDebugLog(_context: vscode.ExtensionContext): void {}

export function resetzmuxDebugLog(): void {
  void resetWorkspaceDebugLogFile({
    enabled: getDebuggingMode(),
    fileName: DEBUG_LOG_FILE_NAME,
    workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  });
}

export function logzmuxDebug(event: string, details?: unknown): void {
  if (!shouldLogDebugEvent(event)) {
    return;
  }

  void appendWorkspaceDebugLogLine({
    details,
    enabled: getDebuggingMode(),
    event,
    fileName: DEBUG_LOG_FILE_NAME,
    workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  });
}

export function logzmuxReproTrace(event: string, details?: unknown): void {
  void appendWorkspaceDebugLogLine({
    details,
    enabled: getDebuggingMode(),
    event,
    fileName: DEBUG_LOG_FILE_NAME,
    workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  });
}

export function disposezmuxDebugLog(): void {}

export function getzmuxDebugLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, DEBUG_LOG_DIR_NAME, DEBUG_LOG_FILE_NAME);
}

function shouldLogDebugEvent(event: string): boolean {
  if (DEBUG_EVENT_ALLOWLIST.has(event)) {
    return true;
  }

  return DEBUG_EVENT_PREFIX_ALLOWLIST.some((prefix) => event.startsWith(prefix));
}
