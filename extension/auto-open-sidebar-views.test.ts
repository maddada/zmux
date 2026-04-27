import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const { configurationValues, executeCommandMock } = vi.hoisted(() => ({
  configurationValues: new Map<string, unknown>(),
  executeCommandMock: vi.fn(async () => undefined),
}));

const workspaceState = {
  workspaceFile: undefined as { fsPath: string } | undefined,
  workspaceFolders: undefined as Array<{ name: string; uri: { fsPath: string } }> | undefined,
};

vi.mock("vscode", () => ({
  commands: {
    executeCommand: executeCommandMock,
  },
  workspace: {
    get workspaceFile() {
      return workspaceState.workspaceFile;
    },
    get workspaceFolders() {
      return workspaceState.workspaceFolders;
    },
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue?: unknown) =>
        configurationValues.has(key) ? configurationValues.get(key) : defaultValue,
      ),
    })),
  },
}));

import { maybeAutoOpenSidebarViewsOnStartup } from "./auto-open-sidebar-views";

describe("maybeAutoOpenSidebarViewsOnStartup", () => {
  beforeEach(() => {
    configurationValues.clear();
    executeCommandMock.mockReset();
    executeCommandMock.mockResolvedValue(undefined);
    workspaceState.workspaceFile = undefined;
    workspaceState.workspaceFolders = [{ name: "demo-project", uri: { fsPath: "/workspace" } }];
  });

  test("should stay idle when startup auto-open is disabled", async () => {
    const revealSidebar = vi.fn(async () => undefined);

    await maybeAutoOpenSidebarViewsOnStartup({ revealSidebar });

    expect(revealSidebar).not.toHaveBeenCalled();
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  test("should reveal the zmux sidebar and focus the sessions view when enabled", async () => {
    configurationValues.set("autoOpenSidebarViewsOnStartup", true);
    const revealSidebar = vi.fn(async () => undefined);

    await maybeAutoOpenSidebarViewsOnStartup({ revealSidebar });

    expect(revealSidebar).toHaveBeenCalledTimes(1);
    expect(executeCommandMock.mock.calls).toEqual([["zmux.sessions.focus"]]);
  });

  test("should stay idle for an empty VS Code window", async () => {
    configurationValues.set("autoOpenSidebarViewsOnStartup", true);
    workspaceState.workspaceFolders = undefined;
    const revealSidebar = vi.fn(async () => undefined);

    await maybeAutoOpenSidebarViewsOnStartup({ revealSidebar });

    expect(revealSidebar).not.toHaveBeenCalled();
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  test("should auto-open for a saved multi-root workspace", async () => {
    configurationValues.set("autoOpenSidebarViewsOnStartup", true);
    workspaceState.workspaceFolders = undefined;
    workspaceState.workspaceFile = { fsPath: "/Users/example/dev/client.code-workspace" };
    const revealSidebar = vi.fn(async () => undefined);

    await maybeAutoOpenSidebarViewsOnStartup({ revealSidebar });

    expect(revealSidebar).toHaveBeenCalledTimes(1);
    expect(executeCommandMock.mock.calls).toEqual([["zmux.sessions.focus"]]);
  });

  test("should ignore a sessions view focus failure", async () => {
    configurationValues.set("autoOpenSidebarViewsOnStartup", true);
    executeCommandMock.mockRejectedValueOnce(new Error("missing view command"));
    const revealSidebar = vi.fn(async () => undefined);

    await maybeAutoOpenSidebarViewsOnStartup({ revealSidebar });

    expect(executeCommandMock.mock.calls).toEqual([["zmux.sessions.focus"]]);
  });
});
