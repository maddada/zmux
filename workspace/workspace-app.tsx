import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createEditorLayoutPlan } from "../shared/editor-layout";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelHydrateMessage,
  WorkspacePanelPane,
  WorkspacePanelSessionStateMessage,
} from "../shared/workspace-panel-contract";
import { getVisiblePrimaryTitle, getVisibleTerminalTitle } from "../shared/session-grid-contract";
import { logWorkspaceDebug } from "./workspace-debug";
import { WorkspacePaneCloseButton } from "./workspace-pane-close-button";
import { WorkspacePaneRefreshButton } from "./workspace-pane-refresh-button";
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

type WorkspaceShellStyle = CSSProperties & {
  "--workspace-active-pane-border-color"?: string;
  "--workspace-pane-gap": string;
};

type WorkspacePanePointerDragState = {
  isDragging: boolean;
  pointerId: number;
  pointerTarget: HTMLElement;
  sourcePaneId: string;
  startX: number;
  startY: number;
};

type WorkspaceAutoFocusGuard = {
  expiresAt: number;
  requestId: number;
  sessionId: string;
};

const AUTO_FOCUS_ACTIVATION_GUARD_MS = 400;

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
  const [terminalRefreshRequestId, setTerminalRefreshRequestId] = useState(0);
  const focusRequestSequenceRef = useRef(0);
  const debuggingModeRef = useRef<boolean | undefined>(undefined);
  const autoFocusGuardRef = useRef<WorkspaceAutoFocusGuard | undefined>(undefined);
  const pointerDragStateRef = useRef<WorkspacePanePointerDragState | undefined>(undefined);
  const pendingFocusRequestRef = useRef<
    | {
        requestId: number;
        sessionId: string;
        startedAt: number;
      }
    | undefined
  >(undefined);
  const pendingFocusedSessionIdRef = useRef<string | undefined>(undefined);
  const requestPaneReorderRef = useRef<(sourcePaneId: string, targetPaneId: string) => void>(
    () => {},
  );
  const reorderablePaneIdsRef = useRef<string[]>([]);
  const dropTargetPaneIdRef = useRef<string | undefined>(undefined);
  const workspaceState =
    serverState && (serverState.type === "hydrate" || serverState.type === "sessionState")
      ? serverState
      : undefined;
  debuggingModeRef.current = workspaceState?.debuggingMode;

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
                durationMs: Math.round(
                  performance.now() - pendingFocusRequestRef.current.startedAt,
                ),
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
      if (message.autoFocusRequest) {
        autoFocusGuardRef.current = {
          expiresAt: performance.now() + AUTO_FOCUS_ACTIVATION_GUARD_MS,
          requestId: message.autoFocusRequest.requestId,
          sessionId: message.autoFocusRequest.sessionId,
        };
        postWorkspaceDebugLog(message.debuggingMode, "focus.autoFocusGuardArmed", {
          expiresAt: Math.round(autoFocusGuardRef.current.expiresAt),
          requestId: message.autoFocusRequest.requestId,
          sessionId: message.autoFocusRequest.sessionId,
          source: message.autoFocusRequest.source,
        });
      }
      setServerState(message);
    };

    const handleMessage = (event: MessageEvent<ExtensionToWorkspacePanelMessage>) => {
      const nextMessage = event.data;
      if (!nextMessage) {
        return;
      }

      if (nextMessage.type === "terminalPresentationChanged") {
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
              pane.kind !== "terminal" || pane.sessionId !== nextMessage.sessionId
                ? pane
                : {
                    ...pane,
                    snapshot: nextMessage.snapshot ?? pane.snapshot,
                    terminalTitle: nextMessage.terminalTitle,
                  },
            ),
          };
        });
        return;
      }

      if (nextMessage.type !== "hydrate" && nextMessage.type !== "sessionState") {
        return;
      }

      applyWorkspaceStateMessage(nextMessage);
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

    const handleWorkspaceMessage = (event: Event) => {
      if (event instanceof MessageEvent) {
        handleMessage(event);
      }
    };

    messageSource.addEventListener("message", handleWorkspaceMessage);
    window.addEventListener("message", handleIframeFocus);
    vscode.postMessage({ type: "ready" });

    return () => {
      messageSource.removeEventListener("message", handleWorkspaceMessage);
      window.removeEventListener("message", handleIframeFocus);
    };
  }, [messageSource, vscode]);

  const panes = useMemo(() => workspaceState?.panes ?? [], [workspaceState]);
  const workspacePaneIdsKey = panes.map((pane) => pane.sessionId).join("|");
  const orderedPanes = useMemo(
    () => (localPaneOrder ? sortPanesBySessionIds(panes, localPaneOrder) : panes),
    [localPaneOrder, panes],
  );
  const activeGroupVisibleSessionIds = useMemo(() => {
    if (!workspaceState) {
      return [];
    }

    return (
      workspaceState.workspaceSnapshot.groups.find(
        (group) => group.groupId === workspaceState.activeGroupId,
      )?.snapshot.visibleSessionIds ?? []
    );
  }, [workspaceState]);
  const visiblePaneOrderIds = useMemo(() => {
    if (!localPaneOrder || activeGroupVisibleSessionIds.length === 0) {
      return activeGroupVisibleSessionIds;
    }

    const activeVisibleSessionIdSet = new Set(activeGroupVisibleSessionIds);
    const reorderedVisiblePaneIds = localPaneOrder.filter((sessionId) =>
      activeVisibleSessionIdSet.has(sessionId),
    );
    return reorderedVisiblePaneIds.length === activeGroupVisibleSessionIds.length
      ? reorderedVisiblePaneIds
      : activeGroupVisibleSessionIds;
  }, [activeGroupVisibleSessionIds, localPaneOrder]);
  const visiblePanes = useMemo(() => {
    if (visiblePaneOrderIds.length === 0) {
      return orderedPanes.filter((pane) => pane.isVisible);
    }

    const visiblePaneIdSet = new Set(visiblePaneOrderIds);
    return sortPanesBySessionIds(
      panes.filter((pane) => pane.isVisible && visiblePaneIdSet.has(pane.sessionId)),
      visiblePaneOrderIds,
    );
  }, [orderedPanes, panes, visiblePaneOrderIds]);
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
  const visiblePaneIds = useMemo(() => visiblePanes.map((pane) => pane.sessionId), [visiblePanes]);
  const visiblePaneIdsKey = visiblePaneIds.join("|");
  const reorderablePaneIds = useMemo(
    () => orderedPanes.filter((pane) => pane.kind === "terminal").map((pane) => pane.sessionId),
    [orderedPanes],
  );
  const workspaceShellStyle = useMemo(() => {
    const nextStyle: WorkspaceShellStyle = {
      "--workspace-active-pane-border-color":
        workspaceState?.layoutAppearance.activePaneBorderColor,
      "--workspace-pane-gap": `${String(workspaceState?.layoutAppearance.paneGap ?? 12)}px`,
    };

    if (visiblePanes.length > 0) {
      nextStyle.gridTemplateColumns = getWorkspaceGridTemplateColumns(
        workspaceState?.viewMode ?? "grid",
        visiblePanes.length,
      );
    }

    return nextStyle;
  }, [
    workspaceState?.layoutAppearance.activePaneBorderColor,
    workspaceState?.layoutAppearance.paneGap,
    workspaceState?.viewMode,
    visiblePanes.length,
  ]);

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

    setLocalFocusedSessionId((previousFocusedSessionId) => {
      if (previousFocusedSessionId === workspaceState.focusedSessionId) {
        return previousFocusedSessionId;
      }

      return workspaceState.focusedSessionId;
    });
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

  const shouldIgnorePaneActivation = (sessionId: string): boolean => {
    const autoFocusGuard = autoFocusGuardRef.current;
    if (!autoFocusGuard) {
      return false;
    }

    if (performance.now() > autoFocusGuard.expiresAt) {
      autoFocusGuardRef.current = undefined;
      return false;
    }

    if (autoFocusGuard.sessionId === sessionId) {
      return false;
    }

    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.activationIgnoredDuringAutoFocus", {
      guardedRequestId: autoFocusGuard.requestId,
      guardedSessionId: autoFocusGuard.sessionId,
      sessionId,
    });
    return true;
  };

  const requestPaneReorder = (sourcePaneId: string, targetPaneId: string) => {
    if (!workspaceState) {
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

    const nextPaneOrder = buildFullSessionOrderFromVisiblePaneOrder(
      panes.map((pane) => pane.sessionId),
      nextVisiblePaneOrder,
    );
    if (!nextPaneOrder) {
      return;
    }

    setLocalPaneOrder(nextVisiblePaneOrder);
    postWorkspaceDebugLog(workspaceState.debuggingMode, "drag.reorderRequested", {
      groupId: workspaceState.activeGroupId,
      nextPaneOrder,
      nextVisiblePaneOrder,
      sourcePaneId,
      targetPaneId,
    });
    vscode.postMessage({
      groupId: workspaceState.activeGroupId,
      sessionIds: nextPaneOrder,
      type: "syncPaneOrder",
    });
  };
  requestPaneReorderRef.current = requestPaneReorder;
  reorderablePaneIdsRef.current = reorderablePaneIds;

  const clearDragState = () => {
    const pointerDragState = pointerDragStateRef.current;
    if (pointerDragState?.pointerTarget.hasPointerCapture(pointerDragState.pointerId)) {
      pointerDragState.pointerTarget.releasePointerCapture(pointerDragState.pointerId);
    }
    pointerDragStateRef.current = undefined;
    setDraggedPaneId(undefined);
    dropTargetPaneIdRef.current = undefined;
    setDropTargetPaneId(undefined);
  };

  const setCurrentDropTargetPaneId = (paneId: string | undefined) => {
    dropTargetPaneIdRef.current = paneId;
    setDropTargetPaneId(paneId);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pointerDragState = pointerDragStateRef.current;
      if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) {
        return;
      }

      if (
        !pointerDragState.isDragging &&
        !hasWorkspacePanePointerDragExceededThreshold(
          pointerDragState.startX,
          pointerDragState.startY,
          event.clientX,
          event.clientY,
        )
      ) {
        return;
      }

      if (!pointerDragState.isDragging) {
        pointerDragState.isDragging = true;
        setDraggedPaneId(pointerDragState.sourcePaneId);
        postWorkspaceDebugLog(debuggingModeRef.current, "drag.thresholdPassed", {
          pointerId: pointerDragState.pointerId,
          sourcePaneId: pointerDragState.sourcePaneId,
          startX: Math.round(pointerDragState.startX),
          startY: Math.round(pointerDragState.startY),
        });
      }

      event.preventDefault();
      const nextDropTargetPaneId = getWorkspacePaneDropTargetIdAtPoint(
        event.clientX,
        event.clientY,
        pointerDragState.sourcePaneId,
        reorderablePaneIdsRef.current,
      );
      if (dropTargetPaneIdRef.current !== nextDropTargetPaneId) {
        postWorkspaceDebugLog(debuggingModeRef.current, "drag.dropTargetChanged", {
          clientX: Math.round(event.clientX),
          clientY: Math.round(event.clientY),
          sourcePaneId: pointerDragState.sourcePaneId,
          targetPaneId: nextDropTargetPaneId,
        });
      }
      setCurrentDropTargetPaneId(nextDropTargetPaneId);
    };

    const handlePointerFinish = (event: PointerEvent) => {
      const pointerDragState = pointerDragStateRef.current;
      if (!pointerDragState || event.pointerId !== pointerDragState.pointerId) {
        return;
      }

      const sourcePaneId = pointerDragState.sourcePaneId;
      const targetPaneId = pointerDragState.isDragging
        ? (dropTargetPaneIdRef.current ??
          getWorkspacePaneDropTargetIdAtPoint(
            event.clientX,
            event.clientY,
            sourcePaneId,
            reorderablePaneIdsRef.current,
          ))
        : undefined;

      postWorkspaceDebugLog(debuggingModeRef.current, "drag.pointerFinish", {
        clientX: Math.round(event.clientX),
        clientY: Math.round(event.clientY),
        didReorder: pointerDragState.isDragging && targetPaneId !== undefined,
        isDragging: pointerDragState.isDragging,
        sourcePaneId,
        targetPaneId,
      });
      clearDragState();
      if (!pointerDragState.isDragging || !targetPaneId) {
        return;
      }

      requestPaneReorderRef.current(sourcePaneId, targetPaneId);
    };

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerFinish, true);
    window.addEventListener("pointercancel", handlePointerFinish, true);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerFinish, true);
      window.removeEventListener("pointercancel", handlePointerFinish, true);
    };
  }, []);

  if (!workspaceState) {
    return (
      <main className="workspace-shell workspace-shell-empty">
        <div className="workspace-empty-state">Loading VSmux workspace…</div>
      </main>
    );
  }

  return (
    <main
      className={
        visiblePanes.length === 0 ? "workspace-shell workspace-shell-empty" : "workspace-shell"
      }
      style={workspaceShellStyle}
    >
      {orderedPanes.map((pane) => (
        <WorkspacePaneView
          connection={workspaceState.connection}
          debugLog={(event, payload) =>
            postWorkspaceDebugLog(workspaceState.debuggingMode, event, payload)
          }
          debuggingMode={workspaceState.debuggingMode}
          isFocused={presentedFocusedSessionId === pane.sessionId}
          isWorkspaceFocused={isWorkspaceFocused}
          key={pane.kind === "terminal" ? `${pane.sessionId}:${pane.renderNonce}` : pane.sessionId}
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
          refreshRequestId={terminalRefreshRequestId}
          terminalAppearance={workspaceState.terminalAppearance}
          canDrag={pane.kind === "terminal" && pane.isVisible && reorderablePaneIds.length > 1}
          autoFocusRequest={
            workspaceState.autoFocusRequest?.sessionId === pane.sessionId
              ? workspaceState.autoFocusRequest
              : undefined
          }
          isDragging={draggedPaneId === pane.sessionId}
          isDropTarget={dropTargetPaneId === pane.sessionId && draggedPaneId !== pane.sessionId}
          onHeaderNativeDragStart={(event) => {
            postWorkspaceDebugLog(workspaceState.debuggingMode, "drag.nativeDragPrevented", {
              sourcePaneId: pane.sessionId,
            });
            preventWorkspacePaneNativeDrag(event);
          }}
          onHeaderPointerDown={(event) => {
            if (pane.kind !== "terminal" || !pane.isVisible || event.button !== 0) {
              return;
            }

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            postWorkspaceDebugLog(workspaceState.debuggingMode, "drag.pointerDown", {
              clientX: Math.round(event.clientX),
              clientY: Math.round(event.clientY),
              pointerId: event.pointerId,
              pointerType: event.pointerType,
              sourcePaneId: pane.sessionId,
            });
            pointerDragStateRef.current = {
              isDragging: false,
              pointerId: event.pointerId,
              pointerTarget: event.currentTarget,
              sourcePaneId: pane.sessionId,
              startX: event.clientX,
              startY: event.clientY,
            };
            setDraggedPaneId(undefined);
            setCurrentDropTargetPaneId(undefined);
          }}
          onRefreshAllTerminals={() => {
            setTerminalRefreshRequestId((currentValue) => currentValue + 1);
          }}
        />
      ))}
      {visiblePanes.length === 0 ? (
        <div className="workspace-empty-state">No sessions in this group.</div>
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
  onHeaderPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onHeaderNativeDragStart: (event: ReactDragEvent<HTMLElement>) => void;
  onRefreshAllTerminals: () => void;
  pane: WorkspacePanelPane;
  refreshRequestId: number;
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
  onHeaderPointerDown,
  onHeaderNativeDragStart,
  onRefreshAllTerminals,
  pane,
  refreshRequestId,
  terminalAppearance,
}) => {
  const primaryTitle = getWorkspacePanePrimaryTitle(pane);

  return (
    <section
      className={[
        "workspace-pane",
        isFocused ? "workspace-pane-active" : "",
        isFocused && isWorkspaceFocused ? "workspace-pane-focused" : "",
        canDrag ? "workspace-pane-reorderable" : "",
        isDragging ? "workspace-pane-dragging" : "",
        isDropTarget ? "workspace-pane-drop-target" : "",
        !pane.isVisible ? "workspace-pane-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-workspace-pane-id={pane.sessionId}
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
        draggable={false}
        onDragStart={canDrag ? onHeaderNativeDragStart : undefined}
        onPointerDownCapture={canDrag ? onHeaderPointerDown : undefined}
      >
        <div className="workspace-pane-title">{primaryTitle}</div>
        {pane.kind === "terminal" ? (
          <div className="workspace-pane-header-actions">
            <WorkspacePaneRefreshButton onRefresh={onRefreshAllTerminals} />
            <WorkspacePaneCloseButton onConfirmClose={onClose} />
          </div>
        ) : null}
      </header>
      <div className="workspace-pane-body">
        {pane.kind === "terminal" ? (
          <TerminalPane
            autoFocusRequest={autoFocusRequest}
            connection={connection}
            debugLog={debugLog}
            debuggingMode={debuggingMode}
            isFocused={isFocused}
            isVisible={pane.isVisible}
            onActivate={() => {
              if (shouldIgnorePaneActivation(pane.sessionId)) {
                return;
              }

              onLocalFocus();
              if (!isFocused) {
                onFocus();
              }
            }}
            pane={pane}
            refreshRequestId={refreshRequestId}
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
    const terminalTitle = getVisibleTerminalTitle(pane.terminalTitle);
    if (terminalTitle) {
      return terminalTitle;
    }
  }

  return pane.sessionRecord.alias;
}

function preventWorkspacePaneNativeDrag(event: ReactDragEvent<HTMLElement>): void {
  event.preventDefault();
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

function hasWorkspacePanePointerDragExceededThreshold(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): boolean {
  return Math.hypot(currentX - startX, currentY - startY) >= 6;
}

function getWorkspacePaneDropTargetIdAtPoint(
  clientX: number,
  clientY: number,
  sourcePaneId: string,
  reorderablePaneIds: readonly string[],
): string | undefined {
  const hitElement = document.elementFromPoint(clientX, clientY);
  if (!(hitElement instanceof Element)) {
    return undefined;
  }

  const targetPaneId = hitElement.closest<HTMLElement>("[data-workspace-pane-id]")?.dataset
    .workspacePaneId;
  if (
    !targetPaneId ||
    targetPaneId === sourcePaneId ||
    !reorderablePaneIds.includes(targetPaneId)
  ) {
    return undefined;
  }

  return targetPaneId;
}
