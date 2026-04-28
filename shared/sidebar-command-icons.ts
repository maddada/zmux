/**
 * CDXC:CommandIcons 2026-04-28-05:23: Command and workspace icon pickers use
 * this explicit Tabler allowlist so users get app-relevant action, agent,
 * project, code, git, and runtime glyphs without exposing the full icon pack.
 */
export const SIDEBAR_COMMAND_ICON_IDS = [
  "api",
  "archive",
  "bell",
  "bolt",
  "book",
  "brain",
  "braces",
  "brandDocker",
  "brandGithub",
  "brandPython",
  "brandReact",
  "brandVscode",
  "bug",
  "chartBar",
  "cloud",
  "checklist",
  "clock",
  "code",
  "command",
  "cpu",
  "database",
  "deviceDesktop",
  "deviceLaptop",
  "download",
  "fileCode",
  "fileDiff",
  "fileSearch",
  "fileText",
  "flask",
  "folder",
  "folderOpen",
  "gitBranch",
  "gitCommit",
  "gitMerge",
  "gitPullRequest",
  "key",
  "layoutDashboard",
  "link",
  "lock",
  "messageCircle",
  "package",
  "pencilCode",
  "playerPlay",
  "refresh",
  "robot",
  "route",
  "rocket",
  "search",
  "server",
  "settings",
  "shieldSearch",
  "sparkles",
  "stack",
  "terminal",
  "testPipe",
  "tool",
  "upload",
  "wand",
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
    case "archive":
      return "Archive";
    case "bell":
      return "Notification";
    case "bolt":
      return "Bolt";
    case "book":
      return "Book";
    case "brain":
      return "Brain";
    case "braces":
      return "Braces";
    case "brandDocker":
      return "Docker";
    case "brandGithub":
      return "GitHub";
    case "brandPython":
      return "Python";
    case "brandReact":
      return "React";
    case "brandVscode":
      return "VS Code";
    case "bug":
      return "Bug";
    case "chartBar":
      return "Metrics";
    case "cloud":
      return "Cloud";
    case "checklist":
      return "Checklist";
    case "clock":
      return "Timer";
    case "code":
      return "Code";
    case "command":
      return "Command";
    case "cpu":
      return "Compute";
    case "database":
      return "Database";
    case "deviceDesktop":
      return "Desktop";
    case "deviceLaptop":
      return "Laptop";
    case "download":
      return "Download";
    case "fileCode":
      return "Code File";
    case "fileDiff":
      return "Diff";
    case "fileSearch":
      return "Search File";
    case "fileText":
      return "Docs";
    case "flask":
      return "Experiment";
    case "folder":
      return "Folder";
    case "folderOpen":
      return "Open Folder";
    case "gitBranch":
      return "Branch";
    case "gitCommit":
      return "Commit";
    case "gitMerge":
      return "Merge";
    case "gitPullRequest":
      return "Pull Request";
    case "key":
      return "Key";
    case "layoutDashboard":
      return "Dashboard";
    case "link":
      return "Link";
    case "lock":
      return "Lock";
    case "messageCircle":
      return "Chat";
    case "package":
      return "Package";
    case "pencilCode":
      return "Edit";
    case "playerPlay":
      return "Play";
    case "refresh":
      return "Refresh";
    case "robot":
      return "Agent";
    case "route":
      return "Route";
    case "rocket":
      return "Launch";
    case "search":
      return "Search";
    case "server":
      return "Server";
    case "settings":
      return "Settings";
    case "shieldSearch":
      return "Security";
    case "sparkles":
      return "Sparkles";
    case "stack":
      return "Stack";
    case "terminal":
      return "Terminal";
    case "testPipe":
      return "Test";
    case "tool":
      return "Tools";
    case "upload":
      return "Upload";
    case "wand":
      return "Generate";
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
