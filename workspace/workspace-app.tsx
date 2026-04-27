import { Tooltip } from "@base-ui/react/tooltip";
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
  WorkspacePanelAcknowledgeSessionAttentionReason,
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelHydrateMessage,
  WorkspaceWelcomeModalMode,
  WorkspacePanelPane,
  WorkspacePanelScrollTerminalToBottomMessage,
  WorkspacePanelSessionStateMessage,
  WorkspacePanelShowToastMessage,
  WorkspacePanelT3Appearance,
  WorkspacePanelToExtensionMessage,
} from "../shared/workspace-panel-contract";
import {
  getVisiblePrimaryTitle,
  getVisibleTerminalTitle,
  type SessionLifecycleState,
} from "../shared/session-grid-contract";
import {
  getSidebarAgentIconById,
  shouldPreferTerminalTitleForAgentIcon,
} from "../shared/sidebar-agents";
import { WorkspacePaneCloseButton } from "./workspace-pane-close-button";
import { WorkspacePaneFontSizeControls } from "./workspace-pane-font-size-controls";
import { WorkspacePaneForkButton } from "./workspace-pane-fork-button";
import { WorkspacePaneRenameButton } from "./workspace-pane-rename-button";
import { WorkspacePaneRefreshButton } from "./workspace-pane-refresh-button";
import { WorkspacePaneSleepButton } from "./workspace-pane-sleep-button";
import {
  buildFullSessionOrderFromVisiblePaneOrder,
  buildVisiblePaneOrderForDrop,
  sortPanesBySessionIds,
  sortVisiblePanesBySlotIndex,
} from "./workspace-pane-reorder";
import { destroyCachedTerminalRuntime, getTerminalRuntimeCacheKey } from "./terminal-runtime-cache";
import { blurAllCachedT3Runtimes } from "./t3-runtime-cache";
import { TerminalPane } from "./terminal-pane";
import { T3Pane } from "./t3-pane";
import { WorkspaceWelcomeModal } from "./workspace-welcome-modal";

type MessageSource = Pick<Window, "addEventListener" | "removeEventListener">;
const WORKSPACE_TOOLTIP_DELAY_MS = 550;

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
  paddingTop?: string;
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

type WorkspaceToastPhase = "confirmed" | "fading" | "pending";
type WorkspaceToastState = WorkspacePanelShowToastMessage & {
  phase: WorkspaceToastPhase;
};
type WorkspaceTerminalScrollRequestState = WorkspacePanelScrollTerminalToBottomMessage;
type WorkspaceCodexSettingConfirmationState = {
  setting: "statusLine" | "terminalTitle";
  status: "alreadySet" | "updated";
};

const AUTO_FOCUS_ACTIVATION_GUARD_MS = 400;
const AUTO_RELOAD_ON_LAG = true;
const T3_TERMINAL_FOCUS_GUARD_MS = 1_000;
const WORKSPACE_TOAST_CONFIRM_DISPLAY_MS = 2_800;
const WORKSPACE_TOAST_CONFIRM_FADE_MS = 300;
const COMPLETION_FLASH_DURATION_MS = 3_000;
let nextWorkspaceBootId = 0;
let nextWorkspacePaneViewInstanceId = 0;
let nextWorkspacePortalTargetId = 0;
const DEFAULT_WORKSPACE_PANE_GAP_PX = 12;
const SINGLE_PANE_WORKSPACE_INSET_PX = 1;
const SINGLE_PANE_WORKSPACE_TOP_PADDING_EXTRA_PX = 2;
const DEBUG_BUILD_STAMP_STYLE: CSSProperties = {
  position: "fixed",
  right: "10px",
  bottom: "8px",
  zIndex: 20,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--vscode-foreground)",
  fontFamily: "var(--vscode-font-family)",
  fontSize: "10px",
  lineHeight: 1.2,
  fontVariantNumeric: "tabular-nums",
  opacity: 0.72,
};

const getInitialWorkspaceState = (): WorkspaceStateMessage | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.__zmux_WORKSPACE_BOOTSTRAP__;
};

declare global {
  interface Window {
    __zmux_WORKSPACE_BOOTSTRAP__?: WorkspaceStateMessage;
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

type WorkspaceToastComparable = WorkspacePanelShowToastMessage | WorkspaceToastState | undefined;

export function getWorkspaceShellPaneGapPx(
  visibleCount: number | undefined,
  configuredPaneGap: number | undefined,
): number {
  if (visibleCount === 1) {
    return SINGLE_PANE_WORKSPACE_INSET_PX;
  }

  return configuredPaneGap ?? DEFAULT_WORKSPACE_PANE_GAP_PX;
}

export function getWorkspaceShellPaddingTopPx(
  visibleCount: number | undefined,
  configuredPaneGap: number | undefined,
): number {
  const paneGapPx = getWorkspaceShellPaneGapPx(visibleCount, configuredPaneGap);

  if (visibleCount !== 1) {
    return paneGapPx;
  }

  return paneGapPx + SINGLE_PANE_WORKSPACE_TOP_PADDING_EXTRA_PX;
}

const summarizeWorkspacePaneState = (panes: WorkspacePanelPane[]) =>
  panes.map((pane) =>
    pane.kind === "terminal"
      ? {
          activity: pane.activity,
          lifecycleState: pane.lifecycleState,
          isVisible: pane.isVisible,
          kind: pane.kind,
          renderNonce: pane.renderNonce,
          sessionId: pane.sessionId,
          visibleSlotIndex: pane.visibleSlotIndex,
          snapshotAgentName: pane.snapshot?.agentName,
          snapshotHistoryBytes: pane.snapshot?.history?.length ?? 0,
          snapshotIsAttached: pane.snapshot?.isAttached,
          snapshotStatus: pane.snapshot?.status,
        }
      : {
          activity: pane.activity,
          lifecycleState: pane.lifecycleState,
          isVisible: pane.isVisible,
          kind: pane.kind,
          renderNonce: pane.renderNonce,
          sessionId: pane.sessionId,
          visibleSlotIndex: pane.visibleSlotIndex,
          threadId: pane.sessionRecord.t3.threadId,
          title: pane.sessionRecord.title,
        },
  );

const isSameWorkspaceToast = (left: WorkspaceToastComparable, right: WorkspaceToastComparable) =>
  left?.confirmOnTerminalEnterSessionId === right?.confirmOnTerminalEnterSessionId &&
  left?.confirmedMessage === right?.confirmedMessage &&
  left?.confirmedTitle === right?.confirmedTitle &&
  left?.expiresAt === right?.expiresAt &&
  left?.message === right?.message &&
  left?.title === right?.title;

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
              portalTargets.get(pane.sessionId)?.dataset.zmuxPortalTargetId ?? undefined,
            renderNonce: pane.renderNonce,
            sessionId: pane.sessionId,
          },
        ],
  );

