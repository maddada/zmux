import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import * as vscode from "vscode";

const testState = vi.hoisted(() => ({
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
  browserManager: undefined as
    | {
        dispose: ReturnType<typeof vi.fn>;
        disposeAllSessions: ReturnType<typeof vi.fn>;
        disposeSession: ReturnType<typeof vi.fn>;
        getDebugState: ReturnType<typeof vi.fn>;
        getObservedActiveSessionId: ReturnType<typeof vi.fn>;
        hasLiveTab: ReturnType<typeof vi.fn>;
        reconcileVisibleSessions: ReturnType<typeof vi.fn>;
        resetDebugTrace: ReturnType<typeof vi.fn>;
        revealAllSessionsInOneGroup: ReturnType<typeof vi.fn>;
        revealStoredSession: ReturnType<typeof vi.fn>;
        syncSessions: ReturnType<typeof vi.fn>;
      }
    | undefined,
  configValues: new Map<string, unknown>(),
  executeCommand: vi.fn(async () => undefined),
  postedSidebarMessages: [] as unknown[],
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  showWarningMessage: vi.fn(),
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
  t3WebviewManager: undefined as
    | {
        dispose: ReturnType<typeof vi.fn>;
        disposeAllSessions: ReturnType<typeof vi.fn>;
        disposeSession: ReturnType<typeof vi.fn>;
        focusComposer: ReturnType<typeof vi.fn>;
        getDebugState: ReturnType<typeof vi.fn>;
        reconcileVisibleSessions: ReturnType<typeof vi.fn>;
        resetDebugTrace: ReturnType<typeof vi.fn>;
        revealStoredSession: ReturnType<typeof vi.fn>;
        syncSessions: ReturnType<typeof vi.fn>;
        waitForSessionReady: ReturnType<typeof vi.fn>;
      }
    | undefined,
  workspaceFolders: [
    {
      uri: {
        fsPath: "/workspace",
        toString: () => "file:///workspace",
      },
    },
  ],
}));

function createStore() {
  const values = new Map<string, unknown>();
  return {
    get: vi.fn((key: string, defaultValue?: unknown) =>
      values.has(key) ? values.get(key) : defaultValue,
    ),
    update: vi.fn(async (key: string, value: unknown) => {
      if (value === undefined) {
        values.delete(key);
      } else {
        values.set(key, value);
      }
    }),
  };
}

vi.mock("vscode", () => ({
  ColorThemeKind: {
    Light: 1,
  },
  TabInputCustom: class TabInputCustom {},
  TabInputTerminal: class TabInputTerminal {},
  TabInputText: class TabInputText {},
  TabInputWebview: class TabInputWebview {},
  ThemeIcon: class ThemeIcon {},
  Uri: {
    joinPath: (...parts: Array<{ fsPath?: string } | string>) => ({
      fsPath: parts
        .map((part) => (typeof part === "string" ? part : (part.fsPath ?? "")))
        .join("/"),
    }),
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
    Nine: 9,
  },
  commands: {
    executeCommand: testState.executeCommand,
  },
  env: {
    clipboard: {
      writeText: vi.fn(async () => undefined),
    },
  },
  extensions: {
    all: [],
    getExtension: vi.fn(() => undefined),
  },
  window: {
    activeColorTheme: {
      kind: 1,
    },
    createTerminal: vi.fn(),
    onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
    showInformationMessage: vi.fn(async () => "OK"),
    showInputBox: testState.showInputBox,
    showQuickPick: testState.showQuickPick,
    showWarningMessage: testState.showWarningMessage,
    tabGroups: {
      activeTabGroup: {
        viewColumn: 1,
      },
      all: [],
      close: vi.fn(async () => undefined),
    },
    terminals: [],
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: (key: string, defaultValue?: unknown) =>
        testState.configValues.has(key) ? testState.configValues.get(key) : defaultValue,
    })),
    isTrusted: true,
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    workspaceFile: undefined,
    workspaceFolders: testState.workspaceFolders,
  },
}));

