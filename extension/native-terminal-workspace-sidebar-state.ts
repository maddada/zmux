import {
  createAgentSessionDefaultTitle,
  DEFAULT_TERMINAL_SESSION_TITLE,
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
  type SidebarPinnedPrompt,
  type SidebarPreviousSessionItem,
  type SidebarSessionGroup,
  type SidebarSessionStateMessage,
  type SidebarSessionItem,
} from "../shared/session-grid-contract";
import {
  getSidebarAgentNameByIcon,
  shouldPreferTerminalTitleForAgentIcon,
  type SidebarAgentIcon,
} from "../shared/sidebar-agents";
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
import { getT3SessionBoundThreadId } from "../shared/t3-session-metadata";
import {
  isRunningSessionLifecycleState,
  resolveT3SessionLifecycleState,
  resolveTerminalSessionLifecycleState,
} from "./native-terminal-workspace/session-indicator-state";

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
  getIsFirstPromptAutoRenameInProgress: (sessionId: string) => boolean;
  getIsSessionReloading: (sessionId: string) => boolean;
  getSessionAgentLaunch: (sessionId: string) => PreviousSessionHistoryEntry["agentLaunch"];
  getLastTerminalActivityAt: (sessionId: string) => number | undefined;
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  shouldIncludeSessionInSidebar?: (sessionRecord: SessionRecord) => boolean;
  getT3ActivityState: (sessionRecord: SessionRecord) => {
    activity: TerminalAgentStatus;
    detail?: string;
    isRunning: boolean;
    lastInteractionAt?: string;
  };
  getTerminalTitle: (sessionId: string) => string | undefined;
  getSidebarAgentIcon: (
    sessionId: string,
    snapshotAgentName: string | undefined,
    derivedAgentName: string | undefined,
  ) => SidebarAgentIcon | undefined;
  hud: SidebarHydrateMessage["hud"];
  pinnedPrompts: SidebarPinnedPrompt[];
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
  | "getIsFirstPromptAutoRenameInProgress"
  | "getIsSessionReloading"
  | "getSessionAgentLaunch"
  | "getLastTerminalActivityAt"
  | "getSessionSnapshot"
  | "shouldIncludeSessionInSidebar"
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
  | "getIsFirstPromptAutoRenameInProgress"
  | "getIsSessionReloading"
  | "getSessionAgentLaunch"
  | "getLastTerminalActivityAt"
  | "getSessionSnapshot"
  | "shouldIncludeSessionInSidebar"
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
    pinnedPrompts: options.pinnedPrompts,
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

  const visiblePrimaryTitle = getVisiblePrimaryTitle(options.sessionRecord.title);
  const visibleTerminalTitle = getVisibleTerminalTitle(
    options.getTerminalTitle(options.sessionRecord.sessionId),
  );
  if (options.sessionRecord.kind === "terminal" && !visiblePrimaryTitle && !visibleTerminalTitle) {
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
  if (!sidebarItem) {
    return undefined;
  }
  const closedAt = new Date().toISOString();
  return {
    agentIcon: sidebarItem.agentIcon,
    agentLaunch: options.getSessionAgentLaunch(options.sessionRecord.sessionId),
    closedAt,
    historyId: `${options.sessionRecord.sessionId}:${closedAt}`,
    sessionRecord: options.sessionRecord,
    sidebarItem: {
      ...sidebarItem,
      isFocused: false,
      isSleeping: false,
      lifecycleState: "done",
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
    sessions: getOrderedSessions(group.snapshot)
      .map((session) =>
        buildSidebarItem(group, presentedSnapshot, session, {
          ...options,
          activeGroupId: options.workspaceSnapshot.activeGroupId,
        }),
      )
      .filter((session): session is SidebarSessionItem => session !== undefined),
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
      lifecycleState: "running",
      isFocused: browserTab.isActive,
      isFavorite: false,
      isReloading: false,
      isRunning: true,
      isVisible: browserTab.isActive,
      kind: "browser",
      lastInteractionAt: undefined,
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
    | "getIsFirstPromptAutoRenameInProgress"
    | "getIsSessionReloading"
    | "getSessionAgentLaunch"
    | "getLastTerminalActivityAt"
    | "getSessionSnapshot"
    | "shouldIncludeSessionInSidebar"
    | "getSidebarAgentIcon"
    | "getT3ActivityState"
    | "getTerminalTitle"
    | "platform"
    | "terminalHasLiveProjection"
    | "workspaceId"
  > & { activeGroupId: string },
): SidebarSessionItem | undefined {
  if (
    options.shouldIncludeSessionInSidebar &&
    !options.shouldIncludeSessionInSidebar(sessionRecord)
  ) {
    return undefined;
  }

  const isActiveGroup = options.activeGroupId === group.groupId;
  const isVisible =
    isActiveGroup && presentedSnapshot.visibleSessionIds.includes(sessionRecord.sessionId);
  const isFocused = isActiveGroup && presentedSnapshot.focusedSessionId === sessionRecord.sessionId;
  const isSleeping = sessionRecord.isSleeping === true;
  const visiblePrimaryTitle = getVisibleTerminalTitle(getVisiblePrimaryTitle(sessionRecord.title));

  if (isBrowserSession(sessionRecord)) {
    return {
      activity: "idle",
      activityLabel: undefined,
      agentIcon: "browser",
      alias: sessionRecord.alias,
      column: sessionRecord.column,
      detail: sessionRecord.browser.url,
      lifecycleState: "running",
      isFocused,
      isFavorite: false,
      isReloading: false,
      isSleeping: false,
      isRunning: true,
      isVisible,
      kind: "workspace",
      lastInteractionAt: undefined,
      primaryTitle: getVisiblePrimaryTitle(sessionRecord.title) ?? "Browser",
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
      sessionKind: "browser",
      sessionNumber: getDebuggingSessionNumber(sessionRecord, options.debuggingMode),
      shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, options.platform),
      terminalTitle: undefined,
    };
  }

  if (isT3Session(sessionRecord)) {
    const hasCustomTitle = !isDefaultT3SessionTitle(sessionRecord.title);
    const visibleT3Title = getVisibleTerminalTitle(
      options.getTerminalTitle(sessionRecord.sessionId),
    );
    const activityState = options.getT3ActivityState(sessionRecord);
    const lifecycleState = resolveT3SessionLifecycleState({
      isRunning: activityState.isRunning,
      isSleeping,
    });
    const boundThreadId = getT3SessionBoundThreadId(sessionRecord.t3);
    return {
      activity: isSleeping ? "idle" : activityState.activity,
      activityLabel: isSleeping ? undefined : getSessionActivityLabel(activityState.activity, "t3"),
      agentIcon: "t3",
      alias: sessionRecord.alias,
      column: sessionRecord.column,
      detail: isSleeping
        ? "Sleeping"
        : (activityState.detail ??
          (activityState.activity !== "working" &&
          !isPendingT3ThreadId(boundThreadId) &&
          boundThreadId.trim()
            ? `Thread ${boundThreadId.slice(0, 8)}`
            : undefined)),
      lifecycleState,
      isFocused,
      isFavorite: sessionRecord.isFavorite === true,
      isReloading: options.getIsSessionReloading(sessionRecord.sessionId),
      isSleeping,
      isRunning: isRunningSessionLifecycleState(lifecycleState),
      isVisible,
      kind: "workspace",
      lastInteractionAt: activityState.lastInteractionAt ?? sessionRecord.createdAt,
      primaryTitle:
        (hasCustomTitle ? visiblePrimaryTitle : undefined) ?? visibleT3Title ?? "T3 Code",
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
      sessionKind: "t3",
      sessionNumber: getDebuggingSessionNumber(sessionRecord, options.debuggingMode),
      shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, options.platform),
      terminalTitle: hasCustomTitle ? visibleT3Title : undefined,
    };
  }

  const sessionSnapshot =
    options.getSessionSnapshot(sessionRecord.sessionId) ??
    createDisconnectedSessionSnapshot(sessionRecord.sessionId, options.workspaceId);
  const visibleTerminalTitle = getVisibleTerminalTitle(
    options.getTerminalTitle(sessionRecord.sessionId) ?? sessionSnapshot.title,
  );
  const effectiveActivity = options.getEffectiveSessionActivity(sessionRecord, sessionSnapshot);
  const agentIcon = options.getSidebarAgentIcon(
    sessionRecord.sessionId,
    sessionSnapshot.agentName,
    effectiveActivity.agentName,
  );
  const shouldPreferTerminalTitle =
    Boolean(visibleTerminalTitle) &&
    (shouldPreferTerminalTitleForAgentIcon(agentIcon) ||
      isDefaultCreatedSessionTitle(visiblePrimaryTitle, agentIcon));
  const lifecycleState = resolveTerminalSessionLifecycleState({
    hasLiveRuntime:
      sessionSnapshot.status === "running" &&
      options.terminalHasLiveProjection(sessionRecord.sessionId),
    isSleeping,
    status: sessionSnapshot.status,
  });
  const isGeneratingFirstPromptTitle =
    agentIcon === "codex" && options.getIsFirstPromptAutoRenameInProgress(sessionRecord.sessionId);

  return {
    activity: isSleeping ? "idle" : effectiveActivity.activity,
    activityLabel: isSleeping
      ? undefined
      : getSessionActivityLabel(effectiveActivity.activity, effectiveActivity.agentName),
    agentIcon,
    alias: sessionRecord.alias,
    column: sessionRecord.column,
    detail: isSleeping ? "Sleeping" : sessionSnapshot.errorMessage,
    isGeneratingFirstPromptTitle,
    lifecycleState,
    isFocused,
    isFavorite: sessionRecord.isFavorite === true,
    isReloading: options.getIsSessionReloading(sessionRecord.sessionId),
    isSleeping,
    isRunning: isRunningSessionLifecycleState(lifecycleState),
    isVisible,
    isPrimaryTitleTerminalTitle:
      Boolean(visibleTerminalTitle) && (!visiblePrimaryTitle || shouldPreferTerminalTitle),
    kind: "workspace",
    lastInteractionAt:
      getIsoTimestampFromMs(options.getLastTerminalActivityAt(sessionRecord.sessionId)) ??
      sessionRecord.createdAt,
    primaryTitle: shouldPreferTerminalTitle
      ? visibleTerminalTitle
      : (visiblePrimaryTitle ?? visibleTerminalTitle),
    row: sessionRecord.row,
    sessionId: sessionRecord.sessionId,
    sessionKind: "terminal",
    sessionNumber: getDebuggingSessionNumber(sessionRecord, options.debuggingMode),
    shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, options.platform),
    terminalTitle: shouldPreferTerminalTitle
      ? undefined
      : visiblePrimaryTitle
        ? visibleTerminalTitle
        : undefined,
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

function isDefaultCreatedSessionTitle(
  title: string | undefined,
  agentIcon: SidebarAgentIcon | undefined,
): boolean {
  return (
    title === DEFAULT_TERMINAL_SESSION_TITLE ||
    title === createAgentSessionDefaultTitle(getSidebarAgentNameByIcon(agentIcon))
  );
}

function isPendingT3ThreadId(threadId: string): boolean {
  return threadId.startsWith("pending-");
}

function isDefaultT3SessionTitle(title: string): boolean {
  return title.trim() === "" || title.trim().toLowerCase() === "t3 code";
}

function getIsoTimestampFromMs(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return new Date(value).toISOString();
}
