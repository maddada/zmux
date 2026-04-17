import * as path from "node:path";
import * as vscode from "vscode";
import {
  isTerminalSession,
  normalizeTerminalTitle,
  type SessionRecord,
  type TerminalSessionRecord,
} from "../shared/session-grid-contract";
import { getVisibleTerminalTitle } from "../shared/session-grid-contract-session";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";
import { ensureAgentShellIntegration, type AgentShellIntegration } from "./agent-shell-integration";
import { createAgentShellIntegrationEnvironmentRequest } from "./agent-shell-integration-environment";
import {
  DaemonTerminalRuntime,
  type DaemonTerminalConnection,
  type TerminalCreateOrAttachResponse,
  type TerminalDaemonState,
} from "./daemon-terminal-runtime";
import type {
  TerminalWorkspaceBackendActivityChange,
  TerminalCreateOrAttachResult,
  TerminalWorkspaceBackend,
  TerminalWorkspaceBackendPresentationChange,
  TerminalWorkspaceBackendTitleChange,
} from "./terminal-workspace-backend";
import {
  deletePersistedSessionStateFile,
  readPersistedSessionStateSnapshotFromFile,
  updatePersistedSessionStateFile,
  type PersistedSessionState,
} from "./session-state-file";
import {
  createBlockedSessionSnapshot,
  createDisconnectedSessionSnapshot,
  getDefaultShell,
  getDefaultWorkspaceCwd,
} from "./terminal-workspace-environment";
import { indexWorkspaceTerminalSnapshotsBySessionId } from "./terminal-daemon-session-scope";
import { getWorkspaceStorageKey } from "./terminal-workspace-environment";
import { logVSmuxDebug } from "./vsmux-debug-log";
import { getXtermHeadlessScrollback } from "./native-terminal-workspace/settings";

const POLL_INTERVAL_MS = 500;
const AGENT_STATE_DIR_NAME = "terminal-session-state";

export type DaemonTerminalWorkspaceBackendOptions = {
  context: vscode.ExtensionContext;
  ensureShellSpawnAllowed: () => Promise<boolean>;
  workspaceId: string;
};

export class DaemonTerminalWorkspaceBackend implements TerminalWorkspaceBackend {
  private agentShellIntegration: AgentShellIntegration | undefined;
  private readonly changeSessionsEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionActivityEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendActivityChange>();
  private readonly changeSessionPresentationEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendPresentationChange>();
  private readonly changeSessionTitleEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendTitleChange>();
  private readonly runtime: DaemonTerminalRuntime;
  private leaseRenewalTimer: NodeJS.Timeout | undefined;
  private readonly lastTerminalActivityAtBySessionId = new Map<string, number>();
  private pollTimer: NodeJS.Timeout | undefined;
  private readonly sessionRecordBySessionId = new Map<string, TerminalSessionRecord>();
  private readonly sessionTitleBySessionId = new Map<string, string>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();

  public readonly onDidChangeSessionActivity = this.changeSessionActivityEmitter.event;
  public readonly onDidChangeSessionPresentation = this.changeSessionPresentationEmitter.event;
  public readonly onDidChangeSessionTitle = this.changeSessionTitleEmitter.event;
  public readonly onDidChangeSessions = this.changeSessionsEmitter.event;

  public constructor(private readonly options: DaemonTerminalWorkspaceBackendOptions) {
    this.runtime = new DaemonTerminalRuntime(options.context, options.workspaceId);
  }

