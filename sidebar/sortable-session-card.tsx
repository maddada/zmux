import {
  IconCopy,
  IconGitFork,
  IconMessageCircle,
  IconMoon,
  IconPencil,
  IconPlayerPlay,
  IconRefresh,
  IconSparkles,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { createPortal } from "react-dom";
import {
  Fragment,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  getSidebarSessionLifecycleState,
  type SidebarSessionItem,
} from "../shared/session-grid-contract";
import {
  getSessionCardTitleTooltip,
  OverflowTooltipText,
  SessionCardContent,
  SessionFloatingAgentIcon,
} from "./session-card-content";
import { getSessionStatusAnchorName } from "./session-status-anchor";
import {
  createSessionDragData,
  createSessionDropTargetData,
  createSessionDropTargetId,
} from "./sidebar-dnd";
import { openAppModal } from "./app-modal-host-bridge";
import { useSidebarStore } from "./sidebar-store";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 156;
const CONTEXT_MENU_ITEM_HEIGHT_PX = 34;
const CONTEXT_MENU_DIVIDER_HEIGHT_PX = 13;
const CONTEXT_MENU_VERTICAL_PADDING_PX = 12;
const SESSION_CARD_DRAG_HOLD_DELAY_MS = 130;
const SESSION_CARD_DRAG_HOLD_TOLERANCE_PX = 12;
const TOUCH_SESSION_CARD_DRAG_HOLD_DELAY_MS = 130;
const TOUCH_SESSION_CARD_DRAG_HOLD_TOLERANCE_PX = 12;
const COMPLETION_FLASH_DURATION_MS = 3_000;

const sessionCardSensors = [
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === "touch") {
        return [
          new PointerActivationConstraints.Delay({
            tolerance: TOUCH_SESSION_CARD_DRAG_HOLD_TOLERANCE_PX,
            value: TOUCH_SESSION_CARD_DRAG_HOLD_DELAY_MS,
          }),
        ];
      }

      return [
        new PointerActivationConstraints.Delay({
          tolerance: SESSION_CARD_DRAG_HOLD_TOLERANCE_PX,
          value: SESSION_CARD_DRAG_HOLD_DELAY_MS,
        }),
      ];
    },
  }),
  KeyboardSensor,
];

type ContextMenuPosition = {
  x: number;
  y: number;
};

type SessionContextMenuAction = {
  danger?: boolean;
  icon: ReactNode;
  key: string;
  label: string;
  onClick: () => void;
};

export type SortableSessionCardProps = {
  completionFlashNonce?: number;
  dragDisabled?: boolean;
  groupId: string;
  index: number;
  isSearchSelected?: boolean;
  onFocusRequested?: (groupId: string, sessionId: string) => void;
  sessionId: string;
  showGroupConnector?: boolean;
  showDropPositionIndicator?: boolean;
  vscode: WebviewApi;
};

function clampContextMenuPosition(
  clientX: number,
  clientY: number,
  itemCount: number,
  dividerCount: number,
): ContextMenuPosition {
  const menuHeight =
    CONTEXT_MENU_VERTICAL_PADDING_PX +
    itemCount * CONTEXT_MENU_ITEM_HEIGHT_PX +
    dividerCount * CONTEXT_MENU_DIVIDER_HEIGHT_PX;
  return {
    x: Math.max(
      CONTEXT_MENU_MARGIN_PX,
      Math.min(clientX, window.innerWidth - CONTEXT_MENU_WIDTH_PX - CONTEXT_MENU_MARGIN_PX),
    ),
    y: Math.max(
      CONTEXT_MENU_MARGIN_PX,
      Math.min(clientY, window.innerHeight - menuHeight - CONTEXT_MENU_MARGIN_PX),
    ),
  };
}

