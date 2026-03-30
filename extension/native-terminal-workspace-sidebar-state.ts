import {
  getSessionShortcutLabel,
  getSessionGridLayoutVisibleCount,
  getVisiblePrimaryTitle,
  getVisibleSessionNumber,
  getVisibleTerminalTitle,
  getOrderedSessions,
  isBrowserSession,
  isSessionGridFocusModeActive,
  isT3Session,
  type ExtensionToSidebarMessage,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridSnapshot,
  type SessionGroupRecord,
  type SessionRecord,
  type SidebarHydrateMessage,
  type SidebarPreviousSessionItem,
  type SidebarSessionGroup,
  type SidebarSessionStateMessage,
  type SidebarSessionItem,
} from "../shared/session-grid-contract";
import type { SidebarAgentIcon } from "../shared/sidebar-agents";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import {
  createDisconnectedSessionSnapshot,
  getSessionActivityLabel,
} from "./terminal-workspace-helpers";
import type { PreviousSessionHistoryEntry } from "./previous-session-history";
import { BROWSER_SIDEBAR_GROUP_ID } from "./live-browser-tabs";

type SidebarBrowserTab = {
  detail?: string;
  isActive: boolean;
  label: string;
  sessionId: string;
};

type BuildSidebarMessageOptions = {
  activeSnapshot: SessionGridSnapshot;
  browserTabs: readonly SidebarBrowserTab[];
  completionBellEnabled: boolean;
  debuggingMode: boolean;
  getEffectiveSessionActivity: (
    sessionRecord: SessionRecord,
    sessionSnapshot: TerminalSessionSnapshot,
  ) => {
    activity: TerminalAgentStatus;
    agentName: string | undefined;
  };
  getSessionAgentLaunch: (sessionId: string) => PreviousSessionHistoryEntry["agentLaunch"];
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  getT3ActivityState: (sessionRecord: SessionRecord) => {
    activity: TerminalAgentStatus;
    detail?: string;
    isRunning: boolean;
  };
  getTerminalTitle: (sessionId: string) => string | undefined;
  getSidebarAgentIcon: (
    sessionId: string,
    snapshotAgentName: string | undefined,
    derivedAgentName: string | undefined,
  ) => SidebarAgentIcon | undefined;
  hud: SidebarHydrateMessage["hud"];
  platform: "default" | "mac";
  previousSessions: SidebarPreviousSessionItem[];
  revision: number;
  scratchPadContent: string;
  terminalHasLiveProjection: (sessionId: string) => boolean;
  browserHasLiveProjection: (sessionId: string) => boolean;
  type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"];
  workspaceId: string;
  workspaceSnapshot: GroupedSessionWorkspaceSnapshot;
};

type CreatePreviousSessionEntryOptions = Pick<
  BuildSidebarMessageOptions,
  | "browserHasLiveProjection"
  | "debuggingMode"
  | "getEffectiveSessionActivity"
  | "getSessionAgentLaunch"
  | "getSessionSnapshot"
  | "getSidebarAgentIcon"
  | "getT3ActivityState"
  | "getTerminalTitle"
  | "platform"
  | "terminalHasLiveProjection"
  | "workspaceId"
> & {
  group: SessionGroupRecord;
  sessionRecord: SessionRecord;
};

type CreateSidebarSessionItemOptions = Pick<
  BuildSidebarMessageOptions,
  | "browserHasLiveProjection"
  | "debuggingMode"
  | "getEffectiveSessionActivity"
  | "getSessionAgentLaunch"
  | "getSessionSnapshot"
  | "getSidebarAgentIcon"
  | "getT3ActivityState"
  | "getTerminalTitle"
  | "platform"
  | "terminalHasLiveProjection"
  | "workspaceId"
  | "workspaceSnapshot"
> & {
  sessionRecord: SessionRecord;
};

export function buildSidebarMessage(
  options: BuildSidebarMessageOptions,
): ExtensionToSidebarMessage {
  const browserGroup = buildBrowserSidebarGroup(options.browserTabs);
  const workspaceGroups = options.workspaceSnapshot.groups.map((group) =>
    buildSidebarGroup(group, group.snapshot, options),
  );

  return {
    hud: options.hud,
    groups: [browserGroup, ...workspaceGroups],
    previousSessions: options.previousSessions,
    revision: options.revision,
    scratchPadContent: options.scratchPadContent,
    type: options.type,
  };
}