  public async initialize(sessionRecords: readonly SessionRecord[]): Promise<void> {
    this.agentShellIntegration = await ensureAgentShellIntegration(
      path.join(this.options.context.globalStorageUri.fsPath, "terminal-host-daemon"),
    );
    this.syncSessions(sessionRecords);
    await this.runtime.ensureReady();
    await this.runtime.configure(this.getIdleShutdownTimeoutMs());
    await this.syncManagedSessionLeases();
    this.restartLeaseRenewalTimer();
    this.runtime.onDidChangeSessionState((snapshot) => {
      if (snapshot.workspaceId !== this.options.workspaceId) {
        return;
      }
      const previousSnapshot = this.sessions.get(snapshot.sessionId);
      const previousTitle = this.sessionTitleBySessionId.get(snapshot.sessionId);
      this.sessions.set(snapshot.sessionId, snapshot);
      void this.refreshPersistedSessionActivity(snapshot.sessionId);
      const nextTitle = this.syncSessionTitle(snapshot.sessionId, snapshot.title);
      logVSmuxDebug("backend.daemon.sessionState", {
        agentName: snapshot.agentName,
        agentStatus: snapshot.agentStatus,
        sessionId: snapshot.sessionId,
        status: snapshot.status,
        title: nextTitle,
      });
      const presentationDiff = describeTerminalSessionPresentationDiff(
        previousSnapshot,
        previousTitle,
        snapshot,
        nextTitle,
      );
      const didChangeAgentPresentation = hasMeaningfulAgentPresentationChange(presentationDiff);
      if (!presentationDiff.isSame) {
        logVSmuxDebug("backend.daemon.sessionPresentationDiff", {
          ...presentationDiff,
          sessionId: snapshot.sessionId,
          source: "runtime",
        });
        logVSmuxDebug("backend.daemon.sessionPresentationChanged", {
          nextAgentName: snapshot.agentName,
          nextAgentStatus: snapshot.agentStatus,
          previousAgentName: previousSnapshot?.agentName,
          previousAgentStatus: previousSnapshot?.agentStatus,
          previousTitle,
          sessionId: snapshot.sessionId,
          title: nextTitle,
        });
        this.changeSessionPresentationEmitter.fire({
          sessionId: snapshot.sessionId,
          title: nextTitle,
        });
      }
      if (
        didChangeAgentPresentation ||
        !haveSameTerminalSessionSnapshot(previousSnapshot, snapshot)
      ) {
        this.changeSessionsEmitter.fire();
      }
    });
    await this.refreshSessionSnapshots();
    this.pollTimer = setInterval(() => {
      void this.refreshSessionSnapshots();
    }, POLL_INTERVAL_MS);
  }

  public dispose(): void {
    if (this.leaseRenewalTimer) {
      clearInterval(this.leaseRenewalTimer);
      this.leaseRenewalTimer = undefined;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.runtime.dispose();
    this.changeSessionsEmitter.dispose();
    this.changeSessionActivityEmitter.dispose();
    this.changeSessionPresentationEmitter.dispose();
    this.changeSessionTitleEmitter.dispose();
  }

  public hasAttachedTerminal(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.isAttached ?? false;
  }

  public getLastTerminalActivityAt(_sessionId: string): number | undefined {
    return this.lastTerminalActivityAtBySessionId.get(_sessionId);
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

    await this.runtime.acknowledgeAttention(this.options.workspaceId, sessionId);
    this.sessions.set(sessionId, {
      ...snapshot,
      agentStatus: "idle",
    });
    this.changeSessionsEmitter.fire();
    return true;
  }

  public async createOrAttachSession(
    sessionRecord: SessionRecord,
  ): Promise<TerminalCreateOrAttachResult> {
    if (!isTerminalSession(sessionRecord)) {
      return {
        didCreateTerminal: false,
        snapshot:
          this.sessions.get(sessionRecord.sessionId) ??
          createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId),
      };
    }

    if (!(await this.options.ensureShellSpawnAllowed())) {
      const blockedSnapshot = createBlockedSessionSnapshot(
        sessionRecord.sessionId,
        this.options.workspaceId,
      );
      this.sessions.set(sessionRecord.sessionId, blockedSnapshot);
      this.changeSessionsEmitter.fire();
      return {
        didCreateTerminal: false,
        snapshot: blockedSnapshot,
      };
    }

    const createOrAttachResult: TerminalCreateOrAttachResponse = await this.runtime.createOrAttach({
      cols: 120,
      cwd: getDefaultWorkspaceCwd(),
      rows: 34,
      sessionId: sessionRecord.sessionId,
      sessionStateFilePath: this.getSessionAgentStateFilePath(sessionRecord.sessionId),
      ...createAgentShellIntegrationEnvironmentRequest(this.agentShellIntegration),
      shell: getDefaultShell(),
      shellArgs: getManagedTerminalShellArgs(getDefaultShell(), this.agentShellIntegration),
      terminalEngine: sessionRecord.terminalEngine,
      xtermHeadlessScrollback: getXtermHeadlessScrollback(),
      workspaceId: this.options.workspaceId,
    });
    const snapshot = createOrAttachResult.session;
    this.sessions.set(sessionRecord.sessionId, snapshot);
    this.syncSessionTitle(sessionRecord.sessionId, snapshot.title);
    this.changeSessionsEmitter.fire();
    return {
      didCreateTerminal: createOrAttachResult.didCreateSession,
      snapshot,
    };
  }

