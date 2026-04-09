import type {
  GroupedSessionWorkspaceSnapshot,
  SessionRecord,
} from "../../shared/session-grid-contract";

export function getWorkspacePaneSessionRecords(
  workspaceSnapshot: GroupedSessionWorkspaceSnapshot,
): SessionRecord[] {
  const activeGroup = workspaceSnapshot.groups.find(
    (group) => group.groupId === workspaceSnapshot.activeGroupId,
  );
  if (!activeGroup) {
    return [];
  }

  return activeGroup.snapshot.sessions.filter(
    (sessionRecord): sessionRecord is SessionRecord => sessionRecord !== undefined,
  );
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
