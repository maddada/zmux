import { access, readFile } from "node:fs/promises";
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
  TerminalHostWriteRequest,
  TerminalHostResizeRequest,
  TerminalHostKillRequest,
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { TERMINAL_HOST_PROTOCOL_VERSION } from "../shared/terminal-host-protocol";

type DaemonInfo = {
  pid: number;
  port: number;
  protocolVersion: typeof TERMINAL_HOST_PROTOCOL_VERSION;
  startedAt: string;
  token: string;
};

type PendingRequest = {
  reject: (error: Error) => void;
  resolve: (value: TerminalHostResponse) => void;
};

const CONTROL_CONNECT_TIMEOUT_MS = 3_000;
const DAEMON_READY_TIMEOUT_MS = 10_000;
const INFO_FILE_NAME = "daemon-info.json";

export type DaemonTerminalConnection = {
  baseUrl: string;
  token: string;
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

  public constructor(private readonly context: vscode.ExtensionContext) {}

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

  public async createOrAttach(
    request: Omit<TerminalHostCreateOrAttachRequest, "requestId" | "type">,
  ): Promise<TerminalSessionSnapshot> {
    await this.ensureReady();
    const response = await this.sendRequest({
      ...request,
      requestId: this.nextRequestId(),
      type: "createOrAttach",
    });
    if (!("session" in response) || !response.session) {
      throw new Error("VSmux daemon did not return a session snapshot.");
    }
    return response.session;
  }

  public async listSessions(): Promise<TerminalSessionSnapshot[]> {
    await this.ensureReady();
    const request: TerminalHostListSessionsRequest = {
      requestId: this.nextRequestId(),
      type: "listSessions",
    };
    const response = await this.sendRequest(request);
    if (!("sessions" in response) || !response.sessions) {
      return [];
    }
    return response.sessions;
  }

  public async write(sessionId: string, data: string): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostWriteRequest = {
      data,
      sessionId,
      type: "write",
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  public async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostResizeRequest = {
      cols,
      rows,
      sessionId,
      type: "resize",
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  public async kill(sessionId: string): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostKillRequest = {
      sessionId,
      type: "kill",
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  public async acknowledgeAttention(sessionId: string): Promise<void> {
    await this.ensureReady();
    const request: TerminalHostAcknowledgeAttentionRequest = {
      sessionId,
      type: "acknowledgeAttention",
    };
    this.controlSocket?.send(JSON.stringify(request));
  }

  private async connectControlSocket(): Promise<WebSocket> {
    const daemonInfo = await this.ensureDaemonProcess();
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

  private async ensureDaemonProcess(): Promise<DaemonInfo> {
    const existingInfo = await this.readDaemonInfo();
    if (
      existingInfo &&
      existingInfo.protocolVersion === TERMINAL_HOST_PROTOCOL_VERSION &&
      (await this.canReachDaemon(existingInfo))
    ) {
      return existingInfo;
    }

    const daemonScriptPath = path.join(__dirname, "terminal-daemon-process.js");
    const daemonStateDir = path.join(this.context.globalStorageUri.fsPath, "terminal-daemon");
    const child = spawn(process.execPath, [daemonScriptPath, "--state-dir", daemonStateDir], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    const deadline = Date.now() + DAEMON_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const info = await this.readDaemonInfo();
      if (info && (await this.canReachDaemon(info))) {
        return info;
      }
      await delay(150);
    }

    throw new Error("VSmux terminal daemon did not become ready in time.");
  }

  private async readDaemonInfo(): Promise<DaemonInfo | undefined> {
    const daemonStateDir = path.join(this.context.globalStorageUri.fsPath, "terminal-daemon");
    const infoFilePath = path.join(daemonStateDir, INFO_FILE_NAME);
    try {
      await access(infoFilePath);
      const rawInfo = await readFile(infoFilePath, "utf8");
      return JSON.parse(rawInfo) as DaemonInfo;
    } catch {
      return undefined;
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
    } catch {
      return false;
    }
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

async function delay(durationMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
