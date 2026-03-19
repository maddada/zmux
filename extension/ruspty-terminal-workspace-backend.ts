import * as path from "node:path";
import * as vscode from "vscode";
import type { SessionGridSnapshot, SessionRecord } from "../shared/session-grid-contract";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";
import { TerminalHostClient } from "./terminal-host-client";
import type {
  TerminalWorkspaceBackend,
  TerminalWorkspaceBackendTitleChange,
} from "./terminal-workspace-backend";
import {
  DEFAULT_TERMINAL_COLS,
  DEFAULT_TERMINAL_ROWS,
  applyEditorLayout,
  createDisconnectedSessionSnapshot,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  matchesVisibleTerminalLayout,
  getSessionTabTitle,
  getViewColumn,
} from "./terminal-workspace-helpers";

const SETTINGS_SECTION = "VS-AGENT-MUX";
const BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING = "backgroundSessionTimeoutMinutes";
const MINUTE_IN_MS = 60_000;

type SessionProjection = {
  bridge: SessionTerminalBridge;
  terminal: vscode.Terminal;
};

type RusptyTerminalWorkspaceBackendOptions = {
  context: vscode.ExtensionContext;
  ensureShellSpawnAllowed: () => Promise<boolean>;
  workspaceId: string;
};

export class RusptyTerminalWorkspaceBackend implements TerminalWorkspaceBackend {
  private readonly activateSessionEmitter = new vscode.EventEmitter<string>();
  private readonly changeSessionsEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionTitleEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendTitleChange>();
  private readonly client: TerminalHostClient;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly projections = new Map<string, SessionProjection>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();
  private readonly terminalToSessionId = new Map<vscode.Terminal, string>();

  public readonly onDidActivateSession = this.activateSessionEmitter.event;
  public readonly onDidChangeSessions = this.changeSessionsEmitter.event;
  public readonly onDidChangeSessionTitle = this.changeSessionTitleEmitter.event;

  public constructor(private readonly options: RusptyTerminalWorkspaceBackendOptions) {
    this.client = new TerminalHostClient({
      daemonScriptPath: path.join(
        options.context.extensionUri.fsPath,
        "out",
        "extension",
        "terminal-host-daemon.js",
      ),
      storagePath: options.context.globalStorageUri.fsPath,
    });

    this.client.on("sessionOutput", (event) => {
      const previousSession = this.sessions.get(event.sessionId);
      const nextSession = previousSession
        ? {
            ...previousSession,
            history: `${previousSession.history ?? ""}${event.data}`.slice(-200_000),
          }
        : createDisconnectedSessionSnapshot(event.sessionId, this.options.workspaceId);

      this.sessions.set(event.sessionId, nextSession);
      this.projections.get(event.sessionId)?.bridge.write(event.data);
      this.changeSessionsEmitter.fire();
    });

    this.client.on("sessionState", (event) => {
      if (event.session.workspaceId !== this.options.workspaceId) {
        return;
      }

      this.sessions.set(event.session.sessionId, event.session);
      this.changeSessionsEmitter.fire();
    });

    this.disposables.push(
      { dispose: () => void this.client.dispose() },
      vscode.window.onDidChangeActiveTerminal((terminal) => {
        const sessionId = terminal ? this.terminalToSessionId.get(terminal) : undefined;
        if (sessionId) {
          this.activateSessionEmitter.fire(sessionId);
        }
      }),
      vscode.window.onDidCloseTerminal((terminal) => {
        const sessionId = this.terminalToSessionId.get(terminal);
        if (!sessionId) {
          return;
        }

        this.terminalToSessionId.delete(terminal);
        const projection = this.projections.get(sessionId);
        if (projection?.terminal === terminal) {
          projection.bridge.dispose();
          this.projections.delete(sessionId);
        }

        this.changeSessionsEmitter.fire();
      }),
    );
  }

  public async initialize(): Promise<void> {
    await this.syncConfiguration();

    try {
      await this.client.ensureConnected();
    } catch {
      return;
    }

    for (const session of await this.client.listSessions()) {
      if (session.workspaceId === this.options.workspaceId) {
        this.sessions.set(session.sessionId, session);
      }
    }
  }

