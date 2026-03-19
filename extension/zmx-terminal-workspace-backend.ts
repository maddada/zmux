import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { SessionGridSnapshot, SessionRecord } from "../shared/session-grid-contract";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
  TerminalSessionStatus,
} from "../shared/terminal-host-protocol";
import { ensureAgentShellIntegration, type AgentShellIntegration } from "./agent-shell-integration";
import type {
  TerminalWorkspaceBackend,
  TerminalWorkspaceBackendTitleChange,
} from "./terminal-workspace-backend";
import {
  applyEditorLayout,
  createBlockedSessionSnapshot,
  createDisconnectedSessionSnapshot,
  extractTerminalTextTailFromVtHistory,
  extractLatestTerminalTitleFromVtHistory,
  focusEditorGroupByIndex,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  hasCodexWorkingStatusInVtHistory,
  getSessionTabTitle,
  getViewColumn,
  matchesVisibleTerminalLayout,
  parsePersistedSessionState,
  serializePersistedSessionState,
  type PersistedSessionState,
} from "./terminal-workspace-helpers";
import { ensureZmxBinary } from "./zmx-binary";
import { parseZmxListSessionNames, toZmxSessionName } from "./zmx-session-utils";

const ZMX_POLL_INTERVAL_MS = 750;
const AGENT_STATE_FILE_NAME = "agent-state";

type ZmxTerminalWorkspaceBackendOptions = {
  context: vscode.ExtensionContext;
  ensureShellSpawnAllowed: () => Promise<boolean>;
  workspaceId: string;
};

type SessionProjection = {
  sessionId: string;
  terminal: vscode.Terminal;
};

type SessionHistoryState = {
  hasCodexWorkingStatus: boolean;
  textTail?: string;
  title?: string;
};

export class ZmxTerminalWorkspaceBackend implements TerminalWorkspaceBackend {
  private agentShellIntegration: AgentShellIntegration | undefined;
  private readonly activateSessionEmitter = new vscode.EventEmitter<string>();
  private readonly changeSessionsEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionTitleEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendTitleChange>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly projections = new Map<string, SessionProjection>();
  private readonly lastTerminalActivityAtBySessionId = new Map<string, number>();
  private readonly lastTerminalTextTailBySessionId = new Map<string, string>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();
  private readonly sessionTitles = new Map<string, string>();
  private readonly terminalToSessionId = new Map<vscode.Terminal, string>();
  private lastVisibleSnapshot: SessionGridSnapshot | undefined;
  private pollTimer: NodeJS.Timeout | undefined;
  private readonly trackedSessionIds = new Set<string>();
  private zmxBinaryPath: string | undefined;

  public readonly onDidActivateSession = this.activateSessionEmitter.event;
  public readonly onDidChangeSessions = this.changeSessionsEmitter.event;
  public readonly onDidChangeSessionTitle = this.changeSessionTitleEmitter.event;

  public constructor(private readonly options: ZmxTerminalWorkspaceBackendOptions) {
    void options;
  }

