import { describe, expect, test } from "vite-plus/test";
import {
  createSidebarAgentButtons,
  normalizeStoredSidebarAgentOrder,
  normalizeStoredSidebarAgents,
  shouldPreferTerminalTitleForAgentIcon,
} from "./sidebar-agents";

describe("createSidebarAgentButtons", () => {
  test("should expose the built-in agents by default", () => {
    expect(createSidebarAgentButtons([])).toEqual([
      {
        agentId: "t3",
        command: "npx --yes t3",
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
        agentId: "copilot",
        command: "copilot",
        icon: "copilot",
        isDefault: true,
        name: "Copilot",
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

  test("should apply default command overrides to built-in agents when no stored override exists", () => {
    expect(createSidebarAgentButtons([], [], { claude: "cw", codex: "x" })).toEqual([
      {
        agentId: "t3",
        command: "npx --yes t3",
        icon: "t3",
        isDefault: true,
        name: "T3 Code",
      },
      {
        agentId: "codex",
        command: "x",
        icon: "codex",
        isDefault: true,
        name: "Codex",
      },
      {
        agentId: "copilot",
        command: "copilot",
        icon: "copilot",
        isDefault: true,
        name: "Copilot",
      },
      {
        agentId: "claude",
        command: "cw",
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
        command: "npx --yes t3",
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
        agentId: "copilot",
        command: "copilot",
        icon: "copilot",
        isDefault: true,
        name: "Copilot",
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

  test("should hide default agents that are marked hidden", () => {
    expect(
      createSidebarAgentButtons([
        {
          agentId: "codex",
          command: "codex",
          hidden: true,
          icon: "codex",
          isDefault: true,
          name: "Codex",
        },
      ]),
    ).toEqual([
      {
        agentId: "t3",
        command: "npx --yes t3",
        icon: "t3",
        isDefault: true,
        name: "T3 Code",
      },
      {
        agentId: "copilot",
        command: "copilot",
        icon: "copilot",
        isDefault: true,
        name: "Copilot",
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

  test("should keep custom duplicates of default agent types", () => {
    expect(
      createSidebarAgentButtons([
        {
          agentId: "custom-codex-fast",
          command: "codex --profile fast",
          icon: "codex",
          isDefault: false,
          name: "Codex Fast",
        },
      ]),
    ).toEqual([
      {
        agentId: "t3",
        command: "npx --yes t3",
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
        agentId: "copilot",
        command: "copilot",
        icon: "copilot",
        isDefault: true,
        name: "Copilot",
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
        agentId: "custom-codex-fast",
        command: "codex --profile fast",
        icon: "codex",
        isDefault: false,
        name: "Codex Fast",
      },
    ]);
  });

  test("should respect stored agent ordering across defaults and custom entries", () => {
    expect(
      createSidebarAgentButtons(
        [
          {
            agentId: "custom-codex-fast",
            command: "codex --profile fast",
            icon: "codex",
            isDefault: false,
            name: "Codex Fast",
          },
        ],
        ["gemini", "custom-codex-fast", "claude"],
      ),
    ).toEqual([
      {
        agentId: "gemini",
        command: "gemini -y",
        icon: "gemini",
        isDefault: true,
        name: "Gemini",
      },
      {
        agentId: "custom-codex-fast",
        command: "codex --profile fast",
        icon: "codex",
        isDefault: false,
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
        agentId: "t3",
        command: "npx --yes t3",
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
        agentId: "copilot",
        command: "copilot",
        icon: "copilot",
        isDefault: true,
        name: "Copilot",
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
});

describe("shouldPreferTerminalTitleForAgentIcon", () => {
  test("should prefer terminal titles for OpenCode", () => {
    expect(shouldPreferTerminalTitleForAgentIcon("opencode")).toBe(true);
  });
});

describe("normalizeStoredSidebarAgents", () => {
  test("should trim valid entries and ignore invalid ones", () => {
    expect(
      normalizeStoredSidebarAgents([
        {
          agentId: " codex ",
          command: " codex ",
          hidden: true,
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
        hidden: true,
        icon: "codex",
        isDefault: true,
        name: "Codex",
      },
    ]);
  });
});

describe("normalizeStoredSidebarAgentOrder", () => {
  test("should trim, dedupe, and ignore invalid order entries", () => {
    expect(
      normalizeStoredSidebarAgentOrder([" codex ", "gemini", "codex", 123, "", " gemini "]),
    ).toEqual(["codex", "gemini"]);
  });
});
