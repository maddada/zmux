import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import WebSocket from "ws";

const LIVE_SERVER_PORT = 41737;
const LIVE_WORKSPACE_ID = "storybook-live";
const tmpRoot = path.join(process.cwd(), ".tmp", "storybook-live");
const daemonStateDir = path.join(tmpRoot, "daemon");
const sessionStateDir = path.join(tmpRoot, "session-state");
const infoFilePath = path.join(daemonStateDir, "daemon-info.json");

const liveSessions = [
  {
    alias: "Claude",
    command: "claude",
    displayId: "00",
    sessionId: "live-claude",
    title: "Claude",
  },
  {
    alias: "Gemini",
    command: "gemini",
    displayId: "01",
    sessionId: "live-gemini",
    title: "Gemini",
  },
  {
    alias: "Codex",
    command: "codex",
    displayId: "02",
    sessionId: "live-codex",
    title: "Codex",
  },
  {
    alias: "OpenCode",
    command: "opencode",
    displayId: "03",
    sessionId: "live-opencode",
    title: "OpenCode",
  },
];

let daemonInfo;
let daemonProcess;
let controlSocket;
let httpServer;
let requestNumber = 0;
let didPrimeSessions = false;
const pendingRequests = new Map();

await rm(tmpRoot, { force: true, recursive: true });
await mkdir(daemonStateDir, { recursive: true });
await mkdir(sessionStateDir, { recursive: true });

try {
  daemonProcess = spawn(
    process.execPath,
    [
      path.join(process.cwd(), "out", "extension", "terminal-daemon-process.js"),
      "--state-dir",
      daemonStateDir,
    ],
    {
      stdio: "ignore",
    },
  );

  daemonInfo = await waitForDaemonInfo();
  controlSocket = await openControlSocket(daemonInfo);
  await configureDaemon();
  await startLiveServer();
  await primeLiveSessions();

  await waitForExit();
} finally {
  await cleanup();
}

async function waitForDaemonInfo() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const rawInfo = await readFile(infoFilePath, "utf8");
      return JSON.parse(rawInfo);
    } catch {
      await delay(150);
    }
  }

  throw new Error("Timed out waiting for terminal daemon info.");
}

function openControlSocket(info) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${String(info.port)}/control?token=${encodeURIComponent(info.token)}`,
    );

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Timed out connecting to live control socket."));
    }, 5_000);

    socket.on("open", () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on("message", (buffer) => {
      handleControlMessage(buffer.toString());
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function handleControlMessage(rawMessage) {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch {
    return;
  }

  if (message.type !== "response") {
    return;
  }

  const pendingRequest = pendingRequests.get(message.requestId);
  if (!pendingRequest) {
    return;
  }

  pendingRequests.delete(message.requestId);
  if (message.ok) {
    pendingRequest.resolve(message);
  } else {
    pendingRequest.reject(new Error(message.error));
  }
}

async function configureDaemon() {
  await sendRequest({
    idleShutdownTimeoutMs: null,
    requestId: nextRequestId(),
    type: "configure",
  });
}

async function primeLiveSessions() {
  if (didPrimeSessions) {
    return;
  }

  for (const session of liveSessions) {
    await sendRequest({
      cols: 120,
      cwd: process.cwd(),
      requestId: nextRequestId(),
      rows: 34,
      sessionId: session.sessionId,
      sessionStateFilePath: path.join(sessionStateDir, `${session.sessionId}.state`),
      shell: process.env.SHELL || "/bin/zsh",
      type: "createOrAttach",
      workspaceId: LIVE_WORKSPACE_ID,
    });
    sendFireAndForget({
      data: `${session.command}\r`,
      sessionId: session.sessionId,
      type: "write",
      workspaceId: LIVE_WORKSPACE_ID,
    });
  }

  didPrimeSessions = true;
}

function sendFireAndForget(request) {
  controlSocket.send(JSON.stringify(request));
}

function sendRequest(request) {
  return new Promise((resolve, reject) => {
    pendingRequests.set(request.requestId, { reject, resolve });
    controlSocket.send(JSON.stringify(request), (error) => {
      if (!error) {
        return;
      }

      pendingRequests.delete(request.requestId);
      reject(error);
    });
  });
}

async function startLiveServer() {
  httpServer = createServer(async (request, response) => {
    addCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method !== "GET" || request.url !== "/bootstrap") {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    try {
      await primeLiveSessions();
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          connection: {
            baseUrl: `ws://127.0.0.1:${String(daemonInfo.port)}`,
            token: daemonInfo.token,
            workspaceId: LIVE_WORKSPACE_ID,
          },
          sessions: liveSessions.map(({ alias, displayId, sessionId, title }) => ({
            alias,
            displayId,
            sessionId,
            title,
          })),
        }),
      );
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(LIVE_SERVER_PORT, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
}

async function waitForExit() {
  await new Promise((resolve) => {
    const onSignal = () => resolve();
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
  });
}

async function cleanup() {
  controlSocket?.close();
  httpServer?.close();
  daemonProcess?.kill("SIGTERM");
  await delay(150);
}

function nextRequestId() {
  requestNumber += 1;
  return `storybook-live-${String(requestNumber)}`;
}

function addCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
}

async function delay(durationMs) {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
