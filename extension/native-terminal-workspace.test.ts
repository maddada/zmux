import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

const testState = vi.hoisted(() => ({
  backends: [] as Array<{
    acknowledgeAttention: ReturnType<typeof vi.fn>;
    canReuseVisibleLayout: ReturnType<typeof vi.fn>;
    createOrAttachSession: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    focusSession: ReturnType<typeof vi.fn>;
    getDebugState: ReturnType<typeof vi.fn>;
    getLastTerminalActivityAt: ReturnType<typeof vi.fn>;
    getSessionSnapshot: ReturnType<typeof vi.fn>;
    hasLiveTerminal: ReturnType<typeof vi.fn>;
    initialize: ReturnType<typeof vi.fn>;
    killSession: ReturnType<typeof vi.fn>;
    onDidActivateSession: ReturnType<typeof vi.fn>;
    onDidChangeDebugState: ReturnType<typeof vi.fn>;
    onDidChangeSessionTitle: ReturnType<typeof vi.fn>;
    onDidChangeSessions: ReturnType<typeof vi.fn>;
    reconcileVisibleTerminals: ReturnType<typeof vi.fn>;
    renameSession: ReturnType<typeof vi.fn>;
    restartSession: ReturnType<typeof vi.fn>;
    syncConfiguration: ReturnType<typeof vi.fn>;
    writeText: ReturnType<typeof vi.fn>;
  }>,
  backend: undefined as
    | {
        acknowledgeAttention: ReturnType<typeof vi.fn>;
        canReuseVisibleLayout: ReturnType<typeof vi.fn>;
        createOrAttachSession: ReturnType<typeof vi.fn>;
        dispose: ReturnType<typeof vi.fn>;
        focusSession: ReturnType<typeof vi.fn>;
        getDebugState: ReturnType<typeof vi.fn>;
        getLastTerminalActivityAt: ReturnType<typeof vi.fn>;
        getSessionSnapshot: ReturnType<typeof vi.fn>;
        hasLiveTerminal: ReturnType<typeof vi.fn>;
        initialize: ReturnType<typeof vi.fn>;
        killSession: ReturnType<typeof vi.fn>;
        onDidActivateSession: ReturnType<typeof vi.fn>;
        onDidChangeDebugState: ReturnType<typeof vi.fn>;
        onDidChangeSessionTitle: ReturnType<typeof vi.fn>;
        onDidChangeSessions: ReturnType<typeof vi.fn>;
        reconcileVisibleTerminals: ReturnType<typeof vi.fn>;
        renameSession: ReturnType<typeof vi.fn>;
        restartSession: ReturnType<typeof vi.fn>;
        syncConfiguration: ReturnType<typeof vi.fn>;
        writeText: ReturnType<typeof vi.fn>;
      }
    | undefined,
  configValues: new Map<string, unknown>(),
  createTerminal: vi.fn(),
  createdTerminals: [] as Array<{
    dispose: ReturnType<typeof vi.fn>;
    exitStatus: unknown;
    options: unknown;
    sendText: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  }>,
  executeCommand: vi.fn(),
  activeColorTheme: {
    kind: 1,
  },
  onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  showInformationMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  showWarningMessage: vi.fn(),
  sidebarResolveView: undefined as (() => Promise<void>) | undefined,
  terminals: [] as unknown[],
  debugPanelPostMessage: vi.fn(async () => {}),
  debugPanelReveal: vi.fn(async () => {}),
  debugPanelHasPanel: vi.fn(() => false),
  sidebarPostMessage: vi.fn(async () => {}),
  t3RuntimeInstances: [] as Array<{
    createThreadSession: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    ensureRunning: ReturnType<typeof vi.fn>;
    getServerOrigin: ReturnType<typeof vi.fn>;
    getWebSocketUrl: ReturnType<typeof vi.fn>;
    setLeaseActive: ReturnType<typeof vi.fn>;
  }>,
  t3Runtime: undefined as
    | {
        createThreadSession: ReturnType<typeof vi.fn>;
        dispose: ReturnType<typeof vi.fn>;
        ensureRunning: ReturnType<typeof vi.fn>;
        getServerOrigin: ReturnType<typeof vi.fn>;
        getWebSocketUrl: ReturnType<typeof vi.fn>;
        setLeaseActive: ReturnType<typeof vi.fn>;
      }
    | undefined,
  t3ActivityMonitorInstances: [] as Array<{
    acknowledgeThread: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    getThreadActivity: ReturnType<typeof vi.fn>;
    onDidChange: ReturnType<typeof vi.fn>;
    refreshSnapshot: ReturnType<typeof vi.fn>;
    setEnabled: ReturnType<typeof vi.fn>;
  }>,
  t3ActivityMonitor: undefined as
    | {
        acknowledgeThread: ReturnType<typeof vi.fn>;
        dispose: ReturnType<typeof vi.fn>;
        getThreadActivity: ReturnType<typeof vi.fn>;
        onDidChange: ReturnType<typeof vi.fn>;
        refreshSnapshot: ReturnType<typeof vi.fn>;
        setEnabled: ReturnType<typeof vi.fn>;
      }
    | undefined,
  t3WebviewManagers: [] as Array<{
    dispose: ReturnType<typeof vi.fn>;
    disposeSession: ReturnType<typeof vi.fn>;
    focusComposer: ReturnType<typeof vi.fn>;
    reconcileVisibleSessions: ReturnType<typeof vi.fn>;
    revealStoredSession: ReturnType<typeof vi.fn>;
  }>,
  t3WebviewManager: undefined as
    | {
        dispose: ReturnType<typeof vi.fn>;
        disposeSession: ReturnType<typeof vi.fn>;
        focusComposer: ReturnType<typeof vi.fn>;
        reconcileVisibleSessions: ReturnType<typeof vi.fn>;
        revealStoredSession: ReturnType<typeof vi.fn>;
      }
    | undefined,
  browserSessionManagers: [] as Array<{
    dispose: ReturnType<typeof vi.fn>;
    disposeSession: ReturnType<typeof vi.fn>;
    hasLiveTab: ReturnType<typeof vi.fn>;
    reconcileVisibleSessions: ReturnType<typeof vi.fn>;
    revealStoredSession: ReturnType<typeof vi.fn>;
  }>,
  browserSessionManager: undefined as
    | {
        dispose: ReturnType<typeof vi.fn>;
        disposeSession: ReturnType<typeof vi.fn>;
        hasLiveTab: ReturnType<typeof vi.fn>;
        reconcileVisibleSessions: ReturnType<typeof vi.fn>;
        revealStoredSession: ReturnType<typeof vi.fn>;
      }
    | undefined,
}));

