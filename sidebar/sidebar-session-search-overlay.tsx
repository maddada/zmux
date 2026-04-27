import { IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, type KeyboardEventHandler, type RefObject } from "react";
import type { SidebarPreviousSessionItem } from "../shared/session-grid-contract";
import { SessionHistoryCard } from "./session-history-card";

export type SidebarSessionSearchFieldProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  query: string;
  setQuery: (query: string) => void;
};

export function SidebarSessionSearchField({
  inputRef,
  onKeyDown,
  query,
  setQuery,
}: SidebarSessionSearchFieldProps) {
  const hasQuery = query.length > 0;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(query.length, query.length);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query.length]);

  return (
    <div className="session-search-toolbar" data-empty-space-blocking="true">
      <div className="session-search-input-shell">
        <input
          aria-label="Search current and previous sessions"
          className="group-title-input session-search-input"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search sessions"
          ref={inputRef}
          type="text"
          value={query}
        />
        {hasQuery ? (
          <button
            aria-label="Clear session search"
            className="session-search-clear-button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            type="button"
          >
            <IconX
              aria-hidden="true"
              className="session-search-input-icon"
              size={16}
              stroke={1.9}
            />
          </button>
        ) : (
          <IconSearch
            aria-hidden="true"
            className="session-search-input-icon"
            size={16}
            stroke={1.9}
          />
        )}
      </div>
    </div>
  );
}

export type SidebarPreviousSessionsSearchGroupProps = {
  onDeletePreviousSession: (historyId: string) => void;
  onRestorePreviousSession: (historyId: string) => void;
  previousSessions: readonly SidebarPreviousSessionItem[];
  selectedHistoryId?: string;
  showDebugSessionNumbers: boolean;
  showHotkeys: boolean;
};

export function SidebarPreviousSessionsSearchGroup({
  onDeletePreviousSession,
  onRestorePreviousSession,
  previousSessions,
  selectedHistoryId,
  showDebugSessionNumbers,
  showHotkeys,
}: SidebarPreviousSessionsSearchGroupProps) {
  if (previousSessions.length === 0) {
    return null;
  }

  return (
    <section className="group session-search-previous-group" data-search-results="true">
      <div className="group-head">
        <div className="group-title-wrap">
          <div className="group-title-row">
            <div className="group-title-handle">
              <div className="group-title">Previous Sessions</div>
            </div>
          </div>
        </div>
      </div>
      <div className="group-sessions">
        {previousSessions.map((session) => (
          <SessionHistoryCard
            key={session.historyId}
            isSearchSelected={selectedHistoryId === session.historyId}
            onDelete={() => onDeletePreviousSession(session.historyId)}
            onRestore={() => onRestorePreviousSession(session.historyId)}
            session={session}
            showDebugSessionNumbers={showDebugSessionNumbers}
            showHotkeys={showHotkeys}
          />
        ))}
      </div>
    </section>
  );
}
