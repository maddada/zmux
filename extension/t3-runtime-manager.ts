import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import * as vscode from "vscode";
import type { T3SessionMetadata } from "../shared/session-grid-contract";
import { getDefaultShell, getDefaultWorkspaceCwd } from "./terminal-workspace-helpers";

const DEFAULT_MODEL = "gpt-5-codex";
const DEFAULT_T3_COMMAND = "npx t3";
const T3_HOST = "127.0.0.1";
const T3_PORT = 3773;
const START_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;

type T3Snapshot = {
  projects: Array<{
    createdAt: string;
    defaultModel: string | null;
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
    model: string;
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
  private process: ChildProcessWithoutNullStreams | undefined;
  private socket: WebSocket | undefined;
  private ensureRunningPromise: Promise<string> | undefined;
  private connectPromise: Promise<WebSocket> | undefined;
  private output: vscode.OutputChannel | undefined;

  public dispose(): void {
    this.ensureRunningPromise = undefined;
    this.connectPromise = undefined;
    this.socket?.close();
    this.socket = undefined;
    this.process?.kill();
    this.process = undefined;
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("T3 runtime disposed."));
    }
    this.pendingRequests.clear();
    this.output?.dispose();
    this.output = undefined;
  }

  public getServerOrigin(): string {
    return getT3Origin();
  }

  public getWebSocketUrl(): string {
    return getT3WebSocketUrl();
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
      model: project.defaultModel ?? DEFAULT_MODEL,
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
    if (await isOriginResponsive(origin)) {
      return origin;
    }

    if (!this.process || this.process.exitCode !== null) {
      this.startProcess(workspaceRoot, startupCommand);
    }

    const deadline = Date.now() + START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await isOriginResponsive(origin)) {
        return origin;
      }
      await delay(250);
    }

    throw new Error("Timed out waiting for T3 Code to start on http://127.0.0.1:3773.");
  }

  private startProcess(workspaceRoot: string, startupCommand: string): void {
    const shellPath = getDefaultShell();
    const shellArgs = getShellCommandArgs(shellPath, startupCommand);
    this.writeOutputLine(`[start] ${startupCommand}`);
    this.process = spawn(shellPath, shellArgs, {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        T3CODE_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "false",
        T3CODE_HOST: T3_HOST,
        T3CODE_NO_BROWSER: "true",
        T3CODE_PORT: String(T3_PORT),
      },
      stdio: "pipe",
    });

    this.process.stdout.on("data", (chunk) => {
      this.writeOutput(chunk.toString());
    });
    this.process.stderr.on("data", (chunk) => {
      this.writeOutput(chunk.toString());
    });
    this.process.once("exit", (code, signal) => {
      this.writeOutputLine(`[exit] code=${String(code)} signal=${String(signal)}`);
      this.process = undefined;
      this.connectPromise = undefined;
      this.socket?.close();
      this.socket = undefined;
    });
  }

  private async createProject(workspaceRoot: string): Promise<T3Project> {
    const projectId = randomUUID();
    const now = new Date().toISOString();
    const title = basename(workspaceRoot) || "project";
    await this.dispatchCommand({
      commandId: randomUUID(),
      createdAt: now,
      defaultModel: DEFAULT_MODEL,
      projectId,
      title,
      type: "project.create",
      workspaceRoot,
    });

    return {
      createdAt: now,
      defaultModel: DEFAULT_MODEL,
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
    return this.request("orchestration.dispatchCommand", { command });
  }

  private async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const socket = await this.connect();
    const id = randomUUID();
    const payload = JSON.stringify({
      body: params ? { ...params, _tag: method } : { _tag: method },
      id,
    });

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
      const socket = new WebSocket(getT3WebSocketUrl());
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
    if (typeof raw !== "string") {
      return;
    }

    const serialized = raw;
    let message: { error?: { message?: string }; id?: string; result?: unknown; type?: string };
    try {
      message = JSON.parse(serialized) as typeof message;
    } catch {
      return;
    }

    if (message.type === "push" || !message.id) {
      return;
    }

    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);
    if (message.error?.message) {
      pending.reject(new Error(message.error.message));
      return;
    }

    pending.resolve(message.result);
  }

  private getOutputChannel(): vscode.OutputChannel | undefined {
    if (this.output) {
      return this.output;
    }

    if (typeof vscode.window.createOutputChannel !== "function") {
      return undefined;
    }

    this.output = vscode.window.createOutputChannel("VSmux T3");
    return this.output;
  }

  private writeOutput(value: string): void {
    this.getOutputChannel()?.append(value);
  }

  private writeOutputLine(value: string): void {
    this.getOutputChannel()?.appendLine(value);
  }
}

function getT3Origin(): string {
  return `http://${T3_HOST}:${String(T3_PORT)}`;
}

function getT3WebSocketUrl(): string {
  return `ws://${T3_HOST}:${String(T3_PORT)}`;
}

async function isOriginResponsive(origin: string): Promise<boolean> {
  try {
    const response = await fetch(origin, {
      method: "GET",
      signal: AbortSignal.timeout(1_500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getShellCommandArgs(shellPath: string, command: string): string[] {
  const shellName = basename(shellPath).toLowerCase();

  if (process.platform === "win32") {
    if (shellName === "cmd.exe" || shellName === "cmd") {
      return ["/d", "/c", command];
    }

    return ["-NoLogo", "-NoProfile", "-Command", command];
  }

  return ["-l", "-c", command];
}
