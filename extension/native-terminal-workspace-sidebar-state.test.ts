import { describe, expect, test, vi } from "vite-plus/test";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSessionRecord,
  type SidebarHydrateMessage,
  type SidebarSessionStateMessage,
} from "../shared/session-grid-contract";
import {
  buildSidebarMessage,
  createPreviousSessionEntry,
} from "./native-terminal-workspace-sidebar-state";

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: undefined,
  },
}));

describe("buildSidebarMessage", () => {
  test("should prepend a Browsers group when live browser tabs exist", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage(
        createBuildSidebarMessageOptions(workspaceSnapshot, [
          {
            detail: "https://example.com/docs",
            isActive: true,
            label: "Docs",
            sessionId: "browser-tab:docs",
          },
        ]),
      ),
    );

    expect(message.type).toBe("sessionState");
    expect(message.groups.map((group) => ({ kind: group.kind, title: group.title }))).toEqual([
      { kind: "browser", title: "Browsers" },
      { kind: "workspace", title: "Main" },
    ]);
    expect(message.groups[0]?.sessions).toEqual([
      expect.objectContaining({
        detail: "https://example.com/docs",
        lifecycleState: "running",
        isFocused: true,
        isRunning: true,
        isVisible: true,
        kind: "browser",
        primaryTitle: "Docs",
        sessionId: "browser-tab:docs",
      }),
    ]);
  });

  test("should omit the Browsers group when there are no live browser tabs", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const message = getSidebarStateMessage(
      buildSidebarMessage(createBuildSidebarMessageOptions(workspaceSnapshot, [])),
    );

    expect(message.groups).toHaveLength(2);
    expect(message.groups[0]).toEqual(
      expect.objectContaining({
        kind: "browser",
        sessions: [],
        title: "Browsers",
      }),
    );
    expect(message.groups[1]?.title).toBe("Main");
    expect(message.groups[1]?.kind).toBe("workspace");
  });

  test("should show pending T3 sessions without a fake thread detail", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "pending-project",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "pending-thread",
        workspaceRoot: "/tmp/project",
      },
      title: "T3 Code",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getT3ActivityState: () => ({
          activity: "idle",
          detail: undefined,
          isRunning: true,
        }),
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        activity: "idle",
        detail: undefined,
        lifecycleState: "running",
        isRunning: true,
        primaryTitle: "T3 Code",
        sessionId: sessionRecord.sessionId,
      }),
    );
  });

  test("should promote the T3 runtime title when the session is auto-named", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/tmp/project",
      },
      title: "T3 Code",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getT3ActivityState: () => ({
          activity: "idle",
          detail: undefined,
          isRunning: true,
        }),
        getTerminalTitle: () =>
          sessionRecord.sessionId === "session-1" ? "Implement release checks" : undefined,
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        primaryTitle: "Implement release checks",
        terminalTitle: undefined,
      }),
    );
  });

  test("should show the T3 runtime title as secondary when the user renamed the session", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/tmp/project",
      },
      title: "Review findings",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getT3ActivityState: () => ({
          activity: "working",
          detail: undefined,
          isRunning: true,
        }),
        getTerminalTitle: () =>
          sessionRecord.sessionId === "session-1" ? "Run regression suite" : undefined,
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        primaryTitle: "Review findings",
        terminalTitle: "Run regression suite",
      }),
    );
  });

  test("should promote the terminal title to the primary title when the user did not rename the session", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getTerminalTitle: () => "Claude Code / repo sweep",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        isReloading: false,
        isPrimaryTitleTerminalTitle: true,
        lastInteractionAt: sessionRecord.createdAt,
        primaryTitle: "Claude Code / repo sweep",
        terminalTitle: undefined,
      }),
    );
  });

  test("should fall back to the live session snapshot title during startup restore", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      title: "Session 1945",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getSessionSnapshot: () => ({
          agentName: "codex",
          agentStatus: "idle",
          cols: 120,
          cwd: "/workspace",
          isAttached: true,
          restoreState: "live",
          rows: 34,
          sessionId: sessionRecord.sessionId,
          shell: "/bin/zsh",
          startedAt: "2026-04-21T07:24:32.972Z",
          status: "running",
          title: "Agent Tiler Memory Leak",
          workspaceId: "workspace-1",
        }),
        getTerminalTitle: () => undefined,
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        isPrimaryTitleTerminalTitle: true,
        primaryTitle: "Agent Tiler Memory Leak",
        terminalTitle: undefined,
      }),
    );
  });

  test("should expose reloading sessions to the sidebar state", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getIsSessionReloading: (sessionId) => sessionId === sessionRecord.sessionId,
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        isReloading: true,
        sessionId: sessionRecord.sessionId,
      }),
    );
  });

  test("should ignore the generic VSmux terminal title for unnamed terminal sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getTerminalTitle: () => "VSmux",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        alias: "00",
        primaryTitle: undefined,
        terminalTitle: undefined,
      }),
    );
  });

  test("should ignore bare agent terminal titles for unnamed terminal sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getTerminalTitle: () => "Claude Code",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        alias: "00",
        primaryTitle: undefined,
        terminalTitle: undefined,
      }),
    );
  });

  test("should ignore the default Windows PowerShell executable title for unnamed terminal sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getTerminalTitle: () => "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe .",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        alias: "00",
        primaryTitle: undefined,
        terminalTitle: undefined,
      }),
    );
  });

  test("should expose the latest terminal activity timestamp when available", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getLastTerminalActivityAt: () => Date.parse("2026-04-02T12:34:56.000Z"),
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        lastInteractionAt: "2026-04-02T12:34:56.000Z",
      }),
    );
  });

  test("should expose the latest T3 interaction timestamp from the runtime state", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/tmp/project",
      },
      title: "T3 Code",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getT3ActivityState: () => ({
          activity: "idle",
          isRunning: true,
          lastInteractionAt: "2026-04-03T08:09:10.000Z",
        }),
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        lastInteractionAt: "2026-04-03T08:09:10.000Z",
      }),
    );
  });

  test("should keep the user title authoritative over the terminal title", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      title: "Bug Fix",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getTerminalTitle: () => "Run regression suite",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        isFavorite: false,
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Bug Fix",
        terminalTitle: "Run regression suite",
      }),
    );
  });

  test("should prefer the terminal title for Claude sessions even when the user renamed the session", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      title: "Bug Fix",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getSessionSnapshot: () => ({
          agentName: "claude",
          agentStatus: "idle",
          cols: 120,
          cwd: "/workspace",
          isAttached: true,
          restoreState: "live",
          rows: 34,
          sessionId: sessionRecord.sessionId,
          shell: "/bin/zsh",
          startedAt: "2026-04-02T00:00:00.000Z",
          status: "running",
          title: "Claude / recent sessions polish",
          workspaceId: "workspace-1",
        }),
        getSidebarAgentIcon: (_sessionId, snapshotAgentName) =>
          snapshotAgentName === "claude" ? "claude" : undefined,
        getTerminalTitle: () => "Claude / recent sessions polish",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        agentIcon: "claude",
        isPrimaryTitleTerminalTitle: true,
        primaryTitle: "Claude / recent sessions polish",
        terminalTitle: undefined,
      }),
    );
  });

  test("should prefer the terminal title for OpenCode sessions even when the user renamed the session", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0, {
      title: "OpenCode",
    });
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getSessionSnapshot: () => ({
          agentName: "opencode",
          agentStatus: "idle",
          cols: 120,
          cwd: "/workspace",
          isAttached: true,
          restoreState: "live",
          rows: 34,
          sessionId: sessionRecord.sessionId,
          shell: "/bin/zsh",
          startedAt: "2026-04-02T00:00:00.000Z",
          status: "running",
          title: "Project overview question",
          workspaceId: "workspace-1",
        }),
        getSidebarAgentIcon: (_sessionId, snapshotAgentName) =>
          snapshotAgentName === "opencode" ? "opencode" : undefined,
        getTerminalTitle: () => "Project overview question",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        agentIcon: "opencode",
        isPrimaryTitleTerminalTitle: true,
        primaryTitle: "Project overview question",
        terminalTitle: undefined,
      }),
    );
  });

  test("should expose favorite sessions to the sidebar projection", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = {
      ...createSessionRecord(1, 0),
      isFavorite: true,
    };
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage(createBuildSidebarMessageOptions(workspaceSnapshot, [])),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        isFavorite: true,
        sessionId: sessionRecord.sessionId,
      }),
    );
  });

  test("should keep idle live terminal sessions running in the sidebar projection", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getEffectiveSessionActivity: () => ({
          activity: "idle",
          agentName: "codex",
        }),
        getSessionSnapshot: () => ({
          agentName: "codex",
          agentStatus: "idle",
          cols: 120,
          cwd: "/workspace",
          isAttached: true,
          restoreState: "live",
          rows: 34,
          sessionId: sessionRecord.sessionId,
          shell: "/bin/zsh",
          startedAt: "2026-04-02T00:00:00.000Z",
          status: "running",
          title: "Codex",
          workspaceId: "workspace-1",
        }),
        terminalHasLiveProjection: () => true,
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        activity: "idle",
        lifecycleState: "running",
        isRunning: true,
        sessionId: sessionRecord.sessionId,
      }),
    );
  });

  test("should mark sleeping terminal sessions as sleeping and not running", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = {
      ...createSessionRecord(1, 0),
      isSleeping: true,
    };
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];

    const message = getSidebarStateMessage(
      buildSidebarMessage({
        ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
        getTerminalTitle: () => "Codex",
      }),
    );

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        activity: "idle",
        detail: "Sleeping",
        lifecycleState: "sleeping",
        isRunning: false,
        isSleeping: true,
        primaryTitle: undefined,
      }),
    );
  });
});

