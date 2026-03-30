import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type {
  WorkspacePanelConnection,
  WorkspacePanelTerminalAppearance,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import type {
  TerminalResizeMessage,
  TerminalStateMessage,
} from "../shared/terminal-host-protocol";
import { getTerminalAppearanceOptions } from "./terminal-appearance";
import { getTerminalHistoryReplay } from "./terminal-pane-history";
import { logWorkspaceDebug } from "./workspace-debug";
import { getTerminalTheme } from "./terminal-theme";
import "./terminal-pane.css";

const DATA_BUFFER_FLUSH_MS = 5;

export type TerminalPaneProps = {
  connection: WorkspacePanelConnection;
  debugLog?: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isVisible: boolean;
  onActivate: () => void;
  pane: WorkspacePanelTerminalPane;
  terminalAppearance: WorkspacePanelTerminalAppearance;
};

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  connection,
  debugLog,
  debuggingMode,
  isVisible,
  onActivate,
  pane,
  terminalAppearance,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debugLogRef = useRef(debugLog);
  const debuggingModeRef = useRef(debuggingMode);
  const fitRef = useRef<FitAddon | null>(null);
  const lastMeasuredSizeRef = useRef<{ height: number; width: number }>();
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    debugLogRef.current = debugLog;
  }, [debugLog]);

  useEffect(() => {
    debuggingModeRef.current = debuggingMode;
  }, [debuggingMode]);

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

    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      terminal.loadAddon(webgl);
    } catch {
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
    let didApplyHistory = false;
    let dataBuffer: Uint8Array[] = [];
    let flushTimer: number | undefined;
    let pendingSocketMessages: string[] = [];

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
          if (event.data.startsWith("{")) {
            const message = JSON.parse(event.data) as TerminalStateMessage;
            handleTerminalStateMessage(message);
          }
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          dataBuffer.push(new Uint8Array(event.data));
          if (flushTimer === undefined) {
            flushTimer = window.setTimeout(flushData, DATA_BUFFER_FLUSH_MS);
          }
          return;
        }

        if (event.data instanceof Blob) {
          void event.data.arrayBuffer().then((buffer) => {
            dataBuffer.push(new Uint8Array(buffer));
            if (flushTimer === undefined) {
              flushTimer = window.setTimeout(flushData, DATA_BUFFER_FLUSH_MS);
            }
          });
        }
      };
      websocket.onopen = () => {
        reportDebug("terminal.socketOpen", {
          cols: terminal.cols,
          rows: terminal.rows,
          sessionId: pane.sessionId,
        });
        for (const message of pendingSocketMessages) {
          websocket?.send(message);
        }
        pendingSocketMessages = [];
      };
      websocket.onclose = () => {
        reportDebug("terminal.socketClose", {
          sessionId: pane.sessionId,
        });
        pendingSocketMessages = [];
      };
      websocket.onerror = () => {
        reportDebug("terminal.socketError", {
          sessionId: pane.sessionId,
        });
        pendingSocketMessages = [];
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
        fit.fit();
        lastMeasuredSizeRef.current = {
          height: Math.round(containerRef.current?.getBoundingClientRect().height ?? 0),
          width: Math.round(containerRef.current?.getBoundingClientRect().width ?? 0),
        };
        terminal.refresh(0, terminal.rows - 1);
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
      for (const chunk of chunks) {
        terminal.write(chunk);
      }
    };

    const handleTerminalStateMessage = (message: TerminalStateMessage) => {
      if (message.type !== "terminalSessionState") {
        return;
      }

      const historyReplay = getTerminalHistoryReplay(message.session, didApplyHistory);
      didApplyHistory = historyReplay.didApplyHistory;
      if (historyReplay.history !== undefined) {
        reportDebug("terminal.applyHistory", {
          historyLength: historyReplay.history.length,
          sessionId: pane.sessionId,
        });
        terminal.write(historyReplay.history);
      }
    };

    if (connection.mock) {
      reportDebug("terminal.mockConnected", {
        sessionId: pane.sessionId,
      });
      if (pane.snapshot?.history) {
        handleTerminalStateMessage({
          session: pane.snapshot,
          type: "terminalSessionState",
        });
      }
    }

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.key === "Enter" && event.shiftKey) {
        if (event.type === "keydown") {
          sendSocketMessage("\x1b[13;2u");
        }
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
      const resizeMessage: TerminalResizeMessage = {
        cols,
        rows,
        sessionId: pane.sessionId,
        type: "terminalResize",
      };
      sendSocketMessage(JSON.stringify(resizeMessage));
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
      cancelAnimationFrame(rafId);
      window.removeEventListener("focus", onWindowFocus);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      websocket?.close();
      terminal.dispose();
      lastMeasuredSizeRef.current = undefined;
      terminalRef.current = null;
      fitRef.current = null;
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

        reportDebug("terminal.visibleRefit", {
          height: Math.round(bounds.height),
          sessionId: pane.sessionId,
          width: Math.round(bounds.width),
        });
        lastMeasuredSizeRef.current = {
          height: Math.round(bounds.height),
          width: Math.round(bounds.width),
        };
        fitRef.current?.fit();
        terminal.refresh(0, terminal.rows - 1);
      });
    });
  }, [debugLog, isVisible, pane.sessionId, debuggingMode]);

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
    </div>
  );
};
