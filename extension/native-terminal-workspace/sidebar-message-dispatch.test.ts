import { describe, expect, test, vi } from "vite-plus/test";
import { dispatchSidebarMessage, type SidebarMessageHandlers } from "./sidebar-message-dispatch";

function createHandlers(): SidebarMessageHandlers {
  return {
    adjustTerminalFontSize: vi.fn(async () => undefined),
    cancelSidebarGitCommit: vi.fn(async () => undefined),
    clearGeneratedPreviousSessions: vi.fn(async () => undefined),
    closeGroup: vi.fn(async () => undefined),
    closeSession: vi.fn(async () => undefined),
    confirmSidebarGitCommit: vi.fn(async () => undefined),
    copyResumeCommand: vi.fn(async () => undefined),
    forkSession: vi.fn(async () => undefined),
    generateSessionName: vi.fn(async () => undefined),
    createGroup: vi.fn(async () => undefined),
    createGroupFromSession: vi.fn(async () => undefined),
    createSession: vi.fn(async () => undefined),
    createSessionInGroup: vi.fn(async () => undefined),
    deletePreviousSession: vi.fn(async () => undefined),
    deleteSidebarAgent: vi.fn(async () => undefined),
    deleteSidebarCommand: vi.fn(async () => undefined),
    endSidebarCommandRun: vi.fn(async () => undefined),
    focusGroup: vi.fn(async () => undefined),
    focusSession: vi.fn(async () => undefined),
    fullReloadGroup: vi.fn(async () => undefined),
    fullReloadSession: vi.fn(async () => undefined),
    killDaemonSession: vi.fn(async () => undefined),
    killTerminalDaemon: vi.fn(async () => undefined),
    killT3RuntimeServer: vi.fn(async () => undefined),
    killT3RuntimeSession: vi.fn(async () => undefined),
    moveSessionToGroup: vi.fn(async () => undefined),
    moveSidebarToOtherSide: vi.fn(async () => undefined),
    openBrowser: vi.fn(async () => undefined),
    openWorkspaceWelcome: vi.fn(async () => undefined),
    openSettings: vi.fn(async () => undefined),
    promptFindPreviousSession: vi.fn(async () => undefined),
    promptRenameSession: vi.fn(async () => undefined),
    refreshDaemonSessions: vi.fn(async () => undefined),
    refreshGitState: vi.fn(async () => undefined),
    renameGroup: vi.fn(async () => undefined),
    renameSession: vi.fn(async () => undefined),
    restartSession: vi.fn(async () => undefined),
    restorePreviousSession: vi.fn(async () => undefined),
    runSidebarAgent: vi.fn(async () => undefined),
    runSidebarCommand: vi.fn(async () => undefined),
    runSidebarGitAction: vi.fn(async () => undefined),
    savePinnedPrompt: vi.fn(async () => undefined),
    saveScratchPad: vi.fn(async () => undefined),
    saveSidebarAgent: vi.fn(async () => undefined),
    saveSidebarCommand: vi.fn(async () => undefined),
    setSidebarGitCommitConfirmationEnabled: vi.fn(async () => undefined),
    setSidebarGitGenerateCommitBodyEnabled: vi.fn(async () => undefined),
    setSidebarGitPrimaryAction: vi.fn(async () => undefined),
    setSidebarSectionCollapsed: vi.fn(async () => undefined),
    setGroupSleeping: vi.fn(async () => undefined),
    setSessionFavorite: vi.fn(async () => undefined),
    setSessionSleeping: vi.fn(async () => undefined),
    toggleActiveSessionsSortMode: vi.fn(async () => undefined),
    toggleShowLastInteractionTimeOnSessionCards: vi.fn(async () => undefined),
    setViewMode: vi.fn(async () => undefined),
    setVisibleCount: vi.fn(async () => undefined),
    syncGroupOrder: vi.fn(async () => undefined),
    syncSessionOrder: vi.fn(async () => undefined),
    syncSidebarAgentOrder: vi.fn(async () => undefined),
    syncSidebarCommandOrder: vi.fn(async () => undefined),
    toggleCompletionBell: vi.fn(async () => undefined),
    toggleFullscreenSession: vi.fn(async () => undefined),
  };
}

