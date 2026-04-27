import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as vscode from "vscode";
import type { T3SessionMetadata } from "../shared/session-grid-contract";
import {
  getConfiguredManagedT3RepoRoot,
  getManagedT3BundledServerDirectoryName,
  getManagedT3BundledWebDirectoryName,
  getManagedT3EntrypointPath,
  getManagedT3Provider,
  getManagedT3ProviderDisplayName,
  getManagedT3RepoRoot,
  getManagedT3WebDistPath,
  getManagedT3WindowsEntrypointPath,
  type ManagedT3Provider,
} from "./managed-t3-paths";
import { getDefaultShell, getDefaultWorkspaceCwd } from "./terminal-workspace-helpers";

const DEFAULT_MODEL = "gpt-5-codex";
const LEGACY_T3_COMMAND = "npx --yes t3";
const DEFAULT_T3_COMMAND = LEGACY_T3_COMMAND;
const MINIMUM_MANAGED_T3_BUN_VERSION = "1.3.9";
const T3_HOST = "127.0.0.1";
const T3_PORT = 3774;
const START_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;
const SOCKET_CONNECT_TIMEOUT_MS = 1_500;
const LEASE_HEARTBEAT_MS = 30_000;
const LEASE_GRACE_MS = 180_000;
const RUNTIME_STORAGE_DIR_NAME = "t3-runtime";
const LEASES_DIR_NAME = "leases";
const SUPERVISOR_STATE_FILE = "supervisor.json";
const SUPERVISOR_LAUNCH_LOCK_FILE = "supervisor-launch.lock";
const AUTH_STATE_FILE = "auth-state.json";

type ManagedT3RuntimeSource =
  | {
      kind: "bundled";
      entrypoint: string;
      nodeModulesPath: string;
      provider: ManagedT3Provider;
      root: string;
    }
  | {
      kind: "external";
      entrypoint: string;
      nodeModulesPath: string;
      provider: ManagedT3Provider;
      repoRoot: string;
    };

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

