import { access, mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { createSessionRecord } from "../shared/session-grid-contract";

const testState = vi.hoisted(() => ({
  activeTerminal: undefined as unknown,
  activeViewColumn: 1,
  activeTerminalChangeListeners: [] as Array<(terminal: unknown) => void>,
  closeTerminalListeners: [] as Array<(terminal: unknown) => void>,
  configurationValues: {} as Record<string, unknown>,
  executeCommand: vi.fn(async () => undefined),
  openTerminalListeners: [] as Array<(terminal: unknown) => void>,
  TabInputTerminalClass: class MockTabInputTerminal {},
  terminalStateChangeListeners: [] as Array<(terminal: unknown) => void>,
  tabGroupsAll: [] as Array<{
    isLocked?: boolean;
    tabs: Array<{ input: unknown; label: string }>;
    viewColumn?: number;
  }>,
  terminals: [] as unknown[],
  windowFocused: true,
  workspaceFolders: [
    {
      uri: {
        fsPath: "/workspace",
      },
    },
  ],
}));

vi.mock("./agent-shell-integration", () => ({
  ensureAgentShellIntegration: vi.fn(async () => ({
    binDir: "/mock-bin",
    notifyPath: "/mock-notify",
    opencodeConfigDir: "/mock-opencode",
    zshDotDir: "/mock-zsh",
  })),
}));

vi.mock("vscode", () => ({
  EventEmitter: class MockEventEmitter<T> {
    public readonly event = vi.fn(() => ({ dispose: vi.fn() }));

    public dispose(): void {}

    public fire(_value: T): void {}
  },
  TabInputTerminal: testState.TabInputTerminalClass,
  ThemeIcon: class ThemeIcon {},
  ViewColumn: {
    Eight: 8,
    Five: 5,
    Four: 4,
    Nine: 9,
    One: 1,
    Seven: 7,
    Six: 6,
    Three: 3,
    Two: 2,
  },
  commands: {
    executeCommand: testState.executeCommand,
  },
  window: {
    get activeTerminal() {
      return testState.activeTerminal;
    },
    get terminals() {
      return testState.terminals;
    },
    onDidChangeActiveTerminal: vi.fn((listener: (terminal: unknown) => void) => {
      testState.activeTerminalChangeListeners.push(listener);
      return { dispose: vi.fn() };
    }),
    onDidChangeTerminalState: vi.fn((listener: (terminal: unknown) => void) => {
      testState.terminalStateChangeListeners.push(listener);
      return { dispose: vi.fn() };
    }),
    onDidCloseTerminal: vi.fn((listener: (terminal: unknown) => void) => {
      testState.closeTerminalListeners.push(listener);
      return { dispose: vi.fn() };
    }),
    onDidOpenTerminal: vi.fn((listener: (terminal: unknown) => void) => {
      testState.openTerminalListeners.push(listener);
      return { dispose: vi.fn() };
    }),
    state: {
      get focused() {
        return testState.windowFocused;
      },
    },
    tabGroups: {
      get all() {
        return testState.tabGroupsAll;
      },
      get activeTabGroup() {
        return {
          viewColumn: testState.activeViewColumn,
        };
      },
    },
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue?: unknown) =>
        key in testState.configurationValues ? testState.configurationValues[key] : defaultValue,
      ),
    })),
    get workspaceFolders() {
      return testState.workspaceFolders;
    },
  },
}));

import { NativeTerminalWorkspaceBackend } from "./native-terminal-workspace-backend";

