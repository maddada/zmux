import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const testState = vi.hoisted(() => ({
  backend: undefined as
    | {
        acknowledgeAttention: ReturnType<typeof vi.fn>;
        canReuseVisibleLayout: ReturnType<typeof vi.fn>;
        createOrAttachSession: ReturnType<typeof vi.fn>;
        dispose: ReturnType<typeof vi.fn>;
        focusSession: ReturnType<typeof vi.fn>;
        getLastTerminalActivityAt: ReturnType<typeof vi.fn>;
        getSessionSnapshot: ReturnType<typeof vi.fn>;
        initialize: ReturnType<typeof vi.fn>;
        killSession: ReturnType<typeof vi.fn>;
        onDidActivateSession: ReturnType<typeof vi.fn>;
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
  executeCommand: vi.fn(),
  onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  showInformationMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  showWarningMessage: vi.fn(),
  sidebarPostMessage: vi.fn(async () => {}),
}));

vi.mock("vscode", () => ({
  ThemeIcon: class ThemeIcon {},
  ViewColumn: {
    One: 1,
    Nine: 9,
  },
  commands: {
    executeCommand: testState.executeCommand,
  },
  window: {
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

vi.mock("./zmx-terminal-workspace-backend", () => ({
  ZmxTerminalWorkspaceBackend: class ZmxTerminalWorkspaceBackend {
    public constructor() {
      testState.backend = {
        acknowledgeAttention: vi.fn(async () => false),
        canReuseVisibleLayout: vi.fn(() => true),
        createOrAttachSession: vi.fn(),
        dispose: vi.fn(),
        focusSession: vi.fn(async () => true),
        getLastTerminalActivityAt: vi.fn(),
        getSessionSnapshot: vi.fn(() => undefined),
        initialize: vi.fn(),
        killSession: vi.fn(),
        onDidActivateSession: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeSessionTitle: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeSessions: vi.fn(() => ({ dispose: vi.fn() })),
        reconcileVisibleTerminals: vi.fn(),
        renameSession: vi.fn(),
        restartSession: vi.fn(),
        syncConfiguration: vi.fn(),
        writeText: vi.fn(),
      };

      return testState.backend;
    }
  },
}));

import type { GroupedSessionWorkspaceSnapshot } from "../shared/session-grid-contract";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
  createDefaultSessionGridSnapshot,
  createSessionRecord,
} from "../shared/session-grid-contract";
import { NativeTerminalWorkspaceController } from "./native-terminal-workspace";

describe("NativeTerminalWorkspaceController rename session", () => {
  beforeEach(() => {
    testState.backend = undefined;
    testState.configValues.clear();
    testState.executeCommand.mockReset();
    testState.onDidChangeActiveColorTheme.mockClear();
    testState.onDidChangeConfiguration.mockClear();
    testState.showInformationMessage.mockReset();
    testState.showInputBox.mockReset();
    testState.showQuickPick.mockReset();
    testState.showWarningMessage.mockReset();
    testState.sidebarPostMessage.mockReset();
    testState.sidebarPostMessage.mockResolvedValue(undefined);
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

function createContext(snapshot: GroupedSessionWorkspaceSnapshot) {
  const workspaceValues = new Map<string, unknown>([["VSmux.sessionGridSnapshot", snapshot]]);
  const globalValues = new Map<string, unknown>();

  return {
    extensionUri: {
      fsPath: "/extension",
      toString: () => "file:///extension",
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
