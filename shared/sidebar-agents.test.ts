import { describe, expect, test } from "vite-plus/test";
import { createSidebarAgentButtons, normalizeStoredSidebarAgents } from "./sidebar-agents";

describe("createSidebarAgentButtons", () => {
  test("should expose the built-in agents by default", () => {
    expect(createSidebarAgentButtons([])).toEqual([
      {
        agentId: "t3",
        command: "npx t3",
        icon: "t3",
        isDefault: true,
        name: "T3 Code",
      },
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
      {
        agentId: "opencode",
        command: "opencode",
        icon: "opencode",
        isDefault: true,
        name: "OpenCode",
      },
      {
        agentId: "gemini",
        command: "gemini -y",
        icon: "gemini",
        isDefault: true,
        name: "Gemini",
      },
    ]);
  });

  test("should merge overrides, rename legacy built-in labels, and append custom agents", () => {
    expect(
      createSidebarAgentButtons([
        {
          agentId: "codex",
          command: "codex --model gpt-5.4",
          icon: "codex",
          isDefault: true,
          name: "Codex CLI",
        },
        {
          agentId: "cursor",
          command: "cursor-agent",
          isDefault: false,
          name: "Cursor",
        },
      ]),
    ).toEqual([
      {
        agentId: "t3",
        command: "npx t3",
        icon: "t3",
        isDefault: true,
        name: "T3 Code",
      },
      {
        agentId: "codex",
        command: "codex --model gpt-5.4",
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
      {
        agentId: "opencode",
        command: "opencode",
        icon: "opencode",
        isDefault: true,
        name: "OpenCode",
      },
      {
        agentId: "gemini",
        command: "gemini -y",
        icon: "gemini",
        isDefault: true,
        name: "Gemini",
      },
      {
        agentId: "cursor",
        command: "cursor-agent",
        icon: undefined,
        isDefault: false,
        name: "Cursor",
      },
    ]);
  });
});

describe("normalizeStoredSidebarAgents", () => {
  test("should trim valid entries and ignore invalid ones", () => {
    expect(
      normalizeStoredSidebarAgents([
        {
          agentId: " codex ",
          command: " codex ",
          icon: "codex",
          isDefault: true,
          name: " Codex ",
        },
        {
          agentId: "broken",
          command: "",
          isDefault: false,
          name: "Broken",
        },
      ]),
    ).toEqual([
      {
        agentId: "codex",
        command: "codex",
        icon: "codex",
        isDefault: true,
        name: "Codex",
      },
    ]);
  });
});
