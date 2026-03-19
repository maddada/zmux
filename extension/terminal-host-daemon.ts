import { constants } from "node:fs";
import { access, appendFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import {
  ensureAgentShellIntegration,
  parseAgentControlChunk,
  type AgentLifecycleEvent,
  type AgentShellIntegration,
} from "./agent-shell-integration";
import {
  TERMINAL_HOST_PROTOCOL_VERSION,
  type TerminalHostCreateOrAttachRequest,
  type TerminalHostEvent,
  type TerminalHostRequest,
  type TerminalAgentStatus,
  type TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { Pty } from "./ruspty";

const HISTORY_FILE_NAME = "history.log";
const MAX_HISTORY_CHARS = 200_000;
const METADATA_FILE_NAME = "metadata.json";
const MIN_TERMINAL_COLS = 20;
const MIN_TERMINAL_ROWS = 8;

type DaemonEnvironment = {
  portFilePath: string;
  stateDir: string;
  token: string;
};

type ManagedSession = {
  historyPath: string;
  metadataPath: string;
  pendingControlSequence: string;
  process?: ManagedProcess;
  snapshot: TerminalSessionSnapshot;
};

type ClientConnection = {
  authenticated: boolean;
  socket: net.Socket;
};

type ManagedProcess = {
  kill: () => void;
  onData: (listener: (data: string) => void) => void;
  onExit: (listener: (exitCode: number) => void) => void;
  resize: (cols: number, rows: number) => void;
  write: (data: string) => void;
};

type SpawnAttempt =
  | {
      backend: "ruspty";
      process: ManagedProcess;
      shell: string;
      success: true;
    }
  | {
      errorMessage: string;
      success: false;
      triedShells: string[];
    };

class TerminalHostDaemon {
  private agentShellIntegrationPromise: Promise<AgentShellIntegration> | undefined;
  private readonly clients = new Set<ClientConnection>();
  private idleShutdownTimeoutMs: number | null = null;
  private idleShutdownTimer: NodeJS.Timeout | undefined;
  private isStopping = false;
  private readonly sessions = new Map<string, ManagedSession>();

  public constructor(private readonly environment: DaemonEnvironment) {}

  public async start(): Promise<void> {
    await mkdir(this.environment.stateDir, { recursive: true });
    await rm(this.environment.portFilePath, { force: true });

    const server = net.createServer((socket) => {
      const client: ClientConnection = {
        authenticated: false,
        socket,
      };
      this.clients.add(client);

      let buffer = "";

      socket.setEncoding("utf8");

      socket.on("data", (chunk) => {
        buffer += chunk;
        const messages = buffer.split("\n");
        buffer = messages.pop() ?? "";

        for (const message of messages) {
          const trimmedMessage = message.trim();
          if (!trimmedMessage) {
            continue;
          }

          void this.handleMessage(client, trimmedMessage);
        }
      });

      socket.on("close", () => {
        this.clients.delete(client);
        this.scheduleIdleShutdownIfNeeded();
      });

      socket.on("error", () => {
        this.clients.delete(client);
        this.scheduleIdleShutdownIfNeeded();
      });
    });

    server.on("error", (error) => {
      void error;
      process.exitCode = 1;
    });

    await new Promise<void>((resolve, reject) => {
      server.once("listening", () => {
        resolve();
      });
      server.once("error", reject);
      server.listen(0, "127.0.0.1");
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Terminal host daemon failed to bind a TCP port");
    }

    await writeFile(this.environment.portFilePath, String(address.port));

    const cleanup = () => {
      server.close();
      void rm(this.environment.portFilePath, { force: true });
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
  }

  private async handleMessage(client: ClientConnection, rawMessage: string): Promise<void> {
    let message: TerminalHostRequest;

    try {
      message = JSON.parse(rawMessage) as TerminalHostRequest;
    } catch {
      client.socket.destroy(new Error("Invalid terminal host request"));
      return;
    }

    if (message.type === "authenticate") {
      if (
        message.token !== this.environment.token ||
        message.version !== TERMINAL_HOST_PROTOCOL_VERSION
      ) {
        client.socket.destroy(new Error("Terminal host authentication failed"));
        return;
      }

      client.authenticated = true;
      this.cancelIdleShutdown();
      this.sendToClient(client, { type: "authenticated" });
      return;
    }

    if (!client.authenticated) {
      client.socket.destroy(new Error("Terminal host client must authenticate first"));
      return;
    }

    switch (message.type) {
      case "configure":
        this.idleShutdownTimeoutMs = normalizeIdleShutdownTimeoutMs(message.idleShutdownTimeoutMs);
        this.scheduleIdleShutdownIfNeeded();
        this.sendToClient(client, {
          requestId: message.requestId,
          ok: true,
          type: "response",
        });
        return;

      case "createOrAttach":
        await this.handleCreateOrAttach(client, message);
        return;

      case "kill":
        await this.handleKill(message.sessionId);
        return;

      case "acknowledgeAttention":
        await this.handleAcknowledgeAttention(message.sessionId);
        return;

      case "listSessions":
        this.sendToClient(client, {
          requestId: message.requestId,
          ok: true,
          sessions: await Promise.all(
            [...this.sessions.values()].map((session) => this.toSnapshot(session, true)),
          ),
          type: "response",
        });
        return;

      case "resize":
        this.handleResize(message.sessionId, message.cols, message.rows);
        return;

      case "write":
        this.handleWrite(message.sessionId, message.data);
        return;
    }
  }

  private async handleCreateOrAttach(
    client: ClientConnection,
    request: TerminalHostCreateOrAttachRequest,
  ): Promise<void> {
    try {
      const session = await this.createOrAttachSession(request);
      this.sendToClient(client, {
        requestId: request.requestId,
        ok: true,
        session: await this.toSnapshot(session, true),
        type: "response",
      });
    } catch (error) {
      this.sendToClient(client, {
        error: error instanceof Error ? error.message : "Failed to create terminal session",
        ok: false,
        requestId: request.requestId,
        type: "response",
      });
    }
  }

  private async createOrAttachSession(
    request: TerminalHostCreateOrAttachRequest,
  ): Promise<ManagedSession> {
    const existingSession = this.sessions.get(request.sessionId);
    if (existingSession) {
      existingSession.snapshot.cols = clampColumns(request.cols);
      existingSession.snapshot.rows = clampRows(request.rows);
      existingSession.process?.resize(existingSession.snapshot.cols, existingSession.snapshot.rows);
      return existingSession;
    }

    const sessionDirectory = path.join(
      this.environment.stateDir,
      "terminal-history",
      request.workspaceId,
      request.sessionId,
    );
    const historyPath = path.join(sessionDirectory, HISTORY_FILE_NAME);
    const metadataPath = path.join(sessionDirectory, METADATA_FILE_NAME);
    const cwd = await resolveCwd(request.cwd);
    await mkdir(sessionDirectory, { recursive: true });
    const shellCandidates = await resolveShellCandidates(request.shell);
    const shellIntegration = await this.ensureAgentShellIntegration();
    const environment = createPtyEnvironment(cwd, request.sessionId, shellIntegration);

    const snapshot: TerminalSessionSnapshot = {
      agentName: undefined,
      agentStatus: "idle",
      cols: clampColumns(request.cols),
      cwd,
      history: "",
      restoreState: "live",
      rows: clampRows(request.rows),
      sessionId: request.sessionId,
      shell: shellCandidates[0] ?? "/bin/sh",
      startedAt: new Date().toISOString(),
      status: "starting",
      workspaceId: request.workspaceId,
    };

    const session: ManagedSession = {
      historyPath,
      metadataPath,
      pendingControlSequence: "",
      snapshot,
    };

    this.sessions.set(request.sessionId, session);
    await this.persistMetadata(session);

    const spawnAttempt = trySpawnTerminal(shellCandidates, snapshot, environment);
    if (!spawnAttempt.success) {
      this.sessions.delete(request.sessionId);
      throw new Error(
        `Failed to spawn shell in "${snapshot.cwd}". Tried ${spawnAttempt.triedShells.join(", ")}. Last error: ${spawnAttempt.errorMessage}`,
      );
    }

    const { process, shell } = spawnAttempt;
    session.snapshot.shell = shell;
    session.process = process;
    session.snapshot.status = "running";
    await this.persistMetadata(session);
    this.broadcast({ session: await this.toSnapshot(session, false), type: "sessionState" });

    process.onData((data) => {
      void this.handleProcessOutput(session, data);
    });

    process.onExit((exitCode) => {
      void this.handleExit(request.sessionId, exitCode);
    });

    return session;
  }

  private async handleExit(sessionId: string, exitCode: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.snapshot.agentStatus === "working") {
      session.snapshot.agentStatus = "idle";
    }
    session.snapshot.endedAt = new Date().toISOString();
    session.snapshot.exitCode = exitCode;
    session.snapshot.status = "exited";
    session.process = undefined;

    await this.persistMetadata(session);
    this.broadcast({ session: await this.toSnapshot(session, false), type: "sessionState" });
  }

  private async handleAcknowledgeAttention(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.snapshot.agentStatus !== "attention") {
      return;
    }

    session.snapshot.agentStatus = "idle";
    await this.persistMetadata(session);
    this.broadcast({ session: await this.toSnapshot(session, false), type: "sessionState" });
  }

  private async handleKill(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.process?.kill();
    this.sessions.delete(sessionId);
    await rm(path.dirname(session.historyPath), { force: true, recursive: true });
  }

  private cancelIdleShutdown(): void {
    if (!this.idleShutdownTimer) {
      return;
    }

    clearTimeout(this.idleShutdownTimer);
    this.idleShutdownTimer = undefined;
  }

  private getAuthenticatedClientCount(): number {
    let authenticatedClientCount = 0;

    for (const client of this.clients) {
      if (client.authenticated) {
        authenticatedClientCount += 1;
      }
    }

    return authenticatedClientCount;
  }

  private scheduleIdleShutdownIfNeeded(): void {
    this.cancelIdleShutdown();

    if (this.isStopping || this.getAuthenticatedClientCount() > 0 || !this.idleShutdownTimeoutMs) {
      return;
    }

    this.idleShutdownTimer = setTimeout(() => {
      void this.stopAfterIdleTimeout();
    }, this.idleShutdownTimeoutMs);
  }

  private async stopAfterIdleTimeout(): Promise<void> {
    if (this.isStopping || this.getAuthenticatedClientCount() > 0) {
      return;
    }

    this.isStopping = true;
    this.cancelIdleShutdown();

    for (const sessionId of this.sessions.keys()) {
      await this.handleKill(sessionId);
    }

    process.exit(0);
  }

  private handleResize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session?.process) {
      return;
    }

    session.snapshot.cols = clampColumns(cols);
    session.snapshot.rows = clampRows(rows);
    session.process.resize(session.snapshot.cols, session.snapshot.rows);
    void this.persistMetadata(session);
  }

  private handleWrite(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session?.process) {
      return;
    }

    session.process.write(data);
  }

  private broadcast(event: TerminalHostEvent): void {
    for (const client of this.clients) {
      if (!client.authenticated) {
        continue;
      }

      this.sendToClient(client, event);
    }
  }

  private sendToClient(client: ClientConnection, event: TerminalHostEvent): void {
    client.socket.write(`${JSON.stringify(event)}\n`);
  }

  private async ensureAgentShellIntegration(): Promise<AgentShellIntegration> {
    this.agentShellIntegrationPromise ??= ensureAgentShellIntegration(this.environment.stateDir);
    return this.agentShellIntegrationPromise;
  }

  private async handleProcessOutput(session: ManagedSession, data: string): Promise<void> {
    const parsedChunk = parseAgentControlChunk(`${session.pendingControlSequence}${data}`);
    session.pendingControlSequence = parsedChunk.pending;

    let stateChanged = false;
    for (const event of parsedChunk.events) {
      stateChanged = this.applyAgentLifecycleEvent(session, event) || stateChanged;
    }

    if (parsedChunk.output.length > 0) {
      session.snapshot.history = appendHistoryChunk(
        session.snapshot.history ?? "",
        parsedChunk.output,
      );
      await appendFile(session.historyPath, parsedChunk.output);
      this.broadcast({
        data: parsedChunk.output,
        sessionId: session.snapshot.sessionId,
        type: "sessionOutput",
      });
    }

    if (!stateChanged) {
      return;
    }

    await this.persistMetadata(session);
    this.broadcast({ session: await this.toSnapshot(session, false), type: "sessionState" });
  }

  private applyAgentLifecycleEvent(session: ManagedSession, event: AgentLifecycleEvent): boolean {
    const previousAgentName = session.snapshot.agentName;
    const previousAgentStatus = session.snapshot.agentStatus;
    const nextAgentName = event.agentName ?? previousAgentName;
    const nextAgentStatus = getNextAgentStatus(previousAgentStatus, event);

    if (previousAgentName === nextAgentName && previousAgentStatus === nextAgentStatus) {
      return false;
    }

    session.snapshot.agentName = nextAgentName;
    session.snapshot.agentStatus = nextAgentStatus;
    return true;
  }

  private async persistMetadata(session: ManagedSession): Promise<void> {
    await writeFile(session.metadataPath, JSON.stringify(session.snapshot, null, 2));
  }

  private async toSnapshot(
    session: ManagedSession,
    includeHistory: boolean,
  ): Promise<TerminalSessionSnapshot> {
    if (!includeHistory) {
      return { ...session.snapshot };
    }

    const history = session.snapshot.history || (await readRecentHistory(session.historyPath));

    return {
      ...session.snapshot,
      history,
    };
  }
}

