import { useEffect, useMemo, useState } from "react";
import type {
  NativeTerminalDebugHydrateMessage,
  NativeTerminalDebugPanelState,
} from "../shared/native-terminal-debug-contract";
import { DEFAULT_COMPLETION_SOUND, getCompletionSoundLabel } from "../shared/completion-sound";
import { createDefaultSidebarGitState } from "../shared/sidebar-git";
import {
  Field,
  formatTimestamp,
  ProjectionList,
  SectionTitle,
  StatusPill,
  SummaryCard,
} from "./app-parts";

type DebugPanelAppProps = {
  clearUrl: string;
  stateUrl: string;
  vscode?: {
    postMessage: (message: unknown) => void;
  };
};

const EMPTY_STATE: NativeTerminalDebugPanelState = {
  backend: {
    currentMoveAction: undefined,
    lastVisibleSnapshot: undefined,
    layout: {
      activeTerminalName: undefined,
      editorSurfaceGroups: [],
      parkedTerminals: [],
      processAssociations: [],
      projections: [],
      rawTabGroups: [],
      terminalCount: 0,
      terminalNames: [],
      trackedSessionIds: [],
    },
    moveHistory: [],
    observedAt: "",
    workspaceId: "",
  },
  observedAt: "",
  sidebar: {
    groups: [],
    hud: {
      activeSessionsSortMode: "manual",
      agentManagerZoomPercent: 100,
      agents: [],
      commands: [],
      commandSessionIndicators: [],
      completionBellEnabled: false,
      completionSound: DEFAULT_COMPLETION_SOUND,
      completionSoundLabel: getCompletionSoundLabel(DEFAULT_COMPLETION_SOUND),
      debuggingMode: false,
      focusedSessionTitle: undefined,
      git: createDefaultSidebarGitState(),
      highlightedVisibleCount: 1,
      isFocusModeActive: false,
      pendingAgentIds: [],
      collapsedSections: {
        actions: false,
        agents: false,
      },
      sectionVisibility: {
        actions: true,
        agents: true,
        browsers: true,
        git: true,
      },
      createSessionOnSidebarDoubleClick: false,
      renameSessionOnDoubleClick: false,
      showCloseButtonOnSessionCards: false,
      showHotkeysOnSessionCards: false,
      showLastInteractionTimeOnSessionCards: true,
      theme: "dark-blue",
      viewMode: "grid",
      visibleCount: 1,
      visibleSlotLabels: [],
    },
  },
  workspaceId: "",
};

