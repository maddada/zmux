import type { ComponentType } from "react";
import {
  IconApi,
  IconBolt,
  IconBoltFilled,
  IconBook,
  IconBookFilled,
  IconBrain,
  IconBrandGithub,
  IconBrandGithubFilled,
  IconBrandVscode,
  IconBug,
  IconBugFilled,
  IconChecklist,
  IconCloud,
  IconCloudFilled,
  IconCode,
  IconDatabase,
  IconDatabaseFilled,
  IconDeviceDesktop,
  IconDeviceDesktopFilled,
  IconDownload,
  IconDownloadFilled,
  IconFileText,
  IconFileTextFilled,
  IconFlask,
  IconFlaskFilled,
  IconFolder,
  IconFolderFilled,
  IconGitBranch,
  IconGitCommit,
  IconGitMerge,
  IconGitPullRequest,
  IconPackage,
  IconPencilCode,
  IconPlayerPlay,
  IconPlayerPlayFilled,
  IconRefresh,
  IconRocket,
  IconSearch,
  IconSearchFilled,
  IconSettings,
  IconSettingsFilled,
  IconShieldSearch,
  IconSparkles,
  IconSparklesFilled,
  IconTerminal2,
  IconTestPipe,
  IconTool,
  IconUpload,
  IconWorld,
} from "@tabler/icons-react";
import {
  getSidebarCommandIconLabel,
  SIDEBAR_COMMAND_ICON_IDS,
  type SidebarCommandIcon,
} from "../shared/sidebar-command-icons";

type TablerIconProps = {
  className?: string;
  color?: string;
  size?: number;
  stroke?: number;
};

const ICON_COMPONENT_BY_ID: Record<SidebarCommandIcon, ComponentType<TablerIconProps>> = {
  api: IconApi,
  bolt: IconBoltFilled,
  book: IconBookFilled,
  brain: IconBrain,
  brandGithub: IconBrandGithubFilled,
  brandVscode: IconBrandVscode,
  bug: IconBugFilled,
  checklist: IconChecklist,
  cloud: IconCloudFilled,
  code: IconCode,
  database: IconDatabaseFilled,
  deviceDesktop: IconDeviceDesktopFilled,
  download: IconDownloadFilled,
  fileText: IconFileTextFilled,
  flask: IconFlaskFilled,
  folder: IconFolderFilled,
  gitBranch: IconGitBranch,
  gitCommit: IconGitCommit,
  gitMerge: IconGitMerge,
  gitPullRequest: IconGitPullRequest,
  package: IconPackage,
  pencilCode: IconPencilCode,
  playerPlay: IconPlayerPlayFilled,
  refresh: IconRefresh,
  rocket: IconRocket,
  search: IconSearchFilled,
  settings: IconSettingsFilled,
  shieldSearch: IconShieldSearch,
  sparkles: IconSparklesFilled,
  terminal: IconTerminal2,
  testPipe: IconTestPipe,
  tool: IconTool,
  upload: IconUpload,
  world: IconWorld,
};

export const SIDEBAR_COMMAND_ICON_OPTIONS = SIDEBAR_COMMAND_ICON_IDS.map((icon) => ({
  icon,
  label: getSidebarCommandIconLabel(icon),
}));

export type SidebarCommandIconGlyphProps = {
  className?: string;
  color?: string;
  icon: SidebarCommandIcon;
  size?: number;
  stroke?: number;
};

export function SidebarCommandIconGlyph({
  className,
  color,
  icon,
  size = 15,
  stroke = 1.8,
}: SidebarCommandIconGlyphProps) {
  const Icon = ICON_COMPONENT_BY_ID[icon];
  return (
    <Icon aria-hidden="true" className={className} color={color} size={size} stroke={stroke} />
  );
}
