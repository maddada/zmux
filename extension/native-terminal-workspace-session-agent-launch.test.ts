import { describe, expect, test, vi } from "vite-plus/test";
import {
  buildCopyResumeCommandText,
  buildResumeAgentCommand,
} from "./native-terminal-workspace-session-agent-launch";

vi.mock("vscode", () => ({}));

describe("buildResumeAgentCommand", () => {
  test("should resume codex sessions when the alias is not numeric", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "Review Sidebar",
      ),
    ).toBe("codex resume 'Review Sidebar'");
  });

  test("should skip codex resume when the alias is numeric only", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "codex",
          command: "codex",
        },
        "12",
      ),
    ).toBeUndefined();
  });

  test("should keep opencode continue behavior for numeric aliases", () => {
    expect(
      buildResumeAgentCommand(
        {
          agentId: "opencode",
          command: "opencode",
        },
        "12",
      ),
    ).toBe("opencode --continue");
  });
});

describe("buildCopyResumeCommandText", () => {
  test("should skip copy resume text when the alias is numeric only", () => {
    expect(
      buildCopyResumeCommandText(
        {
          agentId: "claude",
          command: "claude",
        },
        "claude",
        "34",
      ),
    ).toBeUndefined();
  });

  test("should keep copy resume text for non-numeric aliases", () => {
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
});
