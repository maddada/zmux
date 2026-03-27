import * as path from "node:path";
import * as vscode from "vscode";
import {
  getTerminalSessionSurfaceTitle,
  isTerminalSession,
  type SessionRecord,
  type TerminalSessionRecord,
} from "../shared/session-grid-contract";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { ensureAgentShellIntegration, type AgentShellIntegration } from "./agent-shell-integration";
import {
  createManagedTerminalEnvironment,
  getManagedTerminalIdentity,
} from "./native-managed-terminal";
import { readManagedTerminalIdentityFromProcessId } from "./native-terminal-process-identity";
import type {
  TerminalWorkspaceBackend,
  TerminalWorkspaceBackendTitleChange,
} from "./terminal-workspace-backend";
import {
  createDisconnectedSessionSnapshot,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getWorkspaceStorageKey,
} from "./terminal-workspace-helpers";
import {
  focusEditorGroupByIndex,
  moveActiveEditorToGroup,
} from "./terminal-workspace-environment";
import {
  findTerminalTabIndex as findTerminalTabIndexByTitle,
  findTerminalGroupIndex as findTerminalGroupIndexByTitle,
  getActiveEditorTerminalTabLabel,
  getActivePanelTerminalTabLabel,
  getActiveTerminalTabLocation,
  getTerminalDisplayName,
  isTerminalTabActive as isBoundTerminalTabActive,
  isTerminalTabForeground as isTerminalTabForegroundByTitle,
  resolveTerminalRestoreTarget,
  waitForActiveTerminal as waitForActiveTerminalInstance,
  waitForActiveTerminalOrCancel,
  waitForTerminalTabForeground,
  waitForTerminalTabForegroundOrCancel,
} from "./native-terminal-workspace-backend/workbench";
import { createWorkspaceTrace } from "./runtime-trace";
import {
  readPersistedSessionStateFromFile,
  updatePersistedSessionStateFile,
} from "./session-state-file";
import { logVSmuxDebug } from "./vsmux-debug-log";
import { appendCodeModeDebugLog } from "./code-mode-debug-log";

const AGENT_STATE_DIR_NAME = "terminal-session-state";
const POLL_INTERVAL_MS = 500;
const PROCESS_ID_ASSOCIATIONS_KEY = "nativeTerminalProcessIdBySession";
const TERMINAL_MOVE_TO_EDITOR_COMMAND = "workbench.action.terminal.moveToEditor";
const TERMINAL_RENAME_COMMAND = "workbench.action.terminal.renameWithArg";
const OPEN_EDITOR_AT_INDEX_COMMAND_PREFIX = "workbench.action.openEditorAtIndex";
const TRACE_FILE_NAME = "native-terminal-reconcile.log";
const TERMINAL_GROUP_SETTLE_TIMEOUT_MS = 1_000;
const TERMINAL_GROUP_SETTLE_POLL_MS = 25;

type NativeTerminalWorkspaceBackendOptions = {
  context: vscode.ExtensionContext;
  ensureShellSpawnAllowed: () => Promise<boolean>;
  workspaceId: string;
};

type SessionProjection = {
  sessionId: string;
  terminal: vscode.Terminal;
};

type ManagedTerminalRestorePassResult = "failed" | "moved" | "verify";

const defaultNeverCancelled = (): boolean => false;

export class NativeTerminalWorkspaceBackend implements TerminalWorkspaceBackend {
  private agentShellIntegration: AgentShellIntegration | undefined;
  private readonly activateSessionEmitter = new vscode.EventEmitter<string>();
  private readonly changeSessionsEmitter = new vscode.EventEmitter<void>();
  private readonly changeSessionTitleEmitter =
    new vscode.EventEmitter<TerminalWorkspaceBackendTitleChange>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly lastTerminalActivityAtBySessionId = new Map<string, number>();
  private lastActivatedEditorSessionId: string | undefined;
  private readonly observedEditorGroupIndexBySessionId = new Map<string, number>();
  private pollTimer: NodeJS.Timeout | undefined;
  private readonly projections = new Map<string, SessionProjection>();
  private readonly sessionIdByProcessId = new Map<number, string>();
  private readonly sessionRecordBySessionId = new Map<string, TerminalSessionRecord>();
  private readonly sessionTitleBySessionId = new Map<string, string>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();
  private readonly terminalToSessionId = new Map<vscode.Terminal, string>();
  private readonly trace = createWorkspaceTrace(TRACE_FILE_NAME);

  public readonly onDidActivateSession = this.activateSessionEmitter.event;
  public readonly onDidChangeSessions = this.changeSessionsEmitter.event;
  public readonly onDidChangeSessionTitle = this.changeSessionTitleEmitter.event;

  public constructor(private readonly options: NativeTerminalWorkspaceBackendOptions) {}

