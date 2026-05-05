import { create } from "zustand";
import { createDefaultSidebarAgentButtons } from "../shared/sidebar-agents";
import { createDefaultSidebarCommandButtons } from "../shared/sidebar-commands";
import { DEFAULT_COMPLETION_SOUND, getCompletionSoundLabel } from "../shared/completion-sound";
import { DEFAULT_zmux_SETTINGS } from "../shared/zmux-settings";
import { createDefaultSidebarGitState } from "../shared/sidebar-git";
import {
  createDefaultSidebarSectionCollapseState,
  createDefaultSidebarSectionVisibility,
} from "../shared/session-grid-contract";
import type {
  SidebarCollapsibleSection,
  SidebarCommandRunStateClearedMessage,
  SidebarCommandRunStateChangedMessage,
  SidebarDaemonSessionsStateMessage,
  SidebarHydrateMessage,
  SidebarHudState,
  SidebarOrderSyncResultMessage,
  SidebarPinnedPrompt,
  SidebarPreviousSessionItem,
  SidebarPromptGitCommitMessage,
  SidebarSessionGroup,
  SidebarSessionItem,
  SidebarSessionPresentationChangedMessage,
  SidebarSessionStateMessage,
} from "../shared/session-grid-contract";
import {
  applySidebarCommandRunStateChangedMessage,
  reconcileSidebarCommandRunFeedbackStates,
  type SidebarCommandRunFeedbackState,
} from "./command-run-feedback";

export type SidebarGroupRecord = Omit<SidebarSessionGroup, "sessions">;

type SidebarStoreDataState = {
  browserGroupIds: string[];
  commandRunStates: Record<string, SidebarCommandRunFeedbackState>;
  daemonSessionsState: SidebarDaemonSessionsStateMessage | undefined;
  gitCommitDraft: SidebarPromptGitCommitMessage | undefined;
  groupOrder: string[];
  groupsById: Record<string, SidebarGroupRecord>;
  hud: SidebarHudState;
  latestAgentOrderSyncResult: SidebarOrderSyncResultMessage | undefined;
  latestCommandOrderSyncResult: SidebarOrderSyncResultMessage | undefined;
  pendingFocusedSessionId: string | undefined;
  pinnedPrompts: SidebarPinnedPrompt[];
  previousSessions: SidebarPreviousSessionItem[];
  revision: number;
  scratchPadContent: string;
  sectionCollapseOverrides: Partial<Record<SidebarCollapsibleSection, boolean>>;
  sessionIdsByGroup: Record<string, string[]>;
  sessionsById: Record<string, SidebarSessionItem>;
  workspaceGroupIds: string[];
};

type SidebarStoreActions = {
  applyCommandRunStateClearedMessage: (message: SidebarCommandRunStateClearedMessage) => void;
  applyCommandRunStateMessage: (message: SidebarCommandRunStateChangedMessage) => void;
  applyOrderSyncResultMessage: (message: SidebarOrderSyncResultMessage) => void;
  applyLocalFocus: (groupId: string, sessionId: string) => void;
  applySessionPresentationMessage: (message: SidebarSessionPresentationChangedMessage) => void;
  applySidebarMessage: (message: SidebarHydrateMessage | SidebarSessionStateMessage) => void;
  clearCommandRunState: (commandId: string) => void;
  reset: () => void;
  setDaemonSessionsState: (message: SidebarDaemonSessionsStateMessage | undefined) => void;
  setGitCommitDraft: (message: SidebarPromptGitCommitMessage | undefined) => void;
  setSectionCollapsed: (section: SidebarCollapsibleSection, collapsed: boolean) => void;
};

export type SidebarStoreState = SidebarStoreDataState & SidebarStoreActions;