  public async focusSession(_sessionId: string): Promise<boolean> {
    return true;
  }

  public async applyFirstPromptAutoRename(sessionId: string, title: string): Promise<void> {
    const normalizedTitle = normalizeTerminalTitle(title) ?? title.trim();
    if (!normalizedTitle) {
      return;
    }

    await updatePersistedSessionStateFile(
      this.getSessionAgentStateFilePath(sessionId),
      (currentState) => ({
        ...currentState,
        hasAutoTitleFromFirstPrompt: true,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: normalizedTitle,
      }),
    ).catch(() => undefined);
  }

  public getSessionSnapshot(sessionId: string): TerminalSessionSnapshot | undefined {
    return this.sessions.get(sessionId);
  }

  public async persistLastTerminalActivityAt(sessionId: string, activityAt: number): Promise<void> {
    if (!Number.isFinite(activityAt)) {
      return;
    }

    const nextActivityAt = new Date(activityAt).toISOString();
    const persistedState = await updatePersistedSessionStateFile(
      this.getSessionAgentStateFilePath(sessionId),
      (currentState) => {
        if (currentState.lastActivityAt && currentState.lastActivityAt >= nextActivityAt) {
          return currentState;
        }

        return {
          ...currentState,
          lastActivityAt: nextActivityAt,
        };
      },
    ).catch(() => undefined);
    if (!persistedState) {
      return;
    }

    const nextActivityAtMs = getPersistedSessionActivityAtMs(persistedState);
    if (nextActivityAtMs === undefined) {
      return;
    }

    const previousActivityAtMs = this.lastTerminalActivityAtBySessionId.get(sessionId);
    if (previousActivityAtMs === nextActivityAtMs) {
      return;
    }

    this.lastTerminalActivityAtBySessionId.set(sessionId, nextActivityAtMs);
    this.changeSessionActivityEmitter.fire(
      createPersistedSessionActivityChange(sessionId, persistedState),
    );
  }

  public async killSession(sessionId: string): Promise<void> {
    await this.runtime.kill(this.options.workspaceId, sessionId);
    this.sessions.delete(sessionId);
    this.changeSessionsEmitter.fire();
  }

  public async deletePersistedSessionState(sessionId: string): Promise<void> {
    await deletePersistedSessionStateFile(this.getSessionAgentStateFilePath(sessionId));
    this.sessionTitleBySessionId.delete(sessionId);
  }

  public async renameSession(sessionRecord: SessionRecord): Promise<void> {
    if (!isTerminalSession(sessionRecord)) {
      return;
    }

    await updatePersistedSessionStateFile(
      this.getSessionAgentStateFilePath(sessionRecord.sessionId),
      (currentState) => {
        if (!currentState.pendingFirstPromptAutoRenamePrompt) {
          return currentState;
        }

        return {
          ...currentState,
          pendingFirstPromptAutoRenamePrompt: undefined,
        };
      },
    ).catch(() => undefined);
  }

  public async readPersistedSessionState(sessionId: string): Promise<PersistedSessionState> {
    return (
      await readPersistedSessionStateSnapshotFromFile(this.getSessionAgentStateFilePath(sessionId))
    ).state;
  }

  public async restartSession(sessionRecord: SessionRecord): Promise<TerminalSessionSnapshot> {
    if (!isTerminalSession(sessionRecord)) {
      return (
        this.sessions.get(sessionRecord.sessionId) ??
        createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId)
      );
    }

    await this.killSession(sessionRecord.sessionId);
    return (await this.createOrAttachSession(sessionRecord)).snapshot;
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

