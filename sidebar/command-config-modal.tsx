import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";

export type CommandConfigDraft = {
  closeTerminalOnExit: boolean;
  command: string;
  commandId?: string;
  name: string;
};

export type CommandConfigModalProps = {
  draft: CommandConfigDraft;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (draft: CommandConfigDraft) => void;
};

export function CommandConfigModal({
  draft,
  isOpen,
  onCancel,
  onSave,
}: CommandConfigModalProps) {
  const [closeTerminalOnExit, setCloseTerminalOnExit] = useState(draft.closeTerminalOnExit);
  const [command, setCommand] = useState(draft.command);
  const [name, setName] = useState(draft.name);
  const checkboxId = useId();
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCloseTerminalOnExit(draft.closeTerminalOnExit);
    setCommand(draft.command);
    setName(draft.name);
  }, [draft, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const isSaveDisabled = name.trim().length === 0 || command.trim().length === 0;

  return createPortal(
    <div className="confirm-modal-root" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onCancel} type="button" />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-modal command-config-modal"
        role="dialog"
      >
        <div className="confirm-modal-header">
          <div className="confirm-modal-title" id={titleId}>
            Configure command
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            This command opens a new VS Code panel terminal each time it runs.
          </div>
        </div>
        <div className="command-config-fields">
          <label className="command-config-field">
            <span className="command-config-label">Name</span>
            <input
              autoFocus
              className="group-title-input command-config-input"
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Dev"
              value={name}
            />
          </label>
          <label className="command-config-field">
            <span className="command-config-label">Command</span>
            <textarea
              className="group-title-input command-config-input command-config-textarea"
              onChange={(event) => setCommand(event.currentTarget.value)}
              placeholder="vp dev"
              rows={3}
              value={command}
            />
          </label>
          <label className="command-config-toggle" htmlFor={checkboxId}>
            <input
              checked={closeTerminalOnExit}
              className="command-config-checkbox"
              id={checkboxId}
              onChange={(event) => setCloseTerminalOnExit(event.currentTarget.checked)}
              type="checkbox"
            />
            <span className="command-config-toggle-copy">
              Close terminal after the command finishes
            </span>
          </label>
        </div>
        <div className="confirm-modal-actions">
          <button className="secondary confirm-modal-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="primary confirm-modal-button"
            disabled={isSaveDisabled}
            onClick={() =>
              onSave({
                closeTerminalOnExit,
                command: command.trim(),
                commandId: draft.commandId,
                name: name.trim(),
              })
            }
            type="button"
          >
            Save Command
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
