import {
  createSidebarHudState,
  createSidebarSessionItems,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGroupRecord,
  type SessionRecord,
  type SidebarHydrateMessage,
  type SidebarSessionItem,
  type SidebarSessionStateMessage,
  type SidebarToExtensionMessage,
} from "../shared/session-grid-contract";
import {
  createGroupFromSessionInWorkspace,
  focusGroupInWorkspace,
  focusSessionInWorkspace,
  moveSessionToGroupInWorkspace,
  normalizeGroupedSessionWorkspaceSnapshot,
  setViewModeInWorkspace,
  setVisibleCountInWorkspace,
  syncGroupOrderInWorkspace,
  syncSessionOrderInWorkspace,
  toggleFullscreenSessionInWorkspace,
} from "../shared/grouped-session-workspace-state";

type SidebarStoryWorkspaceOptions = {
  completionBellEnabled: boolean;
  completionSound: SidebarHydrateMessage["hud"]["completionSound"];
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  theme: SidebarHydrateMessage["hud"]["theme"];
};

type SidebarSessionDecoration = Pick<
  SidebarSessionItem,
  "activity" | "activityLabel" | "detail" | "isRunning" | "terminalTitle"
>;

export type SidebarStoryWorkspace = {
  options: SidebarStoryWorkspaceOptions;
  sessionDecorationsById: Readonly<Record<string, SidebarSessionDecoration>>;
  snapshot: GroupedSessionWorkspaceSnapshot;
};

export function createSidebarStoryWorkspace(message: SidebarHydrateMessage): SidebarStoryWorkspace {
  return {
    options: {
      completionBellEnabled: message.hud.completionBellEnabled,
      completionSound: message.hud.completionSound,
      showCloseButtonOnSessionCards: message.hud.showCloseButtonOnSessionCards,
      showHotkeysOnSessionCards: message.hud.showHotkeysOnSessionCards,
      theme: message.hud.theme,
    },
    sessionDecorationsById: Object.fromEntries(
      message.groups.flatMap((group) =>
        group.sessions.map((session) => [
          session.sessionId,
          {
            activity: session.activity,
            activityLabel: session.activityLabel,
            detail: session.detail,
            isRunning: session.isRunning,
            terminalTitle: session.terminalTitle,
          },
        ]),
      ),
    ),
    snapshot: normalizeGroupedSessionWorkspaceSnapshot({
      activeGroupId:
        message.groups.find((group) => group.isActive)?.groupId ??
        message.groups[0]?.groupId ??
        "group-1",
      groups: message.groups.map((group) => createSessionGroupRecord(group, message)),
      nextGroupNumber: getNextGroupNumber(message.groups),
      nextSessionNumber: getNextSessionNumber(message.groups),
    }),
  };
}

export function createSidebarStoryMessage(
  workspace: SidebarStoryWorkspace,
  type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
): SidebarHydrateMessage | SidebarSessionStateMessage {
  const activeGroup =
    workspace.snapshot.groups.find((group) => group.groupId === workspace.snapshot.activeGroupId) ??
    workspace.snapshot.groups[0];

  const groups = workspace.snapshot.groups.map((group) => {
    const items = createSidebarSessionItems(group.snapshot, "mac").map((item) => ({
      ...item,
      ...workspace.sessionDecorationsById[item.sessionId],
      activity: workspace.sessionDecorationsById[item.sessionId]?.activity ?? "idle",
      isRunning: workspace.sessionDecorationsById[item.sessionId]?.isRunning ?? true,
      terminalTitle: workspace.sessionDecorationsById[item.sessionId]?.terminalTitle,
    }));

    return {
      groupId: group.groupId,
      isActive: workspace.snapshot.activeGroupId === group.groupId,
      isFocusModeActive:
        group.snapshot.visibleCount === 1 &&
        group.snapshot.fullscreenRestoreVisibleCount !== undefined,
      sessions: items,
      title: group.title,
      viewMode: group.snapshot.viewMode,
      visibleCount: group.snapshot.visibleCount,
    };
  });

  return {
    groups,
    hud: createSidebarHudState(
      activeGroup?.snapshot ?? workspace.snapshot.groups[0]?.snapshot,
      workspace.options.theme,
      workspace.options.showCloseButtonOnSessionCards,
      workspace.options.showHotkeysOnSessionCards,
      workspace.options.completionBellEnabled,
      workspace.options.completionSound,
    ),
    type,
  };
}

