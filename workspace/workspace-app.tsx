import { useEffect, useMemo, useState } from "react";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelPane,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import { getVisiblePrimaryTitle, getVisibleTerminalTitle } from "../shared/session-grid-contract";
import { logWorkspaceDebug } from "./workspace-debug";
import { TerminalPane } from "./terminal-pane";
import { T3Pane } from "./t3-pane";

type MessageSource = Pick<Window, "addEventListener" | "removeEventListener">;
const INITIAL_TERMINAL_REMOUNT_DELAY_MS = 200;
const TERMINAL_HIDE_BEFORE_REMOUNT_DELAY_MS = 180;

export type WorkspaceAppProps = {
  messageSource?: MessageSource;
  vscode: {
    postMessage: (message: unknown) => void;
  };
};

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({ messageSource = window, vscode }) => {
  const [areTerminalsVisible, setAreTerminalsVisible] = useState(true);
  const [hasCompletedInitialTerminalRemount, setHasCompletedInitialTerminalRemount] = useState(false);
  const [serverState, setServerState] = useState<ExtensionToWorkspacePanelMessage | undefined>();
  const [fitVersion, setFitVersion] = useState(0);
  const [terminalPaneRenderVersion, setTerminalPaneRenderVersion] = useState(0);
  const [localFocusedSessionId, setLocalFocusedSessionId] = useState<string | undefined>();

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWorkspacePanelMessage>) => {
      if (!event.data || (event.data.type !== "hydrate" && event.data.type !== "sessionState")) {
        return;
      }
      logWorkspaceDebug(event.data.debuggingMode, "message.received", {
        activeGroupId: event.data.activeGroupId,
        focusedSessionId: event.data.focusedSessionId,
        paneIds: event.data.panes.map((pane) => pane.sessionId),
        type: event.data.type,
      });
      setServerState(event.data);
    };

    const handleIframeFocus = (event: MessageEvent<{ sessionId?: string; type?: string }>) => {
      if (event.data?.type !== "vsmuxT3Focus" || typeof event.data.sessionId !== "string") {
        return;
      }

      vscode.postMessage({
        sessionId: event.data.sessionId,
        type: "focusSession",
      });
    };

    messageSource.addEventListener("message", handleMessage as EventListener);
    window.addEventListener("message", handleIframeFocus);
    vscode.postMessage({ type: "ready" });

    return () => {
      messageSource.removeEventListener("message", handleMessage as EventListener);
      window.removeEventListener("message", handleIframeFocus);
    };
  }, [messageSource, vscode]);

  const panes = useMemo(() => serverState?.panes ?? [], [serverState?.panes]);
  const presentedFocusedSessionId = localFocusedSessionId ?? serverState?.focusedSessionId;
  const terminalPaneIds = useMemo(
    () => panes.filter((pane) => pane.kind === "terminal").map((pane) => pane.sessionId),
    [panes],
  );
  const terminalPaneIdsKey = terminalPaneIds.join("|");

  useEffect(() => {
    setLocalFocusedSessionId(serverState?.focusedSessionId);
  }, [serverState?.activeGroupId, serverState?.focusedSessionId]);

  useEffect(() => {
    if (terminalPaneIds.length === 0 || hasCompletedInitialTerminalRemount) {
      return;
    }

    const debuggingMode = serverState?.debuggingMode;
    const hideTimeoutId = window.setTimeout(() => {
      logWorkspaceDebug(debuggingMode, "workspace.initialTerminalHideRequested", {
        delayMs: TERMINAL_HIDE_BEFORE_REMOUNT_DELAY_MS,
        paneIds: terminalPaneIds,
      });
      setAreTerminalsVisible(false);
    }, TERMINAL_HIDE_BEFORE_REMOUNT_DELAY_MS);
    const remountTimeoutId = window.setTimeout(() => {
      logWorkspaceDebug(debuggingMode, "workspace.initialTerminalRemountRequested", {
        delayMs: INITIAL_TERMINAL_REMOUNT_DELAY_MS,
        paneIds: terminalPaneIds,
      });
      setTerminalPaneRenderVersion((currentVersion) => currentVersion + 1);
      requestAnimationFrame(() => {
        setAreTerminalsVisible(true);
        setHasCompletedInitialTerminalRemount(true);
      });
    }, INITIAL_TERMINAL_REMOUNT_DELAY_MS);

    return () => {
      window.clearTimeout(hideTimeoutId);
      window.clearTimeout(remountTimeoutId);
    };
  }, [hasCompletedInitialTerminalRemount, serverState?.debuggingMode, terminalPaneIdsKey]);

  useEffect(() => {
    let settleTimeoutId: number | undefined;
    let trailingTimeoutId: number | undefined;

    const handleWindowResize = () => {
      logWorkspaceDebug(serverState?.debuggingMode, "window.resizeRefitRequested", {
        paneIds: panes.map((pane) => pane.sessionId),
      });
      requestTerminalRefit();
      if (settleTimeoutId !== undefined) {
        window.clearTimeout(settleTimeoutId);
      }
      if (trailingTimeoutId !== undefined) {
        window.clearTimeout(trailingTimeoutId);
      }

      settleTimeoutId = window.setTimeout(() => {
        logWorkspaceDebug(serverState?.debuggingMode, "window.resizeSettleRefitRequested", {
          paneIds: panes.map((pane) => pane.sessionId),
        });
        requestTerminalRefit();
      }, 120);

      trailingTimeoutId = window.setTimeout(() => {
        logWorkspaceDebug(serverState?.debuggingMode, "window.resizeTrailingRefitRequested", {
          paneIds: panes.map((pane) => pane.sessionId),
        });
        requestTerminalRefit();
      }, 260);
    };

    window.addEventListener("resize", handleWindowResize);
    window.visualViewport?.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      window.visualViewport?.removeEventListener("resize", handleWindowResize);
      if (settleTimeoutId !== undefined) {
        window.clearTimeout(settleTimeoutId);
      }
      if (trailingTimeoutId !== undefined) {
        window.clearTimeout(trailingTimeoutId);
      }
    };
  }, [panes, serverState?.debuggingMode]);

  function requestTerminalRefit(options?: { dispatchBrowserResize?: boolean }) {
    if (options?.dispatchBrowserResize) {
      window.dispatchEvent(new Event("resize"));
    }
    setFitVersion((currentVersion) => currentVersion + 1);
  }

  if (!serverState) {
    return (
      <main className="workspace-shell workspace-shell-empty">
        <div className="workspace-empty-state">Loading VSmux workspace…</div>
      </main>
    );
  }

  if (panes.length === 0) {
    return (
      <main className="workspace-shell workspace-shell-empty">
        <div className="workspace-empty-state">No visible sessions in the active group.</div>
      </main>
    );
  }

  return (
    <main
      className={`workspace-shell ${panes.length > 1 ? "workspace-shell-split" : "workspace-shell-single"}`}
    >
      {panes.map((pane) => (
        <WorkspacePaneView
          connection={serverState.connection}
          debuggingMode={serverState.debuggingMode}
          fitVersion={fitVersion}
          isFocused={presentedFocusedSessionId === pane.sessionId}
          key={pane.sessionId}
          areTerminalsVisible={areTerminalsVisible}
          onLocalFocus={() => {
            setLocalFocusedSessionId(pane.sessionId);
          }}
          onFocus={() =>
            vscode.postMessage({
              sessionId: pane.sessionId,
              type: "focusSession",
            })
          }
          pane={pane}
          terminalPaneRenderVersion={terminalPaneRenderVersion}
          terminalAppearance={serverState.terminalAppearance}
        />
      ))}
    </main>
  );
};

