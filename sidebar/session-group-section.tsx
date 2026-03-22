import { IconFocusCentered, IconPencil, IconPlus, IconX } from "@tabler/icons-react";
import { CollisionPriority } from "@dnd-kit/abstract";
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
import type {
  SidebarSessionGroup,
  SidebarSessionItem,
  TerminalViewMode,
  VisibleSessionCount,
} from "../shared/session-grid-contract";
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

type GroupLayoutIconProps = {
  viewMode: TerminalViewMode;
};

type GroupVisibleCountIconProps = {
  visibleCount: VisibleSessionCount;
};

export type SessionGroupSectionProps = {
  autoEdit: boolean;
  canClose: boolean;
  group: SidebarSessionGroup;
  index: number;
  onAutoEditHandled: () => void;
  orderedSessions: SidebarSessionItem[];
  showDebugSessionNumbers: boolean;
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

function GroupLayoutIcon({ viewMode }: GroupLayoutIconProps) {
  switch (viewMode) {
    case "horizontal":
      return (
        <svg aria-hidden="true" className="group-meta-icon" viewBox="0 0 16 16">
          <rect className="group-meta-frame" height="12" rx="2" width="12" x="2" y="2" />
          <path className="group-meta-line" d="M6 4v8M10 4v8" />
        </svg>
      );
    case "vertical":
      return (
        <svg aria-hidden="true" className="group-meta-icon" viewBox="0 0 16 16">
          <rect className="group-meta-frame" height="12" rx="2" width="12" x="2" y="2" />
          <path className="group-meta-line" d="M4 6h8M4 10h8" />
        </svg>
      );
    case "grid":
      return (
        <svg aria-hidden="true" className="group-meta-icon" viewBox="0 0 16 16">
          <rect className="group-meta-frame" height="12" rx="2" width="12" x="2" y="2" />
          <path className="group-meta-line" d="M8 4v8M4 8h8" />
        </svg>
      );
  }
}

function GroupVisibleCountIcon({ visibleCount }: GroupVisibleCountIconProps) {
  return (
    <svg aria-hidden="true" className="group-meta-icon" viewBox="0 0 16 16">
      <text className="group-meta-count-text" textAnchor="middle" x="8" y="8">
        {visibleCount}
      </text>
    </svg>
  );
}

export function SessionGroupSection({
  autoEdit,
  canClose,
  group,
  index,
  onAutoEditHandled,
  orderedSessions,
  showDebugSessionNumbers,
  showCloseButton,
  showHotkeys,
  vscode,
}: SessionGroupSectionProps) {
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>();
  const [draftTitle, setDraftTitle] = useState(group.title);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sortable = useSortable({
    accept: ["group", "session"],
    collisionPriority: CollisionPriority.Low,
    data: createGroupDropData(group.groupId),
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
    if (orderedSessions.length <= 1) {
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
        data-drop-target={String(sortable.isDropTarget)}
        data-sidebar-group-id={group.groupId}
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
              <div className="group-title-row">
                <div className="group-title-handle" ref={sortable.handleRef}>
                  <div className="group-title">{group.title}</div>
                </div>
                <div className="group-meta">
                  {group.isFocusModeActive ? (
                    <span
                      aria-label="Focus mode active"
                      className="group-meta-item"
                      role="img"
                      title="Focus mode active"
                    >
                      <IconFocusCentered
                        aria-hidden="true"
                        className="group-meta-focus-icon"
                        stroke={1.8}
                      />
                    </span>
                  ) : (
                    <>
                      <span
                        aria-label={`Layout ${group.viewMode}`}
                        className="group-meta-item"
                        role="img"
                        title={`Layout: ${group.viewMode}`}
                      >
                        <GroupLayoutIcon viewMode={group.viewMode} />
                      </span>
                      <span
                        aria-label={`${group.visibleCount} sessions shown`}
                        className="group-meta-item"
                        role="img"
                        title={`Sessions shown: ${group.visibleCount}`}
                      >
                        <GroupVisibleCountIcon visibleCount={group.visibleCount} />
                      </span>
                    </>
                  )}
                </div>
                <button
                  aria-label={`Create a session in ${group.title}`}
                  className="group-add-button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    requestCreateSession();
                  }}
                  title={`Create a session in ${group.title}`}
                  type="button"
                >
                  <IconPlus aria-hidden="true" className="group-add-icon" size={14} stroke={2} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="group-sessions" data-drop-target={String(sortable.isDropTarget)}>
          {orderedSessions.length > 0 ? (
            orderedSessions.map((session, sessionIndex) => (
              <SortableSessionCard
                groupId={group.groupId}
                index={sessionIndex}
                key={session.sessionId}
                session={session}
                showDebugSessionNumbers={showDebugSessionNumbers}
                showCloseButton={showCloseButton}
                showHotkeys={showHotkeys}
                vscode={vscode}
              />
            ))
          ) : (
            <div
              className="group-empty-drop-target"
              data-drop-target={String(sortable.isDropTarget)}
            >
              <div className="group-empty-state">No sessions in this group yet.</div>
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
