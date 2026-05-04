import { IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import {
  DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  normalizeSidebarCommandIconColor,
  type SidebarCommandIcon,
} from "../shared/sidebar-command-icons";
import type { SidebarTheme } from "../shared/session-grid-contract";
import {
  normalizeWorkspaceDockIconDataUrl,
  normalizeWorkspaceThemeColor,
  type WorkspaceDockIcon,
  type WorkspaceProjectConfigDraft,
} from "../shared/workspace-dock-icons";
import { CommandIconPicker } from "./command-icon-picker";

const DEFAULT_WORKSPACE_THEME_COLOR = "#2f6feb";

export type WorkspaceConfigModalProps = {
  draft: WorkspaceProjectConfigDraft;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (draft: WorkspaceProjectConfigDraft) => void;
  themeOptions: readonly { label: string; value: SidebarTheme }[];
};

export function WorkspaceConfigModal({
  draft,
  isOpen,
  onCancel,
  onSave,
  themeOptions,
}: WorkspaceConfigModalProps) {
  const [imageDataUrl, setImageDataUrl] = useState(
    draft.icon?.kind === "image" ? draft.icon.dataUrl : undefined,
  );
  const [icon, setIcon] = useState<SidebarCommandIcon | undefined>(
    draft.icon?.kind === "tabler" ? draft.icon.icon : undefined,
  );
  const [iconColor, setIconColor] = useState(
    draft.icon?.kind === "tabler"
      ? (draft.icon.color ?? DEFAULT_SIDEBAR_COMMAND_ICON_COLOR)
      : DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  );
  const [name, setName] = useState(draft.name);
  const [theme, setTheme] = useState(draft.theme ?? themeOptions[0]?.value ?? "dark-blue");
  const [themeColor, setThemeColor] = useState(
    draft.themeColor ?? DEFAULT_WORKSPACE_THEME_COLOR,
  );
  const [usesCustomThemeColor, setUsesCustomThemeColor] = useState(Boolean(draft.themeColor));
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setImageDataUrl(draft.icon?.kind === "image" ? draft.icon.dataUrl : undefined);
    setIcon(draft.icon?.kind === "tabler" ? draft.icon.icon : undefined);
    setIconColor(
      draft.icon?.kind === "tabler"
        ? (draft.icon.color ?? DEFAULT_SIDEBAR_COMMAND_ICON_COLOR)
        : DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
    );
    setName(draft.name);
    setTheme(draft.theme ?? themeOptions[0]?.value ?? "dark-blue");
    setThemeColor(draft.themeColor ?? DEFAULT_WORKSPACE_THEME_COLOR);
    setUsesCustomThemeColor(Boolean(draft.themeColor));
  }, [draft, isOpen, themeOptions]);

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

  const trimmedName = name.trim();
  const draftIcon: WorkspaceDockIcon | undefined = imageDataUrl
    ? { dataUrl: imageDataUrl, kind: "image" }
    : icon
      ? {
          color: normalizeSidebarCommandIconColor(iconColor) ?? DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
          icon,
          kind: "tabler",
        }
      : undefined;

  /**
   * CDXC:WorkspaceConfig 2026-04-28-01:19
   * Reuse the Configure Action modal shell and Tabler command icon picker so
   * workspace configuration appears in the same centered overlay, with image
   * upload remaining secondary to the first-class Tabler glyph workflow.
   */
  return createPortal(
    <div className="confirm-modal-root scroll-mask-y" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onCancel} type="button" />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-modal command-config-modal workspace-config-modal scroll-mask-y"
        role="dialog"
      >
        <button
          aria-label="Close workspace configuration"
          className="confirm-modal-close-button"
          onClick={onCancel}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id={titleId}>
            Configure Workspace
          </div>
          <div className="confirm-modal-description" id={descriptionId}>
            Set the workspace name, icon, and dock theme.
          </div>
        </div>
        <div className="command-config-fields">
          <label className="command-config-field">
            <span className="command-config-label">Name</span>
            <input
              autoFocus
              className="group-title-input command-config-input"
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Workspace"
              value={name}
            />
          </label>
          <CommandIconPicker
            icon={imageDataUrl ? undefined : icon}
            iconColor={iconColor}
            onIconChange={(nextIcon) => {
              setImageDataUrl(undefined);
              setIcon(nextIcon);
            }}
            onIconColorChange={setIconColor}
          />
          <div className="command-config-field workspace-config-image-field">
            <span className="command-config-label">Image</span>
            <div className="workspace-config-image-row">
              {imageDataUrl ? (
                <img alt="" className="workspace-config-image-preview" src={imageDataUrl} />
              ) : (
                <span className="workspace-config-image-placeholder">SVG/PNG</span>
              )}
              <label className="secondary confirm-modal-button workspace-config-image-button">
                Choose Image
                <input
                  accept="image/png,image/svg+xml"
                  className="workspace-config-file-input"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) {
                      return;
                    }
                    const reader = new FileReader();
                    reader.addEventListener("load", () => {
                      if (typeof reader.result === "string") {
                        setIcon(undefined);
                        setImageDataUrl(normalizeWorkspaceDockIconDataUrl(reader.result));
                      }
                    });
                    reader.readAsDataURL(file);
                  }}
                  type="file"
                />
              </label>
              <button
                aria-label="Restore defaults"
                className="secondary confirm-modal-button workspace-config-restore-button"
                onClick={() => {
                  setIcon(undefined);
                  setImageDataUrl(undefined);
                }}
                title="Restore defaults"
                type="button"
              >
                <IconX aria-hidden="true" size={15} stroke={2} />
              </button>
            </div>
          </div>
          <label className="command-config-field">
            <span className="command-config-label">Theme</span>
            <select
              className="group-title-input command-config-input"
              onChange={(event) => setTheme(event.currentTarget.value as SidebarTheme)}
              value={theme}
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="command-config-field workspace-theme-color-field">
            <span className="command-config-label">Theme Color</span>
            {/*
             * CDXC:WorkspaceTheme 2026-05-05-02:58
             * Custom theme color is opt-in so existing preset themes stay the
             * default. When enabled, the validated hex color tints both the
             * workspace dock button and Combined-mode project group header.
             */}
            <label className="command-config-toggle workspace-theme-color-toggle">
              <input
                checked={usesCustomThemeColor}
                className="command-config-checkbox"
                onChange={(event) => setUsesCustomThemeColor(event.currentTarget.checked)}
                type="checkbox"
              />
              <span className="command-config-toggle-copy">Use custom theme color</span>
            </label>
            <div className="command-icon-color-row workspace-theme-color-row">
              <input
                aria-label="Workspace theme color"
                className="command-icon-color-swatch"
                disabled={!usesCustomThemeColor}
                onChange={(event) => {
                  setThemeColor(
                    normalizeWorkspaceThemeColor(event.currentTarget.value) ??
                      DEFAULT_WORKSPACE_THEME_COLOR,
                  );
                }}
                type="color"
                value={themeColor}
              />
              <input
                aria-label="Workspace theme color hex value"
                className="group-title-input command-config-input command-icon-color-text"
                disabled={!usesCustomThemeColor}
                onChange={(event) => {
                  const nextColor = normalizeWorkspaceThemeColor(event.currentTarget.value);
                  if (nextColor) {
                    setThemeColor(nextColor);
                  }
                }}
                value={themeColor}
              />
            </div>
          </div>
        </div>
        <div className="confirm-modal-actions">
          <button className="secondary confirm-modal-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="primary confirm-modal-button"
            disabled={trimmedName.length === 0}
            onClick={() =>
              onSave({
                icon: draftIcon,
                name: trimmedName,
                projectId: draft.projectId,
                theme,
                themeColor: usesCustomThemeColor
                  ? (normalizeWorkspaceThemeColor(themeColor) ?? DEFAULT_WORKSPACE_THEME_COLOR)
                  : undefined,
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
