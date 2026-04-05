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
  workspaceId: string;
};

export type WorkspacePanelTerminalCursorStyle = "bar" | "block" | "underline";

export type WorkspacePanelTerminalAppearance = {
  cursorBlink: boolean;
  cursorStyle: WorkspacePanelTerminalCursorStyle;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  scrollToBottomWhenTyping: boolean;
};

export type WorkspacePanelLayoutAppearance = {
  activePaneBorderColor: string;
  paneGap: number;
};

export type WorkspacePanelAutoFocusRequest = {
  requestId: number;
  sessionId: string;
  source: "sidebar";
};

export type WorkspacePanelTerminalPane = {
  kind: "terminal";
  isVisible: boolean;
  renderNonce: number;
  sessionId: string;
  sessionRecord: TerminalSessionRecord;
  snapshot?: TerminalSessionSnapshot;
  terminalTitle?: string;
};

export type WorkspacePanelT3Pane = {
  kind: "t3";
  isVisible: boolean;
  sessionId: string;
  sessionRecord: T3SessionRecord;
  html: string;
};

export type WorkspacePanelPane = WorkspacePanelTerminalPane | WorkspacePanelT3Pane;

export type WorkspacePanelHydrateMessage = {
  type: "hydrate";
  activeGroupId: string;
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelConnection;
  debuggingMode: boolean;
  focusedSessionId?: string;
  layoutAppearance: WorkspacePanelLayoutAppearance;
  panes: WorkspacePanelPane[];
  terminalAppearance: WorkspacePanelTerminalAppearance;
  viewMode: TerminalViewMode;
  visibleCount: number;
  workspaceSnapshot: GroupedSessionWorkspaceSnapshot;
};

export type WorkspacePanelSessionStateMessage = Omit<WorkspacePanelHydrateMessage, "type"> & {
  type: "sessionState";
};

export type WorkspacePanelTerminalPresentationChangedMessage = {
  sessionId: string;
  snapshot?: TerminalSessionSnapshot;
  terminalTitle?: string;
  type: "terminalPresentationChanged";
};

export type WorkspacePanelDestroyTerminalRuntimeMessage = {
  sessionId: string;
  type: "destroyTerminalRuntime";
};

export type ExtensionToWorkspacePanelMessage =
  | WorkspacePanelHydrateMessage
  | WorkspacePanelSessionStateMessage
  | WorkspacePanelTerminalPresentationChangedMessage
  | WorkspacePanelDestroyTerminalRuntimeMessage;

export type WorkspacePanelReadyMessage = {
  type: "ready";
};

export type WorkspacePanelFocusSessionMessage = {
  type: "focusSession";
  sessionId: string;
};

export type WorkspacePanelCloseSessionMessage = {
  type: "closeSession";
  sessionId: string;
};

export type WorkspacePanelFullReloadSessionMessage = {
  type: "fullReloadSession";
  sessionId: string;
};

export type WorkspacePanelSyncSessionOrderMessage = {
  type: "syncSessionOrder";
  groupId: string;
  sessionIds: string[];
};

export type WorkspacePanelSyncPaneOrderMessage = {
  type: "syncPaneOrder";
  groupId: string;
  sessionIds: string[];
};

export type WorkspacePanelDebugLogMessage = {
  details?: string;
  event: string;
  type: "workspaceDebugLog";
};

export type WorkspacePanelToExtensionMessage =
  | WorkspacePanelReadyMessage
  | WorkspacePanelFocusSessionMessage
  | WorkspacePanelCloseSessionMessage
  | WorkspacePanelFullReloadSessionMessage
  | WorkspacePanelSyncPaneOrderMessage
  | WorkspacePanelSyncSessionOrderMessage
  | WorkspacePanelDebugLogMessage;

export function stripWorkspacePanelTransientFields(
  message: ExtensionToWorkspacePanelMessage,
): ExtensionToWorkspacePanelMessage {
  if (
    message.type === "terminalPresentationChanged" ||
    message.type === "destroyTerminalRuntime" ||
    !message.autoFocusRequest
  ) {
    return message;
  }

  const { autoFocusRequest: _autoFocusRequest, ...stableMessage } = message;
  return stableMessage;
}
