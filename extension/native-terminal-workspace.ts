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
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
} from "../shared/terminal-host-protocol";
import { RusptyTerminalWorkspaceBackend } from "./ruspty-terminal-workspace-backend";
import { SessionGridStore } from "./session-grid-store";
import { SessionSidebarViewProvider } from "./session-sidebar-view";
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
  getSessionActivityLabel,
  getWorkspaceId,
} from "./terminal-workspace-helpers";
import { ZmxTerminalWorkspaceBackend } from "./zmx-terminal-workspace-backend";

const SETTINGS_SECTION = "VS-AGENT-MUX";
const BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING = "backgroundSessionTimeoutMinutes";
const SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING = "sendRenameCommandOnSidebarRename";
const SIDEBAR_THEME_SETTING = "sidebarTheme";
const SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING = "showCloseButtonOnSessionCards";
const SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING = "showHotkeysOnSessionCards";
const COMPLETION_SOUND_SETTING = "completionSound";
const COMPLETION_BELL_ENABLED_KEY = "VS-AGENT-MUX.completionBellEnabled";
export const SESSIONS_VIEW_ID = "VS-AGENT-MUX.sessions";
const SHORTCUT_LABEL_PLATFORM = process.platform === "darwin" ? "mac" : "default";
const WORKING_ACTIVITY_STALE_TIMEOUT_MS = 10_000;

type NativeTerminalWorkspaceBackendKind = "ruspty" | "zmx";

export type NativeTerminalWorkspaceDebugState = {
  backend: NativeTerminalWorkspaceBackendKind;
  platform: NodeJS.Platform;
  terminalUiPath: string;
};

export class NativeTerminalWorkspaceController implements vscode.Disposable {
  private hasApprovedUntrustedShells = vscode.workspace.isTrusted;
  private readonly backend: TerminalWorkspaceBackend;
  private readonly backendKind: NativeTerminalWorkspaceBackendKind;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly lastKnownActivityBySessionId = new Map<string, TerminalAgentStatus>();
  private readonly store: SessionGridStore;
  private readonly terminalTitleBySessionId = new Map<string, string>();
  private readonly titleDerivedActivityBySessionId = new Map<string, TitleDerivedSessionActivity>();
  public readonly sidebarProvider: SessionSidebarViewProvider;
  private readonly workspaceId: string;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.store = new SessionGridStore(context);
    this.workspaceId = getWorkspaceId();
    this.backendKind = process.platform === "win32" ? "ruspty" : "zmx";
    this.backend =
      this.backendKind === "zmx"
        ? new ZmxTerminalWorkspaceBackend({
            context,
            ensureShellSpawnAllowed: () => this.ensureShellSpawnAllowed(),
            workspaceId: this.workspaceId,
          })
        : new RusptyTerminalWorkspaceBackend({
            context,
            ensureShellSpawnAllowed: () => this.ensureShellSpawnAllowed(),
            workspaceId: this.workspaceId,
          });
    this.sidebarProvider = new SessionSidebarViewProvider({
      onMessage: async (message) => this.handleSidebarMessage(message),
    });