vi.mock("vscode", () => ({
  ColorThemeKind: {
    Light: 1,
  },
  ThemeIcon: class ThemeIcon {},
  ViewColumn: {
    One: 1,
    Nine: 9,
  },
  TerminalLocation: {
    Panel: "panel",
  },
  commands: {
    executeCommand: testState.executeCommand,
  },
  window: {
    activeColorTheme: testState.activeColorTheme,
    createTerminal: testState.createTerminal,
    get terminals() {
      return testState.terminals;
    },
    onDidChangeActiveColorTheme: testState.onDidChangeActiveColorTheme,
    showInformationMessage: testState.showInformationMessage,
    showInputBox: testState.showInputBox,
    showQuickPick: testState.showQuickPick,
    showWarningMessage: testState.showWarningMessage,
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: (key: string, defaultValue?: unknown) =>
        testState.configValues.has(key) ? testState.configValues.get(key) : defaultValue,
    })),
    isTrusted: true,
    onDidChangeConfiguration: testState.onDidChangeConfiguration,
    workspaceFile: undefined,
    workspaceFolders: [
      {
        uri: {
          fsPath: "/workspace",
          toString: () => "file:///workspace",
        },
      },
    ],
  },
}));

vi.mock("./session-sidebar-view", () => ({
  SessionSidebarViewProvider: class SessionSidebarViewProvider {
    public constructor(options: { onDidResolveView?: () => void | Promise<void> }) {
      testState.sidebarResolveView = async () => {
        await options.onDidResolveView?.();
      };
    }

    public async postMessage(message: unknown): Promise<void> {
      await testState.sidebarPostMessage(message);
    }

    public async reveal(): Promise<void> {}

    public dispose(): void {}
  },
}));

vi.mock("./native-terminal-debug-panel", () => ({
  NativeTerminalDebugPanel: class NativeTerminalDebugPanel {
    public async postMessage(message: unknown): Promise<void> {
      await testState.debugPanelPostMessage(message);
    }

    public async reveal(): Promise<void> {
      await testState.debugPanelReveal();
    }

    public hasPanel(): boolean {
      return testState.debugPanelHasPanel();
    }

    public dispose(): void {}
  },
}));

