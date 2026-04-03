import type { PtyCallbacks, PtyTransport } from "restty/internal";

const SOCKET_RECONNECT_BASE_DELAY_MS = 250;
const SOCKET_RECONNECT_MAX_DELAY_MS = 2_000;

export type WorkspaceResttyTransportController = {
  sendRawInput: (data: string) => boolean;
  transport: PtyTransport;
};

type CreateWorkspaceResttyTransportOptions = {
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void;
  sessionId: string;
};

export function createWorkspaceResttyTransport(
  options: CreateWorkspaceResttyTransportOptions,
): WorkspaceResttyTransportController {
  let socket: WebSocket | null = null;
  let decoder: TextDecoder | null = null;
  let reconnectTimeoutId: number | undefined;
  let reconnectAttempt = 0;
  let connectSequence = 0;
  let activeConnectId = 0;
  let explicitDisconnect = false;
  let desiredCols = 80;
  let desiredRows = 24;
  let desiredUrl = "";
  let callbacks: PtyCallbacks | undefined;
  let pendingMessages: string[] = [];

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutId !== undefined) {
      window.clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = undefined;
    }
  };

  const flushPendingMessages = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || pendingMessages.length === 0) {
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
    reconnectTimeoutId = window.setTimeout(() => {
      reconnectTimeoutId = undefined;
      openSocket();
    }, delayMs);
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
    const nextSocket = new WebSocket(desiredUrl);
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
      options.reportDebug?.("terminal.socketOpen", {
        cols: desiredCols,
        connectionId: connectId,
        rows: desiredRows,
        sessionId: options.sessionId,
      });
      callbacks?.onConnect?.();
      flushPendingMessages();
    });

    nextSocket.addEventListener("message", (event) => {
      if (activeConnectId !== connectId || socket !== nextSocket) {
        return;
      }

      if (typeof event.data === "string") {
        callbacks?.onData?.(event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
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

      cleanupSocket(nextSocket);
      options.reportDebug?.(
        reason === "close" ? "terminal.socketClose" : "terminal.socketError",
        {
          connectionId: connectId,
          sessionId: options.sessionId,
        },
      );
      callbacks?.onDisconnect?.();
      scheduleReconnect();
    };

    nextSocket.addEventListener("close", () => {
      handleDisconnect("close");
    });
    nextSocket.addEventListener("error", () => {
      handleDisconnect("error");
    });
  };

  const sendQueuedOrImmediate = (message: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(message);
      return true;
    }

    if (socket?.readyState === WebSocket.CONNECTING) {
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
        const activeSocket = socket;
        socket = null;
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
          JSON.stringify({
            cols: desiredCols,
            rows: desiredRows,
            sessionId: options.sessionId,
            type: "terminalResize",
          }),
        );
      },
      sendInput: (data) => sendRawInput(data),
    },
  };
}
