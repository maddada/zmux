import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import {
  IconBug,
  IconPencil,
  IconPlayerPlayFilled,
  IconPlus,
  IconTerminal2,
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
import { getSidebarButtonGridColumnCount } from "./button-grid";
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
  command: SidebarCommandButton;
  position: ContextMenuPosition;
};

type CommandDragData = {
  commandId: string;
  kind: "sidebar-command";
};

type PendingOrderSync = {
  requestId: string;
  timeoutId: number;
};

function clampContextMenuPosition(
  clientX: number,
  clientY: number,
  command: SidebarCommandButton,
): ContextMenuPosition {
  const menuHeight = getContextMenuHeight(command);

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

function getContextMenuHeight(command: SidebarCommandButton): number {
  return (
    CONTEXT_MENU_VERTICAL_PADDING_PX +
    CONTEXT_MENU_ITEM_HEIGHT_PX * (command.actionType === "terminal" ? 5 : 4) +
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
  const { commands, git } = useSidebarStore(
    useShallow((state) => ({
      commands: state.hud.commands,
      git: state.hud.git,
    })),
  );
  const latestCommandOrderSyncResult = useSidebarStore(
    (state) => state.latestCommandOrderSyncResult,
  );
  const [contextMenu, setContextMenu] = useState<CommandMenuState>();
  const [draftCommandIds, setDraftCommandIds] = useState<string[] | undefined>();
  const [editingCommand, setEditingCommand] = useState<CommandConfigDraft>();
  const gridRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingOrderSyncRef = useRef<PendingOrderSync>();
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
    runMode: SidebarCommandRunMode = "default",
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
      runMode,
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
    },
    [],
  );

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
        <section className="commands-section">
          <SectionHeader
            actions={titlebarActions}
            idleIcon={<IconTerminal2 size={18} stroke={1.8} />}
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
                          index={index}
                          isContextMenuOpen={contextMenu?.command.commandId === command.commandId}
                          key={command.commandId}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setContextMenu({
                              command,
                              position: clampContextMenuPosition(
                                event.clientX,
                                event.clientY,
                                command,
                              ),
                            });
                          }}
                          onRun={() => runOrConfigureCommand(command)}
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
              <button
                className="session-context-menu-item"
                onClick={() => {
                  setContextMenu(undefined);
                  openCommandEditor(contextMenu.command);
                }}
                role="menuitem"
                type="button"
              >
                <IconPencil aria-hidden="true" className="session-context-menu-icon" size={14} />
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

type SortableCommandButtonProps = {
  command: SidebarCommandButton;
  index: number;
  isContextMenuOpen: boolean;
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onRun: () => void;
};

function SortableCommandButton({
  command,
  index,
  isContextMenuOpen,
  onContextMenu,
  onRun,
}: SortableCommandButtonProps) {
  const trimmedName = command.name.trim();
  const isIconOnly = trimmedName.length === 0;

  const sortable = useSortable({
    accept: "sidebar-command",
    data: createCommandDragData(command.commandId),
    disabled: isContextMenuOpen,
    group: "sidebar-commands",
    id: command.commandId,
    index,
    type: "sidebar-command",
  });
  const setButtonRef = (element: HTMLButtonElement | null) => {
    sortable.ref(element);
    sortable.sourceRef(element);
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            aria-label={
              isConfigured(command)
                ? runActionAriaLabel(command)
                : `Configure ${getCommandSubject(command)}`
            }
            className="command-button"
            data-configured={String(isConfigured(command))}
            data-default={String(command.isDefault)}
            data-dragging={String(Boolean(sortable.isDragging))}
            data-empty-space-blocking="true"
            data-has-icon={String(command.icon !== undefined)}
            data-icon-only={String(isIconOnly)}
            data-sidebar-order-id={command.commandId}
            draggable={false}
            onClick={onRun}
            onContextMenu={onContextMenu}
            ref={setButtonRef}
            type="button"
          >
            <span aria-hidden="true" className="command-button-kind-badge">
              <ActionButtonIcon command={command} />
            </span>
            {trimmedName ? <span className="command-button-label">{trimmedName}</span> : null}
          </button>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">{getActionTooltip(command)}</Tooltip.Popup>
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

function getActionTooltip(command: SidebarCommandButton): string {
  const subject = getCommandSubject(command);

  if (!isConfigured(command)) {
    return `Configure ${subject}`;
  }

  return command.actionType === "browser"
    ? `${subject}: ${command.url}`
    : `${subject}: ${command.command}`;
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

function runActionAriaLabel(command: SidebarCommandButton): string {
  const subject = getCommandSubject(command);
  return command.actionType === "browser" ? `Open ${subject}` : `Run ${subject}`;
}
