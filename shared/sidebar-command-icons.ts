export const SIDEBAR_COMMAND_ICON_IDS = [
  "bolt",
  "brandGithub",
  "bug",
  "code",
  "database",
  "fileText",
  "flask",
  "package",
  "rocket",
  "terminal",
  "tool",
  "world",
] as const;

export type SidebarCommandIcon = (typeof SIDEBAR_COMMAND_ICON_IDS)[number];

export const DEFAULT_SIDEBAR_COMMAND_ICON_COLOR = "#d6e0f3";

export function isSidebarCommandIcon(value: unknown): value is SidebarCommandIcon {
  return (
    typeof value === "string" && (SIDEBAR_COMMAND_ICON_IDS as readonly string[]).includes(value)
  );
}

export function getSidebarCommandIconLabel(icon: SidebarCommandIcon): string {
  switch (icon) {
    case "bolt":
      return "Bolt";
    case "brandGithub":
      return "GitHub";
    case "bug":
      return "Bug";
    case "code":
      return "Code";
    case "database":
      return "Database";
    case "fileText":
      return "Docs";
    case "flask":
      return "Experiment";
    case "package":
      return "Package";
    case "rocket":
      return "Launch";
    case "terminal":
      return "Terminal";
    case "tool":
      return "Tools";
    case "world":
      return "Browser";
  }
}

export function normalizeSidebarCommandIconColor(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return /^#[\da-fA-F]{6}$/.test(trimmedValue) ? trimmedValue.toLowerCase() : undefined;
}