async function readRecentHistory(historyPath: string): Promise<string> {
  try {
    const history = await readFile(historyPath, "utf8");
    return history.slice(-MAX_HISTORY_CHARS);
  } catch {
    return "";
  }
}

function appendHistoryChunk(history: string, chunk: string): string {
  return `${history}${chunk}`.slice(-MAX_HISTORY_CHARS);
}

function clampColumns(cols: number): number {
  return Math.max(MIN_TERMINAL_COLS, Math.floor(cols));
}

function clampRows(rows: number): number {
  return Math.max(MIN_TERMINAL_ROWS, Math.floor(rows));
}

function normalizeIdleShutdownTimeoutMs(timeoutMs: number | null): number | null {
  if (timeoutMs === null) {
    return null;
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return null;
  }

  return Math.floor(timeoutMs);
}

async function resolveShellCandidates(preferredShell: string): Promise<string[]> {
  const candidateShells = [
    preferredShell,
    safeUserShell(),
    process.env.SHELL,
    "/bin/zsh",
    "/bin/bash",
    "/bin/sh",
  ];

  const resolvedShells: string[] = [];

  for (const candidateShell of candidateShells) {
    const normalizedShell = normalizeShellCandidate(candidateShell);
    if (!normalizedShell) {
      continue;
    }

    if (!path.isAbsolute(normalizedShell)) {
      if (!resolvedShells.includes(normalizedShell)) {
        resolvedShells.push(normalizedShell);
      }
      continue;
    }

    try {
      await access(normalizedShell, constants.X_OK);
      if (!resolvedShells.includes(normalizedShell)) {
        resolvedShells.push(normalizedShell);
      }
    } catch {
      // try next shell candidate
    }
  }

  if (!resolvedShells.includes("/bin/sh")) {
    resolvedShells.push("/bin/sh");
  }

  return resolvedShells;
}

