import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import * as vscode from "vscode";
import type { T3SessionMetadata } from "../shared/session-grid-contract";
import {
  createT3RpcPongMessage,
  createT3RpcRequestMessage,
  createT3RpcRequestId,
  formatT3RpcDefect,
  formatT3RpcFailure,
  parseT3RpcIncomingMessage,
} from "./t3-rpc-protocol";
import { getDefaultShell, getDefaultWorkspaceCwd } from "./terminal-workspace-helpers";

const DEFAULT_MODEL = "gpt-5-codex";
const LEGACY_T3_COMMAND = "npx --yes t3";
const DEFAULT_T3_COMMAND = LEGACY_T3_COMMAND;
const DEFAULT_MANAGED_T3_REPO_ROOT = "/Users/madda/dev/_active/agent-tiler";
const MANAGED_T3_ENTRYPOINT_SEGMENTS = [
  "forks",
  "t3code-embed",
  "upstream",
  "apps",
  "server",
  "src",
  "bin.ts",
] as const;
const T3_HOST = "127.0.0.1";
const T3_PORT = 3774;
const START_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;
const LEASE_HEARTBEAT_MS = 30_000;
const LEASE_GRACE_MS = 180_000;
const RUNTIME_STORAGE_DIR_NAME = "t3-runtime";
const MANAGED_T3_HOME_DIR_NAME = "managed-home";
const LEASES_DIR_NAME = "leases";
const SUPERVISOR_STATE_FILE = "supervisor.json";
const SUPERVISOR_LAUNCH_LOCK_FILE = "supervisor-launch.lock";

type T3ModelSelection = {
  model: string;
  provider: "codex" | "claudeAgent";
};

type SupervisorState = {
  childPid?: number;
  command: string;
  cwd: string;
  host: string;
  pid: number;
  port: number;
  startedAt: string;
};

type T3Snapshot = {
  projects: Array<{
    createdAt: string;
    defaultModelSelection: T3ModelSelection | null;
    deletedAt: string | null;
    id: string;
    title: string;
    updatedAt: string;
    workspaceRoot: string;
  }>;
  threads: Array<{
    createdAt: string;
    deletedAt: string | null;
    id: string;
    modelSelection: T3ModelSelection;
    projectId: string;
    title: string;
    updatedAt: string;
  }>;
};

type T3Project = T3Snapshot["projects"][number];

type PendingRequest = {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
  timeout: NodeJS.Timeout;
};

