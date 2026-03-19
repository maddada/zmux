import { IconGripVertical, IconPencil, IconX } from "@tabler/icons-react";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { createPortal } from "react-dom";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { SidebarSessionGroup, SidebarSessionItem } from "../shared/session-grid-contract";
import { ConfirmationModal } from "./confirmation-modal";
import { createGroupDropData } from "./sidebar-dnd";
import { SortableSessionCard } from "./sortable-session-card";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_HEIGHT_PX = 90;
const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 164;

type ContextMenuPosition = {
  x: number;
  y: number;
};

export type SessionGroupSectionProps = {
  autoEdit: boolean;
  canClose: boolean;
  group: SidebarSessionGroup;
  index: number;
  onAutoEditHandled: () => void;
  orderedSessions: SidebarSessionItem[];
  showCloseButton: boolean;
  showHotkeys: boolean;
  vscode: WebviewApi;
};

function clampContextMenuPosition(clientX: number, clientY: number): ContextMenuPosition {
  return {
    x: Math.max(
      CONTEXT_MENU_MARGIN_PX,
      Math.min(clientX, window.innerWidth - CONTEXT_MENU_WIDTH_PX - CONTEXT_MENU_MARGIN_PX),
    ),
    y: Math.max(
      CONTEXT_MENU_MARGIN_PX,
      Math.min(clientY, window.innerHeight - CONTEXT_MENU_HEIGHT_PX - CONTEXT_MENU_MARGIN_PX),
    ),
  };
}

export function SessionGroupSection({
  autoEdit,
  canClose,
  group,
  index,
  onAutoEditHandled,
  orderedSessions,
  showCloseButton,
  showHotkeys,
  vscode,
}: SessionGroupSectionProps) {
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>();
  const [draftTitle, setDraftTitle] = useState(group.title);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sessionDropTarget = useDroppable({
    accept: "session",
    data: createGroupDropData(group.groupId),
    id: `${group.groupId}-session-drop`,
  });
  const sortable = useSortable({
    accept: "group",
    data: createGroupDropData(group.groupId),
    group: "groups",
    id: group.groupId,
    index,
    type: "group",
  });

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setDraftTitle(group.title);
  }, [group.title, isEditing]);

  useEffect(() => {
    if (!autoEdit) {
      return;
    }

    startTransition(() => {
      setDraftTitle(group.title);
      setIsEditing(true);
      onAutoEditHandled();
    });
  }, [autoEdit, group.title, onAutoEditHandled]);

  useEffect(() => {
    setContextMenuPosition(undefined);
  }, [group.groupId, group.title]);

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

  const submitRename = () => {
    const nextTitle = draftTitle.trim();
    setIsEditing(false);
    setDraftTitle(nextTitle || group.title);

    if (!nextTitle || nextTitle === group.title) {
      return;
    }

    vscode.postMessage({
      groupId: group.groupId,
      title: nextTitle,
      type: "renameGroup",
    });
  };

  const requestFocusGroup = () => {
    vscode.postMessage({
      groupId: group.groupId,
      type: "focusGroup",
    });
  };

  const requestCreateSession = () => {
    if (group.isActive) {
      vscode.postMessage({ type: "createSession" });
      return;
    }

    vscode.postMessage({
      groupId: group.groupId,
      type: "createSessionInGroup",
    });
  };

  const requestCloseGroup = () => {
    if (!canClose) {
      return;
    }

    setContextMenuPosition(undefined);
    if (orderedSessions.length === 0) {
      vscode.postMessage({
        groupId: group.groupId,
        type: "closeGroup",
      });
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleTitleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitRename();
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    setDraftTitle(group.title);
    setIsEditing(false);
  };

  return (
    <>
      <section
        className="group"
        data-active={String(group.isActive)}
        data-dragging={String(Boolean(sortable.isDragging))}
        data-drop-target={String(sortable.isDropTarget || sessionDropTarget.isDropTarget)}
        onClick={() => {
          requestFocusGroup();
        }}
        onContextMenu={(event: ReactMouseEvent<HTMLElement>) => {
          event.preventDefault();
          event.stopPropagation();
          setContextMenuPosition(clampContextMenuPosition(event.clientX, event.clientY));
        }}
        ref={sortable.ref}
      >
        <div className="group-head">
          <button
            aria-label="Reorder group"
            className="group-drag-handle"
            onClick={(event) => {
              event.stopPropagation();
            }}
            ref={sortable.handleRef}
            type="button"
          >
            <IconGripVertical aria-hidden="true" className="group-drag-icon" stroke={1.7} />
          </button>
          <div className="group-title-wrap">
            {isEditing ? (
              <input
                autoFocus
                className="group-title-input"
                onBlur={submitRename}
                onChange={(event) => setDraftTitle(event.currentTarget.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={handleTitleKeyDown}
                value={draftTitle}
              />
            ) : (
              <div className="group-title">{group.title}</div>
            )}
          </div>
          <div className="group-status" data-active={String(group.isActive)}>
            {group.isActive ? "Active" : "Switch"}
          </div>
        </div>
        <div
          className="group-sessions"
          data-drop-target={String(sessionDropTarget.isDropTarget)}
          ref={orderedSessions.length > 0 ? sessionDropTarget.ref : undefined}
        >
          {orderedSessions.length > 0 ? (
            orderedSessions.map((session, sessionIndex) => (
              <SortableSessionCard
                groupId={group.groupId}
                index={sessionIndex}
                key={session.sessionId}
                session={session}
                showCloseButton={showCloseButton}
                showHotkeys={showHotkeys}
                vscode={vscode}
              />
            ))
          ) : (
            <div
              className="group-empty-drop-target"
              data-drop-target={String(sessionDropTarget.isDropTarget)}
              ref={sessionDropTarget.ref}
            >
              <button
                aria-label={`Create a session in ${group.title}`}
                className="group-empty-button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  requestCreateSession();
                }}
                type="button"
              >
                +
              </button>
            </div>
          )}
        </div>
      </section>
      {contextMenuPosition
        ? createPortal(
            <div
              className="session-context-menu"
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              ref={menuRef}
              role="menu"
              style={{
                left: `${contextMenuPosition.x}px`,
                top: `${contextMenuPosition.y}px`,
                width: `${CONTEXT_MENU_WIDTH_PX}px`,
              }}
            >
              <button
                className="session-context-menu-item"
                onClick={() => {
                  setContextMenuPosition(undefined);
                  setIsEditing(true);
                }}
                role="menuitem"
                type="button"
              >
                <IconPencil aria-hidden="true" className="session-context-menu-icon" size={14} />
                Rename
              </button>
              <button
                className="session-context-menu-item session-context-menu-item-danger"
                disabled={!canClose}
                onClick={requestCloseGroup}
                role="menuitem"
                type="button"
              >
                <IconX aria-hidden="true" className="session-context-menu-icon" size={14} />
                Close
              </button>
            </div>,
            document.body,
          )
        : null}
      <ConfirmationModal
        confirmLabel="Terminate Group"
        description={`This will terminate all ${orderedSessions.length} session${orderedSessions.length === 1 ? "" : "s"} in ${group.title}.`}
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          vscode.postMessage({
            groupId: group.groupId,
            type: "closeGroup",
          });
        }}
        title="Close group?"
      />
    </>
  );
}
