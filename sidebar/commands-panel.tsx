import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { IconCode, IconPencil, IconPlayerPlay, IconTrash, IconWorld } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { SidebarCommandButton } from "../shared/sidebar-commands";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { CommandConfigModal, type CommandConfigDraft } from "./command-config-modal";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 188;
const CONTEXT_MENU_HEIGHT_PX = 110;

type CommandsPanelProps = {
  commands: SidebarCommandButton[];
  createRequestId: number;
  isVsMuxDisabled: boolean;
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

function createCommandDragData(commandId: string): CommandDragData {
  return {
    commandId,
    kind: "sidebar-command",
  };
}

function getCommandDragData(candidate: { data?: unknown } | null | undefined) {
  const data = candidate?.data;
  if (!data || typeof data !== "object" || !("kind" in data)) {
    return undefined;
  }

  const parsedData = data as Partial<CommandDragData>;
  return parsedData.kind === "sidebar-command" && typeof parsedData.commandId === "string"
    ? (parsedData as CommandDragData)
    : undefined;
}

export function CommandsPanel({
  commands,
  createRequestId,
  isVsMuxDisabled,
  titlebarActions,
  vscode,
}: CommandsPanelProps) {
  const [contextMenu, setContextMenu] = useState<CommandMenuState>();
  const [draftCommandIds, setDraftCommandIds] = useState<string[] | undefined>();
  const [editingCommand, setEditingCommand] = useState<CommandConfigDraft>();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenu(undefined);
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
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

  const runOrConfigureCommand = (command: SidebarCommandButton) => {
    if (
      (command.actionType === "browser" && !command.url) ||
      (command.actionType === "terminal" && !command.command)
    ) {
      openCommandEditor(command);
      return;
    }

    vscode.postMessage({
      commandId: command.commandId,
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
    const commandById = new Map(commands.map((command) => [command.commandId, command] as const));
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

  const handleDragEnd = (event: {
    canceled?: boolean;
    operation: {
      source: unknown;
      target: unknown;
    };
  }) => {
    if (event.canceled) {
      return;
    }

    const { source, target } = event.operation;
    if (!isSortable(source) || !isSortable(target)) {
      return;
    }

    const sourceData = getCommandDragData(source);
    const targetData = getCommandDragData(target as { data?: unknown });
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
  };

  return (
    <>
      <section className="commands-section">
        <div className="section-titlebar" data-empty-space-blocking="true">
          <div aria-hidden="true" className="section-titlebar-line" />
          <span className="section-titlebar-label">Actions</span>
          {titlebarActions ? (
            <div className="section-titlebar-actions">
              <div aria-hidden="true" className="section-titlebar-line" />
              {titlebarActions}
            </div>
          ) : (
            <div aria-hidden="true" className="section-titlebar-line" />
          )}
        </div>
        <div className="card commands-panel">
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
                        position: clampContextMenuPosition(event.clientX, event.clientY),
                      });
                    }}
                    onRun={() => runOrConfigureCommand(command)}
                  />
                ))}
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <button
                        aria-label="Code Mode: switch back to normal VS Code layout while keeping VSmux sessions available"
                        className="command-button command-button-code-mode"
                        data-configured="true"
                        data-empty-space-blocking="true"
                        data-selected={String(isVsMuxDisabled)}
                        onClick={() => vscode.postMessage({ type: "toggleVsMuxDisabled" })}
                        type="button"
                      >
                        <span aria-hidden="true" className="command-button-kind-badge">
                          <IconCode
                            aria-hidden="true"
                            className="command-button-kind-icon"
                            size={15}
                            stroke={1.8}
                          />
                        </span>
                        <span className="command-button-label code-mode-button">⏸︎</span>
                      </button>
                    }
                  />
                  <Tooltip.Portal>
                    <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
                      <Tooltip.Popup className="tooltip-popup">
                        Switch back to normal VS Code layout while keeping VSmux sessions active in
                        the background
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
            </DragDropProvider>
          </Tooltip.Provider>
        </div>
      </section>
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
