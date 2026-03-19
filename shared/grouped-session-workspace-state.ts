import {
  DEFAULT_MAIN_GROUP_ID,
  DEFAULT_MAIN_GROUP_TITLE,
  MAX_GROUP_COUNT,
  createDefaultGroupedSessionWorkspaceSnapshot,
  createDefaultSessionGridSnapshot,
  getOrderedSessions,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridSnapshot,
  type SessionGroupRecord,
  type SessionRecord,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "./session-grid-contract";
import {
  createSessionInSnapshot,
  focusSessionInSnapshot,
  normalizeSessionGridSnapshot,
  removeSessionInSnapshot,
  renameSessionAliasInSnapshot,
  setSessionTitleInSnapshot,
  setViewModeInSnapshot,
  setVisibleCountInSnapshot,
  syncSessionOrderInSnapshot,
  toggleFullscreenSessionInSnapshot,
} from "./session-grid-state";

type GroupLocation = {
  group: SessionGroupRecord;
  index: number;
};

export function normalizeGroupedSessionWorkspaceSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot | undefined,
): GroupedSessionWorkspaceSnapshot {
  if (!isGroupedWorkspaceSnapshot(snapshot)) {
    return createDefaultGroupedSessionWorkspaceSnapshot();
  }

  const groups = snapshot.groups
    .filter((group) => isSessionGroupRecord(group))
    .slice(0, MAX_GROUP_COUNT)
    .map((group, index) => normalizeGroup(group, index));

  const normalizedGroups =
    groups.length > 0
      ? groups
      : [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: createDefaultSessionGridSnapshot(),
            title: DEFAULT_MAIN_GROUP_TITLE,
          },
        ];

  const activeGroupId = normalizedGroups.some((group) => group.groupId === snapshot.activeGroupId)
    ? snapshot.activeGroupId
    : normalizedGroups[0].groupId;

  return {
    activeGroupId,
    groups: normalizedGroups,
    nextGroupNumber:
      typeof snapshot.nextGroupNumber === "number" && snapshot.nextGroupNumber > 1
        ? snapshot.nextGroupNumber
        : normalizedGroups.length + 1,
    nextSessionNumber:
      typeof snapshot.nextSessionNumber === "number" && snapshot.nextSessionNumber > 0
        ? snapshot.nextSessionNumber
        : 1,
  };
}

export function getActiveGroup(
  snapshot: GroupedSessionWorkspaceSnapshot,
): SessionGroupRecord | undefined {
  return snapshot.groups.find((group) => group.groupId === snapshot.activeGroupId);
}

export function getGroupById(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
): SessionGroupRecord | undefined {
  return snapshot.groups.find((group) => group.groupId === groupId);
}

export function getGroupForSession(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): SessionGroupRecord | undefined {
  return findGroupContainingSession(snapshot, sessionId)?.group;
}

export function createSessionInWorkspace(snapshot: GroupedSessionWorkspaceSnapshot): {
  session?: SessionRecord;
  snapshot: GroupedSessionWorkspaceSnapshot;
} {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const activeGroup = getActiveGroup(normalizedSnapshot);
  if (!activeGroup) {
    return { snapshot: normalizedSnapshot };
  }

  const result = createSessionInSnapshot(
    activeGroup.snapshot,
    normalizedSnapshot.nextSessionNumber,
  );
  if (!result.session) {
    return { snapshot: normalizedSnapshot };
  }

  return {
    session: result.session,
    snapshot: {
      ...normalizedSnapshot,
      groups: updateGroup(normalizedSnapshot.groups, activeGroup.groupId, result.snapshot),
      nextSessionNumber: normalizedSnapshot.nextSessionNumber + 1,
    },
  };
}

export function focusGroupInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  if (!normalizedSnapshot.groups.some((group) => group.groupId === groupId)) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  return {
    changed: normalizedSnapshot.activeGroupId !== groupId,
    snapshot:
      normalizedSnapshot.activeGroupId === groupId
        ? normalizedSnapshot
        : {
            ...normalizedSnapshot,
            activeGroupId: groupId,
          },
  };
}

export function focusGroupByIndexInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupIndex: number,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const targetGroup = normalizedSnapshot.groups[groupIndex - 1];
  if (!targetGroup) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  return focusGroupInWorkspace(normalizedSnapshot, targetGroup.groupId);
}

