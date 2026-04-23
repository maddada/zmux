import { IconCopy, IconPencil, IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SidebarPinnedPrompt } from "../shared/session-grid-contract";
import { useSidebarStore } from "./sidebar-store";
import type { WebviewApi } from "./webview-api";

export type PinnedPromptsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  vscode: WebviewApi;
};

type PromptEditorState = {
  content: string;
  promptId?: string;
  title: string;
};

export function PinnedPromptsModal({ isOpen, onClose, vscode }: PinnedPromptsModalProps) {
  const pinnedPrompts = useSidebarStore((state) => state.pinnedPrompts);
  const [editorState, setEditorState] = useState<PromptEditorState>();

  useEffect(() => {
    if (!isOpen) {
      setEditorState(undefined);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (editorState) {
        setEditorState(undefined);
        return;
      }

      onClose();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editorState, isOpen, onClose]);

  const promptCards = useMemo(
    () =>
      pinnedPrompts.map((prompt, index) => (
        <PinnedPromptCard
          index={index}
          key={prompt.promptId}
          onCopy={async () => {
            await navigator.clipboard.writeText(prompt.content);
          }}
          onEdit={() => {
            setEditorState({
              content: prompt.content,
              promptId: prompt.promptId,
              title: prompt.title,
            });
          }}
          prompt={prompt}
        />
      )),
    [pinnedPrompts],
  );

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div className="confirm-modal-root" role="presentation">
        <button className="confirm-modal-backdrop" onClick={onClose} type="button" />
        <div
          aria-labelledby="pinned-prompts-modal-title"
          aria-modal="true"
          className="confirm-modal pinned-prompts-modal"
          role="dialog"
        >
          <button
            aria-label="Close pinned prompts"
            className="confirm-modal-close-button"
            onClick={onClose}
            type="button"
          >
            <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
          </button>
          <div className="confirm-modal-header confirm-modal-header-with-close">
            <div className="confirm-modal-title" id="pinned-prompts-modal-title">
              Pinned Prompts
            </div>
          </div>
          <div className="pinned-prompts-modal-body">
            {promptCards.length > 0 ? (
              <div className="pinned-prompts-list">{promptCards}</div>
            ) : (
              <div className="group-empty-state previous-sessions-empty-state">
                No pinned prompts yet.
              </div>
            )}
          </div>
          <div className="previous-sessions-footer">
            <button
              className="previous-sessions-find-button"
              onClick={() => {
                setEditorState({ content: "", title: "" });
              }}
              type="button"
            >
              Add Prompt
            </button>
          </div>
        </div>
      </div>
      <PinnedPromptEditorModal
        draft={editorState}
        isOpen={editorState !== undefined}
        onClose={() => {
          setEditorState(undefined);
        }}
        onSave={(draft) => {
          vscode.postMessage({
            content: draft.content,
            promptId: draft.promptId,
            title: draft.title,
            type: "savePinnedPrompt",
          });
          setEditorState(undefined);
        }}
      />
    </>,
    document.body,
  );
}

type PinnedPromptCardProps = {
  index: number;
  onCopy: () => void | Promise<void>;
  onEdit: () => void;
  prompt: SidebarPinnedPrompt;
};

function PinnedPromptCard({ index, onCopy, onEdit, prompt }: PinnedPromptCardProps) {
  return (
    <article className="pinned-prompt-card">
      <div className="pinned-prompt-card-actions">
        <button
          aria-label={`Copy pinned prompt ${index + 1}`}
          className="pinned-prompt-card-action copy-cursor"
          onClick={() => {
            void onCopy();
          }}
          type="button"
        >
          <IconCopy aria-hidden="true" size={11} stroke={1.9} />
        </button>
        <button
          aria-label={`Edit pinned prompt ${index + 1}`}
          className="pinned-prompt-card-action"
          onClick={onEdit}
          type="button"
        >
          <IconPencil aria-hidden="true" size={11} stroke={1.9} />
        </button>
      </div>
      <div className="pinned-prompt-card-title">{prompt.title}</div>
    </article>
  );
}

type PinnedPromptEditorModalProps = {
  draft: PromptEditorState | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: PromptEditorState) => void;
};

function PinnedPromptEditorModal({ draft, isOpen, onClose, onSave }: PinnedPromptEditorModalProps) {
  const [draftTitle, setDraftTitle] = useState(draft?.title ?? "");
  const [draftContent, setDraftContent] = useState(draft?.content ?? "");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setDraftTitle(draft?.title ?? "");
      setDraftContent(draft?.content ?? "");
      return;
    }

    setDraftTitle(draft?.title ?? "");
    setDraftContent(draft?.content ?? "");
  }, [draft, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const titleInput = titleInputRef.current;
      if (!titleInput) {
        return;
      }

      titleInput.focus();
      const selectionIndex = titleInput.value.length;
      titleInput.setSelectionRange(selectionIndex, selectionIndex);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!isOpen || !draft) {
    return null;
  }

  return createPortal(
    <div className="confirm-modal-root confirm-modal-root-nested" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onClose} type="button" />
      <div
        aria-labelledby="pinned-prompt-editor-modal-title"
        aria-modal="true"
        className="confirm-modal pinned-prompt-editor-modal"
        role="dialog"
      >
        <button
          aria-label="Close pinned prompt editor"
          className="confirm-modal-close-button"
          onClick={onClose}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id="pinned-prompt-editor-modal-title">
            {draft.promptId ? "Edit Prompt" : "Add Prompt"}
          </div>
        </div>
        <div className="pinned-prompt-editor-body">
          <div className="command-config-fields">
            <label className="command-config-field">
              <span className="command-config-label">Title</span>
              <input
                aria-label="Pinned prompt title"
                className="command-config-input pinned-prompt-editor-title-input"
                onChange={(event) => {
                  setDraftTitle(event.target.value);
                }}
                placeholder="Short title for this prompt"
                ref={titleInputRef}
                spellCheck={false}
                type="text"
                value={draftTitle}
              />
            </label>
          </div>
          <textarea
            aria-label="Pinned prompt"
            className="scratch-pad-textarea pinned-prompt-editor-textarea"
            onChange={(event) => {
              setDraftContent(event.target.value);
            }}
            placeholder="Write a prompt you want available in every project."
            ref={textareaRef}
            spellCheck={false}
            value={draftContent}
          />
        </div>
        <div className="confirm-modal-actions">
          <button className="secondary confirm-modal-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="primary confirm-modal-button"
            disabled={!draftTitle.trim() || !draftContent.trim()}
            onClick={() => {
              onSave({
                content: draftContent,
                promptId: draft.promptId,
                title: draftTitle,
              });
            }}
            type="button"
          >
            <span>{draft.promptId ? "Save Prompt" : "Add Prompt"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
