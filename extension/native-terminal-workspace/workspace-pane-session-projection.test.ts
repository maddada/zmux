import { describe, expect, test } from "vite-plus/test";
import { getDisplaySessionIdsInOrder } from "../../shared/active-sessions-sort";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSessionRecord,
  type SidebarSessionItem,
} from "../../shared/session-grid-contract";
import {
  getWorkspacePaneSessionRecords,
  getWorkspaceSlotSessionRecords,
  sortWorkspacePaneSessionRecords,
} from "./workspace-pane-session-projection";

describe("getWorkspacePaneSessionRecords", () => {
  test("should return active-group sessions first and retain inactive group panes", () => {
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
    const otherGroupT3 = createSessionRecord(4, 3, {
      kind: "t3",
      t3: {
        projectId: "project-2",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-2",
        workspaceRoot: "/workspace",
      },
      title: "T3 2",
    });

    workspaceSnapshot.groups[0]!.snapshot.sessions = [mainTerminal, mainT3];
    workspaceSnapshot.groups.push({
      groupId: "group-2",
      snapshot: {
        focusedSessionId: otherGroupTerminal.sessionId,
        fullscreenRestoreVisibleCount: undefined,
        sessions: [otherGroupTerminal, otherGroupT3],
        viewMode: "grid",
        visibleCount: 1,
        visibleSessionIds: [otherGroupTerminal.sessionId],
      },
      title: "Other",
    });

    expect(getWorkspacePaneSessionRecords(workspaceSnapshot)).toEqual([
      mainTerminal,
      mainT3,
      otherGroupTerminal,
      otherGroupT3,
    ]);
  });

  test("should return an empty list when the active group id is missing", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const mainTerminal = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0]!.snapshot.sessions = [mainTerminal];
    workspaceSnapshot.activeGroupId = "missing-group";

    expect(getWorkspacePaneSessionRecords(workspaceSnapshot)).toEqual([]);
  });
});

describe("getWorkspaceSlotSessionRecords", () => {
  test("should use visible workspace slots before sidebar activity order", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const leftSession = createSessionRecord(1, 0);
    const rightSession = createSessionRecord(2, 1);
    const hiddenSession = createSessionRecord(3, 2);

    workspaceSnapshot.groups[0]!.snapshot.sessions = [leftSession, rightSession, hiddenSession];
    workspaceSnapshot.groups[0]!.snapshot.focusedSessionId = leftSession.sessionId;
    workspaceSnapshot.groups[0]!.snapshot.visibleCount = 2;
    workspaceSnapshot.groups[0]!.snapshot.visibleSessionIds = [
      leftSession.sessionId,
      rightSession.sessionId,
    ];

    const sidebarOrder = getDisplaySessionIdsInOrder({
      sessionIdsByGroup: {
        [workspaceSnapshot.groups[0]!.groupId]: [
          leftSession.sessionId,
          rightSession.sessionId,
          hiddenSession.sessionId,
        ],
      },
      sessionsById: {
        [leftSession.sessionId]: createSidebarSession(leftSession.sessionId, "idle", 1),
        [rightSession.sessionId]: createSidebarSession(rightSession.sessionId, "working", 3),
        [hiddenSession.sessionId]: createSidebarSession(hiddenSession.sessionId, "idle", 2),
      },
      sortMode: "lastActivity",
      workspaceGroupIds: [workspaceSnapshot.groups[0]!.groupId],
    });

    expect(sidebarOrder).toEqual([
      rightSession.sessionId,
      hiddenSession.sessionId,
      leftSession.sessionId,
    ]);
    expect(
      getWorkspaceSlotSessionRecords(workspaceSnapshot).map((session) => session.sessionId),
    ).toEqual([leftSession.sessionId, rightSession.sessionId, hiddenSession.sessionId]);
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

function createSidebarSession(
  sessionId: string,
  activity: SidebarSessionItem["activity"],
  lastInteractionMinutes: number,
): SidebarSessionItem {
  return {
    activity,
    alias: sessionId,
    agentIcon: undefined,
    column: 0,
    detail: undefined,
    isFocused: false,
    isFavorite: false,
    isGeneratingFirstPromptTitle: false,
    isReloading: false,
    isRunning: true,
    isSleeping: false,
    isVisible: true,
    kind: "workspace",
    lastInteractionAt: `2026-04-24T10:0${String(lastInteractionMinutes)}:00.000Z`,
    lifecycleState: "running",
    primaryTitle: sessionId,
    row: 0,
    sessionKind: "terminal",
    sessionId,
    shortcutLabel: "",
    terminalTitle: undefined,
  };
}