export function focusSessionInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const location = findGroupContainingSession(normalizedSnapshot, sessionId);
  if (!location) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const result = focusSessionInSnapshot(location.group.snapshot, sessionId);
  const nextActiveGroupId = location.group.groupId;

  return {
    changed: result.changed || normalizedSnapshot.activeGroupId !== nextActiveGroupId,
    snapshot: {
      ...normalizedSnapshot,
      activeGroupId: nextActiveGroupId,
      groups: updateGroup(normalizedSnapshot.groups, location.group.groupId, result.snapshot),
    },
  };
}

export function renameGroupInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
  title: string,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  let changed = false;
  const groups = normalizedSnapshot.groups.map((group) => {
    if (group.groupId !== groupId || group.title === normalizedTitle) {
      return group;
    }

    changed = true;
    return {
      ...group,
      title: normalizedTitle,
    };
  });

  return {
    changed,
    snapshot: changed
      ? {
          ...normalizedSnapshot,
          groups,
        }
      : normalizedSnapshot,
  };
}

export function renameSessionAliasInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  alias: string,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  return updateOwningGroupSnapshot(snapshot, sessionId, (groupSnapshot) =>
    renameSessionAliasInSnapshot(groupSnapshot, sessionId, alias),
  );
}

export function setSessionTitleInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  title: string,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  return updateOwningGroupSnapshot(snapshot, sessionId, (groupSnapshot) =>
    setSessionTitleInSnapshot(groupSnapshot, sessionId, title),
  );
}

export function removeSessionInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  return updateOwningGroupSnapshot(snapshot, sessionId, (groupSnapshot) =>
    removeSessionInSnapshot(groupSnapshot, sessionId),
  );
}

export function setVisibleCountInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  visibleCount: VisibleSessionCount,
): GroupedSessionWorkspaceSnapshot {
  return updateActiveGroupSnapshot(snapshot, (groupSnapshot) =>
    setVisibleCountInSnapshot(groupSnapshot, visibleCount),
  );
}

export function toggleFullscreenSessionInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
): GroupedSessionWorkspaceSnapshot {
  return updateActiveGroupSnapshot(snapshot, (groupSnapshot) =>
    toggleFullscreenSessionInSnapshot(groupSnapshot),
  );
}

export function setViewModeInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  viewMode: TerminalViewMode,
): GroupedSessionWorkspaceSnapshot {
  return updateActiveGroupSnapshot(snapshot, (groupSnapshot) =>
    setViewModeInSnapshot(groupSnapshot, viewMode),
  );
}

export function syncSessionOrderInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
  sessionIds: readonly string[],
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const group = getGroupById(normalizedSnapshot, groupId);
  if (!group) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const result = syncSessionOrderInSnapshot(group.snapshot, sessionIds);
  return {
    changed: result.changed,
    snapshot: result.changed
      ? {
          ...normalizedSnapshot,
          groups: updateGroup(normalizedSnapshot.groups, groupId, result.snapshot),
        }
      : normalizedSnapshot,
  };
}

export function moveSessionToGroupInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  targetGroupId: string,
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const sourceLocation = findGroupContainingSession(normalizedSnapshot, sessionId);
  const targetGroup = getGroupById(normalizedSnapshot, targetGroupId);
  if (!sourceLocation || !targetGroup || sourceLocation.group.groupId === targetGroupId) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const sessionRecord = getSessionRecord(sourceLocation.group.snapshot, sessionId);
  if (!sessionRecord) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const removedSourceSnapshot = removeSessionInSnapshot(
    sourceLocation.group.snapshot,
    sessionId,
  ).snapshot;
  const appendedTargetSnapshot = appendSessionToGroup(targetGroup.snapshot, sessionRecord);
  const focusedTargetSnapshot = focusSessionInSnapshot(appendedTargetSnapshot, sessionId).snapshot;

  const nextGroups = normalizedSnapshot.groups.map((group) => {
    if (group.groupId === sourceLocation.group.groupId) {
      return {
        ...group,
        snapshot: removedSourceSnapshot,
      };
    }

    if (group.groupId === targetGroupId) {
      return {
        ...group,
        snapshot: focusedTargetSnapshot,
      };
    }

    return group;
  });

  return {
    changed: true,
    snapshot: {
      ...normalizedSnapshot,
      activeGroupId: targetGroupId,
      groups: nextGroups,
    },
  };
}

