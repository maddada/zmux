import { createPortal } from "react-dom";
import { useEffect, useMemo } from "react";
import type { SidebarPreviousSessionItem } from "../shared/session-grid-contract";
import { SessionHistoryCard } from "./session-history-card";
import type { WebviewApi } from "./webview-api";

type PreviousSessionsModalDayGroup = {
  dayLabel: string;
  sessions: SidebarPreviousSessionItem[];
};

export type PreviousSessionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  previousSessions: SidebarPreviousSessionItem[];
  showDebugSessionNumbers: boolean;
  showHotkeys: boolean;
  vscode: WebviewApi;
};

export function PreviousSessionsModal({
  isOpen,
  onClose,
  previousSessions,
  showDebugSessionNumbers,
  showHotkeys,
  vscode,
}: PreviousSessionsModalProps) {
  const groupedSessions = useMemo(
    () => groupPreviousSessionsByDay(previousSessions),
    [previousSessions],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="confirm-modal-root" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onClose} type="button" />
      <div
        aria-describedby="previous-sessions-modal-description"
        aria-labelledby="previous-sessions-modal-title"
        aria-modal="true"
        className="confirm-modal previous-sessions-modal"
        role="dialog"
      >
        <div className="confirm-modal-header">
          <div className="confirm-modal-title" id="previous-sessions-modal-title">
            Previous Sessions
          </div>
          <div className="confirm-modal-description" id="previous-sessions-modal-description">
            Sessions you previously ran in this workspace.
          </div>
        </div>
        <div className="previous-sessions-modal-body">
          {groupedSessions.length > 0 ? (
            groupedSessions.map((group) => (
              <section className="previous-sessions-day-group" key={group.dayLabel}>
                <div className="previous-sessions-day-label">{group.dayLabel}</div>
                <div className="group-sessions">
                  {group.sessions.map((session) => (
                    <SessionHistoryCard
                      key={session.historyId}
                      onDelete={() => {
                        vscode.postMessage({
                          historyId: session.historyId,
                          type: "deletePreviousSession",
                        });
                      }}
                      onRestore={() => {
                        vscode.postMessage({
                          historyId: session.historyId,
                          type: "restorePreviousSession",
                        });
                        onClose();
                      }}
                      session={session}
                      showDebugSessionNumbers={showDebugSessionNumbers}
                      showHotkeys={showHotkeys}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="group-empty-state previous-sessions-empty-state">
              No previous sessions yet.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function groupPreviousSessionsByDay(
  previousSessions: readonly SidebarPreviousSessionItem[],
): PreviousSessionsModalDayGroup[] {
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
  const sessionsByDay = new Map<string, SidebarPreviousSessionItem[]>();

  for (const session of previousSessions) {
    const date = new Date(session.closedAt);
    const key = Number.isNaN(date.getTime()) ? "Unknown day" : formatter.format(date);
    const grouped = sessionsByDay.get(key);
    if (grouped) {
      grouped.push(session);
      continue;
    }

    sessionsByDay.set(key, [session]);
  }

  return [...sessionsByDay.entries()].map(([dayLabel, sessions]) => ({
    dayLabel,
    sessions,
  }));
}
