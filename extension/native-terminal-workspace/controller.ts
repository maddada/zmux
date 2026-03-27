import * as path from "node:path";
import * as vscode from "vscode";
import {
  createSidebarHudState,
  getOrderedSessions,
  resolveSidebarTheme,
  type ExtensionToSidebarMessage,
  type SessionGridDirection,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridSnapshot,
  type SessionRecord,
  type SidebarHydrateMessage,
  type SidebarSessionStateMessage,
  type SidebarToExtensionMessage,
  type TerminalViewMode,
  type T3SessionRecord,
  type VisibleSessionCount,
} from "../../shared/session-grid-contract";
import { getSidebarAgentIconById, type SidebarAgentIcon } from "../../shared/sidebar-agents";
import { NativeTerminalWorkspaceBackend } from "../native-terminal-workspace-backend";
import { buildSidebarMessage, createPreviousSessionEntry } from "../native-terminal-workspace-sidebar-state";
import { PreviousSessionHistory, type PreviousSessionHistoryEntry } from "../previous-session-history";
import {
  deleteSidebarAgentPreference,
  getSidebarAgentButtonById,
  getSidebarAgentButtons,
  saveSidebarAgentPreference,
  syncSidebarAgentOrderPreference,
} from "../sidebar-agent-preferences";
import {
  deleteSidebarCommandPreference,
  getSidebarCommandButtonById,
  getSidebarCommandButtons,
  saveSidebarCommandPreference,
  syncSidebarCommandOrderPreference,
} from "../sidebar-command-preferences";
import { SessionGridStore } from "../session-grid-store";
import { SessionSidebarViewProvider } from "../session-sidebar-view";
import {
  getCurrentEditorLayout,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getWorkspaceId,
  haveSameEditorLayoutShape,
  setEditorLayout,
  type WorkbenchEditorLayout,
} from "../terminal-workspace-environment";
import { T3RuntimeManager } from "../t3-runtime-manager";
import { T3WebviewManager } from "../t3-webview-manager";
import { disposeVSmuxDebugLog, logVSmuxDebug, resetVSmuxDebugLog } from "../vsmux-debug-log";
import { dispatchSidebarMessage } from "./sidebar-message-dispatch";
import {
  COMPLETION_BELL_ENABLED_KEY,
  DISABLE_VS_MUX_MODE_KEY,
  PRIMARY_SESSIONS_CONTAINER_ID,
  SCRATCH_PAD_CONTENT_KEY,
  SECONDARY_SESSIONS_CONTAINER_ID,
  SIDEBAR_LOCATION_IN_SECONDARY_KEY,
  getClampedAgentManagerZoomPercent,
  getClampedCompletionSoundSetting,
  getClampedSidebarThemeSetting,
  getDebuggingMode,
  getShowCloseButtonOnSessionCards,
  getShowHotkeysOnSessionCards,
  getSidebarThemeVariant,
} from "./settings";

const SHORTCUT_LABEL_PLATFORM = process.platform === "darwin" ? "mac" : "default";
const COMMAND_TERMINAL_EXIT_POLL_MS = 250;
const EXPLICIT_FOCUS_T3_OBSERVED_FOCUS_GUARD_MS = 750;
const CODE_MODE_RESTORE_SNAPSHOT_KEY = "VSmux.codeModeRestoreSnapshot";

export { SESSIONS_VIEW_ID } from "./settings";

export type NativeTerminalWorkspaceDebugState = {
  backend: "native";
  platform: NodeJS.Platform;
  terminalUiPath: string;
};

export class NativeTerminalWorkspaceController implements vscode.Disposable {
  private readonly backend: NativeTerminalWorkspaceBackend;
  private readonly disposables: vscode.Disposable[] = [];
  private hasApprovedUntrustedShells = vscode.workspace.isTrusted;
  private isVsMuxDisabled: boolean;
  private lastExplicitFocusSessionId: string | undefined;
  private lastExplicitFocusAt = 0;
  private pendingReconcileRequest: { version: number } | undefined;
  private reconcileRequestVersion = 0;
  private reconcileRunner: Promise<void> | undefined;
  private suppressedObservedFocusDepth = 0;
  private readonly sidebarAgentIconBySessionId = new Map<string, SidebarAgentIcon>();
  private codeModeRestoreSnapshot: GroupedSessionWorkspaceSnapshot | undefined;
  private isRestoringCodeMode = false;
  private readonly previousSessionHistory: PreviousSessionHistory;
  private readonly store: SessionGridStore;
  private readonly terminalTitleBySessionId = new Map<string, string>();
  private t3Runtime: T3RuntimeManager | undefined;
  private readonly t3Webviews: T3WebviewManager;
  private readonly workspaceId: string;
  public readonly sidebarProvider: SessionSidebarViewProvider;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.store = new SessionGridStore(context);
    this.previousSessionHistory = new PreviousSessionHistory(context);
    this.isVsMuxDisabled = context.workspaceState.get<boolean>(DISABLE_VS_MUX_MODE_KEY, false) ?? false;
    this.codeModeRestoreSnapshot =
      context.workspaceState.get<GroupedSessionWorkspaceSnapshot>(CODE_MODE_RESTORE_SNAPSHOT_KEY);
    this.workspaceId = getWorkspaceId();
    this.backend = new NativeTerminalWorkspaceBackend({
      context,
      ensureShellSpawnAllowed: async () => vscode.workspace.isTrusted,
      workspaceId: this.workspaceId,
    });
    this.t3Webviews = new T3WebviewManager({
      context,
      onDidFocusSession: async (sessionId) => this.handleObservedSessionFocus(sessionId),
    });
    this.sidebarProvider = new SessionSidebarViewProvider({
      onMessage: async (message) => this.handleSidebarMessage(message),
    });

