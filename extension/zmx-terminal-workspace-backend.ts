import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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
  extractClaudeCodeTitleFromVtHistory,
  extractTerminalTextTailFromVtHistory,
  extractLatestTerminalTitleFromVtHistory,
  focusEditorGroupByIndex,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  hasInterruptStatusInVtHistory,
  getSessionTabTitle,
  getViewColumn,
  matchesVisibleTerminalLayout,
  moveActiveTerminalToEditor,
  moveActiveTerminalToPanel,
  parsePersistedSessionState,
  serializePersistedSessionState,
  type PersistedSessionState,
} from "./terminal-workspace-helpers";
import { ensureZmxBinary } from "./zmx-binary";
import { parseZmxListSessionNames, toZmxSessionName } from "./zmx-session-utils";
import {
  createParkedTerminalReconcilePlan,
  type ParkedTerminalReconcilePlan,
} from "../shared/session-grid-parked-terminal-plan";
import {
  createVisibleSessionReconcilePlan,
  type VisibleSessionReconcilePlan,
} from "../shared/session-grid-reconcile-plan";

const ZMX_POLL_INTERVAL_MS = 750;
const AGENT_STATE_FILE_NAME = "agent-state";
const SETTINGS_SECTION = "VSmux";
const EXPERIMENTAL_PARK_HIDDEN_ZMX_TERMINALS_IN_PANEL_SETTING =
  "experimentalParkHiddenZmxTerminalsInPanel";
const EXPERIMENTAL_ZMX_ACTION_DELAY_MS_SETTING = "experimentalZmxActionDelayMs";

type ZmxTerminalWorkspaceBackendOptions = {
  context: vscode.ExtensionContext;
  ensureShellSpawnAllowed: () => Promise<boolean>;
  workspaceId: string;
};

type SessionProjection = {
  location:
    | {
        type: "editor";
        visibleIndex: number;
      }
    | {
        type: "panel";
      };
  sessionId: string;
  terminal: vscode.Terminal;
};

type SessionHistoryState = {
  hasClaudeSessionTitle: boolean;
  hasInterruptStatus: boolean;
  textTail?: string;
  title?: string;
};

type ReadSessionAgentStateResult = {
  modifiedAt?: number;
  state: PersistedSessionState;
};

export class ZmxTerminalWorkspaceBackend implements TerminalWorkspaceBackend {
  private agentShellIntegration: AgentShellIntegration | undefined;
  private readonly activateSessionEmitter = new vscode.EventEmitter<string>();
  private readonly lastAgentStateModifiedAtBySessionId = new Map<string, number>();
  private readonly changeSessionsEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionTitleEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendTitleChange>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly projections = new Map<string, SessionProjection>();
  private readonly lastTerminalActivityAtBySessionId = new Map<string, number>();
  private readonly lastTerminalTextTailBySessionId = new Map<string, string>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();
  private readonly sessionTitles = new Map<string, string>();
  private suppressActivationEvents = 0;
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
        if (this.suppressActivationEvents > 0) {
          return;
        }

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
    this.lastAgentStateModifiedAtBySessionId.clear();
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
    const editorProjections = this.getEditorProjections();
    if (snapshot.visibleSessionIds.length !== editorProjections.size) {
      return false;
    }

    const projectedSessionIds = new Set(editorProjections.keys());
    if (snapshot.visibleSessionIds.some((sessionId) => !projectedSessionIds.has(sessionId))) {
      return false;
    }

