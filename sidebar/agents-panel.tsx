import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import {
  IconCheck,
  IconChevronDown,
  IconCodeDots,
  IconFlare,
  IconFolderOpen,
  IconLoader2,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { createPortal } from "react-dom";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useShallow } from "zustand/react/shallow";
import type { SidebarAgentButton } from "../shared/sidebar-agents";
import type { SidebarCommandButton } from "../shared/sidebar-commands";
import { getZedOverlayTargetAppLabel, type ZedOverlayTargetApp } from "../shared/zmux-settings";
import { AGENT_LOGOS } from "./agent-logos";
import { VisualStudioCodeIcon } from "./brand-icons";
import { getSidebarButtonGridColumnCount } from "./button-grid";
import { SidebarCommandIconGlyph } from "./sidebar-command-icon";
import { postSidebarOrderReproLog } from "./sidebar-order-repro-log";
import { SectionHeader } from "./section-header";
import { useSidebarStore } from "./sidebar-store";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { AppTooltip, TooltipProvider } from "./app-tooltip";
import { useCollapsibleHeight } from "./use-collapsible-height";
import type { AgentConfigDraft } from "./agent-config-modal";
import { openAppModal } from "./app-modal-host-bridge";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 180;
const CONTEXT_MENU_HEIGHT_PX = 166;
const QUICK_ACTION_MENU_MARGIN_PX = 12;
const QUICK_ACTION_MENU_WIDTH_PX = 220;
const REORDER_SYNC_TIMEOUT_MS = 3_000;
const PRIMARY_COMMAND_STORAGE_KEY = "zmux-sidebar-primary-command";
const PRIMARY_OPEN_IN_STORAGE_KEY = "zmux-sidebar-primary-open-in";

type OpenInQuickActionTarget = "finder" | Extract<ZedOverlayTargetApp, "vscode" | "zed">;

const OPEN_IN_QUICK_ACTIONS: ReadonlyArray<{
  label: string;
  target: OpenInQuickActionTarget;
}> = [
  { label: "Finder", target: "finder" },
  { label: getZedOverlayTargetAppLabel("vscode"), target: "vscode" },
  { label: getZedOverlayTargetAppLabel("zed"), target: "zed" },
];

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

type QuickActionMenuKind = "command" | "openIn";

