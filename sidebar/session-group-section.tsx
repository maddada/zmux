import {
  IconMoon,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { createPortal } from "react-dom";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { VisibleSessionCount } from "../shared/session-grid-contract";
import { ConfirmationModal } from "./confirmation-modal";
import {
  createGroupDropData,
  createSessionDropTargetData,
  createSessionDropTargetId,
} from "./sidebar-dnd";
import { useSidebarStore } from "./sidebar-store";
import { SortableSessionCard } from "./sortable-session-card";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 164;
const CONTEXT_MENU_ITEM_HEIGHT_PX = 34;
const CONTEXT_MENU_VERTICAL_PADDING_PX = 12;
const COUNT_OPTIONS: VisibleSessionCount[] = [1, 2, 3, 4, 6, 9];
const GROUP_CONTROL_MENU_MARGIN_PX = 12;

type ContextMenuPosition = {
  x: number;
  y: number;
};

type GroupControlMenu = "visible-count";

export type SessionGroupSectionProps = {
  autoEdit: boolean;
  canClose: boolean;
  draggingDisabled?: boolean;
  groupId: string;
  index: number;
  onAutoEditHandled: () => void;
  onFocusRequested?: (groupId: string, sessionId: string) => void;
  orderedSessionIds?: readonly string[];
  sessionDropIndicatorGroupId?: string;
  showSessionDropPositionIndicators?: boolean;
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

function getControlMenuPosition(button: HTMLButtonElement | null): ContextMenuPosition | undefined {
  if (!button) {
    return undefined;
  }

  const bounds = button.getBoundingClientRect();
  return {
    x: Math.max(
      GROUP_CONTROL_MENU_MARGIN_PX,
      Math.min(bounds.left + bounds.width / 2, window.innerWidth - GROUP_CONTROL_MENU_MARGIN_PX),
    ),
    y: Math.max(
      GROUP_CONTROL_MENU_MARGIN_PX,
      Math.min(bounds.bottom + 6, window.innerHeight - GROUP_CONTROL_MENU_MARGIN_PX),
    ),
  };
}

function getVisibleCountMenuLabel(visibleCount: VisibleSessionCount): string {
  return visibleCount === 1 ? "Show 1 split" : `Show ${String(visibleCount)} splits`;
}

export function SessionGroupSection({
  autoEdit,
  canClose,
  draggingDisabled = false,
  groupId,
  index,
  onAutoEditHandled,
  onFocusRequested,
  orderedSessionIds: orderedSessionIdsProp,
  sessionDropIndicatorGroupId,
  showSessionDropPositionIndicators = true,
  vscode,
}: SessionGroupSectionProps) {
  const group = useSidebarStore((state) => state.groupsById[groupId]);
  const storedSessionIds = useSidebarStore((state) => state.sessionIdsByGroup[groupId] ?? []);
  const sessionsById = useSidebarStore((state) => state.sessionsById);
  const orderedSessionIds = orderedSessionIdsProp ?? storedSessionIds;
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>();
  const [draftTitle, setDraftTitle] = useState(group?.title ?? "");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openControlMenu, setOpenControlMenu] = useState<GroupControlMenu>();
  const menuRef = useRef<HTMLDivElement>(null);
  const controlMenuRef = useRef<HTMLDivElement>(null);
  const visibleCountButtonRef = useRef<HTMLButtonElement>(null);
  const debugInstanceIdRef = useRef(createSessionGroupDebugInstanceId());
  const isBrowserGroup = group?.kind === "browser";
  const debuggingMode = useSidebarStore((state) => state.hud.debuggingMode);
  const postGroupDebugLog = useEffectEvent((event: string, details: Record<string, unknown>) => {
    if (!debuggingMode) {
      return;
    }

    vscode.postMessage({
      details: {
        debugInstanceId: debugInstanceIdRef.current,
        groupId,
        ...details,
      },
      event,
      type: "sidebarDebugLog",
    });
  });
  const sortable = useSortable({
    accept: ["group", "session"],
    collisionPriority: CollisionPriority.Low,
    data: createGroupDropData(groupId),
    disabled: isBrowserGroup || draggingDisabled,
    id: groupId,
    index,
    plugins: [SortableKeyboardPlugin],
    type: "group",
  });
  const emptyGroupDropTarget = useDroppable({
    accept: "session",
    data: createSessionDropTargetData({
      groupId,
      kind: "group",
      position: "start",
    }),
    disabled: isBrowserGroup || draggingDisabled,
    id: createSessionDropTargetId({
      groupId,
      kind: "group",
      position: "start",
    }),
  });

  if (!group) {
    return null;
  }

  const groupSessions = orderedSessionIds
    .map((sessionId) => sessionsById[sessionId])
    .filter((session): session is NonNullable<typeof session> => session !== undefined);
  const allSessionsSleeping =
    groupSessions.length > 0 && groupSessions.every((session) => session.isSleeping);
  const canFullReloadGroup = groupSessions.length > 0;

  const isGroupDropTarget =
    sortable.isDropTarget ||
    emptyGroupDropTarget.isDropTarget ||
    sessionDropIndicatorGroupId === groupId;
  const shouldRenderGroupSessions = !isBrowserGroup || orderedSessionIds.length > 0;

  useEffect(() => {
    postGroupDebugLog("group.sectionMounted", {
      isBrowserGroup,
      orderedSessionIds,
    });

    return () => {
      postGroupDebugLog("group.sectionUnmounted", {
        isBrowserGroup,
      });
    };
  }, [isBrowserGroup, postGroupDebugLog]);

  useEffect(() => {
    postGroupDebugLog("group.dropStateChanged", {
      isGroupDropTarget,
      orderedSessionIds,
      sessionEmptyDropTarget: emptyGroupDropTarget.isDropTarget,
      sortableIsDropTarget: sortable.isDropTarget,
    });
  }, [
    emptyGroupDropTarget.isDropTarget,
    isGroupDropTarget,
    orderedSessionIds,
    postGroupDebugLog,
    sortable.isDropTarget,
  ]);

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

      if (
        controlMenuRef.current?.contains(target) ||
        visibleCountButtonRef.current?.contains(target)
      ) {
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
    if (isBrowserGroup) {
      return;
    }

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
    if (isBrowserGroup) {
      return;
    }

    vscode.postMessage({
      groupId: group.groupId,
      type: "focusGroup",
    });
  };

  const requestCreateSession = () => {
    if (isBrowserGroup) {
      vscode.postMessage({
        type: "openBrowser",
      });
      return;
    }

    vscode.postMessage({
      groupId: group.groupId,
      type: "createSessionInGroup",
    });
  };

  const setVisibleCount = (visibleCount: VisibleSessionCount) => {
    if (isBrowserGroup) {
      return;
    }

    setOpenControlMenu(undefined);
    vscode.postMessage({
      type: "setVisibleCount",
      visibleCount,
    });
  };

  const requestCloseGroup = () => {
    if (!canClose) {
      return;
    }

    setContextMenuPosition(undefined);
    if (orderedSessionIds.length <= 1) {
      vscode.postMessage({
        groupId: group.groupId,
        type: "closeGroup",
      });
      return;
    }

    setIsConfirmOpen(true);
  };

  const requestSetGroupSleeping = (sleeping: boolean) => {
    if (isBrowserGroup) {
      return;
    }

    setContextMenuPosition(undefined);
    vscode.postMessage({
      groupId: group.groupId,
      sleeping,
      type: "setGroupSleeping",
    });
  };

  const requestFullReloadGroup = () => {
    if (isBrowserGroup || !canFullReloadGroup) {
      return;
    }

    setContextMenuPosition(undefined);
    vscode.postMessage({
      groupId: group.groupId,
      type: "fullReloadGroup",
    });
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
        data-drop-target={String(isGroupDropTarget)}
        data-sidebar-group-id={group.groupId}
        onClick={() => {
          if (!isBrowserGroup) {
            requestFocusGroup();
          }
        }}
        onContextMenu={(event: ReactMouseEvent<HTMLElement>) => {
          if (isBrowserGroup) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          setContextMenuPosition(
            clampContextMenuPosition(event.clientX, event.clientY, 3 + Number(canFullReloadGroup)),
          );
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
                <div
                  className="group-title-handle"
                  data-draggable={String(!isBrowserGroup)}
                  ref={isBrowserGroup ? undefined : sortable.handleRef}
                >
                  <div className="group-title">{group.title}</div>
                </div>
                {group.isActive && !isBrowserGroup ? (
                  <div
                    className="group-layout-controls"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    <div className="group-control-anchor">
                      <button
                        aria-expanded={openControlMenu === "visible-count"}
                        aria-haspopup="menu"
                        aria-label={`Select split count for ${group.title}`}
                        className="group-add-button group-control-button"
                        data-open={String(openControlMenu === "visible-count")}
                        onClick={() => {
                          setOpenControlMenu((previous) =>
                            previous === "visible-count" ? undefined : "visible-count",
                          );
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenControlMenu((previous) =>
                            previous === "visible-count" ? undefined : "visible-count",
                          );
                        }}
                        ref={visibleCountButtonRef}
                        title={`Select split count for ${group.title}`}
                        type="button"
                      >
                        <span className="group-control-count-value">
                          {String(group.layoutVisibleCount)}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : null}
                <button
                  aria-label={
                    isBrowserGroup
                      ? `Open a browser in ${group.title}`
                      : `Create a session in ${group.title}`
                  }
                  className={
                    isBrowserGroup
                      ? "group-add-button group-add-button-always-visible"
                      : "group-add-button"
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    requestCreateSession();
                  }}
                  title={
                    isBrowserGroup
                      ? `Open a browser in ${group.title}`
                      : `Create a session in ${group.title}`
                  }
                  type="button"
                >
                  <IconPlus aria-hidden="true" className="group-add-icon" size={14} stroke={2} />
                </button>
              </div>
            )}
          </div>
        </div>
        {shouldRenderGroupSessions ? (
          <div className="group-sessions" data-drop-target={String(isGroupDropTarget)}>
            {orderedSessionIds.length > 0 ? (
              orderedSessionIds.map((sessionId, sessionIndex) => (
                <SortableSessionCard
                  dragDisabled={draggingDisabled}
                  groupId={group.groupId}
                  index={sessionIndex}
                  key={sessionId}
                  onFocusRequested={onFocusRequested}
                  sessionId={sessionId}
                  showDropPositionIndicator={showSessionDropPositionIndicators}
                  vscode={vscode}
                />
              ))
            ) : (
              <div
                className="group-empty-drop-target"
                data-drop-position={emptyGroupDropTarget.isDropTarget ? "start" : undefined}
                data-drop-target={String(isGroupDropTarget)}
                ref={emptyGroupDropTarget.ref}
              >
                <div className="group-empty-state">No sessions</div>
              </div>
            )}
          </div>
        ) : (
          <>{/* We may want to restore the empty browser placeholder later. */}</>
        )}
      </section>
      {!isBrowserGroup && contextMenuPosition
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
              {canFullReloadGroup ? (
                <button
                  className="session-context-menu-item"
                  onClick={requestFullReloadGroup}
                  role="menuitem"
                  type="button"
                >
                  <IconRefresh aria-hidden="true" className="session-context-menu-icon" size={14} />
                  Full reload
                </button>
              ) : null}
              <button
                className="session-context-menu-item"
                onClick={() => requestSetGroupSleeping(!allSessionsSleeping)}
                role="menuitem"
                type="button"
              >
                {allSessionsSleeping ? (
                  <IconPlayerPlay
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                  />
                ) : (
                  <IconMoon aria-hidden="true" className="session-context-menu-icon" size={14} />
                )}
                {allSessionsSleeping ? "Wake" : "Sleep"}
              </button>
              <div className="session-context-menu-divider" role="separator" />
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
      {!isBrowserGroup && openControlMenu === "visible-count"
        ? createPortal(
            <div
              className="group-control-menu session-context-menu group-control-count-menu"
              onClick={(event) => event.stopPropagation()}
              ref={controlMenuRef}
              role="menu"
              style={getPortalMenuStyle(visibleCountButtonRef.current)}
            >
              {COUNT_OPTIONS.map((visibleCount) => (
                <button
                  aria-pressed={group.layoutVisibleCount === visibleCount}
                  aria-label={getVisibleCountMenuLabel(visibleCount)}
                  className="session-context-menu-item group-control-menu-item"
                  data-selected={String(group.layoutVisibleCount === visibleCount)}
                  key={visibleCount}
                  onClick={() => setVisibleCount(visibleCount)}
                  role="menuitem"
                  title={getVisibleCountMenuLabel(visibleCount)}
                  type="button"
                >
                  <span className="group-control-count-option-value">{String(visibleCount)}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
      {!isBrowserGroup ? (
        <ConfirmationModal
          confirmLabel="Terminate Group"
          description={`This will terminate all ${orderedSessionIds.length} session${orderedSessionIds.length === 1 ? "" : "s"} in ${group.title}.`}
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
      ) : null}
    </>
  );
}

function getPortalMenuStyle(button: HTMLButtonElement | null) {
  const position = getControlMenuPosition(button);
  if (!position) {
    return undefined;
  }

  return {
    left: `${position.x}px`,
    position: "fixed" as const,
    top: `${position.y}px`,
    transform: "translateX(-50%)",
  };
}

let sessionGroupDebugInstanceCounter = 0;

function createSessionGroupDebugInstanceId(): number {
  sessionGroupDebugInstanceCounter += 1;
  return sessionGroupDebugInstanceCounter;
}