async function resolveCwd(cwd: string): Promise<string> {
  try {
    const cwdStats = await stat(cwd);
    if (cwdStats.isDirectory()) {
      return cwd;
    }
  } catch {
    // fall through
  }

  return os.homedir();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeShellCandidate(candidateShell: string | undefined): string | undefined {
  const normalizedShell = candidateShell?.trim();
  if (!normalizedShell || /\s/.test(normalizedShell)) {
    return undefined;
  }

  return normalizedShell;
}

function safeUserShell(): string | undefined {
  try {
    return os.userInfo().shell ?? undefined;
  } catch {
    return undefined;
  }
}

function createPtyEnvironment(
  cwd: string,
  sessionId: string,
  shellIntegration: AgentShellIntegration,
): Record<string, string> {
  const environmentEntries = Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  const environment = Object.fromEntries(environmentEntries);

  environment.HOME ||= os.homedir();
  environment.LOGNAME ||= os.userInfo().username;
  environment.PATH ||= "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
  environment.PATH = `${shellIntegration.binDir}${path.delimiter}${environment.PATH}`;
  environment.PWD = cwd;
  environment.SHELL ||= safeUserShell() ?? "/bin/sh";
  environment.TERM ||= "xterm-256color";
  environment.USER ||= os.userInfo().username;
  environment.VS_AGENT_MUX_SESSION_ID = sessionId;
  environment.ZDOTDIR = shellIntegration.zshDotDir;

  return environment;
}

function trySpawnTerminal(
  shellCandidates: string[],
  snapshot: TerminalSessionSnapshot,
  environment: Record<string, string>,
): SpawnAttempt {
  const triedShells: string[] = [];
  let lastErrorMessage = "Unknown PTY spawn error";

  for (const shell of shellCandidates) {
    triedShells.push(shell);

    try {
      return {
        backend: "ruspty",
        process: createRusptyProcess({
          cols: snapshot.cols,
          cwd: snapshot.cwd,
          envs: environment,
          rows: snapshot.rows,
          shell,
        }),
        shell,
        success: true as const,
      };
    } catch (error) {
      lastErrorMessage = getErrorMessage(error);
    }
  }

  return {
    errorMessage: lastErrorMessage,
    success: false as const,
    triedShells,
  };
}

function createRusptyProcess(options: {
  cols: number;
  cwd: string;
  envs: Record<string, string>;
  rows: number;
  shell: string;
}): ManagedProcess {
  let exitListener: ((exitCode: number) => void) | undefined;
  const terminal = new Pty({
    args: [],
    command: options.shell,
    dir: options.cwd,
    envs: options.envs,
    interactive: true,
    onExit: (error, exitCode) => {
      void error;
      exitListener?.(exitCode);
    },
    size: {
      cols: options.cols,
      rows: options.rows,
    },
  });

  return {
    kill: () => {
      terminal.close();
    },
    onData: (listener) => {
      terminal.read.on("data", (data) => {
        listener(String(data));
      });
    },
    onExit: (listener) => {
      exitListener = listener;
    },
    resize: (cols, rows) => {
      terminal.resize({
        cols,
        rows,
      });
    },
    write: (data) => {
      terminal.write.write(data);
    },
  };
}

function getNextAgentStatus(
  currentStatus: TerminalAgentStatus,
  event: AgentLifecycleEvent,
): TerminalAgentStatus {
  if (event.eventType === "start") {
    return "working";
  }

  if (currentStatus === "working" || currentStatus === "idle") {
    return "attention";
  }

  return currentStatus;
}

function readDaemonEnvironment(): DaemonEnvironment {
  const portFilePath = process.env.GHOSTTY_CANVAS_DAEMON_PORT_FILE;
  const stateDir = process.env.GHOSTTY_CANVAS_DAEMON_STATE_DIR;
  const token = process.env.GHOSTTY_CANVAS_DAEMON_TOKEN;

  if (!portFilePath || !stateDir || !token) {
    throw new Error("Missing terminal host daemon environment");
  }

  return {
    portFilePath,
    stateDir,
    token,
  };
}

if (require.main === module) {
  void new TerminalHostDaemon(readDaemonEnvironment()).start();
}