describe("createPreviousSessionEntry", () => {
  test("should skip unnamed terminal sessions when archiving previous sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = createSessionRecord(1, 0);
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry({
      ...createPreviousSessionEntryOptions(group, sessionRecord),
      getTerminalTitle: () => undefined,
    });

    expect(previousSession).toBeUndefined();
  });

  test("should keep unnamed t3 sessions when archiving previous sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/tmp/project",
      },
    });
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry(
      createPreviousSessionEntryOptions(group, sessionRecord),
    );

    expect(previousSession).toEqual(
      expect.objectContaining({
        sessionRecord,
      }),
    );
  });

  test("should keep terminal sessions that have a terminal title when archiving previous sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = createSessionRecord(1, 0);
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry({
      ...createPreviousSessionEntryOptions(group, sessionRecord),
      getTerminalTitle: () => "Codex / recent sessions polish",
    });

    expect(previousSession).toEqual(
      expect.objectContaining({
        sessionRecord,
      }),
    );
  });

  test("should skip generic VSmux terminal titles when archiving previous sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = createSessionRecord(1, 0);
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry({
      ...createPreviousSessionEntryOptions(group, sessionRecord),
      getTerminalTitle: () => "VSmux",
    });

    expect(previousSession).toBeUndefined();
  });

  test("should skip bare agent titles when archiving previous sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = createSessionRecord(1, 0);
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry({
      ...createPreviousSessionEntryOptions(group, sessionRecord),
      getTerminalTitle: () => "Codex",
    });

    expect(previousSession).toBeUndefined();
  });

  test("should skip default Windows PowerShell executable titles when archiving previous sessions", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = createSessionRecord(1, 0);
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry({
      ...createPreviousSessionEntryOptions(group, sessionRecord),
      getTerminalTitle: () => "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe .",
    });

    expect(previousSession).toBeUndefined();
  });

  test("should preserve the derived agent icon in previous session history", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = createSessionRecord(1, 0);
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry({
      browserHasLiveProjection: () => false,
      debuggingMode: false,
      getEffectiveSessionActivity: () => ({
        activity: "idle",
        agentName: "codex",
      }),
      getIsSessionReloading: () => false,
      getSessionAgentLaunch: () => undefined,
      getLastTerminalActivityAt: () => undefined,
      getSessionSnapshot: () => ({
        agentName: "codex",
        agentStatus: "idle",
        cols: 120,
        cwd: "/workspace",
        isAttached: true,
        restoreState: "live",
        rows: 34,
        sessionId: sessionRecord.sessionId,
        shell: "/bin/zsh",
        startedAt: "2026-04-02T00:00:00.000Z",
        status: "running",
        title: "Codex / recent sessions polish",
        workspaceId: "workspace-1",
      }),
      getSidebarAgentIcon: (_sessionId, snapshotAgentName) =>
        snapshotAgentName === "codex" ? "codex" : undefined,
      getT3ActivityState: () => ({
        activity: "idle",
        isRunning: false,
      }),
      getTerminalTitle: () => "Codex / recent sessions polish",
      group,
      platform: "default",
      sessionRecord,
      terminalHasLiveProjection: () => false,
      workspaceId: "workspace-1",
    });

    expect(previousSession?.agentIcon).toBe("codex");
    expect(previousSession?.sidebarItem.agentIcon).toBe("codex");
    expect(previousSession?.sidebarItem.lifecycleState).toBe("done");
  });

  test("should preserve favorite state in previous session history", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const group = workspaceSnapshot.groups[0];
    const sessionRecord = {
      ...createSessionRecord(1, 0),
      isFavorite: true,
    };
    group.snapshot.sessions = [sessionRecord];
    group.snapshot.focusedSessionId = sessionRecord.sessionId;
    group.snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const previousSession = createPreviousSessionEntry(
      createPreviousSessionEntryOptions(group, sessionRecord),
    );

    expect(previousSession?.sidebarItem.isFavorite).toBe(true);
    expect(previousSession?.sessionRecord.isFavorite).toBe(true);
  });
});

