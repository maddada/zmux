import * as vscode from "vscode";
import {
  DEFAULT_GIT_TEXT_GENERATION_AGENT_ID,
  resolveGitTextGenerationAgent,
} from "../shared/git-text-generation-agent";
import type { SidebarAgentButton } from "../shared/sidebar-agents";
import { getSidebarAgentButtons } from "./sidebar-agent-preferences";
import { GIT_TEXT_GENERATION_AGENT_ID_SETTING, SETTINGS_SECTION } from "./native-terminal-workspace/settings";

export function getConfiguredGitTextGenerationAgentId(): string {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(
        GIT_TEXT_GENERATION_AGENT_ID_SETTING,
        DEFAULT_GIT_TEXT_GENERATION_AGENT_ID,
      ) ?? DEFAULT_GIT_TEXT_GENERATION_AGENT_ID;

  return value.trim() || DEFAULT_GIT_TEXT_GENERATION_AGENT_ID;
}

export function getGitTextGenerationAgent(
  agents: readonly SidebarAgentButton[] = getSidebarAgentButtons(),
): SidebarAgentButton | undefined {
  return resolveGitTextGenerationAgent(agents, getConfiguredGitTextGenerationAgentId());
}
