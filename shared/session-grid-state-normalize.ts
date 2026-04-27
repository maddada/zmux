import {
  MAX_SESSION_COUNT,
  type SessionGridSnapshot,
  clampTerminalViewMode,
  clampVisibleSessionCount,
  createDefaultSessionGridSnapshot,
  getOrderedSessions,
} from "./session-grid-contract";
import {
  normalizeFullscreenRestoreVisibleCount,
  normalizeSessionRecord,
  normalizeVisibleSessionIds,
} from "./session-grid-state-helpers";

export function normalizeSessionGridSnapshot(
  snapshot: SessionGridSnapshot | undefined,
): SessionGridSnapshot {
  const normalizedSnapshot = snapshot ?? createDefaultSessionGridSnapshot();
  const orderedSessions = getOrderedSessions({
    ...normalizedSnapshot,
    sessions: normalizedSnapshot.sessions
      .filter((session) => session.slotIndex < MAX_SESSION_COUNT)
      .map((session) => normalizeSessionRecord(session)),
  });
  const sessionIds = new Set(orderedSessions.map((session) => session.sessionId));
  const visibleCount = clampVisibleSessionCount(normalizedSnapshot.visibleCount);
  const viewMode = clampTerminalViewMode(normalizedSnapshot.viewMode);

  const focusedSessionId =
    normalizedSnapshot.focusedSessionId && sessionIds.has(normalizedSnapshot.focusedSessionId)
      ? normalizedSnapshot.focusedSessionId
      : orderedSessions[0]?.sessionId;
  const normalizedVisibleIds = normalizeVisibleSessionIds(
    orderedSessions,
    normalizedSnapshot.visibleSessionIds,
    Math.min(visibleCount, orderedSessions.length),
    focusedSessionId,
  );

  return {
    focusedSessionId,
    fullscreenRestoreVisibleCount: normalizeFullscreenRestoreVisibleCount(
      normalizedSnapshot.fullscreenRestoreVisibleCount,
      visibleCount,
    ),
    sessions: orderedSessions,
    visibleCount,
    visibleSessionIds: normalizedVisibleIds,
    viewMode,
  };
}