  public getLastTerminalActivityAt(): number | undefined {
    return undefined;
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    this.disposeAllProjections();
    this.activateSessionEmitter.dispose();
    this.changeSessionsEmitter.dispose();
    this.changeSessionTitleEmitter.dispose();
  }

  public async acknowledgeAttention(sessionId: string): Promise<boolean> {
    const sessionSnapshot = this.sessions.get(sessionId);
    if (!sessionSnapshot || sessionSnapshot.agentStatus !== "attention") {
      return false;
    }

    this.sessions.set(sessionId, {
      ...sessionSnapshot,
      agentStatus: "idle",
    });

    try {
      await this.client.acknowledgeAttention(sessionId);
    } catch {
      // local optimistic update is sufficient if the daemon is unavailable
    }

    this.changeSessionsEmitter.fire();
    return true;
  }

  public async createOrAttachSession(
    sessionRecord: SessionRecord,
  ): Promise<TerminalSessionSnapshot> {
    if (!(await this.options.ensureShellSpawnAllowed())) {
      const blockedSession = createBlockedSessionSnapshot(
        sessionRecord.sessionId,
        this.options.workspaceId,
      );
      this.sessions.set(sessionRecord.sessionId, blockedSession);
      this.changeSessionsEmitter.fire();
      return blockedSession;
    }

    try {
      await this.client.ensureConnected();
      const session = await this.client.createOrAttach({
        cols: DEFAULT_TERMINAL_COLS,
        cwd: getDefaultWorkspaceCwd(),
        rows: DEFAULT_TERMINAL_ROWS,
        sessionId: sessionRecord.sessionId,
        shell: getDefaultShell(),
        workspaceId: this.options.workspaceId,
      });
      this.sessions.set(sessionRecord.sessionId, session);
      this.changeSessionsEmitter.fire();
      return session;
    } catch (error) {
      const erroredSession = {
        ...createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId),
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt: new Date().toISOString(),
        status: "error" as const,
      };
      this.sessions.set(sessionRecord.sessionId, erroredSession);
      this.changeSessionsEmitter.fire();
      return erroredSession;
    }
  }

  public canReuseVisibleLayout(snapshot: SessionGridSnapshot): boolean {
    if (snapshot.visibleSessionIds.length !== this.projections.size) {
      return false;
    }

    const projectedSessionIds = new Set(this.projections.keys());
    if (snapshot.visibleSessionIds.some((sessionId) => !projectedSessionIds.has(sessionId))) {
      return false;
    }

    return matchesVisibleTerminalLayout(
      snapshot,
      new Map(
        Array.from(this.projections.entries(), ([sessionId, projection]) => [
          sessionId,
          projection.terminal.name,
        ]),
      ),
    );
  }

  public async focusSession(sessionId: string, preserveFocus = false): Promise<boolean> {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return false;
    }

    projection.terminal.show(preserveFocus);
    return true;
  }

  public getSessionSnapshot(sessionId: string): TerminalSessionSnapshot | undefined {
    return this.sessions.get(sessionId);
  }

  public async killSession(sessionId: string): Promise<void> {
    this.disposeProjection(sessionId);

    try {
      await this.client.kill(sessionId);
    } catch {
      // ignore stale daemon sessions
    }

    this.sessions.delete(sessionId);
    this.changeSessionsEmitter.fire();
  }

  public async reconcileVisibleTerminals(
    snapshot: SessionGridSnapshot,
    preserveFocus = false,
  ): Promise<void> {
    this.disposeAllProjections();
    if (snapshot.visibleSessionIds.length === 0) {
      return;
    }

    await applyEditorLayout(snapshot.visibleSessionIds.length, snapshot.viewMode);
    for (let index = 0; index < snapshot.visibleSessionIds.length; index += 1) {
      const sessionId = snapshot.visibleSessionIds[index];
      const sessionRecord = snapshot.sessions.find((session) => session.sessionId === sessionId);
      if (!sessionRecord) {
        continue;
      }

      const sessionSnapshot = await this.ensureSessionShell(sessionRecord);
      const terminalTabTitle = getSessionTabTitle(sessionRecord);
      const bridge = new SessionTerminalBridge({
        history: sessionSnapshot.history ?? "",
        name: terminalTabTitle,
        onClose: () => {
          this.projections.delete(sessionId);
        },
        onInput: async (data) => {
          const liveSession = this.sessions.get(sessionId);
          if (!liveSession || liveSession.status !== "running" || data.length === 0) {
            return;
          }

          await this.client.write(sessionId, data);
        },
        onResize: async (cols, rows) => {
          const liveSession = this.sessions.get(sessionId);
          if (!liveSession || liveSession.status !== "running") {
            return;
          }

          if (liveSession.cols === cols && liveSession.rows === rows) {
            return;
          }

          const resizedSession = {
            ...liveSession,
            cols,
            rows,
          };

          this.sessions.set(sessionId, resizedSession);

          try {
            await this.client.resize(sessionId, cols, rows);
          } catch (error) {
            this.sessions.set(sessionId, liveSession);
            throw error;
          }
        },
        onTitleChange: (title) => {
          this.changeSessionTitleEmitter.fire({ sessionId, title });
        },
      });

      const terminal = vscode.window.createTerminal({
        iconPath: new vscode.ThemeIcon("terminal"),
        isTransient: true,
        location: {
          preserveFocus: true,
          viewColumn: getViewColumn(index),
        },
        name: terminalTabTitle,
        pty: bridge,
      });

      this.projections.set(sessionId, { bridge, terminal });
      this.terminalToSessionId.set(terminal, sessionId);
      terminal.show(true);
    }

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      this.projections.get(focusedSessionId)?.terminal.show(preserveFocus);
    }
  }

  public async renameSession(sessionRecord: SessionRecord): Promise<void> {
    this.projections
      .get(sessionRecord.sessionId)
      ?.bridge.setName(getSessionTabTitle(sessionRecord));
  }

  public async restartSession(sessionRecord: SessionRecord): Promise<TerminalSessionSnapshot> {
    try {
      await this.client.kill(sessionRecord.sessionId);
    } catch {
      // ignore stale daemon sessions and recreate below
    }

    this.sessions.delete(sessionRecord.sessionId);
    this.disposeProjection(sessionRecord.sessionId);
    return this.createOrAttachSession(sessionRecord);
  }

  public async syncConfiguration(): Promise<void> {
    try {
      await this.client.ensureConnected();
      await this.client.configure({
        idleShutdownTimeoutMs: getBackgroundSessionTimeoutMs(),
      });
    } catch {
      // leave daemon state untouched if it cannot be reached
    }
  }

  public async writeText(sessionId: string, data: string): Promise<void> {
    const sessionSnapshot = this.sessions.get(sessionId);
    if (!sessionSnapshot || sessionSnapshot.status !== "running" || data.length === 0) {
      return;
    }

    try {
      await this.client.write(sessionId, data);
    } catch {
      // ignore disconnects; caller already applied the local state change
    }
  }

  private disposeAllProjections(): void {
    for (const sessionId of Array.from(this.projections.keys())) {
      this.disposeProjection(sessionId);
    }
  }

  private disposeProjection(sessionId: string): void {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return;
    }

    this.terminalToSessionId.delete(projection.terminal);
    projection.bridge.dispose();
    projection.terminal.dispose();
    this.projections.delete(sessionId);
  }

  private async ensureSessionShell(sessionRecord: SessionRecord): Promise<TerminalSessionSnapshot> {
    const existingSession = this.sessions.get(sessionRecord.sessionId);
    if (
      existingSession &&
      existingSession.status !== "disconnected" &&
      existingSession.status !== "error"
    ) {
      return existingSession;
    }

    return this.createOrAttachSession(sessionRecord);
  }
}

