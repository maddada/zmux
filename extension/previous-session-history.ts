import * as vscode from "vscode";
import type {
  SessionLifecycleState,
  SessionRecord,
  SidebarPreviousSessionItem,
  SidebarSessionItem,
} from "../shared/session-grid-contract";
import {
  getSidebarSessionLifecycleState,
  getVisiblePrimaryTitle,
  getVisibleTerminalTitle,
  isGeneratedSessionAlias,
} from "../shared/session-grid-contract";
import { normalizeSessionRecord } from "../shared/session-grid-state-helpers";
import {
  shouldPreferTerminalTitleForAgentIcon,
  type SidebarAgentIcon,
} from "../shared/sidebar-agents";

const PREVIOUS_SESSION_HISTORY_KEY = "zmux.previousSessionHistory";
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

  public getSessionIds(): string[] {
    return this.history.map((entry) => entry.sessionRecord.sessionId);
  }

  public getItems(): SidebarPreviousSessionItem[] {
    return this.history.flatMap((entry) => {
      const sidebarItem = getNormalizedHistorySidebarItem(entry);
      if (!shouldExposeHistorySidebarItem(entry, sidebarItem)) {
        return [];
      }

      return [
        {
          ...sidebarItem,
          activity: "idle",
          activityLabel: undefined,
          closedAt: entry.closedAt,
          historyId: entry.historyId,
          lifecycleState: normalizeHistoryLifecycleState(sidebarItem),
          isGeneratedName: isGeneratedSessionAlias(entry.sessionRecord),
          isRestorable: true,
        },
      ];
    });
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

  public async removeGeneratedNames(): Promise<number> {
    const nextHistory = this.history.filter(
      (entry) => !isGeneratedSessionAlias(entry.sessionRecord),
    );
    const removedCount = this.history.length - nextHistory.length;
    if (removedCount === 0) {
      return 0;
    }

    this.history = nextHistory;
    await this.persist();
    return removedCount;
  }

  private async persist(): Promise<void> {
    await this.context.workspaceState.update(PREVIOUS_SESSION_HISTORY_KEY, this.history);
  }
}

function getNormalizedHistorySidebarItem(entry: PreviousSessionHistoryEntry): SidebarSessionItem {
  const sessionPrimaryTitle = getVisiblePrimaryTitle(entry.sessionRecord.title);
  const storedPrimaryTitle = getVisibleTerminalTitle(entry.sidebarItem.primaryTitle);
  const storedTerminalTitle = getVisibleTerminalTitle(entry.sidebarItem.terminalTitle);

  if (entry.sessionRecord.kind === "t3") {
    return {
      ...entry.sidebarItem,
      primaryTitle: storedPrimaryTitle ?? storedTerminalTitle ?? sessionPrimaryTitle ?? "T3 Code",
      terminalTitle: undefined,
    };
  }

  const preferredTerminalTitle = shouldPreferTerminalTitleForAgentIcon(entry.sidebarItem.agentIcon)
    ? (storedTerminalTitle ??
      (storedPrimaryTitle && storedPrimaryTitle !== sessionPrimaryTitle
        ? storedPrimaryTitle
        : undefined))
    : undefined;

  if (sessionPrimaryTitle) {
    if (preferredTerminalTitle) {
      return {
        ...entry.sidebarItem,
        primaryTitle: preferredTerminalTitle,
        terminalTitle: undefined,
      };
    }

    const fallbackTerminalTitle =
      storedTerminalTitle ??
      (storedPrimaryTitle && storedPrimaryTitle !== sessionPrimaryTitle
        ? storedPrimaryTitle
        : undefined);

    return {
      ...entry.sidebarItem,
      primaryTitle: sessionPrimaryTitle,
      terminalTitle:
        fallbackTerminalTitle && fallbackTerminalTitle !== sessionPrimaryTitle
          ? fallbackTerminalTitle
          : undefined,
    };
  }

  return {
    ...entry.sidebarItem,
    primaryTitle: storedPrimaryTitle ?? storedTerminalTitle,
    terminalTitle: undefined,
  };
}

function shouldExposeHistorySidebarItem(
  entry: PreviousSessionHistoryEntry,
  sidebarItem: SidebarSessionItem,
): boolean {
  if (entry.sessionRecord.kind !== "terminal") {
    return true;
  }

  return Boolean(sidebarItem.primaryTitle?.trim() || sidebarItem.terminalTitle?.trim());
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
    .map((entry) => ({
      ...entry,
      sessionRecord: normalizeSessionRecord(entry.sessionRecord),
    }))
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

function normalizeHistoryLifecycleState(sidebarItem: SidebarSessionItem): SessionLifecycleState {
  const resolvedLifecycleState = getSidebarSessionLifecycleState(sidebarItem);
  if (resolvedLifecycleState === "running" || resolvedLifecycleState === "sleeping") {
    return "done";
  }

  return resolvedLifecycleState;
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
