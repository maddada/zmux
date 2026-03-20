import * as vscode from "vscode";
import {
  createSidebarAgentButtons,
  isDefaultSidebarAgentId,
  normalizeStoredSidebarAgents,
  type SidebarAgentButton,
  type StoredSidebarAgent,
} from "../shared/sidebar-agents";

const SETTINGS_SECTION = "VSmux";
const AGENTS_SETTING = "agents";

export type SaveSidebarAgentInput = {
  agentId?: string;
  command: string;
  name: string;
};

export function getSidebarAgentButtons(): SidebarAgentButton[] {
  return createSidebarAgentButtons(getStoredSidebarAgents());
}

export function getSidebarAgentButtonById(agentId: string): SidebarAgentButton | undefined {
  return getSidebarAgentButtons().find((agent) => agent.agentId === agentId);
}

export async function saveSidebarAgentPreference(input: SaveSidebarAgentInput): Promise<void> {
  const name = input.name.trim();
  const command = input.command.trim();
  if (!name || !command) {
    return;
  }

  const storedAgents = getStoredSidebarAgents();
  const agentId = input.agentId?.trim() || createCustomAgentId(name);
  const existingIndex = storedAgents.findIndex((agent) => agent.agentId === agentId);
  const previousAgent = existingIndex >= 0 ? storedAgents[existingIndex] : undefined;
  const nextAgent: StoredSidebarAgent = {
    agentId,
    command,
    icon: previousAgent?.icon,
    isDefault: isDefaultSidebarAgentId(agentId),
    name,
  };
  const nextAgents =
    existingIndex >= 0
      ? storedAgents.map((agent, index) => (index === existingIndex ? nextAgent : agent))
      : [...storedAgents, nextAgent];

  await updateStoredSidebarAgents(nextAgents);
}

export async function deleteSidebarAgentPreference(agentId: string): Promise<void> {
  const nextAgents = getStoredSidebarAgents().filter((agent) => agent.agentId !== agentId);
  await updateStoredSidebarAgents(nextAgents);
}

function getStoredSidebarAgents(): StoredSidebarAgent[] {
  return normalizeStoredSidebarAgents(
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<unknown>(AGENTS_SETTING, []),
  );
}

async function updateStoredSidebarAgents(agents: StoredSidebarAgent[]): Promise<void> {
  await vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .update(AGENTS_SETTING, agents, vscode.ConfigurationTarget.Global);
}

function createCustomAgentId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return `custom-${slug || "agent"}-${Date.now().toString(36)}`;
}
