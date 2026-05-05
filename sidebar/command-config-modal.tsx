import { IconTrash, IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import { DEFAULT_BROWSER_ACTION_URL, type SidebarActionType } from "../shared/sidebar-commands";
import {
  DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  type SidebarCommandIcon,
} from "../shared/sidebar-command-icons";
import { CommandIconPicker } from "./command-icon-picker";

export type CommandConfigDraft = {
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  command?: string;
  commandId?: string;
  icon?: SidebarCommandIcon;
  iconColor?: string;
  isGlobal?: boolean;
  name: string;
  playCompletionSound: boolean;
  url?: string;
};

export type CommandConfigModalProps = {
  draft: CommandConfigDraft;
  isOpen: boolean;
  lockedActionType?: SidebarActionType;
  onCancel: () => void;
  /**
   * CDXC:SidebarActions 2026-05-06-04:36
   * Configure Actions opens this editor directly from a readable action row.
   * Existing actions must expose deletion inside the editor so users can remove
   * an action without relying on the old modal-embedded context menu.
   */
  onDelete?: (draft: CommandConfigDraft) => void;
  onSave: (draft: CommandConfigDraft) => void;
};

export function CommandConfigModal({
  draft,
  isOpen,
  lockedActionType,
  onCancel,
  onDelete,
  onSave,
}: CommandConfigModalProps) {
  const [actionType, setActionType] = useState<SidebarActionType>(draft.actionType);
  const [closeTerminalOnExit, setCloseTerminalOnExit] = useState(draft.closeTerminalOnExit);
  const [command, setCommand] = useState(draft.command ?? "");
  const [icon, setIcon] = useState<SidebarCommandIcon | undefined>(draft.icon);
  const [iconColor, setIconColor] = useState(draft.iconColor ?? DEFAULT_SIDEBAR_COMMAND_ICON_COLOR);
  const [isGlobal, setIsGlobal] = useState(draft.isGlobal === true);
  const [name, setName] = useState(draft.name);
  const [playCompletionSound, setPlayCompletionSound] = useState(draft.playCompletionSound);
  const [url, setUrl] = useState(draft.url ?? "");
  const checkboxId = useId();
  const globalCheckboxId = useId();
  const soundCheckboxId = useId();
  const descriptionId = useId();
  const titleId = useId();
  const isActionTypeLocked = lockedActionType !== undefined;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActionType(lockedActionType ?? draft.actionType);
    setCloseTerminalOnExit(draft.closeTerminalOnExit);
    setCommand(draft.command ?? "");
    setIcon(draft.icon);
    setIconColor(draft.iconColor ?? DEFAULT_SIDEBAR_COMMAND_ICON_COLOR);
    setIsGlobal(draft.isGlobal === true);
    setName(draft.name);
    setPlayCompletionSound(draft.playCompletionSound);
    setUrl(
      draft.url ??
        ((lockedActionType ?? draft.actionType) === "browser" ? DEFAULT_BROWSER_ACTION_URL : ""),
    );
  }, [draft, isOpen, lockedActionType]);

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
  const trimmedName = name.trim();
  const isSaveDisabled =
    targetValue.length === 0 || (trimmedName.length === 0 && icon === undefined);
  const description =
    actionType === "browser"
      ? "This action opens the URL in a VS Code browser tab. The tab is detected and shown in the Browsers group."
      : "This action opens a new VS Code panel terminal each time it runs.";

  return createPortal(
    <div className="confirm-modal-root scroll-mask-y" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onCancel} type="button" />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-modal command-config-modal scroll-mask-y"
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
          {isActionTypeLocked ? null : (
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
          )}
          <label className="command-config-field">
            <span className="command-config-label">Text</span>
            <input
              autoFocus
              className="group-title-input command-config-input"
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder={actionType === "browser" ? "Docs" : "Dev"}
              value={name}
            />
          </label>
          <CommandIconPicker
            icon={icon}
            iconColor={iconColor}
            onIconChange={setIcon}
            onIconColorChange={setIconColor}
          />
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
              <label className="command-config-toggle" htmlFor={soundCheckboxId}>
                <input
                  checked={playCompletionSound}
                  className="command-config-checkbox"
                  id={soundCheckboxId}
                  onChange={(event) => setPlayCompletionSound(event.currentTarget.checked)}
                  type="checkbox"
                />
                <span className="command-config-toggle-copy">
                  Play the configured action completion sound when the command finishes
                </span>
              </label>
            </>
          )}
          <label className="command-config-toggle" htmlFor={globalCheckboxId}>
            <input
              checked={isGlobal}
              className="command-config-checkbox"
              id={globalCheckboxId}
              onChange={(event) => setIsGlobal(event.currentTarget.checked)}
              type="checkbox"
            />
            <span className="command-config-toggle-copy">
              Show this action in every zmux project
            </span>
          </label>
        </div>
        <div className="confirm-modal-actions command-config-actions">
          {onDelete && draft.commandId ? (
            <button
              className="secondary confirm-modal-button command-config-delete-button"
              onClick={() =>
                onDelete({
                  actionType,
                  closeTerminalOnExit: actionType === "terminal" ? closeTerminalOnExit : false,
                  command: actionType === "terminal" ? command.trim() : undefined,
                  commandId: draft.commandId,
                  icon,
                  iconColor: icon ? iconColor : undefined,
                  isGlobal,
                  name: trimmedName,
                  playCompletionSound: actionType === "terminal" ? playCompletionSound : false,
                  url: actionType === "browser" ? url.trim() : undefined,
                })
              }
              type="button"
            >
              <IconTrash aria-hidden="true" size={15} stroke={1.8} />
              Delete
            </button>
          ) : null}
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
                icon,
                iconColor: icon ? iconColor : undefined,
                isGlobal,
                name: trimmedName,
                playCompletionSound: actionType === "terminal" ? playCompletionSound : false,
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