describe("NativeTerminalWorkspaceBackend moveProjectionToEditor", () => {
  beforeEach(() => {
    testState.activeTerminal = undefined;
    testState.activeViewColumn = 1;
    testState.activeTerminalChangeListeners = [];
    testState.closeTerminalListeners = [];
    testState.configurationValues = {};
    testState.executeCommand.mockReset();
    testState.executeCommand.mockResolvedValue(undefined);
    testState.openTerminalListeners = [];
    testState.tabGroupsAll = [];
    testState.terminalStateChangeListeners = [];
    testState.terminals = [];
    testState.windowFocused = true;
    testState.workspaceFolders = [
      {
        uri: {
          fsPath: "/workspace",
        },
      },
    ];
    vi.useRealTimers();
  });

  test("should preserve the target group focus when moving a panel terminal into the editor", async () => {
    const callOrder: string[] = [];
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Vale",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.focusSecondEditorGroup") {
        testState.activeViewColumn = 2;
      }
      if (command === "workbench.action.terminal.moveToEditor") {
        testState.activeViewColumn = 2;
        testState.tabGroupsAll = [
          {
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Vale",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });
    vi.spyOn(backend as any, "runUiAction").mockImplementation(
      async (callback: () => Promise<unknown> | unknown) => await callback(),
    );

    (backend as any).projections.set("session-1", {
      location: { type: "panel" },
      sessionId: "session-1",
      terminal,
    });

    await backend.syncConfiguration();
    await (backend as any).moveProjectionToEditor("session-1", 1);

    expect(callOrder).toEqual([
      "show:true",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.terminal.moveToEditor",
      "workbench.action.focusSecondEditorGroup",
    ]);
    expect((backend as any).projections.get("session-1")?.location).toEqual({
      type: "editor",
      visibleIndex: 1,
    });
  });

  test("should skip creating terminal projections for T3 sessions", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });
    const createProjectionSpy = vi
      .spyOn(backend as never, "createProjection")
      .mockResolvedValue(undefined as never);
    const terminalSession = createSessionRecord(1, 0);
    const t3Session = createSessionRecord(2, 1, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });

    await (backend as any).ensureParkedProjections([terminalSession, t3Session]);

    expect(createProjectionSpy).toHaveBeenCalledTimes(1);
    expect(createProjectionSpy).toHaveBeenCalledWith(terminalSession, "panel");
  });

  test("should temporarily unlock a locked destination group before moving a panel terminal into it", async () => {
    const callOrder: string[] = [];
    testState.configurationValues.keepSessionGroupsUnlocked = false;
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Vale",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.tabGroupsAll = [
      {
        isLocked: true,
        tabs: [
          {
            input: new testState.TabInputTerminalClass(),
            label: "Grove",
          },
        ],
        viewColumn: 2,
      },
    ];
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.focusSecondEditorGroup") {
        testState.activeViewColumn = 2;
      }
      if (command === "workbench.action.unlockEditorGroup") {
        testState.tabGroupsAll = [
          {
            isLocked: false,
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Grove",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      if (command === "workbench.action.terminal.moveToEditor") {
        testState.activeViewColumn = 2;
        testState.tabGroupsAll = [
          {
            isLocked: false,
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Grove",
              },
              {
                input: new testState.TabInputTerminalClass(),
                label: "Vale",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      if (command === "workbench.action.lockEditorGroup") {
        testState.tabGroupsAll = [
          {
            isLocked: true,
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Grove",
              },
              {
                input: new testState.TabInputTerminalClass(),
                label: "Vale",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-1", {
      location: { type: "panel" },
      sessionId: "session-1",
      terminal,
    });

    await backend.syncConfiguration();
    await (backend as any).moveProjectionToEditor("session-1", 1);

    expect(callOrder).toEqual([
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.unlockEditorGroup",
      "show:true",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.terminal.moveToEditor",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.lockEditorGroup",
      "workbench.action.focusSecondEditorGroup",
    ]);
  });

  test("should unlock and relock the destination group even when the lock state is unavailable", async () => {
    const callOrder: string[] = [];
    testState.configurationValues.keepSessionGroupsUnlocked = false;
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Vale",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.tabGroupsAll = [
      {
        tabs: [
          {
            input: new testState.TabInputTerminalClass(),
            label: "Grove",
          },
        ],
        viewColumn: 2,
      },
    ];
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.focusSecondEditorGroup") {
        testState.activeViewColumn = 2;
      }
      if (command === "workbench.action.terminal.moveToEditor") {
        testState.activeViewColumn = 2;
        testState.tabGroupsAll = [
          {
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Grove",
              },
              {
                input: new testState.TabInputTerminalClass(),
                label: "Vale",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-1", {
      location: { type: "panel" },
      sessionId: "session-1",
      terminal,
    });

    await backend.syncConfiguration();
    await (backend as any).moveProjectionToEditor("session-1", 1);

    expect(callOrder).toEqual([
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.unlockEditorGroup",
      "show:true",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.terminal.moveToEditor",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.lockEditorGroup",
      "workbench.action.focusSecondEditorGroup",
    ]);
  });

  test("should not change editor group locks during moves when keepSessionGroupsUnlocked is enabled", async () => {
    const callOrder: string[] = [];
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Vale",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.tabGroupsAll = [
      {
        isLocked: true,
        tabs: [
          {
            input: new testState.TabInputTerminalClass(),
            label: "Grove",
          },
        ],
        viewColumn: 2,
      },
    ];
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.focusSecondEditorGroup") {
        testState.activeViewColumn = 2;
      }
      if (command === "workbench.action.terminal.moveToEditor") {
        testState.activeViewColumn = 2;
        testState.tabGroupsAll = [
          {
            isLocked: true,
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Grove",
              },
              {
                input: new testState.TabInputTerminalClass(),
                label: "Vale",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-1", {
      location: { type: "panel" },
      sessionId: "session-1",
      terminal,
    });

    await backend.syncConfiguration();
    await (backend as any).moveProjectionToEditor("session-1", 1);

    expect(callOrder).toEqual([
      "show:true",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.terminal.moveToEditor",
      "workbench.action.focusSecondEditorGroup",
    ]);
    expect(callOrder).not.toContain("workbench.action.unlockEditorGroup");
    expect(callOrder).not.toContain("workbench.action.lockEditorGroup");
  });

  test("should wait for the owner window to be focused before running UI actions", async () => {
    vi.useFakeTimers();
    testState.windowFocused = false;
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });
    const callback = vi.fn(async () => "done");

    const resultPromise = (backend as any).runUiAction(callback);
    await vi.advanceTimersByTimeAsync(200);
    expect(callback).not.toHaveBeenCalled();

    testState.windowFocused = true;
    await vi.advanceTimersByTimeAsync(100);

    await expect(resultPromise).resolves.toBe("done");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("should move the active editor back into the requested slot when moveToEditor creates a new group", async () => {
    const callOrder: string[] = [];
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Beacon",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.focusSecondEditorGroup") {
        testState.activeViewColumn = 2;
      }
      if (command === "workbench.action.terminal.moveToEditor") {
        testState.activeViewColumn = 3;
        testState.tabGroupsAll = [
          {
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Beacon",
              },
            ],
            viewColumn: 3,
          },
        ];
      }
      if (command === "workbench.action.moveEditorToPreviousGroup") {
        testState.activeViewColumn = Math.max(1, testState.activeViewColumn - 1);
        testState.tabGroupsAll = [
          {
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Beacon",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-2", {
      location: { type: "panel" },
      sessionId: "session-2",
      terminal,
    });

    await (backend as any).moveProjectionToEditor("session-2", 1);

    expect(callOrder).toEqual([
      "show:true",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.terminal.moveToEditor",
      "workbench.action.focusThirdEditorGroup",
      "workbench.action.moveEditorToPreviousGroup",
    ]);
    expect(testState.activeViewColumn).toBe(2);
  });

  test("should refocus the landed editor group before aligning when moveToEditor leaves another group active", async () => {
    const callOrder: string[] = [];
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Drift",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.focusSecondEditorGroup") {
        testState.activeViewColumn = 2;
      }
      if (command === "workbench.action.terminal.moveToEditor") {
        testState.activeViewColumn = 2;
        testState.tabGroupsAll = [
          {
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Drift",
              },
            ],
            viewColumn: 3,
          },
        ];
      }
      if (command === "workbench.action.focusThirdEditorGroup") {
        testState.activeViewColumn = 3;
      }
      if (command === "workbench.action.moveEditorToPreviousGroup") {
        testState.activeViewColumn = 2;
        testState.tabGroupsAll = [
          {
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Drift",
              },
            ],
            viewColumn: 2,
          },
        ];
      }
      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-drift", {
      location: { type: "panel" },
      sessionId: "session-drift",
      terminal,
    });

    await (backend as any).moveProjectionToEditor("session-drift", 1);

    expect(callOrder).toEqual([
      "show:true",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.terminal.moveToEditor",
      "workbench.action.focusThirdEditorGroup",
      "workbench.action.moveEditorToPreviousGroup",
    ]);
    expect((backend as any).projections.get("session-drift")?.location).toEqual({
      type: "editor",
      visibleIndex: 1,
    });
  });

  test("should only reposition the editor group when the terminal is already visible", async () => {
    const callOrder: string[] = [];
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Grove",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        testState.activeViewColumn = 3;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.tabGroupsAll = [
      {
        tabs: [
          {
            input: new testState.TabInputTerminalClass(),
            label: "Grove",
          },
        ],
        viewColumn: 3,
      },
    ];
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.moveEditorToPreviousGroup") {
        testState.activeViewColumn = 2;
        testState.tabGroupsAll = [
          {
            tabs: [
              {
                input: new testState.TabInputTerminalClass(),
                label: "Grove",
              },
            ],
            viewColumn: 2,
          },
        ];
      }

      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-3", {
      location: { type: "editor", visibleIndex: 2 },
      sessionId: "session-3",
      terminal,
    });

    await (backend as any).moveProjectionToEditor("session-3", 1);

    expect(callOrder).toEqual([
      "show:false",
      "workbench.action.focusThirdEditorGroup",
      "workbench.action.moveEditorToPreviousGroup",
    ]);
    expect((backend as any).projections.get("session-3")?.location).toEqual({
      type: "editor",
      visibleIndex: 1,
    });
  });
});

