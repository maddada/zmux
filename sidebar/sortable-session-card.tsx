import { IconCopy, IconPencil, IconX } from "@tabler/icons-react";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { useSortable } from "@dnd-kit/react/sortable";
import { createPortal } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import type { SidebarSessionItem } from "../shared/session-grid-contract";
import { SessionCardContent, SessionFloatingAgentIcon } from "./session-card-content";
import { createSessionDragData } from "./sidebar-dnd";
import { useSidebarStore } from "./sidebar-store";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 156;
const CONTEXT_MENU_ITEM_HEIGHT_PX = 34;
const CONTEXT_MENU_VERTICAL_PADDING_PX = 12;
const SESSION_CARD_DRAG_HOLD_DELAY_MS = 160;
const SESSION_CARD_DRAG_HOLD_TOLERANCE_PX = 8;
const TOUCH_SESSION_CARD_DRAG_HOLD_DELAY_MS = 160;
const TOUCH_SESSION_CARD_DRAG_HOLD_TOLERANCE_PX = 5;

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

export type SortableSessionCardProps = {
  dropPosition?: "after" | "before";
  groupId: string;
  index: number;
  onFocusRequested?: (groupId: string, sessionId: string) => void;
  sessionId: string;
  vscode: WebviewApi;
};

function clampContextMenuPosition(
  clientX: number,
  clientY: number,
  itemCount: number,
): ContextMenuPosition {
  const menuHeight = CONTEXT_MENU_VERTICAL_PADDING_PX + itemCount * CONTEXT_MENU_ITEM_HEIGHT_PX;
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
  dropPosition,
  groupId,
  index,
  onFocusRequested,
  sessionId,
  vscode,
}: SortableSessionCardProps) {
  const session = useSidebarStore((state) => state.sessionsById[sessionId]);
  const { showCloseButton, showDebugSessionNumbers, showHotkeys } = useSidebarStore(
    useShallow((state) => ({
      showCloseButton: state.hud.showCloseButtonOnSessionCards,
      showDebugSessionNumbers: state.hud.debuggingMode,
      showHotkeys: state.hud.showHotkeysOnSessionCards,
    })),
  );
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>();
  const menuRef = useRef<HTMLDivElement>(null);
  const aliasHeadingRef = useRef<HTMLDivElement>(null);
  const isBrowserSession = session?.kind === "browser";
  const canCopyResumeCommand = session ? !isBrowserSession && supportsResumeCommandCopy(session) : false;
  const postSessionDragDebugLog = (event: string, details: Record<string, unknown>) => {
    if (!showDebugSessionNumbers) {
      return;
    }

    vscode.postMessage({
      details: {
        groupId,
        index,
        sessionId,
        ...details,
      },
      event,
      type: "sidebarDebugLog",
    });
  };
  const sortable = useSortable({
    accept: "session",
    data: createSessionDragData(groupId, session.sessionId),
    disabled: isBrowserSession || contextMenuPosition !== undefined,
    feedback: "clone",
    group: groupId,
    id: sessionId,
    index,
    plugins: [SortableKeyboardPlugin],
    sensors: sessionCardSensors,
    type: "session",
  });

  if (!session) {
    return null;
  }

  useEffect(() => {
    setContextMenuPosition(undefined);
  }, [session.alias, session.sessionId]);

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
      clampContextMenuPosition(
        clientX,
        clientY,
        isBrowserSession ? 1 : canCopyResumeCommand ? 3 : 2,
      ),
    );
  };

  const requestRename = () => {
    if (isBrowserSession) {
      return;
    }

    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "promptRenameSession",
    });
  };

  const requestClose = () => {
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

  const requestFocusSession = () => {
    const shouldAcknowledgeAttention = session.activity === "attention";
    if (session.isFocused && !shouldAcknowledgeAttention) {
      return;
    }

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
      <div
        className="session-frame"
        data-activity={session.activity}
        data-dragging={String(Boolean(sortable.isDragging))}
        data-drop-position={dropPosition}
        data-drop-target={String(Boolean(sortable.isDropTarget))}
        data-focused={String(session.isFocused)}
        data-running={String(session.isRunning)}
        data-visible={String(session.isVisible)}
        ref={sortable.ref}
      >
        <SessionFloatingAgentIcon agentIcon={session.agentIcon} />
        <article
          aria-expanded={contextMenuPosition ? true : undefined}
          aria-haspopup="menu"
          aria-pressed={session.isFocused}
          className="session"
          data-activity={session.activity}
          data-has-agent-icon={String(Boolean(session.agentIcon))}
          data-dragging={String(Boolean(sortable.isDragging))}
          data-drop-position={dropPosition}
          data-drop-target={String(Boolean(sortable.isDropTarget))}
          data-focused={String(session.isFocused)}
          data-running={String(session.isRunning)}
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
            requestClose();
          }}
          onClick={(event) => {
            event.stopPropagation();

            if (event.metaKey) {
              event.preventDefault();
              requestClose();
              return;
            }

            requestFocusSession();
          }}
          onContextMenu={(event: ReactMouseEvent<HTMLElement>) => {
            event.preventDefault();
            event.stopPropagation();
            openContextMenu(event.clientX, event.clientY);
          }}
          onKeyDown={handleKeyDown}
          ref={sortable.sourceRef}
          role="button"
          tabIndex={0}
        >
          <SessionCardContent
            aliasHeadingRef={aliasHeadingRef}
            onClose={requestClose}
            onRename={isBrowserSession ? undefined : requestRename}
            session={session}
            showDebugSessionNumbers={showDebugSessionNumbers}
            showCloseButton={showCloseButton}
            showHotkeys={showHotkeys}
          />
        </article>
        <div aria-hidden className="session-status-dot" />
      </div>
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
              {!isBrowserSession ? (
                <button
                  className="session-context-menu-item"
                  onClick={requestRename}
                  role="menuitem"
                  type="button"
                >
                  <IconPencil
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={16}
                    stroke={1.8}
                  />
                  Rename
                </button>
              ) : null}
              {canCopyResumeCommand ? (
                <button
                  className="session-context-menu-item"
                  onClick={requestCopyResumeCommand}
                  role="menuitem"
                  type="button"
                >
                  <IconCopy
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={16}
                    stroke={1.8}
                  />
                  Copy resume
                </button>
              ) : null}
              <button
                className="session-context-menu-item session-context-menu-item-danger"
                onClick={requestClose}
                role="menuitem"
                type="button"
              >
                <IconX
                  aria-hidden="true"
                  className="session-context-menu-icon"
                  size={16}
                  stroke={1.8}
                />
                {isBrowserSession ? "Close" : "Terminate"}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function supportsResumeCommandCopy(session: SidebarSessionItem): boolean {
  return (
    session.agentIcon === "codex" ||
    session.agentIcon === "claude" ||
    session.agentIcon === "gemini" ||
    session.agentIcon === "opencode"
  );
}
