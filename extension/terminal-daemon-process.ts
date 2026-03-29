import { createServer } from "node:http";
import { mkdir, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import * as pty from "@lydell/node-pty";
import {
  createManagedTerminalEnvironment,
} from "./native-managed-terminal";
import {
  readPersistedSessionStateFromFile,
  updatePersistedSessionStateFile,
} from "./session-state-file";
import { parseTerminalTitleFromOutputChunk } from "./terminal-workspace-history";
import type {
  TerminalHostAcknowledgeAttentionRequest,
  TerminalHostConfigureRequest,
  TerminalHostCreateOrAttachRequest,
  TerminalHostKillRequest,
  TerminalHostListSessionsRequest,
  TerminalHostRequest,
  TerminalHostResponse,
  TerminalHostSessionStateEvent,
  TerminalHostWriteRequest,
  TerminalHostResizeRequest,
  TerminalInputMessage,
  TerminalOutputMessage,
  TerminalResizeMessage,
  TerminalSessionSnapshot,
  TerminalStateMessage,
} from "../shared/terminal-host-protocol";
import { TERMINAL_HOST_PROTOCOL_VERSION } from "../shared/terminal-host-protocol";

type DaemonInfo = {
  pid: number;
  port: number;
  protocolVersion: typeof TERMINAL_HOST_PROTOCOL_VERSION;
  startedAt: string;
  token: string;
};

type ManagedSession = {
  cols: number;
  cwd: string;
  history: string;
  liveTitle?: string;
  lastKnownPersistedTitle?: string;
  titleCarryover: string;
  pty: pty.IPty;
  rows: number;
  sessionId: string;
  sessionStateFilePath: string;
  shell: string;
  snapshot: TerminalSessionSnapshot;
  workspaceId: string;
};

type ControlClient = {
  socket: WebSocket;
};

const DEFAULT_IDLE_SHUTDOWN_TIMEOUT_MS = 5 * 60_000;
const MAX_HISTORY_CHARS = 250_000;
const INFO_FILE_NAME = "daemon-info.json";

const stateDir = getStateDirFromArgs();
const infoFilePath = path.join(stateDir, INFO_FILE_NAME);

const sessions = new Map<string, ManagedSession>();
const controlClients = new Set<ControlClient>();
const sessionSocketsBySessionId = new Map<string, Set<WebSocket>>();

let idleShutdownTimeoutMs: number | null = DEFAULT_IDLE_SHUTDOWN_TIMEOUT_MS;
let idleShutdownTimer: NodeJS.Timeout | undefined;
let daemonInfo: DaemonInfo | undefined;

const server = createServer();
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = resolveRequestUrl(request.url);
  if (!url || url.searchParams.get("token") !== daemonInfo?.token) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
    if (url.pathname === "/control") {
      attachControlSocket(websocket);
      return;
    }

    if (url.pathname === "/session") {
      attachSessionSocket(websocket, url.searchParams.get("sessionId"), url.searchParams);
      return;
    }

    websocket.close();
  });
});

server.listen(0, "127.0.0.1", async () => {
  const address = server.address();
  if (!address || typeof address === "string") {
    process.exit(1);
  }

  daemonInfo = {
    pid: process.pid,
    port: address.port,
    protocolVersion: TERMINAL_HOST_PROTOCOL_VERSION,
    startedAt: new Date().toISOString(),
    token: randomToken(),
  };

  await mkdir(stateDir, { recursive: true });
  await writeJsonAtomically(infoFilePath, daemonInfo);
});

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});

function attachControlSocket(socket: WebSocket): void {
  clearIdleShutdownTimer();
  const client = { socket };
  controlClients.add(client);
  socket.send(JSON.stringify({ type: "authenticated" }));

  socket.on("message", (buffer: Buffer) => {
    void handleControlMessage(client, buffer.toString());
  });
  socket.on("close", () => {
    controlClients.delete(client);
    scheduleIdleShutdownIfNeeded();
  });
  socket.on("error", () => {
    controlClients.delete(client);
    scheduleIdleShutdownIfNeeded();
  });
}