describe("NativeTerminalWorkspaceBackend debugging trace", () => {
  let workspaceDirectory: string | undefined;

  afterEach(async () => {
    if (workspaceDirectory) {
      await rm(workspaceDirectory, { force: true, recursive: true });
      workspaceDirectory = undefined;
    }
  });

  test("should not create the reconcile trace file when debugging mode is disabled", async () => {
    workspaceDirectory = await mkdtemp(path.join(os.tmpdir(), "agent-tiler-trace-off-"));
    testState.workspaceFolders = [
      {
        uri: {
          fsPath: workspaceDirectory,
        },
      },
    ];

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    await backend.initialize([]);

    await expect(
      access(path.join(workspaceDirectory, "logs", "native-terminal-reconcile.log")),
    ).rejects.toThrow();

    backend.dispose();
  });

  test("should remove the reconcile trace file when debugging mode is turned off", async () => {
    workspaceDirectory = await mkdtemp(path.join(os.tmpdir(), "agent-tiler-trace-on-"));
    testState.workspaceFolders = [
      {
        uri: {
          fsPath: workspaceDirectory,
        },
      },
    ];
    testState.configurationValues.debuggingMode = true;

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });
    const traceFilePath = path.join(workspaceDirectory, "logs", "native-terminal-reconcile.log");

    await backend.initialize([]);
    await backend.clearDebugArtifacts();
    await expect(access(traceFilePath)).resolves.toBeUndefined();

    testState.configurationValues.debuggingMode = false;
    await backend.syncConfiguration();

    await waitForFileToBeRemoved(traceFilePath);

    backend.dispose();
  });
});

async function waitForFileToBeRemoved(filePath: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await access(filePath);
    } catch {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });
  }

  await expect(access(filePath)).rejects.toThrow();
}

describe("NativeTerminalWorkspaceBackend moveProjectionToPanel", () => {
  beforeEach(() => {
    testState.activeTerminal = undefined;
    testState.activeViewColumn = 1;
    testState.activeTerminalChangeListeners = [];
    testState.closeTerminalListeners = [];
    testState.configurationValues = {};
    testState.executeCommand.mockReset();
    testState.executeCommand.mockResolvedValue(undefined);
    testState.openTerminalListeners = [];
    testState.tabGroupsAll = [];
    testState.terminalStateChangeListeners = [];
    testState.terminals = [];
    vi.useRealTimers();
  });

  test("should focus the terminal's editor group before moving it to the panel", async () => {
    const callOrder: string[] = [];
    const terminal = {
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "layout native",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        testState.activeTerminal = terminal;
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.tabGroupsAll = [
      {
        tabs: [
          {
            input: new testState.TabInputTerminalClass(),
            label: "layout native",
          },
        ],
        viewColumn: 2,
      },
    ];
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "workbench.action.focusSecondEditorGroup") {
        testState.activeViewColumn = 2;
      }
      if (command === "workbench.action.terminal.moveToTerminalPanel") {
        testState.tabGroupsAll = [];
      }
      callOrder.push(command);
      return undefined;
    });

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-83", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-83",
      terminal,
    });

    await (backend as any).moveProjectionToPanel("session-83");

    expect(callOrder).toEqual([
      "workbench.action.focusSecondEditorGroup",
      "show:false",
      "workbench.action.terminal.moveToTerminalPanel",
    ]);
    expect((backend as any).projections.get("session-83")?.location).toEqual({
      type: "panel",
    });
  });
});

