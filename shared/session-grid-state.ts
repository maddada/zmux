import {
  GRID_COLUMN_COUNT,
  MAX_SESSION_COUNT,
  createSessionAlias,
  type SessionGridDirection,
  type SessionGridSnapshot,
  type SessionRecord,
  type TerminalViewMode,
  type VisibleSessionCount,
  clampVisibleSessionCount,
  clampTerminalViewMode,
  createDefaultSessionGridSnapshot,
  createSessionRecord,
  getSlotPosition,
  getOrderedSessions,
} from "./session-grid-contract";

export function createSessionInSnapshot(
  snapshot: SessionGridSnapshot,
  sessionNumber: number,
): {
  session?: SessionRecord;
  snapshot: SessionGridSnapshot;
} {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const orderedSessions = getOrderedSessions(normalizedSnapshot);
  if (orderedSessions.length >= MAX_SESSION_COUNT) {
    return { snapshot: normalizedSnapshot };
  }

  const slotIndex = orderedSessions.length;
  const session = createSessionRecord(sessionNumber, slotIndex);
  const sessions = reindexSessionsInOrder([...orderedSessions, session]);
  const visibleSessionIds =
    normalizedSnapshot.visibleSessionIds.length < normalizedSnapshot.visibleCount
      ? [...normalizedSnapshot.visibleSessionIds, session.sessionId]
      : replaceFocusedVisibleSession(normalizedSnapshot, session.sessionId);

  return {
    session,
    snapshot: normalizeSessionGridSnapshot({
      ...normalizedSnapshot,
      focusedSessionId: session.sessionId,
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
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
  }

  const nextSession = findDirectionalNeighbor(
    normalizedSnapshot.sessions,
    currentSession,
    direction,
  );
  if (!nextSession) {
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
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
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
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

  const focusFallback = orderedSessions[0]?.sessionId;
  const focusedSessionId =
    normalizedSnapshot.focusedSessionId && sessionIds.has(normalizedSnapshot.focusedSessionId)
      ? normalizedSnapshot.focusedSessionId
      : focusFallback;

  const desiredVisibleSize = Math.min(visibleCount, orderedSessions.length);
  const normalizedVisibleIds = normalizeVisibleSessionIds(
    orderedSessions,
    normalizedSnapshot.visibleSessionIds,
    desiredVisibleSize,
    focusedSessionId,
  );
  const fullscreenRestoreVisibleCount = normalizeFullscreenRestoreVisibleCount(
    normalizedSnapshot.fullscreenRestoreVisibleCount,
    visibleCount,
  );

  return {
    focusedSessionId,
    fullscreenRestoreVisibleCount,
    sessions: orderedSessions,
    visibleCount,
    visibleSessionIds: normalizedVisibleIds,
    viewMode,
  };
}

export function setVisibleCountInSnapshot(
  snapshot: SessionGridSnapshot,
  visibleCount: VisibleSessionCount,
): SessionGridSnapshot {
  return normalizeSessionGridSnapshot({
    ...snapshot,
    fullscreenRestoreVisibleCount: undefined,
    visibleCount,
  });
}

export function toggleFullscreenSessionInSnapshot(
  snapshot: SessionGridSnapshot,
): SessionGridSnapshot {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const restoreVisibleCount = normalizedSnapshot.fullscreenRestoreVisibleCount;

  if (normalizedSnapshot.visibleCount === 1 && restoreVisibleCount) {
    return normalizeSessionGridSnapshot({
      ...normalizedSnapshot,
      fullscreenRestoreVisibleCount: undefined,
      visibleCount: restoreVisibleCount,
    });
  }

  return normalizeSessionGridSnapshot({
    ...normalizedSnapshot,
    fullscreenRestoreVisibleCount:
      normalizedSnapshot.visibleCount > 1 ? normalizedSnapshot.visibleCount : undefined,
    visibleCount: 1,
  });
}

export function setViewModeInSnapshot(
  snapshot: SessionGridSnapshot,
  viewMode: TerminalViewMode,
): SessionGridSnapshot {
  return normalizeSessionGridSnapshot({
    ...snapshot,
    viewMode,
  });
}

export function syncSessionOrderInSnapshot(
  snapshot: SessionGridSnapshot,
  sessionIds: readonly string[],
): { changed: boolean; snapshot: SessionGridSnapshot } {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const orderedSessions = getOrderedSessions(normalizedSnapshot);
  const currentSessionIds = orderedSessions.map((session) => session.sessionId);

  if (sessionIds.length !== currentSessionIds.length) {
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
  }

  const hasSameOrder = currentSessionIds.every(
    (sessionId, index) => sessionId === sessionIds[index],
  );
  if (hasSameOrder) {
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
  }

  const currentSessionIdSet = new Set(currentSessionIds);
  const incomingSessionIdSet = new Set(sessionIds);
  if (
    incomingSessionIdSet.size !== sessionIds.length ||
    currentSessionIds.some((sessionId) => !incomingSessionIdSet.has(sessionId)) ||
    sessionIds.some((sessionId) => !currentSessionIdSet.has(sessionId))
  ) {
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
  }

  const sessionById = new Map(orderedSessions.map((session) => [session.sessionId, session]));
  const sessions = reindexSessionsInOrder(
    sessionIds.map((sessionId) => {
      const session = sessionById.get(sessionId);
      if (!session) {
        throw new Error(`Missing session for reorder: ${sessionId}`);
      }

      return session;
    }),
  );

  const visibleSessionIds = sessionIds.slice(
    0,
    Math.min(normalizedSnapshot.visibleCount, sessions.length),
  );
  const focusedSessionId =
    normalizedSnapshot.focusedSessionId &&
    visibleSessionIds.includes(normalizedSnapshot.focusedSessionId)
      ? normalizedSnapshot.focusedSessionId
      : visibleSessionIds[0];

  return {
    changed: true,
    snapshot: normalizeSessionGridSnapshot({
      ...normalizedSnapshot,
      focusedSessionId,
      sessions,
      visibleSessionIds,
    }),
  };
}

export function renameSessionAliasInSnapshot(
  snapshot: SessionGridSnapshot,
  sessionId: string,
  alias: string,
): { changed: boolean; snapshot: SessionGridSnapshot } {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const normalizedAlias = alias.trim();
  if (normalizedAlias.length === 0) {
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
  }

  let changed = false;
  const sessions = normalizedSnapshot.sessions.map((session) => {
    if (session.sessionId !== sessionId || session.alias === normalizedAlias) {
      return session;
    }

    changed = true;
    return {
      ...session,
      alias: normalizedAlias,
    };
  });

  return {
    changed,
    snapshot: changed
      ? normalizeSessionGridSnapshot({
          ...normalizedSnapshot,
          sessions,
        })
      : normalizedSnapshot,
  };
}

export function setSessionTitleInSnapshot(
  snapshot: SessionGridSnapshot,
  sessionId: string,
  title: string,
): { changed: boolean; snapshot: SessionGridSnapshot } {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  const normalizedTitle = title.trim();
  if (normalizedTitle.length === 0) {
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
  }

  let changed = false;
  const sessions = normalizedSnapshot.sessions.map((session) => {
    if (session.sessionId !== sessionId || session.title === normalizedTitle) {
      return session;
    }

    changed = true;
    return {
      ...session,
      title: normalizedTitle,
    };
  });

  return {
    changed,
    snapshot: changed
      ? normalizeSessionGridSnapshot({
          ...normalizedSnapshot,
          sessions,
        })
      : normalizedSnapshot,
  };
}

export function removeSessionInSnapshot(
  snapshot: SessionGridSnapshot,
  sessionId: string,
): { changed: boolean; snapshot: SessionGridSnapshot } {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  if (!normalizedSnapshot.sessions.some((session) => session.sessionId === sessionId)) {
    return {
      changed: false,
      snapshot: normalizedSnapshot,
    };
  }

  const sessions = normalizedSnapshot.sessions.filter((session) => session.sessionId !== sessionId);
  const visibleSessionIds = normalizedSnapshot.visibleSessionIds.filter(
    (visibleSessionId) => visibleSessionId !== sessionId,
  );

  return {
    changed: true,
    snapshot: normalizeSessionGridSnapshot({
      ...normalizedSnapshot,
      focusedSessionId:
        normalizedSnapshot.focusedSessionId === sessionId
          ? (visibleSessionIds[0] ?? sessions[0]?.sessionId)
          : normalizedSnapshot.focusedSessionId,
      sessions,
      visibleSessionIds,
    }),
  };
}

function findDirectionalNeighbor(
  sessions: SessionRecord[],
  currentSession: SessionRecord,
  direction: SessionGridDirection,
): SessionRecord | undefined {
  const candidates = sessions.filter((session) => {
    if (session.sessionId === currentSession.sessionId) {
      return false;
    }

    switch (direction) {
      case "up":
        return session.column === currentSession.column && session.row < currentSession.row;
      case "right":
        return session.row === currentSession.row && session.column > currentSession.column;
      case "down":
        return session.column === currentSession.column && session.row > currentSession.row;
      case "left":
        return session.row === currentSession.row && session.column < currentSession.column;
    }
  });

  if (candidates.length > 0) {
    return candidates.sort((left, right) => {
      const leftDistance = getDirectionalDistance(left, currentSession, direction);
      const rightDistance = getDirectionalDistance(right, currentSession, direction);

      return leftDistance - rightDistance;
    })[0];
  }

  const fallbackCandidates = sessions.filter((session) => {
    if (session.sessionId === currentSession.sessionId) {
      return false;
    }

    switch (direction) {
      case "up":
        return session.row < currentSession.row;
      case "right":
        return session.column > currentSession.column;
      case "down":
        return session.row > currentSession.row;
      case "left":
        return session.column < currentSession.column;
    }
  });

  return fallbackCandidates.sort((left, right) => {
    const leftScore = getDirectionalDistance(left, currentSession, direction);
    const rightScore = getDirectionalDistance(right, currentSession, direction);

    return leftScore - rightScore;
  })[0];
}

function getDirectionalDistance(
  candidate: SessionRecord,
  currentSession: SessionRecord,
  direction: SessionGridDirection,
): number {
  const rowDistance = Math.abs(candidate.row - currentSession.row);
  const columnDistance = Math.abs(candidate.column - currentSession.column);

  if (direction === "up" || direction === "down") {
    return rowDistance * GRID_COLUMN_COUNT + columnDistance;
  }

  return columnDistance * GRID_COLUMN_COUNT + rowDistance;
}

function replaceFocusedVisibleSession(snapshot: SessionGridSnapshot, sessionId: string): string[] {
  if (snapshot.visibleSessionIds.length === 0) {
    return [sessionId];
  }

  const focusedIndex = snapshot.focusedSessionId
    ? snapshot.visibleSessionIds.indexOf(snapshot.focusedSessionId)
    : -1;
  if (focusedIndex < 0) {
    return [...snapshot.visibleSessionIds.slice(0, -1), sessionId];
  }

  const nextVisibleIds = [...snapshot.visibleSessionIds];
  nextVisibleIds[focusedIndex] = sessionId;
  return nextVisibleIds;
}

function normalizeVisibleSessionIds(
  orderedSessions: readonly SessionRecord[],
  visibleSessionIds: readonly string[],
  desiredVisibleSize: number,
  focusedSessionId?: string,
): string[] {
  if (desiredVisibleSize <= 0 || orderedSessions.length === 0) {
    return [];
  }

  const orderedSessionIds = orderedSessions.map((session) => session.sessionId);
  const visibleIdSet = new Set(
    visibleSessionIds.filter((sessionId) => orderedSessionIds.includes(sessionId)),
  );
  if (focusedSessionId && orderedSessionIds.includes(focusedSessionId)) {
    visibleIdSet.add(focusedSessionId);
  }

  while (visibleIdSet.size < desiredVisibleSize) {
    const nextSessionId = orderedSessionIds.find((sessionId) => !visibleIdSet.has(sessionId));
    if (!nextSessionId) {
      break;
    }

    visibleIdSet.add(nextSessionId);
  }

  const orderedVisibleIds = orderedSessionIds.filter((sessionId) => visibleIdSet.has(sessionId));
  if (orderedVisibleIds.length <= desiredVisibleSize) {
    return orderedVisibleIds;
  }

  if (!focusedSessionId) {
    return orderedVisibleIds.slice(0, desiredVisibleSize);
  }

  const focusedIndex = orderedVisibleIds.indexOf(focusedSessionId);
  if (focusedIndex < 0) {
    return orderedVisibleIds.slice(0, desiredVisibleSize);
  }

  const windowStart = Math.max(
    0,
    Math.min(focusedIndex - desiredVisibleSize + 1, orderedVisibleIds.length - desiredVisibleSize),
  );
  return orderedVisibleIds.slice(windowStart, windowStart + desiredVisibleSize);
}

function normalizeFullscreenRestoreVisibleCount(
  fullscreenRestoreVisibleCount: VisibleSessionCount | undefined,
  visibleCount: VisibleSessionCount,
): VisibleSessionCount | undefined {
  if (visibleCount !== 1 || fullscreenRestoreVisibleCount === undefined) {
    return undefined;
  }

  return fullscreenRestoreVisibleCount > 1 ? fullscreenRestoreVisibleCount : undefined;
}

function reindexSessionsInOrder(sessions: readonly SessionRecord[]): SessionRecord[] {
  return sessions.map((session, index) => {
    const position = getSlotPosition(index);
    if (
      session.slotIndex === index &&
      session.row === position.row &&
      session.column === position.column
    ) {
      return session;
    }

    return {
      ...session,
      column: position.column,
      row: position.row,
      slotIndex: index,
    };
  });
}

function normalizeSessionRecord(session: SessionRecord): SessionRecord {
  const sessionNumber = getSessionNumber(session);
  const defaultAlias = createSessionAlias(sessionNumber, session.slotIndex);
  const defaultTitle = `Session ${sessionNumber}`;

  return {
    ...session,
    alias:
      typeof session.alias === "string" && session.alias.trim().length > 0
        ? session.alias.trim()
        : defaultAlias,
    title:
      typeof session.title === "string" && session.title.trim().length > 0
        ? session.title.trim()
        : defaultTitle,
  };
}

function getSessionNumber(session: SessionRecord): number {
  const sessionIdMatch = /^session-(\d+)$/.exec(session.sessionId);
  if (sessionIdMatch) {
    const parsedNumber = Number.parseInt(sessionIdMatch[1], 10);
    if (Number.isInteger(parsedNumber) && parsedNumber > 0) {
      return parsedNumber;
    }
  }

  return session.slotIndex + 1;
}

function revealSessionId(snapshot: SessionGridSnapshot, sessionId: string): string[] {
  if (snapshot.visibleSessionIds.includes(sessionId)) {
    return snapshot.visibleSessionIds;
  }

  if (snapshot.visibleSessionIds.length < snapshot.visibleCount) {
    return [...snapshot.visibleSessionIds, sessionId];
  }

  return replaceFocusedVisibleSession(snapshot, sessionId);
}