export class T3RuntimeManager implements vscode.Disposable {
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly leaseId = randomUUID();
  private socket: WebSocket | undefined;
  private ensureRunningPromise: Promise<string> | undefined;
  private connectPromise: Promise<WebSocket> | undefined;
  private leaseHeartbeatTimer: NodeJS.Timeout | undefined;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public dispose(): void {
    this.ensureRunningPromise = undefined;
    this.connectPromise = undefined;
    this.socket?.close();
    this.socket = undefined;
    this.stopLeaseHeartbeat();
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("T3 runtime disposed."));
    }
    this.pendingRequests.clear();
  }

  public getServerOrigin(): string {
    return getT3Origin();
  }

  public getWebSocketUrl(): string {
    return getT3WebSocketUrl();
  }

  public async setLeaseActive(active: boolean): Promise<void> {
    if (active) {
      await this.startLeaseHeartbeat();
      return;
    }

    await this.stopLeaseHeartbeat(true);
  }

  public async createThreadSession(
    workspaceRoot = getDefaultWorkspaceCwd(),
    startupCommand = DEFAULT_T3_COMMAND,
    title = "T3 Code",
  ): Promise<T3SessionMetadata> {
    await this.ensureRunning(workspaceRoot, startupCommand);
    const snapshot = await this.getSnapshot();
    const project =
      snapshot.projects.find(
        (candidate) => candidate.deletedAt === null && candidate.workspaceRoot === workspaceRoot,
      ) ?? (await this.createProject(workspaceRoot));
    const threadId = randomUUID();
    await this.dispatchCommand({
      branch: null,
      commandId: randomUUID(),
      createdAt: new Date().toISOString(),
      interactionMode: "default",
      modelSelection: project.defaultModelSelection ?? {
        model: DEFAULT_MODEL,
        provider: "codex",
      },
      projectId: project.id,
      runtimeMode: "full-access",
      threadId,
      title,
      type: "thread.create",
      worktreePath: null,
    });

    return {
      projectId: project.id,
      serverOrigin: this.getServerOrigin(),
      threadId,
      workspaceRoot,
    };
  }

  public async ensureThreadSession(
    metadata: T3SessionMetadata,
    title = "T3 Code",
    startupCommand = DEFAULT_T3_COMMAND,
  ): Promise<T3SessionMetadata> {
    await this.ensureRunning(metadata.workspaceRoot, startupCommand);
    const snapshot = await this.getSnapshot();
    const project =
      snapshot.projects.find(
        (candidate) =>
          candidate.deletedAt === null &&
          candidate.id === metadata.projectId &&
          candidate.workspaceRoot === metadata.workspaceRoot,
      ) ??
      snapshot.projects.find(
        (candidate) => candidate.deletedAt === null && candidate.workspaceRoot === metadata.workspaceRoot,
      ) ??
      (await this.createProject(metadata.workspaceRoot));
    const existingThread = snapshot.threads.find(
      (candidate) =>
        candidate.deletedAt === null &&
        candidate.id === metadata.threadId &&
        candidate.projectId === project.id,
    );
    const serverOrigin = this.getServerOrigin();

    if (metadata.serverOrigin === serverOrigin && existingThread) {
      return {
        ...metadata,
        projectId: project.id,
        serverOrigin,
      };
    }

    const threadId = existingThread?.id ?? randomUUID();
    if (!existingThread) {
      await this.dispatchCommand({
        branch: null,
        commandId: randomUUID(),
        createdAt: new Date().toISOString(),
        interactionMode: "default",
        modelSelection: project.defaultModelSelection ?? {
          model: DEFAULT_MODEL,
          provider: "codex",
        },
        projectId: project.id,
        runtimeMode: "full-access",
        threadId,
        title,
        type: "thread.create",
        worktreePath: null,
      });
    }

    return {
      projectId: project.id,
      serverOrigin,
      threadId,
      workspaceRoot: metadata.workspaceRoot,
    };
  }

  public async ensureRunning(
    workspaceRoot = getDefaultWorkspaceCwd(),
    startupCommand = DEFAULT_T3_COMMAND,
  ): Promise<string> {
    this.ensureRunningPromise ??= this.ensureRunningInternal(workspaceRoot, startupCommand).finally(
      () => {
        this.ensureRunningPromise = undefined;
      },
    );
    return this.ensureRunningPromise;
  }

  private async ensureRunningInternal(
    workspaceRoot: string,
    startupCommand: string,
  ): Promise<string> {
    const origin = getT3Origin();
    const resolvedStartupCommand = this.resolveStartupCommand(startupCommand);
    await this.ensureRuntimeStorage();
    await this.ensureManagedRuntimeEntrypoint();
    const hasManagedSupervisor = await this.hasActiveManagedSupervisor(resolvedStartupCommand);
    if (await isOriginResponsive(origin)) {
      if (hasManagedSupervisor) {
        await this.startLeaseHeartbeat();
        return origin;
      }
      if (isManagedStartupCommand(resolvedStartupCommand)) {
        await this.stopStaleManagedRuntime();
      } else {
        return origin;
      }
    }

    await this.startLeaseHeartbeat();
    if (!(await this.hasActiveManagedSupervisor(resolvedStartupCommand))) {
      await this.startSupervisorIfNeeded(workspaceRoot, startupCommand);
    }

    const deadline = Date.now() + START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await isOriginResponsive(origin)) {
        return origin;
      }
      await delay(250);
    }

    throw new Error(`Timed out waiting for managed T3 Code to start on ${origin}.`);
  }

  private async createProject(workspaceRoot: string): Promise<T3Project> {
    const projectId = randomUUID();
    const now = new Date().toISOString();
    const title = basename(workspaceRoot) || "project";
    await this.dispatchCommand({
      commandId: randomUUID(),
      createdAt: now,
      defaultModelSelection: {
        model: DEFAULT_MODEL,
        provider: "codex",
      },
      projectId,
      title,
      type: "project.create",
      workspaceRoot,
    });

    return {
      createdAt: now,
      defaultModelSelection: {
        model: DEFAULT_MODEL,
        provider: "codex",
      },
      deletedAt: null,
      id: projectId,
      title,
      updatedAt: now,
      workspaceRoot,
    };
  }

  private async getSnapshot(): Promise<T3Snapshot> {
    return this.request("orchestration.getSnapshot");
  }

  private async dispatchCommand(command: Record<string, unknown>): Promise<unknown> {
    return this.request("orchestration.dispatchCommand", command);
  }

  private async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const socket = await this.connect();
    const id = createT3RpcRequestId();
    const payload = JSON.stringify(createT3RpcRequestMessage(id, method, params ?? {}));

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Timed out waiting for T3 websocket response: ${method}`));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        reject,
        resolve: resolve as (value: unknown) => void,
        timeout,
      });
      try {
        socket.send(payload);
      } catch (error) {
        const pending = this.pendingRequests.get(id);
        if (!pending) {
          return;
        }

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private async connect(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    this.connectPromise ??= new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.getWebSocketUrl());
      const handleMessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };
      const handleClose = () => {
        if (this.socket === socket) {
          this.socket = undefined;
        }
        this.connectPromise = undefined;
      };
      const handleError = () => {
        this.connectPromise = undefined;
        reject(new Error("Failed to connect to the T3 websocket."));
      };

      socket.addEventListener(
        "open",
        () => {
          this.socket = socket;
          socket.addEventListener("message", handleMessage);
          socket.addEventListener("close", handleClose);
          resolve(socket);
        },
        { once: true },
      );
      socket.addEventListener("error", handleError, { once: true });
    }).finally(() => {
      this.connectPromise = undefined;
    });

    return this.connectPromise;
  }

  private handleMessage(raw: string | ArrayBuffer | Blob): void {
    const message = parseT3RpcIncomingMessage(raw);
    if (!message) {
      return;
    }

    if (message._tag === "Ping") {
      this.socket?.send(JSON.stringify(createT3RpcPongMessage()));
      return;
    }

    if (message._tag === "Defect") {
      const error = new Error(
        formatT3RpcDefect(message.defect, "The T3 runtime reported an unexpected websocket defect."),
      );
      for (const pending of this.pendingRequests.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      this.pendingRequests.clear();
      return;
    }

    if (message._tag !== "Exit") {
      return;
    }

    const pending = this.pendingRequests.get(message.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.requestId);
    if (message.exit._tag === "Failure") {
      pending.reject(
        new Error(
          formatT3RpcFailure(message.exit, "The T3 runtime rejected the websocket request."),
        ),
      );
      return;
    }

    pending.resolve(message.exit.value);
  }

  private async startSupervisorIfNeeded(
    workspaceRoot: string,
    startupCommand: string,
  ): Promise<void> {
    if (await this.hasActiveManagedSupervisor()) {
      return;
    }

    const releaseLock = await this.acquireSupervisorLaunchLock();
    if (!releaseLock) {
      return;
    }

    try {
      if (await this.hasActiveManagedSupervisor()) {
        return;
      }

      const resolvedStartupCommand = this.resolveStartupCommand(startupCommand);
      const supervisorScriptPath = join(__dirname, "t3-runtime-supervisor.js");
      const shellPath = getDefaultShell();
      const nodeRuntimePath = getNodeRuntimePath();
      const child = spawn(
        nodeRuntimePath,
        [
          supervisorScriptPath,
          "--command",
          resolvedStartupCommand,
          "--cwd",
          workspaceRoot,
          "--grace-ms",
          String(LEASE_GRACE_MS),
          "--host",
          T3_HOST,
          "--lease-dir",
          this.getLeaseDirectoryPath(),
          "--port",
          String(T3_PORT),
          "--shell-path",
          shellPath,
          "--state-file",
          this.getSupervisorStatePath(),
        ],
        {
          detached: true,
          env: {
            ...process.env,
            T3CODE_HOME: this.getManagedT3HomePath(),
          },
          stdio: "ignore",
        },
      );
      child.unref();
    } finally {
      await releaseLock();
    }
  }

  private async startLeaseHeartbeat(): Promise<void> {
    await this.ensureRuntimeStorage();
    await this.writeLeaseFile();
    if (this.leaseHeartbeatTimer) {
      return;
    }

    this.leaseHeartbeatTimer = setInterval(() => {
      void this.writeLeaseFile();
    }, LEASE_HEARTBEAT_MS);
    this.leaseHeartbeatTimer.unref?.();
  }

  private async stopLeaseHeartbeat(removeLeaseFile = false): Promise<void> {
    if (this.leaseHeartbeatTimer) {
      clearInterval(this.leaseHeartbeatTimer);
      this.leaseHeartbeatTimer = undefined;
    }

    if (!removeLeaseFile) {
      return;
    }

    await rm(this.getLeaseFilePath(), { force: true });
  }

  private async writeLeaseFile(): Promise<void> {
    await writeFile(
      this.getLeaseFilePath(),
      JSON.stringify(
        {
          leaseId: this.leaseId,
          updatedAt: Date.now(),
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  private async ensureRuntimeStorage(): Promise<void> {
    await mkdir(this.getLeaseDirectoryPath(), { recursive: true });
  }

  private async ensureManagedRuntimeEntrypoint(): Promise<void> {
    const entrypoint = getManagedT3EntrypointPath();
    await stat(entrypoint).catch(() => {
      throw new Error(
        [
          "The updated T3 runtime source is missing from the main repo checkout.",
          `Expected: ${entrypoint}`,
          "Sync forks/t3code-embed/upstream in /Users/madda/dev/_active/agent-tiler and reinstall the main-branch VSIX.",
        ].join(" "),
      );
    });
  }

  private getRuntimeStoragePath(): string {
    return join(this.context.globalStorageUri.fsPath, RUNTIME_STORAGE_DIR_NAME);
  }

  private getManagedT3HomePath(): string {
    return join(this.getRuntimeStoragePath(), MANAGED_T3_HOME_DIR_NAME);
  }

  private getLeaseDirectoryPath(): string {
    return join(this.getRuntimeStoragePath(), LEASES_DIR_NAME);
  }

  private getLeaseFilePath(): string {
    return join(this.getLeaseDirectoryPath(), `${this.leaseId}.json`);
  }

  private getSupervisorStatePath(): string {
    return join(this.getRuntimeStoragePath(), SUPERVISOR_STATE_FILE);
  }

  private getSupervisorLaunchLockPath(): string {
    return join(this.getRuntimeStoragePath(), SUPERVISOR_LAUNCH_LOCK_FILE);
  }

  private async hasActiveManagedSupervisor(expectedCommand?: string): Promise<boolean> {
    const state = await this.readSupervisorState();
    if (!state) {
      return false;
    }

    if (expectedCommand && state.command !== expectedCommand) {
      await rm(this.getSupervisorStatePath(), { force: true });
      return false;
    }

    const alive = isProcessAlive(state.pid);
    if (alive && (await isOriginResponsive(getT3Origin()))) {
      return true;
    }

    await rm(this.getSupervisorStatePath(), { force: true });
    return false;
  }

  private async readSupervisorState(): Promise<SupervisorState | undefined> {
    try {
      const raw = await readFile(this.getSupervisorStatePath(), "utf8");
      return JSON.parse(raw) as SupervisorState;
    } catch {
      return undefined;
    }
  }

  private async acquireSupervisorLaunchLock(): Promise<(() => Promise<void>) | undefined> {
    await this.ensureRuntimeStorage();
    const lockPath = this.getSupervisorLaunchLockPath();

    try {
      await writeFile(
        lockPath,
        JSON.stringify({
          createdAt: Date.now(),
          leaseId: this.leaseId,
        }),
        { encoding: "utf8", flag: "wx" },
      );
    } catch (error) {
      if (!isNodeErrorWithCode(error, "EEXIST")) {
        throw error;
      }

      const lockStats = await stat(lockPath).catch(() => undefined);
      if (!lockStats || Date.now() - lockStats.mtimeMs <= START_TIMEOUT_MS) {
        return undefined;
      }

      await rm(lockPath, { force: true });
      return this.acquireSupervisorLaunchLock();
    }

    return async () => {
      await rm(lockPath, { force: true });
    };
  }

  private async stopStaleManagedRuntime(): Promise<void> {
    const pid = getListeningProcessId(T3_PORT);
    if (pid !== undefined && isProcessAlive(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Best-effort cleanup only.
      }
    }
    await rm(this.getSupervisorStatePath(), { force: true });
  }

  private resolveStartupCommand(startupCommand: string): string {
    const trimmedCommand = startupCommand.trim();
    if (trimmedCommand.length > 0 && trimmedCommand !== LEGACY_T3_COMMAND) {
      return trimmedCommand;
    }

    return createManagedStartupCommand();
  }
}

function getT3Origin(): string {
  return `http://${T3_HOST}:${String(T3_PORT)}`;
}