    void this.syncManagedSessionLeases();
  }

  public async syncConfiguration(): Promise<void> {
    await this.runtime.configure(this.getIdleShutdownTimeoutMs());
    await this.syncManagedSessionLeases();
    this.restartLeaseRenewalTimer();
  }

  public async writeText(sessionId: string, data: string, shouldExecute = true): Promise<void> {
    if (shouldExecute && isWindowsPowerShellShell(getDefaultShell())) {
      await this.runtime.write(this.options.workspaceId, sessionId, data);
      await this.runtime.write(this.options.workspaceId, sessionId, "\r");
      return;
    }

    const text = shouldExecute ? `${data}\n` : data;
    await this.runtime.write(this.options.workspaceId, sessionId, text);
  }

  public async getConnection(): Promise<DaemonTerminalConnection> {
    return this.runtime.getConnection();
  }

  public async listGlobalSessions(): Promise<TerminalDaemonState> {
    return this.runtime.listExistingSessions();
  }

  public async killGlobalSession(workspaceId: string, sessionId: string): Promise<void> {
    const didKill = await this.runtime.killExistingSession(workspaceId, sessionId);
    if (!didKill) {
      return;
    }
    if (workspaceId !== this.options.workspaceId) {
      return;
    }

    const sessionRecord = this.sessionRecordBySessionId.get(sessionId);
    if (!sessionRecord) {
      return;
    }

    this.sessions.set(
      sessionId,
      await this.createPersistedDisconnectedSnapshot(sessionId, this.options.workspaceId),
    );
    this.changeSessionsEmitter.fire();
  }

  public async shutdownDaemon(): Promise<boolean> {
    const didShutdown = await this.runtime.shutdownExistingDaemon();
    if (!didShutdown) {
      return false;
    }

    for (const sessionRecord of this.sessionRecordBySessionId.values()) {
      this.sessions.set(
        sessionRecord.sessionId,
        await this.createPersistedDisconnectedSnapshot(
          sessionRecord.sessionId,
          this.options.workspaceId,
        ),
      );
    }
    this.changeSessionsEmitter.fire();
    return true;
  }

  private async refreshSessionSnapshots(): Promise<void> {
    const daemonSessions = await this.runtime.listSessions(this.options.workspaceId);
    const nextSnapshotsBySessionId = indexWorkspaceTerminalSnapshotsBySessionId(
      daemonSessions,
      this.options.workspaceId,
    );
    let didChange = false;

    for (const [sessionId, sessionRecord] of this.sessionRecordBySessionId) {
      const nextSnapshot =
        nextSnapshotsBySessionId.get(sessionId) ??
        (await this.createPersistedDisconnectedSnapshot(
          sessionRecord.sessionId,
          this.options.workspaceId,
        ));
      const previousSnapshot = this.sessions.get(sessionId);
      const previousTitle = this.sessionTitleBySessionId.get(sessionId);
      if (!haveSameTerminalSessionSnapshot(previousSnapshot, nextSnapshot)) {
        didChange = true;
      }
      this.sessions.set(sessionId, nextSnapshot);
      await this.refreshPersistedSessionActivity(sessionId);
      const nextTitle = this.syncSessionTitle(sessionId, nextSnapshot.title);
      const presentationDiff = describeTerminalSessionPresentationDiff(
        previousSnapshot,
        previousTitle,
        nextSnapshot,
        nextTitle,
      );
      const didChangeAgentPresentation = hasMeaningfulAgentPresentationChange(presentationDiff);
      didChange ||= didChangeAgentPresentation;
      if (!presentationDiff.isSame) {
        logVSmuxDebug("backend.daemon.sessionPresentationDiff", {
          ...presentationDiff,
          sessionId,
          source: "poll",
        });
        this.changeSessionPresentationEmitter.fire({
          sessionId,
          title: nextTitle,
        });
      }
    }

    if (didChange) {
      this.changeSessionsEmitter.fire();
    }
  }

  private getIdleShutdownTimeoutMs(): number | null {
    const timeoutMinutes =
      vscode.workspace.getConfiguration("VSmux").get<number>("backgroundSessionTimeoutMinutes") ??
      5;
    if (timeoutMinutes <= 0) {
      return null;
    }

    return Math.max(0, Math.round(timeoutMinutes * 60_000));
  }

  private getManagedTerminalSessionIds(): string[] {
    return [...this.sessionRecordBySessionId.keys()].sort();
  }

  private async syncManagedSessionLeases(): Promise<void> {
    try {
      await this.runtime.syncSessionLeases(
        this.options.workspaceId,
        this.getManagedTerminalSessionIds(),
        this.getIdleShutdownTimeoutMs(),
      );
    } catch (error) {
      logVSmuxDebug("backend.daemon.syncSessionLeases.failed", {
        error: error instanceof Error ? error.message : String(error),
        sessionCount: this.sessionRecordBySessionId.size,
        workspaceId: this.options.workspaceId,
      });
    }
  }

  private restartLeaseRenewalTimer(): void {
    if (this.leaseRenewalTimer) {
      clearInterval(this.leaseRenewalTimer);
      this.leaseRenewalTimer = undefined;
    }

    const leaseDurationMs = this.getIdleShutdownTimeoutMs();
    const intervalMs =
      leaseDurationMs === null
        ? 60_000
        : Math.max(5_000, Math.min(60_000, Math.floor(leaseDurationMs / 3)));
    this.leaseRenewalTimer = setInterval(() => {
      void this.syncManagedSessionLeases();
    }, intervalMs);
  }

  private getSessionAgentStateFilePath(sessionId: string): string {
    const workspaceStateKey = getWorkspaceStorageKey(
      AGENT_STATE_DIR_NAME,
      this.options.workspaceId,
    );
    return path.join(
      this.options.context.globalStorageUri.fsPath,
      workspaceStateKey,
      `${sessionId}.state`,
    );
  }

  private syncSessionTitle(sessionId: string, nextTitle: string | undefined): string | undefined {
    const normalizedTitle = normalizeTitle(nextTitle);
    const previousTitle = this.sessionTitleBySessionId.get(sessionId);
    if (previousTitle === normalizedTitle) {
      return normalizedTitle;
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

    return normalizedTitle;
  }

  private async createPersistedDisconnectedSnapshot(
    sessionId: string,
    workspaceId: string,
  ): Promise<TerminalSessionSnapshot> {
    const snapshot = createDisconnectedSessionSnapshot(sessionId, workspaceId);
    const persistedState = (
      await readPersistedSessionStateSnapshotFromFile(this.getSessionAgentStateFilePath(sessionId))
    ).state;
    return applyPersistedSessionStateToDisconnectedSnapshot(snapshot, persistedState);
  }

  private async refreshPersistedSessionActivity(sessionId: string): Promise<void> {
    const persistedState = await readPersistedSessionStateSnapshotFromFile(
      this.getSessionAgentStateFilePath(sessionId),
    );
    const nextActivityAtMs = getPersistedSessionActivityAtMs(persistedState.state);
    const previousActivityAtMs = this.lastTerminalActivityAtBySessionId.get(sessionId);

    if (nextActivityAtMs === undefined) {
      this.lastTerminalActivityAtBySessionId.delete(sessionId);
      logVSmuxDebug("backend.daemon.sessionActivity.cleared", {
        nextActivityAt: undefined,
        previousActivityAt: formatDebugActivityAt(previousActivityAtMs),
        sessionId,
      });
      return;
    }

    if (previousActivityAtMs === nextActivityAtMs) {
      return;
    }

    this.lastTerminalActivityAtBySessionId.set(sessionId, nextActivityAtMs);
    const activityChange = createPersistedSessionActivityChange(sessionId, persistedState.state);
    logVSmuxDebug("backend.daemon.sessionActivity.updated", {
      didComplete: activityChange.didComplete === true,
      nextActivityAt: formatDebugActivityAt(nextActivityAtMs),
      previousActivityAt: formatDebugActivityAt(previousActivityAtMs),
      sessionId,
    });
    this.changeSessionActivityEmitter.fire(activityChange);
  }
}

