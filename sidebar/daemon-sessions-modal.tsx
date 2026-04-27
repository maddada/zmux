import { IconRefresh, IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ConfirmationModal } from "./confirmation-modal";
import { useSidebarStore } from "./sidebar-store";
import type { WebviewApi } from "./webview-api";

export type DaemonSessionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  vscode: WebviewApi;
};

export function DaemonSessionsModal({ isOpen, onClose, vscode }: DaemonSessionsModalProps) {
  const state = useSidebarStore((storeState) => storeState.daemonSessionsState);
  const [searchQuery, setSearchQuery] = useState("");
  const [isKillDaemonConfirmOpen, setIsKillDaemonConfirmOpen] = useState(false);
  const [isKillT3ServerConfirmOpen, setIsKillT3ServerConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isKillT3ServerConfirmOpen) {
          setIsKillT3ServerConfirmOpen(false);
          return;
        }
        if (isKillDaemonConfirmOpen) {
          setIsKillDaemonConfirmOpen(false);
          return;
        }
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isKillDaemonConfirmOpen, isKillT3ServerConfirmOpen, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setIsKillDaemonConfirmOpen(false);
      setIsKillT3ServerConfirmOpen(false);
    }
  }, [isOpen]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return state?.sessions ?? [];
    }

    return (state?.sessions ?? []).filter((session) =>
      [
        session.agentName,
        session.cwd,
        session.errorMessage,
        session.sessionId,
        session.shell,
        session.status,
        session.title,
        session.workspaceId,
      ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [searchQuery, state?.sessions]);

  const filteredT3Sessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return state?.t3Sessions ?? [];
    }

    return (state?.t3Sessions ?? []).filter((session) =>
      [
        session.detail,
        session.lastInteractionAt,
        session.sessionId,
        session.threadId,
        session.title,
        session.workspaceId,
        session.workspaceRoot,
      ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [searchQuery, state?.t3Sessions]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div className="confirm-modal-root scroll-mask-y" role="presentation">
        <button className="confirm-modal-backdrop" onClick={onClose} type="button" />
        <div
          aria-describedby="daemon-sessions-modal-description"
          aria-labelledby="daemon-sessions-modal-title"
          aria-modal="true"
          className="confirm-modal daemon-sessions-modal scroll-mask-y"
          role="dialog"
        >
          <button
            aria-label="Close daemon sessions"
            className="confirm-modal-close-button"
            onClick={onClose}
            type="button"
          >
            <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
          </button>
          <div className="confirm-modal-header confirm-modal-header-with-close">
            <div className="confirm-modal-title" id="daemon-sessions-modal-title">
              Running zmux Sessions
            </div>
            {/* <div className="confirm-modal-description" id="daemon-sessions-modal-description"> */}
            {/* </div> */}
          </div>
          <div className="daemon-sessions-toolbar">
            <input
              aria-label="Search daemon sessions"
              className="group-title-input daemon-sessions-search-input"
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="Search by workspace, session, cwd, title, or agent"
              type="text"
              value={searchQuery}
            />
            <div className="daemon-sessions-toolbar-actions">
              <button
                className="secondary daemon-sessions-toolbar-button"
                onClick={() => {
                  vscode.postMessage({ type: "refreshDaemonSessions" });
                }}
                type="button"
              >
                <IconRefresh aria-hidden="true" className="session-context-menu-icon" size={14} />
                Refresh
              </button>
              <button
                className="secondary daemon-sessions-toolbar-button daemon-sessions-toolbar-button-danger"
                disabled={!state?.daemon}
                onClick={() => {
                  setIsKillDaemonConfirmOpen(true);
                }}
                type="button"
              >
                Kill Daemon
              </button>
            </div>
          </div>
          <div className="daemon-sessions-modal-body scroll-mask-y">
            {state ? (
              <>
                <section className="daemon-sessions-summary">
                  <div className="daemon-sessions-summary-row">
                    <span className="daemon-sessions-summary-label">Daemon</span>
                    <span className="daemon-sessions-summary-value">
                      {state.daemon
                        ? `PID ${String(state.daemon.pid)} on port ${String(state.daemon.port)}`
                        : "Not running"}
                    </span>
                  </div>
                  <div className="daemon-sessions-summary-row">
                    <span className="daemon-sessions-summary-label">Protocol</span>
                    <span className="daemon-sessions-summary-value">
                      {state.daemon ? String(state.daemon.protocolVersion) : "N/A"}
                    </span>
                  </div>
                  <div className="daemon-sessions-summary-row">
                    <span className="daemon-sessions-summary-label">Started</span>
                    <span className="daemon-sessions-summary-value">
                      {state.daemon ? formatTimestamp(state.daemon.startedAt) : "N/A"}
                    </span>
                  </div>
                  <div className="daemon-sessions-summary-row">
                    <span className="daemon-sessions-summary-label">Visible rows</span>
                    <span className="daemon-sessions-summary-value">
                      {String(filteredT3Sessions.length + filteredSessions.length)} of{" "}
                      {String((state.t3Sessions?.length ?? 0) + state.sessions.length)}
                    </span>
                  </div>
                </section>
                <section className="daemon-sessions-section">
                  <div className="daemon-sessions-section-header">
                    <div className="daemon-sessions-section-title">Shared T3 Code</div>
                    <button
                      className="secondary daemon-sessions-toolbar-button daemon-sessions-toolbar-button-danger"
                      disabled={!state.t3Server}
                      onClick={() => {
                        setIsKillT3ServerConfirmOpen(true);
                      }}
                      type="button"
                    >
                      Kill Server
                    </button>
                  </div>
                  <article
                    className="daemon-session-card daemon-session-card-t3-server"
                    data-current-workspace="true"
                  >
                    <div className="daemon-session-card-header">
                      <div className="daemon-session-card-title-wrap">
                        <div className="daemon-session-card-title">Managed T3 runtime</div>
                        <div className="daemon-session-card-subtitle">
                          Share route is served by VS Code. The runtime on port 3774 starts on
                          demand.
                        </div>
                      </div>
                      <div className="daemon-session-card-badges">
                        <span className="daemon-session-badge">
                          {state.t3Server ? "runtime running" : "runtime stopped"}
                        </span>
                      </div>
                    </div>
                    <div className="daemon-session-card-details">
                      <Detail label="Share URL Port">45438</Detail>
                      <Detail label="Runtime Port">
                        {state.t3Server ? String(state.t3Server.port) : "3774"}
                      </Detail>
                      <Detail label="PID">
                        {state.t3Server
                          ? String(state.t3Server.pid)
                          : state.t3Sessions.length > 0
                            ? "Starts on demand"
                            : "N/A"}
                      </Detail>
                      <Detail label="Started">
                        {state.t3Server?.startedAt
                          ? formatTimestamp(state.t3Server.startedAt)
                          : state.t3Server
                            ? "Detected from live port"
                            : "Not running"}
                      </Detail>
                      <Detail label="Sessions">{String(state.t3Sessions.length)}</Detail>
                    </div>
                  </article>
                  {filteredT3Sessions.length > 0 ? (
                    <div className="daemon-sessions-list">
                      {filteredT3Sessions.map((session) => (
                        <article
                          className="daemon-session-card"
                          data-current-workspace={String(session.isCurrentWorkspace)}
                          key={`t3:${session.sessionId}`}
                        >
                          <div className="daemon-session-card-header">
                            <div className="daemon-session-card-title-wrap">
                              <div className="daemon-session-card-title">
                                {session.title?.trim() || session.sessionId}
                              </div>
                              <div className="daemon-session-card-subtitle">
                                {session.sessionId}
                              </div>
                            </div>
                            <div className="daemon-session-card-badges">
                              {session.isFocused ? (
                                <span className="daemon-session-badge daemon-session-badge-current">
                                  Focused
                                </span>
                              ) : null}
                              <span className="daemon-session-badge">
                                {session.isSleeping
                                  ? "sleeping"
                                  : session.isRunning
                                    ? "running"
                                    : "stopped"}
                              </span>
                              <span className="daemon-session-badge">{session.activity}</span>
                            </div>
                          </div>
                          <div className="daemon-session-card-details">
                            <Detail label="Workspace">{session.workspaceId}</Detail>
                            <Detail label="Root">{session.workspaceRoot ?? "Pending"}</Detail>
                            <Detail label="Thread">{session.threadId ?? "Pending"}</Detail>
                            <Detail label="Last Active">
                              {session.lastInteractionAt
                                ? formatTimestamp(session.lastInteractionAt)
                                : "N/A"}
                            </Detail>
                            <Detail label="Title">{session.title?.trim() || "N/A"}</Detail>
                            <Detail label="Detail">{session.detail ?? "N/A"}</Detail>
                          </div>
                          <div className="daemon-session-card-actions">
                            <button
                              className="secondary daemon-session-action-button daemon-session-action-button-danger"
                              onClick={() => {
                                vscode.postMessage({
                                  sessionId: session.sessionId,
                                  type: "killT3RuntimeSession",
                                });
                              }}
                              type="button"
                            >
                              Kill Session
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="group-empty-state daemon-sessions-empty-state daemon-sessions-t3-empty">
                      {searchQuery.trim()
                        ? "No T3 sessions match that search."
                        : state.t3Server
                          ? "No T3 sessions are currently open in this workspace."
                          : "No shared T3 server is currently running."}
                    </div>
                  )}
                </section>
                {state.errorMessage ? (
                  <div className="daemon-sessions-error-banner">{state.errorMessage}</div>
                ) : null}
                {filteredSessions.length > 0 ? (
                  <div className="daemon-sessions-list">
                    {filteredSessions.map((session) => (
                      <article
                        className="daemon-session-card"
                        data-current-workspace={String(session.isCurrentWorkspace)}
                        key={`${session.workspaceId}:${session.sessionId}:${session.startedAt}`}
                      >
                        <div className="daemon-session-card-header">
                          <div className="daemon-session-card-title-wrap">
                            <div className="daemon-session-card-title">
                              {session.title?.trim() || session.sessionId}
                            </div>
                            <div className="daemon-session-card-subtitle">{session.sessionId}</div>
                          </div>
                          <div className="daemon-session-card-badges">
                            {session.isCurrentWorkspace ? (
                              <span className="daemon-session-badge daemon-session-badge-current">
                                Current Workspace
                              </span>
                            ) : null}
                            <span className="daemon-session-badge">{session.status}</span>
                            <span className="daemon-session-badge">{session.agentStatus}</span>
                          </div>
                        </div>
                        <div className="daemon-session-card-details">
                          <Detail label="Workspace">{session.workspaceId}</Detail>
                          <Detail label="CWD">{session.cwd}</Detail>
                          <Detail label="Shell">{session.shell}</Detail>
                          <Detail label="Agent">{session.agentName ?? "Unknown"}</Detail>
                          <Detail label="Restore">{session.restoreState}</Detail>
                          <Detail label="Size">{`${String(session.cols)} x ${String(session.rows)}`}</Detail>
                          <Detail label="Started">{formatTimestamp(session.startedAt)}</Detail>
                          <Detail label="Ended">
                            {session.endedAt ? formatTimestamp(session.endedAt) : "Active"}
                          </Detail>
                          <Detail label="Exit Code">
                            {session.exitCode !== undefined ? String(session.exitCode) : "N/A"}
                          </Detail>
                          <Detail label="Title">{session.title?.trim() || "N/A"}</Detail>
                        </div>
                        {session.errorMessage ? (
                          <div className="daemon-session-card-error">{session.errorMessage}</div>
                        ) : null}
                        <div className="daemon-session-card-actions">
                          <button
                            className="secondary daemon-session-action-button daemon-session-action-button-danger"
                            onClick={() => {
                              vscode.postMessage({
                                sessionId: session.sessionId,
                                type: "killDaemonSession",
                                workspaceId: session.workspaceId,
                              });
                            }}
                            type="button"
                          >
                            Kill Session
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="group-empty-state daemon-sessions-empty-state">
                    {searchQuery.trim()
                      ? "No daemon sessions match that search."
                      : state.daemon
                        ? "No zmux sessions are currently running."
                        : "No zmux daemon is currently running."}
                  </div>
                )}
              </>
            ) : (
              <div className="group-empty-state daemon-sessions-empty-state">
                Loading daemon session state…
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        confirmLabel="Kill Daemon"
        description="This will terminate the shared zmux daemon and disconnect every daemon-managed terminal session across workspaces."
        isOpen={isKillDaemonConfirmOpen}
        onCancel={() => setIsKillDaemonConfirmOpen(false)}
        onConfirm={() => {
          setIsKillDaemonConfirmOpen(false);
          vscode.postMessage({ type: "killTerminalDaemon" });
        }}
        title="Kill Shared Daemon"
      />
      <ConfirmationModal
        confirmLabel="Kill Server"
        description="This will stop the shared T3 Code server for this VS Code window. Existing T3 sessions will remain listed in zmux and can be started again later."
        isOpen={isKillT3ServerConfirmOpen}
        onCancel={() => setIsKillT3ServerConfirmOpen(false)}
        onConfirm={() => {
          setIsKillT3ServerConfirmOpen(false);
          vscode.postMessage({ type: "killT3RuntimeServer" });
        }}
        title="Kill Shared T3 Server"
      />
    </>,
    document.body,
  );
}

type DetailProps = {
  children: string;
  label: string;
};

function Detail({ children, label }: DetailProps) {
  return (
    <div className="daemon-session-detail">
      <div className="daemon-session-detail-label">{label}</div>
      <div className="daemon-session-detail-value">{children}</div>
    </div>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