export type ManagedT3RuntimeState = {
  pid: number;
  port: number;
  startedAt?: string;
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
type T3RuntimeAuthState = {
  desktopBootstrapToken?: string;
  ownerBearerToken?: string;
  provider?: ManagedT3Provider;
};

type ManagedBootstrapEnvelope = {
  authState: T3RuntimeAuthState;
  bootstrapJson?: string;
  env?: Record<string, string>;
};

export class T3RuntimeManager implements vscode.Disposable {
  private readonly leaseId = randomUUID();
  private ensureRunningPromise: Promise<string> | undefined;
  private leaseHeartbeatTimer: NodeJS.Timeout | undefined;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public dispose(): void {
    this.ensureRunningPromise = undefined;
    this.stopLeaseHeartbeat();
  }

  public getServerOrigin(): string {
    return getT3Origin();
  }

  public getWebSocketUrl(): string {
    return getT3WebSocketUrl();
  }

  public async createAuthenticatedWebSocketUrl(
    workspaceRoot = getDefaultWorkspaceCwd(),
    startupCommand = DEFAULT_T3_COMMAND,
  ): Promise<string> {
    await this.ensureRunning(workspaceRoot, startupCommand);
    return this.getAuthenticatedWebSocketUrl();
  }

  public async createEmbedBootstrap(
    workspaceRoot = getDefaultWorkspaceCwd(),
    startupCommand = DEFAULT_T3_COMMAND,
  ): Promise<{
    browserBootstrapToken: string;
    ownerBearerToken: string;
    serverOrigin: string;
    wsUrl: string;
  }> {
    await this.ensureRunning(workspaceRoot, startupCommand);
    const authState = await this.ensureAuthStateReady();
    const browserBootstrapToken = await this.issueBrowserBootstrapToken(authState);
    return {
      browserBootstrapToken,
      ownerBearerToken: authState.ownerBearerToken,
      serverOrigin: this.getServerOrigin(),
      wsUrl: this.getWebSocketUrl(),
    };
  }

  public async setLeaseActive(active: boolean): Promise<void> {
    if (active) {
      await this.startLeaseHeartbeat();
      return;
    }

    await this.stopLeaseHeartbeat(true);
  }

  public async getManagedRuntimeState(): Promise<ManagedT3RuntimeState | undefined> {
    const state = await this.readSupervisorState();
    if (
      state &&
      isProcessAlive(state.pid) &&
      state.port === T3_PORT &&
      (await isOriginResponsive(getT3Origin()))
    ) {
      return {
        pid: state.pid,
        port: state.port,
        startedAt: state.startedAt,
      };
    }

    const listeningPid = getListeningProcessId(T3_PORT);
    if (listeningPid !== undefined && (await isOriginResponsive(getT3Origin()))) {
      return {
        pid: listeningPid,
        port: T3_PORT,
      };
    }

    return undefined;
  }

  public async shutdownManagedRuntime(): Promise<boolean> {
    const state = await this.readSupervisorState();
    const hadRuntime = Boolean(state) || getListeningProcessId(T3_PORT) !== undefined;
    this.ensureRunningPromise = undefined;
    await this.stopLeaseHeartbeat(true);
    await this.stopStaleManagedRuntime(state);
    return hadRuntime;
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

  public async fetchActivitySnapshot(
    workspaceRoot = getDefaultWorkspaceCwd(),
    startupCommand = DEFAULT_T3_COMMAND,
  ): Promise<Pick<T3Snapshot, "threads">> {
    await this.ensureRunning(workspaceRoot, startupCommand);
    return this.getSnapshot();
  }

  public async ensureThreadSession(
    metadata: T3SessionMetadata,
    title = "T3 Code",
    startupCommand = DEFAULT_T3_COMMAND,
  ): Promise<T3SessionMetadata> {
    await this.ensureRunning(metadata.workspaceRoot, startupCommand);
    const snapshot = await this.getSnapshot();
    const existingThread =
      snapshot.threads.find(
        (candidate) => candidate.deletedAt === null && candidate.id === metadata.threadId,
      ) ?? null;
    const project =
      (existingThread
        ? snapshot.projects.find(
            (candidate) =>
              candidate.deletedAt === null &&
              candidate.id === existingThread.projectId &&
              candidate.workspaceRoot === metadata.workspaceRoot,
          )
        : null) ??
      snapshot.projects.find(
        (candidate) =>
          candidate.deletedAt === null &&
          candidate.id === metadata.projectId &&
          candidate.workspaceRoot === metadata.workspaceRoot,
      ) ??
      snapshot.projects.find(
        (candidate) =>
          candidate.deletedAt === null && candidate.workspaceRoot === metadata.workspaceRoot,
      ) ??
      (await this.createProject(metadata.workspaceRoot));
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

  public async getThreadTitle(threadId: string): Promise<string | undefined> {
    const snapshot = await this.getSnapshot();
    return snapshot.threads?.find(
      (candidate) => candidate.id === threadId && candidate.deletedAt === null,
    )?.title;
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
    if (shouldResolveManagedRuntime(startupCommand)) {
      const runtimeSource = resolveManagedT3RuntimeSource(undefined, this.context);
      await this.ensureManagedRuntimeEntrypoint(runtimeSource);
      await this.ensureManagedRuntimeDependencies(runtimeSource);
    }
    const hasManagedSupervisor = await this.hasActiveManagedSupervisor(resolvedStartupCommand);
    if (await isOriginResponsive(origin)) {
      if (hasManagedSupervisor) {
        try {
          await this.ensureAuthStateReady();
          if (await this.isTransportResponsive()) {
            await this.startLeaseHeartbeat();
            return origin;
          }
        } catch {
          // Fall through and restart the managed runtime below.
        }
        await this.stopStaleManagedRuntime();
      } else {
        try {
          await this.ensureAuthStateReady();
          if (await this.isTransportResponsive()) {
            await this.startLeaseHeartbeat();
            return origin;
          }
        } catch {
          // Fall through and restart the managed runtime below.
        }
        await this.stopStaleManagedRuntime();
      }
    }

    await this.startLeaseHeartbeat();
    if (!(await this.hasActiveManagedSupervisor(resolvedStartupCommand))) {
      await this.startSupervisorIfNeeded(workspaceRoot, startupCommand);
    }

    const deadline = Date.now() + START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await isOriginResponsive(origin)) {
        try {
          await this.ensureAuthStateReady();
          if (await this.isTransportResponsive()) {
            return origin;
          }
        } catch {
          // Keep polling until the runtime becomes ready or we time out.
        }
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
    return this.fetchAuthenticatedJson<T3Snapshot>("/api/orchestration/snapshot");
  }

  private async dispatchCommand(command: Record<string, unknown>): Promise<unknown> {
    return this.fetchAuthenticatedJson("/api/orchestration/dispatch", {
      body: JSON.stringify(command),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  }

  private async fetchAuthenticatedJson<T>(path: string, init?: RequestInit): Promise<T> {
    const authState = await this.ensureAuthStateReady();
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${authState.ownerBearerToken}`);
    const response = await fetch(new URL(path, getT3Origin()), {
      ...init,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(await this.formatHttpFailure(response, path));
    }

    return (await response.json()) as T;
  }

  private async formatHttpFailure(response: Response, path: string): Promise<string> {
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      const detail = body.error ?? body.message;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    } catch {
      // Fall back to the status code below when the response body is not JSON.
    }

    return `Managed T3 request failed for ${path} (${response.status}).`;
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
      const bootstrapEnvelope = await this.createManagedBootstrapEnvelope();
      const child = spawn(
        nodeRuntimePath,
        [
          supervisorScriptPath,
          ...(bootstrapEnvelope.bootstrapJson
            ? ["--bootstrap-json", bootstrapEnvelope.bootstrapJson]
            : []),
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
            ...bootstrapEnvelope.env,
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

  private async ensureManagedRuntimeEntrypoint(
    runtimeSource = resolveManagedT3RuntimeSource(undefined, this.context),
  ): Promise<void> {
    const repoRoot =
      runtimeSource.kind === "external" ? runtimeSource.repoRoot : runtimeSource.root;
    const entrypoint = runtimeSource.entrypoint;
    const providerDisplayName = getManagedT3ProviderDisplayName(runtimeSource.provider);
    await stat(entrypoint).catch(() => {
      throw new Error(
        runtimeSource.kind === "external"
          ? [
              `The managed ${providerDisplayName} runtime source is missing.`,
              `Expected: ${entrypoint}`,
              `Sync the sibling ${runtimeSource.provider}-embed checkout at ${repoRoot} and reinstall the main-branch VSIX.`,
            ].join(" ")
          : [
              `The bundled ${providerDisplayName} runtime is missing.`,
              `Expected: ${entrypoint}`,
              "Rebuild and reinstall the VSIX so the packaged runtime assets are included.",
            ].join(" "),
      );
    });
  }

  private async ensureManagedRuntimeDependencies(
    runtimeSource = resolveManagedT3RuntimeSource(undefined, this.context),
  ): Promise<void> {
    const nodeModulesPath = runtimeSource.nodeModulesPath;
    const providerDisplayName = getManagedT3ProviderDisplayName(runtimeSource.provider);
    await stat(nodeModulesPath).catch(() => {
      throw new Error(
        runtimeSource.kind === "external"
          ? [
              `Managed ${providerDisplayName} dependencies are missing.`,
              `Expected: ${nodeModulesPath}`,
              `Run 'bun install' in ${runtimeSource.repoRoot}, then run 'pnpm run t3:embed:build'.`,
            ].join(" ")
          : [
              `Bundled ${providerDisplayName} dependencies are missing.`,
              `Expected: ${nodeModulesPath}`,
              "Rebuild and reinstall the VSIX so the packaged runtime dependencies are included.",
            ].join(" "),
      );
    });

    if (runtimeSource.kind === "external") {
      const bunVersion = getBunRuntimeVersion();
      if (bunVersion && compareSemverStrings(bunVersion, MINIMUM_MANAGED_T3_BUN_VERSION) < 0) {
        throw new Error(
          [
            `Managed ${providerDisplayName} requires Bun ${MINIMUM_MANAGED_T3_BUN_VERSION} or newer.`,
            `Found: ${bunVersion}.`,
            `Upgrade Bun, then run 'bun install' in ${runtimeSource.repoRoot} and 'pnpm run t3:embed:build'.`,
          ].join(" "),
        );
      }

      if (process.platform === "win32") {
        const windowsEntrypoint = getManagedT3WindowsEntrypointPath(
          runtimeSource.provider,
          this.context,
        );
        await stat(windowsEntrypoint).catch(() => {
          throw new Error(
            [
              `Managed ${providerDisplayName} server build output is missing on Windows.`,
              `Expected: ${windowsEntrypoint}`,
              `Run 'bun run build' in ${join(runtimeSource.repoRoot, "apps", "server")}, then reinstall the main-branch VSIX.`,
            ].join(" "),
          );
        });
      }
    }
  }

  private async createManagedBootstrapEnvelope(): Promise<ManagedBootstrapEnvelope> {
    const desktopBootstrapToken = randomUUID();
    const authState: T3RuntimeAuthState = {
      desktopBootstrapToken,
      provider: "t3code",
    };
    await this.writeAuthState(authState);
    return {
      authState,
      bootstrapJson: JSON.stringify({
        desktopBootstrapToken,
        host: T3_HOST,
        mode: "desktop",
        noBrowser: true,
        port: T3_PORT,
        t3Home: this.getManagedT3HomePath(),
      }),
    };
  }

  private async ensureAuthStateReady(): Promise<
    Required<Pick<T3RuntimeAuthState, "ownerBearerToken">>
  > {
    const current = await this.readAuthState();
    if (current?.provider && current.provider !== "t3code") {
      throw new Error("Managed T3 auth state belongs to a different provider.");
    }

    if (current?.ownerBearerToken && (await this.isBearerSessionValid(current.ownerBearerToken))) {
      return {
        ownerBearerToken: current.ownerBearerToken,
      };
    }

    if (!current?.desktopBootstrapToken) {
      throw new Error("Managed T3 auth state is missing.");
    }

    const ownerBearerToken = await this.exchangeDesktopBootstrapForOwnerBearerSession(
      current.desktopBootstrapToken,
    );
    await this.writeAuthState({
      ...current,
      ownerBearerToken,
      provider: "t3code",
    });
    return {
      ownerBearerToken,
    };
  }

  private async readAuthState(): Promise<T3RuntimeAuthState | undefined> {
    try {
      const raw = await readFile(this.getAuthStatePath(), "utf8");
      const parsed = JSON.parse(raw) as T3RuntimeAuthState;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        (parsed.desktopBootstrapToken !== undefined &&
          typeof parsed.desktopBootstrapToken !== "string") ||
        (parsed.ownerBearerToken !== undefined && typeof parsed.ownerBearerToken !== "string") ||
        (parsed.provider !== undefined && parsed.provider !== "t3code")
      ) {
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  }

  private async writeAuthState(state: T3RuntimeAuthState): Promise<void> {
    await writeFile(this.getAuthStatePath(), JSON.stringify(state, null, 2), "utf8");
  }

  private async issueBrowserBootstrapToken(_authState: {
    desktopBootstrapToken?: string;
    ownerBearerToken: string;
  }): Promise<string> {
    return "";
  }

  private async issueWebSocketToken(ownerBearerToken: string): Promise<string> {
    const response = await fetch(new URL("/api/auth/ws-token", getT3Origin()), {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerBearerToken}`,
      },
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) {
      throw new Error(`Failed to issue websocket token (${response.status}).`);
    }

    const body = (await response.json()) as { token?: string };
    if (typeof body.token !== "string" || !body.token.trim()) {
      throw new Error("Managed T3 websocket token response is invalid.");
    }

    return body.token;
  }

  private async exchangeDesktopBootstrapForOwnerBearerSession(
    desktopBootstrapToken: string,
  ): Promise<string> {
    const response = await fetch(new URL("/api/auth/bootstrap/bearer", getT3Origin()), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        credential: desktopBootstrapToken,
      }),
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) {
      throw new Error(`Failed to bootstrap managed T3 bearer session (${response.status}).`);
    }

    const body = (await response.json()) as { sessionToken?: string };
    if (typeof body.sessionToken !== "string" || !body.sessionToken.trim()) {
      throw new Error("Managed T3 bearer bootstrap response is invalid.");
    }

    return body.sessionToken;
  }

  private async isBearerSessionValid(ownerBearerToken: string): Promise<boolean> {
    try {
      const response = await fetch(new URL("/api/auth/session", getT3Origin()), {
        headers: {
          authorization: `Bearer ${ownerBearerToken}`,
        },
        method: "GET",
        signal: AbortSignal.timeout(1_500),
      });
      if (!response.ok) {
        return false;
      }

      const body = (await response.json()) as { authenticated?: boolean };
      return body.authenticated === true;
    } catch {
      return false;
    }
  }

  private async getAuthenticatedWebSocketUrl(): Promise<string> {
    const authState = await this.ensureAuthStateReady();
    const wsToken = await this.issueWebSocketToken(authState.ownerBearerToken);
    const url = new URL(getT3WebSocketUrl());
    url.searchParams.set("wsToken", wsToken);
    return url.toString();
  }

  private async isTransportResponsive(): Promise<boolean> {
    try {
      const socket = await openWebSocket(
        await this.getAuthenticatedWebSocketUrl(),
        SOCKET_CONNECT_TIMEOUT_MS,
      );
      socket.close();
      return true;
    } catch {
      return false;
    }
  }

  private getRuntimeStoragePath(): string {
    return join(this.context.globalStorageUri.fsPath, RUNTIME_STORAGE_DIR_NAME);
  }

  private getManagedT3HomePath(): string {
    return join(
      this.getRuntimeStoragePath(),
      getManagedT3HomeDirectoryName(getManagedT3Provider()),
    );
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

  private getAuthStatePath(): string {
    return join(this.getRuntimeStoragePath(), AUTH_STATE_FILE);
  }

  private async hasActiveManagedSupervisor(expectedCommand?: string): Promise<boolean> {
    const state = await this.readSupervisorState();
    if (!state) {
      return false;
    }

    if (expectedCommand && state.command !== expectedCommand) {
      await this.stopStaleManagedRuntime(state);
      return false;
    }

    if (await this.isManagedRuntimeBuildNewerThan(state.startedAt)) {
      await this.stopStaleManagedRuntime(state);
      return false;
    }

    const alive = isProcessAlive(state.pid);
    if (alive && (await isOriginResponsive(getT3Origin()))) {
      return true;
    }

    await this.stopStaleManagedRuntime(state);
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

  private async isManagedRuntimeBuildNewerThan(startedAt: string): Promise<boolean> {
    const startedAtMs = Date.parse(startedAt);
    if (!Number.isFinite(startedAtMs)) {
      return false;
    }

    const latestBuildTimestamp = await getManagedRuntimeBuildTimestamp(this.context);
    return latestBuildTimestamp !== undefined && latestBuildTimestamp > startedAtMs;
  }

  private async stopStaleManagedRuntime(state?: SupervisorState): Promise<void> {
    const candidatePids = [state?.childPid, state?.pid, getListeningProcessId(T3_PORT)].filter(
      (value, index, values): value is number => {
        return (
          typeof value === "number" && Number.isInteger(value) && values.indexOf(value) === index
        );
      },
    );

    for (const pid of candidatePids) {
      if (!isProcessAlive(pid)) {
        continue;
      }
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        try {
          process.kill(pid);
        } catch {
          // Best-effort cleanup only.
        }
      }
    }

    await rm(this.getSupervisorStatePath(), { force: true });
    await rm(this.getAuthStatePath(), { force: true });
  }

  private resolveStartupCommand(startupCommand: string): string {
    const trimmedCommand = startupCommand.trim();
    if (trimmedCommand.length > 0 && trimmedCommand !== LEGACY_T3_COMMAND) {
      return trimmedCommand;
    }

    return createManagedStartupCommand(resolveManagedT3RuntimeSource(undefined, this.context));
  }
}

function getT3Origin(): string {
  return `http://${T3_HOST}:${String(T3_PORT)}`;
}

function createManagedStartupCommand(runtimeSource: ManagedT3RuntimeSource): string {
  const entrypoint = shellQuote(runtimeSource.entrypoint);
  const sharedArgs = `--mode desktop --host ${T3_HOST} --port ${String(T3_PORT)} --no-browser --bootstrap-fd 3`;
  if (runtimeSource.kind === "bundled" || process.platform === "win32") {
    return createNodeStartupCommand(entrypoint, sharedArgs);
  }

  const bunPath = shellQuote(getBunRuntimePath());
  return `${bunPath} ${entrypoint} ${sharedArgs}`;
}

function getManagedT3HomeDirectoryName(_provider: ManagedT3Provider): string {
  return "managed-home-t3code-0.0.0";
}

function createNodeStartupCommand(entrypoint: string, sharedArgs: string): string {
  const nodePath = shellQuote(getNodeRuntimePath());
  if (process.platform === "win32") {
    return `& ${nodePath} ${entrypoint} ${sharedArgs}`;
  }

  return `${nodePath} ${entrypoint} ${sharedArgs}`;
}

function shouldResolveManagedRuntime(startupCommand: string): boolean {
  const trimmedCommand = startupCommand.trim();
  return trimmedCommand.length === 0 || trimmedCommand === LEGACY_T3_COMMAND;
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

function getBunRuntimeVersion(): string | undefined {
  const result = spawnSync(getBunRuntimePath(), ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const version = result.stdout?.trim();
  return version && /^\d+\.\d+\.\d+$/u.test(version) ? version : undefined;
}

function compareSemverStrings(left: string, right: string): number {
  const leftParts = left.split(".").map((value) => Number.parseInt(value, 10));
  const rightParts = right.split(".").map((value) => Number.parseInt(value, 10));
  for (let index = 0; index < 3; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
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

function openWebSocket(url: string, timeoutMs: number): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(url);
    let settled = false;
    const timeout = setTimeout(() => {
      finalize(new Error("Failed to connect to the T3 websocket."));
      socket.close();
    }, timeoutMs);

    const handleOpen = () => {
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
      finalize(undefined, socket);
    };
    const handleError = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      finalize(new Error("Failed to connect to the T3 websocket."));
    };
    const handleClose = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("error", handleError);
      finalize(new Error("Failed to connect to the T3 websocket."));
    };

    const finalize = (error?: Error, value?: WebSocket) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
        return;
      }

      if (!value) {
        reject(new Error("Failed to connect to the T3 websocket."));
        return;
      }

      resolve(value);
    };

    socket.addEventListener("open", handleOpen, { once: true });
    socket.addEventListener("error", handleError, { once: true });
    socket.addEventListener("close", handleClose, { once: true });
  });
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

