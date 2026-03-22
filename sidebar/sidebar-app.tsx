import { Tooltip } from "@base-ui/react/tooltip";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import {
  IconBell,
  IconBellOff,
  IconBug,
  IconFocusCentered,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createDefaultSidebarAgentButtons } from "../shared/sidebar-agents";
import { createDefaultSidebarCommandButtons } from "../shared/sidebar-commands";
import {
  MAX_GROUP_COUNT,
  type ExtensionToSidebarMessage,
  type SidebarHydrateMessage,
  type SidebarHudState,
  type SidebarSessionGroup,
  type SidebarSessionItem,
  type SidebarSessionStateMessage,
  type SidebarTheme,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import { playCompletionSound } from "./completion-sound-player";
import { AgentsPanel } from "./agents-panel";
import { CommandsPanel } from "./commands-panel";
import { CreateGroupDropTarget } from "./create-group-drop-target";
import { getSidebarDropData } from "./sidebar-dnd";
import { SessionGroupSection } from "./session-group-section";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import type { WebviewApi } from "./webview-api";

export type SidebarAppProps = {
  vscode: WebviewApi;
};

type SidebarState = {
  groups: SidebarSessionGroup[];
  hud: SidebarHudState;
};

type SessionIdsByGroup = Record<string, string[]>;

const COUNT_OPTIONS: VisibleSessionCount[] = [1, 2, 3, 4, 6, 9];
const MODE_OPTIONS: { tooltip: string; viewMode: TerminalViewMode }[] = [
  { tooltip: "Vertical", viewMode: "vertical" },
  { tooltip: "Horizontal", viewMode: "horizontal" },
  { tooltip: "Grid", viewMode: "grid" },
];

const INITIAL_STATE: SidebarState = {
  groups: [],
  hud: {
    agents: createDefaultSidebarAgentButtons(),
    commands: createDefaultSidebarCommandButtons(),
    completionBellEnabled: false,
    completionSound: "ping",
    completionSoundLabel: "Ping",
    debuggingMode: false,
    focusedSessionTitle: undefined,
    highlightedVisibleCount: 1,
    isFocusModeActive: false,
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
    theme: getInitialSidebarTheme(),
    viewMode: "grid",
    visibleCount: 1,
    visibleSlotLabels: [],
  },
};

const SIDEBAR_EMPTY_SPACE_BLOCKER_SELECTOR = [
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "[role='button']",
  "[role='menu']",
  "[role='menuitem']",
  "[data-empty-space-blocking='true']",
].join(", ");

const sensors = [
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === "touch") {
        return [new PointerActivationConstraints.Delay({ tolerance: 5, value: 250 })];
      }

      return [new PointerActivationConstraints.Distance({ value: 6 })];
    },
  }),
  KeyboardSensor,
];

function getInitialSidebarTheme(): SidebarTheme {
  return document.body.classList.contains("vscode-light") ||
    document.body.classList.contains("vscode-high-contrast-light")
    ? "light-blue"
    : "dark-blue";
}

