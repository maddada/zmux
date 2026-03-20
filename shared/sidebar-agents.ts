export const DEFAULT_SIDEBAR_AGENTS = [
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
      name: storedAgent.name,
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
  return typeof candidate === "string" && DEFAULT_SIDEBAR_AGENTS.some((agent) => agent.icon === candidate);
}
