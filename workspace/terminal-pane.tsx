import { useEffect, useRef, useState } from "react";
import { IconArrowDownBar } from "@tabler/icons-react";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon, type ISearchOptions } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { loadFonts } from "@xterm/addon-web-fonts";
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
const VISIBLE_REFIT_DELAY_MS = 2_000;
const POST_RECONNECT_HEIGHT_NUDGE_PX = 100;
const NUDGE_RESTORE_TIMEOUT_MS = 250;
const SCROLL_TO_BOTTOM_BUTTON_MARGIN_PX = 200;
const SOCKET_RECONNECT_BASE_DELAY_MS = 250;
const SOCKET_RECONNECT_MAX_DELAY_MS = 2_000;
const SOCKET_ACTIVITY_IDLE_SUMMARY_MS = 1_000;
const SEARCH_RESULTS_EMPTY = {
  resultCount: 0,
  resultIndex: -1,
};
const SEARCH_DECORATIONS: NonNullable<ISearchOptions["decorations"]> = {
  activeMatchBackground: "#ffd166",
  activeMatchBorder: "#ff9f1c",
  activeMatchColorOverviewRuler: "#ff9f1c",
  matchBackground: "#a0c4ff",
  matchBorder: "#4a7bd1",
  matchOverviewRuler: "#4a7bd1",
};
const GENERIC_FONT_FAMILIES = new Set([
  "cursive",
  "emoji",
  "fangsong",
  "fantasy",
  "math",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif",
]);

export type TerminalPaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelConnection;
  debugLog?: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isFocused: boolean;
  isVisible: boolean;
  onActivate: () => void;
  pane: WorkspacePanelTerminalPane;
  refreshRequestId: number;
  terminalAppearance: WorkspacePanelTerminalAppearance;
};

type SearchResultsState = {
  resultCount: number;
  resultIndex: number;
};

