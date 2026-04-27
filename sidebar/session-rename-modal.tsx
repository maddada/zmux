import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export type SessionRenameModalProps = {
  initialTitle: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (title: string) => void;
};

/**
 * CDXC:Sidebar 2026-04-26-18:19
 * Session-card renaming must happen inside the sidebar instead of delegating to
 * VS Code's input box, while still submitting through the existing
 * renameSession message so controller-side title generation and Agent CLI sync
 * behavior remain exactly the same.
 */
export function SessionRenameModal({
  initialTitle,
  isOpen,
  onCancel,
  onConfirm,
}: SessionRenameModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(initialTitle);
  }, [initialTitle, isOpen]);

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

  const trimmedTitle = title.trim();
  const confirmTitle = (nextTitle: string) => {
    const normalizedTitle = nextTitle.trim();
    if (!normalizedTitle) {
      return;
    }

    onConfirm(normalizedTitle);
  };

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    confirmTitle(title);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    /**
     * CDXC:SidebarRename 2026-04-28-15:34
     * The native full-window modal host must preserve the reference rename
     * behavior where typing a session name and pressing Enter immediately
     * submits the existing renameSession command path. Bind Enter at the input
     * so WKWebView form-submission differences cannot leave the modal inert.
     */
    event.preventDefault();
    event.stopPropagation();
    confirmTitle(event.currentTarget.value);
  };

  return createPortal(
    <div className="confirm-modal-root scroll-mask-y" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onCancel} type="button" />
      <form
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-modal session-rename-modal scroll-mask-y"
        onSubmit={submitRename}
        role="dialog"
      >
        <button
          aria-label="Close rename session modal"
          className="confirm-modal-close-button"
          onClick={onCancel}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id={titleId}>
            Rename Session
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            Paste text over 50 characters to auto-generate a name.
          </div>
        </div>
        <label className="command-config-field">
          <span className="command-config-label">Session Name</span>
          <input
            autoFocus
            className="group-title-input command-config-input"
            onChange={(event) => setTitle(event.currentTarget.value)}
            onKeyDown={handleInputKeyDown}
            ref={inputRef}
            value={title}
          />
        </label>
        <div className="confirm-modal-actions">
          <button className="secondary confirm-modal-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="primary confirm-modal-button" disabled={!trimmedTitle} type="submit">
            Rename
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
