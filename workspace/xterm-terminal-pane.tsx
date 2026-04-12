import { useEffect, useRef, useState } from "react";
import { IconArrowBigDownFilled } from "@tabler/icons-react";
import { AttachAddon } from "@xterm/addon-attach";
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
import type {
  TerminalInputMessage,
  TerminalReadyMessage,
  TerminalResizeMessage,
} from "../shared/terminal-host-protocol";
import {
  getTerminalAppearanceDependencies,
  getTerminalAppearanceFontLoadKey,
  getTerminalAppearanceOptions,
} from "./terminal-appearance";
import { getTerminalTheme } from "./terminal-theme";
import { logWorkspaceDebug } from "./workspace-debug";
import { getXtermViewportDimensions, measureTerminalFont } from "./xterm-font-metrics";
import "./terminal-pane.css";

const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const SCROLL_TO_BOTTOM_BUTTON_MARGIN_PX = 200;
const SCROLL_ANCHOR_BOTTOM_THRESHOLD_ROWS = 1;
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
const terminalWebFontLoadPromiseByKey = new Map<string, Promise<void>>();
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

export type XtermTerminalPaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelConnection;
  debugLog?: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isFocused: boolean;
  isVisible: boolean;
  onTerminalEnter?: () => void;
  onActivate: (source: "focusin" | "pointer") => void;
  pane: WorkspacePanelTerminalPane;
  refreshRequestId: number;
  scrollToBottomRequestId?: number;
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
  return (
    fontFamily
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
      }) ?? []
  );
}

function createTerminalInputMessage(sessionId: string, data: string): string {
  const message: TerminalInputMessage = {
    data,
    sessionId,
    type: "terminalInput",
  };
  return JSON.stringify(message);
}

function createTerminalReadyMessage(sessionId: string, cols: number, rows: number): string {
  const message: TerminalReadyMessage = {
    cols,
    rows,
    sessionId,
    type: "terminalReady",
  };
  return JSON.stringify(message);
}

function createTerminalResizeMessage(sessionId: string, cols: number, rows: number): string {
  const message: TerminalResizeMessage = {
    cols,
    rows,
    sessionId,
    type: "terminalResize",
  };
  return JSON.stringify(message);
}

