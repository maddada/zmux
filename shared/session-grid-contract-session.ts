import {
  DEFAULT_MAIN_GROUP_ID,
  DEFAULT_MAIN_GROUP_TITLE,
  GRID_COLUMN_COUNT,
  MAX_SESSION_COUNT,
  MAX_SESSION_DISPLAY_ID_COUNT,
  type BaseSessionRecord,
  type CreateSessionRecordOptions,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridSnapshot,
  type SessionRecord,
  type SidebarTheme,
  type SidebarThemeSetting,
  type SidebarThemeVariant,
  type TerminalSessionRecord,
  type T3SessionRecord,
  type BrowserSessionRecord,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "./session-grid-contract-core";

export function clampVisibleSessionCount(value: number): VisibleSessionCount {
  if (value <= 1) {
    return 1;
  }

  if (value === 2) {
    return 2;
  }

  if (value === 3) {
    return 3;
  }

  if (value <= 4) {
    return 4;
  }

  if (value <= 6) {
    return 6;
  }

  return 9;
}

export function clampTerminalViewMode(value: string | undefined): TerminalViewMode {
  switch (value) {
    case "horizontal":
    case "vertical":
    case "grid":
      return value;
    default:
      return "grid";
  }
}

export function clampSidebarThemeSetting(value: string | undefined): SidebarThemeSetting {
  switch (value) {
    case "auto":
    case "plain":
    case "dark-modern":
    case "dark-green":
      return value === "dark-modern" ? "dark-green" : value;
    case "dark-plus":
    case "dark-blue":
      return value === "dark-plus" ? "dark-blue" : value;
    case "dark-red":
    case "dark-pink":
    case "dark-orange":
    case "light-plus":
    case "light-blue":
    case "light-green":
    case "light-pink":
    case "light-orange":
      return value === "light-plus" ? "light-blue" : value;
    case "monokai":
      return "dark-green";
    case "solarized-dark":
      return "dark-blue";
    default:
      return "auto";
  }
}

export function resolveSidebarTheme(
  themeSetting: SidebarThemeSetting,
  variant: SidebarThemeVariant,
): SidebarTheme {
  if (themeSetting === "auto") {
    return variant === "light" ? "light-blue" : "dark-blue";
  }

  if (themeSetting === "plain") {
    return variant === "light" ? "plain-light" : "plain-dark";
  }

  return themeSetting;
}

export function createDefaultSessionGridSnapshot(): SessionGridSnapshot {
  return {
    focusedSessionId: undefined,
    fullscreenRestoreVisibleCount: undefined,
    sessions: [],
    visibleCount: 1,
    visibleSessionIds: [],
    viewMode: "grid",
  };
}

export function isSessionGridFocusModeActive(
  snapshot: Pick<SessionGridSnapshot, "fullscreenRestoreVisibleCount" | "visibleCount">,
): boolean {
  return snapshot.visibleCount === 1 && snapshot.fullscreenRestoreVisibleCount !== undefined;
}

export function getSessionGridLayoutVisibleCount(
  snapshot: Pick<SessionGridSnapshot, "fullscreenRestoreVisibleCount" | "visibleCount">,
): VisibleSessionCount {
  return snapshot.fullscreenRestoreVisibleCount ?? snapshot.visibleCount;
}

export function createDefaultGroupedSessionWorkspaceSnapshot(): GroupedSessionWorkspaceSnapshot {
  return {
    activeGroupId: DEFAULT_MAIN_GROUP_ID,
    groups: [
      {
        groupId: DEFAULT_MAIN_GROUP_ID,
        snapshot: createDefaultSessionGridSnapshot(),
        title: DEFAULT_MAIN_GROUP_TITLE,
      },
    ],
    nextGroupNumber: 2,
    nextSessionDisplayId: 0,
    nextSessionNumber: 1,
  };
}

export function formatSessionDisplayId(displayId: number | string): string {
  if (typeof displayId === "string") {
    const trimmedDisplayId = displayId.trim();
    if (/^\d{2}$/.test(trimmedDisplayId)) {
      return trimmedDisplayId;
    }

    const parsedDisplayId = Number.parseInt(trimmedDisplayId, 10);
    if (Number.isInteger(parsedDisplayId)) {
      return formatSessionDisplayId(parsedDisplayId);
    }
  }

  if (!Number.isFinite(Number(displayId))) {
    return "00";
  }

  const normalizedDisplayId =
    ((Math.floor(Number(displayId)) % MAX_SESSION_DISPLAY_ID_COUNT) +
      MAX_SESSION_DISPLAY_ID_COUNT) %
    MAX_SESSION_DISPLAY_ID_COUNT;
  return String(normalizedDisplayId).padStart(2, "0");
}

export function getSlotPosition(slotIndex: number): Pick<SessionRecord, "column" | "row"> {
  const normalizedSlotIndex = Math.max(0, Math.min(MAX_SESSION_COUNT - 1, Math.floor(slotIndex)));
  return {
    column: normalizedSlotIndex % GRID_COLUMN_COUNT,
    row: Math.floor(normalizedSlotIndex / GRID_COLUMN_COUNT),
  };
}

export function getSlotLabel(row: number, column: number): string {
  return `R${row + 1}C${column + 1}`;
}

export function getSessionShortcutLabel(slotIndex: number, platform: "default" | "mac"): string {
  const shortcutNumber = Math.max(1, Math.min(MAX_SESSION_COUNT, Math.floor(slotIndex) + 1));
  return platform === "mac" ? `⌘⌥${shortcutNumber}` : `⌃⌥${shortcutNumber}`;
}

export function createSessionAlias(sessionNumber: number, slotIndex: number): string {
  const words = ["Atlas", "Beacon", "Comet", "Drift", "Ember", "Field", "Grove", "Harbor", "Lattice", "Mosaic", "Signal", "Vale"];
  return words[(sessionNumber * 11 + slotIndex * 3) % words.length] ?? words[0]!;
}

export function isGeneratedSessionAlias(
  session: Pick<BaseSessionRecord, "alias" | "sessionId" | "slotIndex">,
): boolean {
  return (
    session.alias.trim() ===
    createSessionAlias(parseSessionNumber(session.sessionId), session.slotIndex)
  );
}

export function createSessionRecord(
  sessionNumber: number,
  slotIndex: number,
  options?: CreateSessionRecordOptions,
): SessionRecord {
  const position = getSlotPosition(slotIndex);
  const alias = createSessionAlias(sessionNumber, slotIndex);
  const createdAt = new Date().toISOString();
  const displayId = formatSessionDisplayId(options?.displayId ?? sessionNumber - 1);
  const sessionId = `session-${sessionNumber}`;
  const title = options?.title?.trim() || `Session ${sessionNumber}`;

  if (options?.kind === "browser") {
    return {
      alias,
      browser: options.browser,
      column: position.column,
      createdAt,
      displayId,
      kind: "browser",
      row: position.row,
      sessionId,
      slotIndex,
      title,
    };
  }

  if (options?.kind === "t3") {
    return {
      alias,
      column: position.column,
      createdAt,
      displayId,
      kind: "t3",
      row: position.row,
      sessionId,
      slotIndex,
      t3: options.t3,
      title,
    };
  }

  return {
    alias,
    column: position.column,
    createdAt,
    displayId,
    kind: "terminal",
    row: position.row,
    sessionId,
    slotIndex,
    title: `Session ${sessionNumber}`,
  };
}

export function getTerminalSessionSurfaceTitle(
  session: Pick<BaseSessionRecord, "alias" | "displayId">,
): string {
  return `${formatSessionDisplayId(session.displayId)}_ ${session.alias}`;
}

export function getT3SessionSurfaceTitle(
  session: Pick<BaseSessionRecord, "alias" | "displayId">,
): string {
  return `${formatSessionDisplayId(session.displayId)}_ T3: ${session.alias}`;
}

export function getVisiblePrimaryTitle(title: string): string | undefined {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || /^Session \d+$/.test(normalizedTitle)) {
    return undefined;
  }

  return normalizedTitle;
}

export function getOrderedSessions(snapshot: SessionGridSnapshot): SessionRecord[] {
  return [...snapshot.sessions].sort((left, right) => left.slotIndex - right.slotIndex);
}

export function isTerminalSession(session: SessionRecord): session is TerminalSessionRecord {
  return session.kind === "terminal";
}

export function isBrowserSession(session: SessionRecord): session is BrowserSessionRecord {
  return session.kind === "browser";
}

export function isT3Session(session: SessionRecord): session is T3SessionRecord {
  return session.kind === "t3";
}

function parseSessionNumber(sessionId: string): number {
  const match = /^session-(\d+)$/.exec(sessionId);
  if (!match) {
    return 1;
  }

  const parsedNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(parsedNumber) && parsedNumber > 0 ? parsedNumber : 1;
}
