import * as path from "node:path";
import * as vscode from "vscode";
import { WebSocket, type RawData } from "ws";

const AGENT_MANAGER_X_BRIDGE_URL = "ws://127.0.0.1:47652/zmux";
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 5_000;

export type AgentManagerXSessionKind = "terminal" | "t3";

export type AgentManagerXSessionStatus = "idle" | "working" | "attention";

export type AgentManagerXWorkspaceSession = {
  agent: string;
  alias: string;
  displayName: string;
  isFocused: boolean;
  isRunning: boolean;
  isVisible: boolean;
  kind: AgentManagerXSessionKind;
  lastActiveAt: string;
  sessionId: string;
  status: AgentManagerXSessionStatus;
  terminalTitle?: string;
  threadId?: string;
};

export type AgentManagerXWorkspaceSnapshotMessage = {
  sessions: AgentManagerXWorkspaceSession[];
  type: "workspaceSnapshot";
  updatedAt: string;
  workspaceFaviconDataUrl?: string;
  workspaceId: string;
  workspaceName: string;
  workspacePath: string;
};

type AgentManagerXIncomingMessage =
  | {
      sessionId: string;
      type: "focusSession";
      workspaceId: string;
    }
  | {
      sessionId: string;
      type: "closeSession";
      workspaceId: string;
    }
  | {
      type: "ping";
    };

type AgentManagerXBridgeClientOptions = {
  onCloseSession: (sessionId: string) => Promise<void> | void;
  onFocusSession: (sessionId: string) => Promise<void> | void;
  onLog?: (event: string, details?: Record<string, unknown>) => void;
};

export class AgentManagerXBridgeClient implements vscode.Disposable {
  private disposed = false;
  private latestSnapshot: AgentManagerXWorkspaceSnapshotMessage | undefined;
  private reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private socket: WebSocket | undefined;
  private lastSentSerializedSnapshot: string | undefined;

  public constructor(private readonly options: AgentManagerXBridgeClientOptions) {
    this.connect();
  }

  public dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close();
    this.socket = undefined;
  }

  public updateSnapshot(snapshot: AgentManagerXWorkspaceSnapshotMessage): void {
    this.latestSnapshot = {
      ...snapshot,
      sessions: [...snapshot.sessions],
    };
    this.sendLatestSnapshotIfPossible();
  }

  public static getWorkspaceName(workspacePath: string): string {
    const trimmedPath = workspacePath.trim();
    if (!trimmedPath) {
      return "Workspace";
    }

    return path.basename(trimmedPath) || trimmedPath;
  }

  private connect(): void {
    if (this.disposed) {
      return;
    }
    if (this.socket) {
      const readyState = this.socket.readyState;
      if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    this.options.onLog?.("agentManagerXBridge.connecting", {
      url: AGENT_MANAGER_X_BRIDGE_URL,
    });
    const socket = new WebSocket(AGENT_MANAGER_X_BRIDGE_URL, {
      handshakeTimeout: 3_000,
      perMessageDeflate: false,
    });
    this.socket = socket;

    socket.on("open", () => {
      if (this.socket !== socket || this.disposed) {
        socket.close();
        return;
      }

      this.options.onLog?.("agentManagerXBridge.open");
      this.reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
      this.lastSentSerializedSnapshot = undefined;
      this.sendLatestSnapshotIfPossible();
    });

    socket.on("message", (data) => {
      if (this.socket !== socket || this.disposed) {
        return;
      }

      this.handleMessage(normalizeBridgeMessageData(data));
    });

    socket.on("close", (code, reasonBuffer) => {
      this.options.onLog?.("agentManagerXBridge.close", {
        code,
        reason: reasonBuffer.toString(),
      });
      this.handleDisconnect(socket);
    });

    socket.on("error", (error) => {
      this.options.onLog?.("agentManagerXBridge.error", {
        message: error.message,
      });
    });
  }

  private handleDisconnect(socket: WebSocket): void {
    if (this.socket === socket) {
      this.socket = undefined;
    }
    if (this.disposed) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    const delayMs = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  private sendLatestSnapshotIfPossible(): void {
    if (!this.latestSnapshot || this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    const serializedSnapshot = JSON.stringify(this.latestSnapshot);
    if (serializedSnapshot === this.lastSentSerializedSnapshot) {
      return;
    }

    this.socket.send(serializedSnapshot);
    this.lastSentSerializedSnapshot = serializedSnapshot;
    this.options.onLog?.("agentManagerXBridge.snapshotSent", {
      sessionCount: this.latestSnapshot.sessions.length,
      workspaceId: this.latestSnapshot.workspaceId,
    });
  }

  private handleMessage(rawMessage: string): void {
    let parsed: AgentManagerXIncomingMessage | undefined;
    try {
      parsed = JSON.parse(rawMessage) as AgentManagerXIncomingMessage;
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    if (parsed.type === "ping") {
      return;
    }

    if (
      (parsed.type === "focusSession" || parsed.type === "closeSession") &&
      typeof parsed.workspaceId === "string" &&
      typeof parsed.sessionId === "string" &&
      parsed.workspaceId === this.latestSnapshot?.workspaceId
    ) {
      if (parsed.type === "focusSession") {
        void Promise.resolve(this.options.onFocusSession(parsed.sessionId));
        return;
      }

      void Promise.resolve(this.options.onCloseSession(parsed.sessionId));
    }
  }
}

function normalizeBridgeMessageData(data: RawData): string {
  if (typeof data === "string") {
    return data;
  }
  if (Array.isArray(data)) {
    return Buffer.concat(
      data.map((chunk) =>
        chunk instanceof ArrayBuffer ? Buffer.from(new Uint8Array(chunk)) : Buffer.from(chunk),
      ),
    ).toString("utf8");
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(data)).toString("utf8");
  }

  return Buffer.from(data).toString("utf8");
}
