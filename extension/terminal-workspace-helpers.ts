import { createHash } from "node:crypto";
import * as os from "node:os";
import * as vscode from "vscode";
import {
  createEditorLayoutPlan,
  type EditorLayout,
  type EditorLayoutGroup,
} from "../shared/editor-layout";
import {
  type SessionGridSnapshot,
  type SessionRecord,
  type TerminalViewMode,
} from "../shared/session-grid-contract";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
  TerminalSessionStatus,
} from "../shared/terminal-host-protocol";

export type PersistedSessionState = {
  agentName?: string;
  agentStatus: TerminalAgentStatus;
  title?: string;
};

export const DEFAULT_TERMINAL_COLS = 120;
export const DEFAULT_TERMINAL_ROWS = 34;

const VT_TEXT_ACTIVITY_TAIL_LENGTH = 4000;
const CODEX_WORKING_TEXT_MARKER = "esc to interrupt)";
const CODEX_WORKING_SNIPPET_LENGTH = 220;

export async function applyEditorLayout(
  visibleCount: number,
  viewMode: TerminalViewMode,
  options?: {
    joinAllGroups?: boolean;
  },
): Promise<void> {
  const layoutPlan = createEditorLayoutPlan(visibleCount, viewMode);
  if (options?.joinAllGroups !== false) {
    await vscode.commands.executeCommand("workbench.action.joinAllGroups");
  }
  await vscode.commands.executeCommand("vscode.setEditorLayout", layoutPlan.layout);
}

export async function doesCurrentEditorLayoutMatch(
  visibleCount: number,
  viewMode: TerminalViewMode,
): Promise<boolean> {
  try {
    const currentLayout = await vscode.commands.executeCommand<EditorLayout | undefined>(
      "vscode.getEditorLayout",
    );
    if (!isEditorLayout(currentLayout)) {
      return false;
    }

    const desiredLayout = createEditorLayoutPlan(visibleCount, viewMode).layout;
    return (
      JSON.stringify(normalizeEditorLayout(currentLayout)) ===
      JSON.stringify(normalizeEditorLayout(desiredLayout))
    );
  } catch {
    return false;
  }
}

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

function isEditorLayout(value: unknown): value is EditorLayout {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as EditorLayout).groups) &&
    ((value as EditorLayout).orientation === 0 || (value as EditorLayout).orientation === 1)
  );
}

function normalizeEditorLayout(layout: EditorLayout): {
  groups: Array<Record<string, unknown>>;
  orientation: 0 | 1;
} {
  return {
    groups: layout.groups.map((group) => normalizeEditorLayoutGroup(group)),
    orientation: layout.orientation,
  };
}

function normalizeEditorLayoutGroup(group: EditorLayoutGroup): Record<string, unknown> {
  if (!Array.isArray(group.groups) || group.groups.length === 0) {
    return {};
  }

  return {
    groups: group.groups.map((childGroup) => normalizeEditorLayoutGroup(childGroup)),
    orientation: group.orientation,
  };
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

export function parsePersistedSessionState(rawState: string): PersistedSessionState {
  let agentName: string | undefined;
  let agentStatus: TerminalAgentStatus = "idle";
  let title: string | undefined;

  for (const line of rawState.split(/\r?\n/)) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();
    if (key === "agent") {
      agentName = value || undefined;
    }
    if (key === "title") {
      title = value || undefined;
    }
    if (key === "status" && (value === "idle" || value === "working" || value === "attention")) {
      agentStatus = value;
    }
  }

  return {
    agentName,
    agentStatus,
    title,
  };
}

export function serializePersistedSessionState(state: PersistedSessionState): string {
  return [
    `status=${state.agentStatus}`,
    `agent=${normalizePersistedSessionValue(state.agentName) ?? ""}`,
    `title=${normalizePersistedSessionValue(state.title) ?? ""}`,
    "",
  ].join("\n");
}

