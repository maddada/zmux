import { useEffect, useRef, useState } from "react";
import { IconArrowBigDownFilled, IconArrowBigUpFilled } from "@tabler/icons-react";
import { WTerm } from "@wterm/dom";
import type {
  WorkspacePanelAcknowledgeSessionAttentionReason,
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelConnection,
  WorkspacePanelTerminalAppearance,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import { getWindowsCtrlWordDeleteInputSequence } from "./terminal-input-shortcuts";
import { logWorkspaceDebug } from "./workspace-debug";
import { applyWtermHostAppearance, ensureWtermWebFontsLoaded } from "./wterm-appearance";
import {
  createWorkspaceWtermTransport,
  type WorkspaceWtermTransportController,
} from "./wterm-session-transport";
import "./terminal-pane.css";

const IS_WINDOWS = navigator.platform.toLowerCase().includes("win");
const SCROLL_TO_BOTTOM_SHOW_THRESHOLD_PX = 40;

type WtermTerminalPaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelConnection;
  debugLog?: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isFocused: boolean;
  isVisible: boolean;
  onAttentionInteraction: (reason: WorkspacePanelAcknowledgeSessionAttentionReason) => void;
  onTerminalEnter?: () => void;
  onActivate: (source: "focusin" | "pointer") => void;
  pane: WorkspacePanelTerminalPane;
  refreshRequestId: number;
  scrollToBottomRequestId?: number;
  terminalAppearance: WorkspacePanelTerminalAppearance;
};