function attachSessionSocket(
  socket: WebSocket,
  sessionId: string | null,
  searchParams: URLSearchParams,
): void {
  if (!sessionId) {
    socket.close();
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    socket.close();
    return;
  }

  clearIdleShutdownTimer();
  const sockets = sessionSocketsBySessionId.get(sessionId) ?? new Set<WebSocket>();
  sockets.add(socket);
  sessionSocketsBySessionId.set(sessionId, sockets);

  const initialCols = parsePositiveNumber(searchParams.get("cols"));
  const initialRows = parsePositiveNumber(searchParams.get("rows"));
  if (initialCols && initialRows) {
    resizeSession(session, initialCols, initialRows);
  }

  void sendSessionState(socket, session, true);

  socket.on("message", (buffer: Buffer) => {
    void handleSessionMessage(sessionId, buffer.toString());
  });
  socket.on("close", () => {
    sockets.delete(socket);
    if (sockets.size === 0) {
      sessionSocketsBySessionId.delete(sessionId);
    }
    scheduleIdleShutdownIfNeeded();
  });
  socket.on("error", () => {
    sockets.delete(socket);
    if (sockets.size === 0) {
      sessionSocketsBySessionId.delete(sessionId);
    }
    scheduleIdleShutdownIfNeeded();
  });
}

async function handleControlMessage(client: ControlClient, rawMessage: string): Promise<void> {
  let request: TerminalHostRequest | undefined;
  try {
    request = JSON.parse(rawMessage) as TerminalHostRequest;
  } catch {
    return;
  }

  switch (request.type) {
    case "authenticate":
      client.socket.send(JSON.stringify({ type: "authenticated" }));
      return;
    case "configure":
      await handleConfigureRequest(client.socket, request);
      return;
    case "createOrAttach":
      await handleCreateOrAttachRequest(client.socket, request);
      return;
    case "listSessions":
      await handleListSessionsRequest(client.socket, request);
      return;
    case "write":
      await handleWriteRequest(client.socket, request);
      return;
    case "resize":
      await handleResizeRequest(client.socket, request);
      return;
    case "kill":
      await handleKillRequest(client.socket, request);
      return;
    case "acknowledgeAttention":
      await handleAcknowledgeAttentionRequest(client.socket, request);
      return;
    default:
      return;
  }
}

async function handleConfigureRequest(
  socket: WebSocket,
  request: TerminalHostConfigureRequest,
): Promise<void> {
  idleShutdownTimeoutMs = request.idleShutdownTimeoutMs;
  clearIdleShutdownTimer();
  scheduleIdleShutdownIfNeeded();
  socket.send(JSON.stringify(okResponse(request.requestId)));
}

async function handleCreateOrAttachRequest(
  socket: WebSocket,
  request: TerminalHostCreateOrAttachRequest,
): Promise<void> {
  const existingSession = sessions.get(request.sessionId);
  const session =
    existingSession && existingSession.snapshot.status !== "exited"
      ? existingSession
      : createSession(request);

  if (session.cols !== request.cols || session.rows !== request.rows) {
    resizeSession(session, request.cols, request.rows);
  }

  sessions.set(request.sessionId, session);
  const snapshot = await buildSnapshot(session, true);
  socket.send(JSON.stringify(okResponse(request.requestId, { session: snapshot })));
  broadcastControlSessionState(snapshot);
}

async function handleListSessionsRequest(
  socket: WebSocket,
  request: TerminalHostListSessionsRequest,
): Promise<void> {
  const sessionSnapshots = await Promise.all(
    [...sessions.values()].map((session) => buildSnapshot(session, false)),
  );
  socket.send(JSON.stringify(okResponse(request.requestId, { sessions: sessionSnapshots })));
}

async function handleWriteRequest(socket: WebSocket, request: TerminalHostWriteRequest): Promise<void> {
  const session = sessions.get(request.sessionId);
  if (session) {
    session.pty.write(request.data);
  }
  socket.send(JSON.stringify(okResponse(undefined, undefined, request)));
}

async function handleResizeRequest(
  socket: WebSocket,
  request: TerminalHostResizeRequest,
): Promise<void> {
  const session = sessions.get(request.sessionId);
  if (session) {
    resizeSession(session, request.cols, request.rows);
    const snapshot = await buildSnapshot(session, false);
    broadcastControlSessionState(snapshot);
    broadcastSessionState(session.sessionId, snapshot);
  }
  socket.send(JSON.stringify(okResponse(undefined, undefined, request)));
}

async function handleKillRequest(socket: WebSocket, request: TerminalHostKillRequest): Promise<void> {
  const session = sessions.get(request.sessionId);
  if (session) {
    session.pty.kill();
    sessions.delete(request.sessionId);
  }
  socket.send(JSON.stringify(okResponse(undefined, undefined, request)));
}

