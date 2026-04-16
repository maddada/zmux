import {
  IconCaretRightFilled,
  IconMessageCircle,
  IconMoon,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { createPortal } from "react-dom";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  getSidebarSessionLifecycleState,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import { ConfirmationModal } from "./confirmation-modal";
import {
  createGroupDropData,
  createSessionDropTargetData,
  createSessionDropTargetId,
} from "./sidebar-dnd";
import { getGroupSessionSummary } from "./group-session-summary";
import { shouldShowSessionGroupConnector } from "./session-group-connector";
import { getGroupStatusAnchorName, getSessionStatusAnchorName } from "./session-status-anchor";
import { useSidebarStore } from "./sidebar-store";
import { SortableSessionCard } from "./sortable-session-card";
import { useCollapsibleHeight } from "./use-collapsible-height";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 164;
const CONTEXT_MENU_ITEM_HEIGHT_PX = 34;
const CONTEXT_MENU_VERTICAL_PADDING_PX = 12;
const COUNT_OPTIONS: VisibleSessionCount[] = [1, 2, 3, 4, 6, 9];
const GROUP_CONTROL_MENU_MARGIN_PX = 12;
const GROUP_DRAG_HOLD_DELAY_MS = 130;
const GROUP_DRAG_HOLD_TOLERANCE_PX = 12;
const TOUCH_GROUP_DRAG_HOLD_DELAY_MS = 180;
const TOUCH_GROUP_DRAG_HOLD_TOLERANCE_PX = 12;

function getAnchoredSessionStatusStyle(sessionId: string): CSSProperties {
  return {
    left: "anchor(right)",
    positionAnchor: getSessionStatusAnchorName(sessionId),
    top: "anchor(center)",
  } as CSSProperties;
}

function getCollapsedGroupStatusStyle(groupId: string): CSSProperties {
  return {
    left: "anchor(right)",
    positionAnchor: getGroupStatusAnchorName(groupId),
    top: "anchor(center)",
  } as CSSProperties;
}

const groupSensors = [
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === "touch") {
        return [
          new PointerActivationConstraints.Delay({
            tolerance: TOUCH_GROUP_DRAG_HOLD_TOLERANCE_PX,
            value: TOUCH_GROUP_DRAG_HOLD_DELAY_MS,
          }),
        ];
      }

      return [
        new PointerActivationConstraints.Delay({
          tolerance: GROUP_DRAG_HOLD_TOLERANCE_PX,
          value: GROUP_DRAG_HOLD_DELAY_MS,
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

type GroupControlMenu = "visible-count";

export type SessionGroupSectionProps = {
  autoEdit: boolean;
  canClose: boolean;
  completionFlashNonceBySessionId?: Record<string, number>;
  draggingDisabled?: boolean;
  groupId: string;
  index: number;
  isCollapsed: boolean;
  onAutoEditHandled: () => void;
  onCollapsedChange: (groupId: string, collapsed: boolean) => void;
  onCreateSessionRequested?: (groupId: string) => void;
  onFocusRequested?: (groupId: string, sessionId: string) => void;
  orderedSessionIds?: readonly string[];
  selectedSearchSessionId?: string;
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
  completionFlashNonceBySessionId,
  draggingDisabled = false,
  groupId,
  index,
  isCollapsed,
  onAutoEditHandled,
  onCollapsedChange,
  onCreateSessionRequested,
  onFocusRequested,
  orderedSessionIds: orderedSessionIdsProp,
  selectedSearchSessionId,
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
  const { collapsibleStyle, contentRef } = useCollapsibleHeight<HTMLDivElement>();
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
    sensors: groupSensors,
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
  const sessionSummary = getGroupSessionSummary(groupSessions);
  const allSessionsSleeping =
    groupSessions.length > 0 && groupSessions.every((session) => session.isSleeping);
  const browserTabCount = isBrowserGroup ? groupSessions.length : 0;
  const canFullReloadGroup = groupSessions.length > 0;
  const collapsedIndicatorActivity = sessionSummary.indicatorActivity;
  const hasCollapsedSummary = collapsedIndicatorActivity !== undefined;
  const collapsedSummaryLabel = getCollapsedSummaryLabel(collapsedIndicatorActivity);
  const sessionsRegionId = `${group.groupId}-sessions`;
  const groupHeaderAnchorStyle = {
    anchorName: getGroupStatusAnchorName(group.groupId),
  } as CSSProperties;

  const isGroupDropTarget =
    sortable.isDropTarget ||
    emptyGroupDropTarget.isDropTarget ||
    sessionDropIndicatorGroupId === groupId;
  const showSessionGroupConnector = shouldShowSessionGroupConnector({
    groupKind: group.kind,
    sessions: groupSessions,
  });
  const emptyStateLabel = isBrowserGroup ? "No browsers" : "No sessions";

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
    onCreateSessionRequested?.(group.groupId);

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

  const toggleCollapsed = () => {
    onCollapsedChange(group.groupId, !isCollapsed);
  };

  const handleGroupHeaderClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isEditing) {
      return;
    }

    if (event.target instanceof Element && event.target.closest(".group-header-actions")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleCollapsed();
  };

  return (
    <>
      <section
        className="group"
        data-active={String(group.isActive)}
        data-collapsed={String(isCollapsed)}
        data-dragging={String(Boolean(sortable.isDragging))}
        data-drop-target={String(isGroupDropTarget)}
        data-session-connector={String(showSessionGroupConnector)}
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
        <div
          className="group-head"
          data-collapsible="true"
          onClick={handleGroupHeaderClick}
          style={groupHeaderAnchorStyle}
        >
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
                <button
                  aria-controls={isCollapsed ? undefined : sessionsRegionId}
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.title}`}
                  className="group-collapse-button section-titlebar-toggle"
                  data-collapsed={String(isCollapsed)}
                  data-has-idle-icon="true"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleCollapsed();
                  }}
                  title={`${isCollapsed ? "Expand" : "Collapse"} ${group.title}`}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="group-collapse-icon group-collapse-idle-icon section-titlebar-toggle-icon section-titlebar-toggle-idle-icon"
                  >
                    {isBrowserGroup ? (
                      <IconWorld size={16} stroke={1.8} />
                    ) : (
                      <IconMessageCircle size={16} stroke={1.8} />
                    )}
                  </span>
                  <IconCaretRightFilled
                    aria-hidden="true"
                    className="group-collapse-icon group-collapse-chevron-icon section-titlebar-toggle-icon section-titlebar-toggle-chevron-icon"
                    size={16}
                  />
                </button>
                <div
                  className="group-title-handle"
                  data-draggable={String(!isBrowserGroup)}
                  ref={isBrowserGroup ? undefined : sortable.handleRef}
                >
                  <button
                    aria-controls={isCollapsed ? undefined : sessionsRegionId}
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.title}`}
                    className="group-title-button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleCollapsed();
                    }}
                    title={`${isCollapsed ? "Expand" : "Collapse"} ${group.title}`}
                    type="button"
                  >
                    <span className="group-title section-titlebar-label">{group.title}</span>
                  </button>
                </div>
                <div className="group-title-spacer" />
                {browserTabCount > 0 ? (
                  <span
                    aria-label={`${String(browserTabCount)} browser tab${browserTabCount === 1 ? "" : "s"}`}
                    className="group-browser-tab-count"
                    title={`${String(browserTabCount)} browser tab${browserTabCount === 1 ? "" : "s"}`}
                  >
                    {String(browserTabCount)}
                  </span>
                ) : null}
                <div
                  className="group-header-actions"
                  data-open={String(openControlMenu !== undefined)}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <button
                    aria-label={
                      isBrowserGroup
                        ? `Open a browser in ${group.title}`
                        : `Create a session in ${group.title}`
                    }
                    className="group-add-button"
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
                  {group.isActive && !isBrowserGroup ? (
                    <div className="group-layout-controls">
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
                </div>
              </div>
            )}
          </div>
        </div>
        {isCollapsed && hasCollapsedSummary ? (
          <div
            aria-label={collapsedSummaryLabel}
            className="group-collapsed-summary"
            data-activity={collapsedIndicatorActivity}
            style={getCollapsedGroupStatusStyle(group.groupId)}
          >
            <div aria-hidden className="session-status-dot" />
          </div>
        ) : null}
        <div
          aria-hidden={isCollapsed}
          className="group-sessions-shell sidebar-collapse-shell"
          data-collapsed={String(isCollapsed)}
          style={collapsibleStyle}
        >
          <div
            className="group-sessions sidebar-collapse-content"
            data-drop-target={String(isGroupDropTarget)}
            id={sessionsRegionId}
            ref={contentRef}
          >
            {showSessionGroupConnector ? (
              <>
                <div aria-hidden className="group-session-connector-rail" />
                <button
                  aria-label={`Collapse ${group.title}`}
                  className="group-session-connector-button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleCollapsed();
                  }}
                  type="button"
                />
              </>
            ) : null}
            {orderedSessionIds.length > 0 ? (
              orderedSessionIds.map((sessionId, sessionIndex) => (
                <SortableSessionCard
                  completionFlashNonce={completionFlashNonceBySessionId?.[sessionId] ?? 0}
                  dragDisabled={draggingDisabled}
                  groupId={group.groupId}
                  index={sessionIndex}
                  isSearchSelected={selectedSearchSessionId === sessionId}
                  key={sessionId}
                  onFocusRequested={onFocusRequested}
                  sessionId={sessionId}
                  showGroupConnector={showSessionGroupConnector}
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
                <div className="group-empty-state">{emptyStateLabel}</div>
              </div>
            )}
          </div>
          {showSessionGroupConnector
            ? groupSessions.map((session) => (
                <div
                  aria-hidden
                  className="session-status-dot session-status-dot-anchored"
                  data-activity={session.activity}
                  data-lifecycle-state={getSidebarSessionLifecycleState(session)}
                  key={`status-${session.sessionId}`}
                  style={getAnchoredSessionStatusStyle(session.sessionId)}
                />
              ))
            : null}
        </div>
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

function getCollapsedSummaryLabel(
  indicatorActivity: "attention" | "working" | undefined,
): string | undefined {
  if (indicatorActivity === "attention") {
    return "Group has completed sessions";
  }

  if (indicatorActivity === "working") {
    return "Group has active sessions";
  }

  return undefined;
}