type QuickActionMenuState = {
  kind: QuickActionMenuKind;
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
  const { agents, commands, pendingAgentIds } = useSidebarStore(
    useShallow((state) => ({
      agents: state.hud.agents,
      commands: state.hud.commands,
      pendingAgentIds: state.hud.pendingAgentIds,
    })),
  );
  const latestAgentOrderSyncResult = useSidebarStore((state) => state.latestAgentOrderSyncResult);
  const [contextMenu, setContextMenu] = useState<AgentMenuState>();
  const [quickActionMenu, setQuickActionMenu] = useState<QuickActionMenuState>();
  const [primaryCommandId, setPrimaryCommandId] = useState(
    () => localStorage.getItem(PRIMARY_COMMAND_STORAGE_KEY)?.trim() || undefined,
  );
  const [primaryOpenInTarget, setPrimaryOpenInTarget] = useState<OpenInQuickActionTarget>(() =>
    normalizeOpenInQuickActionTarget(localStorage.getItem(PRIMARY_OPEN_IN_STORAGE_KEY)),
  );
  const [draftAgentIds, setDraftAgentIds] = useState<string[] | undefined>();
  const gridRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingOrderSyncRef = useRef<PendingOrderSync | undefined>(undefined);
  const lastLoggedLayoutRef = useRef<string | undefined>(undefined);
  const lastLoggedOrderStateRef = useRef<string | undefined>(undefined);
  const { collapsibleStyle, contentRef } = useCollapsibleHeight<HTMLDivElement>();

  useEffect(() => {
    if (!contextMenu && !quickActionMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isNode(event.target) && menuRef.current?.contains(event.target)) {
        return;
      }

      setContextMenu(undefined);
      setQuickActionMenu(undefined);
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (isNode(event.target) && menuRef.current?.contains(event.target)) {
        return;
      }

      setContextMenu(undefined);
      setQuickActionMenu(undefined);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(undefined);
        setQuickActionMenu(undefined);
      }
    };
    const handleBlur = () => {
      setContextMenu(undefined);
      setQuickActionMenu(undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setContextMenu(undefined);
        setQuickActionMenu(undefined);
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
  }, [contextMenu, quickActionMenu]);

  const openAgentEditor = (agent: SidebarAgentButton) => {
    const draft: AgentConfigDraft = {
      agentId: agent.agentId,
      command: agent.command ?? "",
      icon: agent.icon,
      name: agent.name,
    };
    /**
     * CDXC:AppModals 2026-04-27-14:25
     * Agent configuration must always use the full-window modal host. Missing
     * host is logged and thrown by openAppModal instead of falling back.
     */
    openAppModal({ agentDraft: draft, modal: "agentConfig", type: "open" });
  };

  const openCreateAgentEditor = () => {
    const draft = createAgentDraft();
    openAppModal({ agentDraft: draft, modal: "agentConfig", type: "open" });
  };

  const openConfigureActionsModal = () => {
    /**
     * CDXC:SidebarActions 2026-05-06-04:36
     * Route full action management to a compact Configure Actions modal with
     * readable rows and direct edit/delete flow. The dropdown stays optimized
     * for quick run/remove, while the modal handles deeper configuration.
     */
    openAppModal({ modal: "configureActions", type: "open" });
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
    openCreateAgentEditor();
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
  const runnableCommands = commands.filter(isRunnableSidebarCommand);
  const primaryCommand = resolvePrimaryCommand(runnableCommands, primaryCommandId);
  const primaryOpenInLabel = getOpenInQuickActionLabel(primaryOpenInTarget);

  const persistPrimaryCommand = (commandId: string) => {
    setPrimaryCommandId(commandId);
    localStorage.setItem(PRIMARY_COMMAND_STORAGE_KEY, commandId);
  };

  const persistPrimaryOpenIn = (target: OpenInQuickActionTarget) => {
    setPrimaryOpenInTarget(target);
    localStorage.setItem(PRIMARY_OPEN_IN_STORAGE_KEY, target);
  };

  const runAgent = (agent: SidebarAgentButton | undefined) => {
    if (!agent) {
      openCreateAgentEditor();
      return;
    }
    if (!agent.command) {
      openAgentEditor(agent);
      return;
    }
    vscode.postMessage({
      agentId: agent.agentId,
      type: "runSidebarAgent",
    });
  };

  const runCommand = (command: SidebarCommandButton | undefined) => {
    if (!command) {
      openConfigureActionsModal();
      return;
    }
    persistPrimaryCommand(command.commandId);
    vscode.postMessage({
      commandId: command.commandId,
      type: "runSidebarCommand",
    });
  };

  const runOpenIn = (target: OpenInQuickActionTarget) => {
    persistPrimaryOpenIn(target);
    if (target === "finder") {
      vscode.postMessage({
        type: "openActiveWorkspaceProjectInFinder",
      });
      return;
    }

    vscode.postMessage({
      targetApp: target,
      type: "openActiveWorkspaceProjectInIde",
    });
  };

  const openQuickActionMenu = (
    kind: QuickActionMenuKind,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu(undefined);
    setQuickActionMenu({
      kind,
      position: {
        x: Math.max(
          QUICK_ACTION_MENU_MARGIN_PX,
          Math.min(
            rect.right - QUICK_ACTION_MENU_WIDTH_PX,
            window.innerWidth - QUICK_ACTION_MENU_WIDTH_PX - QUICK_ACTION_MENU_MARGIN_PX,
          ),
        ),
        y: Math.max(
          QUICK_ACTION_MENU_MARGIN_PX,
          Math.min(rect.bottom + 8, window.innerHeight - QUICK_ACTION_MENU_MARGIN_PX),
        ),
      },
    });
  };

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
        sourceAgentId: null,
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
            title="Actions"
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
              {/*
               * CDXC:SidebarActions 2026-05-05-02:47
               * Agents moved from a standalone "Agents" title to an Actions
               * surface. The agent grid stays intact below the React-owned
               * dropdowns for project Actions and Open In. Selecting a dropdown
               * option immediately runs it and promotes it to the primary
               * left-side action.
               */}
              <div className="quick-actions-row" data-empty-space-blocking="true">
                <QuickActionSplitButton
                  ariaLabel={
                    primaryCommand ? `Run ${quickCommandLabel(primaryCommand)}` : "Choose action"
                  }
                  icon={<CommandQuickActionIcon command={primaryCommand} />}
                  menuLabel="Choose action"
                  onPrimaryClick={() => runCommand(primaryCommand)}
                  onToggleClick={(event) => openQuickActionMenu("command", event)}
                  tooltip={primaryCommand ? quickCommandLabel(primaryCommand) : "Action"}
                />
                <QuickActionSplitButton
                  ariaLabel={`Open in ${primaryOpenInLabel}`}
                  icon={<OpenInQuickActionIcon target={primaryOpenInTarget} />}
                  menuLabel="Choose open target"
                  onPrimaryClick={() => runOpenIn(primaryOpenInTarget)}
                  onToggleClick={(event) => openQuickActionMenu("openIn", event)}
                  tooltip={primaryOpenInLabel}
                />
              </div>
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
                <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                  <DragDropProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
                    <div
                      className="agents-grid"
                      ref={gridRef}
                      style={{
                        gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))`,
                      }}
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
                            runAgent(agent);
                          }}
                        />
                      ))}
                    </div>
                  </DragDropProvider>
                </TooltipProvider>
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
      {quickActionMenu
        ? createPortal(
            <QuickActionMenu
              commands={runnableCommands}
              menu={quickActionMenu}
              onConfigureActions={() => {
                setQuickActionMenu(undefined);
                openConfigureActionsModal();
              }}
              onRunCommand={(command) => {
                setQuickActionMenu(undefined);
                runCommand(command);
              }}
              onRunOpenIn={(target) => {
                setQuickActionMenu(undefined);
                runOpenIn(target);
              }}
              primaryCommandId={primaryCommand?.commandId}
              primaryOpenInTarget={primaryOpenInTarget}
              ref={menuRef}
            />,
            document.body,
          )
        : null}
    </>
  );
}

type QuickActionSplitButtonProps = {
  ariaLabel: string;
  icon: ReactNode;
  menuLabel: string;
  onPrimaryClick: () => void;
  onToggleClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  tooltip: string;
};

function QuickActionSplitButton({
  ariaLabel,
  icon,
  menuLabel,
  onPrimaryClick,
  onToggleClick,
  tooltip,
}: QuickActionSplitButtonProps) {
  return (
    <div className="quick-action-split-button">
      <AppTooltip content={tooltip}>
        <button
          aria-label={ariaLabel}
          className="quick-action-main-button"
          onClick={onPrimaryClick}
          type="button"
        >
          <span className="quick-action-main-icon-shell">{icon}</span>
        </button>
      </AppTooltip>
      <AppTooltip content={menuLabel}>
        <button
          aria-label={menuLabel}
          className="quick-action-toggle-button"
          onClick={onToggleClick}
          type="button"
        >
          <IconChevronDown aria-hidden="true" className="quick-action-toggle-icon" size={16} />
        </button>
      </AppTooltip>
    </div>
  );
}

type QuickActionMenuProps = {
  commands: readonly SidebarCommandButton[];
  menu: QuickActionMenuState;
  onConfigureActions: () => void;
  onRunCommand: (command: SidebarCommandButton) => void;
  onRunOpenIn: (target: OpenInQuickActionTarget) => void;
  primaryCommandId: string | undefined;
  primaryOpenInTarget: OpenInQuickActionTarget;
};

const QuickActionMenu = forwardRef<HTMLDivElement, QuickActionMenuProps>(function QuickActionMenu(
  {
    commands,
    menu,
    onConfigureActions,
    onRunCommand,
    onRunOpenIn,
    primaryCommandId,
    primaryOpenInTarget,
  },
  ref,
) {
  return (
    <div
      className="quick-action-menu"
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      ref={ref}
      role="menu"
      style={{
        left: `${menu.position.x}px`,
        top: `${menu.position.y}px`,
        width: `${QUICK_ACTION_MENU_WIDTH_PX}px`,
      }}
    >
      {menu.kind === "command" ? (
        <>
          <div className="quick-action-menu-label">Actions</div>
          {commands.length > 0 ? (
            commands.map((command) => (
              <QuickActionMenuItem
                icon={<CommandQuickActionIcon command={command} />}
                isSelected={command.commandId === primaryCommandId}
                key={command.commandId}
                label={quickCommandLabel(command)}
                onClick={() => onRunCommand(command)}
              />
            ))
          ) : (
            <div className="quick-action-menu-empty">No Actions configured</div>
          )}
          <div className="quick-action-menu-divider" role="separator" />
          <QuickActionMenuItem
            icon={<IconPencil aria-hidden="true" size={18} stroke={1.8} />}
            label="Configure"
            onClick={onConfigureActions}
          />
        </>
      ) : null}
      {menu.kind === "openIn" ? (
        <>
          <div className="quick-action-menu-label">Open In</div>
          {OPEN_IN_QUICK_ACTIONS.map((item) => (
            <QuickActionMenuItem
              icon={<OpenInQuickActionIcon target={item.target} />}
              isSelected={primaryOpenInTarget === item.target}
              key={item.target}
              label={item.label}
              onClick={() => onRunOpenIn(item.target)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
});

type QuickActionMenuItemProps = {
  icon: ReactNode;
  isSelected?: boolean;
  label: string;
  onClick: () => void;
};

function QuickActionMenuItem({
  icon,
  isSelected = false,
  label,
  onClick,
}: QuickActionMenuItemProps) {
  return (
    <button
      className="quick-action-menu-item"
      data-selected={String(isSelected)}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <span aria-hidden="true" className="quick-action-menu-item-icon">
        {icon}
      </span>
      <span className="quick-action-menu-item-label">{label}</span>
      {isSelected ? (
        <IconCheck
          aria-hidden="true"
          className="quick-action-menu-item-check"
          size={18}
          stroke={1.9}
        />
      ) : null}
    </button>
  );
}

function CommandQuickActionIcon({ command }: { command: SidebarCommandButton | undefined }) {
  if (command?.icon) {
    return (
      <SidebarCommandIconGlyph
        className="quick-action-icon"
        color={command.iconColor}
        icon={command.icon}
        size={18}
        stroke={1.8}
      />
    );
  }

  return <IconPlayerPlay aria-hidden="true" className="quick-action-icon" size={18} stroke={1.8} />;
}

function OpenInQuickActionIcon({ target }: { target: OpenInQuickActionTarget }) {
  if (target === "finder") {
    return <IconFolderOpen aria-hidden="true" className="quick-action-icon" size={18} stroke={1.8} />;
  }

  if (target === "vscode") {
    return <VisualStudioCodeIcon className="quick-action-icon quick-action-brand-icon" />;
  }

  return <ZedIcon className="quick-action-icon quick-action-brand-icon quick-action-zed-icon" />;
}

function ZedIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M9 6a3 3 0 0 0-3 3v66H0V9a9 9 0 0 1 9-9h80.379c4.009 0 6.016 4.847 3.182 7.682L43.055 57.187H57V51h6v7.688a4.5 4.5 0 0 1-4.5 4.5H37.055L26.743 73.5H73.5V36h6v37.5a6 6 0 0 1-6 6H20.743L10.243 90H87a3 3 0 0 0 3-3V21h6v66a9 9 0 0 1-9 9H6.621c-4.009 0-6.016-4.847-3.182-7.682L52.757 39H39v6h-6v-7.5a4.5 4.5 0 0 1 4.5-4.5h21.257l10.5-10.5H22.5V60h-6V22.5a6 6 0 0 1 6-6h52.757L85.757 6H9Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

function isRunnableSidebarCommand(command: SidebarCommandButton): boolean {
  return command.actionType === "browser"
    ? Boolean(command.url?.trim())
    : Boolean(command.command?.trim());
}

function resolvePrimaryCommand(
  commands: readonly SidebarCommandButton[],
  primaryCommandId: string | undefined,
): SidebarCommandButton | undefined {
  return commands.find((command) => command.commandId === primaryCommandId) ?? commands[0];
}

function quickCommandLabel(command: SidebarCommandButton): string {
  return command.name.trim() || command.commandId;
}

function normalizeOpenInQuickActionTarget(value: string | null): OpenInQuickActionTarget {
  return OPEN_IN_QUICK_ACTIONS.some((item) => item.target === value)
    ? (value as OpenInQuickActionTarget)
    : "finder";
}

function getOpenInQuickActionLabel(target: OpenInQuickActionTarget): string {
  return OPEN_IN_QUICK_ACTIONS.find((item) => item.target === target)?.label ?? "Finder";
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
    <AppTooltip
      content={
        isLaunching ? `Starting ${agent.name}` : agent.command ? agent.name : `Configure ${agent.name}`
      }
    >
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
          ) : agent.icon ? (
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
        </span>
      </button>
    </AppTooltip>
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