export function createInitialSidebarStoreDataState(): SidebarStoreDataState {
  return {
    browserGroupIds: [],
    commandRunStates: {},
    daemonSessionsState: undefined,
    gitCommitDraft: undefined,
    groupOrder: [],
    groupsById: {},
    hud: {
      /**
       * CDXC:SidebarSessions 2026-04-28-05:18
       * The client store must match the shared/native default so sidebar
       * sessions start sorted by last activity before the first hydrate message.
       */
      activeSessionsSortMode: "lastActivity",
      agentManagerZoomPercent: 100,
      agents: createDefaultSidebarAgentButtons(),
      collapsedSections: createDefaultSidebarSectionCollapseState(),
      commands: createDefaultSidebarCommandButtons(),
      commandSessionIndicators: [],
      completionBellEnabled: false,
      completionSound: DEFAULT_COMPLETION_SOUND,
      completionSoundLabel: getCompletionSoundLabel(DEFAULT_COMPLETION_SOUND),
      customThemeColor: undefined,
      debuggingMode: false,
      focusedSessionTitle: undefined,
      git: createDefaultSidebarGitState(),
      highlightedVisibleCount: 1,
      isFocusModeActive: false,
      pendingAgentIds: [],
      recentProjects: [],
      sectionVisibility: createDefaultSidebarSectionVisibility(),
      settings: DEFAULT_zmux_SETTINGS,
      createSessionOnSidebarDoubleClick: false,
      renameSessionOnDoubleClick: false,
      showCloseButtonOnSessionCards: false,
      showHotkeysOnSessionCards: false,
      showLastInteractionTimeOnSessionCards: false,
      theme: getInitialSidebarTheme(),
      viewMode: "grid",
      visibleCount: 1,
      visibleSlotLabels: [],
    },
    latestAgentOrderSyncResult: undefined,
    latestCommandOrderSyncResult: undefined,
    pendingFocusedSessionId: undefined,
    pinnedPrompts: [],
    previousSessions: [],
    revision: 0,
    scratchPadContent: "",
    sectionCollapseOverrides: {},
    sessionIdsByGroup: {},
    sessionsById: {},
    workspaceGroupIds: [],
  };
}

export const useSidebarStore = create<SidebarStoreState>((set) => ({
  ...createInitialSidebarStoreDataState(),
  applyCommandRunStateClearedMessage: (message) => {
    set((state) => {
      if (!(message.commandId in state.commandRunStates)) {
        return state;
      }

      const nextCommandRunStates = { ...state.commandRunStates };
      delete nextCommandRunStates[message.commandId];
      return {
        commandRunStates: nextCommandRunStates,
      };
    });
  },
  applyCommandRunStateMessage: (message) => {
    set((state) => {
      const nextCommandRunState = applySidebarCommandRunStateChangedMessage(
        state.commandRunStates[message.commandId],
        message,
      );
      if (state.commandRunStates[message.commandId] === nextCommandRunState) {
        return state;
      }

      return {
        commandRunStates: {
          ...state.commandRunStates,
          [message.commandId]: nextCommandRunState,
        },
      };
    });
  },
  applyOrderSyncResultMessage: (message) => {
    set({
      latestAgentOrderSyncResult: message.kind === "agent" ? message : undefined,
      latestCommandOrderSyncResult: message.kind === "command" ? message : undefined,
    });
  },
  applyLocalFocus: (groupId, sessionId) => {
    set((state) => applyLocalFocusState(state, groupId, sessionId));
  },
  applySessionPresentationMessage: (message) => {
    set((state) => applySessionPresentationMessageState(state, message));
  },
  applySidebarMessage: (message) => {
    set((state) => applySidebarMessageState(state, message));
  },
  clearCommandRunState: (commandId) => {
    set((state) => {
      if (!(commandId in state.commandRunStates)) {
        return state;
      }

      const nextCommandRunStates = { ...state.commandRunStates };
      delete nextCommandRunStates[commandId];
      return {
        commandRunStates: nextCommandRunStates,
      };
    });
  },
  reset: () => {
    set(createInitialSidebarStoreDataState());
  },
  setDaemonSessionsState: (message) => {
    set({ daemonSessionsState: message });
  },
  setGitCommitDraft: (message) => {
    set({ gitCommitDraft: message });
  },
  setSectionCollapsed: (section, collapsed) => {
    set((state) => {
      if (
        state.hud.collapsedSections[section] === collapsed &&
        state.sectionCollapseOverrides[section] === collapsed
      ) {
        return state;
      }

      return {
        hud: {
          ...state.hud,
          collapsedSections: {
            ...state.hud.collapsedSections,
            [section]: collapsed,
          },
        },
        sectionCollapseOverrides:
          state.sectionCollapseOverrides[section] === collapsed
            ? state.sectionCollapseOverrides
            : {
                ...state.sectionCollapseOverrides,
                [section]: collapsed,
              },
      };
    });
  },
}));

