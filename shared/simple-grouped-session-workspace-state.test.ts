import { describe, expect, test } from "vite-plus/test";
import {
  DEFAULT_MAIN_GROUP_ID,
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSessionRecord,
  createTimestampedSessionId,
  formatSessionDisplayId,
  type GroupedSessionWorkspaceSnapshot,
} from "./session-grid-contract";
import {
  createGroupInSimpleWorkspace,
  createGroupFromSessionInSimpleWorkspace,
  createSessionInSimpleWorkspace,
  focusGroupInSimpleWorkspace,
  focusSessionInSimpleWorkspace,
  moveSessionToGroupInSimpleWorkspace,
  normalizeSimpleGroupedSessionWorkspaceSnapshot,
  removeSessionInSimpleWorkspace,
  setSessionFavoriteInSimpleWorkspace,
  setGroupSleepingInSimpleWorkspace,
  setSessionSleepingInSimpleWorkspace,
  setT3SessionMetadataInSimpleWorkspace,
  setVisibleCountInSimpleWorkspace,
  syncSessionOrderInSimpleWorkspace,
} from "./simple-grouped-session-workspace-state";

describe("normalizeSimpleGroupedSessionWorkspaceSnapshot", () => {
  test("should backfill boundThreadId for legacy T3 sessions", () => {
    const snapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot({
      activeGroupId: DEFAULT_MAIN_GROUP_ID,
      groups: [
        {
          groupId: DEFAULT_MAIN_GROUP_ID,
          snapshot: {
            focusedSessionId: "session-1",
            fullscreenRestoreVisibleCount: undefined,
            sessions: [
              {
                ...createSessionRecord(1, 0, {
                  kind: "t3",
                  t3: {
                    projectId: "project-1",
                    serverOrigin: "http://127.0.0.1:3774",
                    threadId: "thread-1",
                    workspaceRoot: "/workspace",
                  },
                  title: "T3 Code",
                }),
                t3: {
                  projectId: "project-1",
                  serverOrigin: "http://127.0.0.1:3774",
                  threadId: "thread-1",
                  workspaceRoot: "/workspace",
                },
              },
            ],
            viewMode: "grid",
            visibleCount: 1,
            visibleSessionIds: ["session-1"],
          },
          title: "Main",
        },
      ],
      nextGroupNumber: 2,
      nextSessionDisplayId: 1,
      nextSessionNumber: 2,
    });

    expect(snapshot.groups[0]?.snapshot.sessions[0]).toEqual(
      expect.objectContaining({
        t3: {
          boundThreadId: "thread-1",
          projectId: "project-1",
          serverOrigin: "http://127.0.0.1:3774",
          threadId: "thread-1",
          workspaceRoot: "/workspace",
        },
      }),
    );
  });

  test("should drop browser sessions and keep a usable main group", () => {
    const snapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot({
      activeGroupId: DEFAULT_MAIN_GROUP_ID,
      groups: [
        {
          groupId: DEFAULT_MAIN_GROUP_ID,
          snapshot: {
            focusedSessionId: "session-1",
            fullscreenRestoreVisibleCount: undefined,
            sessions: [
              createSessionRecord(1, 0, {
                browser: { url: "https://example.com" },
                kind: "browser",
                title: "Browser",
              }),
            ],
            viewMode: "grid",
            visibleCount: 2,
            visibleSessionIds: ["session-1"],
          },
          title: "Main",
        },
      ],
      nextGroupNumber: 2,
      nextSessionDisplayId: 1,
      nextSessionNumber: 2,
    });

    expect(snapshot.groups).toHaveLength(1);
    expect(snapshot.groups[0]?.snapshot.sessions).toEqual([]);
    expect(snapshot.groups[0]?.snapshot.visibleCount).toBe(1);
  });

  test("should repair duplicate generated display ids", () => {
    const snapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot({
      activeGroupId: DEFAULT_MAIN_GROUP_ID,
      groups: [
        {
          groupId: DEFAULT_MAIN_GROUP_ID,
          snapshot: {
            focusedSessionId: "session-2",
            fullscreenRestoreVisibleCount: undefined,
            sessions: [
              createSessionRecord(1, 0, { displayId: "52" }),
              createSessionRecord(2, 1, { displayId: "52" }),
            ],
            viewMode: "grid",
            visibleCount: 2,
            visibleSessionIds: ["session-1", "session-2"],
          },
          title: "Main",
        },
      ],
      nextGroupNumber: 2,
      nextSessionDisplayId: 0,
      nextSessionNumber: 3,
    });

    const sessions = snapshot.groups[0]?.snapshot.sessions ?? [];
    expect(sessions.map((session) => session.displayId)).toEqual(["52", "00"]);
    expect(sessions.map((session) => session.alias)).toEqual(["52", "00"]);
    expect(sessions.map((session) => session.sessionId)).toEqual(["session-1", "session-2"]);
  });
});

