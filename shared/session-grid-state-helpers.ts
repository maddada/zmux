import {
  DEFAULT_TERMINAL_SESSION_TITLE,
  GRID_COLUMN_COUNT,
  createSessionAlias,
  formatSessionDisplayId,
  getVisiblePrimaryTitle,
  getSessionGridLayoutVisibleCount,
  getSlotPosition,
  isSessionGridFocusModeActive,
  normalizeTerminalSessionAgentName,
  normalizeTerminalSessionPersistenceProvider,
  normalizeTerminalEngine,
  type SessionGridDirection,
  type SessionGridSnapshot,
  type SessionRecord,
  type SessionTitleSource,
  type VisibleSessionCount,
} from "./session-grid-contract";
import { normalizeT3SessionMetadata } from "./t3-session-metadata";

export function dedupeSessionIds(sessionIds: readonly string[]): string[] {
  const uniqueSessionIds = new Set<string>();
  const result: string[] = [];
  for (const sessionId of sessionIds) {
    if (uniqueSessionIds.has(sessionId)) {
      continue;
    }

    uniqueSessionIds.add(sessionId);
    result.push(sessionId);
  }
  return result;
}

export function findDirectionalNeighbor(
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

export function replaceFocusedVisibleSession(
  snapshot: SessionGridSnapshot,
  sessionId: string,
): string[] {
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

export function normalizeVisibleSessionIds(
  orderedSessions: readonly SessionRecord[],
  visibleSessionIds: readonly string[],
  desiredVisibleSize: number,
  focusedSessionId?: string,
): string[] {
  if (desiredVisibleSize <= 0 || orderedSessions.length === 0) {
    return [];
  }

  const orderedSessionIds = orderedSessions.map((session) => session.sessionId);
  const normalizedVisibleIds = dedupeSessionIds(
    visibleSessionIds.filter((sessionId) => orderedSessionIds.includes(sessionId)),
  );
  if (
    focusedSessionId &&
    orderedSessionIds.includes(focusedSessionId) &&
    !normalizedVisibleIds.includes(focusedSessionId)
  ) {
    normalizedVisibleIds.push(focusedSessionId);
  }

  while (normalizedVisibleIds.length < desiredVisibleSize) {
    const nextSessionId = orderedSessionIds.find(
      (sessionId) => !normalizedVisibleIds.includes(sessionId),
    );
    if (!nextSessionId) {
      break;
    }

    normalizedVisibleIds.push(nextSessionId);
  }

  if (normalizedVisibleIds.length <= desiredVisibleSize) {
    return normalizedVisibleIds;
  }

  if (!focusedSessionId) {
    return normalizedVisibleIds.slice(0, desiredVisibleSize);
  }

  const focusedIndex = normalizedVisibleIds.indexOf(focusedSessionId);
  if (focusedIndex < 0) {
    return normalizedVisibleIds.slice(0, desiredVisibleSize);
  }

  const windowStart = Math.max(
    0,
    Math.min(
      focusedIndex - desiredVisibleSize + 1,
      normalizedVisibleIds.length - desiredVisibleSize,
    ),
  );
  return normalizedVisibleIds.slice(windowStart, windowStart + desiredVisibleSize);
}

export function normalizeFullscreenRestoreVisibleCount(
  fullscreenRestoreVisibleCount: VisibleSessionCount | undefined,
  visibleCount: VisibleSessionCount,
): VisibleSessionCount | undefined {
  if (visibleCount !== 1 || fullscreenRestoreVisibleCount === undefined) {
    return undefined;
  }

  return fullscreenRestoreVisibleCount > 1 ? fullscreenRestoreVisibleCount : undefined;
}

export function restoreLayoutVisibleCountInSnapshot(
  snapshot: SessionGridSnapshot,
  normalizeSessionGridSnapshot: (snapshot: SessionGridSnapshot) => SessionGridSnapshot,
): SessionGridSnapshot {
  const normalizedSnapshot = normalizeSessionGridSnapshot(snapshot);
  if (!isSessionGridFocusModeActive(normalizedSnapshot)) {
    return normalizedSnapshot;
  }

  return normalizeSessionGridSnapshot({
    ...normalizedSnapshot,
    fullscreenRestoreVisibleCount: undefined,
    visibleCount: getSessionGridLayoutVisibleCount(normalizedSnapshot),
  });
}

export function reindexSessionsInOrder(sessions: readonly SessionRecord[]): SessionRecord[] {
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

export function normalizeSessionRecord(session: SessionRecord): SessionRecord {
  const sessionNumber = getSessionNumber(session);
  const defaultAlias = createSessionAlias(sessionNumber, session.slotIndex, session.displayId);
  const defaultTitle = DEFAULT_TERMINAL_SESSION_TITLE;
  const alias =
    typeof session.alias === "string" && session.alias.trim().length > 0
      ? session.alias.trim()
      : defaultAlias;
  const title =
    typeof session.title === "string" && session.title.trim().length > 0
      ? session.title.trim()
      : defaultTitle;
  const displayId = formatSessionDisplayId(session.displayId ?? sessionNumber - 1);
  const titleSource = normalizeSessionTitleSource(session, title);

  if (
    session.kind === "t3" &&
    typeof session.t3.projectId === "string" &&
    typeof session.t3.serverOrigin === "string" &&
    typeof session.t3.threadId === "string" &&
    typeof session.t3.workspaceRoot === "string"
  ) {
    return {
      ...session,
      alias,
      displayId,
      kind: "t3",
      t3: normalizeT3SessionMetadata({
        boundThreadId:
          typeof session.t3.boundThreadId === "string" ? session.t3.boundThreadId : undefined,
        projectId: session.t3.projectId,
        serverOrigin: session.t3.serverOrigin,
        threadId: session.t3.threadId,
        workspaceRoot: session.t3.workspaceRoot,
      }),
      title,
      titleSource,
    };
  }

  if (session.kind === "browser" && typeof session.browser.url === "string") {
    return {
      ...session,
      alias,
      browser: {
        faviconDataUrl:
          typeof session.browser.faviconDataUrl === "string"
            ? session.browser.faviconDataUrl
            : undefined,
        url: session.browser.url,
      },
      displayId,
      kind: "browser",
      title,
      titleSource,
    };
  }

  return {
    ...session,
    alias,
    agentName: normalizeTerminalSessionAgentName(
      session.kind === "terminal" ? session.agentName : undefined,
    ),
    displayId,
    kind: "terminal",
    terminalEngine: normalizeTerminalEngine(
      session.kind === "terminal" ? session.terminalEngine : undefined,
    ),
    sessionPersistenceName: normalizeTerminalSessionPersistenceName(
      session.kind === "terminal"
        ? (session.sessionPersistenceName ?? session.tmuxSessionName)
        : undefined,
    ),
    sessionPersistenceProvider: normalizeTerminalSessionPersistenceProvider(
      session.kind === "terminal" ? session.sessionPersistenceProvider : undefined,
    ),
    title,
    titleSource,
  };
}

function normalizeTerminalSessionPersistenceName(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeSessionTitleSource(
  session: SessionRecord,
  title: string,
): SessionTitleSource | undefined {
  const candidateSource = session.titleSource;
  if (
    candidateSource === "browser-auto" ||
    candidateSource === "generated" ||
    candidateSource === "placeholder" ||
    candidateSource === "terminal-auto" ||
    candidateSource === "user"
  ) {
    return candidateSource;
  }
  if (
    session.kind === "terminal" &&
    (session as SessionRecord & { titleAutoCapturedFromTerminal?: boolean })
      .titleAutoCapturedFromTerminal === true
  ) {
    return "terminal-auto";
  }
  return getVisiblePrimaryTitle(title) ? undefined : "placeholder";
}

export function revealSessionId(snapshot: SessionGridSnapshot, sessionId: string): string[] {
  if (snapshot.visibleSessionIds.includes(sessionId)) {
    return snapshot.visibleSessionIds;
  }

  if (snapshot.visibleSessionIds.length < snapshot.visibleCount) {
    return [...snapshot.visibleSessionIds, sessionId];
  }

  return replaceFocusedVisibleSession(snapshot, sessionId);
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
