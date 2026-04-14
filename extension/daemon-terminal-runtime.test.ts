import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";
import { describe, expect, test, vi } from "vite-plus/test";
import type {
  TerminalHostCreateOrAttachRequest,
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { DaemonTerminalRuntime } from "./daemon-terminal-runtime";

vi.mock("vscode", () => {
  class MockEventEmitter<T> {
    public readonly event = vi.fn();
    public fire(_value: T): void {}
    public dispose(): void {}
  }

  return {
    EventEmitter: MockEventEmitter,
    window: {
      createOutputChannel: vi.fn(() => ({
        appendLine: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn(),
      })),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn(() => false),
      })),
    },
  };
});

describe("DaemonTerminalRuntime", () => {
  test("should reject in-flight requests when the control socket closes", async () => {
    const runtime = createRuntime();
    const socket = new FakeSocket();
    primeRuntimeSocket(runtime, socket);

    const requestPromise = callPrivateSendRequest(runtime, {
      requestId: "request-close",
      type: "listSessions",
      workspaceId: "workspace-1",
    });

    await Promise.resolve();
    terminateRuntimeSocket(runtime, socket, "closed");

    await expect(requestPromise).rejects.toThrow("control socket closed during listSessions");
    expect(getPendingRequestCount(runtime)).toBe(0);
  });

  test("should retry createOrAttach once after a transport disconnect", async () => {
    const runtime = createRuntime();
    const firstSocket = new FakeSocket({
      onSend: (_payload, socket) => {
        queueMicrotask(() => {
          terminateRuntimeSocket(runtime, socket, "closed");
        });
      },
    });
    const secondSocket = new FakeSocket({
      onSend: (payload, socket) => {
        const request = JSON.parse(payload) as { requestId: string };
        queueMicrotask(() => {
          deliverRuntimeResponse(runtime, socket, {
            didCreateSession: true,
            ok: true,
            requestId: request.requestId,
            session: createSnapshot("session-1"),
            type: "response",
          });
        });
      },
    });
    primeRuntimeSocketSequence(runtime, [firstSocket, secondSocket]);

    const result = await runtime.createOrAttach(createCreateOrAttachRequest("session-1"));

    expect(result).toEqual({
      didCreateSession: true,
      session: createSnapshot("session-1"),
    });
    expect(firstSocket.sentPayloads).toHaveLength(1);
    expect(secondSocket.sentPayloads).toHaveLength(1);
  });
});

class FakeSocket extends EventEmitter {
  public readyState = 1;
  public readonly sentPayloads: string[] = [];

  public constructor(
    private readonly options?: {
      onSend?: (payload: string, socket: FakeSocket) => void;
    },
  ) {
    super();
  }

  public send(payload: string, callback?: (error?: Error) => void): void {
    this.sentPayloads.push(payload);
    callback?.();
    this.options?.onSend?.(payload, this);
  }

  public close(): void {
    this.emitClose();
  }

  public emitClose(): void {
    this.readyState = 3;
    this.emit("close");
  }

  public emitMessage(message: unknown): void {
    this.emit("message", Buffer.from(JSON.stringify(message)));
  }
}

function createRuntime(): DaemonTerminalRuntime {
  const runtime = new DaemonTerminalRuntime(
    {
      globalStorageUri: { fsPath: "/tmp" },
    } as never,
    "workspace-1",
  );
  stubLifecycle(runtime);
  return runtime;
}

function stubLifecycle(runtime: DaemonTerminalRuntime): void {
  (runtime as unknown as { startOwnerHeartbeat: () => void }).startOwnerHeartbeat = vi.fn();
  (runtime as unknown as { stopOwnerHeartbeat: () => void }).stopOwnerHeartbeat = vi.fn();
}