export function createPreviousSessionEntry(
  options: CreatePreviousSessionEntryOptions,
): PreviousSessionHistoryEntry | undefined {
  if (isBrowserSession(options.sessionRecord)) {
    return undefined;
  }

  const sidebarItem = buildSidebarItem(
    options.group,
    options.group.snapshot,
    options.sessionRecord,
    {
      ...options,
      activeGroupId: options.group.groupId,
    },
  );
  const closedAt = new Date().toISOString();
  return {
    agentIcon: options.getSidebarAgentIcon(options.sessionRecord.sessionId, undefined, undefined),
    agentLaunch: options.getSessionAgentLaunch(options.sessionRecord.sessionId),
    closedAt,
    historyId: `${options.sessionRecord.sessionId}:${closedAt}`,
    sessionRecord: options.sessionRecord,
    sidebarItem: {
      ...sidebarItem,
      isFocused: false,
      isRunning: false,
      isVisible: false,
    },
  };
}

export function createSidebarSessionItem(
  options: CreateSidebarSessionItemOptions,
): SidebarSessionItem | undefined {
  const group = options.workspaceSnapshot.groups.find((candidateGroup) =>
    candidateGroup.snapshot.sessions.some(
      (sessionRecord) => sessionRecord.sessionId === options.sessionRecord.sessionId,
    ),
  );
  if (!group) {
    return undefined;
  }

  return buildSidebarItem(group, group.snapshot, options.sessionRecord, {
    ...options,
    activeGroupId: options.workspaceSnapshot.activeGroupId,
  });
}

function buildSidebarGroup(
  group: SessionGroupRecord,
  presentedSnapshot: SessionGridSnapshot,
  options: BuildSidebarMessageOptions,
): SidebarSessionGroup {
  return {
    groupId: group.groupId,
    isActive: options.workspaceSnapshot.activeGroupId === group.groupId,
    isFocusModeActive: isSessionGridFocusModeActive(presentedSnapshot),
    kind: "workspace",
    layoutVisibleCount: getSessionGridLayoutVisibleCount(presentedSnapshot),
    sessions: getOrderedSessions(group.snapshot).map((session) =>
      buildSidebarItem(group, presentedSnapshot, session, {
        ...options,
        activeGroupId: options.workspaceSnapshot.activeGroupId,
      }),
    ),
    title: group.title,
    viewMode: presentedSnapshot.viewMode,
    visibleCount: presentedSnapshot.visibleCount,
  };
}

function buildBrowserSidebarGroup(browserTabs: readonly SidebarBrowserTab[]): SidebarSessionGroup {
  return {
    groupId: BROWSER_SIDEBAR_GROUP_ID,
    isActive: browserTabs.some((tab) => tab.isActive),
    isFocusModeActive: false,
    kind: "browser",
    layoutVisibleCount: 1,
    sessions: browserTabs.map((browserTab) => ({
      activity: "idle",
      activityLabel: undefined,
      agentIcon: "browser",
      alias: browserTab.label,
      column: 0,
      detail: browserTab.detail,
      isFocused: browserTab.isActive,
      isRunning: true,
      isVisible: browserTab.isActive,
      kind: "browser",
      primaryTitle: browserTab.label.trim() || "Browser",
      row: 0,
      sessionId: browserTab.sessionId,
      sessionNumber: undefined,
      shortcutLabel: "",
      terminalTitle: undefined,
    })),
    title: "Browsers",
    viewMode: "grid",
    visibleCount: 1,
  };
}