const sessionIdForDisplay = (displayId: number | string): string => {
  const numericDisplayId = Number.parseInt(formatSessionDisplayId(displayId), 10);
  return `session-${numericDisplayId + 1}`;
};

describe("createTimestampedSessionId", () => {
  test("should include two-digit creation time and a three-character base36 suffix", () => {
    const sessionId = createTimestampedSessionId([], new Date(2026, 3, 26, 20, 54, 12), () => 0.5);

    expect(sessionId).toBe("s-260426-205412-i00");
  });

  test("should avoid active or archived session ids before accepting a suffix", () => {
    const sessionId = createTimestampedSessionId(
      ["s-260426-205412-000"],
      new Date(2026, 3, 26, 20, 54, 12),
      () => 0,
    );

    expect(sessionId).toBe("s-260426-205412-001");
  });
});

describe("focusSessionInSimpleWorkspace", () => {
  test("should replace the focused visible session when selecting a hidden session in split 2", () => {
    const result = focusSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [
                createSessionRecord(1, 0),
                createSessionRecord(2, 1),
                createSessionRecord(3, 2),
              ],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(0), sessionIdForDisplay(1)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      sessionIdForDisplay(2),
    );

    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(2));
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(2),
      sessionIdForDisplay(1),
    ]);
  });

  test("should preserve visible slot order when focusing an already visible session", () => {
    const result = focusSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [
                createSessionRecord(1, 0),
                createSessionRecord(2, 1),
                createSessionRecord(3, 2),
              ],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(1), sessionIdForDisplay(0)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      sessionIdForDisplay(1),
    );

    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(1));
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(1),
      sessionIdForDisplay(0),
    ]);
  });
});

describe("focusGroupInSimpleWorkspace", () => {
  test("should restore each group's own visible sessions when switching groups", () => {
    const snapshot = createWorkspaceSnapshot({
      activeGroupId: DEFAULT_MAIN_GROUP_ID,
      groups: [
        {
          groupId: DEFAULT_MAIN_GROUP_ID,
          snapshot: {
            focusedSessionId: sessionIdForDisplay(0),
            fullscreenRestoreVisibleCount: undefined,
            sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
            viewMode: "grid",
            visibleCount: 2,
            visibleSessionIds: [sessionIdForDisplay(1), sessionIdForDisplay(0)],
          },
          title: "Main",
        },
        {
          groupId: "group-2",
          snapshot: {
            focusedSessionId: sessionIdForDisplay(2),
            fullscreenRestoreVisibleCount: undefined,
            sessions: [createSessionRecord(3, 0), createSessionRecord(4, 1)],
            viewMode: "grid",
            visibleCount: 2,
            visibleSessionIds: [sessionIdForDisplay(2), sessionIdForDisplay(3)],
          },
          title: "Design",
        },
      ],
      nextGroupNumber: 3,
      nextSessionDisplayId: 4,
      nextSessionNumber: 5,
    });

    const result = focusGroupInSimpleWorkspace(snapshot, "group-2");

    expect(result.snapshot.activeGroupId).toBe("group-2");
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(2),
      sessionIdForDisplay(3),
    ]);
    expect(result.snapshot.groups[1]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(2));
  });
});

describe("moveSessionToGroupInSimpleWorkspace", () => {
  test("should move the session, activate the target group, and focus the moved session", () => {
    const result = moveSessionToGroupInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(0), sessionIdForDisplay(1)],
            },
            title: "Main",
          },
          {
            groupId: "group-2",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(2),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(3, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(2)],
            },
            title: "Infra",
          },
        ],
        nextGroupNumber: 3,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      sessionIdForDisplay(1),
      "group-2",
    );

    expect(result.snapshot.activeGroupId).toBe("group-2");
    expect(result.snapshot.groups[1]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(1));
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay(1)]);
  });
});

