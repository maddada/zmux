import { describe, expect, test } from "vite-plus/test";
import {
  clampTerminalViewMode,
  createDefaultSessionGridSnapshot,
  createSidebarHudState,
  createSidebarSessionItems,
  createSessionAlias,
  createSessionRecord,
  getSessionShortcutLabel,
  getVisiblePrimaryTitle,
} from "./session-grid-contract";
import {
  createSessionInSnapshot,
  normalizeSessionGridSnapshot,
} from "./session-grid-state";

describe("createSessionInSnapshot", () => {
  test("should allocate the lowest free slot in row-major order", () => {
    let snapshot = createDefaultSessionGridSnapshot();

    const first = createSessionInSnapshot(snapshot, 1);
    snapshot = first.snapshot;
    const second = createSessionInSnapshot(snapshot, 2);
    snapshot = second.snapshot;
    const third = createSessionInSnapshot(snapshot, 3);

    expect(first.session?.slotIndex).toBe(0);
    expect(second.session?.slotIndex).toBe(1);
    expect(third.session?.slotIndex).toBe(2);
    expect(third.snapshot.sessions.map((session) => session.title)).toEqual([
      "Session 1",
      "Session 2",
      "Session 3",
    ]);
    expect(third.snapshot.sessions.map((session) => session.alias)).toEqual([
      createSessionAlias(1, 0),
      createSessionAlias(2, 1),
      createSessionAlias(3, 2),
    ]);
  });

  test("should append a new session to the end of the current ordered list", () => {
    const result = createSessionInSnapshot(
      {
        focusedSessionId: "session-2",
        sessions: [createSessionRecord(1, 0), createSessionRecord(2, 2)],
        viewMode: "grid",
        visibleCount: 3,
        visibleSessionIds: ["session-1", "session-2"],
      },
      3,
    );

    expect(result.session?.sessionId).toBe("session-3");
    expect(result.session?.slotIndex).toBe(2);
    expect(result.snapshot.sessions.map((session) => session.sessionId)).toEqual([
      "session-1",
      "session-2",
      "session-3",
    ]);
    expect(result.snapshot.sessions.map((session) => session.slotIndex)).toEqual([0, 1, 2]);
    expect(result.snapshot.focusedSessionId).toBe("session-3");
    expect(result.snapshot.visibleSessionIds).toEqual(["session-1", "session-2", "session-3"]);
  });
});

describe("normalizeSessionGridSnapshot", () => {
  test("should clamp visible count and keep the focused session visible", () => {
    const snapshot = normalizeSessionGridSnapshot({
      focusedSessionId: "session-3",
      fullscreenRestoreVisibleCount: 4,
      sessions: [
        createSessionRecord(1, 0),
        createSessionRecord(2, 1),
        createSessionRecord(3, 2),
        createSessionRecord(4, 3),
      ],
      viewMode: "vertical",
      visibleCount: 99 as 9,
      visibleSessionIds: ["session-1", "session-2"],
    });

    expect(snapshot.viewMode).toBe("vertical");
    expect(snapshot.visibleCount).toBe(9);
    expect(snapshot.visibleSessionIds).toEqual([
      "session-1",
      "session-2",
      "session-3",
      "session-4",
    ]);
    expect(snapshot.fullscreenRestoreVisibleCount).toBeUndefined();
  });

  test("should fall back to grid mode for legacy snapshots missing or carrying invalid view modes", () => {
    const missingViewMode = normalizeSessionGridSnapshot({
      focusedSessionId: "session-1",
      sessions: [createSessionRecord(1, 0)],
      visibleCount: 1,
      visibleSessionIds: ["session-1"],
    } as unknown as ReturnType<typeof createDefaultSessionGridSnapshot>);

    const invalidViewMode = normalizeSessionGridSnapshot({
      focusedSessionId: "session-1",
      sessions: [createSessionRecord(1, 0)],
      viewMode: "diagonal",
      visibleCount: 6,
      visibleSessionIds: ["session-1"],
    } as unknown as ReturnType<typeof createDefaultSessionGridSnapshot>);

    expect(missingViewMode.viewMode).toBe("grid");
    expect(invalidViewMode.viewMode).toBe("grid");
    expect(invalidViewMode.visibleCount).toBe(6);
  });

  test("should backfill aliases for legacy snapshots that only stored the primary title", () => {
    const snapshot = normalizeSessionGridSnapshot({
      focusedSessionId: "session-1",
      sessions: [
        { ...createSessionRecord(1, 0), alias: undefined as unknown as string },
        { ...createSessionRecord(2, 1), alias: "" },
      ],
      viewMode: "grid",
      visibleCount: 2,
      visibleSessionIds: ["session-1", "session-2"],
    });

    expect(snapshot.sessions.map((session) => session.alias)).toEqual([
      createSessionAlias(1, 0),
      createSessionAlias(2, 1),
    ]);
  });

  test("should preserve fullscreen restore count only while the snapshot is in fullscreen mode", () => {
    const snapshot = normalizeSessionGridSnapshot({
      focusedSessionId: "session-1",
      fullscreenRestoreVisibleCount: 4,
      sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
      viewMode: "grid",
      visibleCount: 1,
      visibleSessionIds: ["session-1"],
    });

    expect(snapshot.fullscreenRestoreVisibleCount).toBe(4);
  });
});

