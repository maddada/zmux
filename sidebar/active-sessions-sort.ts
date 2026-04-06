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
  const groupIds = [...workspaceGroupIds].sort((leftGroupId, rightGroupId) => {
    const activityDelta =
      getGroupLastActivityTime(sortedSessionIdsByGroup[leftGroupId] ?? [], sessionsById) -
      getGroupLastActivityTime(sortedSessionIdsByGroup[rightGroupId] ?? [], sessionsById);
    if (activityDelta !== 0) {
      return activityDelta > 0 ? -1 : 1;
    }

    return workspaceGroupIds.indexOf(leftGroupId) - workspaceGroupIds.indexOf(rightGroupId);
  });

  return {
    groupIds,
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

function getGroupLastActivityTime(
  sessionIds: readonly string[],
  sessionsById: Record<string, SidebarSessionItem>,
): number {
  return sessionIds.reduce(
    (latest, sessionId) => Math.max(latest, getSessionLastActivityTime(sessionsById[sessionId])),
    0,
  );
}

function getSessionLastActivityTime(session: SidebarSessionItem | undefined): number {
  if (!session?.lastInteractionAt) {
    return 0;
  }

  const timestamp = Date.parse(session.lastInteractionAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}
