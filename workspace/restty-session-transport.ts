import type { PtyCallbacks, PtyTransport } from "restty/internal";

const SOCKET_RECONNECT_BASE_DELAY_MS = 250;
const SOCKET_RECONNECT_MAX_DELAY_MS = 2_000;
const TERMINAL_RECONNECT_RESET_SEQUENCE = "\x1bc";
const CONNECTION_SUMMARY_DELAY_MS = 4_000;

export type WorkspaceResttyTransportController = {
  markTerminalReady: (cols: number, rows: number) => void;
  sendRawInput: (data: string) => boolean;
  transport: PtyTransport;
};

type CreateWorkspaceResttyTransportOptions = {
  onFirstData?: (connectionId: number) => void;
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void;
  sessionId: string;
};

function buildSocketUrlWithSize(url: string, cols: number, rows: number): string {
  const socketUrl = new URL(url);
  socketUrl.searchParams.set("cols", String(cols));
  socketUrl.searchParams.set("rows", String(rows));
  return socketUrl.toString();
}

function createResizeMessage(sessionId: string, cols: number, rows: number): string {
  return JSON.stringify({
    cols,
    rows,
    sessionId,
    type: "terminalResize",
  });
}

function createReadyMessage(sessionId: string, cols: number, rows: number): string {
  return JSON.stringify({
    cols,
    rows,
    sessionId,
    type: "terminalReady",
  });
}