vi.mock("./native-terminal-workspace-backend", () => ({
  NativeTerminalWorkspaceBackend: class NativeTerminalWorkspaceBackend {
    public readonly acknowledgeAttention = vi.fn(async () => false);
    public readonly canReuseVisibleLayout = vi.fn(() => false);
    public readonly createOrAttachSession = vi.fn(async () => ({
      agentStatus: "idle",
      restoreState: "live",
      sessionId: "session",
      startedAt: new Date().toISOString(),
      status: "running",
      workspaceId: "workspace-1",
    }));
    public readonly dispose = vi.fn();
    public readonly focusSession = vi.fn(async () => true);
    public readonly getDebugState = vi.fn(() => ({
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
      observedAt: new Date().toISOString(),
      workspaceId: "workspace-1",
    }));
    public readonly getLastTerminalActivityAt = vi.fn(() => undefined);
    public readonly getSessionSnapshot = vi.fn(() => undefined);
    public readonly hasLiveTerminal = vi.fn(() => true);
    public readonly initialize = vi.fn(async () => undefined);
    public readonly killSession = vi.fn(async () => undefined);
    public readonly onDidActivateSession = vi.fn(() => ({ dispose: vi.fn() }));
    public readonly onDidChangeDebugState = vi.fn(() => ({ dispose: vi.fn() }));
    public readonly onDidChangeSessionTitle = vi.fn(() => ({ dispose: vi.fn() }));
    public readonly onDidChangeSessions = vi.fn(() => ({ dispose: vi.fn() }));
    public readonly reconcileVisibleTerminals = vi.fn(async () => undefined);
    public readonly renameSession = vi.fn(async () => undefined);
    public readonly restartSession = vi.fn(async () => ({
      agentStatus: "idle",
      restoreState: "live",
      sessionId: "session",
      startedAt: new Date().toISOString(),
      status: "running",
      workspaceId: "workspace-1",
    }));
    public readonly syncConfiguration = vi.fn(async () => undefined);
    public readonly writeText = vi.fn(async () => undefined);

    public constructor() {
      testState.backend = this;
    }
  },
}));

vi.mock("./t3-webview-manager", () => ({
  T3WebviewManager: class T3WebviewManager {
    public readonly dispose = vi.fn();
    public readonly disposeAllSessions = vi.fn();
    public readonly disposeSession = vi.fn();
    public readonly focusComposer = vi.fn();
    public readonly getDebugState = vi.fn(() => ({
      managedPanels: [],
      trackedSessionIds: [],
      workbench: {
        activeTabGroupViewColumn: 1,
        activeTerminalName: undefined,
        tabGroups: [],
        terminals: [],
      },
    }));
    public readonly reconcileVisibleSessions = vi.fn(async () => undefined);
    public readonly resetDebugTrace = vi.fn(async () => undefined);
    public readonly revealStoredSession = vi.fn(async () => undefined);
    public readonly syncSessions = vi.fn();
    public readonly waitForSessionReady = vi.fn(async () => undefined);

    public constructor() {
      testState.t3WebviewManager = this;
    }
  },
}));

vi.mock("./browser-session-manager", () => ({
  BrowserSessionManager: class BrowserSessionManager {
    public readonly dispose = vi.fn();
    public readonly disposeAllSessions = vi.fn();
    public readonly disposeSession = vi.fn();
    public readonly getDebugState = vi.fn(() => ({
      managedTabs: [],
      trackedSessionIds: [],
      workbench: {
        activeTabGroupViewColumn: 1,
        activeTerminalName: undefined,
        tabGroups: [],
        terminals: [],
      },
    }));
    public readonly getObservedActiveSessionId = vi.fn(() => undefined);
    public readonly hasLiveTab = vi.fn(() => false);
    public readonly reconcileVisibleSessions = vi.fn(async () => undefined);
    public readonly resetDebugTrace = vi.fn(async () => undefined);
    public readonly revealAllSessionsInOneGroup = vi.fn(async () => undefined);
    public readonly revealStoredSession = vi.fn(async () => undefined);
    public readonly syncSessions = vi.fn();

    public constructor() {
      testState.browserManager = this;
    }
  },
}));

vi.mock("./t3-activity-monitor", () => ({
  T3ActivityMonitor: class T3ActivityMonitor {
    public readonly acknowledgeThread = vi.fn(() => false);
    public readonly dispose = vi.fn();
    public readonly getThreadActivity = vi.fn(() => undefined);
    public readonly onDidChange = vi.fn(() => ({ dispose: vi.fn() }));
    public readonly refreshSnapshot = vi.fn(async () => undefined);
    public readonly setEnabled = vi.fn(async () => undefined);

    public constructor() {
      testState.t3ActivityMonitor = this;
    }
  },
}));

