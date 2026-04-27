import { describe, expect, test } from "vite-plus/test";
import {
  createDisplaySessionLayout,
  getDisplaySessionIdsInOrder,
} from "../shared/active-sessions-sort";
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

  test("should keep groups manual while sorting sessions in each group by last activity", () => {
    const layout = createDisplaySessionLayout({
      sessionIdsByGroup: {
        "group-1": ["session-1", "session-2"],
        "group-2": ["session-4", "session-3"],
      },
      sessionsById: createSessionsById(),
      sortMode: "lastActivity",
      workspaceGroupIds: ["group-1", "group-2"],
    });

    expect(layout.groupIds).toEqual(["group-1", "group-2"]);
    expect(layout.sessionIdsByGroup).toEqual({
      "group-1": ["session-2", "session-1"],
      "group-2": ["session-4", "session-3"],
    });
  });

  test("should prioritize attention sessions above working sessions above idle sessions", () => {
    const layout = createDisplaySessionLayout({
      sessionIdsByGroup: {
        "group-1": ["session-1", "session-2", "session-3", "session-4"],
      },
      sessionsById: {
        "session-1": createSession("session-1", "2026-04-07T12:00:00.000Z", "idle"),
        "session-2": createSession("session-2", "2026-04-07T09:00:00.000Z", "attention"),
        "session-3": createSession("session-3", "2026-04-07T08:00:00.000Z", "working"),
        "session-4": createSession("session-4", "2026-04-07T11:00:00.000Z", "idle"),
      },
      sortMode: "lastActivity",
      workspaceGroupIds: ["group-1"],
    });

    expect(layout.sessionIdsByGroup["group-1"]).toEqual([
      "session-2",
      "session-3",
      "session-1",
      "session-4",
    ]);
  });

  test("should sort sessions by last activity within the same activity priority", () => {
    const layout = createDisplaySessionLayout({
      sessionIdsByGroup: {
        "group-1": ["session-1", "session-2", "session-3", "session-4"],
      },
      sessionsById: {
        "session-1": createSession("session-1", "2026-04-07T09:00:00.000Z", "attention"),
        "session-2": createSession("session-2", "2026-04-07T10:00:00.000Z", "attention"),
        "session-3": createSession("session-3", "2026-04-07T11:00:00.000Z", "working"),
        "session-4": createSession("session-4", "2026-04-07T12:00:00.000Z", "working"),
      },
      sortMode: "lastActivity",
      workspaceGroupIds: ["group-1"],
    });

    expect(layout.sessionIdsByGroup["group-1"]).toEqual([
      "session-2",
      "session-1",
      "session-4",
      "session-3",
    ]);
  });

  test("should flatten sessions in the same order shown in the sidebar", () => {
    expect(
      getDisplaySessionIdsInOrder({
        sessionIdsByGroup: {
          "group-1": ["session-1", "session-2"],
          "group-2": ["session-4", "session-3"],
        },
        sessionsById: createSessionsById(),
        sortMode: "manual",
        workspaceGroupIds: ["group-2", "group-1"],
      }),
    ).toEqual(["session-4", "session-3", "session-1", "session-2"]);

    expect(
      getDisplaySessionIdsInOrder({
        sessionIdsByGroup: {
          "group-1": ["session-1", "session-2"],
          "group-2": ["session-4", "session-3"],
        },
        sessionsById: createSessionsById(),
        sortMode: "lastActivity",
        workspaceGroupIds: ["group-2", "group-1"],
      }),
    ).toEqual(["session-4", "session-3", "session-2", "session-1"]);
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
  activity: SidebarSessionItem["activity"] = "idle",
): SidebarSessionItem {
  return {
    activity,
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
