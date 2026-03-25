export const GRID_COLUMN_COUNT = 3;
export const MAX_SESSION_COUNT = GRID_COLUMN_COUNT * GRID_COLUMN_COUNT;
export const MAX_GROUP_COUNT = 4;
export const MAX_SESSION_DISPLAY_ID_COUNT = 100;
export const DEFAULT_MAIN_GROUP_ID = "group-1";
export const DEFAULT_MAIN_GROUP_TITLE = "Main";

export type VisibleSessionCount = 1 | 2 | 3 | 4 | 6 | 9;

export type TerminalViewMode = "horizontal" | "vertical" | "grid";

export type SessionGridDirection = "up" | "right" | "down" | "left";

export type SidebarSessionActivityState = "idle" | "working" | "attention";

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

export type T3SessionMetadata = {
  projectId: string;
  serverOrigin: string;
  threadId: string;
  workspaceRoot: string;
};

export type BrowserSessionMetadata = {
  url: string;
};

export type BaseSessionRecord = {
  kind: SessionKind;
  sessionId: string;
  displayId: string;
  title: string;
  alias: string;
  slotIndex: number;
  row: number;
  column: number;
  createdAt: string;
};

export type TerminalSessionRecord = BaseSessionRecord & {
  kind: "terminal";
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
      kind: "browser";
      title?: string;
    }
  | {
      displayId?: string;
      kind?: "terminal";
      title?: string;
    }
  | {
      displayId?: string;
      kind: "t3";
      t3: T3SessionMetadata;
      title?: string;
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
