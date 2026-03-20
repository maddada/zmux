import { Tooltip } from "@base-ui/react/tooltip";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { SidebarCommandButton } from "../shared/sidebar-commands";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { CommandConfigModal, type CommandConfigDraft } from "./command-config-modal";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 188;
const CONTEXT_MENU_HEIGHT_PX = 110;

type CommandsPanelProps = {
  commands: SidebarCommandButton[];
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

export function CommandsPanel({ commands, vscode }: CommandsPanelProps) {
  const [contextMenu, setContextMenu] = useState<CommandMenuState>();
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
      closeTerminalOnExit: command.closeTerminalOnExit,
      command: command.command ?? "",
      commandId: command.commandId,
      name: command.name,
    });
  };

  const runOrConfigureCommand = (command: SidebarCommandButton) => {
    if (!command.command) {
      openCommandEditor(command);
      return;
    }

    vscode.postMessage({
      commandId: command.commandId,
      type: "runSidebarCommand",
    });
  };

  return (
    <>
      <section className="commands-section">
        <div className="section-titlebar" data-empty-space-blocking="true">
          <div aria-hidden="true" className="section-titlebar-line" />
          <span className="section-titlebar-label">Commands</span>
          <div aria-hidden="true" className="section-titlebar-line" />
        </div>
        <div className="card commands-panel">
          <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
            <div className="commands-grid">
              {commands.map((command) => (
                <Tooltip.Root key={command.commandId}>
                  <Tooltip.Trigger
                    render={
                      <button
                        aria-label={
                          command.command
                            ? `Run ${command.name}`
                            : `Configure ${command.name} command`
                        }
                        className="command-button"
                        data-configured={String(Boolean(command.command))}
                        data-default={String(command.isDefault)}
                        data-empty-space-blocking="true"
                        onClick={() => runOrConfigureCommand(command)}
                        onContextMenu={(event: ReactMouseEvent<HTMLButtonElement>) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setContextMenu({
                            command,
                            position: clampContextMenuPosition(event.clientX, event.clientY),
                          });
                        }}
                        type="button"
                      >
                        <span className="command-button-label">{command.name}</span>
                      </button>
                    }
                  />
                  <Tooltip.Portal>
                    <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
                      <Tooltip.Popup className="tooltip-popup">
                        {command.command
                          ? `${command.name}: ${command.command}`
                          : `Configure ${command.name}`}
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ))}
              <button
                aria-label="Add command"
                className="command-button command-button-add"
                data-empty-space-blocking="true"
                onClick={() =>
                  setEditingCommand({
                    closeTerminalOnExit: false,
                    command: "",
                    commandId: undefined,
                    name: "",
                  })
                }
                type="button"
              >
                <IconPlus aria-hidden="true" size={16} stroke={1.8} />
              </button>
            </div>
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
                Configure Command
              </button>
              {contextMenu.command.command || !contextMenu.command.isDefault ? (
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
                  {contextMenu.command.isDefault ? "Reset Command" : "Remove Command"}
                </button>
              ) : null}
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
              closeTerminalOnExit: draft.closeTerminalOnExit,
              command: draft.command,
              commandId: draft.commandId,
              name: draft.name,
              type: "saveSidebarCommand",
            });
          }}
        />
      ) : null}
    </>
  );
}