export function createPersistedSessionActivityChange(
  sessionId: string,
  persistedState: PersistedSessionState,
): TerminalWorkspaceBackendActivityChange {
  return {
    didComplete: persistedState.agentStatus === "attention",
    sessionId,
  };
}

function formatDebugActivityAt(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return new Date(value).toISOString();
}

export function applyPersistedSessionStateToDisconnectedSnapshot(
  snapshot: TerminalSessionSnapshot,
  persistedState: PersistedSessionState,
): TerminalSessionSnapshot {
  return {
    ...snapshot,
    agentName: persistedState.agentName,
    agentStatus: persistedState.agentStatus,
    title: persistedState.title,
  };
}

function describeTerminalSessionPresentationDiff(
  leftSnapshot: TerminalSessionSnapshot | undefined,
  leftTitle: string | undefined,
  rightSnapshot: TerminalSessionSnapshot | undefined,
  rightTitle: string | undefined,
) {
  const previousVisibleTerminalTitle = getVisibleTerminalTitle(leftTitle);
  const nextVisibleTerminalTitle = getVisibleTerminalTitle(rightTitle);
  const agentNameChanged = leftSnapshot?.agentName !== rightSnapshot?.agentName;
  const agentStatusChanged = leftSnapshot?.agentStatus !== rightSnapshot?.agentStatus;
  const normalizedTitleChanged = leftTitle !== rightTitle;
  const visibleTerminalTitleChanged = previousVisibleTerminalTitle !== nextVisibleTerminalTitle;

  return {
    agentNameChanged,
    agentStatusChanged,
    isSame: !agentNameChanged && !agentStatusChanged && !normalizedTitleChanged,
    nextAgentName: rightSnapshot?.agentName,
    nextAgentStatus: rightSnapshot?.agentStatus,
    nextNormalizedTitle: rightTitle,
    nextRawTitle: rightSnapshot?.title,
    nextVisibleTerminalTitle,
    normalizedTitleChanged,
    previousAgentName: leftSnapshot?.agentName,
    previousAgentStatus: leftSnapshot?.agentStatus,
    previousNormalizedTitle: leftTitle,
    previousRawTitle: leftSnapshot?.title,
    previousVisibleTerminalTitle,
    visibleTerminalTitleChanged,
  };
}