export function resetSidebarStore() {
  useSidebarStore.getState().reset();
}

function getInitialSidebarTheme(): SidebarHudState["theme"] {
  if (typeof document === "undefined") {
    return "dark-blue";
  }

  return document.body.classList.contains("vscode-light") ||
    document.body.classList.contains("vscode-high-contrast-light")
    ? "light-blue"
    : "dark-blue";
}

function applySidebarMessageState(
  state: SidebarStoreState,
  message: SidebarHydrateMessage | SidebarSessionStateMessage,
): Partial<SidebarStoreState> | SidebarStoreState {
  if (message.revision < state.revision) {
    return state;
  }

  const reconciledGroups = reconcilePendingFocusedSession(
    message.groups,
    state.pendingFocusedSessionId,
  );
  const normalizedGroups = normalizeSidebarGroups(state, reconciledGroups.groups);
  const { collapsedSections, sectionCollapseOverrides } = reconcileSectionCollapseState(
    message.hud.collapsedSections,
    state.sectionCollapseOverrides,
  );

  return {
    browserGroupIds: normalizedGroups.browserGroupIds,
    commandRunStates: reconcileSidebarCommandRunFeedbackStates(
      state.commandRunStates,
      message.hud.commands.map((command) => command.commandId),
    ),
    groupOrder: normalizedGroups.groupOrder,
    groupsById: normalizedGroups.groupsById,
    hud: {
      ...message.hud,
      collapsedSections,
      recentProjects: message.hud.recentProjects ?? [],
    },
    pendingFocusedSessionId: reconciledGroups.pendingFocusedSessionId,
    pinnedPrompts: message.pinnedPrompts,
    previousSessions: message.previousSessions,
    revision: message.revision,
    scratchPadContent: message.scratchPadContent,
    sectionCollapseOverrides,
    sessionIdsByGroup: normalizedGroups.sessionIdsByGroup,
    sessionsById: normalizedGroups.sessionsById,
    workspaceGroupIds: normalizedGroups.workspaceGroupIds,
  };
}

function applySessionPresentationMessageState(
  state: SidebarStoreState,
  message: SidebarSessionPresentationChangedMessage,
): Partial<SidebarStoreState> | SidebarStoreState {
  const currentSession = state.sessionsById[message.session.sessionId];
  if (!currentSession || haveSameSidebarSessionItem(currentSession, message.session)) {
    return state;
  }

  return {
    sessionsById: {
      ...state.sessionsById,
      [message.session.sessionId]: message.session,
    },
  };
}

function applyLocalFocusState(
  state: SidebarStoreState,
  groupId: string,
  sessionId: string,
): Partial<SidebarStoreState> | SidebarStoreState {
  if (!state.groupsById[groupId] || !state.sessionsById[sessionId]) {
    return state;
  }

  let groupsById = state.groupsById;
  let sessionsById = state.sessionsById;

  for (const candidateGroupId of state.groupOrder) {
    const group = state.groupsById[candidateGroupId];
    if (!group) {
      continue;
    }

    const isActiveGroup = candidateGroupId === groupId;
    if (group.isActive !== isActiveGroup) {
      if (groupsById === state.groupsById) {
        groupsById = { ...state.groupsById };
      }
      groupsById[candidateGroupId] = {
        ...group,
        isActive: isActiveGroup,
      };
    }

    for (const candidateSessionId of state.sessionIdsByGroup[candidateGroupId] ?? []) {
      const session = state.sessionsById[candidateSessionId];
      if (!session) {
        continue;
      }

      const isFocused = isActiveGroup && candidateSessionId === sessionId;
      const isVisible =
        group.kind !== "browser" && isActiveGroup && candidateSessionId === sessionId
          ? true
          : session.isVisible;
      if (session.isFocused === isFocused && session.isVisible === isVisible) {
        continue;
      }

      if (sessionsById === state.sessionsById) {
        sessionsById = { ...state.sessionsById };
      }
      sessionsById[candidateSessionId] = {
        ...session,
        isFocused,
        isVisible,
      };
    }
  }

  if (
    groupsById === state.groupsById &&
    sessionsById === state.sessionsById &&
    state.pendingFocusedSessionId === sessionId
  ) {
    return state;
  }

  return {
    groupsById,
    pendingFocusedSessionId: sessionId,
    sessionsById,
  };
}