    this.disposables.push(
      this.backend,
      this.t3Webviews,
      this.sidebarProvider,
      this.backend.onDidActivateSession((sessionId) => {
        void this.handleObservedSessionFocus(sessionId);
      }),
      this.backend.onDidChangeSessions(() => {
        void this.refreshSidebar();
      }),
      this.backend.onDidChangeSessionTitle(({ sessionId, title }) => {
        this.terminalTitleBySessionId.set(sessionId, title);
        void this.refreshSidebar();
      }),
      vscode.workspace.onDidChangeConfiguration(() => {
        void this.refreshSidebar("hydrate");
      }),
      vscode.window.onDidChangeActiveColorTheme(() => {
        void this.refreshSidebar("hydrate");
      }),
    );
  }

  public async initialize(): Promise<void> {
    resetVSmuxDebugLog();
    logVSmuxDebug("controller.initialize", {
      activeGroupId: this.store.getSnapshot().activeGroupId,
      sessionCount: this.getAllSessionRecords().length,
      vsMuxDisabled: this.isVsMuxDisabled,
    });
    await this.backend.initialize(this.getAllSessionRecords());
    this.syncSurfaceManagers();
    await this.reconcileProjectedSessions();
    await this.refreshSidebar("hydrate");
  }

  public dispose(): void {
    this.t3Runtime?.dispose();
    disposeVSmuxDebugLog();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  public getDebuggingState(): NativeTerminalWorkspaceDebugState {
    return {
      backend: "native",
      platform: process.platform,
      terminalUiPath: "VS Code native shell terminals",
    };
  }

  public async openWorkspace(): Promise<void> {
    await this.revealSidebar();
    if (this.getAllSessionRecords().length === 0) {
      await this.createSession();
      return;
    }

    await this.reconcileProjectedSessions();
    await this.refreshSidebar();
  }

  public async moveSidebarToSecondarySidebar(): Promise<void> {
    await this.showSidebarMoveInstructions();
  }

  public async moveSidebarToOtherSide(): Promise<void> {
    await this.showSidebarMoveInstructions();
  }

  public async revealSidebar(): Promise<void> {
    await vscode.commands.executeCommand(`workbench.view.extension.${this.getSidebarContainerId()}`);
  }

  public async createSession(): Promise<void> {
    const sessionRecord = await this.store.createSession();
    if (!sessionRecord) {
      return;
    }

    await this.createSurfaceIfNeeded(sessionRecord);
    await this.afterStateChange();
  }

  public async focusDirection(direction: SessionGridDirection): Promise<void> {
    const changed = await this.store.focusDirection(direction);
    if (!changed) {
      return;
    }

    await this.afterStateChange();
  }

  public async focusSession(sessionId: string, source?: "sidebar"): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    logVSmuxDebug("controller.focusSession", {
      sessionId,
      sessionKind: sessionRecord.kind,
    });
    this.lastExplicitFocusSessionId = sessionId;
    this.lastExplicitFocusAt = Date.now();
    await this.createSurfaceIfNeeded(sessionRecord);
    const acknowledgedAttention = await this.acknowledgeSessionAttentionIfNeeded(sessionId);
    const changed = await this.store.focusSession(sessionId);
    if (!changed) {
      if (source === "sidebar" && sessionRecord.kind === "t3") {
        this.t3Webviews.focusComposer(sessionId);
      }
      if (acknowledgedAttention) {
        await this.refreshSidebar();
      }
      logVSmuxDebug("controller.focusSession.noChange", { sessionId });
      return;
    }

    await this.afterStateChange();
    if (source === "sidebar" && sessionRecord.kind === "t3") {
      this.t3Webviews.focusComposer(sessionId);
    }
  }

  public async focusSessionSlot(slotNumber: number): Promise<void> {
    const targetIndex = Math.floor(slotNumber) - 1;
    if (!Number.isFinite(targetIndex) || targetIndex < 0) {
      return;
    }

    const session = this.store
      .getSnapshot()
      .groups.flatMap((group) => getOrderedSessions(group.snapshot))
      .at(targetIndex);
    if (session) {
      await this.focusSession(session.sessionId);
    }
  }

  public async revealSession(sessionId?: string): Promise<void> {
    const resolvedSessionId = sessionId ?? (await this.promptForSessionId("Reveal session"));
    if (resolvedSessionId) {
      await this.focusSession(resolvedSessionId);
    }
  }

  public async resetWorkspace(): Promise<void> {
    const archivedSessions = this.getAllSessionRecords()
      .map((sessionRecord) => this.createArchivedSessionEntry(sessionRecord))
      .filter((entry): entry is PreviousSessionHistoryEntry => entry !== undefined);

    for (const sessionRecord of this.getAllSessionRecords()) {
      await this.disposeSurface(sessionRecord);
      this.clearSessionPresentationState(sessionRecord.sessionId);
    }
    if (archivedSessions.length > 0) {
      await this.previousSessionHistory.append(archivedSessions);
    }
    await this.store.reset();
    await this.context.workspaceState.update(DISABLE_VS_MUX_MODE_KEY, false);
    this.isVsMuxDisabled = false;
    await this.afterStateChange();
  }

  public async restartSession(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    if (sessionRecord.kind === "terminal") {
      await this.backend.restartSession(sessionRecord);
    } else {
      this.t3Webviews.disposeSession(sessionRecord.sessionId);
    }

    await this.afterStateChange();
  }

  public async restartSessionFromCommand(sessionId?: string): Promise<void> {
    const resolvedSessionId = sessionId ?? this.store.getFocusedSession()?.sessionId;
    if (resolvedSessionId) {
      await this.restartSession(resolvedSessionId);
    }
  }

  public async renameSession(sessionId: string, title: string): Promise<void> {
    const changed = await this.store.setSessionTitle(sessionId, title);

    const sessionRecord = this.store.getSession(sessionId);
    if (sessionRecord?.kind === "terminal") {
      await this.backend.renameSession(sessionRecord);
      await this.backend.writeText(sessionId, `/rename ${sessionRecord.title}`, false);
    }
    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async promptRenameSession(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      logVSmuxDebug("controller.promptRenameSession.missingSession", { sessionId });
      return;
    }

    logVSmuxDebug("controller.promptRenameSession.start", {
      sessionId,
      sessionTitle: sessionRecord.title,
    });
    const nextTitle = await vscode.window.showInputBox({
      prompt: "Rename session",
      value: sessionRecord.title,
    });
    logVSmuxDebug("controller.promptRenameSession.result", {
      didSubmit: typeof nextTitle === "string",
      nextTitle,
      sessionId,
    });
    if (nextTitle) {
      await this.renameSession(sessionId, nextTitle);
    }
  }

  public async promptRenameFocusedSession(): Promise<void> {
    const focusedSession = this.store.getFocusedSession();
    if (focusedSession) {
      await this.promptRenameSession(focusedSession.sessionId);
    }
  }

  public async closeSession(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    const archivedSession = this.createArchivedSessionEntry(sessionRecord);
    await this.disposeSurface(sessionRecord);
    const removed = await this.store.removeSession(sessionId);
    if (!removed) {
      return;
    }
    this.clearSessionPresentationState(sessionId);
    if (archivedSession) {
      await this.previousSessionHistory.append([archivedSession]);
    }
    await this.afterStateChange();
  }

  public async copyResumeCommand(_sessionId?: string): Promise<void> {
    void vscode.window.showInformationMessage("Resume commands are not part of the simplified VSmux runtime.");
  }

  public async setVisibleCount(visibleCount: VisibleSessionCount): Promise<void> {
    await this.store.setVisibleCount(visibleCount);
    await this.afterStateChange();
  }

  public async toggleFullscreenSession(): Promise<void> {
    await this.store.toggleFullscreenSession();
    await this.afterStateChange();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    await this.store.setViewMode(viewMode);
    await this.afterStateChange();
  }

  public async openSettings(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:maddada.VSmux");
  }

  public async toggleCompletionBell(): Promise<void> {
    await this.context.workspaceState.update(COMPLETION_BELL_ENABLED_KEY, !this.getCompletionBellEnabled());
    await this.refreshSidebar("hydrate");
  }

  public async runSidebarCommand(commandId: string): Promise<void> {
    const commandButton = getSidebarCommandButtonById(this.context, commandId);
    if (!commandButton) {
      return;
    }

    if (commandButton.actionType === "browser") {
      void vscode.window.showWarningMessage("Browser actions are currently disabled.");
      return;
    }

    const command = commandButton.command?.trim();
    if (!command) {
      return;
    }

    if (!(await this.ensureShellSpawnAllowed())) {
      return;
    }

    if (commandButton.closeTerminalOnExit) {
      const terminal = this.createSidebarCommandTerminal(commandButton.name, command, true);
      terminal.show(true);
      this.disposeTerminalWhenProcessExits(terminal);
      return;
    }

    const terminal = this.createSidebarCommandTerminal(commandButton.name, undefined, false);
    terminal.show(true);
    terminal.sendText(command, true);
  }

  public async runSidebarAgent(agentId: string): Promise<void> {
    const agentButton = getSidebarAgentButtonById(agentId);
    if (!agentButton?.command) {
      return;
    }

    if (agentId === "t3") {
      await this.createT3Session(agentButton.command);
      return;
    }

    const sessionRecord = await this.store.createSession();
    if (!sessionRecord) {
      return;
    }

    if (agentButton.icon) {
      this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, agentButton.icon);
    }
    await this.backend.createOrAttachSession(sessionRecord);
    await this.afterStateChange();
    await this.backend.writeText(sessionRecord.sessionId, agentButton.command, true);
  }

  public async restorePreviousSession(historyId?: string): Promise<void> {
    if (!historyId) {
      return;
    }

    const archivedSession = this.previousSessionHistory.getEntry(historyId);
    if (!archivedSession) {
      return;
    }

    const restoredSession =
      archivedSession.sessionRecord.kind === "t3"
        ? await this.store.createSession({
            kind: "t3",
            t3: archivedSession.sessionRecord.t3,
            title: archivedSession.sessionRecord.title,
          })
        : await this.store.createSession({
            title: archivedSession.sessionRecord.title,
          });
    if (!restoredSession) {
      return;
    }

    if (archivedSession.agentIcon) {
      this.sidebarAgentIconBySessionId.set(restoredSession.sessionId, archivedSession.agentIcon);
    }

    if (archivedSession.sessionRecord.alias !== restoredSession.alias) {
      await this.store.renameSessionAlias(
        restoredSession.sessionId,
        archivedSession.sessionRecord.alias,
      );
    }

    const nextSessionRecord = this.store.getSession(restoredSession.sessionId) ?? restoredSession;
    await this.createSurfaceIfNeeded(nextSessionRecord);
    await this.previousSessionHistory.remove(historyId);
    await this.afterStateChange();
  }

  public async deletePreviousSession(historyId?: string): Promise<void> {
    if (!historyId) {
      return;
    }

    await this.previousSessionHistory.remove(historyId);
    await this.refreshSidebar();
  }

  public async clearGeneratedPreviousSessions(): Promise<void> {
    await this.previousSessionHistory.removeGeneratedNames();
    await this.refreshSidebar();
  }

  public async saveScratchPad(content: string): Promise<void> {
    await this.context.workspaceState.update(SCRATCH_PAD_CONTENT_KEY, content);
    await this.refreshSidebar();
  }

  public async saveSidebarCommand(
    commandId: string | undefined,
    name: string,
    actionType: "browser" | "terminal",
    closeTerminalOnExit: boolean,
    command?: string,
    url?: string,
  ): Promise<void> {
    await saveSidebarCommandPreference(this.context, {
      actionType,
      closeTerminalOnExit,
      command,
      commandId,
      name,
      url,
    });
    await this.refreshSidebar("hydrate");
  }

  public async deleteSidebarCommand(commandId: string): Promise<void> {
    await deleteSidebarCommandPreference(this.context, commandId);
    await this.refreshSidebar("hydrate");
  }

  public async syncSidebarCommandOrder(commandIds: readonly string[]): Promise<void> {
    await syncSidebarCommandOrderPreference(this.context, commandIds);
    await this.refreshSidebar("hydrate");
  }

  public async saveSidebarAgent(
    agentId: string | undefined,
    name: string,
    command: string,
    icon?: SidebarAgentIcon,
  ): Promise<void> {
    await saveSidebarAgentPreference({ agentId, command, icon, name });
    await this.refreshSidebar("hydrate");
  }

  public async deleteSidebarAgent(agentId: string): Promise<void> {
    await deleteSidebarAgentPreference(agentId);
    await this.refreshSidebar("hydrate");
  }

  public async syncSidebarAgentOrder(agentIds: readonly string[]): Promise<void> {
    await syncSidebarAgentOrderPreference(agentIds);
    await this.refreshSidebar("hydrate");
  }

  public async focusGroup(groupId: string): Promise<void> {
    const changed = await this.store.focusGroup(groupId);
    if (changed) {
      await this.afterStateChange();
    }
  }

  public async focusGroupByIndex(groupIndex: number): Promise<void> {
    const changed = await this.store.focusGroupByIndex(groupIndex);
    if (changed) {
      await this.afterStateChange();
    }
  }

  public async renameGroup(groupId: string, title: string): Promise<void> {
    const changed = await this.store.renameGroup(groupId, title);
    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async syncSessionOrder(groupId: string, sessionIds: readonly string[]): Promise<void> {
    const changed = await this.store.syncSessionOrder(groupId, sessionIds);
    if (changed) {
      await this.afterStateChange();
    }
  }

  public async syncGroupOrder(groupIds: readonly string[]): Promise<void> {
    const changed = await this.store.syncGroupOrder(groupIds);
    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async moveSessionToGroup(
    sessionId: string,
    groupId: string,
    targetIndex?: number,
  ): Promise<void> {
    const changed = await this.store.moveSessionToGroup(sessionId, groupId, targetIndex);
    if (changed) {
      await this.afterStateChange();
    }
  }

  public async createGroupFromSession(sessionId: string): Promise<void> {
    const groupId = await this.store.createGroupFromSession(sessionId);
    if (groupId) {
      await this.afterStateChange();
    }
  }

  public async createSessionInGroup(groupId: string): Promise<void> {
    await this.store.focusGroup(groupId);
    await this.createSession();
  }

  public async closeGroup(groupId: string): Promise<void> {
    const group = this.store.getGroup(groupId);
    if (!group) {
      return;
    }

    const archivedSessions = group.snapshot.sessions
      .map((sessionRecord) => this.createArchivedSessionEntry(sessionRecord))
      .filter((entry): entry is PreviousSessionHistoryEntry => entry !== undefined);
    for (const sessionRecord of group.snapshot.sessions) {
      await this.disposeSurface(sessionRecord);
      this.clearSessionPresentationState(sessionRecord.sessionId);
    }
    if (archivedSessions.length > 0) {
      await this.previousSessionHistory.append(archivedSessions);
    }
    await this.store.removeGroup(groupId);
    await this.afterStateChange();
  }

  protected async toggleVsMuxDisabled(): Promise<void> {
    if (!this.isVsMuxDisabled) {
      this.codeModeRestoreSnapshot = cloneWorkspaceSnapshot(this.store.getSnapshot());
      await this.context.workspaceState.update(
        CODE_MODE_RESTORE_SNAPSHOT_KEY,
        this.codeModeRestoreSnapshot,
      );
      this.isVsMuxDisabled = true;
      logVSmuxDebug("controller.toggleVsMuxDisabled", {
        nextDisabled: this.isVsMuxDisabled,
      });
      await this.context.workspaceState.update(DISABLE_VS_MUX_MODE_KEY, this.isVsMuxDisabled);
      this.backend.clearObservedEditorGroupPlacement();
      await this.backend.parkAllEditorTerminalsToPanel();
      this.t3Webviews.disposeAllSessions();
      await this.refreshSidebar("hydrate");
      return;
    }

    this.isRestoringCodeMode = true;
    logVSmuxDebug("controller.toggleVsMuxDisabled", {
      nextDisabled: false,
    });
    try {
      if (this.codeModeRestoreSnapshot) {
        await this.store.replaceSnapshot(this.codeModeRestoreSnapshot);
        this.codeModeRestoreSnapshot = undefined;
        await this.context.workspaceState.update(CODE_MODE_RESTORE_SNAPSHOT_KEY, undefined);
      }
      this.backend.clearObservedEditorGroupPlacement();
      await this.backend.restoreAllManagedTerminalsToEditor();
      this.backend.clearObservedEditorGroupPlacement();
      this.isVsMuxDisabled = false;
      await this.context.workspaceState.update(DISABLE_VS_MUX_MODE_KEY, this.isVsMuxDisabled);
      this.isRestoringCodeMode = false;
      await this.afterStateChange();
    } finally {
      this.isRestoringCodeMode = false;
    }
  }

  private async afterStateChange(): Promise<void> {
    this.syncSurfaceManagers();
    logVSmuxDebug("controller.afterStateChange", {
      activeGroupId: this.store.getSnapshot().activeGroupId,
      snapshot: this.describeActiveSnapshot(),
      vsMuxDisabled: this.isVsMuxDisabled,
    });
    if (!this.isVsMuxDisabled) {
      await this.reconcileProjectedSessions();
    }
    await this.refreshSidebar();
  }

  private async handleSidebarMessage(message: SidebarToExtensionMessage): Promise<void> {
    await dispatchSidebarMessage(message, {
      clearGeneratedPreviousSessions: async () => this.clearGeneratedPreviousSessions(),
      clearStartupSidebarRefreshes: () => {},
      closeGroup: async (groupId) => this.closeGroup(groupId),
      closeSession: async (sessionId) => this.closeSession(sessionId),
      copyResumeCommand: async (sessionId) => this.copyResumeCommand(sessionId),
      createGroupFromSession: async (sessionId) => this.createGroupFromSession(sessionId),
      createSession: async () => this.createSession(),
      createSessionInGroup: async (groupId) => this.createSessionInGroup(groupId),
      deletePreviousSession: async (historyId) => this.deletePreviousSession(historyId),
      deleteSidebarAgent: async (agentId) => this.deleteSidebarAgent(agentId),
      deleteSidebarCommand: async (commandId) => this.deleteSidebarCommand(commandId),
      focusGroup: async (groupId) => this.focusGroup(groupId),
      focusSession: async (sessionId, source) => this.focusSession(sessionId, source),
      moveSessionToGroup: async (sessionId, groupId, targetIndex) =>
        this.moveSessionToGroup(sessionId, groupId, targetIndex),
      moveSidebarToOtherSide: async () => this.moveSidebarToOtherSide(),
      openSettings: async () => this.openSettings(),
      promptRenameSession: async (sessionId) => this.promptRenameSession(sessionId),
      refreshSidebarHydrate: async () => this.refreshSidebar("hydrate"),
      renameGroup: async (groupId, title) => this.renameGroup(groupId, title),
      renameSession: async (sessionId, title) => this.renameSession(sessionId, title),
      restartSession: async (sessionId) => this.restartSession(sessionId),
      restorePreviousSession: async (historyId) => this.restorePreviousSession(historyId),
      runSidebarAgent: async (agentId) => this.runSidebarAgent(agentId),
      runSidebarCommand: async (commandId) => this.runSidebarCommand(commandId),
      saveScratchPad: async (content) => this.saveScratchPad(content),
      saveSidebarAgent: async (agentId, name, command, icon) =>
        this.saveSidebarAgent(agentId, name, command, icon),
      saveSidebarCommand: async (commandId, name, actionType, closeTerminalOnExit, command, url) =>
        this.saveSidebarCommand(
          commandId,
          name,
          actionType,
          closeTerminalOnExit === true,
          command,
          url,
        ),
      setViewMode: async (viewMode) => this.setViewMode(viewMode),
      setVisibleCount: async (visibleCount) => this.setVisibleCount(visibleCount),
      syncSidebarAgentOrder: async (agentIds) => this.syncSidebarAgentOrder(agentIds),
      syncGroupOrder: async (groupIds) => this.syncGroupOrder(groupIds),
      syncSessionOrder: async (groupId, sessionIds) => this.syncSessionOrder(groupId, sessionIds),
      syncSidebarCommandOrder: async (commandIds) => this.syncSidebarCommandOrder(commandIds),
      toggleCompletionBell: async () => this.toggleCompletionBell(),
      toggleFullscreenSession: async () => this.toggleFullscreenSession(),
      toggleVsMuxDisabled: async () => this.toggleVsMuxDisabled(),
    });
  }

  private async refreshSidebar(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): Promise<void> {
    await this.sidebarProvider.postMessage(this.createSidebarMessage(type));
  }

  private createSidebarMessage(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): ExtensionToSidebarMessage {
    const activeSnapshot = this.getActiveSnapshot();
    return buildSidebarMessage({
      activeSnapshot,
      browserHasLiveProjection: () => false,
      completionBellEnabled: this.getCompletionBellEnabled(),
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (_sessionRecord, sessionSnapshot) => ({
        activity: sessionSnapshot.agentStatus,
        agentName: sessionSnapshot.agentName,
      }),
      getSessionAgentLaunch: () => undefined,
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getSidebarAgentIcon: (sessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(sessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (sessionRecord) => ({
        activity: "idle",
        isRunning: this.t3Webviews.hasLivePanel(sessionRecord.sessionId),
      }),
      getTerminalTitle: (sessionId) => this.terminalTitleBySessionId.get(sessionId),
      hud: createSidebarHudState(
        activeSnapshot,
        resolveSidebarTheme(getClampedSidebarThemeSetting(), getSidebarThemeVariant()),
        getClampedAgentManagerZoomPercent(),
        getShowCloseButtonOnSessionCards(),
        getShowHotkeysOnSessionCards(),
        getDebuggingMode(),
        this.getCompletionBellEnabled(),
        getClampedCompletionSoundSetting(),
        getSidebarAgentButtons(),
        getSidebarCommandButtons(this.context),
        this.isVsMuxDisabled || this.isRestoringCodeMode,
      ),
      ownsNativeTerminalControl: true,
      platform: SHORTCUT_LABEL_PLATFORM,
      previousSessions: this.previousSessionHistory.getItems(),
      scratchPadContent: this.getScratchPadContent(),
      terminalHasLiveProjection: (sessionId) => this.backend.hasLiveTerminal(sessionId),
      type,
      workspaceId: this.workspaceId,
      workspaceSnapshot: this.store.getSnapshot(),
    });
  }

  private async handleObservedSessionFocus(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    if (this.isVsMuxDisabled || this.isRestoringCodeMode) {
      logVSmuxDebug("controller.handleObservedSessionFocus.ignoredDuringCodeMode", {
        isRestoringCodeMode: this.isRestoringCodeMode,
        sessionId,
        snapshot: this.describeActiveSnapshot(),
      });
      return;
    }

    if (this.suppressedObservedFocusDepth > 0) {
      logVSmuxDebug("controller.handleObservedSessionFocus.ignoredDuringReconcile", {
        sessionId,
        snapshot: this.describeActiveSnapshot(),
      });
      return;
    }

    if (this.shouldIgnoreObservedFocus(sessionRecord)) {
      logVSmuxDebug("controller.handleObservedSessionFocus.ignoredAfterExplicitFocus", {
        explicitFocusAgeMs: Date.now() - this.lastExplicitFocusAt,
        lastExplicitFocusSessionId: this.lastExplicitFocusSessionId,
        sessionId,
        snapshot: this.describeActiveSnapshot(),
      });
      return;
    }

    logVSmuxDebug("controller.handleObservedSessionFocus", {
      sessionId,
      snapshot: this.describeActiveSnapshot(),
    });
    const acknowledgedAttention = await this.acknowledgeSessionAttentionIfNeeded(sessionId);
    const changed = await this.store.focusSession(sessionId);
    if (!changed) {
      if (acknowledgedAttention) {
        await this.refreshSidebar();
      }
      logVSmuxDebug("controller.handleObservedSessionFocus.noChange", { sessionId });
      return;
    }

    await this.afterStateChange();
  }

  private async reconcileProjectedSessions(): Promise<void> {
    const version = ++this.reconcileRequestVersion;
    this.pendingReconcileRequest = { version };
    if (!this.reconcileRunner) {
      this.reconcileRunner = this.runReconcileLoop();
    }
    await this.reconcileRunner;
  }

  private shouldIgnoreObservedFocus(sessionRecord: SessionRecord): boolean {
    if (sessionRecord.kind !== "t3") {
      return false;
    }

    if (!this.lastExplicitFocusSessionId) {
      return false;
    }

    if (this.lastExplicitFocusSessionId === sessionRecord.sessionId) {
      return false;
    }

    const explicitFocusAgeMs = Date.now() - this.lastExplicitFocusAt;
    if (explicitFocusAgeMs > EXPLICIT_FOCUS_T3_OBSERVED_FOCUS_GUARD_MS) {
      return false;
    }

    const focusedSession = this.store.getFocusedSession();
    if (!focusedSession || focusedSession.sessionId !== this.lastExplicitFocusSessionId) {
      return false;
    }

    return true;
  }

  private async runReconcileLoop(): Promise<void> {
    try {
      while (this.pendingReconcileRequest) {
        const request = this.pendingReconcileRequest;
        this.pendingReconcileRequest = undefined;
        logVSmuxDebug("controller.reconcile.dequeue", {
          version: request.version,
        });
        await this.reconcileProjectedSessionsNow(request.version);
      }
    } finally {
      this.reconcileRunner = undefined;
    }
  }

  private async reconcileProjectedSessionsNow(requestVersion: number): Promise<void> {
    this.suppressedObservedFocusDepth += 1;
    try {
      if (this.isReconcileCancelled(requestVersion)) {
        logVSmuxDebug("controller.reconcile.cancelled", {
          reason: "superseded-before-start",
          version: requestVersion,
        });
        return;
      }
      this.syncSurfaceManagers();
      if (this.isVsMuxDisabled) {
        return;
      }

      const activeSnapshot = this.getActiveSnapshot();
      const visibleSessions = activeSnapshot.visibleSessionIds
        .map((sessionId) => this.store.getSession(sessionId))
        .filter((session): session is SessionRecord => session !== undefined);
      logVSmuxDebug("controller.reconcile.start", {
        snapshot: this.describeActiveSnapshot(),
        version: requestVersion,
        visibleSessions: visibleSessions.map((sessionRecord) => ({
          kind: sessionRecord.kind,
          sessionId: sessionRecord.sessionId,
        })),
      });
      const expectedPaneCount = visibleSessions.length >= 2 ? 2 : 1;
      await this.ensureEditorLayout(expectedPaneCount);
      if (this.isReconcileCancelled(requestVersion)) {
        logVSmuxDebug("controller.reconcile.cancelled", {
          reason: "superseded-after-layout",
          version: requestVersion,
        });
        return;
      }

      const focusedSessionId = activeSnapshot.focusedSessionId;
      const projectedVisibleSessions = visibleSessions.map((sessionRecord, groupIndex) => ({
        groupIndex,
        sessionRecord,
      }));
      const revealOrder = [
        ...projectedVisibleSessions.filter(
          ({ sessionRecord }) => sessionRecord.sessionId !== focusedSessionId,
        ),
        ...projectedVisibleSessions.filter(
          ({ sessionRecord }) => sessionRecord.sessionId === focusedSessionId,
        ),
      ];
      const correctlyProjectedCount = projectedVisibleSessions.filter(({ groupIndex, sessionRecord }) =>
        this.isSessionProjectedCorrectly(sessionRecord, groupIndex),
      ).length;
      const shouldUseIncrementalReveal =
        correctlyProjectedCount > 0 && correctlyProjectedCount < projectedVisibleSessions.length;
      const initialRevealTargets = shouldUseIncrementalReveal
        ? revealOrder.filter(
            ({ groupIndex, sessionRecord }) =>
              !this.isSessionProjectedCorrectly(sessionRecord, groupIndex),
          )
        : revealOrder;
      logVSmuxDebug("controller.reconcile.plan", {
        correctlyProjectedCount,
        initialRevealSessionIds: initialRevealTargets.map(({ sessionRecord }) => sessionRecord.sessionId),
        projectedSessionIds: projectedVisibleSessions.map(({ sessionRecord }) => sessionRecord.sessionId),
        shouldUseIncrementalReveal,
      });

      for (const { groupIndex, sessionRecord } of initialRevealTargets) {
        if (this.isReconcileCancelled(requestVersion)) {
          logVSmuxDebug("controller.reconcile.cancelled", {
            reason: "superseded-before-reveal",
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          return;
        }
        const shouldFocusAfterReveal = this.shouldFocusAfterReveal(
          sessionRecord,
          focusedSessionId,
        );
        logVSmuxDebug("controller.reconcile.reveal", {
          groupIndex,
          shouldFocusAfterReveal,
          sessionId: sessionRecord.sessionId,
          version: requestVersion,
        });
        await this.revealSessionInPane(
          sessionRecord,
          groupIndex,
          shouldFocusAfterReveal,
          () => this.isReconcileCancelled(requestVersion),
        );
        if (this.isReconcileCancelled(requestVersion)) {
          logVSmuxDebug("controller.reconcile.cancelled", {
            reason: "superseded-after-reveal",
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          return;
        }
      }

      const retryTargets = revealOrder.filter(
        ({ groupIndex, sessionRecord }) =>
          !this.isSessionProjectedCorrectly(sessionRecord, groupIndex),
      );
      for (const { groupIndex, sessionRecord } of retryTargets) {
        if (this.isReconcileCancelled(requestVersion)) {
          logVSmuxDebug("controller.reconcile.cancelled", {
            reason: "superseded-before-retry",
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          return;
        }
        if (this.isSessionProjectedCorrectly(sessionRecord, groupIndex)) {
          continue;
        }
        const shouldFocusAfterReveal = this.shouldFocusAfterReveal(
          sessionRecord,
          focusedSessionId,
        );
        logVSmuxDebug("controller.reconcile.retry", {
          groupIndex,
          shouldFocusAfterReveal,
          projection: this.describeProjection(sessionRecord),
          sessionId: sessionRecord.sessionId,
          version: requestVersion,
        });
        await this.revealSessionInPane(
          sessionRecord,
          groupIndex,
          shouldFocusAfterReveal,
          () => this.isReconcileCancelled(requestVersion),
        );
        if (this.isReconcileCancelled(requestVersion)) {
          logVSmuxDebug("controller.reconcile.cancelled", {
            reason: "superseded-after-retry",
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          return;
        }
      }

      logVSmuxDebug("controller.reconcile.complete", {
        snapshot: this.describeActiveSnapshot(),
        version: requestVersion,
      });
    } finally {
      this.suppressedObservedFocusDepth = Math.max(0, this.suppressedObservedFocusDepth - 1);
      logVSmuxDebug("controller.reconcile.focusEventsResumed", {
        pendingReconcile: this.pendingReconcileRequest !== undefined,
        suppressedObservedFocusDepth: this.suppressedObservedFocusDepth,
      });
    }
  }

  private async revealSessionInPane(
    sessionRecord: SessionRecord,
    groupIndex: number,
    shouldFocusAfterReveal: boolean,
    isCancelled: () => boolean,
  ): Promise<void> {
    if (sessionRecord.kind === "terminal") {
      await this.backend.createOrAttachSession(sessionRecord);
      if (isCancelled()) {
        return;
      }
      await this.backend.revealSessionInGroup(sessionRecord, groupIndex, isCancelled);
      return;
    }

    if (sessionRecord.kind !== "t3") {
      return;
    }

    await this.ensureT3Ready(sessionRecord);
    await this.t3Webviews.revealSessionInGroup(sessionRecord, groupIndex, shouldFocusAfterReveal);
  }

  private shouldFocusAfterReveal(
    sessionRecord: SessionRecord,
    focusedSessionId: string | undefined,
  ): boolean {
    return sessionRecord.sessionId !== focusedSessionId;
  }

  private isReconcileCancelled(requestVersion: number): boolean {
    return requestVersion !== this.reconcileRequestVersion;
  }

  private isSessionProjectedCorrectly(sessionRecord: SessionRecord, groupIndex: number): boolean {
    if (sessionRecord.kind === "terminal") {
      return (
        this.backend.getObservedGroupIndex(sessionRecord.sessionId) === groupIndex &&
        this.backend.isSessionForegroundVisible(sessionRecord.sessionId)
      );
    }

    return (
      this.t3Webviews.getObservedViewColumn(sessionRecord.sessionId) === groupIndex + 1 &&
      this.t3Webviews.isSessionForegroundVisible(sessionRecord.sessionId)
    );
  }

  private async ensureEditorLayout(visiblePaneCount: number): Promise<void> {
    const expectedLayout = createExpectedLayout(visiblePaneCount);
    const currentLayout = await getCurrentEditorLayout();
    if (haveSameEditorLayoutShape(currentLayout, expectedLayout)) {
      return;
    }
    logVSmuxDebug("controller.ensureEditorLayout", {
      visiblePaneCount,
    });
    await setEditorLayout(expectedLayout);
  }

  private async createSurfaceIfNeeded(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind === "terminal") {
      await this.backend.createOrAttachSession(sessionRecord);
      return;
    }

    if (sessionRecord.kind !== "t3") {
      return;
    }

    await this.ensureT3Ready(sessionRecord);
  }

  private async ensureT3Ready(sessionRecord: T3SessionRecord): Promise<void> {
    const runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
    this.t3Runtime = runtime;
    await runtime.ensureRunning(sessionRecord.t3.workspaceRoot);
  }

  private async createT3Session(startupCommand: string): Promise<void> {
    const runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
    this.t3Runtime = runtime;
    const sessionMetadata = await runtime.createThreadSession(undefined, startupCommand, "T3 Code");
    const sessionRecord = await this.store.createSession({
      kind: "t3",
      t3: sessionMetadata,
      title: "T3 Code",
    });
    if (!sessionRecord) {
      return;
    }

    this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, "t3");
    await this.afterStateChange();
  }

  private async disposeSurface(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind === "terminal") {
      await this.backend.killSession(sessionRecord.sessionId);
      return;
    }

    this.t3Webviews.disposeSession(sessionRecord.sessionId);
  }

  private syncSurfaceManagers(): void {
    const sessions = this.getAllSessionRecords();
    this.backend.syncSessions(sessions);
    this.t3Webviews.syncSessions(sessions);
  }

  private clearSessionPresentationState(sessionId: string): void {
    this.sidebarAgentIconBySessionId.delete(sessionId);
    this.terminalTitleBySessionId.delete(sessionId);
  }

  private createArchivedSessionEntry(
    sessionRecord: SessionRecord,
  ): PreviousSessionHistoryEntry | undefined {
    const group = this.store.getSessionGroup(sessionRecord.sessionId);
    if (!group) {
      return undefined;
    }

    return createPreviousSessionEntry({
      browserHasLiveProjection: () => false,
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (_candidateSessionRecord, sessionSnapshot) => ({
        activity: sessionSnapshot.agentStatus,
        agentName: sessionSnapshot.agentName,
      }),
      getSessionAgentLaunch: () => undefined,
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getSidebarAgentIcon: (sessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(sessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (candidateSessionRecord) => ({
        activity: "idle",
        isRunning: this.t3Webviews.hasLivePanel(candidateSessionRecord.sessionId),
      }),
      getTerminalTitle: (sessionId) => this.terminalTitleBySessionId.get(sessionId),
      group,
      ownsNativeTerminalControl: true,
      platform: SHORTCUT_LABEL_PLATFORM,
      sessionRecord,
      terminalHasLiveProjection: (sessionId) => this.backend.hasLiveTerminal(sessionId),
      workspaceId: this.workspaceId,
    });
  }

  private async ensureShellSpawnAllowed(): Promise<boolean> {
    if (vscode.workspace.isTrusted || this.hasApprovedUntrustedShells) {
      this.hasApprovedUntrustedShells = true;
      return true;
    }

    const approval = await vscode.window.showWarningMessage(
      "VSmux is about to start a shell in an untrusted workspace.",
      {
        detail:
          "Shell sessions can run commands against files in this workspace. Trust the workspace or explicitly allow shell access to continue.",
        modal: true,
      },
      "Allow Shell Access",
    );
    if (!approval) {
      return false;
    }

    this.hasApprovedUntrustedShells = true;
    return true;
  }

  private async acknowledgeSessionAttentionIfNeeded(sessionId: string): Promise<boolean> {
    const sessionSnapshot = this.backend.getSessionSnapshot(sessionId);
    if (sessionSnapshot?.agentStatus !== "attention") {
      return false;
    }

    const acknowledgedAttention = await this.backend.acknowledgeAttention(sessionId);
    logVSmuxDebug("controller.acknowledgeSessionAttentionIfNeeded", {
      acknowledgedAttention,
      sessionId,
    });
    return acknowledgedAttention;
  }

  private createSidebarCommandTerminal(
    name: string,
    command?: string,
    closeOnExit = false,
  ): vscode.Terminal {
    if (closeOnExit && command) {
      const shellPath = getDefaultShell();
      return vscode.window.createTerminal({
        cwd: getDefaultWorkspaceCwd(),
        iconPath: new vscode.ThemeIcon("terminal"),
        isTransient: true,
        location: vscode.TerminalLocation.Panel,
        name: `VSmux: ${name}`,
        shellArgs: getCommandTerminalShellArgs(shellPath, command),
        shellPath,
      });
    }

    return vscode.window.createTerminal({
      cwd: getDefaultWorkspaceCwd(),
      iconPath: new vscode.ThemeIcon("terminal"),
      isTransient: true,
      location: vscode.TerminalLocation.Panel,
      name: `VSmux: ${name}`,
    });
  }

  private disposeTerminalWhenProcessExits(terminal: vscode.Terminal): void {
    const interval = setInterval(() => {
      if (!terminal.exitStatus) {
        return;
      }

      clearInterval(interval);
      terminal.dispose();
    }, COMMAND_TERMINAL_EXIT_POLL_MS);
  }

  private getActiveSnapshot(): SessionGridSnapshot {
    return this.store.getActiveGroup()?.snapshot ?? {
      focusedSessionId: undefined,
      fullscreenRestoreVisibleCount: undefined,
      sessions: [],
      viewMode: "grid",
      visibleCount: 1,
      visibleSessionIds: [],
    };
  }

  private getAllSessionRecords(): SessionRecord[] {
    return this.store.getSnapshot().groups.flatMap((group) => group.snapshot.sessions);
  }

  private getCompletionBellEnabled(): boolean {
    return this.context.workspaceState.get<boolean>(COMPLETION_BELL_ENABLED_KEY, false) ?? false;
  }

  private getScratchPadContent(): string {
    return this.context.workspaceState.get<string>(SCRATCH_PAD_CONTENT_KEY, "") ?? "";
  }

  private getSidebarContainerId(): string {
    return this.context.globalState.get<boolean>(SIDEBAR_LOCATION_IN_SECONDARY_KEY, false)
      ? SECONDARY_SESSIONS_CONTAINER_ID
      : PRIMARY_SESSIONS_CONTAINER_ID;
  }

  private async showSidebarMoveInstructions(): Promise<void> {
    await vscode.commands.executeCommand(`workbench.view.extension.${PRIMARY_SESSIONS_CONTAINER_ID}`);
    await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
    void vscode.window.showInformationMessage("Drag the VSmux icon to the other sidebar.");
  }

  private async promptForSessionId(placeHolder: string): Promise<string | undefined> {
    const items = this.getAllSessionRecords().map((sessionRecord) => ({
      description: sessionRecord.kind,
      label: sessionRecord.alias,
      sessionId: sessionRecord.sessionId,
    }));
    const selection = await vscode.window.showQuickPick(items, { placeHolder });
    return selection?.sessionId;
  }

  private describeActiveSnapshot(): {
    activeGroupId: string;
    focusedSessionId?: string;
    visibleCount: VisibleSessionCount;
    visibleSessionIds: string[];
  } {
    const snapshot = this.getActiveSnapshot();
    return {
      activeGroupId: this.store.getSnapshot().activeGroupId,
      focusedSessionId: snapshot.focusedSessionId,
      visibleCount: snapshot.visibleCount,
      visibleSessionIds: [...snapshot.visibleSessionIds],
    };
  }

  private describeProjection(sessionRecord: SessionRecord): {
    observedGroupIndex?: number;
    observedViewColumn?: number;
    sessionId: string;
    visible: boolean;
  } {
    if (sessionRecord.kind === "terminal") {
      return {
        observedGroupIndex: this.backend.getObservedGroupIndex(sessionRecord.sessionId),
        sessionId: sessionRecord.sessionId,
        visible: this.backend.isSessionForegroundVisible(sessionRecord.sessionId),
      };
    }

    return {
      observedViewColumn: this.t3Webviews.getObservedViewColumn(sessionRecord.sessionId),
      sessionId: sessionRecord.sessionId,
      visible: this.t3Webviews.isSessionForegroundVisible(sessionRecord.sessionId),
    };
  }
}

function cloneWorkspaceSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot,
): GroupedSessionWorkspaceSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as GroupedSessionWorkspaceSnapshot;
}

function getCommandTerminalShellArgs(shellPath: string, command: string): string[] {
  const shellName = path.basename(shellPath).toLowerCase();

  if (process.platform === "win32") {
    if (shellName === "cmd.exe" || shellName === "cmd") {
      return ["/d", "/c", command];
    }

    return ["-NoLogo", "-NoProfile", "-Command", command];
  }

  return ["-l", "-c", command];
}

function createExpectedLayout(visiblePaneCount: number): WorkbenchEditorLayout {
  return {
    groups: Array.from({ length: Math.max(1, Math.min(2, visiblePaneCount)) }, () => ({})),
    orientation: 0,
  };
}
