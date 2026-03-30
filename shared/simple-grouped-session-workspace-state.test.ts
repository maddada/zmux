import { describe, expect, test } from "vite-plus/test";
import {
  DEFAULT_MAIN_GROUP_ID,
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSessionRecord,
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
  setT3SessionMetadataInSimpleWorkspace,
  setVisibleCountInSimpleWorkspace,
} from "./simple-grouped-session-workspace-state";

describe("normalizeSimpleGroupedSessionWorkspaceSnapshot", () => {
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
    expect(sessions.map((session) => session.sessionId)).toEqual([
      sessionIdForDisplay("52"),
      sessionIdForDisplay("00"),
    ]);
  });
});

const sessionIdForDisplay = (displayId: number | string): string => {
  return `session-${formatSessionDisplayId(displayId)}`;
};

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
              sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1), createSessionRecord(3, 2)],
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

describe("createSessionInSimpleWorkspace", () => {
  test("should keep split mode and surface the new session when adding a session", () => {
    let snapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const firstResult = createSessionInSimpleWorkspace(snapshot);
    snapshot = setVisibleCountInSimpleWorkspace(firstResult.snapshot, 2);
    const secondResult = createSessionInSimpleWorkspace(snapshot);

    expect(secondResult.session?.sessionId).toBe(sessionIdForDisplay(1));
    expect(secondResult.snapshot.groups[0]?.snapshot.visibleCount).toBe(2);
    expect(secondResult.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([
      sessionIdForDisplay(0),
      sessionIdForDisplay(1),
    ]);
    expect(secondResult.snapshot.groups[0]?.snapshot.focusedSessionId).toBe(sessionIdForDisplay(1));
  });

  test("should allocate the first free display id instead of wrapping into a duplicate", () => {
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

    expect(result.session?.displayId).toBe("01");
    expect(result.session?.alias).toBe("01");
    expect(result.session?.sessionId).toBe(sessionIdForDisplay("01"));
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
    expect(result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.sessionId)).toEqual([
      sessionIdForDisplay(0),
    ]);
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay(1)]);
    expect(result.snapshot.groups[1]?.snapshot.sessions.map((session) => session.sessionId)).toEqual([
      sessionIdForDisplay(1),
    ]);
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
    expect(result.snapshot.groups[0]?.snapshot.sessions.map((session) => session.sessionId)).toEqual([
      sessionIdForDisplay("03"),
    ]);
    expect(result.snapshot.groups[0]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay("03")]);
    expect(result.snapshot.groups[1]?.snapshot.sessions.map((session) => session.sessionId)).toEqual([
      sessionIdForDisplay("04"),
    ]);
    expect(result.snapshot.groups[1]?.snapshot.visibleSessionIds).toEqual([sessionIdForDisplay("04")]);
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

function createWorkspaceSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot,
): GroupedSessionWorkspaceSnapshot {
  return normalizeSimpleGroupedSessionWorkspaceSnapshot(snapshot);
}