    this.disposables.push(
      this.backend,
      this.sidebarProvider,
      this.backend.onDidActivateSession((sessionId) => {
        void this.handleProjectedTerminalActivated(sessionId);
      }),
      this.backend.onDidChangeSessions(() => {
        void this.handleBackendSessionsChanged();
      }),
      this.backend.onDidChangeSessionTitle(({ sessionId, title }) => {
        void this.syncSessionTitle(sessionId, title);
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(getBackgroundSessionTimeoutConfigurationKey())) {
          void this.backend.syncConfiguration();
        }

        if (
          event.affectsConfiguration(getSidebarThemeConfigurationKey()) ||
          event.affectsConfiguration(getCompletionSoundConfigurationKey()) ||
          event.affectsConfiguration(getShowCloseButtonOnSessionCardsConfigurationKey()) ||
          event.affectsConfiguration(getShowHotkeysOnSessionCardsConfigurationKey())
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
    await this.backend.syncConfiguration();
    await this.backend.initialize(this.getAllSessionRecords());
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar("hydrate");
  }

  public getDebuggingState(): NativeTerminalWorkspaceDebugState {
    return {
      backend: this.backendKind,
      platform: process.platform,
      terminalUiPath:
        this.backendKind === "zmx"
          ? "VS Code native shell terminal"
          : "VS Code Pseudoterminal bridge",
    };
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  public async createSession(): Promise<void> {
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
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusDirection(direction);
    if (!changed) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds);
    await this.refreshSidebar();
  }

  public async focusSession(sessionId: string, preserveFocus = false): Promise<void> {
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusSession(sessionId);
    if (changed) {
      await this.updateFocusedTerminal(previousVisibleSessionIds, preserveFocus);
    }

    const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);
    if (changed && !acknowledgedAttention) {
      await this.refreshSidebar();
    }
  }

  public async focusSessionSlot(slotNumber: number): Promise<void> {
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
    await vscode.commands.executeCommand("workbench.view.extension.VS-AGENT-MUXSessions");

    if (this.getAllSessionRecords().length === 0) {
      await this.createSession();
      return;
    }

    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async revealSession(sessionId?: string): Promise<void> {
    const resolvedSessionId = sessionId ?? (await this.promptForSessionId("Reveal session"));
    if (!resolvedSessionId) {
      return;
    }

    await this.focusSession(resolvedSessionId);
  }

  public async resetWorkspace(): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
      "Reset VS-AGENT-MUX sessions?",
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

    this.terminalTitleBySessionId.clear();
    this.titleDerivedActivityBySessionId.clear();
    await this.store.reset();
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async restartSession(sessionId: string): Promise<void> {
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
    const resolvedSessionId = sessionId ?? (await this.promptForSessionId("Restart session"));
    if (!resolvedSessionId) {
      return;
    }

    await this.restartSession(resolvedSessionId);
  }

  public async renameSession(sessionId: string, title: string): Promise<void> {
    const nextAlias = title.trim();
    if (!nextAlias) {
      return;
    }

    const changed = await this.store.renameSessionAlias(sessionId, nextAlias);
    if (!changed) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    await this.backend.renameSession(sessionRecord);

    if (getSendRenameCommandOnSidebarRename()) {
      await this.writePendingRenameCommand(sessionId, nextAlias);
      await this.focusSession(sessionId);
    }

    await this.refreshSidebar();
  }

  public async promptRenameSession(sessionId: string): Promise<void> {
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
    const session =
      this.store.getFocusedSession() ?? getOrderedSessions(this.getActiveSnapshot())[0];
    if (!session) {
      void vscode.window.showInformationMessage("No sessions are available yet.");
      return;
    }

    await this.promptRenameSession(session.sessionId);
  }

  public async closeSession(sessionId: string): Promise<void> {
    const removed = await this.store.removeSession(sessionId);
    if (!removed) {
      return;
    }

    await this.backend.killSession(sessionId);
    this.terminalTitleBySessionId.delete(sessionId);
    this.titleDerivedActivityBySessionId.delete(sessionId);
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
    await this.store.setVisibleCount(visibleCount);
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async toggleFullscreenSession(): Promise<void> {
    await this.store.toggleFullscreenSession();
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    await this.store.setViewMode(viewMode);
    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async openSettings(): Promise<void> {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:maddada.VS-AGENT-MUX",
    );
  }

  public async toggleCompletionBell(): Promise<void> {
    await this.context.workspaceState.update(
      COMPLETION_BELL_ENABLED_KEY,
      !this.getCompletionBellEnabled(),
    );
    await this.refreshSidebar();
  }

  public async focusGroup(groupId: string): Promise<void> {
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
    const changed = await this.store.renameGroup(groupId, title);
    if (!changed) {
      return;
    }

    await this.refreshSidebar();
  }

  public async syncSessionOrder(groupId: string, sessionIds: readonly string[]): Promise<void> {
    const changed = await this.store.syncSessionOrder(groupId, sessionIds);
    if (!changed) {
      return;
    }

    await this.backend.reconcileVisibleTerminals(this.getActiveSnapshot());
    await this.refreshSidebar();
  }

  public async syncGroupOrder(groupIds: readonly string[]): Promise<void> {
    const changed = await this.store.syncGroupOrder(groupIds);
    if (!changed) {
      return;
    }

    await this.refreshSidebar();
  }

  public async moveSessionToGroup(sessionId: string, groupId: string): Promise<void> {
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.moveSessionToGroup(sessionId, groupId);
    if (!changed) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async createGroupFromSession(sessionId: string): Promise<void> {
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const groupId = await this.store.createGroupFromSession(sessionId);
    if (!groupId) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async createSessionInGroup(groupId: string): Promise<void> {
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
    const group = this.store.getGroup(groupId);
    if (!group || this.store.getSnapshot().groups.length <= 1) {
      return;
    }

    for (const sessionRecord of group.snapshot.sessions) {
      await this.backend.killSession(sessionRecord.sessionId);
      this.terminalTitleBySessionId.delete(sessionRecord.sessionId);
      this.titleDerivedActivityBySessionId.delete(sessionRecord.sessionId);
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
        this.getCompletionBellEnabled(),
        getClampedCompletionSoundSetting(),
      ),
      groups: workspaceSnapshot.groups.map((group) => this.createSidebarGroup(group)),
      type,
    };
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
      alias: sessionRecord.alias,
      column: sessionRecord.column,
      detail: sessionSnapshot.errorMessage,
      isFocused: isActiveGroup && activeSnapshot.focusedSessionId === sessionRecord.sessionId,
      isRunning: sessionSnapshot.status === "running",
      isVisible:
        isActiveGroup && activeSnapshot.visibleSessionIds.includes(sessionRecord.sessionId),
      primaryTitle: getVisibleTerminalTitle(getVisiblePrimaryTitle(sessionRecord.title)),
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
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
      "VS-AGENT-MUX is about to start a shell in an untrusted workspace.",
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

      case "toggleCompletionBell":
        await this.toggleCompletionBell();
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
        await this.moveSessionToGroup(message.sessionId, message.groupId);
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
    await this.backend.writeText(sessionId, `/rename ${alias}`);
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
    return this.context.workspaceState.get<boolean>(COMPLETION_BELL_ENABLED_KEY, false) ?? false;
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
        title: `VS-AGENT-MUX: ${title}`,
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

function getShowCloseButtonOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING}`;
}

function getCompletionSoundConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${COMPLETION_SOUND_SETTING}`;
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

function haveSameSessionIds(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((sessionId, index) => sessionId === right[index])
  );
}

export function getClampedSidebarThemeSetting(): SidebarThemeSetting {
  return clampSidebarThemeSetting(getSidebarThemeSetting());
}

function getClampedCompletionSoundSetting(): CompletionSoundSetting {
  return clampCompletionSoundSetting(getCompletionSoundSetting());
}
