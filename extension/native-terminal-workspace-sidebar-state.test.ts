import { describe, expect, test, vi } from "vite-plus/test";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSessionRecord,
  type SidebarHydrateMessage,
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

    const message = buildSidebarMessage(
      createBuildSidebarMessageOptions(workspaceSnapshot, [
        {
          detail: "https://example.com/docs",
          isActive: true,
          label: "Docs",
          sessionId: "browser-tab:docs",
        },
      ]),
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
    const message = buildSidebarMessage(createBuildSidebarMessageOptions(workspaceSnapshot, []));

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
});

function createBuildSidebarMessageOptions(
  workspaceSnapshot: ReturnType<typeof createDefaultGroupedSessionWorkspaceSnapshot>,
  browserTabs: Array<{
    detail?: string;
    isActive: boolean;
    label: string;
    sessionId: string;
  }>,
) {
  return {
    activeSnapshot: workspaceSnapshot.groups[0].snapshot,
    browserTabs,
    browserHasLiveProjection: () => false,
    completionBellEnabled: false,
    debuggingMode: false,
    getEffectiveSessionActivity: () => ({
      activity: "idle" as const,
      agentName: undefined,
    }),
    getSessionAgentLaunch: () => undefined,
    getSessionSnapshot: () => undefined,
    getSidebarAgentIcon: () => undefined,
    getT3ActivityState: () => ({
      activity: "idle" as const,
      isRunning: false,
    }),
    getTerminalTitle: () => undefined,
    hud: createSidebarHudState(),
    ownsNativeTerminalControl: true,
    platform: "default" as const,
    previousSessions: [],
    scratchPadContent: "",
    terminalHasLiveProjection: () => false,
    type: "sessionState" as const,
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
    highlightedVisibleCount: 1,
    isFocusModeActive: false,
    isVsMuxDisabled: false,
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
    theme: "dark-blue",
    viewMode: "grid",
    visibleCount: 1,
    visibleSlotLabels: [],
  };
}