describe("NativeTerminalWorkspaceBackend initialize", () => {
  test("should wait for late revived terminals and attach them by alias name", async () => {
    vi.useFakeTimers();

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    let initialized = false;
    const initializePromise = backend
      .initialize([
        {
          alias: "Harbor Vale",
          sessionId: "session-3",
        },
      ] as never)
      .then(() => {
        initialized = true;
      });

    await Promise.resolve();
    await Promise.resolve();
    expect(testState.openTerminalListeners).toHaveLength(1);
    expect(initialized).toBe(false);

    await vi.advanceTimersByTimeAsync(100);
    expect(initialized).toBe(false);

    const revivedTerminal = {
      creationOptions: {
        name: "Harbor Vale",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Harbor Vale",
      sendText: vi.fn(),
      show: vi.fn(),
    };
    testState.terminals = [revivedTerminal];
    testState.openTerminalListeners[0]?.(revivedTerminal);

    await vi.advanceTimersByTimeAsync(100);
    expect(initialized).toBe(false);

    await vi.advanceTimersByTimeAsync(150);
    await initializePromise;

    expect((backend as any).projections.get("session-3")?.terminal).toBe(revivedTerminal);
    backend.dispose();
    vi.useRealTimers();
  });

  test("should rescan revived terminals that gain their alias after the first restore scan", async () => {
    vi.useFakeTimers();

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const revivedTerminal = {
      creationOptions: {
        name: "",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "",
      sendText: vi.fn(),
      show: vi.fn(),
    };
    testState.terminals = [revivedTerminal];

    const initializePromise = backend.initialize([
      {
        alias: "Atlas",
        sessionId: "session-9",
      },
    ] as never);

    await Promise.resolve();
    revivedTerminal.name = "Atlas";
    revivedTerminal.creationOptions.name = "Atlas";
    testState.terminalStateChangeListeners[0]?.(revivedTerminal);

    await vi.advanceTimersByTimeAsync(200);
    await initializePromise;

    expect((backend as any).projections.get("session-9")?.terminal).toBe(revivedTerminal);
    backend.dispose();
    vi.useRealTimers();
  });

  test("should restore a revived terminal by stored process id", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
        workspaceState: {
          get: vi.fn(() => ({
            "session-10": 7311,
          })),
          update: vi.fn(async () => undefined),
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const revivedTerminal = {
      creationOptions: {
        name: "opencode",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "opencode",
      processId: Promise.resolve(7311),
      sendText: vi.fn(),
      show: vi.fn(),
    };
    testState.terminals = [revivedTerminal];

    await backend.initialize([
      {
        alias: "Atlas",
        sessionId: "session-10",
      },
    ] as never);

    expect((backend as any).projections.get("session-10")?.terminal).toBe(revivedTerminal);
  });

  test("should dispose a created placeholder when a revived terminal replaces it", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const placeholderTerminal = {
      creationOptions: {
        env: {
          VSMUX_SESSION_ID: "session-8",
          VSMUX_WORKSPACE_ID: "workspace-1",
        },
        name: "Harbor Vale",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Harbor Vale",
      sendText: vi.fn(),
      show: vi.fn(),
    };
    const revivedTerminal = {
      creationOptions: {
        name: "Harbor Vale",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Harbor Vale",
      sendText: vi.fn(),
      show: vi.fn(),
    };

    (backend as any).trackedSessionIds.add("session-8");
    (backend as any).sessionAliases.set("session-8", "Harbor Vale");
    (backend as any).createdTerminals.add(placeholderTerminal);
    (backend as any).projections.set("session-8", {
      location: { type: "panel" },
      sessionId: "session-8",
      terminal: placeholderTerminal,
    });
    (backend as any).terminalToSessionId.set(placeholderTerminal, "session-8");

    await (backend as any).attachManagedTerminal(revivedTerminal);

    expect(placeholderTerminal.dispose).toHaveBeenCalledTimes(1);
    expect((backend as any).projections.get("session-8")?.terminal).toBe(revivedTerminal);
  });
});

describe("NativeTerminalWorkspaceBackend reconcileVisibleTerminalsByMovingParkedProjections", () => {
  test("should promote the focused parked terminal before demoting the outgoing editor terminal", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const callOrder: string[] = [];
    (backend as any).projections.set("session-1", {
      location: { type: "editor", visibleIndex: 0 },
      sessionId: "session-1",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "VSmux session-1",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-2", {
      location: { type: "panel" },
      sessionId: "session-2",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "VSmux session-2",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });

    (backend as any).moveProjectionToEditor = vi.fn(
      async (sessionId: string, visibleIndex: number) => {
        const projection = (backend as any).projections.get(sessionId);
        if (
          projection?.location.type === "editor" &&
          projection.location.visibleIndex === visibleIndex
        ) {
          return;
        }

        callOrder.push(`editor:${sessionId}:${String(visibleIndex)}`);
        if (projection) {
          projection.location = { type: "editor", visibleIndex };
        }
      },
    );
    (backend as any).moveProjectionToPanel = vi.fn(async (sessionId: string) => {
      const projection = (backend as any).projections.get(sessionId);
      if (projection?.location.type === "panel") {
        return;
      }

      callOrder.push(`panel:${sessionId}`);
      if (projection) {
        projection.location = { type: "panel" };
      }
    });
    (backend as any).showTerminal = vi.fn(async () => undefined);

    await (backend as any).reconcileVisibleTerminalsByMovingParkedProjections(
      {
        focusedSessionId: "session-2",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 1,
        visibleSessionIds: ["session-2"],
      },
      false,
    );

    expect(callOrder.slice(0, 2)).toEqual(["editor:session-2:0", "panel:session-1"]);
  });

  test("should skip the layout reset when hidden editor terminals cannot be parked", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const applyVisibleEditorLayout = vi
      .spyOn(backend as any, "applyVisibleEditorLayout")
      .mockImplementation(async () => undefined);
    (backend as any).parkHiddenEditorProjections = vi.fn(async () => false);
    (backend as any).moveProjectionToEditor = vi.fn(async () => undefined);
    (backend as any).showTerminal = vi.fn(async () => undefined);

    await (backend as any).reconcileVisibleTerminalsByMovingParkedProjections(
      {
        focusedSessionId: "session-4",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: ["session-4", "session-5"],
      },
      false,
    );

    expect(applyVisibleEditorLayout).not.toHaveBeenCalled();
    expect((backend as any).moveProjectionToEditor).toHaveBeenNthCalledWith(1, "session-4", 0);
    expect((backend as any).moveProjectionToEditor).toHaveBeenNthCalledWith(2, "session-5", 1);
  });

  test("should reapply the selected layout shape after moving visible terminals", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const callOrder: string[] = [];
    (backend as any).parkHiddenEditorProjections = vi.fn(async () => false);
    (backend as any).ensureDesiredEditorLayoutShape = vi.fn(async () => {
      callOrder.push("ensure-shape");
    });
    (backend as any).moveProjectionToEditor = vi.fn(async (sessionId: string) => {
      callOrder.push(`move:${sessionId}`);
    });
    (backend as any).showTerminal = vi.fn(async () => {
      callOrder.push("show");
    });

    await (backend as any).reconcileVisibleTerminalsByMovingParkedProjections(
      {
        focusedSessionId: "session-4",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: ["session-4", "session-5"],
      },
      false,
    );

    expect(callOrder).toEqual(["move:session-4", "move:session-5", "ensure-shape", "show"]);
  });
});

describe("NativeTerminalWorkspaceBackend ensureDesiredEditorLayoutShape", () => {
  test("should re-seat visible terminals after reapplying the layout shape", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const callOrder: string[] = [];
    const visibleSessionIds = ["session-1", "session-2", "session-3", "session-4"];

    visibleSessionIds.forEach((sessionId, visibleIndex) => {
      (backend as any).projections.set(sessionId, {
        location: { type: "editor", visibleIndex },
        sessionId,
        terminal: {
          creationOptions: {
            name: `Terminal ${String(visibleIndex + 1)}`,
          },
          dispose: vi.fn(),
          exitStatus: undefined,
          name: `Terminal ${String(visibleIndex + 1)}`,
          sendText: vi.fn(),
          show: vi.fn(),
        },
      });
    });

    testState.executeCommand.mockReset();
    testState.executeCommand.mockImplementation(async (command: string) => {
      if (command === "vscode.getEditorLayout") {
        return {
          groups: [{}, {}, {}, {}],
          orientation: 0,
        };
      }

      return undefined;
    });

    vi.spyOn(backend as any, "applyVisibleEditorLayout").mockImplementation(async () => {
      callOrder.push("apply-layout");
    });
    vi.spyOn(backend as any, "moveProjectionToEditor").mockImplementation(
      async (sessionId: string, visibleIndex: number) => {
        callOrder.push(`move:${sessionId}:${String(visibleIndex)}`);
      },
    );

    await (backend as any).ensureDesiredEditorLayoutShape({
      focusedSessionId: "session-1",
      fullscreenRestoreVisibleCount: undefined,
      sessions: [] as never,
      viewMode: "grid",
      visibleCount: 4,
      visibleSessionIds,
    });

    expect(callOrder).toEqual([
      "apply-layout",
      "move:session-1:0",
      "move:session-2:1",
      "move:session-3:2",
      "move:session-4:3",
    ]);
  });
});

