import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { createEditorLayoutPlan } from "../shared/editor-layout";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelHydrateMessage,
  WorkspacePanelPane,
  WorkspacePanelSessionStateMessage,
} from "../shared/workspace-panel-contract";
import { stripWorkspacePanelTransientFields } from "../shared/workspace-panel-contract";
import { getVisiblePrimaryTitle, getVisibleTerminalTitle } from "../shared/session-grid-contract";
import {
  getSidebarAgentIconById,
  shouldPreferTerminalTitleForAgentIcon,
} from "../shared/sidebar-agents";
import { logWorkspaceDebug } from "./workspace-debug";
import { WorkspacePaneCloseButton } from "./workspace-pane-close-button";
import { WorkspacePaneRefreshButton } from "./workspace-pane-refresh-button";
import {
  buildFullSessionOrderFromVisiblePaneOrder,
  buildVisiblePaneOrderForDrop,
  sortPanesBySessionIds,
} from "./workspace-pane-reorder";
import { destroyCachedTerminalRuntime, getTerminalRuntimeCacheKey } from "./terminal-runtime-cache";
import { TerminalPane } from "./terminal-pane";
import { T3Pane } from "./t3-pane";

type MessageSource = Pick<Window, "addEventListener" | "removeEventListener">;

export type WorkspaceAppProps = {
  messageSource?: MessageSource;
  vscode: {
    postMessage: (message: unknown) => void;
  };
};

type WorkspaceStateMessage = WorkspacePanelHydrateMessage | WorkspacePanelSessionStateMessage;

type WorkspaceShellStyle = CSSProperties & {
  "--workspace-active-pane-border-color"?: string;
  "--workspace-pane-gap": string;
};

type WorkspacePaneMeasuredBounds = {
  height: number;
  width: number;
};

type WorkspaceTerminalActivationSource = "focusin" | "pointer";

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
const AUTO_RELOAD_ON_LAG = true;
let nextWorkspaceBootId = 0;
let nextWorkspacePaneViewInstanceId = 0;
let nextWorkspacePortalTargetId = 0;

const getInitialWorkspaceState = (): WorkspaceStateMessage | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.__VSMUX_WORKSPACE_BOOTSTRAP__;
};

declare global {
  interface Window {
    __VSMUX_WORKSPACE_BOOTSTRAP__?: WorkspaceStateMessage;
  }
}

const describeActiveElement = () => {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return null;
  }

  return {
    className: activeElement.className || undefined,
    id: activeElement.id || undefined,
    role: activeElement.getAttribute("role") || undefined,
    tagName: activeElement.tagName,
  };
};

const summarizeWorkspaceTerminalPanes = (panes: WorkspacePanelPane[]) =>
  panes.flatMap((pane) =>
    pane.kind !== "terminal"
      ? []
      : [
          {
            isVisible: pane.isVisible,
            renderNonce: pane.renderNonce,
            sessionId: pane.sessionId,
            snapshotAgentName: pane.snapshot?.agentName,
            snapshotHistoryBytes: pane.snapshot?.history?.length ?? 0,
            snapshotIsAttached: pane.snapshot?.isAttached,
            snapshotStatus: pane.snapshot?.status,
          },
        ],
  );