function primeRuntimeSocket(runtime: DaemonTerminalRuntime, socket: FakeSocket): void {
  (runtime as unknown as { controlSocket: FakeSocket }).controlSocket = socket;
  (
    runtime as unknown as {
      daemonInfo: {
        pid: number;
        port: number;
        protocolVersion: 25;
        startedAt: string;
        token: string;
      };
    }
  ).daemonInfo = createDaemonInfo();
  (runtime as unknown as { ensureReady: () => Promise<void> }).ensureReady = vi.fn(async () => {
    if (!(runtime as unknown as { controlSocket?: FakeSocket }).controlSocket) {
      (runtime as unknown as { controlSocket: FakeSocket }).controlSocket = socket;
      (
        runtime as unknown as {
          daemonInfo: {
            pid: number;
            port: number;
            protocolVersion: 25;
            startedAt: string;
            token: string;
          };
        }
      ).daemonInfo = createDaemonInfo();
    }
  });
}

function primeRuntimeSocketSequence(runtime: DaemonTerminalRuntime, sockets: FakeSocket[]): void {
  let nextIndex = 0;
  (runtime as unknown as { ensureReady: () => Promise<void> }).ensureReady = vi.fn(async () => {
    if ((runtime as unknown as { controlSocket?: FakeSocket }).controlSocket) {
      return;
    }

    const nextSocket = sockets[nextIndex];
    if (!nextSocket) {
      throw new Error("No fake sockets remaining for ensureReady.");
    }
    nextIndex += 1;
    (runtime as unknown as { controlSocket: FakeSocket }).controlSocket = nextSocket;
    (
      runtime as unknown as {
        daemonInfo: {
          pid: number;
          port: number;
          protocolVersion: 25;
          startedAt: string;
          token: string;
        };
      }
    ).daemonInfo = createDaemonInfo();
  });
}

function callPrivateSendRequest(
  runtime: DaemonTerminalRuntime,
  request: { requestId: string; type: "listSessions"; workspaceId: string },
): Promise<unknown> {
  return (
    runtime as unknown as {
      sendRequest: (request: typeof request) => Promise<unknown>;
    }
  ).sendRequest(request);
}

function getPendingRequestCount(runtime: DaemonTerminalRuntime): number {
  return (runtime as unknown as { pendingRequests: Map<string, unknown> }).pendingRequests.size;
}

function terminateRuntimeSocket(
  runtime: DaemonTerminalRuntime,
  socket: FakeSocket,
  reason: "closed" | "errored",
): void {
  (
    runtime as unknown as {
      handleSocketTermination: (socket: FakeSocket, reason: "closed" | "errored") => void;
    }
  ).handleSocketTermination(socket, reason);
}

function deliverRuntimeResponse(
  runtime: DaemonTerminalRuntime,
  socket: FakeSocket,
  response: Record<string, unknown>,
): void {
  (
    runtime as unknown as {
      handleControlMessage: (socket: FakeSocket, rawMessage: string) => void;
    }
  ).handleControlMessage(socket, JSON.stringify(response));
}

function createCreateOrAttachRequest(
  sessionId: string,
): Omit<TerminalHostCreateOrAttachRequest, "requestId" | "type"> {
  return {
    cols: 120,
    cwd: "/tmp",
    rows: 34,
    sessionId,
    sessionStateFilePath: `/tmp/${sessionId}.json`,
    shell: "/bin/zsh",
    shellArgs: [],
    terminalEngine: "xterm",
    workspaceId: "workspace-1",
    xtermHeadlessScrollback: 1000,
  };
}

function createSnapshot(sessionId: string): TerminalSessionSnapshot {
  return {
    agentStatus: "idle",
    cols: 120,
    cwd: "/tmp",
    isAttached: true,
    restoreState: "live",
    rows: 34,
    sessionId,
    shell: "/bin/zsh",
    startedAt: "2026-04-14T00:00:00.000Z",
    status: "running",
    workspaceId: "workspace-1",
  };
}

function createDaemonInfo(): {
  pid: number;
  port: number;
  protocolVersion: 25;
  startedAt: string;
  token: string;
} {
  return {
    pid: 1,
    port: 1234,
    protocolVersion: 25,
    startedAt: "2026-04-14T00:00:00.000Z",
    token: "token",
  };
}
