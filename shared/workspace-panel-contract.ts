import type {
  GroupedSessionWorkspaceSnapshot,
  SessionLifecycleState,
  SidebarSessionActivityState,
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
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  scrollToBottomWhenTyping: boolean;
  xtermFrontendScrollback: number;
};

export type WorkspacePanelLayoutAppearance = {
  activePaneBorderColor: string;
  paneGap: number;
};

export type WorkspacePanelT3Appearance = {
  provider: "t3code";
  zoomPercent: number;
};

export type WorkspacePanelAutoFocusRequest = {
  requestId: number;
  sessionId: string;
  source: "sidebar" | "reload";
};

export type WorkspaceWelcomeModalMode = "optional" | "required";

export type WorkspacePanelTerminalPane = {
  activity?: SidebarSessionActivityState;
  isGeneratingFirstPromptTitle?: boolean;
  lifecycleState?: SessionLifecycleState;
  kind: "terminal";
  isVisible: boolean;
  visibleSlotIndex?: number;
  renderNonce: number;
  sessionId: string;
  sessionRecord: TerminalSessionRecord;
  snapshot?: TerminalSessionSnapshot;
  terminalTitle?: string;
};

export type WorkspacePanelT3Pane = {
  activity?: SidebarSessionActivityState;
  lifecycleState?: SessionLifecycleState;
  kind: "t3";
  isVisible: boolean;
  visibleSlotIndex?: number;
  renderNonce: number;
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
  shouldShowWelcomeModal?: boolean;
  terminalAppearance: WorkspacePanelTerminalAppearance;
  t3Appearance: WorkspacePanelT3Appearance;
  viewMode: TerminalViewMode;
  visibleCount: number;
  workspaceSnapshot: GroupedSessionWorkspaceSnapshot;
};

export type WorkspacePanelSessionStateMessage = Omit<WorkspacePanelHydrateMessage, "type"> & {
  type: "sessionState";
};

export type WorkspacePanelTerminalPresentationChangedMessage = {
  activity?: SidebarSessionActivityState;
  isGeneratingFirstPromptTitle?: boolean;
  lifecycleState?: SessionLifecycleState;
  sessionId: string;
  snapshot?: TerminalSessionSnapshot;
  terminalTitle?: string;
  type: "terminalPresentationChanged";
};

export type WorkspacePanelDestroyTerminalRuntimeMessage = {
  sessionId: string;
  type: "destroyTerminalRuntime";
};

export type WorkspacePanelScrollTerminalToBottomMessage = {
  requestId: number;
  sessionId: string;
  type: "scrollTerminalToBottom";
};

export type WorkspacePanelShowWelcomeMessage = {
  mode?: WorkspaceWelcomeModalMode;
  type: "showWelcomeModal";
};

export type WorkspacePanelShowToastMessage = {
  confirmOnTerminalEnterSessionId?: string;
  confirmedMessage?: string;
  confirmedTitle?: string;
  expiresAt: number;
  message: string;
  title: string;
  type: "showToast";
};

export type WorkspacePanelCodexWelcomeSettingAppliedMessage = {
  type: "codexWelcomeSettingApplied";
  setting: "statusLine" | "terminalTitle";
  status: "alreadySet" | "updated";
};

export type WorkspacePanelFlashCompletionSessionMessage = {
  sessionId: string;
  type: "flashCompletionSession";
};

export type WorkspacePanelClipboardFilePayload = {
  buffer: ArrayBuffer;
  name: string;
  type: string;
};

export type WorkspacePanelResolveClipboardImagePathResultMessage = {
  buffer?: ArrayBuffer;
  error?: string;
  mimeType?: string;
  name?: string;
  path: string;
  requestId: number;
  sessionId: string;
  type: "resolveClipboardImagePathResult";
};

export type WorkspacePanelReadNativeClipboardPayloadResultMessage = {
  error?: string;
  files: WorkspacePanelClipboardFilePayload[];
  requestId: number;
  sessionId: string;
  source?: string;
  text: string;
  type: "readNativeClipboardPayloadResult";
};

export type ExtensionToWorkspacePanelMessage =
  | WorkspacePanelHydrateMessage
  | WorkspacePanelSessionStateMessage
  | WorkspacePanelTerminalPresentationChangedMessage
  | WorkspacePanelDestroyTerminalRuntimeMessage
  | WorkspacePanelScrollTerminalToBottomMessage
  | WorkspacePanelShowWelcomeMessage
  | WorkspacePanelShowToastMessage
  | WorkspacePanelCodexWelcomeSettingAppliedMessage
  | WorkspacePanelFlashCompletionSessionMessage
  | WorkspacePanelResolveClipboardImagePathResultMessage
  | WorkspacePanelReadNativeClipboardPayloadResultMessage;

export type WorkspacePanelReadyMessage = {
  type: "ready";
};

export type WorkspacePanelFocusSessionMessage = {
  type: "focusSession";
  sessionId: string;
};