function getBundledT3ServerRootCandidates(
  provider: ManagedT3Provider,
  context?: Pick<vscode.ExtensionContext, "extensionPath">,
): string[] {
  const bundledDirectoryName = getManagedT3BundledServerDirectoryName(provider);
  const candidates = new Set<string>();
  if (context?.extensionPath) {
    candidates.add(join(context.extensionPath, "out", bundledDirectoryName));
    candidates.add(join(context.extensionPath, bundledDirectoryName));
    candidates.add(join(dirname(context.extensionPath), "out", bundledDirectoryName));
  }
  candidates.add(join(process.cwd(), "out", bundledDirectoryName));
  candidates.add(join(process.cwd(), bundledDirectoryName));
  candidates.add(join(dirname(process.cwd()), "out", bundledDirectoryName));
  return [...candidates];
}

function getBundledT3ServerRoot(
  provider: ManagedT3Provider,
  context?: Pick<vscode.ExtensionContext, "extensionPath">,
): string | undefined {
  return getBundledT3ServerRootCandidates(provider, context).find((candidate) =>
    existsSync(join(candidate, "dist", "bin.mjs")),
  );
}

function getBundledT3ServerEntrypointPath(
  provider: ManagedT3Provider,
  context?: Pick<vscode.ExtensionContext, "extensionPath">,
): string | undefined {
  const bundledRoot = getBundledT3ServerRoot(provider, context);
  return bundledRoot ? join(bundledRoot, "dist", "bin.mjs") : undefined;
}

