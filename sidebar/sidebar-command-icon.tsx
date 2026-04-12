import type { ComponentType } from "react";
import {
  IconBolt,
  IconBrandGithub,
  IconBug,
  IconCode,
  IconDatabase,
  IconFileText,
  IconFlask,
  IconPackage,
  IconRocket,
  IconTerminal2,
  IconTool,
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
  bolt: IconBolt,
  brandGithub: IconBrandGithub,
  bug: IconBug,
  code: IconCode,
  database: IconDatabase,
  fileText: IconFileText,
  flask: IconFlask,
  package: IconPackage,
  rocket: IconRocket,
  terminal: IconTerminal2,
  tool: IconTool,
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
