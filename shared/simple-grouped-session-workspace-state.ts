import {
  clampVisibleSessionCount,
  DEFAULT_MAIN_GROUP_ID,
  DEFAULT_MAIN_GROUP_TITLE,
  MAX_GROUP_COUNT,
  createDefaultGroupedSessionWorkspaceSnapshot,
  createDefaultSessionGridSnapshot,
  createSessionRecord,
  formatSessionDisplayId,
  getOrderedSessions,
  getSessionNumberFromSessionId,
  getSlotPosition,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGroupRecord,
  type SessionRecord,
  type T3SessionMetadata,
  type TerminalViewMode,
  type VisibleSessionCount,
  type CreateSessionRecordOptions,
} from "./session-grid-contract";
import {
  claimNextSessionDisplayId,
  normalizeWorkspaceSessionDisplayIds,
} from "./grouped-session-workspace-state-helpers";

type WorkspaceMutationResult = {
  changed: boolean;
  snapshot: GroupedSessionWorkspaceSnapshot;
};

type CreateSessionResult = {
  session?: SessionRecord;
  snapshot: GroupedSessionWorkspaceSnapshot;
};

type CreateGroupResult = WorkspaceMutationResult & {
  groupId?: string;
};

export function normalizeSimpleGroupedSessionWorkspaceSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot | undefined,
): GroupedSessionWorkspaceSnapshot {
  const baseSnapshot = snapshot ?? createDefaultGroupedSessionWorkspaceSnapshot();
  const preparedGroups = baseSnapshot.groups.map((group, index) =>
    prepareGroupForDisplayIdNormalization(group, index),
  );
  const groups =
    preparedGroups.length > 0
      ? preparedGroups
      : [createEmptyGroup(DEFAULT_MAIN_GROUP_ID, DEFAULT_MAIN_GROUP_TITLE)];
  const displayIdNormalization = normalizeWorkspaceSessionDisplayIds(groups);
  const normalizedGroups = displayIdNormalization.groups.map((group, index) => normalizeGroup(group, index));
  const activeGroupId = normalizedGroups.some((group) => group.groupId === baseSnapshot.activeGroupId)
    ? baseSnapshot.activeGroupId
    : normalizedGroups[0]!.groupId;

  return {
    activeGroupId,
    groups: normalizedGroups,
    nextGroupNumber: Math.max(
      2,
      baseSnapshot.nextGroupNumber,
      getNextGroupNumber(normalizedGroups),
    ),
    nextSessionDisplayId: Math.max(
      0,
      displayIdNormalization.nextSessionDisplayId,
    ),
    nextSessionNumber: Math.max(
      1,
      baseSnapshot.nextSessionNumber,
      getNextSessionNumber(normalizedGroups),
    ),
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
  return snapshot.groups.find((group) =>
    group.snapshot.sessions.some((session) => session.sessionId === sessionId),
  );
}

export function createSessionInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  options?: CreateSessionRecordOptions,
): CreateSessionResult {
  const normalizedSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot(snapshot);
  const activeGroup = getActiveGroup(normalizedSnapshot);
  if (!activeGroup) {
    return { snapshot: normalizedSnapshot };
  }

  const nextDisplayId = claimNextSessionDisplayId(normalizedSnapshot);
  const nextSession = createSessionRecord(
    normalizedSnapshot.nextSessionNumber,
    activeGroup.snapshot.sessions.length,
    {
      ...(options ?? {}),
      displayId: nextDisplayId.displayId,
    } as CreateSessionRecordOptions & { displayId: string },
  );
  const nextSessionRecord = withCanonicalSessionId(nextSession);
  const nextSnapshot = updateGroup(normalizedSnapshot, activeGroup.groupId, (group) => {
    const nextGroup = {
      ...group,
      snapshot: normalizeGroupSnapshot({
        ...group.snapshot,
        focusedSessionId: nextSessionRecord.sessionId,
        sessions: [...group.snapshot.sessions, nextSessionRecord],
        visibleSessionIds: getNormalizedVisibleIds(
          [...group.snapshot.sessions, nextSessionRecord],
          group.snapshot.visibleCount,
          nextSessionRecord.sessionId,
          [...group.snapshot.visibleSessionIds, nextSessionRecord.sessionId],
        ),
      }),
    };
    return nextGroup;
  });

  return {
    session: nextSessionRecord,
    snapshot: {
      ...nextSnapshot,
      nextSessionDisplayId: nextDisplayId.nextSessionDisplayId,
      nextSessionNumber: normalizedSnapshot.nextSessionNumber + 1,
    },
  };
}