type SessionTerminalBridgeOptions = {
  history: string;
  name: string;
  onClose: () => void;
  onInput: (data: string) => Promise<void>;
  onResize: (cols: number, rows: number) => Promise<void>;
  onTitleChange: (title: string) => void;
};

class SessionTerminalBridge implements vscode.Disposable, vscode.Pseudoterminal {
  private readonly closeEmitter = new vscode.EventEmitter<number | void>();
  private readonly nameEmitter = new vscode.EventEmitter<string>();
  private readonly writeEmitter = new vscode.EventEmitter<string>();
  private hasReplayedHistory = false;
  private isOpen = false;
  private pendingOutput = "";
  private stableName: string;

  public readonly onDidChangeName = this.nameEmitter.event;
  public readonly onDidClose = this.closeEmitter.event;
  public readonly onDidWrite = this.writeEmitter.event;

  public constructor(private readonly options: SessionTerminalBridgeOptions) {
    this.stableName = options.name;
  }

  public close(): void {
    this.options.onClose();
    this.closeEmitter.fire();
  }

  public dispose(): void {
    this.closeEmitter.dispose();
    this.nameEmitter.dispose();
    this.writeEmitter.dispose();
  }

  public setName(name: string): void {
    if (this.stableName === name) {
      return;
    }

    this.stableName = name;
    this.nameEmitter.fire(name);
  }

