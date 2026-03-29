import type { SidebarAgentButton } from "./sidebar-agents";

export const DEFAULT_GIT_TEXT_GENERATION_AGENT_ID = "codex";

const DEFAULT_GIT_TEXT_GENERATION_FALLBACK_AGENT_IDS = [
  DEFAULT_GIT_TEXT_GENERATION_AGENT_ID,
  "claude",
] as const;

export function resolveGitTextGenerationAgent(
  agents: readonly SidebarAgentButton[],
  requestedAgentId?: string,
): SidebarAgentButton | undefined {
  const requestedId = requestedAgentId?.trim();
  const candidateIds = [
    requestedId,
    ...DEFAULT_GIT_TEXT_GENERATION_FALLBACK_AGENT_IDS,
  ].filter(isNonEmptyString);
  const uniqueCandidateIds = [...new Set(candidateIds)];

  for (const agentId of uniqueCandidateIds) {
    const agent = agents.find((candidate) => candidate.agentId === agentId);
    if (hasCommand(agent)) {
      return agent;
    }
  }

  return agents.find(hasCommand);
}

function hasCommand(agent: SidebarAgentButton | undefined): agent is SidebarAgentButton {
  return Boolean(agent?.command?.trim());
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value?.trim());
}
