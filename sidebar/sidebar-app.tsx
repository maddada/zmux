import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { IconBell, IconBellOff, IconFocusCentered } from "@tabler/icons-react";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  MAX_GROUP_COUNT,
  type ExtensionToSidebarMessage,
  type SidebarHudState,
  type SidebarSessionGroup,
  type SidebarSessionItem,
  type SidebarTheme,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import { playCompletionSound } from "./completion-sound-player";
import { CreateGroupDropTarget } from "./create-group-drop-target";
import { SessionCardContent } from "./session-card-content";
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

const COUNT_OPTIONS: VisibleSessionCount[] = [1, 2, 3, 4, 6, 9];
const MODE_OPTIONS: { tooltip: string; viewMode: TerminalViewMode }[] = [
  { tooltip: "Vertical", viewMode: "vertical" },
  { tooltip: "Horizontal", viewMode: "horizontal" },
  { tooltip: "Grid", viewMode: "grid" },
];

const INITIAL_STATE: SidebarState = {
  groups: [],
  hud: {
    completionBellEnabled: false,
    completionSound: "ping",
    completionSoundLabel: "Ping",
    focusedSessionTitle: undefined,
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

function getInitialSidebarTheme(): SidebarTheme {
  return document.body.classList.contains("vscode-light") ||
    document.body.classList.contains("vscode-high-contrast-light")
    ? "light-blue"
    : "dark-blue";
}

export function SidebarApp({ vscode }: SidebarAppProps) {
  const [serverState, setServerState] = useState<SidebarState>(INITIAL_STATE);
  const [autoEditingGroupId, setAutoEditingGroupId] = useState<string>();
  const [draftGroupIds, setDraftGroupIds] = useState<string[] | undefined>();
  const [draggedSessionId, setDraggedSessionId] = useState<string>();
  const [draggedSessionWidth, setDraggedSessionWidth] = useState<number>();
  const [draftSessionIdsByGroup, setDraftSessionIdsByGroup] = useState<
    Record<string, string[] | undefined>
  >({});
  const pendingCreateGroupRef = useRef(false);

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

      startTransition(() => {
        setServerState((previous) => {
          if (pendingCreateGroupRef.current) {
            const nextGroupId = findCreatedGroupId(previous.groups, event.data.groups);
            if (nextGroupId) {
              setAutoEditingGroupId(nextGroupId);
              pendingCreateGroupRef.current = false;
            }
          }

          return {
            groups: event.data.groups,
            hud: event.data.hud,
          };
        });
        setDraftGroupIds((previousDraft) =>
          reconcileDraftGroupIds(previousDraft, event.data.groups),
        );
        setDraftSessionIdsByGroup((previousDraft) =>
          reconcileDraftSessionIdsByGroup(previousDraft, event.data.groups),
        );
      });
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
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

  const orderedGroups = useMemo(() => {
    const groupById = new Map(serverState.groups.map((group) => [group.groupId, group] as const));
    const orderedGroupIds = draftGroupIds
      ? mergeDraftSessionIds(
          draftGroupIds,
          serverState.groups.map((group) => group.groupId),
        )
      : serverState.groups.map((group) => group.groupId);

    return orderedGroupIds
      .map((groupId) => groupById.get(groupId))
      .filter((group): group is SidebarSessionGroup => group !== undefined)
      .map((group) => ({
        ...group,
        orderedSessions: applyDraftSessionOrder(group, draftSessionIdsByGroup[group.groupId]),
      }));
  }, [draftGroupIds, draftSessionIdsByGroup, serverState.groups]);

  const draggedSession = useMemo(() => {
    if (!draggedSessionId) {
      return undefined;
    }

    return orderedGroups
      .flatMap((group) => group.orderedSessions)
      .find((session) => session.sessionId === draggedSessionId);
  }, [draggedSessionId, orderedGroups]);

  const applyCrossGroupSessionMoveDraft = (
    sessionId: string,
    sourceGroupId: string,
    targetGroupId: string,
  ) => {
    if (sourceGroupId === targetGroupId) {
      return;
    }

    const sourceGroup = orderedGroups.find((group) => group.groupId === sourceGroupId);
    const targetGroup = orderedGroups.find((group) => group.groupId === targetGroupId);
    if (!sourceGroup || !targetGroup) {
      return;
    }

    const nextSourceSessionIds = sourceGroup.orderedSessions
      .map((session) => session.sessionId)
      .filter((candidateSessionId) => candidateSessionId !== sessionId);
    const nextTargetSessionIds = [
      ...targetGroup.orderedSessions
        .map((session) => session.sessionId)
        .filter((candidateSessionId) => candidateSessionId !== sessionId),
      sessionId,
    ];

    startTransition(() => {
      setDraftSessionIdsByGroup((previousDraft) => ({
        ...previousDraft,
        [sourceGroupId]: nextSourceSessionIds,
        [targetGroupId]: nextTargetSessionIds,
      }));
    });
  };

  const handleDragStart = (event: {
    operation: {
      source: unknown;
    };
  }) => {
    if (isSortable(event.operation.source)) {
      const sourceElement = event.operation.source.element;
      if (sourceElement instanceof HTMLElement) {
        setDraggedSessionWidth(sourceElement.getBoundingClientRect().width);
      }
    }

    const sourceData = getSidebarDropData(event.operation.source as { data?: unknown });
    if (sourceData?.kind === "group") {
      return;
    }

    if (sourceData?.kind !== "session") {
      return;
    }

    setDraggedSessionId(sourceData.sessionId);
  };

  const handleDragEnd = (event: {
    canceled?: boolean;
    operation: {
      source: unknown;
      target: unknown;
    };
  }) => {
    setDraggedSessionId(undefined);
    setDraggedSessionWidth(undefined);

    if (event.canceled) {
      return;
    }

    const { source, target } = event.operation;
    if (!isSortable(source)) {
      return;
    }

    const sourceData = getSidebarDropData(source);
    const targetData = getSidebarDropData(target as { data?: unknown });
    if (!sourceData || !targetData) {
      return;
    }

    if (sourceData.kind === "group") {
      if (targetData.kind !== "group" || !isSortable(target)) {
        return;
      }

      const { initialIndex } = source;
      const targetIndex = target.index;
      if (targetIndex == null || initialIndex === targetIndex) {
        return;
      }

      const nextGroupIds = moveSessionId(
        orderedGroups.map((group) => group.groupId),
        initialIndex,
        targetIndex,
      );
      startTransition(() => {
        setDraftGroupIds(nextGroupIds);
      });
      vscode.postMessage({
        groupIds: nextGroupIds,
        type: "syncGroupOrder",
      });
      return;
    }

    if (targetData.kind === "create-group") {
      pendingCreateGroupRef.current = true;
      vscode.postMessage({
        sessionId: sourceData.sessionId,
        type: "createGroupFromSession",
      });
      return;
    }

    if (targetData.kind === "group") {
      if (sourceData.groupId === targetData.groupId) {
        return;
      }

      applyCrossGroupSessionMoveDraft(sourceData.sessionId, sourceData.groupId, targetData.groupId);
      vscode.postMessage({
        groupId: targetData.groupId,
        sessionId: sourceData.sessionId,
        type: "moveSessionToGroup",
      });
      return;
    }

    if (!isSortable(target) || sourceData.groupId !== targetData.groupId) {
      applyCrossGroupSessionMoveDraft(sourceData.sessionId, sourceData.groupId, targetData.groupId);
      vscode.postMessage({
        groupId: targetData.groupId,
        sessionId: sourceData.sessionId,
        type: "moveSessionToGroup",
      });
      return;
    }

    const { index, initialIndex } = source;
    const targetIndex = target.index;
    if (index == null || initialIndex === targetIndex || targetIndex == null) {
      return;
    }

    const group = orderedGroups.find((candidate) => candidate.groupId === sourceData.groupId);
    if (!group) {
      return;
    }

    const nextSessionIds = moveSessionId(
      group.orderedSessions.map((session) => session.sessionId),
      initialIndex,
      targetIndex,
    );
    startTransition(() => {
      setDraftSessionIdsByGroup((previousDraft) => ({
        ...previousDraft,
        [group.groupId]: nextSessionIds,
      }));
    });

    vscode.postMessage({
      groupId: group.groupId,
      sessionIds: nextSessionIds,
      type: "syncSessionOrder",
    });
  };

  return (
    <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
      <div
        className="stack"
        data-sidebar-theme={serverState.hud.theme}
        onDoubleClick={handleSidebarDoubleClick}
      >
        <section className="card hud">
          <div className="toolbar-row">
            <div className="toolbar-section">
              <div className="control-label" data-empty-space-blocking="true">
                Layout
              </div>
              <div className="toolbar-inline-row">
                <div className="button-group">
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
                <div className="button-group button-group-end">
                  <ToolbarIconButton
                    ariaLabel={
                      serverState.hud.completionBellEnabled
                        ? "Disable completion sound for this project"
                        : "Enable completion sound for this project"
                    }
                    isSelected={serverState.hud.completionBellEnabled}
                    onClick={() => vscode.postMessage({ type: "toggleCompletionBell" })}
                    tooltip={getCompletionBellTooltip(serverState.hud)}
                  >
                    {serverState.hud.completionBellEnabled ? (
                      <IconBell aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
                    ) : (
                      <IconBellOff
                        aria-hidden="true"
                        className="toolbar-tabler-icon"
                        stroke={1.8}
                      />
                    )}
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    ariaLabel="Open sidebar theme settings"
                    onClick={() => vscode.postMessage({ type: "openSettings" })}
                    tooltip="Sidebar Settings"
                  >
                    <SettingsIcon />
                  </ToolbarIconButton>
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
          <div className="action-row">
            <button className="primary" onClick={requestNewSession} type="button">
              New Session
            </button>
          </div>
        </section>
        <section className="card">
          <div className="eyebrow" data-empty-space-blocking="true">
            Groups
          </div>
          <DragDropProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
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
                  data-running={String(draggedSession.isRunning)}
                  data-visible={String(draggedSession.isVisible)}
                  style={
                    draggedSessionWidth
                      ? { width: `${Math.round(draggedSessionWidth)}px` }
                      : undefined
                  }
                >
                  <SessionCardContent
                    session={draggedSession}
                    showCloseButton={false}
                    showHotkeys={serverState.hud.showHotkeysOnSessionCards}
                  />
                </div>
              ) : null}
            </DragOverlay>
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
            aria-disabled={isDisabled}
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
      isSelected={viewMode === mode.viewMode}
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

function moveSessionId(
  sessionIds: readonly string[],
  initialIndex: number,
  index: number,
): string[] {
  const nextSessionIds = [...sessionIds];
  const [sessionId] = nextSessionIds.splice(initialIndex, 1);

  if (sessionId === undefined) {
    return nextSessionIds;
  }

  nextSessionIds.splice(index, 0, sessionId);
  return nextSessionIds;
}

function mergeDraftSessionIds(
  draftSessionIds: readonly string[],
  syncedSessionIds: readonly string[],
): string[] {
  const syncedSessionIdSet = new Set(syncedSessionIds);
  const mergedSessionIds = draftSessionIds.filter((sessionId) => syncedSessionIdSet.has(sessionId));

  for (const sessionId of syncedSessionIds) {
    if (!mergedSessionIds.includes(sessionId)) {
      mergedSessionIds.push(sessionId);
    }
  }

  return mergedSessionIds;
}

function applyDraftSessionOrder(
  group: SidebarSessionGroup,
  draftSessionIds: readonly string[] | undefined,
): SidebarSessionItem[] {
  if (!draftSessionIds) {
    return group.sessions;
  }

  const sessionById = new Map(
    group.sessions.map((session) => [session.sessionId, session] as const),
  );
  return mergeDraftSessionIds(
    draftSessionIds,
    group.sessions.map((session) => session.sessionId),
  )
    .map((sessionId) => sessionById.get(sessionId))
    .filter((session): session is SidebarSessionItem => session !== undefined);
}

function reconcileDraftSessionIdsByGroup(
  draftSessionIdsByGroup: Readonly<Record<string, string[] | undefined>>,
  groups: readonly SidebarSessionGroup[],
): Record<string, string[] | undefined> {
  const nextDraftSessionIdsByGroup: Record<string, string[] | undefined> = {};

  for (const group of groups) {
    const previousDraft = draftSessionIdsByGroup[group.groupId];
    if (!previousDraft) {
      continue;
    }

    const syncedSessionIds = group.sessions.map((session) => session.sessionId);
    const nextDraftSessionIds = mergeDraftSessionIds(previousDraft, syncedSessionIds);
    if (!haveSameSessionOrder(nextDraftSessionIds, syncedSessionIds)) {
      nextDraftSessionIdsByGroup[group.groupId] = nextDraftSessionIds;
    }
  }

  return nextDraftSessionIdsByGroup;
}

function reconcileDraftGroupIds(
  draftGroupIds: readonly string[] | undefined,
  groups: readonly SidebarSessionGroup[],
): string[] | undefined {
  if (!draftGroupIds) {
    return undefined;
  }

  const syncedGroupIds = groups.map((group) => group.groupId);
  const nextDraftGroupIds = mergeDraftSessionIds(draftGroupIds, syncedGroupIds);

  return haveSameSessionOrder(nextDraftGroupIds, syncedGroupIds) ? undefined : nextDraftGroupIds;
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

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 16 16">
      <path
        className="toolbar-icon-line"
        d="M8 2.2v1.4M8 12.4v1.4M3.76 3.76l1 1M11.24 11.24l1 1M2.2 8h1.4M12.4 8h1.4M3.76 12.24l1-1M11.24 4.76l1-1"
      />
      <circle className="toolbar-icon-frame" cx="8" cy="8" r="2.4" />
      <circle className="toolbar-icon-frame" cx="8" cy="8" r="4.6" />
    </svg>
  );
}

function getCompletionBellTooltip(hud: SidebarHudState): string {
  return hud.completionBellEnabled
    ? `Disable done sound for this project (${hud.completionSoundLabel})`
    : `Enable done sound for this project (${hud.completionSoundLabel})`;
}
