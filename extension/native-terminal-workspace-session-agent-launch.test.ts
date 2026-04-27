import { describe, expect, test, vi } from "vite-plus/test";
import {
  buildCopyResumeCommandText,
  buildManualResumePrefillAction,
  buildDetachedResumeAction,
  buildForkAgentCommand,
  buildProgrammaticResumeAction,
  buildResumeAgentCommand,
  OPENCODE_SESSION_LOOKUP_RUNNER_PATH,
} from "./native-terminal-workspace-session-agent-launch";

const configurationValues = new Map<string, unknown>();

function quoteShellLiteral(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function buildExpectedOpenCodeResumeCommand(command: string, title: string): string {
  return `${command} -s "$(${command} session list --format json | ${quoteShellLiteral(process.execPath)} ${quoteShellLiteral(OPENCODE_SESSION_LOOKUP_RUNNER_PATH)} ${quoteShellLiteral(title)})"`;
}

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string, defaultValue?: unknown) =>
        configurationValues.has(key) ? configurationValues.get(key) : defaultValue,
    }),
  },
}));

describe("buildResumeAgentCommand", () => {
  test("should use the configured default built-in command when a legacy stored command still uses the stock default", () => {
    configurationValues.set("defaultAgentCommands", {
      claude: "cw",
      codex: "x",
    });

    expect(
      buildResumeAgentCommand(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "Fix sidebar card title",
      ),
    ).toBe("cw -r 'Fix sidebar card title'");

    configurationValues.clear();
  });

  test("should build a codex resume command for a numeric/default session", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Session 12",
      ),
    ).toBe("codex resume");
  });

  test("should build a titled claude resume command", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "Design pass",
      ),
    ).toBe("claude -r 'Design pass'");
  });

  test("should escape apostrophes in titled resume commands", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Bob's bug",
      ),
    ).toBe("codex resume 'Bob'\"'\"'s bug'");
  });

  test("should prefer the terminal title over the user session title", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Pinned session",
        "Bug Fix",
      ),
    ).toBe("codex resume 'Bug Fix'");
  });

  test("should strip indicators and trim when building a resume command from the terminal title", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Pinned session",
        "  ✦ Bug Fix  ",
      ),
    ).toBe("codex resume 'Bug Fix'");
  });

  test("should strip indicators from a legacy saved session title when building a resume command", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "✳ Fix sidebar card title",
      ),
    ).toBe("claude -r 'Fix sidebar card title'");
  });

  test("should build an opencode resume command for titled sessions", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "opencode",
          command: "oc",
        },
        "opencode",
        "Design pass",
      ),
    ).toBe(buildExpectedOpenCodeResumeCommand("oc", "Design pass"));
  });

  test("should return undefined for opencode resume commands without a visible title", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "opencode",
          command: "oc",
        },
        "opencode",
        "Session 12",
      ),
    ).toBeUndefined();
  });
});

describe("buildForkAgentCommand", () => {
  test("should use the configured default built-in command when a legacy stored command still uses the stock default", () => {
    configurationValues.set("defaultAgentCommands", {
      claude: "cw",
      codex: "x",
    });

    expect(
      buildForkAgentCommand(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "Fix sidebar card title",
      ),
    ).toBe("cw --fork-session -r 'Fix sidebar card title'");

    configurationValues.clear();
  });

  test("should build a codex fork command from the visible title", () => {
    expect(
      buildForkAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Session 12",
        "Bug Fix",
      ),
    ).toBe("codex fork 'Bug Fix'");
  });

  test("should strip indicators and trim when building a fork command from the terminal title", () => {
    expect(
      buildForkAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Session 12",
        "  🤖 Bug Fix  ",
      ),
    ).toBe("codex fork 'Bug Fix'");
  });

  test("should strip indicators from a legacy saved session title when building a fork command", () => {
    expect(
      buildForkAgentCommand(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "🤖 Fix sidebar card title",
      ),
    ).toBe("claude --fork-session -r 'Fix sidebar card title'");
  });

  test("should build a claude fork command for titled sessions", () => {
    expect(
      buildForkAgentCommand(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "Design pass",
      ),
    ).toBe("claude --fork-session -r 'Design pass'");
  });

  test("should preserve custom command prefixes for fork", () => {
    expect(
      buildForkAgentCommand(
        {
          agentId: "codex",
          command: "x --profile fast",
        },
        "codex",
        "Pinned session",
        "Terminal bugfix",
      ),
    ).toBe("x --profile fast fork 'Terminal bugfix'");
  });

  test("should return undefined when no visible title is available", () => {
    expect(
      buildForkAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Session 34",
        "/workspace/demo-project",
      ),
    ).toBeUndefined();
  });
});

describe("buildProgrammaticResumeAction", () => {
  test("should build a single-step codex resume action", () => {
    expect(
      buildProgrammaticResumeAction(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Bug Fixing",
      ),
    ).toEqual({
      steps: [{ data: "codex resume 'Bug Fixing'", shouldExecute: true }],
    });
  });

  test("should build a command-based opencode resume action", () => {
    expect(
      buildProgrammaticResumeAction(
        {
          agentId: "opencode",
          command: "oc",
        },
        "opencode",
        "Session 08",
        "Project overview question",
      ),
    ).toEqual({
      steps: [
        {
          data: buildExpectedOpenCodeResumeCommand("oc", "Project overview question"),
          shouldExecute: true,
        },
      ],
    });
  });

  test("should return undefined for opencode programmatic resume without a visible title", () => {
    expect(
      buildProgrammaticResumeAction(
        {
          agentId: "opencode",
          command: "oc",
        },
        "opencode",
        "Session 08",
      ),
    ).toBeUndefined();
  });
});

