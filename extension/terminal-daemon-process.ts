import { createServer } from "node:http";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { WebSocket, WebSocketServer } from "ws";
import * as pty from "@lydell/node-pty";
import { createManagedTerminalEnvironment } from "./native-managed-terminal";
import {
  createPendingAttachQueue,
  createTerminalReplayChunks,
  type PendingAttachQueue,
  queuePendingAttachChunk,
  serializeTerminalReplayHistory,
} from "./terminal-daemon-replay";
import {
  readPersistedSessionStateFromFile,
  updatePersistedSessionStateFile,
} from "./session-state-file";
import { resolvePersistedSessionPresentationState } from "./terminal-daemon-session-state";
import {
  getTitleActivityWindowMs,
  acknowledgeTitleDerivedSessionActivity,
  getTitleDerivedSessionActivity,
  getTitleDerivedSessionActivityFromTransition,
  type TitleDerivedSessionActivity,
} from "./session-title-activity";
import { TerminalDaemonRingBuffer } from "./terminal-daemon-ring-buffer";
import { createTerminalDaemonSessionKey } from "./terminal-daemon-session-scope";
import { parseTerminalTitleFromOutputChunk } from "./terminal-workspace-history";
import type {
  TerminalHostAcknowledgeAttentionRequest,
  TerminalHostConfigureRequest,
  TerminalHostCreateOrAttachRequest,
  TerminalHostHeartbeatOwnerRequest,
  TerminalHostKillRequest,
  TerminalHostListSessionsRequest,
  TerminalHostRequest,
  TerminalHostResponse,
  TerminalHostSessionStateEvent,
  TerminalHostSyncSessionLeasesRequest,
  TerminalHostWriteRequest,
  TerminalHostResizeRequest,
  TerminalInputMessage,
  TerminalReadyMessage,
  TerminalResizeMessage,
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

type ManagedSession = {
  cols: number;
  cwd: string;
  historyBuffer: TerminalDaemonRingBuffer;
  liveTitle?: string;
  lastKnownPersistedTitle?: string;
  pendingAttachQueues: PendingAttachQueue[];
  titleActivity?: TitleDerivedSessionActivity;
  titleActivityTimer?: NodeJS.Timeout;
  titleCarryover: string;
  pty: pty.IPty;
  rows: number;
  sessionId: string;
  sessionKey: string;
  sessionStateFilePath: string;
  shell: string;
  snapshot: TerminalSessionSnapshot;
  workspaceId: string;
  leaseExpiresAt?: number | null;
};

type ControlClient = {
  lastHeartbeatAt?: number;
  ownerId?: string;
  ownerPid?: number;
  socket: WebSocket;
};

type PendingSessionAttachment = {
  activated: boolean;
  id: number;
  initialCols?: number;
  initialRows?: number;
  pendingAttachQueue?: PendingAttachQueue;
  readyTimeout?: NodeJS.Timeout;
};

const DEFAULT_IDLE_SHUTDOWN_TIMEOUT_MS = 5 * 60_000;
const DAEMON_OWNER_HEARTBEAT_TIMEOUT_MS = 20_000;
const DAEMON_OWNER_STARTUP_GRACE_MS = 30_000;
const MAX_HISTORY_BYTES = 8 * 1024 * 1024;
const SESSION_ATTACH_READY_TIMEOUT_MS = 15_000;
const REPLAY_CHUNK_BYTES = 128 * 1024;
const INFO_FILE_NAME = "daemon-info.json";
const DAEMON_DEBUG_LOG_FILE_NAME = "terminal-daemon-debug.log";

const stateDir = getStateDirFromArgs();
const infoFilePath = path.join(stateDir, INFO_FILE_NAME);
const daemonDebugLogFilePath = path.join(stateDir, DAEMON_DEBUG_LOG_FILE_NAME);

const sessions = new Map<string, ManagedSession>();
const controlClients = new Set<ControlClient>();
const pendingSessionAttachmentSockets = new Set<WebSocket>();
const sessionSocketsBySessionKey = new Map<string, WebSocket>();

let idleShutdownTimeoutMs: number | null = DEFAULT_IDLE_SHUTDOWN_TIMEOUT_MS;
let lifecycleTimer: NodeJS.Timeout | undefined;
let ownerAdoptionTimer: NodeJS.Timeout | undefined;
let daemonInfo: DaemonInfo | undefined;
let nextPendingSessionAttachmentId = 0;

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

  await mkdir(stateDir, { recursive: true });
  const existingDaemon = await findReachableExistingDaemonInfo();
  if (existingDaemon) {
    void logDaemonDebug("daemon.startSkippedExisting", {
      existingPid: existingDaemon.pid,
      existingPort: existingDaemon.port,
      existingProtocolVersion: existingDaemon.protocolVersion,
      existingStartedAt: existingDaemon.startedAt,
      pid: process.pid,
    });
    server.close(() => {
      process.exit(0);
    });
    return;
  }

  daemonInfo = {
    pid: process.pid,
    port: address.port,
    protocolVersion: TERMINAL_HOST_PROTOCOL_VERSION,
    startedAt: new Date().toISOString(),
    token: randomToken(),
  };

  await writeJsonAtomically(infoFilePath, daemonInfo);
  scheduleOwnerAdoptionTimeout();
  void logDaemonDebug("daemon.start", {
    pid: daemonInfo.pid,
    port: daemonInfo.port,
    protocolVersion: daemonInfo.protocolVersion,
    startedAt: daemonInfo.startedAt,
  });
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

function attachControlSocket(socket: WebSocket): void {
  clearLifecycleTimer();
  const client = { socket };
  controlClients.add(client);
  socket.send(JSON.stringify({ type: "authenticated" }));

  socket.on("message", (buffer: Buffer) => {
    void handleControlMessage(client, buffer.toString());
  });
  socket.on("close", () => {
    controlClients.delete(client);
    scheduleDaemonLifecycleCheckIfNeeded();
  });
  socket.on("error", () => {
    controlClients.delete(client);
    scheduleDaemonLifecycleCheckIfNeeded();
  });
}

function attachSessionSocket(
  socket: WebSocket,
  sessionId: string | null,
  searchParams: URLSearchParams,
): void {
  const workspaceId = searchParams.get("workspaceId");
  if (!sessionId || !workspaceId) {
    void logDaemonDebug("daemon.sessionSocketRejected", {
      reason: "missing-session-or-workspace",
      sessionId,
      workspaceId,
    });
    socket.close();
    return;
  }

  const sessionKey = createTerminalDaemonSessionKey(workspaceId, sessionId);
  const session = sessions.get(sessionKey);
  if (!session) {
    void logDaemonDebug("daemon.sessionSocketRejected", {
      reason: "missing-session",
      sessionId,
      sessionKey,
      workspaceId,
    });
    socket.close();
    return;
  }

  clearLifecycleTimer();
  const initialCols = parsePositiveNumber(searchParams.get("cols"));
  const initialRows = parsePositiveNumber(searchParams.get("rows"));
  void logDaemonDebug("daemon.sessionSocketAccepted", {
    initialCols,
    initialRows,
    sessionId,
    sessionKey,
    sessionStatus: session.snapshot.status,
    workspaceId,
  });
  void attachSessionSocketWithReplay(session, sessionKey, socket, initialCols, initialRows);
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
    case "heartbeatOwner":
      await handleHeartbeatOwnerRequest(client, request);
      return;
    case "syncSessionLeases":
      await handleSyncSessionLeasesRequest(client.socket, request);
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
  clearLifecycleTimer();
  scheduleDaemonLifecycleCheckIfNeeded();
  socket.send(JSON.stringify(okResponse(request.requestId)));
}

async function handleSyncSessionLeasesRequest(
  socket: WebSocket,
  request: TerminalHostSyncSessionLeasesRequest,
): Promise<void> {
  const leasedSessionIds = new Set(request.sessionIds);
  const leasedUntil =
    request.leaseDurationMs === null ? null : Date.now() + Math.max(0, request.leaseDurationMs);

  for (const session of sessions.values()) {
    if (session.workspaceId !== request.workspaceId) {
      continue;
    }

    session.leaseExpiresAt = leasedSessionIds.has(session.sessionId) ? leasedUntil : undefined;
  }

  clearLifecycleTimer();
  scheduleDaemonLifecycleCheckIfNeeded();
  socket.send(JSON.stringify(okResponse(request.requestId)));
}

async function handleHeartbeatOwnerRequest(
  client: ControlClient,
  request: TerminalHostHeartbeatOwnerRequest,
): Promise<void> {
  client.lastHeartbeatAt = Date.now();
  client.ownerId = request.ownerId;
  client.ownerPid = request.ownerPid;
  clearOwnerAdoptionTimer();
  scheduleDaemonLifecycleCheckIfNeeded();
  client.socket.send(JSON.stringify(okResponse(request.requestId)));
}

async function handleCreateOrAttachRequest(
  socket: WebSocket,
  request: TerminalHostCreateOrAttachRequest,
): Promise<void> {
  const sessionKey = createTerminalDaemonSessionKey(request.workspaceId, request.sessionId);
  const existingSession = sessions.get(sessionKey);
  const didCreateSession = !existingSession || existingSession.snapshot.status === "exited";
  const session =
    existingSession && existingSession.snapshot.status !== "exited"
      ? existingSession
      : createSession(request);

  if (session.cols !== request.cols || session.rows !== request.rows) {
    resizeSession(session, request.cols, request.rows);
  }

  sessions.set(sessionKey, session);
  const snapshot = await buildSnapshot(session, false);
  socket.send(
    JSON.stringify(okResponse(request.requestId, { didCreateSession, session: snapshot })),
  );
  broadcastControlSessionState(snapshot);
}

async function handleListSessionsRequest(
  socket: WebSocket,
  request: TerminalHostListSessionsRequest,
): Promise<void> {
  const sessionSnapshots = await Promise.all(
    [...sessions.values()]
      .filter((session) => !request.workspaceId || session.workspaceId === request.workspaceId)
      .map((session) => buildSnapshot(session, false)),
  );
  socket.send(JSON.stringify(okResponse(request.requestId, { sessions: sessionSnapshots })));
}

async function handleWriteRequest(
  socket: WebSocket,
  request: TerminalHostWriteRequest,
): Promise<void> {
  const session = sessions.get(
    createTerminalDaemonSessionKey(request.workspaceId, request.sessionId),
  );
  if (session) {
    session.pty.write(request.data);
  }
  socket.send(JSON.stringify(okResponse(undefined, undefined, request)));
}

async function handleResizeRequest(
  socket: WebSocket,
  request: TerminalHostResizeRequest,
): Promise<void> {
  const session = sessions.get(
    createTerminalDaemonSessionKey(request.workspaceId, request.sessionId),
  );
  if (session) {
    resizeSession(session, request.cols, request.rows);
    const snapshot = await buildSnapshot(session, false);
    broadcastControlSessionState(snapshot);
  }
  socket.send(JSON.stringify(okResponse(undefined, undefined, request)));
}

async function handleKillRequest(
  socket: WebSocket,
  request: TerminalHostKillRequest,
): Promise<void> {
  const sessionKey = createTerminalDaemonSessionKey(request.workspaceId, request.sessionId);
  const session = sessions.get(sessionKey);
  if (session) {
    session.pty.kill();
    sessions.delete(sessionKey);
  }
  socket.send(JSON.stringify(okResponse(undefined, undefined, request)));
}

async function handleAcknowledgeAttentionRequest(
  socket: WebSocket,
  request: TerminalHostAcknowledgeAttentionRequest,
): Promise<void> {
  const session = sessions.get(
    createTerminalDaemonSessionKey(request.workspaceId, request.sessionId),
  );
  if (session) {
    if (session.titleActivity?.activity === "attention") {
      session.titleActivity = acknowledgeTitleDerivedSessionActivity(session.titleActivity);
      applySessionTitleActivity(session);
    } else {
      await updatePersistedSessionStateFile(session.sessionStateFilePath, (currentState) => ({
        ...currentState,
        agentStatus: "idle",
      }));
    }
    const snapshot = await buildSnapshot(session, false);
    broadcastControlSessionState(snapshot);
  }
  socket.send(JSON.stringify({ type: "response", ok: true, requestId: request.sessionId }));
}

function createSession(request: TerminalHostCreateOrAttachRequest): ManagedSession {
  const sessionKey = createTerminalDaemonSessionKey(request.workspaceId, request.sessionId);
  const spawnedPty = pty.spawn(request.shell, [], {
    cols: request.cols,
    cwd: request.cwd,
    encoding: null,
    env: createPtyEnvironment(request.workspaceId, request.sessionId, request.sessionStateFilePath),
    name: "xterm-256color",
    rows: request.rows,
  });

  const session: ManagedSession = {
    cols: request.cols,
    cwd: request.cwd,
    historyBuffer: new TerminalDaemonRingBuffer(MAX_HISTORY_BYTES),
    liveTitle: undefined,
    pendingAttachQueues: [],
    pty: spawnedPty,
    rows: request.rows,
    sessionId: request.sessionId,
    sessionKey,
    sessionStateFilePath: request.sessionStateFilePath,
    shell: request.shell,
    snapshot: {
      agentName: undefined,
      agentStatus: "idle",
      cols: request.cols,
      cwd: request.cwd,
      isAttached: false,
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
    leaseExpiresAt: undefined,
  };

  spawnedPty.onData((data: string) => {
    const outputBuffer = normalizePtyOutputChunk(data);
    const chunkStartCursor = session.historyBuffer.bytesWritten;
    session.historyBuffer.write(outputBuffer);
    const chunkEndCursor = session.historyBuffer.bytesWritten;
    for (const pendingAttachQueue of session.pendingAttachQueues) {
      queuePendingAttachChunk(pendingAttachQueue, outputBuffer, chunkStartCursor, chunkEndCursor);
    }
    const didChangeTitle = updateSessionLiveTitle(session, outputBuffer.toString("utf8"));
    broadcastSessionMessage(session.sessionKey, outputBuffer);
    if (didChangeTitle) {
      // Title changes only need to reach control clients; the terminal pane
      // itself does not consume live title updates after initial history sync.
      broadcastControlSessionState(session.snapshot);
    }
  });

  spawnedPty.onExit(({ exitCode }: { exitCode: number; signal?: number }) => {
    clearTitleActivityTimer(session);
    session.snapshot = {
      ...session.snapshot,
      endedAt: new Date().toISOString(),
      exitCode,
      status: "exited",
    };
    void buildSnapshot(session, false).then((snapshot) => {
      broadcastControlSessionState(snapshot);
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
    agentName: session.titleActivity?.agentName ?? persistedState.agentName,
    agentStatus: session.titleActivity?.activity ?? persistedState.agentStatus,
    history: includeHistory ? serializeTerminalReplayHistory(session.historyBuffer) : undefined,
    isAttached: sessionSocketsBySessionKey.get(session.sessionKey)?.readyState === WebSocket.OPEN,
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

function broadcastSessionMessage(sessionKey: string, message: Buffer | string): void {
  const payload = message;
  const socket = sessionSocketsBySessionKey.get(sessionKey);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(payload);
  }
}

async function handleSessionSocketMessage(
  session: ManagedSession,
  sessionKey: string,
  socket: WebSocket,
  attachment: PendingSessionAttachment,
  rawMessage: string,
): Promise<void> {
  if (!rawMessage.trimStart().startsWith("{")) {
    if (attachment.activated) {
      session.pty.write(rawMessage);
    }
    return;
  }

  let message: TerminalInputMessage | TerminalResizeMessage | TerminalReadyMessage | undefined;
  try {
    message = JSON.parse(rawMessage) as
      | TerminalInputMessage
      | TerminalResizeMessage
      | TerminalReadyMessage;
  } catch {
    if (attachment.activated) {
      session.pty.write(rawMessage);
    }
    return;
  }

  if (
    message.type !== "terminalInput" &&
    message.type !== "terminalResize" &&
    message.type !== "terminalReady"
  ) {
    if (attachment.activated) {
      session.pty.write(rawMessage);
    }
    return;
  }

  if (message.type === "terminalInput") {
    if (attachment.activated) {
      session.pty.write(message.data);
    }
    return;
  }

  if (message.type === "terminalResize") {
    attachment.initialCols = message.cols;
    attachment.initialRows = message.rows;
    void logDaemonDebug("daemon.sessionAttachmentResizeReceived", {
      activated: attachment.activated,
      attachmentId: attachment.id,
      cols: message.cols,
      rows: message.rows,
      sessionId: session.sessionId,
      sessionKey,
      workspaceId: session.workspaceId,
    });
    resizeSession(session, message.cols, message.rows);
    if (attachment.activated) {
      const snapshot = await buildSnapshot(session, false);
      broadcastControlSessionState(snapshot);
    }
    return;
  }

  attachment.initialCols = message.cols;
  attachment.initialRows = message.rows;
  void logDaemonDebug("daemon.sessionAttachmentReadyReceived", {
    attachmentId: attachment.id,
    cols: message.cols,
    rows: message.rows,
    sessionId: session.sessionId,
    sessionKey,
    workspaceId: session.workspaceId,
  });
  await activatePendingSessionAttachment(session, sessionKey, socket, attachment);
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
      ...payload,
    } as TerminalHostResponse;
  }

  return {
    ok: true,
    requestId:
      request?.type === "write" || request?.type === "resize" || request?.type === "kill"
        ? request.sessionId
        : "ok",
    type: "response",
    ...payload,
  } as TerminalHostResponse;
}

function updateSessionLiveTitle(session: ManagedSession, chunk: string): boolean {
  const { carryover, title } = parseTerminalTitleFromOutputChunk(session.titleCarryover, chunk);
  session.titleCarryover = carryover;
  if (!title || title === session.liveTitle) {
    return false;
  }

  const previousTitle = session.liveTitle;
  session.liveTitle = title;
  session.titleActivity = getTitleDerivedSessionActivityFromTransition(
    previousTitle,
    title,
    session.titleActivity,
    session.snapshot.agentName,
  );
  applySessionTitleActivity(session);
  scheduleTitleActivityRefresh(session);
  void persistSessionLiveTitle(session, title);
  session.snapshot = {
    ...session.snapshot,
    title,
  };
  return true;
}

async function persistSessionLiveTitle(session: ManagedSession, title: string): Promise<void> {
  if (title === session.lastKnownPersistedTitle) {
    return;
  }

  const persistedState = await updatePersistedSessionStateFile(
    session.sessionStateFilePath,
    (currentState) => {
      if (currentState.title === title) {
        return currentState;
      }

      return {
        ...currentState,
        title,
      };
    },
  ).catch(() => undefined);

  if (!persistedState) {
    return;
  }

  session.lastKnownPersistedTitle = persistedState.title;
}

async function persistSessionPresentationState(session: ManagedSession): Promise<void> {
  const persistedState = await updatePersistedSessionStateFile(
    session.sessionStateFilePath,
    (currentState) => {
      const nextState = resolvePersistedSessionPresentationState(currentState, {
        lastKnownPersistedTitle: session.lastKnownPersistedTitle,
        liveTitle: session.liveTitle,
        snapshotAgentName: session.snapshot.agentName,
        snapshotAgentStatus: session.snapshot.agentStatus,
        titleActivityAgentName: session.titleActivity?.agentName,
        titleActivityStatus: session.titleActivity?.activity,
      });
      if (
        currentState.agentName === nextState.agentName &&
        currentState.agentStatus === nextState.agentStatus &&
        currentState.title === nextState.title
      ) {
        return currentState;
      }

      return nextState;
    },
  ).catch(() => undefined);

  if (!persistedState) {
    return;
  }

  session.lastKnownPersistedTitle = persistedState.title;
}

function scheduleTitleActivityRefresh(session: ManagedSession): void {
  clearTitleActivityTimer(session);
  if (
    session.titleActivity?.activity !== "working" ||
    session.titleActivity.lastTitleChangeAt === undefined
  ) {
    return;
  }

  const delayMs = Math.max(
    0,
    getTitleActivityWindowMs(session.titleActivity.agentName) -
      (Date.now() - session.titleActivity.lastTitleChangeAt) +
      50,
  );
  session.titleActivityTimer = setTimeout(() => {
    session.titleActivityTimer = undefined;
    const nextTitleActivity = getTitleDerivedSessionActivity(
      session.liveTitle ?? "",
      session.titleActivity,
      session.snapshot.agentName,
    );
    if (!nextTitleActivity || nextTitleActivity.activity === session.titleActivity?.activity) {
      return;
    }

    session.titleActivity = nextTitleActivity;
    applySessionTitleActivity(session);
    broadcastControlSessionState(session.snapshot);
  }, delayMs);
}

function clearTitleActivityTimer(session: ManagedSession): void {
  if (!session.titleActivityTimer) {
    return;
  }

  clearTimeout(session.titleActivityTimer);
  session.titleActivityTimer = undefined;
}

function applySessionTitleActivity(session: ManagedSession): void {
  if (!session.titleActivity) {
    return;
  }

  session.snapshot = {
    ...session.snapshot,
    agentName: session.titleActivity.agentName,
    agentStatus: session.titleActivity.activity,
    title: session.liveTitle ?? session.lastKnownPersistedTitle,
  };
  void persistSessionPresentationState(session);
}

function scheduleDaemonLifecycleCheckIfNeeded(): void {
  pruneStaleOwnerClients();
  if (getConnectedClientCount() > 0) {
    return;
  }

  const remainingLeaseDelayMs = getRemainingLeaseDelayMs();
  if (remainingLeaseDelayMs === Infinity) {
    return;
  }

  clearLifecycleTimer();
  if (remainingLeaseDelayMs !== undefined) {
    lifecycleTimer = setTimeout(() => {
      void expireLeasedSessionsAndMaybeShutdown();
    }, remainingLeaseDelayMs);
    return;
  }

  if (idleShutdownTimeoutMs === null || idleShutdownTimeoutMs <= 0) {
    return;
  }
  lifecycleTimer = setTimeout(() => {
    void shutdown("idle-timeout");
  }, idleShutdownTimeoutMs);
}

function clearLifecycleTimer(): void {
  if (lifecycleTimer) {
    clearTimeout(lifecycleTimer);
    lifecycleTimer = undefined;
  }
}

function scheduleOwnerAdoptionTimeout(): void {
  clearOwnerAdoptionTimer();
  ownerAdoptionTimer = setTimeout(() => {
    void shutdownIfUnownedAtStartup();
  }, DAEMON_OWNER_STARTUP_GRACE_MS);
}

function clearOwnerAdoptionTimer(): void {
  if (!ownerAdoptionTimer) {
    return;
  }

  clearTimeout(ownerAdoptionTimer);
  ownerAdoptionTimer = undefined;
}

function pruneStaleOwnerClients(): void {
  const now = Date.now();
  for (const client of [...controlClients]) {
    if (!client.lastHeartbeatAt || !client.ownerId) {
      continue;
    }

    if (now - client.lastHeartbeatAt <= DAEMON_OWNER_HEARTBEAT_TIMEOUT_MS) {
      continue;
    }

    void logDaemonDebug("daemon.ownerHeartbeatExpired", {
      ownerId: client.ownerId,
      ownerPid: client.ownerPid,
      pid: process.pid,
    });
    try {
      client.socket.close();
    } catch {
      controlClients.delete(client);
    }
  }
}

async function shutdownIfUnownedAtStartup(): Promise<void> {
  clearOwnerAdoptionTimer();
  pruneStaleOwnerClients();
  if (sessions.size > 0 || getConnectedClientCount() > 0) {
    return;
  }

  await shutdown("owner-startup-timeout");
}

function getConnectedClientCount(): number {
  return (
    controlClients.size + sessionSocketsBySessionKey.size + pendingSessionAttachmentSockets.size
  );
}

async function shutdown(reason = "unknown"): Promise<void> {
  clearLifecycleTimer();
  clearOwnerAdoptionTimer();
  void logDaemonDebug("daemon.shutdown", {
    pid: process.pid,
    reason,
    sessionCount: sessions.size,
  });
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

function getRemainingLeaseDelayMs(): number | undefined {
  let earliestLeaseExpiryAt: number | undefined;

  for (const session of sessions.values()) {
    if (session.leaseExpiresAt === undefined) {
      continue;
    }
    if (session.leaseExpiresAt === null) {
      return Infinity;
    }
    earliestLeaseExpiryAt =
      earliestLeaseExpiryAt === undefined
        ? session.leaseExpiresAt
        : Math.min(earliestLeaseExpiryAt, session.leaseExpiresAt);
  }

  if (earliestLeaseExpiryAt === undefined) {
    return undefined;
  }

  return Math.max(0, earliestLeaseExpiryAt - Date.now());
}

async function expireLeasedSessionsAndMaybeShutdown(): Promise<void> {
  clearLifecycleTimer();
  if (getConnectedClientCount() > 0) {
    return;
  }

  const now = Date.now();
  for (const [sessionKey, session] of sessions) {
    if (
      session.leaseExpiresAt !== undefined &&
      session.leaseExpiresAt !== null &&
      session.leaseExpiresAt <= now
    ) {
      void logDaemonDebug("daemon.sessionLeaseExpired", {
        sessionId: session.sessionId,
        sessionKey,
        workspaceId: session.workspaceId,
      });
      try {
        session.pty.kill();
      } catch {
        // Ignore process shutdown races when expiring leased sessions.
      }
      sessions.delete(sessionKey);
    }
  }

  const remainingLeaseDelayMs = getRemainingLeaseDelayMs();
  if (remainingLeaseDelayMs === Infinity) {
    return;
  }
  if (remainingLeaseDelayMs !== undefined) {
    lifecycleTimer = setTimeout(() => {
      void expireLeasedSessionsAndMaybeShutdown();
    }, remainingLeaseDelayMs);
    return;
  }

  if (sessions.size === 0) {
    await shutdown("lease-expired");
    return;
  }

  if (idleShutdownTimeoutMs === null || idleShutdownTimeoutMs <= 0) {
    return;
  }
  lifecycleTimer = setTimeout(() => {
    void shutdown("idle-timeout");
  }, idleShutdownTimeoutMs);
}

async function logDaemonDebug(event: string, details?: unknown): Promise<void> {
  const line = `${new Date().toISOString()} ${event}${details ? ` ${safeSerialize(details)}` : ""}\n`;
  try {
    await mkdir(stateDir, { recursive: true });
    await appendFile(daemonDebugLogFilePath, line, "utf8");
  } catch {
    // Logging must never break the daemon.
  }
}

function safeSerialize(details: unknown): string {
  try {
    return JSON.stringify(details);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
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

async function findReachableExistingDaemonInfo(): Promise<DaemonInfo | undefined> {
  try {
    const rawInfo = await readFile(infoFilePath, "utf8");
    const existingInfo = JSON.parse(rawInfo) as DaemonInfo;
    if (
      !existingInfo ||
      existingInfo.pid === process.pid ||
      existingInfo.protocolVersion !== TERMINAL_HOST_PROTOCOL_VERSION
    ) {
      return undefined;
    }

    if (await canReachDaemon(existingInfo)) {
      return existingInfo;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function canReachDaemon(daemon: DaemonInfo): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${String(daemon.port)}/control?token=${encodeURIComponent(daemon.token)}`,
    );

    const timeout = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // Ignore socket close failures during daemon reachability checks.
      }
      resolve(false);
    }, 1_500);

    socket.once("open", () => {
      clearTimeout(timeout);
      socket.close();
      resolve(true);
    });

    socket.once("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });

    socket.once("close", () => {
      clearTimeout(timeout);
    });
  });
}

function randomToken(): string {
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function normalizePtyOutputChunk(data: string | Buffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
}

function createPtyEnvironment(
  workspaceId: string,
  sessionId: string,
  sessionStateFilePath: string,
): Record<string, string> {
  const environment = {
    ...process.env,
    ...createManagedTerminalEnvironment(workspaceId, sessionId, sessionStateFilePath),
  } as Record<string, string>;

  if (!environment.LANG || !environment.LANG.includes("UTF-8")) {
    environment.LANG = "en_US.UTF-8";
  }

  return environment;
}

async function writeJsonAtomically(filePath: string, value: DaemonInfo): Promise<void> {
  const tempFilePath = `${filePath}.tmp.${process.pid}`;
  await writeFile(tempFilePath, JSON.stringify(value, undefined, 2), "utf8");
  await rename(tempFilePath, filePath);
}

async function attachSessionSocketWithReplay(
  session: ManagedSession,
  sessionKey: string,
  socket: WebSocket,
  initialCols: number | undefined,
  initialRows: number | undefined,
): Promise<void> {
  const attachment: PendingSessionAttachment = {
    activated: false,
    id: ++nextPendingSessionAttachmentId,
    initialCols,
    initialRows,
  };
  pendingSessionAttachmentSockets.add(socket);
  void logDaemonDebug("daemon.sessionAttachmentStarted", {
    attachmentId: attachment.id,
    initialCols,
    initialRows,
    sessionId: session.sessionId,
    sessionKey,
    sessionStatus: session.snapshot.status,
    workspaceId: session.workspaceId,
  });

  attachment.readyTimeout = setTimeout(() => {
    if (!attachment.activated && socket.readyState === WebSocket.OPEN) {
      void logDaemonDebug("daemon.sessionAttachmentReadyTimeout", {
        attachmentId: attachment.id,
        initialCols: attachment.initialCols,
        initialRows: attachment.initialRows,
        sessionId: session.sessionId,
        sessionKey,
        workspaceId: session.workspaceId,
      });
      socket.close();
    }
  }, SESSION_ATTACH_READY_TIMEOUT_MS);

  bindSessionSocket(session, sessionKey, socket, attachment);
}

function flushPendingAttachQueue(socket: WebSocket, pendingAttachQueue: PendingAttachQueue): void {
  let flushedCount = 0;
  for (const chunk of pendingAttachQueue.chunks) {
    if (socket.readyState !== WebSocket.OPEN) {
      break;
    }
    socket.send(chunk);
    flushedCount += 1;
  }

  if (flushedCount > 0) {
    pendingAttachQueue.chunks.splice(0, flushedCount);
  }
}

function sendReplayChunks(socket: WebSocket, replayChunks: Buffer[]): void {
  for (const replayChunk of replayChunks) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(replayChunk);
  }
}

function bindSessionSocket(
  session: ManagedSession,
  sessionKey: string,
  socket: WebSocket,
  attachment: PendingSessionAttachment,
): void {
  socket.on("message", (buffer: Buffer) => {
    void handleSessionSocketMessage(session, sessionKey, socket, attachment, buffer.toString());
  });
  socket.on("close", (code: number, reasonBuffer: Buffer) => {
    const reason = reasonBuffer.toString("utf8");
    handleSessionSocketEnd(session, sessionKey, socket, attachment, {
      code,
      event: "close",
      reason,
    });
  });
  socket.on("error", (error) => {
    handleSessionSocketEnd(session, sessionKey, socket, attachment, {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : {
              message: String(error),
            },
      event: "error",
    });
  });
}

async function activatePendingSessionAttachment(
  session: ManagedSession,
  sessionKey: string,
  socket: WebSocket,
  attachment: PendingSessionAttachment,
): Promise<void> {
  if (attachment.activated || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  attachment.activated = true;
  clearPendingSessionAttachmentTimeout(attachment);
  void logDaemonDebug("daemon.sessionAttachmentActivated", {
    attachmentId: attachment.id,
    initialCols: attachment.initialCols,
    initialRows: attachment.initialRows,
    sessionId: session.sessionId,
    sessionKey,
    workspaceId: session.workspaceId,
  });

  if (attachment.initialCols && attachment.initialRows) {
    resizeSession(session, attachment.initialCols, attachment.initialRows);
  }

  const pendingAttachQueue = createPendingAttachQueue(session.historyBuffer.bytesWritten);
  attachment.pendingAttachQueue = pendingAttachQueue;
  session.pendingAttachQueues.push(pendingAttachQueue);

  const previousSocket = sessionSocketsBySessionKey.get(sessionKey);
  if (previousSocket && previousSocket !== socket) {
    void logDaemonDebug("daemon.sessionAttachmentPreemptedPreviousSocket", {
      attachmentId: attachment.id,
      sessionId: session.sessionId,
      sessionKey,
      workspaceId: session.workspaceId,
    });
    sessionSocketsBySessionKey.delete(sessionKey);
    previousSocket.close();
  }

  const replayChunks = createTerminalReplayChunks(
    session.historyBuffer,
    pendingAttachQueue.replayCursor,
    REPLAY_CHUNK_BYTES,
  );
  if (replayChunks.length > 0) {
    sendReplayChunks(socket, replayChunks);
  }
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  flushPendingAttachQueue(socket, pendingAttachQueue);
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  pendingSessionAttachmentSockets.delete(socket);
  removePendingAttachQueue(session, pendingAttachQueue);
  attachment.pendingAttachQueue = undefined;
  sessionSocketsBySessionKey.set(sessionKey, socket);
  void logDaemonDebug("daemon.sessionAttachmentCompleted", {
    attachmentId: attachment.id,
    replayChunkCount: replayChunks.length,
    sessionId: session.sessionId,
    sessionKey,
    workspaceId: session.workspaceId,
  });

  const snapshot = await buildSnapshot(session, false);
  broadcastControlSessionState(snapshot);
}

function handleSessionSocketEnd(
  session: ManagedSession,
  sessionKey: string,
  socket: WebSocket,
  attachment: PendingSessionAttachment,
  details:
    | {
        code: number;
        event: "close";
        reason: string;
      }
    | {
        error: { message: string; name?: string };
        event: "error";
      },
): void {
  clearPendingSessionAttachmentTimeout(attachment);
  pendingSessionAttachmentSockets.delete(socket);
  if (attachment.pendingAttachQueue) {
    removePendingAttachQueue(session, attachment.pendingAttachQueue);
    attachment.pendingAttachQueue = undefined;
  }
  if (attachment.activated) {
    if (sessionSocketsBySessionKey.get(sessionKey) === socket) {
      sessionSocketsBySessionKey.delete(sessionKey);
    }
    void buildSnapshot(session, false).then((snapshot) => {
      broadcastControlSessionState(snapshot);
    });
  }
  void logDaemonDebug("daemon.sessionSocketEnded", {
    activated: attachment.activated,
    attachmentId: attachment.id,
    hadPendingAttachQueue: attachment.pendingAttachQueue !== undefined,
    sessionId: session.sessionId,
    sessionKey,
    socketWasRegistered: sessionSocketsBySessionKey.get(sessionKey) === socket,
    workspaceId: session.workspaceId,
    ...details,
  });
  scheduleDaemonLifecycleCheckIfNeeded();
}

function clearPendingSessionAttachmentTimeout(attachment: PendingSessionAttachment): void {
  if (!attachment.readyTimeout) {
    return;
  }

  clearTimeout(attachment.readyTimeout);
  attachment.readyTimeout = undefined;
}

function removePendingAttachQueue(
  session: ManagedSession,
  pendingAttachQueue: PendingAttachQueue,
): void {
  const queueIndex = session.pendingAttachQueues.indexOf(pendingAttachQueue);
  if (queueIndex >= 0) {
    session.pendingAttachQueues.splice(queueIndex, 1);
  }
}
