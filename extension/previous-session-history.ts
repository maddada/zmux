import * as vscode from "vscode";
import type {
  SessionRecord,
  SidebarPreviousSessionItem,
  SidebarSessionItem,
} from "../shared/session-grid-contract";
import type { SidebarAgentIcon } from "../shared/sidebar-agents";

const PREVIOUS_SESSION_HISTORY_KEY = "VSmux.previousSessionHistory";
const PREVIOUS_SESSION_HISTORY_LIMIT = 200;

export type PreviousSessionHistoryAgentLaunch = {
  agentId: string;
  command: string;
};

export type PreviousSessionHistoryEntry = {
  agentIcon?: SidebarAgentIcon;
  agentLaunch?: PreviousSessionHistoryAgentLaunch;
  closedAt: string;
  historyId: string;
  sessionRecord: SessionRecord;
  sidebarItem: SidebarSessionItem;
};

export class PreviousSessionHistory {
  private history: PreviousSessionHistoryEntry[];

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.history = normalizePreviousSessionHistory(
      context.workspaceState.get<PreviousSessionHistoryEntry[]>(PREVIOUS_SESSION_HISTORY_KEY),
    );
  }

  public getEntry(historyId: string): PreviousSessionHistoryEntry | undefined {
    return this.history.find((entry) => entry.historyId === historyId);
  }

  public getItems(): SidebarPreviousSessionItem[] {
    return this.history.map((entry) => ({
      ...entry.sidebarItem,
      closedAt: entry.closedAt,
      historyId: entry.historyId,
      isRestorable: true,
    }));
  }

  public async append(entries: readonly PreviousSessionHistoryEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    this.history = [...entries, ...this.history].slice(0, PREVIOUS_SESSION_HISTORY_LIMIT);
    await this.persist();
  }

  public async remove(historyId: string): Promise<void> {
    const nextHistory = this.history.filter((entry) => entry.historyId !== historyId);
    if (nextHistory.length === this.history.length) {
      return;
    }

    this.history = nextHistory;
    await this.persist();
  }

  private async persist(): Promise<void> {
    await this.context.workspaceState.update(PREVIOUS_SESSION_HISTORY_KEY, this.history);
  }
}

function normalizePreviousSessionHistory(
  candidate: readonly PreviousSessionHistoryEntry[] | undefined,
): PreviousSessionHistoryEntry[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
    .filter(isPreviousSessionHistoryEntry)
    .filter((entry) => entry.sessionRecord.kind !== "browser")
    .sort((left, right) => Date.parse(right.closedAt) - Date.parse(left.closedAt))
    .slice(0, PREVIOUS_SESSION_HISTORY_LIMIT);
}

function isPreviousSessionHistoryEntry(
  candidate: unknown,
): candidate is PreviousSessionHistoryEntry {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const entry = candidate as Partial<PreviousSessionHistoryEntry>;
  return (
    typeof entry.historyId === "string" &&
    typeof entry.closedAt === "string" &&
    isSidebarSessionItem(entry.sidebarItem) &&
    isSessionRecord(entry.sessionRecord) &&
    (entry.agentLaunch === undefined || isAgentLaunch(entry.agentLaunch))
  );
}

function isSidebarSessionItem(candidate: unknown): candidate is SidebarSessionItem {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const item = candidate as Partial<SidebarSessionItem>;
  return (
    typeof item.sessionId === "string" &&
    typeof item.alias === "string" &&
    typeof item.shortcutLabel === "string" &&
    typeof item.row === "number" &&
    typeof item.column === "number" &&
    typeof item.isFocused === "boolean" &&
    typeof item.isVisible === "boolean" &&
    typeof item.isRunning === "boolean" &&
    typeof item.activity === "string"
  );
}

function isSessionRecord(candidate: unknown): candidate is SessionRecord {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const record = candidate as Partial<SessionRecord>;
  return (
    typeof record.kind === "string" &&
    typeof record.sessionId === "string" &&
    typeof record.title === "string" &&
    typeof record.alias === "string" &&
    typeof record.slotIndex === "number" &&
    typeof record.row === "number" &&
    typeof record.column === "number" &&
    typeof record.createdAt === "string"
  );
}

function isAgentLaunch(candidate: unknown): candidate is PreviousSessionHistoryAgentLaunch {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const launch = candidate as Partial<PreviousSessionHistoryAgentLaunch>;
  return typeof launch.agentId === "string" && typeof launch.command === "string";
}
