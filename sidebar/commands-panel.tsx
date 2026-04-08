import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import { IconBug, IconPencil, IconPlayerPlay, IconTrash, IconWorld } from "@tabler/icons-react";
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
import type { SidebarCommandButton, SidebarCommandRunMode } from "../shared/sidebar-commands";
import { GitActionRow } from "./git-action-row";
import { SectionHeader } from "./section-header";
import { useSidebarStore } from "./sidebar-store";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { CommandConfigModal, type CommandConfigDraft } from "./command-config-modal";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 188;
const CONTEXT_MENU_VERTICAL_PADDING_PX = 24;
const CONTEXT_MENU_ITEM_HEIGHT_PX = 43;

type CommandsPanelProps = {
  createRequestId: number;
  isCollapsed: boolean;
  isVisible: boolean;
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
    CONTEXT_MENU_ITEM_HEIGHT_PX * (command.actionType === "terminal" ? 3 : 2)
  );
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
  createRequestId,
  isCollapsed,
  isVisible,
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
  const [contextMenu, setContextMenu] = useState<CommandMenuState>();
  const [draftCommandIds, setDraftCommandIds] = useState<string[] | undefined>();
  const [editingCommand, setEditingCommand] = useState<CommandConfigDraft>();
  const menuRef = useRef<HTMLDivElement>(null);

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
      name: command.name,
      url: command.url,
    });
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

    vscode.postMessage({
      commandId: command.commandId,
      runMode,
      type: "runSidebarCommand",
    });
  };

  useEffect(() => {
    setDraftCommandIds((previousDraft) => reconcileDraftCommandIds(previousDraft, commands));
  }, [commands]);

  useEffect(() => {
    if (createRequestId === 0) {
      return;
    }

    setContextMenu(undefined);
    setEditingCommand({
      actionType: "terminal",
      closeTerminalOnExit: false,
      command: "",
      commandId: undefined,
      name: "",
      url: "",
    });
  }, [createRequestId]);

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
  const shouldRenderSection = isVisible && (showGitButton || orderedCommands.length > 0);

  const handleDragEnd = ((event) => {
    if (event.canceled) {
      return;
    }

    if (!isSortableOperation(event.operation)) {
      return;
    }

    const { source, target } = event.operation;
    if (!source || !target) {
      return;
    }

    const sourceData = getCommandDragData(source);
    const targetData = getCommandDragData(target);
    if (!sourceData || !targetData || sourceData.commandId === targetData.commandId) {
      return;
    }

    const { initialIndex } = source;
    const targetIndex = target.index;
    if (targetIndex == null || initialIndex === targetIndex) {
      return;
    }

    const nextCommandIds = moveCommandId(
      orderedCommands.map((command) => command.commandId),
      initialIndex,
      targetIndex,
    );
    setDraftCommandIds(nextCommandIds);
    vscode.postMessage({
      commandIds: nextCommandIds,
      type: "syncSidebarCommandOrder",
    });
  }) satisfies DragDropEventHandlers["onDragEnd"];

  return (
    <>
      {shouldRenderSection ? (
        <section className="commands-section">
          <SectionHeader
            actions={titlebarActions}
            isCollapsed={isCollapsed}
            isCollapsible
            onToggleCollapsed={() => onToggleCollapsed(!isCollapsed)}
            title="Actions"
          />
          {!isCollapsed ? (
            <div className="card commands-panel">
              {showGitButton ? <GitActionRow git={git} vscode={vscode} /> : null}
              <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
                <DragDropProvider onDragEnd={handleDragEnd}>
                  <div className="commands-grid">
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
            </div>
          ) : null}
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
                  Debug Aaction
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
          onCancel={() => setEditingCommand(undefined)}
          onSave={(draft) => {
            setEditingCommand(undefined);
            vscode.postMessage({
              actionType: draft.actionType,
              closeTerminalOnExit: draft.closeTerminalOnExit,
              command: draft.command,
              commandId: draft.commandId,
              name: draft.name,
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
  const sortable = useSortable({
    accept: "sidebar-command",
    data: createCommandDragData(command.commandId),
    disabled: isContextMenuOpen,
    group: "sidebar-commands",
    id: command.commandId,
    index,
    type: "sidebar-command",
  });

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            aria-label={
              isConfigured(command)
                ? runActionAriaLabel(command)
                : `Configure ${command.name} action`
            }
            className="command-button"
            data-configured={String(isConfigured(command))}
            data-default={String(command.isDefault)}
            data-dragging={String(Boolean(sortable.isDragging))}
            data-empty-space-blocking="true"
            onClick={onRun}
            onContextMenu={onContextMenu}
            ref={sortable.ref}
            type="button"
          >
            <span aria-hidden="true" className="command-button-kind-badge">
              <ActionKindIcon actionType={command.actionType} />
            </span>
            <span className="command-button-label">{command.name}</span>
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

type ActionKindIconProps = {
  actionType: SidebarCommandButton["actionType"];
};

function ActionKindIcon({ actionType }: ActionKindIconProps) {
  const className = "command-button-kind-icon";

  if (actionType === "browser") {
    return <IconWorld aria-hidden="true" className={className} size={15} stroke={1.8} />;
  }

  return <IconPlayerPlay aria-hidden="true" className={className} size={15} stroke={1.8} />;
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

function haveSameCommandOrder(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((commandId, index) => commandId === right[index]);
}

function isConfigured(command: SidebarCommandButton): boolean {
  return command.actionType === "browser" ? Boolean(command.url) : Boolean(command.command);
}

function getActionTooltip(command: SidebarCommandButton): string {
  if (!isConfigured(command)) {
    return `Configure ${command.name}`;
  }

  return command.actionType === "browser"
    ? `${command.name}: ${command.url}`
    : `${command.name}: ${command.command}`;
}

function runActionAriaLabel(command: SidebarCommandButton): string {
  return command.actionType === "browser" ? `Open ${command.name}` : `Run ${command.name}`;
}
