import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import {
  getSidebarCommandButtons,
  migrateSidebarCommandPreferences,
  saveSidebarCommandPreference,
} from "./sidebar-command-preferences";

const vscodeState = vi.hoisted(() => ({
  configurationValues: new Map<string, unknown>(),
  workspaceRoot: "/workspace/demo-project",
}));

vi.mock("vscode", () => ({
  workspace: {
    get workspaceFolders() {
      return [{ uri: { fsPath: vscodeState.workspaceRoot } }];
    },
    getConfiguration: () => ({
      get: (key: string, defaultValue?: unknown) =>
        vscodeState.configurationValues.has(key)
          ? vscodeState.configurationValues.get(key)
          : defaultValue,
    }),
  },
}));

describe("sidebar command preferences", () => {
  let temporaryRoots: string[] = [];

  beforeEach(() => {
    vscodeState.configurationValues.clear();
    vscodeState.workspaceRoot = "/workspace/demo-project";
    temporaryRoots = [];
  });

  afterEach(async () => {
    await Promise.all(temporaryRoots.map((root) => rm(root, { force: true, recursive: true })));
  });

  test("should share project commands across Git worktrees by default", async () => {
    const { globalStorage, mainRoot, worktreeRoot } = await createGitWorktreeFixture();
    const mainContext = createMockContext(globalStorage);
    const worktreeContext = createMockContext(globalStorage);

    vscodeState.workspaceRoot = mainRoot;
    await saveSidebarCommandPreference(mainContext as never, {
      actionType: "terminal",
      closeTerminalOnExit: false,
      command: "pnpm dev",
      commandId: "custom-dev",
      name: "Dev",
      playCompletionSound: true,
    });

    vscodeState.workspaceRoot = worktreeRoot;

    expect(getSidebarCommandButtons(worktreeContext as never)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: "pnpm dev",
          commandId: "custom-dev",
        }),
      ]),
    );
  });

  test("should keep non-global commands workspace-local when worktree sharing is disabled", async () => {
    const globalStorage = new Map<string, unknown>();
    const firstContext = createMockContext(globalStorage);
    const secondContext = createMockContext(globalStorage);
    vscodeState.configurationValues.set("shareSidebarCommandsAcrossWorktrees", false);

    vscodeState.workspaceRoot = "/workspace/project-a";
    await saveSidebarCommandPreference(firstContext as never, {
      actionType: "terminal",
      closeTerminalOnExit: false,
      command: "pnpm test",
      commandId: "custom-test",
      name: "Test",
      playCompletionSound: true,
    });

    vscodeState.workspaceRoot = "/workspace/project-b";

    expect(
      getSidebarCommandButtons(secondContext as never).some(
        (command) => command.commandId === "custom-test",
      ),
    ).toBe(false);
  });

  test("should show global commands in every project", async () => {
    const globalStorage = new Map<string, unknown>();
    const firstContext = createMockContext(globalStorage);
    const secondContext = createMockContext(globalStorage);

    vscodeState.workspaceRoot = "/workspace/project-a";
    await saveSidebarCommandPreference(firstContext as never, {
      actionType: "browser",
      closeTerminalOnExit: false,
      commandId: "custom-docs",
      isGlobal: true,
      name: "Docs",
      playCompletionSound: false,
      url: "https://example.com/docs",
    });

    vscodeState.workspaceRoot = "/workspace/project-b";

    expect(getSidebarCommandButtons(secondContext as never)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandId: "custom-docs",
          isGlobal: true,
          url: "https://example.com/docs",
        }),
      ]),
    );
  });

  test("should migrate legacy workspace commands into shared worktree storage", async () => {
    const { globalStorage, mainRoot, worktreeRoot } = await createGitWorktreeFixture();
    const mainContext = createMockContext(globalStorage);
    const worktreeContext = createMockContext(globalStorage);
    await mainContext.workspaceState.update("zmux.sidebarCommands", [
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm build",
        commandId: "custom-build",
        isDefault: false,
        name: "Build",
        playCompletionSound: true,
      },
    ]);

    vscodeState.workspaceRoot = mainRoot;
    await migrateSidebarCommandPreferences(mainContext as never);
    vscodeState.workspaceRoot = worktreeRoot;

    expect(getSidebarCommandButtons(worktreeContext as never)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: "pnpm build",
          commandId: "custom-build",
        }),
      ]),
    );
  });

  async function createGitWorktreeFixture(): Promise<{
    globalStorage: Map<string, unknown>;
    mainRoot: string;
    worktreeRoot: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), "zmux-sidebar-commands-"));
    temporaryRoots.push(root);
    const mainRoot = join(root, "demo-project");
    const worktreeRoot = join(root, "demo-project-native-ghostty");
    const worktreeGitDir = join(mainRoot, ".git", "worktrees", "demo-project-native-ghostty");

    await mkdir(join(mainRoot, ".git"), { recursive: true });
    await mkdir(worktreeGitDir, { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });
    await writeFile(join(worktreeRoot, ".git"), `gitdir: ${worktreeGitDir}\n`);
    await writeFile(join(worktreeGitDir, "commondir"), "../..\n");

    return {
      globalStorage: new Map<string, unknown>(),
      mainRoot,
      worktreeRoot,
    };
  }
});

function createMockContext(globalStorage = new Map<string, unknown>()) {
  return {
    globalState: createMockMemento(globalStorage),
    workspaceState: createMockMemento(),
  };
}

function createMockMemento(storage = new Map<string, unknown>()) {
  return {
    get: vi.fn((key: string, defaultValue?: unknown) =>
      storage.has(key) ? storage.get(key) : defaultValue,
    ),
    update: vi.fn(async (key: string, value: unknown) => {
      if (value === undefined) {
        storage.delete(key);
        return;
      }

      storage.set(key, value);
    }),
  };
}