    return matchesVisibleTerminalLayout(
      snapshot,
      new Map(
        Array.from(editorProjections.entries(), ([sessionId, projection]) => [
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

    await this.showTerminal(projection.terminal, preserveFocus);
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
    const previousSnapshot = this.lastVisibleSnapshot;
    this.lastVisibleSnapshot = cloneSnapshot(snapshot);

    await this.runWithoutActivationEvents(async () => {
      if (shouldParkHiddenZmxTerminalsInPanel()) {
        await this.reconcileVisibleTerminalsWithParkedProjections(
          previousSnapshot,
          snapshot,
          preserveFocus,
        );
        return;
      }

      const plan = createVisibleSessionReconcilePlan(previousSnapshot, snapshot);
      if (plan.strategy === "incremental" && this.canIncrementallyReconcile(previousSnapshot)) {
        await this.reconcileVisibleTerminalsIncrementally(snapshot, plan, preserveFocus);
        return;
      }

      await this.reconcileVisibleTerminalsByRecreatingProjections(snapshot, preserveFocus);
    });
  }

  public async renameSession(sessionRecord: SessionRecord): Promise<void> {
    const projection = this.projections.get(sessionRecord.sessionId);
    if (!projection || !this.lastVisibleSnapshot) {
      return;
    }

    const snapshot = {
      ...this.lastVisibleSnapshot,
      sessions: this.lastVisibleSnapshot.sessions.map((candidate) =>
        candidate.sessionId === sessionRecord.sessionId ? sessionRecord : candidate,
      ),
    };

    this.lastVisibleSnapshot = cloneSnapshot(snapshot);

    if (shouldParkHiddenZmxTerminalsInPanel()) {
      await this.runWithoutActivationEvents(async () => {
        await this.recreateProjectionForRenamedSession(sessionRecord, projection.location);
      });
      return;
    }

    await this.runWithoutActivationEvents(async () => {
      await this.reconcileVisibleTerminalsByRecreatingProjections(snapshot, true);
    });
  }

  public async restartSession(sessionRecord: SessionRecord): Promise<TerminalSessionSnapshot> {
    await this.killSession(sessionRecord.sessionId);
    return this.createOrAttachSession(sessionRecord);
  }

  public async syncConfiguration(): Promise<void> {
    // zmx does not need dynamic backend configuration today.
  }

  public async writeText(sessionId: string, data: string, shouldExecute = false): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection || data.length === 0) {
      return;
    }

    projection.terminal.sendText(data, shouldExecute);
  }

  private async reconcileVisibleTerminalsByRecreatingProjections(
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    for (const sessionId of Array.from(this.projections.keys())) {
      this.disposeProjection(sessionId);
    }

    if (snapshot.visibleSessionIds.length === 0) {
      return;
    }

    await this.runUiAction(() =>
      applyEditorLayout(snapshot.visibleSessionIds.length, snapshot.viewMode),
    );

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

      await this.createProjection(
        sessionRecord,
        { visibleIndex: index },
        getSessionTabTitle(sessionRecord),
      );
    }

    this.changeSessionsEmitter.fire();

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
    }
  }

  private async reconcileVisibleTerminalsWithParkedProjections(
    previousSnapshot: SessionGridSnapshot | undefined,
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    const restorablePanelTerminal = this.getRestorableActivePanelTerminal();
    await this.ensureParkedProjections(snapshot.sessions);

    const plan = createParkedTerminalReconcilePlan(previousSnapshot, snapshot);
    if (
      plan.strategy === "transfer" &&
      this.canIncrementallyReconcileWithParkedProjections(previousSnapshot)
    ) {
      await this.applyParkedTerminalTransferPlan(snapshot, plan, preserveFocus);
    } else {
      await this.reconcileVisibleTerminalsByMovingParkedProjections(snapshot, preserveFocus);
    }

    await this.restoreActivePanelTerminal(restorablePanelTerminal);
  }

  private async ensureParkedProjections(sessionRecords: readonly SessionRecord[]): Promise<void> {
    let changed = false;

    for (const sessionRecord of sessionRecords) {
      if (this.projections.has(sessionRecord.sessionId)) {
        continue;
      }

      if (!(await this.options.ensureShellSpawnAllowed())) {
        this.sessions.set(
          sessionRecord.sessionId,
          createBlockedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId),
        );
        changed = true;
        continue;
      }

      await this.createProjection(sessionRecord, "panel", getSessionTabTitle(sessionRecord));
      changed = true;
    }

    if (changed) {
      this.changeSessionsEmitter.fire();
    }
  }

  private canIncrementallyReconcileWithParkedProjections(
    snapshot: SessionGridSnapshot | undefined,
  ): boolean {
    if (!snapshot) {
      return false;
    }

    const editorProjections = this.getEditorProjections();
    if (editorProjections.size !== snapshot.visibleSessionIds.length) {
      return false;
    }

    if (snapshot.visibleSessionIds.some((sessionId) => !editorProjections.has(sessionId))) {
      return false;
    }

    return this.canReuseVisibleLayout(snapshot);
  }

  private async applyParkedTerminalTransferPlan(
    snapshot: SessionGridSnapshot,
    plan: Extract<ParkedTerminalReconcilePlan, { strategy: "transfer" }>,
    preserveFocus: boolean,
  ): Promise<void> {
    if (!plan.hasChanges) {
      const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
      if (focusedSessionId) {
        await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
      }
      return;
    }

    for (const step of plan.steps) {
      if (step.type === "promote") {
        await this.moveProjectionToEditor(step.sessionId, step.slotIndex);
        continue;
      }

      await this.moveProjectionToPanel(step.sessionId);
    }

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
    }
  }

  private async reconcileVisibleTerminalsByMovingParkedProjections(
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    for (const projection of this.getEditorProjections().values()) {
      await this.moveProjectionToPanel(projection.sessionId);
    }

    if (snapshot.visibleSessionIds.length === 0) {
      return;
    }

    await this.runUiAction(() =>
      applyEditorLayout(snapshot.visibleSessionIds.length, snapshot.viewMode),
    );

    for (let index = 0; index < snapshot.visibleSessionIds.length; index += 1) {
      const sessionId = snapshot.visibleSessionIds[index];
      await this.moveProjectionToEditor(sessionId, index);
    }

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
    }
  }

  private async moveProjectionToEditor(sessionId: string, visibleIndex: number): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return;
    }

    if (
      projection.location.type === "editor" &&
      projection.location.visibleIndex === visibleIndex
    ) {
      return;
    }

    await this.runUiAction(async () => {
      await focusEditorGroupByIndex(visibleIndex);
    });
    // Keep editor focus on the destination group while activating the terminal.
    // Focusing the panel first can cause moveToEditor to materialize a brand new
    // editor group instead of populating the intended one.
    await this.showTerminal(projection.terminal, true);
    await this.runUiAction(() => moveActiveTerminalToEditor());
    projection.location = {
      type: "editor",
      visibleIndex,
    };
  }

  private async moveProjectionToPanel(sessionId: string): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection || projection.location.type === "panel") {
      return;
    }

    await this.showTerminal(projection.terminal, false);
    await this.runUiAction(() => moveActiveTerminalToPanel());
    projection.location = { type: "panel" };
  }

  private async recreateProjectionForRenamedSession(
    sessionRecord: SessionRecord,
    location: SessionProjection["location"],
  ): Promise<void> {
    this.disposeProjection(sessionRecord.sessionId);
    await this.createProjection(
      sessionRecord,
      location.type === "panel" ? "panel" : { visibleIndex: location.visibleIndex },
      getSessionTabTitle(sessionRecord),
    );
    this.changeSessionsEmitter.fire();
  }

  private canIncrementallyReconcile(snapshot: SessionGridSnapshot | undefined): boolean {
    if (!snapshot) {
      return false;
    }

    if (this.projections.size !== snapshot.visibleSessionIds.length) {
      return false;
    }

    if (snapshot.visibleSessionIds.some((sessionId) => !this.projections.has(sessionId))) {
      return false;
    }

    return this.canReuseVisibleLayout(snapshot);
  }

  private async reconcileVisibleTerminalsIncrementally(
    snapshot: SessionGridSnapshot,
    plan: Extract<VisibleSessionReconcilePlan, { strategy: "incremental" }>,
    preserveFocus: boolean,
  ): Promise<void> {
    if (!plan.hasChanges) {
      const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
      if (focusedSessionId) {
        await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
      }
      return;
    }

    const sessionRecordById = new Map(
      snapshot.sessions.map((session) => [session.sessionId, session]),
    );
    const outgoingProjectionBySessionId = new Map<string, SessionProjection>();

    for (const outgoingSlot of plan.outgoingSlots) {
      const projection = this.projections.get(outgoingSlot.sessionId);
      if (projection) {
        outgoingProjectionBySessionId.set(outgoingSlot.sessionId, projection);
      }
    }

    for (const incomingSlot of plan.incomingSlots) {
      const sessionRecord = sessionRecordById.get(incomingSlot.sessionId);
      if (!sessionRecord) {
        continue;
      }

      if (!(await this.options.ensureShellSpawnAllowed())) {
        this.sessions.set(
          sessionRecord.sessionId,
          createBlockedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId),
        );
        continue;
      }

      await this.createProjection(
        sessionRecord,
        { visibleIndex: incomingSlot.slotIndex },
        getSessionTabTitle(sessionRecord),
      );
    }

    for (const outgoingSlot of plan.outgoingSlots) {
      const outgoingProjection = outgoingProjectionBySessionId.get(outgoingSlot.sessionId);
      if (!outgoingProjection) {
        continue;
      }

      this.disposeProjectionTerminal(outgoingSlot.sessionId, outgoingProjection.terminal);
    }

    this.changeSessionsEmitter.fire();

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
    }
  }

  private async createProjection(
    sessionRecord: SessionRecord,
    location: "panel" | { visibleIndex: number },
    terminalTitle: string,
  ): Promise<SessionProjection> {
    const terminal = vscode.window.createTerminal({
      cwd: getDefaultWorkspaceCwd(),
      env: this.createTerminalEnvironment(sessionRecord.sessionId),
      iconPath: new vscode.ThemeIcon("terminal"),
      isTransient: true,
      location:
        location === "panel"
          ? vscode.TerminalLocation.Panel
          : {
              preserveFocus: true,
              viewColumn: getViewColumn(location.visibleIndex),
            },
      name: terminalTitle,
      shellArgs: this.createAttachShellArgs(sessionRecord.sessionId),
      shellPath: this.getRequiredZmxBinaryPath(),
    });

    const projection = {
      location:
        location === "panel"
          ? ({ type: "panel" } as const)
          : ({
              type: "editor",
              visibleIndex: location.visibleIndex,
            } as const),
      sessionId: sessionRecord.sessionId,
      terminal,
    };

    this.projections.set(sessionRecord.sessionId, projection);
    this.terminalToSessionId.set(terminal, sessionRecord.sessionId);
    this.sessions.set(
      sessionRecord.sessionId,
      this.createRunningSessionSnapshot(sessionRecord.sessionId),
    );
    if (location !== "panel") {
      await this.showTerminal(terminal, true);
    }
    return projection;
  }

  private getEditorProjections(): Map<string, SessionProjection> {
    return new Map(
      Array.from(this.projections.entries()).filter(
        ([, projection]) => projection.location.type === "editor",
      ),
    );
  }

  private getRestorableActivePanelTerminal(): vscode.Terminal | undefined {
    const activeTerminal = vscode.window.activeTerminal;
    if (!activeTerminal) {
      return undefined;
    }

    const projection = Array.from(this.projections.values()).find(
      (candidate) => candidate.terminal === activeTerminal,
    );
    return projection?.location.type === "panel" ? activeTerminal : undefined;
  }

  private async restoreActivePanelTerminal(terminal: vscode.Terminal | undefined): Promise<void> {
    if (!terminal) {
      return;
    }

    const projection = Array.from(this.projections.values()).find(
      (candidate) => candidate.terminal === terminal,
    );
    if (!projection || projection.location.type !== "panel") {
      return;
    }

    await this.showTerminal(terminal, true);
  }

  private async runWithoutActivationEvents<T>(callback: () => Promise<T>): Promise<T> {
    this.suppressActivationEvents += 1;
    try {
      return await callback();
    } finally {
      this.suppressActivationEvents = Math.max(0, this.suppressActivationEvents - 1);
    }
  }

  private async runUiAction<T>(callback: () => Promise<T> | T): Promise<T> {
    await delay(getExperimentalZmxActionDelayMs());
    return await callback();
  }

  private async showTerminal(
    terminal: vscode.Terminal | undefined,
    preserveFocus: boolean,
  ): Promise<void> {
    if (!terminal) {
      return;
    }

    await this.runUiAction(() => {
      terminal.show(preserveFocus);
    });
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
      environment.VSMUX_SESSION_ID = sessionId;
      environment.VSMUX_SESSION_STATE_FILE = this.getSessionAgentStateFilePath(sessionId);
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

    this.disposeProjectionTerminal(sessionId, projection.terminal);
  }

  private disposeProjectionTerminal(sessionId: string, terminal: vscode.Terminal): void {
    this.terminalToSessionId.delete(terminal);
    terminal.dispose();

    if (this.projections.get(sessionId)?.terminal === terminal) {
      this.projections.delete(sessionId);
    }
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
        ? await this.readSessionHistoryState(sessionName)
        : undefined;
      const nextTitle = historyState?.title ?? agentState.state.title?.trim();
      this.updateLastTerminalActivity(
        sessionId,
        agentState,
        historyState,
        nextTitle,
        previousTitle,
        refreshStartedAt,
      );
      const nextStatus: TerminalSessionStatus = runningSessionNames.has(sessionName)
        ? "running"
        : previousSession?.status === "running"
          ? "exited"
          : (previousSession?.status ?? "disconnected");
      const hasClaudeWorkingStatus =
        Boolean(historyState?.hasClaudeSessionTitle) && Boolean(historyState?.hasInterruptStatus);
      const hasClaudeAttentionStatus =
        Boolean(historyState?.hasClaudeSessionTitle) &&
        !historyState?.hasInterruptStatus &&
        previousSession?.agentName === "claude" &&
        previousSession.agentStatus === "working";
      const nextAgentStatus =
        runningSessionNames.has(sessionName) && hasClaudeWorkingStatus
          ? "working"
          : runningSessionNames.has(sessionName) && hasClaudeAttentionStatus
            ? "attention"
            : agentState.state.agentStatus;
      const nextSession: TerminalSessionSnapshot = runningSessionNames.has(sessionName)
        ? {
            ...this.createRunningSessionSnapshot(sessionId),
            agentName:
              agentState.state.agentName ??
              (hasClaudeWorkingStatus ||
              hasClaudeAttentionStatus ||
              historyState?.hasClaudeSessionTitle
                ? "claude"
                : undefined) ??
              previousSession?.agentName,
            agentStatus: nextAgentStatus,
          }
        : {
            ...(previousSession ??
              createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId)),
            agentName: agentState.state.agentName ?? previousSession?.agentName,
            agentStatus:
              nextStatus === "exited" && agentState.state.agentStatus === "working"
                ? "idle"
                : agentState.state.agentStatus,
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
  ): Promise<SessionHistoryState | undefined> {
    try {
      const history = await this.runZmxCommand(["history", sessionName, "--vt"]);
      const historyTitle =
        extractLatestTerminalTitleFromVtHistory(history) ??
        extractClaudeCodeTitleFromVtHistory(history);
      return {
        hasClaudeSessionTitle: Boolean(historyTitle?.includes("Claude Code")),
        hasInterruptStatus: hasInterruptStatusInVtHistory(history),
        textTail: extractTerminalTextTailFromVtHistory(history),
        title: historyTitle,
      };
    } catch {
      return undefined;
    }
  }

  private updateLastTerminalActivity(
    sessionId: string,
    agentState: ReadSessionAgentStateResult,
    historyState: SessionHistoryState | undefined,
    nextTitle: string | undefined,
    previousTitle: string | undefined,
    observedAt: number,
  ): void {
    const previousAgentStateModifiedAt = this.lastAgentStateModifiedAtBySessionId.get(sessionId);
    const nextAgentStateModifiedAt = agentState.modifiedAt;
    if (nextAgentStateModifiedAt !== undefined) {
      this.lastAgentStateModifiedAtBySessionId.set(sessionId, nextAgentStateModifiedAt);
      if (nextAgentStateModifiedAt !== previousAgentStateModifiedAt) {
        this.lastTerminalActivityAtBySessionId.set(sessionId, observedAt);
        return;
      }
    } else {
      this.lastAgentStateModifiedAtBySessionId.delete(sessionId);
    }

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

  private async readSessionAgentState(sessionId: string): Promise<ReadSessionAgentStateResult> {
    const stateFilePath = this.getSessionAgentStateFilePath(sessionId);
    try {
      const [rawState, fileStats] = await Promise.all([
        readFile(stateFilePath, "utf8"),
        stat(stateFilePath),
      ]);
      return {
        modifiedAt: Number.isFinite(fileStats.mtimeMs) ? fileStats.mtimeMs : undefined,
        state: parsePersistedSessionState(rawState),
      };
    } catch {
      return {
        modifiedAt: undefined,
        state: {
          agentName: undefined,
          agentStatus: "idle",
          title: undefined,
        },
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
        title: title === undefined ? existingState.state.title : (title ?? undefined),
      }),
      { mode: 0o600 },
    );
  }
}

function cloneSnapshot(snapshot: SessionGridSnapshot): SessionGridSnapshot {
  return {
    ...snapshot,
    sessions: [...snapshot.sessions],
    visibleSessionIds: [...snapshot.visibleSessionIds],
  };
}

function getExperimentalZmxActionDelayMs(): number {
  const configuredDelay =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(EXPERIMENTAL_ZMX_ACTION_DELAY_MS_SETTING, 0) ?? 0;

  return Number.isFinite(configuredDelay) ? Math.max(0, configuredDelay) : 0;
}

function shouldParkHiddenZmxTerminalsInPanel(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(EXPERIMENTAL_PARK_HIDDEN_ZMX_TERMINALS_IN_PANEL_SETTING, false) ?? false
  );
}

function delay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}
