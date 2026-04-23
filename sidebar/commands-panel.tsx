import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import {
  IconBox,
  IconBug,
  IconChevronLeft,
  IconLoader2,
  IconPencil,
  IconPlayerPlayFilled,
  IconPlus,
  IconTrash,
  IconWorldFilled,
} from "@tabler/icons-react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useShallow } from "zustand/react/shallow";
import type {
  SidebarActionType,
  SidebarCommandButton,
  SidebarCommandRunMode,
} from "../shared/sidebar-commands";
import { getSidebarCommandIconLabel } from "../shared/sidebar-command-icons";
import type {
  SidebarCommandSessionIndicator,
  SidebarProjectWorktree,
} from "../shared/session-grid-contract";
import { getSidebarButtonGridColumnCount } from "./button-grid";
import { getCommandButtonAriaLabel, getCommandButtonTooltip } from "./command-button-copy";
import {
  getSidebarCommandRunFeedbackDuration,
  getSidebarCommandRunModeForClick,
  type SidebarCommandRunFeedbackState,
} from "./command-run-feedback";
import { GitActionRow } from "./git-action-row";
import { postSidebarOrderReproLog } from "./sidebar-order-repro-log";
import { SectionHeader } from "./section-header";
import { useSidebarStore } from "./sidebar-store";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { useCollapsibleHeight } from "./use-collapsible-height";
import { SidebarCommandIconGlyph } from "./sidebar-command-icon";
import { CommandConfigModal, type CommandConfigDraft } from "./command-config-modal";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 188;
const CONTEXT_MENU_VERTICAL_PADDING_PX = 24;
const CONTEXT_MENU_ITEM_HEIGHT_PX = 43;
const CONTEXT_MENU_DIVIDER_HEIGHT_PX = 13;
const CONTEXT_MENU_DIVIDER_COUNT = 2;
const REORDER_SYNC_TIMEOUT_MS = 3_000;
const EMPTY_PROJECT_WORKTREES: SidebarProjectWorktree[] = [];

type CommandsPanelProps = {
  createActionType?: SidebarActionType;
  createRequestId: number;
  isCollapsed: boolean;
  isVisible: boolean;
  onBrowserCommandRun?: () => void;
  onToggleCollapsed: (collapsed: boolean) => void;
  showGitButton: boolean;
  titlebarActions?: ReactNode;
  vscode: WebviewApi;
};

type ContextMenuPosition = {
  x: number;
  y: number;
};

type CommandMenuState = {
  anchor: ContextMenuPosition;
  command: SidebarCommandButton;
  position: ContextMenuPosition;
  view: "root" | "worktrees";
  worktrees: SidebarProjectWorktree[];
  worktreeRunMode?: SidebarCommandRunMode;
};

type CommandDragData = {
  commandId: string;
  kind: "sidebar-command";
};

type PendingOrderSync = {
  requestId: string;
  timeoutId: number;
};

type PendingCommandRunClear = {
  status: SidebarCommandRunFeedbackState["status"];
  timeoutId: number;
};

