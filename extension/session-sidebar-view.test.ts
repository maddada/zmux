import { describe, expect, test, vi } from "vite-plus/test";
import {
  SessionSidebarViewProvider,
  isSidebarMessage,
  shouldBypassSidebarMessageQueue,
} from "./session-sidebar-view";

vi.mock("vscode", () => ({
  extensions: {
    all: [],
    getExtension: () => undefined,
  },
  Uri: {
    joinPath: (...parts: unknown[]) => parts,
  },
  workspace: {
    getConfiguration: () => ({
      get: () => false,
    }),
    workspaceFolders: [{ uri: { fsPath: "/workspace" } }],
  },
}));

describe("isSidebarMessage", () => {
  test("should accept runSidebarCommand messages with a debug run mode", () => {
    expect(
      isSidebarMessage({
        commandId: "build",
        runMode: "debug",
        type: "runSidebarCommand",
        worktreePath: "/workspace/demo-project-feature",
      }),
    ).toBe(true);
  });

  test("should reject runSidebarCommand messages with an unknown run mode", () => {
    expect(
      isSidebarMessage({
        commandId: "build",
        runMode: "inspect",
        type: "runSidebarCommand",
      }),
    ).toBe(false);
  });

  test("should reject runSidebarCommand messages with an empty worktree path", () => {
    expect(
      isSidebarMessage({
        commandId: "build",
        type: "runSidebarCommand",
        worktreePath: "",
      }),
    ).toBe(false);
  });

  test("should accept endSidebarCommandRun messages with a command id", () => {
    expect(
      isSidebarMessage({
        commandId: "build",
        type: "endSidebarCommandRun",
      }),
    ).toBe(true);
  });

  test("should accept saveSidebarCommand messages with a valid icon and hex color", () => {
    expect(
      isSidebarMessage({
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm dev",
        icon: "terminal",
        iconColor: "#d6e0f3",
        isGlobal: true,
        name: "",
        playCompletionSound: true,
        type: "saveSidebarCommand",
      }),
    ).toBe(true);
  });

  test("should reject saveSidebarCommand messages with an invalid icon color", () => {
    expect(
      isSidebarMessage({
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm dev",
        icon: "terminal",
        iconColor: "blue",
        name: "",
        playCompletionSound: true,
        type: "saveSidebarCommand",
      }),
    ).toBe(false);
  });

  test("should accept forkSession messages with a session id", () => {
    expect(
      isSidebarMessage({
        sessionId: "session-7",
        type: "forkSession",
      }),
    ).toBe(true);
  });

  test("should reject forkSession messages without a session id", () => {
    expect(
      isSidebarMessage({
        sessionId: "",
        type: "forkSession",
      }),
    ).toBe(false);
  });

  test("should accept setSessionFavorite messages with a boolean favorite value", () => {
    expect(
      isSidebarMessage({
        favorite: true,
        sessionId: "session-7",
        type: "setSessionFavorite",
      }),
    ).toBe(true);
  });

  test("should reject setSessionFavorite messages without a boolean favorite value", () => {
    expect(
      isSidebarMessage({
        favorite: "yes",
        sessionId: "session-7",
        type: "setSessionFavorite",
      }),
    ).toBe(false);
  });
});

describe("shouldBypassSidebarMessageQueue", () => {
  test("should bypass closeSession messages", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        sessionId: "session-7",
        type: "closeSession",
      }),
    ).toBe(true);
  });

  test("should bypass focusSession messages", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        sessionId: "session-7",
        type: "focusSession",
      }),
    ).toBe(true);
  });

  test("should bypass sidebar repro log messages", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        details: {
          sessionId: "session-7",
        },
        event: "repro.sidebarSessionFocusRequested",
        type: "sidebarDebugLog",
      }),
    ).toBe(true);
  });

  test("should keep renameSession messages queued", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        sessionId: "session-7",
        title: "Rename this session",
        type: "renameSession",
      }),
    ).toBe(false);
  });

  test("should bypass sidebar reorder sync messages", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        agentIds: ["codex", "claude"],
        requestId: "req-agent",
        type: "syncSidebarAgentOrder",
      }),
    ).toBe(true);
    expect(
      shouldBypassSidebarMessageQueue({
        commandIds: ["test", "build"],
        requestId: "req-command",
        type: "syncSidebarCommandOrder",
      }),
    ).toBe(true);
  });
});

