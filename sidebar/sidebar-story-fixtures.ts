import { DEFAULT_COMPLETION_SOUND, getCompletionSoundLabel } from "../shared/completion-sound";
import { createDefaultSidebarAgentButtons } from "../shared/sidebar-agents";
import { createDefaultSidebarCommandButtons } from "../shared/sidebar-commands";
import { createDefaultSidebarGitState } from "../shared/sidebar-git";
import type {
  SidebarHydrateMessage,
  SidebarHudState,
  SidebarTheme,
  TerminalViewMode,
  VisibleSessionCount,
} from "../shared/session-grid-contract";
import {
  clampVisibleSessionCount,
  createDefaultSidebarSectionCollapseState,
  createDefaultSidebarSectionVisibility,
} from "../shared/session-grid-contract";
import { GROUPS_BY_FIXTURE } from "./sidebar-story-fixture-data";
import {
  cloneGroups,
  createStoryPreviousSession,
  getFocusedSessionTitle,
  getVisibleSlotLabels,
} from "./sidebar-story-fixture-helpers";

export type SidebarStoryFixture =
  | "browser-groups"
  | "command-indicator-active"
  | "default"
  | "sort-toggle-demo"
  | "selector-states"
  | "overflow-stress"
  | "empty-groups"
  | "three-groups-stress";

export type SidebarStoryArgs = {
  createSessionOnSidebarDoubleClick: boolean;
  debuggingMode: boolean;
  fixture: SidebarStoryFixture;
  highlightedVisibleCount: VisibleSessionCount;
  isFocusModeActive: boolean;
  renameSessionOnDoubleClick: boolean;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  showLastInteractionTimeOnSessionCards: boolean;
  theme: SidebarTheme;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
};

const PREVIOUS_SESSIONS_BY_FIXTURE: Partial<
  Record<SidebarStoryFixture, SidebarHydrateMessage["previousSessions"]>
> = {
  "sort-toggle-demo": [
    createStoryPreviousSession({
      alias: "recent retrospective",
      detail: "OpenAI Codex",
      historyId: "history-1",
      sessionId: "history-session-1",
      shortcutLabel: "⌘⌥7",
    }),
    createStoryPreviousSession({
      alias: "archived follow-up",
      detail: "Claude Code",
      historyId: "history-2",
      sessionId: "history-session-2",
      shortcutLabel: "⌘⌥8",
    }),
  ],
};

const COMMAND_SESSION_INDICATORS_BY_FIXTURE: Partial<
  Record<SidebarStoryFixture, SidebarHudState["commandSessionIndicators"]>
> = {
  "command-indicator-active": [
    {
      commandId: "dev",
      isActive: true,
      sessionId: "session-1",
      status: "running",
      title: "Dev server",
    },
  ],
};

export function createSidebarStoryMessage(args: SidebarStoryArgs): SidebarHydrateMessage {
  const groups = cloneGroups(GROUPS_BY_FIXTURE[args.fixture]).map((group) => {
    const visibleCount = group.isActive
      ? args.visibleCount
      : clampVisibleSessionCount(Math.max(1, group.sessions.length));

    return {
      ...group,
      isFocusModeActive: group.isActive ? args.isFocusModeActive : false,
      layoutVisibleCount: group.isActive ? args.highlightedVisibleCount : visibleCount,
      viewMode: group.isActive ? args.viewMode : "grid",
      visibleCount,
    };
  });
  const hud: SidebarHudState = {
    activeSessionsSortMode: "manual",
    agentManagerZoomPercent: 100,
    agents: createDefaultSidebarAgentButtons(),
    collapsedSections: createDefaultSidebarSectionCollapseState(),
    commands: createDefaultSidebarCommandButtons(),
    commandSessionIndicators: COMMAND_SESSION_INDICATORS_BY_FIXTURE[args.fixture] ?? [],
    completionBellEnabled: false,
    completionSound: DEFAULT_COMPLETION_SOUND,
    completionSoundLabel: getCompletionSoundLabel(DEFAULT_COMPLETION_SOUND),
    debuggingMode: args.debuggingMode,
    focusedSessionTitle: getFocusedSessionTitle(groups),
    git: createDefaultSidebarGitState(),
    highlightedVisibleCount: args.highlightedVisibleCount,
    isFocusModeActive: args.isFocusModeActive,
    pendingAgentIds: [],
    sectionVisibility: createDefaultSidebarSectionVisibility(),
    createSessionOnSidebarDoubleClick: args.createSessionOnSidebarDoubleClick,
    renameSessionOnDoubleClick: args.renameSessionOnDoubleClick,
    showCloseButtonOnSessionCards: args.showCloseButtonOnSessionCards,
    showHotkeysOnSessionCards: args.showHotkeysOnSessionCards,
    showLastInteractionTimeOnSessionCards: args.showLastInteractionTimeOnSessionCards,
    theme: args.theme,
    viewMode: args.viewMode,
    visibleCount: args.visibleCount,
    visibleSlotLabels: getVisibleSlotLabels(groups),
  };

  return {
    groups,
    hud,
    pinnedPrompts: [],
    previousSessions: (PREVIOUS_SESSIONS_BY_FIXTURE[args.fixture] ?? []).map((session) => ({
      ...session,
    })),
    revision: 1,
    scratchPadContent: "",
    type: "hydrate",
  };
}
