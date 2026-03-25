import { Tooltip } from "@base-ui/react/tooltip";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { SidebarAgentButton } from "../shared/sidebar-agents";
import { AGENT_LOGOS } from "./agent-logos";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { AgentConfigModal, type AgentConfigDraft } from "./agent-config-modal";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 180;
const CONTEXT_MENU_HEIGHT_PX = 110;

type AgentsPanelProps = {
  agents: SidebarAgentButton[];
  createRequestId: number;
  titlebarActions?: ReactNode;
  vscode: WebviewApi;
};

type ContextMenuPosition = {
  x: number;
  y: number;
};

type AgentMenuState = {
  agent: SidebarAgentButton;
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

export function AgentsPanel({ agents, createRequestId, titlebarActions, vscode }: AgentsPanelProps) {
  const [contextMenu, setContextMenu] = useState<AgentMenuState>();
  const [editingAgent, setEditingAgent] = useState<AgentConfigDraft>();
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

  const openAgentEditor = (agent: SidebarAgentButton) => {
    setEditingAgent({
      agentId: agent.agentId,
      command: agent.command ?? "",
      name: agent.name,
    });
  };

  useEffect(() => {
    if (createRequestId === 0) {
      return;
    }

    setContextMenu(undefined);
    setEditingAgent({
      agentId: undefined,
      command: "",
      name: "",
    });
  }, [createRequestId]);

  return (
    <>
      <section className="commands-section">
        <div className="section-titlebar" data-empty-space-blocking="true">
          <div aria-hidden="true" className="section-titlebar-line" />
          <span className="section-titlebar-label">Agents</span>
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
            <div className="agents-grid">
              {agents.map((agent) => {
                const isIconOnly = agent.isDefault && Boolean(agent.icon);

                return (
                  <Tooltip.Root key={agent.agentId}>
                    <Tooltip.Trigger
                      render={
                        <button
                          aria-label={`Launch ${agent.name}`}
                          className="agent-button"
                          data-empty-space-blocking="true"
                          data-icon-only={String(isIconOnly)}
                          onClick={() => {
                            if (!agent.command) {
                              openAgentEditor(agent);
                              return;
                            }

                            vscode.postMessage({
                              agentId: agent.agentId,
                              type: "runSidebarAgent",
                            });
                          }}
                          onContextMenu={(event: ReactMouseEvent<HTMLButtonElement>) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setContextMenu({
                              agent,
                              position: clampContextMenuPosition(event.clientX, event.clientY),
                            });
                          }}
                          type="button"
                        >
                          <span className="agent-button-icon-shell">
                            {agent.icon ? (
                              <img
                                alt=""
                                aria-hidden="true"
                                className="agent-button-icon"
                                data-agent-icon={agent.icon}
                                src={AGENT_LOGOS[agent.icon]}
                              />
                            ) : (
                              <span aria-hidden="true" className="agent-button-monogram">
                                {getAgentMonogram(agent.name)}
                              </span>
                            )}
                          </span>
                          {isIconOnly ? null : (
                            <span className="command-button-label">{agent.name}</span>
                          )}
                        </button>
                      }
                    />
                    <Tooltip.Portal>
                      <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
                        <Tooltip.Popup className="tooltip-popup">
                          {agent.command ? agent.name : `Configure ${agent.name}`}
                        </Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
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
                  openAgentEditor(contextMenu.agent);
                }}
                role="menuitem"
                type="button"
              >
                <IconPencil aria-hidden="true" className="session-context-menu-icon" size={14} />
                Configure Agent
              </button>
              <button
                className="session-context-menu-item session-context-menu-item-danger"
                onClick={() => {
                  setContextMenu(undefined);
                  vscode.postMessage({
                    agentId: contextMenu.agent.agentId,
                    type: "deleteSidebarAgent",
                  });
                }}
                role="menuitem"
                type="button"
              >
                <IconTrash aria-hidden="true" className="session-context-menu-icon" size={14} />
                {contextMenu.agent.isDefault ? "Reset Agent" : "Remove Agent"}
              </button>
            </div>,
            document.body,
          )
        : null}
      {editingAgent ? (
        <AgentConfigModal
          draft={editingAgent}
          isOpen
          onCancel={() => setEditingAgent(undefined)}
          onSave={(draft) => {
            setEditingAgent(undefined);
            vscode.postMessage({
              agentId: draft.agentId,
              command: draft.command,
              name: draft.name,
              type: "saveSidebarAgent",
            });
          }}
        />
      ) : null}
    </>
  );
}

function getAgentMonogram(name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return "+";
  }

  return normalizedName.slice(0, 1).toUpperCase();
}