const summarizeTerminalLayerState = (
  panes: WorkspacePanelPane[],
  focusedSessionId: string | undefined,
  layoutBySessionId: Map<string, { gridColumn: string; gridRow: string }>,
  portalTargets: Map<string, HTMLDivElement>,
) =>
  panes.flatMap((pane) =>
    pane.kind !== "terminal"
      ? []
      : [
          {
            gridColumn: layoutBySessionId.get(pane.sessionId)?.gridColumn,
            gridRow: layoutBySessionId.get(pane.sessionId)?.gridRow,
            isFocused: focusedSessionId === pane.sessionId,
            isVisible: pane.isVisible,
            portalTargetId:
              portalTargets.get(pane.sessionId)?.dataset.vsmuxPortalTargetId ?? undefined,
            renderNonce: pane.renderNonce,
            sessionId: pane.sessionId,
          },
        ],
  );

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({ messageSource = window, vscode }) => {
  const workspaceBootIdRef = useRef(++nextWorkspaceBootId);
  const [isWorkspaceFocused, setIsWorkspaceFocused] = useState(
    () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      document.hasFocus(),
  );
  const [serverState, setServerState] = useState<ExtensionToWorkspacePanelMessage | undefined>(() =>
    getInitialWorkspaceState(),
  );
  const [localFocusedSessionId, setLocalFocusedSessionId] = useState<string | undefined>();
  const [localPaneOrder, setLocalPaneOrder] = useState<string[] | undefined>();
  const [draggedPaneId, setDraggedPaneId] = useState<string | undefined>();
  const [dropTargetPaneId, setDropTargetPaneId] = useState<string | undefined>();
  const [paneMeasuredBoundsVersion, setPaneMeasuredBoundsVersion] = useState(0);
  const [, setTerminalPortalVersion] = useState(0);
  const focusRequestSequenceRef = useRef(0);
  const debuggingModeRef = useRef<boolean | undefined>(undefined);
  const lagAutoReloadRequestedRef = useRef(false);
  const autoFocusGuardRef = useRef<WorkspaceAutoFocusGuard | undefined>(undefined);
  const lastAppliedWorkspaceMessageSignatureRef = useRef<string | undefined>(undefined);
  const lastAppliedAutoFocusRequestIdRef = useRef<number | undefined>(undefined);
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
  const workspaceStateRef = useRef<WorkspaceStateMessage | undefined>(undefined);
  const presentedFocusedSessionIdRef = useRef<string | undefined>(undefined);
  const paneMeasuredBoundsRef = useRef(new Map<string, WorkspacePaneMeasuredBounds>());
  const lastVisibleLayoutBySessionIdRef = useRef(
    new Map<string, { gridColumn: string; gridRow: string }>(),
  );
  const terminalPortalTargetsRef = useRef(new Map<string, HTMLDivElement>());
  const terminalPortalRefCallbacksRef = useRef(
    new Map<string, (element: HTMLDivElement | null) => void>(),
  );
  const terminalPortalTargetVersionRef = useRef(0);
  const handleT3IframeFocusRef = useRef<
    | ((sessionId: string, event: MessageEvent<{ sessionId?: string; type?: string }>) => void)
    | undefined
  >(undefined);
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
  workspaceStateRef.current = workspaceState;

  const postToExtension = (message: Record<string, unknown>) => {
    vscode.postMessage(message);
  };

  const postWorkspaceDebugLog = (
    enabled: boolean | undefined,
    event: string,
    payload?: Record<string, unknown>,
  ) => {
    logWorkspaceDebug(enabled, event, payload);
    if (!enabled) {
      return;
    }

    postToExtension({
      details: payload ? safeSerializeWorkspaceDebugDetails(payload) : undefined,
      event,
      type: "workspaceDebugLog",
    });
  };

  useEffect(() => {
    postWorkspaceDebugLog(true, "workspace.instanceMounted", {
      bootId: workspaceBootIdRef.current,
      documentHasFocus: document.hasFocus(),
      hidden: document.hidden,
      visibilityState: document.visibilityState,
    });

    return () => {
      postWorkspaceDebugLog(true, "workspace.instanceUnmounted", {
        bootId: workspaceBootIdRef.current,
        documentHasFocus: document.hasFocus(),
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
    };
  }, []);

  useEffect(() => {
    const syncWorkspaceFocusState = (source: string) => {
      const nextIsWorkspaceFocused = document.visibilityState === "visible" && document.hasFocus();
      setIsWorkspaceFocused(nextIsWorkspaceFocused);
      postWorkspaceDebugLog(debuggingModeRef.current, "workspace.focusStateSync", {
        activeElement: describeActiveElement(),
        bootId: workspaceBootIdRef.current,
        documentHasFocus: document.hasFocus(),
        hidden: document.hidden,
        isWorkspaceFocused: nextIsWorkspaceFocused,
        source,
        visibilityState: document.visibilityState,
      });
    };

    const handleBlur = () => syncWorkspaceFocusState("window.blur");
    const handleFocus = () => syncWorkspaceFocusState("window.focus");
    const handleFocusIn = () => syncWorkspaceFocusState("window.focusin");
    const handleFocusOut = () => syncWorkspaceFocusState("window.focusout");
    const handleVisibilityChange = () => syncWorkspaceFocusState("document.visibilitychange");

    syncWorkspaceFocusState("mount");
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const applyWorkspaceStateMessage = (
      message: WorkspacePanelHydrateMessage | WorkspacePanelSessionStateMessage,
    ) => {
      const stableMessageSignature = JSON.stringify(stripWorkspacePanelTransientFields(message));
      const isDuplicateStableState =
        lastAppliedWorkspaceMessageSignatureRef.current === stableMessageSignature;
      const shouldApplyAutoFocusRequest =
        !!message.autoFocusRequest &&
        lastAppliedAutoFocusRequestIdRef.current !== message.autoFocusRequest.requestId;

      if (isDuplicateStableState && !shouldApplyAutoFocusRequest) {
        postWorkspaceDebugLog(message.debuggingMode, "message.ignoredDuplicate", {
          activeGroupId: message.activeGroupId,
          bootId: workspaceBootIdRef.current,
          focusedSessionId: message.focusedSessionId,
          paneIds: message.panes.map((pane) => pane.sessionId),
          type: message.type,
        });
        return;
      }

      postWorkspaceDebugLog(message.debuggingMode, "message.received", {
        activeGroupId: message.activeGroupId,
        bootId: workspaceBootIdRef.current,
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
          bootId: workspaceBootIdRef.current,
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
          bootId: workspaceBootIdRef.current,
          expiresAt: Math.round(autoFocusGuardRef.current.expiresAt),
          requestId: message.autoFocusRequest.requestId,
          sessionId: message.autoFocusRequest.sessionId,
          source: message.autoFocusRequest.source,
        });
        lastAppliedAutoFocusRequestIdRef.current = message.autoFocusRequest.requestId;
      }
      lastAppliedWorkspaceMessageSignatureRef.current = stableMessageSignature;
      setServerState(message);
    };

    const handleMessage = (event: MessageEvent<ExtensionToWorkspacePanelMessage>) => {
      const nextMessage = event.data;
      if (!nextMessage) {
        return;
      }

      if (nextMessage.type === "terminalPresentationChanged") {
        postWorkspaceDebugLog(debuggingModeRef.current, "workspace.terminalPresentationChanged", {
          sessionId: nextMessage.sessionId,
          snapshotAgentName: nextMessage.snapshot?.agentName,
          snapshotHistoryBytes: nextMessage.snapshot?.history?.length ?? 0,
          snapshotIsAttached: nextMessage.snapshot?.isAttached,
          snapshotStatus: nextMessage.snapshot?.status,
          terminalTitle: nextMessage.terminalTitle,
        });
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

      if (nextMessage.type === "destroyTerminalRuntime") {
        destroyCachedTerminalRuntime(getTerminalRuntimeCacheKey(nextMessage.sessionId));
        return;
      }

      if (nextMessage.type !== "hydrate" && nextMessage.type !== "sessionState") {
        return;
      }

      postWorkspaceDebugLog(nextMessage.debuggingMode, "workspace.sessionStatePaneSummary", {
        activeGroupId: nextMessage.activeGroupId,
        bootId: workspaceBootIdRef.current,
        focusedSessionId: nextMessage.focusedSessionId,
        paneCount: nextMessage.panes.length,
        panes: summarizeWorkspaceTerminalPanes(nextMessage.panes),
        workspaceGroups: nextMessage.workspaceSnapshot.groups.map((group) => ({
          focusedSessionId: group.snapshot.focusedSessionId,
          groupId: group.groupId,
          sessionIds: group.snapshot.sessions.map((session) => session.sessionId),
          viewMode: group.snapshot.viewMode,
          visibleCount: group.snapshot.visibleCount,
          visibleSessionIds: [...group.snapshot.visibleSessionIds],
        })),
      });

      applyWorkspaceStateMessage(nextMessage);
    };

    const handleIframeFocus = (event: MessageEvent<{ sessionId?: string; type?: string }>) => {
      if (event.data?.type !== "vsmuxT3Focus" || typeof event.data.sessionId !== "string") {
        return;
      }

      handleT3IframeFocusRef.current?.(event.data.sessionId, event);
    };

    const handleWorkspaceMessage = (event: Event) => {
      if (event instanceof MessageEvent) {
        handleMessage(event);
      }
    };

    messageSource.addEventListener("message", handleWorkspaceMessage);
    window.addEventListener("message", handleIframeFocus);
    postToExtension({ type: "ready" });

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
  const activeGroupSessionIdSet = useMemo(() => {
    const activeGroup = workspaceState?.workspaceSnapshot.groups.find(
      (group) => group.groupId === workspaceState.activeGroupId,
    );
    return new Set(activeGroup?.snapshot.sessions.map((session) => session.sessionId) ?? []);
  }, [workspaceState?.activeGroupId, workspaceState?.workspaceSnapshot.groups]);
  const visiblePanes = useMemo(() => {
    return orderedPanes.filter((pane) => pane.isVisible);
  }, [orderedPanes]);
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
  useEffect(() => {
    for (const [sessionId, layout] of visiblePaneLayoutBySessionId.entries()) {
      if (!activeGroupSessionIdSet.has(sessionId)) {
        continue;
      }

      lastVisibleLayoutBySessionIdRef.current.set(sessionId, layout);
    }
  }, [activeGroupSessionIdSet, visiblePaneLayoutBySessionId]);
  const presentedFocusedSessionId = localFocusedSessionId ?? workspaceState?.focusedSessionId;
  presentedFocusedSessionIdRef.current = presentedFocusedSessionId;
  const visiblePaneIds = useMemo(() => visiblePanes.map((pane) => pane.sessionId), [visiblePanes]);
  const visiblePaneIdsKey = visiblePaneIds.join("|");
  const reorderablePaneIds = useMemo(
    () => visiblePanes.filter((pane) => pane.kind === "terminal").map((pane) => pane.sessionId),
    [visiblePanes],
  );
  const terminalPanes = useMemo(
    () =>
      orderedPanes.filter(
        (pane): pane is Extract<WorkspacePanelPane, { kind: "terminal" }> =>
          pane.kind === "terminal",
      ),
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
  const hiddenPaneInPlaceStyles = useMemo(() => {
    const nextStyles = new Map<string, CSSProperties>();
    for (const pane of orderedPanes) {
      if (
        pane.kind !== "terminal" ||
        pane.isVisible ||
        !activeGroupSessionIdSet.has(pane.sessionId)
      ) {
        continue;
      }

      const cachedLayout = lastVisibleLayoutBySessionIdRef.current.get(pane.sessionId);
      if (!cachedLayout) {
        continue;
      }

      nextStyles.set(pane.sessionId, {
        gridColumn: cachedLayout.gridColumn,
        gridRow: cachedLayout.gridRow,
        pointerEvents: "none",
        visibility: "hidden",
        zIndex: 0,
      });
    }

    return nextStyles;
  }, [activeGroupSessionIdSet, orderedPanes]);
  const hiddenPaneParkingStyles = useMemo(() => {
    const paneGap = workspaceState?.layoutAppearance.paneGap ?? 12;
    const hiddenTerminalPanes = orderedPanes.filter(
      (pane): pane is Extract<WorkspacePanelPane, { kind: "terminal" }> =>
        pane.kind === "terminal" &&
        !pane.isVisible &&
        (!activeGroupSessionIdSet.has(pane.sessionId) ||
          !lastVisibleLayoutBySessionIdRef.current.has(pane.sessionId)),
    );
    const nextStyles = new Map<string, CSSProperties>();

    hiddenTerminalPanes.forEach((pane, index) => {
      const measuredBounds = paneMeasuredBoundsRef.current.get(pane.sessionId);
      nextStyles.set(pane.sessionId, {
        height: measuredBounds?.height ? `${String(measuredBounds.height)}px` : "1px",
        left: "0",
        pointerEvents: "none",
        position: "absolute",
        top: `calc(100% + ${String((index + 1) * (paneGap + 24))}px)`,
        width: measuredBounds?.width ? `${String(measuredBounds.width)}px` : "1px",
        zIndex: 0,
      });
    });

    return nextStyles;
  }, [
    activeGroupSessionIdSet,
    orderedPanes,
    paneMeasuredBoundsVersion,
    workspaceState?.layoutAppearance.paneGap,
  ]);

  useEffect(() => {
    if (!workspaceState) {
      return;
    }

    postWorkspaceDebugLog(workspaceState.debuggingMode, "workspace.activeGroupLayoutSummary", {
      activeGroupId: workspaceState.activeGroupId,
      focusedSessionId: presentedFocusedSessionId,
      visibleLayouts: visiblePanes.map((pane) => ({
        gridColumn: visiblePaneLayoutBySessionId.get(pane.sessionId)?.gridColumn,
        gridRow: visiblePaneLayoutBySessionId.get(pane.sessionId)?.gridRow,
        isFocused: presentedFocusedSessionId === pane.sessionId,
        sessionId: pane.sessionId,
      })),
      viewMode: workspaceState.viewMode,
    });
  }, [
    presentedFocusedSessionId,
    visiblePaneLayoutBySessionId,
    visiblePaneIdsKey,
    visiblePanes,
    workspaceState,
  ]);

  useEffect(() => {
    if (!workspaceState) {
      return;
    }

    postWorkspaceDebugLog(workspaceState.debuggingMode, "workspace.hiddenPaneParkingSummary", {
      activeGroupId: workspaceState.activeGroupId,
      hiddenPanes: orderedPanes.flatMap((pane) => {
        if (pane.kind !== "terminal" || pane.isVisible) {
          return [];
        }

        const measuredBounds = paneMeasuredBoundsRef.current.get(pane.sessionId);
        const inPlaceStyle = hiddenPaneInPlaceStyles.get(pane.sessionId);
        const parkingStyle = hiddenPaneParkingStyles.get(pane.sessionId);
        return [
          {
            hiddenMode: inPlaceStyle ? "in-place" : "parked",
            measuredBounds,
            inPlaceGridColumn:
              typeof inPlaceStyle?.gridColumn === "string" ? inPlaceStyle.gridColumn : undefined,
            inPlaceGridRow:
              typeof inPlaceStyle?.gridRow === "string" ? inPlaceStyle.gridRow : undefined,
            parkingHeight:
              typeof parkingStyle?.height === "string" ? parkingStyle.height : undefined,
            parkingTop: typeof parkingStyle?.top === "string" ? parkingStyle.top : undefined,
            parkingWidth: typeof parkingStyle?.width === "string" ? parkingStyle.width : undefined,
            renderNonce: pane.renderNonce,
            sessionId: pane.sessionId,
          },
        ];
      }),
    });
  }, [hiddenPaneInPlaceStyles, hiddenPaneParkingStyles, orderedPanes, workspaceState]);

  useEffect(() => {
    if (!workspaceState) {
      return;
    }

    postWorkspaceDebugLog(workspaceState.debuggingMode, "workspace.terminalLayerSummary", {
      activeGroupId: workspaceState.activeGroupId,
      bootId: workspaceBootIdRef.current,
      focusedSessionId: presentedFocusedSessionId,
      terminalLayers: summarizeTerminalLayerState(
        orderedPanes,
        presentedFocusedSessionId,
        visiblePaneLayoutBySessionId,
        terminalPortalTargetsRef.current,
      ),
      visiblePaneIds,
    });
  }, [
    orderedPanes,
    presentedFocusedSessionId,
    visiblePaneIdsKey,
    visiblePaneLayoutBySessionId,
    workspaceState,
  ]);

  useEffect(() => {
    if (!workspaceState) {
      return;
    }

    const pendingFocusedSessionId = pendingFocusedSessionIdRef.current;
    const pendingFocusRequest = pendingFocusRequestRef.current;

    if (pendingFocusedSessionId) {
      if (workspaceState.focusedSessionId === pendingFocusedSessionId) {
        pendingFocusedSessionIdRef.current = undefined;
        pendingFocusRequestRef.current = undefined;
      } else {
        postWorkspaceDebugLog(workspaceState.debuggingMode, "focus.pendingRequestSuperseded", {
          pendingFocusRequest:
            pendingFocusRequest === undefined
              ? undefined
              : {
                  durationMs: Math.round(performance.now() - pendingFocusRequest.startedAt),
                  requestId: pendingFocusRequest.requestId,
                  sessionId: pendingFocusRequest.sessionId,
                },
          serverFocusedSessionId: workspaceState.focusedSessionId,
        });
        pendingFocusedSessionIdRef.current = undefined;
        pendingFocusRequestRef.current = undefined;
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
    postToExtension({
      sessionId,
      type: "focusSession",
    });
  };

  const applyLocalFocusVisual = (sessionId: string) => {
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.localFocusVisual", {
      sessionId,
    });
    setLocalFocusedSessionId(sessionId);
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

  const handleT3IframeFocus = (
    sessionId: string,
    event: MessageEvent<{ sessionId?: string; type?: string }>,
  ) => {
    const activeWorkspaceState = workspaceStateRef.current;
    const pane = activeWorkspaceState?.panes.find(
      (candidate) => candidate.kind === "t3" && candidate.sessionId === sessionId,
    );
    const isVisible = pane?.isVisible === true;
    const isFocused = presentedFocusedSessionIdRef.current === sessionId;
    const ignoredForAutoFocus = shouldIgnorePaneActivation(sessionId);

    postWorkspaceDebugLog(activeWorkspaceState?.debuggingMode, "focus.t3IframeFocusReceived", {
      eventOrigin: event.origin,
      ignoredForAutoFocus,
      isFocused,
      isVisible,
      paneExists: pane !== undefined,
      sessionId,
    });

    if (!pane) {
      return;
    }

    if (!pane.isVisible) {
      postWorkspaceDebugLog(activeWorkspaceState?.debuggingMode, "focus.t3IframeFocusIgnored", {
        reason: "hiddenPane",
        sessionId,
      });
      return;
    }

    if (ignoredForAutoFocus) {
      postWorkspaceDebugLog(activeWorkspaceState?.debuggingMode, "focus.t3IframeFocusIgnored", {
        reason: "autoFocusGuard",
        sessionId,
      });
      return;
    }

    applyLocalFocusVisual(sessionId);
    if (!isFocused) {
      requestFocusSession(sessionId);
      return;
    }

    postWorkspaceDebugLog(activeWorkspaceState?.debuggingMode, "focus.t3IframeFocusIgnored", {
      reason: "alreadyFocused",
      sessionId,
    });
  };
  handleT3IframeFocusRef.current = handleT3IframeFocus;

  const handleTerminalActivate = (sessionId: string, source: WorkspaceTerminalActivationSource) => {
    if (pointerDragStateRef.current) {
      postWorkspaceDebugLog(
        workspaceState?.debuggingMode,
        "focus.paneActivationIgnoredDuringHeaderDrag",
        {
          sessionId,
          source,
        },
      );
      return;
    }

    const ignored = shouldIgnorePaneActivation(sessionId);
    const isFocused = presentedFocusedSessionId === sessionId;
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.paneActivationReceived", {
      ignored,
      isFocused,
      localFocusedSessionId: presentedFocusedSessionId,
      serverFocusedSessionId: workspaceState?.focusedSessionId,
      sessionId,
      source,
    });
    if (ignored) {
      return;
    }

    applyLocalFocusVisual(sessionId);
    if (!isFocused) {
      postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.paneActivationRequestsFocus", {
        sessionId,
        source,
      });
      requestFocusSession(sessionId);
      return;
    }

    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.paneActivationAlreadyFocused", {
      sessionId,
      source,
    });
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
    postToExtension({
      groupId: workspaceState.activeGroupId,
      sessionIds: nextPaneOrder,
      type: "syncPaneOrder",
    });
  };
  requestPaneReorderRef.current = requestPaneReorder;
  reorderablePaneIdsRef.current = reorderablePaneIds;

  const handleTerminalLagDetected = (payload: {
    overshootMs: number;
    sessionId: string;
    visibilityState: DocumentVisibilityState;
  }) => {
    if (payload.visibilityState !== "visible" || !AUTO_RELOAD_ON_LAG) {
      return;
    }

    if (lagAutoReloadRequestedRef.current) {
      return;
    }

    lagAutoReloadRequestedRef.current = true;
    postWorkspaceDebugLog(true, "workspace.lagAutoReload", {
      bootId: workspaceBootIdRef.current,
      debuggingMode: workspaceState?.debuggingMode ?? false,
      overshootMs: payload.overshootMs,
      sessionId: payload.sessionId,
    });
    postToExtension({ sessionId: payload.sessionId, type: "reloadWorkspacePanel" });
  };

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

  const getTerminalPortalTargetRef = (sessionId: string) => {
    const existingCallback = terminalPortalRefCallbacksRef.current.get(sessionId);
    if (existingCallback) {
      return existingCallback;
    }

    const callback = (element: HTMLDivElement | null) => {
      const targets = terminalPortalTargetsRef.current;
      const previousElement = targets.get(sessionId) ?? null;
      if (previousElement === element) {
        return;
      }

      if (element) {
        element.dataset.vsmuxPortalTargetId ||= `portal-target-${++nextWorkspacePortalTargetId}`;
        targets.set(sessionId, element);
      } else {
        targets.delete(sessionId);
      }
      postWorkspaceDebugLog(debuggingModeRef.current, "workspace.terminalPortalTargetChanged", {
        hadPreviousTarget: previousElement !== null,
        hasNextTarget: element !== null,
        nextTargetId: element?.dataset.vsmuxPortalTargetId ?? null,
        previousTargetId: previousElement?.dataset.vsmuxPortalTargetId ?? null,
        sessionId,
      });
      terminalPortalTargetVersionRef.current += 1;
      setTerminalPortalVersion(terminalPortalTargetVersionRef.current);
    };
    terminalPortalRefCallbacksRef.current.set(sessionId, callback);
    return callback;
  };

  useEffect(() => {
    const activeSessionIds = new Set(terminalPanes.map((pane) => pane.sessionId));
    for (const sessionId of [...terminalPortalTargetsRef.current.keys()]) {
      if (!activeSessionIds.has(sessionId)) {
        terminalPortalTargetsRef.current.delete(sessionId);
      }
    }
    for (const sessionId of [...terminalPortalRefCallbacksRef.current.keys()]) {
      if (!activeSessionIds.has(sessionId)) {
        terminalPortalRefCallbacksRef.current.delete(sessionId);
      }
    }
  }, [terminalPanes]);

  const setCurrentDropTargetPaneId = (paneId: string | undefined) => {
    dropTargetPaneIdRef.current = paneId;
    setDropTargetPaneId(paneId);
  };

  const recordPaneMeasuredBounds = (sessionId: string, bounds: WorkspacePaneMeasuredBounds) => {
    const previousBounds = paneMeasuredBoundsRef.current.get(sessionId);
    if (previousBounds?.width === bounds.width && previousBounds.height === bounds.height) {
      return;
    }

    paneMeasuredBoundsRef.current.set(sessionId, bounds);
    setPaneMeasuredBoundsVersion((value) => value + 1);
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "workspace.paneMeasuredBounds", {
      bounds,
      previousBounds,
      sessionId,
    });
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
    return <main className="workspace-shell workspace-shell-empty" />;
  }

  return (
    <main
      className={
        visiblePanes.length === 0 ? "workspace-shell workspace-shell-empty" : "workspace-shell"
      }
      style={workspaceShellStyle}
    >
      {/* Lag notice UI intentionally disabled. Startup lag is handled by automatic workarea reload. */}
      {orderedPanes.map((pane) => (
        <WorkspacePaneView
          debugLog={(event, payload) =>
            postWorkspaceDebugLog(workspaceState.debuggingMode, event, payload)
          }
          fallbackLayoutStyle={
            pane.isVisible
              ? (visiblePaneLayoutBySessionId.get(workspaceState.focusedSessionId ?? "") ??
                visiblePaneLayoutBySessionId.get(visiblePanes[0]?.sessionId ?? ""))
              : undefined
          }
          isFocused={presentedFocusedSessionId === pane.sessionId}
          isWorkspaceFocused={isWorkspaceFocused}
          key={pane.kind === "terminal" ? `${pane.sessionId}:${pane.renderNonce}` : pane.sessionId}
          layoutStyle={
            pane.isVisible
              ? visiblePaneLayoutBySessionId.get(pane.sessionId)
              : (hiddenPaneInPlaceStyles.get(pane.sessionId) ??
                hiddenPaneParkingStyles.get(pane.sessionId))
          }
          onBoundsMeasured={(bounds) => recordPaneMeasuredBounds(pane.sessionId, bounds)}
          onLocalFocus={() => applyLocalFocusVisual(pane.sessionId)}
          onFocus={() => requestFocusSession(pane.sessionId)}
          onClose={() =>
            postToExtension({
              sessionId: pane.sessionId,
              type: "closeSession",
            })
          }
          onReload={() => {
            if (pane.kind === "terminal") {
              postToExtension({
                sessionId: pane.sessionId,
                type: "fullReloadSession",
              });
              return;
            }

            postToExtension({
              sessionId: pane.sessionId,
              type: "reloadWorkspacePanel",
            });
          }}
          pane={pane}
          registerTerminalPortalTarget={
            pane.kind === "terminal" ? getTerminalPortalTargetRef(pane.sessionId) : undefined
          }
          canDrag={pane.kind === "terminal" && pane.isVisible && reorderablePaneIds.length > 1}
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

            if (isWorkspacePaneHeaderInteractiveTarget(event.target)) {
              postWorkspaceDebugLog(
                workspaceState.debuggingMode,
                "drag.pointerDownIgnoredForHeaderControl",
                {
                  sourcePaneId: pane.sessionId,
                },
              );
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
        />
      ))}
      {terminalPanes.map((pane) => {
        const target = terminalPortalTargetsRef.current.get(pane.sessionId);
        if (!target) {
          return null;
        }

        return createPortal(
          <TerminalPane
            autoFocusRequest={
              workspaceState.autoFocusRequest?.sessionId === pane.sessionId
                ? workspaceState.autoFocusRequest
                : undefined
            }
            connection={workspaceState.connection}
            debugLog={(event, payload) =>
              postWorkspaceDebugLog(workspaceState.debuggingMode, event, payload)
            }
            debuggingMode={workspaceState.debuggingMode}
            isFocused={presentedFocusedSessionId === pane.sessionId}
            isVisible={pane.isVisible}
            onLagDetected={handleTerminalLagDetected}
            onActivate={(source) => handleTerminalActivate(pane.sessionId, source)}
            pane={pane}
            refreshRequestId={0}
            terminalAppearance={workspaceState.terminalAppearance}
          />,
          target,
          pane.sessionId,
        );
      })}
      {visiblePanes.length === 0 ? (
        <div className="workspace-empty-state">No sessions in this group.</div>
      ) : null}
    </main>
  );
};

type WorkspacePaneViewProps = {
  debugLog: (event: string, payload?: Record<string, unknown>) => void;
  fallbackLayoutStyle?: CSSProperties;
  isFocused: boolean;
  isWorkspaceFocused: boolean;
  canDrag: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  layoutStyle?: CSSProperties;
  onLocalFocus: () => void;
  onFocus: () => void;
  onClose: () => void;
  onReload: () => void;
  onBoundsMeasured: (bounds: WorkspacePaneMeasuredBounds) => void;
  onHeaderPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onHeaderNativeDragStart: (event: ReactDragEvent<HTMLElement>) => void;
  pane: WorkspacePanelPane;
  registerTerminalPortalTarget?: (element: HTMLDivElement | null) => void;
};

const WorkspacePaneView: React.FC<WorkspacePaneViewProps> = ({
  debugLog,
  fallbackLayoutStyle,
  isFocused,
  isWorkspaceFocused,
  canDrag,
  isDragging,
  isDropTarget,
  layoutStyle,
  onLocalFocus,
  onFocus,
  onClose,
  onBoundsMeasured,
  onReload,
  onHeaderPointerDown,
  onHeaderNativeDragStart,
  pane,
  registerTerminalPortalTarget,
}) => {
  const paneViewInstanceIdRef = useRef(`workspace-pane-view-${++nextWorkspacePaneViewInstanceId}`);
  const sectionRef = useRef<HTMLElement | null>(null);
  const primaryTitle = getWorkspacePanePrimaryTitle(pane);

  useEffect(() => {
    debugLog("workspace.paneViewMount", {
      isFocused,
      isWorkspaceFocused,
      isVisible: pane.isVisible,
      kind: pane.kind,
      paneViewInstanceId: paneViewInstanceIdRef.current,
      renderNonce: pane.kind === "terminal" ? pane.renderNonce : undefined,
      sessionId: pane.sessionId,
    });

    return () => {
      debugLog("workspace.paneViewUnmount", {
        isFocused,
        isWorkspaceFocused,
        isVisible: pane.isVisible,
        kind: pane.kind,
        paneViewInstanceId: paneViewInstanceIdRef.current,
        renderNonce: pane.kind === "terminal" ? pane.renderNonce : undefined,
        sessionId: pane.sessionId,
      });
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    const reportBounds = () => {
      if (!pane.isVisible) {
        return;
      }

      const bounds = section.getBoundingClientRect();
      const width = Math.round(bounds.width);
      const height = Math.round(bounds.height);
      if (width <= 0 || height <= 0) {
        return;
      }

      onBoundsMeasured({ height, width });
    };

    reportBounds();
    const observer = new ResizeObserver(reportBounds);
    observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, [onBoundsMeasured, pane.isVisible]);

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
      ref={sectionRef}
      onMouseDown={() => {
        debugLog("workspace.mainPanePointerDown", {
          isFocused,
          isVisible: pane.isVisible,
          layoutStyle,
          paneViewInstanceId: paneViewInstanceIdRef.current,
          renderNonce: pane.kind === "terminal" ? pane.renderNonce : undefined,
          sessionId: pane.sessionId,
        });
        onLocalFocus();
        if (!isFocused) {
          debugLog("focus.mouseDownRequestsFocus", {
            sessionId: pane.sessionId,
          });
          onFocus();
        }
      }}
      style={layoutStyle ?? fallbackLayoutStyle}
    >
      <header
        className={`workspace-pane-header ${canDrag ? "workspace-pane-header-draggable" : ""}`}
        draggable={false}
        onDragStart={canDrag ? onHeaderNativeDragStart : undefined}
        onPointerDownCapture={canDrag ? onHeaderPointerDown : undefined}
      >
        <div className="workspace-pane-title">{primaryTitle}</div>
        {pane.kind === "terminal" || pane.kind === "t3" ? (
          <div className="workspace-pane-header-actions">
            <WorkspacePaneRefreshButton onRefresh={onReload} />
            <WorkspacePaneCloseButton onConfirmClose={onClose} />
          </div>
        ) : null}
      </header>
      <div className="workspace-pane-body">
        {pane.kind === "terminal" ? (
          <div
            className="workspace-terminal-portal-target"
            ref={registerTerminalPortalTarget}
            data-vsmux-pane-view-id={paneViewInstanceIdRef.current}
            style={{ height: "100%", width: "100%" }}
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
  if (pane.kind === "terminal") {
    const terminalTitle = getVisibleTerminalTitle(pane.terminalTitle);
    const agentIcon = getSidebarAgentIconById(pane.snapshot?.agentName);
    if (terminalTitle && shouldPreferTerminalTitleForAgentIcon(agentIcon)) {
      return terminalTitle;
    }
  }

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

function isWorkspacePaneHeaderInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "button, [role='button'], input, select, textarea, a, .workspace-pane-header-actions",
    ),
  );
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
