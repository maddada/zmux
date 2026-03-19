import { useDroppable } from "@dnd-kit/react";
import {
  startTransition,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { SidebarSessionGroup, SidebarSessionItem } from "../shared/session-grid-contract";
import { createGroupDropData } from "./sidebar-dnd";
import { SortableSessionCard } from "./sortable-session-card";
import type { WebviewApi } from "./webview-api";

export type SessionGroupSectionProps = {
  autoEdit: boolean;
  group: SidebarSessionGroup;
  onAutoEditHandled: () => void;
  orderedSessions: SidebarSessionItem[];
  showCloseButton: boolean;
  showHotkeys: boolean;
  vscode: WebviewApi;
};

export function SessionGroupSection({
  autoEdit,
  group,
  onAutoEditHandled,
  orderedSessions,
  showCloseButton,
  showHotkeys,
  vscode,
}: SessionGroupSectionProps) {
  const [draftTitle, setDraftTitle] = useState(group.title);
  const [isEditing, setIsEditing] = useState(false);
  const droppable = useDroppable({
    accept: "session",
    data: createGroupDropData(group.groupId),
    id: `group:${group.groupId}`,
  });

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setDraftTitle(group.title);
  }, [group.title, isEditing]);

  useEffect(() => {
    if (!autoEdit) {
      return;
    }

    startTransition(() => {
      setDraftTitle(group.title);
      setIsEditing(true);
      onAutoEditHandled();
    });
  }, [autoEdit, group.title, onAutoEditHandled]);

  const submitRename = () => {
    const nextTitle = draftTitle.trim();
    setIsEditing(false);
    setDraftTitle(nextTitle || group.title);

    if (!nextTitle || nextTitle === group.title) {
      return;
    }

    vscode.postMessage({
      groupId: group.groupId,
      title: nextTitle,
      type: "renameGroup",
    });
  };

  const handleTitleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitRename();
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    setDraftTitle(group.title);
    setIsEditing(false);
  };

  return (
    <section
      className="group"
      data-active={String(group.isActive)}
      data-drop-target={String(droppable.isDropTarget)}
      onClick={() => {
        vscode.postMessage({
          groupId: group.groupId,
          type: "focusGroup",
        });
      }}
      ref={droppable.ref}
    >
      <div className="group-head">
        <div className="group-title-wrap">
          {isEditing ? (
            <input
              autoFocus
              className="group-title-input"
              onBlur={submitRename}
              onChange={(event) => setDraftTitle(event.currentTarget.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleTitleKeyDown}
              value={draftTitle}
            />
          ) : (
            <button
              className="group-title-button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsEditing(true);
              }}
              type="button"
            >
              <span className="group-title">{group.title}</span>
            </button>
          )}
        </div>
        <div className="group-status" data-active={String(group.isActive)}>
          {group.isActive ? "Active" : "Switch"}
        </div>
      </div>
      <div className="group-sessions">
        {orderedSessions.map((session, index) => (
          <SortableSessionCard
            groupId={group.groupId}
            index={index}
            key={session.sessionId}
            session={session}
            showCloseButton={showCloseButton}
            showHotkeys={showHotkeys}
            vscode={vscode}
          />
        ))}
      </div>
      {orderedSessions.length === 0 ? (
        <div className="group-empty" data-empty-space-blocking="true">
          Click the group to activate it, then create a session.
        </div>
      ) : null}
    </section>
  );
}