function clampContextMenuPosition(
  clientX: number,
  clientY: number,
  menu: Pick<CommandMenuState, "command" | "view" | "worktrees">,
): ContextMenuPosition {
  const menuHeight = getContextMenuHeight(menu);

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

function getContextMenuHeight(
  menu: Pick<CommandMenuState, "command" | "view" | "worktrees">,
): number {
  if (menu.view === "worktrees") {
    return (
      CONTEXT_MENU_VERTICAL_PADDING_PX +
      CONTEXT_MENU_ITEM_HEIGHT_PX * (menu.worktrees.length + 1) +
      CONTEXT_MENU_DIVIDER_HEIGHT_PX
    );
  }

  const runActionCount =
    4 +
    Number(menu.command.actionType === "terminal") +
    Number(menu.command.actionType === "terminal" && menu.worktrees.length > 0) * 2;

  return (
    CONTEXT_MENU_VERTICAL_PADDING_PX +
    CONTEXT_MENU_ITEM_HEIGHT_PX * runActionCount +
    CONTEXT_MENU_DIVIDER_HEIGHT_PX * CONTEXT_MENU_DIVIDER_COUNT
  );
}

function createCommandDraft(actionType: SidebarActionType): CommandConfigDraft {
  return {
    actionType,
    closeTerminalOnExit: false,
    command: actionType === "browser" ? undefined : "",
    commandId: undefined,
    icon: undefined,
    iconColor: undefined,
    isGlobal: false,
    name: "",
    playCompletionSound: actionType === "browser" ? false : true,
    url: actionType === "browser" ? undefined : "",
  };
}

function createCommandDragData(commandId: string): CommandDragData {
  return {
    commandId,
    kind: "sidebar-command",
  };
}

function getCommandDragData(candidate: unknown): CommandDragData | undefined {
  if (!hasData(candidate)) {
    return undefined;
  }

  const data = candidate.data;
  if (!isObjectRecord(data) || !("kind" in data)) {
    return undefined;
  }

  return data.kind === "sidebar-command" && typeof data.commandId === "string"
    ? {
        commandId: data.commandId,
        kind: "sidebar-command",
      }
    : undefined;
}

export function CommandsPanel({
  createActionType,
  createRequestId,
  isCollapsed,
  isVisible,
  onBrowserCommandRun,
  onToggleCollapsed,
  showGitButton,
  titlebarActions,
  vscode,
}: CommandsPanelProps) {
  const {
    commandSessionIndicators,
    commands,
    git,
    projectWorktrees: rawProjectWorktrees,
  } = useSidebarStore(
    useShallow((state) => ({
      commandSessionIndicators: state.hud.commandSessionIndicators,
      commands: state.hud.commands,
      git: state.hud.git,
      projectWorktrees: state.hud.projectWorktrees,
    })),
  );
  const projectWorktrees = rawProjectWorktrees ?? EMPTY_PROJECT_WORKTREES;
  const commandSessionIndicatorByCommandId = useMemo(
    () =>
      new Map(
        commandSessionIndicators.map((indicator) => [indicator.commandId, indicator] as const),
      ),
    [commandSessionIndicators],
  );
  const commandRunStates = useSidebarStore((state) => state.commandRunStates);
  const clearCommandRunState = useSidebarStore((state) => state.clearCommandRunState);
  const latestCommandOrderSyncResult = useSidebarStore(
    (state) => state.latestCommandOrderSyncResult,
  );
  const [contextMenu, setContextMenu] = useState<CommandMenuState>();
  const [draftCommandIds, setDraftCommandIds] = useState<string[] | undefined>();
  const [editingCommand, setEditingCommand] = useState<CommandConfigDraft>();
  const gridRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingOrderSyncRef = useRef<PendingOrderSync>();
  const pendingCommandRunClearRef = useRef(new Map<string, PendingCommandRunClear>());
  const lastLoggedLayoutRef = useRef<string>();
  const lastLoggedOrderStateRef = useRef<string>();
  const { collapsibleStyle, contentRef } = useCollapsibleHeight<HTMLDivElement>();

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isNode(event.target) && menuRef.current?.contains(event.target)) {
        return;
      }

      setContextMenu(undefined);
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (isNode(event.target) && menuRef.current?.contains(event.target)) {
        return;
      }

      setContextMenu(undefined);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(undefined);
      }
    };
    const handleBlur = () => {
      setContextMenu(undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setContextMenu(undefined);
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
  }, [contextMenu]);

  const openCommandEditor = (command: SidebarCommandButton) => {
    setEditingCommand({
      actionType: command.actionType,
      closeTerminalOnExit: command.closeTerminalOnExit,
      command: command.command,
      commandId: command.commandId,
      icon: command.icon,
      iconColor: command.iconColor,
      isGlobal: command.isGlobal === true,
      name: command.name,
      playCompletionSound: command.playCompletionSound,
      url: command.url,
    });
  };

  const openCreateCommandEditor = (actionType: SidebarActionType) => {
    setEditingCommand(createCommandDraft(actionType));
  };

  const runOrConfigureCommand = (
    command: SidebarCommandButton,
    runMode?: SidebarCommandRunMode,
  ) => {
    if (
      (command.actionType === "browser" && !command.url) ||
      (command.actionType === "terminal" && !command.command)
    ) {
      openCommandEditor(command);
      return;
    }

    if (command.actionType === "browser") {
      onBrowserCommandRun?.();
    }

    vscode.postMessage({
      commandId: command.commandId,
      runMode:
        runMode ?? getSidebarCommandRunModeForClick(command, commandRunStates[command.commandId]),
      type: "runSidebarCommand",
    });
  };

  useEffect(() => {
    setDraftCommandIds((previousDraft) => {
      const nextDraft = reconcileDraftCommandIds(previousDraft, commands);
      if (previousDraft || nextDraft) {
        postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.reconcileDraft", {
          nextDraftCommandIds: nextDraft ?? null,
          previousDraftCommandIds: previousDraft ?? null,
          syncedCommandIds: commands.map((command) => command.commandId),
        });
      }
      return nextDraft;
    });
  }, [commands, vscode]);

  useEffect(
    () => () => {
      clearPendingOrderSync(pendingOrderSyncRef.current);
      pendingOrderSyncRef.current = undefined;
      clearPendingCommandRunClears(pendingCommandRunClearRef.current);
    },
    [],
  );

  useEffect(() => {
    const pendingClears = pendingCommandRunClearRef.current;

    for (const [commandId, pendingClear] of [...pendingClears.entries()]) {
      const runState = commandRunStates[commandId];
      const duration =
        runState && runState.activeRunIds.length === 0
          ? getSidebarCommandRunFeedbackDuration(runState.status)
          : undefined;

      if (!runState || duration === undefined || pendingClear.status !== runState.status) {
        window.clearTimeout(pendingClear.timeoutId);
        pendingClears.delete(commandId);
      }
    }

    for (const [commandId, runState] of Object.entries(commandRunStates)) {
      if (runState.activeRunIds.length > 0) {
        continue;
      }

      const duration = getSidebarCommandRunFeedbackDuration(runState.status);
      if (duration === undefined) {
        continue;
      }

      const pendingClear = pendingClears.get(commandId);
      if (pendingClear?.status === runState.status) {
        continue;
      }

      if (pendingClear) {
        window.clearTimeout(pendingClear.timeoutId);
      }

      pendingClears.set(commandId, {
        status: runState.status,
        timeoutId: window.setTimeout(() => {
          const latestPendingClear = pendingCommandRunClearRef.current.get(commandId);
          if (latestPendingClear?.status !== runState.status) {
            return;
          }

          pendingCommandRunClearRef.current.delete(commandId);
          clearCommandRunState(commandId);
        }, duration),
      });
    }
  }, [clearCommandRunState, commandRunStates]);

  useEffect(() => {
    const pendingOrderSync = pendingOrderSyncRef.current;
    if (
      !latestCommandOrderSyncResult ||
      !pendingOrderSync ||
      pendingOrderSync.requestId !== latestCommandOrderSyncResult.requestId
    ) {
      return;
    }

    clearPendingOrderSync(pendingOrderSync);
    pendingOrderSyncRef.current = undefined;

    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.syncResult", {
      draftCommandIds: draftCommandIds ?? null,
      itemIds: latestCommandOrderSyncResult.itemIds,
      requestId: latestCommandOrderSyncResult.requestId,
      status: latestCommandOrderSyncResult.status,
      syncedCommandIds: commands.map((command) => command.commandId),
    });

    if (latestCommandOrderSyncResult.status === "error") {
      setDraftCommandIds(undefined);
    }
  }, [commands, draftCommandIds, latestCommandOrderSyncResult, vscode]);

  useEffect(() => {
    if (createRequestId === 0) {
      return;
    }

    setContextMenu(undefined);
    setEditingCommand(createCommandDraft(createActionType ?? "terminal"));
  }, [createActionType, createRequestId]);

  const orderedCommands = useMemo(() => {
    const commandById = new Map<string, SidebarCommandButton>(
      commands.map((command) => [command.commandId, command]),
    );
    const orderedCommandIds = draftCommandIds
      ? mergeCommandIds(
          draftCommandIds,
          commands.map((command) => command.commandId),
        )
      : commands.map((command) => command.commandId);

    return orderedCommandIds
      .map((commandId) => commandById.get(commandId))
      .filter((command): command is SidebarCommandButton => command !== undefined);
  }, [commands, draftCommandIds]);
  const gridColumnCount = getSidebarButtonGridColumnCount(orderedCommands.length);
  const shouldRenderSection = isVisible;
  const shouldShowEmptyState = orderedCommands.length === 0;
  const openCommandContextMenu = (
    command: SidebarCommandButton,
    clientX: number,
    clientY: number,
  ) => {
    const worktrees = command.actionType === "terminal" ? projectWorktrees : [];
    const nextMenu: CommandMenuState = {
      anchor: {
        x: clientX,
        y: clientY,
      },
      command,
      position: {
        x: 0,
        y: 0,
      },
      view: "root",
      worktrees,
      worktreeRunMode: undefined,
    };
    nextMenu.position = clampContextMenuPosition(clientX, clientY, nextMenu);
    setContextMenu(nextMenu);
  };

  useEffect(() => {
    const payload = {
      draftCommandIds: draftCommandIds ?? null,
      orderedCommandIds: orderedCommands.map((command) => command.commandId),
      pendingRequestId: pendingOrderSyncRef.current?.requestId ?? null,
      shouldRenderSection,
      syncedCommandIds: commands.map((command) => command.commandId),
    };
    const nextFingerprint = JSON.stringify(payload);
    if (lastLoggedOrderStateRef.current === nextFingerprint) {
      return;
    }

    lastLoggedOrderStateRef.current = nextFingerprint;
    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.state", payload);
  }, [commands, draftCommandIds, orderedCommands, shouldRenderSection, vscode]);

  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) {
      return;
    }

    const logLayout = () => {
      const layout = describeRenderedButtonLayout(gridElement);
      const nextFingerprint = JSON.stringify(layout);
      if (lastLoggedLayoutRef.current === nextFingerprint) {
        return;
      }

      lastLoggedLayoutRef.current = nextFingerprint;
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.layout", layout);
    };

    const observer = new ResizeObserver(() => {
      logLayout();
    });
    observer.observe(gridElement);
    const animationFrameId = window.requestAnimationFrame(() => {
      logLayout();
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [orderedCommands, vscode]);

  const handleDragStart = ((event) => {
    if (!isSortableOperation(event.operation)) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragStartIgnored", {
        reason: "not-sortable-operation",
      });
      return;
    }

    const source = event.operation.source;
    const sourceData = source ? getCommandDragData(source) : undefined;
    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragStart", {
      initialIndex: source?.initialIndex ?? null,
      sourceCommandId: sourceData?.commandId ?? null,
    });
  }) satisfies DragDropEventHandlers["onDragStart"];

  const handleDragEnd = ((event) => {
    if (event.canceled) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragEndIgnored", {
        reason: "canceled",
      });
      return;
    }

    if (!isSortableOperation(event.operation)) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragEndIgnored", {
        reason: "not-sortable-operation",
      });
      return;
    }

    const { source, target } = event.operation;
    if (!source) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragEndIgnored", {
        hasSource: Boolean(source),
        hasTarget: Boolean(target),
        reason: "missing-source",
      });
      return;
    }

    const sourceData = getCommandDragData(source);
    if (!sourceData) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragEndIgnored", {
        reason: "invalid-source-data",
        sourceCommandId: sourceData?.commandId ?? null,
      });
      return;
    }

    const { initialIndex } = source;
    const projectedIndex =
      "index" in source && typeof source.index === "number" ? source.index : null;
    const targetIndex = projectedIndex ?? target?.index ?? null;
    if (targetIndex == null || initialIndex === targetIndex) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragEndIgnored", {
        initialIndex,
        projectedIndex,
        reason: "same-or-missing-target-index",
        targetIndex: targetIndex ?? null,
      });
      return;
    }

    const nextCommandIds = moveCommandId(
      orderedCommands.map((command) => command.commandId),
      initialIndex,
      targetIndex,
    );
    const requestId = createReorderRequestId();
    clearPendingOrderSync(pendingOrderSyncRef.current);
    pendingOrderSyncRef.current = {
      requestId,
      timeoutId: window.setTimeout(() => {
        if (pendingOrderSyncRef.current?.requestId !== requestId) {
          return;
        }

        pendingOrderSyncRef.current = undefined;
        postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.syncTimeout", {
          draftCommandIds: nextCommandIds,
          requestId,
          syncedCommandIds: commands.map((command) => command.commandId),
        });
        setDraftCommandIds(undefined);
      }, REORDER_SYNC_TIMEOUT_MS),
    };
    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.commands.dragEnd", {
      currentOrderedCommandIds: orderedCommands.map((command) => command.commandId),
      initialIndex,
      nextCommandIds,
      projectedIndex,
      requestId,
      syncedCommandIds: commands.map((command) => command.commandId),
      targetIndex,
    });
    setDraftCommandIds(nextCommandIds);
    vscode.postMessage({
      commandIds: nextCommandIds,
      requestId,
      type: "syncSidebarCommandOrder",
    });
  }) satisfies DragDropEventHandlers["onDragEnd"];

  return (
    <>
      {shouldRenderSection ? (
        <section className="commands-section" data-collapsed={String(isCollapsed)}>
          <SectionHeader
            actions={titlebarActions}
            idleIcon={<IconBox size={18} stroke={1.8} />}
            isCollapsed={isCollapsed}
            isCollapsible
            onToggleCollapsed={() => onToggleCollapsed(!isCollapsed)}
            title="Actions"
          />
          <div
            aria-hidden={isCollapsed}
            className="sidebar-collapse-shell"
            data-collapsed={String(isCollapsed)}
            style={collapsibleStyle}
          >
            <div
              className="card commands-panel commands-panel-shell sidebar-collapse-content"
              data-empty-space-blocking="true"
              ref={contentRef}
            >
              {showGitButton ? <GitActionRow git={git} vscode={vscode} /> : null}
              {shouldShowEmptyState ? (
                <button
                  className="sidebar-empty-create-button"
                  data-empty-space-blocking="true"
                  onClick={() => openCreateCommandEditor("terminal")}
                  type="button"
                >
                  <span aria-hidden="true" className="sidebar-empty-create-button-icon">
                    <IconPlus size={18} stroke={1.8} />
                  </span>
                  <span className="sidebar-empty-create-button-copy">
                    <span className="sidebar-empty-create-button-label">Create Action</span>
                    <span className="sidebar-empty-create-button-description">
                      Add a terminal shortcut back to the sidebar.
                    </span>
                  </span>
                </button>
              ) : (
                <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
                  <DragDropProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
                    <div
                      className="commands-grid"
                      ref={gridRef}
                      style={{ gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))` }}
                    >
                      {orderedCommands.map((command, index) => (
                        <SortableCommandButton
                          command={command}
                          commandRunState={
                            command.actionType === "terminal" && command.closeTerminalOnExit
                              ? commandRunStates[command.commandId]
                              : undefined
                          }
                          commandSessionIndicator={commandSessionIndicatorByCommandId.get(
                            command.commandId,
                          )}
                          index={index}
                          isActiveSessionIndicator={
                            commandSessionIndicatorByCommandId.get(command.commandId)?.isActive ===
                            true
                          }
                          isContextMenuOpen={contextMenu?.command.commandId === command.commandId}
                          key={command.commandId}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openCommandContextMenu(command, event.clientX, event.clientY);
                          }}
                          onRun={() => runOrConfigureCommand(command)}
                          vscode={vscode}
                        />
                      ))}
                    </div>
                  </DragDropProvider>
                </Tooltip.Provider>
              )}
            </div>
          </div>
        </section>
      ) : null}
      {contextMenu
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
                left: `${contextMenu.position.x}px`,
                top: `${contextMenu.position.y}px`,
                width: `${CONTEXT_MENU_WIDTH_PX}px`,
              }}
            >
              {contextMenu.view === "root" ? (
                <>
                  <button
                    className="session-context-menu-item"
                    onClick={() => {
                      setContextMenu(undefined);
                      openCommandEditor(contextMenu.command);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <IconPencil
                      aria-hidden="true"
                      className="session-context-menu-icon"
                      size={14}
                    />
                    Configure
                  </button>
                  <div className="session-context-menu-divider" role="separator" />
                  <button
                    className="session-context-menu-item"
                    onClick={() => {
                      setContextMenu(undefined);
                      openCreateCommandEditor("terminal");
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <IconPlus aria-hidden="true" className="session-context-menu-icon" size={14} />
                    Add Action
                  </button>
                  <button
                    className="session-context-menu-item"
                    onClick={() => {
                      setContextMenu(undefined);
                      openCreateCommandEditor("browser");
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <IconPlus aria-hidden="true" className="session-context-menu-icon" size={14} />
                    Add Webpage
                  </button>
                  <div className="session-context-menu-divider" role="separator" />
                  {contextMenu.command.actionType === "terminal" ? (
                    <button
                      className="session-context-menu-item"
                      onClick={() => {
                        setContextMenu(undefined);
                        runOrConfigureCommand(contextMenu.command, "debug");
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <IconBug aria-hidden="true" className="session-context-menu-icon" size={14} />
                      Debug Action
                    </button>
                  ) : null}
                  {contextMenu.command.actionType === "terminal" &&
                  contextMenu.worktrees.length > 0 ? (
                    <button
                      className="session-context-menu-item"
                      onClick={() => {
                        setContextMenu((currentMenu) => {
                          if (!currentMenu) {
                            return currentMenu;
                          }

                          const nextMenu: CommandMenuState = {
                            ...currentMenu,
                            view: "worktrees",
                            worktreeRunMode: "default",
                          };
                          nextMenu.position = clampContextMenuPosition(
                            currentMenu.anchor.x,
                            currentMenu.anchor.y,
                            nextMenu,
                          );
                          return nextMenu;
                        });
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <IconPlayerPlayFilled
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      Run on Worktree
                    </button>
                  ) : null}
                  {contextMenu.command.actionType === "terminal" &&
                  contextMenu.worktrees.length > 0 ? (
                    <>
                      <button
                        className="session-context-menu-item"
                        onClick={() => {
                          setContextMenu((currentMenu) => {
                            if (!currentMenu) {
                              return currentMenu;
                            }

                            const nextMenu: CommandMenuState = {
                              ...currentMenu,
                              view: "worktrees",
                              worktreeRunMode: "debug",
                            };
                            nextMenu.position = clampContextMenuPosition(
                              currentMenu.anchor.x,
                              currentMenu.anchor.y,
                              nextMenu,
                            );
                            return nextMenu;
                          });
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <IconBug
                          aria-hidden="true"
                          className="session-context-menu-icon"
                          size={14}
                        />
                        Debug on Worktree
                      </button>
                      <div className="session-context-menu-divider" role="separator" />
                    </>
                  ) : null}
                  <button
                    className="session-context-menu-item session-context-menu-item-danger"
                    onClick={() => {
                      setContextMenu(undefined);
                      vscode.postMessage({
                        commandId: contextMenu.command.commandId,
                        type: "deleteSidebarCommand",
                      });
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <IconTrash aria-hidden="true" className="session-context-menu-icon" size={14} />
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="session-context-menu-item"
                    onClick={() => {
                      setContextMenu((currentMenu) => {
                        if (!currentMenu) {
                          return currentMenu;
                        }

                        const nextMenu: CommandMenuState = {
                          ...currentMenu,
                          view: "root",
                          worktreeRunMode: undefined,
                        };
                        nextMenu.position = clampContextMenuPosition(
                          currentMenu.anchor.x,
                          currentMenu.anchor.y,
                          nextMenu,
                        );
                        return nextMenu;
                      });
                    }}
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
                  {contextMenu.worktrees.map((worktree) => (
                    <button
                      className="session-context-menu-item"
                      key={worktree.directory}
                      onClick={() => {
                        setContextMenu(undefined);
                        vscode.postMessage({
                          commandId: contextMenu.command.commandId,
                          ...(contextMenu.worktreeRunMode
                            ? { runMode: contextMenu.worktreeRunMode }
                            : {}),
                          type: "runSidebarCommand",
                          worktreePath: worktree.directory,
                        });
                      }}
                      role="menuitem"
                      title={worktree.directory}
                      type="button"
                    >
                      <IconPlayerPlayFilled
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                      {formatWorktreeMenuLabel(worktree)}
                    </button>
                  ))}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
      {editingCommand ? (
        <CommandConfigModal
          draft={editingCommand}
          isOpen
          lockedActionType={editingCommand.commandId ? undefined : createActionType}
          onCancel={() => setEditingCommand(undefined)}
          onSave={(draft) => {
            setEditingCommand(undefined);
            vscode.postMessage({
              actionType: draft.actionType,
              closeTerminalOnExit: draft.closeTerminalOnExit,
              command: draft.command,
              commandId: draft.commandId,
              icon: draft.icon,
              iconColor: draft.iconColor,
              isGlobal: draft.isGlobal,
              name: draft.name,
              playCompletionSound: draft.playCompletionSound,
              type: "saveSidebarCommand",
              url: draft.url,
            });
          }}
        />
      ) : null}
    </>
  );
}
function formatWorktreeMenuLabel(worktree: SidebarProjectWorktree): string {
  return worktree.branch ?? worktree.name;
}

type SortableCommandButtonProps = {
  command: SidebarCommandButton;
  commandRunState: SidebarCommandRunFeedbackState | undefined;
  commandSessionIndicator: SidebarCommandSessionIndicator | undefined;
  index: number;
  isActiveSessionIndicator: boolean;
  isContextMenuOpen: boolean;
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onRun: () => void;
  vscode: WebviewApi;
};

function SortableCommandButton({
  command,
  commandRunState,
  commandSessionIndicator,
  index,
  isActiveSessionIndicator,
  isContextMenuOpen,
  onContextMenu,
  onRun,
  vscode,
}: SortableCommandButtonProps) {
  const trimmedName = command.name.trim();
  const isIconOnly = trimmedName.length === 0;
  const runStatus = commandRunState?.status ?? "idle";

  const sortable = useSortable({
    accept: "sidebar-command",
    data: createCommandDragData(command.commandId),
    disabled: isContextMenuOpen || runStatus === "running",
    group: "sidebar-commands",
    id: command.commandId,
    index,
    type: "sidebar-command",
  });
  const setShellRef = (element: HTMLDivElement | null) => {
    sortable.ref(element);
  };
  const setButtonRef = (element: HTMLButtonElement | null) => {
    sortable.sourceRef(element);
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <div
            className="command-button-shell"
            data-sidebar-order-id={command.commandId}
            ref={setShellRef}
          >
            <button
              aria-busy={runStatus === "running"}
              aria-label={
                runStatus === "running"
                  ? getLoadingCommandButtonAriaLabel(command)
                  : getCommandButtonAriaLabel(command)
              }
              className="command-button"
              data-configured={String(isConfigured(command))}
              data-default={String(command.isDefault)}
              data-dragging={String(Boolean(sortable.isDragging))}
              data-empty-space-blocking="true"
              data-has-icon={String(command.icon !== undefined || runStatus === "running")}
              data-icon-only={String(isIconOnly)}
              data-has-session-indicator={String(commandSessionIndicator !== undefined)}
              data-loading={String(runStatus === "running")}
              data-run-status={runStatus}
              draggable={false}
              onClick={runStatus === "running" ? undefined : onRun}
              onContextMenu={runStatus === "running" ? undefined : onContextMenu}
              ref={setButtonRef}
              type="button"
            >
              <span aria-hidden="true" className="command-button-kind-badge">
                {runStatus === "running" ? (
                  <IconLoader2 className="command-button-loading-icon" size={15} stroke={1.8} />
                ) : (
                  <ActionButtonIcon command={command} />
                )}
              </span>
              {trimmedName ? <span className="command-button-label">{trimmedName}</span> : null}
            </button>
            {commandSessionIndicator ? (
              <button
                aria-label={getCommandSessionIndicatorAriaLabel(command, commandSessionIndicator)}
                className="command-button-session-indicator"
                data-active-session={String(isActiveSessionIndicator)}
                data-session-status={commandSessionIndicator.status}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  vscode.postMessage({
                    sessionId: commandSessionIndicator.sessionId,
                    type: "focusSession",
                  });
                }}
                title={getCommandSessionIndicatorTooltip(command, commandSessionIndicator)}
                type="button"
              >
                <span aria-hidden="true" className="command-button-session-indicator-dot" />
              </button>
            ) : null}
          </div>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">
            {runStatus === "running"
              ? getLoadingCommandButtonTooltip(command)
              : getCommandButtonTooltip(command)}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

type ActionButtonIconProps = {
  command: SidebarCommandButton;
};

function ActionButtonIcon({ command }: ActionButtonIconProps) {
  if (command.icon) {
    return (
      <SidebarCommandIconGlyph
        className="command-button-kind-icon command-button-leading-icon"
        color={command.iconColor}
        icon={command.icon}
        size={15}
        stroke={1.8}
      />
    );
  }

  const className = "command-button-kind-icon";

  if (command.actionType === "browser") {
    return <IconWorldFilled aria-hidden="true" className={className} size={15} stroke={1.8} />;
  }

  return <IconPlayerPlayFilled aria-hidden="true" className={className} size={15} stroke={1.8} />;
}

function moveCommandId(
  commandIds: readonly string[],
  initialIndex: number,
  index: number,
): string[] {
  const nextCommandIds = [...commandIds];
  const [commandId] = nextCommandIds.splice(initialIndex, 1);

  if (commandId === undefined) {
    return nextCommandIds;
  }

  nextCommandIds.splice(index, 0, commandId);
  return nextCommandIds;
}

function hasData(candidate: unknown): candidate is { data?: unknown } {
  return isObjectRecord(candidate) && "data" in candidate;
}

function isNode(value: EventTarget | null): value is Node {
  return value instanceof Node;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mergeCommandIds(
  draftCommandIds: readonly string[],
  syncedCommandIds: readonly string[],
): string[] {
  const syncedCommandIdSet = new Set(syncedCommandIds);
  const mergedCommandIds = draftCommandIds.filter((commandId) => syncedCommandIdSet.has(commandId));

  for (const commandId of syncedCommandIds) {
    if (!mergedCommandIds.includes(commandId)) {
      mergedCommandIds.push(commandId);
    }
  }

  return mergedCommandIds;
}

function reconcileDraftCommandIds(
  draftCommandIds: readonly string[] | undefined,
  commands: readonly SidebarCommandButton[],
): string[] | undefined {
  if (!draftCommandIds) {
    return undefined;
  }

  const syncedCommandIds = commands.map((command) => command.commandId);
  const nextDraftCommandIds = mergeCommandIds(draftCommandIds, syncedCommandIds);
  return haveSameCommandOrder(nextDraftCommandIds, syncedCommandIds)
    ? undefined
    : nextDraftCommandIds;
}

function clearPendingOrderSync(pendingOrderSync: PendingOrderSync | undefined) {
  if (!pendingOrderSync) {
    return;
  }

  window.clearTimeout(pendingOrderSync.timeoutId);
}

function clearPendingCommandRunClears(
  pendingCommandRunClears: Map<string, PendingCommandRunClear>,
) {
  for (const pendingClear of pendingCommandRunClears.values()) {
    window.clearTimeout(pendingClear.timeoutId);
  }

  pendingCommandRunClears.clear();
}

function createReorderRequestId(): string {
  return `reorder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function haveSameCommandOrder(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((commandId, index) => commandId === right[index]);
}

function isConfigured(command: SidebarCommandButton): boolean {
  return command.actionType === "browser" ? Boolean(command.url) : Boolean(command.command);
}

function getCommandSubject(command: SidebarCommandButton): string {
  const trimmedName = command.name.trim();
  if (trimmedName.length > 0) {
    return trimmedName;
  }

  if (command.icon) {
    return getSidebarCommandIconLabel(command.icon);
  }

  return command.actionType === "browser" ? "browser action" : "terminal action";
}

function getLoadingCommandButtonAriaLabel(command: SidebarCommandButton): string {
  return command.actionType === "browser"
    ? `Opening ${getCommandSubject(command)}`
    : `Running ${getCommandSubject(command)}`;
}

function getLoadingCommandButtonTooltip(command: SidebarCommandButton): string {
  return command.actionType === "browser"
    ? `Opening ${getCommandSubject(command)}...`
    : `Running ${getCommandSubject(command)}...`;
}

function getCommandSessionIndicatorTooltip(
  command: SidebarCommandButton,
  indicator: SidebarCommandSessionIndicator,
): string {
  const commandSubject = getCommandSubject(command);
  const statusLabel =
    indicator.status === "running" ? "running" : indicator.status === "error" ? "failed" : "open";
  const title = indicator.title?.trim();
  return title
    ? `Open ${commandSubject} terminal (${statusLabel})\n${title}`
    : `Open ${commandSubject} terminal (${statusLabel})`;
}

function getCommandSessionIndicatorAriaLabel(
  command: SidebarCommandButton,
  indicator: SidebarCommandSessionIndicator,
): string {
  const commandSubject = getCommandSubject(command);
  switch (indicator.status) {
    case "running":
      return `Open running ${commandSubject} terminal`;
    case "error":
      return `Open failed ${commandSubject} terminal`;
    default:
      return `Open ${commandSubject} terminal`;
  }
}

function describeRenderedButtonLayout(gridElement: HTMLDivElement) {
  const renderedItems = Array.from(
    gridElement.querySelectorAll<HTMLElement>("[data-sidebar-order-id]"),
  )
    .map((element) => {
      const itemId = element.dataset.sidebarOrderId;
      if (!itemId) {
        return undefined;
      }

      return {
        id: itemId,
        left: Math.round(element.offsetLeft),
        top: Math.round(element.offsetTop),
        width: Math.round(element.offsetWidth),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  const visualOrderIds = [...renderedItems]
    .sort((left, right) => left.top - right.top || left.left - right.left)
    .map((item) => item.id);

  return {
    clientWidth: Math.round(gridElement.clientWidth),
    computedGridTemplateColumns: getComputedStyle(gridElement).gridTemplateColumns,
    renderedItems,
    visualOrderIds,
  };
}
