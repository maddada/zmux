import { access, mkdir, open, readFile, unlink } from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";
import * as vscode from "vscode";
import * as WebSocket from "ws";
import type {
  TerminalHostAcknowledgeAttentionRequest,
  TerminalHostConfigureRequest,
  TerminalHostCreateOrAttachRequest,
  TerminalHostEvent,
  TerminalHostListSessionsRequest,
  TerminalHostRequest,
  TerminalHostResponse,
  TerminalHostSyncSessionLeasesRequest,
  TerminalHostWriteRequest,
  TerminalHostResizeRequest,
  TerminalHostKillRequest,
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { TERMINAL_HOST_PROTOCOL_VERSION } from "../shared/terminal-host-protocol";
import { logVSmuxDebug } from "./vsmux-debug-log";

type DaemonInfo = {
  pid: number;
  port: number;
  protocolVersion: typeof TERMINAL_HOST_PROTOCOL_VERSION;
  startedAt: string;
  token: string;
};

export type TerminalDaemonInfo = Omit<DaemonInfo, "token">;

export type TerminalDaemonState = {
  daemon?: TerminalDaemonInfo;
  errorMessage?: string;
  isRunning: boolean;
  sessions: TerminalSessionSnapshot[];
};

type PendingRequest = {
  reject: (error: Error) => void;
  resolve: (value: TerminalHostResponse) => void;
};

type DaemonLaunchLockPayload = {
  acquiredAt: number;
  pid: number;
};

type DaemonLaunchLock = {
  release: () => Promise<void>;
};

const CONTROL_CONNECT_TIMEOUT_MS = 3_000;
const DAEMON_READY_TIMEOUT_MS = 10_000;
const DAEMON_LAUNCH_LOCK_STALE_MS = 30_000;
const DAEMON_STATE_DIR_NAME = "terminal-daemon";
const INFO_FILE_NAME = "daemon-info.json";
const LAUNCH_LOCK_FILE_NAME = "daemon-launch.lock";

export type DaemonTerminalConnection = {
  baseUrl: string;
  token: string;
};

export type TerminalCreateOrAttachResponse = {
  didCreateSession: boolean;
  session: TerminalSessionSnapshot;
};

export class DaemonTerminalRuntime implements vscode.Disposable {
  private controlSocket: WebSocket | undefined;
  private controlSocketPromise: Promise<WebSocket> | undefined;
  private daemonInfo: DaemonInfo | undefined;
  private readonly onDidChangeSessionStateEmitter =
    new vscode.EventEmitter<TerminalSessionSnapshot>();
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private requestNumber = 0;

  public readonly onDidChangeSessionState = this.onDidChangeSessionStateEmitter.event;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly workspaceId: string,
  ) {}

  public dispose(): void {
    this.controlSocket?.close();
    this.controlSocket = undefined;
    this.onDidChangeSessionStateEmitter.dispose();
    for (const pendingRequest of this.pendingRequests.values()) {
      pendingRequest.reject(new Error("VSmux daemon runtime disposed."));
    }
    this.pendingRequests.clear();
  }

  public async ensureReady(): Promise<void> {
    if (this.daemonInfo && this.controlSocket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.controlSocketPromise) {
      await this.controlSocketPromise;
      return;
    }

    this.controlSocketPromise = this.connectControlSocket().finally(() => {
      this.controlSocketPromise = undefined;
    });
    await this.controlSocketPromise;
  }

  public async getConnection(): Promise<DaemonTerminalConnection> {
    await this.ensureReady();
    if (!this.daemonInfo) {
      throw new Error("VSmux daemon did not provide connection metadata.");
    }

    return {
      baseUrl: `ws://127.0.0.1:${String(this.daemonInfo.port)}`,
      token: this.daemonInfo.token,
    };
  }

  public async configure(idleShutdownTimeoutMs: number | null): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostConfigureRequest = {
      idleShutdownTimeoutMs,
      requestId: this.nextRequestId(),
      type: "configure",
    };
    await this.sendRequest(request);
  }

  public async syncSessionLeases(
    workspaceId: string,
    sessionIds: string[],
    leaseDurationMs: number | null,
  ): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostSyncSessionLeasesRequest = {
      leaseDurationMs,
      requestId: this.nextRequestId(),
      sessionIds,
      type: "syncSessionLeases",
      workspaceId,
    };
    await this.sendRequest(request);
  }

  public async createOrAttach(
    request: Omit<TerminalHostCreateOrAttachRequest, "requestId" | "type">,
  ): Promise<TerminalCreateOrAttachResponse> {
    await this.ensureReady();
    const response = await this.sendRequest({
      ...request,
      requestId: this.nextRequestId(),
      type: "createOrAttach",
    });
    if (!("session" in response) || !response.session || !("didCreateSession" in response)) {
      throw new Error("VSmux daemon did not return a session snapshot.");
    }
    return {
      didCreateSession: response.didCreateSession,
      session: response.session,
    };
  }

  public async listSessions(workspaceId?: string): Promise<TerminalSessionSnapshot[]> {
    await this.ensureReady();
    const request: TerminalHostListSessionsRequest = {
      requestId: this.nextRequestId(),
      type: "listSessions",
      workspaceId,
    };
    const response = await this.sendRequest(request);
    if (!("sessions" in response) || !response.sessions) {
      return [];
    }
    return response.sessions;
  }

  public async listExistingSessions(workspaceId?: string): Promise<TerminalDaemonState> {
    const daemonInfo = await this.ensureExistingReady();
    if (!daemonInfo) {
      return {
        isRunning: false,
        sessions: [],
      };
    }

    try {
      const sessions = await this.listSessions(workspaceId);
      return {
        daemon: toTerminalDaemonInfo(daemonInfo),
        isRunning: true,
        sessions,
      };
    } catch (error) {
      return {
        daemon: toTerminalDaemonInfo(daemonInfo),
        errorMessage: error instanceof Error ? error.message : String(error),
        isRunning: true,
        sessions: [],
      };
    }
  }

  public async write(workspaceId: string, sessionId: string, data: string): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostWriteRequest = {
      data,
      sessionId,
      type: "write",
      workspaceId,
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  public async resize(
    workspaceId: string,
    sessionId: string,
    cols: number,
    rows: number,
  ): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostResizeRequest = {
      cols,
      rows,
      sessionId,
      type: "resize",
      workspaceId,
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  public async kill(workspaceId: string, sessionId: string): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostKillRequest = {
      sessionId,
      type: "kill",
      workspaceId,
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  public async killExistingSession(workspaceId: string, sessionId: string): Promise<boolean> {
    const daemonInfo = await this.ensureExistingReady();
    if (!daemonInfo) {
      return false;
    }

    const request: TerminalHostKillRequest = {
      sessionId,
      type: "kill",
      workspaceId,
    };
    this.controlSocket?.send(JSON.stringify(request));
    return Boolean(daemonInfo);
  }

  public async acknowledgeAttention(workspaceId: string, sessionId: string): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostAcknowledgeAttentionRequest = {
      sessionId,
      type: "acknowledgeAttention",
      workspaceId,
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  public async shutdownExistingDaemon(): Promise<boolean> {
    const daemonInfo = await this.getExistingDaemonInfo();
    if (!daemonInfo) {
      return false;
    }

    try {
      process.kill(daemonInfo.pid, "SIGTERM");
    } catch {
      return false;
    }

    this.controlSocket?.close();
    this.controlSocket = undefined;
    this.daemonInfo = undefined;
    for (const pendingRequest of this.pendingRequests.values()) {
      pendingRequest.reject(new Error("VSmux daemon shut down."));
    }
    this.pendingRequests.clear();
    return true;
  }

  private async connectControlSocket(): Promise<WebSocket> {
    const daemonInfo = await this.ensureDaemonProcess();
    return this.openControlSocket(daemonInfo);
  }

  private async ensureDaemonProcess(): Promise<DaemonInfo> {
    const deadline = Date.now() + DAEMON_READY_TIMEOUT_MS;
    logVSmuxDebug("daemon.runtime.ensureDaemonProcess.start", {
      deadline,
      extensionHostPid: process.pid,
    });
    while (Date.now() < deadline) {
      await this.replaceStaleDaemonIfNeeded();

      const info = await this.getReachableDaemonInfo();
      if (info && (await this.canReachDaemon(info))) {
        logVSmuxDebug("daemon.runtime.ensureDaemonProcess.readyExisting", {
          pid: info.pid,
          port: info.port,
          protocolVersion: info.protocolVersion,
          startedAt: info.startedAt,
        });
        return info;
      }

      const daemonStateDir = this.getDaemonStateDir();
      const launchLock = await this.tryAcquireLaunchLock(daemonStateDir);
      if (!launchLock) {
        logVSmuxDebug("daemon.runtime.ensureDaemonProcess.waitingForLaunchLock", {
          daemonStateDir,
          extensionHostPid: process.pid,
        });
        await delay(150);
        continue;
      }

      try {
        const lockedInfo = await this.getReachableDaemonInfo();
        if (lockedInfo) {
          logVSmuxDebug("daemon.runtime.ensureDaemonProcess.readyAfterLaunchLock", {
            extensionHostPid: process.pid,
            pid: lockedInfo.pid,
            port: lockedInfo.port,
            protocolVersion: lockedInfo.protocolVersion,
            startedAt: lockedInfo.startedAt,
          });
          return lockedInfo;
        }

        const daemonScriptPath = path.join(__dirname, "terminal-daemon-process.js");
        const child = spawn(process.execPath, [daemonScriptPath, "--state-dir", daemonStateDir], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        logVSmuxDebug("daemon.runtime.ensureDaemonProcess.spawned", {
          daemonStateDir,
          extensionHostPid: process.pid,
          pid: child.pid,
        });

        while (Date.now() < deadline) {
          const readyInfo = await this.getReachableDaemonInfo();
          if (readyInfo) {
            logVSmuxDebug("daemon.runtime.ensureDaemonProcess.readySpawned", {
              pid: readyInfo.pid,
              port: readyInfo.port,
              protocolVersion: readyInfo.protocolVersion,
              startedAt: readyInfo.startedAt,
            });
            return readyInfo;
          }
          await delay(150);
        }
      } finally {
        await launchLock.release();
      }

      await delay(150);
    }

    throw new Error("VSmux terminal daemon did not become ready in time.");
  }

  private async replaceStaleDaemonIfNeeded(): Promise<void> {
    const daemonInfo = await this.readDaemonInfo();
    if (!daemonInfo) {
      return;
    }

    const hasExpectedProtocol = daemonInfo.protocolVersion === TERMINAL_HOST_PROTOCOL_VERSION;
    const isReachable = await this.canReachDaemon(daemonInfo).catch(() => false);
    if (hasExpectedProtocol && isReachable) {
      logVSmuxDebug("daemon.runtime.replaceStaleDaemonIfNeeded.keep", {
        hasExpectedProtocol,
        isReachable,
        pid: daemonInfo.pid,
        port: daemonInfo.port,
        protocolVersion: daemonInfo.protocolVersion,
        startedAt: daemonInfo.startedAt,
      });
      return;
    }

    logVSmuxDebug("daemon.runtime.replaceStaleDaemonIfNeeded.replace", {
      hasExpectedProtocol,
      isReachable,
      pid: daemonInfo.pid,
      port: daemonInfo.port,
      protocolVersion: daemonInfo.protocolVersion,
      startedAt: daemonInfo.startedAt,
    });
    await terminateDaemonProcess(daemonInfo.pid);
    await this.clearPersistedDaemonInfo();
  }

  private async readDaemonInfo(): Promise<DaemonInfo | undefined> {
    const daemonStateDir = this.getDaemonStateDir();
    const infoFilePath = path.join(daemonStateDir, INFO_FILE_NAME);
    try {
      await access(infoFilePath);
      const rawInfo = await readFile(infoFilePath, "utf8");
      return JSON.parse(rawInfo) as DaemonInfo;
    } catch {
      return undefined;
    }
  }

  private async clearPersistedDaemonInfo(): Promise<void> {
    const daemonStateDir = this.getDaemonStateDir();
    const infoFilePath = path.join(daemonStateDir, INFO_FILE_NAME);
    try {
      await unlink(infoFilePath);
    } catch {
      // Ignore missing or concurrently removed info files.
    }
  }

  private async canReachDaemon(daemonInfo: DaemonInfo): Promise<boolean> {
    try {
      const socket = await this.openWebSocket(
        `ws://127.0.0.1:${String(daemonInfo.port)}/control?token=${encodeURIComponent(
          daemonInfo.token,
        )}`,
      );
      socket.close();
      return true;
    } catch (error) {
      logVSmuxDebug("daemon.runtime.canReachDaemon.failed", {
        error: error instanceof Error ? error.message : String(error),
        pid: daemonInfo.pid,
        port: daemonInfo.port,
        protocolVersion: daemonInfo.protocolVersion,
        startedAt: daemonInfo.startedAt,
      });
      return false;
    }
  }

  private async ensureExistingReady(): Promise<DaemonInfo | undefined> {
    if (this.daemonInfo && this.controlSocket?.readyState === WebSocket.OPEN) {
      return this.daemonInfo;
    }

    const existingInfo = await this.getExistingDaemonInfo();
    if (!existingInfo) {
      return undefined;
    }

    await this.openControlSocket(existingInfo);
    return existingInfo;
  }

  private async getExistingDaemonInfo(): Promise<DaemonInfo | undefined> {
    const existingInfo = await this.getReachableDaemonInfo();
    if (
      !existingInfo ||
      existingInfo.protocolVersion !== TERMINAL_HOST_PROTOCOL_VERSION ||
      !(await this.canReachDaemon(existingInfo))
    ) {
      return undefined;
    }

    return existingInfo;
  }

  private async getReachableDaemonInfo(): Promise<DaemonInfo | undefined> {
    const daemonInfo = await this.readDaemonInfo();
    if (
      !daemonInfo ||
      daemonInfo.protocolVersion !== TERMINAL_HOST_PROTOCOL_VERSION ||
      !(await this.canReachDaemon(daemonInfo))
    ) {
      return undefined;
    }

    return daemonInfo;
  }

  private getDaemonStateDir(): string {
    return path.join(
      this.context.globalStorageUri.fsPath,
      `${DAEMON_STATE_DIR_NAME}-${this.workspaceId}`,
    );
  }

  private async tryAcquireLaunchLock(
    daemonStateDir: string,
  ): Promise<DaemonLaunchLock | undefined> {
    await mkdir(daemonStateDir, { recursive: true });
    const lockFilePath = path.join(daemonStateDir, LAUNCH_LOCK_FILE_NAME);

    try {
      const lockHandle = await open(lockFilePath, "wx");
      try {
        const payload: DaemonLaunchLockPayload = {
          acquiredAt: Date.now(),
          pid: process.pid,
        };
        await lockHandle.writeFile(JSON.stringify(payload));
      } finally {
        await lockHandle.close();
      }

      return {
        release: async () => {
          try {
            await unlink(lockFilePath);
          } catch {
            // Another process may already have cleaned up a stale lock.
          }
        },
      };
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }
    }

    await this.pruneStaleLaunchLock(lockFilePath);
    return undefined;
  }

  private async pruneStaleLaunchLock(lockFilePath: string): Promise<void> {
    try {
      const rawLock = await readFile(lockFilePath, "utf8");
      const payload = JSON.parse(rawLock) as Partial<DaemonLaunchLockPayload>;
      const ownerPid = typeof payload.pid === "number" ? payload.pid : undefined;
      const acquiredAt = typeof payload.acquiredAt === "number" ? payload.acquiredAt : 0;
      const isStale =
        !ownerPid ||
        !isProcessAlive(ownerPid) ||
        Date.now() - acquiredAt > DAEMON_LAUNCH_LOCK_STALE_MS;
      if (!isStale) {
        return;
      }

      await unlink(lockFilePath);
    } catch {
      // Ignore malformed or already-removed lock files.
    }
  }

  private async openControlSocket(daemonInfo: DaemonInfo): Promise<WebSocket> {
    const socket = await this.openWebSocket(
      `ws://127.0.0.1:${String(daemonInfo.port)}/control?token=${encodeURIComponent(
        daemonInfo.token,
      )}`,
    );
    this.daemonInfo = daemonInfo;
    this.controlSocket = socket;

    socket.on("message", (buffer: WebSocket.RawData) => {
      this.handleControlMessage(buffer.toString());
    });
    socket.on("close", () => {
      this.controlSocket = undefined;
    });
    socket.on("error", () => {
      this.controlSocket = undefined;
    });

    return socket;
  }

  private openWebSocket(url: string): Promise<WebSocket> {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(url);
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error(`Timed out connecting to ${url}`));
      }, CONTROL_CONNECT_TIMEOUT_MS);
      socket.once("open", () => {
        clearTimeout(timeout);
        resolve(socket);
      });
      socket.once("error", (error: Error) => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  private async sendRequest(request: TerminalHostRequest): Promise<TerminalHostResponse> {
    await this.ensureReady();
    if (!("requestId" in request)) {
      throw new Error("VSmux daemon requests must include a requestId.");
    }

    return new Promise<TerminalHostResponse>((resolve, reject) => {
      this.pendingRequests.set(request.requestId, { reject, resolve });
      this.controlSocket?.send(JSON.stringify(request), (error?: Error) => {
        if (!error) {
          return;
        }

        this.pendingRequests.delete(request.requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  private handleControlMessage(rawMessage: string): void {
    let event: TerminalHostEvent | undefined;
    try {
      event = JSON.parse(rawMessage) as TerminalHostEvent;
    } catch {
      return;
    }

    if (event.type === "response") {
      const pendingRequest = this.pendingRequests.get(event.requestId);
      if (!pendingRequest) {
        return;
      }

      this.pendingRequests.delete(event.requestId);
      if (event.ok) {
        pendingRequest.resolve(event);
      } else {
        pendingRequest.reject(new Error(event.error));
      }
      return;
    }

    if (event.type === "sessionState") {
      this.onDidChangeSessionStateEmitter.fire(event.session);
    }
  }

  private nextRequestId(): string {
    this.requestNumber += 1;
    return `request-${String(this.requestNumber)}`;
  }
}

function toTerminalDaemonInfo(daemonInfo: DaemonInfo): TerminalDaemonInfo {
  return {
    pid: daemonInfo.pid,
    port: daemonInfo.port,
    protocolVersion: daemonInfo.protocolVersion,
    startedAt: daemonInfo.startedAt,
  };
}

async function delay(durationMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ESRCH"
    );
  }
}

async function terminateDaemonProcess(pid: number): Promise<void> {
  if (!isProcessAlive(pid)) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return;
    }
    await delay(100);
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ignore if the process exited between checks.
  }

  const killDeadline = Date.now() + 1_000;
  while (Date.now() < killDeadline) {
    if (!isProcessAlive(pid)) {
      return;
    }
    await delay(50);
  }
}
