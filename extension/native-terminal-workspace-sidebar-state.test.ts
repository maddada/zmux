import { describe, expect, test, vi } from "vite-plus/test";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSessionRecord,
  type SidebarHydrateMessage,
  type SidebarSessionStateMessage,
} from "../shared/session-grid-contract";
import { buildSidebarMessage } from "./native-terminal-workspace-sidebar-state";

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

    const message = getSidebarStateMessage(buildSidebarMessage({
      ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
      getT3ActivityState: () => ({
        activity: "idle",
        detail: undefined,
        isRunning: true,
      }),
    }));

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        activity: "idle",
        detail: undefined,
        isRunning: true,
        primaryTitle: "T3 Code",
        sessionId: sessionRecord.sessionId,
      }),
    );
  });

  test("should promote the terminal title to the primary title when the user did not rename the session", () => {
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const sessionRecord = createSessionRecord(1, 0);
    workspaceSnapshot.groups[0].snapshot.sessions = [sessionRecord];
    workspaceSnapshot.groups[0].snapshot.focusedSessionId = sessionRecord.sessionId;
    workspaceSnapshot.groups[0].snapshot.visibleSessionIds = [sessionRecord.sessionId];

    const message = getSidebarStateMessage(buildSidebarMessage({
      ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
      getTerminalTitle: () => "Claude Code",
    }));

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        primaryTitle: "Claude Code",
        terminalTitle: undefined,
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

    const message = getSidebarStateMessage(buildSidebarMessage({
      ...createBuildSidebarMessageOptions(workspaceSnapshot, []),
      getTerminalTitle: () => "Claude Code",
    }));

    expect(message.groups[1]?.sessions[0]).toEqual(
      expect.objectContaining({
        primaryTitle: "Bug Fix",
        terminalTitle: "Claude Code",
      }),
    );
  });
});

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
    getSessionAgentLaunch: () => undefined,
    getSessionSnapshot: () => undefined,
    getSidebarAgentIcon: () => undefined,
    getT3ActivityState: () => ({
      activity: "idle",
      isRunning: false,
    }),
    getTerminalTitle: () => undefined,
    hud: createSidebarHudState(),
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
    agentManagerZoomPercent: 100,
    agents: [],
    commands: [],
    completionBellEnabled: false,
    completionSound: "ping",
    completionSoundLabel: "Ping",
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
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
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
