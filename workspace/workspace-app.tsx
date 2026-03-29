import { useEffect, useMemo, useState } from "react";
import { createEditorLayoutPlan } from "../shared/editor-layout";
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
  const [isWorkspaceFocused, setIsWorkspaceFocused] = useState(() =>
    typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    document.hasFocus(),
  );
  const [serverState, setServerState] = useState<ExtensionToWorkspacePanelMessage | undefined>();
  const [terminalPaneRenderVersion, setTerminalPaneRenderVersion] = useState(0);
  const [localFocusedSessionId, setLocalFocusedSessionId] = useState<string | undefined>();

  useEffect(() => {
    const syncWorkspaceFocusState = () => {
      setIsWorkspaceFocused(document.visibilityState === "visible" && document.hasFocus());
    };

    syncWorkspaceFocusState();
    window.addEventListener("blur", syncWorkspaceFocusState);
    window.addEventListener("focus", syncWorkspaceFocusState);
    window.addEventListener("focusin", syncWorkspaceFocusState);
    window.addEventListener("focusout", syncWorkspaceFocusState);
    document.addEventListener("visibilitychange", syncWorkspaceFocusState);

    return () => {
      window.removeEventListener("blur", syncWorkspaceFocusState);
      window.removeEventListener("focus", syncWorkspaceFocusState);
      window.removeEventListener("focusin", syncWorkspaceFocusState);
      window.removeEventListener("focusout", syncWorkspaceFocusState);
      document.removeEventListener("visibilitychange", syncWorkspaceFocusState);
    };
  }, []);

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
  const paneRows = useMemo(() => {
    const rowLengths = createEditorLayoutPlan(
      Math.max(1, panes.length),
      serverState?.viewMode ?? "grid",
    ).rowLengths;
    const rows: WorkspacePanelPane[][] = [];
    let nextPaneIndex = 0;

    for (const rowLength of rowLengths) {
      const row = panes.slice(nextPaneIndex, nextPaneIndex + rowLength);
      if (row.length > 0) {
        rows.push(row);
      }
      nextPaneIndex += rowLength;
    }

    return rows;
  }, [panes, serverState?.viewMode]);
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
    <main className="workspace-shell">
      {paneRows.map((row, rowIndex) => (
        <div className={`workspace-row workspace-row-cols-${String(row.length)}`} key={`row-${String(rowIndex)}`}>
          {row.map((pane) => (
            <WorkspacePaneView
              connection={serverState.connection}
              debuggingMode={serverState.debuggingMode}
              isFocused={presentedFocusedSessionId === pane.sessionId}
              isWorkspaceFocused={isWorkspaceFocused}
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
        </div>
      ))}
    </main>
  );
};

type WorkspacePaneViewProps = {
  connection: ExtensionToWorkspacePanelMessage["connection"];
  debuggingMode: boolean;
  isFocused: boolean;
  isWorkspaceFocused: boolean;
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
  isFocused,
  isWorkspaceFocused,
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
      className={`workspace-pane ${isFocused && isWorkspaceFocused ? "workspace-pane-focused" : ""}`}
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
