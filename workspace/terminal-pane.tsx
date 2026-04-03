import { useEffect, useRef, useState } from "react";
import { Restty } from "restty";
import type { WorkspacePanelAutoFocusRequest, WorkspacePanelConnection, WorkspacePanelTerminalAppearance, WorkspacePanelTerminalPane } from "../shared/workspace-panel-contract";
import { logWorkspaceDebug } from "./workspace-debug";
import { getResttyFontSources, getResttyTheme } from "./restty-terminal-config";
import { createWorkspaceResttyTransport, type WorkspaceResttyTransportController } from "./restty-session-transport";
import "./terminal-pane.css";

const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const VISIBLE_RESIZE_DELAY_MS = 2_000;
const SEARCH_RESULTS_EMPTY = {
  resultCount: 0,
  resultIndex: -1,
};

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
  const handledAutoFocusRequestIdRef = useRef<number | undefined>(undefined);
  const handledRefreshRequestIdRef = useRef(refreshRequestId);
  const appearanceRequestIdRef = useRef(0);
  const appliedFontSourcesSignatureRef = useRef("");
  const activePaneRef = useRef<ReturnType<Restty["activePane"]>>(null);
  const resttyRef = useRef<Restty | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const transportRef = useRef<WorkspaceResttyTransportController | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultsState>(SEARCH_RESULTS_EMPTY);

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

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  };

  const focusTerminal = () => {
    activePaneRef.current?.focus();
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    focusSearchInput();
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    activePaneRef.current?.clearSearch();
    setSearchResults(SEARCH_RESULTS_EMPTY);
    requestAnimationFrame(() => {
      focusTerminal();
    });
  };

  const applyAppearance = (sourceLabel = "vscode") => {
    const restty = resttyRef.current;
    const activePane = activePaneRef.current;
    if (!restty || !activePane) {
      return;
    }

    const requestId = appearanceRequestIdRef.current + 1;
    appearanceRequestIdRef.current = requestId;
    const fontSources = getResttyFontSources(terminalAppearance.fontFamily);
    const fontSourcesSignature = JSON.stringify(fontSources);
    const theme = getResttyTheme();

    const applyResolvedTheme = (phase: string) => {
      if (
        appearanceRequestIdRef.current !== requestId ||
        resttyRef.current !== restty ||
        activePaneRef.current !== activePane
      ) {
        return;
      }

      if (theme) {
        activePane.applyTheme(theme, `${sourceLabel}:${phase}`);
      }
    };

    activePane.setFontSize(terminalAppearance.fontSize);

    const finishAppearanceApply = () => {
      if (
        appearanceRequestIdRef.current !== requestId ||
        resttyRef.current !== restty ||
        activePaneRef.current !== activePane
      ) {
        return;
      }

      activePane.setFontSize(terminalAppearance.fontSize);
      applyResolvedTheme("applied");
      requestAnimationFrame(() => {
        if (appearanceRequestIdRef.current !== requestId) {
          return;
        }

        applyResolvedTheme("raf-1");
        requestAnimationFrame(() => {
          if (appearanceRequestIdRef.current !== requestId) {
            return;
          }

          applyResolvedTheme("raf-2");
        });
      });
      window.setTimeout(() => {
        if (appearanceRequestIdRef.current !== requestId) {
          return;
        }

        applyResolvedTheme("timeout");
      }, 120);
    };

    if (appliedFontSourcesSignatureRef.current === fontSourcesSignature) {
      finishAppearanceApply();
      return;
    }

    void restty.setFontSources(fontSources).then(() => {
      if (appearanceRequestIdRef.current !== requestId) {
        return;
      }

      appliedFontSourcesSignatureRef.current = fontSourcesSignature;
      finishAppearanceApply();
    }).catch(() => {
      if (appearanceRequestIdRef.current !== requestId) {
        return;
      }

      finishAppearanceApply();
    });
  };

  const updateTerminalSize = () => {
    const container = containerRef.current;
    const activePane = activePaneRef.current;
    if (!container || !activePane) {
      return false;
    }

    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return false;
    }

    activePane.updateSize(true);
    return true;
  };

  const sendRawTerminalInput = (data: string) => {
    if (!data) {
      return false;
    }

    return transportRef.current?.sendRawInput(data) ?? false;
  };

  const pasteClipboardText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sendRawTerminalInput(text);
      }
    } catch {
      // Clipboard access can fail outside a user gesture.
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let didDispose = false;
    const transportController = connection.mock
      ? null
      : createWorkspaceResttyTransport({
          reportDebug,
          sessionId: pane.sessionId,
        });
    transportRef.current = transportController;
    const restty = new Restty({
      createInitialPane: true,
      defaultContextMenu: false,
      paneStyles: true,
      root: container,
      searchUi: false,
      shortcuts: false,
      appOptions: {
        attachWindowEvents: true,
        autoResize: false,
        callbacks: {
          onBackend: (backend) => {
            reportDebug("terminal.rendererReady", {
              rendererMode: backend,
              sessionId: pane.sessionId,
            });
          },
          onSearchState: (state) => {
            if (didDispose) {
              return;
            }

            setSearchResults({
              resultCount: state.total,
              resultIndex: state.selectedIndex ?? -1,
            });
          },
          onTermSize: (cols, rows) => {
            reportDebug("terminal.termSizeChanged", {
              cols,
              rows,
              sessionId: pane.sessionId,
            });
          },
        },
        fontPreset: "none",
        fontSize: terminalAppearance.fontSize,
        fontSources: getResttyFontSources(terminalAppearance.fontFamily),
        ptyTransport: transportController?.transport,
      },
    });
    const activePane = restty.activePane();
    if (!activePane) {
      restty.destroy();
      transportRef.current = null;
      return;
    }

    resttyRef.current = restty;
    activePaneRef.current = activePane;
    applyAppearance("mount-setup");

    const onWindowFocus = () => {
      focusTerminal();
    };
    window.addEventListener("focus", onWindowFocus);

    const onThemeChange = () => {
      applyAppearance("theme-change");
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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (didDispose) {
          return;
        }

        updateTerminalSize();
        applyAppearance("mount-visible");
        if (document.hasFocus()) {
          focusTerminal();
        }

        if (connection.mock) {
          if (pane.snapshot?.history) {
            activePane.sendInput(pane.snapshot.history, "pty");
          }
          return;
        }

        const socketUrl = buildSessionSocketUrl(connection, pane.sessionId);
        activePane.connectPty(socketUrl);
      });
    });

    return () => {
      didDispose = true;
      appearanceRequestIdRef.current += 1;
      window.removeEventListener("focus", onWindowFocus);
      themeObserver.disconnect();
      restty.destroy();
      transportController?.transport.destroy?.();
      activePaneRef.current = null;
      resttyRef.current = null;
      transportRef.current = null;
      setSearchResults(SEARCH_RESULTS_EMPTY);
    };
  }, [connection.baseUrl, connection.mock, connection.token, connection.workspaceId, pane.sessionId]);

  useEffect(() => {
    applyAppearance("appearance-change");
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

    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateTerminalSize();
          applyAppearance("visible");
        });
      });
    }, VISIBLE_RESIZE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isVisible, pane.sessionId]);

  useEffect(() => {
    if (handledRefreshRequestIdRef.current === refreshRequestId) {
      return;
    }

    handledRefreshRequestIdRef.current = refreshRequestId;
    if (!isVisible) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateTerminalSize();
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
    const activePane = activePaneRef.current;
    if (!activePane) {
      return;
    }

    if (!isSearchOpen || searchQuery.length === 0) {
      activePane.clearSearch();
      setSearchResults(SEARCH_RESULTS_EMPTY);
      return;
    }

    activePane.setSearchQuery(searchQuery);
  }, [isSearchOpen, searchQuery]);

  useEffect(() => {
    if (
      !autoFocusRequest ||
      handledAutoFocusRequestIdRef.current === autoFocusRequest.requestId ||
      !isVisible
    ) {
      return;
    }

    handledAutoFocusRequestIdRef.current = autoFocusRequest.requestId;
    requestAnimationFrame(() => {
      focusTerminal();
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
        const lowerKey = event.key.toLowerCase();

        if (primaryModifier && lowerKey === "f") {
          event.preventDefault();
          event.stopPropagation();
          openSearch();
          return;
        }

        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1b[13;2u");
          return;
        }

        if (IS_MAC && event.metaKey && !event.altKey && event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x01");
          return;
        }

        if (IS_MAC && event.metaKey && !event.altKey && event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x05");
          return;
        }

        if (IS_MAC && event.altKey && !event.metaKey && event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bb");
          return;
        }

        if (IS_MAC && event.altKey && !event.metaKey && event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bf");
          return;
        }

        if (event.ctrlKey && !event.metaKey && event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bb");
          return;
        }

        if (event.ctrlKey && !event.metaKey && event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bf");
          return;
        }

        if (event.shiftKey && event.key === "Insert") {
          event.preventDefault();
          event.stopPropagation();
          void pasteClipboardText();
        }
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        reportDebug("terminal.mouseActivate", {
          sessionId: pane.sessionId,
        });
        onActivate();
        focusTerminal();
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

              if (event.shiftKey) {
                activePaneRef.current?.searchPrevious();
                return;
              }

              activePaneRef.current?.searchNext();
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
            className="terminal-pane-search-button"
            onClick={(event) => {
              event.stopPropagation();
              if (searchQuery.length === 0) {
                return;
              }
              activePaneRef.current?.searchPrevious();
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
              activePaneRef.current?.searchNext();
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
    </div>
  );
};

function buildSessionSocketUrl(
  connection: WorkspacePanelConnection,
  sessionId: string,
): string {
  const socketUrl = new URL("/session", connection.baseUrl);
  socketUrl.searchParams.set("token", connection.token);
  socketUrl.searchParams.set("workspaceId", connection.workspaceId);
  socketUrl.searchParams.set("sessionId", sessionId);
  return socketUrl.toString();
}

function getTerminalSearchStatusLabel(query: string, searchResults: SearchResultsState): string {
  if (query.length === 0) {
    return "Type to search";
  }

  if (searchResults.resultCount === 0 || searchResults.resultIndex < 0) {
    return "No matches";
  }

  return `${String(searchResults.resultIndex + 1)} / ${String(searchResults.resultCount)}`;
}