export function focusGroupInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
): WorkspaceMutationResult {
  if (!snapshot.groups.some((group) => group.groupId === groupId) || snapshot.activeGroupId === groupId) {
    return { changed: false, snapshot };
  }

  return {
    changed: true,
    snapshot: normalizeSimpleGroupedSessionWorkspaceSnapshot({
      ...snapshot,
      activeGroupId: groupId,
    }),
  };
}

export function focusGroupByIndexInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupIndex: number,
): WorkspaceMutationResult {
  const targetGroup = snapshot.groups[groupIndex - 1];
  if (!targetGroup) {
    return { changed: false, snapshot };
  }

  return focusGroupInSimpleWorkspace(snapshot, targetGroup.groupId);
}

export function focusSessionInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): WorkspaceMutationResult {
  const normalizedSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot(snapshot);
  const owningGroup = getGroupForSession(normalizedSnapshot, sessionId);
  if (!owningGroup) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const nextSnapshot = updateGroup(
    {
      ...normalizedSnapshot,
      activeGroupId: owningGroup.groupId,
    },
    owningGroup.groupId,
    (group) => ({
      ...group,
      snapshot: normalizeGroupSnapshot({
        ...group.snapshot,
        focusedSessionId: sessionId,
        visibleSessionIds: getNextVisibleIdsForFocusedSession(
          group.snapshot.sessions,
          group.snapshot.visibleCount,
          sessionId,
          group.snapshot.visibleSessionIds,
          group.snapshot.focusedSessionId,
        ),
      }),
    }),
  );

  return {
    changed: !areSnapshotsEqual(normalizedSnapshot, nextSnapshot),
    snapshot: nextSnapshot,
  };
}

export function renameGroupInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
  title: string,
): WorkspaceMutationResult {
  const nextTitle = title.trim();
  if (!nextTitle) {
    return { changed: false, snapshot };
  }

  const nextSnapshot = updateGroup(snapshot, groupId, (group) => ({
    ...group,
    title: nextTitle,
  }));
  return {
    changed: !areSnapshotsEqual(snapshot, nextSnapshot),
    snapshot: nextSnapshot,
  };
}

export function removeGroupInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
): WorkspaceMutationResult {
  if (!snapshot.groups.some((group) => group.groupId === groupId)) {
    return { changed: false, snapshot };
  }

  const remainingGroups = snapshot.groups.filter((group) => group.groupId !== groupId);
  const normalizedGroups =
    remainingGroups.length > 0
      ? remainingGroups
      : [createEmptyGroup(DEFAULT_MAIN_GROUP_ID, DEFAULT_MAIN_GROUP_TITLE)];
  const activeGroupId = normalizedGroups.some((group) => group.groupId === snapshot.activeGroupId)
    ? snapshot.activeGroupId
    : normalizedGroups[0]!.groupId;

  return {
    changed: true,
    snapshot: normalizeSimpleGroupedSessionWorkspaceSnapshot({
      ...snapshot,
      activeGroupId,
      groups: normalizedGroups,
    }),
  };
}

