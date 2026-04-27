export const SIDEBAR_COMMAND_ICON_IDS = [
  "api",
  "bolt",
  "book",
  "brain",
  "brandGithub",
  "brandVscode",
  "bug",
  "cloud",
  "checklist",
  "code",
  "database",
  "deviceDesktop",
  "download",
  "fileText",
  "flask",
  "folder",
  "gitBranch",
  "gitCommit",
  "gitMerge",
  "gitPullRequest",
  "package",
  "pencilCode",
  "playerPlay",
  "refresh",
  "rocket",
  "search",
  "settings",
  "shieldSearch",
  "sparkles",
  "terminal",
  "testPipe",
  "tool",
  "upload",
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
    case "api":
      return "API";
    case "bolt":
      return "Bolt";
    case "book":
      return "Book";
    case "brain":
      return "Brain";
    case "brandGithub":
      return "GitHub";
    case "brandVscode":
      return "VS Code";
    case "bug":
      return "Bug";
    case "cloud":
      return "Cloud";
    case "checklist":
      return "Checklist";
    case "code":
      return "Code";
    case "database":
      return "Database";
    case "deviceDesktop":
      return "Desktop";
    case "download":
      return "Download";
    case "fileText":
      return "Docs";
    case "flask":
      return "Experiment";
    case "folder":
      return "Folder";
    case "gitBranch":
      return "Branch";
    case "gitCommit":
      return "Commit";
    case "gitMerge":
      return "Merge";
    case "gitPullRequest":
      return "Pull Request";
    case "package":
      return "Package";
    case "pencilCode":
      return "Edit";
    case "playerPlay":
      return "Play";
    case "refresh":
      return "Refresh";
    case "rocket":
      return "Launch";
    case "search":
      return "Search";
    case "settings":
      return "Settings";
    case "shieldSearch":
      return "Security";
    case "sparkles":
      return "Sparkles";
    case "terminal":
      return "Terminal";
    case "testPipe":
      return "Test";
    case "tool":
      return "Tools";
    case "upload":
      return "Upload";
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