describe("buildCopyResumeCommandText", () => {
  test("should copy codex resume text for numeric/default sessions", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Session 34",
      ),
    ).toBe("codex resume");
  });

  test("should copy claude resume text for titled sessions", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "Design pass",
      ),
    ).toBe("claude -r 'Design pass'");
  });

  test("should preserve custom command prefixes for codex copy text", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "codex",
          command: "x --profile fast",
        },
        "codex",
        "Bug Fixing",
      ),
    ).toBe("x --profile fast resume 'Bug Fixing'");
  });

  test("should use the terminal title for resume copy text when the session title is default", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "codex",
          command: "x",
        },
        "codex",
        "Session 34",
        "Terminal bugfix",
      ),
    ).toBe("x resume 'Terminal bugfix'");
  });

  test("should fall back to the user session title when the terminal title is not resumable", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Bug Fixing",
        "/workspace/demo-project",
      ),
    ).toBe("codex resume 'Bug Fixing'");
  });

  test("should copy gemini guidance text", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "gemini",
          command: "gemini -y",
        },
        "gemini",
        "Session 04",
      ),
    ).toBe("gemini -y --list-sessions && echo 'Enter gemini -y -r id' to resume a session");
  });

  test("should copy copilot guidance text", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "copilot",
          command: "copilot",
        },
        "copilot",
        "Session 06",
      ),
    ).toBe(
      "copilot --continue && echo 'Or use copilot --resume to pick a session, or copilot --resume SESSION-ID if you know it'",
    );
  });

  test("should copy opencode guidance text", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "opencode",
          command: "opencode",
        },
        "opencode",
        "Session 05",
      ),
    ).toBe("opencode session list && echo 'Enter opencode -s id' to resume a session");
  });

  test("should copy opencode auto-resume text for titled sessions", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "opencode",
          command: "opencode",
        },
        "opencode",
        "Design pass",
      ),
    ).toBe(buildExpectedOpenCodeResumeCommand("opencode", "Design pass"));
  });

  test("should use the terminal title for opencode auto-resume text when available", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "opencode",
          command: "oc",
        },
        "opencode",
        "Session 05",
        "Terminal bugfix",
      ),
    ).toBe(buildExpectedOpenCodeResumeCommand("oc", "Terminal bugfix"));
  });

  test("should fall back to the stored launch command for custom agents", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "agent-cli",
          command: "agent --workspace /tmp/demo",
        },
        undefined,
        "Session 05",
      ),
    ).toBe("agent --workspace /tmp/demo");
  });
});

describe("buildDetachedResumeAction", () => {
  test("should execute codex resume for numeric/default sessions", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "codex",
          command: "codex",
        },
        "codex",
        "Session 01",
      ),
    ).toEqual({
      shouldExecute: true,
      text: "codex resume",
    });
  });

  test("should execute claude resume for titled sessions", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "Bug Fixing",
      ),
    ).toEqual({
      shouldExecute: true,
      text: "claude -r 'Bug Fixing'",
    });
  });

  test("should execute detached resume using the terminal title when available", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "codex",
          command: "x",
        },
        "codex",
        "Pinned session",
        "Terminal bugfix",
      ),
    ).toEqual({
      shouldExecute: true,
      text: "x resume 'Terminal bugfix'",
    });
  });

  test("should fall back to the default codex command when only the sidebar icon is known", () => {
    expect(
      buildDetachedResumeAction(undefined, "codex", "Session 814", "Auto fix corruption"),
    ).toEqual({
      shouldExecute: true,
      text: "codex resume 'Auto fix corruption'",
    });
  });

  test("should prefill gemini resume text without executing", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "gemini",
          command: "gemini -y",
        },
        "gemini",
        "Session 07",
      ),
    ).toEqual({
      shouldExecute: false,
      text: "gemini -y -r ",
    });
  });

  test("should prefill copilot resume text without executing", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "copilot",
          command: "copilot",
        },
        "copilot",
        "Session 09",
      ),
    ).toEqual({
      shouldExecute: false,
      text: "copilot --resume ",
    });
  });

  test("should execute opencode resume automatically when a visible title is available", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "opencode",
          command: "oc",
        },
        "opencode",
        "Session 08",
        "Terminal bugfix",
      ),
    ).toEqual({
      shouldExecute: true,
      text: buildExpectedOpenCodeResumeCommand("oc", "Terminal bugfix"),
    });
  });

  test("should return undefined for opencode detached resume without a visible title", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "opencode",
          command: "oc",
        },
        "opencode",
        "Session 08",
      ),
    ).toBeUndefined();
  });

  test("should prefill raw custom agent commands without executing", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "custom-codex-fast",
          command: "codex --profile fast",
        },
        "codex",
        "Bug Fixing",
      ),
    ).toEqual({
      shouldExecute: false,
      text: "codex --profile fast",
    });
  });
});

describe("buildManualResumePrefillAction", () => {
  test("should prefill a quoted visible title without executing", () => {
    expect(buildManualResumePrefillAction("Bug Fixing")).toEqual({
      shouldExecute: false,
      text: "'Bug Fixing'\u0001",
    });
  });

  test("should prefer the visible terminal title for manual restore prefills", () => {
    expect(buildManualResumePrefillAction("Session 12", "  ✦ Recent sessions polish  ")).toEqual({
      shouldExecute: false,
      text: "'Recent sessions polish'\u0001",
    });
  });

  test("should return undefined when no visible restore title is available", () => {
    expect(
      buildManualResumePrefillAction("Session 12", "/workspace/demo-project"),
    ).toBeUndefined();
  });
});
