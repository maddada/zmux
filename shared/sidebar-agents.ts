export const DEFAULT_SIDEBAR_AGENTS = [
  {
    agentId: "t3",
    command: "npx t3",
    icon: "t3",
    name: "T3 Code",
  },
  {
    agentId: "codex",
    command: "codex",
    icon: "codex",
    name: "Codex",
  },
  {
    agentId: "claude",
    command: "claude",
    icon: "claude",
    name: "Claude",
  },
  {
    agentId: "opencode",
    command: "opencode",
    icon: "opencode",
    name: "OpenCode",
  },
  {
    agentId: "gemini",
    command: "gemini -y",
    icon: "gemini",
    name: "Gemini",
  },
] as const;

export type SidebarAgentIcon = (typeof DEFAULT_SIDEBAR_AGENTS)[number]["icon"];

export type SidebarAgentButton = {
  agentId: string;
  command?: string;
  icon?: SidebarAgentIcon;
  isDefault: boolean;
  name: string;
};

export type StoredSidebarAgent = {
  agentId: string;
  command: string;
  icon?: SidebarAgentIcon;
  isDefault: boolean;
  name: string;
};

export function createDefaultSidebarAgentButtons(): SidebarAgentButton[] {
  return DEFAULT_SIDEBAR_AGENTS.map((agent) => ({
    agentId: agent.agentId,
    command: agent.command,
    icon: agent.icon,
    isDefault: true,
    name: agent.name,
  }));
}

export function createSidebarAgentButtons(
  storedAgents: readonly StoredSidebarAgent[],
): SidebarAgentButton[] {
  const storedAgentById = new Map(storedAgents.map((agent) => [agent.agentId, agent]));
  const defaultButtons = DEFAULT_SIDEBAR_AGENTS.map((agent) => {
    const storedAgent = storedAgentById.get(agent.agentId);
    if (!storedAgent) {
      return {
        agentId: agent.agentId,
        command: agent.command,
        icon: agent.icon,
        isDefault: true,
        name: agent.name,
      };
    }

    return {
      agentId: storedAgent.agentId,
      command: storedAgent.command,
      icon: storedAgent.icon ?? agent.icon,
      isDefault: true,
      name: getDefaultSidebarAgentName(agent.agentId, storedAgent.name),
    };
  });

  const customButtons = storedAgents
    .filter((agent) => !isDefaultSidebarAgentId(agent.agentId))
    .map((agent) => ({
      agentId: agent.agentId,
      command: agent.command,
      icon: agent.icon,
      isDefault: false,
      name: agent.name,
    }));

  return [...defaultButtons, ...customButtons];
}

export function isDefaultSidebarAgentId(agentId: string): boolean {
  return DEFAULT_SIDEBAR_AGENTS.some((agent) => agent.agentId === agentId);
}

export function getSidebarAgentIconById(agentId: string | undefined): SidebarAgentIcon | undefined {
  const normalizedAgentId = agentId?.trim().toLowerCase();
  return DEFAULT_SIDEBAR_AGENTS.find((agent) => agent.agentId === normalizedAgentId)?.icon;
}

export function getSidebarAgentNameByIcon(icon: SidebarAgentIcon | undefined): string | undefined {
  return DEFAULT_SIDEBAR_AGENTS.find((agent) => agent.icon === icon)?.name;
}

export function normalizeStoredSidebarAgents(candidate: unknown): StoredSidebarAgent[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  const normalizedAgents: StoredSidebarAgent[] = [];
  const seenAgentIds = new Set<string>();

  for (const item of candidate) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const partialItem = item as Partial<StoredSidebarAgent>;
    const agentId = partialItem.agentId?.trim();
    const name = partialItem.name?.trim();
    const command = partialItem.command?.trim();
    const icon = isSidebarAgentIcon(partialItem.icon) ? partialItem.icon : undefined;
    const isDefault =
      partialItem.isDefault === true || (agentId ? isDefaultSidebarAgentId(agentId) : false);

    if (!agentId || !name || !command || seenAgentIds.has(agentId)) {
      continue;
    }

    normalizedAgents.push({
      agentId,
      command,
      icon,
      isDefault,
      name,
    });
    seenAgentIds.add(agentId);
  }

  return normalizedAgents;
}

function isSidebarAgentIcon(candidate: unknown): candidate is SidebarAgentIcon {
  return (
    typeof candidate === "string" &&
    DEFAULT_SIDEBAR_AGENTS.some((agent) => agent.icon === candidate)
  );
}

function getDefaultSidebarAgentName(agentId: string, storedName: string): string {
  const defaultName = DEFAULT_SIDEBAR_AGENTS.find((agent) => agent.agentId === agentId)?.name;
  if (!defaultName) {
    return storedName;
  }

  const normalizedStoredName = storedName.trim().toLowerCase();
  if (
    (agentId === "codex" && normalizedStoredName === "codex cli") ||
    (agentId === "claude" && normalizedStoredName === "claude code")
  ) {
    return defaultName;
  }

  return storedName;
}