export type WorkspacePanelCreateSessionMessage = {
  type: "createSession";
};

export type WorkspacePanelAcknowledgeSessionAttentionReason =
  | "click"
  | "escape"
  | "focusDwell"
  | "typing";

export type WorkspacePanelAcknowledgeSessionAttentionMessage = {
  type: "acknowledgeSessionAttention";
  reason: WorkspacePanelAcknowledgeSessionAttentionReason;
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

export type WorkspacePanelPromptRenameSessionMessage = {
  type: "promptRenameSession";
  sessionId: string;
};

export type WorkspacePanelCancelFirstPromptAutoRenameMessage = {
  type: "cancelFirstPromptAutoRename";
  sessionId: string;
};

export type WorkspacePanelAdjustTerminalFontSizeMessage = {
  delta: -1 | 1;
  type: "adjustTerminalFontSize";
};

export type WorkspacePanelResetTerminalFontSizeMessage = {
  type: "resetTerminalFontSize";
};

export type WorkspacePanelAdjustT3ZoomPercentMessage = {
  delta: -1 | 1;
  type: "adjustT3ZoomPercent";
};

export type WorkspacePanelResetT3ZoomPercentMessage = {
  type: "resetT3ZoomPercent";
};

export type WorkspacePanelForkSessionMessage = {
  type: "forkSession";
  sessionId: string;
};

export type WorkspacePanelSetSessionSleepingMessage = {
  type: "setSessionSleeping";
  sessionId: string;
  sleeping: boolean;
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
  details?: unknown;
  event: string;
  type: "workspaceDebugLog";
};

export type WorkspacePanelReloadMessage = {
  sessionId?: string;
  type: "reloadWorkspacePanel";
};

export type WorkspacePanelReloadT3SessionMessage = {
  sessionId: string;
  type: "reloadT3Session";
};

export type WorkspacePanelResolveClipboardImagePathMessage = {
  path: string;
  requestId: number;
  sessionId: string;
  type: "resolveClipboardImagePath";
};

export type WorkspacePanelReadNativeClipboardPayloadMessage = {
  requestId: number;
  sessionId: string;
  type: "readNativeClipboardPayload";
};

export type WorkspacePanelT3ThreadChangedMessage = {
  sessionId: string;
  threadId: string;
  title?: string;
  type: "t3ThreadChanged";
};

export type WorkspacePanelT3WorkingStartedAtChangedMessage = {
  sessionId: string;
  type: "t3WorkingStartedAtChanged";
  workingStartedAt?: string;
};

export type WorkspacePanelCompleteWelcomeMessage = {
  type: "completeWelcome";
};

export type WorkspacePanelApplyCodexTerminalTitleMessage = {
  type: "applyCodexTerminalTitle";
};

export type WorkspacePanelApplyCodexStatusLineMessage = {
  type: "applyCodexStatusLine";
};

export type WorkspacePanelToExtensionMessage =
  | WorkspacePanelReadyMessage
  | WorkspacePanelCompleteWelcomeMessage
  | WorkspacePanelApplyCodexTerminalTitleMessage
  | WorkspacePanelApplyCodexStatusLineMessage
  | WorkspacePanelDebugLogMessage
  | WorkspacePanelCreateSessionMessage
  | WorkspacePanelAcknowledgeSessionAttentionMessage
  | WorkspacePanelFocusSessionMessage
  | WorkspacePanelCloseSessionMessage
  | WorkspacePanelFullReloadSessionMessage
  | WorkspacePanelPromptRenameSessionMessage
  | WorkspacePanelCancelFirstPromptAutoRenameMessage
  | WorkspacePanelAdjustTerminalFontSizeMessage
  | WorkspacePanelResetTerminalFontSizeMessage
  | WorkspacePanelAdjustT3ZoomPercentMessage
  | WorkspacePanelResetT3ZoomPercentMessage
  | WorkspacePanelForkSessionMessage
  | WorkspacePanelSetSessionSleepingMessage
  | WorkspacePanelSyncPaneOrderMessage
  | WorkspacePanelSyncSessionOrderMessage
  | WorkspacePanelReloadMessage
  | WorkspacePanelReloadT3SessionMessage
  | WorkspacePanelResolveClipboardImagePathMessage
  | WorkspacePanelReadNativeClipboardPayloadMessage
  | WorkspacePanelT3ThreadChangedMessage
  | WorkspacePanelT3WorkingStartedAtChangedMessage;

export function stripWorkspacePanelTransientFields(
  message: ExtensionToWorkspacePanelMessage,
): ExtensionToWorkspacePanelMessage {
  if (message.type !== "hydrate" && message.type !== "sessionState") {
    return message;
  }

  if (!message.autoFocusRequest) {
    return message;
  }

  const { autoFocusRequest: _autoFocusRequest, ...stableMessage } = message;
  return stableMessage;
}