export function reduceSidebarStoryWorkspace(
  workspace: SidebarStoryWorkspace,
  message: SidebarToExtensionMessage,
): SidebarStoryWorkspace | undefined {
  switch (message.type) {
    case "moveSessionToGroup": {
      const result = moveSessionToGroupInWorkspace(
        workspace.snapshot,
        message.sessionId,
        message.groupId,
      );
      return result.changed ? { ...workspace, snapshot: result.snapshot } : undefined;
    }

    case "syncSessionOrder": {
      const result = syncSessionOrderInWorkspace(
        workspace.snapshot,
        message.groupId,
        message.sessionIds,
      );
      return result.changed ? { ...workspace, snapshot: result.snapshot } : undefined;
    }

    case "syncGroupOrder": {
      const result = syncGroupOrderInWorkspace(workspace.snapshot, message.groupIds);
      return result.changed ? { ...workspace, snapshot: result.snapshot } : undefined;
    }

    case "focusSession": {
      const result = focusSessionInWorkspace(workspace.snapshot, message.sessionId);
      return result.changed ? { ...workspace, snapshot: result.snapshot } : undefined;
    }

    case "focusGroup": {
      const result = focusGroupInWorkspace(workspace.snapshot, message.groupId);
      return result.changed ? { ...workspace, snapshot: result.snapshot } : undefined;
    }

    case "setVisibleCount":
      return {
        ...workspace,
        snapshot: setVisibleCountInWorkspace(workspace.snapshot, message.visibleCount),
      };

    case "setViewMode":
      return {
        ...workspace,
        snapshot: setViewModeInWorkspace(workspace.snapshot, message.viewMode),
      };

    case "toggleFullscreenSession":
      return {
        ...workspace,
        snapshot: toggleFullscreenSessionInWorkspace(workspace.snapshot),
      };

    case "createGroupFromSession": {
      const result = createGroupFromSessionInWorkspace(workspace.snapshot, message.sessionId);
      return result.changed ? { ...workspace, snapshot: result.snapshot } : undefined;
    }

    default:
      return undefined;
  }
}

function createSessionGroupRecord(
  group: SidebarHydrateMessage["groups"][number],
  message: SidebarHydrateMessage,
): SessionGroupRecord {
  return {
    groupId: group.groupId,
    snapshot: {
      focusedSessionId: group.sessions.find((session) => session.isFocused)?.sessionId,
      fullscreenRestoreVisibleCount:
        group.isFocusModeActive && group.visibleCount === 1
          ? message.hud.highlightedVisibleCount
          : undefined,
      sessions: group.sessions.map((session) => createSessionRecord(session)),
      viewMode: group.viewMode,
      visibleCount: group.visibleCount,
      visibleSessionIds: group.sessions
        .filter((session) => session.isVisible)
        .map((session) => session.sessionId),
    },
    title: group.title,
  };
}

function createSessionRecord(session: SidebarSessionItem): SessionRecord {
  return {
    alias: session.alias,
    column: session.column,
    createdAt: new Date(0).toISOString(),
    row: session.row,
    sessionId: session.sessionId,
    slotIndex: parseShortcutIndex(session.shortcutLabel),
    title: session.primaryTitle ?? session.terminalTitle ?? session.alias,
  };
}

function parseShortcutIndex(shortcutLabel: string): number {
  const matchedIndex = shortcutLabel.match(/(\d+)$/)?.[1];
  const index = matchedIndex ? Number.parseInt(matchedIndex, 10) : Number.NaN;
  return Number.isFinite(index) && index > 0 ? index : 1;
}

function getNextGroupNumber(groups: readonly SidebarHydrateMessage["groups"][number][]): number {
  return (
    Math.max(
      1,
      ...groups.map((group) => {
        const matchedNumber = group.groupId.match(/group-(\d+)$/)?.[1];
        return matchedNumber ? Number.parseInt(matchedNumber, 10) : 1;
      }),
    ) + 1
  );
}

function getNextSessionNumber(groups: readonly SidebarHydrateMessage["groups"][number][]): number {
  return (
    Math.max(
      0,
      ...groups.flatMap((group) =>
        group.sessions.map((session) => {
          const matchedNumber = session.sessionId.match(/session-(\d+)$/)?.[1];
          return matchedNumber ? Number.parseInt(matchedNumber, 10) : 0;
        }),
      ),
    ) + 1
  );
}