export function createGroupFromSessionInWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): { changed: boolean; groupId?: string; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  if (normalizedSnapshot.groups.length >= MAX_GROUP_COUNT) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const sourceLocation = findGroupContainingSession(normalizedSnapshot, sessionId);
  if (!sourceLocation) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const sessionRecord = getSessionRecord(sourceLocation.group.snapshot, sessionId);
  if (!sessionRecord) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const removedSourceSnapshot = removeSessionInSnapshot(
    sourceLocation.group.snapshot,
    sessionId,
  ).snapshot;
  const groupId = `group-${normalizedSnapshot.nextGroupNumber}`;
  const groupTitle = `Group ${normalizedSnapshot.nextGroupNumber}`;
  const nextGroupSnapshot = focusSessionInSnapshot(
    appendSessionToGroup(createDefaultSessionGridSnapshot(), sessionRecord),
    sessionId,
  ).snapshot;

  return {
    changed: true,
    groupId,
    snapshot: {
      ...normalizedSnapshot,
      activeGroupId: groupId,
      groups: [
        ...normalizedSnapshot.groups.map((group) =>
          group.groupId === sourceLocation.group.groupId
            ? {
                ...group,
                snapshot: removedSourceSnapshot,
              }
            : group,
        ),
        {
          groupId,
          snapshot: nextGroupSnapshot,
          title: groupTitle,
        },
      ],
      nextGroupNumber: normalizedSnapshot.nextGroupNumber + 1,
    },
  };
}

function appendSessionToGroup(
  snapshot: SessionGridSnapshot,
  sessionRecord: SessionRecord,
): SessionGridSnapshot {
  return normalizeSessionGridSnapshot({
    ...snapshot,
    sessions: [...getOrderedSessions(snapshot), sessionRecord],
  });
}

function updateActiveGroupSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot,
  updater: (groupSnapshot: SessionGridSnapshot) => SessionGridSnapshot,
): GroupedSessionWorkspaceSnapshot {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const activeGroup = getActiveGroup(normalizedSnapshot);
  if (!activeGroup) {
    return normalizedSnapshot;
  }

  return {
    ...normalizedSnapshot,
    groups: updateGroup(
      normalizedSnapshot.groups,
      activeGroup.groupId,
      updater(activeGroup.snapshot),
    ),
  };
}

function updateOwningGroupSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  updater: (groupSnapshot: SessionGridSnapshot) => {
    changed: boolean;
    snapshot: SessionGridSnapshot;
  },
): { changed: boolean; snapshot: GroupedSessionWorkspaceSnapshot } {
  const normalizedSnapshot = normalizeGroupedSessionWorkspaceSnapshot(snapshot);
  const location = findGroupContainingSession(normalizedSnapshot, sessionId);
  if (!location) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const result = updater(location.group.snapshot);
  return {
    changed: result.changed,
    snapshot: result.changed
      ? {
          ...normalizedSnapshot,
          groups: updateGroup(normalizedSnapshot.groups, location.group.groupId, result.snapshot),
        }
      : normalizedSnapshot,
  };
}

function updateGroup(
  groups: readonly SessionGroupRecord[],
  groupId: string,
  snapshot: SessionGridSnapshot,
): SessionGroupRecord[] {
  return groups.map((group) =>
    group.groupId === groupId
      ? {
          ...group,
          snapshot,
        }
      : group,
  );
}

function findGroupContainingSession(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): GroupLocation | undefined {
  for (let index = 0; index < snapshot.groups.length; index += 1) {
    const group = snapshot.groups[index];
    if (group.snapshot.sessions.some((session) => session.sessionId === sessionId)) {
      return { group, index };
    }
  }

  return undefined;
}

function getSessionRecord(
  snapshot: SessionGridSnapshot,
  sessionId: string,
): SessionRecord | undefined {
  return snapshot.sessions.find((session) => session.sessionId === sessionId);
}

function isGroupedWorkspaceSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot | undefined,
): snapshot is GroupedSessionWorkspaceSnapshot {
  return Boolean(
    snapshot && Array.isArray(snapshot.groups) && typeof snapshot.activeGroupId === "string",
  );
}

function isSessionGroupRecord(candidate: unknown): candidate is SessionGroupRecord {
  return Boolean(
    candidate &&
    typeof candidate === "object" &&
    typeof (candidate as SessionGroupRecord).groupId === "string" &&
    typeof (candidate as SessionGroupRecord).title === "string" &&
    typeof (candidate as SessionGroupRecord).snapshot === "object",
  );
}

function normalizeGroup(group: SessionGroupRecord, index: number): SessionGroupRecord {
  return {
    groupId:
      group.groupId.trim().length > 0
        ? group.groupId
        : index === 0
          ? DEFAULT_MAIN_GROUP_ID
          : `group-${index + 1}`,
    snapshot: normalizeSessionGridSnapshot(group.snapshot),
    title:
      group.title.trim().length > 0
        ? group.title.trim()
        : index === 0
          ? DEFAULT_MAIN_GROUP_TITLE
          : `Group ${index + 1}`,
  };
}