function createPreviousSessionEntryOptions(
  group: ReturnType<typeof createDefaultGroupedSessionWorkspaceSnapshot>["groups"][number],
  sessionRecord: ReturnType<typeof createSessionRecord>,
): Parameters<typeof createPreviousSessionEntry>[0] {
  return {
    browserHasLiveProjection: () => false,
    debuggingMode: false,
    getEffectiveSessionActivity: () => ({
      activity: "idle",
      agentName: "codex",
    }),
    getIsSessionReloading: () => false,
    getSessionAgentLaunch: () => undefined,
    getLastTerminalActivityAt: () => undefined,
    getSessionSnapshot: () => ({
      agentName: "codex",
      agentStatus: "idle",
      cols: 120,
      cwd: "/workspace",
      isAttached: true,
      restoreState: "live",
      rows: 34,
      sessionId: sessionRecord.sessionId,
      shell: "/bin/zsh",
      startedAt: "2026-04-02T00:00:00.000Z",
      status: "running",
      title: "Codex / recent sessions polish",
      workspaceId: "workspace-1",
    }),
    getSidebarAgentIcon: (_sessionId, snapshotAgentName) =>
      snapshotAgentName === "codex" ? "codex" : undefined,
    getT3ActivityState: () => ({
      activity: "idle",
      isRunning: false,
    }),
    getTerminalTitle: () => "Codex / recent sessions polish",
    group,
    platform: "default",
    sessionRecord,
    terminalHasLiveProjection: () => false,
    workspaceId: "workspace-1",
  };
}

