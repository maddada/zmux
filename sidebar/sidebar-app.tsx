import { Tooltip } from "@base-ui/react/tooltip";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, DragOverlay, type DragDropEventHandlers } from "@dnd-kit/react";
import {
  IconBell,
  IconBellOff,
  IconHistory,
  IconLayoutSidebar,
  IconPencil,
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
import { createDefaultSidebarGitState } from "../shared/sidebar-git";
import {
  type SidebarDaemonSessionsStateMessage,
  MAX_GROUP_COUNT,
  type ExtensionToSidebarMessage,
  type SidebarHydrateMessage,
  type SidebarHudState,
  type SidebarPromptGitCommitMessage,
  type SidebarSessionPresentationChangedMessage,
  type SidebarPreviousSessionItem,
  type SidebarSessionGroup,
  type SidebarSessionItem,
  type SidebarSessionStateMessage,
  type SidebarToExtensionMessage,
  type SidebarTheme,
} from "../shared/session-grid-contract";
import { playCompletionSound } from "./completion-sound-player";
import { AgentsPanel } from "./agents-panel";
import { CommandsPanel } from "./commands-panel";
import { DaemonSessionsModal } from "./daemon-sessions-modal";
import { CreateGroupDropTarget } from "./create-group-drop-target";
import { GitCommitModal } from "./git-commit-modal";
import { PreviousSessionsModal } from "./previous-sessions-modal";
import { ScratchPadModal } from "./scratch-pad-modal";
import { SessionCardContent } from "./session-card-content";
import { getSidebarDropData } from "./sidebar-dnd";
import { SessionGroupSection } from "./session-group-section";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import type { WebviewApi } from "./webview-api";

export type SidebarAppProps = {
  messageSource?: Pick<Window, "addEventListener" | "removeEventListener">;
  vscode: WebviewApi;
};

type SidebarState = {
  groups: SidebarSessionGroup[];
  hud: SidebarHudState;
  previousSessions: SidebarPreviousSessionItem[];
  scratchPadContent: string;
};

type SessionIdsByGroup = Record<string, string[]>;

const INITIAL_STATE: SidebarState = {
  groups: [],
  hud: {
    agentManagerZoomPercent: 100,
    agents: createDefaultSidebarAgentButtons(),
    commands: createDefaultSidebarCommandButtons(),
    completionBellEnabled: false,
    completionSound: "ping",
    completionSoundLabel: "Ping",
    debuggingMode: false,
    focusedSessionTitle: undefined,
    git: createDefaultSidebarGitState(),
    highlightedVisibleCount: 1,
    isFocusModeActive: false,
    pendingAgentIds: [],
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
    theme: getInitialSidebarTheme(),
    viewMode: "grid",
    visibleCount: 1,
    visibleSlotLabels: [],
  },
  previousSessions: [],
  scratchPadContent: "",
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

const SIDEBAR_STARTUP_INTERACTION_BLOCK_MS = 1500;

function getInitialSidebarTheme(): SidebarTheme {
  return document.body.classList.contains("vscode-light") ||
    document.body.classList.contains("vscode-high-contrast-light")
    ? "light-blue"
    : "dark-blue";
}

export function SidebarApp({ messageSource = window, vscode }: SidebarAppProps) {
  const [serverState, setServerState] = useState<SidebarState>(INITIAL_STATE);
  const [daemonSessionsState, setDaemonSessionsState] =
    useState<SidebarDaemonSessionsStateMessage>();
  const [isStartupInteractionBlocked, setIsStartupInteractionBlocked] = useState(true);
  const [autoEditingGroupId, setAutoEditingGroupId] = useState<string>();
  const [draggedSessionId, setDraggedSessionId] = useState<string>();
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number>();
  const [agentCreateRequestId, setAgentCreateRequestId] = useState(0);
  const [commandCreateRequestId, setCommandCreateRequestId] = useState(0);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isDaemonSessionsOpen, setIsDaemonSessionsOpen] = useState(false);
  const [isPreviousSessionsOpen, setIsPreviousSessionsOpen] = useState(false);
  const [isScratchPadOpen, setIsScratchPadOpen] = useState(false);
  const [gitCommitDraft, setGitCommitDraft] = useState<SidebarPromptGitCommitMessage>();
  const pendingCreateGroupRef = useRef(false);
  const pendingFocusedSessionIdRef = useRef<string>();
  const overflowControlsRef = useRef<HTMLDivElement>(null);
  const sessionGroupsPanelRef = useRef<HTMLElement>(null);
  const draggedSessionIdRef = useRef<string>();
  const groupIdsRef = useRef<string[]>([]);
  const latestAppliedSidebarRevisionRef = useRef(0);
  const sessionIdsByGroupRef = useRef<SessionIdsByGroup>({});

  const logSidebarDebug = (event: string, details: Record<string, unknown>) => {
    if (!serverState.hud.debuggingMode) {
      return;
    }

    vscode.postMessage({
      details: safeSerializeSidebarDebugDetails(details),
      event,
      type: "sidebarDebugLog",
    });
  };

  const applySidebarMessage = (message: SidebarHydrateMessage | SidebarSessionStateMessage) => {
    if (message.revision < latestAppliedSidebarRevisionRef.current) {
      logSidebarDebug("state.messageIgnoredAsStale", {
        currentRevision: latestAppliedSidebarRevisionRef.current,
        incomingRevision: message.revision,
        messageType: message.type,
      });
      return;
    }

    latestAppliedSidebarRevisionRef.current = message.revision;
    const filteredMessage = {
      ...message,
      groups: reconcilePendingFocusedSession(message.groups),
    };
    logSidebarDebug("state.messageApplied", {
      draggedSessionId: draggedSessionIdRef.current,
      localGroupIds: [...groupIdsRef.current],
      localSessionIdsByGroup: summarizeSessionIdsByGroup(sessionIdsByGroupRef.current),
      messageType: filteredMessage.type,
      nextGroups: summarizeSidebarGroups(filteredMessage.groups),
      revision: filteredMessage.revision,
      pendingCreateGroup: pendingCreateGroupRef.current,
      previousGroups: summarizeSidebarGroups(serverState.groups),
    });

    startTransition(() => {
      setServerState((previous) => {
        if (pendingCreateGroupRef.current) {
          const nextGroupId = findCreatedGroupId(previous.groups, filteredMessage.groups);
          if (nextGroupId) {
            setAutoEditingGroupId(nextGroupId);
            pendingCreateGroupRef.current = false;
          }
        }

        return {
          groups: filteredMessage.groups,
          hud: filteredMessage.hud,
          previousSessions: filteredMessage.previousSessions ?? [],
          scratchPadContent: filteredMessage.scratchPadContent ?? "",
        };
      });
    });
  };

  const applySessionPresentationMessage = (message: SidebarSessionPresentationChangedMessage) => {
    startTransition(() => {
      setServerState((previous) => ({
        ...previous,
        groups: reconcilePendingFocusedSession(
          previous.groups.map((group) => ({
            ...group,
            sessions: group.sessions.map((session) =>
              session.sessionId === message.session.sessionId ? message.session : session,
            ),
          })),
        ),
      }));
    });
  };

  const applyLocalFocus = (groupId: string, sessionId: string) => {
    pendingFocusedSessionIdRef.current = sessionId;
    startTransition(() => {
      setServerState((previous) => ({
        ...previous,
        groups: previous.groups.map((group) => {
          const isActiveGroup = group.groupId === groupId;
          return {
            ...group,
            isActive: isActiveGroup,
            sessions: group.sessions.map((session) => ({
              ...session,
              isFocused: isActiveGroup && session.sessionId === sessionId,
              isVisible:
                group.kind !== "browser" && isActiveGroup && session.sessionId === sessionId
                  ? true
                  : session.isVisible,
            })),
          };
        }),
      }));
    });
  };

  const reconcilePendingFocusedSession = (
    groups: readonly SidebarSessionGroup[],
  ): SidebarSessionGroup[] => {
    const pendingFocusedSessionId = pendingFocusedSessionIdRef.current;
    if (!pendingFocusedSessionId) {
      return [...groups];
    }

    const containingGroup = groups.find((group) =>
      group.sessions.some((session) => session.sessionId === pendingFocusedSessionId),
    );
    if (!containingGroup) {
      pendingFocusedSessionIdRef.current = undefined;
      return [...groups];
    }

    const isConfirmed = containingGroup.sessions.some(
      (session) => session.sessionId === pendingFocusedSessionId && session.isFocused,
    );
    if (isConfirmed) {
      pendingFocusedSessionIdRef.current = undefined;
      return [...groups];
    }

    return groups.map((group) => {
      const isActiveGroup = group.groupId === containingGroup.groupId;
      return {
        ...group,
        isActive: isActiveGroup,
        sessions: group.sessions.map((session) => ({
          ...session,
          isFocused: isActiveGroup && session.sessionId === pendingFocusedSessionId,
          isVisible:
            group.kind !== "browser" && isActiveGroup && session.sessionId === pendingFocusedSessionId
              ? true
              : session.isVisible,
        })),
      };
    });
  };

  const isSidebarInteractionBlocked = isStartupInteractionBlocked;

  const requestNewSession = () => {
    if (isSidebarInteractionBlocked) {
      return;
    }

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

      if (event.data.type === "sessionPresentationChanged") {
        logSidebarDebug("state.sessionPresentationChanged", {
          activity: event.data.session.activity,
          activityLabel: event.data.session.activityLabel,
          primaryTitle: event.data.session.primaryTitle,
          sessionId: event.data.session.sessionId,
          terminalTitle: event.data.session.terminalTitle,
        });
        applySessionPresentationMessage(event.data);
        return;
      }

      if (event.data.type === "daemonSessionsState") {
        setDaemonSessionsState(event.data);
        return;
      }

      if (event.data.type === "promptGitCommit") {
        setGitCommitDraft(event.data);
        return;
      }

      if (event.data.type !== "hydrate" && event.data.type !== "sessionState") {
        return;
      }

      applySidebarMessage(event.data);
    };

    messageSource.addEventListener("message", handleMessage as EventListener);

    return () => {
      messageSource.removeEventListener("message", handleMessage as EventListener);
    };
  }, [messageSource]);

  useEffect(() => {
    draggedSessionIdRef.current = draggedSessionId;
  }, [draggedSessionId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsStartupInteractionBlocked(false);
    }, SIDEBAR_STARTUP_INTERACTION_BLOCK_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

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
    document.body.style.setProperty(
      "--vsmux-agent-manager-zoom",
      `${serverState.hud.agentManagerZoomPercent}%`,
    );

    return () => {
      document.body.style.removeProperty("--vsmux-agent-manager-zoom");
    };
  }, [serverState.hud.agentManagerZoomPercent]);

  useEffect(() => {
    if (!sessionGroupsPanelRef.current) {
      return;
    }

    sessionGroupsPanelRef.current.inert = isSidebarInteractionBlocked;
  }, [isSidebarInteractionBlocked]);

  useEffect(() => {
    if (!isOverflowMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (overflowControlsRef.current?.contains(target)) {
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

  const workspaceGroups = useMemo(
    () => getWorkspaceSidebarGroups(serverState.groups),
    [serverState.groups],
  );

  const effectiveGroupIds = useMemo(
    () => workspaceGroups.map((group) => group.groupId),
    [workspaceGroups],
  );

  const effectiveSessionIdsByGroup = useMemo(
    () => createSessionIdsByGroup(workspaceGroups),
    [workspaceGroups],
  );

  useEffect(() => {
    groupIdsRef.current = effectiveGroupIds;
  }, [effectiveGroupIds]);

  useEffect(() => {
    sessionIdsByGroupRef.current = effectiveSessionIdsByGroup;
  }, [effectiveSessionIdsByGroup]);

  const orderedGroups = useMemo(() => {
    const groupById = new Map(workspaceGroups.map((group) => [group.groupId, group] as const));

    return effectiveGroupIds
      .map((groupId) => groupById.get(groupId))
      .filter((group): group is SidebarSessionGroup => group !== undefined)
      .map((group) => ({
        ...group,
        orderedSessions: applySessionOrder(
          new Map(group.sessions.map((session) => [session.sessionId, session] as const)),
          effectiveSessionIdsByGroup[group.groupId],
        ),
      }));
  }, [effectiveGroupIds, effectiveSessionIdsByGroup, workspaceGroups]);

  const fixedGroups = useMemo(
    () => serverState.groups.filter((group) => group.kind === "browser"),
    [serverState.groups],
  );

  const draggedSession = useMemo(() => {
    if (!draggedSessionId) {
      return undefined;
    }

    return orderedGroups
      .flatMap((group) => group.orderedSessions)
      .find((session) => session.sessionId === draggedSessionId);
  }, [draggedSessionId, orderedGroups]);

  const handleDragStart = ((event) => {
    const sourceData = getSidebarDropData(event.operation.source as { data?: unknown });
    if (sourceData?.kind !== "session") {
      return;
    }

    draggedSessionIdRef.current = sourceData.sessionId;

    const sourceElement = (event.operation.source as { element?: Element | undefined }).element;
    if (sourceElement instanceof HTMLElement) {
      setDragOverlayWidth(sourceElement.getBoundingClientRect().width);
    }

    logSidebarDebug("dragStart.session", {
      groupId: sourceData.groupId,
      sessionId: sourceData.sessionId,
      sessionIdsByGroup: summarizeSessionIdsByGroup(sessionIdsByGroupRef.current),
    });
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

    logSidebarDebug("dragOver.session", {
      authoritativeSessionIdsByGroup: summarizeSessionIdsByGroup(sessionIdsByGroupRef.current),
      source: sourceData,
      target: targetData,
    });
  }) satisfies DragDropEventHandlers["onDragOver"];

  const handleDragEnd = ((event) => {
    const currentGroupIds = groupIdsRef.current;
    const currentSessionIdsByGroup = sessionIdsByGroupRef.current;
    const authoritativeGroupIds = workspaceGroups.map((group) => group.groupId);
    const authoritativeSessionIdsByGroup = createSessionIdsByGroup(workspaceGroups);

    setDraggedSessionId(undefined);
    setDragOverlayWidth(undefined);

    const sourceData = getSidebarDropData(event.operation.source as { data?: unknown });
    const targetData = getSidebarDropData(event.operation.target as { data?: unknown });
    if (!sourceData) {
      return;
    }

    if (sourceData.kind === "group") {
      if (event.canceled || targetData?.kind !== "group") {
        return;
      }

      const nextGroupIds = move(currentGroupIds, event);
      if (haveSameSessionOrder(authoritativeGroupIds, nextGroupIds)) {
        return;
      }

      vscode.postMessage({
        groupIds: nextGroupIds,
        type: "syncGroupOrder",
      });
      return;
    }

    if (sourceData.kind !== "session") {
      return;
    }

    if (event.canceled) {
      logSidebarDebug("dragEnd.sessionCanceled", {
        source: sourceData,
        target: targetData,
      });
      return;
    }

    if (targetData?.kind === "create-group") {
      logSidebarDebug("dragEnd.sessionCreateGroup", {
        source: sourceData,
      });
      pendingCreateGroupRef.current = true;
      vscode.postMessage({
        sessionId: sourceData.sessionId,
        type: "createGroupFromSession",
      });
      return;
    }

    if (!targetData) {
      logSidebarDebug("dragEnd.sessionNoTarget", {
        source: sourceData,
      });
      return;
    }

    const nextSessionIdsByGroup = move(currentSessionIdsByGroup, event);
    logSidebarDebug("dragEnd.sessionComputed", {
      currentSessionIdsByGroup: summarizeSessionIdsByGroup(currentSessionIdsByGroup),
      nextSessionIdsByGroup: summarizeSessionIdsByGroup(nextSessionIdsByGroup),
      source: sourceData,
      target: targetData,
    });
    const previousSessionIdsByGroup = authoritativeSessionIdsByGroup;
    const previousGroupId = findSessionGroupId(previousSessionIdsByGroup, sourceData.sessionId);
    const nextGroupId = findSessionGroupId(nextSessionIdsByGroup, sourceData.sessionId);
    if (!previousGroupId || !nextGroupId) {
      logSidebarDebug("dragEnd.sessionMissingGroupResolution", {
        nextGroupId,
        nextSessionIdsByGroup: summarizeSessionIdsByGroup(nextSessionIdsByGroup),
        previousGroupId,
        previousSessionIdsByGroup: summarizeSessionIdsByGroup(previousSessionIdsByGroup),
        source: sourceData,
      });
      return;
    }

    if (previousGroupId !== nextGroupId) {
      const targetIndex = nextSessionIdsByGroup[nextGroupId]?.indexOf(sourceData.sessionId);
      if (targetIndex == null || targetIndex < 0) {
        logSidebarDebug("dragEnd.sessionMissingTargetIndex", {
          nextGroupId,
          nextSessionIdsByGroup: summarizeSessionIdsByGroup(nextSessionIdsByGroup),
          previousGroupId,
          source: sourceData,
        });
        return;
      }

      logSidebarDebug("dragEnd.sessionMoveToGroup", {
        nextGroupId,
        nextSessionIdsByGroup: summarizeSessionIdsByGroup(nextSessionIdsByGroup),
        previousGroupId,
        previousSessionIdsByGroup: summarizeSessionIdsByGroup(previousSessionIdsByGroup),
        sessionId: sourceData.sessionId,
        target: targetData,
        targetIndex,
      });
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

    logSidebarDebug("dragEnd.sessionReorderWithinGroup", {
      groupId: nextGroupId,
      nextSessionIds: [...nextSessionIds],
      previousSessionIds: [...previousSessionIds],
      sessionId: sourceData.sessionId,
      target: targetData,
    });
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
        data-dimmed={String(isStartupInteractionBlocked)}
        data-sidebar-theme={serverState.hud.theme}
        onDoubleClick={handleSidebarDoubleClick}
      >
        <CommandsPanel
          commands={serverState.hud.commands}
          createRequestId={commandCreateRequestId}
          git={serverState.hud.git}
          titlebarActions={
            <div
              className="sidebar-titlebar-controls"
              data-empty-space-blocking="true"
              ref={overflowControlsRef}
            >
              <ToolbarIconButton
                ariaControls="sidebar-overflow-menu"
                ariaExpanded={isOverflowMenuOpen}
                ariaHasPopup="menu"
                ariaLabel="Open sidebar menu"
                className="floating-toolbar-button section-titlebar-action-button"
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
                    Add Action
                  </button>
                  <button
                    className="session-context-menu-item"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      setIsPreviousSessionsOpen(false);
                      setIsScratchPadOpen(false);
                      setIsDaemonSessionsOpen(true);
                      vscode.postMessage({ type: "refreshDaemonSessions" });
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <IconHistory
                      aria-hidden="true"
                      className="session-context-menu-icon"
                      size={14}
                    />
                    Running
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
                      <IconBellOff
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                    ) : (
                      <IconBell
                        aria-hidden="true"
                        className="session-context-menu-icon"
                        size={14}
                      />
                    )}
                    {getCompletionBellMenuLabel(serverState.hud)}
                  </button>
                  <button
                    className="session-context-menu-item"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      vscode.postMessage({ type: "moveSidebarToOtherSide" });
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <IconLayoutSidebar
                      aria-hidden="true"
                      className="session-context-menu-icon"
                      size={14}
                      stroke={1.8}
                    />
                    Change Sidebar
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
                </div>
              ) : null}
            </div>
          }
          vscode={vscode}
        />
        <AgentsPanel
          agents={serverState.hud.agents}
          createRequestId={agentCreateRequestId}
          pendingAgentIds={serverState.hud.pendingAgentIds}
          titlebarActions={
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <button
                    aria-expanded={isScratchPadOpen}
                    aria-haspopup="dialog"
                    aria-label="Show scratch pad"
                    className="floating-toolbar-button section-titlebar-action-button"
                    data-empty-space-blocking="true"
                    data-selected={String(isScratchPadOpen)}
                    onClick={() => {
                      setIsDaemonSessionsOpen(false);
                      setIsPreviousSessionsOpen(false);
                      setIsScratchPadOpen((previous) => !previous);
                    }}
                    type="button"
                  >
                    <IconPencil aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
                  </button>
                }
              />
              <Tooltip.Portal>
                <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
                  <Tooltip.Popup className="tooltip-popup">Scratch Pad</Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          }
          vscode={vscode}
        />
        <section
          className="session-groups-panel"
          ref={sessionGroupsPanelRef}
        >
          <div className="section-titlebar" data-empty-space-blocking="true">
            <div aria-hidden="true" className="section-titlebar-line" />
            <span className="section-titlebar-label">Sessions</span>
            <div className="section-titlebar-actions">
              <div aria-hidden="true" className="section-titlebar-line" />
              <ToolbarIconButton
                ariaExpanded={isPreviousSessionsOpen}
                ariaHasPopup="dialog"
                ariaLabel="Show previous sessions"
                className="floating-toolbar-button section-titlebar-action-button"
                isSelected={isPreviousSessionsOpen}
                onClick={() => {
                  setIsDaemonSessionsOpen(false);
                  setIsScratchPadOpen(false);
                  setIsPreviousSessionsOpen((previous) => !previous);
                }}
                tooltip="Previous Sessions"
              >
                <IconHistory aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
              </ToolbarIconButton>
            </div>
          </div>
          {fixedGroups.length > 0 ? (
            <div className="group-list">
              {fixedGroups.map((group) => (
                <SessionGroupSection
                  autoEdit={false}
                  canClose={false}
                  group={group}
                  index={-1}
                  key={group.groupId}
                  onAutoEditHandled={() => undefined}
                  orderedSessions={group.sessions}
                  showDebugSessionNumbers={serverState.hud.debuggingMode}
                  showCloseButton={serverState.hud.showCloseButtonOnSessionCards}
                  showHotkeys={serverState.hud.showHotkeysOnSessionCards}
                  vscode={vscode}
                />
              ))}
            </div>
          ) : null}
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
                  onFocusRequested={applyLocalFocus}
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
            <DragOverlay
              dropAnimation={{
                duration: 220,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {draggedSession ? (
                <div
                  className="session session-drag-overlay"
                  data-activity={draggedSession.activity}
                  data-focused={String(draggedSession.isFocused)}
                  data-has-agent-icon={String(Boolean(draggedSession.agentIcon))}
                  data-running={String(draggedSession.isRunning)}
                  data-visible={String(draggedSession.isVisible)}
                  style={
                    dragOverlayWidth ? { width: `${Math.round(dragOverlayWidth)}px` } : undefined
                  }
                >
                  <SessionCardContent
                    session={draggedSession}
                    showCloseButton={false}
                    showDebugSessionNumbers={serverState.hud.debuggingMode}
                    showHotkeys={serverState.hud.showHotkeysOnSessionCards}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DragDropProvider>
          {fixedGroups.length === 0 &&
          orderedGroups.every((group) => group.sessions.length === 0) ? (
            <div className="empty" data-empty-space-blocking="true">
              Create the first session to start the workspace.
            </div>
          ) : null}
        </section>
        <PreviousSessionsModal
          isOpen={isPreviousSessionsOpen}
          onClose={() => setIsPreviousSessionsOpen(false)}
          previousSessions={serverState.previousSessions}
          showDebugSessionNumbers={serverState.hud.debuggingMode}
          showHotkeys={serverState.hud.showHotkeysOnSessionCards}
          vscode={vscode}
        />
        <DaemonSessionsModal
          isOpen={isDaemonSessionsOpen}
          onClose={() => setIsDaemonSessionsOpen(false)}
          state={daemonSessionsState}
          vscode={vscode}
        />
        <ScratchPadModal
          content={serverState.scratchPadContent}
          isOpen={isScratchPadOpen}
          onClose={() => setIsScratchPadOpen(false)}
          onSave={(content) => {
            vscode.postMessage({
              content,
              type: "saveScratchPad",
            });
          }}
        />
        <GitCommitModal
          draft={
            gitCommitDraft ?? {
              confirmLabel: "Commit",
              description: "",
              requestId: "",
              suggestedSubject: "",
            }
          }
          isOpen={gitCommitDraft !== undefined}
          onCancel={(requestId) => {
            setGitCommitDraft(undefined);
            vscode.postMessage({
              requestId,
              type: "cancelSidebarGitCommit",
            });
          }}
          onConfirm={(requestId, subject) => {
            setGitCommitDraft(undefined);
            vscode.postMessage({
              requestId,
              subject,
              type: "confirmSidebarGitCommit",
            });
          }}
        />
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
  ariaHasPopup?: "dialog" | "menu";
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

function createSessionIdsByGroup(groups: readonly SidebarSessionGroup[]): SessionIdsByGroup {
  return Object.fromEntries(
    groups.map((group) => [group.groupId, group.sessions.map((session) => session.sessionId)]),
  );
}

function getWorkspaceSidebarGroups(groups: readonly SidebarSessionGroup[]): SidebarSessionGroup[] {
  return groups.filter((group) => group.kind !== "browser");
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
  if (!orderedSessionIds || orderedSessionIds.length === 0) {
    return [...sessionById.values()];
  }

  const orderedSessions = orderedSessionIds
    .map((sessionId) => sessionById.get(sessionId))
    .filter((session): session is SidebarSessionItem => session !== undefined);
  const orderedSessionIdsSet = new Set(orderedSessions.map((session) => session.sessionId));

  for (const session of sessionById.values()) {
    if (!orderedSessionIdsSet.has(session.sessionId)) {
      orderedSessions.push(session);
    }
  }

  return orderedSessions;
}

function findSessionGroupId(
  sessionIdsByGroup: SessionIdsByGroup,
  sessionId: string,
): string | undefined {
  return Object.entries(sessionIdsByGroup).find(([, sessionIds]) =>
    sessionIds.includes(sessionId),
  )?.[0];
}

function haveSameSessionOrder(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((sessionId, index) => sessionId === right[index]);
}

function findCreatedGroupId(
  previousGroups: readonly SidebarSessionGroup[],
  nextGroups: readonly SidebarSessionGroup[],
): string | undefined {
  const previousGroupIds = new Set(previousGroups.map((group) => group.groupId));
  return nextGroups.find((group) => !previousGroupIds.has(group.groupId))?.groupId;
}

function summarizeSidebarGroups(groups: readonly SidebarSessionGroup[]) {
  return groups.map((group) => ({
    groupId: group.groupId,
    isActive: group.isActive,
    sessionIds: group.sessions.map((session) => session.sessionId),
    title: group.title,
  }));
}

function summarizeSessionIdsByGroup(sessionIdsByGroup: SessionIdsByGroup | undefined) {
  if (!sessionIdsByGroup) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(sessionIdsByGroup).map(([groupId, sessionIds]) => [groupId, [...sessionIds]]),
  );
}

function safeSerializeSidebarDebugDetails(details: Record<string, unknown>): string {
  try {
    return JSON.stringify(details);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
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
  return hud.completionBellEnabled ? "Disable Notifying" : "Enable Notifying";
}