describe("removeSessionInSimpleWorkspace", () => {
  test("should switch to the previous non-empty group when closing the active group's last session", () => {
    const result = removeSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: "group-2",
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(1), sessionIdForDisplay(0)],
            },
            title: "Main",
          },
          {
            groupId: "group-2",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(2),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(3, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(2)],
            },
            title: "Focused",
          },
          {
            groupId: "group-3",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(3),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(4, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(3)],
            },
            title: "Later",
          },
        ],
        nextGroupNumber: 4,
        nextSessionDisplayId: 4,
        nextSessionNumber: 5,
      }),
      sessionIdForDisplay(2),
    );

    expect(result.changed).toBe(true);
    expect(result.snapshot.activeGroupId).toBe(DEFAULT_MAIN_GROUP_ID);
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(1),
      sessionIdForDisplay(0),
    ]);
    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(0));
    expect(result.snapshot.groups[1]?.snapshot.sessions).toEqual([]);
  });

  test("should skip empty groups and switch to the next populated group", () => {
    const result = removeSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: "group-2",
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: undefined,
              fullscreenRestoreVisibleCount: undefined,
              sessions: [],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [],
            },
            title: "Main",
          },
          {
            groupId: "group-2",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(0)],
            },
            title: "Focused",
          },
          {
            groupId: "group-3",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(1),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(2, 0), createSessionRecord(3, 1)],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(2), sessionIdForDisplay(1)],
            },
            title: "Next",
          },
        ],
        nextGroupNumber: 4,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      sessionIdForDisplay(0),
    );

    expect(result.changed).toBe(true);
    expect(result.snapshot.activeGroupId).toBe("group-3");
    expect(result.snapshot.groups[2]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(2),
      sessionIdForDisplay(1),
    ]);
    expect(result.snapshot.groups[2]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(1));
    expect(result.snapshot.groups[1]?.snapshot.sessions).toEqual([]);
  });
});

describe("syncSessionOrderInSimpleWorkspace", () => {
  test("should reorder sessions within the same group", () => {
    const result = syncSessionOrderInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [
                createSessionRecord(1, 0),
                createSessionRecord(2, 1),
                createSessionRecord(3, 2),
              ],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(0), sessionIdForDisplay(1)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      DEFAULT_MAIN_GROUP_ID,
      [sessionIdForDisplay(1), sessionIdForDisplay(0), sessionIdForDisplay(2)],
    );

    expect(result.changed).toBe(true);
    expect(
      result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.sessionId),
    ).toEqual([sessionIdForDisplay(1), sessionIdForDisplay(0), sessionIdForDisplay(2)]);
    expect(
      result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.slotIndex),
    ).toEqual([0, 1, 2]);
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(1),
      sessionIdForDisplay(0),
    ]);
    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(0));
  });

  test("should preserve every session when reordering a group with more than nine sessions", () => {
    const sessions = Array.from({ length: 10 }, (_, index) =>
      createSessionRecord(index + 1, index),
    );
    const result = syncSessionOrderInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(2),
              fullscreenRestoreVisibleCount: undefined,
              sessions,
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(2)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 10,
        nextSessionNumber: 11,
      }),
      DEFAULT_MAIN_GROUP_ID,
      [
        sessionIdForDisplay(0),
        sessionIdForDisplay(2),
        sessionIdForDisplay(3),
        sessionIdForDisplay(1),
        sessionIdForDisplay(4),
        sessionIdForDisplay(5),
        sessionIdForDisplay(6),
        sessionIdForDisplay(7),
        sessionIdForDisplay(8),
        sessionIdForDisplay(9),
      ],
    );

    expect(result.changed).toBe(true);
    expect(result.snapshot.groups[0]?.snapshot.sessions).toHaveLength(10);
    expect(
      result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.sessionId),
    ).toEqual([
      sessionIdForDisplay(0),
      sessionIdForDisplay(2),
      sessionIdForDisplay(3),
      sessionIdForDisplay(1),
      sessionIdForDisplay(4),
      sessionIdForDisplay(5),
      sessionIdForDisplay(6),
      sessionIdForDisplay(7),
      sessionIdForDisplay(8),
      sessionIdForDisplay(9),
    ]);
  });
});

