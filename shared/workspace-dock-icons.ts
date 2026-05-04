import {
  isSidebarCommandIcon,
  normalizeSidebarCommandIconColor,
  type SidebarCommandIcon,
} from "./sidebar-command-icons";
import type { SidebarTheme } from "./session-grid-contract-core";

export type WorkspaceDockIcon =
  | { kind: "image"; dataUrl: string }
  | { color?: string; icon: SidebarCommandIcon; kind: "tabler" };

export type WorkspaceProjectConfigDraft = {
  icon?: WorkspaceDockIcon;
  name: string;
  projectId: string;
  theme?: SidebarTheme;
  themeColor?: string;
};

/**
 * CDXC:WorkspaceTheme 2026-05-05-02:58
 * Workspaces can carry an optional custom theme color that tints their dock
 * button and Combined-mode project header. Keep it as a validated hex color so
 * persisted project config cannot inject arbitrary CSS values.
 */
export function normalizeWorkspaceThemeColor(value: unknown): string | undefined {
  return normalizeSidebarCommandIconColor(value);
}

export function normalizeWorkspaceDockIcon(value: unknown): WorkspaceDockIcon | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const icon = value as Partial<WorkspaceDockIcon>;
  if (icon.kind === "image") {
    const dataUrl = normalizeWorkspaceDockIconDataUrl(icon.dataUrl);
    return dataUrl ? { dataUrl, kind: "image" } : undefined;
  }
  if (icon.kind === "tabler" && isSidebarCommandIcon(icon.icon)) {
    return {
      color: normalizeSidebarCommandIconColor(icon.color),
      icon: icon.icon,
      kind: "tabler",
    };
  }
  return undefined;
}

/**
 * CDXC:WorkspaceConfig 2026-04-28-01:19
 * Workspace icons are no longer image-only. Persist a typed icon so users can
 * choose first-class Tabler glyphs while existing saved PNG/SVG data URLs keep
 * rendering through the image variant after upgrade.
 */
export function normalizeWorkspaceDockIconDataUrl(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return /^data:image\/(?:png|svg\+xml);base64,/u.test(value) ? value : undefined;
}