function haveSameTerminalSessionSnapshot(
  left: TerminalSessionSnapshot | undefined,
  right: TerminalSessionSnapshot | undefined,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.cols === right.cols &&
    left.cwd === right.cwd &&
    left.endedAt === right.endedAt &&
    left.errorMessage === right.errorMessage &&
    left.exitCode === right.exitCode &&
    left.isAttached === right.isAttached &&
    left.restoreState === right.restoreState &&
    left.rows === right.rows &&
    left.sessionId === right.sessionId &&
    left.shell === right.shell &&
    left.startedAt === right.startedAt &&
    left.status === right.status &&
    left.workspaceId === right.workspaceId
  );
}

export function hasMeaningfulAgentPresentationChange(diff: {
  agentNameChanged: boolean;
  agentStatusChanged: boolean;
}): boolean {
  return diff.agentNameChanged || diff.agentStatusChanged;
}

function normalizeTitle(title: string | undefined): string | undefined {
  return normalizeTerminalTitle(title);
}

function getManagedTerminalShellArgs(
  shellPath: string,
  agentShellIntegration: AgentShellIntegration | undefined,
): string[] | undefined {
  if (process.platform !== "win32" || !agentShellIntegration?.powerShellBootstrapPath) {
    return undefined;
  }

  if (!isWindowsPowerShellShell(shellPath)) {
    return undefined;
  }

  return [
    "-NoLogo",
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    agentShellIntegration.powerShellBootstrapPath,
  ];
}

function isWindowsPowerShellShell(shellPath: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  const shellName = path.basename(shellPath).toLowerCase();
  return (
    shellName === "powershell.exe" ||
    shellName === "powershell" ||
    shellName === "pwsh.exe" ||
    shellName === "pwsh"
  );
}

function getPersistedSessionActivityAtMs(state: PersistedSessionState): number | undefined {
  if (!state.lastActivityAt) {
    return undefined;
  }

  const timestampMs = Date.parse(state.lastActivityAt);
  return Number.isFinite(timestampMs) ? timestampMs : undefined;
}
