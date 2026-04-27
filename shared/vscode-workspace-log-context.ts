import * as path from "node:path";

export const NO_VSCODE_WORKSPACE_LOG_LABEL = "no-workspace";

export type VscodeWorkspaceLogState = {
  name?: string;
  workspaceFilePath?: string;
  workspaceFolderName?: string;
  workspaceFolderPath?: string;
};

let currentWorkspaceLogState: VscodeWorkspaceLogState = {};

export function setVscodeWorkspaceLogState(state: VscodeWorkspaceLogState): void {
  // CDXC:NoVSCodeRuntime 2026-04-25-06:44: zmux keeps this shared logging
  // helper for copied code, but it must no longer import VS Code at runtime.
  // The standalone controller/view can provide the active workspace metadata.
  currentWorkspaceLogState = state;
}

export function resolveVscodeWorkspaceLogLabel(state: VscodeWorkspaceLogState): string {
  const workspaceName = normalizeWorkspaceLabel(state.name);
  if (workspaceName) {
    return workspaceName;
  }

  const workspaceFilePath = normalizeWorkspaceLabel(state.workspaceFilePath);
  if (workspaceFilePath) {
    return path.basename(workspaceFilePath, path.extname(workspaceFilePath));
  }

  const workspaceFolderName = normalizeWorkspaceLabel(state.workspaceFolderName);
  if (workspaceFolderName) {
    return workspaceFolderName;
  }

  const workspaceFolderPath = normalizeWorkspaceLabel(state.workspaceFolderPath);
  if (workspaceFolderPath) {
    return path.basename(workspaceFolderPath);
  }

  return NO_VSCODE_WORKSPACE_LOG_LABEL;
}

export function getVscodeWorkspaceLogLabel(): string {
  return resolveVscodeWorkspaceLogLabel(currentWorkspaceLogState);
}

export function formatVscodeWorkspaceLogPrefix(): string {
  return `[workspace:${getVscodeWorkspaceLogLabel()}]`;
}

export function prefixLogMessageWithVscodeWorkspace(message: string): string {
  return `${formatVscodeWorkspaceLogPrefix()} ${message}`;
}

function normalizeWorkspaceLabel(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
