import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { SidebarPreviousSessionItem } from "../shared/session-grid-contract";
import { filterPreviousSessions, groupPreviousSessionsByDay } from "./previous-session-search";
import { SessionHistoryCard } from "./session-history-card";
import type { WebviewApi } from "./webview-api";

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
  const [searchQuery, setSearchQuery] = useState("");
  const filteredSessions = useMemo(
    () => filterPreviousSessions(previousSessions, searchQuery),
    [previousSessions, searchQuery],
  );
  const groupedSessions = useMemo(
    () => groupPreviousSessionsByDay(filteredSessions),
    [filteredSessions],
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

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

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
        <button
          aria-label="Close previous sessions"
          className="confirm-modal-close-button"
          onClick={onClose}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id="previous-sessions-modal-title">
            Previous Sessions
          </div>
          <div className="confirm-modal-description" id="previous-sessions-modal-description">
            Sessions you previously ran in this workspace.
          </div>
        </div>
        <div className="previous-sessions-toolbar">
          <input
            aria-label="Search previous sessions"
            className="group-title-input previous-sessions-search-input"
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            placeholder="Search sessions"
            type="text"
            value={searchQuery}
          />
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
              {searchQuery.trim()
                ? "No previous sessions match that search."
                : "No previous sessions yet."}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