function buildSidebarItem(
  group: SessionGroupRecord,
  presentedSnapshot: SessionGridSnapshot,
  sessionRecord: SessionRecord,
  options: Pick<
    BuildSidebarMessageOptions,
    | "browserHasLiveProjection"
    | "debuggingMode"
    | "getEffectiveSessionActivity"
    | "getSessionAgentLaunch"
  | "getSessionSnapshot"
  | "getSidebarAgentIcon"
  | "getT3ActivityState"
  | "getTerminalTitle"
  | "platform"
  | "terminalHasLiveProjection"
  | "workspaceId"
  > & { activeGroupId: string },
): SidebarSessionItem {
  const isActiveGroup = options.activeGroupId === group.groupId;
  const isVisible =
    isActiveGroup && presentedSnapshot.visibleSessionIds.includes(sessionRecord.sessionId);
  const isFocused = isActiveGroup && presentedSnapshot.focusedSessionId === sessionRecord.sessionId;
  const visiblePrimaryTitle = getVisibleTerminalTitle(getVisiblePrimaryTitle(sessionRecord.title));
  const visibleTerminalTitle = getVisibleTerminalTitle(options.getTerminalTitle(sessionRecord.sessionId));

  if (isBrowserSession(sessionRecord)) {
    return {
      activity: "idle",
      activityLabel: undefined,
      agentIcon: "browser",
      alias: sessionRecord.alias,
      column: sessionRecord.column,
      detail: sessionRecord.browser.url,
      isFocused,
      isRunning: isVisible || options.browserHasLiveProjection(sessionRecord.sessionId),
      isVisible,
      kind: "workspace",
      primaryTitle: getVisiblePrimaryTitle(sessionRecord.title) ?? "Browser",
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
      sessionNumber: getDebuggingSessionNumber(sessionRecord, options.debuggingMode),
      shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, options.platform),
      terminalTitle: undefined,
    };
  }

  if (isT3Session(sessionRecord)) {
    const activityState = options.getT3ActivityState(sessionRecord);
    return {
      activity: activityState.activity,
      activityLabel: getSessionActivityLabel(activityState.activity, "t3"),
      agentIcon: "t3",
      alias: sessionRecord.alias,
      column: sessionRecord.column,
      detail:
        activityState.detail ??
        (activityState.activity !== "working" &&
        !isPendingT3ThreadId(sessionRecord.t3.threadId) &&
        sessionRecord.t3.threadId.trim()
          ? `Thread ${sessionRecord.t3.threadId.slice(0, 8)}`
          : undefined),
      isFocused,
      isRunning: activityState.isRunning,
      isVisible,
      kind: "workspace",
      primaryTitle: getVisiblePrimaryTitle(sessionRecord.title) ?? "T3 Code",
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
      sessionNumber: getDebuggingSessionNumber(sessionRecord, options.debuggingMode),
      shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, options.platform),
      terminalTitle: undefined,
    };
  }

  const sessionSnapshot =
    options.getSessionSnapshot(sessionRecord.sessionId) ??
    createDisconnectedSessionSnapshot(sessionRecord.sessionId, options.workspaceId);
  const effectiveActivity = options.getEffectiveSessionActivity(sessionRecord, sessionSnapshot);

  return {
    activity: effectiveActivity.activity,
    activityLabel: getSessionActivityLabel(effectiveActivity.activity, effectiveActivity.agentName),
    agentIcon: options.getSidebarAgentIcon(
      sessionRecord.sessionId,
      sessionSnapshot.agentName,
      effectiveActivity.agentName,
    ),
    alias: sessionRecord.alias,
    column: sessionRecord.column,
    detail: sessionSnapshot.errorMessage,
    isFocused,
    isRunning:
      sessionSnapshot.status === "running" &&
      options.terminalHasLiveProjection(sessionRecord.sessionId),
    isVisible,
    kind: "workspace",
    primaryTitle: visiblePrimaryTitle ?? visibleTerminalTitle,
    row: sessionRecord.row,
    sessionId: sessionRecord.sessionId,
    sessionNumber: getDebuggingSessionNumber(sessionRecord, options.debuggingMode),
    shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, options.platform),
    terminalTitle: visiblePrimaryTitle ? visibleTerminalTitle : undefined,
  };
}

function getDebuggingSessionNumber(
  sessionRecord: SessionRecord,
  debuggingMode: boolean,
): string | undefined {
  if (!debuggingMode) {
    return undefined;
  }

  return getVisibleSessionNumber(sessionRecord);
}

function isPendingT3ThreadId(threadId: string): boolean {
  return threadId.startsWith("pending-");
}
