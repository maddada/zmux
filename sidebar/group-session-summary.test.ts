import { describe, expect, test } from "vite-plus/test";
import type { SidebarSessionItem } from "../shared/session-grid-contract";
import { getGroupSessionSummary } from "./group-session-summary";

describe("getGroupSessionSummary", () => {
  test("should prefer the green indicator when any attention session exists", () => {
    expect(
      getGroupSessionSummary([
        createSession("session-1", { activity: "working", lifecycleState: "running" }),
        createSession("session-2", { activity: "attention", lifecycleState: "done" }),
      ]),
    ).toEqual({
      indicatorActivity: "attention",
    });
  });

  test("should show orange only when there are working sessions and no attention sessions", () => {
    expect(
      getGroupSessionSummary([
        createSession("session-1", { activity: "idle", lifecycleState: "running" }),
        createSession("session-2", { activity: "idle", lifecycleState: "done" }),
        createSession("session-3", { activity: "working", lifecycleState: "done" }),
      ]),
    ).toEqual({
      indicatorActivity: "working",
    });
  });

  test("should ignore idle, sleeping, and error sessions", () => {
    expect(
      getGroupSessionSummary([
        createSession("session-1", {
          activity: "idle",
          lifecycleState: "sleeping",
          isRunning: true,
          isSleeping: true,
        }),
        createSession("session-2", {
          activity: "idle",
          lifecycleState: "sleeping",
          isRunning: false,
          isSleeping: true,
        }),
        createSession("session-3", { activity: "idle", lifecycleState: "done", isRunning: false }),
        createSession("session-4", { activity: "idle", lifecycleState: "error", isRunning: false }),
      ]),
    ).toEqual({
      indicatorActivity: undefined,
    });
  });
});

function createSession(
  sessionId: string,
  overrides: Partial<SidebarSessionItem>,
): SidebarSessionItem {
  return {
    activity: "idle",
    activityLabel: undefined,
    alias: sessionId,
    column: 0,
    isFocused: false,
    lifecycleState: "running",
    isRunning: true,
    isVisible: false,
    primaryTitle: sessionId,
    row: 0,
    sessionId,
    shortcutLabel: "⌘⌥1",
    ...overrides,
  };
}