async function getManagedRuntimeBuildTimestamp(
  context?: Pick<vscode.ExtensionContext, "extensionPath">,
): Promise<number | undefined> {
  const provider = getManagedT3Provider();
  const candidatePaths = new Set<string>();
  const addCandidate = (value: string | undefined): void => {
    const trimmed = value?.trim();
    if (trimmed) {
      candidatePaths.add(trimmed);
    }
  };

  const extensionRoots = new Set<string>();
  if (context?.extensionPath) {
    extensionRoots.add(context.extensionPath);
    extensionRoots.add(dirname(context.extensionPath));
  }

  for (const root of extensionRoots) {
    addCandidate(join(root, "out", "workspace", "t3-frame-host.js"));
    addCandidate(join(root, "workspace", "t3-frame-host.js"));
    addCandidate(join(root, "out", getManagedT3BundledWebDirectoryName(provider), "index.html"));
    addCandidate(join(root, getManagedT3BundledWebDirectoryName(provider), "index.html"));
    addCandidate(
      join(root, "out", getManagedT3BundledServerDirectoryName(provider), "dist", "bin.mjs"),
    );
    addCandidate(join(root, getManagedT3BundledServerDirectoryName(provider), "dist", "bin.mjs"));
  }

  addCandidate(getBundledT3ServerEntrypointPath(provider, context));
  addCandidate(join(getManagedT3WebDistPath(provider, context), "index.html"));
  addCandidate(getManagedT3WindowsEntrypointPath(provider, context));
  addCandidate(getManagedT3EntrypointPath(provider, context));

  let latestTimestamp: number | undefined;
  for (const candidatePath of candidatePaths) {
    const stats = await stat(candidatePath).catch(() => undefined);
    if (!stats) {
      continue;
    }
    latestTimestamp = Math.max(latestTimestamp ?? 0, stats.mtimeMs);
  }

  return latestTimestamp;
}

