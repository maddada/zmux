import { IconTrash } from "@tabler/icons-react";
import { useRef } from "react";
import type { SidebarPreviousSessionItem } from "../shared/session-grid-contract";
import { SessionCardContent } from "./session-card-content";

export type SessionHistoryCardProps = {
  onDelete: () => void;
  onRestore: () => void;
  session: SidebarPreviousSessionItem;
  showDebugSessionNumbers: boolean;
  showHotkeys: boolean;
};

export function SessionHistoryCard({
  onDelete,
  onRestore,
  session,
  showDebugSessionNumbers,
  showHotkeys,
}: SessionHistoryCardProps) {
  const aliasHeadingRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="session-frame session-history-frame"
      data-activity={session.activity}
      data-focused="false"
      data-running="false"
      data-restorable={String(session.isRestorable)}
      data-visible="false"
    >
      <article
        aria-disabled={!session.isRestorable}
        aria-pressed="false"
        aria-label={session.isRestorable ? `Restore ${session.alias}` : session.alias}
        className="session session-history-card"
        data-activity={session.activity}
        data-has-agent-icon={String(Boolean(session.agentIcon))}
        data-dragging="false"
        data-focused="false"
        data-running="false"
        data-restorable={String(session.isRestorable)}
        data-visible="false"
        onClick={() => {
          if (!session.isRestorable) {
            return;
          }

          onRestore();
        }}
        onKeyDown={(event) => {
          if (!session.isRestorable || (event.key !== "Enter" && event.key !== " ")) {
            return;
          }

          event.preventDefault();
          onRestore();
        }}
        role={session.isRestorable ? "button" : undefined}
        tabIndex={session.isRestorable ? 0 : -1}
      >
        <button
          aria-label={`Delete ${session.alias} from previous sessions`}
          className="previous-session-delete-button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          type="button"
        >
          <IconTrash aria-hidden="true" size={12} stroke={1.9} />
        </button>
        <SessionCardContent
          aliasHeadingRef={aliasHeadingRef}
          session={session}
          showDebugSessionNumbers={showDebugSessionNumbers}
          showCloseButton={false}
          showHotkeys={showHotkeys}
        />
      </article>
      <div aria-hidden className="session-status-dot" />
    </div>
  );
}
