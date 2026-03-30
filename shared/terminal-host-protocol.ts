export const TERMINAL_HOST_PROTOCOL_VERSION = 13;

export type TerminalSessionStatus = "starting" | "running" | "exited" | "error" | "disconnected";

export type TerminalSessionRestoreState = "live" | "replayed";

export type TerminalAgentStatus = "idle" | "working" | "attention";

export type TerminalSessionSnapshot = {
  agentName?: string;
  agentStatus: TerminalAgentStatus;
  cols: number;
  cwd: string;
  exitCode?: number;
  history?: string;
  isAttached: boolean;
  restoreState: TerminalSessionRestoreState;
  rows: number;
  sessionId: string;
  shell: string;
  startedAt: string;
  status: TerminalSessionStatus;
  title?: string;
  workspaceId: string;
  endedAt?: string;
  errorMessage?: string;
};

export type TerminalSessionsBySessionId = Record<string, TerminalSessionSnapshot>;

export type TerminalHostAuthenticateRequest = {
  type: "authenticate";
  token: string;
  version: typeof TERMINAL_HOST_PROTOCOL_VERSION;
};

export type TerminalHostCreateOrAttachRequest = {
  type: "createOrAttach";
  requestId: string;
  sessionId: string;
  workspaceId: string;
  cols: number;
  cwd: string;
  rows: number;
  sessionStateFilePath: string;
  shell: string;
};

export type TerminalHostWriteRequest = {
  type: "write";
  workspaceId: string;
  sessionId: string;
  data: string;
};

export type TerminalHostResizeRequest = {
  type: "resize";
  workspaceId: string;
  sessionId: string;
  cols: number;
  rows: number;
};

export type TerminalHostKillRequest = {
  type: "kill";
  workspaceId: string;
  sessionId: string;
};

export type TerminalHostAcknowledgeAttentionRequest = {
  type: "acknowledgeAttention";
  workspaceId: string;
  sessionId: string;
};

export type TerminalHostListSessionsRequest = {
  type: "listSessions";
  requestId: string;
  workspaceId?: string;
};

export type TerminalHostConfigureRequest = {
  type: "configure";
  requestId: string;
  idleShutdownTimeoutMs: number | null;
};

export type TerminalHostRequest =
  | TerminalHostAuthenticateRequest
  | TerminalHostCreateOrAttachRequest
  | TerminalHostWriteRequest
  | TerminalHostResizeRequest
  | TerminalHostKillRequest
  | TerminalHostAcknowledgeAttentionRequest
  | TerminalHostListSessionsRequest
  | TerminalHostConfigureRequest;

export type TerminalHostAuthenticatedEvent = {
  type: "authenticated";
};

export type TerminalHostResponse =
  | {
      type: "response";
      requestId: string;
      ok: true;
    }
  | {
      type: "response";
      requestId: string;
      ok: true;
      session: TerminalSessionSnapshot;
    }
  | {
      type: "response";
      requestId: string;
      ok: true;
      sessions: TerminalSessionSnapshot[];
    }
  | {
      type: "response";
      requestId: string;
      ok: false;
      error: string;
    };

export type TerminalHostSessionOutputEvent = {
  type: "sessionOutput";
  sessionId: string;
  data: string;
};

export type TerminalHostSessionStateEvent = {
  type: "sessionState";
  session: TerminalSessionSnapshot;
};

export type TerminalHostEvent =
  | TerminalHostAuthenticatedEvent
  | TerminalHostResponse
  | TerminalHostSessionOutputEvent
  | TerminalHostSessionStateEvent;

export type TerminalInputMessage = {
  type: "terminalInput";
  sessionId: string;
  data: string;
};

export type TerminalResizeMessage = {
  type: "terminalResize";
  sessionId: string;
  cols: number;
  rows: number;
};

export type TerminalStateMessage = {
  type: "terminalSessionState";
  session: TerminalSessionSnapshot;
};

export type TerminalOutputMessage = {
  type: "terminalOutput";
  sessionId: string;
  data: string;
};