export function extractLatestTerminalTitleFromVtHistory(history: string): string | undefined {
  let index = 0;
  let latestTitle: string | undefined;

  while (index < history.length) {
    if (history[index] !== "\u001b" || history[index + 1] !== "]") {
      index += 1;
      continue;
    }

    const controlStart = index;
    const terminator = findOscTerminator(history, controlStart + 2);
    if (!terminator) {
      break;
    }

    const controlBody = history.slice(controlStart + 2, terminator.contentEnd);
    const separatorIndex = controlBody.indexOf(";");
    const command = separatorIndex >= 0 ? controlBody.slice(0, separatorIndex) : controlBody;
    const title =
      separatorIndex >= 0
        ? normalizePersistedSessionValue(controlBody.slice(separatorIndex + 1))
        : undefined;

    if ((command === "0" || command === "2") && title) {
      latestTitle = title;
    }

    index = terminator.sequenceEnd;
  }

  return latestTitle;
}

export function extractTerminalTextTailFromVtHistory(history: string): string | undefined {
  const strippedHistory = stripTerminalControlSequences(history);
  return normalizePersistedSessionValue(strippedHistory.slice(-VT_TEXT_ACTIVITY_TAIL_LENGTH));
}

export function extractClaudeCodeTitleFromVtHistory(history: string): string | undefined {
  const tailText = extractTerminalTextTailFromVtHistory(history);
  if (!tailText) {
    return undefined;
  }

  const match = /([✳*·]?\s*Claude Code)(?:\s+v[\w.-]+)?/iu.exec(tailText);
  return normalizePersistedSessionValue(match?.[1]);
}

export function hasInterruptStatusInVtHistory(history: string): boolean {
  const tailText = extractTerminalTextTailFromVtHistory(history);
  if (!tailText) {
    return false;
  }

  const lowerTailText = tailText.toLowerCase();
  const markerIndex = lowerTailText.lastIndexOf(CODEX_WORKING_TEXT_MARKER);
  if (markerIndex < 0) {
    return false;
  }

  const snippet = tailText.slice(
    Math.max(0, markerIndex - CODEX_WORKING_SNIPPET_LENGTH),
    markerIndex + CODEX_WORKING_TEXT_MARKER.length,
  );

  return /\([^)]*esc to interrupt\)/iu.test(snippet) && /[a-z]/iu.test(snippet);
}

export function hasCodexWorkingStatusInVtHistory(
  history: string,
  title?: string,
  agentName?: string,
): boolean {
  const normalizedTitle = title?.trim().toLowerCase();
  const normalizedAgentName = agentName?.trim().toLowerCase();
  if (!normalizedTitle?.includes("codex") && normalizedAgentName !== "codex") {
    return false;
  }

  return hasInterruptStatusInVtHistory(history);
}

export function getSessionNumber(sessionId: string): number | undefined {
  const match = /^session-(\d+)$/.exec(sessionId);
  if (!match) {
    return undefined;
  }

  const sessionNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(sessionNumber) && sessionNumber > 0 ? sessionNumber : undefined;
}

function normalizePersistedSessionValue(value: string | undefined): string | undefined {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function stripTerminalControlSequences(history: string): string {
  return history
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/gu, " ")
    .replace(/\u001bP[\s\S]*?\u001b\\/gu, " ")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "")
    .replace(/\u001b[@-_]/gu, "")
    .replace(/[\u0000-\u0008\u000b-\u001a\u001c-\u001f\u007f]/gu, " ")
    .replace(/\r/gu, "\n");
}

function findOscTerminator(
  data: string,
  startIndex: number,
): { contentEnd: number; sequenceEnd: number } | undefined {
  for (let index = startIndex; index < data.length; index += 1) {
    const currentCharacter = data[index];
    if (currentCharacter === "\u0007") {
      return {
        contentEnd: index,
        sequenceEnd: index + 1,
      };
    }

    if (currentCharacter === "\u001b" && data[index + 1] === "\\") {
      return {
        contentEnd: index,
        sequenceEnd: index + 2,
      };
    }
  }

  return undefined;
}

export function getSessionTabTitle(session: SessionRecord): string {
  const alias = session.alias.trim();
  return alias.length > 0 ? alias : session.title;
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
