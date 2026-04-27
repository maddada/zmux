import * as vscode from "vscode";
import {
  haveSameThreadStateMaps,
  resolveThreadActivity,
  type SnapshotThread,
  type SnapshotResponse,
  type T3ThreadActivityState,
} from "./t3-activity-state";
import {
  createT3RpcRequestMessage,
  createT3RpcRequestId,
  formatT3RpcFailure,
  parseT3RpcIncomingMessage,
} from "./t3-rpc-protocol";
import { logzmuxDebug } from "./zmux-debug-log";

const DEFAULT_T3_WEBSOCKET_URL = "ws://127.0.0.1:3774/ws";
const DOMAIN_EVENT_CHANNEL = "orchestration.domainEvent";
const REQUEST_TIMEOUT_MS = 15_000;
const RECONNECT_DELAY_MS = 1_500;
const REFRESH_DEBOUNCE_MS = 100;
const SNAPSHOT_POLL_INTERVAL_MS = 2_500;
type T3ActivityMonitorOptions = {
  getSnapshot?: () => SnapshotResponse | Promise<SnapshotResponse>;
  getWebSocketUrl?: () => string | Promise<string>;
};

type PendingSnapshotRequest = {
  requestId: string;
  reject: (error: Error) => void;
  resolve: (snapshot: SnapshotResponse) => void;
  timeout: NodeJS.Timeout;
};

export class T3ActivityMonitor implements vscode.Disposable {
  private readonly acknowledgedCompletionMarkerByThreadId = new Map<string, string>();
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  private readonly threadSnapshotByThreadId = new Map<string, SnapshotThread>();
  private readonly threadStateByThreadId = new Map<string, T3ThreadActivityState>();
  private readonly threadTitleByThreadId = new Map<string, string>();
  private socket: WebSocket | undefined;
  private enabled = false;
  private pollTimer: NodeJS.Timeout | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private refreshTimer: NodeJS.Timeout | undefined;
  private connectPromise: Promise<WebSocket> | undefined;
  private refreshPromise: Promise<void> | undefined;
  private pendingSnapshotRequest: PendingSnapshotRequest | undefined;

  public readonly onDidChange = this.changeEmitter.event;

  public constructor(private readonly options: T3ActivityMonitorOptions = {}) {}

  public dispose(): void {
    this.enabled = false;
    this.clearPollTimer();
    this.clearReconnectTimer();
    this.clearRefreshTimer();
    this.rejectPendingSnapshotRequest(new Error("T3 activity monitor disposed."));
    this.socket?.close();
    this.socket = undefined;
    this.threadSnapshotByThreadId.clear();
    this.threadStateByThreadId.clear();
    this.threadTitleByThreadId.clear();
    this.acknowledgedCompletionMarkerByThreadId.clear();
    this.changeEmitter.dispose();
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    if (enabled === this.enabled) {
      logzmuxDebug("t3.activityMonitor.setEnabled.noop", { enabled });
      return;
    }

    logzmuxDebug("t3.activityMonitor.setEnabled", {
      enabled,
      previousEnabled: this.enabled,
      trackedThreadCount: this.threadStateByThreadId.size,
      trackedTitleCount: this.threadTitleByThreadId.size,
    });
    this.enabled = enabled;
    if (!enabled) {
      this.clearPollTimer();
      this.clearReconnectTimer();
      this.clearRefreshTimer();
      this.rejectPendingSnapshotRequest(new Error("T3 activity monitor disabled."));
      this.socket?.close();
      this.socket = undefined;
      const changed = this.threadStateByThreadId.size > 0 || this.threadTitleByThreadId.size > 0;
      this.threadSnapshotByThreadId.clear();
      this.threadStateByThreadId.clear();
      this.threadTitleByThreadId.clear();
      this.acknowledgedCompletionMarkerByThreadId.clear();
      if (changed) {
        this.changeEmitter.fire();
      }
      return;
    }

    this.ensurePolling();
    await this.refreshSnapshot();
  }

  public getThreadActivity(threadId: string): T3ThreadActivityState | undefined {
    return this.threadStateByThreadId.get(threadId);
  }

