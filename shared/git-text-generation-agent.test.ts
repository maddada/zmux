import { describe, expect, test } from "vite-plus/test";
import { resolveGitTextGenerationAgent } from "./git-text-generation-agent";
import type { SidebarAgentButton } from "./sidebar-agents";

const DEFAULT_AGENTS: readonly SidebarAgentButton[] = [
  {
    agentId: "codex",
    command: "codex",
    icon: "codex",
    isDefault: true,
    name: "Codex",
  },
  {
    agentId: "claude",
    command: "claude",
    icon: "claude",
    isDefault: true,
    name: "Claude",
  },
];

describe("resolveGitTextGenerationAgent", () => {
  test("should default to codex", () => {
    expect(resolveGitTextGenerationAgent(DEFAULT_AGENTS)).toEqual(DEFAULT_AGENTS[0]);
  });

  test("should honor a configured custom agent", () => {
    const customAgent: SidebarAgentButton = {
      agentId: "custom-fast",
      command: "codex --profile fast",
      icon: "codex",
      isDefault: false,
      name: "Codex Fast",
    };

    expect(resolveGitTextGenerationAgent([...DEFAULT_AGENTS, customAgent], "custom-fast")).toEqual(
      customAgent,
    );
  });

  test("should fall back to codex when the configured agent is missing", () => {
    expect(resolveGitTextGenerationAgent(DEFAULT_AGENTS, "missing-agent")).toEqual(
      DEFAULT_AGENTS[0],
    );
  });

  test("should fall back to claude when codex is unavailable", () => {
    expect(resolveGitTextGenerationAgent([DEFAULT_AGENTS[1]], "missing-agent")).toEqual(
      DEFAULT_AGENTS[1],
    );
  });

  test("should fall back to the first available agent with a command", () => {
    const customAgent: SidebarAgentButton = {
      agentId: "cursor",
      command: "cursor-agent",
      isDefault: false,
      name: "Cursor",
    };

    expect(resolveGitTextGenerationAgent([customAgent], "missing-agent")).toEqual(customAgent);
  });

  test("should skip agents that do not have a runnable command", () => {
    const unusableCodex: SidebarAgentButton = {
      agentId: "codex",
      command: "   ",
      icon: "codex",
      isDefault: true,
      name: "Codex",
    };

    expect(resolveGitTextGenerationAgent([unusableCodex, DEFAULT_AGENTS[1]])).toEqual(
      DEFAULT_AGENTS[1],
    );
  });
});
