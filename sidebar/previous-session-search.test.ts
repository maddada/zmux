import { describe, expect, test } from "vite-plus/test";
import type { SidebarPreviousSessionItem } from "../shared/session-grid-contract";
import { filterPreviousSessions } from "./previous-session-search";

describe("filterPreviousSessions", () => {
  test("should fuzzy match aliases and secondary session text", () => {
    const previousSessions = [
      createPreviousSession({
        alias: "Adding prev sessions",
        detail: "Codex CLI",
        historyId: "history-1",
      }),
      createPreviousSession({
        alias: "Publish release prep",
        detail: "Claude Code",
        historyId: "history-2",
      }),
    ];

    expect(filterPreviousSessions(previousSessions, "ad pvs")).toMatchObject([
      { historyId: "history-1" },
    ]);
    expect(filterPreviousSessions(previousSessions, "cld")).toMatchObject([
      { historyId: "history-2" },
    ]);
  });

  test("should match the same session words across spaces, hyphens, and camel case", () => {
    const previousSessions = [
      createPreviousSession({
        alias: "My Session Title",
        historyId: "history-1",
      }),
      createPreviousSession({
        alias: "my-session-title",
        historyId: "history-2",
      }),
      createPreviousSession({
        alias: "MySessionTitle",
        historyId: "history-3",
      }),
    ];

    expect(filterPreviousSessions(previousSessions, "my session title")).toMatchObject([
      { historyId: "history-1" },
      { historyId: "history-2" },
      { historyId: "history-3" },
    ]);
    expect(filterPreviousSessions(previousSessions, "my-session-title")).toMatchObject([
      { historyId: "history-1" },
      { historyId: "history-2" },
      { historyId: "history-3" },
    ]);
  });

  test("should optionally restrict results to favorite sessions before searching", () => {
    const previousSessions = [
      createPreviousSession({
        alias: "Favorite release prep",
        historyId: "history-1",
        isFavorite: true,
      }),
      createPreviousSession({
        alias: "Normal release prep",
        historyId: "history-2",
        isFavorite: false,
      }),
    ];

    expect(filterPreviousSessions(previousSessions, "", { favoritesOnly: true })).toMatchObject([
      { historyId: "history-1" },
    ]);
    expect(filterPreviousSessions(previousSessions, "normal", { favoritesOnly: true })).toEqual([]);
  });
});

function createPreviousSession(
  overrides: Partial<SidebarPreviousSessionItem>,
): SidebarPreviousSessionItem {
  return {
    activity: "idle",
    alias: "Atlas",
    closedAt: "2026-03-24T10:00:00.000Z",
    column: 0,
    historyId: "history",
    isFocused: false,
    isGeneratedName: false,
    isRestorable: true,
    isRunning: false,
    isVisible: false,
    row: 0,
    sessionId: "session-1",
    shortcutLabel: "⌘⌥1",
    ...overrides,
  };
}
