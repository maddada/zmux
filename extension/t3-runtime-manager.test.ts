import { access, mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

const { workspaceState } = vi.hoisted(() => ({
  workspaceState: {
    configuration: {} as Record<string, string | undefined>,
    workspaceFolders: undefined as Array<{ uri: { fsPath: string } }> | undefined,
  },
}));

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: <T>(key: string) => workspaceState.configuration[key] as T | undefined,
    }),
    get workspaceFolders() {
      return workspaceState.workspaceFolders;
    },
  },
}));

import { T3RuntimeManager } from "./t3-runtime-manager";

describe("T3RuntimeManager", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    workspaceState.configuration = {};
    workspaceState.workspaceFolders = undefined;
    delete process.env.zmux_T3CODE_REPO_ROOT;
  });

  test("should resolve the managed runtime entrypoint from the open workspace checkout", async () => {
    const repoRoot = await createManagedT3CodeRepoFixture();
    workspaceState.workspaceFolders = [{ uri: { fsPath: repoRoot } }];
    vi.spyOn(process, "cwd").mockReturnValue(join(repoRoot, ".tmp", "cwd"));
    const manager = new T3RuntimeManager({
      extensionPath: join(repoRoot, "out"),
      globalStorageUri: { fsPath: join(repoRoot, ".tmp", "storage") },
    } as never);

    await expect(
      (
        manager as never as {
          ensureManagedRuntimeEntrypoint: () => Promise<void>;
        }
      ).ensureManagedRuntimeEntrypoint(),
    ).resolves.toBeUndefined();

    const startupCommand = (
      manager as never as {
        resolveStartupCommand: (startupCommand: string) => string;
      }
    ).resolveStartupCommand("npx --yes t3");
    expect(startupCommand).toContain(join(repoRoot, "apps", "server", "src", "bin.ts"));
    expect(startupCommand).toContain("--bootstrap-fd 3");
  });

  test("should prefer the bundled runtime when no explicit managed checkout is configured", async () => {
    const extensionRoot = await createBundledRuntimeFixture();
    const manager = new T3RuntimeManager({
      extensionPath: extensionRoot,
      globalStorageUri: { fsPath: join(extensionRoot, ".tmp", "storage") },
    } as never);

    const startupCommand = (
      manager as never as {
        resolveStartupCommand: (startupCommand: string) => string;
      }
    ).resolveStartupCommand("npx --yes t3");

    expect(startupCommand).toContain(
      join(extensionRoot, "out", "t3code-server", "dist", "bin.mjs"),
    );
    expect(startupCommand).toContain(
      "--mode desktop --host 127.0.0.1 --port 3774 --no-browser --bootstrap-fd 3",
    );
  });

  test("should resolve the configured t3code provider from its bundled runtime", async () => {
    const extensionRoot = await createBundledRuntimeFixture();
    vi.spyOn(process, "cwd").mockReturnValue(join(extensionRoot, ".tmp", "cwd"));
    const manager = new T3RuntimeManager({
      extensionPath: extensionRoot,
      globalStorageUri: { fsPath: join(extensionRoot, ".tmp", "storage") },
    } as never);

    const startupCommand = (
      manager as never as {
        resolveStartupCommand: (startupCommand: string) => string;
      }
    ).resolveStartupCommand("npx --yes t3");

    expect(startupCommand).toContain(
      join(extensionRoot, "out", "t3code-server", "dist", "bin.mjs"),
    );
    expect(startupCommand).toContain("--bootstrap-fd 3");
  });

  test("should resolve the configured t3code provider from its sibling checkout", async () => {
    const parentDir = await mkdtemp(join(tmpdir(), "zmux-parent-"));
    const workspaceRoot = join(parentDir, "zmux");
    const t3codeRoot = join(parentDir, "t3code-embed");
    await mkdir(workspaceRoot, { recursive: true });
    await createManagedT3CodeRepoFixture(t3codeRoot);
    workspaceState.workspaceFolders = [{ uri: { fsPath: workspaceRoot } }];
    vi.spyOn(process, "cwd").mockReturnValue(workspaceRoot);
    const manager = new T3RuntimeManager({
      extensionPath: join(workspaceRoot, "out"),
      globalStorageUri: { fsPath: join(workspaceRoot, ".tmp", "storage") },
    } as never);

    await expect(
      (
        manager as never as {
          ensureManagedRuntimeEntrypoint: () => Promise<void>;
        }
      ).ensureManagedRuntimeEntrypoint(),
    ).resolves.toBeUndefined();

    const startupCommand = (
      manager as never as {
        resolveStartupCommand: (startupCommand: string) => string;
      }
    ).resolveStartupCommand("npx --yes t3");
    expect(startupCommand).toContain(join(t3codeRoot, "apps", "server", "src", "bin.ts"));
    expect(startupCommand).toContain("--bootstrap-fd 3");
  });

  test("should fetch orchestration snapshots over HTTP for t3code", async () => {
    const manager = new T3RuntimeManager({
      globalStorageUri: { fsPath: "/tmp/zmux-test" },
    } as never);
    const runtime = manager as never as {
      ensureAuthStateReady: () => Promise<{ ownerBearerToken: string }>;
      getSnapshot: () => Promise<unknown>;
    };
    runtime.ensureAuthStateReady = vi.fn(async () => ({ ownerBearerToken: "owner-token" }));
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ projects: [], threads: [] }),
      ok: true,
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock as typeof globalThis.fetch);

    await expect(runtime.getSnapshot()).resolves.toEqual({ projects: [], threads: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/orchestration/snapshot", "http://127.0.0.1:3774"),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect((requestInit?.headers as Headers).get("authorization")).toBe("Bearer owner-token");
  });

  test("should dispatch orchestration commands over HTTP for t3code", async () => {
    const manager = new T3RuntimeManager({
      globalStorageUri: { fsPath: "/tmp/zmux-test" },
    } as never);
    const runtime = manager as never as {
      dispatchCommand: (command: Record<string, unknown>) => Promise<unknown>;
      ensureAuthStateReady: () => Promise<{ ownerBearerToken: string }>;
    };
    runtime.ensureAuthStateReady = vi.fn(async () => ({ ownerBearerToken: "owner-token" }));
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ sequence: 1 }),
      ok: true,
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock as typeof globalThis.fetch);

    await expect(runtime.dispatchCommand({ type: "project.create" })).resolves.toEqual({
      sequence: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/orchestration/dispatch", "http://127.0.0.1:3774"),
      expect.objectContaining({
        body: JSON.stringify({ type: "project.create" }),
        headers: expect.any(Headers),
        method: "POST",
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect((requestInit?.headers as Headers).get("authorization")).toBe("Bearer owner-token");
  });

  test("should reattach a restored thread to the project that already owns it", async () => {
    const manager = new T3RuntimeManager({
      globalStorageUri: { fsPath: "/tmp/zmux-test" },
    } as never);
    const runtime = manager as never as {
      ensureRunning: (workspaceRoot?: string, startupCommand?: string) => Promise<string>;
      getSnapshot: () => Promise<{
        projects: Array<{
          deletedAt: null | string;
          id: string;
          workspaceRoot: string;
        }>;
        threads: Array<{
          deletedAt: null | string;
          id: string;
          projectId: string;
        }>;
      }>;
      getServerOrigin: () => string;
      createProject: (workspaceRoot: string) => Promise<never>;
      dispatchCommand: (command: Record<string, unknown>) => Promise<unknown>;
      ensureThreadSession: (
        metadata: {
          projectId: string;
          serverOrigin: string;
          threadId: string;
          workspaceRoot: string;
        },
        title?: string,
        startupCommand?: string,
      ) => Promise<{
        projectId: string;
        serverOrigin: string;
        threadId: string;
        workspaceRoot: string;
      }>;
    };
    const createProject = vi.fn();
    const dispatchCommand = vi.fn();
    runtime.ensureRunning = vi.fn(async () => "http://127.0.0.1:3774");
    runtime.getSnapshot = vi.fn(async () => ({
      projects: [
        { deletedAt: null, id: "project-new", workspaceRoot: "/repo" },
        { deletedAt: null, id: "project-existing", workspaceRoot: "/repo" },
      ],
      threads: [{ deletedAt: null, id: "thread-existing", projectId: "project-existing" }],
    }));
    runtime.getServerOrigin = vi.fn(() => "http://127.0.0.1:3774");
    runtime.createProject = createProject;
    runtime.dispatchCommand = dispatchCommand;

    const metadata = await runtime.ensureThreadSession({
      projectId: "project-stale",
      serverOrigin: "http://127.0.0.1:3774",
      threadId: "thread-existing",
      workspaceRoot: "/repo",
    });

    expect(metadata).toEqual({
      projectId: "project-existing",
      serverOrigin: "http://127.0.0.1:3774",
      threadId: "thread-existing",
      workspaceRoot: "/repo",
    });
    expect(createProject).not.toHaveBeenCalled();
    expect(dispatchCommand).not.toHaveBeenCalled();
  });

  test("should restart a managed supervisor when the installed build is newer", async () => {
    const repoRoot = await createManagedT3CodeRepoFixture();
    const extensionRoot = await mkdtemp(join(tmpdir(), "zmux-extension-"));
    const workspaceHostPath = join(extensionRoot, "out", "workspace", "t3-frame-host.js");
    const embedIndexPath = join(extensionRoot, "out", "t3code-embed", "index.html");
    await mkdir(join(extensionRoot, "out", "workspace"), { recursive: true });
    await mkdir(join(extensionRoot, "out", "t3code-embed"), { recursive: true });
    await writeFile(workspaceHostPath, "export {};\n", "utf8");
    await writeFile(embedIndexPath, "<html></html>\n", "utf8");

    const oldDate = new Date("2026-04-12T15:55:47.928Z");
    const newDate = new Date("2026-04-12T20:24:32.000Z");
    await utimes(workspaceHostPath, newDate, newDate);
    await utimes(embedIndexPath, newDate, newDate);

    process.env.zmux_T3CODE_REPO_ROOT = repoRoot;

    const manager = new T3RuntimeManager({
      extensionPath: extensionRoot,
      globalStorageUri: { fsPath: join(extensionRoot, ".tmp", "storage") },
    } as never);
    const runtime = manager as never as {
      getRuntimeStoragePath: () => string;
      hasActiveManagedSupervisor: (expectedCommand?: string) => Promise<boolean>;
    };
    const runtimeStoragePath = runtime.getRuntimeStoragePath();
    await mkdir(runtimeStoragePath, { recursive: true });
    await writeFile(
      join(runtimeStoragePath, "supervisor.json"),
      JSON.stringify(
        {
          childPid: 44068,
          command:
            "node dist/bin.mjs --mode desktop --host 127.0.0.1 --port 3774 --no-browser --bootstrap-fd 3",
          cwd: repoRoot,
          host: "127.0.0.1",
          pid: 45620,
          port: 3774,
          startedAt: oldDate.toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );

    const killed: Array<{ pid: number; signal?: NodeJS.Signals | number }> = [];
    vi.spyOn(process, "kill").mockImplementation(((
      pid: number,
      signal?: NodeJS.Signals | number,
    ) => {
      if (signal === 0) {
        return true;
      }
      killed.push({ pid, signal });
      return true;
    }) as typeof process.kill);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })) as typeof globalThis.fetch);

    await expect(
      runtime.hasActiveManagedSupervisor(
        "node dist/bin.mjs --mode desktop --host 127.0.0.1 --port 3774 --no-browser --bootstrap-fd 3",
      ),
    ).resolves.toBe(false);

    expect(killed).toContainEqual({ pid: 44068, signal: "SIGTERM" });
    expect(killed).toContainEqual({ pid: 45620, signal: "SIGTERM" });
    await expect(access(join(runtimeStoragePath, "supervisor.json"))).rejects.toBeDefined();
  });
});