export function removeSessionInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): WorkspaceMutationResult {
  const owningGroup = getGroupForSession(snapshot, sessionId);
  if (!owningGroup) {
    return { changed: false, snapshot };
  }

  const nextSnapshot = updateGroup(snapshot, owningGroup.groupId, (group) => ({
    ...group,
    snapshot: normalizeGroupSnapshot({
      ...group.snapshot,
      sessions: group.snapshot.sessions.filter((session) => session.sessionId !== sessionId),
      visibleSessionIds: group.snapshot.visibleSessionIds.filter((id) => id !== sessionId),
      focusedSessionId:
        group.snapshot.focusedSessionId === sessionId ? undefined : group.snapshot.focusedSessionId,
    }),
  }));

  return {
    changed: !areSnapshotsEqual(snapshot, nextSnapshot),
    snapshot: nextSnapshot,
  };
}

export function renameSessionAliasInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  alias: string,
): WorkspaceMutationResult {
  const nextAlias = alias.trim();
  if (!nextAlias) {
    return { changed: false, snapshot };
  }

  return updateSession(snapshot, sessionId, (session) => ({
    ...session,
    alias: nextAlias,
  }));
}

export function setSessionTitleInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  title: string,
): WorkspaceMutationResult {
  const nextTitle = title.trim();
  if (!nextTitle) {
    return { changed: false, snapshot };
  }

  return updateSession(snapshot, sessionId, (session) => ({
    ...session,
    title: nextTitle,
  }));
}

export function setT3SessionMetadataInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  t3: T3SessionMetadata,
): WorkspaceMutationResult {
  return updateSession(snapshot, sessionId, (session) => {
    if (session.kind !== "t3") {
      return session;
    }

    return {
      ...session,
      t3,
    };
  });
}

export function setVisibleCountInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  visibleCount: VisibleSessionCount,
): GroupedSessionWorkspaceSnapshot {
  const activeGroup = getActiveGroup(snapshot);
  if (!activeGroup) {
    return snapshot;
  }

  return updateGroup(snapshot, activeGroup.groupId, (group) => ({
    ...group,
    snapshot: normalizeGroupSnapshot({
      ...group.snapshot,
      fullscreenRestoreVisibleCount: undefined,
      visibleCount: clampSupportedVisibleCount(visibleCount),
    }),
  }));
}

export function toggleFullscreenSessionInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
): GroupedSessionWorkspaceSnapshot {
  const activeGroup = getActiveGroup(snapshot);
  if (!activeGroup) {
    return snapshot;
  }

  const currentVisibleCount = clampSupportedVisibleCount(activeGroup.snapshot.visibleCount);
  const restoreVisibleCount =
    activeGroup.snapshot.fullscreenRestoreVisibleCount === undefined
      ? undefined
      : clampSupportedVisibleCount(activeGroup.snapshot.fullscreenRestoreVisibleCount);
  if (currentVisibleCount === 1 && restoreVisibleCount !== undefined) {
    return updateGroup(snapshot, activeGroup.groupId, (group) => ({
      ...group,
      snapshot: normalizeGroupSnapshot({
        ...group.snapshot,
        fullscreenRestoreVisibleCount: undefined,
        visibleCount: restoreVisibleCount,
      }),
    }));
  }

  return updateGroup(snapshot, activeGroup.groupId, (group) => ({
    ...group,
    snapshot: normalizeGroupSnapshot({
      ...group.snapshot,
      fullscreenRestoreVisibleCount:
        group.snapshot.visibleCount > 1
          ? clampSupportedVisibleCount(group.snapshot.visibleCount)
          : undefined,
      visibleCount: 1,
    }),
  }));
}

export function setViewModeInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  viewMode: TerminalViewMode,
): GroupedSessionWorkspaceSnapshot {
  const activeGroup = getActiveGroup(snapshot);
  if (!activeGroup) {
    return snapshot;
  }

  return updateGroup(snapshot, activeGroup.groupId, (group) => ({
    ...group,
    snapshot: {
      ...group.snapshot,
      viewMode,
    },
  }));
}