describe("createSessionInSimpleWorkspace", () => {
  test("should keep split mode and surface the new session when adding a session", () => {
    let snapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const firstResult = createSessionInSimpleWorkspace(snapshot);
    snapshot = setVisibleCountInSimpleWorkspace(firstResult.snapshot, 2);
    const secondResult = createSessionInSimpleWorkspace(snapshot);
    const firstSessionId = firstResult.session?.sessionId;
    const secondSessionId = secondResult.session?.sessionId;

    expect(firstSessionId).toMatch(/^s-\d{6}-\d{6}-[a-z0-9]{3}$/);
    expect(secondSessionId).toMatch(/^s-\d{6}-\d{6}-[a-z0-9]{3}$/);
    expect(secondResult.snapshot.groups[0]?.snapshot.visibleCount).toBe(2);
    expect(secondResult.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      firstSessionId,
      secondSessionId,
    ]);
    expect(secondResult.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(secondSessionId);
  });

  test("should use one timestamped opaque id for session id, display id, and alias", () => {
    const result = createSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay("02"),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [
                createSessionRecord(1, 0, { displayId: "00" }),
                createSessionRecord(2, 1, { displayId: "02" }),
              ],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay("00"), sessionIdForDisplay("02")],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 0,
        nextSessionNumber: 3,
      }),
    );

    expect(result.session?.sessionId).toMatch(/^s-\d{6}-\d{6}-[a-z0-9]{3}$/);
    expect(result.session?.displayId).toBe(result.session?.sessionId);
    expect(result.session?.alias).toBe(result.session?.sessionId);
  });

  test("should keep the current focus and visible slots when creating a background session", () => {
    const result = createSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay("00"),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [
                createSessionRecord(1, 0, { displayId: "00" }),
                createSessionRecord(2, 1, { displayId: "01" }),
              ],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay("00"), sessionIdForDisplay("01")],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 2,
        nextSessionNumber: 3,
      }),
      {
        initialPresentation: "background",
        title: "Build",
      },
    );

    expect(result.session?.sessionId).toMatch(/^s-\d{6}-\d{6}-[a-z0-9]{3}$/);
    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay("00"));
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay("00"),
      sessionIdForDisplay("01"),
    ]);
  });
});

describe("setT3SessionMetadataInSimpleWorkspace", () => {
  test("should update the stored T3 metadata without changing the session identity", () => {
    const placeholderSession = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "pending-project",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "pending-thread",
        workspaceRoot: "/tmp/project",
      },
      title: "T3 Code",
    });
    const snapshot = createWorkspaceSnapshot({
      activeGroupId: DEFAULT_MAIN_GROUP_ID,
      groups: [
        {
          groupId: DEFAULT_MAIN_GROUP_ID,
          snapshot: {
            focusedSessionId: placeholderSession.sessionId,
            fullscreenRestoreVisibleCount: undefined,
            sessions: [placeholderSession],
            viewMode: "grid",
            visibleCount: 1,
            visibleSessionIds: [placeholderSession.sessionId],
          },
          title: "Main",
        },
      ],
      nextGroupNumber: 2,
      nextSessionDisplayId: 1,
      nextSessionNumber: 2,
    });
    const normalizedSessionId = snapshot.groups[0]?.snapshot.sessions[0]?.sessionId;

    const result = setT3SessionMetadataInSimpleWorkspace(snapshot, normalizedSessionId ?? "", {
      projectId: "project-123",
      serverOrigin: "http://127.0.0.1:3773",
      threadId: "thread-456",
      workspaceRoot: "/tmp/project",
    });

    expect(result.changed).toBe(true);
    expect(result.snapshot.groups[0]?.snapshot.sessions[0]).toEqual(
      expect.objectContaining({
        sessionId: normalizedSessionId,
        t3: {
          boundThreadId: "thread-456",
          projectId: "project-123",
          serverOrigin: "http://127.0.0.1:3773",
          threadId: "thread-456",
          workspaceRoot: "/tmp/project",
        },
      }),
    );
  });
});

