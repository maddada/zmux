import {
  DEFAULT_COMPLETION_SOUND,
  getCompletionSoundLabel,
  type CompletionSoundSetting,
} from "./completion-sound";
import { createDefaultSidebarAgentButtons, type SidebarAgentButton } from "./sidebar-agents";
import { createDefaultSidebarCommandButtons, type SidebarCommandButton } from "./sidebar-commands";
import {
  DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
  type SessionGridSnapshot,
  type SessionRecord,
  type SidebarTheme,
} from "./session-grid-contract-core";
import { createDefaultSidebarGitState, type SidebarGitState } from "./sidebar-git";
import {
  createDefaultSidebarSectionCollapseState,
  createDefaultSidebarSectionVisibility,
  type SidebarActiveSessionsSortMode,
  type SidebarHudState,
  type SidebarSectionCollapseState,
  type SidebarSectionVisibility,
  type SidebarSessionItem,
} from "./session-grid-contract-sidebar";
import {
  getOrderedSessions,
  getSessionGridLayoutVisibleCount,
  getSessionShortcutLabel,
  getSlotLabel,
  getVisiblePrimaryTitle,
  getVisibleSessionNumber,
  isSessionGridFocusModeActive,
} from "./session-grid-contract-session";

export function createSidebarHudState(
  snapshot: SessionGridSnapshot,
  theme: SidebarTheme = "dark-blue",
  agentManagerZoomPercent = DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
  showCloseButtonOnSessionCards = false,
  showHotkeysOnSessionCards = false,
  showLastInteractionTimeOnSessionCards = true,
  debuggingMode = false,
  completionBellEnabled = false,
  completionSound: CompletionSoundSetting = DEFAULT_COMPLETION_SOUND,
  agents: SidebarAgentButton[] = createDefaultSidebarAgentButtons(),
  commands: SidebarCommandButton[] = createDefaultSidebarCommandButtons(),
  pendingAgentIds: string[] = [],
  git: SidebarGitState = createDefaultSidebarGitState(),
  sectionVisibility: SidebarSectionVisibility = createDefaultSidebarSectionVisibility(),
  collapsedSections: SidebarSectionCollapseState = createDefaultSidebarSectionCollapseState(),
  activeSessionsSortMode: SidebarActiveSessionsSortMode = "manual",
  createSessionOnSidebarDoubleClick = false,
): SidebarHudState {
  const sessionById = new Map(snapshot.sessions.map((session) => [session.sessionId, session]));
  const focusedSession = snapshot.focusedSessionId
    ? sessionById.get(snapshot.focusedSessionId)
    : undefined;

  return {
    activeSessionsSortMode,
    agentManagerZoomPercent,
    agents,
    collapsedSections,
    commands,
    completionBellEnabled,
    completionSound,
    completionSoundLabel: getCompletionSoundLabel(completionSound),
    debuggingMode,
    focusedSessionTitle: focusedSession?.title,
    git,
    highlightedVisibleCount: getSessionGridLayoutVisibleCount(snapshot),
    isFocusModeActive: isSessionGridFocusModeActive(snapshot),
    pendingAgentIds,
    sectionVisibility,
    createSessionOnSidebarDoubleClick,
    showCloseButtonOnSessionCards,
    showHotkeysOnSessionCards,
    showLastInteractionTimeOnSessionCards,
    theme,
    viewMode: snapshot.viewMode,
    visibleCount: snapshot.visibleCount,
    visibleSlotLabels: snapshot.visibleSessionIds
      .map((sessionId) => sessionById.get(sessionId))
      .filter((session): session is SessionRecord => session !== undefined)
      .map((session) => getSlotLabel(session.row, session.column)),
  };
}

export function createSidebarSessionItems(
  snapshot: SessionGridSnapshot,
  platform: "default" | "mac" = "default",
): SidebarSessionItem[] {
  const visibleIds = new Set(snapshot.visibleSessionIds);
  return getOrderedSessions(snapshot).map((session) => ({
    activity: "idle",
    activityLabel: undefined,
    agentIcon: undefined,
    alias: session.alias,
    column: session.column,
    detail: undefined,
    isFocused: snapshot.focusedSessionId === session.sessionId,
    isSleeping: session.isSleeping === true,
    isRunning: false,
    isVisible: visibleIds.has(session.sessionId),
    lastInteractionAt: undefined,
    primaryTitle: getVisiblePrimaryTitle(session.title),
    row: session.row,
    sessionId: session.sessionId,
    sessionKind: session.kind,
    sessionNumber: getVisibleSessionNumber(session),
    shortcutLabel: getSessionShortcutLabel(session.slotIndex, platform),
  }));
}
