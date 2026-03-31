import { useEffect, useRef, useState } from "react";
import { IconArrowDownBar } from "@tabler/icons-react";
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type {
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelConnection,
  WorkspacePanelTerminalAppearance,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import type { TerminalResizeMessage } from "../shared/terminal-host-protocol";
import { getTerminalAppearanceOptions } from "./terminal-appearance";
import { logWorkspaceDebug } from "./workspace-debug";
import { getTerminalTheme } from "./terminal-theme";
import "./terminal-pane.css";

const DATA_BUFFER_FLUSH_MS = 5;
const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const POST_RECONNECT_REFIT_DELAY_MS = 3_000;
const POST_RECONNECT_HEIGHT_NUDGE_PX = 100;
const NUDGE_RESTORE_TIMEOUT_MS = 250;
const SCROLL_TO_BOTTOM_BUTTON_MARGIN_PX = 200;
const SOCKET_ACTIVITY_IDLE_SUMMARY_MS = 1_000;

export type TerminalPaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelConnection;
  debugLog?: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isVisible: boolean;
  onActivate: () => void;
  pane: WorkspacePanelTerminalPane;
  refreshRequestId: number;
  terminalAppearance: WorkspacePanelTerminalAppearance;
};

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  autoFocusRequest,
  connection,
  debugLog,
  debuggingMode,
  isVisible,
  onActivate,
  pane,
  refreshRequestId,
  terminalAppearance,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debugLogRef = useRef(debugLog);
  const debuggingModeRef = useRef(debuggingMode);
  const fitRef = useRef<FitAddon | null>(null);
  const handledAutoFocusRequestIdRef = useRef<number | undefined>(undefined);
  const handledRefreshRequestIdRef = useRef(refreshRequestId);
  const isVisibleRef = useRef(isVisible);
  const lastMeasuredSizeRef = useRef<{ height: number; width: number } | undefined>(undefined);
  const nudgeTerminalHeightRef = useRef<((afterNudge?: () => void) => void) | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const updateScrollToBottomButtonVisibilityRef = useRef<(() => void) | null>(null);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);

  useEffect(() => {
    debugLogRef.current = debugLog;
  }, [debugLog]);

  useEffect(() => {
    debuggingModeRef.current = debuggingMode;
  }, [debuggingMode]);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  const reportDebug = (event: string, payload?: Record<string, unknown>) => {
    logWorkspaceDebug(debuggingModeRef.current, event, payload);
    debugLogRef.current?.(event, payload);
  };

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const terminal = new Terminal({
      allowProposedApi: true,
      ...getTerminalAppearanceOptions(terminalAppearance),
      theme: getTerminalTheme(),
      fontWeight: "300",
      fontWeightBold: "500",
      scrollback: 200_000,
    });
    terminalRef.current = terminal;

    const fit = new FitAddon();
    fitRef.current = fit;
    terminal.loadAddon(fit);
    terminal.open(containerRef.current);

    const unicode11 = new Unicode11Addon();
    terminal.loadAddon(unicode11);
    terminal.unicode.activeVersion = "11";

    let rendererMode: "fallback" | "unknown" | "webgl" = "unknown";

    try {
      const webgl = new WebglAddon();
      rendererMode = "webgl";
      reportDebug("terminal.rendererReady", {
        rendererMode,
        sessionId: pane.sessionId,
      });
      webgl.onContextLoss(() => {
        rendererMode = "fallback";
        reportDebug("terminal.rendererContextLoss", {
          sessionId: pane.sessionId,
        });
        webgl.dispose();
      });
      terminal.loadAddon(webgl);
    } catch (error) {
      rendererMode = "fallback";
      reportDebug("terminal.rendererReady", {
        message: error instanceof Error ? error.message : String(error),
        rendererMode,
        sessionId: pane.sessionId,
      });
      // Fall back to xterm's default renderer when WebGL is unavailable.
    }

    if (document.hasFocus()) {
      terminal.focus();
    }

    const onWindowFocus = () => {
      terminal.focus();
    };
    window.addEventListener("focus", onWindowFocus);

    let didDispose = false;
    let websocket: WebSocket | undefined;
    let dataBuffer: Uint8Array[] = [];
    let firstData = true;
    let flushTimer: number | undefined;
    let nudgeRestoreTimeoutId: number | undefined;
    let nudgeToken = 0;
    let pendingSocketMessages: string[] = [];
    let pendingReconnectRefitAfterData = false;
    let reconnectRefitTimeoutId: number | undefined;
    let suppressPasteEvent = false;
    let socketConnectionSequence = 0;
    let socketConnectionId = 0;
    let socketOpenedAtMs: number | undefined;
    let socketFirstBinaryAtMs: number | undefined;
    let socketBinaryBytes = 0;
    let socketBinaryChunks = 0;
    let socketFlushBytes = 0;
    let socketFlushCount = 0;
    let socketIdleSummaryTimeoutId: number | undefined;
    let socketLargestFlushBytes = 0;
    let socketResizeCount = 0;

    const updateScrollToBottomButtonVisibility = () => {
      const container = containerRef.current;
      if (!container || !isVisibleRef.current || terminal.rows <= 0) {
        setShowScrollToBottomButton(false);
        return;
      }

      const bounds = container.getBoundingClientRect();
      if (bounds.height <= 0) {
        setShowScrollToBottomButton(false);
        return;
      }

      const rowHeightPx = bounds.height / terminal.rows;
      const activeBuffer = terminal.buffer.active;
      const distanceFromBottom =
        Math.max(0, activeBuffer.baseY - activeBuffer.viewportY) * rowHeightPx;
      setShowScrollToBottomButton(distanceFromBottom > SCROLL_TO_BOTTOM_BUTTON_MARGIN_PX);
    };
    updateScrollToBottomButtonVisibilityRef.current = updateScrollToBottomButtonVisibility;

    const sendSocketMessage = (message: string) => {
      if (!websocket) {
        pendingSocketMessages.push(message);
        return;
      }

      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(message);
        return;
      }

      if (websocket.readyState === WebSocket.CONNECTING) {
        pendingSocketMessages.push(message);
      }
    };

    const copySelectionToClipboard = () => {
      const selection = terminal.getSelection();
      if (!selection) {
        return false;
      }

      void navigator.clipboard.writeText(selection).catch(() => {});
      return true;
    };

    const pasteClipboardText = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          sendSocketMessage(text);
        }
      } catch {
        // Clipboard access can fail outside a user gesture.
      }
    };

    const pasteFromShortcut = () => {
      suppressPasteEvent = true;
      void pasteClipboardText();
    };

    const refitTerminal = () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      lastMeasuredSizeRef.current = {
        height: Math.round(bounds.height),
        width: Math.round(bounds.width),
      };
      fit.fit();
      terminal.refresh(0, terminal.rows - 1);
    };

    const clearPendingNudgeRestore = () => {
      if (nudgeRestoreTimeoutId !== undefined) {
        window.clearTimeout(nudgeRestoreTimeoutId);
        nudgeRestoreTimeoutId = undefined;
      }
    };

    const clearSocketIdleSummaryTimeout = () => {
      if (socketIdleSummaryTimeoutId !== undefined) {
        window.clearTimeout(socketIdleSummaryTimeoutId);
        socketIdleSummaryTimeoutId = undefined;
      }
    };

    const resetSocketConnectionMetrics = () => {
      socketOpenedAtMs = undefined;
      socketFirstBinaryAtMs = undefined;
      socketBinaryBytes = 0;
      socketBinaryChunks = 0;
      socketFlushBytes = 0;
      socketFlushCount = 0;
      socketLargestFlushBytes = 0;
      socketResizeCount = 0;
      clearSocketIdleSummaryTimeout();
    };

    const logSocketConnectionSummary = (reason: "close" | "error" | "idle") => {
      if (!socketOpenedAtMs) {
        return;
      }

      reportDebug("terminal.connectionSummary", {
        binaryBytes: socketBinaryBytes,
        binaryChunks: socketBinaryChunks,
        cols: terminal.cols,
        connectionId: socketConnectionId,
        flushBytes: socketFlushBytes,
        flushCount: socketFlushCount,
        largestFlushBytes: socketLargestFlushBytes,
        msSinceFirstBinary:
          socketFirstBinaryAtMs === undefined
            ? undefined
            : Math.round(performance.now() - socketFirstBinaryAtMs),
        msSinceSocketOpen: Math.round(performance.now() - socketOpenedAtMs),
        reason,
        rendererMode,
        resizeCount: socketResizeCount,
        rows: terminal.rows,
        sessionId: pane.sessionId,
      });
      if (reason !== "idle") {
        resetSocketConnectionMetrics();
      }
    };

    const scheduleSocketIdleSummary = () => {
      clearSocketIdleSummaryTimeout();
      socketIdleSummaryTimeoutId = window.setTimeout(() => {
        logSocketConnectionSummary("idle");
      }, SOCKET_ACTIVITY_IDLE_SUMMARY_MS);
    };

    const noteSocketBinaryChunk = (byteLength: number) => {
      if (!socketOpenedAtMs) {
        return;
      }

      if (socketFirstBinaryAtMs === undefined) {
        socketFirstBinaryAtMs = performance.now();
        reportDebug("terminal.socketFirstBinaryData", {
          byteLength,
          connectionId: socketConnectionId,
          msAfterSocketOpen: Math.round(socketFirstBinaryAtMs - socketOpenedAtMs),
          rendererMode,
          sessionId: pane.sessionId,
        });
      }

      socketBinaryBytes += byteLength;
      socketBinaryChunks += 1;
      scheduleSocketIdleSummary();
    };

    const scheduleReconnectRefit = () => {
      if (!pendingReconnectRefitAfterData) {
        return;
      }

      pendingReconnectRefitAfterData = false;
      if (reconnectRefitTimeoutId !== undefined) {
        window.clearTimeout(reconnectRefitTimeoutId);
      }
      reconnectRefitTimeoutId = window.setTimeout(() => {
        reconnectRefitTimeoutId = undefined;
        if (didDispose) {
          return;
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (didDispose) {
              return;
            }

            refitTerminal();
            nudgeTerminalHeight();
          });
        });
      }, POST_RECONNECT_REFIT_DELAY_MS);
    };

    const nudgeTerminalHeight = (afterNudge?: () => void) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      clearPendingNudgeRestore();
      nudgeToken += 1;
      const currentNudgeToken = nudgeToken;
      const rowHeightPx = bounds.height / Math.max(1, terminal.rows);
      const rowNudge = Math.max(1, Math.round(POST_RECONNECT_HEIGHT_NUDGE_PX / rowHeightPx));
      const restoreFromNudge = () => {
        if (didDispose || currentNudgeToken !== nudgeToken) {
          return;
        }

        clearPendingNudgeRestore();
        refitTerminal();
        updateScrollToBottomButtonVisibility();
        reportDebug("terminal.reconnectNudgeRestore", {
          cols: terminal.cols,
          rowNudge,
          rows: terminal.rows,
          sessionId: pane.sessionId,
        });
        afterNudge?.();
      };

      reportDebug("terminal.reconnectNudgeStart", {
        cols: terminal.cols,
        rowNudge,
        rows: terminal.rows,
        sessionId: pane.sessionId,
      });
      terminal.resize(terminal.cols, terminal.rows + rowNudge);
      terminal.refresh(0, terminal.rows - 1);
      nudgeRestoreTimeoutId = window.setTimeout(() => {
        restoreFromNudge();
      }, NUDGE_RESTORE_TIMEOUT_MS);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoreFromNudge();
        });
      });
    };
    nudgeTerminalHeightRef.current = nudgeTerminalHeight;

    const connectWebsocket = () => {
      if (connection.mock || websocket || didDispose) {
        return;
      }

      const socketUrl = new URL("/session", connection.baseUrl);
      socketUrl.searchParams.set("token", connection.token);
      socketUrl.searchParams.set("workspaceId", connection.workspaceId);
      socketUrl.searchParams.set("sessionId", pane.sessionId);
      socketUrl.searchParams.set("cols", String(terminal.cols));
      socketUrl.searchParams.set("rows", String(terminal.rows));

      websocket = new WebSocket(socketUrl.toString());
      websocket.binaryType = "arraybuffer";
      websocket.onmessage = (event) => {
        if (typeof event.data === "string") {
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          noteSocketBinaryChunk(event.data.byteLength);
          scheduleReconnectRefit();
          dataBuffer.push(new Uint8Array(event.data));
          if (flushTimer === undefined) {
            flushTimer = window.setTimeout(flushData, DATA_BUFFER_FLUSH_MS);
          }
          return;
        }

        if (event.data instanceof Blob) {
          void event.data.arrayBuffer().then((buffer) => {
            noteSocketBinaryChunk(buffer.byteLength);
            scheduleReconnectRefit();
            dataBuffer.push(new Uint8Array(buffer));
            if (flushTimer === undefined) {
              flushTimer = window.setTimeout(flushData, DATA_BUFFER_FLUSH_MS);
            }
          });
        }
      };
      websocket.onopen = () => {
        socketConnectionSequence += 1;
        socketConnectionId = socketConnectionSequence;
        resetSocketConnectionMetrics();
        socketOpenedAtMs = performance.now();
        reportDebug("terminal.socketOpen", {
          cols: terminal.cols,
          connectionId: socketConnectionId,
          rendererMode,
          rows: terminal.rows,
          sessionId: pane.sessionId,
        });
        for (const message of pendingSocketMessages) {
          websocket?.send(message);
        }
        pendingSocketMessages = [];
        pendingReconnectRefitAfterData = true;
      };
      websocket.onclose = () => {
        logSocketConnectionSummary("close");
        reportDebug("terminal.socketClose", {
          connectionId: socketConnectionId,
          sessionId: pane.sessionId,
        });
        pendingSocketMessages = [];
        pendingReconnectRefitAfterData = false;
        if (reconnectRefitTimeoutId !== undefined) {
          window.clearTimeout(reconnectRefitTimeoutId);
          reconnectRefitTimeoutId = undefined;
        }
      };
      websocket.onerror = () => {
        logSocketConnectionSummary("error");
        reportDebug("terminal.socketError", {
          connectionId: socketConnectionId,
          sessionId: pane.sessionId,
        });
        pendingSocketMessages = [];
        pendingReconnectRefitAfterData = false;
        if (reconnectRefitTimeoutId !== undefined) {
          window.clearTimeout(reconnectRefitTimeoutId);
          reconnectRefitTimeoutId = undefined;
        }
      };
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (didDispose) {
          return;
        }

        reportDebug("terminal.initialFit", {
          cols: terminal.cols,
          sessionId: pane.sessionId,
        });
        refitTerminal();
        updateScrollToBottomButtonVisibility();
        connectWebsocket();
      });
    });

    const flushData = () => {
      if (dataBuffer.length === 0) {
        flushTimer = undefined;
        return;
      }

      const chunks = dataBuffer;
      dataBuffer = [];
      flushTimer = undefined;
      const flushBytes = chunks.reduce((totalBytes, chunk) => totalBytes + chunk.byteLength, 0);
      socketFlushBytes += flushBytes;
      socketFlushCount += 1;
      socketLargestFlushBytes = Math.max(socketLargestFlushBytes, flushBytes);
      if (firstData) {
        firstData = false;
        terminal.reset();
        reportDebug("terminal.firstDataReset", {
          connectionId: socketConnectionId,
          flushBytes,
          sessionId: pane.sessionId,
        });
      }
      for (const chunk of chunks) {
        terminal.write(chunk);
      }
      requestAnimationFrame(() => {
        updateScrollToBottomButtonVisibility();
      });
    };

    if (connection.mock) {
      reportDebug("terminal.mockConnected", {
        sessionId: pane.sessionId,
      });
      if (pane.snapshot?.history !== undefined) {
        reportDebug("terminal.applyHistory", {
          historyLength: pane.snapshot.history.length,
          sessionId: pane.sessionId,
        });
        terminal.write(pane.snapshot.history);
      }
    }

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.key === "Enter" && event.shiftKey) {
        if (event.type === "keydown") {
          sendSocketMessage("\x1b[13;2u");
        }
        return false;
      }

      const primaryModifier = IS_MAC ? event.metaKey : event.ctrlKey;
      if (event.type === "keydown" && primaryModifier) {
        const key = event.key.toLowerCase();
        if (key === "c" && copySelectionToClipboard()) {
          return false;
        }
        if (key === "v") {
          pasteFromShortcut();
          return false;
        }
        if (!IS_MAC && event.shiftKey) {
          if (key === "c" && copySelectionToClipboard()) {
            return false;
          }
          if (key === "v") {
            pasteFromShortcut();
            return false;
          }
        }
      }

      if (event.type === "keydown" && event.shiftKey && event.key === "Insert") {
        pasteFromShortcut();
        return false;
      }

      if (event.type === "keydown" && event.metaKey) {
        if (event.key === "t" || (event.key >= "1" && event.key <= "9")) {
          return false;
        }
      }

      return true;
    });

    terminal.onData((data) => {
      sendSocketMessage(data);
    });

    terminal.onResize(({ cols, rows }) => {
      socketResizeCount += 1;
      const resizeMessage: TerminalResizeMessage = {
        cols,
        rows,
        sessionId: pane.sessionId,
        type: "terminalResize",
      };
      sendSocketMessage(JSON.stringify(resizeMessage));
    });

    const handleCopy = (event: ClipboardEvent) => {
      const selection = terminal.getSelection();
      if (!selection) {
        return;
      }

      event.clipboardData?.setData("text/plain", selection);
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (suppressPasteEvent) {
        suppressPasteEvent = false;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      const text = event.clipboardData?.getData("text/plain");
      if (!text) {
        return;
      }

      sendSocketMessage(text);
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    containerRef.current.addEventListener("copy", handleCopy, true);
    containerRef.current.addEventListener("paste", handlePaste, true);
    const scrollDisposable = terminal.onScroll(() => {
      requestAnimationFrame(() => {
        updateScrollToBottomButtonVisibility();
      });
    });

    let rafId = 0;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { height, width } = entry.contentRect;
      if (width > 0 && height > 0) {
        const nextMeasuredSize = {
          height: Math.round(height),
          width: Math.round(width),
        };
        const previousMeasuredSize = lastMeasuredSizeRef.current;
        if (
          previousMeasuredSize &&
          previousMeasuredSize.width === nextMeasuredSize.width &&
          previousMeasuredSize.height === nextMeasuredSize.height
        ) {
          return;
        }

        lastMeasuredSizeRef.current = nextMeasuredSize;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          reportDebug("terminal.resizeObserverFit", {
            height: nextMeasuredSize.height,
            sessionId: pane.sessionId,
            width: nextMeasuredSize.width,
          });
          fit.fit();
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    const onThemeChange = () => {
      terminal.options.theme = getTerminalTheme();
    };
    const themeObserver = new MutationObserver(() => {
      onThemeChange();
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class", "data-vscode-theme-id", "style"],
      attributes: true,
    });
    if (document.body) {
      themeObserver.observe(document.body, {
        attributeFilter: ["class", "data-vscode-theme-id", "style"],
        attributes: true,
      });
    }

    return () => {
      didDispose = true;
      if (flushTimer !== undefined) {
        clearTimeout(flushTimer);
        flushData();
      }
      if (reconnectRefitTimeoutId !== undefined) {
        window.clearTimeout(reconnectRefitTimeoutId);
      }
      clearPendingNudgeRestore();
      clearSocketIdleSummaryTimeout();
      cancelAnimationFrame(rafId);
      window.removeEventListener("focus", onWindowFocus);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      scrollDisposable.dispose();
      containerRef.current?.removeEventListener("copy", handleCopy, true);
      containerRef.current?.removeEventListener("paste", handlePaste, true);
      websocket?.close();
      terminal.dispose();
      lastMeasuredSizeRef.current = undefined;
      nudgeTerminalHeightRef.current = null;
      terminalRef.current = null;
      fitRef.current = null;
      updateScrollToBottomButtonVisibilityRef.current = null;
      setShowScrollToBottomButton(false);
    };
  }, [connection.baseUrl, connection.token, pane.sessionId]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    terminal.options = getTerminalAppearanceOptions(terminalAppearance);
    fitRef.current?.fit();
    terminal.refresh(0, terminal.rows - 1);
    requestAnimationFrame(() => {
      updateScrollToBottomButtonVisibilityRef.current?.();
    });
  }, [
    terminalAppearance.cursorBlink,
    terminalAppearance.cursorStyle,
    terminalAppearance.fontFamily,
    terminalAppearance.fontSize,
    terminalAppearance.letterSpacing,
    terminalAppearance.lineHeight,
  ]);

  useEffect(() => {
    if (!isVisible) {
      lastMeasuredSizeRef.current = undefined;
      return;
    }

    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!terminalRef.current || !containerRef.current) {
          return;
        }

        const bounds = containerRef.current.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
          return;
        }

        lastMeasuredSizeRef.current = {
          height: Math.round(bounds.height),
          width: Math.round(bounds.width),
        };
        fitRef.current?.fit();
        terminal.refresh(0, terminal.rows - 1);
        updateScrollToBottomButtonVisibilityRef.current?.();
      });
    });
  }, [isVisible, pane.sessionId]);

  useEffect(() => {
    if (handledRefreshRequestIdRef.current === refreshRequestId) {
      return;
    }

    handledRefreshRequestIdRef.current = refreshRequestId;
    lastMeasuredSizeRef.current = undefined;
    if (!isVisible) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        const terminal = terminalRef.current;
        if (!container || !terminal) {
          return;
        }

        const bounds = container.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
          return;
        }

        lastMeasuredSizeRef.current = {
          height: Math.round(bounds.height),
          width: Math.round(bounds.width),
        };
        fitRef.current?.fit();
        terminal.refresh(0, terminal.rows - 1);
        updateScrollToBottomButtonVisibilityRef.current?.();
      });
    });
  }, [isVisible, refreshRequestId]);

  useEffect(() => {
    if (
      !autoFocusRequest ||
      handledAutoFocusRequestIdRef.current === autoFocusRequest.requestId ||
      !isVisible
    ) {
      return;
    }

    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    handledAutoFocusRequestIdRef.current = autoFocusRequest.requestId;
    requestAnimationFrame(() => {
      terminal.focus();
      reportDebug("terminal.autoFocusRequestApplied", {
        requestId: autoFocusRequest.requestId,
        sessionId: pane.sessionId,
        source: autoFocusRequest.source,
      });
    });
  }, [autoFocusRequest, isVisible, pane.sessionId]);

  return (
    <div
      className={`terminal-pane-root ${isVisible ? "" : "terminal-pane-root-hidden"}`.trim()}
      onMouseDown={(event) => {
        event.stopPropagation();
        reportDebug("terminal.mouseActivate", {
          sessionId: pane.sessionId,
        });
        onActivate();
        terminalRef.current?.focus();
      }}
    >
      <div className="terminal-pane-canvas terminal-tab" ref={containerRef} />
      {isVisible && showScrollToBottomButton ? (
        <button
          aria-label="Scroll terminal to bottom"
          className="terminal-pane-scroll-to-bottom"
          onClick={(event) => {
            event.stopPropagation();
            terminalRef.current?.focus();
            terminalRef.current?.scrollToBottom();
            nudgeTerminalHeightRef.current?.(() => {
              terminalRef.current?.scrollToBottom();
              requestAnimationFrame(() => {
                updateScrollToBottomButtonVisibilityRef.current?.();
              });
            });
          }}
          type="button"
        >
          <IconArrowDownBar aria-hidden size={16} stroke={1.8} />
        </button>
      ) : null}
    </div>
  );
};