describe("createGroupFromSessionInSimpleWorkspace", () => {
  test("should move the dragged session into a new active group", () => {
    const result = createGroupFromSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(0), sessionIdForDisplay(1)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 2,
        nextSessionNumber: 3,
      }),
      sessionIdForDisplay(1),
    );

    expect(result.groupId).toBe("group-2");
    expect(result.snapshot.activeGroupId).toBe("group-2");
    expect(result.snapshot.groups).toHaveLength(2);
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay(0)]);
    expect(
      result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.sessionId),
    ).toEqual([sessionIdForDisplay(0)]);
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay(1)]);
    expect(
      result.snapshot.groups[1]?.snapshot.sessions.map((session) => session.sessionId),
    ).toEqual([sessionIdForDisplay(1)]);
  });

  test("should remove the canonicalized dragged session from the source group", () => {
    const draggedSession = {
      ...createSessionRecord(5, 1, { displayId: "04" }),
      sessionId: sessionIdForDisplay("00"),
    };
    const result = createGroupFromSessionInSimpleWorkspace(
      {
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay("04"),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(4, 0, { displayId: "03" }), draggedSession],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay("03"), sessionIdForDisplay("04")],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 5,
        nextSessionNumber: 6,
      },
      sessionIdForDisplay("04"),
    );

    expect(result.groupId).toBe("group-2");
    expect(result.snapshot.groups).toHaveLength(2);
    expect(
      result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.sessionId),
    ).toEqual([sessionIdForDisplay("03")]);
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay("03"),
    ]);
    expect(
      result.snapshot.groups[1]?.snapshot.sessions.map((session) => session.sessionId),
    ).toEqual([sessionIdForDisplay("04")]);
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay("04"),
    ]);
  });
});

describe("moveSessionToGroupInSimpleWorkspace", () => {
  test("should reorder within the same group while keeping the moved session focused and visible", () => {
    const result = moveSessionToGroupInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(2),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [
                createSessionRecord(1, 0),
                createSessionRecord(2, 1),
                createSessionRecord(3, 2),
              ],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(1), sessionIdForDisplay(2)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      sessionIdForDisplay(2),
      DEFAULT_MAIN_GROUP_ID,
      1,
    );

    expect(result.changed).toBe(true);
    expect(
      result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.sessionId),
    ).toEqual([sessionIdForDisplay(0), sessionIdForDisplay(2), sessionIdForDisplay(1)]);
    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(2));
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(1),
      sessionIdForDisplay(2),
    ]);
  });
});

describe("createGroupInSimpleWorkspace", () => {
  test("should append an empty active group", () => {
    const result = createGroupInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(0)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 1,
        nextSessionNumber: 2,
      }),
    );

    expect(result.changed).toBe(true);
    expect(result.groupId).toBe("group-2");
    expect(result.snapshot.activeGroupId).toBe("group-2");
    expect(result.snapshot.groups).toHaveLength(2);
    expect(result.snapshot.groups[1]).toMatchObject({
      groupId: "group-2",
      title: "Group 2",
    });
    expect(result.snapshot.groups[1]?.snapshot.sessions).toEqual([]);
    expect(result.snapshot.nextGroupNumber).toBe(3);
  });
});

describe("setSessionSleepingInSimpleWorkspace", () => {
  test("should switch focus to another awake session in the same group", () => {
    const result = setSessionSleepingInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(1),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(0), sessionIdForDisplay(1)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 2,
        nextSessionNumber: 3,
      }),
      sessionIdForDisplay(1),
      true,
    );

    expect(result.snapshot.groups[0]?.snapshot.sessions[1]?.isSleeping).toBe(true);
    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(0));
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay(0)]);
  });

  test("should fill an empty visible slot before replacing an existing pane", () => {
    const sleepingSession = {
      ...createSessionRecord(2, 1),
      isSleeping: true,
    };
    const sleepingSessionId = sessionIdForDisplay(1);
    const result = focusSessionInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: DEFAULT_MAIN_GROUP_ID,
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0), sleepingSession],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(0)],
            },
            title: "Main",
          },
        ],
        nextGroupNumber: 2,
        nextSessionDisplayId: 2,
        nextSessionNumber: 3,
      }),
      sleepingSessionId,
    );

    expect(result.snapshot.groups[0]?.snapshot.sessions[1]?.isSleeping).toBe(false);
    expect(result.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sleepingSessionId);
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(0),
      sleepingSessionId,
    ]);
  });

  test("should fall back to another group when the active group loses its last awake session", () => {
    const result = setSessionSleepingInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: "group-2",
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(0)],
            },
            title: "Main",
          },
          {
            groupId: "group-2",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(1),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(2, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(1)],
            },
            title: "Focused",
          },
        ],
        nextGroupNumber: 3,
        nextSessionDisplayId: 2,
        nextSessionNumber: 3,
      }),
      sessionIdForDisplay(1),
      true,
    );

    expect(result.snapshot.activeGroupId).toBe(DEFAULT_MAIN_GROUP_ID);
    expect(result.snapshot.groups[1]?.snapshot.focusedSessionId).toBeUndefined();
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([]);
  });
});