describe("dispatchSidebarMessage", () => {
  test("should route runSidebarCommand messages with the requested run mode", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        commandId: "build",
        runMode: "debug",
        type: "runSidebarCommand",
        worktreePath: "/workspace/demo-project-feature",
      },
      handlers,
    );

    expect(handlers.runSidebarCommand).toHaveBeenCalledWith(
      "build",
      "debug",
      "/workspace/demo-project-feature",
    );
  });

  test("should route endSidebarCommandRun messages", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        commandId: "build",
        type: "endSidebarCommandRun",
      },
      handlers,
    );

    expect(handlers.endSidebarCommandRun).toHaveBeenCalledWith("build");
  });

  test("should route saveSidebarCommand icon metadata to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm dev",
        commandId: "dev",
        icon: "terminal",
        iconColor: "#d6e0f3",
        name: "",
        playCompletionSound: true,
        type: "saveSidebarCommand",
      },
      handlers,
    );

    expect(handlers.saveSidebarCommand).toHaveBeenCalledWith(
      "dev",
      "",
      "terminal",
      false,
      true,
      "pnpm dev",
      "terminal",
      "#d6e0f3",
      undefined,
      undefined,
    );
  });

  test("should route forkSession to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        sessionId: "session-3",
        type: "forkSession",
      },
      handlers,
    );

    expect(handlers.forkSession).toHaveBeenCalledWith("session-3");
  });

  test("should route generateSessionName to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        sessionId: "session-3",
        type: "generateSessionName",
      },
      handlers,
    );

    expect(handlers.generateSessionName).toHaveBeenCalledWith("session-3");
  });

  test("should route setSessionSleeping to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        sessionId: "session-3",
        sleeping: true,
        type: "setSessionSleeping",
      },
      handlers,
    );

    expect(handlers.setSessionSleeping).toHaveBeenCalledWith("session-3", true);
  });

  test("should route setSessionFavorite to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        favorite: true,
        sessionId: "session-3",
        type: "setSessionFavorite",
      },
      handlers,
    );

    expect(handlers.setSessionFavorite).toHaveBeenCalledWith("session-3", true);
  });

  test("should route setGroupSleeping to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        groupId: "group-2",
        sleeping: true,
        type: "setGroupSleeping",
      },
      handlers,
    );

    expect(handlers.setGroupSleeping).toHaveBeenCalledWith("group-2", true);
  });

  test("should route savePinnedPrompt to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        content: "Remember the release checklist.\nKeep it brief.",
        promptId: "prompt-1",
        title: "Release checklist",
        type: "savePinnedPrompt",
      },
      handlers,
    );

    expect(handlers.savePinnedPrompt).toHaveBeenCalledWith(
      "prompt-1",
      "Release checklist",
      "Remember the release checklist.\nKeep it brief.",
    );
  });

  test("should route fullReloadGroup to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        groupId: "group-2",
        type: "fullReloadGroup",
      },
      handlers,
    );

    expect(handlers.fullReloadGroup).toHaveBeenCalledWith("group-2");
  });

  test("should route toggleActiveSessionsSortMode to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        type: "toggleActiveSessionsSortMode",
      },
      handlers,
    );

    expect(handlers.toggleActiveSessionsSortMode).toHaveBeenCalledTimes(1);
  });

  test("should route toggleShowLastInteractionTimeOnSessionCards to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        type: "toggleShowLastInteractionTimeOnSessionCards",
      },
      handlers,
    );

    expect(handlers.toggleShowLastInteractionTimeOnSessionCards).toHaveBeenCalledTimes(1);
  });

  test("should route openWorkspaceWelcome to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        type: "openWorkspaceWelcome",
      },
      handlers,
    );

    expect(handlers.openWorkspaceWelcome).toHaveBeenCalledTimes(1);
  });

  test("should route promptFindPreviousSession to the matching handler", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        type: "promptFindPreviousSession",
      },
      handlers,
    );

    expect(handlers.promptFindPreviousSession).toHaveBeenCalledTimes(1);
  });

  test("should route sidebar agent order sync messages with the request id", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        agentIds: ["claude", "codex"],
        requestId: "req-agent",
        type: "syncSidebarAgentOrder",
      },
      handlers,
    );

    expect(handlers.syncSidebarAgentOrder).toHaveBeenCalledWith("req-agent", ["claude", "codex"]);
  });

  test("should route sidebar command order sync messages with the request id", async () => {
    const handlers = createHandlers();

    await dispatchSidebarMessage(
      {
        commandIds: ["test", "build"],
        requestId: "req-command",
        type: "syncSidebarCommandOrder",
      },
      handlers,
    );

    expect(handlers.syncSidebarCommandOrder).toHaveBeenCalledWith("req-command", ["test", "build"]);
  });
});