  public handleInput(data: string): void {
    void this.options.onInput(data);
  }

  public open(): void {
    this.isOpen = true;
    if (!this.hasReplayedHistory && this.options.history.length > 0) {
      this.hasReplayedHistory = true;
      const replayOutput = this.consumeOutput(this.options.history);
      if (replayOutput.length > 0) {
        this.writeEmitter.fire(replayOutput);
      }
    }
  }

  public setDimensions(dimensions: vscode.TerminalDimensions | undefined): void {
    if (dimensions) {
      void this.options.onResize(dimensions.columns, dimensions.rows);
    }
  }

  public write(data: string): void {
    if (!this.isOpen || data.length === 0) {
      return;
    }

    const output = this.consumeOutput(data);
    if (output.length > 0) {
      this.writeEmitter.fire(output);
    }
  }

  private consumeOutput(data: string): string {
    const parsedChunk = parseTerminalOutputChunk(`${this.pendingOutput}${data}`);
    this.pendingOutput = parsedChunk.pending;

    for (const title of parsedChunk.titles) {
      this.options.onTitleChange(title);
    }

    return parsedChunk.output;
  }
}

type ParsedTerminalOutputChunk = {
  output: string;
  pending: string;
  titles: string[];
};

function parseTerminalOutputChunk(data: string): ParsedTerminalOutputChunk {
  let index = 0;
  let output = "";
  const titles: string[] = [];

  while (index < data.length) {
    if (data[index] !== "\u001b" || data[index + 1] !== "]") {
      output += data[index];
      index += 1;
      continue;
    }

    const controlStart = index;
    const terminator = findOscTerminator(data, controlStart + 2);
    if (!terminator) {
      return {
        output,
        pending: data.slice(controlStart),
        titles,
      };
    }

    const controlBody = data.slice(controlStart + 2, terminator.contentEnd);
    const sequence = data.slice(controlStart, terminator.sequenceEnd);
    const separatorIndex = controlBody.indexOf(";");
    const command = separatorIndex >= 0 ? controlBody.slice(0, separatorIndex) : controlBody;
    const title = separatorIndex >= 0 ? controlBody.slice(separatorIndex + 1).trim() : "";

    if ((command === "0" || command === "2") && title.length > 0) {
      titles.push(title);
    } else {
      output += sequence;
    }

    index = terminator.sequenceEnd;
  }

  return {
    output,
    pending: "",
    titles,
  };
}

function findOscTerminator(
  data: string,
  startIndex: number,
): { contentEnd: number; sequenceEnd: number } | undefined {
  for (let index = startIndex; index < data.length; index += 1) {
    const currentCharacter = data[index];
    if (currentCharacter === "\u0007") {
      return {
        contentEnd: index,
        sequenceEnd: index + 1,
      };
    }

    if (currentCharacter === "\u001b" && data[index + 1] === "\\") {
      return {
        contentEnd: index,
        sequenceEnd: index + 2,
      };
    }
  }

  return undefined;
}

function createBlockedSessionSnapshot(
  sessionId: string,
  workspaceId: string,
): TerminalSessionSnapshot {
  return {
    ...createDisconnectedSessionSnapshot(sessionId, workspaceId),
    errorMessage: "Shell creation blocked in an untrusted workspace.",
    status: "error",
  };
}

function getBackgroundSessionTimeoutMs(): number | null {
  const configuredMinutes = vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<number>(BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING, 0);

  if (!Number.isFinite(configuredMinutes) || configuredMinutes <= 0) {
    return null;
  }

  return Math.floor(configuredMinutes * MINUTE_IN_MS);
}
