import type {
  GroupedSessionWorkspaceSnapshot,
  SessionRecord,
} from "../../shared/session-grid-contract";
import { getOrderedSessions } from "../../shared/session-grid-contract";

export function getWorkspacePaneSessionRecords(
  workspaceSnapshot: GroupedSessionWorkspaceSnapshot,
): SessionRecord[] {
  const activeGroup = workspaceSnapshot.groups.find(
    (group) => group.groupId === workspaceSnapshot.activeGroupId,
  );
  if (!activeGroup) {
    return [];
  }

  const activeGroupSessionIds = new Set(
    activeGroup.snapshot.sessions.map((session) => session.sessionId),
  );
  const retainedInactiveSessions = workspaceSnapshot.groups.flatMap((group) =>
    group.snapshot.sessions.filter(
      (sessionRecord) =>
        (sessionRecord.kind === "terminal" || sessionRecord.kind === "t3") &&
        !activeGroupSessionIds.has(sessionRecord.sessionId),
    ),
  );

  return activeGroup.snapshot.sessions
    .concat(retainedInactiveSessions)
    .filter((sessionRecord): sessionRecord is SessionRecord => sessionRecord !== undefined);
}

export function sortWorkspacePaneSessionRecords(
  sessionRecords: readonly SessionRecord[],
  orderedSessionIds: readonly string[],
): SessionRecord[] {
  if (orderedSessionIds.length === 0) {
    return [...sessionRecords];
  }

  const sessionById = new Map(
    sessionRecords.map((sessionRecord): [string, SessionRecord] => [
      sessionRecord.sessionId,
      sessionRecord,
    ]),
  );
  const orderedRecords: SessionRecord[] = [];
  const orderedSessionIdSet = new Set<string>();

  for (const sessionId of orderedSessionIds) {
    if (orderedSessionIdSet.has(sessionId)) {
      continue;
    }

    const sessionRecord = sessionById.get(sessionId);
    if (!sessionRecord) {
      continue;
    }

    orderedRecords.push(sessionRecord);
    orderedSessionIdSet.add(sessionId);
  }

  return orderedRecords.concat(
    sessionRecords.filter((sessionRecord) => !orderedSessionIdSet.has(sessionRecord.sessionId)),
  );
}

export function getWorkspaceSlotSessionRecords(
  workspaceSnapshot: GroupedSessionWorkspaceSnapshot,
): SessionRecord[] {
  const activeGroup = workspaceSnapshot.groups.find(
    (group) => group.groupId === workspaceSnapshot.activeGroupId,
  );
  if (!activeGroup) {
    return [];
  }

  const orderedSessions = getOrderedSessions(activeGroup.snapshot);
  const sessionById = new Map(
    orderedSessions.map((sessionRecord): [string, SessionRecord] => [
      sessionRecord.sessionId,
      sessionRecord,
    ]),
  );
  const visibleSessionIds = new Set<string>();
  const visibleSessions = activeGroup.snapshot.visibleSessionIds.flatMap((sessionId) => {
    const sessionRecord = sessionById.get(sessionId);
    if (!sessionRecord || visibleSessionIds.has(sessionId)) {
      return [];
    }

    visibleSessionIds.add(sessionId);
    return [sessionRecord];
  });

  return visibleSessions.concat(
    orderedSessions.filter((sessionRecord) => !visibleSessionIds.has(sessionRecord.sessionId)),
  );
}