export function DebugPanelApp({ clearUrl, stateUrl, vscode }: DebugPanelAppProps) {
  const [state, setState] = useState<NativeTerminalDebugPanelState>(EMPTY_STATE);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!vscode) {
      let disposed = false;
      const syncState = async () => {
        try {
          const response = await fetch(stateUrl, { cache: "no-store" });
          if (!response.ok) {
            return;
          }

          const message = await response.json();
          if (disposed || !isNativeTerminalDebugHydrateMessage(message)) {
            return;
          }

          setState(message.state);
        } catch {
          // keep polling while the extension-owned debug server is warming up
        }
      };

      void syncState();
      const intervalId = window.setInterval(() => {
        void syncState();
      }, 500);

      return () => {
        disposed = true;
        window.clearInterval(intervalId);
      };
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isNativeTerminalDebugHydrateMessage(event.data)) {
        return;
      }

      setState(event.data.state);
    };

    const handleWindowMessage = (event: Event) => {
      if (event instanceof MessageEvent) {
        handleMessage(event);
      }
    };

    window.addEventListener("message", handleWindowMessage);
    vscode.postMessage({ type: "ready" });
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [stateUrl, vscode]);

  const visibleSessionSet = useMemo(
    () =>
      new Set<string>(
        state.sidebar.groups.flatMap((group) =>
          group.sessions.filter((session) => session.isVisible).map((session) => session.sessionId),
        ),
      ),
    [state.sidebar.groups],
  );

  const handleClear = async () => {
    if (isClearing) {
      return;
    }

    setIsClearing(true);
    try {
      if (vscode) {
        vscode.postMessage({ type: "clear" });
      } else {
        await fetch(clearUrl, {
          cache: "no-store",
          method: "POST",
        });
      }
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="debug-shell">
      <header className="hero-card">
        <div>
          <div className="eyebrow">VSmux Move Debugger</div>
          <h1>Live native terminal state</h1>
          <p>
            Compare the backend’s current layout model with the sidebar state while moves are still
            happening.
          </p>
        </div>
        <div className="summary-grid">
          <SummaryCard label="View" value={state.sidebar.hud.viewMode} />
          <SummaryCard label="Shown" value={String(state.sidebar.hud.visibleCount)} />
          <SummaryCard label="Observed" value={formatTimestamp(state.observedAt)} />
          <SummaryCard
            label="Active Terminal"
            value={state.backend.layout.activeTerminalName ?? "None"}
          />
        </div>
        <div className="hero-actions">
          <button
            className="secondary-button"
            disabled={isClearing}
            onClick={() => void handleClear()}
          >
            {isClearing ? "Clearing..." : "Clear Logs + History"}
          </button>
        </div>
      </header>

      <section className="panel-card">
        <SectionTitle
          title="Editor Surface"
          detail={`${String(state.backend.layout.editorSurfaceGroups.length)} visible terminal groups`}
        />
        <div className="editor-surface">
          {state.backend.layout.editorSurfaceGroups.length === 0 ? (
            <p className="empty-copy">No terminal editor groups are open.</p>
          ) : (
            state.backend.layout.editorSurfaceGroups.map((group) => (
              <div
                className="editor-group-card"
                key={`${String(group.viewColumn)}-${String(group.visibleIndex)}`}
              >
                <div className="editor-group-header">
                  <span>Slot {String(group.visibleIndex + 1)}</span>
                  <span>{group.labels.length} tabs</span>
                </div>
                <div className="tab-list">
                  {group.labels.length === 0 ? (
                    <div className="tab-pill tab-pill-empty">Empty</div>
                  ) : (
                    group.labels.map((label) => (
                      <div className="tab-pill" key={label}>
                        {label}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel-card">
        <SectionTitle
          title="Current Move"
          detail={state.backend.currentMoveAction ? "Live action" : "Idle"}
        />
        {state.backend.currentMoveAction ? (
          <div className="move-card">
            <StatusPill label={state.backend.currentMoveAction.kind} tone="active" />
            <dl className="field-grid">
              <Field
                label="Session"
                value={state.backend.currentMoveAction.sessionId ?? "Unknown"}
              />
              <Field
                label="Terminal"
                value={state.backend.currentMoveAction.terminalName ?? "Unknown"}
              />
              <Field
                label="From"
                value={state.backend.currentMoveAction.currentLocation ?? "Unknown"}
              />
              <Field
                label="To slot"
                value={
                  state.backend.currentMoveAction.desiredVisibleIndex === undefined
                    ? "Unknown"
                    : String(state.backend.currentMoveAction.desiredVisibleIndex + 1)
                }
              />
              <Field
                label="Started"
                value={formatTimestamp(state.backend.currentMoveAction.startedAt)}
              />
            </dl>
          </div>
        ) : (
          <p className="empty-copy">No move is currently running.</p>
        )}
        <div className="move-history">
          <SectionTitle
            title="Recent History"
            detail={`${String(state.backend.moveHistory.length)} events`}
          />
          {state.backend.moveHistory.length === 0 ? (
            <p className="empty-copy">No move events recorded yet.</p>
          ) : (
            <div className="history-list">
              {state.backend.moveHistory.map((entry, index) => (
                <div
                  className="history-row"
                  key={`${entry.timestamp}-${entry.kind}-${entry.sessionId ?? "none"}-${String(index)}`}
                >
                  <div className="history-meta">
                    <StatusPill
                      label={entry.event ?? "update"}
                      tone={
                        entry.event === "fallback"
                          ? "warn"
                          : entry.event === "start"
                            ? "info"
                            : "active"
                      }
                    />
                    <span>{entry.kind}</span>
                  </div>
                  <div className="history-detail">
                    <span>{entry.sessionId ?? "no-session"}</span>
                    <span>{entry.currentLocation ?? "unknown"}</span>
                    <span>
                      {entry.desiredVisibleIndex === undefined
                        ? "no-target"
                        : `slot ${String(entry.desiredVisibleIndex + 1)}`}
                    </span>
                    <span>{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  {entry.detail ? <div className="history-note">{entry.detail}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="dual-grid">
        <section className="panel-card">
          <SectionTitle
            title="Parked Terminals"
            detail={`${String(state.backend.layout.parkedTerminals.length)} parked`}
          />
          <ProjectionList
            projections={state.backend.layout.parkedTerminals}
            visibleSessionSet={visibleSessionSet}
          />
        </section>
        <section className="panel-card">
          <SectionTitle
            title="Sidebar Status"
            detail={`${String(state.sidebar.groups.length)} groups`}
          />
          <div className="sidebar-group-list">
            {state.sidebar.groups.map((group) => (
              <div className="sidebar-group-card" key={group.groupId}>
                <div className="sidebar-group-header">
                  <span>{group.title}</span>
                  <span>
                    {group.viewMode} · {String(group.visibleCount)}
                  </span>
                </div>
                <div className="sidebar-session-list">
                  {group.sessions.map((session) => (
                    <div className="sidebar-session-row" key={session.sessionId}>
                      <span className="sidebar-session-name">
                        {session.alias}{" "}
                        {session.sessionNumber ? `#${String(session.sessionNumber)}` : ""}
                      </span>
                      <div className="sidebar-session-flags">
                        {session.isVisible ? <StatusPill label="Visible" tone="active" /> : null}
                        {session.isFocused ? <StatusPill label="Focused" tone="info" /> : null}
                        {!session.isRunning ? <StatusPill label="Stopped" tone="muted" /> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel-card">
        <SectionTitle
          title="All Projections"
          detail={`${String(state.backend.layout.projections.length)} tracked terminals`}
        />
        <ProjectionList
          projections={state.backend.layout.projections}
          visibleSessionSet={visibleSessionSet}
        />
      </section>

      <div className="dual-grid">
        <section className="panel-card">
          <SectionTitle
            title="VS Code Tab Groups"
            detail={`${String(state.backend.layout.rawTabGroups.length)} raw groups from the API`}
          />
          <pre className="json-block">
            {JSON.stringify(state.backend.layout.rawTabGroups, null, 2)}
          </pre>
        </section>
        <section className="panel-card">
          <SectionTitle title="Visible Snapshot" detail="Backend reconcile target" />
          <pre className="json-block">
            {JSON.stringify(state.backend.lastVisibleSnapshot, null, 2)}
          </pre>
        </section>
      </div>

      <section className="panel-card">
        <SectionTitle title="Raw Debug State" detail="Full payload" />
        <pre className="json-block">{JSON.stringify(state, null, 2)}</pre>
      </section>
    </div>
  );
}

function isNativeTerminalDebugHydrateMessage(
  value: unknown,
): value is NativeTerminalDebugHydrateMessage {
  return (
    isObjectRecord(value) &&
    value.type === "hydrate" &&
    "state" in value &&
    isObjectRecord(value.state)
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
