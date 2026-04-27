import { describe, expect, test } from "vite-plus/test";
import {
  explainFirstPromptAutoRenameDecision,
  isGenericAgentSessionTitle,
  resolveFirstPromptAutoRenameStrategy,
  shouldAutoNameSessionFromFirstPrompt,
} from "./first-prompt-session-title";

describe("isGenericAgentSessionTitle", () => {
  test("recognizes generic Codex titles", () => {
    expect(isGenericAgentSessionTitle("codex", "⠸ OpenAI Codex")).toBe(true);
    expect(isGenericAgentSessionTitle("codex", "Codex")).toBe(true);
  });

  test("recognizes generic Claude titles", () => {
    expect(isGenericAgentSessionTitle("claude", "Claude")).toBe(true);
    expect(isGenericAgentSessionTitle("claude", "Claude Code")).toBe(true);
  });

  test("keeps meaningful Codex titles", () => {
    expect(isGenericAgentSessionTitle("codex", "Fix sidebar title sync")).toBe(false);
  });
});

describe("shouldAutoNameSessionFromFirstPrompt", () => {
  test("auto names Codex sessions with generic titles", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "codex",
        currentTitle: "Codex",
        prompt: "How does terminal title syncing work here?",
      }),
    ).toBe(true);
  });

  test("auto names Claude sessions with generic titles", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "claude",
        currentTitle: "Claude Code",
        prompt: "How does terminal title syncing work here?",
      }),
    ).toBe(true);
  });

  test("skips sessions that already auto named from a first prompt", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "codex",
        currentTitle: "Codex",
        hasAutoTitleFromFirstPrompt: true,
        pendingFirstPromptAutoRenamePrompt: undefined,
        prompt: "How does terminal title syncing work here?",
      }),
    ).toBe(false);
  });

  test("skips sessions that already have a queued first prompt rename request", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "codex",
        currentTitle: "Codex",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: "Rename the controller session",
        prompt: "How does terminal title syncing work here?",
      }),
    ).toBe(false);
  });

  test("skips sessions that already have a meaningful title", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "codex",
        currentTitle: "Review terminal title sync",
        pendingFirstPromptAutoRenamePrompt: undefined,
        prompt: "How does terminal title syncing work here?",
      }),
    ).toBe(false);
  });

  test("skips slash commands and meta prompts", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "codex",
        currentTitle: "Codex",
        pendingFirstPromptAutoRenamePrompt: undefined,
        prompt: "/rename Better title",
      }),
    ).toBe(false);

    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "codex",
        currentTitle: "Codex",
        pendingFirstPromptAutoRenamePrompt: undefined,
        prompt: "# AGENTS.md instructions for /Users/example/project\n\n<INSTRUCTIONS>",
      }),
    ).toBe(false);
  });

  test("skips prompts that include inline slash command examples", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "codex",
        currentTitle: "Codex",
        pendingFirstPromptAutoRenamePrompt: undefined,
        prompt:
          "add 1 more toggle here [Image #1] that makes it open as /rename Memory Consolidation Agent",
      }),
    ).toBe(false);
  });

  test("skips agents outside the supported first prompt auto rename flow", () => {
    expect(
      shouldAutoNameSessionFromFirstPrompt({
        agentName: "gemini",
        currentTitle: "Gemini",
        prompt: "How does terminal title syncing work here?",
      }),
    ).toBe(false);
  });
});

describe("resolveFirstPromptAutoRenameStrategy", () => {
  test("uses a bare Claude rename command instead of generating a title locally", () => {
    expect(resolveFirstPromptAutoRenameStrategy("claude")).toBe("sendBareRenameCommand");
  });

  test("keeps generated-title auto rename for Codex", () => {
    expect(resolveFirstPromptAutoRenameStrategy("codex")).toBe("generateTitleAndRename");
  });

  test("skips unsupported agents", () => {
    expect(resolveFirstPromptAutoRenameStrategy("gemini")).toBeUndefined();
  });
});

describe("explainFirstPromptAutoRenameDecision", () => {
  test("explains when Claude is skipped because the current title is already non-generic", () => {
    expect(
      explainFirstPromptAutoRenameDecision({
        agentName: "claude",
        currentTitle: "Review terminal title syncing",
        prompt: "How does terminal title syncing work here?",
      }),
    ).toEqual({
      normalizedPrompt: "terminal title syncing work here",
      reason: "nonGenericCurrentTitle",
      shouldAutoName: false,
      strategy: "sendBareRenameCommand",
    });
  });

  test("explains when Claude is eligible from the first prompt hook", () => {
    expect(
      explainFirstPromptAutoRenameDecision({
        agentName: "claude",
        currentTitle: "Claude Code",
        prompt: "How does terminal title syncing work here?",
      }),
    ).toEqual({
      normalizedPrompt: "terminal title syncing work here",
      reason: "eligible",
      shouldAutoName: true,
      strategy: "sendBareRenameCommand",
    });
  });
});