type WorkspacePaneViewProps = {
  connection: ExtensionToWorkspacePanelMessage["connection"];
  debuggingMode: boolean;
  fitVersion: number;
  isFocused: boolean;
  areTerminalsVisible: boolean;
  onLocalFocus: () => void;
  onFocus: () => void;
  pane: WorkspacePanelPane;
  terminalPaneRenderVersion: number;
  terminalAppearance: ExtensionToWorkspacePanelMessage["terminalAppearance"];
};

const WorkspacePaneView: React.FC<WorkspacePaneViewProps> = ({
  connection,
  debuggingMode,
  fitVersion,
  isFocused,
  areTerminalsVisible,
  onLocalFocus,
  onFocus,
  pane,
  terminalPaneRenderVersion,
  terminalAppearance,
}) => {
  const primaryTitle = getWorkspacePanePrimaryTitle(pane);

  return (
    <section
      className={`workspace-pane ${isFocused ? "workspace-pane-focused" : ""}`}
      onMouseDown={onFocus}
    >
      <header className="workspace-pane-header">
        <div className="workspace-pane-title">{primaryTitle}</div>
      </header>
      <div className="workspace-pane-body">
        {pane.kind === "terminal" ? (
          <div style={{ height: "100%", visibility: areTerminalsVisible ? "visible" : "hidden" }}>
            <TerminalPane
              connection={connection}
              debuggingMode={debuggingMode}
              fitVersion={fitVersion}
              key={`${pane.sessionId}:${String(terminalPaneRenderVersion)}`}
              onActivate={() => {
                onLocalFocus();
                if (!isFocused) {
                  onFocus();
                }
              }}
              pane={pane}
              terminalAppearance={terminalAppearance}
            />
          </div>
        ) : (
          <T3Pane isFocused={isFocused} onFocus={onFocus} pane={pane} />
        )}
      </div>
    </section>
  );
};

function getWorkspacePanePrimaryTitle(pane: WorkspacePanelPane): string {
  const userTitle = getVisiblePrimaryTitle(pane.sessionRecord.title);
  if (userTitle) {
    return userTitle;
  }

  if (pane.kind === "terminal") {
    const terminalTitle = getVisibleTerminalTitle((pane as WorkspacePanelTerminalPane).terminalTitle);
    if (terminalTitle) {
      return terminalTitle;
    }
  }

  return pane.sessionRecord.alias;
}