async function createManagedT3CodeRepoFixture(targetRoot?: string): Promise<string> {
  const repoRoot = targetRoot ?? (await mkdtemp(join(tmpdir(), "zmux-managed-t3code-")));
  const sourceEntrypoint = join(repoRoot, "apps", "server", "src", "bin.ts");
  const windowsEntrypoint = join(repoRoot, "apps", "server", "dist", "bin.mjs");
  await mkdir(join(repoRoot, "apps", "server", "src"), { recursive: true });
  await mkdir(join(repoRoot, "apps", "server", "dist"), { recursive: true });
  await writeFile(sourceEntrypoint, "export {};\n", "utf8");
  await writeFile(windowsEntrypoint, "export {};\n", "utf8");
  return repoRoot;
}

async function createBundledRuntimeFixture(targetRoot?: string): Promise<string> {
  const extensionRoot = targetRoot ?? (await mkdtemp(join(tmpdir(), "zmux-bundled-runtime-")));
  const bundledT3CodeEntrypoint = join(extensionRoot, "out", "t3code-server", "dist", "bin.mjs");
  const bundledT3CodeNodeModules = join(extensionRoot, "out", "t3code-server", "node_modules");
  await mkdir(join(extensionRoot, "out", "t3code-server", "dist"), { recursive: true });
  await mkdir(bundledT3CodeNodeModules, { recursive: true });
  await writeFile(bundledT3CodeEntrypoint, "export {};\n", "utf8");
  return extensionRoot;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
