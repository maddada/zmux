import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import {
  DEFAULT_SIDEBAR_AGENTS,
  getDefaultSidebarAgentByIcon,
  type SidebarAgentIcon,
} from "../shared/sidebar-agents";

export type AgentConfigDraft = {
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
};

export type AgentConfigModalProps = {
  draft: AgentConfigDraft;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (draft: AgentConfigDraft) => void;
};

export function AgentConfigModal({ draft, isOpen, onCancel, onSave }: AgentConfigModalProps) {
  const [command, setCommand] = useState(draft.command);
  const [icon, setIcon] = useState<SidebarAgentIcon | "custom">(draft.icon ?? "custom");
  const [name, setName] = useState(draft.name);
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCommand(draft.command);
    setIcon(draft.icon ?? "custom");
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
        <button
          aria-label="Close agent configuration"
          className="confirm-modal-close-button"
          onClick={onCancel}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id={titleId}>
            Configure agent
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            Launches a new VSmux session and runs this agent command in it.
          </div>
        </div>
        <div className="command-config-fields">
          <label className="command-config-field">
            <span className="command-config-label">Agent Type</span>
            <select
              className="group-title-input command-config-input"
              onChange={(event) => {
                const nextType = event.currentTarget.value as SidebarAgentIcon | "custom";
                const previousDefaultAgent = getDefaultSidebarAgentByIcon(
                  icon === "custom" ? undefined : icon,
                );
                const nextDefaultAgent = getDefaultSidebarAgentByIcon(
                  nextType === "custom" ? undefined : nextType,
                );

                setIcon(nextType);
                if (!nextDefaultAgent) {
                  return;
                }

                setName((previousName) => {
                  if (
                    previousName.trim().length === 0 ||
                    previousName === previousDefaultAgent?.name
                  ) {
                    return nextDefaultAgent.name;
                  }

                  return previousName;
                });
                setCommand((previousCommand) => {
                  if (
                    previousCommand.trim().length === 0 ||
                    previousCommand === previousDefaultAgent?.command
                  ) {
                    return nextDefaultAgent.command;
                  }

                  return previousCommand;
                });
              }}
              value={icon}
            >
              <option value="custom">Custom</option>
              {DEFAULT_SIDEBAR_AGENTS.map((agent) => (
                <option key={agent.agentId} value={agent.icon}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <label className="command-config-field">
            <span className="command-config-label">Name</span>
            <input
              autoFocus
              className="group-title-input command-config-input"
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Codex"
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
                icon: icon === "custom" ? undefined : icon,
                name: name.trim(),
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
