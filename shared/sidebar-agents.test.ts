import { describe, expect, test } from "vite-plus/test";
import {
  createSidebarAgentButtons,
  normalizeStoredSidebarAgents,
} from "./sidebar-agents";

describe("createSidebarAgentButtons", () => {
  test("should expose the built-in agents by default", () => {
    expect(createSidebarAgentButtons([])).toEqual([
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
    ]);
  });

  test("should merge overrides and append custom agents", () => {
    expect(
      createSidebarAgentButtons([
        {
          agentId: "codex",
          command: "codex --model gpt-5.4",
          icon: "codex",
          isDefault: true,
          name: "Codex Fast",
        },
        {
          agentId: "gemini",
          command: "gemini",
          isDefault: false,
          name: "Gemini",
        },
      ]),
    ).toEqual([
      {
        agentId: "codex",
        command: "codex --model gpt-5.4",
        icon: "codex",
        isDefault: true,
        name: "Codex Fast",
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
        command: "gemini",
        icon: undefined,
        isDefault: false,
        name: "Gemini",
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
