import { Tooltip } from "@base-ui/react/tooltip";
import {
  IconCaretRightFilled,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconCopy,
  IconFolder,
  IconFolderOpen,
  IconMessageCircle,
  IconMoon,
  IconPalette,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconTrash,
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
  type SidebarTheme,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import {
  DEFAULT_zmux_SETTINGS,
  getZedOverlayTargetAppLabel,
} from "../shared/zmux-settings";
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
import {
  DEFAULT_WORKSPACE_THEME_COLOR,
  normalizeWorkspaceThemeColor,
  readWorkspaceThemeColorHistory,
  updateWorkspaceThemeColorHistory,
  writeWorkspaceThemeColorHistory,
} from "../shared/workspace-dock-icons";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 196;
const CONTEXT_MENU_ITEM_HEIGHT_PX = 34;
const CONTEXT_MENU_VERTICAL_PADDING_PX = 12;
const COUNT_OPTIONS: VisibleSessionCount[] = [1, 2, 3, 4, 6, 9];
const GROUP_CONTROL_MENU_MARGIN_PX = 12;
const GROUP_DRAG_HOLD_DELAY_MS = 130;
const GROUP_DRAG_HOLD_TOLERANCE_PX = 12;
const TOUCH_GROUP_DRAG_HOLD_DELAY_MS = 180;
const TOUCH_GROUP_DRAG_HOLD_TOLERANCE_PX = 12;
const PROJECT_CONTEXT_THEME_OPTIONS: ReadonlyArray<{ label: string; value: SidebarTheme }> = [
  { label: "Dark Gray", value: "plain-dark" },
  { label: "Dark Green", value: "dark-green" },
  { label: "Dark Blue", value: "dark-blue" },
  { label: "Dark Red", value: "dark-red" },
  { label: "Dark Pink", value: "dark-pink" },
  { label: "Dark Orange", value: "dark-orange" },
  { label: "Light Blue", value: "light-blue" },
  { label: "Light Green", value: "light-green" },
  { label: "Light Pink", value: "light-pink" },
  { label: "Light Orange", value: "light-orange" },
];

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

/**
 * CDXC:WorkspaceTheme 2026-05-05-02:58
 * Combined-mode project headers consume the persisted workspace theme color
 * through one CSS variable so folder icons, titles, and hover surfaces can
 * share the same tint without changing chat or browser group styling.
 */
function getProjectThemeStyle(themeColor: string | undefined): CSSProperties | undefined {
  if (!themeColor) {
    return undefined;
  }

  return {
    "--workspace-project-theme-color": themeColor,
  } as CSSProperties;
}

function getProjectThemeSwatchStyle(themeColor: string | undefined): CSSProperties | undefined {
  if (!themeColor) {
    return undefined;
  }

  return {
    "--workspace-dock-button-background": themeColor,
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

type GroupContextMenuPosition = ContextMenuPosition & {
  view: "group" | "project-custom-theme" | "project-themes";
};

type GroupControlMenu = "visible-count";

export function getEmptyBrowserGroupExpandTooltip({
  browserTabCount,
  isBrowserGroup,
  isCollapsed,
}: {
  browserTabCount: number;
  isBrowserGroup: boolean;
  isCollapsed: boolean;
}): string | undefined {
  /**
   * CDXC:SidebarGroups 2026-04-23-15:00
   * Collapsed browser groups with zero live tabs should not expand into an empty
   * shell. Keep the header inert in that state and surface a hover explanation
   * instead so the user sees why nothing opens.
   */
  return isBrowserGroup && browserTabCount === 0 && isCollapsed
    ? "No browser tabs open"
    : undefined;
}

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
  sessionDraggingDisabled?: boolean;
  showHeaderActions?: boolean;
  showSessionDropPositionIndicators?: boolean;
  vscode: WebviewApi;
};

function clampContextMenuPosition(
  clientX: number,
  clientY: number,
  itemCount: number,
): GroupContextMenuPosition {
  const menuHeight = CONTEXT_MENU_VERTICAL_PADDING_PX + itemCount * CONTEXT_MENU_ITEM_HEIGHT_PX;
  return {
    view: "group",
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
  sessionDraggingDisabled = false,
  showHeaderActions = true,
  showSessionDropPositionIndicators = true,
  vscode,
}: SessionGroupSectionProps) {
  const group = useSidebarStore((state) => state.groupsById[groupId]);
  const storedSessionIds = useSidebarStore((state) => state.sessionIdsByGroup[groupId] ?? []);
  const sessionsById = useSidebarStore((state) => state.sessionsById);
  const orderedSessionIds = orderedSessionIdsProp ?? storedSessionIds;
  const [contextMenuPosition, setContextMenuPosition] = useState<GroupContextMenuPosition>();
  const [customThemeColor, setCustomThemeColor] = useState(DEFAULT_WORKSPACE_THEME_COLOR);
  const [recentThemeColors, setRecentThemeColors] = useState(readWorkspaceThemeColorHistory);
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
  /**
   * CDXC:Projects 2026-05-04-14:49
   * Project group headers use folder metaphors: closed folder when collapsed
   * and open folder when expanded. The synthetic Chats group keeps the chat
   * glyph so users can distinguish projectless conversations from projects.
   *
   * CDXC:Chats 2026-05-04-09:41
   * The Combined-mode Chats header is a synthetic collection, not one mutable
   * project group. It can create new chat folders, but it must not accept
   * session drops, group dragging, or project/group context-menu mutations.
   */
  const isChatCollection = group?.isChatCollection === true;
  const projectContext = group?.projectContext;
  /**
   * CDXC:SidebarMode 2026-05-03-10:42
   * Combined mode keeps project groups draggable while disabling session drag
   * targets. That prevents session moves across project boundaries without
   * taking away the requested project-group reordering.
   */
  const areSessionDropTargetsDisabled = draggingDisabled || sessionDraggingDisabled;
  const debuggingMode = useSidebarStore((state) => state.hud.debuggingMode);
  const selectedIdeTarget = useSidebarStore(
    (state) => state.hud.settings?.zedOverlayTargetApp ?? DEFAULT_zmux_SETTINGS.zedOverlayTargetApp,
  );
  const selectedIdeLabel = getZedOverlayTargetAppLabel(selectedIdeTarget);
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
    disabled: isBrowserGroup || isChatCollection || draggingDisabled,
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
    disabled: isBrowserGroup || isChatCollection || areSessionDropTargetsDisabled,
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
  const actualSessionCount = storedSessionIds.length;
  const allSessionsSleeping =
    groupSessions.length > 0 && groupSessions.every((session) => session.isSleeping);
  const browserTabCount = isBrowserGroup ? groupSessions.length : 0;
  const emptyBrowserExpandTooltip = getEmptyBrowserGroupExpandTooltip({
    browserTabCount,
    isBrowserGroup,
    isCollapsed,
  });
  const canFullReloadGroup = groupSessions.length > 0;
  const collapsedIndicatorActivity = sessionSummary.indicatorActivity;
  const hasCollapsedSummary = collapsedIndicatorActivity !== undefined;
  const collapsedSummaryLabel = getCollapsedSummaryLabel(collapsedIndicatorActivity);
  const sessionsRegionId = `${group.groupId}-sessions`;
  const groupHeaderAnchorStyle = {
    anchorName: getGroupStatusAnchorName(group.groupId),
  } as CSSProperties;
  const projectThemeStyle = getProjectThemeStyle(projectContext?.themeColor);
  const groupHeaderStyle = projectThemeStyle
    ? ({ ...groupHeaderAnchorStyle, ...projectThemeStyle } as CSSProperties)
    : groupHeaderAnchorStyle;

  const isGroupDropTarget =
    sortable.isDropTarget ||
    emptyGroupDropTarget.isDropTarget ||
    sessionDropIndicatorGroupId === groupId;
  const showSessionGroupConnector = shouldShowSessionGroupConnector({
    groupKind: group.kind,
    sessions: groupSessions,
  });
  const emptyStateLabel = isBrowserGroup ? "No browsers" : "No sessions";
  const shouldSelectEmptyProject = Boolean(projectContext && actualSessionCount === 0);
  /**
   * CDXC:SidebarGroups 2026-05-05-04:48
   * Empty project and Chats sections are not expandable; they stay collapsed
   * until a session appears. Keep their real folder/chat icon visible instead
   * of exposing a chevron that cannot expand anything.
   */
  const canToggleCollapsed = actualSessionCount > 0 && emptyBrowserExpandTooltip === undefined;

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

  const openProjectThemeMenu = () => {
    setContextMenuPosition((currentPosition) =>
      currentPosition ? { ...currentPosition, view: "project-themes" } : currentPosition,
    );
  };

  const openProjectCustomThemeMenu = () => {
    setCustomThemeColor(
      projectContext?.themeColor ?? recentThemeColors[0] ?? DEFAULT_WORKSPACE_THEME_COLOR,
    );
    setContextMenuPosition((currentPosition) =>
      currentPosition ? { ...currentPosition, view: "project-custom-theme" } : currentPosition,
    );
  };

  const openProjectRootMenu = () => {
    setContextMenuPosition((currentPosition) =>
      currentPosition ? { ...currentPosition, view: "group" } : currentPosition,
    );
  };

  const copyProjectPath = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      groupId: group.groupId,
      type: "copyWorkspaceProjectPathForGroup",
    });
  };

  const openProjectInFinder = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      groupId: group.groupId,
      type: "openWorkspaceProjectInFinderForGroup",
    });
  };

  const openProjectInIde = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      groupId: group.groupId,
      type: "openWorkspaceProjectInIdeForGroup",
    });
  };

  const chooseProjectTheme = (theme: SidebarTheme) => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      groupId: group.groupId,
      theme,
      themeColor: null,
      type: "setWorkspaceProjectThemeForGroup",
    });
  };

  const chooseProjectThemeColor = (themeColor: string) => {
    const normalizedColor = normalizeWorkspaceThemeColor(themeColor);
    if (!normalizedColor) {
      return;
    }

    setContextMenuPosition(undefined);
    const nextRecentThemeColors = updateWorkspaceThemeColorHistory(
      recentThemeColors,
      normalizedColor,
    );
    setRecentThemeColors(nextRecentThemeColors);
    writeWorkspaceThemeColorHistory(nextRecentThemeColors);
    vscode.postMessage({
      groupId: group.groupId,
      themeColor: normalizedColor,
      type: "setWorkspaceProjectThemeForGroup",
    });
  };

  const closeProject = () => {
    if (!projectContext?.canRemoveProject) {
      return;
    }

    setContextMenuPosition(undefined);
    vscode.postMessage({
      groupId: group.groupId,
      type: "closeWorkspaceProjectForGroup",
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
    if (!canToggleCollapsed) {
      return;
    }

    onCollapsedChange(group.groupId, !isCollapsed);
  };

  const toggleCollapsedOrSelectEmptyProject = () => {
    if (shouldSelectEmptyProject) {
      /**
       * CDXC:SidebarMode 2026-05-04-06:52
       * Empty Combined-mode project groups are project selectors, not empty
       * session buckets. Selecting one makes the next agent/action launch use
       * that project, and the placeholder stays hidden.
       */
      requestFocusGroup();
      return;
    }

    toggleCollapsed();
  };

  const handleGroupHeaderClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isEditing || emptyBrowserExpandTooltip) {
      return;
    }

    if (event.target instanceof Element && event.target.closest(".group-header-actions")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleCollapsedOrSelectEmptyProject();
  };

  return (
    <>
      <section
        className="group"
        data-active={String(group.isActive)}
        data-collapsed={String(isCollapsed)}
        data-dragging={String(Boolean(sortable.isDragging))}
        data-drop-target={String(isGroupDropTarget)}
        data-empty-space-blocking="true"
        data-empty-project={String(shouldSelectEmptyProject)}
        data-session-connector={String(showSessionGroupConnector)}
        data-sidebar-group-id={group.groupId}
        data-workspace-custom-theme={String(Boolean(projectContext?.themeColor))}
        onClick={() => {
          if (isBrowserGroup || isCollapsed) {
            return;
          }

          requestFocusGroup();
        }}
        onContextMenu={(event: ReactMouseEvent<HTMLElement>) => {
          if (isBrowserGroup || isChatCollection || (!showHeaderActions && !projectContext)) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          setContextMenuPosition(
            clampContextMenuPosition(
              event.clientX,
              event.clientY,
              projectContext ? 5 : 3 + Number(canFullReloadGroup),
            ),
          );
        }}
        ref={sortable.ref}
      >
        <div
          className="group-head"
          data-collapsible="true"
          onClick={handleGroupHeaderClick}
          style={groupHeaderStyle}
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
                {emptyBrowserExpandTooltip ? (
                  <Tooltip.Provider delay={100}>
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        render={
                          <button
                            aria-controls={canToggleCollapsed && !isCollapsed ? sessionsRegionId : undefined}
                            aria-disabled="true"
                            aria-expanded={canToggleCollapsed ? !isCollapsed : undefined}
                            aria-label={emptyBrowserExpandTooltip}
                            className="group-collapse-button section-titlebar-toggle"
                            data-collapsed={String(isCollapsed)}
                            data-empty-browser-group="true"
                            data-has-idle-icon={String(canToggleCollapsed)}
                            data-static-icon={String(!canToggleCollapsed)}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleCollapsedOrSelectEmptyProject();
                            }}
                            type="button"
                          >
                            <span
                              aria-hidden="true"
                              className="group-collapse-icon group-collapse-idle-icon section-titlebar-toggle-icon section-titlebar-toggle-idle-icon"
                            >
                              <IconWorld size={16} stroke={1.8} />
                            </span>
                            {canToggleCollapsed ? (
                              <IconCaretRightFilled
                                aria-hidden="true"
                                className="group-collapse-icon group-collapse-chevron-icon section-titlebar-toggle-icon section-titlebar-toggle-chevron-icon"
                                size={16}
                              />
                            ) : null}
                          </button>
                        }
                      />
                      <Tooltip.Portal>
                        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
                          <Tooltip.Popup className="tooltip-popup">
                            {emptyBrowserExpandTooltip}
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                ) : (
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      render={
                        <button
                          aria-controls={
                            canToggleCollapsed && !isCollapsed ? sessionsRegionId : undefined
                          }
                          aria-disabled={!canToggleCollapsed && !shouldSelectEmptyProject}
                          aria-expanded={canToggleCollapsed ? !isCollapsed : undefined}
                          aria-label={
                            shouldSelectEmptyProject
                              ? `Select ${group.title}`
                              : canToggleCollapsed
                                ? `${isCollapsed ? "Expand" : "Collapse"} ${group.title}`
                                : group.title
                          }
                          className="group-collapse-button section-titlebar-toggle"
                          data-collapsed={String(isCollapsed)}
                          data-empty-project={String(shouldSelectEmptyProject)}
                          data-has-idle-icon={String(canToggleCollapsed)}
                          data-static-icon={String(!canToggleCollapsed)}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleCollapsedOrSelectEmptyProject();
                          }}
                          type="button"
                        >
                          <span
                            aria-hidden="true"
                            className="group-collapse-icon group-collapse-idle-icon section-titlebar-toggle-icon section-titlebar-toggle-idle-icon"
                          >
                            {isBrowserGroup ? (
                              <IconWorld size={16} stroke={1.8} />
                            ) : isChatCollection ? (
                              <IconMessageCircle size={16} stroke={1.8} />
                            ) : isCollapsed ? (
                              <IconFolder size={16} stroke={1.8} />
                            ) : (
                              <IconFolderOpen size={16} stroke={1.8} />
                            )}
                          </span>
                          {canToggleCollapsed ? (
                            <IconCaretRightFilled
                              aria-hidden="true"
                              className="group-collapse-icon group-collapse-chevron-icon section-titlebar-toggle-icon section-titlebar-toggle-chevron-icon"
                              size={16}
                            />
                          ) : null}
                        </button>
                      }
                    />
                  </Tooltip.Root>
                )}
                <div
                  className="group-title-handle"
                  data-draggable={String(!isBrowserGroup && !isChatCollection)}
                  ref={isBrowserGroup || isChatCollection ? undefined : sortable.handleRef}
                >
                  <button
                    aria-controls={canToggleCollapsed && !isCollapsed ? sessionsRegionId : undefined}
                    aria-disabled={
                      emptyBrowserExpandTooltip !== undefined ||
                      (!canToggleCollapsed && !shouldSelectEmptyProject)
                    }
                    aria-expanded={canToggleCollapsed ? !isCollapsed : undefined}
                    aria-label={
                      emptyBrowserExpandTooltip ??
                      (shouldSelectEmptyProject
                        ? `Select ${group.title}`
                        : canToggleCollapsed
                          ? `${isCollapsed ? "Expand" : "Collapse"} ${group.title}`
                          : group.title)
                    }
                    className="group-title-button"
                    data-empty-browser-group={String(emptyBrowserExpandTooltip !== undefined)}
                    data-empty-project={String(shouldSelectEmptyProject)}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleCollapsedOrSelectEmptyProject();
                    }}
                    title={
                      emptyBrowserExpandTooltip ??
                      (shouldSelectEmptyProject
                        ? `Select ${group.title}`
                        : canToggleCollapsed
                          ? `${isCollapsed ? "Expand" : "Collapse"} ${group.title}`
                          : group.title)
                    }
                    type="button"
                  >
                    <span className="group-title section-titlebar-label">{group.title}</span>
                  </button>
                </div>
                <div className="group-title-spacer" />
                {/*
                 * CDXC:SidebarGroups 2026-04-28-02:41
                 * Browser section headers should stay visually quiet: do not
                 * render the live tab-count badge next to "Browsers". Keep the
                 * count only for empty-state and collapse behavior.
                 */}
                {showHeaderActions ? (
                  <div
                    className="group-header-actions"
                    data-open={String(openControlMenu !== undefined)}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    {group.isActive && !isBrowserGroup && !isChatCollection ? (
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
                    <button
                      aria-label={
                        isBrowserGroup
                          ? `Open a browser in ${group.title}`
                          : isChatCollection
                            ? `Create a chat in ${group.title}`
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
                          : isChatCollection
                            ? `Create a chat in ${group.title}`
                          : `Create a session in ${group.title}`
                      }
                      type="button"
                    >
                      <IconPlus aria-hidden="true" className="group-add-icon" size={14} stroke={2} />
                    </button>
                  </div>
                ) : null}
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
                  dragDisabled={areSessionDropTargetsDisabled}
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
            ) : shouldSelectEmptyProject ? null : (
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
              {projectContext ? (
                contextMenuPosition.view === "project-themes" ? (
                  <>
                    <button
                      className="session-context-menu-item"
                      onClick={openProjectRootMenu}
                      role="menuitem"
                      type="button"
                    >
                      <IconChevronLeft
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Back
                    </button>
                    <div className="session-context-menu-divider" role="separator" />
                    <button
                      className="session-context-menu-item workspace-dock-theme-menu-item"
                      data-selected={String(Boolean(projectContext.themeColor))}
                      onClick={openProjectCustomThemeMenu}
                      role="menuitemradio"
                      type="button"
                    >
                      <span
                        className="workspace-dock-theme-swatch"
                        style={getProjectThemeSwatchStyle(
                          projectContext.themeColor ??
                            recentThemeColors[0] ??
                            DEFAULT_WORKSPACE_THEME_COLOR,
                        )}
                      />
                      Custom
                      <IconChevronRight
                        aria-hidden="true"
                        className="session-context-menu-trailing-icon"
                        size={14}
                      />
                    </button>
                    {PROJECT_CONTEXT_THEME_OPTIONS.map((theme) => (
                      <button
                        className="session-context-menu-item workspace-dock-theme-menu-item"
                        data-selected={String(
                          !projectContext.themeColor && projectContext.theme === theme.value,
                        )}
                        key={theme.value}
                        onClick={() => chooseProjectTheme(theme.value)}
                        role="menuitemradio"
                        type="button"
                      >
                        <span
                          className="workspace-dock-theme-swatch"
                          data-workspace-theme={theme.value}
                        />
                        {theme.label}
                      </button>
                    ))}
                  </>
                ) : contextMenuPosition.view === "project-custom-theme" ? (
                  <>
                    <button
                      className="session-context-menu-item"
                      onClick={openProjectThemeMenu}
                      role="menuitem"
                      type="button"
                    >
                      <IconChevronLeft
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Back
                    </button>
                    <div className="session-context-menu-divider" role="separator" />
                    <div className="workspace-theme-custom-picker">
                      {/*
                       * CDXC:WorkspaceTheme 2026-05-05-02:58
                       * Combined-mode project headers use the same Theme menu
                       * custom color picker as the workspace dock. Applying a
                       * color posts a validated project theme color and records
                       * it in the local recent-color palette.
                       */}
                      <input
                        aria-label="Custom workspace theme color"
                        className="workspace-theme-color-input"
                        onChange={(event) => {
                          const normalizedColor = normalizeWorkspaceThemeColor(
                            event.currentTarget.value,
                          );
                          if (normalizedColor) {
                            setCustomThemeColor(normalizedColor);
                          }
                        }}
                        type="color"
                        value={customThemeColor}
                      />
                      <input
                        aria-label="Custom workspace theme color hex"
                        className="workspace-theme-color-text"
                        onChange={(event) => {
                          const normalizedColor = normalizeWorkspaceThemeColor(
                            event.currentTarget.value,
                          );
                          if (normalizedColor) {
                            setCustomThemeColor(normalizedColor);
                          }
                        }}
                        value={customThemeColor}
                      />
                      <button
                        aria-label="Apply custom workspace theme color"
                        className="workspace-theme-color-apply"
                        onClick={() => chooseProjectThemeColor(customThemeColor)}
                        type="button"
                      >
                        <IconCheck aria-hidden="true" size={14} stroke={2.2} />
                      </button>
                    </div>
                    {recentThemeColors.length > 0 ? (
                      <div className="workspace-theme-color-palette">
                        {recentThemeColors.map((themeColor) => (
                          <button
                            aria-label={`Use ${themeColor}`}
                            className="workspace-theme-color-palette-button"
                            key={themeColor}
                            onClick={() => chooseProjectThemeColor(themeColor)}
                            style={getProjectThemeSwatchStyle(themeColor)}
                            type="button"
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {/*
                     * CDXC:SidebarMode 2026-05-03-19:19
                     * Combined mode hides the workspace rail, so the project
                     * group's right-click menu owns Theme, Copy Path, and
                     * Close Project actions for that project.
                     * Close Project parks the project in Recent Projects
                     * without deleting saved sessions.
                     * CDXC:WorkspaceActions 2026-05-04-08:22
                     * Project cards must also expose direct "open project"
                     * commands: Finder reveals the workspace folder, while
                     * the IDE action targets the selected IDE from Settings.
                     */}
                    <button
                      className="session-context-menu-item"
                      onClick={openProjectThemeMenu}
                      role="menuitem"
                      type="button"
                    >
                      <IconPalette
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Theme
                      <IconChevronRight
                        aria-hidden="true"
                        className="session-context-menu-trailing-icon"
                        size={14}
                      />
                    </button>
                    <button
                      className="session-context-menu-item"
                      onClick={copyProjectPath}
                      role="menuitem"
                      type="button"
                    >
                      <IconCopy
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Copy Path
                    </button>
                    <button
                      className="session-context-menu-item"
                      onClick={openProjectInFinder}
                      role="menuitem"
                      type="button"
                    >
                      <IconFolderOpen
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Open in Finder
                    </button>
                    <button
                      className="session-context-menu-item"
                      onClick={openProjectInIde}
                      role="menuitem"
                      type="button"
                    >
                      <IconCode
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Open in {selectedIdeLabel}
                    </button>
                    <div className="session-context-menu-divider" role="separator" />
                    <button
                      className="session-context-menu-item session-context-menu-item-danger"
                      disabled={!projectContext.canRemoveProject}
                      onClick={closeProject}
                      role="menuitem"
                      type="button"
                    >
                      <IconTrash
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Close Project
                    </button>
                  </>
                )
              ) : (
                <>
                  <button
                    className="session-context-menu-item"
                    onClick={() => {
                      setContextMenuPosition(undefined);
                      setIsEditing(true);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <IconPencil
                      aria-hidden="true"
                      className="session-context-menu-icon"
                      size={14}
                    />
                    Rename
                  </button>
                  {canFullReloadGroup ? (
                    <button
                      className="session-context-menu-item"
                      onClick={requestFullReloadGroup}
                      role="menuitem"
                      type="button"
                    >
                      <IconRefresh
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
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
                      <IconMoon
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
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
                </>
              )}
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
    return "Group has working sessions";
  }

  return undefined;
}
