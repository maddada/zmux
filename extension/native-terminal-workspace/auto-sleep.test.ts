import { describe, expect, test } from "vite-plus/test";
import {
  AUTO_SLEEP_FOCUS_GRACE_MS,
  getAutoSleepCheckIntervalMs,
  hasAutoSleepFocusGrace,
  hasReachedAutoSleepTimeout,
  shouldAutoSleepSidebarSession,
} from "./auto-sleep";

describe("shouldAutoSleepSidebarSession", () => {
  test("should allow idle running sessions to auto-sleep", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "claude",
        isFocused: false,
        isRunning: true,
        isSleeping: false,
        isVisible: false,
      }),
    ).toBe(true);
  });

  test("should allow Codex idle running sessions to auto-sleep", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "codex",
        isFocused: false,
        isRunning: true,
        isSleeping: false,
        isVisible: false,
      }),
    ).toBe(true);
  });

  test("should allow T3 idle running sessions to auto-sleep", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "t3",
        isFocused: false,
        isRunning: true,
        isSleeping: false,
        isVisible: false,
      }),
    ).toBe(true);
  });

  test("should skip other agent types for now", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "opencode",
        isFocused: false,
        isRunning: true,
        isSleeping: false,
        isVisible: false,
      }),
    ).toBe(false);
  });

  test("should skip sessions with an active working indicator", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "working",
        agentIcon: "claude",
        isFocused: false,
        isRunning: true,
        isSleeping: false,
        isVisible: false,
      }),
    ).toBe(false);
  });

  test("should skip sessions with an attention indicator", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "attention",
        agentIcon: "claude",
        isFocused: false,
        isRunning: true,
        isSleeping: false,
        isVisible: false,
      }),
    ).toBe(false);
  });

  test("should skip sessions that are already done", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "claude",
        isFocused: false,
        isRunning: false,
        isSleeping: false,
        isVisible: false,
      }),
    ).toBe(false);
  });

  test("should skip sessions that are already sleeping", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "claude",
        isFocused: false,
        isRunning: true,
        isSleeping: true,
        isVisible: false,
      }),
    ).toBe(false);
  });

  test("should skip the currently focused session", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "claude",
        isFocused: true,
        isRunning: true,
        isSleeping: false,
        isVisible: true,
      }),
    ).toBe(false);
  });

  test("should skip visible surfaced sessions even when they are not focused", () => {
    expect(
      shouldAutoSleepSidebarSession({
        activity: "idle",
        agentIcon: "claude",
        isFocused: false,
        isRunning: true,
        isSleeping: false,
        isVisible: true,
      }),
    ).toBe(false);
  });
});

describe("hasReachedAutoSleepTimeout", () => {
  test("should return true once the inactivity timeout is reached", () => {
    expect(
      hasReachedAutoSleepTimeout({
        activityAt: "2026-04-17T10:00:00.000Z",
        now: Date.parse("2026-04-17T10:15:00.000Z"),
        timeoutMs: 15 * 60_000,
      }),
    ).toBe(true);
  });

  test("should return false before the inactivity timeout is reached", () => {
    expect(
      hasReachedAutoSleepTimeout({
        activityAt: "2026-04-17T10:00:01.000Z",
        now: Date.parse("2026-04-17T10:15:00.000Z"),
        timeoutMs: 15 * 60_000,
      }),
    ).toBe(false);
  });

  test("should return false when there is no valid activity timestamp", () => {
    expect(hasReachedAutoSleepTimeout({ activityAt: undefined, timeoutMs: 15 * 60_000 })).toBe(
      false,
    );
    expect(hasReachedAutoSleepTimeout({ activityAt: "not-a-date", timeoutMs: 15 * 60_000 })).toBe(
      false,
    );
  });
});

describe("hasAutoSleepFocusGrace", () => {
  test("should return true while the focus grace window is still active", () => {
    expect(
      hasAutoSleepFocusGrace({
        focusedAt: Date.parse("2026-04-17T10:00:00.000Z"),
        graceMs: AUTO_SLEEP_FOCUS_GRACE_MS,
        now: Date.parse("2026-04-17T10:09:59.000Z"),
      }),
    ).toBe(true);
  });

  test("should return false once the focus grace window has expired", () => {
    expect(
      hasAutoSleepFocusGrace({
        focusedAt: Date.parse("2026-04-17T10:00:00.000Z"),
        graceMs: AUTO_SLEEP_FOCUS_GRACE_MS,
        now: Date.parse("2026-04-17T10:10:00.000Z"),
      }),
    ).toBe(false);
  });

  test("should return false when no focused timestamp is available", () => {
    expect(hasAutoSleepFocusGrace({ focusedAt: undefined })).toBe(false);
  });
});

describe("getAutoSleepCheckIntervalMs", () => {
  test("should disable the timer when auto-sleep is turned off", () => {
    expect(getAutoSleepCheckIntervalMs(null)).toBeUndefined();
    expect(getAutoSleepCheckIntervalMs(0)).toBeUndefined();
  });

  test("should clamp the check interval into a responsive polling range", () => {
    expect(getAutoSleepCheckIntervalMs(6_000)).toBe(5_000);
    expect(getAutoSleepCheckIntervalMs(15 * 60_000)).toBe(30_000);
  });
});
