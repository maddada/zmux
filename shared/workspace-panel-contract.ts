import type {
  GroupedSessionWorkspaceSnapshot,
  TerminalViewMode,
  TerminalSessionRecord,
  T3SessionRecord,
} from "./session-grid-contract";
import type { TerminalSessionSnapshot } from "./terminal-host-protocol";

export type WorkspacePanelConnection = {
  baseUrl: string;
  mock?: boolean;
  token: string;
};

export type WorkspacePanelTerminalCursorStyle = "bar" | "block" | "underline";

export type WorkspacePanelTerminalAppearance = {
  cursorBlink: boolean;
  cursorStyle: WorkspacePanelTerminalCursorStyle;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
};

export type WorkspacePanelTerminalPane = {
  kind: "terminal";
  sessionId: string;
  sessionRecord: TerminalSessionRecord;
  snapshot?: TerminalSessionSnapshot;
  terminalTitle?: string;
};

export type WorkspacePanelT3Pane = {
  kind: "t3";
  sessionId: string;
  sessionRecord: T3SessionRecord;
  html: string;
};

export type WorkspacePanelPane = WorkspacePanelTerminalPane | WorkspacePanelT3Pane;

export type WorkspacePanelHydrateMessage = {
  type: "hydrate";
  activeGroupId: string;
  connection: WorkspacePanelConnection;
  debuggingMode: boolean;
  focusedSessionId?: string;
  panes: WorkspacePanelPane[];
  terminalAppearance: WorkspacePanelTerminalAppearance;
  viewMode: TerminalViewMode;
  visibleCount: number;
  workspaceSnapshot: GroupedSessionWorkspaceSnapshot;
};

export type WorkspacePanelSessionStateMessage = Omit<WorkspacePanelHydrateMessage, "type"> & {
  type: "sessionState";
};

export type ExtensionToWorkspacePanelMessage =
  | WorkspacePanelHydrateMessage
  | WorkspacePanelSessionStateMessage;

export type WorkspacePanelReadyMessage = {
  type: "ready";
};

export type WorkspacePanelFocusSessionMessage = {
  type: "focusSession";
  sessionId: string;
};

export type WorkspacePanelToExtensionMessage =
  | WorkspacePanelReadyMessage
  | WorkspacePanelFocusSessionMessage;
