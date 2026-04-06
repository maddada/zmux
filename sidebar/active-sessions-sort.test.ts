import { describe, expect, test } from "vite-plus/test";
import { createDisplaySessionLayout } from "./active-sessions-sort";
import type { SidebarSessionItem } from "../shared/session-grid-contract";

describe("createDisplaySessionLayout", () => {
  test("should preserve manual ordering", () => {
    const layout = createDisplaySessionLayout({
      sessionIdsByGroup: {
        "group-1": ["session-2", "session-1"],
        "group-2": ["session-3"],
      },
      sessionsById: createSessionsById(),
      sortMode: "manual",
      workspaceGroupIds: ["group-2", "group-1"],
    });

    expect(layout.groupIds).toEqual(["group-2", "group-1"]);
    expect(layout.sessionIdsByGroup).toEqual({
      "group-1": ["session-2", "session-1"],
      "group-2": ["session-3"],
    });
  });

  test("should sort groups and sessions by last activity while keeping manual ties stable", () => {
    const layout = createDisplaySessionLayout({
      sessionIdsByGroup: {
        "group-1": ["session-1", "session-2"],
        "group-2": ["session-4", "session-3"],
      },
      sessionsById: createSessionsById(),
      sortMode: "lastActivity",
      workspaceGroupIds: ["group-1", "group-2"],
    });

    expect(layout.groupIds).toEqual(["group-2", "group-1"]);
    expect(layout.sessionIdsByGroup).toEqual({
      "group-1": ["session-2", "session-1"],
      "group-2": ["session-4", "session-3"],
    });
  });
});

function createSessionsById(): Record<string, SidebarSessionItem> {
  return {
    "session-1": createSession("session-1", "2026-04-07T10:00:00.000Z"),
    "session-2": createSession("session-2", "2026-04-07T11:00:00.000Z"),
    "session-3": createSession("session-3", "2026-04-07T11:30:00.000Z"),
    "session-4": createSession("session-4", "2026-04-07T12:00:00.000Z"),
  };
}

function createSession(
  sessionId: string,
  lastInteractionAt: string | undefined,
): SidebarSessionItem {
  return {
    activity: "idle",
    activityLabel: undefined,
    alias: sessionId,
    column: 0,
    isFocused: false,
    isRunning: true,
    isVisible: false,
    lastInteractionAt,
    primaryTitle: sessionId,
    row: 0,
    sessionId,
    shortcutLabel: "⌘⌥1",
  };
}