function createBuildSidebarMessageOptions(
  workspaceSnapshot: ReturnType<typeof createDefaultGroupedSessionWorkspaceSnapshot>,
  browserTabs: Array<{
    detail?: string;
    isActive: boolean;
    label: string;
    sessionId: string;
  }>,
): Parameters<typeof buildSidebarMessage>[0] {
  return {
    activeSnapshot: workspaceSnapshot.groups[0].snapshot,
    browserTabs,
    browserHasLiveProjection: () => false,
    completionBellEnabled: false,
    debuggingMode: false,
    getEffectiveSessionActivity: () => ({
      activity: "idle",
      agentName: undefined,
    }),
    getIsSessionReloading: () => false,
    getSessionAgentLaunch: () => undefined,
    getLastTerminalActivityAt: () => undefined,
    getSessionSnapshot: () => undefined,
    getSidebarAgentIcon: () => undefined,
    getT3ActivityState: () => ({
      activity: "idle",
      isRunning: false,
    }),
    getTerminalTitle: () => undefined,
    hud: createSidebarHudState(),
    pinnedPrompts: [],
    platform: "default",
    previousSessions: [],
    revision: 1,
    scratchPadContent: "",
    terminalHasLiveProjection: () => false,
    type: "sessionState",
    workspaceId: "workspace-1",
    workspaceSnapshot,
  };
}

function createSidebarHudState(): SidebarHydrateMessage["hud"] {
  return {
    activeSessionsSortMode: "manual",
    agentManagerZoomPercent: 100,
    agents: [],
    collapsedSections: {
      actions: false,
      agents: false,
    },
    commands: [],
    completionBellEnabled: false,
    completionSound: "arcade",
    completionSoundLabel: "Arcade",
    debuggingMode: false,
    focusedSessionTitle: undefined,
    git: {
      additions: 0,
      aheadCount: 0,
      behindCount: 0,
      branch: null,
      deletions: 0,
      hasGitHubCli: false,
      hasOriginRemote: false,
      hasUpstream: false,
      hasWorkingTreeChanges: false,
      isBusy: false,
      isRepo: false,
      pr: null,
      primaryAction: "commit",
    },
    highlightedVisibleCount: 1,
    isFocusModeActive: false,
    pendingAgentIds: [],
    sectionVisibility: {
      actions: true,
      agents: true,
      browsers: true,
      git: true,
    },
    createSessionOnSidebarDoubleClick: false,
    renameSessionOnDoubleClick: false,
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
    showLastInteractionTimeOnSessionCards: false,
    theme: "dark-blue",
    viewMode: "grid",
    visibleCount: 1,
    visibleSlotLabels: [],
  };
}

function getSidebarStateMessage(
  message: ReturnType<typeof buildSidebarMessage>,
): SidebarHydrateMessage | SidebarSessionStateMessage {
  if (message.type !== "hydrate" && message.type !== "sessionState") {
    throw new Error(`Expected sidebar state message, received ${message.type}.`);
  }

  return message;
}
