import {
  isSidebarCommandIcon,
  normalizeSidebarCommandIconColor,
  type SidebarCommandIcon,
} from "./sidebar-command-icons";

export type WorkspaceDockIcon =
  | { kind: "image"; dataUrl: string }
  | { color?: string; icon: SidebarCommandIcon; kind: "tabler" };

export const DEFAULT_WORKSPACE_THEME_COLOR = "#2f6feb";
export const WORKSPACE_THEME_COLOR_HISTORY_STORAGE_KEY = "zmux-workspace-theme-color-history";
const MAX_WORKSPACE_THEME_COLOR_HISTORY = 8;

/**
 * CDXC:WorkspaceTheme 2026-05-05-02:58
 * Workspaces can carry an optional custom theme color selected from the Theme
 * context menu. Keep persisted values and the recent-color palette as validated
 * hex colors so the UI can inject them into CSS variables without accepting
 * arbitrary CSS text.
 */
export function normalizeWorkspaceThemeColor(value: unknown): string | undefined {
  return normalizeSidebarCommandIconColor(value);
}

export function getWorkspaceThemeForeground(themeColor: string): "#111111" | "#ffffff" {
  const normalizedColor = normalizeWorkspaceThemeColor(themeColor);
  if (!normalizedColor) {
    return "#ffffff";
  }

  const hex = normalizedColor.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 154 ? "#111111" : "#ffffff";
}

export function normalizeWorkspaceThemeColorHistory(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const colors: string[] = [];
  for (const candidate of value) {
    const color = normalizeWorkspaceThemeColor(candidate);
    if (color && !colors.includes(color)) {
      colors.push(color);
    }
  }

  return colors.slice(0, MAX_WORKSPACE_THEME_COLOR_HISTORY);
}

export function updateWorkspaceThemeColorHistory(
  history: readonly string[],
  value: unknown,
): string[] {
  const color = normalizeWorkspaceThemeColor(value);
  if (!color) {
    return normalizeWorkspaceThemeColorHistory([...history]);
  }

  return normalizeWorkspaceThemeColorHistory([
    color,
    ...history.filter((candidate) => normalizeWorkspaceThemeColor(candidate) !== color),
  ]);
}

export function readWorkspaceThemeColorHistory(): string[] {
  try {
    return normalizeWorkspaceThemeColorHistory(
      JSON.parse(localStorage.getItem(WORKSPACE_THEME_COLOR_HISTORY_STORAGE_KEY) ?? "[]"),
    );
  } catch {
    return [];
  }
}

export function writeWorkspaceThemeColorHistory(history: readonly string[]): void {
  try {
    localStorage.setItem(
      WORKSPACE_THEME_COLOR_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizeWorkspaceThemeColorHistory([...history])),
    );
  } catch {
    // Ignore storage failures; the chosen project theme color still persists on the project.
  }
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