async function handleAcknowledgeAttentionRequest(
  socket: WebSocket,
  request: TerminalHostAcknowledgeAttentionRequest,
): Promise<void> {
  const session = sessions.get(request.sessionId);
  if (session) {
    await updatePersistedSessionStateFile(session.sessionStateFilePath, (currentState) => ({
      ...currentState,
      agentStatus: "idle",
    }));
    const snapshot = await buildSnapshot(session, false);
    broadcastControlSessionState(snapshot);
    broadcastSessionState(session.sessionId, snapshot);
  }
  socket.send(JSON.stringify({ type: "response", ok: true, requestId: request.sessionId }));
}

function createSession(request: TerminalHostCreateOrAttachRequest): ManagedSession {
  const spawnedPty = pty.spawn(request.shell, [], {
    cols: request.cols,
    cwd: request.cwd,
    env: {
      ...process.env,
      ...createManagedTerminalEnvironment(
        request.workspaceId,
        request.sessionId,
        request.sessionStateFilePath,
      ),
    },
    name: "xterm-256color",
    rows: request.rows,
  });

  const session: ManagedSession = {
    cols: request.cols,
    cwd: request.cwd,
    history: "",
    liveTitle: undefined,
    pty: spawnedPty,
    rows: request.rows,
    sessionId: request.sessionId,
    sessionStateFilePath: request.sessionStateFilePath,
    shell: request.shell,
    snapshot: {
      agentName: undefined,
      agentStatus: "idle",
      cols: request.cols,
      cwd: request.cwd,
      restoreState: "live",
      rows: request.rows,
      sessionId: request.sessionId,
      shell: request.shell,
      startedAt: new Date().toISOString(),
      status: "running",
      title: undefined,
      workspaceId: request.workspaceId,
    },
    titleCarryover: "",
    workspaceId: request.workspaceId,
  };

  spawnedPty.onData((data: string) => {
    session.history = trimHistory(`${session.history}${data}`);
    const didChangeTitle = updateSessionLiveTitle(session, data);
    const outputMessage: TerminalOutputMessage = {
      data,
      sessionId: session.sessionId,
      type: "terminalOutput",
    };
    broadcastSessionMessage(session.sessionId, outputMessage);
    if (didChangeTitle) {
      broadcastControlSessionState(session.snapshot);
      broadcastSessionState(session.sessionId, session.snapshot);
    }
  });

  spawnedPty.onExit(({ exitCode }: { exitCode: number; signal?: number }) => {
    session.snapshot = {
      ...session.snapshot,
      endedAt: new Date().toISOString(),
      exitCode,
      status: "exited",
    };
    void buildSnapshot(session, false).then((snapshot) => {
      broadcastControlSessionState(snapshot);
      broadcastSessionState(session.sessionId, snapshot);
    });
  });

  return session;
}

function resizeSession(session: ManagedSession, cols: number, rows: number): void {
  session.cols = cols;
  session.rows = rows;
  session.snapshot = {
    ...session.snapshot,
    cols,
    rows,
  };
  session.pty.resize(cols, rows);
}

async function buildSnapshot(
  session: ManagedSession,
  includeHistory: boolean,
): Promise<TerminalSessionSnapshot> {
  const persistedState = await readPersistedSessionStateFromFile(session.sessionStateFilePath);
  session.lastKnownPersistedTitle = persistedState.title;
  session.snapshot = {
    ...session.snapshot,
    agentName: persistedState.agentName,
    agentStatus: persistedState.agentStatus,
    history: includeHistory ? session.history : undefined,
    title: session.liveTitle ?? persistedState.title,
  };
  return session.snapshot;
}

function broadcastControlSessionState(snapshot: TerminalSessionSnapshot): void {
  const event: TerminalHostSessionStateEvent = {
    session: snapshot,
    type: "sessionState",
  };
  const payload = JSON.stringify(event);
  for (const client of controlClients) {
    client.socket.send(payload);
  }
}

function broadcastSessionState(sessionId: string, snapshot: TerminalSessionSnapshot): void {
  const event: TerminalStateMessage = {
    session: snapshot,
    type: "terminalSessionState",
  };
  broadcastSessionMessage(sessionId, event);
}

function broadcastSessionMessage(
  sessionId: string,
  message: TerminalOutputMessage | TerminalStateMessage,
): void {
  const payload = message.type === "terminalOutput" ? message.data : JSON.stringify(message);
  for (const socket of sessionSocketsBySessionId.get(sessionId) ?? []) {
    socket.send(payload);
  }
}