vi.mock("./native-terminal-workspace-backend", () => ({
  NativeTerminalWorkspaceBackend: class NativeTerminalWorkspaceBackend {
    public constructor() {
      testState.backend = {
        acknowledgeAttention: vi.fn(async () => false),
        canReuseVisibleLayout: vi.fn(() => true),
        createOrAttachSession: vi.fn(),
        dispose: vi.fn(),
        focusSession: vi.fn(async () => true),
        getDebugState: vi.fn(() => ({
          currentMoveAction: undefined,
          lastVisibleSnapshot: undefined,
          layout: {
            activeTerminalName: undefined,
            editorSurfaceGroups: [],
            parkedTerminals: [],
            processAssociations: [],
            projections: [],
            rawTabGroups: [],
            terminalCount: 0,
            terminalNames: [],
            trackedSessionIds: [],
          },
          matchVisibleTerminalOrder: false,
          moveHistory: [],
          nativeTerminalActionDelayMs: 0,
          observedAt: "2026-03-22T00:00:00.000Z",
          workspaceId: "workspace-id",
        })),
        getLastTerminalActivityAt: vi.fn(),
        getSessionSnapshot: vi.fn(() => undefined),
        hasLiveTerminal: vi.fn(() => true),
        initialize: vi.fn(),
        killSession: vi.fn(),
        onDidActivateSession: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeDebugState: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeSessionTitle: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeSessions: vi.fn(() => ({ dispose: vi.fn() })),
        reconcileVisibleTerminals: vi.fn(),
        renameSession: vi.fn(),
        restartSession: vi.fn(),
        syncConfiguration: vi.fn(),
        writeText: vi.fn(),
      };
      testState.backends.push(testState.backend);

      return testState.backend;
    }
  },
}));

vi.mock("./t3-runtime-manager", () => ({
  T3RuntimeManager: class T3RuntimeManager {
    public constructor() {
      testState.t3Runtime = {
        createThreadSession: vi.fn(async () => ({
          projectId: "project-1",
          serverOrigin: "http://127.0.0.1:3773",
          threadId: "thread-1",
          workspaceRoot: "/workspace",
        })),
        dispose: vi.fn(),
        ensureRunning: vi.fn(async () => "http://127.0.0.1:3773"),
        getServerOrigin: vi.fn(() => "http://127.0.0.1:3773"),
        getWebSocketUrl: vi.fn(() => "ws://127.0.0.1:3773"),
        setLeaseActive: vi.fn(async () => {}),
      };
      testState.t3RuntimeInstances.push(testState.t3Runtime);
      return testState.t3Runtime;
    }
  },
}));

vi.mock("./t3-activity-monitor", () => ({
  T3ActivityMonitor: class T3ActivityMonitor {
    public constructor() {
      testState.t3ActivityMonitor = {
        acknowledgeThread: vi.fn(() => false),
        dispose: vi.fn(),
        getThreadActivity: vi.fn(() => undefined),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        refreshSnapshot: vi.fn(async () => {}),
        setEnabled: vi.fn(async () => {}),
      };
      testState.t3ActivityMonitorInstances.push(testState.t3ActivityMonitor);
      return testState.t3ActivityMonitor;
    }
  },
}));

vi.mock("./t3-webview-manager", () => ({
  T3WebviewManager: class T3WebviewManager {
    public constructor() {
      testState.t3WebviewManager = {
        dispose: vi.fn(),
        disposeSession: vi.fn(),
        focusComposer: vi.fn(),
        reconcileVisibleSessions: vi.fn(async () => {}),
        revealStoredSession: vi.fn(async () => {}),
      };
      testState.t3WebviewManagers.push(testState.t3WebviewManager);
      return testState.t3WebviewManager;
    }
  },
}));

vi.mock("./browser-session-manager", () => ({
  BrowserSessionManager: class BrowserSessionManager {
    public constructor() {
      testState.browserSessionManager = {
        dispose: vi.fn(),
        disposeSession: vi.fn(async () => {}),
        hasLiveTab: vi.fn(() => false),
        reconcileVisibleSessions: vi.fn(async () => {}),
        revealStoredSession: vi.fn(async () => {}),
      };
      testState.browserSessionManagers.push(testState.browserSessionManager);
      return testState.browserSessionManager;
    }
  },
}));

import type { GroupedSessionWorkspaceSnapshot } from "../shared/session-grid-contract";
import {
  createSessionAlias,
  createDefaultGroupedSessionWorkspaceSnapshot,
  createDefaultSessionGridSnapshot,
  createSessionRecord,
} from "../shared/session-grid-contract";
import type { PreviousSessionHistoryEntry } from "./previous-session-history";
import { getWorkspaceId, getWorkspaceStorageKey } from "./terminal-workspace-helpers";
import { NativeTerminalWorkspaceController } from "./native-terminal-workspace";

