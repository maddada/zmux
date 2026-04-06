import { describe, expect, test } from "vite-plus/test";
import {
  clampAgentManagerZoomPercent,
  clampTerminalViewMode,
  createDefaultSessionGridSnapshot,
  createSidebarHudState,
  createSidebarSessionItems,
  createSessionAlias,
  createSessionRecord,
  getPreferredSessionTitle,
  getT3SessionSurfaceTitle,
  getTerminalSessionSurfaceTitle,
  getSessionShortcutLabel,
  getVisiblePrimaryTitle,
  normalizeTerminalTitle,
} from "./session-grid-contract";
import { createSessionInSnapshot, normalizeSessionGridSnapshot } from "./session-grid-state";

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
  test("should generate numeric default aliases from the display id", () => {
    expect(createSessionAlias(1, 0)).toBe("00");
    expect(createSessionAlias(2, 1)).toBe("01");
    expect(createSessionAlias(3, 2)).toBe("02");
    expect(createSessionAlias(101, 0)).toBe("00");
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

  test("should expose two-digit display ids as session numbers", () => {
    const items = createSidebarSessionItems({
      focusedSessionId: "session-18",
      sessions: [createSessionRecord(18, 0, { displayId: "99" })],
      viewMode: "grid",
      visibleCount: 1,
      visibleSessionIds: ["session-18"],
    });

    expect(items[0]?.sessionNumber).toBe("99");
  });

  test("should expose sleeping state through sidebar session items", () => {
    const items = createSidebarSessionItems({
      focusedSessionId: undefined,
      sessions: [{ ...createSessionRecord(1, 0), isSleeping: true }],
      viewMode: "grid",
      visibleCount: 1,
      visibleSessionIds: [],
    });

    expect(items[0]?.isSleeping).toBe(true);
    expect(items[0]?.isRunning).toBe(false);
  });
});

describe("session surface titles", () => {
  test("should collapse autogenerated aliases to only the display id", () => {
    const terminalSession = createSessionRecord(18, 0, { displayId: "99" });
    const t3Session = createSessionRecord(17, 0, {
      displayId: "42",
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "https://example.com",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
    });

    expect(getTerminalSessionSurfaceTitle(terminalSession)).toBe("99");
    expect(getT3SessionSurfaceTitle(t3Session)).toBe("42");
  });

  test("should prefix renamed aliases with the display id", () => {
    const terminalSession = {
      ...createSessionRecord(18, 0, { displayId: "99" }),
      alias: "Backend",
    };
    const t3Session = {
      ...createSessionRecord(17, 0, {
        displayId: "42",
        kind: "t3",
        t3: {
          projectId: "project-1",
          serverOrigin: "https://example.com",
          threadId: "thread-1",
          workspaceRoot: "/workspace",
        },
      }),
      alias: "Design",
    };

    expect(getTerminalSessionSurfaceTitle(terminalSession)).toBe("99 Backend");
    expect(getT3SessionSurfaceTitle(t3Session)).toBe("42 Design");
  });

  test("should prefer a custom title for terminal and t3 surface titles", () => {
    const terminalSession = {
      ...createSessionRecord(18, 0, { displayId: "99" }),
      alias: "Backend",
      title: "Bug Fixing",
    };
    const t3Session = {
      ...createSessionRecord(17, 0, {
        displayId: "42",
        kind: "t3",
        t3: {
          projectId: "project-1",
          serverOrigin: "https://example.com",
          threadId: "thread-1",
          workspaceRoot: "/workspace",
        },
        title: "Design Review",
      }),
      alias: "Design",
    };

    expect(getTerminalSessionSurfaceTitle(terminalSession)).toBe("99. Bug Fixing");
    expect(getT3SessionSurfaceTitle(t3Session)).toBe("42. Design Review");
  });
});

describe("sidebar HUD state", () => {
  test("should expose the session card chrome settings", () => {
    const hud = createSidebarHudState(
      createDefaultSessionGridSnapshot(),
      "dark-green",
      95,
      false,
      false,
      true,
      false,
      true,
      "glass",
    );

    expect(hud.completionBellEnabled).toBe(true);
    expect(hud.completionSound).toBe("glass");
    expect(hud.completionSoundLabel).toBe("Glass");
    expect(hud.agentManagerZoomPercent).toBe(95);
    expect(hud.collapsedSections).toEqual({
      actions: false,
      agents: false,
    });
    expect(hud.sectionVisibility).toEqual({
      actions: true,
      agents: true,
      browsers: true,
      git: true,
    });
    expect(hud.showCloseButtonOnSessionCards).toBe(false);
    expect(hud.showHotkeysOnSessionCards).toBe(false);
    expect(hud.showLastInteractionTimeOnSessionCards).toBe(true);
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
      100,
      false,
      false,
      true,
      false,
      false,
      "ping",
    );

    expect(hud.isFocusModeActive).toBe(true);
  });
});

describe("agent manager zoom settings", () => {
  test("should clamp invalid zoom values to the supported range", () => {
    expect(clampAgentManagerZoomPercent(undefined)).toBe(100);
    expect(clampAgentManagerZoomPercent(49)).toBe(50);
    expect(clampAgentManagerZoomPercent(90.4)).toBe(90);
    expect(clampAgentManagerZoomPercent(95.6)).toBe(96);
    expect(clampAgentManagerZoomPercent(240)).toBe(200);
  });
});

describe("visible primary titles", () => {
  test("should strip leading progress markers from terminal titles for supported agents", () => {
    expect(normalizeTerminalTitle("  ⠸ OpenAI Codex  ")).toBe("OpenAI Codex");
    expect(normalizeTerminalTitle("✳ Claude Code")).toBe("Claude Code");
    expect(normalizeTerminalTitle("✦ agent-tiler")).toBe("agent-tiler");
    expect(normalizeTerminalTitle("◇ agent-tiler")).toBe("agent-tiler");
    expect(normalizeTerminalTitle("🤖 Copilot fix")).toBe("Copilot fix");
    expect(normalizeTerminalTitle("🔔 Copilot fix")).toBe("Copilot fix");
  });

  test("should hide generated Session N placeholder titles in sidebar items", () => {
    expect(getVisiblePrimaryTitle("Session 1")).toBeUndefined();
    expect(getVisiblePrimaryTitle(" Session 12 ")).toBeUndefined();
    expect(getVisiblePrimaryTitle("Claude Code")).toBe("Claude Code");
  });

  test("should prefer the terminal title when choosing a visible session title", () => {
    expect(getPreferredSessionTitle("Session 1", "Claude Code")).toBe("Claude Code");
  });

  test("should fall back to the custom session title when no terminal title exists", () => {
    expect(getPreferredSessionTitle("Bug Fix", undefined)).toBe("Bug Fix");
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