export const WtermTerminalPane: React.FC<WtermTerminalPaneProps> = ({
  autoFocusRequest,
  connection,
  debugLog,
  debuggingMode,
  isFocused,
  isVisible,
  onAttentionInteraction,
  onTerminalEnter,
  onActivate,
  pane,
  refreshRequestId,
  scrollToBottomRequestId,
  terminalAppearance,
}) => {
  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<WTerm | null>(null);
  const transportRef = useRef<WorkspaceWtermTransportController | null>(null);
  const handledAutoFocusRequestIdRef = useRef<number | undefined>(undefined);
  const handledRefreshRequestIdRef = useRef(refreshRequestId);
  const handledScrollRequestIdRef = useRef<number | undefined>(undefined);
  const debugLogRef = useRef(debugLog);
  const isFocusedRef = useRef(isFocused);
  const isVisibleRef = useRef(isVisible);
  const isInitializingRef = useRef(true);
  const lastFocusActivationAtRef = useRef(0);
  const lastFocusActivationTargetRef = useRef<EventTarget | null>(null);
  const onAttentionInteractionRef = useRef(onAttentionInteraction);
  const onTerminalEnterRef = useRef(onTerminalEnter);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  useEffect(() => {
    debugLogRef.current = debugLog;
  }, [debugLog]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    onAttentionInteractionRef.current = onAttentionInteraction;
  }, [onAttentionInteraction]);

  useEffect(() => {
    onTerminalEnterRef.current = onTerminalEnter;
  }, [onTerminalEnter]);

  const reportDebug = (event: string, payload?: Record<string, unknown>) => {
    const decoratedPayload = {
      renderNonce: pane.renderNonce,
      sessionId: pane.sessionId,
      terminalEngine: pane.sessionRecord.terminalEngine,
      ...payload,
    };
    logWorkspaceDebug(debuggingMode, event, decoratedPayload);
    debugLogRef.current?.(event, decoratedPayload);
  };

  const focusTerminal = (reason: string) => {
    const term = termRef.current;
    const host = terminalHostRef.current;
    if (!term || !host) {
      return false;
    }

    if (host.contains(document.activeElement)) {
      reportDebug("wterm.focusSkippedAlreadyWithin", {
        activeElementTag: document.activeElement?.tagName,
        reason,
        sessionId: pane.sessionId,
      });
      return true;
    }

    reportDebug("wterm.focusRequested", {
      activeElementTag: document.activeElement?.tagName,
      reason,
      sessionId: pane.sessionId,
    });
    term.focus();
    return true;
  };

  const updateScrollButtons = () => {
    const host = terminalHostRef.current;
    if (!host) {
      return;
    }

    const remainingBottom = host.scrollHeight - host.clientHeight - host.scrollTop;
    setShowScrollToBottom(remainingBottom > SCROLL_TO_BOTTOM_SHOW_THRESHOLD_PX);
    setShowScrollToTop(host.scrollTop > SCROLL_TO_BOTTOM_SHOW_THRESHOLD_PX);
  };

  const scrollTerminalToBottom = () => {
    const host = terminalHostRef.current;
    if (!host) {
      return false;
    }

    focusTerminal("scroll-to-bottom");
    host.scrollTop = host.scrollHeight;
    updateScrollButtons();
    return true;
  };

  const scrollTerminalToTop = () => {
    const host = terminalHostRef.current;
    if (!host) {
      return false;
    }

    focusTerminal("scroll-to-top");
    host.scrollTop = 0;
    updateScrollButtons();
    return true;
  };

  useEffect(() => {
    const host = terminalHostRef.current;
    if (!host) {
      return;
    }

    let didDispose = false;
    let activeTransport: WorkspaceWtermTransportController | null = null;
    let cleanupScrollListener: (() => void) | undefined;
    let themeObserver: MutationObserver | undefined;

    const initializeTerminal = async () => {
      isInitializingRef.current = true;
      reportDebug("wterm.initRequested", {
        hostClientHeight: host.clientHeight,
        hostClientWidth: host.clientWidth,
        snapshotCols: pane.snapshot?.cols,
        snapshotHistoryBytes: pane.snapshot?.history?.length ?? 0,
        snapshotRows: pane.snapshot?.rows,
        snapshotStatus: pane.snapshot?.status,
      });

      applyWtermHostAppearance(host, terminalAppearance);
      try {
        const { families } = await ensureWtermWebFontsLoaded(terminalAppearance.fontFamily);
        if (families.length > 0) {
          reportDebug("wterm.webFontsLoadSuccess", {
            families,
            fontFamily: terminalAppearance.fontFamily,
            sessionId: pane.sessionId,
          });
        }
      } catch (error) {
        reportDebug("wterm.webFontsLoadError", {
          fontFamily: terminalAppearance.fontFamily,
          message: error instanceof Error ? error.message : String(error),
          sessionId: pane.sessionId,
        });
      }

      const term = new WTerm(host, {
        autoResize: true,
        cols: pane.snapshot?.cols ?? 120,
        cursorBlink: terminalAppearance.cursorBlink,
        onData: (data) => {
          if (data === "\r") {
            onTerminalEnterRef.current?.();
          }
          onAttentionInteractionRef.current("typing");
          transportRef.current?.sendInput(data);
          if (terminalAppearance.scrollToBottomWhenTyping) {
            requestAnimationFrame(() => {
              scrollTerminalToBottom();
            });
          }
        },
        onResize: (cols, rows) => {
          reportDebug("wterm.resizeObserved", {
            cols,
            rows,
            sessionId: pane.sessionId,
          });
          transportRef.current?.updateTerminalSize(cols, rows);
          requestAnimationFrame(() => {
            updateScrollButtons();
          });
        },
        rows: pane.snapshot?.rows ?? 34,
      });

      reportDebug("wterm.initStart", {
        cols: term.cols,
        hostFontFamily: terminalAppearance.fontFamily,
        hostFontSize: terminalAppearance.fontSize,
        hostLineHeight: terminalAppearance.lineHeight,
        rows: term.rows,
        sessionId: pane.sessionId,
      });
      await term.init();
      if (didDispose) {
        term.destroy();
        return;
      }

      termRef.current = term;
      isInitializingRef.current = false;
      reportDebug("wterm.initSucceeded", {
        bridgeCols: term.bridge?.getCols(),
        bridgeRows: term.bridge?.getRows(),
        hostClientHeight: host.clientHeight,
        hostClientWidth: host.clientWidth,
        scrollHeight: host.scrollHeight,
        scrollWidth: host.scrollWidth,
        sessionId: pane.sessionId,
      });

      const transport = createWorkspaceWtermTransport({
        onData: (data) => {
          term.write(data);
          requestAnimationFrame(() => {
            updateScrollButtons();
          });
        },
        onReconnectReplayStart: () => {
          reportDebug("wterm.reconnectReplayStart", {
            sessionId: pane.sessionId,
          });
          term.write("\x1bc");
        },
        reportDebug,
        sessionId: pane.sessionId,
      });

      transportRef.current = transport;
      activeTransport = transport;
      transport.setReconnectEnabled(
        isVisibleRef.current || pane.snapshot?.isAttached === true,
        isVisibleRef.current ? "visible" : "hidden-without-live-attach",
      );
      const socketUrl = buildSessionSocketUrl(connection, pane.sessionId);
      reportDebug("wterm.transportBootstrap", {
        isAttached: pane.snapshot?.isAttached ?? false,
        reconnectEnabled: isVisibleRef.current || pane.snapshot?.isAttached === true,
        sessionId: pane.sessionId,
        socketUrl,
      });
      transport.connect(socketUrl);
      transport.markTerminalReady(term.cols, term.rows);

      cleanupScrollListener = () => {
        host.removeEventListener("scroll", updateScrollButtons);
      };
      host.addEventListener("scroll", updateScrollButtons, { passive: true });
      requestAnimationFrame(() => {
        updateScrollButtons();
        if (isFocusedRef.current) {
          focusTerminal("initial-focus");
        }
      });

      const applyThemeAppearance = () => {
        applyWtermHostAppearance(host, terminalAppearance);
      };
      themeObserver = new MutationObserver(() => {
        applyThemeAppearance();
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
    };

    void initializeTerminal().catch((error) => {
      isInitializingRef.current = false;
      reportDebug("wterm.initFailed", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: pane.sessionId,
      });
    });

    return () => {
      reportDebug("wterm.dispose", {
        sessionId: pane.sessionId,
      });
      isInitializingRef.current = false;
      didDispose = true;
      cleanupScrollListener?.();
      themeObserver?.disconnect();
      activeTransport?.disconnect();
      if (transportRef.current === activeTransport) {
        transportRef.current = null;
      }
      termRef.current?.destroy();
      termRef.current = null;
      if (terminalHostRef.current) {
        terminalHostRef.current.innerHTML = "";
      }
    };
  }, [
    connection.baseUrl,
    connection.token,
    connection.workspaceId,
    pane.sessionId,
    pane.snapshot?.cols,
    pane.snapshot?.isAttached,
    pane.snapshot?.rows,
    pane.renderNonce,
    terminalAppearance.cursorBlink,
    terminalAppearance.cursorStyle,
    terminalAppearance.fontFamily,
    terminalAppearance.fontSize,
    terminalAppearance.fontWeight,
    terminalAppearance.letterSpacing,
    terminalAppearance.lineHeight,
    terminalAppearance.scrollToBottomWhenTyping,
  ]);

  useEffect(() => {
    transportRef.current?.setReconnectEnabled(
      isVisible || pane.snapshot?.isAttached === true,
      isVisible ? "visible" : "hidden-without-live-attach",
    );
  }, [isVisible, pane.snapshot?.isAttached]);

  useEffect(() => {
    if (refreshRequestId === handledRefreshRequestIdRef.current) {
      return;
    }

    handledRefreshRequestIdRef.current = refreshRequestId;
    transportRef.current?.reconnect("manual-refresh");
  }, [refreshRequestId]);

  useEffect(() => {
    if (!scrollToBottomRequestId || scrollToBottomRequestId === handledScrollRequestIdRef.current) {
      return;
    }

    handledScrollRequestIdRef.current = scrollToBottomRequestId;
    scrollTerminalToBottom();
  }, [scrollToBottomRequestId]);

  useEffect(() => {
    if (!autoFocusRequest || autoFocusRequest.sessionId !== pane.sessionId) {
      return;
    }

    if (handledAutoFocusRequestIdRef.current === autoFocusRequest.requestId || !isVisible) {
      return;
    }

    handledAutoFocusRequestIdRef.current = autoFocusRequest.requestId;
    requestAnimationFrame(() => {
      focusTerminal(`auto-focus:${autoFocusRequest.source}`);
    });
  }, [autoFocusRequest, isVisible, pane.sessionId]);

  useEffect(() => {
    if (!isVisible || !isFocused) {
      return;
    }

    requestAnimationFrame(() => {
      focusTerminal("pane-focused");
    });
  }, [isFocused, isVisible]);

  return (
    <div
      className="terminal-pane-root terminal-pane-root-wterm"
      onFocusCapture={(event) => {
        if (isInitializingRef.current) {
          reportDebug("wterm.focusObservedDuringBootstrap", {
            sessionId: pane.sessionId,
            targetTag: event.target instanceof Element ? event.target.tagName : undefined,
          });
          return;
        }

        const now = performance.now();
        const isDuplicateFocus =
          lastFocusActivationTargetRef.current === event.target &&
          now - lastFocusActivationAtRef.current < 250;

        if (isDuplicateFocus) {
          reportDebug("wterm.focusObservedDuplicate", {
            sessionId: pane.sessionId,
            targetTag: event.target instanceof Element ? event.target.tagName : typeof event.target,
          });
          return;
        }

        lastFocusActivationAtRef.current = now;
        lastFocusActivationTargetRef.current = event.target;
        reportDebug("wterm.focusObserved", {
          relatedTargetTag:
            event.relatedTarget instanceof Element ? event.relatedTarget.tagName : undefined,
          sessionId: pane.sessionId,
          targetTag: event.target instanceof Element ? event.target.tagName : undefined,
        });
        onActivate("focusin");
      }}
      onKeyDownCapture={(event) => {
        if (
          IS_WINDOWS &&
          event.ctrlKey &&
          !event.altKey &&
          !event.metaKey &&
          event.key === "Backspace"
        ) {
          event.preventDefault();
          onAttentionInteractionRef.current("typing");
          const sequence = getWindowsCtrlWordDeleteInputSequence(event.key);
          if (sequence) {
            transportRef.current?.sendInput(sequence);
          }
        }
      }}
      onMouseDownCapture={() => {
        reportDebug("wterm.pointerActivate", {
          sessionId: pane.sessionId,
        });
        onActivate("pointer");
        onAttentionInteractionRef.current("click");
        focusTerminal("mouse-down");
      }}
    >
      <div ref={terminalHostRef} className="terminal-pane-canvas terminal-pane-wterm-host" />
      <button
        className={`terminal-pane-scroll-to-top${
          showScrollToTop ? " terminal-pane-scroll-button-visible" : ""
        }`}
        onClick={() => {
          scrollTerminalToTop();
        }}
        title="Scroll to top"
        type="button"
      >
        <IconArrowBigUpFilled size={16} stroke={1.8} />
      </button>
      <button
        className={`terminal-pane-scroll-to-bottom${
          showScrollToBottom ? " terminal-pane-scroll-button-visible" : ""
        }`}
        onClick={() => {
          scrollTerminalToBottom();
        }}
        title="Scroll to bottom"
        type="button"
      >
        <IconArrowBigDownFilled size={16} stroke={1.8} />
      </button>
    </div>
  );
};

function buildSessionSocketUrl(connection: WorkspacePanelConnection, sessionId: string): string {
  const socketUrl = new URL("/session", connection.baseUrl);
  socketUrl.searchParams.set("token", connection.token);
  socketUrl.searchParams.set("workspaceId", connection.workspaceId);
  socketUrl.searchParams.set("sessionId", sessionId);
  return socketUrl.toString();
}