function getLoadableWebFontFamilies(fontFamily: string | undefined): string[] {
  if (!fontFamily) {
    return [];
  }

  const seen = new Set<string>();
  return fontFamily
    .match(/"[^"]+"|'[^']+'|[^,]+/g)
    ?.map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
    .filter((family) => family.length > 0)
    .filter((family) => !GENERIC_FONT_FAMILIES.has(family.toLowerCase()))
    .filter((family) => {
      if (seen.has(family)) {
        return false;
      }
      seen.add(family);
      return true;
    }) ?? [];
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  autoFocusRequest,
  connection,
  debugLog,
  debuggingMode,
  isFocused,
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
  const isTerminalOpenRef = useRef(false);
  const lastMeasuredSizeRef = useRef<{ height: number; width: number } | undefined>(undefined);
  const nudgeTerminalHeightRef = useRef<((afterNudge?: () => void) => void) | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const updateScrollToBottomButtonVisibilityRef = useRef<(() => void) | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRegex, setSearchRegex] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultsState>(SEARCH_RESULTS_EMPTY);
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

  const ensureWebFontsLoaded = async (
    fontFamily: string | undefined,
    reason: "appearance" | "initial",
  ): Promise<void> => {
    const families = getLoadableWebFontFamilies(fontFamily);
    if (families.length === 0) {
      reportDebug("terminal.webFontsLoadSkipped", {
        fontFamily,
        reason,
        sessionId: pane.sessionId,
      });
      return;
    }

    const startedAt = performance.now();
    reportDebug("terminal.webFontsLoadStart", {
      documentFontsStatus: document.fonts?.status,
      families,
      fontFamily,
      reason,
      sessionId: pane.sessionId,
    });
    try {
      await loadFonts(families);
      reportDebug("terminal.webFontsLoadSuccess", {
        documentFontsStatus: document.fonts?.status,
        durationMs: Math.round(performance.now() - startedAt),
        families,
        fontFamily,
        reason,
        sessionId: pane.sessionId,
      });
    } catch (error) {
      reportDebug("terminal.webFontsLoadError", {
        documentFontsStatus: document.fonts?.status,
        durationMs: Math.round(performance.now() - startedAt),
        families,
        fontFamily,
        message: error instanceof Error ? error.message : String(error),
        reason,
        sessionId: pane.sessionId,
      });
    }
  };

  const getSearchOptions = (incremental: boolean): ISearchOptions => ({
    caseSensitive: searchCaseSensitive,
    decorations: SEARCH_DECORATIONS,
    incremental,
    regex: searchRegex,
  });

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    focusSearchInput();
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    searchAddonRef.current?.clearDecorations();
    setSearchResults(SEARCH_RESULTS_EMPTY);
    requestAnimationFrame(() => {
      terminalRef.current?.focus();
    });
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
    const searchAddon = new SearchAddon({
      highlightLimit: 1_000,
    });
    searchAddonRef.current = searchAddon;
    terminal.loadAddon(searchAddon);

    const unicode11 = new Unicode11Addon();
    terminal.loadAddon(unicode11);
    terminal.unicode.activeVersion = "11";

    let rendererMode: "fallback" | "unknown" | "webgl" = "unknown";

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
    let reconnectSocketTimeoutId: number | undefined;
    let reconnectSocketAttempt = 0;
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
    const searchResultsDisposable = searchAddon.onDidChangeResults((event) => {
      setSearchResults({
        resultCount: event.resultCount,
        resultIndex: event.resultIndex,
      });
    });

    const updateScrollToBottomButtonVisibility = () => {
      const container = containerRef.current;
      if (!container || !isTerminalOpenRef.current || !isVisibleRef.current || terminal.rows <= 0) {
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
      if (!isTerminalOpenRef.current) {
        return;
      }

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

    const clearSocketReconnectTimeout = () => {
      if (reconnectSocketTimeoutId !== undefined) {
        window.clearTimeout(reconnectSocketTimeoutId);
        reconnectSocketTimeoutId = undefined;
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

        if (!isVisibleRef.current) {
          lastMeasuredSizeRef.current = undefined;
          reportDebug("terminal.reconnectRepairDeferredHidden", {
            sessionId: pane.sessionId,
          });
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

      firstData = true;
      dataBuffer = [];
      if (flushTimer !== undefined) {
        window.clearTimeout(flushTimer);
        flushTimer = undefined;
      }

      const sessionSocket = new WebSocket(socketUrl.toString());
      websocket = sessionSocket;
      sessionSocket.binaryType = "arraybuffer";
      sessionSocket.onmessage = (event) => {
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
      sessionSocket.onopen = () => {
        socketConnectionSequence += 1;
        socketConnectionId = socketConnectionSequence;
        reconnectSocketAttempt = 0;
        clearSocketReconnectTimeout();
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
      const scheduleSocketReconnect = (reason: "close" | "error") => {
        if (didDispose || connection.mock || reconnectSocketTimeoutId !== undefined) {
          return;
        }

        const delayMs = Math.min(
          SOCKET_RECONNECT_MAX_DELAY_MS,
          SOCKET_RECONNECT_BASE_DELAY_MS * 2 ** reconnectSocketAttempt,
        );
        reconnectSocketAttempt += 1;
        reportDebug("terminal.socketReconnectScheduled", {
          attempt: reconnectSocketAttempt,
          delayMs,
          reason,
          sessionId: pane.sessionId,
        });
        reconnectSocketTimeoutId = window.setTimeout(() => {
          reconnectSocketTimeoutId = undefined;
          connectWebsocket();
        }, delayMs);
      };

      sessionSocket.onclose = () => {
        logSocketConnectionSummary("close");
        reportDebug("terminal.socketClose", {
          connectionId: socketConnectionId,
          sessionId: pane.sessionId,
        });
        pendingReconnectRefitAfterData = false;
        if (reconnectRefitTimeoutId !== undefined) {
          window.clearTimeout(reconnectRefitTimeoutId);
          reconnectRefitTimeoutId = undefined;
        }
        if (websocket === sessionSocket) {
          websocket = undefined;
        }
        scheduleSocketReconnect("close");
      };
      sessionSocket.onerror = () => {
        logSocketConnectionSummary("error");
        reportDebug("terminal.socketError", {
          connectionId: socketConnectionId,
          sessionId: pane.sessionId,
        });
        pendingReconnectRefitAfterData = false;
        if (reconnectRefitTimeoutId !== undefined) {
          window.clearTimeout(reconnectRefitTimeoutId);
          reconnectRefitTimeoutId = undefined;
        }
        if (websocket === sessionSocket) {
          websocket = undefined;
        }
        scheduleSocketReconnect("error");
      };
    };

    void ensureWebFontsLoaded(terminalAppearance.fontFamily, "initial").finally(() => {
      if (didDispose || !containerRef.current) {
        return;
      }

      terminal.open(containerRef.current);
      isTerminalOpenRef.current = true;

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

      if (IS_MAC && event.type === "keydown" && event.metaKey) {
        if (event.key === "ArrowLeft") {
          sendSocketMessage("\x01");
          return false;
        }
        if (event.key === "ArrowRight") {
          sendSocketMessage("\x05");
          return false;
        }
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
          !isTerminalOpenRef.current ||
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
      clearSocketReconnectTimeout();
      cancelAnimationFrame(rafId);
      window.removeEventListener("focus", onWindowFocus);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      scrollDisposable.dispose();
      searchResultsDisposable.dispose();
      containerRef.current?.removeEventListener("copy", handleCopy, true);
      containerRef.current?.removeEventListener("paste", handlePaste, true);
      websocket?.close();
      terminal.dispose();
      isTerminalOpenRef.current = false;
      lastMeasuredSizeRef.current = undefined;
      nudgeTerminalHeightRef.current = null;
      searchAddonRef.current = null;
      terminalRef.current = null;
      fitRef.current = null;
      updateScrollToBottomButtonVisibilityRef.current = null;
      setShowScrollToBottomButton(false);
    };
  }, [connection.baseUrl, connection.token, pane.sessionId]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || !isTerminalOpenRef.current) {
      return;
    }

    let didCancel = false;
    void ensureWebFontsLoaded(terminalAppearance.fontFamily, "appearance").finally(() => {
      if (didCancel || !terminalRef.current || !isTerminalOpenRef.current) {
        return;
      }

      terminal.options = getTerminalAppearanceOptions(terminalAppearance);
      fitRef.current?.fit();
      terminal.refresh(0, terminal.rows - 1);
      requestAnimationFrame(() => {
        updateScrollToBottomButtonVisibilityRef.current?.();
      });
    });

    return () => {
      didCancel = true;
    };
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
      setShowScrollToBottomButton(false);
      return;
    }

    const visibleRefitTimeoutId = window.setTimeout(() => {
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
    }, VISIBLE_REFIT_DELAY_MS);

    return () => {
      window.clearTimeout(visibleRefitTimeoutId);
    };
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
        nudgeTerminalHeightRef.current?.(() => {
          updateScrollToBottomButtonVisibilityRef.current?.();
        });
      });
    });
  }, [isVisible, refreshRequestId]);

  useEffect(() => {
    if (isFocused || !isSearchOpen) {
      return;
    }

    closeSearch();
  }, [isFocused, isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    focusSearchInput();
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const searchAddon = searchAddonRef.current;
    if (!searchAddon) {
      return;
    }

    if (searchQuery.length === 0) {
      searchAddon.clearDecorations();
      setSearchResults(SEARCH_RESULTS_EMPTY);
      return;
    }

    const didFindResult = searchAddon.findNext(searchQuery, getSearchOptions(true));
    if (!didFindResult) {
      setSearchResults(SEARCH_RESULTS_EMPTY);
    }
  }, [isSearchOpen, searchCaseSensitive, searchQuery, searchRegex]);

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
      onKeyDownCapture={(event) => {
        const primaryModifier = IS_MAC ? event.metaKey : event.ctrlKey;
        if (!primaryModifier || event.key.toLowerCase() !== "f") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        openSearch();
      }}
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
      {isSearchOpen ? (
        <div
          className="terminal-pane-search"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <input
            aria-label="Search terminal output"
            className="terminal-pane-search-input"
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeSearch();
                return;
              }

              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              if (searchQuery.length === 0) {
                return;
              }

              const searchAddon = searchAddonRef.current;
              if (!searchAddon) {
                return;
              }

              if (event.shiftKey) {
                searchAddon.findPrevious(searchQuery, getSearchOptions(false));
                return;
              }

              searchAddon.findNext(searchQuery, getSearchOptions(false));
            }}
            placeholder="Find in terminal"
            ref={searchInputRef}
            spellCheck={false}
            type="text"
            value={searchQuery}
          />
          <div className="terminal-pane-search-status">
            {getTerminalSearchStatusLabel(searchQuery, searchResults)}
          </div>
          <button
            aria-label="Toggle case-sensitive search"
            aria-pressed={searchCaseSensitive}
            className={`terminal-pane-search-toggle ${searchCaseSensitive ? "terminal-pane-search-toggle-active" : ""}`.trim()}
            onClick={(event) => {
              event.stopPropagation();
              setSearchCaseSensitive((currentValue) => !currentValue);
            }}
            type="button"
          >
            Aa
          </button>
          <button
            aria-label="Toggle regex search"
            aria-pressed={searchRegex}
            className={`terminal-pane-search-toggle ${searchRegex ? "terminal-pane-search-toggle-active" : ""}`.trim()}
            onClick={(event) => {
              event.stopPropagation();
              setSearchRegex((currentValue) => !currentValue);
            }}
            type="button"
          >
            .*
          </button>
          <button
            className="terminal-pane-search-button"
            onClick={(event) => {
              event.stopPropagation();
              if (searchQuery.length === 0) {
                return;
              }
              searchAddonRef.current?.findPrevious(searchQuery, getSearchOptions(false));
            }}
            type="button"
          >
            Prev
          </button>
          <button
            className="terminal-pane-search-button"
            onClick={(event) => {
              event.stopPropagation();
              if (searchQuery.length === 0) {
                return;
              }
              searchAddonRef.current?.findNext(searchQuery, getSearchOptions(false));
            }}
            type="button"
          >
            Next
          </button>
          <button
            className="terminal-pane-search-close"
            onClick={(event) => {
              event.stopPropagation();
              closeSearch();
            }}
            type="button"
          >
            Close
          </button>
        </div>
      ) : null}
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

function getTerminalSearchStatusLabel(
  query: string,
  searchResults: SearchResultsState,
): string {
  if (query.length === 0) {
    return "Type to search";
  }

  if (searchResults.resultCount === 0 || searchResults.resultIndex < 0) {
    return "No matches";
  }

  return `${String(searchResults.resultIndex + 1)} / ${String(searchResults.resultCount)}`;
}
