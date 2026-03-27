import * as vscode from "vscode";
import {
  createSidebarAgentButtons,
  getDefaultSidebarAgentByIcon,
  getDefaultSidebarAgentById,
  isDefaultSidebarAgentId,
  normalizeStoredSidebarAgentOrder,
  normalizeStoredSidebarAgents,
  type SidebarAgentIcon,
  type SidebarAgentButton,
  type StoredSidebarAgent,
} from "../shared/sidebar-agents";

const SETTINGS_SECTION = "VSmux";
const AGENTS_SETTING = "agents";
const AGENT_ORDER_SETTING = "agentOrder";

export type SaveSidebarAgentInput = {
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
};

export function getSidebarAgentButtons(): SidebarAgentButton[] {
  return createSidebarAgentButtons(getStoredSidebarAgents(), getStoredSidebarAgentOrder());
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

  const currentAgentIds = getSidebarAgentButtons().map((candidate) => candidate.agentId);
  const storedAgents = getStoredSidebarAgents();
  const storedOrder = getStoredSidebarAgentOrder();
  const requestedAgentId = input.agentId?.trim();
  const selectedDefaultAgent = getDefaultSidebarAgentByIcon(input.icon);
  const shouldRestoreHiddenDefault =
    !requestedAgentId &&
    Boolean(
      selectedDefaultAgent &&
        !isSidebarAgentVisible(storedAgents, selectedDefaultAgent.agentId),
    );
  const agentId =
    requestedAgentId ||
    (shouldRestoreHiddenDefault ? selectedDefaultAgent?.agentId : undefined) ||
    createCustomAgentId(name);
  const existingIndex = storedAgents.findIndex((agent) => agent.agentId === agentId);
  const previousAgent = existingIndex >= 0 ? storedAgents[existingIndex] : undefined;
  const defaultAgent = getDefaultSidebarAgentById(agentId);
  const nextAgent: StoredSidebarAgent = {
    agentId,
    command,
    hidden: false,
    icon: input.icon ?? previousAgent?.icon ?? defaultAgent?.icon,
    isDefault: isDefaultSidebarAgentId(agentId),
    name,
  };
  const nextAgents =
    existingIndex >= 0
      ? storedAgents.map((agent, index) => (index === existingIndex ? nextAgent : agent))
      : [...storedAgents, nextAgent];
  const nextOrder =
    existingIndex >= 0 || storedOrder.includes(agentId) || isDefaultSidebarAgentId(agentId)
      ? storedOrder
      : [...currentAgentIds, agentId];

  await updateStoredSidebarAgents(nextAgents);
  if (nextOrder !== storedOrder) {
    await updateStoredSidebarAgentOrder(nextOrder);
  }
}

export async function deleteSidebarAgentPreference(agentId: string): Promise<void> {
  const storedAgents = getStoredSidebarAgents();
  const storedOrder = getStoredSidebarAgentOrder();
  if (!isDefaultSidebarAgentId(agentId)) {
    const nextAgents = storedAgents.filter((agent) => agent.agentId !== agentId);
    await updateStoredSidebarAgents(nextAgents);
    await updateStoredSidebarAgentOrder(
      storedOrder.filter((candidateAgentId) => candidateAgentId !== agentId),
    );
    return;
  }

  const defaultAgent = getDefaultSidebarAgentById(agentId);
  if (!defaultAgent) {
    return;
  }

  const existingIndex = storedAgents.findIndex((agent) => agent.agentId === agentId);
  const nextAgent: StoredSidebarAgent = {
    agentId: defaultAgent.agentId,
    command: storedAgents[existingIndex]?.command ?? defaultAgent.command,
    hidden: true,
    icon: storedAgents[existingIndex]?.icon ?? defaultAgent.icon,
    isDefault: true,
    name: storedAgents[existingIndex]?.name ?? defaultAgent.name,
  };
  const nextAgents =
    existingIndex >= 0
      ? storedAgents.map((agent, index) => (index === existingIndex ? nextAgent : agent))
      : [...storedAgents, nextAgent];
  await updateStoredSidebarAgents(nextAgents);
  await updateStoredSidebarAgentOrder(
    storedOrder.filter((candidateAgentId) => candidateAgentId !== agentId),
  );
}

export async function syncSidebarAgentOrderPreference(agentIds: readonly string[]): Promise<void> {
  const currentAgentIds = getSidebarAgentButtons().map((agent) => agent.agentId);
  const normalizedAgentIds = normalizeStoredSidebarAgentOrder(agentIds).filter((agentId) =>
    currentAgentIds.includes(agentId),
  );
  const nextOrder = [
    ...normalizedAgentIds,
    ...currentAgentIds.filter((agentId) => !normalizedAgentIds.includes(agentId)),
  ];

  await updateStoredSidebarAgentOrder(nextOrder);
}

function getStoredSidebarAgents(): StoredSidebarAgent[] {
  return normalizeStoredSidebarAgents(
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<unknown>(AGENTS_SETTING, []),
  );
}

function getStoredSidebarAgentOrder(): string[] {
  return normalizeStoredSidebarAgentOrder(
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<unknown>(AGENT_ORDER_SETTING, []),
  );
}

async function updateStoredSidebarAgents(agents: StoredSidebarAgent[]): Promise<void> {
  await vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .update(AGENTS_SETTING, agents, vscode.ConfigurationTarget.Global);
}

async function updateStoredSidebarAgentOrder(agentIds: readonly string[]): Promise<void> {
  await vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .update(AGENT_ORDER_SETTING, agentIds, vscode.ConfigurationTarget.Global);
}

function isSidebarAgentVisible(storedAgents: readonly StoredSidebarAgent[], agentId: string): boolean {
  const storedAgent = storedAgents.find((agent) => agent.agentId === agentId);
  return storedAgent?.hidden !== true;
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
