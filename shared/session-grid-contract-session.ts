import {
  DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
  DEFAULT_MAIN_GROUP_ID,
  DEFAULT_MAIN_GROUP_TITLE,
  GRID_COLUMN_COUNT,
  MAX_AGENT_MANAGER_ZOOM_PERCENT,
  MAX_SESSION_COUNT,
  MAX_SESSION_DISPLAY_ID_COUNT,
  MIN_AGENT_MANAGER_ZOOM_PERCENT,
  type BaseSessionRecord,
  type CreateSessionRecordOptions,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridSnapshot,
  type SessionRecord,
  type SidebarTheme,
  type SidebarThemeSetting,
  type SidebarThemeVariant,
  type TerminalEngine,
  type TerminalSessionRecord,
  type T3SessionRecord,
  type BrowserSessionRecord,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "./session-grid-contract-core";
import { normalizeT3SessionMetadata } from "./t3-session-metadata";

const LEADING_TERMINAL_TITLE_STATUS_MARKER_PATTERN = /^[\s\u2800-\u28ff·•⋅◦✳*✦◇🤖🔔]+/u;
const LEADING_TERMINAL_TITLE_PREFIX_PATTERN = /^(?:OC\s*\|\s*)+/iu;
const DEFAULT_TERMINAL_ENGINE: TerminalEngine = "ghostty-non-persistent";
const IGNORED_GENERIC_TERMINAL_TITLES = new Set([
  "claude",
  "claude code",
  "codex",
  "codex cli",
  "openai codex",
  "vsmux",
]);
const WINDOWS_DEFAULT_POWERSHELL_TITLE_PATTERN =
  /^[a-z]:\\windows\\system32\\windowspowershell\\v1\.0\\powershell\.exe(?:\s+\.)?$/iu;

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

export function clampAgentManagerZoomPercent(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_AGENT_MANAGER_ZOOM_PERCENT;
  }

  return Math.min(
    MAX_AGENT_MANAGER_ZOOM_PERCENT,
    Math.max(MIN_AGENT_MANAGER_ZOOM_PERCENT, Math.round(value)),
  );
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

export function createSessionAlias(
  sessionNumber: number,
  slotIndex: number,
  displayId?: string | number,
): string {
  void slotIndex;
  return formatSessionDisplayId(displayId ?? sessionNumber - 1);
}

export function isNumericSessionAlias(alias: string | undefined): boolean {
  return /^\d+$/.test(alias?.trim() ?? "");
}

export function isGeneratedSessionAlias(
  session: Pick<BaseSessionRecord, "alias" | "displayId" | "sessionId" | "slotIndex">,
): boolean {
  return (
    session.alias.trim() ===
    createSessionAlias(getSessionNumber(session), session.slotIndex, session.displayId)
  );
}

export function createSessionRecord(
  sessionNumber: number,
  slotIndex: number,
  options?: CreateSessionRecordOptions,
): SessionRecord {
  const position = getSlotPosition(slotIndex);
  const displayId = formatSessionDisplayId(options?.displayId ?? sessionNumber - 1);
  const alias = createSessionAlias(sessionNumber, slotIndex, displayId);
  const createdAt = new Date().toISOString();
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
      t3: normalizeT3SessionMetadata(options.t3),
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
    terminalEngine: normalizeTerminalEngine(options?.terminalEngine),
    title,
  };
}

export function normalizeTerminalEngine(value: string | undefined): TerminalEngine {
  if (value === "ghostty") {
    return "ghostty-non-persistent";
  }

  if (value === "ghostty-non-persistent") {
    return "ghostty-non-persistent";
  }

  if (value === "xterm") {
    return "xterm";
  }

  if (value === "non-persistent") {
    return "non-persistent";
  }

  if (value === "wterm") {
    return "wterm";
  }

  return DEFAULT_TERMINAL_ENGINE;
}

export function isPersistentTerminalEngine(value: TerminalEngine): boolean {
  return value === "xterm";
}

export function isXtermTerminalEngine(value: TerminalEngine): boolean {
  return value === "xterm" || value === "non-persistent";
}

export function getTerminalSessionSurfaceTitle(
  session: Pick<BaseSessionRecord, "alias" | "displayId" | "sessionId" | "slotIndex" | "title">,
): string {
  return formatSessionSurfaceTitle(session);
}

export function getT3SessionSurfaceTitle(
  session: Pick<BaseSessionRecord, "alias" | "displayId" | "sessionId" | "slotIndex" | "title">,
): string {
  return formatSessionSurfaceTitle(session);
}

export function getSessionNumberFromSessionId(sessionId: string): number | undefined {
  const match = /^session-(\d+)$/.exec(sessionId);
  if (!match) {
    return undefined;
  }

  const parsedNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(parsedNumber) && parsedNumber > 0 ? parsedNumber : undefined;
}

export function getVisibleSessionNumber(
  session: Pick<BaseSessionRecord, "displayId" | "sessionId" | "slotIndex">,
): string {
  return formatSessionDisplayId(session.displayId ?? getSessionNumber(session) - 1);
}

export function getVisiblePrimaryTitle(title: string): string | undefined {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || /^Session \d+$/.test(normalizedTitle)) {
    return undefined;
  }

  return normalizedTitle;
}

export function normalizeTerminalTitle(title: string | undefined): string | undefined {
  const normalizedTitle = title?.trim();
  if (!normalizedTitle) {
    return undefined;
  }

  const sanitizedTitle = normalizedTitle
    .replace(LEADING_TERMINAL_TITLE_STATUS_MARKER_PATTERN, "")
    .replace(LEADING_TERMINAL_TITLE_PREFIX_PATTERN, "")
    .trim();
  return sanitizedTitle || undefined;
}

export function getVisibleTerminalTitle(title: string | undefined): string | undefined {
  const normalizedTitle = normalizeTerminalTitle(title);
  if (!normalizedTitle) {
    return undefined;
  }

  if (/^(~|\/)/.test(normalizedTitle)) {
    return undefined;
  }

  if (IGNORED_GENERIC_TERMINAL_TITLES.has(normalizedTitle.trim().toLowerCase())) {
    return undefined;
  }

  if (WINDOWS_DEFAULT_POWERSHELL_TITLE_PATTERN.test(normalizedTitle)) {
    return undefined;
  }

  return normalizedTitle;
}

export function getPreferredSessionTitle(
  sessionTitle: string | undefined,
  terminalTitle: string | undefined,
): string | undefined {
  const visibleTerminalTitle = getVisibleTerminalTitle(terminalTitle);
  if (visibleTerminalTitle) {
    return visibleTerminalTitle;
  }

  return sessionTitle ? getVisiblePrimaryTitle(sessionTitle) : undefined;
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

function getSessionNumber(session: Pick<BaseSessionRecord, "sessionId" | "slotIndex">): number {
  return getSessionNumberFromSessionId(session.sessionId) ?? session.slotIndex + 1;
}

function formatSessionSurfaceTitle(
  session: Pick<BaseSessionRecord, "alias" | "displayId" | "sessionId" | "slotIndex" | "title">,
): string {
  const displayId = formatSessionDisplayId(session.displayId ?? getSessionNumber(session) - 1);
  const visiblePrimaryTitle = getVisiblePrimaryTitle(session.title);
  if (visiblePrimaryTitle) {
    return `${displayId}. ${visiblePrimaryTitle}`;
  }

  return isGeneratedSessionAlias(session) ? displayId : `${displayId} ${session.alias}`;
}
