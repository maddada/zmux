import type {
  SidebarActiveSessionsSortMode,
  SidebarSessionItem,
} from "./session-grid-contract-sidebar";

export type SessionIdsByGroup = Record<string, string[]>;

export type CreateDisplaySessionLayoutOptions = {
  sessionIdsByGroup: SessionIdsByGroup;
  sessionsById: Record<string, SidebarSessionItem>;
  sortMode: SidebarActiveSessionsSortMode;
  workspaceGroupIds: readonly string[];
};

export function createDisplaySessionLayout({
  sessionIdsByGroup,
  sessionsById,
  sortMode,
  workspaceGroupIds,
}: CreateDisplaySessionLayoutOptions): {
  groupIds: string[];
  sessionIdsByGroup: SessionIdsByGroup;
} {
  const manualSessionIdsByGroup = Object.fromEntries(
    workspaceGroupIds.map((groupId) => [groupId, sessionIdsByGroup[groupId] ?? []]),
  );
  if (sortMode === "manual") {
    return {
      groupIds: [...workspaceGroupIds],
      sessionIdsByGroup: manualSessionIdsByGroup,
    };
  }

  const sortedSessionIdsByGroup = Object.fromEntries(
    workspaceGroupIds.map((groupId) => [
      groupId,
      sortSessionIdsByLastActivity(manualSessionIdsByGroup[groupId] ?? [], sessionsById),
    ]),
  );

  return {
    groupIds: [...workspaceGroupIds],
    sessionIdsByGroup: sortedSessionIdsByGroup,
  };
}

export function getDisplaySessionIdsInOrder(options: CreateDisplaySessionLayoutOptions): string[] {
  const displayLayout = createDisplaySessionLayout(options);
  return displayLayout.groupIds.flatMap(
    (groupId) => displayLayout.sessionIdsByGroup[groupId] ?? [],
  );
}

function sortSessionIdsByLastActivity(
  sessionIds: readonly string[],
  sessionsById: Record<string, SidebarSessionItem>,
): string[] {
  return [...sessionIds].sort((leftSessionId, rightSessionId) => {
    const activityPriorityDelta =
      getSessionActivitySortPriority(sessionsById[rightSessionId]) -
      getSessionActivitySortPriority(sessionsById[leftSessionId]);
    if (activityPriorityDelta !== 0) {
      return activityPriorityDelta;
    }

    const activityDelta =
      getSessionLastActivityTime(sessionsById[rightSessionId]) -
      getSessionLastActivityTime(sessionsById[leftSessionId]);
    if (activityDelta !== 0) {
      return activityDelta;
    }

    return sessionIds.indexOf(leftSessionId) - sessionIds.indexOf(rightSessionId);
  });
}

function getSessionActivitySortPriority(session: SidebarSessionItem | undefined): number {
  switch (session?.activity) {
    case "attention":
      return 2;
    case "working":
      return 1;
    default:
      return 0;
  }
}

function getSessionLastActivityTime(session: SidebarSessionItem | undefined): number {
  if (!session?.lastInteractionAt) {
    return 0;
  }

  const timestamp = Date.parse(session.lastInteractionAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}