function getWorkspacePaneHeaderIndicatorState(
  pane: WorkspacePanelPane,
): SessionLifecycleState | undefined {
  if (pane.lifecycleState === "error") {
    return "error";
  }

  if (pane.activity === "working") {
    return "running";
  }

  if (pane.activity === "attention") {
    return "done";
  }

  return undefined;
}

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
  const [localPaneOrder, setLocalPaneOrder] = useState<string[] | undefined>();
  const [draggedPaneId, setDraggedPaneId] = useState<string | undefined>();
  const [dropTargetPaneId, setDropTargetPaneId] = useState<string | undefined>();
  const [welcomeModalMode, setWelcomeModalMode] = useState<WorkspaceWelcomeModalMode>();
  const [, setTerminalPortalVersion] = useState(0);
  const [workspaceToast, setWorkspaceToast] = useState<WorkspaceToastState | undefined>();
  const [completionFlashNonceBySessionId, setCompletionFlashNonceBySessionId] = useState<
    Record<string, number>
  >({});
  const [terminalScrollRequest, setTerminalScrollRequest] = useState<
    WorkspaceTerminalScrollRequestState | undefined
  >();
  const [t3TerminalFocusGuardUntil, setT3TerminalFocusGuardUntil] = useState(0);
  const [codexSettingConfirmation, setCodexSettingConfirmation] = useState<
    WorkspaceCodexSettingConfirmationState | undefined
  >();
  const debuggingModeRef = useRef<boolean | undefined>(undefined);
  const lagAutoReloadRequestedRef = useRef(false);
  const autoFocusGuardRef = useRef<WorkspaceAutoFocusGuard | undefined>(undefined);
  const pointerDragStateRef = useRef<WorkspacePanePointerDragState | undefined>(undefined);
  const workspaceStateRef = useRef<WorkspaceStateMessage | undefined>(undefined);
  const presentedFocusedSessionIdRef = useRef<string | undefined>(undefined);
  const t3TerminalFocusGuardUntilRef = useRef(0);
  const paneMeasuredBoundsRef = useRef(new Map<string, WorkspacePaneMeasuredBounds>());
  const lastVisibleLayoutBySessionIdRef = useRef(
    new Map<string, { gridColumn: string; gridRow: string; layoutKey: string }>(),
  );
  const terminalPortalTargetsRef = useRef(new Map<string, HTMLDivElement>());
  const terminalPortalRefCallbacksRef = useRef(
    new Map<string, (element: HTMLDivElement | null) => void>(),
  );
  const terminalPortalTargetVersionRef = useRef(0);
  const completionFlashTimeoutBySessionIdRef = useRef<Map<string, number>>(new Map());
  const handleT3IframeFocusRef = useRef<
    | ((
        sessionId: string,
        event: MessageEvent<{
          payload?: Record<string, unknown>;
          sessionId?: string;
          type?: string;
        }>,
      ) => void)
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
  const isWelcomeModalOpen = welcomeModalMode !== undefined;
  debuggingModeRef.current = workspaceState?.debuggingMode;
  workspaceStateRef.current = workspaceState;
  t3TerminalFocusGuardUntilRef.current = t3TerminalFocusGuardUntil;

  useEffect(() => {
    if (!workspaceState?.shouldShowWelcomeModal) {
      return;
    }

    setWelcomeModalMode("required");
  }, [workspaceState?.shouldShowWelcomeModal]);

  const postToExtension = (message: WorkspacePanelToExtensionMessage) => {
    vscode.postMessage(message);
  };

  const requestCreateSession = () => {
    postToExtension({
      type: "createSession",
    });
  };

  const requestAcknowledgeSessionAttention = (
    sessionId: string,
    reason: WorkspacePanelAcknowledgeSessionAttentionReason,
  ) => {
    postToExtension({
      reason,
      sessionId,
      type: "acknowledgeSessionAttention",
    });
  };

  const requestCancelFirstPromptAutoRename = (sessionId: string) => {
    postToExtension({
      sessionId,
      type: "cancelFirstPromptAutoRename",
    });
  };

  const showWorkspaceToast = (toast: WorkspacePanelShowToastMessage) => {
    setWorkspaceToast({
      ...toast,
      phase: "pending",
    });
  };

  const dismissWorkspaceToast = (toast: WorkspacePanelShowToastMessage) => {
    setWorkspaceToast((currentToast) =>
      isSameWorkspaceToast(currentToast, toast) ? undefined : currentToast,
    );
  };

  const confirmWorkspaceToastForSession = (sessionId: string) => {
    setWorkspaceToast((currentToast) => {
      if (
        !currentToast ||
        currentToast.phase !== "pending" ||
        currentToast.confirmOnTerminalEnterSessionId !== sessionId
      ) {
        return currentToast;
      }

      return {
        ...currentToast,
        message: currentToast.confirmedMessage ?? currentToast.message,
        phase: "confirmed",
        title: currentToast.confirmedTitle ?? currentToast.title,
      };
    });
  };

  const postWorkspaceReproLog = (event: string, payload?: Record<string, unknown>) => {
    void event;
    void payload;
  };

  const postWorkspaceStartupLog = (event: string, payload?: Record<string, unknown>) => {
    postToExtension({
      details: payload,
      event,
      type: "workspaceDebugLog",
    });
  };

  const postWorkspaceDebugLog = (
    enabled: boolean | undefined,
    event: string,
    payload?: Record<string, unknown>,
  ) => {
    if (!isAlwaysOnWorkspaceReproEvent(event) && (!enabled || !isWtermDebugEvent(event))) {
      return;
    }

    postToExtension({
      details: payload,
      event,
      type: "workspaceDebugLog",
    });
  };

  useEffect(() => {
    window.__zmux_WORKSPACE_APP_MOUNTED__ = true;
    const bootstrapState = getInitialWorkspaceState();
    postWorkspaceStartupLog("workspaceStartup.webviewMounted", {
      bootId: workspaceBootIdRef.current,
      bootstrapPaneCount: bootstrapState?.panes.length ?? 0,
      bootstrapStateType: bootstrapState?.type,
      documentHasFocus: document.hasFocus(),
      hidden: document.hidden,
      visibilityState: document.visibilityState,
    });
    postWorkspaceDebugLog(true, "workspace.instanceMounted", {
      bootId: workspaceBootIdRef.current,
      documentHasFocus: document.hasFocus(),
      hidden: document.hidden,
      visibilityState: document.visibilityState,
    });

    return () => {
      window.__zmux_WORKSPACE_APP_MOUNTED__ = false;
      postWorkspaceDebugLog(true, "workspace.instanceUnmounted", {
        bootId: workspaceBootIdRef.current,
        documentHasFocus: document.hasFocus(),
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
    };
  }, []);

  useEffect(() => {
    /**
     * CDXC:CrashDiagnostics 2026-04-27-17:38
     * The user saw the macOS app disappear from the Dock without a clear JS
     * exception. Persist pagehide/beforeunload/error/rejection breadcrumbs so
     * the next incident shows whether the webview, React tree, or native host
     * began shutdown first.
     */
    const describeLifecycleState = () => ({
      activeElement: describeActiveElement(),
      bootId: workspaceBootIdRef.current,
      documentHasFocus: document.hasFocus(),
      focusedSessionId: workspaceStateRef.current?.focusedSessionId,
      hidden: document.hidden,
      paneSummary: summarizeWorkspacePaneState(workspaceStateRef.current?.panes ?? []),
      visibilityState: document.visibilityState,
    });
    const logLifecycle = (event: string, payload?: Record<string, unknown>) => {
      postWorkspaceDebugLog(true, event, {
        ...describeLifecycleState(),
        ...payload,
      });
    };
    const handleBeforeUnload = () => logLifecycle("workspace.lifecycle.beforeunload");
    const handlePageHide = (event: PageTransitionEvent) =>
      logLifecycle("workspace.lifecycle.pagehide", { persisted: event.persisted });
    const handleUnload = () => logLifecycle("workspace.lifecycle.unload");
    const handleError = (event: ErrorEvent) =>
      logLifecycle("workspace.lifecycle.error", {
        column: event.colno,
        line: event.lineno,
        message: event.message,
        source: event.filename,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      logLifecycle("workspace.lifecycle.unhandledRejection", {
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("unload", handleUnload);
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("unload", handleUnload);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
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
      postWorkspaceStartupLog("workspaceStartup.stateApplied", {
        activeGroupId: message.activeGroupId,
        bootId: workspaceBootIdRef.current,
        focusedSessionId: message.focusedSessionId,
        paneCount: message.panes.length,
        paneIds: message.panes.map((pane) => pane.sessionId),
        type: message.type,
      });
      postWorkspaceDebugLog(message.debuggingMode, "message.received", {
        activeGroupId: message.activeGroupId,
        bootId: workspaceBootIdRef.current,
        focusedSessionId: message.focusedSessionId,
        paneIds: message.panes.map((pane) => pane.sessionId),
        type: message.type,
      });
      postWorkspaceReproLog("repro.workspace.applyMessageReceived", {
        activeGroupId: message.activeGroupId,
        focusedSessionId: message.focusedSessionId,
        historyBytesBySessionId: message.panes.flatMap((pane) =>
          pane.kind !== "terminal"
            ? []
            : [{ historyBytes: pane.snapshot?.history?.length ?? 0, sessionId: pane.sessionId }],
        ),
        paneIds: message.panes.map((pane) => pane.sessionId),
        type: message.type,
      });
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
      }
      setServerState(message);
    };

    const handleMessage = (event: MessageEvent<ExtensionToWorkspacePanelMessage>) => {
      const nextMessage = event.data;
      if (!nextMessage) {
        return;
      }

      if (nextMessage.type === "terminalPresentationChanged") {
        postWorkspaceDebugLog(debuggingModeRef.current, "workspace.terminalPresentationChanged", {
          activity: nextMessage.activity,
          isGeneratingFirstPromptTitle: nextMessage.isGeneratingFirstPromptTitle,
          lifecycleState: nextMessage.lifecycleState,
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
            postWorkspaceStartupLog("workspaceStartup.transientIgnoredWithoutBaseState", {
              bootId: workspaceBootIdRef.current,
              sessionId: nextMessage.sessionId,
              terminalTitle: nextMessage.terminalTitle,
              transientType: nextMessage.type,
            });
            return previousState;
          }

          return {
            ...previousState,
            panes: previousState.panes.map((pane) =>
              pane.kind !== "terminal" || pane.sessionId !== nextMessage.sessionId
                ? pane
                : {
                    ...pane,
                    activity: nextMessage.activity ?? pane.activity,
                    isGeneratingFirstPromptTitle:
                      nextMessage.isGeneratingFirstPromptTitle ?? pane.isGeneratingFirstPromptTitle,
                    lifecycleState: nextMessage.lifecycleState ?? pane.lifecycleState,
                    snapshot: nextMessage.snapshot ?? pane.snapshot,
                    terminalTitle: nextMessage.terminalTitle,
                  },
            ),
          };
        });
        return;
      }

      if (nextMessage.type === "destroyTerminalRuntime") {
        /**
         * CDXC:CrashDiagnostics 2026-04-27-17:38
         * Runtime teardown logs must include the controller-provided reason and
         * current pane visibility so a future dock-level disappearance can be
         * distinguished from an intentional sleep/reload/close path.
         */
        const pane = workspaceStateRef.current?.panes.find(
          (candidate) => candidate.sessionId === nextMessage.sessionId,
        );
        postWorkspaceDebugLog(true, "workspace.terminal.runtimeDestroyReceived", {
          bootId: workspaceBootIdRef.current,
          focusedSessionId: workspaceStateRef.current?.focusedSessionId,
          pane:
            pane?.kind === "terminal"
              ? {
                  activity: pane.activity,
                  isVisible: pane.isVisible,
                  lifecycleState: pane.lifecycleState,
                  renderNonce: pane.renderNonce,
                  snapshotAgentName: pane.snapshot?.agentName,
                  snapshotAgentStatus: pane.snapshot?.agentStatus,
                  snapshotIsAttached: pane.snapshot?.isAttached,
                  snapshotStatus: pane.snapshot?.status,
                  terminalTitle: pane.terminalTitle,
                }
              : undefined,
          reason: nextMessage.reason,
          sessionId: nextMessage.sessionId,
        });
        destroyCachedTerminalRuntime(getTerminalRuntimeCacheKey(nextMessage.sessionId));
        postWorkspaceDebugLog(true, "workspace.terminal.runtimeDestroyCompleted", {
          bootId: workspaceBootIdRef.current,
          reason: nextMessage.reason,
          sessionId: nextMessage.sessionId,
        });
        return;
      }

      if (nextMessage.type === "showWelcomeModal") {
        setWelcomeModalMode(nextMessage.mode ?? "optional");
        return;
      }

      if (nextMessage.type === "showToast") {
        if (nextMessage.expiresAt <= Date.now()) {
          return;
        }

        showWorkspaceToast(nextMessage);
        return;
      }

      if (nextMessage.type === "codexWelcomeSettingApplied") {
        setCodexSettingConfirmation({
          setting: nextMessage.setting,
          status: nextMessage.status,
        });
        return;
      }

      if (nextMessage.type === "flashCompletionSession") {
        const existingTimeout = completionFlashTimeoutBySessionIdRef.current.get(
          nextMessage.sessionId,
        );
        if (existingTimeout !== undefined) {
          window.clearTimeout(existingTimeout);
        }
        setCompletionFlashNonceBySessionId((previous) => ({
          ...previous,
          [nextMessage.sessionId]: (previous[nextMessage.sessionId] ?? 0) + 1,
        }));
        const timeout = window.setTimeout(() => {
          completionFlashTimeoutBySessionIdRef.current.delete(nextMessage.sessionId);
          setCompletionFlashNonceBySessionId((previous) => {
            if (!(nextMessage.sessionId in previous)) {
              return previous;
            }

            const next = { ...previous };
            delete next[nextMessage.sessionId];
            return next;
          });
        }, COMPLETION_FLASH_DURATION_MS);
        completionFlashTimeoutBySessionIdRef.current.set(nextMessage.sessionId, timeout);
        return;
      }

      if (nextMessage.type === "scrollTerminalToBottom") {
        setTerminalScrollRequest(nextMessage);
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
        panes: summarizeWorkspacePaneState(nextMessage.panes),
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

    const handleIframeFocus = (
      event: MessageEvent<{
        payload?: Record<string, unknown>;
        sessionId?: string;
        type?: string;
      }>,
    ) => {
      if (event.data?.type !== "zmuxT3Focus" || typeof event.data.sessionId !== "string") {
        return;
      }

      postWorkspaceReproLog("repro.workspace.t3IframeFocusMessage", {
        eventOrigin: event.origin,
        payload: event.data.payload,
        sessionId: event.data.sessionId,
      });
      handleT3IframeFocusRef.current?.(event.data.sessionId, event);
    };

    const handleWorkspaceMessage = (event: Event) => {
      if (event instanceof MessageEvent) {
        handleMessage(event);
      }
    };

    messageSource.addEventListener("message", handleWorkspaceMessage);
    window.addEventListener("message", handleIframeFocus);
    window.__zmux_WORKSPACE_READY_POSTED__ = true;
    postToExtension({ type: "ready" });

    return () => {
      messageSource.removeEventListener("message", handleWorkspaceMessage);
      window.removeEventListener("message", handleIframeFocus);
    };
  }, [messageSource, vscode]);

  useEffect(() => {
    postWorkspaceStartupLog(
      workspaceState ? "workspaceStartup.workspaceStateAvailable" : "workspaceStartup.emptyState",
      {
        activeGroupId: workspaceState?.activeGroupId,
        bootId: workspaceBootIdRef.current,
        focusedSessionId: workspaceState?.focusedSessionId,
        paneCount: workspaceState?.panes.length ?? 0,
        paneIds: workspaceState?.panes.map((pane) => pane.sessionId) ?? [],
        stateType: workspaceState?.type,
      },
    );
  }, [workspaceState]);

  useEffect(() => {
    return () => {
      for (const timeout of completionFlashTimeoutBySessionIdRef.current.values()) {
        window.clearTimeout(timeout);
      }
      completionFlashTimeoutBySessionIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!workspaceToast) {
      return;
    }

    if (workspaceToast.phase === "confirmed") {
      const timeout = window.setTimeout(() => {
        setWorkspaceToast((currentToast) =>
          isSameWorkspaceToast(currentToast, workspaceToast) && currentToast?.phase === "confirmed"
            ? {
                ...currentToast,
                phase: "fading",
              }
            : currentToast,
        );
      }, WORKSPACE_TOAST_CONFIRM_DISPLAY_MS);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    if (workspaceToast.phase === "fading") {
      const timeout = window.setTimeout(() => {
        setWorkspaceToast((currentToast) =>
          isSameWorkspaceToast(currentToast, workspaceToast) ? undefined : currentToast,
        );
      }, WORKSPACE_TOAST_CONFIRM_FADE_MS);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    const remainingMs = workspaceToast.expiresAt - Date.now();
    if (remainingMs <= 0) {
      setWorkspaceToast(undefined);
      return;
    }

    const timeout = window.setTimeout(() => {
      setWorkspaceToast((currentToast) =>
        isSameWorkspaceToast(currentToast, workspaceToast) ? undefined : currentToast,
      );
    }, remainingMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [workspaceToast]);

  useEffect(() => {
    if (!codexSettingConfirmation) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCodexSettingConfirmation((currentConfirmation) =>
        currentConfirmation === codexSettingConfirmation ? undefined : currentConfirmation,
      );
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [codexSettingConfirmation]);

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
    const nextVisiblePanes = orderedPanes.filter((pane) => pane.isVisible);
    return localPaneOrder
      ? sortPanesBySessionIds(nextVisiblePanes, localPaneOrder)
      : sortVisiblePanesBySlotIndex(nextVisiblePanes);
  }, [localPaneOrder, orderedPanes]);
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
  const presentedFocusedSessionId = workspaceState?.focusedSessionId;
  presentedFocusedSessionIdRef.current = presentedFocusedSessionId;
  const visiblePaneIds = useMemo(() => visiblePanes.map((pane) => pane.sessionId), [visiblePanes]);
  const visiblePaneIdsKey = visiblePaneIds.join("|");
  const activeGroupLayoutKey = useMemo(
    () =>
      [
        workspaceState?.activeGroupId ?? "no-group",
        workspaceState?.viewMode ?? "grid",
        visiblePaneIdsKey,
      ].join("::"),
    [visiblePaneIdsKey, workspaceState?.activeGroupId, workspaceState?.viewMode],
  );
  useEffect(() => {
    for (const [sessionId, layout] of visiblePaneLayoutBySessionId.entries()) {
      if (!activeGroupSessionIdSet.has(sessionId)) {
        continue;
      }

      lastVisibleLayoutBySessionIdRef.current.set(sessionId, {
        ...layout,
        layoutKey: activeGroupLayoutKey,
      });
    }
  }, [activeGroupLayoutKey, activeGroupSessionIdSet, visiblePaneLayoutBySessionId]);
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
  const workspaceShellPaneGapPx = getWorkspaceShellPaneGapPx(
    workspaceState?.visibleCount,
    workspaceState?.layoutAppearance.paneGap,
  );
  const workspaceShellPaddingTopPx = getWorkspaceShellPaddingTopPx(
    workspaceState?.visibleCount,
    workspaceState?.layoutAppearance.paneGap,
  );
  const workspaceShellStyle = useMemo(() => {
    const nextStyle: WorkspaceShellStyle = {
      "--workspace-active-pane-border-color":
        workspaceState?.layoutAppearance.activePaneBorderColor,
      "--workspace-pane-gap": `${String(workspaceShellPaneGapPx)}px`,
    };

    if (workspaceShellPaddingTopPx !== workspaceShellPaneGapPx) {
      nextStyle.paddingTop = `${String(workspaceShellPaddingTopPx)}px`;
    }

    if (visiblePanes.length > 0) {
      nextStyle.gridTemplateColumns = getWorkspaceGridTemplateColumns(
        workspaceState?.viewMode ?? "grid",
        visiblePanes.length,
      );
    }

    return nextStyle;
  }, [
    workspaceState?.layoutAppearance.activePaneBorderColor,
    workspaceState?.viewMode,
    workspaceShellPaneGapPx,
    workspaceShellPaddingTopPx,
    visiblePanes.length,
  ]);
  const hiddenPaneFallbackLayout = useMemo(
    () =>
      visiblePaneLayoutBySessionId.get(workspaceState?.focusedSessionId ?? "") ??
      visiblePaneLayoutBySessionId.get(visiblePanes[0]?.sessionId ?? "") ?? {
        gridColumn: "1",
        gridRow: "1",
      },
    [visiblePaneLayoutBySessionId, visiblePanes, workspaceState?.focusedSessionId],
  );
  const hiddenPaneLayerStyles = useMemo(() => {
    const nextStyles = new Map<string, CSSProperties>();
    for (const pane of orderedPanes) {
      if (pane.isVisible) {
        continue;
      }

      const cachedLayout = lastVisibleLayoutBySessionIdRef.current.get(pane.sessionId);
      const shouldUseCachedLayout =
        activeGroupSessionIdSet.has(pane.sessionId) &&
        cachedLayout?.layoutKey === activeGroupLayoutKey;
      const targetLayout = shouldUseCachedLayout ? cachedLayout : hiddenPaneFallbackLayout;

      nextStyles.set(pane.sessionId, {
        gridColumn: targetLayout.gridColumn,
        gridRow: targetLayout.gridRow,
        pointerEvents: "none",
        visibility: "hidden",
        zIndex: 0,
      });
    }

    return nextStyles;
  }, [activeGroupLayoutKey, activeGroupSessionIdSet, hiddenPaneFallbackLayout, orderedPanes]);
  const getVisiblePaneFallbackLayoutStyle = (pane: WorkspacePanelPane): CSSProperties => {
    const cachedLayout = lastVisibleLayoutBySessionIdRef.current.get(pane.sessionId);
    const shouldUseCachedLayout =
      activeGroupSessionIdSet.has(pane.sessionId) &&
      cachedLayout?.layoutKey === activeGroupLayoutKey;
    const targetLayout = shouldUseCachedLayout
      ? cachedLayout
      : {
          gridColumn: "1 / -1",
          gridRow: "1 / span 1",
        };

    return {
      gridColumn: targetLayout.gridColumn,
      gridRow: targetLayout.gridRow,
    };
  };

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

    postWorkspaceDebugLog(workspaceState.debuggingMode, "workspace.hiddenPaneLayerSummary", {
      activeGroupId: workspaceState.activeGroupId,
      hiddenPanes: orderedPanes.flatMap((pane) => {
        if (pane.kind !== "terminal" || pane.isVisible) {
          return [];
        }

        const layerStyle = hiddenPaneLayerStyles.get(pane.sessionId);
        const cachedLayout = lastVisibleLayoutBySessionIdRef.current.get(pane.sessionId);
        return [
          {
            hiddenMode:
              activeGroupSessionIdSet.has(pane.sessionId) &&
              cachedLayout?.layoutKey === activeGroupLayoutKey
                ? "cached-layout"
                : "overlay-layout",
            lastVisibleLayoutKey: cachedLayout?.layoutKey,
            layerGridColumn:
              typeof layerStyle?.gridColumn === "string" ? layerStyle.gridColumn : undefined,
            layerGridRow: typeof layerStyle?.gridRow === "string" ? layerStyle.gridRow : undefined,
            renderNonce: pane.renderNonce,
            sessionId: pane.sessionId,
          },
        ];
      }),
      activeGroupLayoutKey,
    });
  }, [
    activeGroupLayoutKey,
    activeGroupSessionIdSet,
    hiddenPaneLayerStyles,
    orderedPanes,
    workspaceState,
  ]);

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
    setLocalPaneOrder(undefined);
    setDraggedPaneId(undefined);
    setDropTargetPaneId(undefined);
  }, [workspacePaneIdsKey, workspaceState?.activeGroupId]);

  const requestFocusSession = (sessionId: string) => {
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.requested", {
      sessionId,
    });
    postWorkspaceReproLog("repro.workspace.requestFocusSession", {
      sessionId,
      visiblePaneIds,
    });
    postToExtension({
      sessionId,
      type: "focusSession",
    });
  };

  const armT3TerminalFocusGuard = (sessionId: string, source: "enter" | "focusin" | "pointer") => {
    const nextGuardUntil = performance.now() + T3_TERMINAL_FOCUS_GUARD_MS;
    t3TerminalFocusGuardUntilRef.current = nextGuardUntil;
    setT3TerminalFocusGuardUntil(nextGuardUntil);
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.t3TerminalGuardArmed", {
      durationMs: T3_TERMINAL_FOCUS_GUARD_MS,
      sessionId,
      source,
    });
    postWorkspaceReproLog("repro.workspace.t3TerminalGuardArmed", {
      durationMs: T3_TERMINAL_FOCUS_GUARD_MS,
      sessionId,
      source,
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

  const handleT3IframeFocus = (
    sessionId: string,
    event: MessageEvent<{
      payload?: Record<string, unknown>;
      sessionId?: string;
      type?: string;
    }>,
  ) => {
    const activeWorkspaceState = workspaceStateRef.current;
    const pane = activeWorkspaceState?.panes.find(
      (candidate) => candidate.kind === "t3" && candidate.sessionId === sessionId,
    );
    const isVisible = pane?.isVisible === true;
    const isFocused = presentedFocusedSessionIdRef.current === sessionId;
    const ignoredForAutoFocus = shouldIgnorePaneActivation(sessionId);
    const withinTerminalGuard = performance.now() < t3TerminalFocusGuardUntilRef.current;

    postWorkspaceDebugLog(activeWorkspaceState?.debuggingMode, "focus.t3IframeFocusReceived", {
      eventOrigin: event.origin,
      ignoredForAutoFocus,
      ignoredForTerminalGuard: withinTerminalGuard,
      isFocused,
      isVisible,
      payload: event.data?.payload,
      paneExists: pane !== undefined,
      sessionId,
    });
    postWorkspaceReproLog("repro.workspace.handleT3IframeFocus.received", {
      eventOrigin: event.origin,
      ignoredForAutoFocus,
      isFocused,
      isVisible,
      payload: event.data?.payload,
      sessionId,
      withinTerminalGuard,
    });

    if (!pane) {
      postWorkspaceReproLog("repro.workspace.handleT3IframeFocus.ignored", {
        reason: "missingPane",
        sessionId,
      });
      return;
    }

    if (!pane.isVisible) {
      postWorkspaceDebugLog(activeWorkspaceState?.debuggingMode, "focus.t3IframeFocusIgnored", {
        reason: "hiddenPane",
        sessionId,
      });
      postWorkspaceReproLog("repro.workspace.handleT3IframeFocus.ignored", {
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
      postWorkspaceReproLog("repro.workspace.handleT3IframeFocus.ignored", {
        reason: "autoFocusGuard",
        sessionId,
      });
      return;
    }

    if (isFocused) {
      postWorkspaceDebugLog(activeWorkspaceState?.debuggingMode, "focus.t3IframeFocusIgnored", {
        reason: "alreadyFocused",
        sessionId,
      });
      postWorkspaceReproLog("repro.workspace.handleT3IframeFocus.ignored", {
        reason: "alreadyFocused",
        sessionId,
      });
      return;
    }

    postWorkspaceDebugLog(
      activeWorkspaceState?.debuggingMode,
      "focus.t3IframeFocusActivatesSession",
      {
        sessionId,
        withinTerminalGuard,
      },
    );
    postWorkspaceReproLog("repro.workspace.handleT3IframeFocus.activatesSession", {
      sessionId,
      withinTerminalGuard,
    });
    requestFocusSession(sessionId);
    postFocusComposerToT3Source(event.source, activeWorkspaceState?.debuggingMode, sessionId);
  };
  handleT3IframeFocusRef.current = handleT3IframeFocus;

  const handleTerminalActivate = (sessionId: string, source: WorkspaceTerminalActivationSource) => {
    blurAllCachedT3Runtimes((event, payload) =>
      postWorkspaceDebugLog(workspaceState?.debuggingMode, event, {
        reason: "terminalActivate",
        source,
        ...payload,
      }),
    );
    armT3TerminalFocusGuard(sessionId, source);

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
    const activatedPane = panes.find((pane) => pane.sessionId === sessionId);
    const shouldRefocusNativeTerminal =
      source === "pointer" &&
      isFocused &&
      activatedPane?.kind === "terminal" &&
      activatedPane.sessionRecord.terminalEngine === "ghostty-native";
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.paneActivationReceived", {
      ignored,
      isFocused,
      serverFocusedSessionId: workspaceState?.focusedSessionId,
      sessionId,
      source,
    });
    postWorkspaceDebugLog(true, "focusTrace.workspaceActivation", {
      activeGroupId: workspaceState?.activeGroupId,
      orderedPaneIds: panes.map((pane) => ({
        isVisible: pane.isVisible,
        sessionId: pane.sessionId,
      })),
      presentedFocusedSessionId,
      serverFocusedSessionId: workspaceState?.focusedSessionId,
      sessionId,
      source,
      visiblePaneSlots: visiblePaneIds.map((visibleSessionId, slotIndex) => ({
        isFocused: visibleSessionId === presentedFocusedSessionId,
        sessionId: visibleSessionId,
        slotIndex,
      })),
      workspaceVisibleSessionIds:
        workspaceState?.workspaceSnapshot.groups.find(
          (group) => group.groupId === workspaceState.activeGroupId,
        )?.snapshot.visibleSessionIds ?? [],
    });
    postWorkspaceReproLog("repro.workspace.handleTerminalActivate", {
      ignored,
      isFocused,
      presentedFocusedSessionId,
      serverFocusedSessionId: workspaceState?.focusedSessionId,
      sessionId,
      source,
      visiblePaneIds,
    });
    if (ignored) {
      return;
    }

    if (!isFocused || shouldRefocusNativeTerminal) {
      if (source === "focusin") {
        postWorkspaceDebugLog(
          workspaceState?.debuggingMode,
          "focus.paneActivationIgnoredForFocusIn",
          {
            serverFocusedSessionId: workspaceState?.focusedSessionId,
            sessionId,
            source,
          },
        );
        return;
      }

      postWorkspaceDebugLog(workspaceState?.debuggingMode, "focus.paneActivationRequestsFocus", {
        sessionId,
        shouldRefocusNativeTerminal,
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

  const handleTerminalEnter = (sessionId: string) => {
    blurAllCachedT3Runtimes((event, payload) =>
      postWorkspaceDebugLog(workspaceState?.debuggingMode, event, {
        reason: "terminalEnter",
        source: "enter",
        ...payload,
      }),
    );
    armT3TerminalFocusGuard(sessionId, "enter");
    confirmWorkspaceToastForSession(sessionId);
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

    const lagPane = workspaceStateRef.current?.panes.find(
      (pane) => pane.sessionId === payload.sessionId,
    );
    if (!lagPane || lagPane.kind !== "terminal") {
      postWorkspaceDebugLog(workspaceState?.debuggingMode, "workspace.lagAutoReloadIgnored", {
        kind: lagPane?.kind,
        overshootMs: payload.overshootMs,
        sessionId: payload.sessionId,
        visibilityState: payload.visibilityState,
      });
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

  const handleT3ThreadChanged = (payload: {
    sessionId: string;
    threadId: string;
    title?: string;
  }) => {
    const pane = workspaceState?.panes.find(
      (candidate) => candidate.sessionId === payload.sessionId,
    );
    postWorkspaceDebugLog(
      workspaceState?.debuggingMode,
      "repro.t3ThreadSource.workspacePostToExtension",
      {
        activeGroupId: workspaceState?.activeGroupId,
        focusedSessionId: workspaceState?.focusedSessionId,
        isFocusedPane: workspaceState?.focusedSessionId === payload.sessionId,
        paneKind: pane?.kind,
        paneRenderNonce: pane?.renderNonce,
        paneThreadId: pane?.kind === "t3" ? pane.sessionRecord.t3.threadId : undefined,
        paneVisible: pane?.isVisible,
        sessionId: payload.sessionId,
        threadId: payload.threadId,
        title: payload.title,
        visibilityState: document.visibilityState,
        workspaceHasFocus: document.hasFocus(),
      },
    );
    postWorkspaceDebugLog(workspaceState?.debuggingMode, "workspace.t3ThreadChanged", payload);
    postToExtension({
      sessionId: payload.sessionId,
      threadId: payload.threadId,
      title: payload.title,
      type: "t3ThreadChanged",
    });
  };

  const handleT3WorkingStartedAtChanged = (payload: {
    sessionId: string;
    workingStartedAt?: string;
  }) => {
    postWorkspaceDebugLog(
      workspaceState?.debuggingMode,
      "workspace.t3WorkingStartedAtChanged",
      payload,
    );
    postToExtension({
      sessionId: payload.sessionId,
      type: "t3WorkingStartedAtChanged",
      workingStartedAt: payload.workingStartedAt,
    });
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
        element.dataset.zmuxPortalTargetId ||= `portal-target-${++nextWorkspacePortalTargetId}`;
        targets.set(sessionId, element);
      } else {
        targets.delete(sessionId);
      }
      postWorkspaceDebugLog(debuggingModeRef.current, "workspace.terminalPortalTargetChanged", {
        hadPreviousTarget: previousElement !== null,
        hasNextTarget: element !== null,
        nextTargetId: element?.dataset.zmuxPortalTargetId ?? null,
        previousTargetId: previousElement?.dataset.zmuxPortalTargetId ?? null,
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
    <Tooltip.Provider delay={WORKSPACE_TOOLTIP_DELAY_MS}>
      <main
        className={
          visiblePanes.length === 0 ? "workspace-shell workspace-shell-empty" : "workspace-shell"
        }
        style={workspaceShellStyle}
      >
        {workspaceToast ? (
          <div
            aria-live="polite"
            className={[
              "workspace-toast",
              workspaceToast.phase === "confirmed" || workspaceToast.phase === "fading"
                ? "workspace-toast-confirmed"
                : "",
              workspaceToast.phase === "fading" ? "workspace-toast-fading" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role="status"
          >
            <div className="workspace-toast-copy">
              <strong>{workspaceToast.title}</strong>
              <span>{workspaceToast.message}</span>
            </div>
          </div>
        ) : null}
        {orderedPanes.map((pane) => (
          <WorkspacePaneView
            completionFlashNonce={completionFlashNonceBySessionId[pane.sessionId] ?? 0}
            debugLog={(event, payload) =>
              postWorkspaceDebugLog(workspaceState.debuggingMode, event, payload)
            }
            fallbackLayoutStyle={
              pane.isVisible ? getVisiblePaneFallbackLayoutStyle(pane) : undefined
            }
            isFocused={presentedFocusedSessionId === pane.sessionId}
            isWorkspaceFocused={isWorkspaceFocused}
            key={
              pane.kind === "terminal" ? `${pane.sessionId}:${pane.renderNonce}` : pane.sessionId
            }
            layoutStyle={
              pane.isVisible
                ? visiblePaneLayoutBySessionId.get(pane.sessionId)
                : hiddenPaneLayerStyles.get(pane.sessionId)
            }
            t3FocusSuppressedUntil={t3TerminalFocusGuardUntil}
            onAttentionInteraction={(reason) =>
              requestAcknowledgeSessionAttention(pane.sessionId, reason)
            }
            onBoundsMeasured={(bounds) => recordPaneMeasuredBounds(pane.sessionId, bounds)}
            onTerminalPointerIntent={
              pane.kind === "terminal"
                ? () => {
                    blurAllCachedT3Runtimes((event, payload) =>
                      postWorkspaceDebugLog(workspaceState?.debuggingMode, event, {
                        reason: "terminalPointerIntent",
                        source: "pointer",
                        ...payload,
                      }),
                    );
                    armT3TerminalFocusGuard(pane.sessionId, "pointer");
                    postWorkspaceDebugLog(
                      workspaceState?.debuggingMode,
                      "focus.terminalPointerIntent",
                      {
                        sessionId: pane.sessionId,
                      },
                    );
                  }
                : undefined
            }
            onFocus={() => requestFocusSession(pane.sessionId)}
            onClose={() =>
              postToExtension({
                sessionId: pane.sessionId,
                type: "closeSession",
              })
            }
            onConfirmToastDismissed={dismissWorkspaceToast}
            onConfirmToastShown={showWorkspaceToast}
            onRename={() =>
              postToExtension({
                sessionId: pane.sessionId,
                type: "promptRenameSession",
              })
            }
            onAdjustTerminalFontSize={(delta) =>
              postToExtension({
                delta,
                type: "adjustTerminalFontSize",
              })
            }
            onResetTerminalFontSize={() =>
              postToExtension({
                type: "resetTerminalFontSize",
              })
            }
            onAdjustT3ZoomPercent={(delta) =>
              postToExtension({
                delta,
                type: "adjustT3ZoomPercent",
              })
            }
            onResetT3ZoomPercent={() =>
              postToExtension({
                type: "resetT3ZoomPercent",
              })
            }
            onFork={() =>
              postToExtension({
                sessionId: pane.sessionId,
                type: "forkSession",
              })
            }
            onT3WorkingStartedAtChanged={handleT3WorkingStartedAtChanged}
            onT3ThreadChanged={handleT3ThreadChanged}
            onReload={() => {
              if (pane.kind === "terminal") {
                postToExtension({
                  sessionId: pane.sessionId,
                  type: "fullReloadSession",
                });
                return;
              }

              postWorkspaceDebugLog(workspaceState.debuggingMode, "workspace.t3ReloadRequested", {
                sessionId: pane.sessionId,
              });
              postToExtension({
                sessionId: pane.sessionId,
                type: "reloadT3Session",
              });
            }}
            onToggleSleeping={() =>
              postToExtension({
                sessionId: pane.sessionId,
                sleeping: pane.sessionRecord.isSleeping !== true,
                type: "setSessionSleeping",
              })
            }
            pane={pane}
            registerTerminalPortalTarget={
              pane.kind === "terminal" ? getTerminalPortalTargetRef(pane.sessionId) : undefined
            }
            t3Appearance={workspaceState.t3Appearance}
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
              onAttentionInteraction={(reason) =>
                requestAcknowledgeSessionAttention(pane.sessionId, reason)
              }
              onCancelFirstPromptAutoRename={() =>
                requestCancelFirstPromptAutoRename(pane.sessionId)
              }
              onLagDetected={handleTerminalLagDetected}
              onActivate={(source) => handleTerminalActivate(pane.sessionId, source)}
              onTerminalEnter={() => handleTerminalEnter(pane.sessionId)}
              pane={pane}
              refreshRequestId={0}
              scrollToBottomRequestId={
                terminalScrollRequest?.sessionId === pane.sessionId
                  ? terminalScrollRequest.requestId
                  : undefined
              }
              terminalAppearance={workspaceState.terminalAppearance}
            />,
            target,
            pane.sessionId,
          );
        })}
        {visiblePanes.length === 0 ? (
          <button className="workspace-empty-state" onClick={requestCreateSession} type="button">
            No active zmux sessions in current group
            {"\n"}
            Click here to start one
          </button>
        ) : null}
        {workspaceState?.debuggingMode && workspaceState.buildStamp ? (
          <button
            aria-label={`Copy build stamp ${workspaceState.buildStamp}`}
            className="copy-cursor"
            onClick={() => {
              void navigator.clipboard.writeText(workspaceState.buildStamp ?? "").catch(() => {});
            }}
            style={DEBUG_BUILD_STAMP_STYLE}
            title="Copy build stamp"
            type="button"
          >
            {workspaceState.buildStamp}
          </button>
        ) : null}
        <WorkspaceWelcomeModal
          isOpen={isWelcomeModalOpen}
          mode={welcomeModalMode ?? "optional"}
          codexSettingConfirmation={codexSettingConfirmation}
          onApplyCodexTerminalTitle={() => {
            postToExtension({ type: "applyCodexTerminalTitle" });
          }}
          onApplyCodexStatusLine={() => {
            postToExtension({ type: "applyCodexStatusLine" });
          }}
          onClose={() => setWelcomeModalMode(undefined)}
          onComplete={() => {
            setWelcomeModalMode(undefined);
            postToExtension({ type: "completeWelcome" });
          }}
        />
      </main>
    </Tooltip.Provider>
  );
};

type WorkspacePaneViewProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  completionFlashNonce?: number;
  debugLog: (event: string, payload?: Record<string, unknown>) => void;
  fallbackLayoutStyle?: CSSProperties;
  t3FocusSuppressedUntil: number;
  isFocused: boolean;
  isWorkspaceFocused: boolean;
  canDrag: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  layoutStyle?: CSSProperties;
  onAttentionInteraction: (reason: WorkspacePanelAcknowledgeSessionAttentionReason) => void;
  onFocus: () => void;
  onTerminalPointerIntent?: () => void;
  onClose: () => void;
  onConfirmToastDismissed: (toast: WorkspacePanelShowToastMessage) => void;
  onConfirmToastShown: (toast: WorkspacePanelShowToastMessage) => void;
  onFork: () => void;
  onAdjustTerminalFontSize: (delta: -1 | 1) => void;
  onResetTerminalFontSize: () => void;
  onAdjustT3ZoomPercent: (delta: -1 | 1) => void;
  onResetT3ZoomPercent: () => void;
  onT3WorkingStartedAtChanged: (payload: { sessionId: string; workingStartedAt?: string }) => void;
  onT3ThreadChanged: (payload: { sessionId: string; threadId: string; title?: string }) => void;
  onRename: () => void;
  onReload: () => void;
  onToggleSleeping: () => void;
  onBoundsMeasured: (bounds: WorkspacePaneMeasuredBounds) => void;
  onHeaderPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onHeaderNativeDragStart: (event: ReactDragEvent<HTMLElement>) => void;
  pane: WorkspacePanelPane;
  registerTerminalPortalTarget?: (element: HTMLDivElement | null) => void;
  t3Appearance: WorkspacePanelT3Appearance;
};

const WorkspacePaneView: React.FC<WorkspacePaneViewProps> = ({
  autoFocusRequest,
  completionFlashNonce = 0,
  debugLog,
  fallbackLayoutStyle,
  t3FocusSuppressedUntil,
  isFocused,
  isWorkspaceFocused,
  canDrag,
  isDragging,
  isDropTarget,
  layoutStyle,
  onAttentionInteraction,
  onFocus,
  onTerminalPointerIntent,
  onClose,
  onConfirmToastDismissed,
  onConfirmToastShown,
  onFork,
  onAdjustTerminalFontSize,
  onResetTerminalFontSize,
  onAdjustT3ZoomPercent,
  onResetT3ZoomPercent,
  onT3WorkingStartedAtChanged,
  onT3ThreadChanged,
  onRename,
  onBoundsMeasured,
  onReload,
  onToggleSleeping,
  onHeaderPointerDown,
  onHeaderNativeDragStart,
  pane,
  registerTerminalPortalTarget,
  t3Appearance,
}) => {
  const paneViewInstanceIdRef = useRef(`workspace-pane-view-${++nextWorkspacePaneViewInstanceId}`);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [completionFlashRunId, setCompletionFlashRunId] = useState(0);
  const primaryTitle = getWorkspacePanePrimaryTitle(pane);
  const headerIndicatorState = getWorkspacePaneHeaderIndicatorState(pane);
  const canFork = supportsWorkspacePaneFork(pane);
  const canReload = supportsWorkspacePaneFullReload(pane);
  const showPaneHeaderActions = pane.kind === "terminal" || pane.kind === "t3";
  const showPaneZoomControls = pane.kind === "terminal";
  const showPaneRenameButton = pane.kind === "terminal" || pane.kind === "t3";
  const showPaneRenameDivider = showPaneZoomControls && showPaneRenameButton;
  const showPaneSleepDivider = showPaneRenameButton || canFork || canReload || showPaneZoomControls;

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

  useEffect(() => {
    if (completionFlashNonce <= 0) {
      return;
    }

    setCompletionFlashRunId(completionFlashNonce);
  }, [completionFlashNonce]);

  useEffect(() => {
    if (completionFlashRunId <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCompletionFlashRunId((previous) => (previous === completionFlashRunId ? 0 : previous));
    }, COMPLETION_FLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [completionFlashRunId]);

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
      data-completion-flash={
        completionFlashRunId > 0 ? (completionFlashRunId % 2 === 0 ? "even" : "odd") : undefined
      }
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
        onTerminalPointerIntent?.();
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
        data-lifecycle-state={headerIndicatorState}
        draggable={false}
        onDragStart={canDrag ? onHeaderNativeDragStart : undefined}
        onPointerDownCapture={canDrag ? onHeaderPointerDown : undefined}
      >
        <div className="workspace-pane-title">
          <span className="workspace-pane-title-text">{primaryTitle}</span>
          {headerIndicatorState && headerIndicatorState !== "sleeping" ? (
            <span
              aria-hidden="true"
              className="workspace-pane-title-indicator"
              data-lifecycle-state={headerIndicatorState}
            />
          ) : null}
        </div>
        {showPaneHeaderActions ? (
          <div className="workspace-pane-header-actions">
            {showPaneZoomControls ? (
              <WorkspacePaneFontSizeControls
                onAdjustZoom={
                  pane.kind === "terminal" ? onAdjustTerminalFontSize : onAdjustT3ZoomPercent
                }
                onResetZoom={
                  pane.kind === "terminal" ? onResetTerminalFontSize : onResetT3ZoomPercent
                }
              />
            ) : null}
            {showPaneRenameDivider ? (
              <span aria-hidden="true" className="workspace-pane-action-divider" />
            ) : null}
            {showPaneRenameButton ? <WorkspacePaneRenameButton onRename={onRename} /> : null}
            {canFork ? <WorkspacePaneForkButton onFork={onFork} /> : null}
            {canReload ? <WorkspacePaneRefreshButton onRefresh={onReload} /> : null}
            {showPaneSleepDivider ? (
              <span aria-hidden="true" className="workspace-pane-action-divider" />
            ) : null}
            <WorkspacePaneSleepButton
              isSleeping={pane.sessionRecord.isSleeping === true}
              onToggleSleeping={onToggleSleeping}
            />
            <WorkspacePaneCloseButton
              onConfirmClose={onClose}
              onConfirmToastDismissed={onConfirmToastDismissed}
              onConfirmToastShown={onConfirmToastShown}
              sessionLabel={primaryTitle}
            />
          </div>
        ) : null}
      </header>
      <div className="workspace-pane-body">
        {pane.kind === "terminal" ? (
          <div
            className="workspace-terminal-portal-target"
            ref={registerTerminalPortalTarget}
            data-zmux-pane-view-id={paneViewInstanceIdRef.current}
            style={{ height: "100%", width: "100%" }}
          />
        ) : (
          <T3Pane
            autoFocusRequest={autoFocusRequest}
            debugLog={debugLog}
            focusSuppressedUntil={t3FocusSuppressedUntil}
            isFocused={isFocused}
            onAttentionInteraction={onAttentionInteraction}
            onFocus={onFocus}
            onWorkingStartedAtChanged={onT3WorkingStartedAtChanged}
            onThreadChanged={onT3ThreadChanged}
            pane={pane}
            zoomPercent={t3Appearance.zoomPercent}
          />
        )}
      </div>
    </section>
  );
};

export function getWorkspacePanePrimaryTitle(pane: WorkspacePanelPane): string {
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
function supportsWorkspacePaneFork(pane: WorkspacePanelPane): boolean {
  if (pane.kind !== "terminal") {
    return false;
  }

  const agentIcon = getSidebarAgentIconById(pane.snapshot?.agentName);
  return agentIcon === "codex" || agentIcon === "claude";
}

function supportsWorkspacePaneFullReload(pane: WorkspacePanelPane): boolean {
  if (pane.kind === "t3") {
    return true;
  }
  if (pane.kind !== "terminal") {
    return false;
  }

  const agentIcon = getSidebarAgentIconById(pane.snapshot?.agentName);
  return agentIcon === "codex" || agentIcon === "claude" || agentIcon === "opencode";
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

function postFocusComposerToT3Source(
  source: MessageEventSource | null,
  debuggingMode: boolean | undefined,
  sessionId: string,
): void {
  if (!source || typeof source !== "object" || !("postMessage" in source)) {
    return;
  }

  window.requestAnimationFrame(() => {
    void debuggingMode;
    void sessionId;
    (source as Window).postMessage({ type: "focusComposer" }, "*");
  });
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

function isWtermDebugEvent(event: string): boolean {
  return event.startsWith("workspace.terminal");
}

function isAlwaysOnWorkspaceReproEvent(event: string): boolean {
  return (
    event.startsWith("workspace.lifecycle.") ||
    event.startsWith("workspace.terminal.resize.") ||
    event.startsWith("workspace.terminal.runtimeDestroy")
  );
}
