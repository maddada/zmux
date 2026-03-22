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
const COUNT_OPTIONS: VisibleSessionCount[] = [1, 2, 3, 4, 6, 9];
const GROUP_CONTROL_MENU_MARGIN_PX = 12;
const GROUP_LAYOUT_MENU_WIDTH_PX = 0;
const GROUP_VISIBLE_COUNT_MENU_WIDTH_PX = 0;

type ContextMenuPosition = {
  x: number;
  y: number;
};

type GroupControlMenu = "layout" | "visible-count";

type GroupLayoutIconProps = {
  viewMode: TerminalViewMode;
};

type GroupVisibleCountIconProps = {
  visibleCount: VisibleSessionCount;
};

type LayoutOption =
  | { kind: "focus"; label: string }
  | { kind: "view-mode"; label: string; viewMode: TerminalViewMode };

const LAYOUT_OPTIONS: readonly LayoutOption[] = [
  { kind: "focus", label: "Focus" },
  { kind: "view-mode", label: "Rows", viewMode: "vertical" },
  { kind: "view-mode", label: "Columns", viewMode: "horizontal" },
  { kind: "view-mode", label: "Grid", viewMode: "grid" },
];

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

function getControlMenuPosition(
  button: HTMLButtonElement | null,
  menuWidth: number,
): ContextMenuPosition | undefined {
  if (!button) {
    return undefined;
  }

  const bounds = button.getBoundingClientRect();
  return {
    x: Math.max(
      GROUP_CONTROL_MENU_MARGIN_PX,
      Math.min(
        bounds.right - menuWidth,
        window.innerWidth - menuWidth - GROUP_CONTROL_MENU_MARGIN_PX,
      ),
    ),
    y: Math.max(
      GROUP_CONTROL_MENU_MARGIN_PX,
      Math.min(bounds.bottom + 6, window.innerHeight - GROUP_CONTROL_MENU_MARGIN_PX),
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
  const [openControlMenu, setOpenControlMenu] = useState<GroupControlMenu>();
  const layoutButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const controlMenuRef = useRef<HTMLDivElement>(null);
  const controlAnchorRef = useRef<HTMLDivElement>(null);
  const visibleCountButtonRef = useRef<HTMLButtonElement>(null);
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
    setOpenControlMenu(undefined);
  }, [group.groupId, group.title]);

  useEffect(() => {
    if (group.isActive) {
      return;
    }

    setOpenControlMenu(undefined);
  }, [group.isActive]);

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

  useEffect(() => {
    if (!openControlMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (controlMenuRef.current?.contains(target) || controlAnchorRef.current?.contains(target)) {
        return;
      }

      setOpenControlMenu(undefined);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenControlMenu(undefined);
      }
    };
    const handleBlur = () => {
      setOpenControlMenu(undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setOpenControlMenu(undefined);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [openControlMenu]);

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

  const setVisibleCount = (visibleCount: VisibleSessionCount) => {
    setOpenControlMenu(undefined);
    vscode.postMessage({
      type: "setVisibleCount",
      visibleCount,
    });
  };

  const setLayout = (option: LayoutOption) => {
    setOpenControlMenu(undefined);

    if (option.kind === "focus") {
      if (!group.isFocusModeActive) {
        vscode.postMessage({ type: "toggleFullscreenSession" });
      }
      return;
    }

    if (group.isFocusModeActive) {
      vscode.postMessage({ type: "toggleFullscreenSession" });
    }

    vscode.postMessage({
      type: "setViewMode",
      viewMode: option.viewMode,
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
                {group.isActive ? (
                  <div
                    className="group-layout-controls"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    ref={controlAnchorRef}
                  >
                    <div className="group-control-anchor">
                      <button
                        aria-expanded={openControlMenu === "layout"}
                        aria-haspopup="menu"
                        aria-label={`Open layout options for ${group.title}`}
                        className="group-add-button group-control-button"
                        data-open={String(openControlMenu === "layout")}
                        onClick={() => {
                          setOpenControlMenu((previous) =>
                            previous === "layout" ? undefined : "layout",
                          );
                        }}
                        ref={layoutButtonRef}
                        type="button"
                      >
                        {group.isFocusModeActive ? (
                          <IconFocusCentered
                            aria-hidden="true"
                            className="group-meta-focus-icon"
                            stroke={1.8}
                          />
                        ) : (
                          <GroupLayoutIcon viewMode={group.viewMode} />
                        )}
                      </button>
                    </div>
                    <div className="group-control-anchor">
                      <button
                        aria-expanded={openControlMenu === "visible-count"}
                        aria-haspopup="menu"
                        aria-label={`Open visible session options for ${group.title}`}
                        className="group-add-button group-control-button"
                        data-open={String(openControlMenu === "visible-count")}
                        onClick={() => {
                          setOpenControlMenu((previous) =>
                            previous === "visible-count" ? undefined : "visible-count",
                          );
                        }}
                        ref={visibleCountButtonRef}
                        type="button"
                      >
                        <GroupVisibleCountIcon visibleCount={group.visibleCount} />
                      </button>
                    </div>
                  </div>
                ) : null}
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
      {openControlMenu === "layout"
        ? createPortal(
            <div
              className="group-control-menu session-context-menu"
              onClick={(event) => event.stopPropagation()}
              ref={controlMenuRef}
              role="menu"
              style={getPortalMenuStyle(layoutButtonRef.current, GROUP_LAYOUT_MENU_WIDTH_PX)}
            >
              {LAYOUT_OPTIONS.map((option) => {
                const isSelected =
                  option.kind === "focus"
                    ? group.isFocusModeActive
                    : !group.isFocusModeActive && group.viewMode === option.viewMode;
                const isDisabled =
                  option.kind === "view-mode" &&
                  isViewModeDisabled(option.viewMode, group.visibleCount);

                return (
                  <button
                    aria-pressed={isSelected}
                    className="session-context-menu-item group-control-menu-item"
                    data-selected={String(isSelected)}
                    disabled={isDisabled}
                    key={option.label}
                    onClick={() => {
                      if (isDisabled) {
                        return;
                      }

                      setLayout(option);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    {option.kind === "focus" ? (
                      <IconFocusCentered
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                        stroke={1.8}
                      />
                    ) : (
                      <GroupLayoutIcon viewMode={option.viewMode} />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
      {openControlMenu === "visible-count"
        ? createPortal(
            <div
              className="group-control-menu session-context-menu group-control-count-menu"
              onClick={(event) => event.stopPropagation()}
              ref={controlMenuRef}
              role="menu"
              style={getPortalMenuStyle(
                visibleCountButtonRef.current,
                GROUP_VISIBLE_COUNT_MENU_WIDTH_PX,
              )}
            >
              {COUNT_OPTIONS.map((visibleCount) => (
                <button
                  aria-pressed={group.visibleCount === visibleCount}
                  className="session-context-menu-item group-control-menu-item"
                  data-selected={String(group.visibleCount === visibleCount)}
                  key={visibleCount}
                  onClick={() => setVisibleCount(visibleCount)}
                  role="menuitem"
                  type="button"
                >
                  {visibleCount}
                </button>
              ))}
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

function getPortalMenuStyle(button: HTMLButtonElement | null, menuWidth: number) {
  const effectiveMenuWidth = menuWidth || button?.offsetWidth || 0;
  const position = getControlMenuPosition(button, effectiveMenuWidth);
  if (!position) {
    return undefined;
  }

  return {
    left: `${position.x}px`,
    position: "fixed" as const,
    top: `${position.y}px`,
  };
}

function isViewModeDisabled(
  viewMode: TerminalViewMode,
  visibleCount: VisibleSessionCount,
): boolean {
  if (visibleCount === 1) {
    return true;
  }

  if (visibleCount === 2 && viewMode === "grid") {
    return true;
  }

  return false;
}
