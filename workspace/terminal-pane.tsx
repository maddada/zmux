import { useEffect, useRef } from "react";
import { FitAddon, Ghostty, Terminal } from "ghostty-web";
import ghosttyWasmUrl from "ghostty-web/ghostty-vt.wasm?url";
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
let ghosttyReadyPromise: Promise<Ghostty> | undefined;

function ensureGhosttyReady(): Promise<Ghostty> {
  ghosttyReadyPromise ??= Ghostty.load(ghosttyWasmUrl);
  return ghosttyReadyPromise;
}

function focusTerminalInput(terminal: Terminal | null | undefined): void {
  terminal?.focus();
}

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
  terminalAppearance,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const lastMeasuredSizeRef = useRef<{ height: number; width: number }>();
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let didDispose = false;
    let websocket: WebSocket | undefined;
    let didApplyHistory = false;
    let dataBuffer: string[] = [];
    let flushTimer: number | undefined;
    let pendingSocketMessages: string[] = [];
    let rafId = 0;
    let terminal: Terminal | undefined;
    let fit: FitAddon | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let cleanupWindowFocus: (() => void) | undefined;

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
      if (connection.mock || websocket || didDispose || !terminal) {
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

    const flushData = () => {
      const chunk = dataBuffer.join("");
      dataBuffer = [];
      flushTimer = undefined;
      if (!chunk || !terminal) {
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
        if (message.session.history && terminal) {
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
    }

    void ensureGhosttyReady().then((ghostty) => {
      if (didDispose || !containerRef.current) {
        return;
      }

      terminal = new Terminal({
        ghostty,
        theme: getTerminalTheme(),
        cursorBlink: terminalAppearance.cursorBlink,
        cursorStyle: terminalAppearance.cursorStyle,
        fontFamily: terminalAppearance.fontFamily,
        fontSize: terminalAppearance.fontSize,
        scrollback: 200_000,
      });
      terminalRef.current = terminal;

      fit = new FitAddon();
      fitRef.current = fit;
      terminal.loadAddon(fit);
      terminal.open(containerRef.current);

      if (document.hasFocus()) {
        focusTerminalInput(terminal);
      }

      const onWindowFocus = () => {
        focusTerminalInput(terminal);
      };
      window.addEventListener("focus", onWindowFocus);
      cleanupWindowFocus = () => {
        window.removeEventListener("focus", onWindowFocus);
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (didDispose || !terminal || !fit) {
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
          connectWebsocket();
        });
      });

      terminal.attachCustomKeyEventHandler((event) => {
        if (event.key === "Enter" && event.shiftKey) {
          if (event.type === "keydown") {
            sendSocketMessage("\x1b[13;2u");
          }
          return true;
        }

        if (event.type === "keydown" && event.metaKey) {
          if (event.key === "t" || (event.key >= "1" && event.key <= "9")) {
            return true;
          }
        }

        return false;
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

      if (connection.mock && pane.snapshot?.history) {
        handleTerminalStateMessage({
          session: pane.snapshot,
          type: "terminalSessionState",
        });
      }

      resizeObserver = new ResizeObserver((entries) => {
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
            if (!fit) {
              return;
            }

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
    });

    const onThemeChange = () => {
      if (!terminal) {
        return;
      }

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
      cleanupWindowFocus?.();
      resizeObserver?.disconnect();
      themeObserver.disconnect();
      websocket?.close();
      terminal?.dispose();
      lastMeasuredSizeRef.current = undefined;
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [
    connection.baseUrl,
    connection.token,
    pane.sessionId,
    debuggingMode,
    terminalAppearance.cursorBlink,
    terminalAppearance.cursorStyle,
    terminalAppearance.fontFamily,
    terminalAppearance.fontSize,
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
        requestAnimationFrame(() => {
          focusTerminalInput(terminalRef.current);
        });
      }}
    >
      <div className="terminal-pane-canvas terminal-tab" ref={containerRef} />
    </div>
  );
};