  public async initialize(sessionRecords: readonly SessionRecord[]): Promise<void> {
    this.agentShellIntegration = await ensureAgentShellIntegration(
      path.join(this.options.context.globalStorageUri.fsPath, "terminal-host-daemon"),
    );
    this.loadStoredProcessAssociations();
    this.syncSessions(sessionRecords);
    await this.trace.reset();

    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        void this.logState("EVENT", "terminal-opened", {
          terminalName: terminal.name,
        });
        void this.attachManagedTerminal(terminal);
      }),
      vscode.window.onDidCloseTerminal((terminal) => {
        const sessionId = this.terminalToSessionId.get(terminal);
        if (!sessionId) {
          return;
        }

        void this.logState("EVENT", "terminal-closed", {
          exitCode: terminal.exitStatus?.code,
          sessionId,
          terminalName: terminal.name,
        });
        this.terminalToSessionId.delete(terminal);
        this.projections.delete(sessionId);
        this.observedEditorGroupIndexBySessionId.delete(sessionId);
        this.sessions.set(sessionId, {
          ...(this.sessions.get(sessionId) ??
            createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId)),
          agentStatus: "idle",
          endedAt: new Date().toISOString(),
          exitCode: terminal.exitStatus?.code ?? 0,
          restoreState: "live",
          status: terminal.exitStatus ? "exited" : "disconnected",
        });
        this.changeSessionsEmitter.fire();
        void this.emitActiveEditorSessionFromTabs();
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => {
        void this.emitActiveEditorSessionFromTabs();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        void this.emitActiveEditorSessionFromTabs();
      }),
      vscode.window.onDidChangeTerminalState((terminal) => {
        void this.attachManagedTerminal(terminal);
        const sessionId = this.terminalToSessionId.get(terminal);
        if (!sessionId) {
          return;
        }

        this.lastTerminalActivityAtBySessionId.set(sessionId, Date.now());
        void this.captureProcessAssociation(sessionId, terminal);
        void this.logState("EVENT", "terminal-state-changed", {
          sessionId,
          terminalName: terminal.name,
        });
      }),
    );

    for (const terminal of vscode.window.terminals) {
      await this.attachManagedTerminal(terminal);
    }
    await this.emitActiveEditorSessionFromTabs();

    await this.refreshSessionSnapshots();
    this.pollTimer = setInterval(() => {
      void this.refreshSessionSnapshots();
    }, POLL_INTERVAL_MS);
  }

  public async syncConfiguration(): Promise<void> {}

  public dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
    this.activateSessionEmitter.dispose();
    this.changeSessionsEmitter.dispose();
    this.changeSessionTitleEmitter.dispose();
  }

  public getLastTerminalActivityAt(sessionId: string): number | undefined {
    return this.lastTerminalActivityAtBySessionId.get(sessionId);
  }

  public hasAttachedTerminal(sessionId: string): boolean {
    const projection = this.projections.get(sessionId);
    return Boolean(
      projection &&
      !projection.terminal.exitStatus &&
      vscode.window.terminals.includes(projection.terminal) &&
      this.hasTerminalEditorTab(sessionId),
    );
  }

  public hasLiveTerminal(sessionId: string): boolean {
    const projection = this.projections.get(sessionId);
    return Boolean(
      projection &&
      !projection.terminal.exitStatus &&
      vscode.window.terminals.includes(projection.terminal),
    );
  }

  public async acknowledgeAttention(sessionId: string): Promise<boolean> {
    const snapshot = this.sessions.get(sessionId);
    if (!snapshot || snapshot.agentStatus !== "attention") {
      return false;
    }

    const persistedState = await updatePersistedSessionStateFile(
      this.getSessionAgentStateFilePath(sessionId),
      (currentState) => {
        if (currentState.agentStatus !== "attention") {
          return currentState;
        }

        return {
          ...currentState,
          agentName: snapshot.agentName ?? currentState.agentName,
          agentStatus: "idle",
        };
      },
    ).catch(() => undefined);

    const nextSnapshot = {
      ...snapshot,
      agentName: persistedState?.agentName ?? snapshot.agentName,
      agentStatus: persistedState?.agentStatus ?? "idle",
    } satisfies TerminalSessionSnapshot;
    this.sessions.set(sessionId, nextSnapshot);

    if (!haveSameTerminalSessionSnapshot(snapshot, nextSnapshot)) {
      this.changeSessionsEmitter.fire();
    }

    return nextSnapshot.agentStatus === "idle";
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

    this.upsertSession(sessionRecord);
    await this.logState("SESSION", "create-or-attach", {
      sessionId: sessionRecord.sessionId,
      title: sessionRecord.title,
    });
    const projection = await this.ensureTerminal(sessionRecord);
    await this.syncTerminalName(projection.terminal, sessionRecord.sessionId);
    await this.refreshSessionSnapshot(sessionRecord.sessionId);
    return this.sessions.get(sessionRecord.sessionId)!;
  }

  public async focusSession(sessionId: string): Promise<boolean> {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      await this.logState("FOCUS", "missing-session", { sessionId });
      return false;
    }

    if (this.isTerminalTabActive(sessionId, projection.terminal)) {
      await this.logState("FOCUS", "terminal-noop", { sessionId });
      return true;
    }

    projection.terminal.show(false);
    await this.logState("FOCUS", "terminal", { sessionId });
    return true;
  }

  public async revealSessionInGroup(
    sessionRecord: SessionRecord,
    targetGroupIndex: number,
    isCancelled: () => boolean = () => false,
  ): Promise<boolean> {
    if (!isTerminalSession(sessionRecord)) {
      return false;
    }

    const revealStartedAt = Date.now();
    this.logBackendDebug("backend.revealSessionInGroup.start", {
      sessionId: sessionRecord.sessionId,
      targetGroupIndex,
    });
    let projection = await this.ensureTerminalInGroup(sessionRecord, targetGroupIndex, isCancelled);
    if (!projection || isCancelled()) {
      this.logBackendDebug("backend.revealSessionInGroup.ensureFailed", {
        durationMs: Date.now() - revealStartedAt,
        sessionId: sessionRecord.sessionId,
        targetGroupIndex,
      });
      return false;
    }
    if (!this.isTerminalTabForeground(sessionRecord.sessionId, targetGroupIndex)) {
      const activateTabStartedAt = Date.now();
      const didActivateTab = await this.activateTerminalEditorTab(
        sessionRecord.sessionId,
        targetGroupIndex,
        isCancelled,
      );
      this.logBackendDebug("backend.revealSessionInGroup.activateTerminalEditorTab", {
        didActivateTab,
        durationMs: Date.now() - activateTabStartedAt,
        sessionId: sessionRecord.sessionId,
        targetGroupIndex,
      });
      if (!didActivateTab) {
        const isForegroundAfterActivationAttempt = this.isTerminalTabForeground(
          sessionRecord.sessionId,
          targetGroupIndex,
        );
        if (!isForegroundAfterActivationAttempt) {
          this.observedEditorGroupIndexBySessionId.delete(sessionRecord.sessionId);
          this.logBackendDebug("backend.revealSessionInGroup.forceMoveToEditorAfterUnavailableTab", {
            sessionId: sessionRecord.sessionId,
            targetGroupIndex,
          });
          projection = await this.ensureTerminalInGroup(sessionRecord, targetGroupIndex, isCancelled);
          if (!projection || isCancelled()) {
            this.logBackendDebug(
              "backend.revealSessionInGroup.forceMoveToEditorAfterUnavailableTab.failed",
              {
                durationMs: Date.now() - revealStartedAt,
                sessionId: sessionRecord.sessionId,
                targetGroupIndex,
              },
            );
            return false;
          }
          if (this.isTerminalTabForeground(sessionRecord.sessionId, targetGroupIndex)) {
            this.logBackendDebug(
              "backend.revealSessionInGroup.forceMoveToEditorAfterUnavailableTab.succeeded",
              {
                durationMs: Date.now() - revealStartedAt,
                sessionId: sessionRecord.sessionId,
                targetGroupIndex,
              },
            );
          }
        }
      }
      if (!this.isTerminalTabForeground(sessionRecord.sessionId, targetGroupIndex)) {
        if (isCancelled()) {
          return false;
        }
        const fallbackStartedAt = Date.now();
        projection.terminal.show(false);
        const isActive = await this.waitForActiveTerminal(projection.terminal, isCancelled);
        if (!isActive || isCancelled()) {
          this.logBackendDebug("backend.revealSessionInGroup.fallbackWaitForActiveTerminal.failed", {
            durationMs: Date.now() - fallbackStartedAt,
            sessionId: sessionRecord.sessionId,
            targetGroupIndex,
          });
          return false;
        }
        this.logBackendDebug("backend.revealSessionInGroup.fallbackWaitForActiveTerminal.succeeded", {
          durationMs: Date.now() - fallbackStartedAt,
          sessionId: sessionRecord.sessionId,
          targetGroupIndex,
        });
      }
    } else if (!this.isTerminalTabActive(sessionRecord.sessionId, projection.terminal)) {
      const activateStartedAt = Date.now();
      projection.terminal.show(false);
      const isActive = await this.waitForActiveTerminal(projection.terminal, isCancelled);
      if (!isActive || isCancelled()) {
        this.logBackendDebug("backend.revealSessionInGroup.waitForActiveTerminal.failed", {
          durationMs: Date.now() - activateStartedAt,
          sessionId: sessionRecord.sessionId,
          targetGroupIndex,
        });
        return false;
      }
      this.logBackendDebug("backend.revealSessionInGroup.waitForActiveTerminal.succeeded", {
        durationMs: Date.now() - activateStartedAt,
        sessionId: sessionRecord.sessionId,
        targetGroupIndex,
      });
    }

    this.logBackendDebug("backend.revealSessionInGroup.complete", {
      durationMs: Date.now() - revealStartedAt,
      observedGroupIndex: this.findTerminalGroupIndex(sessionRecord.sessionId),
      sessionId: sessionRecord.sessionId,
      targetGroupIndex,
      terminalForeground: this.isTerminalTabForeground(sessionRecord.sessionId, targetGroupIndex),
    });
    await this.logState("FOCUS", "terminal-group", {
      sessionId: sessionRecord.sessionId,
      targetGroupIndex,
    });
    return true;
  }

  public getObservedGroupIndex(sessionId: string): number | undefined {
    return this.findTerminalGroupIndex(sessionId);
  }

  public isSessionForegroundVisible(sessionId: string): boolean {
    const groupIndex = this.findTerminalGroupIndex(sessionId);
    return groupIndex !== undefined && this.isTerminalTabForeground(sessionId, groupIndex);
  }

  public clearObservedEditorGroupPlacement(): void {
    this.observedEditorGroupIndexBySessionId.clear();
    this.lastActivatedEditorSessionId = undefined;
    this.logBackendDebug("backend.clearObservedEditorGroupPlacement", {
      projectionSessionIds: [...this.projections.keys()],
    });
  }

  public async parkAllEditorTerminalsToPanel(): Promise<void> {
    const terminals = [...vscode.window.terminals];
    const panelTerminalTabLabel = getActivePanelTerminalTabLabel();
    const activeTerminalBefore = vscode.window.activeTerminal;
    await appendCodeModeDebugLog("park-editor-terminals-to-panel:start", {
      activeTerminalBefore: activeTerminalBefore
        ? getTerminalDisplayName(activeTerminalBefore) ?? activeTerminalBefore.name
        : undefined,
      panelTerminalTabLabel,
      terminals: terminals.map((terminal) => ({
        name: getTerminalDisplayName(terminal) ?? terminal.name,
      })),
    });

    await this.logState("MOVE", "park-editor-terminals-start", {
      activeTerminalName: activeTerminalBefore
        ? (getTerminalDisplayName(activeTerminalBefore) ?? activeTerminalBefore.name)
        : undefined,
      panelTerminalTabLabel,
      terminalNames: terminals.map((terminal) => getTerminalDisplayName(terminal) ?? terminal.name),
    });

    for (const terminal of terminals) {
      const sessionId = this.terminalToSessionId.get(terminal);
      const isActive = await this.activateTerminalForWorkbenchCommand(terminal);
      await appendCodeModeDebugLog("park-editor-terminals-to-panel:activated-terminal", {
        activeLocation: getActiveTerminalTabLocation(),
        isActive,
        terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
      });
      if (!isActive) {
        await this.logState("MOVE", "park-editor-terminal-skip-inactive", {
          terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
        });
        continue;
      }

      if (getActiveTerminalTabLocation() !== "editor") {
        continue;
      }

      await vscode.commands.executeCommand("workbench.action.terminal.moveToTerminalPanel");
      if (sessionId) {
        this.observedEditorGroupIndexBySessionId.delete(sessionId);
      }
      await appendCodeModeDebugLog("park-editor-terminals-to-panel:moved-terminal", {
        terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
      });
      await this.logState("MOVE", "park-editor-terminal", {
        terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
      });
    }

    const restoreTarget = resolveTerminalRestoreTarget(
      vscode.window.terminals,
      activeTerminalBefore,
      panelTerminalTabLabel,
    );
    if (!restoreTarget) {
      await appendCodeModeDebugLog("park-editor-terminals-to-panel:no-restore-target");
      return;
    }

    restoreTarget.show(true);
    await appendCodeModeDebugLog("park-editor-terminals-to-panel:restore-target", {
      restoreTarget: getTerminalDisplayName(restoreTarget) ?? restoreTarget.name,
    });
    await this.logState("FOCUS", "restore-panel-terminal", {
      terminalName: getTerminalDisplayName(restoreTarget) ?? restoreTarget.name,
    });
  }

  public async restoreAllManagedTerminalsToEditor(): Promise<void> {
    const terminals = [...vscode.window.terminals];
    const verifyPassTerminals: Array<{ sessionId: string; terminal: vscode.Terminal }> = [];
    this.logBackendDebug("backend.restoreAllManagedTerminalsToEditor.start", {
      managedSessionIds: terminals
        .map((terminal) => this.terminalToSessionId.get(terminal))
        .filter((sessionId): sessionId is string => sessionId !== undefined),
    });

    for (const terminal of terminals) {
      const sessionId = this.terminalToSessionId.get(terminal);
      if (!sessionId || terminal.exitStatus) {
        continue;
      }

      const restoreResult = await this.restoreManagedTerminalToEditorPass(
        sessionId,
        terminal,
        "backend.restoreAllManagedTerminalsToEditor",
        false,
      );
      if (restoreResult === "verify") {
        verifyPassTerminals.push({ sessionId, terminal });
      }
    }

    this.logBackendDebug("backend.restoreAllManagedTerminalsToEditor.verifyPass.start", {
      sessionIds: verifyPassTerminals.map(({ sessionId }) => sessionId),
    });

    for (const { sessionId, terminal } of verifyPassTerminals) {
      if (
        terminal.exitStatus ||
        this.terminalToSessionId.get(terminal) !== sessionId ||
        !vscode.window.terminals.includes(terminal)
      ) {
        continue;
      }

      const verified = await this.verifyManagedTerminalRestoredToEditor(sessionId, terminal);
      this.logBackendDebug("backend.restoreAllManagedTerminalsToEditor.verifyPass.result", {
        sessionId,
        terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
        verified,
      });
      if (verified) {
        continue;
      }

      await this.restoreManagedTerminalToEditorPass(
        sessionId,
        terminal,
        "backend.restoreAllManagedTerminalsToEditor.verifyPass",
        true,
      );
    }

    this.logBackendDebug("backend.restoreAllManagedTerminalsToEditor.complete", {
      managedSessionIds: [...this.projections.keys()],
    });
  }

  public getSessionSnapshot(sessionId: string): TerminalSessionSnapshot | undefined {
    return this.sessions.get(sessionId);
  }

  public async killSession(sessionId: string): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return;
    }

    await this.logState("SESSION", "kill", { sessionId });
    projection.terminal.dispose();
    this.projections.delete(sessionId);
  }

  public async renameSession(sessionRecord: SessionRecord): Promise<void> {
    if (!isTerminalSession(sessionRecord)) {
      return;
    }

    this.upsertSession(sessionRecord);
    const projection = this.projections.get(sessionRecord.sessionId);
    if (!projection) {
      return;
    }

    await this.syncTerminalName(projection.terminal, sessionRecord.sessionId);
  }

  public async syncRunningTerminalTitles(): Promise<void> {
    for (const terminal of vscode.window.terminals) {
      if (terminal.exitStatus) {
        continue;
      }

      await this.attachManagedTerminal(terminal);
    }
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

  public async writeText(sessionId: string, data: string, shouldExecute = true): Promise<void> {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return;
    }

    projection.terminal.sendText(data, shouldExecute);
    this.lastTerminalActivityAtBySessionId.set(sessionId, Date.now());
  }

  public syncSessions(sessionRecords: readonly SessionRecord[]): void {
    const nextSessionRecords = sessionRecords.filter(isTerminalSession);
    const nextSessionIdSet = new Set(
      nextSessionRecords.map((sessionRecord) => sessionRecord.sessionId),
    );

    for (const sessionRecord of nextSessionRecords) {
      this.upsertSession(sessionRecord);
    }

    for (const sessionId of this.sessionRecordBySessionId.keys()) {
      if (nextSessionIdSet.has(sessionId)) {
        continue;
      }

      this.sessionRecordBySessionId.delete(sessionId);
      this.observedEditorGroupIndexBySessionId.delete(sessionId);
      this.sessionTitleBySessionId.delete(sessionId);
    }
  }

  private upsertSession(sessionRecord: TerminalSessionRecord): void {
    this.sessionRecordBySessionId.set(sessionRecord.sessionId, sessionRecord);
    this.sessions.set(
      sessionRecord.sessionId,
      this.sessions.get(sessionRecord.sessionId) ??
        createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.options.workspaceId),
    );
  }

  private async ensureTerminal(sessionRecord: TerminalSessionRecord): Promise<SessionProjection> {
    const existingProjection = this.projections.get(sessionRecord.sessionId);
    if (existingProjection && vscode.window.terminals.includes(existingProjection.terminal)) {
      await this.logState("ENSURE", "projection-reused", {
        sessionId: sessionRecord.sessionId,
      });
      return existingProjection;
    }

    const existingTerminal = await this.findExistingTerminal(sessionRecord);
    if (existingTerminal) {
      await this.logState("ENSURE", "existing-terminal-attached", {
        sessionId: sessionRecord.sessionId,
        terminalName: existingTerminal.name,
      });
      const projection = {
        sessionId: sessionRecord.sessionId,
        terminal: existingTerminal,
      } satisfies SessionProjection;
      this.bindTerminalToSession(sessionRecord.sessionId, existingTerminal);
      await this.captureProcessAssociation(sessionRecord.sessionId, existingTerminal);
      return projection;
    }

    if (!(await this.options.ensureShellSpawnAllowed())) {
      const disconnectedSnapshot = createDisconnectedSessionSnapshot(
        sessionRecord.sessionId,
        this.options.workspaceId,
        "error",
      );
      disconnectedSnapshot.errorMessage = "Shell creation blocked in an untrusted workspace.";
      this.sessions.set(sessionRecord.sessionId, disconnectedSnapshot);
      this.changeSessionsEmitter.fire();
      throw new Error("Shell creation blocked in an untrusted workspace.");
    }

    const terminal = vscode.window.createTerminal({
      cwd: getDefaultWorkspaceCwd(),
      env: this.createTerminalEnvironment(sessionRecord.sessionId),
      iconPath: new vscode.ThemeIcon("terminal"),
      location: {
        viewColumn: vscode.window.tabGroups.activeTabGroup?.viewColumn ?? vscode.ViewColumn.One,
      },
      name: this.getSessionSurfaceTitle(sessionRecord.sessionId),
      shellPath: getDefaultShell(),
    });
    const projection = {
      sessionId: sessionRecord.sessionId,
      terminal,
    } satisfies SessionProjection;
    this.bindTerminalToSession(sessionRecord.sessionId, terminal);
    const initialViewColumn = vscode.window.tabGroups.activeTabGroup?.viewColumn;
    if (typeof initialViewColumn === "number") {
      this.observedEditorGroupIndexBySessionId.set(sessionRecord.sessionId, initialViewColumn - 1);
    }
    await this.captureProcessAssociation(sessionRecord.sessionId, terminal);
    await this.logState("ENSURE", "terminal-created", {
      sessionId: sessionRecord.sessionId,
      terminalName: terminal.name,
    });
    return projection;
  }

  private async ensureTerminalInGroup(
    sessionRecord: TerminalSessionRecord,
    targetGroupIndex: number,
    isCancelled: () => boolean,
  ): Promise<SessionProjection | undefined> {
    const ensureStartedAt = Date.now();
    const existingProjection = this.projections.get(sessionRecord.sessionId);
    if (!existingProjection || !vscode.window.terminals.includes(existingProjection.terminal)) {
      if (isCancelled()) {
        return undefined;
      }
      await focusEditorGroupByIndex(targetGroupIndex);
      if (isCancelled()) {
        return undefined;
      }
      return this.ensureTerminal(sessionRecord);
    }

    let currentGroupIndex = this.findTerminalGroupIndex(sessionRecord.sessionId);
    this.logBackendDebug("backend.ensureTerminalInGroup.start", {
      currentGroupIndex,
      sessionId: sessionRecord.sessionId,
      targetGroupIndex,
      terminalName:
        getTerminalDisplayName(existingProjection.terminal) ?? existingProjection.terminal.name,
    });
    if (currentGroupIndex === undefined || currentGroupIndex !== targetGroupIndex) {
      let activeTerminalTabLocation = getActiveTerminalTabLocation();
      if (currentGroupIndex === undefined) {
        const activateStartedAt = Date.now();
        existingProjection.terminal.show(false);
        const isActive = await this.waitForActiveTerminal(existingProjection.terminal, isCancelled);
        if (!isActive || isCancelled()) {
          this.logBackendDebug("backend.ensureTerminalInGroup.waitForActiveTerminal.failed", {
            durationMs: Date.now() - activateStartedAt,
            sessionId: sessionRecord.sessionId,
            targetGroupIndex,
          });
          return undefined;
        }
        this.logBackendDebug("backend.ensureTerminalInGroup.waitForActiveTerminal.succeeded", {
          durationMs: Date.now() - activateStartedAt,
          sessionId: sessionRecord.sessionId,
          targetGroupIndex,
        });
        currentGroupIndex = this.findTerminalGroupIndex(sessionRecord.sessionId);
        activeTerminalTabLocation = getActiveTerminalTabLocation();
      } else {
        this.logBackendDebug("backend.ensureTerminalInGroup.skipWaitForActiveTerminal", {
          currentGroupIndex,
          sessionId: sessionRecord.sessionId,
          targetGroupIndex,
        });
      }
      await appendCodeModeDebugLog("ensure-terminal-in-group:before-move", {
        activeTerminalTabLocation,
        currentGroupIndex,
        sessionId: sessionRecord.sessionId,
        targetGroupIndex,
        terminalName:
          getTerminalDisplayName(existingProjection.terminal) ?? existingProjection.terminal.name,
      });

      if (currentGroupIndex === undefined) {
        const movedToEditor = await this.moveTerminalToEditorGroup(
          sessionRecord.sessionId,
          targetGroupIndex,
          existingProjection.terminal,
          isCancelled,
          "backend.ensureTerminalInGroup",
        );
        if (!movedToEditor) {
          return undefined;
        }
        await appendCodeModeDebugLog("ensure-terminal-in-group:moved-to-editor", {
          sessionId: sessionRecord.sessionId,
          targetGroupIndex,
          terminalName:
            getTerminalDisplayName(existingProjection.terminal) ?? existingProjection.terminal.name,
        });
        currentGroupIndex = this.findTerminalGroupIndex(sessionRecord.sessionId);
      }

      if (currentGroupIndex !== undefined && currentGroupIndex !== targetGroupIndex) {
        const moveStartedAt = Date.now();
        const moved = await this.moveTerminalToGroup(
          sessionRecord.sessionId,
          targetGroupIndex,
          isCancelled,
        );
        if (!moved || isCancelled()) {
          this.logBackendDebug("backend.ensureTerminalInGroup.moveTerminalToGroup.failed", {
            durationMs: Date.now() - moveStartedAt,
            observedGroupIndex: this.findTerminalGroupIndex(sessionRecord.sessionId),
            sessionId: sessionRecord.sessionId,
            targetGroupIndex,
          });
          return undefined;
        }
        this.logBackendDebug("backend.ensureTerminalInGroup.moveTerminalToGroup.succeeded", {
          durationMs: Date.now() - moveStartedAt,
          sessionId: sessionRecord.sessionId,
          targetGroupIndex,
        });
      }
    }

    this.logBackendDebug("backend.ensureTerminalInGroup.complete", {
      durationMs: Date.now() - ensureStartedAt,
      observedGroupIndex: this.findTerminalGroupIndex(sessionRecord.sessionId),
      sessionId: sessionRecord.sessionId,
      targetGroupIndex,
    });
    return existingProjection;
  }

  private async attachManagedTerminal(terminal: vscode.Terminal): Promise<void> {
    const sessionId = await this.resolveManagedSessionId(terminal);
    if (!sessionId) {
      return;
    }

    if (this.terminalToSessionId.get(terminal) === sessionId) {
      await this.captureProcessAssociation(sessionId, terminal);
      await this.syncTerminalName(terminal, sessionId);
      return;
    }

    this.bindTerminalToSession(sessionId, terminal);
    await this.captureProcessAssociation(sessionId, terminal);
    await this.syncTerminalName(terminal, sessionId);
    await this.refreshSessionSnapshot(sessionId);
    await this.logState("ATTACH", "managed-terminal", {
      sessionId,
      terminalName: terminal.name,
    });
    this.changeSessionsEmitter.fire();
  }

  private async findExistingTerminal(
    sessionRecord: TerminalSessionRecord,
  ): Promise<vscode.Terminal | undefined> {
    for (const terminal of vscode.window.terminals) {
      const resolvedSessionId = await this.resolveManagedSessionId(terminal);
      if (resolvedSessionId === sessionRecord.sessionId) {
        return terminal;
      }
    }

    return undefined;
  }

  private async resolveManagedSessionId(terminal: vscode.Terminal): Promise<string | undefined> {
    const managedIdentity = getManagedTerminalIdentity(terminal);
    if (
      managedIdentity?.workspaceId === this.options.workspaceId &&
      this.sessionRecordBySessionId.has(managedIdentity.sessionId)
    ) {
      return managedIdentity.sessionId;
    }

    const processId = await this.getTerminalProcessId(terminal);
    if (!processId) {
      return undefined;
    }

    const storedSessionId = this.sessionIdByProcessId.get(processId);
    if (storedSessionId && this.sessionRecordBySessionId.has(storedSessionId)) {
      return storedSessionId;
    }

    const processIdentity = await readManagedTerminalIdentityFromProcessId(processId);
    if (
      processIdentity?.workspaceId === this.options.workspaceId &&
      this.sessionRecordBySessionId.has(processIdentity.sessionId)
    ) {
      return processIdentity.sessionId;
    }

    const sessionRecord = this.findSessionRecordBySurfaceTitleHeuristic(
      terminal.name ?? terminal.creationOptions.name,
    );
    if (sessionRecord) {
      return sessionRecord.sessionId;
    }

    return undefined;
  }

  private bindTerminalToSession(sessionId: string, terminal: vscode.Terminal): void {
    const previousSessionId = this.terminalToSessionId.get(terminal);
    if (previousSessionId && previousSessionId !== sessionId) {
      const previousProjection = this.projections.get(previousSessionId);
      if (previousProjection?.terminal === terminal) {
        this.projections.delete(previousSessionId);
      }
    }

    const previousProjection = this.projections.get(sessionId);
    if (previousProjection && previousProjection.terminal !== terminal) {
      const previousTerminalSessionId = this.terminalToSessionId.get(previousProjection.terminal);
      if (previousTerminalSessionId === sessionId) {
        this.terminalToSessionId.delete(previousProjection.terminal);
      }
    }

    this.projections.set(sessionId, {
      sessionId,
      terminal,
    });
    this.terminalToSessionId.set(terminal, sessionId);
  }

  private async emitActiveEditorSessionFromTabs(): Promise<void> {
    const activeGroupIndex = this.getActiveEditorGroupIndex();
    const activeTerminal = vscode.window.activeTerminal;
    if (activeGroupIndex === undefined || !activeTerminal) {
      this.lastActivatedEditorSessionId = undefined;
      return;
    }

    let sessionId = this.terminalToSessionId.get(activeTerminal);
    if (!sessionId) {
      sessionId = await this.resolveManagedSessionId(activeTerminal);
      if (sessionId) {
        this.bindTerminalToSession(sessionId, activeTerminal);
      }
    }

    if (!sessionId) {
      this.lastActivatedEditorSessionId = undefined;
      return;
    }

    this.observedEditorGroupIndexBySessionId.set(sessionId, activeGroupIndex);

    if (this.lastActivatedEditorSessionId === sessionId) {
      return;
    }

    this.lastActivatedEditorSessionId = sessionId;
    void this.logState("EVENT", "active-editor-terminal-tab-changed", {
      sessionId,
      terminalTitle: getActiveEditorTerminalTabLabel(),
    });
    this.activateSessionEmitter.fire(sessionId);
  }

  private findSessionRecordBySurfaceTitleHeuristic(
    title: string | undefined,
  ): TerminalSessionRecord | undefined {
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) {
      return undefined;
    }

    return [...this.sessionRecordBySessionId.values()].find(
      (sessionRecord) => this.getSessionSurfaceTitle(sessionRecord.sessionId) === normalizedTitle,
    );
  }

  private async syncTerminalName(terminal: vscode.Terminal, sessionId: string): Promise<void> {
    const desiredName = this.getSessionSurfaceTitle(sessionId);
    if (!desiredName) {
      return;
    }

    if ((terminal.name ?? terminal.creationOptions.name) === desiredName) {
      return;
    }

    terminal.show(false);
    await this.waitForActiveTerminal(terminal);
    await vscode.commands.executeCommand(TERMINAL_RENAME_COMMAND, { name: desiredName });
    this.changeSessionTitleEmitter.fire({
      sessionId,
      title: desiredName,
    });
  }

  private async waitForActiveTerminal(
    terminal: vscode.Terminal,
    isCancelled: () => boolean = () => false,
  ): Promise<boolean> {
    const startedAt = Date.now();
    if (isCancelled === defaultNeverCancelled) {
      await waitForActiveTerminalInstance(terminal);
      this.logBackendDebug("backend.waitForActiveTerminal", {
        cancelled: false,
        durationMs: Date.now() - startedAt,
        matched: vscode.window.activeTerminal === terminal,
        terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
      });
      return true;
    }

    const matched = await waitForActiveTerminalOrCancel(terminal, isCancelled);
    this.logBackendDebug("backend.waitForActiveTerminal", {
      cancelled: isCancelled(),
      durationMs: Date.now() - startedAt,
      matched,
      terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
    });
    return matched;
  }

  private async activateTerminalForWorkbenchCommand(terminal: vscode.Terminal): Promise<boolean> {
    if (vscode.window.activeTerminal === terminal) {
      return true;
    }

    terminal.show(true);
    await this.waitForActiveTerminal(terminal);
    if (vscode.window.activeTerminal === terminal) {
      return true;
    }

    terminal.show(false);
    await this.waitForActiveTerminal(terminal);
    return vscode.window.activeTerminal === terminal;
  }

  private async activateTerminalEditorTab(
    sessionId: string,
    groupIndex: number,
    isCancelled: () => boolean = () => false,
  ): Promise<boolean> {
    const startedAt = Date.now();
    const tabIndex = this.findTerminalTabIndex(sessionId, groupIndex);
    if (tabIndex === undefined || tabIndex > 8) {
      this.logBackendDebug("backend.activateTerminalEditorTab.unavailable", {
        groupIndex,
        sessionId,
        tabIndex,
      });
      return false;
    }

    if (isCancelled()) {
      return false;
    }
    await focusEditorGroupByIndex(groupIndex);
    if (isCancelled()) {
      return false;
    }
    if (this.isTerminalTabForeground(sessionId, groupIndex)) {
      return true;
    }

    await vscode.commands.executeCommand(`${OPEN_EDITOR_AT_INDEX_COMMAND_PREFIX}${tabIndex + 1}`);
    const becameForeground =
      isCancelled === defaultNeverCancelled
        ? (await waitForTerminalTabForeground(this.getSessionSurfaceTitle(sessionId), groupIndex), true)
        : await waitForTerminalTabForegroundOrCancel(
            this.getSessionSurfaceTitle(sessionId),
            groupIndex,
            isCancelled,
          );
    this.logBackendDebug("backend.activateTerminalEditorTab.waitForForeground", {
      becameForeground,
      cancelled: isCancelled(),
      durationMs: Date.now() - startedAt,
      groupIndex,
      observedGroupIndex: this.findTerminalGroupIndex(sessionId),
      sessionId,
      tabIndex,
    });
    if (!becameForeground || isCancelled()) {
      return false;
    }
    this.observedEditorGroupIndexBySessionId.set(sessionId, groupIndex);
    return this.isTerminalTabForeground(sessionId, groupIndex);
  }

  private findTerminalGroupIndex(sessionId: string): number | undefined {
    const activeGroupIndex = this.getActiveEditorGroupIndexForBoundTerminal(sessionId);
    if (activeGroupIndex !== undefined) {
      this.observedEditorGroupIndexBySessionId.set(sessionId, activeGroupIndex);
      return activeGroupIndex;
    }

    const heuristicGroupIndex = findTerminalGroupIndexByTitle(this.getSessionSurfaceTitle(sessionId));
    if (heuristicGroupIndex !== undefined) {
      this.observedEditorGroupIndexBySessionId.set(sessionId, heuristicGroupIndex);
      return heuristicGroupIndex;
    }

    return this.observedEditorGroupIndexBySessionId.get(sessionId);
  }

  private findTerminalTabIndex(sessionId: string, groupIndex: number): number | undefined {
    return findTerminalTabIndexByTitle(this.getSessionSurfaceTitle(sessionId), groupIndex);
  }

  private hasTerminalEditorTab(sessionId: string): boolean {
    const groupIndex = this.findTerminalGroupIndex(sessionId);
    if (groupIndex === undefined) {
      return false;
    }

    return this.findTerminalTabIndex(sessionId, groupIndex) !== undefined;
  }

  private async restoreManagedTerminalToEditorPass(
    sessionId: string,
    terminal: vscode.Terminal,
    logPrefix: string,
    forceMoveToEditor: boolean,
  ): Promise<ManagedTerminalRestorePassResult> {
    const isActive = await this.activateTerminalForWorkbenchCommand(terminal);
    const hasEditorTab = this.hasTerminalEditorTab(sessionId);
    this.logBackendDebug(`${logPrefix}.activateTerminal`, {
      activeLocation: getActiveTerminalTabLocation(),
      forceMoveToEditor,
      hasEditorTab,
      isActive,
      sessionId,
      terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
    });
    if (!isActive) {
      return "failed";
    }

    if (!forceMoveToEditor && hasEditorTab) {
      return "verify";
    }

    this.observedEditorGroupIndexBySessionId.delete(sessionId);
    const movedToEditor = await this.moveTerminalToEditorGroup(
      sessionId,
      0,
      terminal,
      defaultNeverCancelled,
      logPrefix,
    );
    if (!movedToEditor) {
      this.logBackendDebug(`${logPrefix}.moveToEditor.failed`, {
        sessionId,
        terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
      });
      return "failed";
    }
    this.logBackendDebug(`${logPrefix}.movedToEditor`, {
      sessionId,
      terminalName: getTerminalDisplayName(terminal) ?? terminal.name,
    });
    return "moved";
  }

  private async verifyManagedTerminalRestoredToEditor(
    sessionId: string,
    terminal: vscode.Terminal,
  ): Promise<boolean> {
    const groupIndex = this.findTerminalGroupIndex(sessionId);
    if (groupIndex === undefined) {
      return false;
    }

    const activatedTab = await this.activateTerminalEditorTab(sessionId, groupIndex);
    if (!activatedTab) {
      return false;
    }

    return this.isBoundTerminalActiveInEditorGroup(terminal, groupIndex);
  }

  private async moveTerminalToGroup(
    sessionId: string,
    targetGroupIndex: number,
    isCancelled: () => boolean = () => false,
  ): Promise<boolean> {
    const startedAt = Date.now();
    const currentGroupIndex = this.findTerminalGroupIndex(sessionId);
    if (currentGroupIndex === undefined || currentGroupIndex === targetGroupIndex) {
      this.logBackendDebug("backend.moveTerminalToGroup.noop", {
        currentGroupIndex,
        sessionId,
        targetGroupIndex,
      });
      return true;
    }

    const projection = this.projections.get(sessionId);
    if (isCancelled()) {
      return false;
    }
    await focusEditorGroupByIndex(currentGroupIndex);
    if (isCancelled()) {
      return false;
    }

    const activatedSourceTab = await this.activateTerminalEditorTab(
      sessionId,
      currentGroupIndex,
      isCancelled,
    );
    this.logBackendDebug("backend.moveTerminalToGroup.activateSourceTab", {
      activatedSourceTab,
      currentGroupIndex,
      durationMs: Date.now() - startedAt,
      sessionId,
      targetGroupIndex,
    });
    if (!activatedSourceTab) {
      this.observedEditorGroupIndexBySessionId.delete(sessionId);
      await this.logState("MOVE", "terminal-group-activate-source-failed", {
        currentGroupIndex,
        sessionId,
        targetGroupIndex,
      });
      const movedToEditor = projection
        ? await this.moveTerminalToEditorGroup(
            sessionId,
            targetGroupIndex,
            projection.terminal,
            isCancelled,
            "backend.moveTerminalToGroup",
          )
        : false;
      this.logBackendDebug("backend.moveTerminalToGroup.fallbackMoveToEditor", {
        currentGroupIndex,
        movedToEditor,
        sessionId,
        targetGroupIndex,
      });
      return movedToEditor;
    }

    if (projection && vscode.window.activeTerminal !== projection.terminal) {
      const activateStartedAt = Date.now();
      projection.terminal.show(false);
      const isActive = await this.waitForActiveTerminal(projection.terminal, isCancelled);
      if (!isActive || isCancelled()) {
        this.logBackendDebug("backend.moveTerminalToGroup.waitForActiveTerminal.failed", {
          currentGroupIndex,
          durationMs: Date.now() - activateStartedAt,
          sessionId,
          targetGroupIndex,
        });
        return false;
      }
      this.logBackendDebug("backend.moveTerminalToGroup.waitForActiveTerminal.succeeded", {
        currentGroupIndex,
        durationMs: Date.now() - activateStartedAt,
        sessionId,
        targetGroupIndex,
      });
    }

    const moveStartedAt = Date.now();
    await moveActiveEditorToGroup(targetGroupIndex);
    const reachedTargetGroup = await this.waitForTerminalGroupIndex(
      sessionId,
      targetGroupIndex,
      isCancelled,
    );
    if (!reachedTargetGroup || isCancelled()) {
      this.logBackendDebug("backend.moveTerminalToGroup.waitForTargetGroup.failed", {
        currentGroupIndex,
        durationMs: Date.now() - moveStartedAt,
        observedGroupIndex: this.findTerminalGroupIndex(sessionId),
        sessionId,
        targetGroupIndex,
      });
      return false;
    }
    this.observedEditorGroupIndexBySessionId.set(sessionId, targetGroupIndex);
    this.logBackendDebug("backend.moveTerminalToGroup.complete", {
      currentGroupIndex,
      durationMs: Date.now() - startedAt,
      sessionId,
      targetGroupIndex,
    });
    await this.logState("MOVE", "terminal-group", {
      currentGroupIndex,
      sessionId,
      targetGroupIndex,
    });
    return true;
  }

  private async moveTerminalToEditorGroup(
    sessionId: string,
    targetGroupIndex: number,
    terminal: vscode.Terminal,
    isCancelled: () => boolean,
    logPrefix: string,
  ): Promise<boolean> {
    if (isCancelled()) {
      return false;
    }
    const activatedTerminal = await this.activateTerminalForWorkbenchCommand(terminal);
    if (!activatedTerminal || isCancelled()) {
      this.logBackendDebug(`${logPrefix}.moveToEditor.activateTerminal.failed`, {
        sessionId,
        targetGroupIndex,
      });
      return false;
    }
    await focusEditorGroupByIndex(targetGroupIndex);
    if (isCancelled()) {
      return false;
    }
    const moveToEditorStartedAt = Date.now();
    await vscode.commands.executeCommand(TERMINAL_MOVE_TO_EDITOR_COMMAND);
    const reachedTargetGroup = await this.waitForTerminalGroupIndex(
      sessionId,
      targetGroupIndex,
      isCancelled,
    );
    const reachedTargetEditorViaBoundTerminal =
      !isCancelled() && this.isBoundTerminalActiveInEditorGroup(terminal, targetGroupIndex);
    if ((!reachedTargetGroup && !reachedTargetEditorViaBoundTerminal) || isCancelled()) {
      this.logBackendDebug(`${logPrefix}.moveToEditor.failed`, {
        durationMs: Date.now() - moveToEditorStartedAt,
        reachedTargetEditorViaBoundTerminal,
        observedGroupIndex: this.findTerminalGroupIndex(sessionId),
        sessionId,
        targetGroupIndex,
      });
      return false;
    }
    this.observedEditorGroupIndexBySessionId.set(sessionId, targetGroupIndex);
    this.logBackendDebug(`${logPrefix}.moveToEditor.succeeded`, {
      durationMs: Date.now() - moveToEditorStartedAt,
      reachedTargetEditorViaBoundTerminal,
      sessionId,
      targetGroupIndex,
    });
    return true;
  }

  private isTerminalTabActive(sessionId: string, terminal: vscode.Terminal): boolean {
    const boundSessionId = this.terminalToSessionId.get(terminal);
    if (boundSessionId !== sessionId) {
      return false;
    }

    return isBoundTerminalTabActive(this.getSessionSurfaceTitle(sessionId), terminal);
  }

  private async refreshSessionSnapshots(): Promise<void> {
    let didChangeSessions = false;
    const titleChanges: TerminalWorkspaceBackendTitleChange[] = [];

    for (const sessionId of this.sessionRecordBySessionId.keys()) {
      const result = await this.refreshSessionSnapshot(sessionId);
      didChangeSessions ||= result.didChangeSnapshot;
      if (result.titleChange) {
        titleChanges.push(result.titleChange);
      }
    }

    for (const titleChange of titleChanges) {
      this.changeSessionTitleEmitter.fire(titleChange);
    }

    if (didChangeSessions) {
      this.changeSessionsEmitter.fire();
    }

  }

  private async refreshSessionSnapshot(sessionId: string): Promise<{
    didChangeSnapshot: boolean;
    titleChange?: TerminalWorkspaceBackendTitleChange;
  }> {
    const projection = this.projections.get(sessionId);
    const persistedState = await this.readPersistedSessionState(sessionId);
    const previousSnapshot = this.sessions.get(sessionId);
    let nextSnapshot: TerminalSessionSnapshot;

    if (!projection || projection.terminal.exitStatus) {
      nextSnapshot = {
        ...(this.sessions.get(sessionId) ??
          createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId)),
        agentName: persistedState.agentName,
        agentStatus: persistedState.agentStatus,
        restoreState: "live",
        status: projection?.terminal.exitStatus ? "exited" : "disconnected",
      };
    } else {
      nextSnapshot = {
        ...(this.sessions.get(sessionId) ??
          createDisconnectedSessionSnapshot(sessionId, this.options.workspaceId)),
        agentName: persistedState.agentName,
        agentStatus: persistedState.agentStatus,
        restoreState: "live",
        startedAt: this.sessions.get(sessionId)?.startedAt ?? new Date().toISOString(),
        status: "running",
        workspaceId: this.options.workspaceId,
      };
    }

    this.sessions.set(sessionId, nextSnapshot);

    const previousTitle = this.sessionTitleBySessionId.get(sessionId);
    const nextTitle = persistedState.title;
    if (!nextTitle) {
      this.sessionTitleBySessionId.delete(sessionId);
      return {
        didChangeSnapshot: !haveSameTerminalSessionSnapshot(previousSnapshot, nextSnapshot),
      };
    }

    this.sessionTitleBySessionId.set(sessionId, nextTitle);
    return {
      didChangeSnapshot: !haveSameTerminalSessionSnapshot(previousSnapshot, nextSnapshot),
      titleChange:
        nextTitle !== previousTitle
          ? {
              sessionId,
              title: nextTitle,
            }
          : undefined,
    };
  }

  private async waitForTerminalGroupIndex(
    sessionId: string,
    targetGroupIndex: number,
    isCancelled: () => boolean = () => false,
  ): Promise<boolean> {
    const startedAt = Date.now();
    const deadline = Date.now() + TERMINAL_GROUP_SETTLE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (isCancelled()) {
        this.logBackendDebug("backend.waitForTerminalGroupIndex.cancelled", {
          durationMs: Date.now() - startedAt,
          observedGroupIndex: this.findTerminalGroupIndex(sessionId),
          sessionId,
          targetGroupIndex,
        });
        return false;
      }
      if (this.findTerminalGroupIndex(sessionId) === targetGroupIndex) {
        this.logBackendDebug("backend.waitForTerminalGroupIndex.succeeded", {
          durationMs: Date.now() - startedAt,
          sessionId,
          targetGroupIndex,
        });
        return true;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, TERMINAL_GROUP_SETTLE_POLL_MS);
      });
    }

    const matched = !isCancelled() && this.findTerminalGroupIndex(sessionId) === targetGroupIndex;
    this.logBackendDebug("backend.waitForTerminalGroupIndex.timeout", {
      durationMs: Date.now() - startedAt,
      matched,
      observedGroupIndex: this.findTerminalGroupIndex(sessionId),
      sessionId,
      targetGroupIndex,
    });
    return matched;
  }

  private logBackendDebug(event: string, details: Record<string, unknown>): void {
    logVSmuxDebug(event, details);
  }

  private async readPersistedSessionState(sessionId: string): Promise<{
    agentName?: string;
    agentStatus: TerminalAgentStatus;
    title?: string;
  }> {
    return readPersistedSessionStateFromFile(this.getSessionAgentStateFilePath(sessionId));
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

  private getSessionSurfaceTitle(sessionId: string): string | undefined {
    const sessionRecord = this.sessionRecordBySessionId.get(sessionId);
    return sessionRecord ? getTerminalSessionSurfaceTitle(sessionRecord) : undefined;
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
      if (Number.isInteger(processId) && processId > 0) {
        this.sessionIdByProcessId.set(processId, sessionId);
      }
    }
  }

  private async captureProcessAssociation(
    sessionId: string,
    terminal: vscode.Terminal,
  ): Promise<void> {
    const processId = await this.getTerminalProcessId(terminal);
    if (!processId || this.sessionIdByProcessId.get(processId) === sessionId) {
      return;
    }

    this.sessionIdByProcessId.set(processId, sessionId);
    const storedAssociations = Object.fromEntries(
      [...this.sessionIdByProcessId.entries()].map(([candidateProcessId, candidateSessionId]) => [
        candidateSessionId,
        candidateProcessId,
      ]),
    );
    await this.options.context.workspaceState?.update(
      this.getProcessAssociationStorageKey(),
      storedAssociations,
    );
  }

  private async getTerminalProcessId(terminal: vscode.Terminal): Promise<number | undefined> {
    try {
      const processId = await terminal.processId;
      return typeof processId === "number" && processId > 0 ? processId : undefined;
    } catch {
      return undefined;
    }
  }

  private isTerminalTabForeground(sessionId: string, groupIndex: number): boolean {
    const activeGroupIndex = this.getActiveEditorGroupIndexForBoundTerminal(sessionId);
    if (activeGroupIndex !== undefined) {
      return activeGroupIndex === groupIndex;
    }

    return isTerminalTabForegroundByTitle(this.getSessionSurfaceTitle(sessionId), groupIndex);
  }

  private getActiveEditorGroupIndex(): number | undefined {
    const activeTabGroup = vscode.window.tabGroups.activeTabGroup;
    if (activeTabGroup?.viewColumn === undefined) {
      return undefined;
    }

    return activeTabGroup.viewColumn - 1;
  }

  private isBoundTerminalActiveInEditorGroup(
    terminal: vscode.Terminal,
    targetGroupIndex: number,
  ): boolean {
    return (
      vscode.window.activeTerminal === terminal &&
      getActiveTerminalTabLocation() === "editor" &&
      this.getActiveEditorGroupIndex() === targetGroupIndex
    );
  }

  private getActiveEditorGroupIndexForBoundTerminal(sessionId: string): number | undefined {
    const projection = this.projections.get(sessionId);
    if (!projection || !this.isTerminalTabActive(sessionId, projection.terminal)) {
      return undefined;
    }

    return getActiveTerminalTabLocation() === "editor" ? this.getActiveEditorGroupIndex() : undefined;
  }

  private async logState(tag: string, message: string, details?: unknown): Promise<void> {
    if (!this.trace.isEnabled()) {
      return;
    }

    await this.trace.log(tag, message, {
      details,
      sessionIds: [...this.sessionRecordBySessionId.keys()],
    });
  }
}

function haveSameTerminalSessionSnapshot(
  left: TerminalSessionSnapshot | undefined,
  right: TerminalSessionSnapshot,
): boolean {
  return (
    left?.agentName === right.agentName &&
    left?.agentStatus === right.agentStatus &&
    left?.cols === right.cols &&
    left?.cwd === right.cwd &&
    left?.endedAt === right.endedAt &&
    left?.errorMessage === right.errorMessage &&
    left?.exitCode === right.exitCode &&
    left?.restoreState === right.restoreState &&
    left?.rows === right.rows &&
    left?.sessionId === right.sessionId &&
    left?.shell === right.shell &&
    left?.startedAt === right.startedAt &&
    left?.status === right.status &&
    left?.workspaceId === right.workspaceId
  );
}
