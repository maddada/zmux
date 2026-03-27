import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { IconCodeDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
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

type AgentDragData = {
  agentId: string;
  kind: "sidebar-agent";
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

function createAgentDragData(agentId: string): AgentDragData {
  return {
    agentId,
    kind: "sidebar-agent",
  };
}

function getAgentDragData(candidate: { data?: unknown } | null | undefined) {
  const data = candidate?.data;
  if (!data || typeof data !== "object" || !("kind" in data)) {
    return undefined;
  }

  const parsedData = data as Partial<AgentDragData>;
  return parsedData.kind === "sidebar-agent" && typeof parsedData.agentId === "string"
    ? (parsedData as AgentDragData)
    : undefined;
}

export function AgentsPanel({
  agents,
  createRequestId,
  titlebarActions,
  vscode,
}: AgentsPanelProps) {
  const [contextMenu, setContextMenu] = useState<AgentMenuState>();
  const [draftAgentIds, setDraftAgentIds] = useState<string[] | undefined>();
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
      icon: agent.icon,
      name: agent.name,
    });
  };

  useEffect(() => {
    setDraftAgentIds((previousDraft) => reconcileDraftAgentIds(previousDraft, agents));
  }, [agents]);

  useEffect(() => {
    if (createRequestId === 0) {
      return;
    }

    setContextMenu(undefined);
    setEditingAgent({
      agentId: undefined,
      command: "",
      icon: undefined,
      name: "",
    });
  }, [createRequestId]);

  const orderedAgents = useMemo(() => {
    const agentById = new Map(agents.map((agent) => [agent.agentId, agent] as const));
    const orderedAgentIds = draftAgentIds
      ? mergeAgentIds(
          draftAgentIds,
          agents.map((agent) => agent.agentId),
        )
      : agents.map((agent) => agent.agentId);

    return orderedAgentIds
      .map((agentId) => agentById.get(agentId))
      .filter((agent): agent is SidebarAgentButton => agent !== undefined);
  }, [agents, draftAgentIds]);

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

    const sourceData = getAgentDragData(source);
    const targetData = getAgentDragData(target as { data?: unknown });
    if (!sourceData || !targetData || sourceData.agentId === targetData.agentId) {
      return;
    }

    const { initialIndex } = source;
    const targetIndex = target.index;
    if (targetIndex == null || initialIndex === targetIndex) {
      return;
    }

    const nextAgentIds = moveAgentId(
      orderedAgents.map((agent) => agent.agentId),
      initialIndex,
      targetIndex,
    );
    setDraftAgentIds(nextAgentIds);
    vscode.postMessage({
      agentIds: nextAgentIds,
      type: "syncSidebarAgentOrder",
    });
  };

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
            <DragDropProvider onDragEnd={handleDragEnd}>
              <div className="agents-grid">
                {orderedAgents.map((agent, index) => (
                  <SortableAgentButton
                    agent={agent}
                    index={index}
                    isContextMenuOpen={contextMenu?.agent.agentId === agent.agentId}
                    key={agent.agentId}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setContextMenu({
                        agent,
                        position: clampContextMenuPosition(event.clientX, event.clientY),
                      });
                    }}
                    onRun={() => {
                      if (!agent.command) {
                        openAgentEditor(agent);
                        return;
                      }

                      vscode.postMessage({
                        agentId: agent.agentId,
                        type: "runSidebarAgent",
                      });
                    }}
                  />
                ))}
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
                Delete Agent
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
              icon: draft.icon,
              name: draft.name,
              type: "saveSidebarAgent",
            });
          }}
        />
      ) : null}
    </>
  );
}

type SortableAgentButtonProps = {
  agent: SidebarAgentButton;
  index: number;
  isContextMenuOpen: boolean;
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onRun: () => void;
};

function SortableAgentButton({
  agent,
  index,
  isContextMenuOpen,
  onContextMenu,
  onRun,
}: SortableAgentButtonProps) {
  const sortable = useSortable({
    accept: "sidebar-agent",
    data: createAgentDragData(agent.agentId),
    disabled: isContextMenuOpen,
    group: "sidebar-agents",
    id: agent.agentId,
    index,
    type: "sidebar-agent",
  });

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            aria-label={`Launch ${agent.name}`}
            className="agent-button"
            data-dragging={String(Boolean(sortable.isDragging))}
            data-empty-space-blocking="true"
            data-icon-only="true"
            onClick={onRun}
            onContextMenu={onContextMenu}
            ref={sortable.ref}
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
                <IconCodeDots
                  aria-hidden="true"
                  className="agent-button-fallback-icon"
                  size={18}
                  stroke={1.8}
                />
              )}
            </span>
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
}

function moveAgentId(agentIds: readonly string[], initialIndex: number, index: number): string[] {
  const nextAgentIds = [...agentIds];
  const [agentId] = nextAgentIds.splice(initialIndex, 1);

  if (agentId === undefined) {
    return nextAgentIds;
  }

  nextAgentIds.splice(index, 0, agentId);
  return nextAgentIds;
}

function mergeAgentIds(draftAgentIds: readonly string[], syncedAgentIds: readonly string[]): string[] {
  const syncedAgentIdSet = new Set(syncedAgentIds);
  const mergedAgentIds = draftAgentIds.filter((agentId) => syncedAgentIdSet.has(agentId));

  for (const agentId of syncedAgentIds) {
    if (!mergedAgentIds.includes(agentId)) {
      mergedAgentIds.push(agentId);
    }
  }

  return mergedAgentIds;
}

function reconcileDraftAgentIds(
  draftAgentIds: readonly string[] | undefined,
  agents: readonly SidebarAgentButton[],
): string[] | undefined {
  if (!draftAgentIds) {
    return undefined;
  }

  const syncedAgentIds = agents.map((agent) => agent.agentId);
  const nextDraftAgentIds = mergeAgentIds(draftAgentIds, syncedAgentIds);
  return haveSameAgentOrder(nextDraftAgentIds, syncedAgentIds) ? undefined : nextDraftAgentIds;
}

function haveSameAgentOrder(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((agentId, index) => agentId === right[index]);
}