export const XtermTerminalPane: React.FC<XtermTerminalPaneProps> = ({
  autoFocusRequest,
  connection,
  debugLog,
  debuggingMode,
  isFocused,
  isVisible,
  onTerminalEnter,
  onActivate,
  pane,
  refreshRequestId,
  scrollToBottomRequestId,
  terminalAppearance,
}) => {
  const terminalAppearanceDependencies = getTerminalAppearanceDependencies(terminalAppearance);
  const terminalAppearanceFontLoadKey = getTerminalAppearanceFontLoadKey(
    terminalAppearance.fontFamily,
  );
  const terminalAppearanceOptions = getTerminalAppearanceOptions(terminalAppearance);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debugLogRef = useRef(debugLog);
  const debuggingModeRef = useRef(debuggingMode);
  const fontMetricsRef = useRef<ReturnType<typeof measureTerminalFont> | null>(null);
  const handledAutoFocusRequestIdRef = useRef<number | undefined>(undefined);
  const handledRefreshRequestIdRef = useRef(refreshRequestId);
  const handledScrollToBottomRequestIdRef = useRef<number | undefined>(undefined);
  const isVisibleRef = useRef(isVisible);
  const isFocusedRef = useRef(isFocused);
  const isTerminalOpenRef = useRef(false);
  const needsReconnectRecoveryOnVisibleRef = useRef(false);
  const applyViewportGeometryRef = useRef<
    ((options?: { force?: boolean; refresh?: boolean }) => boolean) | null
  >(null);
  const ensureTerminalVisibleReadyRef = useRef<(() => void) | null>(null);
  const lastMeasuredSizeRef = useRef<{ height: number; width: number } | undefined>(undefined);
  const preserveTerminalBottomLockRef = useRef<(<T>(applyLayoutChange: () => T) => T) | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const streamAttachAddonRef = useRef<AttachAddon | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const updateScrollToBottomButtonVisibilityRef = useRef<(() => void) | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRegex, setSearchRegex] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultsState>(SEARCH_RESULTS_EMPTY);
  const [isTerminalSurfaceReady, setIsTerminalSurfaceReady] = useState(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);

  const withPreservedTerminalBottomLock = <T,>(applyLayoutChange: () => T): T => {
    const preserveTerminalBottomLock = preserveTerminalBottomLockRef.current;
    if (!preserveTerminalBottomLock) {
      return applyLayoutChange();
    }

    return preserveTerminalBottomLock(applyLayoutChange);
  };

  useEffect(() => {
    debugLogRef.current = debugLog;
  }, [debugLog]);

  useEffect(() => {
    debuggingModeRef.current = debuggingMode;
  }, [debuggingMode]);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const reportDebug = (event: string, payload?: Record<string, unknown>) => {
    const decoratedPayload = {
      renderNonce: pane.renderNonce,
      sessionId: pane.sessionId,
      terminalEngine: pane.sessionRecord.terminalEngine,
      ...payload,
    };
    logWorkspaceDebug(debuggingModeRef.current, event, decoratedPayload);
    debugLogRef.current?.(event, decoratedPayload);
  };

  const scrollTerminalToBottom = () => {
    const terminal = terminalRef.current;
    if (!terminal || !isTerminalOpenRef.current) {
      return false;
    }

    terminal.focus();
    terminal.scrollToBottom();
    requestAnimationFrame(() => {
      updateScrollToBottomButtonVisibilityRef.current?.();
    });
    return true;
  };

  const ensureWebFontsLoaded = async (
    fontFamily: string | undefined,
    reason: "appearance" | "initial",
  ): Promise<void> => {
    const families = getLoadableWebFontFamilies(fontFamily);
    if (families.length === 0) {
      return;
    }

    try {
      reportDebug("terminal.webFontsLoadStart", {
        families,
        fontFamily,
        reason,
      });
      const loadKey = getTerminalAppearanceFontLoadKey(fontFamily);
      let loadPromise = terminalWebFontLoadPromiseByKey.get(loadKey);
      if (!loadPromise) {
        loadPromise = loadFonts(families).catch((error) => {
          terminalWebFontLoadPromiseByKey.delete(loadKey);
          throw error;
        });
        terminalWebFontLoadPromiseByKey.set(loadKey, loadPromise);
      }
      await loadPromise;
      await document.fonts?.ready;
      reportDebug("terminal.webFontsLoadSuccess", {
        families,
        fontFamily,
        reason,
      });
    } catch (error) {
      reportDebug("terminal.webFontsLoadError", {
        families,
        fontFamily,
        message: error instanceof Error ? error.message : String(error),
        reason,
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
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const terminal = new Terminal({
      allowProposedApi: true,
      ...terminalAppearanceOptions,
      fontWeight: "400",
      fontWeightBold: "700",
      scrollback: terminalAppearance.xtermFrontendScrollback,
      theme: getTerminalTheme(),
    });
    terminalRef.current = terminal;

    const searchAddon = new SearchAddon({
      highlightLimit: 1_000,
    });
    searchAddonRef.current = searchAddon;
    terminal.loadAddon(searchAddon);

    const unicode11 = new Unicode11Addon();
    terminal.loadAddon(unicode11);
    terminal.unicode.activeVersion = "11";

    let rendererMode: "fallback" | "unknown" | "webgl" = "unknown";
    let didDispose = false;
    let websocket: WebSocket | undefined;
    let readySent = false;
    let pendingSocketMessages: string[] = [];
    let pendingReconnectLayoutAfterData = false;
    let reconnectLayoutFrame = 0;
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
    let initialAppearanceReady = false;
    let pendingVisibleStartup = false;
    let didCompleteFirstVisiblePaint = false;
    let pendingVisibleStartupOuterFrame = 0;
    let pendingVisibleStartupInnerFrame = 0;
    let pendingWebglActivationOuterFrame = 0;
    let pendingWebglActivationInnerFrame = 0;
    let webglAddon: WebglAddon | null = null;
    let webglUnavailable = false;

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

      if (websocket.readyState === WebSocket.OPEN && readySent) {
        websocket.send(message);
        return;
      }

      if (
        websocket.readyState === WebSocket.CONNECTING ||
        (websocket.readyState === WebSocket.OPEN && !readySent)
      ) {
        pendingSocketMessages.push(message);
      }
    };

    const sendReadyMessage = () => {
      if (!websocket || websocket.readyState !== WebSocket.OPEN || readySent) {
        return;
      }

      websocket.send(createTerminalReadyMessage(pane.sessionId, terminal.cols, terminal.rows));
      readySent = true;
      for (const message of pendingSocketMessages) {
        websocket.send(message);
      }
      pendingSocketMessages = [];
    };

    const shouldKeepTerminalAtBottom = (): boolean => {
      if (!isTerminalOpenRef.current) {
        return false;
      }

      const activeBuffer = terminal.buffer.active;
      if (!activeBuffer) {
        return false;
      }

      return activeBuffer.baseY - activeBuffer.viewportY <= SCROLL_ANCHOR_BOTTOM_THRESHOLD_ROWS;
    };

    const preserveTerminalBottomLock = <T,>(applyLayoutChange: () => T): T => {
      const shouldKeepAtBottom = shouldKeepTerminalAtBottom();
      const result = applyLayoutChange();
      if (shouldKeepAtBottom) {
        terminal.scrollToBottom();
      }
      return result;
    };
    preserveTerminalBottomLockRef.current = preserveTerminalBottomLock;

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
          sendSocketMessage(createTerminalInputMessage(pane.sessionId, text));
        }
      } catch {
        // Clipboard access can fail outside a user gesture.
      }
    };

    const pasteFromShortcut = () => {
      suppressPasteEvent = true;
      void pasteClipboardText();
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

    const measureFontMetrics = () => {
      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return fontMetricsRef.current;
      }

      const nextMetrics = measureTerminalFont({
        appearance: terminalAppearanceOptions,
        container: currentContainer,
        useDevicePixelAdjustment: rendererMode !== "fallback",
      });
      if (nextMetrics) {
        fontMetricsRef.current = nextMetrics;
      }
      return nextMetrics;
    };

    const applyViewportGeometry = (options?: { force?: boolean; refresh?: boolean }): boolean => {
      if (!isTerminalOpenRef.current) {
        return false;
      }

      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return false;
      }

      const bounds = currentContainer.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        lastMeasuredSizeRef.current = undefined;
        return false;
      }

      const nextMeasuredSize = {
        height: Math.round(bounds.height),
        width: Math.round(bounds.width),
      };
      const previousMeasuredSize = lastMeasuredSizeRef.current;
      if (
        !options?.force &&
        previousMeasuredSize &&
        previousMeasuredSize.width === nextMeasuredSize.width &&
        previousMeasuredSize.height === nextMeasuredSize.height
      ) {
        return false;
      }

      const currentWindow = currentContainer.ownerDocument.defaultView;
      const fontMetrics = measureFontMetrics();
      if (!currentWindow || !fontMetrics) {
        return false;
      }

      const nextDimensions = getXtermViewportDimensions({
        containerHeight: bounds.height,
        containerWidth: bounds.width,
        font: fontMetrics,
        window: currentWindow,
      });
      if (!nextDimensions) {
        return false;
      }

      lastMeasuredSizeRef.current = nextMeasuredSize;
      preserveTerminalBottomLock(() => {
        if (terminal.cols !== nextDimensions.cols || terminal.rows !== nextDimensions.rows) {
          terminal.resize(nextDimensions.cols, nextDimensions.rows);
        }
        if (options?.refresh) {
          terminal.refresh(0, Math.max(0, terminal.rows - 1));
        }
      });
      updateScrollToBottomButtonVisibility();
      return true;
    };
    applyViewportGeometryRef.current = applyViewportGeometry;

    const clearPendingWebglActivation = () => {
      if (pendingWebglActivationOuterFrame !== 0) {
        window.cancelAnimationFrame(pendingWebglActivationOuterFrame);
        pendingWebglActivationOuterFrame = 0;
      }
      if (pendingWebglActivationInnerFrame !== 0) {
        window.cancelAnimationFrame(pendingWebglActivationInnerFrame);
        pendingWebglActivationInnerFrame = 0;
      }
    };

    const clearPendingVisibleStartup = () => {
      if (pendingVisibleStartupOuterFrame !== 0) {
        window.cancelAnimationFrame(pendingVisibleStartupOuterFrame);
        pendingVisibleStartupOuterFrame = 0;
      }
      if (pendingVisibleStartupInnerFrame !== 0) {
        window.cancelAnimationFrame(pendingVisibleStartupInnerFrame);
        pendingVisibleStartupInnerFrame = 0;
      }
    };

    const enableWebglRenderer = () => {
      if (
        didDispose ||
        webglUnavailable ||
        webglAddon ||
        !isTerminalOpenRef.current ||
        !isVisibleRef.current
      ) {
        return;
      }

      try {
        const nextWebglAddon = new WebglAddon();
        nextWebglAddon.onContextLoss(() => {
          rendererMode = "fallback";
          webglUnavailable = true;
          nextWebglAddon.dispose();
          webglAddon = null;
          fontMetricsRef.current = measureFontMetrics();
          if (isVisibleRef.current) {
            requestAnimationFrame(() => {
              applyViewportGeometry({
                force: true,
                refresh: true,
              });
            });
          }
        });
        terminal.loadAddon(nextWebglAddon);
        webglAddon = nextWebglAddon;
        rendererMode = "webgl";
        fontMetricsRef.current = measureFontMetrics();
      } catch {
        rendererMode = "fallback";
        webglUnavailable = true;
        fontMetricsRef.current = measureFontMetrics();
      }
    };

    const scheduleWebglActivation = () => {
      if (
        didDispose ||
        webglUnavailable ||
        webglAddon ||
        !isTerminalOpenRef.current ||
        !isVisibleRef.current
      ) {
        return;
      }

      clearPendingWebglActivation();
      pendingWebglActivationOuterFrame = window.requestAnimationFrame(() => {
        pendingWebglActivationOuterFrame = 0;
        pendingWebglActivationInnerFrame = window.requestAnimationFrame(() => {
          pendingWebglActivationInnerFrame = 0;
          if (didDispose || !isVisibleRef.current) {
            return;
          }

          enableWebglRenderer();
          applyViewportGeometry({
            force: true,
            refresh: true,
          });
        });
      });
    };

    const ensureTerminalVisibleReady = () => {
      if (didDispose || !isVisibleRef.current) {
        pendingVisibleStartup = true;
        return;
      }

      if (!initialAppearanceReady) {
        pendingVisibleStartup = true;
        return;
      }

      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return;
      }

      const currentWindow = currentContainer.ownerDocument.defaultView;
      const bounds = currentContainer.getBoundingClientRect();
      if (
        currentWindow?.document.visibilityState !== "visible" ||
        bounds.width <= 0 ||
        bounds.height <= 0
      ) {
        pendingVisibleStartup = true;
        return;
      }

      pendingVisibleStartup = false;
      if (!didCompleteFirstVisiblePaint) {
        setIsTerminalSurfaceReady(false);
      }
      clearPendingVisibleStartup();
      pendingVisibleStartupOuterFrame = window.requestAnimationFrame(() => {
        pendingVisibleStartupOuterFrame = 0;
        pendingVisibleStartupInnerFrame = window.requestAnimationFrame(() => {
          pendingVisibleStartupInnerFrame = 0;
          if (didDispose || !isVisibleRef.current) {
            pendingVisibleStartup = true;
            return;
          }

          const readyContainer = containerRef.current;
          if (!readyContainer) {
            return;
          }

          const readyWindow = readyContainer.ownerDocument.defaultView;
          const readyBounds = readyContainer.getBoundingClientRect();
          if (
            readyWindow?.document.visibilityState !== "visible" ||
            readyBounds.width <= 0 ||
            readyBounds.height <= 0
          ) {
            pendingVisibleStartup = true;
            return;
          }

          if (!isTerminalOpenRef.current) {
            terminal.open(readyContainer);
            isTerminalOpenRef.current = true;
          }

          if (document.hasFocus() && isFocusedRef.current) {
            terminal.focus();
          }

          applyViewportGeometry({
            force: true,
            refresh: true,
          });
          scheduleWebglActivation();
          if (needsReconnectRecoveryOnVisibleRef.current) {
            needsReconnectRecoveryOnVisibleRef.current = false;
            const reconnectRecoveryCols = terminal.cols;
            const reconnectRecoveryRows = terminal.rows;
            if (reconnectRecoveryCols > 0 && reconnectRecoveryRows > 0) {
              preserveTerminalBottomLock(() => {
                terminal.resize(reconnectRecoveryCols, reconnectRecoveryRows + 1);
              });
              window.requestAnimationFrame(() => {
                if (didDispose || !isVisibleRef.current) {
                  needsReconnectRecoveryOnVisibleRef.current = true;
                  return;
                }

                preserveTerminalBottomLock(() => {
                  terminal.resize(reconnectRecoveryCols, reconnectRecoveryRows);
                });
                applyViewportGeometry({
                  force: true,
                  refresh: true,
                });
              });
            }
          }

          if (!didCompleteFirstVisiblePaint) {
            didCompleteFirstVisiblePaint = true;
            window.requestAnimationFrame(() => {
              if (didDispose || !isVisibleRef.current) {
                return;
              }

              window.requestAnimationFrame(() => {
                if (didDispose || !isVisibleRef.current) {
                  return;
                }

                applyViewportGeometry({
                  force: true,
                  refresh: true,
                });
                setIsTerminalSurfaceReady(true);
              });
            });
          } else {
            setIsTerminalSurfaceReady(true);
          }
        });
      });
    };
    ensureTerminalVisibleReadyRef.current = ensureTerminalVisibleReady;

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
      }

      socketBinaryBytes += byteLength;
      socketBinaryChunks += 1;
      socketFlushBytes += byteLength;
      socketFlushCount += 1;
      socketLargestFlushBytes = Math.max(socketLargestFlushBytes, byteLength);
      scheduleSocketIdleSummary();
    };

    const scheduleReconnectLayoutRefresh = () => {
      if (!pendingReconnectLayoutAfterData) {
        return;
      }

      pendingReconnectLayoutAfterData = false;
      if (reconnectLayoutFrame !== 0) {
        window.cancelAnimationFrame(reconnectLayoutFrame);
      }
      reconnectLayoutFrame = window.requestAnimationFrame(() => {
        reconnectLayoutFrame = 0;
        if (didDispose) {
          return;
        }

        if (!isVisibleRef.current) {
          needsReconnectRecoveryOnVisibleRef.current = true;
          lastMeasuredSizeRef.current = undefined;
          return;
        }

        applyViewportGeometry({
          force: true,
          refresh: true,
        });
      });
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

      streamAttachAddonRef.current?.dispose();
      streamAttachAddonRef.current = null;
      terminal.reset();

      const sessionSocket = new WebSocket(socketUrl.toString());
      websocket = sessionSocket;
      readySent = false;
      sessionSocket.binaryType = "arraybuffer";
      const attachAddon = new AttachAddon(sessionSocket, {
        bidirectional: false,
      });
      streamAttachAddonRef.current = attachAddon;
      terminal.loadAddon(attachAddon);
      sessionSocket.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          noteSocketBinaryChunk(new TextEncoder().encode(event.data).byteLength);
          scheduleReconnectLayoutRefresh();
          requestAnimationFrame(() => {
            updateScrollToBottomButtonVisibility();
          });
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          noteSocketBinaryChunk(event.data.byteLength);
          scheduleReconnectLayoutRefresh();
          requestAnimationFrame(() => {
            updateScrollToBottomButtonVisibility();
          });
          return;
        }

        if (event.data instanceof Blob) {
          void event.data.arrayBuffer().then((buffer) => {
            noteSocketBinaryChunk(buffer.byteLength);
            scheduleReconnectLayoutRefresh();
            requestAnimationFrame(() => {
              updateScrollToBottomButtonVisibility();
            });
          });
        }
      });
      sessionSocket.onopen = () => {
        socketConnectionSequence += 1;
        socketConnectionId = socketConnectionSequence;
        reconnectSocketAttempt = 0;
        clearSocketReconnectTimeout();
        resetSocketConnectionMetrics();
        socketOpenedAtMs = performance.now();
        pendingReconnectLayoutAfterData = true;
        sendReadyMessage();
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
        });
        reconnectSocketTimeoutId = window.setTimeout(() => {
          reconnectSocketTimeoutId = undefined;
          connectWebsocket();
        }, delayMs);
      };

      sessionSocket.onclose = () => {
        logSocketConnectionSummary("close");
        pendingReconnectLayoutAfterData = false;
        if (reconnectLayoutFrame !== 0) {
          window.cancelAnimationFrame(reconnectLayoutFrame);
          reconnectLayoutFrame = 0;
        }
        if (streamAttachAddonRef.current === attachAddon) {
          streamAttachAddonRef.current.dispose();
          streamAttachAddonRef.current = null;
        }
        if (websocket === sessionSocket) {
          websocket = undefined;
        }
        readySent = false;
        scheduleSocketReconnect("close");
      };
      sessionSocket.onerror = () => {
        logSocketConnectionSummary("error");
        pendingReconnectLayoutAfterData = false;
        if (reconnectLayoutFrame !== 0) {
          window.cancelAnimationFrame(reconnectLayoutFrame);
          reconnectLayoutFrame = 0;
        }
        if (streamAttachAddonRef.current === attachAddon) {
          streamAttachAddonRef.current.dispose();
          streamAttachAddonRef.current = null;
        }
        if (websocket === sessionSocket) {
          websocket = undefined;
        }
        readySent = false;
        scheduleSocketReconnect("error");
      };
    };

    void ensureWebFontsLoaded(terminalAppearanceOptions.fontFamily, "initial").finally(() => {
      if (didDispose || !containerRef.current) {
        return;
      }

      const initialFontMetrics = measureTerminalFont({
        appearance: terminalAppearanceOptions,
        container: containerRef.current,
      });
      if (initialFontMetrics) {
        fontMetricsRef.current = initialFontMetrics;
        const currentWindow = containerRef.current.ownerDocument.defaultView;
        const bounds = containerRef.current.getBoundingClientRect();
        const initialDimensions = currentWindow
          ? getXtermViewportDimensions({
              containerHeight: bounds.height,
              containerWidth: bounds.width,
              font: initialFontMetrics,
              window: currentWindow,
            })
          : null;
        if (initialDimensions) {
          terminal.resize(initialDimensions.cols, initialDimensions.rows);
          lastMeasuredSizeRef.current = {
            height: Math.round(bounds.height),
            width: Math.round(bounds.width),
          };
        }
      }

      initialAppearanceReady = true;
      connectWebsocket();
      if (isVisibleRef.current || pendingVisibleStartup) {
        ensureTerminalVisibleReady();
      }
    });

    if (connection.mock && pane.snapshot?.history !== undefined) {
      terminal.write(pane.snapshot.history);
    }

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.key === "Enter" && event.shiftKey) {
        if (event.type === "keydown") {
          sendSocketMessage(createTerminalInputMessage(pane.sessionId, "\x1b[13;2u"));
        }
        return false;
      }

      if (IS_MAC && event.type === "keydown" && event.metaKey) {
        if (event.key === "ArrowLeft") {
          sendSocketMessage(createTerminalInputMessage(pane.sessionId, "\x01"));
          return false;
        }
        if (event.key === "ArrowRight") {
          sendSocketMessage(createTerminalInputMessage(pane.sessionId, "\x05"));
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
      sendSocketMessage(createTerminalInputMessage(pane.sessionId, data));
    });

    terminal.onResize(({ cols, rows }) => {
      socketResizeCount += 1;
      sendSocketMessage(createTerminalResizeMessage(pane.sessionId, cols, rows));
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

      sendSocketMessage(createTerminalInputMessage(pane.sessionId, text));
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
      if (width <= 0 || height <= 0) {
        return;
      }

      const nextMeasuredSize = {
        height: Math.round(height),
        width: Math.round(width),
      };
      const previousMeasuredSize = lastMeasuredSizeRef.current;
      if (
        !isTerminalOpenRef.current ||
        (previousMeasuredSize &&
          previousMeasuredSize.width === nextMeasuredSize.width &&
          previousMeasuredSize.height === nextMeasuredSize.height)
      ) {
        return;
      }

      lastMeasuredSizeRef.current = nextMeasuredSize;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyViewportGeometry({
          force: true,
        });
      });
    });
    resizeObserver.observe(container);

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

    const onWindowFocus = () => {
      if (!isVisibleRef.current || !isFocusedRef.current) {
        return;
      }
      terminal.focus();
    };
    window.addEventListener("focus", onWindowFocus);

    return () => {
      didDispose = true;
      if (reconnectLayoutFrame !== 0) {
        window.cancelAnimationFrame(reconnectLayoutFrame);
        reconnectLayoutFrame = 0;
      }
      clearPendingVisibleStartup();
      clearPendingWebglActivation();
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
      streamAttachAddonRef.current?.dispose();
      streamAttachAddonRef.current = null;
      websocket?.close();
      webglAddon?.dispose();
      webglAddon = null;
      terminal.dispose();
      isTerminalOpenRef.current = false;
      needsReconnectRecoveryOnVisibleRef.current = false;
      applyViewportGeometryRef.current = null;
      ensureTerminalVisibleReadyRef.current = null;
      fontMetricsRef.current = null;
      lastMeasuredSizeRef.current = undefined;
      preserveTerminalBottomLockRef.current = null;
      setIsTerminalSurfaceReady(false);
      setShowScrollToBottomButton(false);
    };
  }, [
    connection.baseUrl,
    connection.mock,
    connection.token,
    connection.workspaceId,
    pane.renderNonce,
    pane.sessionId,
    terminalAppearance.xtermFrontendScrollback,
    ...terminalAppearanceDependencies,
  ]);

  useEffect(() => {
    if (!isVisible) {
      lastMeasuredSizeRef.current = undefined;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      ensureTerminalVisibleReadyRef.current?.();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isVisible, pane.sessionId]);

  useEffect(() => {
    if (!isFocused || !isVisible) {
      return;
    }

    requestAnimationFrame(() => {
      terminalRef.current?.focus();
    });
  }, [isFocused, isVisible]);

  useEffect(() => {
    if (handledRefreshRequestIdRef.current === refreshRequestId) {
      return;
    }

    handledRefreshRequestIdRef.current = refreshRequestId;
    if (!isVisible) {
      return;
    }

    requestAnimationFrame(() => {
      ensureTerminalVisibleReadyRef.current?.();
    });
  }, [isVisible, refreshRequestId]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    void ensureWebFontsLoaded(terminalAppearanceOptions.fontFamily, "appearance").finally(() => {
      if (!terminalRef.current) {
        return;
      }

      withPreservedTerminalBottomLock(() => {
        terminal.options = {
          ...terminalAppearanceOptions,
          scrollback: terminalAppearance.xtermFrontendScrollback,
          theme: getTerminalTheme(),
        };
        fontMetricsRef.current = measureTerminalFont({
          appearance: terminalAppearanceOptions,
          container: containerRef.current ?? terminal.element ?? document.body,
          useDevicePixelAdjustment: true,
        });
        if (isVisibleRef.current) {
          ensureTerminalVisibleReadyRef.current?.();
        } else {
          lastMeasuredSizeRef.current = undefined;
        }
      });
      updateScrollToBottomButtonVisibilityRef.current?.();
    });
  }, [
    isVisible,
    terminalAppearance.xtermFrontendScrollback,
    terminalAppearanceFontLoadKey,
    ...terminalAppearanceDependencies,
  ]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    focusSearchInput();
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen || searchQuery.length === 0) {
      searchAddonRef.current?.clearDecorations();
      setSearchResults(SEARCH_RESULTS_EMPTY);
      return;
    }

    const searchAddon = searchAddonRef.current;
    if (!searchAddon) {
      return;
    }

    const didFindResult = searchAddon.findNext(searchQuery, getSearchOptions(true));
    if (!didFindResult) {
      setSearchResults(SEARCH_RESULTS_EMPTY);
    }
  }, [isSearchOpen, searchCaseSensitive, searchQuery, searchRegex]);

  useEffect(() => {
    if (
      scrollToBottomRequestId === undefined ||
      handledScrollToBottomRequestIdRef.current === scrollToBottomRequestId ||
      !isVisible
    ) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const tryScrollToBottom = () => {
      if (cancelled || !isVisibleRef.current) {
        return;
      }

      attempts += 1;
      const didScroll = scrollTerminalToBottom();
      if (didScroll) {
        handledScrollToBottomRequestIdRef.current = scrollToBottomRequestId;
        reportDebug("terminal.scrollToBottomRequestApplied", {
          attempts,
          requestId: scrollToBottomRequestId,
        });
        return;
      }

      if (attempts >= maxAttempts) {
        reportDebug("terminal.scrollToBottomRequestTimedOut", {
          attempts,
          requestId: scrollToBottomRequestId,
        });
        return;
      }

      requestAnimationFrame(tryScrollToBottom);
    };

    tryScrollToBottom();

    return () => {
      cancelled = true;
    };
  }, [isVisible, scrollToBottomRequestId]);

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
        source: autoFocusRequest.source,
      });
    });
  }, [autoFocusRequest, isVisible, pane.sessionId]);

  return (
    <div
      className={`terminal-pane-root ${isVisible ? "" : "terminal-pane-root-hidden"}`.trim()}
      onFocusCapture={() => {
        onActivate("focusin");
      }}
      onKeyDownCapture={(event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          onTerminalEnter?.();
        }

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
        onActivate("pointer");
        terminalRef.current?.focus();
      }}
    >
      <div
        className="terminal-pane-canvas terminal-tab"
        ref={containerRef}
        style={{ opacity: isTerminalSurfaceReady ? 1 : 0 }}
      />
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
            scrollTerminalToBottom();
          }}
          type="button"
        >
          <IconArrowBigDownFilled aria-hidden size={16} />
        </button>
      ) : null}
    </div>
  );
};

function getTerminalSearchStatusLabel(query: string, searchResults: SearchResultsState): string {
  if (query.length === 0) {
    return "Type to search";
  }

  if (searchResults.resultCount === 0 || searchResults.resultIndex < 0) {
    return "No matches";
  }

  return `${String(searchResults.resultIndex + 1)} / ${String(searchResults.resultCount)}`;
}
