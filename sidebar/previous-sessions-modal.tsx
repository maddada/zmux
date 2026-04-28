import { Tooltip } from "@base-ui/react/tooltip";
import { IconStar, IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterPreviousSessions, groupPreviousSessionsByDay } from "./previous-session-search";
import { FirstUserMessageModal } from "./first-user-message-modal";
import { SessionHistoryCard } from "./session-history-card";
import { useSidebarStore } from "./sidebar-store";
import {
  applyTextEditingKey,
  isEditableKeyboardTarget,
  isTextEditingKey,
} from "./text-input-keyboard";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import type { WebviewApi } from "./webview-api";

export type PreviousSessionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  vscode: WebviewApi;
};

export function PreviousSessionsModal({ isOpen, onClose, vscode }: PreviousSessionsModalProps) {
  const previousSessions = useSidebarStore((state) => state.previousSessions);
  const showDebugSessionNumbers = useSidebarStore((state) => state.hud.debuggingMode);
  const showHotkeys = useSidebarStore((state) => state.hud.showHotkeysOnSessionCards);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFindQueryRequired, setIsFindQueryRequired] = useState(false);
  const [firstMessageSession, setFirstMessageSession] = useState<{
    message: string;
    title?: string;
  }>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingSelectionRef = useRef<{ end: number; start: number } | undefined>(undefined);
  const filteredSessions = useMemo(
    () => filterPreviousSessions(previousSessions, searchQuery, { favoritesOnly }),
    [favoritesOnly, previousSessions, searchQuery],
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
        if (firstMessageSession) {
          setFirstMessageSession(undefined);
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        onClose();
        return;
      }

      const searchInput = searchInputRef.current;
      if (
        !searchInput ||
        event.target === searchInput ||
        isEditableKeyboardTarget(event.target) ||
        !isTextEditingKey(event)
      ) {
        return;
      }

      const nextSearchState = applyTextEditingKey(
        {
          selectionEnd: searchInput.selectionEnd,
          selectionStart: searchInput.selectionStart,
          value: searchInput.value,
        },
        event.key,
        event,
      );
      if (!nextSearchState) {
        return;
      }

      event.preventDefault();
      pendingSelectionRef.current = {
        end: nextSearchState.selectionEnd,
        start: nextSearchState.selectionStart,
      };
      searchInput.focus();
      setSearchQuery(nextSearchState.value);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [firstMessageSession, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setFavoritesOnly(false);
      setFirstMessageSession(undefined);
      setIsFindQueryRequired(false);
      setSearchQuery("");
      pendingSelectionRef.current = undefined;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const input = searchInputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      const selectionIndex = input.value.length;
      input.setSelectionRange(selectionIndex, selectionIndex);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      pendingSelectionRef.current = undefined;
      return;
    }

    const pendingSelection = pendingSelectionRef.current;
    if (!pendingSelection) {
      return;
    }

    const input = searchInputRef.current;
    if (!input) {
      return;
    }

    pendingSelectionRef.current = undefined;
    input.focus();
    input.setSelectionRange(pendingSelection.start, pendingSelection.end);
  }, [isOpen, searchQuery]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
      <div className="confirm-modal-root scroll-mask-y" role="presentation">
        <button className="confirm-modal-backdrop" onClick={onClose} type="button" />
        <div
          aria-labelledby="previous-sessions-modal-title"
          aria-modal="true"
          className="confirm-modal previous-sessions-modal scroll-mask-y"
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
          </div>
          <div className="previous-sessions-toolbar">
            <input
              aria-label="Search previous sessions"
              className="group-title-input previous-sessions-search-input"
              onChange={(event) => {
                setIsFindQueryRequired(false);
                setSearchQuery(event.target.value);
              }}
              placeholder={
                isFindQueryRequired ? "Describe the session to find..." : "Search sessions..."
              }
              ref={searchInputRef}
              type="text"
              value={searchQuery}
            />
            <button
              aria-label={
                favoritesOnly
                  ? "Show all previous sessions"
                  : "Show favorite previous sessions only"
              }
              className="previous-sessions-favorites-toggle"
              data-selected={String(favoritesOnly)}
              onClick={() => {
                setFavoritesOnly((previous) => !previous);
              }}
              type="button"
            >
              <IconStar
                aria-hidden="true"
                className="toolbar-tabler-icon"
                fill={favoritesOnly ? "currentColor" : "none"}
                stroke={1.8}
              />
            </button>
          </div>
          <div className="previous-sessions-modal-body scroll-mask-y">
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
                        onViewFirstMessage={() => {
                          const message = session.firstUserMessage?.trim();
                          if (!message) {
                            return;
                          }

                          setFirstMessageSession({
                            message,
                            title:
                              session.primaryTitle?.trim() ||
                              session.terminalTitle?.trim() ||
                              session.alias,
                          });
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
                  ? favoritesOnly
                    ? "No favorite previous sessions match that search."
                    : "No previous sessions match that search."
                  : favoritesOnly
                    ? "No favorite previous sessions yet."
                    : "No previous sessions yet."}
              </div>
            )}
          </div>
          <div className="previous-sessions-footer">
            <button
              className="previous-sessions-find-button"
              onClick={() => {
                const normalizedQuery = searchQuery.trim();
                if (!normalizedQuery) {
                  /**
                   * CDXC:PreviousSessions 2026-04-28-05:36
                   * Prompt to Find Session now uses the modal search field as
                   * the query prompt, because native WKWebView prompt dialogs
                   * can fail silently after the command leaves the modal host.
                   */
                  setIsFindQueryRequired(true);
                  searchInputRef.current?.focus();
                  return;
                }
                vscode.postMessage({
                  query: normalizedQuery,
                  type: "promptFindPreviousSession",
                });
                onClose();
              }}
              type="button"
            >
              Prompt to Find Session
            </button>
          </div>
          <FirstUserMessageModal
            isOpen={firstMessageSession !== undefined}
            message={firstMessageSession?.message ?? ""}
            onClose={() => setFirstMessageSession(undefined)}
            title={firstMessageSession?.title}
          />
        </div>
      </div>
    </Tooltip.Provider>,
    document.body,
  );
}