describe("NativeTerminalWorkspaceBackend applyParkedTerminalTransferPlan", () => {
  test("should demote outgoing sessions before promoting incoming ones", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const callOrder: string[] = [];
    vi.spyOn(backend as any, "moveProjectionToPanel").mockImplementation(
      async (sessionId: string) => {
        callOrder.push(`panel:${sessionId}`);
      },
    );
    vi.spyOn(backend as any, "moveProjectionToEditor").mockImplementation(
      async (sessionId: string, slotIndex: number) => {
        callOrder.push(`editor:${sessionId}:${String(slotIndex)}`);
      },
    );
    vi.spyOn(backend as any, "ensureDesiredEditorLayoutShape").mockImplementation(async () => {
      callOrder.push("ensure-shape");
    });
    vi.spyOn(backend as any, "refreshProjectionLocations").mockImplementation(() => {});
    vi.spyOn(backend as any, "showTerminal").mockImplementation(async () => {
      callOrder.push("show");
    });

    await (backend as any).applyParkedTerminalTransferPlan(
      {
        focusedSessionId: "session-2",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: ["session-2", "session-3"],
      },
      {
        currentVisibleSessionIds: ["session-1", "session-2"],
        demoteSteps: [
          { sessionId: "session-2", slotIndex: 1, type: "demote" },
          { sessionId: "session-1", slotIndex: 0, type: "demote" },
        ],
        hasChanges: true,
        nextVisibleSessionIds: ["session-2", "session-3"],
        promoteSteps: [{ sessionId: "session-3", slotIndex: 1, type: "promote" }],
        steps: [
          { sessionId: "session-2", slotIndex: 1, type: "demote" },
          { sessionId: "session-1", slotIndex: 0, type: "demote" },
          { sessionId: "session-3", slotIndex: 1, type: "promote" },
        ],
        strategy: "transfer",
        unchangedSlots: [],
      },
      false,
    );

    expect(callOrder).toEqual([
      "panel:session-2",
      "panel:session-1",
      "editor:session-3:1",
      "ensure-shape",
      "show",
    ]);
  });

  test("should use an incoming-first single-slot swap in stable placement mode", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-83", {
      location: { type: "editor", visibleIndex: 0 },
      sessionId: "session-83",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "layout native",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-82", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-82",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "restoring agents when closed",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-85", {
      location: { type: "panel" },
      sessionId: "session-85",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "Lattice",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });

    const callOrder: string[] = [];
    vi.spyOn(backend as any, "moveProjectionToPanel").mockImplementation(
      async (sessionId: string) => {
        callOrder.push(`panel:${sessionId}`);
        const projection = (backend as any).projections.get(sessionId);
        if (projection) {
          projection.location = { type: "panel" };
        }
      },
    );
    vi.spyOn(backend as any, "moveProjectionToEditor").mockImplementation(
      async (
        sessionId: string,
        slotIndex: number,
        options?: { targetGroupVisibleIndex?: number },
      ) => {
        callOrder.push(
          `editor:${sessionId}:${String(slotIndex)}:${String(options?.targetGroupVisibleIndex ?? slotIndex)}`,
        );
        const projection = (backend as any).projections.get(sessionId);
        if (projection) {
          projection.location = { type: "editor", visibleIndex: slotIndex };
        }
      },
    );
    vi.spyOn(backend as any, "ensureDesiredEditorLayoutShape").mockImplementation(async () => {
      callOrder.push("ensure-shape");
    });
    vi.spyOn(backend as any, "refreshProjectionLocations").mockImplementation(() => {});
    vi.spyOn(backend as any, "showTerminal").mockImplementation(async () => {
      callOrder.push("show");
    });

    await (backend as any).applyParkedTerminalTransferPlan(
      {
        focusedSessionId: "session-85",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "horizontal",
        visibleCount: 2,
        visibleSessionIds: ["session-85", "session-82"],
      },
      {
        currentVisibleSessionIds: ["session-83", "session-82"],
        demoteSteps: [{ sessionId: "session-83", slotIndex: 0, type: "demote" }],
        hasChanges: true,
        nextVisibleSessionIds: ["session-85", "session-82"],
        promoteSteps: [{ sessionId: "session-85", slotIndex: 0, type: "promote" }],
        steps: [
          { sessionId: "session-83", slotIndex: 0, type: "demote" },
          { sessionId: "session-85", slotIndex: 0, type: "promote" },
        ],
        strategy: "transfer",
        unchangedSlots: [{ sessionId: "session-82", slotIndex: 1 }],
      },
      false,
    );

    expect(callOrder).toEqual([
      "editor:session-85:0:0",
      "panel:session-83",
      "ensure-shape",
      "show",
    ]);
  });

  test("should retry parking the outgoing session after promoting the incoming session", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-83", {
      location: { type: "editor", visibleIndex: 0 },
      sessionId: "session-83",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "layout native",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-82", {
      location: { type: "panel" },
      sessionId: "session-82",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "restoring agents when closed",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-85", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-85",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "Lattice",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });

    const callOrder: string[] = [];
    let parkAttempts = 0;
    vi.spyOn(backend as any, "moveProjectionToEditor").mockImplementation(
      async (
        sessionId: string,
        slotIndex: number,
        options?: { targetGroupVisibleIndex?: number },
      ) => {
        callOrder.push(
          `editor:${sessionId}:${String(slotIndex)}:${String(options?.targetGroupVisibleIndex ?? slotIndex)}`,
        );
        const projection = (backend as any).projections.get(sessionId);
        if (projection) {
          projection.location = { type: "editor", visibleIndex: slotIndex };
        }
      },
    );
    vi.spyOn(backend as any, "moveProjectionToPanel").mockImplementation(
      async (sessionId: string) => {
        parkAttempts += 1;
        callOrder.push(`panel:${sessionId}:${String(parkAttempts)}`);
        const projection = (backend as any).projections.get(sessionId);
        if (projection && parkAttempts >= 2) {
          projection.location = { type: "panel" };
        }
      },
    );
    vi.spyOn(backend as any, "refreshProjectionLocations").mockImplementation(() => {});
    vi.spyOn(backend as any, "ensureDesiredEditorLayoutShape").mockImplementation(async () => {
      callOrder.push("ensure-shape");
    });
    vi.spyOn(backend as any, "showTerminal").mockImplementation(async () => {
      callOrder.push("show");
    });

    await (backend as any).applyParkedTerminalTransferPlan(
      {
        focusedSessionId: "session-82",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "horizontal",
        visibleCount: 2,
        visibleSessionIds: ["session-82", "session-85"],
      },
      {
        currentVisibleSessionIds: ["session-83", "session-85"],
        demoteSteps: [{ sessionId: "session-83", slotIndex: 0, type: "demote" }],
        hasChanges: true,
        nextVisibleSessionIds: ["session-82", "session-85"],
        promoteSteps: [{ sessionId: "session-82", slotIndex: 0, type: "promote" }],
        steps: [
          { sessionId: "session-82", slotIndex: 0, type: "promote" },
          { sessionId: "session-83", slotIndex: 0, type: "demote" },
        ],
        strategy: "transfer",
        unchangedSlots: [{ sessionId: "session-85", slotIndex: 1 }],
      },
      false,
    );

    expect(callOrder).toEqual([
      "editor:session-82:0:0",
      "panel:session-83:1",
      "panel:session-83:2",
      "ensure-shape",
      "show",
    ]);
  });

  test("should reuse the outgoing session's current group during a single-slot swap", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-83", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-83",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "layout native",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-82", {
      location: { type: "panel" },
      sessionId: "session-82",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "restoring agents when closed",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });

    const callOrder: string[] = [];
    vi.spyOn(backend as any, "moveProjectionToPanel").mockImplementation(
      async (sessionId: string) => {
        callOrder.push(`panel:${sessionId}`);
        const projection = (backend as any).projections.get(sessionId);
        if (projection) {
          projection.location = { type: "panel" };
        }
      },
    );
    vi.spyOn(backend as any, "moveProjectionToEditor").mockImplementation(
      async (
        sessionId: string,
        slotIndex: number,
        options?: { targetGroupVisibleIndex?: number },
      ) => {
        callOrder.push(
          `editor:${sessionId}:${String(slotIndex)}:${String(options?.targetGroupVisibleIndex ?? slotIndex)}`,
        );
        const projection = (backend as any).projections.get(sessionId);
        if (projection) {
          projection.location = { type: "editor", visibleIndex: slotIndex };
        }
      },
    );
    vi.spyOn(backend as any, "refreshProjectionLocations").mockImplementation(() => {});
    vi.spyOn(backend as any, "ensureDesiredEditorLayoutShape").mockImplementation(async () => {
      callOrder.push("ensure-shape");
    });
    vi.spyOn(backend as any, "showTerminal").mockImplementation(async () => {
      callOrder.push("show");
    });

    await (backend as any).applyParkedTerminalTransferPlan(
      {
        focusedSessionId: "session-82",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "horizontal",
        visibleCount: 1,
        visibleSessionIds: ["session-82"],
      },
      {
        currentVisibleSessionIds: ["session-83"],
        demoteSteps: [{ sessionId: "session-83", slotIndex: 0, type: "demote" }],
        hasChanges: true,
        nextVisibleSessionIds: ["session-82"],
        promoteSteps: [{ sessionId: "session-82", slotIndex: 0, type: "promote" }],
        steps: [
          { sessionId: "session-82", slotIndex: 0, type: "promote" },
          { sessionId: "session-83", slotIndex: 0, type: "demote" },
        ],
        strategy: "transfer",
        unchangedSlots: [],
      },
      false,
    );

    expect(callOrder).toEqual([
      "editor:session-82:0:1",
      "panel:session-83",
      "ensure-shape",
      "show",
    ]);
  });
});

