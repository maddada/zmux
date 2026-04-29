import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

export type FindPreviousSessionModalProps = {
  initialQuery?: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (query: string) => void;
};

/**
 * CDXC:PreviousSessions 2026-04-28-16:18
 * Command-triggered previous-session search must use the same React modal
 * presentation as sidebar dialogs. Do not delegate missing search text to
 * VS Code's input box.
 */
export function FindPreviousSessionModal({
  initialQuery,
  isOpen,
  onCancel,
  onConfirm,
}: FindPreviousSessionModalProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery(initialQuery ?? "");
  }, [initialQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const normalizedQuery = query.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedQuery) {
      return;
    }
    onConfirm(normalizedQuery);
  };

  return createPortal(
    <div className="confirm-modal-root scroll-mask-y" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onCancel} type="button" />
      <form
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-modal session-rename-modal scroll-mask-y"
        onSubmit={submit}
        role="dialog"
      >
        <button
          aria-label="Close previous session search"
          className="confirm-modal-close-button"
          onClick={onCancel}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id={titleId}>
            Find Previous Session
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            Describe what you remember from the session.
          </div>
        </div>
        <label className="command-config-field">
          <span className="command-config-label">Search</span>
          <input
            className="group-title-input command-config-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. full reload should not update last active"
            ref={inputRef}
            type="text"
            value={query}
          />
        </label>
        <div className="confirm-modal-actions">
          <button className="secondary confirm-modal-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="primary confirm-modal-button" disabled={!normalizedQuery} type="submit">
            Find Session
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
