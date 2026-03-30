import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { createEditorLayoutPlan } from "../shared/editor-layout";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelPane,
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelTerminalPane,
  WorkspacePanelHydrateMessage,
  WorkspacePanelSessionStateMessage,
} from "../shared/workspace-panel-contract";
import {
  getOrderedSessions,
  getVisiblePrimaryTitle,
  getVisibleTerminalTitle,
} from "../shared/session-grid-contract";
import { logWorkspaceDebug } from "./workspace-debug";
import { WorkspacePaneCloseButton } from "./workspace-pane-close-button";
import {
  buildFullSessionOrderFromVisiblePaneOrder,
  buildVisiblePaneOrderForDrop,
  sortPanesBySessionIds,
} from "./workspace-pane-reorder";
import { TerminalPane } from "./terminal-pane";
import { T3Pane } from "./t3-pane";

type MessageSource = Pick<Window, "addEventListener" | "removeEventListener">;

export type WorkspaceAppProps = {
  messageSource?: MessageSource;
  vscode: {
    postMessage: (message: unknown) => void;
  };
};

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({ messageSource = window, vscode }) => {
  const [isWorkspaceFocused, setIsWorkspaceFocused] = useState(
    () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      document.hasFocus(),
  );
  const [serverState, setServerState] = useState<ExtensionToWorkspacePanelMessage | undefined>();
  const [localFocusedSessionId, setLocalFocusedSessionId] = useState<string | undefined>();
  const [localPaneOrder, setLocalPaneOrder] = useState<string[] | undefined>();
  const [draggedPaneId, setDraggedPaneId] = useState<string | undefined>();
  const [dropTargetPaneId, setDropTargetPaneId] = useState<string | undefined>();
  const focusRequestSequenceRef = useRef(0);
  const pendingFocusRequestRef = useRef<
    | {
        requestId: number;
        sessionId: string;
        startedAt: number;
      }
    | undefined
  >();
  const pendingFocusedSessionIdRef = useRef<string>();
  const workspaceState =
    serverState && (serverState.type === "hydrate" || serverState.type === "sessionState")
      ? serverState
      : undefined;

  const postWorkspaceDebugLog = (
    enabled: boolean | undefined,
    event: string,
    payload?: Record<string, unknown>,
  ) => {
    logWorkspaceDebug(enabled, event, payload);
    if (!enabled) {
      return;
    }

    vscode.postMessage({
      details: payload ? safeSerializeWorkspaceDebugDetails(payload) : undefined,
      event,
      type: "workspaceDebugLog",
    });
  };

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
    const applyWorkspaceStateMessage = (
      message: WorkspacePanelHydrateMessage | WorkspacePanelSessionStateMessage,
    ) => {
      postWorkspaceDebugLog(message.debuggingMode, "message.received", {
        activeGroupId: message.activeGroupId,
        focusedSessionId: message.focusedSessionId,
        paneIds: message.panes.map((pane) => pane.sessionId),
        pendingFocusRequest:
          pendingFocusRequestRef.current &&
          message.focusedSessionId === pendingFocusRequestRef.current.sessionId
            ? {
                durationMs: Math.round(performance.now() - pendingFocusRequestRef.current.startedAt),
                requestId: pendingFocusRequestRef.current.requestId,
                sessionId: pendingFocusRequestRef.current.sessionId,
              }
            : undefined,
        type: message.type,
      });
      if (
        pendingFocusRequestRef.current &&
        message.focusedSessionId === pendingFocusRequestRef.current.sessionId
      ) {
        postWorkspaceDebugLog(message.debuggingMode, "focus.messageMatchedPendingRequest", {
          durationMs: Math.round(performance.now() - pendingFocusRequestRef.current.startedAt),
          requestId: pendingFocusRequestRef.current.requestId,
          sessionId: pendingFocusRequestRef.current.sessionId,
        });
      }
      setServerState(message);
    };

    const handleMessage = (event: MessageEvent<ExtensionToWorkspacePanelMessage>) => {
      if (!event.data) {
        return;
      }

      if (event.data.type === "terminalPresentationChanged") {
        setServerState((previousState) => {
          if (
            !previousState ||
            (previousState.type !== "hydrate" && previousState.type !== "sessionState")
          ) {
            return previousState;
          }

          return {
            ...previousState,
            panes: previousState.panes.map((pane) =>
              pane.kind !== "terminal" || pane.sessionId !== event.data.sessionId
                ? pane
                : {
                    ...pane,
                    snapshot: event.data.snapshot ?? pane.snapshot,
                    terminalTitle: event.data.terminalTitle,
                  },
            ),
          };
        });
        return;
      }

      if (event.data.type !== "hydrate" && event.data.type !== "sessionState") {
        return;
      }

      applyWorkspaceStateMessage(event.data);
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

  const panes = useMemo(() => workspaceState?.panes ?? [], [workspaceState]);
  const workspacePaneIdsKey = panes.map((pane) => pane.sessionId).join("|");
  const orderedPanes = useMemo(
    () => (localPaneOrder ? sortPanesBySessionIds(panes, localPaneOrder) : panes),
    [localPaneOrder, panes],
  );
  const visiblePanes = useMemo(
    () => orderedPanes.filter((pane) => pane.isVisible),
    [orderedPanes],
  );
  const visiblePaneLayoutBySessionId = useMemo(() => {
    const resolvedViewMode = workspaceState?.viewMode ?? "grid";
    const rowLengths = createEditorLayoutPlan(
      Math.max(1, visiblePanes.length),
      resolvedViewMode,
    ).rowLengths;
    const nextLayoutBySessionId = new Map<string, { gridColumn: string; gridRow: string }>();
    let nextPaneIndex = 0;
    let rowNumber = 1;

    for (const rowLength of rowLengths) {
      const row = visiblePanes.slice(nextPaneIndex, nextPaneIndex + rowLength);
      let columnNumber = 1;

      for (const pane of row) {
        const gridPlacement = getWorkspacePaneGridPlacement(
          resolvedViewMode,
          rowLength,
          rowNumber,
          columnNumber,
        );
        nextLayoutBySessionId.set(pane.sessionId, {
          gridColumn: gridPlacement.gridColumn,
          gridRow: gridPlacement.gridRow,
        });
        columnNumber += 1;
      }

      nextPaneIndex += rowLength;
      rowNumber += 1;
    }

    return nextLayoutBySessionId;
  }, [visiblePanes, workspaceState?.viewMode]);
  const presentedFocusedSessionId = localFocusedSessionId ?? workspaceState?.focusedSessionId;
  const terminalPaneIds = useMemo(
    () => orderedPanes.filter((pane) => pane.kind === "terminal").map((pane) => pane.sessionId),
    [orderedPanes],
  );
  const visiblePaneIds = useMemo(
    () => visiblePanes.map((pane) => pane.sessionId),
    [visiblePanes],
  );
  const reorderablePaneIds = useMemo(
    () => orderedPanes.filter((pane) => pane.kind === "terminal").map((pane) => pane.sessionId),
    [orderedPanes],
  );
  const workspaceShellStyle = useMemo<CSSProperties>(
    () =>
      ({
        "--workspace-active-pane-border-color":
          workspaceState?.layoutAppearance.activePaneBorderColor,
        "--workspace-pane-gap": `${String(workspaceState?.layoutAppearance.paneGap ?? 12)}px`,
        gridTemplateColumns: getWorkspaceGridTemplateColumns(
          workspaceState?.viewMode ?? "grid",
          visiblePanes.length,
        ),
      }) as CSSProperties,
    [
      workspaceState?.layoutAppearance.activePaneBorderColor,
      workspaceState?.layoutAppearance.paneGap,
      workspaceState?.viewMode,
      visiblePanes.length,
    ],
  );

  useEffect(() => {
    if (!workspaceState) {
      return;
    }

    if (pendingFocusedSessionIdRef.current) {
      if (workspaceState.focusedSessionId === pendingFocusedSessionIdRef.current) {
        pendingFocusedSessionIdRef.current = undefined;
        pendingFocusRequestRef.current = undefined;
      } else {
        return;
      }
    }

    postWorkspaceDebugLog(workspaceState.debuggingMode, "focus.localStateApplied", {
      focusedSessionId: workspaceState.focusedSessionId,
    });
    setLocalFocusedSessionId(workspaceState.focusedSessionId);
  }, [workspaceState]);

  useEffect(() => {
    setLocalPaneOrder(undefined);
    setDraggedPaneId(undefined);
    setDropTargetPaneId(undefined);
  }, [workspacePaneIdsKey, workspaceState?.activeGroupId]);

  const requestFocusSession = (sessionId: string) => {
    const requestId = ++focusRequestSequenceRef.current;
    const startedAt = performance.now();
    pendingFocusedSessionIdRef.current = sessionId;
    pendingFocusRequestRef.current = {
      requestId,
      sessionId,
      startedAt,
    };
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.requested", {
      requestId,
      sessionId,
    });
    setLocalFocusedSessionId(sessionId);
    vscode.postMessage({
      sessionId,
      type: "focusSession",
    });
  };

  const requestPaneReorder = (sourcePaneId: string, targetPaneId: string) => {
    if (!workspaceState) {
      return;
    }

    const activeGroup = workspaceState.workspaceSnapshot.groups.find(
      (group) => group.groupId === workspaceState.activeGroupId,
    );
    if (!activeGroup) {
      return;
    }

    const nextVisiblePaneOrder = buildVisiblePaneOrderForDrop(
      visiblePaneIds,
      reorderablePaneIds,
      sourcePaneId,
      targetPaneId,
    );
    if (!nextVisiblePaneOrder) {
      return;
    }

    const nextSessionOrder = buildFullSessionOrderFromVisiblePaneOrder(
      getOrderedSessions(activeGroup.snapshot).map((session) => session.sessionId),
      nextVisiblePaneOrder,
    );
    if (!nextSessionOrder) {
      return;
    }

    setLocalPaneOrder(nextVisiblePaneOrder);
    vscode.postMessage({
      groupId: workspaceState.activeGroupId,
      sessionIds: nextSessionOrder,
      type: "syncSessionOrder",
    });
  };

  const clearDragState = () => {
    setDraggedPaneId(undefined);
    setDropTargetPaneId(undefined);
  };

  if (!workspaceState) {
    return (
      <main className="workspace-shell workspace-shell-empty">
        <div className="workspace-empty-state">Loading VSmux workspace…</div>
      </main>
    );
  }

  return (
    <main className="workspace-shell" style={workspaceShellStyle}>
      {orderedPanes.map((pane) => (
        <WorkspacePaneView
          connection={workspaceState.connection}
          debugLog={(event, payload) =>
            postWorkspaceDebugLog(workspaceState.debuggingMode, event, payload)
          }
          debuggingMode={workspaceState.debuggingMode}
          isFocused={presentedFocusedSessionId === pane.sessionId}
          isWorkspaceFocused={isWorkspaceFocused}
          key={pane.sessionId}
          layoutStyle={visiblePaneLayoutBySessionId.get(pane.sessionId)}
          onLocalFocus={() => {
            postWorkspaceDebugLog(workspaceState.debuggingMode, "focus.localFocusVisual", {
              sessionId: pane.sessionId,
            });
            setLocalFocusedSessionId(pane.sessionId);
          }}
          onFocus={() => requestFocusSession(pane.sessionId)}
          onClose={() =>
            vscode.postMessage({
              sessionId: pane.sessionId,
              type: "closeSession",
            })
          }
          pane={pane}
          terminalAppearance={workspaceState.terminalAppearance}
          canDrag={pane.kind === "terminal" && pane.isVisible && reorderablePaneIds.length > 1}
          autoFocusRequest={
            workspaceState.autoFocusRequest?.sessionId === pane.sessionId
              ? workspaceState.autoFocusRequest
              : undefined
          }
          isDragging={draggedPaneId === pane.sessionId}
          isDropTarget={dropTargetPaneId === pane.sessionId && draggedPaneId !== pane.sessionId}
          onDragEnd={clearDragState}
          onDragOver={(event) => {
            if (
              pane.kind !== "terminal" ||
              !pane.isVisible ||
              !draggedPaneId ||
              draggedPaneId === pane.sessionId
            ) {
              return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTargetPaneId(pane.sessionId);
          }}
          onDragStart={(event) => {
            if (pane.kind !== "terminal" || !pane.isVisible) {
              return;
            }

            setDraggedPaneId(pane.sessionId);
            setDropTargetPaneId(undefined);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", pane.sessionId);
          }}
          onDrop={(event) => {
            if (pane.kind !== "terminal" || !pane.isVisible) {
              return;
            }

            event.preventDefault();
            const sourcePaneId = draggedPaneId ?? event.dataTransfer.getData("text/plain");
            clearDragState();
            if (!sourcePaneId) {
              return;
            }

            requestPaneReorder(sourcePaneId, pane.sessionId);
          }}
        />
      ))}
      {visiblePanes.length === 0 ? (
        <div className="workspace-empty-state">No visible sessions in the active group.</div>
      ) : null}
    </main>
  );
};

type WorkspacePaneViewProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelHydrateMessage["connection"];
  debugLog: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isFocused: boolean;
  isWorkspaceFocused: boolean;
  canDrag: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  layoutStyle?: CSSProperties;
  onLocalFocus: () => void;
  onFocus: () => void;
  onClose: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  pane: WorkspacePanelPane;
  terminalAppearance: WorkspacePanelHydrateMessage["terminalAppearance"];
};

const WorkspacePaneView: React.FC<WorkspacePaneViewProps> = ({
  autoFocusRequest,
  connection,
  debugLog,
  debuggingMode,
  isFocused,
  isWorkspaceFocused,
  canDrag,
  isDragging,
  isDropTarget,
  layoutStyle,
  onLocalFocus,
  onFocus,
  onClose,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  pane,
  terminalAppearance,
}) => {
  const primaryTitle = getWorkspacePanePrimaryTitle(pane);

  return (
    <section
      className={[
        "workspace-pane",
        isFocused && isWorkspaceFocused ? "workspace-pane-focused" : "",
        canDrag ? "workspace-pane-reorderable" : "",
        isDragging ? "workspace-pane-dragging" : "",
        isDropTarget ? "workspace-pane-drop-target" : "",
        !pane.isVisible ? "workspace-pane-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={canDrag ? onDragOver : undefined}
      onDrop={canDrag ? onDrop : undefined}
      onMouseDown={() => {
        onLocalFocus();
        if (!isFocused) {
          debugLog("focus.mouseDownRequestsFocus", {
            sessionId: pane.sessionId,
          });
          onFocus();
        }
      }}
      style={pane.isVisible ? layoutStyle : undefined}
    >
      <header
        className={`workspace-pane-header ${canDrag ? "workspace-pane-header-draggable" : ""}`}
        draggable={canDrag}
        onDragEnd={canDrag ? onDragEnd : undefined}
        onDragStart={canDrag ? onDragStart : undefined}
      >
        <div className="workspace-pane-title">{primaryTitle}</div>
        {pane.kind === "terminal" ? <WorkspacePaneCloseButton onConfirmClose={onClose} /> : null}
      </header>
      <div className="workspace-pane-body">
        {pane.kind === "terminal" ? (
          <TerminalPane
            autoFocusRequest={autoFocusRequest}
            connection={connection}
            debugLog={debugLog}
            debuggingMode={debuggingMode}
            isVisible={pane.isVisible}
            onActivate={() => {
              onLocalFocus();
              if (!isFocused) {
                onFocus();
              }
            }}
            pane={pane}
            terminalAppearance={terminalAppearance}
          />
        ) : (
          <T3Pane
            autoFocusRequest={autoFocusRequest}
            isFocused={isFocused}
            onFocus={onFocus}
            pane={pane}
          />
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
    const terminalTitle = getVisibleTerminalTitle(
      (pane as WorkspacePanelTerminalPane).terminalTitle,
    );
    if (terminalTitle) {
      return terminalTitle;
    }
  }

  return pane.sessionRecord.alias;
}

function safeSerializeWorkspaceDebugDetails(details: Record<string, unknown>): string {
  try {
    return JSON.stringify(details);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
}

function getWorkspaceGridTemplateColumns(
  viewMode: WorkspacePanelHydrateMessage["viewMode"],
  visiblePaneCount: number,
): string {
  if (viewMode === "horizontal") {
    return "minmax(0, 1fr)";
  }

  if (viewMode === "vertical") {
    return `repeat(${String(Math.max(1, visiblePaneCount))}, minmax(0, 1fr))`;
  }

  return "repeat(6, minmax(0, 1fr))";
}

function getWorkspacePaneGridPlacement(
  viewMode: WorkspacePanelHydrateMessage["viewMode"],
  rowLength: number,
  rowNumber: number,
  columnNumber: number,
): { gridColumn: string; gridRow: string } {
  if (viewMode === "horizontal") {
    return {
      gridColumn: "1 / -1",
      gridRow: `${String(rowNumber)} / span 1`,
    };
  }

  if (viewMode === "vertical") {
    return {
      gridColumn: `${String(columnNumber)} / span 1`,
      gridRow: "1 / span 1",
    };
  }

  const span = rowLength === 1 ? 6 : rowLength === 2 ? 3 : 2;
  const startColumn = 1 + (columnNumber - 1) * span;
  return {
    gridColumn: `${String(startColumn)} / span ${String(span)}`,
    gridRow: `${String(rowNumber)} / span 1`,
  };
}
