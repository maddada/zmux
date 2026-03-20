import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const testState = vi.hoisted(() => ({
  executeCommand: vi.fn(async () => undefined),
}));

vi.mock("vscode", () => ({
  EventEmitter: class MockEventEmitter<T> {
    public readonly event = vi.fn(() => ({ dispose: vi.fn() }));

    public dispose(): void {}

    public fire(_value: T): void {}
  },
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
  window: {},
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: (_key: string, defaultValue?: unknown) => defaultValue,
    })),
    workspaceFolders: [
      {
        uri: {
          fsPath: "/workspace",
        },
      },
    ],
  },
}));

import { ZmxTerminalWorkspaceBackend } from "./zmx-terminal-workspace-backend";

describe("ZmxTerminalWorkspaceBackend moveProjectionToEditor", () => {
  beforeEach(() => {
    testState.executeCommand.mockReset();
    testState.executeCommand.mockResolvedValue(undefined);
  });

  test("should focus the destination group before showing and moving the terminal", async () => {
    const callOrder: string[] = [];
    const terminal = {
      dispose: vi.fn(),
      name: "Session 1",
      sendText: vi.fn(),
      show: vi.fn((preserveFocus: boolean) => {
        callOrder.push(`show:${String(preserveFocus)}`);
      }),
    };
    testState.executeCommand.mockImplementation(async (command: string) => {
      callOrder.push(command);
      return undefined;
    });

    const backend = new ZmxTerminalWorkspaceBackend({
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

    await (backend as any).moveProjectionToEditor("session-1", 1);

    expect(callOrder).toEqual([
      "workbench.action.focusSecondEditorGroup",
      "show:true",
      "workbench.action.terminal.moveToEditor",
    ]);
    expect((backend as any).projections.get("session-1")?.location).toEqual({
      type: "editor",
      visibleIndex: 1,
    });
  });
});
