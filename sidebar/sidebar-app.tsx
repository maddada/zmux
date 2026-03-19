import { Tooltip } from "@base-ui/react/tooltip";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { IconFocusCentered } from "@tabler/icons-react";
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type {
  ExtensionToSidebarMessage,
  SidebarHudState,
  SidebarSessionItem,
  SidebarTheme,
  TerminalViewMode,
  VisibleSessionCount,
} from "../shared/session-grid-contract";
import { SortableSessionCard } from "./sortable-session-card";
import type { WebviewApi } from "./webview-api";

export type SidebarAppProps = {
  vscode: WebviewApi;
};

type SidebarState = {
  hud: SidebarHudState;
  sessions: SidebarSessionItem[];
};

const COUNT_OPTIONS: VisibleSessionCount[] = [1, 2, 3, 4, 6, 9];
const MODE_OPTIONS: { tooltip: string; viewMode: TerminalViewMode }[] = [
  { tooltip: "Vertical", viewMode: "vertical" },
  { tooltip: "Horizontal", viewMode: "horizontal" },
  { tooltip: "Grid", viewMode: "grid" },
];

const INITIAL_STATE: SidebarState = {
  hud: {
    focusedSessionTitle: undefined,
    isFocusModeActive: false,
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
    theme: getInitialSidebarTheme(),
    viewMode: "grid",
    visibleCount: 1,
    visibleSlotLabels: [],
  },
  sessions: [],
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
  const [draftSessionIds, setDraftSessionIds] = useState<string[] | undefined>();

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
      if (!event.data || (event.data.type !== "hydrate" && event.data.type !== "sessionState")) {
        return;
      }

      startTransition(() => {
        setServerState({
          hud: event.data.hud,
          sessions: event.data.sessions,
        });
        setDraftSessionIds((previousDraft) =>
          reconcileDraftSessionIds(previousDraft, event.data.sessions),
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

  const syncedSessionIds = useMemo(
    () => serverState.sessions.map((session) => session.sessionId),
    [serverState.sessions],
  );

  const orderedSessionIds = useMemo(() => {
    if (!draftSessionIds) {
      return syncedSessionIds;
    }

    return mergeDraftSessionIds(draftSessionIds, syncedSessionIds);
  }, [draftSessionIds, syncedSessionIds]);

  const orderedSessions = useMemo(() => {
    const sessionById = new Map(
      serverState.sessions.map((session) => [session.sessionId, session] as const),
    );

    return orderedSessionIds
      .map((sessionId) => sessionById.get(sessionId))
      .filter((session): session is SidebarSessionItem => session !== undefined);
  }, [orderedSessionIds, serverState.sessions]);

  const handleDragEnd = (event: {
    canceled?: boolean;
    operation: {
      source: unknown;
    };
  }) => {
    if (event.canceled) {
      return;
    }

    const { source } = event.operation;
    if (!isSortable(source)) {
      return;
    }

    const { index, initialIndex } = source;
    if (index == null || initialIndex === index) {
      return;
    }

    const nextSessionIds = moveSessionId(orderedSessionIds, initialIndex, index);
    startTransition(() => {
      setDraftSessionIds(nextSessionIds);
    });

    vscode.postMessage({
      sessionIds: nextSessionIds,
      type: "syncSessionOrder",
    });
  };

  return (
    <Tooltip.Provider delay={200}>
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
                  <button
                    key={visibleCount}
                    className="toolbar-button"
                    data-dimmed={String(serverState.hud.isFocusModeActive)}
                    data-selected={String(serverState.hud.visibleCount === visibleCount)}
                    onClick={() => vscode.postMessage({ type: "setVisibleCount", visibleCount })}
                    type="button"
                  >
                    {visibleCount}
                  </button>
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
            Sessions
          </div>
          <div className="sessions">
            <DragDropProvider onDragEnd={handleDragEnd}>
              {orderedSessions.map((session, index) => (
                <SortableSessionCard
                  key={session.sessionId}
                  index={index}
                  session={session}
                  showCloseButton={serverState.hud.showCloseButtonOnSessionCards}
                  showHotkeys={serverState.hud.showHotkeysOnSessionCards}
                  vscode={vscode}
                />
              ))}
            </DragDropProvider>
          </div>
          {orderedSessions.length === 0 ? (
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
            data-dimmed={String(isDimmed)}
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

function reconcileDraftSessionIds(
  draftSessionIds: readonly string[] | undefined,
  sessions: readonly SidebarSessionItem[],
): string[] | undefined {
  if (!draftSessionIds) {
    return undefined;
  }

  const syncedSessionIds = sessions.map((session) => session.sessionId);
  const nextDraftSessionIds = mergeDraftSessionIds(draftSessionIds, syncedSessionIds);

  return haveSameSessionOrder(nextDraftSessionIds, syncedSessionIds)
    ? undefined
    : nextDraftSessionIds;
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
