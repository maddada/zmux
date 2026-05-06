export const GRID_COLUMN_COUNT = 3;
export const MAX_SESSION_COUNT = GRID_COLUMN_COUNT * GRID_COLUMN_COUNT;
export const MAX_GROUP_COUNT = 20;
export const MAX_SESSION_DISPLAY_ID_COUNT = 100;
export const DEFAULT_AGENT_MANAGER_ZOOM_PERCENT = 100;
export const MIN_AGENT_MANAGER_ZOOM_PERCENT = 50;
export const MAX_AGENT_MANAGER_ZOOM_PERCENT = 200;
export const DEFAULT_MAIN_GROUP_ID = "group-1";
export const DEFAULT_MAIN_GROUP_TITLE = "Main";

export type VisibleSessionCount = 1 | 2 | 3 | 4 | 6 | 9;

export type TerminalViewMode = "horizontal" | "vertical" | "grid";

export type SessionGridDirection = "up" | "right" | "down" | "left";

export type SidebarSessionActivityState = "idle" | "working" | "attention";
export type SessionLifecycleState = "running" | "done" | "sleeping" | "error";
/**
 * CDXC:SessionTitleSync 2026-04-27-17:45
 * Session titles keep provenance so restart restore can trust real terminal
 * titles and browser page titles while rejecting placeholders, shell paths,
 * command names, and legacy auto-captured noise such as mojibake.
 *
 * CDXC:BrowserPanes 2026-05-03-01:58
 * Browser pane cards and native title bars use webpage titles supplied by the
 * embedded WKWebView. Track that source separately from terminal OSC/window
 * titles so browser reloads can refresh page identity without looking like a
 * user rename.
 */
export type SessionTitleSource =
  | "browser-auto"
  | "generated"
  | "placeholder"
  | "terminal-auto"
  | "user";

export type SidebarTheme =
  | "plain-dark"
  | "plain-light"
  | "dark-green"
  | "dark-blue"
  | "dark-red"
  | "dark-pink"
  | "dark-orange"
  | "light-blue"
  | "light-green"
  | "light-pink"
  | "light-orange";

export type SidebarThemeSetting =
  | "auto"
  | "plain"
  | "dark-green"
  | "dark-blue"
  | "dark-red"
  | "dark-pink"
  | "dark-orange"
  | "light-blue"
  | "light-green"
  | "light-pink"
  | "light-orange";

export type SidebarThemeVariant = "light" | "dark";

export type SessionKind = "browser" | "terminal" | "t3";
export type TerminalEngine = "ghostty-native";

export type T3SessionMetadata = {
  boundThreadId?: string;
  projectId: string;
  serverOrigin: string;
  threadId: string;
  workspaceRoot: string;
};

export type BrowserSessionMetadata = {
  faviconDataUrl?: string;
  url: string;
};

export type BaseSessionRecord = {
  kind: SessionKind;
  sessionId: string;
  displayId: string;
  firstUserMessage?: string;
  title: string;
  titleSource?: SessionTitleSource;
  alias: string;
  isFavorite?: boolean;
  isSleeping?: boolean;
  slotIndex: number;
  row: number;
  column: number;
  createdAt: string;
};

export type TerminalSessionRecord = BaseSessionRecord & {
  agentName?: string;
  kind: "terminal";
  sessionPersistenceName?: string;
  terminalEngine: TerminalEngine;
  /** @deprecated use sessionPersistenceName for tmux, zmx, and zellij providers. */
  tmuxSessionName?: string;
};

export type T3SessionRecord = BaseSessionRecord & {
  kind: "t3";
  t3: T3SessionMetadata;
};

export type BrowserSessionRecord = BaseSessionRecord & {
  browser: BrowserSessionMetadata;
  kind: "browser";
};

export type SessionRecord = BrowserSessionRecord | TerminalSessionRecord | T3SessionRecord;

export type CreateSessionRecordOptions =
  | {
      browser: BrowserSessionMetadata;
      displayId?: string;
      initialPresentation?: "background" | "focused";
      kind: "browser";
      sessionId?: string;
      title?: string;
      titleSource?: SessionTitleSource;
    }
  | {
      agentName?: string;
      displayId?: string;
      initialPresentation?: "background" | "focused";
      kind?: "terminal";
      sessionId?: string;
      sessionPersistenceName?: string;
      terminalEngine?: TerminalEngine;
      /** @deprecated use sessionPersistenceName for tmux, zmx, and zellij providers. */
      tmuxSessionName?: string;
      title?: string;
      titleSource?: SessionTitleSource;
    }
  | {
      displayId?: string;
      initialPresentation?: "background" | "focused";
      kind: "t3";
      sessionId?: string;
      t3: T3SessionMetadata;
      title?: string;
      titleSource?: SessionTitleSource;
    };

export type SessionGridSnapshot = {
  focusedSessionId?: string;
  fullscreenRestoreVisibleCount?: VisibleSessionCount;
  sessions: SessionRecord[];
  visibleCount: VisibleSessionCount;
  visibleSessionIds: string[];
  viewMode: TerminalViewMode;
};

export type SessionGroupRecord = {
  groupId: string;
  snapshot: SessionGridSnapshot;
  title: string;
};

export type GroupedSessionWorkspaceSnapshot = {
  activeGroupId: string;
  groups: SessionGroupRecord[];
  nextGroupNumber: number;
  nextSessionDisplayId: number;
  nextSessionNumber: number;
};
