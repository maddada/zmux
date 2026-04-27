import {
  type CreateSessionRecordOptions,
  MAX_SESSION_COUNT,
  type SessionGridDirection,
  type SessionGridSnapshot,
  type SessionRecord,
  createSessionRecord,
  getOrderedSessions,
} from "./session-grid-contract";
import {
  findDirectionalNeighbor,
  reindexSessionsInOrder,
  replaceFocusedVisibleSession,
  revealSessionId,
} from "./session-grid-state-helpers";
import { normalizeSessionGridSnapshot } from "./session-grid-state-normalize";

export function createSessionInSnapshot(
  snapshot: SessionGridSnapshot,
  sessionNumber: number,
  options?: CreateSessionRecordOptions,
): {
  session?: SessionRecord;
  snapshot: SessionGridSnapshot;
} {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const orderedSessions = getOrderedSessions(normalizedSnapshot);
  if (orderedSessions.length >= MAX_SESSION_COUNT) {
    return { snapshot: normalizedSnapshot };
  }

  const session = createSessionRecord(sessionNumber, orderedSessions.length, options);
  const sessions = reindexSessionsInOrder([...orderedSessions, session]);
  const shouldCreateInBackground = options?.initialPresentation === "background";
  const visibleSessionIds = shouldCreateInBackground
    ? normalizedSnapshot.visibleSessionIds
    : normalizedSnapshot.visibleSessionIds.length < normalizedSnapshot.visibleCount
      ? [...normalizedSnapshot.visibleSessionIds, session.sessionId]
      : replaceFocusedVisibleSession(normalizedSnapshot, session.sessionId);

  return {
    session,
    snapshot: normalizeSessionGridSnapshot({
      ...normalizedSnapshot,
      focusedSessionId: shouldCreateInBackground
        ? normalizedSnapshot.focusedSessionId
        : session.sessionId,
      sessions,
      visibleSessionIds,
    }),
  };
}

export function focusDirectionInSnapshot(
  snapshot: SessionGridSnapshot,
  direction: SessionGridDirection,
): { changed: boolean; snapshot: SessionGridSnapshot } {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const currentSession = normalizedSnapshot.focusedSessionId
    ? normalizedSnapshot.sessions.find(
        (session) => session.sessionId === normalizedSnapshot.focusedSessionId,
      )
    : undefined;
  if (!currentSession) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  const nextSession = findDirectionalNeighbor(
    normalizedSnapshot.sessions,
    currentSession,
    direction,
  );
  if (!nextSession) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  return focusSessionInSnapshot(normalizedSnapshot, nextSession.sessionId);
}

export function focusSessionInSnapshot(
  snapshot: SessionGridSnapshot,
  sessionId: string,
): { changed: boolean; snapshot: SessionGridSnapshot } {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const hasSession = normalizedSnapshot.sessions.some((session) => session.sessionId === sessionId);
  if (!hasSession) {
    return { changed: false, snapshot: normalizedSnapshot };
  }

  return {
    changed: normalizedSnapshot.focusedSessionId !== sessionId,
    snapshot: normalizeSessionGridSnapshot({
      ...normalizedSnapshot,
      focusedSessionId: sessionId,
      visibleSessionIds: revealSessionId(normalizedSnapshot, sessionId),
    }),
  };
}