export function syncSessionOrderInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
  sessionIds: readonly string[],
): WorkspaceMutationResult {
  const group = getGroupById(snapshot, groupId);
  if (!group) {
    return { changed: false, snapshot };
  }

  const sessionById = new Map(group.snapshot.sessions.map((session) => [session.sessionId, session]));
  const orderedSessions = sessionIds
    .map((sessionId) => sessionById.get(sessionId))
    .filter((session): session is SessionRecord => session !== undefined);
  for (const session of group.snapshot.sessions) {
    if (!orderedSessions.some((candidate) => candidate.sessionId === session.sessionId)) {
      orderedSessions.push(session);
    }
  }

  const nextSnapshot = updateGroup(snapshot, groupId, (targetGroup) => ({
    ...targetGroup,
    snapshot: normalizeGroupSnapshot({
      ...targetGroup.snapshot,
      sessions: orderedSessions,
    }),
  }));

  return {
    changed: !areSnapshotsEqual(snapshot, nextSnapshot),
    snapshot: nextSnapshot,
  };
}

export function syncGroupOrderInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupIds: readonly string[],
): WorkspaceMutationResult {
  const groupById = new Map(snapshot.groups.map((group) => [group.groupId, group]));
  const orderedGroups = groupIds
    .map((groupId) => groupById.get(groupId))
    .filter((group): group is SessionGroupRecord => group !== undefined);
  for (const group of snapshot.groups) {
    if (!orderedGroups.some((candidate) => candidate.groupId === group.groupId)) {
      orderedGroups.push(group);
    }
  }

  const nextSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...snapshot,
    groups: orderedGroups,
  });
  return {
    changed: !areSnapshotsEqual(snapshot, nextSnapshot),
    snapshot: nextSnapshot,
  };
}

export function moveSessionToGroupInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  groupId: string,
  targetIndex?: number,
): WorkspaceMutationResult {
  const sourceGroup = getGroupForSession(snapshot, sessionId);
  const targetGroup = getGroupById(snapshot, groupId);
  if (!sourceGroup || !targetGroup || sourceGroup.groupId === groupId) {
    return { changed: false, snapshot };
  }

  const sessionToMove = sourceGroup.snapshot.sessions.find((session) => session.sessionId === sessionId);
  if (!sessionToMove) {
    return { changed: false, snapshot };
  }

  const strippedSnapshot = updateGroup(
    updateGroup(snapshot, sourceGroup.groupId, (group) => ({
      ...group,
      snapshot: normalizeGroupSnapshot({
        ...group.snapshot,
        sessions: group.snapshot.sessions.filter((session) => session.sessionId !== sessionId),
        visibleSessionIds: group.snapshot.visibleSessionIds.filter((id) => id !== sessionId),
        focusedSessionId:
          group.snapshot.focusedSessionId === sessionId ? undefined : group.snapshot.focusedSessionId,
      }),
    })),
    groupId,
    (group) => {
      const nextSessions = [...group.snapshot.sessions];
      const insertIndex =
        typeof targetIndex === "number"
          ? Math.max(0, Math.min(targetIndex, nextSessions.length))
          : nextSessions.length;
      nextSessions.splice(insertIndex, 0, sessionToMove);
      return {
        ...group,
        snapshot: normalizeGroupSnapshot({
          ...group.snapshot,
          focusedSessionId: sessionId,
          sessions: nextSessions,
          visibleSessionIds: getNextVisibleIdsForFocusedSession(
            nextSessions,
            group.snapshot.visibleCount,
            sessionId,
            group.snapshot.visibleSessionIds,
            group.snapshot.focusedSessionId,
          ),
        }),
      };
    },
  );

  const nextSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...strippedSnapshot,
    activeGroupId: groupId,
  });
  return {
    changed: !areSnapshotsEqual(snapshot, nextSnapshot),
    snapshot: nextSnapshot,
  };
}