function createManagedStartupCommand(): string {
  const bunPath = shellQuote(getBunRuntimePath());
  const entrypoint = shellQuote(getManagedT3EntrypointPath());
  return `${bunPath} ${entrypoint} --mode desktop --host ${T3_HOST} --port ${String(T3_PORT)} --no-browser`;
}

function getNodeRuntimePath(): string {
  const execBaseName = basename(process.execPath).toLowerCase();
  if (execBaseName === "node" || execBaseName === "node.exe") {
    return process.execPath;
  }

  if (process.platform === "win32") {
    const result = spawnSync("where.exe", ["node"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const firstResolvedPath = result.stdout
      ?.split(/\r?\n/)
      .map((value) => value.trim())
      .find((value) => value.length > 0);
    if (firstResolvedPath) {
      return firstResolvedPath;
    }
  }

  return process.platform === "win32" ? "node.exe" : "node";
}

function getT3WebSocketUrl(): string {
  return `ws://${T3_HOST}:${String(T3_PORT)}/ws`;
}

function getBunRuntimePath(): string {
  if (process.platform === "win32") {
    const result = spawnSync("where.exe", ["bun"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const firstResolvedPath = result.stdout
      ?.split(/\r?\n/u)
      .map((value) => value.trim())
      .find((value) => value.length > 0);
    if (firstResolvedPath) {
      return firstResolvedPath;
    }

    return "bun.exe";
  }

  const result = spawnSync("which", ["bun"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const resolvedPath = result.stdout?.trim();
  if (resolvedPath) {
    return resolvedPath;
  }

  return "bun";
}

async function isOriginResponsive(origin: string): Promise<boolean> {
  try {
    await fetch(origin, {
      method: "GET",
      signal: AbortSignal.timeout(1_500),
    });
    return true;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isNodeErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function getManagedT3EntrypointPath(): string {
  const repoRoot = process.env.VSMUX_T3_REPO_ROOT?.trim() || DEFAULT_MANAGED_T3_REPO_ROOT;
  return join(repoRoot, ...MANAGED_T3_ENTRYPOINT_SEGMENTS);
}

function isManagedStartupCommand(command: string): boolean {
  return command === createManagedStartupCommand();
}

function getListeningProcessId(port: number): number | undefined {
  if (process.platform === "win32") {
    return undefined;
  }

  const result = spawnSync("lsof", ["-nP", `-iTCP:${String(port)}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const pid = result.stdout
    ?.split(/\r?\n/u)
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  if (!pid) {
    return undefined;
  }

  const parsed = Number.parseInt(pid, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
