import type {
  SidebarActiveSessionsSortMode,
  SidebarSessionItem,
} from "../shared/session-grid-contract";

type SessionIdsByGroup = Record<string, string[]>;

type CreateDisplaySessionLayoutOptions = {
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

function sortSessionIdsByLastActivity(
  sessionIds: readonly string[],
  sessionsById: Record<string, SidebarSessionItem>,
): string[] {
  return [...sessionIds].sort((leftSessionId, rightSessionId) => {
    const activityDelta =
      getSessionLastActivityTime(sessionsById[rightSessionId]) -
      getSessionLastActivityTime(sessionsById[leftSessionId]);
    if (activityDelta !== 0) {
      return activityDelta;
    }

    return sessionIds.indexOf(leftSessionId) - sessionIds.indexOf(rightSessionId);
  });
}
function getSessionLastActivityTime(session: SidebarSessionItem | undefined): number {
  if (!session?.lastInteractionAt) {
    return 0;
  }

  const timestamp = Date.parse(session.lastInteractionAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}
