import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import * as vscode from "vscode";
import {
  clampCompletionSoundSetting,
  type CompletionSoundSetting,
} from "../shared/completion-sound";
import {
  MAX_SESSION_COUNT,
  clampSidebarThemeSetting,
  createSidebarHudState,
  getOrderedSessions,
  getSessionShortcutLabel,
  getVisiblePrimaryTitle,
  resolveSidebarTheme,
  type ExtensionToSidebarMessage,
  type SessionGridDirection,
  type SessionGroupRecord,
  type SessionRecord,
  type SidebarHydrateMessage,
  type SidebarSessionGroup,
  type SidebarSessionItem,
  type SidebarSessionStateMessage,
  type SidebarThemeSetting,
  type SidebarThemeVariant,
  type SidebarToExtensionMessage,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import type { ExtensionToNativeTerminalDebugMessage } from "../shared/native-terminal-debug-contract";
import { getSidebarAgentIconById, type SidebarAgentIcon } from "../shared/sidebar-agents";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { SessionGridStore } from "./session-grid-store";
import { NativeTerminalDebugPanel } from "./native-terminal-debug-panel";
import { SessionSidebarViewProvider } from "./session-sidebar-view";
import {
  deleteSidebarAgentPreference,
  getSidebarAgentButtonById,
  getSidebarAgentButtons,
  saveSidebarAgentPreference,
} from "./sidebar-agent-preferences";
import {
  deleteSidebarCommandPreference,
  getSidebarCommandButtonById,
  getSidebarCommandButtons,
  saveSidebarCommandPreference,
  syncSidebarCommandOrderPreference,
} from "./sidebar-command-preferences";
import {
  getTitleDerivedSessionActivity,
  getTitleDerivedSessionActivityFromTransition,
  haveSameTitleDerivedSessionActivity,
  type TitleDerivedSessionActivity,
} from "./session-title-activity";
import type { TerminalWorkspaceBackend } from "./terminal-workspace-backend";
import {
  createDisconnectedSessionSnapshot,
  createEmptyWorkspaceSessionSnapshot,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getSessionActivityLabel,
  getWorkspaceId,
  getWorkspaceStorageKey,
} from "./terminal-workspace-helpers";
import { NativeTerminalWorkspaceBackend } from "./native-terminal-workspace-backend";

const SETTINGS_SECTION = "VSmux";
const BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING = "backgroundSessionTimeoutMinutes";
const MATCH_VISIBLE_TERMINAL_ORDER_SETTING = "matchVisibleTerminalOrderInSessionsArea";
const NATIVE_TERMINAL_ACTION_DELAY_MS_SETTING = "nativeTerminalActionDelayMs";
const SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING = "sendRenameCommandOnSidebarRename";
const SIDEBAR_THEME_SETTING = "sidebarTheme";
const SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING = "showCloseButtonOnSessionCards";
const SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING = "showHotkeysOnSessionCards";
const DEBUGGING_MODE_SETTING = "debuggingMode";
const COMPLETION_SOUND_SETTING = "completionSound";
const AGENTS_SETTING = "agents";
const COMPLETION_BELL_ENABLED_KEY = "VSmux.completionBellEnabled";
const SESSION_AGENT_COMMANDS_KEY = "VSmux.sessionAgentCommands";
const NATIVE_TERMINAL_CONTROL_OWNER_KEY = "VSmux.nativeTerminalControlOwner";
const NATIVE_TERMINAL_DEBUG_STATE_KEY = "VSmux.nativeTerminalDebugState";
const NATIVE_TERMINAL_CONTROL_OWNER_FILE = "native-terminal-control-owner.json";
export const SESSIONS_VIEW_ID = "VSmux.sessions";
const SHORTCUT_LABEL_PLATFORM = process.platform === "darwin" ? "mac" : "default";
const WORKING_ACTIVITY_STALE_TIMEOUT_MS = 10_000;
const COMMAND_TERMINAL_EXIT_POLL_MS = 250;
const DEBUG_STATE_POLL_INTERVAL_MS = 500;
const CONTROL_OWNER_STALE_MS = 5_000;
const CONTROL_OWNER_HEARTBEAT_MS = 1_000;

type NativeTerminalWorkspaceBackendKind = "native";

export type NativeTerminalWorkspaceDebugState = {
  backend: NativeTerminalWorkspaceBackendKind;
  platform: NodeJS.Platform;
  terminalUiPath: string;
};

type StoredSessionAgentLaunch = {
  agentId: string;
  command: string;
};

type NativeTerminalControlOwnerLease = {
  updatedAt: number;
  windowId: string;
};

export class NativeTerminalWorkspaceController implements vscode.Disposable {
  private hasApprovedUntrustedShells = vscode.workspace.isTrusted;
  private readonly backend: TerminalWorkspaceBackend;
  private backendInitialized = false;
  private readonly backendKind: NativeTerminalWorkspaceBackendKind = "native";
  private readonly disposables: vscode.Disposable[] = [];
  private debugStatePollTimer: NodeJS.Timeout | undefined;
  private readonly lastKnownActivityBySessionId = new Map<string, TerminalAgentStatus>();
  private controlOwnerHeartbeatTimer: NodeJS.Timeout | undefined;
  private ownsNativeTerminalControl = false;
  private readonly sessionAgentLaunchBySessionId = new Map<string, StoredSessionAgentLaunch>();
  private readonly sidebarAgentIconBySessionId = new Map<string, SidebarAgentIcon>();
  private readonly debugPanel: NativeTerminalDebugPanel;
  private readonly store: SessionGridStore;
  private readonly terminalTitleBySessionId = new Map<string, string>();
  private readonly titleDerivedActivityBySessionId = new Map<string, TitleDerivedSessionActivity>();
  private readonly windowInstanceId = randomUUID();
  public readonly sidebarProvider: SessionSidebarViewProvider;
  private readonly workspaceId: string;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.store = new SessionGridStore(context);
    this.workspaceId = getWorkspaceId();
    this.loadSessionAgentCommands();
    this.backend = new NativeTerminalWorkspaceBackend({
      context,
      ensureShellSpawnAllowed: () => this.ensureShellSpawnAllowed(),
      workspaceId: this.workspaceId,
    });
    this.debugPanel = new NativeTerminalDebugPanel(context, {
      onClear: async () => {
        await this.backend.clearDebugArtifacts();
        await this.refreshDebugInspector();
      },
    });
    this.sidebarProvider = new SessionSidebarViewProvider({
      onMessage: async (message) => this.handleSidebarMessage(message),
    });

    this.disposables.push(
      this.backend,
      this.debugPanel,
      this.sidebarProvider,
      this.backend.onDidActivateSession((sessionId) => {
        void this.handleProjectedTerminalActivated(sessionId);
      }),
      this.backend.onDidChangeSessions(() => {
        void this.handleBackendSessionsChanged();
      }),
      this.backend.onDidChangeDebugState(() => {
        void this.refreshDebugInspector();
      }),
      this.backend.onDidChangeSessionTitle(({ sessionId, title }) => {
        void this.syncSessionTitle(sessionId, title);
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration(getBackgroundSessionTimeoutConfigurationKey()) ||
          event.affectsConfiguration(getMatchVisibleTerminalOrderConfigurationKey()) ||
          event.affectsConfiguration(getNativeTerminalActionDelayConfigurationKey())
        ) {
          void this.backend.syncConfiguration();
        }

        if (
          event.affectsConfiguration(getSidebarThemeConfigurationKey()) ||
          event.affectsConfiguration(getCompletionSoundConfigurationKey()) ||
          event.affectsConfiguration(getAgentsConfigurationKey()) ||
          event.affectsConfiguration(getShowCloseButtonOnSessionCardsConfigurationKey()) ||
          event.affectsConfiguration(getShowHotkeysOnSessionCardsConfigurationKey()) ||
          event.affectsConfiguration(getDebuggingModeConfigurationKey())
        ) {
          void this.refreshSidebar("hydrate");
        }
      }),
      vscode.window.onDidChangeActiveColorTheme(() => {
        void this.refreshSidebar("hydrate");
      }),
    );
  }

  public async initialize(): Promise<void> {
    await this.migrateCompletionBellPreference();
    await this.ensureNativeTerminalControl();
    if (this.ownsNativeTerminalControl) {
      await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    }
    await this.refreshSidebar("hydrate");
  }

  public getDebuggingState(): NativeTerminalWorkspaceDebugState {
    return {
      backend: this.backendKind,
      platform: process.platform,
      terminalUiPath: "VS Code native shell terminals",
    };
  }

  public dispose(): void {
    this.stopControlOwnerHeartbeat();
    this.stopDebugStatePolling();
    void this.releaseNativeTerminalControl();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  public async createSession(): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const sessionRecord = await this.store.createSession();
    if (!sessionRecord) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
      return;
    }

    await this.backend.createOrAttachSession(sessionRecord);
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async focusDirection(direction: SessionGridDirection): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusDirection(direction);
    if (!changed) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds);
    await this.refreshSidebar();
  }

  public async focusSession(sessionId: string, preserveFocus = false): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const shouldResumeAgentSession =
      this.sessionAgentLaunchBySessionId.has(sessionId) && !this.backend.hasLiveTerminal(sessionId);
    const changed = await this.store.focusSession(sessionId);
    if (changed) {
      await this.updateFocusedTerminal(previousVisibleSessionIds, preserveFocus);
    } else {
      await this.restoreSessionProjectionIfNeeded(sessionId, preserveFocus);
    }

    if (shouldResumeAgentSession) {
      await this.resumeAgentSessionIfConfigured(sessionId);
    }

    const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);
    if (changed && !acknowledgedAttention) {
      await this.refreshSidebar();
    }
  }

  public async focusSessionSlot(slotNumber: number): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const normalizedSlotNumber = Math.max(1, Math.min(MAX_SESSION_COUNT, Math.floor(slotNumber)));
    const session = getOrderedSessions(this.getActiveSnapshot()).find(
      (sessionRecord) => sessionRecord.slotIndex === normalizedSlotNumber - 1,
    );
    if (!session) {
      return;
    }

    await this.focusSession(session.sessionId);
  }

  public async openWorkspace(): Promise<void> {
    await vscode.commands.executeCommand("workbench.view.extension.VSmuxSessions");

    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    if (this.getAllSessionRecords().length === 0) {
      await this.createSession();
      return;
    }

    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async openDebugInspector(): Promise<void> {
    await this.debugPanel.reveal();
    this.ensureDebugStatePolling();
    await this.refreshDebugInspector();
  }

  public async revealSession(sessionId?: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const resolvedSessionId = sessionId ?? (await this.promptForSessionId("Reveal session"));
    if (!resolvedSessionId) {
      return;
    }

    await this.focusSession(resolvedSessionId);
  }

  public async resetWorkspace(): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const confirmation = await vscode.window.showWarningMessage(
      "Reset VSmux sessions?",
      {
        detail:
          "This clears the saved session grid for the current workspace and kills all detached shells owned by it.",
        modal: true,
      },
      "Reset",
    );

    if (!confirmation) {
      return;
    }

    for (const sessionRecord of this.getAllSessionRecords()) {
      await this.backend.killSession(sessionRecord.sessionId);
    }

    this.sessionAgentLaunchBySessionId.clear();
    this.terminalTitleBySessionId.clear();
    this.titleDerivedActivityBySessionId.clear();
    this.sidebarAgentIconBySessionId.clear();
    await this.persistSessionAgentCommands();
    await this.store.reset();
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async restartSession(sessionId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    this.terminalTitleBySessionId.delete(sessionId);
    this.titleDerivedActivityBySessionId.delete(sessionId);
    await this.backend.restartSession(sessionRecord);
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async restartSessionFromCommand(sessionId?: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const resolvedSessionId = sessionId ?? (await this.promptForSessionId("Restart session"));
    if (!resolvedSessionId) {
      return;
    }

    await this.restartSession(resolvedSessionId);
  }

  public async renameSession(sessionId: string, title: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const nextAlias = title.trim();
    if (!nextAlias) {
      return;
    }

    const changed = await this.store.renameSessionAlias(sessionId, nextAlias);
    const shouldSendRenameCommand = getSendRenameCommandOnSidebarRename();
    if (!changed && !shouldSendRenameCommand) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    if (changed) {
      await this.backend.renameSession(sessionRecord);
    }

    if (shouldSendRenameCommand) {
      await this.writePendingRenameCommand(sessionId, nextAlias);
      await this.focusSession(sessionId);
    }

    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async promptRenameSession(sessionId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const session = this.store.getSession(sessionId);
    if (!session) {
      return;
    }

    const title = await vscode.window.showInputBox({
      prompt: "Enter a session nickname",
      title: "Rename VSC-Mux Session",
      validateInput: (value) =>
        value.trim().length === 0 ? "Session nickname cannot be empty." : undefined,
      value: session.alias,
      valueSelection: [0, session.alias.length],
    });
    if (title === undefined) {
      return;
    }

    await this.renameSession(sessionId, title);
  }

  public async promptRenameFocusedSession(): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const session =
      this.store.getFocusedSession() ?? getOrderedSessions(this.getActiveSnapshot())[0];
    if (!session) {
      void vscode.window.showInformationMessage("No sessions are available yet.");
      return;
    }

    await this.promptRenameSession(session.sessionId);
  }

  public async closeSession(sessionId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const removed = await this.store.removeSession(sessionId);
    if (!removed) {
      return;
    }

    await this.backend.killSession(sessionId);
    await this.deleteSessionAgentCommand(sessionId);
    this.terminalTitleBySessionId.delete(sessionId);
    this.titleDerivedActivityBySessionId.delete(sessionId);
    this.sidebarAgentIconBySessionId.delete(sessionId);
    const snapshot = this.getActiveSnapshot();
    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];

    if (!this.backend.canReuseVisibleLayout(snapshot)) {
      await this.backend.reconcileVisibleTerminals(snapshot);
    } else if (focusedSessionId) {
      await this.backend.focusSession(focusedSessionId, false);
    }

    await this.refreshSidebar();
  }

  public async setVisibleCount(visibleCount: VisibleSessionCount): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    await this.store.setVisibleCount(visibleCount);
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async toggleFullscreenSession(): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    await this.store.toggleFullscreenSession();
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    await this.store.setViewMode(viewMode);
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async openSettings(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:maddada.VSmux");
  }

  public async toggleCompletionBell(): Promise<void> {
    const nextValue = !this.getCompletionBellEnabled();
    await this.context.globalState.update(this.getCompletionBellEnabledStorageKey(), nextValue);
    await this.context.workspaceState.update(COMPLETION_BELL_ENABLED_KEY, nextValue);
    await this.refreshSidebar();
  }

  public async runSidebarCommand(commandId: string): Promise<void> {
    const commandButton = getSidebarCommandButtonById(this.context, commandId);
    const command = commandButton?.command?.trim();
    if (!command) {
      return;
    }

    if (!(await this.ensureShellSpawnAllowed())) {
      return;
    }

    if (commandButton?.closeTerminalOnExit) {
      const terminal = this.createSidebarCommandTerminal(commandButton.name, command, true);
      terminal.show(true);
      this.disposeTerminalWhenProcessExits(terminal);
      return;
    }

    const terminal = this.createSidebarCommandTerminal(commandButton?.name ?? "Command");
    terminal.show(true);
    terminal.sendText(command, true);
  }

  public async runSidebarAgent(agentId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const agentButton = getSidebarAgentButtonById(agentId);
    if (!agentButton) {
      return;
    }

    const command = agentButton.command?.trim();
    if (!command) {
      return;
    }

    const sessionRecord = await this.store.createSession();
    if (!sessionRecord) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
      return;
    }

    if (agentButton.icon) {
      this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, agentButton.icon);
    }

    const nextSessionRecord = this.store.getSession(sessionRecord.sessionId) ?? sessionRecord;
    await this.setSessionAgentLaunch(nextSessionRecord.sessionId, agentId, command);
    await this.backend.createOrAttachSession(nextSessionRecord);
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
    await this.backend.writeText(nextSessionRecord.sessionId, command, true);
  }

  public async saveSidebarCommand(
    commandId: string | undefined,
    name: string,
    command: string,
    closeTerminalOnExit: boolean,
  ): Promise<void> {
    await saveSidebarCommandPreference(this.context, {
      closeTerminalOnExit,
      command,
      commandId,
      name,
    });
    await this.refreshSidebar();
  }

  public async deleteSidebarCommand(commandId: string): Promise<void> {
    await deleteSidebarCommandPreference(this.context, commandId);
    await this.refreshSidebar();
  }

  public async syncSidebarCommandOrder(commandIds: readonly string[]): Promise<void> {
    await syncSidebarCommandOrderPreference(this.context, commandIds);
    await this.refreshSidebar();
  }

  public async saveSidebarAgent(
    agentId: string | undefined,
    name: string,
    command: string,
  ): Promise<void> {
    await saveSidebarAgentPreference({
      agentId,
      command,
      name,
    });
    await this.refreshSidebar("hydrate");
  }

  public async deleteSidebarAgent(agentId: string): Promise<void> {
    await deleteSidebarAgentPreference(agentId);
    await this.refreshSidebar("hydrate");
  }

  public async focusGroup(groupId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    if (!this.store.getGroup(groupId)) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusGroup(groupId);
    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async focusGroupByIndex(groupIndex: number): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    if (!this.store.getSnapshot().groups[groupIndex - 1]) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusGroupByIndex(groupIndex);
    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async renameGroup(groupId: string, title: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const changed = await this.store.renameGroup(groupId, title);
    if (!changed) {
      return;
    }

    await this.refreshSidebar();
  }

  public async syncSessionOrder(groupId: string, sessionIds: readonly string[]): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const changed = await this.store.syncSessionOrder(groupId, sessionIds);
    if (!changed) {
      return;
    }

    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async syncGroupOrder(groupIds: readonly string[]): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const changed = await this.store.syncGroupOrder(groupIds);
    if (!changed) {
      return;
    }

    await this.refreshSidebar();
  }

  public async moveSessionToGroup(
    sessionId: string,
    groupId: string,
    targetIndex?: number,
  ): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.moveSessionToGroup(sessionId, groupId, targetIndex);
    if (!changed) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async createGroupFromSession(sessionId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const groupId = await this.store.createGroupFromSession(sessionId);
    if (!groupId) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async createSessionInGroup(groupId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    if (!this.store.getGroup(groupId)) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    await this.store.focusGroup(groupId);

    const sessionRecord = await this.store.createSession();
    if (!sessionRecord) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
      await this.updateFocusedTerminal(previousVisibleSessionIds, false);
      await this.refreshSidebar();
      return;
    }

    await this.backend.createOrAttachSession(sessionRecord);
    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async closeGroup(groupId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const group = this.store.getGroup(groupId);
    if (!group || this.store.getSnapshot().groups.length <= 1) {
      return;
    }

    for (const sessionRecord of group.snapshot.sessions) {
      await this.backend.killSession(sessionRecord.sessionId);
      await this.deleteSessionAgentCommand(sessionRecord.sessionId);
      this.terminalTitleBySessionId.delete(sessionRecord.sessionId);
      this.titleDerivedActivityBySessionId.delete(sessionRecord.sessionId);
      this.sidebarAgentIconBySessionId.delete(sessionRecord.sessionId);
    }

    const removed = await this.store.removeGroup(groupId);
    if (!removed) {
      return;
    }

    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  private createSidebarMessage(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): ExtensionToSidebarMessage {
    const workspaceSnapshot = this.store.getSnapshot();
    const activeSnapshot = this.getActiveSnapshot();

    return {
      hud: createSidebarHudState(
        activeSnapshot,
        resolveSidebarTheme(getClampedSidebarThemeSetting(), getSidebarThemeVariant()),
        getShowCloseButtonOnSessionCards(),
        getShowHotkeysOnSessionCards(),
        getDebuggingMode(),
        this.getCompletionBellEnabled(),
        getClampedCompletionSoundSetting(),
        getSidebarAgentButtons(),
        getSidebarCommandButtons(this.context),
      ),
      groups: workspaceSnapshot.groups.map((group) => this.createSidebarGroup(group)),
      type,
    };
  }

  private createDebugInspectorMessage(): ExtensionToNativeTerminalDebugMessage {
    const sidebarState = this.createSidebarMessage("sessionState") as SidebarSessionStateMessage;

    return {
      state: {
        backend: this.backend.getDebugState(),
        observedAt: new Date().toISOString(),
        sidebar: {
          groups: sidebarState.groups,
          hud: sidebarState.hud,
        },
        workspaceId: this.workspaceId,
      },
      type: "hydrate",
    };
  }

  private async ensureNativeTerminalControl(): Promise<boolean> {
    const ownerLease = await this.getStoredNativeTerminalControlOwner();
    const ownerLeaseIsStale =
      ownerLease === undefined || Date.now() - ownerLease.updatedAt > CONTROL_OWNER_STALE_MS;
    const shouldOwnWindow = ownerLeaseIsStale || ownerLease?.windowId === this.windowInstanceId;

    this.ownsNativeTerminalControl = shouldOwnWindow;
    if (!shouldOwnWindow) {
      this.stopControlOwnerHeartbeat();
      this.ensureDebugStatePolling();
      return false;
    }

    await this.publishNativeTerminalControlOwnerLease();
    if (!this.backendInitialized) {
      await this.backend.syncConfiguration();
      await this.backend.initialize(this.getAllSessionRecords());
      this.backendInitialized = true;
    }

    this.ensureControlOwnerHeartbeat();
    this.stopDebugStatePolling();
    return true;
  }

  private async releaseNativeTerminalControl(): Promise<void> {
    if (!this.ownsNativeTerminalControl) {
      return;
    }

    const ownerLease = await this.getStoredNativeTerminalControlOwner();
    if (ownerLease?.windowId !== this.windowInstanceId) {
      return;
    }

    this.stopControlOwnerHeartbeat();
    await this.clearNativeTerminalControlOwnerLease();
  }

  private async getStoredNativeTerminalControlOwner(): Promise<
    NativeTerminalControlOwnerLease | undefined
  > {
    try {
      const rawLease = await readFile(this.getNativeTerminalControlOwnerFilePath(), "utf8");
      const ownerLease = JSON.parse(rawLease) as Partial<NativeTerminalControlOwnerLease>;
      if (!ownerLease?.windowId || !Number.isFinite(ownerLease.updatedAt)) {
        return undefined;
      }

      return {
        updatedAt: Number(ownerLease.updatedAt),
        windowId: ownerLease.windowId,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        void this.context.globalState.update(
          this.getNativeTerminalControlOwnerStorageKey(),
          undefined,
        );
      }

      return undefined;
    }
  }

  private getNativeTerminalControlOwnerStorageKey(): string {
    return getWorkspaceStorageKey(NATIVE_TERMINAL_CONTROL_OWNER_KEY, this.workspaceId);
  }

  private getNativeTerminalControlOwnerFilePath(): string {
    return path.join(this.context.globalStorageUri.fsPath, NATIVE_TERMINAL_CONTROL_OWNER_FILE);
  }

  private getNativeTerminalDebugStateStorageKey(): string {
    return getWorkspaceStorageKey(NATIVE_TERMINAL_DEBUG_STATE_KEY, this.workspaceId);
  }

  private async publishSharedDebugInspectorMessage(
    message: ExtensionToNativeTerminalDebugMessage,
  ): Promise<void> {
    await this.context.globalState.update(this.getNativeTerminalDebugStateStorageKey(), message);
  }

  private getSharedDebugInspectorMessage(): ExtensionToNativeTerminalDebugMessage | undefined {
    return this.context.globalState.get<ExtensionToNativeTerminalDebugMessage | undefined>(
      this.getNativeTerminalDebugStateStorageKey(),
    );
  }

  private ensureDebugStatePolling(): void {
    if (this.debugStatePollTimer) {
      return;
    }

    this.debugStatePollTimer = setInterval(() => {
      if (this.ownsNativeTerminalControl || !this.debugPanel.hasPanel()) {
        return;
      }

      void this.refreshDebugInspector();
    }, DEBUG_STATE_POLL_INTERVAL_MS);
  }

  private stopDebugStatePolling(): void {
    if (!this.debugStatePollTimer) {
      return;
    }

    clearInterval(this.debugStatePollTimer);
    this.debugStatePollTimer = undefined;
  }

  private ensureControlOwnerHeartbeat(): void {
    if (this.controlOwnerHeartbeatTimer) {
      return;
    }

    this.controlOwnerHeartbeatTimer = setInterval(() => {
      if (!this.ownsNativeTerminalControl) {
        return;
      }

      void this.publishNativeTerminalControlOwnerLease();
    }, CONTROL_OWNER_HEARTBEAT_MS);
  }

  private stopControlOwnerHeartbeat(): void {
    if (!this.controlOwnerHeartbeatTimer) {
      return;
    }

    clearInterval(this.controlOwnerHeartbeatTimer);
    this.controlOwnerHeartbeatTimer = undefined;
  }

  private async publishNativeTerminalControlOwnerLease(): Promise<void> {
    const ownerLease = {
      updatedAt: Date.now(),
      windowId: this.windowInstanceId,
    } satisfies NativeTerminalControlOwnerLease;
    await mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
    await writeFile(
      this.getNativeTerminalControlOwnerFilePath(),
      JSON.stringify(ownerLease),
      "utf8",
    );
    await this.context.globalState.update(
      this.getNativeTerminalControlOwnerStorageKey(),
      ownerLease,
    );
  }

  private async clearNativeTerminalControlOwnerLease(): Promise<void> {
    await rm(this.getNativeTerminalControlOwnerFilePath(), { force: true });
    await this.context.globalState.update(
      this.getNativeTerminalControlOwnerStorageKey(),
      undefined,
    );
  }

  private createSidebarGroup(group: SessionGroupRecord): SidebarSessionGroup {
    return {
      groupId: group.groupId,
      isActive: this.store.getSnapshot().activeGroupId === group.groupId,
      isFocusModeActive:
        group.snapshot.visibleCount === 1 &&
        group.snapshot.fullscreenRestoreVisibleCount !== undefined,
      sessions: getOrderedSessions(group.snapshot).map((session) =>
        this.createSidebarItem(group, session),
      ),
      title: group.title,
      viewMode: group.snapshot.viewMode,
      visibleCount: group.snapshot.visibleCount,
    };
  }

  private createSidebarItem(
    group: SessionGroupRecord,
    sessionRecord: SessionRecord,
  ): SidebarSessionItem {
    const sessionSnapshot =
      this.backend.getSessionSnapshot(sessionRecord.sessionId) ??
      createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.workspaceId);
    const activeSnapshot = this.getActiveSnapshot();
    const isActiveGroup = this.store.getSnapshot().activeGroupId === group.groupId;
    const effectiveActivity = this.getEffectiveSessionActivity(sessionRecord, sessionSnapshot);

    return {
      activity: effectiveActivity.activity,
      activityLabel: getSessionActivityLabel(
        effectiveActivity.activity,
        effectiveActivity.agentName,
      ),
      agentIcon:
        this.sidebarAgentIconBySessionId.get(sessionRecord.sessionId) ??
        getSidebarAgentIconById(sessionSnapshot.agentName) ??
        getSidebarAgentIconById(effectiveActivity.agentName),
      alias: sessionRecord.alias,
      column: sessionRecord.column,
      detail: this.ownsNativeTerminalControl
        ? sessionSnapshot.errorMessage
        : "Managed in another VS Code window",
      isFocused: isActiveGroup && activeSnapshot.focusedSessionId === sessionRecord.sessionId,
      isRunning:
        sessionSnapshot.status === "running" &&
        this.backend.hasLiveTerminal(sessionRecord.sessionId),
      isVisible:
        isActiveGroup && activeSnapshot.visibleSessionIds.includes(sessionRecord.sessionId),
      primaryTitle: getVisibleTerminalTitle(getVisiblePrimaryTitle(sessionRecord.title)),
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
      sessionNumber: getDebuggingSessionNumber(sessionRecord.sessionId),
      shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, SHORTCUT_LABEL_PLATFORM),
      terminalTitle: getVisibleTerminalTitle(
        this.terminalTitleBySessionId.get(sessionRecord.sessionId),
      ),
    };
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

  private async handleSidebarMessage(message: SidebarToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        await this.refreshSidebar("hydrate");
        return;

      case "createSession":
        await this.createSession();
        return;

      case "createSessionInGroup":
        await this.createSessionInGroup(message.groupId);
        return;

      case "focusGroup":
        await this.focusGroup(message.groupId);
        return;

      case "toggleFullscreenSession":
        await this.toggleFullscreenSession();
        return;

      case "openSettings":
        await this.openSettings();
        return;

      case "openDebugInspector":
        await this.openDebugInspector();
        return;

      case "toggleCompletionBell":
        await this.toggleCompletionBell();
        return;

      case "runSidebarAgent":
        await this.runSidebarAgent(message.agentId);
        return;

      case "runSidebarCommand":
        await this.runSidebarCommand(message.commandId);
        return;

      case "saveSidebarAgent":
        await this.saveSidebarAgent(message.agentId, message.name, message.command);
        return;

      case "saveSidebarCommand":
        await this.saveSidebarCommand(
          message.commandId,
          message.name,
          message.command,
          message.closeTerminalOnExit,
        );
        return;

      case "deleteSidebarAgent":
        await this.deleteSidebarAgent(message.agentId);
        return;

      case "deleteSidebarCommand":
        await this.deleteSidebarCommand(message.commandId);
        return;

      case "syncSidebarCommandOrder":
        await this.syncSidebarCommandOrder(message.commandIds);
        return;

      case "focusSession":
        if (message.sessionId) {
          await this.focusSession(message.sessionId, message.preserveFocus === true);
        }
        return;

      case "promptRenameSession":
        if (message.sessionId) {
          await this.promptRenameSession(message.sessionId);
        }
        return;

      case "restartSession":
        if (message.sessionId) {
          await this.restartSession(message.sessionId);
        }
        return;

      case "renameSession":
        if (message.sessionId) {
          await this.renameSession(message.sessionId, message.title);
        }
        return;

      case "renameGroup":
        await this.renameGroup(message.groupId, message.title);
        return;

      case "closeGroup":
        await this.closeGroup(message.groupId);
        return;

      case "closeSession":
        if (message.sessionId) {
          await this.closeSession(message.sessionId);
        }
        return;

      case "moveSessionToGroup":
        await this.moveSessionToGroup(message.sessionId, message.groupId, message.targetIndex);
        return;

      case "createGroupFromSession":
        await this.createGroupFromSession(message.sessionId);
        return;

      case "setVisibleCount":
        if (message.visibleCount) {
          await this.setVisibleCount(message.visibleCount);
        }
        return;

      case "setViewMode":
        if (message.viewMode) {
          await this.setViewMode(message.viewMode);
        }
        return;

      case "syncSessionOrder":
        await this.syncSessionOrder(message.groupId, message.sessionIds);
        return;

      case "syncGroupOrder":
        await this.syncGroupOrder(message.groupIds);
        return;
    }
  }

  private async handleBackendSessionsChanged(): Promise<void> {
    await this.syncKnownSessionActivities(true);

    const focusedSessionId = this.getActiveSnapshot().focusedSessionId;
    if (
      focusedSessionId &&
      this.backend.getSessionSnapshot(focusedSessionId)?.agentStatus === "attention" &&
      this.shouldAcknowledgeSessionAttention(focusedSessionId)
    ) {
      const acknowledgedAttention = await this.acknowledgeSessionAttention(focusedSessionId);
      if (acknowledgedAttention) {
        return;
      }
    }

    await this.refreshSidebar();
  }

  private async refreshSidebar(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): Promise<void> {
    await this.syncKnownSessionActivities(false);
    await this.sidebarProvider.postMessage(this.createSidebarMessage(type));
    await this.refreshDebugInspector();
  }

  private async refreshDebugInspector(): Promise<void> {
    if (this.ownsNativeTerminalControl) {
      const message = this.createDebugInspectorMessage();
      await this.publishSharedDebugInspectorMessage(message);
      await this.debugPanel.postMessage(message);
      return;
    }

    await this.debugPanel.postMessage(
      this.getSharedDebugInspectorMessage() ?? this.createDebugInspectorMessage(),
    );
  }

  private async acknowledgeSessionAttention(sessionId: string): Promise<boolean> {
    let acknowledgedAttention = false;
    const titleDerivedActivity = this.titleDerivedActivityBySessionId.get(sessionId);
    if (titleDerivedActivity?.activity === "attention") {
      this.titleDerivedActivityBySessionId.set(sessionId, {
        ...titleDerivedActivity,
        activity: "idle",
      });
      acknowledgedAttention = true;
    }

    const sessionSnapshot = this.backend.getSessionSnapshot(sessionId);
    if (!sessionSnapshot || sessionSnapshot.agentStatus !== "attention") {
      if (acknowledgedAttention) {
        await this.refreshSidebar();
      }
      return acknowledgedAttention;
    }

    const backendAcknowledged = await this.backend.acknowledgeAttention(sessionId);
    if (!backendAcknowledged && !acknowledgedAttention) {
      return false;
    }

    await this.refreshSidebar();
    return true;
  }

  private async handleProjectedTerminalActivated(sessionId: string): Promise<void> {
    const changed = await this.store.focusSession(sessionId);
    const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);

    if (changed && !acknowledgedAttention) {
      await this.refreshSidebar();
    }
  }

  private shouldAcknowledgeSessionAttention(sessionId: string): boolean {
    const snapshot = this.getActiveSnapshot();
    return (
      snapshot.focusedSessionId === sessionId && snapshot.visibleSessionIds.includes(sessionId)
    );
  }

  private async writePendingRenameCommand(sessionId: string, alias: string): Promise<void> {
    await this.backend.writeText(sessionId, `/rename ${alias}`, false);
  }

  private async syncSessionTitle(sessionId: string, title: string): Promise<void> {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }

    const previousTitle = this.terminalTitleBySessionId.get(sessionId);
    if (previousTitle === nextTitle) {
      return;
    }

    const previousDerivedActivity = this.titleDerivedActivityBySessionId.get(sessionId);
    const nextDerivedActivity = getTitleDerivedSessionActivityFromTransition(
      previousTitle,
      nextTitle,
      previousDerivedActivity,
    );
    this.terminalTitleBySessionId.set(sessionId, nextTitle);
    if (nextDerivedActivity) {
      this.titleDerivedActivityBySessionId.set(sessionId, nextDerivedActivity);
    } else {
      this.titleDerivedActivityBySessionId.delete(sessionId);
    }

    const titleActivityChanged = !haveSameTitleDerivedSessionActivity(
      previousDerivedActivity,
      nextDerivedActivity,
    );
    await this.syncKnownSessionActivities(true);

    if (titleActivityChanged || previousTitle !== nextTitle) {
      await this.refreshSidebar();
    }
  }

  private getCompletionBellEnabled(): boolean {
    return (
      this.context.globalState.get<boolean>(
        this.getCompletionBellEnabledStorageKey(),
        this.context.workspaceState.get<boolean>(COMPLETION_BELL_ENABLED_KEY, false) ?? false,
      ) ?? false
    );
  }

  private getCompletionBellEnabledStorageKey(): string {
    return getWorkspaceStorageKey(COMPLETION_BELL_ENABLED_KEY, this.workspaceId);
  }

  private async migrateCompletionBellPreference(): Promise<void> {
    const globalStorageKey = this.getCompletionBellEnabledStorageKey();
    if (this.context.globalState.get<boolean>(globalStorageKey) !== undefined) {
      return;
    }

    const legacyPreference = this.context.workspaceState.get<boolean>(COMPLETION_BELL_ENABLED_KEY);
    if (legacyPreference === undefined) {
      return;
    }

    await this.context.globalState.update(globalStorageKey, legacyPreference);
  }

  private async syncKnownSessionActivities(playSound: boolean): Promise<void> {
    const nextActivityBySessionId = new Map<string, TerminalAgentStatus>();
    let shouldPlayCompletionSound = false;

    for (const sessionRecord of this.getAllSessionRecords()) {
      const sessionSnapshot =
        this.backend.getSessionSnapshot(sessionRecord.sessionId) ??
        createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.workspaceId);
      const effectiveActivity = this.getEffectiveSessionActivity(sessionRecord, sessionSnapshot);
      nextActivityBySessionId.set(sessionRecord.sessionId, effectiveActivity.activity);

      if (
        playSound &&
        effectiveActivity.activity === "attention" &&
        this.lastKnownActivityBySessionId.get(sessionRecord.sessionId) !== "attention"
      ) {
        shouldPlayCompletionSound = true;
      }
    }

    this.lastKnownActivityBySessionId.clear();
    for (const [sessionId, activity] of nextActivityBySessionId) {
      this.lastKnownActivityBySessionId.set(sessionId, activity);
    }

    if (!shouldPlayCompletionSound || !this.getCompletionBellEnabled()) {
      return;
    }

    await this.sidebarProvider.postMessage({
      sound: getClampedCompletionSoundSetting(),
      type: "playCompletionSound",
    });
  }

  private getEffectiveSessionActivity(
    sessionRecord: SessionRecord,
    sessionSnapshot: TerminalSessionSnapshot,
  ): { activity: TerminalAgentStatus; agentName: string | undefined } {
    if (sessionSnapshot.agentStatus !== "idle") {
      if (
        sessionSnapshot.agentStatus === "working" &&
        this.shouldExpireWorkingActivity(sessionRecord.sessionId, sessionSnapshot.agentName)
      ) {
        return {
          activity: "idle",
          agentName: sessionSnapshot.agentName,
        };
      }

      return {
        activity: sessionSnapshot.agentStatus,
        agentName: sessionSnapshot.agentName,
      };
    }

    const titleDerivedActivity = getTitleDerivedSessionActivity(
      this.terminalTitleBySessionId.get(sessionRecord.sessionId) ?? "",
      this.titleDerivedActivityBySessionId.get(sessionRecord.sessionId),
    );
    if (!titleDerivedActivity) {
      return {
        activity: "idle",
        agentName: sessionSnapshot.agentName,
      };
    }

    if (
      titleDerivedActivity.activity === "working" &&
      this.shouldExpireWorkingActivity(sessionRecord.sessionId, titleDerivedActivity.agentName)
    ) {
      return {
        activity: "idle",
        agentName: titleDerivedActivity.agentName,
      };
    }

    return {
      activity: titleDerivedActivity.activity,
      agentName: titleDerivedActivity.agentName,
    };
  }

  private shouldExpireWorkingActivity(sessionId: string, agentName: string | undefined): boolean {
    const normalizedAgentName = agentName?.trim().toLowerCase();
    if (normalizedAgentName !== "claude" && normalizedAgentName !== "codex") {
      return false;
    }

    const lastTerminalActivityAt = this.backend.getLastTerminalActivityAt(sessionId);
    if (!lastTerminalActivityAt) {
      return false;
    }

    return Date.now() - lastTerminalActivityAt >= WORKING_ACTIVITY_STALE_TIMEOUT_MS;
  }

  private async updateFocusedTerminal(
    previousVisibleSessionIds: readonly string[],
    preserveFocus = false,
  ): Promise<void> {
    const snapshot = this.getActiveSnapshot();
    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];

    if (
      focusedSessionId &&
      haveSameSessionIds(previousVisibleSessionIds, snapshot.visibleSessionIds) &&
      (await this.backend.focusSession(focusedSessionId, preserveFocus))
    ) {
      return;
    }

    await this.backend.reconcileVisibleTerminals(snapshot, preserveFocus);
  }

  private async restoreSessionProjectionIfNeeded(
    sessionId: string,
    preserveFocus: boolean,
  ): Promise<void> {
    const sessionSnapshot = this.backend.getSessionSnapshot(sessionId);
    if (sessionSnapshot?.status === "running" && this.backend.hasLiveTerminal(sessionId)) {
      if (await this.backend.focusSession(sessionId, preserveFocus)) {
        return;
      }
    }

    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot(), preserveFocus);
  }

  private async resumeAgentSessionIfConfigured(sessionId: string): Promise<void> {
    const command = this.buildResumeAgentCommand(sessionId);
    if (!command) {
      return;
    }

    await this.backend.writeText(sessionId, command, true);
  }

  private buildResumeAgentCommand(sessionId: string): string | undefined {
    const agentLaunch = this.sessionAgentLaunchBySessionId.get(sessionId);
    const agentId = agentLaunch?.agentId.trim().toLowerCase();
    const agentCommand = agentLaunch?.command.trim();
    const sessionRecord = this.store.getSession(sessionId);
    const sessionAlias = sessionRecord?.alias?.trim();
    if (!agentCommand) {
      return undefined;
    }

    switch (agentId) {
      case "codex":
        return sessionAlias
          ? `${agentCommand} resume ${quoteForSingleShellArgument(sessionAlias)}`
          : undefined;
      case "claude":
        return sessionAlias
          ? `${agentCommand} -r ${quoteForSingleShellArgument(sessionAlias)}`
          : undefined;
      case "opencode":
        return `${agentCommand} --continue`;
      default:
        return undefined;
    }
  }

  private async setSessionAgentLaunch(
    sessionId: string,
    agentId: string,
    command: string,
  ): Promise<void> {
    const normalizedAgentId = agentId.trim();
    const normalizedCommand = command.trim();
    if (!normalizedAgentId || !normalizedCommand) {
      return;
    }

    this.sessionAgentLaunchBySessionId.set(sessionId, {
      agentId: normalizedAgentId,
      command: normalizedCommand,
    });
    await this.persistSessionAgentCommands();
  }

  private async deleteSessionAgentCommand(sessionId: string): Promise<void> {
    if (!this.sessionAgentLaunchBySessionId.delete(sessionId)) {
      return;
    }

    await this.persistSessionAgentCommands();
  }

  private loadSessionAgentCommands(): void {
    const storedCommands = this.context.workspaceState.get<Record<string, unknown>>(
      getWorkspaceStorageKey(SESSION_AGENT_COMMANDS_KEY, this.workspaceId),
      {},
    );

    for (const [sessionId, storedLaunch] of Object.entries(storedCommands)) {
      const normalizedSessionId = sessionId.trim();
      const normalizedLaunch = normalizeStoredSessionAgentLaunch(storedLaunch);
      if (!normalizedSessionId || !normalizedLaunch) {
        continue;
      }

      this.sessionAgentLaunchBySessionId.set(normalizedSessionId, normalizedLaunch);
    }
  }

  private async persistSessionAgentCommands(): Promise<void> {
    await this.context.workspaceState.update(
      getWorkspaceStorageKey(SESSION_AGENT_COMMANDS_KEY, this.workspaceId),
      Object.fromEntries(this.sessionAgentLaunchBySessionId),
    );
  }

  private async promptForSessionId(title: string): Promise<string | undefined> {
    const sessions = this.store.getSnapshot().groups.flatMap((group) =>
      getOrderedSessions(group.snapshot).map((session) => ({
        groupTitle: group.title,
        session,
      })),
    );
    if (sessions.length === 0) {
      void vscode.window.showInformationMessage("No sessions are available yet.");
      return undefined;
    }

    const selection = await vscode.window.showQuickPick(
      sessions.map(({ groupTitle, session }) => ({
        description: `${groupTitle} · ${session.alias} · R${session.row + 1}C${session.column + 1}`,
        label: session.title,
        sessionId: session.sessionId,
      })),
      {
        placeHolder: title,
        title: `VSmux: ${title}`,
      },
    );

    return selection?.sessionId;
  }

  private getActiveSnapshot() {
    return this.store.getActiveGroup()?.snapshot ?? createEmptyWorkspaceSessionSnapshot();
  }

  private getAllSessionRecords(): SessionRecord[] {
    return this.store.getSnapshot().groups.flatMap((group) => getOrderedSessions(group.snapshot));
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

function getVisibleTerminalTitle(title: string | undefined): string | undefined {
  const normalizedTitle = title?.trim();
  if (!normalizedTitle) {
    return undefined;
  }

  if (/^(~|\/)/.test(normalizedTitle)) {
    return undefined;
  }

  return normalizedTitle;
}

function getBackgroundSessionTimeoutConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING}`;
}

function getSidebarThemeConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SIDEBAR_THEME_SETTING}`;
}

function getMatchVisibleTerminalOrderConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${MATCH_VISIBLE_TERMINAL_ORDER_SETTING}`;
}

function getNativeTerminalActionDelayConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${NATIVE_TERMINAL_ACTION_DELAY_MS_SETTING}`;
}

function getShowCloseButtonOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING}`;
}

function getCompletionSoundConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${COMPLETION_SOUND_SETTING}`;
}

function getAgentsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${AGENTS_SETTING}`;
}

function getDebuggingModeConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${DEBUGGING_MODE_SETTING}`;
}

function getShowHotkeysOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING}`;
}

function getSidebarThemeSetting(): string {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(SIDEBAR_THEME_SETTING, "auto") ?? "auto"
  );
}

function getSidebarThemeVariant(): SidebarThemeVariant {
  const activeKind = vscode.window.activeColorTheme.kind;
  return activeKind === vscode.ColorThemeKind.Light ? "light" : "dark";
}

function getShowCloseButtonOnSessionCards(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING, false) ?? false
  );
}

function getShowHotkeysOnSessionCards(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING, false) ?? false
  );
}

function getDebuggingMode(): boolean {
  return (
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<boolean>(DEBUGGING_MODE_SETTING) ??
    false
  );
}

function getCompletionSoundSetting(): string {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(COMPLETION_SOUND_SETTING, "ping") ?? "ping"
  );
}

function getSendRenameCommandOnSidebarRename(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING, false) ?? false
  );
}

function getDebuggingSessionNumber(sessionId: string): number | undefined {
  const match = /^session-(\d+)$/.exec(sessionId);
  if (!match) {
    return undefined;
  }

  const sessionNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(sessionNumber) && sessionNumber > 0 ? sessionNumber : undefined;
}

function haveSameSessionIds(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((sessionId, index) => sessionId === right[index])
  );
}

function normalizeStoredSessionAgentLaunch(
  candidate: unknown,
): StoredSessionAgentLaunch | undefined {
  if (typeof candidate === "string") {
    const normalizedCommand = candidate.trim();
    if (!normalizedCommand) {
      return undefined;
    }

    return {
      agentId: "codex",
      command: normalizedCommand,
    };
  }

  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const partialLaunch = candidate as Partial<StoredSessionAgentLaunch>;
  const agentId = partialLaunch.agentId?.trim();
  const command = partialLaunch.command?.trim();
  if (!agentId || !command) {
    return undefined;
  }

  return {
    agentId,
    command,
  };
}

function quoteForSingleShellArgument(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

export function getClampedSidebarThemeSetting(): SidebarThemeSetting {
  return clampSidebarThemeSetting(getSidebarThemeSetting());
}

function getClampedCompletionSoundSetting(): CompletionSoundSetting {
  return clampCompletionSoundSetting(getCompletionSoundSetting());
}
