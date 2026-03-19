"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const agent_shell_integration_1 = require("./agent-shell-integration");
const terminal_host_protocol_1 = require("../shared/terminal-host-protocol");
const ruspty_1 = require("./ruspty");
const HISTORY_FILE_NAME = "history.log";
const MAX_HISTORY_CHARS = 200_000;
const METADATA_FILE_NAME = "metadata.json";
const MIN_TERMINAL_COLS = 20;
const MIN_TERMINAL_ROWS = 8;
class TerminalHostDaemon {
    environment;
    agentShellIntegrationPromise;
    clients = new Set();
    idleShutdownTimeoutMs = null;
    idleShutdownTimer;
    isStopping = false;
    sessions = new Map();
    constructor(environment) {
        this.environment = environment;
    }
    async start() {
        await (0, promises_1.mkdir)(this.environment.stateDir, { recursive: true });
        await (0, promises_1.rm)(this.environment.portFilePath, { force: true });
        const server = net.createServer((socket) => {
            const client = {
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
        await new Promise((resolve, reject) => {
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
        await (0, promises_1.writeFile)(this.environment.portFilePath, String(address.port));
        const cleanup = () => {
            server.close();
            void (0, promises_1.rm)(this.environment.portFilePath, { force: true });
        };
        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);
        process.on("exit", cleanup);
    }
    async handleMessage(client, rawMessage) {
        let message;
        try {
            message = JSON.parse(rawMessage);
        }
        catch {
            client.socket.destroy(new Error("Invalid terminal host request"));
            return;
        }
        if (message.type === "authenticate") {
            if (message.token !== this.environment.token ||
                message.version !== terminal_host_protocol_1.TERMINAL_HOST_PROTOCOL_VERSION) {
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
                    sessions: await Promise.all([...this.sessions.values()].map((session) => this.toSnapshot(session, true))),
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
    async handleCreateOrAttach(client, request) {
        try {
            const session = await this.createOrAttachSession(request);
            this.sendToClient(client, {
                requestId: request.requestId,
                ok: true,
                session: await this.toSnapshot(session, true),
                type: "response",
            });
        }
        catch (error) {
            this.sendToClient(client, {
                error: error instanceof Error ? error.message : "Failed to create terminal session",
                ok: false,
                requestId: request.requestId,
                type: "response",
            });
        }
    }
    async createOrAttachSession(request) {
        const existingSession = this.sessions.get(request.sessionId);
        if (existingSession) {
            existingSession.snapshot.cols = clampColumns(request.cols);
            existingSession.snapshot.rows = clampRows(request.rows);
            existingSession.process?.resize(existingSession.snapshot.cols, existingSession.snapshot.rows);
            return existingSession;
        }
        const sessionDirectory = path.join(this.environment.stateDir, "terminal-history", request.workspaceId, request.sessionId);
        const historyPath = path.join(sessionDirectory, HISTORY_FILE_NAME);
        const metadataPath = path.join(sessionDirectory, METADATA_FILE_NAME);
        const cwd = await resolveCwd(request.cwd);
        await (0, promises_1.mkdir)(sessionDirectory, { recursive: true });
        const shellCandidates = await resolveShellCandidates(request.shell);
        const shellIntegration = await this.ensureAgentShellIntegration();
        const environment = createPtyEnvironment(cwd, request.sessionId, shellIntegration);
        const snapshot = {
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
        const session = {
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
            throw new Error(`Failed to spawn shell in "${snapshot.cwd}". Tried ${spawnAttempt.triedShells.join(", ")}. Last error: ${spawnAttempt.errorMessage}`);
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
    async handleExit(sessionId, exitCode) {
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
    async handleAcknowledgeAttention(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.snapshot.agentStatus !== "attention") {
            return;
        }
        session.snapshot.agentStatus = "idle";
        await this.persistMetadata(session);
        this.broadcast({ session: await this.toSnapshot(session, false), type: "sessionState" });
    }
    async handleKill(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return;
        }
        session.process?.kill();
        this.sessions.delete(sessionId);
        await (0, promises_1.rm)(path.dirname(session.historyPath), { force: true, recursive: true });
    }
    cancelIdleShutdown() {
        if (!this.idleShutdownTimer) {
            return;
        }
        clearTimeout(this.idleShutdownTimer);
        this.idleShutdownTimer = undefined;
    }
    getAuthenticatedClientCount() {
        let authenticatedClientCount = 0;
        for (const client of this.clients) {
            if (client.authenticated) {
                authenticatedClientCount += 1;
            }
        }
        return authenticatedClientCount;
    }
    scheduleIdleShutdownIfNeeded() {
        this.cancelIdleShutdown();
        if (this.isStopping || this.getAuthenticatedClientCount() > 0 || !this.idleShutdownTimeoutMs) {
            return;
        }
        this.idleShutdownTimer = setTimeout(() => {
            void this.stopAfterIdleTimeout();
        }, this.idleShutdownTimeoutMs);
    }
    async stopAfterIdleTimeout() {
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
    handleResize(sessionId, cols, rows) {
        const session = this.sessions.get(sessionId);
        if (!session?.process) {
            return;
        }
        session.snapshot.cols = clampColumns(cols);
        session.snapshot.rows = clampRows(rows);
        session.process.resize(session.snapshot.cols, session.snapshot.rows);
        void this.persistMetadata(session);
    }
    handleWrite(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (!session?.process) {
            return;
        }
        session.process.write(data);
    }
    broadcast(event) {
        for (const client of this.clients) {
            if (!client.authenticated) {
                continue;
            }
            this.sendToClient(client, event);
        }
    }
    sendToClient(client, event) {
        client.socket.write(`${JSON.stringify(event)}\n`);
    }
    async ensureAgentShellIntegration() {
        this.agentShellIntegrationPromise ??= (0, agent_shell_integration_1.ensureAgentShellIntegration)(this.environment.stateDir);
        return this.agentShellIntegrationPromise;
    }
    async handleProcessOutput(session, data) {
        const parsedChunk = (0, agent_shell_integration_1.parseAgentControlChunk)(`${session.pendingControlSequence}${data}`);
        session.pendingControlSequence = parsedChunk.pending;
        let stateChanged = false;
        for (const event of parsedChunk.events) {
            stateChanged = this.applyAgentLifecycleEvent(session, event) || stateChanged;
        }
        if (parsedChunk.output.length > 0) {
            session.snapshot.history = appendHistoryChunk(session.snapshot.history ?? "", parsedChunk.output);
            await (0, promises_1.appendFile)(session.historyPath, parsedChunk.output);
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
    applyAgentLifecycleEvent(session, event) {
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
    async persistMetadata(session) {
        await (0, promises_1.writeFile)(session.metadataPath, JSON.stringify(session.snapshot, null, 2));
    }
    async toSnapshot(session, includeHistory) {
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
async function readRecentHistory(historyPath) {
    try {
        const history = await (0, promises_1.readFile)(historyPath, "utf8");
        return history.slice(-MAX_HISTORY_CHARS);
    }
    catch {
        return "";
    }
}
function appendHistoryChunk(history, chunk) {
    return `${history}${chunk}`.slice(-MAX_HISTORY_CHARS);
}
function clampColumns(cols) {
    return Math.max(MIN_TERMINAL_COLS, Math.floor(cols));
}
function clampRows(rows) {
    return Math.max(MIN_TERMINAL_ROWS, Math.floor(rows));
}
function normalizeIdleShutdownTimeoutMs(timeoutMs) {
    if (timeoutMs === null) {
        return null;
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        return null;
    }
    return Math.floor(timeoutMs);
}
async function resolveShellCandidates(preferredShell) {
    const candidateShells = [
        preferredShell,
        safeUserShell(),
        process.env.SHELL,
        "/bin/zsh",
        "/bin/bash",
        "/bin/sh",
    ];
    const resolvedShells = [];
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
            await (0, promises_1.access)(normalizedShell, node_fs_1.constants.X_OK);
            if (!resolvedShells.includes(normalizedShell)) {
                resolvedShells.push(normalizedShell);
            }
        }
        catch {
            // try next shell candidate
        }
    }
    if (!resolvedShells.includes("/bin/sh")) {
        resolvedShells.push("/bin/sh");
    }
    return resolvedShells;
}
async function resolveCwd(cwd) {
    try {
        const cwdStats = await (0, promises_1.stat)(cwd);
        if (cwdStats.isDirectory()) {
            return cwd;
        }
    }
    catch {
        // fall through
    }
    return os.homedir();
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function normalizeShellCandidate(candidateShell) {
    const normalizedShell = candidateShell?.trim();
    if (!normalizedShell || /\s/.test(normalizedShell)) {
        return undefined;
    }
    return normalizedShell;
}
function safeUserShell() {
    try {
        return os.userInfo().shell ?? undefined;
    }
    catch {
        return undefined;
    }
}
function createPtyEnvironment(cwd, sessionId, shellIntegration) {
    const environmentEntries = Object.entries(process.env).filter((entry) => typeof entry[1] === "string");
    const environment = Object.fromEntries(environmentEntries);
    environment.HOME ||= os.homedir();
    environment.LOGNAME ||= os.userInfo().username;
    environment.PATH ||= "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
    environment.PATH = `${shellIntegration.binDir}${path.delimiter}${environment.PATH}`;
    environment.PWD = cwd;
    environment.SHELL ||= safeUserShell() ?? "/bin/sh";
    environment.TERM ||= "xterm-256color";
    environment.USER ||= os.userInfo().username;
    environment.VSMUX_SESSION_ID = sessionId;
    environment.ZDOTDIR = shellIntegration.zshDotDir;
    return environment;
}
function trySpawnTerminal(shellCandidates, snapshot, environment) {
    const triedShells = [];
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
                success: true,
            };
        }
        catch (error) {
            lastErrorMessage = getErrorMessage(error);
        }
    }
    return {
        errorMessage: lastErrorMessage,
        success: false,
        triedShells,
    };
}
function createRusptyProcess(options) {
    let exitListener;
    const terminal = new ruspty_1.Pty({
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
function getNextAgentStatus(currentStatus, event) {
    if (event.eventType === "start") {
        return "working";
    }
    if (currentStatus === "working" || currentStatus === "idle") {
        return "attention";
    }
    return currentStatus;
}
function readDaemonEnvironment() {
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
//# sourceMappingURL=terminal-host-daemon.js.map