function resolveManagedT3RuntimeSource(
  provider = getManagedT3Provider(),
  context?: Pick<vscode.ExtensionContext, "extensionPath">,
): ManagedT3RuntimeSource {
  const explicitRepoRoot = getConfiguredManagedT3RepoRoot(provider);
  if (explicitRepoRoot) {
    return {
      entrypoint:
        process.platform === "win32"
          ? getManagedRuntimeEntrypointAtRoot(explicitRepoRoot, provider, "windows")
          : getManagedRuntimeEntrypointAtRoot(explicitRepoRoot, provider, "source"),
      kind: "external",
      nodeModulesPath: join(explicitRepoRoot, "node_modules"),
      provider,
      repoRoot: explicitRepoRoot,
    };
  }

  const bundledRoot = getBundledT3ServerRoot(provider, context);
  if (bundledRoot) {
    return {
      entrypoint: join(bundledRoot, "dist", "bin.mjs"),
      kind: "bundled",
      nodeModulesPath: join(bundledRoot, "node_modules"),
      provider,
      root: bundledRoot,
    };
  }

  const repoRoot = getManagedT3RepoRoot(provider, context);
  return {
    entrypoint:
      process.platform === "win32"
        ? getManagedRuntimeEntrypointAtRoot(repoRoot, provider, "windows")
        : getManagedRuntimeEntrypointAtRoot(repoRoot, provider, "source"),
    kind: "external",
    nodeModulesPath: join(repoRoot, "node_modules"),
    provider,
    repoRoot,
  };
}

function getManagedRuntimeEntrypointAtRoot(
  repoRoot: string,
  _provider: ManagedT3Provider,
  kind: "source" | "windows",
): string {
  const fileName = kind === "source" ? "bin.ts" : "bin.mjs";
  return join(repoRoot, "apps", "server", kind === "source" ? "src" : "dist", fileName);
}

function getListeningProcessId(port: number): number | undefined {
  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort ${String(port)} -State Listen | Select-Object -ExpandProperty OwningProcess`,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
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
