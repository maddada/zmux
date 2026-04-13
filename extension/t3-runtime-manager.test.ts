import { access, mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

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

type FakeListener = (event?: { data?: unknown }) => void;

class FakeWebSocket {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;
  public static instances: FakeWebSocket[] = [];
  public static outcomes: Array<"error" | "open"> = [];

  public readyState = FakeWebSocket.CONNECTING;
  private readonly listeners = new Map<string, Array<{ listener: FakeListener; once: boolean }>>();

  public constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
    const outcome = FakeWebSocket.outcomes.shift() ?? "open";
    setTimeout(() => {
      if (outcome === "open") {
        this.readyState = FakeWebSocket.OPEN;
        this.dispatch("open");
        return;
      }

      this.readyState = FakeWebSocket.CLOSED;
      this.dispatch("error");
      this.dispatch("close");
    }, 0);
  }

  public static reset(): void {
    FakeWebSocket.instances = [];
    FakeWebSocket.outcomes = [];
  }

  public addEventListener(
    type: string,
    listener: FakeListener,
    options?: { once?: boolean },
  ): void {
    const current = this.listeners.get(type) ?? [];
    current.push({ listener, once: options?.once === true });
    this.listeners.set(type, current);
  }

  public removeEventListener(type: string, listener: FakeListener): void {
    const current = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      current.filter((entry) => entry.listener !== listener),
    );
  }

  public close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close");
  }

  public send(_message: string): void {}

  private dispatch(type: string, event?: { data?: unknown }): void {
    const current = [...(this.listeners.get(type) ?? [])];
    for (const entry of current) {
      entry.listener(event);
      if (entry.once) {
        this.removeEventListener(type, entry.listener);
      }
    }
  }
}

describe("T3RuntimeManager", () => {
  beforeEach(() => {
    FakeWebSocket.reset();
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    workspaceState.configuration = {};
    workspaceState.workspaceFolders = undefined;
    delete process.env.VSMUX_T3_REPO_ROOT;
  });

  test("should retry the websocket connection when the first startup handshake fails", async () => {
    FakeWebSocket.outcomes = ["error", "open"];

    const manager = new T3RuntimeManager({
      globalStorageUri: { fsPath: "/tmp/vsmux-test" },
    } as never);

    const connectPromise = (manager as never as { connect: () => Promise<WebSocket> }).connect();

    await vi.runAllTimersAsync();
    const socket = await connectPromise;

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(socket).toBe(FakeWebSocket.instances[1]);
  });

  test("should resolve the managed runtime entrypoint from the open workspace checkout", async () => {
    const repoRoot = await createManagedRepoFixture();
    workspaceState.workspaceFolders = [{ uri: { fsPath: repoRoot } }];
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
    expect(startupCommand).toContain(join(repoRoot, "apps", "server", "src", "index.ts"));
  });

  test("should prefer a sibling dpcode-embed checkout over the open VSmux workspace", async () => {
    const parentDir = await mkdtemp(join(tmpdir(), "vsmux-parent-"));
    const workspaceRoot = join(parentDir, "VSmux");
    const dpcodeRoot = join(parentDir, "dpcode-embed");
    await mkdir(workspaceRoot, { recursive: true });
    await createManagedRepoFixture(dpcodeRoot);
    workspaceState.workspaceFolders = [{ uri: { fsPath: workspaceRoot } }];
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
    expect(startupCommand).toContain(join(dpcodeRoot, "apps", "server", "src", "index.ts"));
    expect(startupCommand).not.toContain(join(workspaceRoot, "apps", "server", "src", "index.ts"));
  });

  test("should honor the configured T3 repo root when provided", async () => {
    const repoRoot = await createManagedRepoFixture();
    workspaceState.configuration["VSmux.t3RepoRoot"] = repoRoot;
    workspaceState.workspaceFolders = [{ uri: { fsPath: join(repoRoot, "..", "VSmux") } }];
    const manager = new T3RuntimeManager({
      extensionPath: join(repoRoot, "..", "VSmux", "out"),
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
    expect(startupCommand).toContain(join(repoRoot, "apps", "server", "src", "index.ts"));
  });

  test("should reattach a restored thread to the project that already owns it", async () => {
    const manager = new T3RuntimeManager({
      globalStorageUri: { fsPath: "/tmp/vsmux-test" },
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
    const repoRoot = await createManagedDpRepoFixture();
    const extensionRoot = await mkdtemp(join(tmpdir(), "vsmux-extension-"));
    const workspaceHostPath = join(extensionRoot, "out", "workspace", "t3-frame-host.js");
    const embedIndexPath = join(extensionRoot, "out", "t3-embed", "index.html");
    await mkdir(join(extensionRoot, "out", "workspace"), { recursive: true });
    await mkdir(join(extensionRoot, "out", "t3-embed"), { recursive: true });
    await writeFile(workspaceHostPath, "export {};\n", "utf8");
    await writeFile(embedIndexPath, "<html></html>\n", "utf8");

    const oldDate = new Date("2026-04-12T15:55:47.928Z");
    const newDate = new Date("2026-04-12T20:24:32.000Z");
    await utimes(workspaceHostPath, newDate, newDate);
    await utimes(embedIndexPath, newDate, newDate);

    process.env.VSMUX_T3_REPO_ROOT = repoRoot;

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
          command: "node dist/index.mjs --mode desktop --host 127.0.0.1 --port 3774 --no-browser",
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
        "node dist/index.mjs --mode desktop --host 127.0.0.1 --port 3774 --no-browser",
      ),
    ).resolves.toBe(false);

    expect(killed).toEqual([
      { pid: 44068, signal: "SIGTERM" },
      { pid: 45620, signal: "SIGTERM" },
    ]);
    await expect(access(join(runtimeStoragePath, "supervisor.json"))).rejects.toBeDefined();
  });
});

async function createManagedRepoFixture(targetRoot?: string): Promise<string> {
  const repoRoot = targetRoot ?? (await mkdtemp(join(tmpdir(), "vsmux-managed-t3-")));
  const entrypoint = join(repoRoot, "apps", "server", "src", "index.ts");
  await mkdir(join(repoRoot, "apps", "server", "src"), { recursive: true });
  await writeFile(entrypoint, "export {};\n", "utf8");
  return repoRoot;
}

async function createManagedDpRepoFixture(targetRoot?: string): Promise<string> {
  const repoRoot = targetRoot ?? (await mkdtemp(join(tmpdir(), "vsmux-managed-dp-")));
  const sourceEntrypoint = join(repoRoot, "apps", "server", "src", "index.ts");
  const windowsEntrypoint = join(repoRoot, "apps", "server", "dist", "index.mjs");
  await mkdir(join(repoRoot, "apps", "server", "src"), { recursive: true });
  await mkdir(join(repoRoot, "apps", "server", "dist"), { recursive: true });
  await writeFile(sourceEntrypoint, "export {};\n", "utf8");
  await writeFile(windowsEntrypoint, "export {};\n", "utf8");
  return repoRoot;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
