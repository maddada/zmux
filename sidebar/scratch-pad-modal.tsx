import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useSidebarStore } from "./sidebar-store";

export type ScratchPadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
};

export function ScratchPadModal({ isOpen, onClose, onSave }: ScratchPadModalProps) {
  const content = useSidebarStore((state) => state.scratchPadContent);
  const [draftContent, setDraftContent] = useState(content);
  const lastSavedContentRef = useRef(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasOpenRef = useRef(false);

  const flushDraft = () => {
    if (draftContent === lastSavedContentRef.current) {
      return;
    }

    lastSavedContentRef.current = draftContent;
    onSave(draftContent);
  };

  const closeModal = () => {
    flushDraft();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setDraftContent(content);
      lastSavedContentRef.current = content;
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      setDraftContent(content);
      lastSavedContentRef.current = content;
      wasOpenRef.current = true;
    }
  }, [content, isOpen]);

  useEffect(() => {
    if (!isOpen || draftContent === lastSavedContentRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastSavedContentRef.current = draftContent;
      onSave(draftContent);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftContent, isOpen, onSave]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [draftContent, isOpen, onClose, onSave]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      const selectionIndex = textarea.value.length;
      textarea.setSelectionRange(selectionIndex, selectionIndex);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="confirm-modal-root scroll-mask-y" role="presentation">
      <button className="confirm-modal-backdrop" onClick={closeModal} type="button" />
      <div
        aria-labelledby="scratch-pad-modal-title"
        aria-modal="true"
        className="confirm-modal scratch-pad-modal scroll-mask-y"
        role="dialog"
      >
        <button
          aria-label="Close scratch pad"
          className="confirm-modal-close-button"
          onClick={closeModal}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id="scratch-pad-modal-title">
            Scratch Pad
          </div>
        </div>
        <div className="scratch-pad-modal-body">
          <textarea
            aria-label="Scratch pad"
            className="scratch-pad-textarea"
            onBlur={flushDraft}
            onChange={(event) => {
              setDraftContent(event.target.value);
            }}
            placeholder="Workspace notes that autosave as you type."
            ref={textareaRef}
            spellCheck={false}
            value={draftContent}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
