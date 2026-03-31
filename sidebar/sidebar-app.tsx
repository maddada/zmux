import { Tooltip } from "@base-ui/react/tooltip";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
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
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  MAX_GROUP_COUNT,
  type ExtensionToSidebarMessage,
} from "../shared/session-grid-contract";
import { playCompletionSound } from "./completion-sound-player";
import { AgentsPanel } from "./agents-panel";
import { CommandsPanel } from "./commands-panel";
import { DaemonSessionsModal } from "./daemon-sessions-modal";
import { GitCommitModal } from "./git-commit-modal";
import { PreviousSessionsModal } from "./previous-sessions-modal";
import { ScratchPadModal } from "./scratch-pad-modal";
import { resetSidebarStore, useSidebarStore } from "./sidebar-store";
import {
  getClientPoint,
  getSidebarDropData,
  type SidebarSessionDropTarget,
  getSidebarSessionDropTargetFromEvent,
  getSidebarSessionDropTargetAtPoint,
  moveSessionIdsByDropTarget,
} from "./sidebar-dnd";
import { SessionGroupSection } from "./session-group-section";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import type { WebviewApi } from "./webview-api";

export type SidebarAppProps = {
  messageSource?: Pick<Window, "addEventListener" | "removeEventListener">;
  vscode: WebviewApi;
};

type SessionIdsByGroup = Record<string, string[]>;

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

