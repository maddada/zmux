import { describe, expect, test } from "vite-plus/test";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSessionRecord,
} from "../../shared/session-grid-contract";
import {
  getWorkspacePaneSessionRecords,
  sortWorkspacePaneSessionRecords,
} from "./workspace-pane-session-projection";

describe("getWorkspacePaneSessionRecords", () => {
  test("should return only sessions from the active group in their existing order", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const mainTerminal = createSessionRecord(1, 0);
    const mainT3 = createSessionRecord(2, 1, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3",
    });
    const otherGroupTerminal = createSessionRecord(3, 2);

    workspaceSnapshot.groups[0]!.snapshot.sessions = [mainTerminal, mainT3];
    workspaceSnapshot.groups.push({
      groupId: "group-2",
      snapshot: {
        focusedSessionId: otherGroupTerminal.sessionId,
        fullscreenRestoreVisibleCount: undefined,
        sessions: [otherGroupTerminal],
        viewMode: "grid",
        visibleCount: 1,
        visibleSessionIds: [otherGroupTerminal.sessionId],
      },
      title: "Other",
    });

    expect(getWorkspacePaneSessionRecords(workspaceSnapshot)).toEqual([mainTerminal, mainT3]);
  });

  test("should return an empty list when the active group is missing", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    workspaceSnapshot.activeGroupId = "missing-group";

    expect(getWorkspacePaneSessionRecords(workspaceSnapshot)).toEqual([]);
  });
});

describe("sortWorkspacePaneSessionRecords", () => {
  test("should prioritize the stored pane order and append the remaining sessions", () => {
    const sessionA = createSessionRecord(1, 0);
    const sessionB = createSessionRecord(2, 1);
    const sessionC = createSessionRecord(3, 2);

    expect(
      sortWorkspacePaneSessionRecords(
        [sessionA, sessionB, sessionC],
        [sessionC.sessionId, sessionA.sessionId],
      ),
    ).toEqual([sessionC, sessionA, sessionB]);
  });

  test("should ignore stale or duplicate pane ids", () => {
    const sessionA = createSessionRecord(1, 0);
    const sessionB = createSessionRecord(2, 1);

    expect(
      sortWorkspacePaneSessionRecords(
        [sessionA, sessionB],
        ["missing-session", sessionB.sessionId, sessionB.sessionId],
      ),
    ).toEqual([sessionB, sessionA]);
  });
});