export function createGroupFromSessionInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
): CreateGroupResult {
  const normalizedSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot(snapshot);
  const sourceGroup = getGroupForSession(normalizedSnapshot, sessionId);
  if (!sourceGroup || normalizedSnapshot.groups.length >= MAX_GROUP_COUNT) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const session = sourceGroup.snapshot.sessions.find((candidate) => candidate.sessionId === sessionId);
  if (!session) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const nextGroupNumber = Math.max(
    normalizedSnapshot.nextGroupNumber,
    getNextGroupNumber(normalizedSnapshot.groups),
  );
  const nextGroupId = `group-${nextGroupNumber}`;
  const nextGroup: SessionGroupRecord = {
    groupId: nextGroupId,
    snapshot: normalizeGroupSnapshot({
      ...createDefaultSessionGridSnapshot(),
      focusedSessionId: sessionId,
      sessions: [session],
      visibleCount: 1,
      visibleSessionIds: [sessionId],
    }),
    title: `Group ${nextGroupNumber}`,
  };
  const snapshotWithoutSession = updateGroup(normalizedSnapshot, sourceGroup.groupId, (group) => ({
    ...group,
    snapshot: normalizeGroupSnapshot({
      ...group.snapshot,
      sessions: group.snapshot.sessions.filter((candidate) => candidate.sessionId !== sessionId),
      visibleSessionIds: group.snapshot.visibleSessionIds.filter((id) => id !== sessionId),
      focusedSessionId:
        group.snapshot.focusedSessionId === sessionId ? undefined : group.snapshot.focusedSessionId,
    }),
  }));
  const nextSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...snapshotWithoutSession,
    activeGroupId: nextGroupId,
    groups: [...snapshotWithoutSession.groups, nextGroup],
    nextGroupNumber: nextGroupNumber + 1,
  });

  return {
    changed: !areSnapshotsEqual(normalizedSnapshot, nextSnapshot),
    groupId: nextGroupId,
    snapshot: nextSnapshot,
  };
}

export function createGroupInSimpleWorkspace(
  snapshot: GroupedSessionWorkspaceSnapshot,
): CreateGroupResult {
  const normalizedSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot(snapshot);
  if (normalizedSnapshot.groups.length >= MAX_GROUP_COUNT) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const nextGroupNumber = Math.max(
    normalizedSnapshot.nextGroupNumber,
    getNextGroupNumber(normalizedSnapshot.groups),
  );
  const nextGroupId = `group-${nextGroupNumber}`;
  const nextSnapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...normalizedSnapshot,
    activeGroupId: nextGroupId,
    groups: [...normalizedSnapshot.groups, createEmptyGroup(nextGroupId, `Group ${nextGroupNumber}`)],
    nextGroupNumber: nextGroupNumber + 1,
  });

  return {
    changed: !areSnapshotsEqual(normalizedSnapshot, nextSnapshot),
    groupId: nextGroupId,
    snapshot: nextSnapshot,
  };
}

function normalizeGroup(group: SessionGroupRecord, index: number): SessionGroupRecord {
  return {
    groupId: group.groupId?.trim() || `group-${index + 1}`,
    snapshot: normalizeGroupSnapshot(group.snapshot),
    title: group.title?.trim() || (index === 0 ? DEFAULT_MAIN_GROUP_TITLE : `Group ${index + 1}`),
  };
}

function prepareGroupForDisplayIdNormalization(
  group: SessionGroupRecord,
  index: number,
): SessionGroupRecord {
  return {
    groupId: group.groupId?.trim() || `group-${index + 1}`,
    snapshot: {
      ...createDefaultSessionGridSnapshot(),
      ...group.snapshot,
      sessions: group.snapshot.sessions.filter((session) => session.kind !== "browser"),
    },
    title: group.title?.trim() || (index === 0 ? DEFAULT_MAIN_GROUP_TITLE : `Group ${index + 1}`),
  };
}

