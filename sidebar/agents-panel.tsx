import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import {
  IconCodeDots,
  IconFlare,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
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
import type { SidebarAgentButton } from "../shared/sidebar-agents";
import { AGENT_LOGOS } from "./agent-logos";
import { getSidebarButtonGridColumnCount } from "./button-grid";
import { postSidebarOrderReproLog } from "./sidebar-order-repro-log";
import { SectionHeader } from "./section-header";
import { useSidebarStore } from "./sidebar-store";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { useCollapsibleHeight } from "./use-collapsible-height";
import { AgentConfigModal, type AgentConfigDraft } from "./agent-config-modal";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 180;
const CONTEXT_MENU_HEIGHT_PX = 166;
const REORDER_SYNC_TIMEOUT_MS = 3_000;

type AgentsPanelProps = {
  createRequestId: number;
  isCollapsed: boolean;
  isVisible: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
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

type PendingOrderSync = {
  requestId: string;
  timeoutId: number;
};

function createAgentDraft(): AgentConfigDraft {
  return {
    agentId: undefined,
    command: "",
    icon: undefined,
    name: "",
  };
}

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

function getAgentDragData(candidate: unknown): AgentDragData | undefined {
  if (!hasData(candidate)) {
    return undefined;
  }

  const data = candidate.data;
  if (!isObjectRecord(data) || !("kind" in data)) {
    return undefined;
  }

  return data.kind === "sidebar-agent" && typeof data.agentId === "string"
    ? {
        agentId: data.agentId,
        kind: "sidebar-agent",
      }
    : undefined;
}

export function AgentsPanel({
  createRequestId,
  isCollapsed,
  isVisible,
  onToggleCollapsed,
  titlebarActions,
  vscode,
}: AgentsPanelProps) {
  const { agents, pendingAgentIds } = useSidebarStore(
    useShallow((state) => ({
      agents: state.hud.agents,
      pendingAgentIds: state.hud.pendingAgentIds,
    })),
  );
  const latestAgentOrderSyncResult = useSidebarStore((state) => state.latestAgentOrderSyncResult);
  const [contextMenu, setContextMenu] = useState<AgentMenuState>();
  const [draftAgentIds, setDraftAgentIds] = useState<string[] | undefined>();
  const [editingAgent, setEditingAgent] = useState<AgentConfigDraft>();
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

  const openAgentEditor = (agent: SidebarAgentButton) => {
    setEditingAgent({
      agentId: agent.agentId,
      command: agent.command ?? "",
      icon: agent.icon,
      name: agent.name,
    });
  };

  const openCreateAgentEditor = () => {
    setEditingAgent(createAgentDraft());
  };

  useEffect(() => {
    setDraftAgentIds((previousDraft) => {
      const nextDraft = reconcileDraftAgentIds(previousDraft, agents);
      if (previousDraft || nextDraft) {
        postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.reconcileDraft", {
          nextDraftAgentIds: nextDraft ?? null,
          previousDraftAgentIds: previousDraft ?? null,
          syncedAgentIds: agents.map((agent) => agent.agentId),
        });
      }
      return nextDraft;
    });
  }, [agents, vscode]);

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
      !latestAgentOrderSyncResult ||
      !pendingOrderSync ||
      pendingOrderSync.requestId !== latestAgentOrderSyncResult.requestId
    ) {
      return;
    }

    clearPendingOrderSync(pendingOrderSync);
    pendingOrderSyncRef.current = undefined;

    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.syncResult", {
      draftAgentIds: draftAgentIds ?? null,
      itemIds: latestAgentOrderSyncResult.itemIds,
      requestId: latestAgentOrderSyncResult.requestId,
      status: latestAgentOrderSyncResult.status,
      syncedAgentIds: agents.map((agent) => agent.agentId),
    });

    if (latestAgentOrderSyncResult.status === "error") {
      setDraftAgentIds(undefined);
    }
  }, [agents, draftAgentIds, latestAgentOrderSyncResult, vscode]);

  useEffect(() => {
    if (createRequestId === 0) {
      return;
    }

    setContextMenu(undefined);
    setEditingAgent(createAgentDraft());
  }, [createRequestId]);

  const orderedAgents = useMemo(() => {
    const agentById = new Map<string, SidebarAgentButton>(
      agents.map((agent) => [agent.agentId, agent]),
    );
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
  const gridColumnCount = getSidebarButtonGridColumnCount(orderedAgents.length);
  const shouldShowEmptyState = orderedAgents.length === 0;

  useEffect(() => {
    const payload = {
      draftAgentIds: draftAgentIds ?? null,
      orderedAgentIds: orderedAgents.map((agent) => agent.agentId),
      pendingRequestId: pendingOrderSyncRef.current?.requestId ?? null,
      syncedAgentIds: agents.map((agent) => agent.agentId),
    };
    const nextFingerprint = JSON.stringify(payload);
    if (lastLoggedOrderStateRef.current === nextFingerprint) {
      return;
    }

    lastLoggedOrderStateRef.current = nextFingerprint;
    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.state", payload);
  }, [agents, draftAgentIds, orderedAgents, vscode]);

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
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.layout", layout);
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
  }, [orderedAgents, vscode]);

  const handleDragStart = ((event) => {
    if (!isSortableOperation(event.operation)) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragStartIgnored", {
        reason: "not-sortable-operation",
      });
      return;
    }

    const source = event.operation.source;
    const sourceData = source ? getAgentDragData(source) : undefined;
    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragStart", {
      initialIndex: source?.initialIndex ?? null,
      sourceAgentId: sourceData?.agentId ?? null,
    });
  }) satisfies DragDropEventHandlers["onDragStart"];

  const handleDragEnd = ((event) => {
    if (event.canceled) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragEndIgnored", {
        reason: "canceled",
      });
      return;
    }

    if (!isSortableOperation(event.operation)) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragEndIgnored", {
        reason: "not-sortable-operation",
      });
      return;
    }

    const { source, target } = event.operation;
    if (!source) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragEndIgnored", {
        hasSource: Boolean(source),
        hasTarget: Boolean(target),
        reason: "missing-source",
      });
      return;
    }

    const sourceData = getAgentDragData(source);
    if (!sourceData) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragEndIgnored", {
        reason: "invalid-source-data",
        sourceAgentId: sourceData?.agentId ?? null,
      });
      return;
    }

    const { initialIndex } = source;
    const projectedIndex =
      "index" in source && typeof source.index === "number" ? source.index : null;
    const targetIndex = projectedIndex ?? target?.index ?? null;
    if (targetIndex == null || initialIndex === targetIndex) {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragEndIgnored", {
        initialIndex,
        projectedIndex,
        reason: "same-or-missing-target-index",
        targetIndex: targetIndex ?? null,
      });
      return;
    }

    const nextAgentIds = moveAgentId(
      orderedAgents.map((agent) => agent.agentId),
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
        postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.syncTimeout", {
          draftAgentIds: nextAgentIds,
          requestId,
          syncedAgentIds: agents.map((agent) => agent.agentId),
        });
        setDraftAgentIds(undefined);
      }, REORDER_SYNC_TIMEOUT_MS),
    };
    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.agents.dragEnd", {
      currentOrderedAgentIds: orderedAgents.map((agent) => agent.agentId),
      initialIndex,
      nextAgentIds,
      projectedIndex,
      requestId,
      syncedAgentIds: agents.map((agent) => agent.agentId),
      targetIndex,
    });
    setDraftAgentIds(nextAgentIds);
    vscode.postMessage({
      agentIds: nextAgentIds,
      requestId,
      type: "syncSidebarAgentOrder",
    });
  }) satisfies DragDropEventHandlers["onDragEnd"];

  return (
    <>
      {isVisible ? (
        <section
          className="commands-section commands-section-agents"
          data-collapsed={String(isCollapsed)}
        >
          <SectionHeader
            actions={titlebarActions}
            idleIcon={<IconFlare size={18} stroke={1.8} />}
            isCollapsed={isCollapsed}
            isCollapsible
            onToggleCollapsed={() => onToggleCollapsed(!isCollapsed)}
            title="Agents"
          />
          <div
            aria-hidden={isCollapsed}
            className="sidebar-collapse-shell"
            data-collapsed={String(isCollapsed)}
            style={collapsibleStyle}
          >
            <div
              className="card commands-panel agents-panel-shell sidebar-collapse-content"
              data-empty-space-blocking="true"
              ref={contentRef}
            >
              {shouldShowEmptyState ? (
                <button
                  className="sidebar-empty-create-button"
                  data-empty-space-blocking="true"
                  onClick={openCreateAgentEditor}
                  type="button"
                >
                  <span aria-hidden="true" className="sidebar-empty-create-button-icon">
                    <IconPlus size={18} stroke={1.8} />
                  </span>
                  <span className="sidebar-empty-create-button-copy">
                    <span className="sidebar-empty-create-button-label">Create Agent</span>
                    <span className="sidebar-empty-create-button-description">
                      Add an agent launcher back to the sidebar.
                    </span>
                  </span>
                </button>
              ) : (
                <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
                  <DragDropProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
                    <div
                      className="agents-grid"
                      ref={gridRef}
                      style={{ gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))` }}
                    >
                      {orderedAgents.map((agent, index) => (
                        <SortableAgentButton
                          agent={agent}
                          index={index}
                          isLaunching={pendingAgentIds.includes(agent.agentId)}
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
                  openAgentEditor(contextMenu.agent);
                }}
                role="menuitem"
                type="button"
              >
                <IconPencil aria-hidden="true" className="session-context-menu-icon" size={14} />
                Configure Agent
              </button>
              <div className="session-context-menu-divider" role="separator" />
              <button
                className="session-context-menu-item"
                onClick={() => {
                  setContextMenu(undefined);
                  openCreateAgentEditor();
                }}
                role="menuitem"
                type="button"
              >
                <IconPlus aria-hidden="true" className="session-context-menu-icon" size={14} />
                Add Agent
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
  isLaunching: boolean;
  isContextMenuOpen: boolean;
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onRun: () => void;
};

function SortableAgentButton({
  agent,
  index,
  isLaunching,
  isContextMenuOpen,
  onContextMenu,
  onRun,
}: SortableAgentButtonProps) {
  const sortable = useSortable({
    accept: "sidebar-agent",
    data: createAgentDragData(agent.agentId),
    disabled: isContextMenuOpen || isLaunching,
    group: "sidebar-agents",
    id: agent.agentId,
    index,
    type: "sidebar-agent",
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
            aria-busy={isLaunching}
            aria-label={isLaunching ? `Starting ${agent.name}` : `Launch ${agent.name}`}
            className="agent-button"
            data-dragging={String(Boolean(sortable.isDragging))}
            data-empty-space-blocking="true"
            data-icon-only="true"
            data-loading={String(isLaunching)}
            data-sidebar-order-id={agent.agentId}
            disabled={isLaunching}
            draggable={false}
            onClick={isLaunching ? undefined : onRun}
            onContextMenu={isLaunching ? undefined : onContextMenu}
            ref={setButtonRef}
            type="button"
          >
            <span className="agent-button-icon-shell">
              {isLaunching ? (
                <IconLoader2
                  aria-hidden="true"
                  className="agent-button-loading-icon"
                  size={18}
                  stroke={1.8}
                />
              ) : (
                <>
                  {agent.icon ? (
                    <img
                      alt=""
                      aria-hidden="true"
                      className="agent-button-icon"
                      data-agent-icon={agent.icon}
                      draggable={false}
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
                </>
              )}
            </span>
          </button>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">
            {isLaunching
              ? `Starting ${agent.name}`
              : agent.command
                ? agent.name
                : `Configure ${agent.name}`}
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

function mergeAgentIds(
  draftAgentIds: readonly string[],
  syncedAgentIds: readonly string[],
): string[] {
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

function clearPendingOrderSync(pendingOrderSync: PendingOrderSync | undefined) {
  if (!pendingOrderSync) {
    return;
  }

  window.clearTimeout(pendingOrderSync.timeoutId);
}

function createReorderRequestId(): string {
  return `reorder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function haveSameAgentOrder(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((agentId, index) => agentId === right[index]);
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