function normalizeSidebarGroups(
  previousState: Pick<
    SidebarStoreDataState,
    | "browserGroupIds"
    | "groupOrder"
    | "groupsById"
    | "sessionIdsByGroup"
    | "sessionsById"
    | "workspaceGroupIds"
  >,
  groups: readonly SidebarSessionGroup[],
) {
  const nextGroupOrder = groups.map((group) => group.groupId);
  const nextBrowserGroupIds: string[] = [];
  const nextWorkspaceGroupIds: string[] = [];
  const nextGroupsById: Record<string, SidebarGroupRecord> = {};
  const nextSessionIdsByGroup: Record<string, string[]> = {};
  const nextSessionsById: Record<string, SidebarSessionItem> = {};

  for (const group of groups) {
    const groupSessions = group.sessions ?? [];

    if (group.kind === "browser") {
      nextBrowserGroupIds.push(group.groupId);
    } else {
      nextWorkspaceGroupIds.push(group.groupId);
    }

    const previousGroup = previousState.groupsById[group.groupId];
    const nextGroup = toSidebarGroupRecord(group);
    nextGroupsById[group.groupId] =
      previousGroup && haveSameSidebarGroupRecord(previousGroup, nextGroup)
        ? previousGroup
        : nextGroup;

    const nextSessionIds = groupSessions.map((session) => session.sessionId);
    const previousSessionIds = previousState.sessionIdsByGroup[group.groupId];
    nextSessionIdsByGroup[group.groupId] =
      previousSessionIds && haveSameStringArray(previousSessionIds, nextSessionIds)
        ? previousSessionIds
        : nextSessionIds;

    for (const session of groupSessions) {
      const previousSession = previousState.sessionsById[session.sessionId];
      nextSessionsById[session.sessionId] =
        previousSession && haveSameSidebarSessionItem(previousSession, session)
          ? previousSession
          : session;
    }
  }

  return {
    browserGroupIds: haveSameStringArray(previousState.browserGroupIds, nextBrowserGroupIds)
      ? previousState.browserGroupIds
      : nextBrowserGroupIds,
    groupOrder: haveSameStringArray(previousState.groupOrder, nextGroupOrder)
      ? previousState.groupOrder
      : nextGroupOrder,
    groupsById: nextGroupsById,
    sessionIdsByGroup: nextSessionIdsByGroup,
    sessionsById: nextSessionsById,
    workspaceGroupIds: haveSameStringArray(previousState.workspaceGroupIds, nextWorkspaceGroupIds)
      ? previousState.workspaceGroupIds
      : nextWorkspaceGroupIds,
  };
}

function reconcilePendingFocusedSession(
  groups: readonly SidebarSessionGroup[],
  pendingFocusedSessionId: string | undefined,
): {
  groups: SidebarSessionGroup[];
  pendingFocusedSessionId: string | undefined;
} {
  if (!pendingFocusedSessionId) {
    return {
      groups: [...groups],
      pendingFocusedSessionId: undefined,
    };
  }

  const containingGroup = groups.find((group) =>
    (group.sessions ?? []).some((session) => session.sessionId === pendingFocusedSessionId),
  );
  if (!containingGroup) {
    return {
      groups: [...groups],
      pendingFocusedSessionId: undefined,
    };
  }

  const isConfirmed = (containingGroup.sessions ?? []).some(
    (session) => session.sessionId === pendingFocusedSessionId && session.isFocused,
  );
  if (isConfirmed) {
    return {
      groups: [...groups],
      pendingFocusedSessionId: undefined,
    };
  }

  return {
    groups: groups.map((group) => {
      const isActiveGroup = group.groupId === containingGroup.groupId;
      return {
        ...group,
        isActive: isActiveGroup,
        sessions: (group.sessions ?? []).map((session) => ({
          ...session,
          isFocused: isActiveGroup && session.sessionId === pendingFocusedSessionId,
          isVisible:
            group.kind !== "browser" &&
            isActiveGroup &&
            session.sessionId === pendingFocusedSessionId
              ? true
              : session.isVisible,
        })),
      };
    }),
    pendingFocusedSessionId,
  };
}