export function SidebarApp({ vscode }: SidebarAppProps) {
  const [serverState, setServerState] = useState<SidebarState>(INITIAL_STATE);
  const [autoEditingGroupId, setAutoEditingGroupId] = useState<string>();
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [sessionIdsByGroup, setSessionIdsByGroup] = useState<SessionIdsByGroup>({});
  const [draggedSessionId, setDraggedSessionId] = useState<string>();
  const [agentCreateRequestId, setAgentCreateRequestId] = useState(0);
  const [commandCreateRequestId, setCommandCreateRequestId] = useState(0);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const pendingCreateGroupRef = useRef(false);
  const floatingControlsRef = useRef<HTMLDivElement>(null);
  const draggedSessionIdRef = useRef<string>();
  const groupIdsRef = useRef<string[]>([]);
  const sessionIdsByGroupRef = useRef<SessionIdsByGroup>({});
  const sessionDragSnapshotRef = useRef<SessionIdsByGroup>();
  const deferredSidebarMessageRef = useRef<SidebarHydrateMessage | SidebarSessionStateMessage>();

  const applySidebarMessage = (message: SidebarHydrateMessage | SidebarSessionStateMessage) => {
    startTransition(() => {
      setServerState((previous) => {
        if (pendingCreateGroupRef.current) {
          const nextGroupId = findCreatedGroupId(previous.groups, message.groups);
          if (nextGroupId) {
            setAutoEditingGroupId(nextGroupId);
            pendingCreateGroupRef.current = false;
          }
        }

        return {
          groups: message.groups,
          hud: message.hud,
        };
      });
      setGroupIds(message.groups.map((group) => group.groupId));
      setSessionIdsByGroup(createSessionIdsByGroup(message.groups));
    });
  };

  const flushDeferredSidebarMessage = () => {
    if (draggedSessionIdRef.current) {
      return;
    }

    const nextMessage = deferredSidebarMessageRef.current;
    if (!nextMessage) {
      return;
    }

    deferredSidebarMessageRef.current = undefined;
    applySidebarMessage(nextMessage);
  };

  const requestNewSession = () => {
    vscode.postMessage({ type: "createSession" });
  };

  const handleSidebarDoubleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!isEmptySidebarDoubleClick(event.target, event.currentTarget)) {
      return;
    }

    event.preventDefault();
    requestNewSession();
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToSidebarMessage>) => {
      if (!event.data) {
        return;
      }

      if (event.data.type === "playCompletionSound") {
        void playCompletionSound(event.data.sound);
        return;
      }

      if (event.data.type !== "hydrate" && event.data.type !== "sessionState") {
        return;
      }

      if (draggedSessionIdRef.current) {
        deferredSidebarMessageRef.current = event.data;
        return;
      }

      applySidebarMessage(event.data);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    draggedSessionIdRef.current = draggedSessionId;
    flushDeferredSidebarMessage();
  }, [draggedSessionId]);

  useEffect(() => {
    groupIdsRef.current = groupIds;
  }, [groupIds]);

  useEffect(() => {
    sessionIdsByGroupRef.current = sessionIdsByGroup;
  }, [sessionIdsByGroup]);

  useEffect(() => {
    vscode.postMessage({ type: "ready" });
  }, [vscode]);

  useEffect(() => {
    document.body.dataset.sidebarTheme = serverState.hud.theme;

    return () => {
      delete document.body.dataset.sidebarTheme;
    };
  }, [serverState.hud.theme]);

  useEffect(() => {
    if (!isOverflowMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (floatingControlsRef.current?.contains(target)) {
        return;
      }

      setIsOverflowMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOverflowMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOverflowMenuOpen]);

  const orderedGroups = useMemo(() => {
    const groupById = new Map(serverState.groups.map((group) => [group.groupId, group] as const));
    const sessionById = new Map(
      serverState.groups.flatMap((group) =>
        group.sessions.map((session) => [session.sessionId, session] as const),
      ),
    );

    return groupIds
      .map((groupId) => groupById.get(groupId))
      .filter((group): group is SidebarSessionGroup => group !== undefined)
      .map((group) => ({
        ...group,
        orderedSessions: applySessionOrder(sessionById, sessionIdsByGroup[group.groupId]),
      }));
  }, [groupIds, serverState.groups, sessionIdsByGroup]);

  const handleDragStart = ((event) => {
    const sourceData = getSidebarDropData(event.operation.source as { data?: unknown });
    if (sourceData?.kind !== "session") {
      return;
    }

    sessionDragSnapshotRef.current = cloneSessionIdsByGroup(sessionIdsByGroupRef.current);
    setDraggedSessionId(sourceData.sessionId);
  }) satisfies DragDropEventHandlers["onDragStart"];

  const handleDragOver = ((event) => {
    if (event.canceled) {
      return;
    }

    const sourceData = getSidebarDropData(event.operation.source as { data?: unknown });
    const targetData = getSidebarDropData(event.operation.target as { data?: unknown });
    if (sourceData?.kind !== "session" || !targetData || targetData.kind === "create-group") {
      return;
    }

    setSessionIdsByGroup((items) => move(items, event));
  }) satisfies DragDropEventHandlers["onDragOver"];

  const handleDragEnd = ((event) => {
    setDraggedSessionId(undefined);

    const sourceData = getSidebarDropData(event.operation.source as { data?: unknown });
    const targetData = getSidebarDropData(event.operation.target as { data?: unknown });
    if (!sourceData) {
      return;
    }

    if (sourceData.kind === "group") {
      if (event.canceled || targetData?.kind !== "group") {
        return;
      }

      const nextGroupIds = move(groupIdsRef.current, event);
      if (haveSameSessionOrder(groupIdsRef.current, nextGroupIds)) {
        return;
      }

      startTransition(() => {
        setGroupIds(nextGroupIds);
      });
      vscode.postMessage({
        groupIds: nextGroupIds,
        type: "syncGroupOrder",
      });
      return;
    }

    if (sourceData.kind !== "session") {
      return;
    }

    const snapshot = sessionDragSnapshotRef.current;
    const restoreSnapshot = () => {
      if (!snapshot) {
        return;
      }

      startTransition(() => {
        setSessionIdsByGroup(snapshot);
      });
    };

    if (event.canceled) {
      restoreSnapshot();
      sessionDragSnapshotRef.current = undefined;
      return;
    }

    if (targetData?.kind === "create-group") {
      restoreSnapshot();
      sessionDragSnapshotRef.current = undefined;
      pendingCreateGroupRef.current = true;
      vscode.postMessage({
        sessionId: sourceData.sessionId,
        type: "createGroupFromSession",
      });
      return;
    }

    if (!targetData) {
      restoreSnapshot();
      sessionDragSnapshotRef.current = undefined;
      return;
    }

    const nextSessionIdsByGroup = move(sessionIdsByGroupRef.current, event);
    if (!haveSameSessionIdsByGroup(sessionIdsByGroupRef.current, nextSessionIdsByGroup)) {
      startTransition(() => {
        setSessionIdsByGroup(nextSessionIdsByGroup);
      });
    }

    sessionDragSnapshotRef.current = undefined;

    const previousSessionIdsByGroup = snapshot ?? sessionIdsByGroupRef.current;
    const previousGroupId = findSessionGroupId(previousSessionIdsByGroup, sourceData.sessionId);
    const nextGroupId = findSessionGroupId(nextSessionIdsByGroup, sourceData.sessionId);
    if (!previousGroupId || !nextGroupId) {
      restoreSnapshot();
      return;
    }

    if (previousGroupId !== nextGroupId) {
      const targetIndex = nextSessionIdsByGroup[nextGroupId]?.indexOf(sourceData.sessionId);
      if (targetIndex == null || targetIndex < 0) {
        restoreSnapshot();
        return;
      }

      vscode.postMessage({
        groupId: nextGroupId,
        sessionId: sourceData.sessionId,
        targetIndex,
        type: "moveSessionToGroup",
      });
      return;
    }

    const previousSessionIds = previousSessionIdsByGroup[nextGroupId] ?? [];
    const nextSessionIds = nextSessionIdsByGroup[nextGroupId] ?? [];
    if (haveSameSessionOrder(previousSessionIds, nextSessionIds)) {
      return;
    }

    vscode.postMessage({
      groupId: nextGroupId,
      sessionIds: nextSessionIds,
      type: "syncSessionOrder",
    });
  }) satisfies DragDropEventHandlers["onDragEnd"];

  return (
    <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
      <div
        className="stack"
        data-sidebar-theme={serverState.hud.theme}
        onDoubleClick={handleSidebarDoubleClick}
      >
        <div
          className="sidebar-floating-controls"
          data-empty-space-blocking="true"
          ref={floatingControlsRef}
        >
          <ToolbarIconButton
            ariaControls="sidebar-overflow-menu"
            ariaExpanded={isOverflowMenuOpen}
            ariaHasPopup="menu"
            ariaLabel="Open sidebar menu"
            className="floating-toolbar-button"
            isSelected={isOverflowMenuOpen}
            onClick={() => setIsOverflowMenuOpen((previous) => !previous)}
            tooltip="More"
          >
            <OverflowIcon />
          </ToolbarIconButton>
          {isOverflowMenuOpen ? (
            <div
              aria-label="Sidebar actions"
              className="session-context-menu sidebar-floating-menu"
              data-empty-space-blocking="true"
              id="sidebar-overflow-menu"
              role="menu"
            >
              <button
                className="session-context-menu-item"
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  setAgentCreateRequestId((previous) => previous + 1);
                }}
                role="menuitem"
                type="button"
              >
                <IconPlus aria-hidden="true" className="session-context-menu-icon" size={14} />
                Add Agent
              </button>
              <button
                className="session-context-menu-item"
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  setCommandCreateRequestId((previous) => previous + 1);
                }}
                role="menuitem"
                type="button"
              >
                <IconPlus aria-hidden="true" className="session-context-menu-icon" size={14} />
                Add Command
              </button>
              <button
                className="session-context-menu-item"
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  vscode.postMessage({ type: "toggleCompletionBell" });
                }}
                role="menuitem"
                type="button"
              >
                {serverState.hud.completionBellEnabled ? (
                  <IconBellOff aria-hidden="true" className="session-context-menu-icon" size={14} />
                ) : (
                  <IconBell aria-hidden="true" className="session-context-menu-icon" size={14} />
                )}
                {getCompletionBellMenuLabel(serverState.hud)}
              </button>
              <button
                className="session-context-menu-item"
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  vscode.postMessage({ type: "openSettings" });
                }}
                role="menuitem"
                type="button"
              >
                <IconSettings
                  aria-hidden="true"
                  className="session-context-menu-icon"
                  size={14}
                  stroke={1.8}
                />
                Sidebar Settings
              </button>
              {serverState.hud.debuggingMode ? (
                <button
                  className="session-context-menu-item"
                  onClick={() => {
                    setIsOverflowMenuOpen(false);
                    vscode.postMessage({ type: "openDebugInspector" });
                  }}
                  role="menuitem"
                  type="button"
                >
                  <IconBug
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  Open Move Debugger
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <section className="commands-section">
          <div className="section-titlebar" data-empty-space-blocking="true">
            <div aria-hidden="true" className="section-titlebar-line" />
            <span className="section-titlebar-label">Layout</span>
            <div aria-hidden="true" className="section-titlebar-line" />
          </div>
          <div className="card hud">
            <div className="toolbar-row">
              <div className="toolbar-section">
                <div className="toolbar-layout-block">
                  <div className="button-group toolbar-mode-group">
                    <ToolbarIconButton
                      ariaLabel="Toggle focus mode"
                      isSelected={serverState.hud.isFocusModeActive}
                      onClick={() => vscode.postMessage({ type: "toggleFullscreenSession" })}
                      tooltip={
                        serverState.hud.isFocusModeActive
                          ? "Restore previous session layout"
                          : "Focus on the active session"
                      }
                    >
                      <IconFocusCentered
                        aria-hidden="true"
                        className="toolbar-tabler-icon"
                        stroke={1.8}
                      />
                    </ToolbarIconButton>
                    <div aria-hidden="true" className="toolbar-divider" />
                    {MODE_OPTIONS.map((mode) => (
                      <ModeButton
                        isDimmed={serverState.hud.isFocusModeActive}
                        key={mode.viewMode}
                        mode={mode}
                        viewMode={serverState.hud.viewMode}
                        visibleCount={serverState.hud.visibleCount}
                        vscode={vscode}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="toolbar-section">
                <div className="control-label" data-empty-space-blocking="true">
                  Sessions Shown
                </div>
                <div className="button-group">
                  {COUNT_OPTIONS.map((visibleCount) => (
                    <ToolbarIconButton
                      ariaLabel={`Show ${visibleCount} session${visibleCount === 1 ? "" : "s"}`}
                      key={visibleCount}
                      data-dimmed={String(serverState.hud.isFocusModeActive)}
                      onClick={() => vscode.postMessage({ type: "setVisibleCount", visibleCount })}
                      tooltip={`Show ${visibleCount} session${visibleCount === 1 ? "" : "s"}`}
                      isDimmed={serverState.hud.isFocusModeActive}
                      isSelected={serverState.hud.highlightedVisibleCount === visibleCount}
                    >
                      {visibleCount}
                    </ToolbarIconButton>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <AgentsPanel
          agents={serverState.hud.agents}
          createRequestId={agentCreateRequestId}
          vscode={vscode}
        />
        <CommandsPanel
          commands={serverState.hud.commands}
          createRequestId={commandCreateRequestId}
          vscode={vscode}
        />
        <section className="session-groups-panel">
          <div className="section-titlebar" data-empty-space-blocking="true">
            <div aria-hidden="true" className="section-titlebar-line" />
            <span className="section-titlebar-label">Sessions</span>
            <div aria-hidden="true" className="section-titlebar-line" />
          </div>
          <DragDropProvider
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            sensors={sensors}
          >
            <div className="group-list">
              {orderedGroups.map((group, groupIndex) => (
                <SessionGroupSection
                  autoEdit={autoEditingGroupId === group.groupId}
                  canClose={orderedGroups.length > 1}
                  group={group}
                  index={groupIndex}
                  key={group.groupId}
                  onAutoEditHandled={() => setAutoEditingGroupId(undefined)}
                  orderedSessions={group.orderedSessions}
                  showDebugSessionNumbers={serverState.hud.debuggingMode}
                  showCloseButton={serverState.hud.showCloseButtonOnSessionCards}
                  showHotkeys={serverState.hud.showHotkeysOnSessionCards}
                  vscode={vscode}
                />
              ))}
              <CreateGroupDropTarget
                isVisible={Boolean(draggedSessionId) && orderedGroups.length < MAX_GROUP_COUNT}
              />
            </div>
          </DragDropProvider>
          {orderedGroups.every((group) => group.sessions.length === 0) ? (
            <div className="empty" data-empty-space-blocking="true">
              Create the first session to start the workspace.
            </div>
          ) : null}
        </section>
      </div>
    </Tooltip.Provider>
  );
}

function isEmptySidebarDoubleClick(
  target: EventTarget | null,
  currentTarget: HTMLElement,
): boolean {
  if (target === currentTarget) {
    return true;
  }

  const targetNode = target instanceof Node ? target : undefined;
  const targetElement =
    targetNode instanceof Element ? targetNode : (targetNode?.parentElement ?? undefined);
  if (!targetElement || !currentTarget.contains(targetElement)) {
    return false;
  }

  return targetElement.closest(SIDEBAR_EMPTY_SPACE_BLOCKER_SELECTOR) === null;
}

type ToolbarIconButtonProps = {
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: "menu";
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  dataDimmed?: string;
  isDisabled?: boolean;
  isDimmed?: boolean;
  isSelected?: boolean;
  onClick: () => void;
  tabIndex?: number;
  tooltip: string;
};

function ToolbarIconButton({
  ariaControls,
  ariaExpanded,
  ariaHasPopup,
  ariaLabel,
  children,
  className,
  dataDimmed,
  isDisabled = false,
  isDimmed = false,
  isSelected = false,
  onClick,
  tabIndex,
  tooltip,
}: ToolbarIconButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            aria-controls={ariaControls}
            aria-disabled={isDisabled}
            aria-expanded={ariaExpanded}
            aria-haspopup={ariaHasPopup}
            aria-label={ariaLabel}
            className={className ? `toolbar-button ${className}` : "toolbar-button"}
            data-disabled={String(isDisabled)}
            data-dimmed={dataDimmed ?? String(isDimmed)}
            data-selected={String(isSelected)}
            onClick={() => {
              if (isDisabled) {
                return;
              }

              onClick();
            }}
            tabIndex={tabIndex}
            type="button"
          >
            {children}
          </button>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">{tooltip}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

type ModeButtonProps = {
  isDimmed: boolean;
  mode: (typeof MODE_OPTIONS)[number];
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
  vscode: WebviewApi;
};

function ModeButton({ isDimmed, mode, viewMode, visibleCount, vscode }: ModeButtonProps) {
  const isDisabled = isViewModeDisabled(mode.viewMode, visibleCount);

  return (
    <ToolbarIconButton
      ariaLabel={mode.tooltip}
      isDisabled={isDisabled}
      isDimmed={isDimmed}
      isSelected={!isDimmed && viewMode === mode.viewMode}
      onClick={() => {
        vscode.postMessage({ type: "setViewMode", viewMode: mode.viewMode });
      }}
      tabIndex={isDisabled ? -1 : 0}
      tooltip={mode.tooltip}
    >
      <LayoutModeIcon viewMode={mode.viewMode} />
    </ToolbarIconButton>
  );
}

function createSessionIdsByGroup(groups: readonly SidebarSessionGroup[]): SessionIdsByGroup {
  return Object.fromEntries(
    groups.map((group) => [group.groupId, group.sessions.map((session) => session.sessionId)]),
  );
}

function cloneSessionIdsByGroup(sessionIdsByGroup: SessionIdsByGroup): SessionIdsByGroup {
  return Object.fromEntries(
    Object.entries(sessionIdsByGroup).map(([groupId, sessionIds]) => [groupId, [...sessionIds]]),
  );
}

function applySessionOrder(
  sessionById: ReadonlyMap<string, SidebarSessionItem>,
  orderedSessionIds: readonly string[] | undefined,
): SidebarSessionItem[] {
  if (!orderedSessionIds) {
    return [];
  }

  return orderedSessionIds
    .map((sessionId) => sessionById.get(sessionId))
    .filter((session): session is SidebarSessionItem => session !== undefined);
}

function findSessionGroupId(
  sessionIdsByGroup: SessionIdsByGroup,
  sessionId: string,
): string | undefined {
  return Object.entries(sessionIdsByGroup).find(([, sessionIds]) =>
    sessionIds.includes(sessionId),
  )?.[0];
}

function haveSameSessionIdsByGroup(left: SessionIdsByGroup, right: SessionIdsByGroup): boolean {
  const leftGroupIds = Object.keys(left);
  const rightGroupIds = Object.keys(right);
  if (!haveSameSessionOrder(leftGroupIds, rightGroupIds)) {
    return false;
  }

  return leftGroupIds.every((groupId) =>
    haveSameSessionOrder(left[groupId] ?? [], right[groupId] ?? []),
  );
}

function haveSameSessionOrder(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((sessionId, index) => sessionId === right[index]);
}

function isViewModeDisabled(
  viewMode: TerminalViewMode,
  visibleCount: VisibleSessionCount,
): boolean {
  if (visibleCount === 1) {
    return true;
  }

  if (visibleCount === 2 && viewMode === "grid") {
    return true;
  }

  return false;
}

function findCreatedGroupId(
  previousGroups: readonly SidebarSessionGroup[],
  nextGroups: readonly SidebarSessionGroup[],
): string | undefined {
  const previousGroupIds = new Set(previousGroups.map((group) => group.groupId));
  return nextGroups.find((group) => !previousGroupIds.has(group.groupId))?.groupId;
}

type LayoutModeIconProps = {
  viewMode: TerminalViewMode;
};

function LayoutModeIcon({ viewMode }: LayoutModeIconProps) {
  switch (viewMode) {
    case "horizontal":
      return (
        <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 16 16">
          <rect className="toolbar-icon-frame" height="12" rx="2" width="12" x="2" y="2" />
          <path className="toolbar-icon-line" d="M6 4v8M10 4v8" />
        </svg>
      );
    case "vertical":
      return (
        <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 16 16">
          <rect className="toolbar-icon-frame" height="12" rx="2" width="12" x="2" y="2" />
          <path className="toolbar-icon-line" d="M4 6h8M4 10h8" />
        </svg>
      );
    case "grid":
      return (
        <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 16 16">
          <rect className="toolbar-icon-frame" height="12" rx="2" width="12" x="2" y="2" />
          <path className="toolbar-icon-line" d="M8 4v8M4 8h8" />
        </svg>
      );
  }
}

type SettingsIconProps = {
  className?: string;
};

function SettingsIcon({ className }: SettingsIconProps) {
  return (
    <svg aria-hidden="true" className={className ?? "toolbar-icon"} viewBox="0 0 16 16">
      <path
        className="toolbar-icon-line"
        d="M8 2.2v1.4M8 12.4v1.4M3.76 3.76l1 1M11.24 11.24l1 1M2.2 8h1.4M12.4 8h1.4M3.76 12.24l1-1M11.24 4.76l1-1"
      />
      <circle className="toolbar-icon-frame" cx="8" cy="8" r="2.4" />
      <circle className="toolbar-icon-frame" cx="8" cy="8" r="4.6" />
    </svg>
  );
}

function OverflowIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 16 16">
      <circle cx="3.5" cy="8" fill="currentColor" r="1.1" />
      <circle cx="8" cy="8" fill="currentColor" r="1.1" />
      <circle cx="12.5" cy="8" fill="currentColor" r="1.1" />
    </svg>
  );
}

function getCompletionBellMenuLabel(hud: SidebarHudState): string {
  return hud.completionBellEnabled ? "Disable Notifications" : "Enable Notifications";
}
