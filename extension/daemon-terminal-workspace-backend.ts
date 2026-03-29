import * as path from "node:path";
import * as vscode from "vscode";
import {
  isTerminalSession,
  type SessionRecord,
  type TerminalSessionRecord,
} from "../shared/session-grid-contract";
import type {
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { DaemonTerminalRuntime, type DaemonTerminalConnection } from "./daemon-terminal-runtime";
import type {
  TerminalWorkspaceBackend,
  TerminalWorkspaceBackendTitleChange,
} from "./terminal-workspace-backend";
import {
  createBlockedSessionSnapshot,
  createDisconnectedSessionSnapshot,
  getDefaultShell,
  getDefaultWorkspaceCwd,
} from "./terminal-workspace-environment";
import { getWorkspaceStorageKey } from "./terminal-workspace-environment";

const POLL_INTERVAL_MS = 500;
const AGENT_STATE_DIR_NAME = "terminal-session-state";

export type DaemonTerminalWorkspaceBackendOptions = {
  context: vscode.ExtensionContext;
  ensureShellSpawnAllowed: () => Promise<boolean>;
  workspaceId: string;
};

export class DaemonTerminalWorkspaceBackend implements TerminalWorkspaceBackend {
  private readonly changeSessionsEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionTitleEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendTitleChange>();
  private readonly runtime: DaemonTerminalRuntime;
  private pollTimer: NodeJS.Timeout | undefined;
  private readonly sessionRecordBySessionId = new Map<string, TerminalSessionRecord>();
  private readonly sessionTitleBySessionId = new Map<string, string>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();

  public readonly onDidChangeSessionTitle = this.changeSessionTitleEmitter.event;
  public readonly onDidChangeSessions = this.changeSessionsEmitter.event;

  public constructor(private readonly options: DaemonTerminalWorkspaceBackendOptions) {
    this.runtime = new DaemonTerminalRuntime(options.context);
  }

  public async initialize(sessionRecords: readonly SessionRecord[]): Promise<void> {
    this.syncSessions(sessionRecords);
    await this.runtime.ensureReady();
    await this.runtime.configure(this.getIdleShutdownTimeoutMs());
    this.runtime.onDidChangeSessionState((snapshot) => {
      const previousSnapshot = this.sessions.get(snapshot.sessionId);
      this.sessions.set(snapshot.sessionId, snapshot);
      this.syncSessionTitle(snapshot.sessionId, snapshot.title);
      if (!haveSameTerminalSessionSnapshot(previousSnapshot, snapshot)) {
        this.changeSessionsEmitter.fire();
      }
    });
    await this.refreshSessionSnapshots();
    this.pollTimer = setInterval(() => {
      void this.refreshSessionSnapshots();
    }, POLL_INTERVAL_MS);
  }

  public dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.runtime.dispose();
    this.changeSessionsEmitter.dispose();
    this.changeSessionTitleEmitter.dispose();
  }

  public hasAttachedTerminal(sessionId: string): boolean {
    return this.hasLiveTerminal(sessionId);
  }

  public getLastTerminalActivityAt(_sessionId: string): number | undefined {
    return undefined;
  }

  public hasLiveTerminal(sessionId: string): boolean {
    const snapshot = this.sessions.get(sessionId);
    return snapshot?.status === "running" || snapshot?.status === "starting";
  }

  public async acknowledgeAttention(sessionId: string): Promise<boolean> {
    const snapshot = this.sessions.get(sessionId);
    if (!snapshot || snapshot.agentStatus !== "attention") {
      return false;
    }

    await this.runtime.acknowledgeAttention(sessionId);
    this.sessions.set(sessionId, {
      ...snapshot,
      agentStatus: "idle",
    });
    this.changeSessionsEmitter.fire();
    return true;
  }

  public async createOrAttachSession(
    sessionRecord: SessionRecord,
  ): Promise<TerminalSessionSnapshot> {
    if (!isTerminalSession(sessionRecord)) {
      return (
        this.sessions.get(sessionRecord.sessionId) ??
        createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId)
      );
    }

    if (!(await this.options.ensureShellSpawnAllowed())) {
      const blockedSnapshot = createBlockedSessionSnapshot(
        sessionRecord.sessionId,
        this.options.workspaceId,
      );
      this.sessions.set(sessionRecord.sessionId, blockedSnapshot);
      this.changeSessionsEmitter.fire();
      return blockedSnapshot;
    }

    const snapshot = await this.runtime.createOrAttach({
      cols: 120,
      cwd: getDefaultWorkspaceCwd(),
      rows: 34,
      sessionId: sessionRecord.sessionId,
      sessionStateFilePath: this.getSessionAgentStateFilePath(sessionRecord.sessionId),
      shell: getDefaultShell(),
      workspaceId: this.options.workspaceId,
    });
    this.sessions.set(sessionRecord.sessionId, snapshot);
    this.syncSessionTitle(sessionRecord.sessionId, snapshot.title);
    this.changeSessionsEmitter.fire();
    return snapshot;
  }

  public async focusSession(_sessionId: string): Promise<boolean> {
    return true;
  }

  public getSessionSnapshot(sessionId: string): TerminalSessionSnapshot | undefined {
    return this.sessions.get(sessionId);
  }

  public async killSession(sessionId: string): Promise<void> {
    await this.runtime.kill(sessionId);
    this.sessions.delete(sessionId);
    this.changeSessionsEmitter.fire();
  }

  public async renameSession(sessionRecord: SessionRecord): Promise<void> {
    void sessionRecord;
  }

  public async restartSession(sessionRecord: SessionRecord): Promise<TerminalSessionSnapshot> {
    if (!isTerminalSession(sessionRecord)) {
      return (
        this.sessions.get(sessionRecord.sessionId) ??
        createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId)
      );
    }

    await this.killSession(sessionRecord.sessionId);
    return this.createOrAttachSession(sessionRecord);
  }

  public syncSessions(sessionRecords: readonly SessionRecord[]): void {
    this.sessionRecordBySessionId.clear();
    for (const sessionRecord of sessionRecords) {
      if (!isTerminalSession(sessionRecord)) {
        continue;
      }
      this.sessionRecordBySessionId.set(sessionRecord.sessionId, sessionRecord);
    }

    for (const sessionId of [...this.sessions.keys()]) {
      if (!this.sessionRecordBySessionId.has(sessionId)) {
        this.sessions.delete(sessionId);
        this.sessionTitleBySessionId.delete(sessionId);
      }
    }
  }

  public async syncConfiguration(): Promise<void> {
    await this.runtime.configure(this.getIdleShutdownTimeoutMs());
  }

  public async writeText(sessionId: string, data: string, shouldExecute = true): Promise<void> {
    const text = shouldExecute ? `${data}\n` : data;
    await this.runtime.write(sessionId, text);
  }

  public async getConnection(): Promise<DaemonTerminalConnection> {
    return this.runtime.getConnection();
  }

  private async refreshSessionSnapshots(): Promise<void> {
    const daemonSessions = await this.runtime.listSessions();
    const nextSnapshotsBySessionId = new Map(
      daemonSessions.map((snapshot) => [snapshot.sessionId, snapshot]),
    );
    let didChange = false;

    for (const [sessionId, sessionRecord] of this.sessionRecordBySessionId) {
      const nextSnapshot =
        nextSnapshotsBySessionId.get(sessionId) ??
        this.sessions.get(sessionId) ??
        createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId);
      const previousSnapshot = this.sessions.get(sessionId);
      if (!haveSameTerminalSessionSnapshot(previousSnapshot, nextSnapshot)) {
        didChange = true;
      }
      this.sessions.set(sessionId, nextSnapshot);
      this.syncSessionTitle(sessionId, nextSnapshot.title);
    }

    if (didChange) {
      this.changeSessionsEmitter.fire();
    }
  }

  private getIdleShutdownTimeoutMs(): number | null {
    const timeoutMinutes =
      vscode.workspace.getConfiguration("VSmux").get<number>("backgroundSessionTimeoutMinutes") ?? 5;
    if (timeoutMinutes <= 0) {
      return null;
    }

    return Math.max(0, Math.round(timeoutMinutes * 60_000));
  }

  private getSessionAgentStateFilePath(sessionId: string): string {
    const workspaceStateKey = getWorkspaceStorageKey(AGENT_STATE_DIR_NAME, this.options.workspaceId);
    return path.join(
      this.options.context.globalStorageUri.fsPath,
      workspaceStateKey,
      `${sessionId}.state`,
    );
  }

  private syncSessionTitle(sessionId: string, nextTitle: string | undefined): void {
    const normalizedTitle = nextTitle?.trim() || undefined;
    const previousTitle = this.sessionTitleBySessionId.get(sessionId);
    if (previousTitle === normalizedTitle) {
      return;
    }

    if (normalizedTitle) {
      this.sessionTitleBySessionId.set(sessionId, normalizedTitle);
    } else {
      this.sessionTitleBySessionId.delete(sessionId);
    }

    this.changeSessionTitleEmitter.fire({
      sessionId,
      title: normalizedTitle,
    });
  }
}

function haveSameTerminalSessionSnapshot(
  left: TerminalSessionSnapshot | undefined,
  right: TerminalSessionSnapshot | undefined,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.agentName === right.agentName &&
    left.agentStatus === right.agentStatus &&
    left.cols === right.cols &&
    left.cwd === right.cwd &&
    left.endedAt === right.endedAt &&
    left.errorMessage === right.errorMessage &&
    left.exitCode === right.exitCode &&
    left.restoreState === right.restoreState &&
    left.rows === right.rows &&
    left.sessionId === right.sessionId &&
    left.shell === right.shell &&
    left.startedAt === right.startedAt &&
    left.status === right.status &&
    left.workspaceId === right.workspaceId
  );
}