describe("SessionSidebarViewProvider", () => {
  test("should replay hydrate before the latest session state when the view resolves late", async () => {
    const provider = new SessionSidebarViewProvider({
      onMessage: async () => undefined,
    });
    const postMessage = vi.fn(async () => true);
    const webviewView = createMockWebviewView(postMessage);

    const hydrateMessage = createReplayableSidebarMessage("hydrate", 3, 7);
    const sessionStateMessage = createReplayableSidebarMessage("sessionState", 4, 7);

    await provider.postMessage(hydrateMessage);
    await provider.postMessage(sessionStateMessage);

    provider.resolveWebviewView(webviewView as never, {} as never, {} as never);
    await Promise.resolve();

    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenNthCalledWith(1, hydrateMessage);
    expect(postMessage).toHaveBeenNthCalledWith(2, sessionStateMessage);
  });

  test("should forward sidebar debug log messages to the controller", async () => {
    const onMessage = vi.fn(async () => undefined);
    const provider = new SessionSidebarViewProvider({
      onMessage,
    });
    const postMessage = vi.fn(async () => true);
    const webviewView = createMockWebviewView(postMessage);

    provider.resolveWebviewView(webviewView as never, {} as never, {} as never);

    const receiveMessage = webviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>;
    const callback = receiveMessage.mock.calls.at(0)?.[0] as
      | ((message: unknown) => void)
      | undefined;

    expect(callback).toBeTypeOf("function");

    callback?.({
      details: { step: "moduleStart" },
      event: "repro.sidebarStartup.bootstrap.moduleStart",
      type: "sidebarDebugLog",
    });
    await Promise.resolve();

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({
      details: { step: "moduleStart" },
      event: "repro.sidebarStartup.bootstrap.moduleStart",
      type: "sidebarDebugLog",
    });
  });
});

function createMockWebviewView(postMessage: ReturnType<typeof vi.fn>) {
  const disposable = { dispose() {} };
  return {
    onDidDispose: () => disposable,
    onDidChangeVisibility: () => disposable,
    show: () => undefined,
    viewType: "zmux.sessions",
    visible: true,
    webview: {
      html: "",
      onDidReceiveMessage: vi.fn(() => disposable),
      options: {},
      postMessage,
    },
  };
}

function createReplayableSidebarMessage(
  type: "hydrate" | "sessionState",
  revision: number,
  sessionCount: number,
): Parameters<SessionSidebarViewProvider["postMessage"]>[0] {
  return {
    groups: [
      {
        groupId: "group-1",
        isActive: true,
        isFocusModeActive: false,
        layoutVisibleCount: 1,
        sessions: Array.from({ length: sessionCount }, (_, index) => ({
          activity: "idle",
          kind: "terminal",
          sessionId: `session-${index}`,
          title: `Session ${index}`,
        })),
        title: "Main",
        viewMode: "grid",
        visibleCount: 1,
      },
    ],
    hud: {
      activeSessionsSortMode: "manual",
      agentManagerZoomPercent: 100,
      agents: [],
      collapsedSections: {},
      commands: [],
      completionBellEnabled: false,
      completionSound: "off",
      completionSoundLabel: "Off",
      createSessionOnSidebarDoubleClick: false,
      debuggingMode: false,
      git: {
        availableActions: [],
        hasWorkingTreeChanges: false,
        isGitRepository: false,
      },
      highlightedVisibleCount: 1,
      isFocusModeActive: false,
      pendingAgentIds: [],
      renameSessionOnDoubleClick: false,
      sectionVisibility: {
        actions: true,
        agents: true,
        browsers: true,
        git: true,
      },
      showCloseButtonOnSessionCards: true,
      showHotkeysOnSessionCards: true,
      showLastInteractionTimeOnSessionCards: true,
      theme: "plain-dark",
      viewMode: "grid",
      visibleCount: 1,
      visibleSlotLabels: [],
    },
    pinnedPrompts: [],
    previousSessions: [],
    revision,
    scratchPadContent: "",
    type,
  } as unknown as Parameters<SessionSidebarViewProvider["postMessage"]>[0];
}
