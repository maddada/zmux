import { describe, expect, test, vi } from "vite-plus/test";
import {
  buildCopyResumeCommandText,
  buildDetachedResumeAction,
  buildResumeAgentCommand,
} from "./native-terminal-workspace-session-agent-launch";

vi.mock("vscode", () => ({}));

describe("buildResumeAgentCommand", () => {
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
        "/Users/madda/dev/_active/agent-tiler",
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
    ).toBe("opencode list && echo 'Enter opencode -s id' to resume a session");
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

  test("should prefill opencode resume text without executing", () => {
    expect(
      buildDetachedResumeAction(
        {
          agentId: "opencode",
          command: "opencode",
        },
        "opencode",
        "Session 08",
      ),
    ).toEqual({
      shouldExecute: false,
      text: "opencode -s ",
    });
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
