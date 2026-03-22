import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type {
  NativeTerminalBackendDebugState,
  NativeTerminalDebugMoveAction,
  NativeTerminalDebugMoveHistoryEntry,
  NativeTerminalDebugProjection,
} from "../shared/native-terminal-debug-contract";
import {
  isBrowserSession,
  isT3Session,
  isTerminalSession,
  type SessionGridSnapshot,
  type SessionRecord,
} from "../shared/session-grid-contract";
import {
  createParkedTerminalReconcilePlan,
  type ParkedTerminalReconcilePlan,
} from "../shared/session-grid-parked-terminal-plan";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
  TerminalSessionStatus,
} from "../shared/terminal-host-protocol";
import { ensureAgentShellIntegration, type AgentShellIntegration } from "./agent-shell-integration";
import {
  createManagedTerminalEnvironment,
  getManagedTerminalIdentity,
} from "./native-managed-terminal";
import type {
  TerminalWorkspaceBackend,
  TerminalWorkspaceBackendTitleChange,
} from "./terminal-workspace-backend";
import {
  applyEditorLayout,
  createBlockedSessionSnapshot,
  createDisconnectedSessionSnapshot,
  doesCurrentEditorLayoutMatch,
  focusEditorGroupByIndex,
  getActiveEditorGroupViewColumn,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getWorkspaceStorageKey,
  getViewColumn,
  lockActiveEditorGroup,
  moveActiveEditorToNextGroup,
  moveActiveEditorToPreviousGroup,
  moveActiveTerminalToEditor,
  moveActiveTerminalToPanel,
  parsePersistedSessionState,
  serializePersistedSessionState,
  unlockActiveEditorGroup,
  type PersistedSessionState,
} from "./terminal-workspace-helpers";
import { createWorkspaceTrace, RuntimeTrace } from "./runtime-trace";

const SETTINGS_SECTION = "VSmux";
const MATCH_VISIBLE_TERMINAL_ORDER_SETTING = "matchVisibleTerminalOrderInSessionsArea";
const NATIVE_TERMINAL_ACTION_DELAY_MS_SETTING = "nativeTerminalActionDelayMs";
const KEEP_SESSION_GROUPS_UNLOCKED_SETTING = "keepSessionGroupsUnlocked";
const DEBUGGING_MODE_SETTING = "debuggingMode";
const LEGACY_DO_NOT_CHANGE_EDITOR_GROUP_LOCKS_SETTING = "nativeTerminalDoNotChangeEditorGroupLocks";
const AGENT_STATE_DIR_NAME = "terminal-session-state";
const POLL_INTERVAL_MS = 750;
const RESTORE_SETTLE_INTERVAL_MS = 150;
const RESTORE_SETTLE_TIMEOUT_MS = 1_500;
const ACTIVE_TERMINAL_SETTLE_INTERVAL_MS = 25;
const ACTIVE_TERMINAL_SETTLE_TIMEOUT_MS = 250;
const MOVE_LOCATION_SETTLE_INTERVAL_MS = 25;
const MOVE_LOCATION_SETTLE_TIMEOUT_MS = 300;
const SINGLE_SLOT_SWAP_PARK_RETRY_LIMIT = 3;
const WINDOW_FOCUS_SETTLE_INTERVAL_MS = 50;
const WINDOW_FOCUS_SETTLE_TIMEOUT_MS = 5_000;
const TERMINAL_RENAME_COMMAND = "workbench.action.terminal.renameWithArg";
const TRACE_FILE_NAME = "native-terminal-reconcile.log";
const PROCESS_ID_ASSOCIATIONS_KEY = "nativeTerminalProcessIdBySession";
const MOVE_HISTORY_LIMIT = 40;

type NativeTerminalWorkspaceBackendOptions = {
  context: vscode.ExtensionContext;
  ensureShellSpawnAllowed: () => Promise<boolean>;
  workspaceId: string;
};

type ProjectionLocation =
  | {
      type: "editor";
      visibleIndex: number;
    }
  | {
      type: "panel";
    };

type SessionProjection = {
  location: ProjectionLocation;
  sessionId: string;
  terminal: vscode.Terminal;
};

type ReadSessionAgentStateResult = {
  modifiedAt?: number;
  state: PersistedSessionState;
};

export class NativeTerminalWorkspaceBackend implements TerminalWorkspaceBackend {
  private agentShellIntegration: AgentShellIntegration | undefined;
  private readonly activateSessionEmitter = new vscode.EventEmitter<string>();
  private readonly changeDebugStateEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionsEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionTitleEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendTitleChange>();
  private readonly createdTerminals = new Set<vscode.Terminal>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly lastAgentStateModifiedAtBySessionId = new Map<string, number>();
  private readonly lastTerminalActivityAtBySessionId = new Map<string, number>();
  private lastVisibleSnapshot: SessionGridSnapshot | undefined;
  private pollTimer: NodeJS.Timeout | undefined;
  private readonly projections = new Map<string, SessionProjection>();
  private readonly sessionAliases = new Map<string, string>();
  private readonly sessionIdByProcessId = new Map<number, string>();
  private readonly sessionTitles = new Map<string, string>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();
  private suppressActivationEvents = 0;
  private readonly terminalToSessionId = new Map<vscode.Terminal, string>();
  private readonly trace: RuntimeTrace;
  private readonly trackedSessionIds = new Set<string>();
  private processAssociationWrite: Promise<void> = Promise.resolve();
  private reconcileWrite: Promise<void> = Promise.resolve();
  private currentMoveAction: NativeTerminalDebugMoveAction | undefined;
  private readonly moveHistory: NativeTerminalDebugMoveHistoryEntry[] = [];
  private managedTerminalDiscoveryVersion = 0;
  private matchVisibleTerminalOrder = false;
  private nativeTerminalActionDelayMs = 0;
  private keepSessionGroupsUnlocked = true;

  public readonly onDidActivateSession = this.activateSessionEmitter.event;
  public readonly onDidChangeDebugState = this.changeDebugStateEmitter.event;
  public readonly onDidChangeSessions = this.changeSessionsEmitter.event;
  public readonly onDidChangeSessionTitle = this.changeSessionTitleEmitter.event;

  public constructor(private readonly options: NativeTerminalWorkspaceBackendOptions) {
    this.trace = createWorkspaceTrace(TRACE_FILE_NAME);
  }