describe("setSessionFavoriteInSimpleWorkspace", () => {
  test("should persist the favorite flag on the target session", () => {
    const snapshot = createWorkspaceSnapshot({
      activeGroupId: DEFAULT_MAIN_GROUP_ID,
      groups: [
        {
          groupId: DEFAULT_MAIN_GROUP_ID,
          snapshot: {
            focusedSessionId: sessionIdForDisplay(0),
            fullscreenRestoreVisibleCount: undefined,
            sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
            viewMode: "grid",
            visibleCount: 2,
            visibleSessionIds: [sessionIdForDisplay(0), sessionIdForDisplay(1)],
          },
          title: "Main",
        },
      ],
      nextGroupNumber: 2,
      nextSessionDisplayId: 2,
      nextSessionNumber: 3,
    });

    const result = setSessionFavoriteInSimpleWorkspace(snapshot, sessionIdForDisplay(1), true);

    expect(result.changed).toBe(true);
    expect(result.snapshot.groups[0]?.snapshot.sessions[1]?.isFavorite).toBe(true);
    expect(result.snapshot.groups[0]?.snapshot.sessions[0]?.isFavorite).toBeUndefined();
  });
});

describe("setGroupSleepingInSimpleWorkspace", () => {
  test("should sleep every session in the group and switch away when needed", () => {
    const result = setGroupSleepingInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: "group-2",
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(0)],
            },
            title: "Main",
          },
          {
            groupId: "group-2",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(1),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(2, 0), createSessionRecord(3, 1)],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(1), sessionIdForDisplay(2)],
            },
            title: "Focused",
          },
        ],
        nextGroupNumber: 3,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      "group-2",
      true,
    );

    expect(result.snapshot.activeGroupId).toBe(DEFAULT_MAIN_GROUP_ID);
    expect(
      result.snapshot.groups[1]?.snapshot.sessions.every((session) => session.isSleeping),
    ).toBe(true);
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([]);
  });

  test("should only sleep the targeted sessions in the group", () => {
    const result = setGroupSleepingInSimpleWorkspace(
      createWorkspaceSnapshot({
        activeGroupId: "group-2",
        groups: [
          {
            groupId: DEFAULT_MAIN_GROUP_ID,
            snapshot: {
              focusedSessionId: sessionIdForDisplay(0),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(1, 0)],
              viewMode: "grid",
              visibleCount: 1,
              visibleSessionIds: [sessionIdForDisplay(0)],
            },
            title: "Main",
          },
          {
            groupId: "group-2",
            snapshot: {
              focusedSessionId: sessionIdForDisplay(1),
              fullscreenRestoreVisibleCount: undefined,
              sessions: [createSessionRecord(2, 0), createSessionRecord(3, 1)],
              viewMode: "grid",
              visibleCount: 2,
              visibleSessionIds: [sessionIdForDisplay(1), sessionIdForDisplay(2)],
            },
            title: "Focused",
          },
        ],
        nextGroupNumber: 3,
        nextSessionDisplayId: 3,
        nextSessionNumber: 4,
      }),
      "group-2",
      true,
      [sessionIdForDisplay(1)],
    );

    expect(result.snapshot.activeGroupId).toBe("group-2");
    expect(result.snapshot.groups[1]?.snapshot.sessions[0]?.isSleeping).toBe(true);
    expect(result.snapshot.groups[1]?.snapshot.sessions[1]?.isSleeping).toBeUndefined();
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay(2)]);
  });
});

function createWorkspaceSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot,
): GroupedSessionWorkspaceSnapshot {
  return normalizeSimpleGroupedSessionWorkspaceSnapshot(snapshot);
}
