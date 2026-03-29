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
import { logWorkspaceDebug } from "./workspace-debug";
import { getTerminalTheme } from "./terminal-theme";
import "./terminal-pane.css";

const DATA_BUFFER_FLUSH_MS = 5;

export type TerminalPaneProps = {
  connection: WorkspacePanelConnection;
  debuggingMode: boolean;
  onActivate: () => void;
  pane: WorkspacePanelTerminalPane;
  terminalAppearance: WorkspacePanelTerminalAppearance;
};

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  connection,
  debuggingMode,
  onActivate,
  pane,
  terminalAppearance: _terminalAppearance,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const lastMeasuredSizeRef = useRef<{ height: number; width: number }>();
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const terminal = new Terminal({
      theme: getTerminalTheme(),
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
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
    let dataBuffer: string[] = [];
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
      socketUrl.searchParams.set("sessionId", pane.sessionId);
      socketUrl.searchParams.set("cols", String(terminal.cols));
      socketUrl.searchParams.set("rows", String(terminal.rows));

      websocket = new WebSocket(socketUrl.toString());
      websocket.onmessage = (event) => {
        if (typeof event.data !== "string") {
          return;
        }

        if (event.data.startsWith("{")) {
          const message = JSON.parse(event.data) as TerminalStateMessage;
          handleTerminalStateMessage(message);
          return;
        }

        dataBuffer.push(event.data);
        if (flushTimer === undefined) {
          flushTimer = window.setTimeout(flushData, DATA_BUFFER_FLUSH_MS);
        }
      };
      websocket.onopen = () => {
        logWorkspaceDebug(debuggingMode, "terminal.socketOpen", {
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
        logWorkspaceDebug(debuggingMode, "terminal.socketClose", {
          sessionId: pane.sessionId,
        });
        pendingSocketMessages = [];
      };
      websocket.onerror = () => {
        logWorkspaceDebug(debuggingMode, "terminal.socketError", {
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

        logWorkspaceDebug(debuggingMode, "terminal.initialFit", {
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
      const chunk = dataBuffer.join("");
      dataBuffer = [];
      flushTimer = undefined;
      if (!chunk) {
        return;
      }

      terminal.write(chunk);
    };

    const handleTerminalStateMessage = (message: TerminalStateMessage) => {
      if (message.type !== "terminalSessionState") {
        return;
      }

      if (!didApplyHistory) {
        didApplyHistory = true;
        if (message.session.history) {
          logWorkspaceDebug(debuggingMode, "terminal.applyHistory", {
            historyLength: message.session.history.length,
            sessionId: pane.sessionId,
          });
          terminal.write(message.session.history);
        }
      }
    };

    if (connection.mock) {
      logWorkspaceDebug(debuggingMode, "terminal.mockConnected", {
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
          logWorkspaceDebug(debuggingMode, "terminal.resizeObserverFit", {
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
  }, [
    connection.baseUrl,
    connection.token,
    pane.sessionId,
    debuggingMode,
  ]);

  return (
    <div
      className="terminal-pane-root"
      onMouseDown={(event) => {
        event.stopPropagation();
        logWorkspaceDebug(debuggingMode, "terminal.mouseActivate", {
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