vi.mock("./t3-runtime-manager", () => ({
  T3RuntimeManager: class T3RuntimeManager {
    public readonly createThreadSession = vi.fn(async () => ({
      projectId: "project-1",
      serverOrigin: "http://127.0.0.1:3773",
      threadId: "thread-1",
      workspaceRoot: "/workspace",
    }));
    public readonly dispose = vi.fn();
    public readonly ensureRunning = vi.fn(async () => "http://127.0.0.1:3773");
    public readonly getServerOrigin = vi.fn(() => "http://127.0.0.1:3773");
    public readonly getWebSocketUrl = vi.fn(() => "ws://127.0.0.1:3773");
    public readonly setLeaseActive = vi.fn(async () => undefined);

    public constructor() {
      testState.t3Runtime = this;
    }
  },
}));

vi.mock("./session-sidebar-view", () => ({
  SessionSidebarViewProvider: class SessionSidebarViewProvider {
    public constructor(_options: { onDidResolveView?: () => void | Promise<void> }) {}

    public async postMessage(message: unknown): Promise<void> {
      testState.postedSidebarMessages.push(message);
    }

    public async reveal(): Promise<void> {}

    public dispose(): void {}
  },
}));

vi.mock("./native-terminal-debug-panel", () => ({
  NativeTerminalDebugPanel: class NativeTerminalDebugPanel {
    public constructor() {}
    public dispose(): void {}
    public hasPanel(): boolean {
      return false;
    }
    public async postMessage(): Promise<void> {}
    public async reveal(): Promise<void> {}
  },
}));

import { NativeTerminalWorkspaceController } from "./native-terminal-workspace";