describe("NativeTerminalWorkspaceController rename session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    testState.backends.length = 0;
    testState.backend = undefined;
    testState.configValues.clear();
    testState.createdTerminals.length = 0;
    testState.createTerminal.mockReset();
    testState.createTerminal.mockImplementation((options: unknown) => {
      const terminal = {
        dispose: vi.fn(),
        exitStatus: undefined,
        options,
        sendText: vi.fn(),
        show: vi.fn(),
      };
      testState.createdTerminals.push(terminal);
      return terminal;
    });
    testState.executeCommand.mockReset();
    testState.onDidChangeActiveColorTheme.mockClear();
    testState.onDidChangeConfiguration.mockClear();
    testState.showInformationMessage.mockReset();
    testState.showInputBox.mockReset();
    testState.showQuickPick.mockReset();
    testState.showWarningMessage.mockReset();
    testState.sidebarResolveView = undefined;
    testState.terminals = [];
    testState.debugPanelPostMessage.mockReset();
    testState.debugPanelPostMessage.mockResolvedValue(undefined);
    testState.debugPanelReveal.mockReset();
    testState.debugPanelReveal.mockResolvedValue(undefined);
    testState.debugPanelHasPanel.mockReset();
    testState.debugPanelHasPanel.mockReturnValue(false);
    testState.sidebarPostMessage.mockReset();
    testState.sidebarPostMessage.mockResolvedValue(undefined);
    testState.t3RuntimeInstances.length = 0;
    testState.t3Runtime = undefined;
    testState.t3ActivityMonitorInstances.length = 0;
    testState.t3ActivityMonitor = undefined;
    testState.t3WebviewManagers.length = 0;
    testState.t3WebviewManager = undefined;
    testState.browserSessionManagers.length = 0;
    testState.browserSessionManager = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should still stage /rename when the submitted alias is unchanged", async () => {
    testState.configValues.set("sendRenameCommandOnSidebarRename", true);
    const session = {
      ...createSessionRecord(3, 0),
      alias: "Harbor Vale",
    };
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    testState.showInputBox.mockResolvedValue(session.alias);

    await controller.promptRenameSession(session.sessionId);

    expect(testState.backend?.writeText).toHaveBeenCalledWith(
      session.sessionId,
      `/rename ${session.alias}`,
      false,
    );
    expect(testState.backend?.renameSession).not.toHaveBeenCalled();
  });

  test("should open the move debug inspector and publish the current sidebar state", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    await controller.openDebugInspector();

    expect(testState.debugPanelReveal).toHaveBeenCalledTimes(1);
    expect(testState.debugPanelPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          sidebar: expect.objectContaining({
            groups: expect.any(Array),
            hud: expect.objectContaining({
              debuggingMode: false,
            }),
          }),
        }),
        type: "hydrate",
      }),
    );
  });

  test("should let only the first window own native terminal reconciliation", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const sharedGlobalValues = new Map<string, unknown>();
    const sharedGlobalStoragePath = `/tmp/vsmux-native-terminal-owner-test-${Math.random()
      .toString(36)
      .slice(2)}`;
    const firstController = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues, sharedGlobalStoragePath),
    );
    const firstBackend = testState.backends[0];

    await firstController.initialize();

    expect(firstBackend?.initialize).toHaveBeenCalledTimes(1);
    expect(firstBackend?.reconcileVisibleTerminals).toHaveBeenCalledTimes(1);

    const secondController = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues, sharedGlobalStoragePath),
    );
    const secondBackend = testState.backends[1];

    await secondController.initialize();

    expect(secondBackend?.initialize).not.toHaveBeenCalled();
    expect(secondBackend?.reconcileVisibleTerminals).not.toHaveBeenCalled();
  });

  test("should run sidebar commands in a new panel terminal instead of the VSmux backend", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [
        [
          "VSmux.sidebarCommands",
          [
            {
              closeTerminalOnExit: false,
              command: "vp dev",
              commandId: "dev",
              isDefault: true,
              name: "Dev",
            },
          ],
        ],
      ]),
    );

    await controller.runSidebarCommand("dev");

    expect(testState.createTerminal).toHaveBeenCalledTimes(1);
    expect(testState.createdTerminals[0]?.options).toMatchObject({
      cwd: "/workspace",
      isTransient: true,
      location: "panel",
      name: "VSmux: Dev",
    });
    expect(testState.createdTerminals[0]?.show).toHaveBeenCalledWith(true);
    expect(testState.createdTerminals[0]?.sendText).toHaveBeenCalledWith("vp dev", true);
    expect(testState.backend?.writeText).not.toHaveBeenCalled();
  });

  test("should dispose the new panel terminal when close-after-run is enabled", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [
        [
          "VSmux.sidebarCommands",
          [
            {
              closeTerminalOnExit: true,
              command: "vp test",
              commandId: "test",
              isDefault: true,
              name: "Test",
            },
          ],
        ],
      ]),
    );

    await controller.runSidebarCommand("test");

    const terminal = testState.createdTerminals[0];
    expect(terminal?.options).toMatchObject({
      cwd: "/workspace",
      isTransient: true,
      location: "panel",
      name: "VSmux: Test",
      shellArgs: ["-l", "-c", "vp test"],
    });
    expect(terminal?.sendText).not.toHaveBeenCalled();
    terminal!.exitStatus = { code: 0 };
    await vi.advanceTimersByTimeAsync(250);

    expect(terminal?.dispose).toHaveBeenCalledTimes(1);
    expect(testState.backend?.writeText).not.toHaveBeenCalled();
  });

  test("should create a browser session for browser actions", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [
        [
          "VSmux.sidebarCommands",
          [
            {
              actionType: "browser",
              closeTerminalOnExit: false,
              commandId: "docs",
              isDefault: false,
              name: "Docs",
              url: "https://example.com/docs",
            },
          ],
        ],
      ]),
    );

    await controller.runSidebarCommand("docs");

    expect(testState.createTerminal).not.toHaveBeenCalled();
    expect(testState.backend?.createOrAttachSession).toHaveBeenCalledTimes(1);
    expect(testState.backend?.createOrAttachSession).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: {
          url: "https://example.com/docs",
        },
        kind: "browser",
        title: "Docs",
      }),
    );
    expect(testState.browserSessionManager?.reconcileVisibleSessions).toHaveBeenCalled();
  });

  test("should keep the generated alias and attach the selected agent icon for sidebar agents", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));
    const generatedAlias = createSessionAlias(4, 1);

    await controller.runSidebarAgent("codex");

    expect(testState.backend?.createOrAttachSession).toHaveBeenCalledTimes(1);
    expect(testState.backend?.createOrAttachSession.mock.calls[0]?.[0]).toMatchObject({
      alias: generatedAlias,
      sessionId: "session-4",
      title: "Session 4",
    });
    expect(testState.sidebarPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            sessions: expect.arrayContaining([
              expect.objectContaining({
                agentIcon: "codex",
                alias: generatedAlias,
                sessionId: "session-4",
              }),
            ]),
          }),
        ]),
      }),
    );
    expect(testState.backend?.writeText).toHaveBeenCalledWith("session-4", "codex", true);
  });

  test("should recreate a missing terminal when clicking an already-focused exited session", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    workspaceSnapshot.groups[0]!.snapshot.focusedSessionId = session.sessionId;
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    testState.backend?.getSessionSnapshot.mockReturnValue({
      status: "exited",
    });
    testState.backend?.hasLiveTerminal.mockReturnValue(false);

    await controller.focusSession(session.sessionId);

    expect(testState.backend?.focusSession).not.toHaveBeenCalled();
    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalledTimes(1);
  });

  test("should re-focus the running terminal when clicking an already-focused live session", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    workspaceSnapshot.groups[0]!.snapshot.focusedSessionId = session.sessionId;
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    testState.backend?.getSessionSnapshot.mockReturnValue({
      status: "running",
    });
    testState.backend?.hasLiveTerminal.mockReturnValue(true);
    testState.backend?.focusSession.mockResolvedValue(true);

    await controller.focusSession(session.sessionId);

    expect(testState.backend?.focusSession).toHaveBeenCalledWith(session.sessionId, false);
    expect(testState.backend?.reconcileVisibleTerminals).not.toHaveBeenCalled();
  });

  test("should publish closed sessions as not running in the sidebar when the terminal is gone", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    testState.backend?.getSessionSnapshot.mockReturnValue({
      status: "running",
    });
    testState.backend?.hasLiveTerminal.mockReturnValue(false);

    await controller.openWorkspace();

    expect(testState.sidebarPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            sessions: expect.arrayContaining([
              expect.objectContaining({
                isRunning: false,
                sessionId: session.sessionId,
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  test("should publish visible browser sessions as running in the sidebar", async () => {
    const session = createSessionRecord(3, 0, {
      browser: {
        url: "https://example.com/docs",
      },
      kind: "browser",
      title: "Docs",
    });
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    await controller.openWorkspace();

    expect(testState.sidebarPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            sessions: expect.arrayContaining([
              expect.objectContaining({
                detail: "https://example.com/docs",
                isRunning: true,
                primaryTitle: "Docs",
                sessionId: session.sessionId,
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  test("should not save browser sessions into previous session history", async () => {
    vi.setSystemTime(new Date("2026-03-22T08:15:00.000Z"));
    const session = createSessionRecord(3, 0, {
      browser: {
        url: "https://example.com/docs",
      },
      kind: "browser",
      title: "Docs",
    });
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    await controller.closeSession(session.sessionId);

    expect(testState.sidebarPostMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previousSessions: [],
      }),
    );
  });

  test("should show the sidebar welcome only once after the view is first resolved", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const sharedGlobalValues = new Map<string, unknown>();
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues),
    );

    testState.showInformationMessage.mockResolvedValue("OK");

    await testState.sidebarResolveView?.();
    await testState.sidebarResolveView?.();

    expect(testState.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(sharedGlobalValues.get("VSmux.sidebarWelcomeDismissed")).toBe(true);
    controller.dispose();
  });

  test("should only acknowledge the welcome from its OK action", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const sharedGlobalValues = new Map<string, unknown>();
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues),
    );

    testState.showInformationMessage.mockResolvedValue("OK");

    await testState.sidebarResolveView?.();

    expect(testState.showInformationMessage).toHaveBeenCalledWith(
      "Welcome to VSmux",
      expect.objectContaining({
        modal: true,
      }),
      "OK",
    );
    expect(sharedGlobalValues.get("VSmux.sidebarWelcomeDismissed")).toBe(true);
    controller.dispose();
  });

  test("should reveal the secondary sidebar container after VSmux has been moved there", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const sharedGlobalValues = new Map<string, unknown>([
      ["VSmux.sidebarLocationInSecondary", true],
      ["VSmux.sidebarWelcomeDismissed", true],
    ]);
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues),
    );

    await controller.openWorkspace();

    expect(testState.executeCommand).toHaveBeenCalledWith(
      "workbench.view.extension.VSmuxSessionsSecondary",
    );
    controller.dispose();
  });

  test("should open both sidebars and show drag instructions when asked to move sides", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const sharedGlobalValues = new Map<string, unknown>([
      ["VSmux.sidebarLocationInSecondary", true],
      ["VSmux.sidebarWelcomeDismissed", true],
    ]);
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues),
    );

    await controller.moveSidebarToOtherSide();

    expect(testState.executeCommand).toHaveBeenCalledWith("workbench.view.extension.VSmuxSessions");
    expect(testState.executeCommand).toHaveBeenCalledWith("workbench.action.focusAuxiliaryBar");
    expect(testState.showInformationMessage).toHaveBeenCalledWith(
      "Drag the VSmux icon to the other side to move it.",
      expect.objectContaining({
        detail: expect.stringContaining("primary and secondary sidebars are open now"),
      }),
      "OK",
    );
    expect(sharedGlobalValues.get("VSmux.sidebarLocationInSecondary")).toBe(true);
    controller.dispose();
  });

  test("should describe sessions as managed by another window when this window is not the owner", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const ownerStorageKey = getWorkspaceStorageKey(
      "VSmux.nativeTerminalControlOwner",
      getWorkspaceId(),
    );
    const sharedGlobalValues = new Map<string, unknown>([
      [
        ownerStorageKey,
        {
          terminalCount: 1,
          updatedAt: Date.now(),
          windowId: "other-window",
        },
      ],
    ]);
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues),
    );

    await (controller as any).refreshSidebar("hydrate");

    expect(testState.sidebarPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            sessions: expect.arrayContaining([
              expect.objectContaining({
                detail: "Managed in another VS Code window",
                isRunning: false,
                sessionId: session.sessionId,
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  test("should take ownership when this window has more managed terminals than the stored owner lease", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const workspaceId = getWorkspaceId();
    const ownerStorageKey = getWorkspaceStorageKey("VSmux.nativeTerminalControlOwner", workspaceId);
    const sharedGlobalValues = new Map<string, unknown>([
      [
        ownerStorageKey,
        {
          terminalCount: 0,
          updatedAt: Date.now(),
          windowId: "other-window",
        },
      ],
    ]);
    testState.terminals = [
      {
        creationOptions: {
          env: {
            VSMUX_SESSION_ID: session.sessionId,
            VSMUX_WORKSPACE_ID: workspaceId,
          },
          name: session.alias,
        },
        name: session.alias,
      },
    ];

    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [], sharedGlobalValues),
    );

    await controller.openWorkspace();

    expect(testState.backend?.initialize).toHaveBeenCalledTimes(1);
    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalledTimes(1);
    expect((sharedGlobalValues.get(ownerStorageKey) as { windowId: string }).windowId).not.toBe(
      "other-window",
    );
  });

  test("should send a codex resume command after recreating a closed sidebar-agent session", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));
    const generatedAlias = createSessionAlias(4, 1);

    await controller.runSidebarAgent("codex");

    testState.backend?.writeText.mockClear();
    testState.backend?.getSessionSnapshot.mockReturnValue({
      status: "running",
    });
    testState.backend?.hasLiveTerminal.mockReturnValue(false);

    await controller.focusSession("session-4");

    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalled();
    expect(testState.backend?.writeText).toHaveBeenCalledWith(
      "session-4",
      `codex resume '${generatedAlias}'`,
      true,
    );
  });

  test("should send a claude resume command after recreating a closed claude session", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));
    const generatedAlias = createSessionAlias(4, 1);

    await controller.runSidebarAgent("claude");

    testState.backend?.writeText.mockClear();
    testState.backend?.getSessionSnapshot.mockReturnValue({
      status: "running",
    });
    testState.backend?.hasLiveTerminal.mockReturnValue(false);

    await controller.focusSession("session-4");

    expect(testState.backend?.writeText).toHaveBeenCalledWith(
      "session-4",
      `claude -r '${generatedAlias}'`,
      true,
    );
  });

  test("should send an opencode continue command after recreating a closed opencode session", async () => {
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    await controller.runSidebarAgent("opencode");

    testState.backend?.writeText.mockClear();
    testState.backend?.getSessionSnapshot.mockReturnValue({
      status: "running",
    });
    testState.backend?.hasLiveTerminal.mockReturnValue(false);

    await controller.focusSession("session-4");

    expect(testState.backend?.writeText).toHaveBeenCalledWith(
      "session-4",
      "opencode --continue",
      true,
    );
  });

  test("should ensure the T3 runtime is running before restoring visible T3 sessions on initialize", async () => {
    const session = createSessionRecord(3, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    await controller.initialize();

    expect(testState.t3Runtime?.ensureRunning).toHaveBeenCalledWith("/workspace");
    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalledTimes(1);
    expect(testState.t3WebviewManager?.reconcileVisibleSessions).toHaveBeenCalledTimes(1);
  });

  test("should ensure the T3 runtime is running before revealing an already-visible focused T3 session", async () => {
    const session = createSessionRecord(3, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    workspaceSnapshot.groups[0]!.snapshot.focusedSessionId = session.sessionId;
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    testState.backend?.getSessionSnapshot.mockReturnValue({
      status: "running",
    });
    testState.backend?.hasLiveTerminal.mockReturnValue(true);
    testState.backend?.focusSession.mockResolvedValue(true);

    await controller.focusSession(session.sessionId);

    expect(testState.t3Runtime?.ensureRunning).toHaveBeenCalledWith("/workspace");
    expect(testState.t3WebviewManager?.revealStoredSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.sessionId,
      }),
      expect.any(Object),
      false,
    );
    expect(testState.t3WebviewManager?.focusComposer).toHaveBeenCalledWith(session.sessionId);
  });

  test("should surface T3 sidebar activity from the T3 activity monitor", async () => {
    const session = createSessionRecord(3, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    testState.t3ActivityMonitor?.getThreadActivity.mockReturnValue({
      activity: "working",
      isRunning: true,
    });

    await controller.initialize();

    expect(testState.sidebarPostMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            sessions: expect.arrayContaining([
              expect.objectContaining({
                activity: "working",
                activityLabel: "T3 active",
                isRunning: true,
                sessionId: session.sessionId,
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  test("should surface closed sessions in previous session history", async () => {
    vi.setSystemTime(new Date("2026-03-22T08:15:00.000Z"));
    const session = createSessionRecord(3, 0);
    const workspaceSnapshot = createWorkspaceSnapshot(session);
    const controller = new NativeTerminalWorkspaceController(createContext(workspaceSnapshot));

    await controller.closeSession(session.sessionId);

    expect(testState.sidebarPostMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previousSessions: expect.arrayContaining([
          expect.objectContaining({
            alias: session.alias,
            closedAt: "2026-03-22T08:15:00.000Z",
            isFocused: false,
            isRunning: false,
            isVisible: false,
            sessionId: session.sessionId,
          }),
        ]),
      }),
    );
  });

  test("should restore a previous session with its agent-specific resume command", async () => {
    const archivedSession = createSessionRecord(3, 0);
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const historyEntry: PreviousSessionHistoryEntry = {
      agentIcon: "codex",
      agentLaunch: {
        agentId: "codex",
        command: "codex",
      },
      closedAt: "2026-03-22T08:15:00.000Z",
      historyId: "history-1",
      sessionRecord: archivedSession,
      sidebarItem: {
        activity: "idle",
        activityLabel: "Codex session",
        agentIcon: "codex",
        alias: archivedSession.alias,
        column: archivedSession.column,
        detail: undefined,
        isFocused: false,
        isRunning: false,
        isVisible: false,
        primaryTitle: archivedSession.title,
        row: archivedSession.row,
        sessionId: archivedSession.sessionId,
        sessionNumber: 3,
        shortcutLabel: "⌃⌥1",
        terminalTitle: undefined,
      },
    };
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [["VSmux.previousSessionHistory", [historyEntry]]]),
    );

    await controller.restorePreviousSession("history-1");

    expect(testState.backend?.createOrAttachSession).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: archivedSession.alias,
        sessionId: "session-1",
      }),
    );
    expect(testState.backend?.writeText).toHaveBeenCalledWith(
      "session-1",
      `codex resume '${archivedSession.alias}'`,
      true,
    );
    expect(testState.sidebarPostMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previousSessions: [],
      }),
    );
  });

  test("should delete a previous session from history", async () => {
    const archivedSession = createSessionRecord(3, 0);
    const workspaceSnapshot = createDefaultGroupedSessionWorkspaceSnapshot();
    const historyEntry: PreviousSessionHistoryEntry = {
      closedAt: "2026-03-22T08:15:00.000Z",
      historyId: "history-1",
      sessionRecord: archivedSession,
      sidebarItem: {
        activity: "idle",
        activityLabel: undefined,
        agentIcon: undefined,
        alias: archivedSession.alias,
        column: archivedSession.column,
        detail: undefined,
        isFocused: false,
        isRunning: false,
        isVisible: false,
        primaryTitle: archivedSession.title,
        row: archivedSession.row,
        sessionId: archivedSession.sessionId,
        sessionNumber: 3,
        shortcutLabel: "⌃⌥1",
        terminalTitle: undefined,
      },
    };
    const controller = new NativeTerminalWorkspaceController(
      createContext(workspaceSnapshot, [["VSmux.previousSessionHistory", [historyEntry]]]),
    );

    await controller.deletePreviousSession("history-1");

    expect(testState.sidebarPostMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previousSessions: [],
      }),
    );
  });
});

