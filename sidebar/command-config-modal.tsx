import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import { DEFAULT_BROWSER_ACTION_URL, type SidebarActionType } from "../shared/sidebar-commands";

export type CommandConfigDraft = {
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  command?: string;
  commandId?: string;
  name: string;
  url?: string;
};

export type CommandConfigModalProps = {
  draft: CommandConfigDraft;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (draft: CommandConfigDraft) => void;
};

export function CommandConfigModal({ draft, isOpen, onCancel, onSave }: CommandConfigModalProps) {
  const [actionType, setActionType] = useState<SidebarActionType>(draft.actionType);
  const [closeTerminalOnExit, setCloseTerminalOnExit] = useState(draft.closeTerminalOnExit);
  const [command, setCommand] = useState(draft.command ?? "");
  const [name, setName] = useState(draft.name);
  const [url, setUrl] = useState(draft.url ?? "");
  const checkboxId = useId();
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActionType(draft.actionType);
    setCloseTerminalOnExit(draft.closeTerminalOnExit);
    setCommand(draft.command ?? "");
    setName(draft.name);
    setUrl(draft.url ?? (draft.actionType === "browser" ? DEFAULT_BROWSER_ACTION_URL : ""));
  }, [draft, isOpen]);

  useEffect(() => {
    if (actionType !== "browser" || url.trim().length > 0) {
      return;
    }

    setUrl(DEFAULT_BROWSER_ACTION_URL);
  }, [actionType, url]);

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

  const targetValue = actionType === "browser" ? url.trim() : command.trim();
  const isSaveDisabled = name.trim().length === 0 || targetValue.length === 0;
  const description =
    actionType === "browser"
      ? "This action opens the URL in a VS Code browser tab. The tab is detected and shown in the Browsers group."
      : "This action opens a new VS Code panel terminal each time it runs.";

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
        <button
          aria-label="Close action configuration"
          className="confirm-modal-close-button"
          onClick={onCancel}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id={titleId}>
            Configure Action
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            {description}
          </div>
        </div>
        <div className="command-config-fields">
          <label className="command-config-field">
            <span className="command-config-label">Type</span>
            <select
              className="group-title-input command-config-input"
              onChange={(event) =>
                setActionType(event.currentTarget.value === "browser" ? "browser" : "terminal")
              }
              value={actionType}
            >
              <option value="terminal">Terminal</option>
              <option value="browser">Browser</option>
            </select>
          </label>
          <label className="command-config-field">
            <span className="command-config-label">Name</span>
            <input
              autoFocus
              className="group-title-input command-config-input"
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder={actionType === "browser" ? "Docs" : "Dev"}
              value={name}
            />
          </label>
          {actionType === "browser" ? (
            <label className="command-config-field">
              <span className="command-config-label">URL</span>
              <textarea
                className="group-title-input command-config-input command-config-textarea"
                onChange={(event) => setUrl(event.currentTarget.value)}
                placeholder={DEFAULT_BROWSER_ACTION_URL}
                rows={3}
                value={url}
              />
            </label>
          ) : (
            <>
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
            </>
          )}
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
                actionType,
                closeTerminalOnExit: actionType === "terminal" ? closeTerminalOnExit : false,
                command: actionType === "terminal" ? command.trim() : undefined,
                commandId: draft.commandId,
                name: name.trim(),
                url: actionType === "browser" ? url.trim() : undefined,
              })
            }
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
