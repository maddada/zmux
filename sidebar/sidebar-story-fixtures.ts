import { DEFAULT_COMPLETION_SOUND, getCompletionSoundLabel } from '../shared/completion-sound';
import { createDefaultSidebarAgentButtons } from '../shared/sidebar-agents';
import { createDefaultSidebarCommandButtons } from '../shared/sidebar-commands';
import { createDefaultSidebarGitState } from '../shared/sidebar-git';
import type {
  SidebarHydrateMessage,
  SidebarHudState,
  SidebarTheme,
  TerminalViewMode,
  VisibleSessionCount,
} from '../shared/session-grid-contract';
import {
  clampVisibleSessionCount,
  createDefaultSidebarSectionCollapseState,
  createDefaultSidebarSectionVisibility,
} from '../shared/session-grid-contract';
import { GROUPS_BY_FIXTURE } from './sidebar-story-fixture-data';
import { cloneGroups, getFocusedSessionTitle, getVisibleSlotLabels } from './sidebar-story-fixture-helpers';

export type SidebarStoryFixture =
  | 'default'
  | 'selector-states'
  | 'overflow-stress'
  | 'empty-groups'
  | 'three-groups-stress';

export type SidebarStoryArgs = {
  debuggingMode: boolean;
  fixture: SidebarStoryFixture;
  highlightedVisibleCount: VisibleSessionCount;
  isFocusModeActive: boolean;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  theme: SidebarTheme;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
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
      viewMode: group.isActive ? args.viewMode : 'grid',
      visibleCount,
    };
  });
  const hud: SidebarHudState = {
    agentManagerZoomPercent: 100,
    agents: createDefaultSidebarAgentButtons(),
    collapsedSections: createDefaultSidebarSectionCollapseState(),
    commands: createDefaultSidebarCommandButtons(),
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
    showCloseButtonOnSessionCards: args.showCloseButtonOnSessionCards,
    showHotkeysOnSessionCards: args.showHotkeysOnSessionCards,
    theme: args.theme,
    viewMode: args.viewMode,
    visibleCount: args.visibleCount,
    visibleSlotLabels: getVisibleSlotLabels(groups),
  };

  return {
    groups,
    hud,
    previousSessions: [],
    revision: 1,
    scratchPadContent: '',
    type: 'hydrate',
  };
}