function reconcileSectionCollapseState(
  persistedCollapsedSections: SidebarHudState["collapsedSections"],
  sectionCollapseOverrides: Partial<Record<SidebarCollapsibleSection, boolean>>,
): {
  collapsedSections: SidebarHudState["collapsedSections"];
  sectionCollapseOverrides: Partial<Record<SidebarCollapsibleSection, boolean>>;
} {
  let nextOverrides = sectionCollapseOverrides;
  let hasClonedOverrides = false;
  const nextCollapsedSections = { ...persistedCollapsedSections };

  for (const section of ["actions", "agents"] as const) {
    const override = sectionCollapseOverrides[section];
    if (override === undefined) {
      continue;
    }

    if (persistedCollapsedSections[section] === override) {
      if (!hasClonedOverrides) {
        nextOverrides = { ...sectionCollapseOverrides };
        hasClonedOverrides = true;
      }
      delete nextOverrides[section];
      continue;
    }

    nextCollapsedSections[section] = override;
  }

  return {
    collapsedSections: nextCollapsedSections,
    sectionCollapseOverrides: nextOverrides,
  };
}

function toSidebarGroupRecord(group: SidebarSessionGroup): SidebarGroupRecord {
  return {
    groupId: group.groupId,
    isActive: group.isActive,
    /**
     * CDXC:Chats 2026-05-05-18:37
     * The synthetic Chats group must keep its explicit collection marker after
     * store normalization. Without this flag, the header icon falls through to
     * project folder icons when Chats is expanded or collapsed.
     */
    isChatCollection: group.isChatCollection,
    isFocusModeActive: group.isFocusModeActive,
    kind: group.kind,
    layoutVisibleCount: group.layoutVisibleCount,
    projectContext: group.projectContext,
    title: group.title,
    viewMode: group.viewMode,
    visibleCount: group.visibleCount,
  };
}

function haveSameSidebarGroupRecord(left: SidebarGroupRecord, right: SidebarGroupRecord): boolean {
  return (
    left.groupId === right.groupId &&
    left.isActive === right.isActive &&
    left.isChatCollection === right.isChatCollection &&
    left.isFocusModeActive === right.isFocusModeActive &&
    left.kind === right.kind &&
    left.layoutVisibleCount === right.layoutVisibleCount &&
    haveSameSidebarProjectContext(left.projectContext, right.projectContext) &&
    left.title === right.title &&
    left.viewMode === right.viewMode &&
    left.visibleCount === right.visibleCount
  );
}

function haveSameSidebarProjectContext(
  left: SidebarGroupRecord["projectContext"],
  right: SidebarGroupRecord["projectContext"],
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return left.canRemoveProject === right.canRemoveProject && left.theme === right.theme;
}

function haveSameSidebarSessionItem(left: SidebarSessionItem, right: SidebarSessionItem): boolean {
  return (
    left.activity === right.activity &&
    left.activityLabel === right.activityLabel &&
    left.agentIcon === right.agentIcon &&
    left.alias === right.alias &&
    left.column === right.column &&
    left.detail === right.detail &&
    left.faviconDataUrl === right.faviconDataUrl &&
    left.isGeneratingFirstPromptTitle === right.isGeneratingFirstPromptTitle &&
    left.isReloading === right.isReloading &&
    left.lifecycleState === right.lifecycleState &&
    left.isFocused === right.isFocused &&
    left.isFavorite === right.isFavorite &&
    left.isSleeping === right.isSleeping &&
    left.isRunning === right.isRunning &&
    left.isVisible === right.isVisible &&
    left.isPrimaryTitleTerminalTitle === right.isPrimaryTitleTerminalTitle &&
    left.kind === right.kind &&
    left.lastInteractionAt === right.lastInteractionAt &&
    left.primaryTitle === right.primaryTitle &&
    left.row === right.row &&
    left.sessionId === right.sessionId &&
    left.sessionKind === right.sessionKind &&
    left.sessionNumber === right.sessionNumber &&
    left.shortcutLabel === right.shortcutLabel &&
    left.terminalTitle === right.terminalTitle
  );
}

function haveSameStringArray(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
