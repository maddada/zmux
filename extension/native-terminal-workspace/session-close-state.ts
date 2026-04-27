export type SessionCloseStateStore = {
  closingSessionIds: Set<string>;
  recentlyClosedSessionExpiryBySessionId: Map<string, number>;
};

type FinalizeClosingSessionCloseStateInput = {
  hasReusedLiveSession: boolean;
  now?: number;
  recentlyClosedGraceMs: number;
  rememberAsRecentlyClosed: boolean;
  sessionCloseStateStore: SessionCloseStateStore;
  sessionId: string;
};

export function clearReusedSessionCloseState(
  sessionCloseStateStore: SessionCloseStateStore,
  sessionId: string,
): void {
  sessionCloseStateStore.closingSessionIds.delete(sessionId);
  sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.delete(sessionId);
}

export function finalizeClosingSessionCloseState({
  hasReusedLiveSession,
  now = Date.now(),
  recentlyClosedGraceMs,
  rememberAsRecentlyClosed,
  sessionCloseStateStore,
  sessionId,
}: FinalizeClosingSessionCloseStateInput): void {
  sessionCloseStateStore.closingSessionIds.delete(sessionId);
  if (!rememberAsRecentlyClosed || hasReusedLiveSession) {
    sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.delete(sessionId);
    return;
  }

  sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.set(
    sessionId,
    now + recentlyClosedGraceMs,
  );
}