describe("session shortcut labels", () => {
  test("should generate numeric default aliases from the session number", () => {
    expect(createSessionAlias(1, 0)).toBe("1");
    expect(createSessionAlias(2, 1)).toBe("2");
    expect(createSessionAlias(3, 2)).toBe("3");
  });

  test("should format per-session shortcut text from the slot index", () => {
    expect(getSessionShortcutLabel(0, "mac")).toBe("⌘⌥1");
    expect(getSessionShortcutLabel(5, "mac")).toBe("⌘⌥6");
    expect(getSessionShortcutLabel(8, "default")).toBe("⌃⌥9");
  });

  test("should expose shortcut labels through sidebar session items", () => {
    const items = createSidebarSessionItems(
      {
        focusedSessionId: "session-1",
        sessions: [createSessionRecord(1, 0), createSessionRecord(2, 2)],
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: ["session-1", "session-2"],
      },
      "mac",
    );

    expect(items.map((item) => item.shortcutLabel)).toEqual(["⌘⌥1", "⌘⌥3"]);
  });
});

describe("sidebar HUD state", () => {
  test("should expose the session card chrome settings", () => {
    const hud = createSidebarHudState(
      createDefaultSessionGridSnapshot(),
      "dark-green",
      false,
      false,
      false,
      true,
      "glass",
    );

    expect(hud.completionBellEnabled).toBe(true);
    expect(hud.completionSound).toBe("glass");
    expect(hud.completionSoundLabel).toBe("Glass");
    expect(hud.showCloseButtonOnSessionCards).toBe(false);
    expect(hud.showHotkeysOnSessionCards).toBe(false);
    expect(hud.isFocusModeActive).toBe(false);
  });

  test("should expose when reversible focus mode is active", () => {
    const hud = createSidebarHudState(
      {
        focusedSessionId: "session-2",
        fullscreenRestoreVisibleCount: 4,
        sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
        viewMode: "grid",
        visibleCount: 1,
        visibleSessionIds: ["session-2"],
      },
      "dark-green",
      false,
      false,
      false,
      false,
      "ping",
    );

    expect(hud.isFocusModeActive).toBe(true);
  });
});

describe("visible primary titles", () => {
  test("should hide generated Session N placeholder titles in sidebar items", () => {
    expect(getVisiblePrimaryTitle("Session 1")).toBeUndefined();
    expect(getVisiblePrimaryTitle(" Session 12 ")).toBeUndefined();
    expect(getVisiblePrimaryTitle("Claude Code")).toBe("Claude Code");
  });

  test("should only expose terminal-set primary titles through sidebar session items", () => {
    const items = createSidebarSessionItems(
      {
        focusedSessionId: "session-1",
        sessions: [
          createSessionRecord(1, 0),
          { ...createSessionRecord(2, 1), title: "Claude Code" },
        ],
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: ["session-1", "session-2"],
      },
      "mac",
    );

    expect(items[0]?.alias).toBe(createSessionAlias(1, 0));
    expect(items[0]?.primaryTitle).toBeUndefined();
    expect(items[1]?.alias).toBe(createSessionAlias(2, 1));
    expect(items[1]?.primaryTitle).toBe("Claude Code");
  });
});

describe("clampTerminalViewMode", () => {
  test("should default invalid modes to grid", () => {
    expect(clampTerminalViewMode("horizontal")).toBe("horizontal");
    expect(clampTerminalViewMode("vertical")).toBe("vertical");
    expect(clampTerminalViewMode("grid")).toBe("grid");
    expect(clampTerminalViewMode("diagonal")).toBe("grid");
    expect(clampTerminalViewMode(undefined)).toBe("grid");
  });
});