  public async initialize(sessionRecords: readonly SessionRecord[]): Promise<void> {
    void this.trace.reset();
    void this.trace.log("INIT", "initialize", {
      sessionIds: sessionRecords.map((sessionRecord) => sessionRecord.sessionId),
      sessionNames: sessionRecords.map((sessionRecord) => ({
        alias: sessionRecord.alias,
        sessionId: sessionRecord.sessionId,
      })),
      workspaceId: this.options.workspaceId,
    });

    this.agentShellIntegration = await ensureAgentShellIntegration(
      path.join(this.options.context.globalStorageUri.fsPath, "terminal-host-daemon"),
    );
    this.loadStoredProcessAssociations();

    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        void this.trace.log("OPEN", "onDidOpenTerminal", this.describeTerminal(terminal));
        void this.attachManagedTerminal(terminal);
        this.emitDebugStateChange();
      }),
      vscode.window.onDidCloseTerminal((terminal) => {
        const sessionId = this.terminalToSessionId.get(terminal);
        if (!sessionId) {
          return;
        }

        void this.trace.log("CLOSE", "onDidCloseTerminal", {
          sessionId,
          terminal: this.describeTerminal(terminal),
        });
        void this.clearProcessAssociation(sessionId);
        this.createdTerminals.delete(terminal);
        this.terminalToSessionId.delete(terminal);
        if (this.projections.get(sessionId)?.terminal === terminal) {
          this.projections.delete(sessionId);
        }

        const previousSession =
          this.sessions.get(sessionId) ??
          createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId);
        this.sessions.set(sessionId, {
          ...previousSession,
          agentStatus:
            previousSession.agentStatus === "working" ? "idle" : previousSession.agentStatus,
          endedAt: previousSession.endedAt ?? new Date().toISOString(),
          exitCode: terminal.exitStatus?.code ?? previousSession.exitCode ?? 0,
          status: "exited",
        });
        this.changeSessionsEmitter.fire();
        this.emitDebugStateChange();
      }),
      vscode.window.onDidChangeActiveTerminal((terminal) => {
        if (this.suppressActivationEvents > 0 || !terminal) {
          return;
        }

        const sessionId = this.terminalToSessionId.get(terminal);
        if (sessionId) {
          this.activateSessionEmitter.fire(sessionId);
        }
      }),
      vscode.window.onDidChangeTerminalState((terminal) => {
        void this.attachManagedTerminal(terminal);
        const sessionId = this.terminalToSessionId.get(terminal);
        if (!sessionId) {
          return;
        }

        const projection = this.projections.get(sessionId);
        if (projection) {
          projection.location = this.resolveProjectionLocation(terminal);
        }
        this.emitDebugStateChange();
      }),
    );
    await this.syncConfiguration();

    for (const sessionRecord of sessionRecords) {
      this.trackedSessionIds.add(sessionRecord.sessionId);
      this.sessionAliases.set(
        sessionRecord.sessionId,
        this.getDisplayNameForSession(sessionRecord.sessionId, sessionRecord.alias),
      );
    }

    void this.trace.log("RESTORE", "beforeRestoreManagedTerminals", {
      knownAliases: Object.fromEntries(this.sessionAliases),
      processAssociations: Object.fromEntries(this.sessionIdByProcessId),
      trackedSessionIds: [...this.trackedSessionIds],
      windowTerminals: vscode.window.terminals.map((terminal) => this.describeTerminal(terminal)),
    });
    await this.restoreManagedTerminals();
    await this.waitForRestoreSettled();
    await this.restoreManagedTerminals();
    await this.syncProjectionTerminalNames();
    await this.refreshSessionSnapshots();
    void this.trace.log("INIT", "initializeComplete", this.captureLayoutState());
    this.emitDebugStateChange();

    this.pollTimer = setInterval(() => {
      void this.refreshSessionSnapshots().catch(() => {
        // keep polling on transient filesystem or terminal API failures
      });
    }, POLL_INTERVAL_MS);
  }

  public getLastTerminalActivityAt(sessionId: string): number | undefined {
    return this.lastTerminalActivityAtBySessionId.get(sessionId);
  }

  public async clearDebugArtifacts(): Promise<void> {
    this.moveHistory.length = 0;
    await this.trace.reset();
    this.emitDebugStateChange();
  }

  public getDebugState(): NativeTerminalBackendDebugState {
    return {
      currentMoveAction: this.currentMoveAction
        ? {
            ...this.currentMoveAction,
          }
        : undefined,
      lastVisibleSnapshot: this.lastVisibleSnapshot
        ? cloneSnapshot(this.lastVisibleSnapshot)
        : undefined,
      layout: this.captureDebugLayoutState(),
      matchVisibleTerminalOrder: this.matchVisibleTerminalOrder,
      moveHistory: [...this.moveHistory],
      nativeTerminalActionDelayMs: this.nativeTerminalActionDelayMs,
      observedAt: new Date().toISOString(),
      workspaceId: this.options.workspaceId,
    };
  }

  public hasLiveTerminal(sessionId: string): boolean {
    const projection = this.projections.get(sessionId);
    return Boolean(
      projection &&
      !projection.terminal.exitStatus &&
      vscode.window.terminals.includes(projection.terminal),
    );
  }

  public dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    this.activateSessionEmitter.dispose();
    this.changeDebugStateEmitter.dispose();
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
    this.emitDebugStateChange();
    return true;
  }

  public async createOrAttachSession(
    sessionRecord: SessionRecord,
  ): Promise<TerminalSessionSnapshot> {
    this.trackedSessionIds.add(sessionRecord.sessionId);
    this.sessionAliases.set(
      sessionRecord.sessionId,
      this.getDisplayNameForSession(sessionRecord.sessionId, sessionRecord.alias),
    );

    const existingProjection = this.projections.get(sessionRecord.sessionId);
    if (existingProjection && !existingProjection.terminal.exitStatus) {
      await this.syncTerminalName(existingProjection.terminal, sessionRecord.sessionId, true);
      const snapshot = this.createRunningSessionSnapshot(sessionRecord.sessionId);
      this.sessions.set(sessionRecord.sessionId, snapshot);
      this.emitDebugStateChange();
      return snapshot;
    }

    const snapshot =
      this.sessions.get(sessionRecord.sessionId) ??
      createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId);
    await this.writeSessionAgentState(sessionRecord.sessionId, "idle", undefined, null);
    this.sessions.set(sessionRecord.sessionId, snapshot);
    this.changeSessionsEmitter.fire();
    this.emitDebugStateChange();
    return snapshot;
  }

  public canReuseVisibleLayout(snapshot: SessionGridSnapshot): boolean {
    const reconcileSnapshot = this.getReconcileSnapshot(snapshot);
    const visibleTerminalEntries = this.getVisibleTerminalEntries(reconcileSnapshot);
    const editorProjections = this.getEditorProjections();
    if (editorProjections.size !== visibleTerminalEntries.length) {
      return false;
    }

    return visibleTerminalEntries.every(({ sessionId, visibleIndex }) => {
      const projection = editorProjections.get(sessionId);
      return (
        projection?.location.type === "editor" && projection.location.visibleIndex === visibleIndex
      );
    });
  }

  public async focusSession(sessionId: string, preserveFocus = false): Promise<boolean> {
    this.syncClosedProjections();
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
    const projection = this.projections.get(sessionId);
    if (projection) {
      this.createdTerminals.delete(projection.terminal);
      this.terminalToSessionId.delete(projection.terminal);
      projection.terminal.dispose();
      this.projections.delete(sessionId);
    }

    this.trackedSessionIds.delete(sessionId);
    this.lastAgentStateModifiedAtBySessionId.delete(sessionId);
    this.lastTerminalActivityAtBySessionId.delete(sessionId);
    this.sessionAliases.delete(sessionId);
    this.sessionTitles.delete(sessionId);
    this.sessions.delete(sessionId);
    await this.clearProcessAssociation(sessionId);
    await this.deleteSessionAgentState(sessionId);
    this.changeSessionsEmitter.fire();
    this.emitDebugStateChange();
  }

  public async reconcileVisibleTerminals(
    snapshot: SessionGridSnapshot,
    preserveFocus = false,
  ): Promise<void> {
    const queuedSnapshot = cloneSnapshot(snapshot);
    const reconcilePromise = this.reconcileWrite.then(() =>
      this.reconcileVisibleTerminalsInternal(queuedSnapshot, preserveFocus),
    );
    this.reconcileWrite = reconcilePromise.catch(() => undefined);
    await reconcilePromise;
  }

  private async reconcileVisibleTerminalsInternal(
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    this.setCurrentMoveAction({
      kind: "reconcileVisibleTerminals",
      sessionId: snapshot.focusedSessionId,
      startedAt: new Date().toISOString(),
    });
    try {
      this.syncClosedProjections();
      const reconcileSnapshot = this.getReconcileSnapshot(snapshot);
      const previousSnapshot = this.lastVisibleSnapshot;
      this.lastVisibleSnapshot = cloneSnapshot(reconcileSnapshot);
      void this.trace.log("RECONCILE", "start", {
        nextVisibleSessionIds: [...snapshot.visibleSessionIds],
        reconciledVisibleSessionIds: [...reconcileSnapshot.visibleSessionIds],
        orderMode: this.matchVisibleTerminalOrder ? "match-sessions-area" : "stable-placement",
        previousVisibleSessionIds: previousSnapshot?.visibleSessionIds ?? [],
        preserveFocus,
        state: this.captureLayoutState(),
      });

      await this.runWithoutActivationEvents(async () => {
        this.refreshProjectionLocations();
        await this.restoreManagedTerminals();
        await this.ensureParkedProjections(reconcileSnapshot.sessions);

        const plan = createParkedTerminalReconcilePlan(previousSnapshot, reconcileSnapshot);
        if (
          plan.strategy === "transfer" &&
          this.canIncrementallyReconcileWithParkedProjections(previousSnapshot)
        ) {
          await this.applyParkedTerminalTransferPlan(reconcileSnapshot, plan, preserveFocus);
        } else {
          await this.reconcileVisibleTerminalsByMovingParkedProjections(
            reconcileSnapshot,
            preserveFocus,
          );
        }

        this.refreshProjectionLocations();
        if (!this.hasExpectedVisibleLayout(reconcileSnapshot)) {
          void this.trace.log("LAYOUT", "cleanupPassTriggered", {
            nextVisibleSessionIds: [...reconcileSnapshot.visibleSessionIds],
            state: this.captureLayoutState(),
          });
          await this.reconcileVisibleTerminalsByMovingParkedProjections(
            reconcileSnapshot,
            preserveFocus,
          );
          this.refreshProjectionLocations();
        }
        await this.ensureSessionGroupsUnlocked();
      });
      void this.trace.log("RECONCILE", "complete", {
        nextVisibleSessionIds: [...snapshot.visibleSessionIds],
        reconciledVisibleSessionIds: [...reconcileSnapshot.visibleSessionIds],
        state: this.captureLayoutState(),
      });
    } finally {
      this.completeCurrentMoveAction();
    }
  }

  public async renameSession(sessionRecord: SessionRecord): Promise<void> {
    this.sessionAliases.set(
      sessionRecord.sessionId,
      this.getDisplayNameForSession(sessionRecord.sessionId, sessionRecord.alias),
    );
    const projection = this.projections.get(sessionRecord.sessionId);
    if (projection) {
      await this.syncTerminalName(projection.terminal, sessionRecord.sessionId, true);
    }
    this.emitDebugStateChange();
  }

  public async restartSession(sessionRecord: SessionRecord): Promise<TerminalSessionSnapshot> {
    await this.killSession(sessionRecord.sessionId);
    return this.createOrAttachSession(sessionRecord);
  }

  public async syncConfiguration(): Promise<void> {
    const configuration = vscode.workspace.getConfiguration(SETTINGS_SECTION);
    this.matchVisibleTerminalOrder =
      configuration.get<boolean>(MATCH_VISIBLE_TERMINAL_ORDER_SETTING, false) ?? false;
    this.nativeTerminalActionDelayMs = Math.max(
      0,
      Math.floor(configuration.get<number>(NATIVE_TERMINAL_ACTION_DELAY_MS_SETTING, 0) ?? 0),
    );
    this.keepSessionGroupsUnlocked =
      configuration.get<boolean>(
        KEEP_SESSION_GROUPS_UNLOCKED_SETTING,
        configuration.get<boolean>(LEGACY_DO_NOT_CHANGE_EDITOR_GROUP_LOCKS_SETTING, true) ?? true,
      ) ?? true;
    this.trace.setEnabled(configuration.get<boolean>(DEBUGGING_MODE_SETTING, false) ?? false);
    this.emitDebugStateChange();
  }

  public async writeText(sessionId: string, data: string, shouldExecute = false): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection || data.length === 0) {
      return;
    }

    projection.terminal.sendText(data, shouldExecute);
  }

  private async restoreManagedTerminals(): Promise<void> {
    for (const terminal of vscode.window.terminals) {
      await this.attachManagedTerminal(terminal);
    }
  }

  private async attachManagedTerminal(terminal: vscode.Terminal): Promise<void> {
    const identity = await this.resolveManagedTerminalIdentity(terminal);
    if (!identity || identity.workspaceId !== this.options.workspaceId) {
      return;
    }

    const previousProjection = this.projections.get(identity.sessionId);
    if (previousProjection?.terminal === terminal) {
      previousProjection.location = this.resolveProjectionLocation(terminal);
      void this.trace.log("ATTACH", "reuseExistingProjection", {
        sessionId: identity.sessionId,
        terminal: this.describeTerminal(terminal),
      });
      this.emitDebugStateChange();
      return;
    }

    if (previousProjection) {
      void this.trace.log("REPLACE", "replacingProjectionTerminal", {
        previousTerminal: this.describeTerminal(previousProjection.terminal),
        replacementTerminal: this.describeTerminal(terminal),
        sessionId: identity.sessionId,
      });
      this.terminalToSessionId.delete(previousProjection.terminal);
      if (this.createdTerminals.has(previousProjection.terminal)) {
        this.createdTerminals.delete(previousProjection.terminal);
        previousProjection.terminal.dispose();
        void this.trace.log("REPLACE", "disposedCreatedPlaceholder", {
          sessionId: identity.sessionId,
          terminal: this.describeTerminal(previousProjection.terminal),
        });
      }
    }

    this.trackedSessionIds.add(identity.sessionId);
    this.projections.set(identity.sessionId, {
      location: this.resolveProjectionLocation(terminal),
      sessionId: identity.sessionId,
      terminal,
    });
    this.managedTerminalDiscoveryVersion += 1;
    this.terminalToSessionId.set(terminal, identity.sessionId);
    this.sessions.set(identity.sessionId, this.createRunningSessionSnapshot(identity.sessionId));
    this.changeSessionsEmitter.fire();
    void this.captureProcessAssociation(identity.sessionId, terminal);
    void this.trace.log("ATTACH", "attachedManagedTerminal", {
      location: this.describeProjectionLocation(this.projections.get(identity.sessionId)?.location),
      sessionId: identity.sessionId,
      terminal: this.describeTerminal(terminal),
    });
    void this.syncTerminalName(terminal, identity.sessionId, true);
    this.emitDebugStateChange();
  }

  private async waitForRestoreSettled(): Promise<void> {
    if (this.trackedSessionIds.size === 0) {
      return;
    }

    const deadline = Date.now() + RESTORE_SETTLE_TIMEOUT_MS;
    let observedDiscoveryVersion = this.managedTerminalDiscoveryVersion;

    while (Date.now() < deadline) {
      await delay(RESTORE_SETTLE_INTERVAL_MS);
      if (this.managedTerminalDiscoveryVersion === observedDiscoveryVersion) {
        void this.trace.log("RESTORE", "settled", {
          discoveryVersion: this.managedTerminalDiscoveryVersion,
          state: this.captureLayoutState(),
        });
        return;
      }

      observedDiscoveryVersion = this.managedTerminalDiscoveryVersion;
    }

    void this.trace.log("RESTORE", "settleTimeout", {
      discoveryVersion: this.managedTerminalDiscoveryVersion,
      state: this.captureLayoutState(),
    });
  }

  private async resolveManagedTerminalIdentity(
    terminal: vscode.Terminal,
  ): Promise<{ sessionId: string; workspaceId: string } | undefined> {
    const envIdentity = getManagedTerminalIdentity(terminal);
    if (envIdentity) {
      return envIdentity;
    }

    const processId = await this.getTerminalProcessId(terminal);
    if (processId) {
      const sessionId = this.sessionIdByProcessId.get(processId);
      if (sessionId) {
        return {
          sessionId,
          workspaceId: this.options.workspaceId,
        };
      }
    }

    const terminalName = terminal.name ?? terminal.creationOptions.name;
    if (!terminalName) {
      return undefined;
    }

    const matchingSessionIds = Array.from(this.sessionAliases.entries())
      .filter(([, alias]) => alias === terminalName)
      .map(([sessionId]) => sessionId);
    if (matchingSessionIds.length !== 1) {
      return undefined;
    }

    return {
      sessionId: matchingSessionIds[0],
      workspaceId: this.options.workspaceId,
    };
  }

  private resolveProjectionLocation(terminal: vscode.Terminal): ProjectionLocation {
    const visibleIndex = this.findVisibleIndexForTerminal(terminal);
    if (visibleIndex === undefined) {
      return { type: "panel" };
    }

    return {
      type: "editor",
      visibleIndex,
    };
  }

  private findVisibleIndexForTerminal(terminal: vscode.Terminal): number | undefined {
    const matchingGroup = vscode.window.tabGroups.all.find((group) =>
      group.tabs.some(
        (tab) => tab.input instanceof vscode.TabInputTerminal && tab.label === terminal.name,
      ),
    );
    if (!matchingGroup?.viewColumn || matchingGroup.viewColumn <= 0) {
      return undefined;
    }

    return matchingGroup.viewColumn - 1;
  }

  private async ensureParkedProjections(sessionRecords: readonly SessionRecord[]): Promise<void> {
    let changed = false;

    for (const sessionRecord of sessionRecords) {
      if (!isTerminalSession(sessionRecord)) {
        continue;
      }

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

      void this.trace.log("CREATE", "ensureParkedProjection", {
        alias: sessionRecord.alias,
        sessionId: sessionRecord.sessionId,
      });
      await this.createProjection(sessionRecord, "panel");
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

    if (this.hasVisibleNonTerminalSessions(snapshot)) {
      return false;
    }

    const visibleTerminalEntries = this.getVisibleTerminalEntries(snapshot);
    const editorProjections = this.getEditorProjections();
    if (editorProjections.size !== visibleTerminalEntries.length) {
      return false;
    }

    if (visibleTerminalEntries.some(({ sessionId }) => !editorProjections.has(sessionId))) {
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

    if (await this.tryApplyStableSingleSlotReplacement(snapshot, plan, preserveFocus)) {
      return;
    }

    for (const step of plan.demoteSteps) {
      await this.moveProjectionToPanel(step.sessionId);
    }

    for (const step of plan.promoteSteps) {
      await this.moveProjectionToEditor(step.sessionId, step.slotIndex);
    }

    await this.ensureDesiredEditorLayoutShape(snapshot);

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
    }
  }

  private async tryApplyStableSingleSlotReplacement(
    snapshot: SessionGridSnapshot,
    plan: Extract<ParkedTerminalReconcilePlan, { strategy: "transfer" }>,
    preserveFocus: boolean,
  ): Promise<boolean> {
    if (
      this.matchVisibleTerminalOrder ||
      plan.demoteSteps.length !== 1 ||
      plan.promoteSteps.length !== 1 ||
      plan.currentVisibleSessionIds.length !== snapshot.visibleSessionIds.length
    ) {
      return false;
    }

    const demoteStep = plan.demoteSteps[0];
    const promoteStep = plan.promoteSteps[0];
    if (demoteStep.slotIndex !== promoteStep.slotIndex) {
      return false;
    }

    void this.trace.log("RECONCILE", "singleSlotSwap:start", {
      demoteSessionId: demoteStep.sessionId,
      promoteSessionId: promoteStep.sessionId,
      slotIndex: demoteStep.slotIndex,
    });
    this.setCurrentMoveAction({
      desiredVisibleIndex: promoteStep.slotIndex,
      kind: "singleSlotSwap",
      sessionId: promoteStep.sessionId,
      startedAt: new Date().toISOString(),
    });

    const demoteProjection = this.projections.get(demoteStep.sessionId);
    const targetGroupVisibleIndex =
      demoteProjection?.location.type === "editor"
        ? demoteProjection.location.visibleIndex
        : promoteStep.slotIndex;

    void this.trace.log("RECONCILE", "singleSlotSwap:incomingFirst", {
      targetGroupVisibleIndex,
      slotIndex: demoteStep.slotIndex,
    });
    await this.moveProjectionToEditor(promoteStep.sessionId, promoteStep.slotIndex, {
      targetGroupVisibleIndex,
    });
    this.refreshProjectionLocations();

    const promotedProjection = this.projections.get(promoteStep.sessionId);
    if (
      !promotedProjection ||
      promotedProjection.location.type !== "editor" ||
      promotedProjection.location.visibleIndex !== promoteStep.slotIndex
    ) {
      void this.trace.log("RECONCILE", "singleSlotSwap:fallback", {
        reason: "promote-did-not-land",
        sessionId: promoteStep.sessionId,
        state: this.captureLayoutState(),
      });
      this.completeCurrentMoveAction("fallback", "promote-did-not-land");
      return false;
    }

    const parked = await this.parkProjectionToPanelWithRetry(demoteStep.sessionId);
    if (!parked) {
      void this.trace.log("RECONCILE", "singleSlotSwap:fallback", {
        reason: "demote-did-not-park",
        sessionId: demoteStep.sessionId,
        state: this.captureLayoutState(),
      });
      this.completeCurrentMoveAction("fallback", "demote-did-not-park");
      return false;
    }

    await this.ensureDesiredEditorLayoutShape(snapshot);
    this.refreshProjectionLocations();

    if (!this.hasExpectedVisibleLayout(snapshot)) {
      void this.trace.log("RECONCILE", "singleSlotSwap:fallback", {
        reason: "post-swap-layout-mismatch",
        state: this.captureLayoutState(),
      });
      this.completeCurrentMoveAction("fallback", "post-swap-layout-mismatch");
      return false;
    }

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (focusedSessionId) {
      await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
    }

    void this.trace.log("RECONCILE", "singleSlotSwap:complete", {
      slotIndex: demoteStep.slotIndex,
      state: this.captureLayoutState(),
    });
    this.completeCurrentMoveAction();
    return true;
  }

  private async parkProjectionToPanelWithRetry(sessionId: string): Promise<boolean> {
    for (let attempt = 0; attempt < SINGLE_SLOT_SWAP_PARK_RETRY_LIMIT; attempt += 1) {
      await this.moveProjectionToPanel(sessionId);
      this.refreshProjectionLocations();

      const projection = this.projections.get(sessionId);
      if (!projection || projection.location.type === "panel") {
        return true;
      }

      if (attempt + 1 >= SINGLE_SLOT_SWAP_PARK_RETRY_LIMIT) {
        break;
      }

      void this.trace.log("MOVE", "toPanel:retry", {
        attempt: attempt + 2,
        resultingLocation: this.describeProjectionLocation(projection.location),
        sessionId,
        terminal: this.describeTerminal(projection.terminal),
      });
      await delay(MOVE_LOCATION_SETTLE_INTERVAL_MS);
    }

    return false;
  }

  private async reconcileVisibleTerminalsByMovingParkedProjections(
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    await this.promoteFocusedVisibleProjection(snapshot, focusedSessionId);
    const fullyParked = await this.parkHiddenEditorProjections(snapshot);

    if (snapshot.visibleSessionIds.length === 0) {
      return;
    }

    if (fullyParked) {
      await this.applyVisibleEditorLayout(snapshot);
    } else {
      void this.trace.log("LAYOUT", "skipApplyEditorLayout", {
        nextVisibleSessionIds: [...snapshot.visibleSessionIds],
        state: this.captureLayoutState(),
      });
    }

    for (let index = 0; index < snapshot.visibleSessionIds.length; index += 1) {
      const sessionId = snapshot.visibleSessionIds[index];
      if (!this.isTerminalSessionId(snapshot, sessionId)) {
        continue;
      }

      await this.moveProjectionToEditor(sessionId, index);
    }

    await this.ensureDesiredEditorLayoutShape(snapshot);

    if (focusedSessionId) {
      await this.showTerminal(this.projections.get(focusedSessionId)?.terminal, preserveFocus);
    }
  }

  private async parkHiddenEditorProjections(snapshot: SessionGridSnapshot): Promise<boolean> {
    const visibleSessionIdSet = new Set(snapshot.visibleSessionIds);

    for (const projection of this.getEditorProjections().values()) {
      if (visibleSessionIdSet.has(projection.sessionId)) {
        continue;
      }

      await this.moveProjectionToPanel(projection.sessionId);
    }

    this.refreshProjectionLocations();

    for (const projection of this.getEditorProjections().values()) {
      if (visibleSessionIdSet.has(projection.sessionId)) {
        continue;
      }

      return false;
    }

    return true;
  }

  private async promoteFocusedVisibleProjection(
    snapshot: SessionGridSnapshot,
    focusedSessionId: string | undefined,
  ): Promise<void> {
    if (!focusedSessionId) {
      return;
    }

    const visibleIndex = snapshot.visibleSessionIds.indexOf(focusedSessionId);
    if (visibleIndex < 0) {
      return;
    }

    const projection = this.projections.get(focusedSessionId);
    if (!projection || projection.location.type !== "panel") {
      return;
    }

    await this.moveProjectionToEditor(focusedSessionId, visibleIndex);
  }

  private async moveProjectionToEditor(
    sessionId: string,
    visibleIndex: number,
    options?: {
      targetGroupVisibleIndex?: number;
    },
  ): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return;
    }

    const targetGroupVisibleIndex = options?.targetGroupVisibleIndex ?? visibleIndex;
    if (
      projection.location.type === "editor" &&
      projection.location.visibleIndex === visibleIndex
    ) {
      return;
    }

    this.beginMoveAction("moveProjectionToEditor", sessionId, projection, visibleIndex);
    try {
      void this.trace.log("MOVE", "toEditor:start", {
        activeTerminal: this.describeOptionalTerminal(vscode.window.activeTerminal),
        currentLocation: this.describeProjectionLocation(projection.location),
        desiredVisibleIndex: visibleIndex,
        sessionId,
        terminal: this.describeTerminal(projection.terminal),
        targetGroupVisibleIndex,
      });

      if (projection.location.type === "panel") {
        await this.withUnlockedTargetEditorGroup(targetGroupVisibleIndex, async () => {
          await this.activateTerminalForMove(projection.terminal, "toEditor", sessionId, true);
          await this.runUiAction(() => focusEditorGroupByIndex(targetGroupVisibleIndex));
          await this.runUiAction(() => moveActiveTerminalToEditor());
        });
      } else {
        await this.activateTerminalForMove(projection.terminal, "toEditor", sessionId);
      }

      await this.focusTerminalEditorGroup(projection.terminal);
      await this.alignActiveEditorGroupToVisibleIndex(visibleIndex);
      projection.location = await this.waitForProjectionLocation(
        sessionId,
        (location) => location.type === "editor" && location.visibleIndex === visibleIndex,
        "toEditor",
      );
      void this.trace.log("MOVE", "toEditor:complete", {
        activeTerminal: this.describeOptionalTerminal(vscode.window.activeTerminal),
        resultingLocation: this.describeProjectionLocation(projection.location),
        sessionId,
        state: this.captureLayoutState(),
      });
    } finally {
      this.completeCurrentMoveAction();
    }
  }

  private async alignActiveEditorGroupToVisibleIndex(visibleIndex: number): Promise<void> {
    const expectedViewColumn = getViewColumn(visibleIndex);
    let activeViewColumn = getActiveEditorGroupViewColumn();
    let safetyCounter = 0;

    while (
      activeViewColumn !== undefined &&
      activeViewColumn > expectedViewColumn &&
      safetyCounter < 8
    ) {
      await this.runUiAction(() => moveActiveEditorToPreviousGroup());
      activeViewColumn = getActiveEditorGroupViewColumn();
      safetyCounter += 1;
    }

    while (
      activeViewColumn !== undefined &&
      activeViewColumn < expectedViewColumn &&
      safetyCounter < 8
    ) {
      await this.runUiAction(() => moveActiveEditorToNextGroup());
      activeViewColumn = getActiveEditorGroupViewColumn();
      safetyCounter += 1;
    }
  }

  private async moveProjectionToPanel(sessionId: string): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection || projection.location.type === "panel") {
      return;
    }

    this.beginMoveAction("moveProjectionToPanel", sessionId, projection);
    try {
      void this.trace.log("MOVE", "toPanel:start", {
        activeTerminal: this.describeOptionalTerminal(vscode.window.activeTerminal),
        currentLocation: this.describeProjectionLocation(projection.location),
        sessionId,
        terminal: this.describeTerminal(projection.terminal),
      });
      const actualLocation = this.resolveProjectionLocation(projection.terminal);
      if (actualLocation.type === "editor") {
        await this.runUiAction(() => focusEditorGroupByIndex(actualLocation.visibleIndex));
      } else {
        const recordedLocation = projection.location;
        if (recordedLocation.type === "editor") {
          await this.runUiAction(() => focusEditorGroupByIndex(recordedLocation.visibleIndex));
        }
      }
      await this.activateTerminalForMove(projection.terminal, "toPanel", sessionId);
      await this.runUiAction(() => moveActiveTerminalToPanel());
      projection.location = await this.waitForProjectionLocation(
        sessionId,
        (location) => location.type === "panel",
        "toPanel",
      );
      void this.trace.log("MOVE", "toPanel:complete", {
        activeTerminal: this.describeOptionalTerminal(vscode.window.activeTerminal),
        resultingLocation: this.describeProjectionLocation(projection.location),
        sessionId,
        state: this.captureLayoutState(),
      });
    } finally {
      this.completeCurrentMoveAction();
    }
  }

  private async focusTerminalEditorGroup(terminal: vscode.Terminal): Promise<void> {
    const location = this.resolveProjectionLocation(terminal);
    if (location.type !== "editor") {
      return;
    }

    await this.runUiAction(() => focusEditorGroupByIndex(location.visibleIndex));
  }

  private async withUnlockedTargetEditorGroup<T>(
    visibleIndex: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    if (this.keepSessionGroupsUnlocked) {
      void this.trace.log("MOVE", "unlockTargetGroup:skippedBySetting", {
        visibleIndex,
      });
      return await callback();
    }

    const targetGroup = this.getTabGroupByVisibleIndex(visibleIndex);
    if (!targetGroup) {
      return await callback();
    }

    const detectedLocked = Boolean((targetGroup as { isLocked?: boolean } | undefined)?.isLocked);
    void this.trace.log("MOVE", "unlockTargetGroup:start", {
      detectedLocked,
      visibleIndex,
    });
    await this.runUiAction(() => focusEditorGroupByIndex(visibleIndex));
    await this.runUiAction(() => unlockActiveEditorGroup());
    try {
      return await callback();
    } finally {
      await this.runUiAction(() => focusEditorGroupByIndex(visibleIndex));
      await this.runUiAction(() => lockActiveEditorGroup());
      void this.trace.log("MOVE", "unlockTargetGroup:complete", {
        detectedLocked,
        visibleIndex,
      });
    }
  }

  private getTabGroupByVisibleIndex(visibleIndex: number): vscode.TabGroup | undefined {
    const viewColumn = getViewColumn(visibleIndex);
    return vscode.window.tabGroups.all.find((group) => group.viewColumn === viewColumn);
  }

  private async ensureSessionGroupsUnlocked(): Promise<void> {
    if (!this.keepSessionGroupsUnlocked) {
      return;
    }

    const visibleIndices = Array.from(
      new Set(
        Array.from(this.projections.values()).flatMap((projection) =>
          projection.location.type === "editor" ? [projection.location.visibleIndex] : [],
        ),
      ),
    ).sort((left, right) => left - right);
    if (visibleIndices.length === 0) {
      return;
    }

    const activeViewColumn = getActiveEditorGroupViewColumn();
    const restoreVisibleIndex =
      typeof activeViewColumn === "number" ? Math.max(0, Number(activeViewColumn) - 1) : undefined;

    void this.trace.log("MOVE", "ensureSessionGroupsUnlocked:start", {
      restoreVisibleIndex,
      visibleIndices,
    });
    for (const visibleIndex of visibleIndices) {
      await this.runUiAction(() => focusEditorGroupByIndex(visibleIndex));
      await this.runUiAction(() => unlockActiveEditorGroup());
    }

    if (restoreVisibleIndex !== undefined) {
      await this.runUiAction(() => focusEditorGroupByIndex(restoreVisibleIndex));
    }

    void this.trace.log("MOVE", "ensureSessionGroupsUnlocked:complete", {
      restoreVisibleIndex,
      visibleIndices,
    });
  }

  private async waitForProjectionLocation(
    sessionId: string,
    matchesExpectedLocation: (location: ProjectionLocation) => boolean,
    moveKind: "toEditor" | "toPanel",
  ): Promise<ProjectionLocation> {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return { type: "panel" };
    }

    const deadline = Date.now() + MOVE_LOCATION_SETTLE_TIMEOUT_MS;
    let location = this.resolveProjectionLocation(projection.terminal);
    while (Date.now() < deadline) {
      if (matchesExpectedLocation(location)) {
        return location;
      }

      await delay(MOVE_LOCATION_SETTLE_INTERVAL_MS);
      location = this.resolveProjectionLocation(projection.terminal);
    }

    void this.trace.log("MOVE", "settleLocationTimeout", {
      moveKind,
      resultingLocation: this.describeProjectionLocation(location),
      sessionId,
      terminal: this.describeTerminal(projection.terminal),
    });
    return location;
  }

  private async applyVisibleEditorLayout(snapshot: SessionGridSnapshot): Promise<void> {
    await applyEditorLayout(snapshot.visibleSessionIds.length, snapshot.viewMode, {
      joinAllGroups: false,
    });
  }

  private async ensureDesiredEditorLayoutShape(snapshot: SessionGridSnapshot): Promise<void> {
    if (!this.hasExpectedVisibleLayout(snapshot)) {
      return;
    }

    const matchesDesiredLayout = await doesCurrentEditorLayoutMatch(
      snapshot.visibleSessionIds.length,
      snapshot.viewMode,
    );
    if (matchesDesiredLayout) {
      return;
    }

    await this.applyVisibleEditorLayout(snapshot);
    this.refreshProjectionLocations();
    for (let index = 0; index < snapshot.visibleSessionIds.length; index += 1) {
      const sessionId = snapshot.visibleSessionIds[index];
      if (!this.isTerminalSessionId(snapshot, sessionId)) {
        continue;
      }

      await this.moveProjectionToEditor(sessionId, index);
    }
    this.refreshProjectionLocations();
    void this.trace.log("LAYOUT", "reapplyDesiredShape", {
      nextVisibleSessionIds: [...snapshot.visibleSessionIds],
      state: this.captureLayoutState(),
      viewMode: snapshot.viewMode,
    });
  }

  private async createProjection(
    sessionRecord: SessionRecord,
    location: "panel" | { visibleIndex: number },
  ): Promise<SessionProjection> {
    void this.trace.log("CREATE", "createProjection:start", {
      alias: sessionRecord.alias,
      location,
      sessionId: sessionRecord.sessionId,
    });
    const terminalLocation =
      location === "panel"
        ? vscode.TerminalLocation.Panel
        : {
            preserveFocus: true,
            viewColumn: getViewColumn(location.visibleIndex),
          };
    const terminal = vscode.window.createTerminal({
      cwd: getDefaultWorkspaceCwd(),
      env: this.createTerminalEnvironment(sessionRecord.sessionId),
      iconPath: new vscode.ThemeIcon("terminal"),
      location: terminalLocation,
      name: this.getDisplayNameForSession(sessionRecord.sessionId, sessionRecord.alias),
      shellPath: getDefaultShell(),
    });

    this.createdTerminals.add(terminal);
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
    void this.captureProcessAssociation(sessionRecord.sessionId, terminal);
    void this.trace.log("CREATE", "createProjection:complete", {
      initialLocation: this.describeProjectionLocation(projection.location),
      sessionId: sessionRecord.sessionId,
      terminal: this.describeTerminal(terminal),
    });
    this.emitDebugStateChange();
    return projection;
  }

  private getEditorProjections(): Map<string, SessionProjection> {
    return new Map(
      Array.from(this.projections.entries()).filter(
        ([, projection]) => projection.location.type === "editor",
      ),
    );
  }

  private hasExpectedVisibleLayout(snapshot: SessionGridSnapshot): boolean {
    const visibleTerminalEntries = this.getVisibleTerminalEntries(snapshot);
    const editorProjections = this.getEditorProjections();
    if (editorProjections.size !== visibleTerminalEntries.length) {
      return false;
    }

    return visibleTerminalEntries.every(({ sessionId, visibleIndex }) => {
      const projection = this.projections.get(sessionId);
      return (
        projection?.location.type === "editor" && projection.location.visibleIndex === visibleIndex
      );
    });
  }

  private getReconcileSnapshot(snapshot: SessionGridSnapshot): SessionGridSnapshot {
    if (
      this.matchVisibleTerminalOrder ||
      snapshot.visibleSessionIds.length <= 1 ||
      this.hasVisibleNonTerminalSessions(snapshot)
    ) {
      return cloneSnapshot(snapshot);
    }

    const targetVisibleCount = snapshot.visibleSessionIds.length;
    const requestedVisibleSessionIds = new Set(snapshot.visibleSessionIds);
    const currentVisibleSessionIdsBySlot = Array.from<string | undefined>({
      length: targetVisibleCount,
    });

    for (const projection of this.getEditorProjections().values()) {
      if (
        projection.location.type !== "editor" ||
        projection.location.visibleIndex >= targetVisibleCount ||
        !requestedVisibleSessionIds.has(projection.sessionId)
      ) {
        continue;
      }

      currentVisibleSessionIdsBySlot[projection.location.visibleIndex] = projection.sessionId;
    }

    const alreadyAssignedSessionIds = new Set(
      currentVisibleSessionIdsBySlot.filter((sessionId): sessionId is string => Boolean(sessionId)),
    );
    const remainingVisibleSessionIds = snapshot.visibleSessionIds.filter(
      (sessionId) => !alreadyAssignedSessionIds.has(sessionId),
    );
    const nextVisibleSessionIds = currentVisibleSessionIdsBySlot.map((sessionId) => {
      if (sessionId) {
        return sessionId;
      }

      return remainingVisibleSessionIds.shift();
    });

    return {
      ...cloneSnapshot(snapshot),
      visibleSessionIds: nextVisibleSessionIds.filter((sessionId): sessionId is string =>
        Boolean(sessionId),
      ),
    };
  }

  private refreshProjectionLocations(): void {
    for (const projection of this.projections.values()) {
      projection.location = this.resolveProjectionLocation(projection.terminal);
    }
  }

  private getVisibleTerminalEntries(
    snapshot: SessionGridSnapshot,
  ): Array<{ sessionId: string; visibleIndex: number }> {
    return snapshot.visibleSessionIds.flatMap((sessionId, visibleIndex) => {
      const sessionRecord = this.getSnapshotSession(snapshot, sessionId);
      if (sessionRecord && !isTerminalSession(sessionRecord)) {
        return [];
      }

      return [{ sessionId, visibleIndex }];
    });
  }

  private hasVisibleNonTerminalSessions(snapshot: SessionGridSnapshot): boolean {
    return snapshot.visibleSessionIds.some((sessionId) => {
      const sessionRecord = this.getSnapshotSession(snapshot, sessionId);
      return Boolean(
        sessionRecord && (isT3Session(sessionRecord) || isBrowserSession(sessionRecord)),
      );
    });
  }

  private isTerminalSessionId(snapshot: SessionGridSnapshot, sessionId: string): boolean {
    const sessionRecord = this.getSnapshotSession(snapshot, sessionId);
    return !sessionRecord || isTerminalSession(sessionRecord);
  }

  private getSnapshotSession(
    snapshot: SessionGridSnapshot,
    sessionId: string,
  ): SessionRecord | undefined {
    return snapshot.sessions.find((candidate) => candidate.sessionId === sessionId);
  }

  private emitDebugStateChange(): void {
    this.changeDebugStateEmitter.fire();
  }

  private setCurrentMoveAction(action: NativeTerminalDebugMoveAction | undefined): void {
    if (action) {
      this.pushMoveHistory({
        ...action,
        event: "start",
        timestamp: new Date().toISOString(),
      });
    }

    this.currentMoveAction = action;
    this.emitDebugStateChange();
  }

  private completeCurrentMoveAction(
    event: NativeTerminalDebugMoveHistoryEntry["event"] = "complete",
    detail?: string,
  ): void {
    if (this.currentMoveAction) {
      this.pushMoveHistory({
        ...this.currentMoveAction,
        detail,
        event,
        timestamp: new Date().toISOString(),
      });
    }

    this.currentMoveAction = undefined;
    this.emitDebugStateChange();
  }

  private pushMoveHistory(entry: NativeTerminalDebugMoveHistoryEntry): void {
    this.moveHistory.unshift(entry);
    if (this.moveHistory.length > MOVE_HISTORY_LIMIT) {
      this.moveHistory.length = MOVE_HISTORY_LIMIT;
    }
  }

  private beginMoveAction(
    kind: string,
    sessionId: string | undefined,
    projection: SessionProjection | undefined,
    desiredVisibleIndex?: number,
  ): void {
    this.setCurrentMoveAction({
      currentLocation: this.describeProjectionLocation(projection?.location),
      desiredVisibleIndex,
      kind,
      sessionId,
      startedAt: new Date().toISOString(),
      terminalName:
        projection?.terminal.name ?? projection?.terminal.creationOptions.name ?? undefined,
    });
  }

  private async runWithoutActivationEvents<T>(callback: () => Promise<T>): Promise<T> {
    this.suppressActivationEvents += 1;
    try {
      return await callback();
    } finally {
      this.suppressActivationEvents = Math.max(0, this.suppressActivationEvents - 1);
    }
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

  private async runUiAction<T>(callback: () => Promise<T> | T): Promise<T> {
    await this.waitForFocusedWindow();
    if (this.nativeTerminalActionDelayMs > 0) {
      await delay(this.nativeTerminalActionDelayMs);
    }

    return await callback();
  }

  private async waitForFocusedWindow(): Promise<void> {
    if (vscode.window.state.focused) {
      return;
    }

    void this.trace.log("MOVE", "awaitWindowFocus:start", {
      activeTerminal: this.describeOptionalTerminal(vscode.window.activeTerminal),
    });

    const deadline = Date.now() + WINDOW_FOCUS_SETTLE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (vscode.window.state.focused) {
        void this.trace.log("MOVE", "awaitWindowFocus:complete", {});
        return;
      }

      await delay(WINDOW_FOCUS_SETTLE_INTERVAL_MS);
    }

    void this.trace.log("MOVE", "awaitWindowFocus:timeout", {});
  }

  private async activateTerminalForMove(
    terminal: vscode.Terminal,
    moveKind: "toEditor" | "toPanel",
    sessionId: string,
    preserveFocusOnShow = false,
  ): Promise<void> {
    await this.showTerminal(terminal, preserveFocusOnShow);

    const deadline = Date.now() + ACTIVE_TERMINAL_SETTLE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (vscode.window.activeTerminal === terminal) {
        return;
      }

      await delay(ACTIVE_TERMINAL_SETTLE_INTERVAL_MS);
    }

    void this.trace.log("MOVE", "activateTerminalTimeout", {
      activeTerminal: this.describeOptionalTerminal(vscode.window.activeTerminal),
      moveKind,
      sessionId,
      targetTerminal: this.describeTerminal(terminal),
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

  private createTerminalEnvironment(sessionId: string): Record<string, string> {
    const environment = createManagedTerminalEnvironment(
      this.options.workspaceId,
      sessionId,
      this.getSessionAgentStateFilePath(sessionId),
    );

    if (this.agentShellIntegration) {
      environment.PATH = `${this.agentShellIntegration.binDir}${path.delimiter}${process.env.PATH ?? ""}`;
      if (process.platform !== "win32") {
        environment.ZDOTDIR = this.agentShellIntegration.zshDotDir;
      }
    }

    return environment;
  }

  private getAgentStateDirectory(): string {
    return path.join(this.options.context.globalStorageUri.fsPath, AGENT_STATE_DIR_NAME);
  }

  private getSessionAgentStateFilePath(sessionId: string): string {
    return path.join(this.getAgentStateDirectory(), `${sessionId}.env`);
  }

  private getProcessAssociationStorageKey(): string {
    return getWorkspaceStorageKey(PROCESS_ID_ASSOCIATIONS_KEY, this.options.workspaceId);
  }

  private loadStoredProcessAssociations(): void {
    const storedAssociations =
      this.options.context.workspaceState?.get<Record<string, number>>(
        this.getProcessAssociationStorageKey(),
      ) ?? {};
    this.sessionIdByProcessId.clear();

    for (const [sessionId, processId] of Object.entries(storedAssociations)) {
      if (!Number.isInteger(processId) || processId <= 0) {
        continue;
      }

      this.sessionIdByProcessId.set(processId, sessionId);
    }
  }

  private async captureProcessAssociation(
    sessionId: string,
    terminal: vscode.Terminal,
  ): Promise<void> {
    const processId = await this.getTerminalProcessId(terminal);
    if (!processId) {
      return;
    }

    for (const [storedProcessId, storedSessionId] of this.sessionIdByProcessId.entries()) {
      if (storedSessionId === sessionId && storedProcessId !== processId) {
        this.sessionIdByProcessId.delete(storedProcessId);
      }
    }

    if (this.sessionIdByProcessId.get(processId) === sessionId) {
      return;
    }

    this.sessionIdByProcessId.set(processId, sessionId);
    void this.trace.log("PID", "captureProcessAssociation", {
      processId,
      sessionId,
      terminal: this.describeTerminal(terminal),
    });
    await this.persistProcessAssociations();
  }

  private async clearProcessAssociation(sessionId: string): Promise<void> {
    let changed = false;
    for (const [processId, storedSessionId] of this.sessionIdByProcessId.entries()) {
      if (storedSessionId === sessionId) {
        this.sessionIdByProcessId.delete(processId);
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    void this.trace.log("PID", "clearProcessAssociation", {
      sessionId,
    });
    await this.persistProcessAssociations();
  }

  private persistProcessAssociations(): Promise<void> {
    const storedAssociations = Object.fromEntries(
      Array.from(this.sessionIdByProcessId.entries()).map(([processId, sessionId]) => [
        sessionId,
        processId,
      ]),
    );

    this.processAssociationWrite = this.processAssociationWrite.then(async () => {
      try {
        await this.options.context.workspaceState?.update(
          this.getProcessAssociationStorageKey(),
          storedAssociations,
        );
      } catch {
        // Workspace storage is best-effort for terminal association restore.
      }
    });

    return this.processAssociationWrite;
  }

  private async getTerminalProcessId(terminal: vscode.Terminal): Promise<number | undefined> {
    try {
      const processId = await terminal.processId;
      return typeof processId === "number" && processId > 0 ? processId : undefined;
    } catch {
      return undefined;
    }
  }

  private getDisplayNameForSession(sessionId: string, alias: string | undefined): string {
    const normalizedAlias = alias?.trim();
    return normalizedAlias && normalizedAlias.length > 0 ? normalizedAlias : `Session ${sessionId}`;
  }

  private async syncProjectionTerminalNames(): Promise<void> {
    for (const [sessionId, projection] of this.projections.entries()) {
      await this.syncTerminalName(projection.terminal, sessionId, true);
    }
  }

  private async syncTerminalName(
    terminal: vscode.Terminal,
    sessionId: string,
    preserveFocus: boolean,
  ): Promise<void> {
    const desiredName = this.sessionAliases.get(sessionId);
    if (!desiredName) {
      return;
    }

    const currentName = terminal.name ?? terminal.creationOptions.name;
    if (currentName === desiredName) {
      return;
    }

    await this.runWithoutActivationEvents(async () => {
      await this.showTerminal(terminal, preserveFocus);
      await vscode.commands.executeCommand(TERMINAL_RENAME_COMMAND, {
        name: desiredName,
      });
    });
    void this.trace.log("RENAME", "syncTerminalName", {
      desiredName,
      preserveFocus,
      sessionId,
      terminal: this.describeTerminal(terminal),
    });
    this.emitDebugStateChange();
  }

  private captureLayoutState(): {
    editorGroups: Array<{ labels: string[]; viewColumn?: number }>;
    projections: Array<{ location: string; name?: string; sessionId: string }>;
    terminalCount: number;
    terminalNames: string[];
  } {
    return {
      editorGroups: vscode.window.tabGroups.all.map((group) => ({
        labels: group.tabs
          .filter((tab) => tab.input instanceof vscode.TabInputTerminal)
          .map((tab) => tab.label),
        viewColumn: group.viewColumn,
      })),
      projections: Array.from(this.projections.values()).map((projection) => ({
        location: this.describeProjectionLocation(projection.location),
        name: projection.terminal.name ?? projection.terminal.creationOptions.name,
        sessionId: projection.sessionId,
      })),
      terminalCount: vscode.window.terminals.length,
      terminalNames: vscode.window.terminals.map(
        (terminal) => terminal.name ?? terminal.creationOptions.name ?? "<unnamed>",
      ),
    };
  }

  private captureDebugLayoutState(): NativeTerminalBackendDebugState["layout"] {
    const projections = Array.from(this.projections.values()).map((projection) =>
      this.createDebugProjection(projection),
    );
    const rawTabGroups = vscode.window.tabGroups.all.map((group) => ({
      labels: group.tabs.map((tab) => tab.label),
      terminalLabels: group.tabs
        .filter((tab) => tab.input instanceof vscode.TabInputTerminal)
        .map((tab) => tab.label),
      viewColumn: group.viewColumn,
    }));
    const editorProjectionsBySlot = new Map<
      number,
      Array<{
        sessionId: string;
        terminalName?: string;
      }>
    >();
    for (const projection of this.getEditorProjections().values()) {
      if (projection.location.type !== "editor") {
        continue;
      }

      const slotProjections = editorProjectionsBySlot.get(projection.location.visibleIndex) ?? [];
      slotProjections.push({
        sessionId: projection.sessionId,
        terminalName: projection.terminal.name ?? projection.terminal.creationOptions.name,
      });
      editorProjectionsBySlot.set(projection.location.visibleIndex, slotProjections);
    }

    const visibleSurfaceGroupCount =
      this.lastVisibleSnapshot?.visibleCount ??
      Math.max(
        editorProjectionsBySlot.size,
        rawTabGroups.filter((group) => group.terminalLabels.length > 0).length,
      );
    const editorSurfaceGroups = Array.from(
      { length: visibleSurfaceGroupCount },
      (_, visibleIndex) => {
        const viewColumn = getViewColumn(visibleIndex);
        const matchingRawGroup = rawTabGroups.find((group) => group.viewColumn === viewColumn);
        const slotProjections = editorProjectionsBySlot.get(visibleIndex) ?? [];

        return {
          labels: matchingRawGroup?.terminalLabels.length
            ? [...matchingRawGroup.terminalLabels]
            : slotProjections
                .map((projection) => projection.terminalName ?? projection.sessionId)
                .filter((label): label is string => Boolean(label)),
          sessionIds: slotProjections.map((projection) => projection.sessionId),
          viewColumn,
          visibleIndex,
        };
      },
    );

    return {
      activeTerminalName:
        vscode.window.activeTerminal?.name ??
        vscode.window.activeTerminal?.creationOptions.name ??
        undefined,
      editorSurfaceGroups,
      parkedTerminals: projections.filter((projection) => projection.isParked),
      processAssociations: Array.from(this.sessionIdByProcessId.entries()).map(
        ([processId, sessionId]) => ({
          processId,
          sessionId,
        }),
      ),
      projections,
      rawTabGroups,
      terminalCount: vscode.window.terminals.length,
      terminalNames: vscode.window.terminals.map(
        (terminal) => terminal.name ?? terminal.creationOptions.name ?? "<unnamed>",
      ),
      trackedSessionIds: [...this.trackedSessionIds],
    };
  }

  private createDebugProjection(projection: SessionProjection): NativeTerminalDebugProjection {
    return {
      alias: this.sessionAliases.get(projection.sessionId),
      exitCode: projection.terminal.exitStatus?.code,
      isParked: projection.location.type === "panel",
      isTracked: this.trackedSessionIds.has(projection.sessionId),
      location: this.describeProjectionLocation(projection.location),
      sessionId: projection.sessionId,
      terminalName: projection.terminal.name ?? projection.terminal.creationOptions.name,
    };
  }

  private describeProjectionLocation(location: ProjectionLocation | undefined): string {
    if (!location) {
      return "missing";
    }

    return location.type === "editor" ? `editor:${String(location.visibleIndex)}` : "panel";
  }

  private describeTerminal(terminal: vscode.Terminal): {
    exitCode?: number;
    name?: string;
    sessionId?: string;
    terminalType: "pty" | "shell";
    workspaceId?: string;
  } {
    const creationOptions = terminal.creationOptions;
    const managedIdentity = creationOptions ? getManagedTerminalIdentity(terminal) : undefined;
    return {
      exitCode: terminal.exitStatus?.code,
      name: terminal.name ?? creationOptions?.name,
      sessionId: managedIdentity?.sessionId,
      terminalType: creationOptions && "pty" in creationOptions ? "pty" : "shell",
      workspaceId: managedIdentity?.workspaceId,
    };
  }

  private describeOptionalTerminal(terminal: vscode.Terminal | undefined):
    | {
        exitCode?: number;
        name?: string;
        sessionId?: string;
        terminalType: "pty" | "shell";
        workspaceId?: string;
      }
    | undefined {
    return terminal ? this.describeTerminal(terminal) : undefined;
  }

  private async refreshSessionSnapshots(): Promise<void> {
    const observedAt = Date.now();
    let changed = this.syncClosedProjections();

    for (const sessionId of this.trackedSessionIds) {
      const previousSession = this.sessions.get(sessionId);
      const projection = this.projections.get(sessionId);
      const agentState = await this.readSessionAgentState(sessionId);
      const nextTitle = agentState.state.title?.trim();
      const nextStatus = this.getSessionStatus(previousSession?.status, projection);

      this.updateLastTerminalActivity(
        sessionId,
        agentState,
        nextTitle,
        this.sessionTitles.get(sessionId),
        observedAt,
      );

      const nextSession =
        nextStatus === "running"
          ? {
              ...this.createRunningSessionSnapshot(sessionId),
              agentName: agentState.state.agentName ?? previousSession?.agentName,
              agentStatus: agentState.state.agentStatus,
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
              exitCode:
                nextStatus === "exited"
                  ? (projection?.terminal.exitStatus?.code ?? previousSession?.exitCode ?? 0)
                  : previousSession?.exitCode,
              status: nextStatus,
            };

      if (JSON.stringify(previousSession) !== JSON.stringify(nextSession)) {
        this.sessions.set(sessionId, nextSession);
        changed = true;
      }

      changed = this.syncSessionTitle(sessionId, nextTitle) || changed;
    }

    if (changed) {
      this.changeSessionsEmitter.fire();
    }
  }

  private getSessionStatus(
    previousStatus: TerminalSessionStatus | undefined,
    projection: SessionProjection | undefined,
  ): TerminalSessionStatus {
    if (projection && !projection.terminal.exitStatus) {
      return "running";
    }

    if (projection?.terminal.exitStatus) {
      return "exited";
    }

    if (previousStatus === "running" || previousStatus === "exited") {
      return "exited";
    }

    return previousStatus ?? "disconnected";
  }

  private syncClosedProjections(): boolean {
    const openTerminals = new Set(vscode.window.terminals);
    let changed = false;

    for (const [sessionId, projection] of this.projections.entries()) {
      if (openTerminals.has(projection.terminal)) {
        continue;
      }

      this.createdTerminals.delete(projection.terminal);
      this.terminalToSessionId.delete(projection.terminal);
      this.projections.delete(sessionId);
      void this.clearProcessAssociation(sessionId);

      const previousSession =
        this.sessions.get(sessionId) ??
        createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId);
      this.sessions.set(sessionId, {
        ...previousSession,
        agentStatus:
          previousSession.agentStatus === "working" ? "idle" : previousSession.agentStatus,
        endedAt: previousSession.endedAt ?? new Date().toISOString(),
        exitCode: previousSession.exitCode ?? 0,
        status: "exited",
      });
      changed = true;
      void this.trace.log("SYNC", "removedMissingProjection", {
        sessionId,
        terminal: this.describeTerminal(projection.terminal),
      });
    }

    if (changed) {
      this.changeSessionsEmitter.fire();
    }

    return changed;
  }

  private syncSessionTitle(sessionId: string, title: string | undefined): boolean {
    const previousTitle = this.sessionTitles.get(sessionId);
    if (title && title !== previousTitle) {
      this.sessionTitles.set(sessionId, title);
      this.changeSessionTitleEmitter.fire({
        sessionId,
        title,
      });
      return true;
    }

    if (!title && previousTitle) {
      this.sessionTitles.delete(sessionId);
      return true;
    }

    return false;
  }

  private updateLastTerminalActivity(
    sessionId: string,
    agentState: ReadSessionAgentStateResult,
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

    if (nextTitle && nextTitle !== previousTitle) {
      this.lastTerminalActivityAtBySessionId.set(sessionId, observedAt);
      return;
    }

    if (!this.lastTerminalActivityAtBySessionId.has(sessionId) && nextTitle) {
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
    await mkdir(this.getAgentStateDirectory(), { recursive: true });
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

  private async deleteSessionAgentState(sessionId: string): Promise<void> {
    await rm(this.getSessionAgentStateFilePath(sessionId), { force: true });
  }
}

function cloneSnapshot(snapshot: SessionGridSnapshot): SessionGridSnapshot {
  return {
    ...snapshot,
    sessions: [...snapshot.sessions],
    visibleSessionIds: [...snapshot.visibleSessionIds],
  };
}

async function delay(durationMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