async function sendSessionState(
  socket: WebSocket,
  session: ManagedSession,
  includeHistory: boolean,
): Promise<void> {
  const snapshot = await buildSnapshot(session, includeHistory);
  const message: TerminalStateMessage = {
    session: snapshot,
    type: "terminalSessionState",
  };
  socket.send(JSON.stringify(message));
}

async function handleSessionMessage(sessionId: string, rawMessage: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  if (!rawMessage.startsWith("{")) {
    session.pty.write(rawMessage);
    return;
  }

  let message: TerminalInputMessage | TerminalResizeMessage | undefined;
  try {
    message = JSON.parse(rawMessage) as TerminalInputMessage | TerminalResizeMessage;
  } catch {
    return;
  }

  if (message.type === "terminalInput") {
    session.pty.write(message.data);
    return;
  }

  if (message.type === "terminalResize") {
    resizeSession(session, message.cols, message.rows);
    const snapshot = await buildSnapshot(session, false);
    broadcastControlSessionState(snapshot);
    broadcastSessionState(sessionId, snapshot);
  }
}

function okResponse(
  requestId: string | undefined,
  payload?: Record<string, unknown>,
  request?: TerminalHostRequest,
): TerminalHostResponse {
  if (requestId) {
    return {
      ok: true,
      requestId,
      type: "response",
      ...(payload ?? {}),
    } as TerminalHostResponse;
  }

  return {
    ok: true,
    requestId:
      request?.type === "write" || request?.type === "resize" || request?.type === "kill"
        ? request.sessionId
        : "ok",
    type: "response",
    ...(payload ?? {}),
  } as TerminalHostResponse;
}

function updateSessionLiveTitle(session: ManagedSession, chunk: string): boolean {
  const { carryover, title } = parseTerminalTitleFromOutputChunk(session.titleCarryover, chunk);
  session.titleCarryover = carryover;
  if (!title || title === session.liveTitle) {
    return false;
  }

  session.liveTitle = title;
  session.snapshot = {
    ...session.snapshot,
    title,
  };
  return true;
}

function scheduleIdleShutdownIfNeeded(): void {
  if (getConnectedClientCount() > 0) {
    return;
  }
  if (idleShutdownTimeoutMs === null || idleShutdownTimeoutMs <= 0) {
    return;
  }
  clearIdleShutdownTimer();
  idleShutdownTimer = setTimeout(() => {
    void shutdown();
  }, idleShutdownTimeoutMs);
}

function clearIdleShutdownTimer(): void {
  if (idleShutdownTimer) {
    clearTimeout(idleShutdownTimer);
    idleShutdownTimer = undefined;
  }
}

function getConnectedClientCount(): number {
  return (
    controlClients.size +
    [...sessionSocketsBySessionId.values()].reduce((count, sockets) => count + sockets.size, 0)
  );
}

async function shutdown(): Promise<void> {
  clearIdleShutdownTimer();
  for (const session of sessions.values()) {
    try {
      session.pty.kill();
    } catch {
      // Ignore process shutdown races.
    }
  }
  sessions.clear();
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  process.exit(0);
}

function getStateDirFromArgs(): string {
  const stateDirFlagIndex = process.argv.indexOf("--state-dir");
  if (stateDirFlagIndex >= 0) {
    const stateDirArg = process.argv[stateDirFlagIndex + 1];
    if (stateDirArg) {
      return path.resolve(stateDirArg);
    }
  }

  return path.resolve(process.cwd(), ".vsmux-daemon");
}

function resolveRequestUrl(requestUrl: string | undefined): URL | undefined {
  if (!requestUrl) {
    return undefined;
  }
  return new URL(requestUrl, "http://127.0.0.1");
}

function parsePositiveNumber(value: string | null): number | undefined {
  const parsedValue = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function randomToken(): string {
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function trimHistory(history: string): string {
  if (history.length <= MAX_HISTORY_CHARS) {
    return history;
  }

  return history.slice(history.length - MAX_HISTORY_CHARS);
}

async function writeJsonAtomically(filePath: string, value: DaemonInfo): Promise<void> {
  const tempFilePath = `${filePath}.tmp.${process.pid}`;
  await writeFile(tempFilePath, JSON.stringify(value, undefined, 2), "utf8");
  await rename(tempFilePath, filePath);
}
