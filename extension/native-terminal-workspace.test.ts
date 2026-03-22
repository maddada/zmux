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
  terminals: [] as unknown[],
  debugPanelPostMessage: vi.fn(async () => {}),
  debugPanelReveal: vi.fn(async () => {}),
  debugPanelHasPanel: vi.fn(() => false),
  sidebarPostMessage: vi.fn(async () => {}),
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

import type { GroupedSessionWorkspaceSnapshot } from "../shared/session-grid-contract";
import {
  createSessionAlias,
  createDefaultGroupedSessionWorkspaceSnapshot,
  createDefaultSessionGridSnapshot,
  createSessionRecord,
} from "../shared/session-grid-contract";
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
    testState.terminals = [];
    testState.debugPanelPostMessage.mockReset();
    testState.debugPanelPostMessage.mockResolvedValue(undefined);
    testState.debugPanelReveal.mockReset();
    testState.debugPanelReveal.mockResolvedValue(undefined);
    testState.debugPanelHasPanel.mockReset();
    testState.debugPanelHasPanel.mockReturnValue(false);
    testState.sidebarPostMessage.mockReset();
    testState.sidebarPostMessage.mockResolvedValue(undefined);
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
