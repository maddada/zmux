import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import {
  SLOW_SPINNER_ACTIVITY_WINDOW_MS,
  acknowledgeTitleDerivedSessionActivity,
  getInterestingTitleSymbols,
  getTitleDerivedSessionActivity,
  getTitleDerivedSessionActivityFromTransition,
} from "./session-title-activity";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getTitleDerivedSessionActivity", () => {
  test("should extract interesting title symbols for debug logging", () => {
    expect(getInterestingTitleSymbols("⠸ Review repository...")).toEqual(["⠸"]);
    expect(getInterestingTitleSymbols("✳ Claude Code")).toEqual(["✳"]);
    expect(getInterestingTitleSymbols("* Claude Code")).toEqual(["*"]);
    expect(getInterestingTitleSymbols("plain words 123")).toEqual([]);
  });

  test("should detect Codex spinner titles as working", () => {
    const firstActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠸ OpenAI Codex");
    expect(getTitleDerivedSessionActivity("⠸ OpenAI Codex", firstActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const secondActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠴ Codex CLI");
    expect(getTitleDerivedSessionActivity("⠴ Codex CLI", secondActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const thirdActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠼ Codex");
    expect(getTitleDerivedSessionActivity("⠼ Codex", thirdActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const fourthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠧ Codex");
    expect(getTitleDerivedSessionActivity("⠧ Codex", fourthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const fifthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠦ Codex");
    expect(getTitleDerivedSessionActivity("⠦ Codex", fifthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const sixthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠏ Codex");
    expect(getTitleDerivedSessionActivity("⠏ Codex", sixthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const seventhActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠋ Codex");
    expect(getTitleDerivedSessionActivity("⠋ Codex", seventhActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const eighthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠇ Codex");
    expect(getTitleDerivedSessionActivity("⠇ Codex", eighthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const ninthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠙ Codex");
    expect(getTitleDerivedSessionActivity("⠙ Codex", ninthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
    const tenthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠹ Codex");
    expect(getTitleDerivedSessionActivity("⠹ Codex", tenthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
  });

  test("should treat a static Codex spinner without a seen title change as idle", () => {
    expect(getTitleDerivedSessionActivity("⠹ Codex")).toEqual({
      activity: "idle",
      agentName: "codex",
      hasSeenWorking: false,
      isAcknowledged: false,
      lastTitleChangeAt: undefined,
    });
  });

  test("should treat Codex titles without a spinner as idle", () => {
    expect(getTitleDerivedSessionActivity("OpenAI Codex")).toEqual({
      activity: "idle",
      agentName: "codex",
      hasSeenWorking: false,
      isAcknowledged: false,
      lastTitleChangeAt: undefined,
    });
  });

  test("should detect Codex spinner titles from the known session agent even when the title omits codex", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "⠸ Review repository...",
      undefined,
      "codex",
    );

    expect(
      getTitleDerivedSessionActivity("⠸ Review repository...", derivedActivity, "codex"),
    ).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
  });

  test("should detect Codex spinner titles without a known agent when the title shows a Codex glyph", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "⠸ Review repository...",
    );

    expect(getTitleDerivedSessionActivity("⠸ Review repository...", derivedActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
  });

  test("should treat a frozen Codex spinner as attention after the activity window", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠏ OpenAI Codex");
    vi.advanceTimersByTime(SLOW_SPINNER_ACTIVITY_WINDOW_MS + 1);

    expect(getTitleDerivedSessionActivity("⠏ OpenAI Codex", derivedActivity)).toEqual({
      activity: "attention",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: derivedActivity?.lastTitleChangeAt,
    });
  });

  test("should treat Claude working titles as working when they changed recently", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "· Claude Code · API Usage",
    );

    expect(
      getTitleDerivedSessionActivity("·· Claude Code · API Usage ·", derivedActivity),
    ).toEqual({
      activity: "working",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: derivedActivity?.lastTitleChangeAt,
    });
  });

  test("should treat a frozen Claude working title as attention after the activity window", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "· Claude Code · API Usage",
    );
    vi.advanceTimersByTime(SLOW_SPINNER_ACTIVITY_WINDOW_MS + 1);

    expect(getTitleDerivedSessionActivity("· Claude Code · API Usage", derivedActivity)).toEqual({
      activity: "attention",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: derivedActivity?.lastTitleChangeAt,
    });
  });

  test("should treat Claude idle glyphs anywhere in the title as attention after work has started", () => {
    expect(
      getTitleDerivedSessionActivity("API Usage ✳ Claude Code / project-x", {
        activity: "working",
        agentName: "claude",
        hasSeenWorking: true,
        isAcknowledged: false,
      }),
    ).toEqual({
      activity: "attention",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: undefined,
    });
  });

  test("should detect Claude glyph titles from the known session agent even when the title omits Claude Code", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "⠐ Determine project purpose and scope",
      undefined,
      "claude",
    );

    expect(
      getTitleDerivedSessionActivity(
        "⠐ Determine project purpose and scope",
        derivedActivity,
        "claude",
      ),
    ).toEqual({
      activity: "working",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });

    const secondDerivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "⠂ Review repository...",
      undefined,
      "claude",
    );

    expect(
      getTitleDerivedSessionActivity("⠂ Review repository...", secondDerivedActivity, "claude"),
    ).toEqual({
      activity: "working",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
  });

  test("should detect Claude glyph titles without a known agent when the title shows a Claude glyph", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "⠐ Determine project purpose and scope",
    );

    expect(getTitleDerivedSessionActivity("⠐ Determine project purpose and scope", derivedActivity)).toEqual({
      activity: "working",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });
  });

  test("should treat a static Claude spinner without a seen title change as idle", () => {
    expect(getTitleDerivedSessionActivity("⠐ Determine project purpose and scope", undefined, "claude")).toEqual({
      activity: "idle",
      agentName: "claude",
      hasSeenWorking: false,
      isAcknowledged: false,
      lastTitleChangeAt: undefined,
    });
  });

  test("should detect Gemini working and ready titles", () => {
    const workingActivity = getTitleDerivedSessionActivityFromTransition(undefined, "✦ agent-tiler");
    expect(getTitleDerivedSessionActivity("✦ agent-tiler", workingActivity)).toEqual({
      activity: "working",
      agentName: "gemini",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });

    expect(
      getTitleDerivedSessionActivity("◇ agent-tiler", {
        activity: "working",
        agentName: "gemini",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "attention",
      agentName: "gemini",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });

  test("should allow a static Gemini working glyph to count as working", () => {
    expect(getTitleDerivedSessionActivity("✦ agent-tiler")).toEqual({
      activity: "working",
      agentName: "gemini",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });

  test("should detect GitHub Copilot working and attention titles", () => {
    const workingActivity = getTitleDerivedSessionActivityFromTransition(undefined, "🤖");
    expect(getTitleDerivedSessionActivity("🤖", workingActivity)).toEqual({
      activity: "working",
      agentName: "copilot",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: Date.now(),
    });

    expect(
      getTitleDerivedSessionActivity("🔔", {
        activity: "working",
        agentName: "copilot",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "attention",
      agentName: "copilot",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });

  test("should allow a static Copilot working glyph to count as working", () => {
    expect(getTitleDerivedSessionActivity("🤖")).toEqual({
      activity: "working",
      agentName: "copilot",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });
});

describe("getTitleDerivedSessionActivityFromTransition", () => {
  test("should mark Codex as attention when the spinner disappears after work", () => {
    const lastTitleChangeAt = Date.now();
    expect(
      getTitleDerivedSessionActivityFromTransition("⠸ OpenAI Codex", "OpenAI Codex", {
        activity: "working",
        agentName: "codex",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt,
      }),
    ).toEqual({
      activity: "attention",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt,
    });
  });

  test("should mark Claude as attention when the working glyphs stop updating", () => {
    expect(
      getTitleDerivedSessionActivityFromTransition("· Claude Code", "✳ Claude Code", {
        activity: "working",
        agentName: "claude",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "attention",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });

  test("should keep attention when the title becomes unrecognized after work", () => {
    expect(
      getTitleDerivedSessionActivityFromTransition("⠸ OpenAI Codex", "~/project", {
        activity: "working",
        agentName: "codex",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "attention",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });

  test("should keep the detected Codex agent when a glyph-only Codex title becomes plain text", () => {
    expect(
      getTitleDerivedSessionActivityFromTransition("⠸ Review repository...", "Review repository...", {
        activity: "working",
        agentName: "codex",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "attention",
      agentName: "codex",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });

  test("should keep the detected Claude agent when a glyph-only Claude title becomes an idle marker", () => {
    expect(
      getTitleDerivedSessionActivityFromTransition("⠐ Determine project purpose and scope", "✳ Review repository...", {
        activity: "working",
        agentName: "claude",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "attention",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: false,
      lastTitleChangeAt: expect.any(Number),
    });
  });
});

describe("acknowledgeTitleDerivedSessionActivity", () => {
  test("should clear title-derived attention until the next run", () => {
    expect(
      acknowledgeTitleDerivedSessionActivity({
        activity: "attention",
        agentName: "claude",
        hasSeenWorking: true,
        isAcknowledged: false,
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "idle",
      agentName: "claude",
      hasSeenWorking: true,
      isAcknowledged: true,
      lastTitleChangeAt: expect.any(Number),
    });
  });
});
