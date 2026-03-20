import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";

export type AgentConfigDraft = {
  agentId?: string;
  command: string;
  name: string;
};

export type AgentConfigModalProps = {
  draft: AgentConfigDraft;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (draft: AgentConfigDraft) => void;
};

export function AgentConfigModal({
  draft,
  isOpen,
  onCancel,
  onSave,
}: AgentConfigModalProps) {
  const [command, setCommand] = useState(draft.command);
  const [name, setName] = useState(draft.name);
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

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
            Configure agent
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            Launches a new VSmux session and runs this agent command in it.
          </div>
        </div>
        <div className="command-config-fields">
          <label className="command-config-field">
            <span className="command-config-label">Name</span>
            <input
              autoFocus
              className="group-title-input command-config-input"
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Codex CLI"
              value={name}
            />
          </label>
          <label className="command-config-field">
            <span className="command-config-label">Command</span>
            <textarea
              className="group-title-input command-config-input command-config-textarea"
              onChange={(event) => setCommand(event.currentTarget.value)}
              placeholder="codex"
              rows={3}
              value={command}
            />
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
                agentId: draft.agentId,
                command: command.trim(),
                name: name.trim(),
              })
            }
            type="button"
          >
            Save Agent
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