export function SortableSessionCard({
  completionFlashNonce = 0,
  dragDisabled = false,
  groupId,
  index,
  isSearchSelected = false,
  onFocusRequested,
  sessionId,
  showGroupConnector = false,
  showDropPositionIndicator = true,
  vscode,
}: SortableSessionCardProps) {
  const session = useSidebarStore((state) => state.sessionsById[sessionId]);
  const {
    renameSessionOnDoubleClick,
    showCloseButton,
    showDebugSessionNumbers,
    showHotkeys,
    showLastInteractionTime,
  } = useSidebarStore(
    useShallow((state) => ({
      renameSessionOnDoubleClick: state.hud.renameSessionOnDoubleClick,
      showCloseButton: state.hud.showCloseButtonOnSessionCards,
      showDebugSessionNumbers: state.hud.debuggingMode,
      showHotkeys: state.hud.showHotkeysOnSessionCards,
      showLastInteractionTime: state.hud.showLastInteractionTimeOnSessionCards,
    })),
  );
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>();
  const [completionFlashRunId, setCompletionFlashRunId] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const aliasHeadingRef = useRef<HTMLDivElement>(null);
  const debugInstanceIdRef = useRef(createSidebarDebugInstanceId());
  const lastAgentIconRenderDebugKeyRef = useRef<string | undefined>(undefined);
  const isBrowserSession = session?.sessionKind === "browser" || session?.kind === "browser";
  const isT3Session = session?.sessionKind === "t3";
  const canFavoriteSession = !isBrowserSession;
  const canForkSession = session ? !isBrowserSession && supportsFork(session) : false;
  const canCopyResumeCommand = session
    ? !isBrowserSession && supportsResumeCommandCopy(session)
    : false;
  const canFullReloadSession = session ? !isBrowserSession && supportsFullReload(session) : false;
  const canGenerateSessionName = session
    ? !isBrowserSession && supportsGeneratedName(session)
    : false;
  const canSleepSession = session ? !isBrowserSession : false;
  const postSessionDragDebugLog = useEffectEvent(
    (event: string, details: Record<string, unknown>) => {
      if (!showDebugSessionNumbers) {
        return;
      }

      vscode.postMessage({
        details: {
          debugInstanceId: debugInstanceIdRef.current,
          groupId,
          index,
          sessionId,
          ...details,
        },
        event,
        type: "sidebarDebugLog",
      });
    },
  );
  const sortable = useSortable({
    accept: "session",
    data: createSessionDragData(groupId, session.sessionId),
    disabled: dragDisabled || isBrowserSession || contextMenuPosition !== undefined,
    feedback: "clone",
    group: groupId,
    id: sessionId,
    index,
    plugins: [SortableKeyboardPlugin],
    sensors: sessionCardSensors,
    type: "session",
  });
  const isSessionReorderDisabled =
    !session || dragDisabled || isBrowserSession || contextMenuPosition !== undefined;
  const beforeDropTarget = useDroppable({
    accept: "session",
    data: createSessionDropTargetData({
      groupId,
      kind: "session",
      position: "before",
      sessionId,
    }),
    disabled: isSessionReorderDisabled,
    id: createSessionDropTargetId({
      groupId,
      kind: "session",
      position: "before",
      sessionId,
    }),
  });
  const afterDropTarget = useDroppable({
    accept: "session",
    data: createSessionDropTargetData({
      groupId,
      kind: "session",
      position: "after",
      sessionId,
    }),
    disabled: isSessionReorderDisabled,
    id: createSessionDropTargetId({
      groupId,
      kind: "session",
      position: "after",
      sessionId,
    }),
  });
  const dropPosition = sortable.isDragging
    ? undefined
    : beforeDropTarget.isDropTarget
      ? "before"
      : afterDropTarget.isDropTarget
        ? "after"
        : undefined;
  const visibleDropPosition = showDropPositionIndicator ? dropPosition : undefined;
  const isVisibleDropTarget = showDropPositionIndicator && Boolean(sortable.isDropTarget);

  if (!session) {
    return null;
  }

  const sessionTitleTooltip = getSessionCardTitleTooltip({
    session,
    showDebugSessionNumbers,
  });
  const lifecycleState = getSidebarSessionLifecycleState(session);
  const sessionAnchorStyle = {
    anchorName: getSessionStatusAnchorName(sessionId),
  } as CSSProperties;

  useEffect(() => {
    setContextMenuPosition(undefined);
  }, [session.alias, session.sessionId]);

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

  useEffect(() => {
    postSessionDragDebugLog("session.cardMounted", {
      dropPosition,
      isBrowserSession,
    });

    return () => {
      postSessionDragDebugLog("session.cardUnmounted", {
        dropPosition,
        isBrowserSession,
      });
    };
  }, [isBrowserSession, postSessionDragDebugLog]);

  useEffect(() => {
    postSessionDragDebugLog("session.dropPositionChanged", {
      dropPosition,
      isDragging: sortable.isDragging,
      isDropTarget: sortable.isDropTarget,
    });
  }, [dropPosition, postSessionDragDebugLog, sortable.isDragging, sortable.isDropTarget]);

  useEffect(() => {
    if (!session.agentIcon && session.isReloading !== true) {
      return;
    }

    const hasLastInteractionLabel = Boolean(session.lastInteractionAt);
    const showHeaderLoadingSpinner =
      session.isReloading === true || session.isGeneratingFirstPromptTitle === true;
    const hasHeaderAgentIcon = Boolean(session.agentIcon) || showHeaderLoadingSpinner;
    const defaultTrailingDisplay =
      !showLastInteractionTime && hasHeaderAgentIcon
        ? "icon"
        : hasLastInteractionLabel
          ? "time"
          : "icon";
    const shouldKeepLoadingIconVisible = showHeaderLoadingSpinner && hasHeaderAgentIcon;
    const hoverTrailingDisplay = shouldKeepLoadingIconVisible
      ? "icon"
      : defaultTrailingDisplay === "icon"
        ? hasLastInteractionLabel
          ? "time"
          : "icon"
        : hasHeaderAgentIcon
          ? "icon"
          : "time";
    const debugKey = JSON.stringify({
      agentIcon: session.agentIcon,
      defaultTrailingDisplay,
      hasHeaderAgentIcon,
      hasLastInteractionLabel,
      hoverTrailingDisplay,
      isGeneratingFirstPromptTitle: session.isGeneratingFirstPromptTitle === true,
      isReloading: session.isReloading === true,
      primaryTitle: session.primaryTitle,
      sessionId: session.sessionId,
      showLastInteractionTime,
      terminalTitle: session.terminalTitle,
    });
    if (lastAgentIconRenderDebugKeyRef.current === debugKey) {
      return;
    }
    lastAgentIconRenderDebugKeyRef.current = debugKey;

    /*
     * CDXC:AgentDetection 2026-04-27-07:43
     * Agent identity is confirmed at the native/webview/store boundary. Log
     * the card render decision and actual DOM state so missing sidebar icons
     * can be traced without guessing at CSS or projection state.
     */
    postSidebarAgentIconRenderDebugLog(vscode, "sidebar.agentIcon.cardRenderState", {
      agentIcon: session.agentIcon,
      defaultTrailingDisplay,
      groupId,
      hasHeaderAgentIcon,
      hasLastInteractionLabel,
      hoverTrailingDisplay,
      isGeneratingFirstPromptTitle: session.isGeneratingFirstPromptTitle === true,
      isReloading: session.isReloading === true,
      primaryTitle: session.primaryTitle,
      sessionActivity: session.activity,
      sessionId: session.sessionId,
      sessionKind: session.sessionKind,
      showLastInteractionTime,
      terminalTitle: session.terminalTitle,
    });

    const animationFrame = window.requestAnimationFrame(() => {
      const card = findSessionCardElement(session.sessionId);
      const frame = card?.closest<HTMLElement>(".session-frame");
      const trailing = card?.querySelector<HTMLElement>(".session-head-trailing");
      const headerIcon = card?.querySelector<HTMLElement>(
        ".session-header-agent-icon, .session-header-agent-tabler-icon, .session-header-reloading-icon",
      );
      const floatingIcon = frame?.querySelector<HTMLElement>(
        ".session-floating-agent-icon, .session-floating-agent-tabler-icon, .session-floating-reloading-icon",
      );

      postSidebarAgentIconRenderDebugLog(vscode, "sidebar.agentIcon.cardDomState", {
        agentIcon: session.agentIcon,
        card: summarizeAgentIconElement(card),
        defaultTrailingDisplay,
        floatingIcon: summarizeAgentIconElement(floatingIcon),
        frame: summarizeAgentIconElement(frame),
        groupId,
        hasCardElement: Boolean(card),
        hasFloatingIconElement: Boolean(floatingIcon),
        hasHeaderIconElement: Boolean(headerIcon),
        headerIcon: summarizeAgentIconElement(headerIcon),
        hoverTrailingDisplay,
        sessionId: session.sessionId,
        trailing: summarizeAgentIconElement(trailing),
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [
    groupId,
    session.activity,
    session.agentIcon,
    session.isGeneratingFirstPromptTitle,
    session.isReloading,
    session.lastInteractionAt,
    session.primaryTitle,
    session.sessionId,
    session.sessionKind,
    session.terminalTitle,
    showLastInteractionTime,
    vscode,
  ]);

  useEffect(() => {
    if (!contextMenuPosition) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenuPosition(undefined);
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenuPosition(undefined);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenuPosition(undefined);
      }
    };
    const handleBlur = () => {
      setContextMenuPosition(undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setContextMenuPosition(undefined);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [contextMenuPosition]);

  const openContextMenu = (clientX: number, clientY: number) => {
    setContextMenuPosition(
      clampContextMenuPosition(clientX, clientY, contextMenuItemCount, contextMenuDividerCount),
    );
  };

  const requestRename = () => {
    if (isBrowserSession) {
      return;
    }

    setContextMenuPosition(undefined);
    /**
     * CDXC:AppModals 2026-04-27-14:25
     * Rename must always use the full-window modal host. Missing host is an
     * error, not a reason to show the old squeezed sidebar dialog.
     */
    openAppModal({
      initialTitle: getSessionRenameInitialTitle(session),
      modal: "renameSession",
      sessionId: session.sessionId,
      type: "open",
    });
  };

  const requestClose = (
    source: "context-menu" | "middle-click" | "meta-click" | "programmatic",
  ) => {
    if (isT3Session && showDebugSessionNumbers) {
      vscode.postMessage({
        details: {
          activity: session.activity,
          groupId,
          isFocused: session.isFocused,
          isRunning: session.isRunning,
          isVisible: session.isVisible,
          requestedAt: Date.now(),
          sessionId: session.sessionId,
          source,
          title: session.primaryTitle,
        },
        event: "repro.t3CloseSession.requested",
        type: "sidebarDebugLog",
      });
    }

    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "closeSession",
    });
  };

  const requestCopyResumeCommand = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "copyResumeCommand",
    });
  };

  const requestForkSession = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "forkSession",
    });
  };

  const requestGenerateSessionName = () => {
    setContextMenuPosition(undefined);
    /**
     * CDXC:SessionNaming 2026-04-30-02:20
     * The Generate Name click needs a sidebar-origin log before posting the
     * command so failures can be separated into UI, bridge, and controller
     * stages.
     */
    vscode.postMessage({
      details: {
        agentIcon: session.agentIcon,
        hasFirstUserMessage: Boolean(session.firstUserMessage?.trim()),
        isGeneratingFirstPromptTitle: session.isGeneratingFirstPromptTitle === true,
        primaryTitle: session.primaryTitle,
        sessionId: session.sessionId,
        terminalTitle: session.terminalTitle,
      },
      event: "session.generateName.clicked",
      type: "sidebarDebugLog",
    });
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "generateSessionName",
    });
  };

  const requestFullReloadSession = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "fullReloadSession",
    });
  };

  const requestViewFirstUserMessage = () => {
    const message = session.firstUserMessage?.trim();
    if (!message) {
      return;
    }

    setContextMenuPosition(undefined);
    openAppModal({
      message,
      modal: "firstUserMessage",
      title: getSessionRenameInitialTitle(session),
      type: "open",
    });
  };

  const requestSetSleeping = (sleeping: boolean) => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      sleeping,
      type: "setSessionSleeping",
    });
  };

  const requestSetFavorite = (favorite: boolean) => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      favorite,
      sessionId: session.sessionId,
      type: "setSessionFavorite",
    });
  };

  const primaryActions: SessionContextMenuAction[] = [];
  if (!isBrowserSession) {
    primaryActions.push({
      icon: (
        <IconPencil
          aria-hidden="true"
          className="session-context-menu-icon"
          size={16}
          stroke={1.8}
        />
      ),
      key: "rename",
      label: "Rename",
      onClick: requestRename,
    });
  }
  if (canFavoriteSession) {
    primaryActions.push({
      icon: (
        <IconStar aria-hidden="true" className="session-context-menu-icon" size={16} stroke={1.8} />
      ),
      key: "favorite",
      label: session.isFavorite ? "Unfavorite" : "Favorite",
      onClick: () => requestSetFavorite(!session.isFavorite),
    });
  }
  if (canSleepSession) {
    primaryActions.push({
      icon: session.isSleeping ? (
        <IconPlayerPlay
          aria-hidden="true"
          className="session-context-menu-icon"
          size={16}
          stroke={1.8}
        />
      ) : (
        <IconMoon aria-hidden="true" className="session-context-menu-icon" size={16} stroke={1.8} />
      ),
      key: "sleep",
      label: session.isSleeping ? "Wake" : "Sleep",
      onClick: () => requestSetSleeping(!session.isSleeping),
    });
  }

  const sessionActions: SessionContextMenuAction[] = [];
  if (session.firstUserMessage?.trim()) {
    sessionActions.push({
      icon: (
        <IconMessageCircle
          aria-hidden="true"
          className="session-context-menu-icon"
          size={16}
          stroke={1.8}
        />
      ),
      key: "view-first-message",
      label: "View 1st message",
      onClick: requestViewFirstUserMessage,
    });
  }
  /**
   * CDXC:SidebarSessions 2026-04-28-05:48
   * Remote Access is intentionally hidden from T3 session overflow menus while
   * the underlying browser-access handler remains available to non-UI callers.
   */
  if (canCopyResumeCommand) {
    sessionActions.push({
      icon: (
        <IconCopy aria-hidden="true" className="session-context-menu-icon" size={16} stroke={1.8} />
      ),
      key: "copy-resume",
      label: "Copy resume",
      onClick: requestCopyResumeCommand,
    });
  }
  if (canForkSession) {
    sessionActions.push({
      icon: (
        <IconGitFork
          aria-hidden="true"
          className="session-context-menu-icon"
          size={16}
          stroke={1.8}
        />
      ),
      key: "fork",
      label: "Fork",
      onClick: requestForkSession,
    });
  }
  if (canGenerateSessionName) {
    /**
     * CDXC:SessionNaming 2026-04-30-01:50
     * Claude and Codex thread cards need a direct "Generate Name" action in
     * the context menu. The backend owns the agent-specific behavior so the
     * sidebar only exposes the command for supported agent identities.
     */
    sessionActions.push({
      icon: (
        <IconSparkles
          aria-hidden="true"
          className="session-context-menu-icon"
          size={16}
          stroke={1.8}
        />
      ),
      key: "generate-name",
      label: "Generate Name",
      onClick: requestGenerateSessionName,
    });
  }
  if (canFullReloadSession) {
    sessionActions.push({
      icon: (
        <IconRefresh
          aria-hidden="true"
          className="session-context-menu-icon"
          size={16}
          stroke={1.8}
        />
      ),
      key: "full-reload",
      label: "Full reload",
      onClick: requestFullReloadSession,
    });
  }

  const destructiveActions: SessionContextMenuAction[] = [
    {
      danger: true,
      icon: (
        <IconX aria-hidden="true" className="session-context-menu-icon" size={16} stroke={1.8} />
      ),
      key: "terminate",
      label: isBrowserSession ? "Close" : "Terminate",
      onClick: () => requestClose("context-menu"),
    },
  ];
  const contextMenuSections = [primaryActions, sessionActions, destructiveActions].filter(
    (section) => section.length > 0,
  );
  const contextMenuItemCount = contextMenuSections.reduce(
    (count, section) => count + section.length,
    0,
  );
  const contextMenuDividerCount = Math.max(0, contextMenuSections.length - 1);

  const requestFocusSession = () => {
    const shouldAcknowledgeAttention = session.activity === "attention";
    vscode.postMessage({
      details: {
        activity: session.activity,
        groupId,
        isFocused: session.isFocused,
        isSleeping: session.isSleeping,
        isVisible: session.isVisible,
        requestedAt: Date.now(),
        sessionId: session.sessionId,
      },
      event: "repro.sidebarSessionFocusRequested",
      type: "sidebarDebugLog",
    });
    if (!session.isFocused) {
      onFocusRequested?.(groupId, session.sessionId);
    }
    vscode.postMessage({ sessionId: session.sessionId, type: "focusSession" });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      openContextMenu(bounds.left + 24, bounds.top + 18);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    requestFocusSession();
  };

  return (
    <>
      <OverflowTooltipText
        text={sessionTitleTooltip.headingText}
        textRef={aliasHeadingRef}
        tooltip={sessionTitleTooltip.tooltip}
        tooltipWhen={sessionTitleTooltip.tooltipWhen}
      >
        <div
          className="session-frame"
          data-activity={session.activity}
          data-dragging={String(Boolean(sortable.isDragging))}
          data-drop-position={visibleDropPosition}
          data-drop-target={String(isVisibleDropTarget)}
          data-focused={String(session.isFocused)}
          data-group-connector={String(showGroupConnector)}
          data-has-agent-icon={String(Boolean(session.agentIcon) || session.isReloading === true)}
          data-lifecycle-state={lifecycleState}
          data-running={String(lifecycleState === "running")}
          data-sleeping={String(Boolean(session.isSleeping))}
          data-visible={String(session.isVisible)}
          ref={sortable.ref}
        >
          <div
            aria-hidden
            className="session-drop-target-surface session-drop-target-surface-before"
            ref={beforeDropTarget.ref}
          />
          <div
            aria-hidden
            className="session-drop-target-surface session-drop-target-surface-after"
            ref={afterDropTarget.ref}
          />
          <SessionFloatingAgentIcon
            agentIcon={session.agentIcon}
            isFavorite={session.isFavorite}
            isReloading={session.isReloading}
          />
          <article
            aria-expanded={contextMenuPosition ? true : undefined}
            aria-haspopup="menu"
            aria-pressed={session.isFocused}
            className="session"
            data-activity={session.activity}
            data-completion-flash={
              completionFlashRunId > 0
                ? completionFlashRunId % 2 === 0
                  ? "even"
                  : "odd"
                : undefined
            }
            data-has-agent-icon={String(Boolean(session.agentIcon) || session.isReloading === true)}
            data-dragging={String(Boolean(sortable.isDragging))}
            data-drop-position={visibleDropPosition}
            data-drop-target={String(isVisibleDropTarget)}
            data-focused={String(session.isFocused)}
            data-group-connector={String(showGroupConnector)}
            data-lifecycle-state={lifecycleState}
            data-running={String(lifecycleState === "running")}
            data-search-selected={String(isSearchSelected)}
            data-sleeping={String(Boolean(session.isSleeping))}
            data-sidebar-session-id={session.sessionId}
            data-visible={String(session.isVisible)}
            onPointerCancel={(event) => {
              postSessionDragDebugLog("session.pointerCancel", {
                button: event.button,
                buttons: event.buttons,
                clientX: event.clientX,
                clientY: event.clientY,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
              });
            }}
            onPointerDown={(event) => {
              postSessionDragDebugLog("session.pointerDown", {
                button: event.button,
                buttons: event.buttons,
                clientX: event.clientX,
                clientY: event.clientY,
                isDragging: sortable.isDragging,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
              });
            }}
            onPointerUp={(event) => {
              postSessionDragDebugLog("session.pointerUp", {
                button: event.button,
                buttons: event.buttons,
                clientX: event.clientX,
                clientY: event.clientY,
                isDragging: sortable.isDragging,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
              });
            }}
            onAuxClick={(event) => {
              if (event.button !== 1) {
                return;
              }

              event.preventDefault();
              requestClose("middle-click");
            }}
            onClick={(event) => {
              event.stopPropagation();

              if (event.metaKey) {
                event.preventDefault();
                requestClose("meta-click");
                return;
              }

              requestFocusSession();
            }}
            onDoubleClick={(event) => {
              if (isBrowserSession || !renameSessionOnDoubleClick) {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              requestRename();
            }}
            onContextMenu={(event: ReactMouseEvent<HTMLElement>) => {
              event.preventDefault();
              event.stopPropagation();
              openContextMenu(event.clientX, event.clientY);
            }}
            onKeyDown={handleKeyDown}
            ref={sortable.sourceRef}
            role="button"
            style={sessionAnchorStyle}
            tabIndex={0}
          >
            <SessionCardContent
              aliasHeadingRef={aliasHeadingRef}
              onClose={() => requestClose("programmatic")}
              session={session}
              showDebugSessionNumbers={showDebugSessionNumbers}
              showCloseButton={showCloseButton}
              showHotkeys={showHotkeys}
              showLastInteractionTime={showLastInteractionTime}
            />
          </article>
          <div aria-hidden className="session-status-dot session-status-dot-inline" />
        </div>
      </OverflowTooltipText>
      {contextMenuPosition
        ? createPortal(
            <div
              className="session-context-menu"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              ref={menuRef}
              role="menu"
              style={{
                left: `${contextMenuPosition.x}px`,
                top: `${contextMenuPosition.y}px`,
              }}
            >
              {contextMenuSections.map((section, sectionIndex) => (
                <Fragment key={`section-${sectionIndex}`}>
                  {sectionIndex > 0 ? (
                    <div className="session-context-menu-divider" role="separator" />
                  ) : null}
                  <div className="session-context-menu-section">
                    {section.map((action) => (
                      <button
                        key={action.key}
                        className={`session-context-menu-item${action.danger ? " session-context-menu-item-danger" : ""}`}
                        onClick={action.onClick}
                        role="menuitem"
                        type="button"
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </Fragment>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function getSessionRenameInitialTitle(session: SidebarSessionItem): string {
  return session.primaryTitle?.trim() || session.terminalTitle?.trim() || session.alias;
}

function supportsResumeCommandCopy(session: SidebarSessionItem): boolean {
  /**
   * CDXC:SessionRestore 2026-04-27-08:04
   * Match agent-tiler context-menu visibility: Copy resume is only shown for
   * built-in agents with known resume or resume-selection CLI behavior.
   */
  return (
    session.agentIcon === "codex" ||
    session.agentIcon === "claude" ||
    session.agentIcon === "copilot" ||
    session.agentIcon === "gemini" ||
    session.agentIcon === "opencode"
  );
}

function supportsFork(session: SidebarSessionItem): boolean {
  return session.agentIcon === "codex" || session.agentIcon === "claude";
}

function supportsGeneratedName(session: SidebarSessionItem): boolean {
  return session.agentIcon === "codex" || session.agentIcon === "claude";
}

function supportsFullReload(session: SidebarSessionItem): boolean {
  /**
   * CDXC:SessionRestore 2026-04-27-08:04
   * Match agent-tiler context-menu visibility: Full reload is only shown for
   * agent sessions that can be recreated and resumed programmatically.
   */
  return (
    session.agentIcon === "codex" ||
    session.agentIcon === "claude" ||
    session.agentIcon === "opencode"
  );
}

function postSidebarAgentIconRenderDebugLog(
  vscode: WebviewApi,
  event: string,
  details: Record<string, unknown>,
): void {
  vscode.postMessage({
    details,
    event,
    type: "sidebarDebugLog",
  });
}

function findSessionCardElement(sessionId: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-sidebar-session-id]")).find(
    (element) => element.dataset.sidebarSessionId === sessionId,
  );
}

function summarizeAgentIconElement(element: HTMLElement | null | undefined) {
  if (!element) {
    return undefined;
  }

  const styles = window.getComputedStyle(element);
  const bounds = element.getBoundingClientRect();
  return {
    className:
      typeof element.className === "string"
        ? element.className
        : String(element.getAttribute("class") ?? ""),
    dataDefaultTrailingDisplay: element.dataset.defaultTrailingDisplay,
    dataHasAgentIcon: element.dataset.hasAgentIcon,
    dataHoverTrailingDisplay: element.dataset.hoverTrailingDisplay,
    display: styles.display,
    height: Math.round(bounds.height * 100) / 100,
    opacity: styles.opacity,
    visibility: styles.visibility,
    width: Math.round(bounds.width * 100) / 100,
  };
}

let sidebarDebugInstanceCounter = 0;

function createSidebarDebugInstanceId(): number {
  sidebarDebugInstanceCounter += 1;
  return sidebarDebugInstanceCounter;
}