function normalizeGroupSnapshot(snapshot: SessionGroupRecord["snapshot"]): SessionGroupRecord["snapshot"] {
  const sessionIdByLegacyId = new Map<string, string>();
  const sessions = getOrderedSessions({
    ...createDefaultSessionGridSnapshot(),
    ...snapshot,
    sessions: snapshot.sessions.filter((session) => session.kind !== "browser"),
  }).map((session, index) => {
    const position = getSlotPosition(index);
    const nextSession = withCanonicalSessionId(session);
    sessionIdByLegacyId.set(session.sessionId, nextSession.sessionId);
    return {
      ...nextSession,
      column: position.column,
      row: position.row,
      slotIndex: index,
    };
  });
  const focusedSessionId = sessions.some(
    (session) => session.sessionId === sessionIdByLegacyId.get(snapshot.focusedSessionId ?? ""),
  )
    ? sessionIdByLegacyId.get(snapshot.focusedSessionId ?? "")
    : sessions[0]?.sessionId;
  const visibleCount = sessions.length === 0 ? 1 : clampSupportedVisibleCount(snapshot.visibleCount);
  const normalizedVisibleSessionIds = snapshot.visibleSessionIds.map(
    (sessionId) => sessionIdByLegacyId.get(sessionId) ?? sessionId,
  );

  return {
    focusedSessionId,
    fullscreenRestoreVisibleCount:
      visibleCount === 1 && snapshot.fullscreenRestoreVisibleCount !== undefined
        ? clampSupportedVisibleCount(snapshot.fullscreenRestoreVisibleCount)
        : undefined,
    sessions,
    viewMode: snapshot.viewMode ?? "grid",
    visibleCount,
    visibleSessionIds: getNormalizedVisibleIds(
      sessions,
      visibleCount,
      focusedSessionId,
      normalizedVisibleSessionIds,
    ),
  };
}

function getNormalizedVisibleIds(
  sessions: readonly SessionRecord[],
  visibleCount: VisibleSessionCount,
  focusedSessionId: string | undefined,
  currentVisibleSessionIds: readonly string[],
): string[] {
  if (!focusedSessionId || sessions.length === 0) {
    return [];
  }

  if (visibleCount === 1) {
    return [focusedSessionId];
  }

  const sessionIdSet = new Set(sessions.map((session) => session.sessionId));
  const visibleSessionIds: string[] = [];
  for (const sessionId of currentVisibleSessionIds) {
    if (!sessionIdSet.has(sessionId) || visibleSessionIds.includes(sessionId)) {
      continue;
    }

    visibleSessionIds.push(sessionId);
  }

  if (!visibleSessionIds.includes(focusedSessionId)) {
    visibleSessionIds.push(focusedSessionId);
  }

  for (const session of sessions) {
    if (visibleSessionIds.length >= visibleCount) {
      break;
    }
    if (!visibleSessionIds.includes(session.sessionId)) {
      visibleSessionIds.push(session.sessionId);
    }
  }

  if (visibleSessionIds.length <= visibleCount) {
    return visibleSessionIds;
  }

  const passiveVisibleIds = visibleSessionIds.filter((sessionId) => sessionId !== focusedSessionId);
  return passiveVisibleIds.slice(0, Math.max(0, visibleCount - 1)).concat(focusedSessionId);
}