function createWorkspaceSnapshot(
  session: ReturnType<typeof createSessionRecord>,
): GroupedSessionWorkspaceSnapshot {
  const snapshot = createDefaultGroupedSessionWorkspaceSnapshot();
  snapshot.groups[0] = {
    ...snapshot.groups[0],
    snapshot: {
      ...createDefaultSessionGridSnapshot(),
      sessions: [session],
      visibleSessionIds: [session.sessionId],
      visibleCount: 1,
    },
  };
  snapshot.nextSessionNumber = 4;
  return snapshot;
}

function createContext(
  snapshot: GroupedSessionWorkspaceSnapshot,
  extraWorkspaceEntries: ReadonlyArray<readonly [string, unknown]> = [],
  sharedGlobalValues?: Map<string, unknown>,
  sharedGlobalStoragePath = `/tmp/vsmux-native-terminal-owner-test-${Math.random()
    .toString(36)
    .slice(2)}`,
) {
  const workspaceValues = new Map<string, unknown>([
    ["VSmux.sessionGridSnapshot", snapshot],
    ...extraWorkspaceEntries,
  ]);
  const globalValues = sharedGlobalValues ?? new Map<string, unknown>();

  return {
    extensionUri: {
      fsPath: "/extension",
      toString: () => "file:///extension",
    },
    globalStorageUri: {
      fsPath: sharedGlobalStoragePath,
      toString: () => `file://${sharedGlobalStoragePath}`,
    },
    globalState: {
      get: <T>(key: string, defaultValue?: T) =>
        (globalValues.has(key) ? globalValues.get(key) : defaultValue) as T,
      update: vi.fn(async (key: string, value: unknown) => {
        globalValues.set(key, value);
      }),
    },
    subscriptions: [],
    workspaceState: {
      get: <T>(key: string, defaultValue?: T) =>
        (workspaceValues.has(key) ? workspaceValues.get(key) : defaultValue) as T,
      update: vi.fn(async (key: string, value: unknown) => {
        workspaceValues.set(key, value);
      }),
    },
  };
}
