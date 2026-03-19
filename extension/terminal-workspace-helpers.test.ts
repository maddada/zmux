import { describe, expect, test, vi } from "vite-plus/test";
import { createSessionRecord } from "../shared/session-grid-contract";
import {
  extractLatestTerminalTitleFromVtHistory,
  getSessionTabTitle,
  hasCodexWorkingStatusInVtHistory,
  parsePersistedSessionState,
  serializePersistedSessionState,
} from "./terminal-workspace-helpers";
import {
  getTitleDerivedSessionActivity,
  getTitleDerivedSessionActivityFromTransition,
} from "./session-title-activity";

vi.mock("vscode", () => ({
  ThemeIcon: class ThemeIcon {},
  ViewColumn: {
    One: 1,
    Nine: 9,
  },
  commands: {
    executeCommand: vi.fn(),
  },
  workspace: {},
}));

describe("getSessionTabTitle", () => {
  test("should use the generated alias instead of Session N placeholders", () => {
    const session = createSessionRecord(1, 0);
    expect(getSessionTabTitle(session)).toBe(session.alias);
  });

  test("should use the renamed alias when the user changes it", () => {
    expect(
      getSessionTabTitle({
        ...createSessionRecord(2, 1),
        alias: "API",
      }),
    ).toBe("API");
  });
});

describe("getTitleDerivedSessionActivity", () => {
  test("should mark an unstarred Claude Code title as working", () => {
    expect(getTitleDerivedSessionActivity("Claude Code")).toEqual({
      activity: "working",
      agentName: "claude",
    });
  });

  test("should keep a starred Claude Code title idle before any work starts", () => {
    expect(getTitleDerivedSessionActivity("✳ Claude Code")).toEqual({
      activity: "idle",
      agentName: "claude",
    });
  });

  test("should preserve acknowledged attention while the title remains starred", () => {
    expect(
      getTitleDerivedSessionActivity("✳ Claude Code", {
        activity: "attention",
        agentName: "claude",
      }),
    ).toEqual({
      activity: "attention",
      agentName: "claude",
    });
  });

  test("should treat any Claude Code title without the idle marker as working", () => {
    expect(getTitleDerivedSessionActivity("· Claude Code")).toEqual({
      activity: "working",
      agentName: "claude",
    });
  });
});

describe("getTitleDerivedSessionActivityFromTransition", () => {
  test("should switch Claude Code into working when the starred marker disappears", () => {
    expect(getTitleDerivedSessionActivityFromTransition("✳ Claude Code", "Claude Code")).toEqual({
      activity: "working",
      agentName: "claude",
    });
  });

  test("should switch Claude Code into attention when the starred marker returns after work", () => {
    expect(
      getTitleDerivedSessionActivityFromTransition("Claude Code", "✳ Claude Code", {
        activity: "working",
        agentName: "claude",
      }),
    ).toEqual({
      activity: "attention",
      agentName: "claude",
    });
  });

  test("should switch Claude Code into attention when the starred marker returns after a dot-prefixed working title", () => {
    expect(
      getTitleDerivedSessionActivityFromTransition("· Claude Code", "✳ Claude Code", {
        activity: "working",
        agentName: "claude",
      }),
    ).toEqual({
      activity: "attention",
      agentName: "claude",
    });
  });

  test("should ignore non-Claude titles", () => {
    expect(getTitleDerivedSessionActivityFromTransition("bash", "npm test")).toBeUndefined();
  });
});

describe("persisted session state", () => {
  test("should parse terminal titles from the persisted session state file", () => {
    expect(parsePersistedSessionState("status=working\nagent=codex\ntitle=codex --yolo\n")).toEqual(
      {
        agentName: "codex",
        agentStatus: "working",
        title: "codex --yolo",
      },
    );
  });

  test("should normalize whitespace when serializing the persisted session state file", () => {
    expect(
      serializePersistedSessionState({
        agentName: "codex",
        agentStatus: "attention",
        title: "  npm\n  test  ",
      }),
    ).toBe("status=attention\nagent=codex\ntitle=npm test\n");
  });
});

describe("extractLatestTerminalTitleFromVtHistory", () => {
  test("should return the latest OSC title from VT history", () => {
    expect(
      extractLatestTerminalTitleFromVtHistory(
        `hello\u001b]0;First Title\u0007world\u001b]2;My Test Title\u0007`,
      ),
    ).toBe("My Test Title");
  });

  test("should ignore non-title OSC sequences", () => {
    expect(
      extractLatestTerminalTitleFromVtHistory(
        `\u001b]8;;https://example.com\u0007link\u001b]8;;\u0007`,
      ),
    ).toBeUndefined();
  });
});

describe("hasCodexWorkingStatusInVtHistory", () => {
  test("should detect Codex working status lines in VT history", () => {
    expect(
      hasCodexWorkingStatusInVtHistory(
        `\u001b[38;2;211;218;224m•\u001b[0m Crafting a 50-line poem \u001b[2m(6s • esc to interrupt)\u001b[0m`,
        "OpenAI Codex",
      ),
    ).toBe(true);
  });

  test("should detect generic Codex interrupt status lines for codex agents", () => {
    expect(
      hasCodexWorkingStatusInVtHistory(
        `\u001b[38;2;211;218;224m•\u001b[0m Working \u001b[2m(3s • esc to interrupt)\u001b[0m`,
        undefined,
        "codex",
      ),
    ).toBe(true);
  });

  test("should ignore interrupt status lines for non-codex sessions", () => {
    expect(
      hasCodexWorkingStatusInVtHistory(
        `\u001b[38;2;211;218;224m•\u001b[0m Working \u001b[2m(3s • esc to interrupt)\u001b[0m`,
        "Claude Code",
      ),
    ).toBe(false);
  });
});
