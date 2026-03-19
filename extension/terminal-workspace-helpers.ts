import { createHash } from "node:crypto";
import * as os from "node:os";
import * as vscode from "vscode";
import { createEditorLayoutPlan } from "../shared/editor-layout";
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
  flashTitle?: string;
  title?: string;
};

export const DEFAULT_TERMINAL_COLS = 120;
export const DEFAULT_TERMINAL_ROWS = 34;
export const DEFAULT_FOCUSED_TERMINAL_FLASH_MARKERS = ["🟥", "🟩", "🟨", "🟦", "🟪", "⬜"] as const;
export const FOCUSED_TERMINAL_FLASH_FRAME_DURATION_MS = 120;

export async function applyEditorLayout(
  visibleCount: number,
  viewMode: TerminalViewMode,
): Promise<void> {
  const layoutPlan = createEditorLayoutPlan(visibleCount, viewMode);
  await vscode.commands.executeCommand("workbench.action.joinAllGroups");
  await vscode.commands.executeCommand("vscode.setEditorLayout", layoutPlan.layout);
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
  let flashTitle: string | undefined;
  let title: string | undefined;

  for (const line of rawState.split(/\r?\n/)) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();
    if (key === "agent") {
      agentName = value || undefined;
    }
    if (key === "flash_title") {
      flashTitle = value || undefined;
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
    flashTitle,
    title,
  };
}

export function serializePersistedSessionState(state: PersistedSessionState): string {
  return [
    `status=${state.agentStatus}`,
    `agent=${normalizePersistedSessionValue(state.agentName) ?? ""}`,
    `flash_title=${normalizePersistedSessionValue(state.flashTitle) ?? ""}`,
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

export function getWorkspaceId(): string {
  const workspaceKey =
    vscode.workspace.workspaceFile?.toString() ??
    vscode.workspace.workspaceFolders?.map((folder) => folder.uri.toString()).join("|") ??
    "no-workspace";

  return createHash("sha1").update(workspaceKey).digest("hex").slice(0, 12);
}
