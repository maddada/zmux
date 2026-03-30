import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";

export type GitCommitModalDraft = {
  confirmLabel: string;
  description: string;
  requestId: string;
  suggestedSubject: string;
};

export type GitCommitModalProps = {
  draft: GitCommitModalDraft;
  isOpen: boolean;
  onCancel: (requestId: string) => void;
  onConfirm: (requestId: string, subject: string) => void;
};

export function GitCommitModal({ draft, isOpen, onCancel, onConfirm }: GitCommitModalProps) {
  const [subject, setSubject] = useState(draft.suggestedSubject);
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSubject(draft.suggestedSubject);
  }, [draft, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel(draft.requestId);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [draft.requestId, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const trimmedSubject = subject.trim();

  return createPortal(
    <div className="confirm-modal-root" role="presentation">
      <button
        className="confirm-modal-backdrop"
        onClick={() => onCancel(draft.requestId)}
        type="button"
      />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-modal command-config-modal git-commit-modal"
        role="dialog"
      >
        <button
          aria-label="Close suggested commit modal"
          className="confirm-modal-close-button"
          onClick={() => onCancel(draft.requestId)}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id={titleId}>
            Review Suggested Commit
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            {draft.description}
          </div>
        </div>
        <div className="command-config-fields">
          <label className="command-config-field">
            <span className="command-config-label">Commit Title</span>
            <textarea
              autoFocus
              className="group-title-input command-config-input command-config-textarea"
              onChange={(event) => setSubject(event.currentTarget.value)}
              placeholder="Describe the change"
              rows={3}
              value={subject}
              wrap="soft"
            />
          </label>
        </div>
        <div className="confirm-modal-actions">
          <button
            className="secondary confirm-modal-button"
            onClick={() => onCancel(draft.requestId)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="primary confirm-modal-button"
            disabled={trimmedSubject.length === 0}
            onClick={() => onConfirm(draft.requestId, trimmedSubject)}
            type="button"
          >
            {draft.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
