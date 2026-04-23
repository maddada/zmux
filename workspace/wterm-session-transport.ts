const SOCKET_RECONNECT_BASE_DELAY_MS = 250;
const SOCKET_RECONNECT_MAX_DELAY_MS = 2_000;

export type WorkspaceWtermTransportController = {
  connect: (url: string) => void;
  disconnect: () => void;
  markTerminalReady: (cols: number, rows: number) => void;
  reconnect: (reason: string) => void;
  sendInput: (data: string) => boolean;
  setReconnectEnabled: (enabled: boolean, reason: string) => void;
  updateTerminalSize: (cols: number, rows: number) => void;
};

type CreateWorkspaceWtermTransportOptions = {
  onData: (data: string) => void;
  onReconnectReplayStart?: () => void;
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void;
  sessionId: string;
};

function buildSocketUrlWithSize(url: string, cols: number, rows: number): string {
  const socketUrl = new URL(url);
  socketUrl.searchParams.set("cols", String(cols));
  socketUrl.searchParams.set("rows", String(rows));
  return socketUrl.toString();
}

function createInputMessage(sessionId: string, data: string): string {
  return JSON.stringify({
    data,
    sessionId,
    type: "terminalInput",
  });
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

export function createWorkspaceWtermTransport(
  options: CreateWorkspaceWtermTransportOptions,
): WorkspaceWtermTransportController {
  let socket: WebSocket | null = null;
  let decoder: TextDecoder | null = null;
  let reconnectTimeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let reconnectAttempt = 0;
  let connectSequence = 0;
  let activeConnectId = 0;
  let readySentConnectId = 0;
  let hasConnectedOnce = false;
  let terminalReady = false;
  let explicitDisconnect = false;
  let reconnectEnabled = true;
  let reconnectDisabledReason: string | null = null;
  let desiredUrl = "";
  let desiredCols = 80;
  let desiredRows = 24;
  let pendingMessages: string[] = [];
  let firstMessageObservedForConnectId = 0;

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
    flushPendingMessages();
    options.reportDebug?.("wterm.transport.ready", {
      cols: desiredCols,
      connectionId: activeConnectId,
      rows: desiredRows,
      sessionId: options.sessionId,
    });
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

  const scheduleReconnect = () => {
    if (
      !reconnectEnabled ||
      explicitDisconnect ||
      reconnectTimeoutId !== undefined ||
      !desiredUrl
    ) {
      if (!reconnectEnabled) {
        options.reportDebug?.("wterm.transport.reconnectSuppressed", {
          reason: reconnectDisabledReason ?? "reconnect-disabled",
          sessionId: options.sessionId,
        });
      }
      return;
    }

    const delayMs = Math.min(
      SOCKET_RECONNECT_MAX_DELAY_MS,
      SOCKET_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
    );
    reconnectAttempt += 1;
    reconnectTimeoutId = globalThis.setTimeout(() => {
      reconnectTimeoutId = undefined;
      openSocket();
    }, delayMs);
    options.reportDebug?.("wterm.transport.reconnectScheduled", {
      attempt: reconnectAttempt,
      delayMs,
      sessionId: options.sessionId,
    });
  };

  const handleSocketTermination = (targetSocket: WebSocket, reason: "closed" | "errored") => {
    cleanupSocket(targetSocket);
    if (!explicitDisconnect) {
      scheduleReconnect();
    }
    options.reportDebug?.("wterm.transport.terminated", {
      connectionId: activeConnectId,
      reason,
      sessionId: options.sessionId,
    });
  };

  const openSocket = () => {
    if (explicitDisconnect || socket || !desiredUrl || !terminalReady || !reconnectEnabled) {
      return;
    }

    const connectionId = connectSequence + 1;
    connectSequence = connectionId;
    activeConnectId = connectionId;
    readySentConnectId = 0;
    firstMessageObservedForConnectId = 0;

    options.reportDebug?.("wterm.transport.connectRequested", {
      cols: desiredCols,
      connectionId,
      rows: desiredRows,
      sessionId: options.sessionId,
      url: desiredUrl,
    });

    const nextSocket = new WebSocket(buildSocketUrlWithSize(desiredUrl, desiredCols, desiredRows));
    nextSocket.binaryType = "arraybuffer";
    socket = nextSocket;

    nextSocket.addEventListener("open", () => {
      if (socket !== nextSocket) {
        return;
      }

      const isReconnect = hasConnectedOnce;
      reconnectAttempt = 0;
      if (isReconnect) {
        options.onReconnectReplayStart?.();
      }
      hasConnectedOnce = true;
      sendReadyIfPossible();
      options.reportDebug?.("wterm.transport.open", {
        connectionId,
        isReconnect,
        sessionId: options.sessionId,
      });
    });

    nextSocket.addEventListener("message", (event) => {
      if (socket !== nextSocket) {
        return;
      }

      if (typeof event.data === "string") {
        if (firstMessageObservedForConnectId !== connectionId) {
          firstMessageObservedForConnectId = connectionId;
          options.reportDebug?.("wterm.transport.firstMessage", {
            connectionId,
            kind: "text",
            length: event.data.length,
            sessionId: options.sessionId,
          });
        }
        options.onData(event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        if (firstMessageObservedForConnectId !== connectionId) {
          firstMessageObservedForConnectId = connectionId;
          options.reportDebug?.("wterm.transport.firstMessage", {
            byteLength: event.data.byteLength,
            connectionId,
            kind: "binary",
            sessionId: options.sessionId,
          });
        }
        const activeDecoder = decoder ?? new TextDecoder();
        decoder = activeDecoder;
        const decoded = activeDecoder.decode(new Uint8Array(event.data), { stream: true });
        if (decoded) {
          options.onData(decoded);
        }
      }
    });

    nextSocket.addEventListener("close", () => {
      if (socket !== nextSocket) {
        return;
      }
      handleSocketTermination(nextSocket, "closed");
    });

    nextSocket.addEventListener("error", () => {
      if (socket !== nextSocket) {
        return;
      }
      handleSocketTermination(nextSocket, "errored");
    });
  };

  const sendMessage = (message: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || readySentConnectId !== activeConnectId) {
      pendingMessages.push(message);
      return false;
    }

    socket.send(message);
    return true;
  };

  return {
    connect(url) {
      desiredUrl = url.trim();
      explicitDisconnect = false;
      if (!desiredUrl) {
        return;
      }

      if (socket) {
        return;
      }

      openSocket();
    },
    disconnect() {
      explicitDisconnect = true;
      clearReconnectTimeout();
      const activeSocket = socket;
      socket = null;
      readySentConnectId = 0;
      if (activeSocket && activeSocket.readyState < WebSocket.CLOSING) {
        activeSocket.close();
      }
    },
    markTerminalReady(cols, rows) {
      terminalReady = true;
      desiredCols = cols;
      desiredRows = rows;
      if (!socket && desiredUrl) {
        openSocket();
        return;
      }

      sendReadyIfPossible();
    },
    reconnect(reason) {
      options.reportDebug?.("wterm.transport.reconnectRequested", {
        reason,
        sessionId: options.sessionId,
      });
      clearReconnectTimeout();
      const activeSocket = socket;
      socket = null;
      readySentConnectId = 0;
      if (activeSocket && activeSocket.readyState < WebSocket.CLOSING) {
        activeSocket.close();
      }
      explicitDisconnect = false;
      openSocket();
    },
    sendInput(data) {
      return sendMessage(createInputMessage(options.sessionId, data));
    },
    setReconnectEnabled(enabled, reason) {
      reconnectEnabled = enabled;
      reconnectDisabledReason = enabled ? null : reason;
      if (enabled && !socket && !reconnectTimeoutId) {
        openSocket();
      }
    },
    updateTerminalSize(cols, rows) {
      desiredCols = cols;
      desiredRows = rows;
      sendMessage(createResizeMessage(options.sessionId, cols, rows));
    },
  };
}