  public getThreadTitle(threadId: string): string | undefined {
    return this.threadTitleByThreadId.get(threadId);
  }

  public getThreadSnapshot(threadId: string): SnapshotThread | undefined {
    return this.threadSnapshotByThreadId.get(threadId);
  }

  public getProjectThreads(projectId: string): SnapshotThread[] {
    if (!projectId.trim()) {
      return [];
    }

    return [...this.threadSnapshotByThreadId.values()].filter(
      (thread) =>
        thread.projectId === projectId && !thread.deletedAt && typeof thread.id === "string",
    );
  }

  public acknowledgeThread(threadId: string): boolean {
    const state = this.threadStateByThreadId.get(threadId);
    if (!state?.completionMarker || state.activity !== "attention") {
      return false;
    }

    this.acknowledgedCompletionMarkerByThreadId.set(threadId, state.completionMarker);
    this.threadStateByThreadId.set(threadId, {
      ...state,
      activity: "idle",
    });
    this.changeEmitter.fire();
    return true;
  }

  public async refreshSnapshot(): Promise<void> {
    if (!this.enabled) {
      logzmuxDebug("t3.activityMonitor.refreshSnapshot.skippedDisabled");
      return;
    }

    this.refreshPromise ??= (async () => {
      logzmuxDebug("t3.activityMonitor.refreshSnapshot.start", {
        hasSocket: this.socket !== undefined,
        hasPendingRequest: this.pendingSnapshotRequest !== undefined,
      });
      try {
        const snapshot = await this.requestSnapshot();
        this.clearReconnectTimer();
        this.applySnapshot(snapshot);
        logzmuxDebug("t3.activityMonitor.refreshSnapshot.completed", {
          threadCount: snapshot.threads?.length ?? 0,
        });
      } catch (error) {
        logzmuxDebug("t3.activityMonitor.refreshSnapshot.failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.scheduleReconnect();
      } finally {
        this.refreshPromise = undefined;
      }
    })();

    await this.refreshPromise;
  }

  private async requestSnapshot(): Promise<SnapshotResponse> {
    if (this.options.getSnapshot) {
      logzmuxDebug("t3.activityMonitor.requestSnapshot.fetch");
      return await this.options.getSnapshot();
    }

    const socket = await this.connect();
    const requestId = createT3RpcRequestId();
    logzmuxDebug("t3.activityMonitor.requestSnapshot.sent", {
      requestId,
      socketReadyState: socket.readyState,
    });

    return new Promise<SnapshotResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingSnapshotRequest?.timeout === timeout) {
          this.pendingSnapshotRequest = undefined;
        }
        logzmuxDebug("t3.activityMonitor.requestSnapshot.timeout", { requestId });
        reject(new Error("Timed out waiting for T3 activity snapshot."));
      }, REQUEST_TIMEOUT_MS);

      this.pendingSnapshotRequest = {
        requestId,
        reject,
        resolve,
        timeout,
      };

      try {
        socket.send(
          JSON.stringify(createT3RpcRequestMessage(requestId, "orchestration.getSnapshot")),
        );
      } catch (error) {
        clearTimeout(timeout);
        this.pendingSnapshotRequest = undefined;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private async connect(): Promise<WebSocket> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      logzmuxDebug("t3.activityMonitor.connect.reuseOpenSocket");
      return this.socket;
    }

    this.connectPromise ??= (async () => {
      const wsUrl = await this.getWebSocketUrl();
      logzmuxDebug("t3.activityMonitor.connect.start", {
        url: redactWebSocketUrl(wsUrl),
      });
      const socket = new WebSocket(wsUrl);

      return await new Promise<WebSocket>((resolve, reject) => {
        const handleOpen = () => {
          this.socket = socket;
          socket.addEventListener("message", handleMessage);
          socket.addEventListener("close", handleClose);
          logzmuxDebug("t3.activityMonitor.connect.open", {
            url: redactWebSocketUrl(wsUrl),
          });
          resolve(socket);
        };

        const handleError = (event: Event) => {
          logzmuxDebug("t3.activityMonitor.connect.error", {
            eventType: event.type,
            url: redactWebSocketUrl(wsUrl),
          });
          reject(new Error("Failed to connect to the T3 activity websocket."));
        };

        const handleClose = () => {
          if (this.socket === socket) {
            this.socket = undefined;
          }
          logzmuxDebug("t3.activityMonitor.connect.close", {
            enabled: this.enabled,
          });
          this.rejectPendingSnapshotRequest(new Error("T3 activity websocket closed."));
          if (this.enabled) {
            this.scheduleReconnect();
          }
        };

        const handleMessage = (event: MessageEvent) => {
          this.handleMessage(event.data);
        };

        socket.addEventListener("open", handleOpen, { once: true });
        socket.addEventListener("error", handleError, { once: true });
      });
    })().finally(() => {
      this.connectPromise = undefined;
    });

    return this.connectPromise;
  }

  private handleMessage(raw: string | ArrayBuffer | Blob): void {
    const message = parseT3RpcIncomingMessage(raw);
    if (!message) {
      logzmuxDebug("t3.activityMonitor.message.ignored", {
        rawType: describeMessagePayload(raw),
      });
      return;
    }

    if (message._tag === "Push") {
      logzmuxDebug("t3.activityMonitor.message.push", {
        channel: message.channel,
      });
      if (message.channel === DOMAIN_EVENT_CHANNEL) {
        this.scheduleSnapshotRefresh();
      }
      return;
    }

    if (message._tag !== "Exit") {
      return;
    }

    if (
      !this.pendingSnapshotRequest ||
      message.requestId !== this.pendingSnapshotRequest.requestId
    ) {
      return;
    }

    const pendingRequest = this.pendingSnapshotRequest;
    this.pendingSnapshotRequest = undefined;
    clearTimeout(pendingRequest.timeout);
    if (message.exit._tag === "Failure") {
      logzmuxDebug("t3.activityMonitor.message.exitFailure", {
        requestId: message.requestId,
        error: formatT3RpcFailure(message.exit, "The T3 activity snapshot request failed."),
      });
      pendingRequest.reject(
        new Error(formatT3RpcFailure(message.exit, "The T3 activity snapshot request failed.")),
      );
      return;
    }

    logzmuxDebug("t3.activityMonitor.message.exitSuccess", {
      requestId: message.requestId,
      threadCount: ((message.exit.value as SnapshotResponse | undefined)?.threads ?? []).length,
    });
    pendingRequest.resolve((message.exit.value ?? {}) as SnapshotResponse);
  }

  private applySnapshot(snapshot: SnapshotResponse): void {
    const nextThreadSnapshotByThreadId = new Map<string, SnapshotThread>();
    const nextStateByThreadId = new Map<string, T3ThreadActivityState>();
    const nextTitleByThreadId = new Map<string, string>();

    for (const thread of snapshot.threads ?? []) {
      if (!thread.id || thread.deletedAt) {
        continue;
      }

      nextThreadSnapshotByThreadId.set(thread.id, thread);

      if (thread.title?.trim()) {
        nextTitleByThreadId.set(thread.id, thread.title);
      }

      const previousState = this.threadStateByThreadId.get(thread.id);
      const nextState = resolveThreadActivity(thread, previousState);
      const acknowledgedCompletionMarker =
        nextState.completionMarker &&
        this.acknowledgedCompletionMarkerByThreadId.get(thread.id) === nextState.completionMarker;

      if (nextState.activity === "attention" && acknowledgedCompletionMarker) {
        nextStateByThreadId.set(thread.id, {
          ...nextState,
          activity: "idle",
        });
        continue;
      }

      nextStateByThreadId.set(thread.id, nextState);
    }

    const activityChanged = !haveSameThreadStateMaps(
      this.threadStateByThreadId,
      nextStateByThreadId,
    );
    const titlesChanged = !haveSameThreadTitleMaps(this.threadTitleByThreadId, nextTitleByThreadId);

    if (activityChanged) {
      this.threadStateByThreadId.clear();
      for (const [threadId, state] of nextStateByThreadId) {
        this.threadStateByThreadId.set(threadId, state);
      }
    } else {
      this.threadStateByThreadId.clear();
      for (const [threadId, state] of nextStateByThreadId) {
        this.threadStateByThreadId.set(threadId, state);
      }
    }

    this.threadSnapshotByThreadId.clear();
    for (const [threadId, thread] of nextThreadSnapshotByThreadId) {
      this.threadSnapshotByThreadId.set(threadId, thread);
    }

    this.threadTitleByThreadId.clear();
    for (const [threadId, title] of nextTitleByThreadId) {
      this.threadTitleByThreadId.set(threadId, title);
    }

    logzmuxDebug("t3.activityMonitor.applySnapshot", {
      activityChanged,
      titlesChanged,
      trackedThreadCount: nextStateByThreadId.size,
      trackedTitleCount: nextTitleByThreadId.size,
      threads: [...nextStateByThreadId.entries()].map(([threadId, state]) => ({
        activity: state.activity,
        completionMarker: state.completionMarker,
        isRunning: state.isRunning,
        lastInteractionAt: state.lastInteractionAt,
        threadId,
        title: nextTitleByThreadId.get(threadId),
      })),
    });
    if (activityChanged || titlesChanged) {
      this.changeEmitter.fire();
    }
  }

  private scheduleSnapshotRefresh(): void {
    if (!this.enabled || this.refreshTimer) {
      return;
    }

    logzmuxDebug("t3.activityMonitor.scheduleSnapshotRefresh");
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      void this.refreshSnapshot();
    }, REFRESH_DEBOUNCE_MS);
  }

  private scheduleReconnect(): void {
    if (!this.enabled || this.reconnectTimer) {
      return;
    }

    logzmuxDebug("t3.activityMonitor.scheduleReconnect");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.refreshSnapshot();
    }, RECONNECT_DELAY_MS);
    this.reconnectTimer.unref?.();
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private clearRefreshTimer(): void {
    if (!this.refreshTimer) {
      return;
    }

    clearTimeout(this.refreshTimer);
    this.refreshTimer = undefined;
  }

  private ensurePolling(): void {
    if (!this.enabled || this.pollTimer) {
      return;
    }

    logzmuxDebug("t3.activityMonitor.ensurePolling", {
      intervalMs: SNAPSHOT_POLL_INTERVAL_MS,
    });
    this.pollTimer = setInterval(() => {
      void this.refreshSnapshot();
    }, SNAPSHOT_POLL_INTERVAL_MS);
    this.pollTimer.unref?.();
  }

  private clearPollTimer(): void {
    if (!this.pollTimer) {
      return;
    }

    clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  private rejectPendingSnapshotRequest(error: Error): void {
    if (!this.pendingSnapshotRequest) {
      return;
    }

    clearTimeout(this.pendingSnapshotRequest.timeout);
    const pendingRequest = this.pendingSnapshotRequest;
    this.pendingSnapshotRequest = undefined;
    pendingRequest.reject(error);
  }

  private async getWebSocketUrl(): Promise<string> {
    return (await this.options.getWebSocketUrl?.()) ?? DEFAULT_T3_WEBSOCKET_URL;
  }
}

function redactWebSocketUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.searchParams.has("token")) {
      url.searchParams.set("token", "<redacted>");
    }
    return url.toString();
  } catch {
    return value;
  }
}

function describeMessagePayload(raw: string | ArrayBuffer | Blob): string {
  if (typeof raw === "string") {
    return "string";
  }
  if (raw instanceof ArrayBuffer) {
    return "ArrayBuffer";
  }
  if (typeof Blob !== "undefined" && raw instanceof Blob) {
    return "Blob";
  }
  return typeof raw;
}

function haveSameThreadTitleMaps(
  left: ReadonlyMap<string, string>,
  right: ReadonlyMap<string, string>,
): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const [threadId, title] of left) {
    if (right.get(threadId) !== title) {
      return false;
    }
  }

  return true;
}