export function createWorkspaceResttyTransport(
  options: CreateWorkspaceResttyTransportOptions,
): WorkspaceResttyTransportController {
  let socket: WebSocket | null = null;
  let decoder: TextDecoder | null = null;
  let reconnectTimeoutId: number | undefined;
  let reconnectAttempt = 0;
  let connectSequence = 0;
  let activeConnectId = 0;
  let readySentConnectId = 0;
  let hasConnectedOnce = false;
  let explicitDisconnect = false;
  let terminalReady = false;
  let desiredCols = 80;
  let desiredRows = 24;
  let desiredUrl = "";
  let callbacks: PtyCallbacks | undefined;
  let pendingMessages: string[] = [];
  let activeConnectionOpenedAt = 0;
  let activeConnectionFirstDataAt = 0;
  let activeConnectionBytes = 0;
  let activeConnectionChunks = 0;
  let activeConnectionSummaryTimeoutId: number | undefined;

  const scheduleDebugTimeout = (
    timeoutType: string,
    delayMs: number,
    callback: () => void,
    payload: Record<string, unknown> = {},
  ) => {
    const scheduledAt = performance.now();
    return globalThis.setTimeout(() => {
      const actualDelayMs = performance.now() - scheduledAt;
      options.reportDebug?.("terminal.timeoutFired", {
        actualDelayMs: Math.round(actualDelayMs),
        delayMs,
        overshootMs: Math.max(0, Math.round(actualDelayMs - delayMs)),
        sessionId: options.sessionId,
        timeoutType,
        ...payload,
      });
      callback();
    }, delayMs);
  };

  const clearConnectionSummaryTimeout = () => {
    if (activeConnectionSummaryTimeoutId !== undefined) {
      globalThis.clearTimeout(activeConnectionSummaryTimeoutId);
      activeConnectionSummaryTimeoutId = undefined;
    }
  };

  const reportConnectionSummary = (connectionId: number, reason: "window" | "close" | "error") => {
    if (activeConnectionOpenedAt === 0) {
      return;
    }

    options.reportDebug?.("terminal.connectionSummary", {
      chunks: activeConnectionChunks,
      connectionId,
      durationMs: Math.round(performance.now() - activeConnectionOpenedAt),
      firstDataDelayMs:
        activeConnectionFirstDataAt > 0
          ? Math.round(activeConnectionFirstDataAt - activeConnectionOpenedAt)
          : undefined,
      isReconnect: hasConnectedOnce,
      reason,
      sessionId: options.sessionId,
      totalBytes: activeConnectionBytes,
    });
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutId !== undefined) {
      globalThis.clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = undefined;
    }
  };

  const flushPendingMessages = () => {
    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      pendingMessages.length === 0 ||
      readySentConnectId !== activeConnectId
    ) {
      return;
    }

    for (const message of pendingMessages) {
      socket.send(message);
    }
    pendingMessages = [];
  };

  const decodeBinaryPayload = (payload: ArrayBuffer) => {
    const activeDecoder = decoder ?? new TextDecoder();
    decoder = activeDecoder;
    return activeDecoder.decode(new Uint8Array(payload), { stream: true });
  };

  const sendReadyIfPossible = () => {
    if (
      !terminalReady ||
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      readySentConnectId === activeConnectId
    ) {
      return;
    }

    socket.send(createReadyMessage(options.sessionId, desiredCols, desiredRows));
    readySentConnectId = activeConnectId;
    options.reportDebug?.("terminal.socketReady", {
      cols: desiredCols,
      connectionId: activeConnectId,
      rows: desiredRows,
      sessionId: options.sessionId,
    });
    flushPendingMessages();
  };

  const scheduleReconnect = () => {
    if (explicitDisconnect || reconnectTimeoutId !== undefined || !desiredUrl.trim()) {
      return;
    }

    const delayMs = Math.min(
      SOCKET_RECONNECT_MAX_DELAY_MS,
      SOCKET_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
    );
    reconnectAttempt += 1;
    options.reportDebug?.("terminal.socketReconnectScheduled", {
      attempt: reconnectAttempt,
      delayMs,
      sessionId: options.sessionId,
    });
    reconnectTimeoutId = scheduleDebugTimeout(
      "socketReconnect",
      delayMs,
      () => {
        reconnectTimeoutId = undefined;
        openSocket();
      },
      {
        attempt: reconnectAttempt,
      },
    );
  };

  const cleanupSocket = (targetSocket: WebSocket) => {
    if (socket === targetSocket) {
      socket = null;
    }
    if (decoder) {
      decoder.decode();
      decoder = null;
    }
  };

  const openSocket = () => {
    if (explicitDisconnect || socket || !desiredUrl.trim()) {
      return;
    }

    const connectId = connectSequence + 1;
    connectSequence = connectId;
    activeConnectId = connectId;
    const nextSocket = new WebSocket(buildSocketUrlWithSize(desiredUrl, desiredCols, desiredRows));
    nextSocket.binaryType = "arraybuffer";
    socket = nextSocket;
    decoder = new TextDecoder();

    nextSocket.addEventListener("open", () => {
      if (activeConnectId !== connectId || socket !== nextSocket) {
        nextSocket.close();
        return;
      }

      reconnectAttempt = 0;
      clearReconnectTimeout();
      clearConnectionSummaryTimeout();
      activeConnectionOpenedAt = performance.now();
      activeConnectionFirstDataAt = 0;
      activeConnectionBytes = 0;
      activeConnectionChunks = 0;
      options.reportDebug?.("terminal.socketOpen", {
        cols: desiredCols,
        connectionId: connectId,
        isReconnect: hasConnectedOnce,
        rows: desiredRows,
        sessionId: options.sessionId,
      });
      if (hasConnectedOnce) {
        callbacks?.onData?.(TERMINAL_RECONNECT_RESET_SEQUENCE);
        options.reportDebug?.("terminal.socketReplayReset", {
          connectionId: connectId,
          sessionId: options.sessionId,
        });
      }
      hasConnectedOnce = true;
      sendReadyIfPossible();
      callbacks?.onConnect?.();
      flushPendingMessages();
      activeConnectionSummaryTimeoutId = scheduleDebugTimeout(
        "connectionSummary",
        CONNECTION_SUMMARY_DELAY_MS,
        () => {
          activeConnectionSummaryTimeoutId = undefined;
          reportConnectionSummary(connectId, "window");
        },
        {
          connectionId: connectId,
        },
      );
    });

    nextSocket.addEventListener("message", (event) => {
      if (activeConnectId !== connectId || socket !== nextSocket) {
        return;
      }

      if (typeof event.data === "string") {
        activeConnectionChunks += 1;
        activeConnectionBytes += new TextEncoder().encode(event.data).length;
        if (activeConnectionFirstDataAt === 0) {
          activeConnectionFirstDataAt = performance.now();
          options.onFirstData?.(connectId);
          options.reportDebug?.("terminal.socketFirstData", {
            bytes: new TextEncoder().encode(event.data).length,
            connectionId: connectId,
            delayMs: Math.round(activeConnectionFirstDataAt - activeConnectionOpenedAt),
            payloadType: "string",
            sessionId: options.sessionId,
          });
        }
        callbacks?.onData?.(event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        activeConnectionChunks += 1;
        activeConnectionBytes += event.data.byteLength;
        if (activeConnectionFirstDataAt === 0) {
          activeConnectionFirstDataAt = performance.now();
          options.onFirstData?.(connectId);
          options.reportDebug?.("terminal.socketFirstData", {
            bytes: event.data.byteLength,
            connectionId: connectId,
            delayMs: Math.round(activeConnectionFirstDataAt - activeConnectionOpenedAt),
            payloadType: "arraybuffer",
            sessionId: options.sessionId,
          });
        }
        const text = decodeBinaryPayload(event.data);
        if (text) {
          callbacks?.onData?.(text);
        }
        return;
      }

      if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then((buffer) => {
          if (activeConnectId !== connectId || socket !== nextSocket) {
            return;
          }
          activeConnectionChunks += 1;
          activeConnectionBytes += buffer.byteLength;
          if (activeConnectionFirstDataAt === 0) {
            activeConnectionFirstDataAt = performance.now();
            options.onFirstData?.(connectId);
            options.reportDebug?.("terminal.socketFirstData", {
              bytes: buffer.byteLength,
              connectionId: connectId,
              delayMs: Math.round(activeConnectionFirstDataAt - activeConnectionOpenedAt),
              payloadType: "blob",
              sessionId: options.sessionId,
            });
          }
          const text = decodeBinaryPayload(buffer);
          if (text) {
            callbacks?.onData?.(text);
          }
        });
      }
    });

    const handleDisconnect = (reason: "close" | "error") => {
      if (activeConnectId !== connectId) {
        return;
      }

      clearConnectionSummaryTimeout();
      reportConnectionSummary(connectId, reason);
      cleanupSocket(nextSocket);
      options.reportDebug?.(reason === "close" ? "terminal.socketClose" : "terminal.socketError", {
        connectionId: connectId,
        explicitDisconnect,
        sessionId: options.sessionId,
      });
      callbacks?.onDisconnect?.();
      scheduleReconnect();
    };

    nextSocket.addEventListener("close", (event) => {
      options.reportDebug?.("terminal.socketCloseDetails", {
        code: event.code,
        connectionId: connectId,
        explicitDisconnect,
        reason: event.reason,
        sessionId: options.sessionId,
        wasClean: event.wasClean,
      });
      handleDisconnect("close");
    });
    nextSocket.addEventListener("error", () => {
      options.reportDebug?.("terminal.socketErrorDetails", {
        connectionId: connectId,
        explicitDisconnect,
        readyState: nextSocket.readyState,
        sessionId: options.sessionId,
      });
      handleDisconnect("error");
    });
  };

  const sendQueuedOrImmediate = (message: string) => {
    if (socket?.readyState === WebSocket.OPEN && readySentConnectId === activeConnectId) {
      socket.send(message);
      return true;
    }

    if (
      socket?.readyState === WebSocket.CONNECTING ||
      (socket?.readyState === WebSocket.OPEN && readySentConnectId !== activeConnectId)
    ) {
      pendingMessages.push(message);
    }
    return false;
  };

  const sendRawInput = (data: string) => {
    if (!data) {
      return false;
    }

    return sendQueuedOrImmediate(data);
  };

  return {
    markTerminalReady: (cols, rows) => {
      desiredCols = Math.max(1, Math.round(cols));
      desiredRows = Math.max(1, Math.round(rows));
      terminalReady = true;
      sendReadyIfPossible();
    },
    sendRawInput,
    transport: {
      connect: ({ callbacks: nextCallbacks, cols, rows, url }) => {
        callbacks = nextCallbacks;
        desiredUrl = url.trim();
        desiredCols = Number.isFinite(cols) ? Math.max(1, Math.round(cols ?? 80)) : desiredCols;
        desiredRows = Number.isFinite(rows) ? Math.max(1, Math.round(rows ?? 24)) : desiredRows;
        explicitDisconnect = false;
        clearReconnectTimeout();
        openSocket();
      },
      destroy: () => {
        explicitDisconnect = true;
        clearReconnectTimeout();
        pendingMessages = [];
        clearConnectionSummaryTimeout();
        options.reportDebug?.("terminal.socketDestroyRequested", {
          activeConnectId,
          sessionId: options.sessionId,
        });
        const activeSocket = socket;
        socket = null;
        if (activeSocket) {
          activeSocket.close();
        }
        decoder = null;
      },
      disconnect: () => {
        explicitDisconnect = true;
        clearReconnectTimeout();
        options.reportDebug?.("terminal.socketDisconnectRequested", {
          activeConnectId,
          sessionId: options.sessionId,
        });
        const activeSocket = socket;
        socket = null;
        clearConnectionSummaryTimeout();
        if (activeSocket) {
          activeSocket.close();
        }
        decoder = null;
      },
      isConnected: () => socket?.readyState === WebSocket.OPEN,
      resize: (cols, rows) => {
        desiredCols = Math.max(1, Math.round(cols));
        desiredRows = Math.max(1, Math.round(rows));
        return sendQueuedOrImmediate(
          createResizeMessage(options.sessionId, desiredCols, desiredRows),
        );
      },
      sendInput: (data) => sendRawInput(data),
    },
  };
}
