import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

export type T3ThreadIdModalProps = {
  currentThreadId: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (threadId: string) => void;
};

/**
 * CDXC:T3Sessions 2026-04-28-16:18
 * T3 thread binding edits must stay in the React modal system rather than
 * using VS Code's input box. This keeps native zmux and extension-triggered
 * prompts visually consistent.
 */
export function T3ThreadIdModal({
  currentThreadId,
  isOpen,
  onCancel,
  onConfirm,
}: T3ThreadIdModalProps) {
  const [threadId, setThreadId] = useState(currentThreadId);
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setThreadId(currentThreadId);
  }, [currentThreadId, isOpen]);

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

  const normalizedThreadId = threadId.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedThreadId) {
      return;
    }
    onConfirm(normalizedThreadId);
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
          aria-label="Close T3 thread id modal"
          className="confirm-modal-close-button"
          onClick={onCancel}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id={titleId}>
            Set T3 Thread ID
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            Paste the thread id to bind this T3 session.
          </div>
        </div>
        <label className="command-config-field">
          <span className="command-config-label">Thread ID</span>
          <input
            className="group-title-input command-config-input"
            onChange={(event) => setThreadId(event.target.value)}
            placeholder="Paste a T3 thread id"
            ref={inputRef}
            type="text"
            value={threadId}
          />
        </label>
        <div className="confirm-modal-actions">
          <button className="secondary confirm-modal-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="primary confirm-modal-button"
            disabled={!normalizedThreadId}
            type="submit"
          >
            Set Thread ID
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