  public async initialize(sessionRecords: readonly SessionRecord[]): Promise<void> {
    this.zmxBinaryPath = await ensureZmxBinary(this.options.context);
    await mkdir(this.getRuntimeDirectory(), { mode: 0o700, recursive: true });
    this.agentShellIntegration = await ensureAgentShellIntegration(
      path.join(this.options.context.globalStorageUri.fsPath, "terminal-host-daemon"),
    );
    for (const sessionRecord of sessionRecords) {
      this.trackedSessionIds.add(sessionRecord.sessionId);
    }

    await this.refreshSessionSnapshots();

    this.pollTimer = setInterval(() => {
      void this.refreshSessionSnapshots().catch(() => {
        // keep polling on transient zmx failures
      });
    }, ZMX_POLL_INTERVAL_MS);

    this.disposables.push(
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

        const projection = this.projections.get(sessionId);
        this.terminalToSessionId.delete(terminal);
        if (!projection || projection.terminal === terminal) {
          this.projections.delete(sessionId);
        }

        this.changeSessionsEmitter.fire();
      }),
    );
  }

  public getLastTerminalActivityAt(sessionId: string): number | undefined {
    return this.lastTerminalActivityAtBySessionId.get(sessionId);
  }

  public dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    for (const projection of this.projections.values()) {
      this.terminalToSessionId.delete(projection.terminal);
      projection.terminal.dispose();
    }

    this.projections.clear();
    this.lastTerminalActivityAtBySessionId.clear();
    this.lastTerminalTextTailBySessionId.clear();
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
    await this.writeSessionAgentState(sessionId, "idle", sessionSnapshot.agentName);
    this.changeSessionsEmitter.fire();
    return true;
  }

  public async createOrAttachSession(
    sessionRecord: SessionRecord,
  ): Promise<TerminalSessionSnapshot> {
    this.trackedSessionIds.add(sessionRecord.sessionId);

    const existingSession = this.sessions.get(sessionRecord.sessionId);
    if (existingSession?.status === "running") {
      return existingSession;
    }

    const snapshot =
      existingSession ??
      createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId);
    await this.writeSessionAgentState(sessionRecord.sessionId, "idle", undefined, null);
    this.sessionTitles.delete(sessionRecord.sessionId);
    this.sessions.set(sessionRecord.sessionId, snapshot);
    this.changeSessionsEmitter.fire();
    return snapshot;
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

    if (!preserveFocus && this.lastVisibleSnapshot) {
      const visibleIndex = this.lastVisibleSnapshot.visibleSessionIds.indexOf(sessionId);
      if (visibleIndex >= 0 && (await focusEditorGroupByIndex(visibleIndex))) {
        return true;
      }
    }

    projection.terminal.show(preserveFocus);
    return true;
  }

  public getSessionSnapshot(sessionId: string): TerminalSessionSnapshot | undefined {
    return this.sessions.get(sessionId);
  }

  public async killSession(sessionId: string): Promise<void> {
    this.disposeProjection(sessionId);
    this.trackedSessionIds.delete(sessionId);

    try {
      await this.runZmxCommand(["kill", toZmxSessionName(this.options.workspaceId, sessionId)]);
    } catch {
      // ignore stale sessions
    }

    await this.deleteSessionAgentState(sessionId);
    this.lastTerminalActivityAtBySessionId.delete(sessionId);
    this.lastTerminalTextTailBySessionId.delete(sessionId);
    this.sessionTitles.delete(sessionId);
    this.sessions.delete(sessionId);
    this.changeSessionsEmitter.fire();
  }

  public async reconcileVisibleTerminals(
    snapshot: SessionGridSnapshot,
    preserveFocus = false,
  ): Promise<void> {
    this.lastVisibleSnapshot = {
      ...snapshot,
      sessions: [...snapshot.sessions],
      visibleSessionIds: [...snapshot.visibleSessionIds],
    };

    for (const sessionId of Array.from(this.projections.keys())) {
      this.disposeProjection(sessionId);
    }

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

      if (!(await this.options.ensureShellSpawnAllowed())) {
        this.sessions.set(
          sessionId,
          createBlockedSessionSnapshot(sessionId, this.options.workspaceId),
        );
        this.changeSessionsEmitter.fire();
        continue;
      }

      this.createProjection(sessionRecord, index, getSessionTabTitle(sessionRecord));
    }

    this.changeSessionsEmitter.fire();

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      this.projections.get(focusedSessionId)?.terminal.show(preserveFocus);
    }
  }

  public async renameSession(sessionRecord: SessionRecord): Promise<void> {
    if (!this.projections.has(sessionRecord.sessionId) || !this.lastVisibleSnapshot) {
      return;
    }

    const snapshot = {
      ...this.lastVisibleSnapshot,
      sessions: this.lastVisibleSnapshot.sessions.map((candidate) =>
        candidate.sessionId === sessionRecord.sessionId ? sessionRecord : candidate,
      ),
    };

    await this.reconcileVisibleTerminals(snapshot, true);
  }

  public async restartSession(sessionRecord: SessionRecord): Promise<TerminalSessionSnapshot> {
    await this.killSession(sessionRecord.sessionId);
    return this.createOrAttachSession(sessionRecord);
  }

  public async syncConfiguration(): Promise<void> {
    // zmx does not need dynamic backend configuration today.
  }

  public async writeText(sessionId: string, data: string): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection || data.length === 0) {
      return;
    }

    projection.terminal.sendText(data, false);
  }

  private createProjection(
    sessionRecord: SessionRecord,
    visibleIndex: number,
    terminalTitle: string,
  ): SessionProjection {
    const terminal = vscode.window.createTerminal({
      cwd: getDefaultWorkspaceCwd(),
      env: this.createTerminalEnvironment(sessionRecord.sessionId),
      iconPath: new vscode.ThemeIcon("terminal"),
      isTransient: true,
      location: {
        preserveFocus: true,
        viewColumn: getViewColumn(visibleIndex),
      },
      name: terminalTitle,
      shellArgs: this.createAttachShellArgs(sessionRecord.sessionId),
      shellPath: this.getRequiredZmxBinaryPath(),
    });

    const projection = {
      sessionId: sessionRecord.sessionId,
      terminal,
    };

    this.projections.set(sessionRecord.sessionId, projection);
    this.terminalToSessionId.set(terminal, sessionRecord.sessionId);
    this.sessions.set(
      sessionRecord.sessionId,
      this.createRunningSessionSnapshot(sessionRecord.sessionId),
    );
    terminal.show(true);
    return projection;
  }

  private createRunningSessionSnapshot(sessionId: string): TerminalSessionSnapshot {
    const previousSession = this.sessions.get(sessionId);

    return {
      ...(previousSession ??
        createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId)),
      cwd: getDefaultWorkspaceCwd(),
      restoreState: "live",
      shell: getDefaultShell(),
      startedAt: previousSession?.startedAt ?? new Date().toISOString(),
      status: "running",
      workspaceId: this.options.workspaceId,
    };
  }

  private createTerminalEnvironment(sessionId?: string): Record<string, string> {
    const environment: Record<string, string> = {
      HOME: process.env.HOME ?? "",
      XDG_RUNTIME_DIR: this.getRuntimeDirectory(),
    };

    if (this.agentShellIntegration) {
      environment.PATH = `${this.agentShellIntegration.binDir}${path.delimiter}${process.env.PATH ?? ""}`;
      environment.ZDOTDIR = this.agentShellIntegration.zshDotDir;
    }

    if (sessionId) {
      environment.VS_AGENT_MUX_SESSION_ID = sessionId;
      environment.VS_AGENT_MUX_SESSION_STATE_FILE = this.getSessionAgentStateFilePath(sessionId);
    }

    return environment;
  }

  private createAttachShellArgs(sessionId: string): string[] {
    const sessionEnvironment = this.createTerminalEnvironment(sessionId);
    const shellCommand = ["/usr/bin/env"];

    for (const [key, value] of Object.entries(sessionEnvironment)) {
      shellCommand.push(`${key}=${value}`);
    }

    shellCommand.push(getDefaultShell());

    return ["attach", toZmxSessionName(this.options.workspaceId, sessionId), ...shellCommand];
  }

  private disposeProjection(sessionId: string): void {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return;
    }

    this.terminalToSessionId.delete(projection.terminal);
    projection.terminal.dispose();
    this.projections.delete(sessionId);
  }

  private getRequiredZmxBinaryPath(): string {
    if (!this.zmxBinaryPath) {
      throw new Error("zmx binary has not been initialized");
    }

    return this.zmxBinaryPath;
  }

  private getRuntimeDirectory(): string {
    const runtimeDirectoryKey = createHash("sha1")
      .update(this.options.context.globalStorageUri.fsPath)
      .digest("hex")
      .slice(0, 12);

    return path.join("/tmp", `vamz-${runtimeDirectoryKey}`);
  }

  private getAgentStateDirectory(): string {
    return path.join(this.getRuntimeDirectory(), AGENT_STATE_FILE_NAME);
  }

  private getSessionAgentStateFilePath(sessionId: string): string {
    return path.join(this.getAgentStateDirectory(), `${sessionId}.env`);
  }

  private async refreshSessionSnapshots(): Promise<void> {
    const runningSessionNames = new Set(
      parseZmxListSessionNames(await this.runZmxCommand(["list", "--short"])),
    );
    const refreshStartedAt = Date.now();

    let changed = false;
    for (const sessionId of this.trackedSessionIds) {
      const sessionName = toZmxSessionName(this.options.workspaceId, sessionId);
      const previousSession = this.sessions.get(sessionId);
      const agentState = await this.readSessionAgentState(sessionId);
      const previousTitle = this.sessionTitles.get(sessionId);
      const historyState = runningSessionNames.has(sessionName)
        ? await this.readSessionHistoryState(sessionName, agentState)
        : undefined;
      const nextTitle = historyState?.title ?? agentState.title?.trim();
      this.updateLastTerminalActivity(sessionId, historyState, nextTitle, previousTitle, refreshStartedAt);
      const nextStatus: TerminalSessionStatus = runningSessionNames.has(sessionName)
        ? "running"
        : previousSession?.status === "running"
          ? "exited"
          : (previousSession?.status ?? "disconnected");
      const nextAgentStatus =
        runningSessionNames.has(sessionName) && historyState?.hasCodexWorkingStatus
          ? "working"
          : agentState.agentStatus;
      const nextSession: TerminalSessionSnapshot = runningSessionNames.has(sessionName)
        ? {
            ...this.createRunningSessionSnapshot(sessionId),
            agentName:
              agentState.agentName ??
              (historyState?.hasCodexWorkingStatus ? "codex" : undefined) ??
              previousSession?.agentName,
            agentStatus: nextAgentStatus,
          }
        : {
            ...(previousSession ??
              createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId)),
            agentName: agentState.agentName ?? previousSession?.agentName,
            agentStatus:
              nextStatus === "exited" && agentState.agentStatus === "working"
                ? "idle"
                : agentState.agentStatus,
            endedAt:
              nextStatus === "exited"
                ? (previousSession?.endedAt ?? new Date().toISOString())
                : previousSession?.endedAt,
            exitCode: nextStatus === "exited" ? (previousSession?.exitCode ?? 0) : undefined,
            status: nextStatus,
          };

      if (JSON.stringify(previousSession) !== JSON.stringify(nextSession)) {
        this.sessions.set(sessionId, nextSession);
        changed = true;
      }

      if (nextTitle && nextTitle !== previousTitle) {
        this.sessionTitles.set(sessionId, nextTitle);
        this.changeSessionTitleEmitter.fire({
          sessionId,
          title: nextTitle,
        });
      } else if (!nextTitle && previousTitle) {
        this.sessionTitles.delete(sessionId);
      }

      if (!runningSessionNames.has(sessionName)) {
        this.lastTerminalTextTailBySessionId.delete(sessionId);
      }
    }

    if (changed) {
      this.changeSessionsEmitter.fire();
    }
  }

  private runZmxCommand(args: readonly string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        this.getRequiredZmxBinaryPath(),
        [...args],
        {
          cwd: getDefaultWorkspaceCwd(),
          env: {
            ...process.env,
            ...this.createTerminalEnvironment(),
          },
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr.trim() || error.message));
            return;
          }

          resolve(stdout);
        },
      );
    });
  }

  private async deleteSessionAgentState(sessionId: string): Promise<void> {
    await rm(this.getSessionAgentStateFilePath(sessionId), { force: true });
  }

  private async readSessionHistoryState(
    sessionName: string,
    agentState: PersistedSessionState,
  ): Promise<SessionHistoryState | undefined> {
    try {
      const history = await this.runZmxCommand(["history", sessionName, "--vt"]);
      const title = extractLatestTerminalTitleFromVtHistory(history);
      return {
        hasCodexWorkingStatus: hasCodexWorkingStatusInVtHistory(
          history,
          title ?? agentState.title,
          agentState.agentName,
        ),
        textTail: extractTerminalTextTailFromVtHistory(history),
        title,
      };
    } catch {
      return undefined;
    }
  }

  private updateLastTerminalActivity(
    sessionId: string,
    historyState: SessionHistoryState | undefined,
    nextTitle: string | undefined,
    previousTitle: string | undefined,
    observedAt: number,
  ): void {
    const previousTextTail = this.lastTerminalTextTailBySessionId.get(sessionId);
    const nextTextTail = historyState?.textTail;
    if (nextTextTail) {
      this.lastTerminalTextTailBySessionId.set(sessionId, nextTextTail);
      if (nextTextTail !== previousTextTail) {
        this.lastTerminalActivityAtBySessionId.set(sessionId, observedAt);
        return;
      }
    }

    if (nextTitle && nextTitle !== previousTitle) {
      this.lastTerminalActivityAtBySessionId.set(sessionId, observedAt);
      return;
    }

    if (!this.lastTerminalActivityAtBySessionId.has(sessionId) && (nextTextTail || nextTitle)) {
      this.lastTerminalActivityAtBySessionId.set(sessionId, observedAt);
    }
  }

  private async readSessionAgentState(sessionId: string): Promise<PersistedSessionState> {
    try {
      const rawState = await readFile(this.getSessionAgentStateFilePath(sessionId), "utf8");
      return parsePersistedSessionState(rawState);
    } catch {
      return {
        agentName: undefined,
        agentStatus: "idle",
        title: undefined,
      };
    }
  }

  private async writeSessionAgentState(
    sessionId: string,
    agentStatus: TerminalAgentStatus,
    agentName?: string,
    title?: string | null,
  ): Promise<void> {
    const existingState = await this.readSessionAgentState(sessionId);
    await mkdir(this.getAgentStateDirectory(), { mode: 0o700, recursive: true });
    await writeFile(
      this.getSessionAgentStateFilePath(sessionId),
      serializePersistedSessionState({
        agentName,
        agentStatus,
        title: title === undefined ? existingState.title : (title ?? undefined),
      }),
      { mode: 0o600 },
    );
  }
}