export function SidebarApp({ messageSource = window, vscode }: SidebarAppProps) {
  const [isStartupInteractionBlocked, setIsStartupInteractionBlocked] = useState(true);
  const [autoEditingGroupId, setAutoEditingGroupId] = useState<string>();
  const [agentCreateRequestId, setAgentCreateRequestId] = useState(0);
  const [commandCreateRequestId, setCommandCreateRequestId] = useState(0);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isDaemonSessionsOpen, setIsDaemonSessionsOpen] = useState(false);
  const [isPreviousSessionsOpen, setIsPreviousSessionsOpen] = useState(false);
  const [isScratchPadOpen, setIsScratchPadOpen] = useState(false);
  const [sessionDragIndicator, setSessionDragIndicator] = useState<SidebarSessionDropTarget>();
  const pendingCreateGroupRef = useRef(false);
  const didResetStoreRef = useRef(false);
  const overflowControlsRef = useRef<HTMLDivElement>(null);
  const sessionGroupsPanelRef = useRef<HTMLElement>(null);
  const groupIdsRef = useRef<string[]>([]);
  const sessionIdsByGroupRef = useRef<SessionIdsByGroup>({});

  if (!didResetStoreRef.current) {
    resetSidebarStore();
    didResetStoreRef.current = true;
  }

  const applyLocalFocus = useSidebarStore((state) => state.applyLocalFocus);
  const applySessionPresentationMessage = useSidebarStore(
    (state) => state.applySessionPresentationMessage,
  );
  const applySidebarMessage = useSidebarStore((state) => state.applySidebarMessage);
  const setDaemonSessionsState = useSidebarStore((state) => state.setDaemonSessionsState);
  const setGitCommitDraft = useSidebarStore((state) => state.setGitCommitDraft);
  const {
    agentManagerZoomPercent,
    browserGroupIds,
    completionBellEnabled,
    debuggingMode,
    groupOrder,
    structureRevision,
    theme,
    workspaceGroupIds,
  } = useSidebarStore(
    useShallow((state) => ({
      agentManagerZoomPercent: state.hud.agentManagerZoomPercent,
      browserGroupIds: state.browserGroupIds,
      completionBellEnabled: state.hud.completionBellEnabled,
      debuggingMode: state.hud.debuggingMode,
      groupOrder: state.groupOrder,
      structureRevision: state.revision,
      theme: state.hud.theme,
      workspaceGroupIds: state.workspaceGroupIds,
    })),
  );
  const gitCommitDraft = useSidebarStore((state) => state.gitCommitDraft);
  const authoritativeSessionIdsByGroup = useSidebarStore((state) => state.sessionIdsByGroup);

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

  const handleWindowMessage = useEffectEvent((event: MessageEvent<ExtensionToSidebarMessage>) => {
    if (!event.data) {
      return;
    }

    if (event.data.type === "playCompletionSound") {
      void playCompletionSound(event.data.sound);
      return;
    }

    if (event.data.type === "sessionPresentationChanged") {
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

    if (pendingCreateGroupRef.current) {
      const nextGroupId = findCreatedGroupId(groupOrder, event.data.groups.map((group) => group.groupId));
      if (nextGroupId) {
        setAutoEditingGroupId(nextGroupId);
        pendingCreateGroupRef.current = false;
      }
    }

    applySidebarMessage(event.data);
  });

  useEffect(() => {
    const handleMessage = (event: Event) => {
      if (event instanceof MessageEvent) {
        handleWindowMessage(event);
      }
    };

    messageSource.addEventListener("message", handleMessage);

    return () => {
      messageSource.removeEventListener("message", handleMessage);
    };
  }, [handleWindowMessage, messageSource]);

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
    document.body.dataset.sidebarTheme = theme;

    return () => {
      delete document.body.dataset.sidebarTheme;
    };
  }, [theme]);

  useEffect(() => {
    document.body.style.setProperty("--vsmux-agent-manager-zoom", `${agentManagerZoomPercent}%`);

    return () => {
      document.body.style.removeProperty("--vsmux-agent-manager-zoom");
    };
  }, [agentManagerZoomPercent]);

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

  const effectiveGroupIds = workspaceGroupIds;

  const effectiveSessionIdsByGroup = useMemo(
    () => createWorkspaceSessionIdsByGroup(workspaceGroupIds, authoritativeSessionIdsByGroup),
    [authoritativeSessionIdsByGroup, workspaceGroupIds],
  );

  useEffect(() => {
    groupIdsRef.current = effectiveGroupIds;
  }, [effectiveGroupIds]);

  useEffect(() => {
    sessionIdsByGroupRef.current = effectiveSessionIdsByGroup;
  }, [effectiveSessionIdsByGroup]);

  const postSidebarDebugLog = useEffectEvent((event: string, details: unknown) => {
    if (!debuggingMode) {
      return;
    }

    vscode.postMessage({
      details,
      event,
      type: "sidebarDebugLog",
    });
  });

  const updateSessionDragIndicator = useEffectEvent(
    (
      nativeEvent: Event | undefined,
      source: { data?: unknown } | null | undefined,
      target: { data?: unknown } | null | undefined,
    ) => {
      const sourceData = getSidebarDropData(source);
      if (sourceData?.kind !== "session") {
        setSessionDragIndicator(undefined);
        return;
      }

      const targetData = getSidebarDropData(target);
      const resolvedDropTarget = resolveSessionDropTargetFromPoint(
        nativeEvent,
        sessionIdsByGroupRef.current,
        targetData,
        sourceData,
      );
      const nextIndicator = resolvedDropTarget ?? undefined;

      setSessionDragIndicator((previous) =>
        haveSameSessionDropTarget(previous, nextIndicator) ? previous : nextIndicator,
      );
    },
  );

  const handleDragStart = ((event) => {
    const nativeEvent = getDragNativeEvent(event);
    const sourceData = getSidebarDropData(event.operation.source);
    postSidebarDebugLog("session.dragStart", {
      nativeEventType: nativeEvent?.type,
      point: getClientPoint(nativeEvent),
      sourceData,
      targetData: getSidebarDropData(event.operation.target),
    });
    if (sourceData?.kind !== "session") {
      setSessionDragIndicator(undefined);
      return;
    }

    setSessionDragIndicator(undefined);
  }) satisfies DragDropEventHandlers["onDragStart"];

  const handleDragMove = ((event) => {
    updateSessionDragIndicator(
      getDragNativeEvent(event),
      event.operation.source,
      event.operation.target,
    );
  }) satisfies DragDropEventHandlers["onDragMove"];

  const handleDragOver = ((event) => {
    updateSessionDragIndicator(
      getDragNativeEvent(event),
      event.operation.source,
      event.operation.target,
    );
  }) satisfies DragDropEventHandlers["onDragOver"];

  const handleDragEnd = ((event) => {
    setSessionDragIndicator(undefined);
    const currentGroupIds = groupIdsRef.current;
    const currentSessionIdsByGroup = sessionIdsByGroupRef.current;
    const authoritativeGroupIds = workspaceGroupIds;
    const previousSessionIdsByGroup = effectiveSessionIdsByGroup;

    const nativeEvent = getDragNativeEvent(event);
    const sourceData = getSidebarDropData(event.operation.source);
    const targetData = getSidebarDropData(event.operation.target);
    const resolvedSessionDropTarget =
      sourceData?.kind === "session"
        ? resolveSessionDropTargetFromPoint(
            nativeEvent,
            currentSessionIdsByGroup,
            targetData,
            sourceData,
          )
        : undefined;
    postSidebarDebugLog("session.dragEnd", {
      canceled: event.canceled,
      nativeEventType: nativeEvent?.type,
      point: getClientPoint(nativeEvent),
      resolvedSessionDropTarget,
      sourceData,
      targetData,
    });
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
      return;
    }

    if (resolvedSessionDropTarget === null) {
      return;
    }

    if (!targetData && resolvedSessionDropTarget === undefined) {
      return;
    }

    const nextSessionIdsByGroup =
      resolvedSessionDropTarget !== undefined
        ? moveSessionIdsByDropTarget(
            currentSessionIdsByGroup,
            sourceData.sessionId,
            resolvedSessionDropTarget,
          )
        : move(currentSessionIdsByGroup, event);
    const previousGroupId = findSessionGroupId(previousSessionIdsByGroup, sourceData.sessionId);
    const nextGroupId = findSessionGroupId(nextSessionIdsByGroup, sourceData.sessionId);
    if (!previousGroupId || !nextGroupId) {
      return;
    }

    if (previousGroupId !== nextGroupId) {
      const targetIndex = nextSessionIdsByGroup[nextGroupId]?.indexOf(sourceData.sessionId);
      if (targetIndex == null || targetIndex < 0) {
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
        data-dimmed={String(isStartupInteractionBlocked)}
        data-sidebar-theme={theme}
        onDoubleClick={handleSidebarDoubleClick}
      >
        <CommandsPanel
          createRequestId={commandCreateRequestId}
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
                    {completionBellEnabled ? (
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
                    {getCompletionBellMenuLabel(completionBellEnabled)}
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
          createRequestId={agentCreateRequestId}
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
          {browserGroupIds.length > 0 ? (
            <div className="group-list">
              {browserGroupIds.map((groupId) => (
                <SessionGroupSection
                  autoEdit={false}
                  canClose={false}
                  groupId={groupId}
                  index={-1}
                  key={groupId}
                  onAutoEditHandled={() => undefined}
                  vscode={vscode}
                />
              ))}
            </div>
          ) : null}
          <DragDropProvider
            key={`drag-structure-${structureRevision}`}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            sensors={sensors}
          >
            <div className="group-list">
              {effectiveGroupIds.map((groupId, groupIndex) => (
                <SessionGroupSection
                  autoEdit={autoEditingGroupId === groupId}
                  canClose={effectiveGroupIds.length > 1}
                  groupId={groupId}
                  index={groupIndex}
                  key={groupId}
                  onAutoEditHandled={() => setAutoEditingGroupId(undefined)}
                  onFocusRequested={applyLocalFocus}
                  sessionDragIndicator={sessionDragIndicator}
                  vscode={vscode}
                />
              ))}
            </div>
          </DragDropProvider>
          <button
            aria-label="Create a new group"
            className="group-create-button"
            data-empty-space-blocking="true"
            disabled={effectiveGroupIds.length >= MAX_GROUP_COUNT}
            onClick={() => {
              pendingCreateGroupRef.current = true;
              vscode.postMessage({ type: "createGroup" });
            }}
            type="button"
          >
            <IconPlus aria-hidden="true" className="group-create-button-icon" size={14} />
            New Group
          </button>
          {browserGroupIds.length === 0 &&
          effectiveGroupIds.every((groupId) => (effectiveSessionIdsByGroup[groupId] ?? []).length === 0) ? (
            <div className="empty" data-empty-space-blocking="true">
              Create the first session to start the workspace.
            </div>
          ) : null}
        </section>
        <PreviousSessionsModal
          isOpen={isPreviousSessionsOpen}
          onClose={() => setIsPreviousSessionsOpen(false)}
          vscode={vscode}
        />
        <DaemonSessionsModal
          isOpen={isDaemonSessionsOpen}
          onClose={() => setIsDaemonSessionsOpen(false)}
          vscode={vscode}
        />
        <ScratchPadModal
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

function createWorkspaceSessionIdsByGroup(
  workspaceGroupIds: readonly string[],
  sessionIdsByGroup: SessionIdsByGroup,
): SessionIdsByGroup {
  return Object.fromEntries(
    workspaceGroupIds.map((groupId) => [groupId, sessionIdsByGroup[groupId] ?? []]),
  );
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
  previousGroups: readonly { groupId: string }[],
  nextGroups: readonly { groupId: string }[],
): string | undefined {
  const previousGroupIds = new Set(previousGroups.map((group) => group.groupId));
  return nextGroups.find((group) => !previousGroupIds.has(group.groupId))?.groupId;
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

function getCompletionBellMenuLabel(completionBellEnabled: boolean): string {
  return completionBellEnabled ? "Disable Notifying" : "Enable Notifying";
}

function resolveSessionDropTargetFromPoint(
  nativeEvent: Event | undefined,
  sessionIdsByGroup: SessionIdsByGroup,
  targetData: ReturnType<typeof getSidebarDropData>,
  sourceData: Extract<ReturnType<typeof getSidebarDropData>, { kind: "session" }> | undefined,
) {
  const point = getClientPoint(nativeEvent);
  const candidates = [
    getSidebarSessionDropTargetFromDropData(targetData, point),
    point ? getSidebarSessionDropTargetAtPoint(document, point.x, point.y) : undefined,
    getSidebarSessionDropTargetFromEvent(nativeEvent),
  ];

  for (const candidate of candidates) {
    if (!candidate || isSourceSessionDropTarget(candidate, sourceData)) {
      continue;
    }

    const groupSessionIds = sessionIdsByGroup[candidate.groupId];
    if (!groupSessionIds) {
      continue;
    }

    if (candidate.kind === "session" && !groupSessionIds.includes(candidate.sessionId)) {
      continue;
    }

    return candidate;
  }

  return null;
}

function haveSameSessionDropTarget(
  left: SidebarSessionDropTarget | undefined,
  right: SidebarSessionDropTarget | undefined,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  if (left.groupId !== right.groupId || left.kind !== right.kind || left.position !== right.position) {
    return false;
  }

  if (left.kind !== "session" || right.kind !== "session") {
    return true;
  }

  return left.sessionId === right.sessionId;
}

function isSourceSessionDropTarget(
  candidate: SidebarSessionDropTarget,
  sourceData: Extract<ReturnType<typeof getSidebarDropData>, { kind: "session" }> | undefined,
): boolean {
  return Boolean(
    sourceData &&
      candidate.kind === "session" &&
      candidate.groupId === sourceData.groupId &&
      candidate.sessionId === sourceData.sessionId,
  );
}

function getSidebarSessionDropTargetFromDropData(
  targetData: ReturnType<typeof getSidebarDropData>,
  point: ReturnType<typeof getClientPoint>,
): SidebarSessionDropTarget | undefined {
  if (targetData?.kind === "session") {
    const sessionElement = getTargetSessionElement(targetData.sessionId, point);
    if (!sessionElement) {
      return undefined;
    }

    const bounds = sessionElement.getBoundingClientRect();
    const relativeY = point?.y ?? bounds.top + bounds.height / 2;
    const position: "after" | "before" =
      relativeY > bounds.top + bounds.height / 2 ? "after" : "before";
    return {
      groupId: targetData.groupId,
      kind: "session",
      position,
      sessionId: targetData.sessionId,
    };
  }

  if (targetData?.kind === "group") {
    const groupElement = document.querySelector<HTMLElement>(
      `[data-sidebar-group-id="${targetData.groupId}"]`,
    );
    if (!groupElement) {
      return undefined;
    }

    const bounds = groupElement.getBoundingClientRect();
    const relativeY = point?.y ?? bounds.top;
    const position: "end" | "start" =
      relativeY > bounds.top + bounds.height / 2 ? "end" : "start";
    return {
      groupId: targetData.groupId,
      kind: "group",
      position,
    };
  }

  return undefined;
}

function getTargetSessionElement(
  sessionId: string,
  point: ReturnType<typeof getClientPoint>,
): HTMLElement | undefined {
  const selector = `[data-sidebar-session-id="${sessionId}"]`;
  if (point) {
    for (const element of document.elementsFromPoint(point.x, point.y)) {
      const sessionElement = element.closest<HTMLElement>(selector);
      if (sessionElement && sessionElement.dataset.dragging !== "true") {
        return sessionElement;
      }
    }
  }

  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
    (sessionElement) => sessionElement.dataset.dragging !== "true",
  );
}

function getDragNativeEvent(value: unknown): Event | undefined {
  return isObjectRecord(value) && value.nativeEvent instanceof Event ? value.nativeEvent : undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