describe("NativeTerminalWorkspaceController", () => {
  beforeEach(() => {
    testState.backend = undefined;
    testState.browserManager = undefined;
    testState.configValues.clear();
    testState.executeCommand.mockClear();
    testState.postedSidebarMessages.length = 0;
    testState.showInputBox.mockReset();
    testState.showQuickPick.mockReset();
    testState.showWarningMessage.mockReset();
    testState.t3ActivityMonitor = undefined;
    testState.t3Runtime = undefined;
    testState.t3WebviewManager = undefined;
  });

  test("should initialize the backend and sync external session managers", async () => {
    const controller = createController();
    await (controller as any).store.createSession();
    await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    await (controller as any).store.createSession({
      browser: {
        url: "https://example.com",
      },
      kind: "browser",
      title: "Docs",
    });

    await controller.initialize();

    expect(testState.backend?.initialize).toHaveBeenCalled();
    expect(testState.t3WebviewManager?.syncSessions).toHaveBeenCalled();
    expect(testState.browserManager?.syncSessions).toHaveBeenCalled();
    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalled();
    expect(testState.postedSidebarMessages.length).toBeGreaterThan(0);
  });

  test("should focus the T3 composer after switching to a different visible T3 session", async () => {
    const controller = createController();
    const firstSession = await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const session = await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-2",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });

    await controller.initialize();
    await (controller as any).store.focusSession(firstSession!.sessionId);
    await controller.focusSession(session!.sessionId);

    expect(testState.t3WebviewManager?.focusComposer).toHaveBeenCalledWith(session!.sessionId);
  });

  test("should focus an already present hidden terminal tab without reprojecting the layout", async () => {
    const controller = createController();
    const hiddenT3Session = await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const visibleT3Session = await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-2",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const firstTerminal = await (controller as any).store.createSession({
      alias: "Fixing layout issues",
    });
    const secondTerminal = await (controller as any).store.createSession({
      alias: "Atlas",
    });
    await (controller as any).store.setVisibleCount(2);
    await (controller as any).store.focusSession(secondTerminal!.sessionId);

    (vscode.window.tabGroups.all as any) = [
      {
        activeTab: { label: `[${visibleT3Session!.displayId}] T3: ${visibleT3Session!.alias}` },
        isActive: false,
        tabs: [
          {
            isActive: false,
            label: `[${hiddenT3Session!.displayId}] T3: ${hiddenT3Session!.alias}`,
          },
          {
            isActive: true,
            label: `[${visibleT3Session!.displayId}] T3: ${visibleT3Session!.alias}`,
          },
        ],
        viewColumn: 1,
      },
      {
        activeTab: { label: `[${secondTerminal!.displayId}] ${secondTerminal!.alias}` },
        isActive: true,
        tabs: [
          { isActive: false, label: `[${firstTerminal!.displayId}] ${firstTerminal!.alias}` },
          { isActive: true, label: `[${secondTerminal!.displayId}] ${secondTerminal!.alias}` },
        ],
        viewColumn: 2,
      },
    ];
    (vscode.window.tabGroups.activeTabGroup as any) = (vscode.window.tabGroups.all as any)[1];

    await controller.initialize();
    testState.backend?.reconcileVisibleTerminals.mockClear();
    testState.t3WebviewManager?.reconcileVisibleSessions.mockClear();
    testState.browserManager?.reconcileVisibleSessions.mockClear();
    testState.backend?.focusSession.mockClear();

    await controller.focusSession(firstTerminal!.sessionId);

    expect(testState.backend?.reconcileVisibleTerminals).not.toHaveBeenCalled();
    expect(testState.t3WebviewManager?.reconcileVisibleSessions).not.toHaveBeenCalled();
    expect(testState.browserManager?.reconcileVisibleSessions).not.toHaveBeenCalled();
    expect(testState.backend?.focusSession).toHaveBeenCalledWith(firstTerminal!.sessionId, false);
    expect((controller as any).store.getActiveGroup()?.snapshot.visibleSessionIds).toEqual([
      visibleT3Session!.sessionId,
      firstTerminal!.sessionId,
    ]);
    expect((controller as any).store.getActiveGroup()?.snapshot.focusedSessionId).toBe(
      firstTerminal!.sessionId,
    );
  });

  test("should preserve the other visible session when a hidden tab from the non-focused group is activated", async () => {
    const controller = createController();
    const hiddenT3Session = await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const visibleT3Session = await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-2",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const firstTerminal = await (controller as any).store.createSession({
      alias: "Fixing layout issues",
    });
    const secondTerminal = await (controller as any).store.createSession({
      alias: "Atlas",
    });
    await (controller as any).store.setVisibleCount(2);
    await (controller as any).store.focusSession(secondTerminal!.sessionId);

    (vscode.window.tabGroups.all as any) = [
      {
        activeTab: { label: `[${visibleT3Session!.displayId}] T3: ${visibleT3Session!.alias}` },
        isActive: false,
        tabs: [
          { isActive: false, label: `[${firstTerminal!.displayId}] ${firstTerminal!.alias}` },
          {
            isActive: false,
            label: `[${hiddenT3Session!.displayId}] T3: ${hiddenT3Session!.alias}`,
          },
          {
            isActive: true,
            label: `[${visibleT3Session!.displayId}] T3: ${visibleT3Session!.alias}`,
          },
        ],
        viewColumn: 1,
      },
      {
        activeTab: { label: `[${secondTerminal!.displayId}] ${secondTerminal!.alias}` },
        isActive: true,
        tabs: [
          { isActive: true, label: `[${secondTerminal!.displayId}] ${secondTerminal!.alias}` },
        ],
        viewColumn: 2,
      },
    ];
    (vscode.window.tabGroups.activeTabGroup as any) = (vscode.window.tabGroups.all as any)[1];

    await controller.initialize();
    testState.backend?.reconcileVisibleTerminals.mockClear();
    testState.t3WebviewManager?.reconcileVisibleSessions.mockClear();
    testState.browserManager?.reconcileVisibleSessions.mockClear();
    testState.backend?.focusSession.mockClear();

    await controller.focusSession(firstTerminal!.sessionId);

    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalled();
    expect(testState.t3WebviewManager?.reconcileVisibleSessions).toHaveBeenCalled();
    expect((controller as any).store.getActiveGroup()?.snapshot.visibleSessionIds).toEqual([
      visibleT3Session!.sessionId,
      firstTerminal!.sessionId,
    ]);
    expect((controller as any).store.getActiveGroup()?.snapshot.focusedSessionId).toBe(
      firstTerminal!.sessionId,
    );
  });

  test("should no-op when focusing the already active session", async () => {
    const controller = createController();
    const session = await (controller as any).store.createSession();

    await controller.initialize();
    testState.backend?.reconcileVisibleTerminals.mockClear();
    testState.backend?.focusSession.mockClear();
    testState.t3WebviewManager?.focusComposer.mockClear();

    await controller.focusSession(session!.sessionId);

    expect(testState.backend?.reconcileVisibleTerminals).not.toHaveBeenCalled();
    expect(testState.backend?.focusSession).not.toHaveBeenCalled();
    expect(testState.t3WebviewManager?.focusComposer).not.toHaveBeenCalled();
  });

  test("should create and attach a new terminal session", async () => {
    const controller = createController();

    await controller.initialize();
    await controller.createSession();

    expect(testState.backend?.createOrAttachSession).toHaveBeenCalled();
    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalled();
  });

  test("should switch groups by re-running the single projection pass", async () => {
    const controller = createController();
    const firstSession = await (controller as any).store.createSession();
    const secondSession = await (controller as any).store.createSession();
    await (controller as any).store.createGroupFromSession(secondSession!.sessionId);
    await (controller as any).store.focusSession(firstSession!.sessionId);

    await controller.initialize();
    await controller.focusGroupByIndex(2);

    expect(testState.backend?.reconcileVisibleTerminals).toHaveBeenCalledTimes(2);
    expect(testState.t3WebviewManager?.reconcileVisibleSessions).toHaveBeenCalledTimes(2);
    expect(testState.browserManager?.reconcileVisibleSessions).toHaveBeenCalledTimes(2);
  });

  test("should avoid resetting editor groups when the current layout already matches", async () => {
    const controller = createController();
    await (controller as any).store.createSession();
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "vscode.getEditorLayout") {
        return {
          groups: [{}],
          orientation: 0,
        };
      }

      return undefined;
    });

    await controller.initialize();

    expect(testState.executeCommand).not.toHaveBeenCalledWith("workbench.action.joinAllGroups");
    expect(testState.executeCommand).not.toHaveBeenCalledWith(
      "vscode.setEditorLayout",
      expect.anything(),
    );
  });

  test("should render sidebar visibility and focus from observed foreground tabs", async () => {
    const controller = createController();
    const t3Session = await (controller as any).store.createSession({
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });
    const firstTerminal = await (controller as any).store.createSession();
    const secondTerminal = await (controller as any).store.createSession();
    await (controller as any).store.focusSession(secondTerminal!.sessionId);

    (vscode.window.tabGroups.all as any) = [
      {
        activeTab: { label: `[${t3Session!.displayId}] T3: ${t3Session!.alias}` },
        isActive: false,
        tabs: [{ isActive: true, label: `[${t3Session!.displayId}] T3: ${t3Session!.alias}` }],
        viewColumn: 1,
      },
      {
        activeTab: { label: `[${secondTerminal!.displayId}] ${secondTerminal!.alias}` },
        isActive: true,
        tabs: [
          { isActive: true, label: `[${secondTerminal!.displayId}] ${secondTerminal!.alias}` },
        ],
        viewColumn: 2,
      },
    ];
    (vscode.window.tabGroups.activeTabGroup as any) = (vscode.window.tabGroups.all as any)[1];

    const message = (controller as any).createSidebarMessage("sessionState");
    const expertsGroup = message.groups[0];

    expect(
      expertsGroup.sessions.find((session: any) => session.sessionId === t3Session!.sessionId),
    ).toMatchObject({
      isFocused: false,
      isVisible: true,
    });
    expect(
      expertsGroup.sessions.find((session: any) => session.sessionId === firstTerminal!.sessionId),
    ).toMatchObject({
      isFocused: false,
      isVisible: false,
    });
    expect(
      expertsGroup.sessions.find((session: any) => session.sessionId === secondTerminal!.sessionId),
    ).toMatchObject({
      isFocused: true,
      isVisible: true,
    });
  });
});

function createController() {
  return new NativeTerminalWorkspaceController({
    extensionUri: { fsPath: "/extension" },
    globalState: createStore(),
    globalStorageUri: { fsPath: "/tmp/vsmux" },
    subscriptions: [],
    workspaceState: createStore(),
  } as never);
}