describe("NativeTerminalWorkspaceBackend parkHiddenEditorProjections", () => {
  test("should only park hidden editor sessions", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).projections.set("session-1", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-1",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "Visible but misplaced",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-2", {
      location: { type: "editor", visibleIndex: 0 },
      sessionId: "session-2",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "Hidden",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });

    const moveProjectionToPanel = vi
      .spyOn(backend as any, "moveProjectionToPanel")
      .mockImplementation(async () => undefined);
    vi.spyOn(backend as any, "refreshProjectionLocations").mockImplementation(() => {});

    await (backend as any).parkHiddenEditorProjections({
      focusedSessionId: "session-1",
      fullscreenRestoreVisibleCount: undefined,
      sessions: [] as never,
      viewMode: "grid",
      visibleCount: 1,
      visibleSessionIds: ["session-1"],
    });

    expect(moveProjectionToPanel).toHaveBeenCalledTimes(1);
    expect(moveProjectionToPanel).toHaveBeenCalledWith("session-2");
  });
});

describe("NativeTerminalWorkspaceBackend reconcile serialization", () => {
  test("should run reconcile requests sequentially", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    let releaseFirstReconcile: (() => void) | undefined;
    const firstReconcileBlocked = new Promise<void>((resolve) => {
      releaseFirstReconcile = resolve;
    });
    const callOrder: string[] = [];
    let activeReconcileCount = 0;
    let maxConcurrentReconciles = 0;

    vi.spyOn(backend as any, "reconcileVisibleTerminalsInternal").mockImplementation(
      async (snapshot: { visibleSessionIds: string[] }) => {
        activeReconcileCount += 1;
        maxConcurrentReconciles = Math.max(maxConcurrentReconciles, activeReconcileCount);
        callOrder.push(snapshot.visibleSessionIds.join(","));

        if (callOrder.length === 1) {
          await firstReconcileBlocked;
        }

        activeReconcileCount -= 1;
      },
    );

    const firstPromise = backend.reconcileVisibleTerminals({
      focusedSessionId: "session-1",
      fullscreenRestoreVisibleCount: undefined,
      sessions: [] as never,
      viewMode: "horizontal",
      visibleCount: 1,
      visibleSessionIds: ["session-1"],
    });
    const secondPromise = backend.reconcileVisibleTerminals({
      focusedSessionId: "session-2",
      fullscreenRestoreVisibleCount: undefined,
      sessions: [] as never,
      viewMode: "horizontal",
      visibleCount: 1,
      visibleSessionIds: ["session-2"],
    });

    await Promise.resolve();
    expect(callOrder).toEqual(["session-1"]);
    expect(maxConcurrentReconciles).toBe(1);

    releaseFirstReconcile?.();
    await firstPromise;
    await secondPromise;

    expect(callOrder).toEqual(["session-1", "session-2"]);
    expect(maxConcurrentReconciles).toBe(1);
  });
});