function getNextVisibleIdsForFocusedSession(
  sessions: readonly SessionRecord[],
  visibleCount: VisibleSessionCount,
  nextFocusedSessionId: string,
  currentVisibleSessionIds: readonly string[],
  currentFocusedSessionId: string | undefined,
): string[] {
  if (visibleCount === 1) {
    return [nextFocusedSessionId];
  }

  if (currentVisibleSessionIds.includes(nextFocusedSessionId)) {
    return getNormalizedVisibleIds(
      sessions,
      visibleCount,
      nextFocusedSessionId,
      currentVisibleSessionIds,
    );
  }

  if (
    currentFocusedSessionId &&
    currentVisibleSessionIds.includes(currentFocusedSessionId)
  ) {
    return getNormalizedVisibleIds(
      sessions,
      visibleCount,
      nextFocusedSessionId,
      currentVisibleSessionIds.map((sessionId) =>
        sessionId === currentFocusedSessionId ? nextFocusedSessionId : sessionId,
      ),
    );
  }

  const passiveVisibleIds = currentVisibleSessionIds.filter(
    (sessionId) =>
      sessionId !== nextFocusedSessionId && sessionId !== currentFocusedSessionId,
  );
  return getNormalizedVisibleIds(
    sessions,
    visibleCount,
    nextFocusedSessionId,
    passiveVisibleIds
      .slice(0, Math.max(0, visibleCount - 1))
      .concat(nextFocusedSessionId),
  );
}

function withCanonicalSessionId(session: SessionRecord): SessionRecord {
  const canonicalSessionId = createCanonicalSessionId(session.displayId);
  if (session.sessionId === canonicalSessionId) {
    return session;
  }

  return {
    ...session,
    sessionId: canonicalSessionId,
  };
}

function createCanonicalSessionId(displayId: string | number | undefined): string {
  return `session-${formatSessionDisplayId(displayId ?? 0)}`;
}

function updateGroup(
  snapshot: GroupedSessionWorkspaceSnapshot,
  groupId: string,
  update: (group: SessionGroupRecord) => SessionGroupRecord,
): GroupedSessionWorkspaceSnapshot {
  return normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...snapshot,
    groups: snapshot.groups.map((group) => (group.groupId === groupId ? update(group) : group)),
  });
}

function updateSession(
  snapshot: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  update: (session: SessionRecord) => SessionRecord,
): WorkspaceMutationResult {
  const group = getGroupForSession(snapshot, sessionId);
  if (!group) {
    return { changed: false, snapshot };
  }

  const nextSnapshot = updateGroup(snapshot, group.groupId, (targetGroup) => ({
    ...targetGroup,
    snapshot: normalizeGroupSnapshot({
      ...targetGroup.snapshot,
      sessions: targetGroup.snapshot.sessions.map((session) =>
        session.sessionId === sessionId ? update(session) : session,
      ),
    }),
  }));

  return {
    changed: !areSnapshotsEqual(snapshot, nextSnapshot),
    snapshot: nextSnapshot,
  };
}

function createEmptyGroup(groupId: string, title: string): SessionGroupRecord {
  return {
    groupId,
    snapshot: createDefaultSessionGridSnapshot(),
    title,
  };
}

function clampSupportedVisibleCount(value: number | undefined): VisibleSessionCount {
  return clampVisibleSessionCount(value ?? 1);
}

function getNextGroupNumber(groups: readonly SessionGroupRecord[]): number {
  let nextGroupNumber = 2;
  for (const group of groups) {
    const match = /^group-(\d+)$/.exec(group.groupId);
    if (!match) {
      continue;
    }

    const parsedNumber = Number.parseInt(match[1]!, 10);
    if (Number.isInteger(parsedNumber)) {
      nextGroupNumber = Math.max(nextGroupNumber, parsedNumber + 1);
    }
  }
  return nextGroupNumber;
}

function getNextSessionNumber(groups: readonly SessionGroupRecord[]): number {
  let nextSessionNumber = 1;
  for (const session of groups.flatMap((group) => group.snapshot.sessions)) {
    nextSessionNumber = Math.max(
      nextSessionNumber,
      (getSessionNumberFromSessionId(session.sessionId) ?? 0) + 1,
    );
  }
  return nextSessionNumber;
}

function areSnapshotsEqual(
  left: GroupedSessionWorkspaceSnapshot,
  right: GroupedSessionWorkspaceSnapshot,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
