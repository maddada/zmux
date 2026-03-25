import { createHash } from "node:crypto";
import * as os from "node:os";
import * as vscode from "vscode";
import type { SessionGridSnapshot } from "../shared/session-grid-contract";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
  TerminalSessionStatus,
} from "../shared/terminal-host-protocol";

export const DEFAULT_TERMINAL_COLS = 120;
export const DEFAULT_TERMINAL_ROWS = 34;

const FOCUS_EDITOR_GROUP_COMMANDS = [
  "workbench.action.focusFirstEditorGroup",
  "workbench.action.focusSecondEditorGroup",
  "workbench.action.focusThirdEditorGroup",
  "workbench.action.focusFourthEditorGroup",
  "workbench.action.focusFifthEditorGroup",
  "workbench.action.focusSixthEditorGroup",
  "workbench.action.focusSeventhEditorGroup",
  "workbench.action.focusEighthEditorGroup",
  "workbench.action.focusNinthEditorGroup",
] as const;

export function createBlockedSessionSnapshot(
  sessionId: string,
  workspaceId: string,
): TerminalSessionSnapshot {
  return {
    ...createDisconnectedSessionSnapshot(sessionId, workspaceId),
    errorMessage: "Shell creation blocked in an untrusted workspace.",
    status: "error",
  };
}

export function createDisconnectedSessionSnapshot(
  sessionId: string,
  workspaceId: string,
  status: TerminalSessionStatus = "disconnected",
): TerminalSessionSnapshot {
  return {
    agentName: undefined,
    agentStatus: "idle",
    cols: DEFAULT_TERMINAL_COLS,
    cwd: getDefaultWorkspaceCwd(),
    history: "",
    restoreState: "replayed",
    rows: DEFAULT_TERMINAL_ROWS,
    sessionId,
    shell: getDefaultShell(),
    startedAt: new Date(0).toISOString(),
    status,
    workspaceId,
  };
}

export function createEmptyWorkspaceSessionSnapshot(): SessionGridSnapshot {
  return {
    focusedSessionId: undefined,
    fullscreenRestoreVisibleCount: undefined,
    sessions: [],
    viewMode: "grid",
    visibleCount: 1,
    visibleSessionIds: [],
  };
}

export function getDefaultShell(): string {
  const configuredShell = process.env.SHELL?.trim();
  if (configuredShell) {
    return configuredShell;
  }

  return process.platform === "win32" ? "powershell.exe" : "/bin/zsh";
}

export function getDefaultWorkspaceCwd(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? os.homedir();
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getSessionActivityLabel(
  activity: TerminalAgentStatus,
  agentName: string | undefined,
): string | undefined {
  const resolvedAgentName = agentName?.trim();
  const titleCaseAgentName = resolvedAgentName
    ? `${resolvedAgentName.slice(0, 1).toUpperCase()}${resolvedAgentName.slice(1)}`
    : "Agent";

  switch (activity) {
    case "working":
      return `${titleCaseAgentName} active`;
    case "attention":
      return `${titleCaseAgentName} needs attention`;
    default:
      return undefined;
  }
}

export function getViewColumn(index: number): vscode.ViewColumn {
  return Math.max(vscode.ViewColumn.One, Math.min(index + 1, vscode.ViewColumn.Nine));
}

export function getActiveEditorGroupViewColumn(): vscode.ViewColumn | undefined {
  return vscode.window.tabGroups.activeTabGroup?.viewColumn;
}

export async function focusEditorGroupByIndex(index: number): Promise<boolean> {
  const command = FOCUS_EDITOR_GROUP_COMMANDS[index];
  if (!command) {
    return false;
  }

  await vscode.commands.executeCommand(command);
  return true;
}

export async function moveActiveTerminalToEditor(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.terminal.moveToEditor");
}

export async function moveActiveTerminalToPanel(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.terminal.moveToTerminalPanel");
}

export async function moveActiveEditorToNextGroup(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.moveEditorToNextGroup");
}

export async function moveActiveEditorToPreviousGroup(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.moveEditorToPreviousGroup");
}

export async function lockActiveEditorGroup(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
}

export async function unlockActiveEditorGroup(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
}

export function matchesVisibleTerminalLayout(
  snapshot: SessionGridSnapshot,
  terminalTitleBySessionId: ReadonlyMap<string, string>,
): boolean {
  return snapshot.visibleSessionIds.every((sessionId, index) => {
    const terminalTitle = terminalTitleBySessionId.get(sessionId);
    if (!terminalTitle) {
      return false;
    }

    const expectedViewColumn = getViewColumn(index);
    return vscode.window.tabGroups.all.some((group) => {
      if (group.viewColumn !== expectedViewColumn) {
        return false;
      }

      return group.tabs.some(
        (tab) => tab.input instanceof vscode.TabInputTerminal && tab.label === terminalTitle,
      );
    });
  });
}

export function getWorkspaceId(): string {
  const workspaceKey =
    vscode.workspace.workspaceFile?.toString() ??
    vscode.workspace.workspaceFolders?.map((folder) => folder.uri.toString()).join("|") ??
    "no-workspace";

  return createHash("sha1").update(workspaceKey).digest("hex").slice(0, 12);
}

export function getWorkspaceStorageKey(key: string, workspaceId: string): string {
  return `${key}:${workspaceId}`;
}