describe("NativeTerminalWorkspaceBackend clearDebugArtifacts", () => {
  test("should clear move history and reset the trace file", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    (backend as any).moveHistory.push({
      event: "complete",
      kind: "moveProjectionToEditor",
      sessionId: "session-1",
      startedAt: new Date().toISOString(),
      terminalName: "Atlas",
      timestamp: new Date().toISOString(),
    });
    const resetTrace = vi.spyOn((backend as any).trace, "reset").mockResolvedValue(undefined);

    await backend.clearDebugArtifacts();

    expect((backend as any).moveHistory).toEqual([]);
    expect(resetTrace).toHaveBeenCalledTimes(1);
  });
});

describe("NativeTerminalWorkspaceBackend reconcileVisibleTerminals", () => {
  test("should run a cleanup rebuild when hidden terminals remain in editor groups", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const reconcileByMovingParkedProjections = vi
      .spyOn(backend as any, "reconcileVisibleTerminalsByMovingParkedProjections")
      .mockImplementation(async (_snapshot: unknown) => undefined);
    vi.spyOn(backend as any, "ensureParkedProjections").mockImplementation(async () => undefined);
    vi.spyOn(backend as any, "canIncrementallyReconcileWithParkedProjections").mockReturnValue(
      false,
    );

    const session1Terminal = {
      creationOptions: {
        name: "Vale",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Vale",
      sendText: vi.fn(),
      show: vi.fn(),
    };
    const session2Terminal = {
      creationOptions: {
        name: "Beacon",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Beacon",
      sendText: vi.fn(),
      show: vi.fn(),
    };

    (backend as any).projections.set("session-1", {
      location: { type: "editor", visibleIndex: 0 },
      sessionId: "session-1",
      terminal: session1Terminal,
    });
    (backend as any).projections.set("session-2", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-2",
      terminal: session2Terminal,
    });
    testState.terminals = [session1Terminal, session2Terminal];

    testState.tabGroupsAll = [
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "Vale" }],
        viewColumn: 1,
      },
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "Beacon" }],
        viewColumn: 2,
      },
    ];

    await backend.reconcileVisibleTerminals(
      {
        focusedSessionId: "session-1",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 1,
        visibleSessionIds: ["session-1"],
      },
      false,
    );

    expect(reconcileByMovingParkedProjections).toHaveBeenCalledTimes(2);
  });

  test("should preserve the current editor order when sidebar order matching is disabled", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const reconcileByMovingParkedProjections = vi
      .spyOn(backend as any, "reconcileVisibleTerminalsByMovingParkedProjections")
      .mockImplementation(async (_snapshot: unknown) => undefined);
    vi.spyOn(backend as any, "ensureParkedProjections").mockImplementation(async () => undefined);
    vi.spyOn(backend as any, "canIncrementallyReconcileWithParkedProjections").mockReturnValue(
      false,
    );

    const session1Terminal = {
      creationOptions: {
        name: "Vale",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Vale",
      sendText: vi.fn(),
      show: vi.fn(),
    };
    const session2Terminal = {
      creationOptions: {
        name: "Beacon",
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: "Beacon",
      sendText: vi.fn(),
      show: vi.fn(),
    };

    (backend as any).projections.set("session-1", {
      location: { type: "editor", visibleIndex: 0 },
      sessionId: "session-1",
      terminal: session1Terminal,
    });
    (backend as any).projections.set("session-2", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-2",
      terminal: session2Terminal,
    });
    testState.terminals = [session1Terminal, session2Terminal];

    testState.tabGroupsAll = [
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "Vale" }],
        viewColumn: 1,
      },
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "Beacon" }],
        viewColumn: 2,
      },
    ];

    await backend.reconcileVisibleTerminals(
      {
        focusedSessionId: "session-2",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: ["session-2", "session-1"],
      },
      false,
    );

    expect(reconcileByMovingParkedProjections).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleSessionIds: ["session-1", "session-2"],
      }),
      false,
    );
  });

  test("should fill vacated visible slots before shifting still-visible terminals", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    const reconcileByMovingParkedProjections = vi
      .spyOn(backend as any, "reconcileVisibleTerminalsByMovingParkedProjections")
      .mockImplementation(async (_snapshot: unknown) => undefined);
    vi.spyOn(backend as any, "ensureParkedProjections").mockImplementation(async () => undefined);
    vi.spyOn(backend as any, "canIncrementallyReconcileWithParkedProjections").mockReturnValue(
      false,
    );

    const terminals = ["session-1", "session-2", "session-3", "session-4"].map((sessionId) => ({
      creationOptions: {
        name: sessionId,
      },
      dispose: vi.fn(),
      exitStatus: undefined,
      name: sessionId,
      sendText: vi.fn(),
      show: vi.fn(),
    }));

    ["session-1", "session-2", "session-3", "session-4"].forEach((sessionId, visibleIndex) => {
      (backend as any).projections.set(sessionId, {
        location: { type: "editor", visibleIndex },
        sessionId,
        terminal: terminals[visibleIndex],
      });
    });
    testState.terminals = terminals;

    testState.tabGroupsAll = [
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "session-1" }],
        viewColumn: 1,
      },
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "session-2" }],
        viewColumn: 2,
      },
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "session-3" }],
        viewColumn: 3,
      },
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "session-4" }],
        viewColumn: 4,
      },
    ];

    await backend.reconcileVisibleTerminals(
      {
        focusedSessionId: "session-5",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 4,
        visibleSessionIds: ["session-4", "session-5", "session-1", "session-3"],
      },
      false,
    );

    expect(reconcileByMovingParkedProjections).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleSessionIds: ["session-1", "session-5", "session-3", "session-4"],
      }),
      false,
    );
  });

  test("should honor sidebar order when matching is enabled", async () => {
    testState.configurationValues.matchVisibleTerminalOrderInSessionsArea = true;

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    await backend.syncConfiguration();

    const reconcileByMovingParkedProjections = vi
      .spyOn(backend as any, "reconcileVisibleTerminalsByMovingParkedProjections")
      .mockImplementation(async (_snapshot: unknown) => undefined);
    vi.spyOn(backend as any, "ensureParkedProjections").mockImplementation(async () => undefined);
    vi.spyOn(backend as any, "canIncrementallyReconcileWithParkedProjections").mockReturnValue(
      false,
    );

    (backend as any).projections.set("session-1", {
      location: { type: "editor", visibleIndex: 0 },
      sessionId: "session-1",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "Vale",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });
    (backend as any).projections.set("session-2", {
      location: { type: "editor", visibleIndex: 1 },
      sessionId: "session-2",
      terminal: {
        dispose: vi.fn(),
        exitStatus: undefined,
        name: "Beacon",
        sendText: vi.fn(),
        show: vi.fn(),
      },
    });

    testState.tabGroupsAll = [
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "Vale" }],
        viewColumn: 1,
      },
      {
        tabs: [{ input: new testState.TabInputTerminalClass(), label: "Beacon" }],
        viewColumn: 2,
      },
    ];

    await backend.reconcileVisibleTerminals(
      {
        focusedSessionId: "session-2",
        fullscreenRestoreVisibleCount: undefined,
        sessions: [] as never,
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: ["session-2", "session-1"],
      },
      false,
    );

    expect(reconcileByMovingParkedProjections).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleSessionIds: ["session-2", "session-1"],
      }),
      false,
    );
  });

  test("should read the native terminal action delay from configuration", async () => {
    testState.configurationValues.nativeTerminalActionDelayMs = 1000.8;

    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    await backend.syncConfiguration();

    expect((backend as any).nativeTerminalActionDelayMs).toBe(1000);
  });

  test("should default to keeping session groups unlocked", async () => {
    const backend = new NativeTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/extension-storage",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
    });

    await backend.syncConfiguration();

    expect((backend as any).keepSessionGroupsUnlocked).toBe(true);
  });
});
