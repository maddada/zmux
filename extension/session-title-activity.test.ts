import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import {
  TITLE_ACTIVITY_WINDOW_MS,
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
  test("should detect Codex spinner titles as working", () => {
    const firstActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠸ OpenAI Codex");
    expect(getTitleDerivedSessionActivity("⠸ OpenAI Codex", firstActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      lastTitleChangeAt: Date.now(),
    });
    const secondActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠴ Codex CLI");
    expect(getTitleDerivedSessionActivity("⠴ Codex CLI", secondActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      lastTitleChangeAt: Date.now(),
    });
    const thirdActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠼ Codex");
    expect(getTitleDerivedSessionActivity("⠼ Codex", thirdActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      lastTitleChangeAt: Date.now(),
    });
    const fourthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠧ Codex");
    expect(getTitleDerivedSessionActivity("⠧ Codex", fourthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      lastTitleChangeAt: Date.now(),
    });
    const fifthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠦ Codex");
    expect(getTitleDerivedSessionActivity("⠦ Codex", fifthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      lastTitleChangeAt: Date.now(),
    });
    const sixthActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠏ Codex");
    expect(getTitleDerivedSessionActivity("⠏ Codex", sixthActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      lastTitleChangeAt: Date.now(),
    });
    const seventhActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠋ Codex");
    expect(getTitleDerivedSessionActivity("⠋ Codex", seventhActivity)).toEqual({
      activity: "working",
      agentName: "codex",
      lastTitleChangeAt: Date.now(),
    });
  });

  test("should treat Codex titles without a spinner as idle", () => {
    expect(getTitleDerivedSessionActivity("OpenAI Codex")).toEqual({
      activity: "idle",
      agentName: "codex",
      lastTitleChangeAt: undefined,
    });
  });

  test("should treat a frozen Codex spinner as idle after the activity window", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(undefined, "⠏ OpenAI Codex");
    vi.advanceTimersByTime(TITLE_ACTIVITY_WINDOW_MS + 1);

    expect(getTitleDerivedSessionActivity("⠏ OpenAI Codex", derivedActivity)).toEqual({
      activity: "idle",
      agentName: "codex",
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
      lastTitleChangeAt: derivedActivity?.lastTitleChangeAt,
    });
  });

  test("should treat a frozen Claude working title as idle after the activity window", () => {
    const derivedActivity = getTitleDerivedSessionActivityFromTransition(
      undefined,
      "· Claude Code · API Usage",
    );
    vi.advanceTimersByTime(TITLE_ACTIVITY_WINDOW_MS + 1);

    expect(getTitleDerivedSessionActivity("· Claude Code · API Usage", derivedActivity)).toEqual({
      activity: "idle",
      agentName: "claude",
      lastTitleChangeAt: derivedActivity?.lastTitleChangeAt,
    });
  });

  test("should treat Claude idle glyphs anywhere in the title as idle", () => {
    expect(
      getTitleDerivedSessionActivity("API Usage ✳ Claude Code / project-x", {
        activity: "working",
        agentName: "claude",
      }),
    ).toEqual({
      activity: "idle",
      agentName: "claude",
      lastTitleChangeAt: undefined,
    });
  });
});

describe("getTitleDerivedSessionActivityFromTransition", () => {
  test("should mark Codex as idle when the spinner disappears", () => {
    const lastTitleChangeAt = Date.now();
    expect(
      getTitleDerivedSessionActivityFromTransition("⠸ OpenAI Codex", "OpenAI Codex", {
        activity: "working",
        agentName: "codex",
        lastTitleChangeAt,
      }),
    ).toEqual({
      activity: "idle",
      agentName: "codex",
      lastTitleChangeAt,
    });
  });

  test("should mark Claude as idle when the working glyphs stop updating", () => {
    expect(
      getTitleDerivedSessionActivityFromTransition("· Claude Code", "✳ Claude Code", {
        activity: "working",
        agentName: "claude",
        lastTitleChangeAt: Date.now(),
      }),
    ).toEqual({
      activity: "idle",
      agentName: "claude",
      lastTitleChangeAt: expect.any(Number),
    });
  });
});
