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

export type WorkbenchEditorLayoutGroup = {
  groups?: WorkbenchEditorLayoutGroup[];
  orientation?: 0 | 1;
  size?: number;
};

export type WorkbenchEditorLayout = {
  groups: WorkbenchEditorLayoutGroup[];
  orientation?: 0 | 1;
};

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
    frontendAttachmentGeneration: 0,
    history: "",
    isAttached: false,
    restoreState: "replayed",
    rows: DEFAULT_TERMINAL_ROWS,
    sessionId,
    shell: getDefaultShell(),
    startedAt: new Date(0).toISOString(),
    status,
    title: undefined,
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

export async function lockActiveEditorGroup(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
}

export async function unlockActiveEditorGroup(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.unlockEditorGroup");
}

export async function getCurrentEditorLayout(): Promise<WorkbenchEditorLayout | undefined> {
  const layout =
    await vscode.commands.executeCommand<WorkbenchEditorLayout>("vscode.getEditorLayout");
  return isWorkbenchEditorLayout(layout) ? layout : undefined;
}

export async function setEditorLayout(layout: WorkbenchEditorLayout): Promise<void> {
  await vscode.commands.executeCommand("vscode.setEditorLayout", layout);
}

export async function moveActiveEditorToGroup(targetGroupIndex: number): Promise<boolean> {
  const activeViewColumn = getActiveEditorGroupViewColumn();
  if (activeViewColumn === undefined) {
    return false;
  }

  const activeGroupIndex = activeViewColumn - 1;
  if (activeGroupIndex === targetGroupIndex) {
    return true;
  }

  const command =
    activeGroupIndex < targetGroupIndex
      ? "workbench.action.moveEditorToRightGroup"
      : "workbench.action.moveEditorToLeftGroup";
  const moveCount = Math.abs(targetGroupIndex - activeGroupIndex);

  for (let index = 0; index < moveCount; index += 1) {
    await vscode.commands.executeCommand(command);
  }

  return true;
}

export function haveSameEditorLayoutShape(
  left: WorkbenchEditorLayout | undefined,
  right: WorkbenchEditorLayout,
): boolean {
  if (!left) {
    return false;
  }

  return haveSameEditorLayoutGroupShape(left, right);
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

function isWorkbenchEditorLayout(value: unknown): value is WorkbenchEditorLayout {
  return Boolean(
    value && typeof value === "object" && Array.isArray((value as WorkbenchEditorLayout).groups),
  );
}

function haveSameEditorLayoutGroupShape(
  left: WorkbenchEditorLayoutGroup,
  right: WorkbenchEditorLayoutGroup,
): boolean {
  const leftGroups = left.groups ?? [];
  const rightGroups = right.groups ?? [];
  if (
    (left.orientation ?? 0) !== (right.orientation ?? 0) ||
    leftGroups.length !== rightGroups.length
  ) {
    return false;
  }

  return leftGroups.every((group, index) =>
    haveSameEditorLayoutGroupShape(group, rightGroups[index]),
  );
}
