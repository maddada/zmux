import * as path from "node:path";
import * as vscode from "vscode";
import {
  clampCompletionSoundSetting,
  type CompletionSoundSetting,
} from "../shared/completion-sound";
import {
  MAX_SESSION_COUNT,
  clampSidebarThemeSetting,
  createSidebarHudState,
  formatSessionDisplayId,
  getOrderedSessions,
  getTerminalSessionSurfaceTitle,
  getT3SessionSurfaceTitle,
  getSessionShortcutLabel,
  getVisiblePrimaryTitle,
  isBrowserSession,
  isT3Session,
  isTerminalSession,
  resolveSidebarTheme,
  type ExtensionToSidebarMessage,
  type SessionGridDirection,
  type SessionGridSnapshot,
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
import { T3ActivityMonitor } from "./t3-activity-monitor";
import { T3WebviewManager } from "./t3-webview-manager";
import { BrowserSessionManager } from "./browser-session-manager";
import type { T3RuntimeManager } from "./t3-runtime-manager";
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
  applyEditorLayout,
  createDisconnectedSessionSnapshot,
  createEmptyWorkspaceSessionSnapshot,
  doesCurrentEditorLayoutMatch,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getSessionActivityLabel,
  getWorkspaceId,
  getWorkspaceStorageKey,
} from "./terminal-workspace-helpers";
import { NativeTerminalWorkspaceBackend } from "./native-terminal-workspace-backend";
import { captureWorkbenchState, SessionLayoutTrace } from "./session-layout-trace";
import {
  PreviousSessionHistory,
  type PreviousSessionHistoryEntry,
} from "./previous-session-history";

const SETTINGS_SECTION = "VSmux";
const BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING = "backgroundSessionTimeoutMinutes";
const MATCH_VISIBLE_TERMINAL_ORDER_SETTING = "matchVisibleTerminalOrderInSessionsArea";
const NATIVE_TERMINAL_ACTION_DELAY_MS_SETTING = "nativeTerminalActionDelayMs";
const KEEP_SESSION_GROUPS_UNLOCKED_SETTING = "keepSessionGroupsUnlocked";
const SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING = "sendRenameCommandOnSidebarRename";
const SIDEBAR_THEME_SETTING = "sidebarTheme";
const SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING = "showCloseButtonOnSessionCards";
const SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING = "showHotkeysOnSessionCards";
const DEBUGGING_MODE_SETTING = "debuggingMode";
const COMPLETION_SOUND_SETTING = "completionSound";
const AGENTS_SETTING = "agents";
const COMPLETION_BELL_ENABLED_KEY = "VSmux.completionBellEnabled";
const SESSION_AGENT_COMMANDS_KEY = "VSmux.sessionAgentCommands";
const DISABLE_VS_MUX_MODE_KEY = "VSmux.disableVsMuxMode";
const NATIVE_TERMINAL_DEBUG_STATE_KEY = "VSmux.nativeTerminalDebugState";
const SIDEBAR_WELCOME_DISMISSED_KEY = "VSmux.sidebarWelcomeDismissed";
const SIDEBAR_LOCATION_IN_SECONDARY_KEY = "VSmux.sidebarLocationInSecondary";
export const SESSIONS_VIEW_ID = "VSmux.sessions";
export const PRIMARY_SESSIONS_CONTAINER_ID = "VSmuxSessions";
export const SECONDARY_SESSIONS_CONTAINER_ID = "VSmuxSessionsSecondary";
const SHORTCUT_LABEL_PLATFORM = process.platform === "darwin" ? "mac" : "default";
const WORKING_ACTIVITY_STALE_TIMEOUT_MS = 10_000;
const COMMAND_TERMINAL_EXIT_POLL_MS = 250;
const DEBUG_STATE_POLL_INTERVAL_MS = 500;
const SIDEBAR_WELCOME_OK_LABEL = "OK";
const SESSION_LAYOUT_TRACE_FILE_NAME = "session-layout.log";

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

export class NativeTerminalWorkspaceController implements vscode.Disposable {
  private hasApprovedUntrustedShells = vscode.workspace.isTrusted;
  private readonly backend: TerminalWorkspaceBackend;
  private backendInitialized = false;
  private readonly backendKind: NativeTerminalWorkspaceBackendKind = "native";
  private readonly disposables: vscode.Disposable[] = [];
  private debugStatePollTimer: NodeJS.Timeout | undefined;
  private readonly lastKnownActivityBySessionId = new Map<string, TerminalAgentStatus>();
  private externalFocusLockSessionId: string | undefined;
  private externalFocusLockUntil = 0;
  private ownsNativeTerminalControl = false;
  private readonly sessionAgentLaunchBySessionId = new Map<string, StoredSessionAgentLaunch>();
  private readonly sidebarAgentIconBySessionId = new Map<string, SidebarAgentIcon>();
  private sidebarWelcomeHandled = false;
  private readonly debugPanel: NativeTerminalDebugPanel;
  private readonly previousSessionHistory: PreviousSessionHistory;
  private projectedReconcileDepth = 0;
  private projectedReconcileFocusedSessionId: string | undefined;
  private readonly startupProjectionRecoveryTimeouts = new Set<NodeJS.Timeout>();
  private readonly startupSidebarRefreshTimeouts = new Set<NodeJS.Timeout>();
  private readonly store: SessionGridStore;
  private t3Runtime: T3RuntimeManager | undefined;
  private t3RuntimeLoad: Promise<T3RuntimeManager | undefined> | undefined;
  private readonly t3ActivityMonitor: T3ActivityMonitor;
  private readonly browserSessions: BrowserSessionManager;
  private readonly layoutTrace = new SessionLayoutTrace(SESSION_LAYOUT_TRACE_FILE_NAME);
  private readonly t3Webviews: T3WebviewManager;
  private readonly terminalTitleBySessionId = new Map<string, string>();
  private readonly titleDerivedActivityBySessionId = new Map<string, TitleDerivedSessionActivity>();
  public readonly sidebarProvider: SessionSidebarViewProvider;
  private readonly workspaceId: string;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.store = new SessionGridStore(context);
    this.previousSessionHistory = new PreviousSessionHistory(context);
    this.workspaceId = getWorkspaceId();
    this.loadSessionAgentCommands();
    this.backend = new NativeTerminalWorkspaceBackend({
      context,
      ensureShellSpawnAllowed: () => this.ensureShellSpawnAllowed(),
      workspaceId: this.workspaceId,
    });
    this.debugPanel = new NativeTerminalDebugPanel(context, {
      onClear: async () => {
        await this.layoutTrace.reset();
        await this.backend.clearDebugArtifacts();
        await this.t3Webviews.resetDebugTrace();
        await this.browserSessions.resetDebugTrace();
        await this.refreshDebugInspector();
      },
    });
    this.t3ActivityMonitor = new T3ActivityMonitor({
      getWebSocketUrl: () => this.t3Runtime?.getWebSocketUrl() ?? "ws://127.0.0.1:3773",
    });
    this.t3Webviews = new T3WebviewManager({
      context,
      onDidFocusSession: async (sessionId) => {
        const sessionRecord = this.store.getSession(sessionId);
        if (!sessionRecord || !isT3Session(sessionRecord)) {
          return;
        }

        if (!this.shouldAcceptExternalSessionFocus(sessionId)) {
          await this.logControllerEvent("EVENT", "t3-focus-rejected", { sessionId });
          return;
        }

        const changed = await this.store.focusSession(sessionId);
        const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);
        await this.logControllerEvent("EVENT", "t3-focus-accepted", {
          acknowledgedAttention,
          changed,
          sessionId,
        });
        if (changed && !acknowledgedAttention) {
          await this.refreshSidebar();
        }
      },
    });
    this.browserSessions = new BrowserSessionManager({
      onDidChangeSessions: async () => {
        await this.logControllerEvent("EVENT", "browser-session-change");
        await this.refreshSidebar();
      },
      onDidFocusSession: async (sessionId) => {
        const sessionRecord = this.store.getSession(sessionId);
        if (!sessionRecord || !isBrowserSession(sessionRecord)) {
          return;
        }

        if (!this.shouldAcceptExternalSessionFocus(sessionId)) {
          await this.logControllerEvent("EVENT", "browser-focus-rejected", { sessionId });
          return;
        }

        const changed = await this.store.focusSession(sessionId);
        await this.logControllerEvent("EVENT", "browser-focus-accepted", {
          changed,
          sessionId,
        });
        if (changed) {
          await this.refreshSidebar();
        }
      },
    });
    this.sidebarProvider = new SessionSidebarViewProvider({
      onDidResolveView: async () => {
        await this.maybeShowSidebarWelcome();
      },
      onMessage: async (message) => this.handleSidebarMessage(message),
    });

    this.disposables.push(
      this.backend,
      this.browserSessions,
      this.debugPanel,
      this.t3ActivityMonitor,
      this.sidebarProvider,
      this.t3Webviews,
      this.t3ActivityMonitor.onDidChange(() => {
        void this.logControllerEvent("EVENT", "t3-activity-changed");
        void this.handleT3ActivityChanged();
      }),
      this.backend.onDidActivateSession((sessionId) => {
        void this.logControllerEvent("EVENT", "terminal-activated", { sessionId });
        void this.handleProjectedTerminalActivated(sessionId);
      }),
      this.backend.onDidChangeSessions(() => {
        void this.logControllerEvent("EVENT", "backend-sessions-changed");
        void this.handleBackendSessionsChanged();
      }),
      this.backend.onDidChangeDebugState(() => {
        void this.refreshDebugInspector();
      }),
      this.backend.onDidChangeSessionTitle(({ sessionId, title }) => {
        void this.logControllerEvent("EVENT", "backend-session-title-changed", {
          sessionId,
          title,
        });
        void this.syncSessionTitle(sessionId, title);
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration(getBackgroundSessionTimeoutConfigurationKey()) ||
          event.affectsConfiguration(getMatchVisibleTerminalOrderConfigurationKey()) ||
          event.affectsConfiguration(getNativeTerminalActionDelayConfigurationKey()) ||
          event.affectsConfiguration(getKeepSessionGroupsUnlockedConfigurationKey())
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
    await this.layoutTrace.reset();
    await this.t3Webviews.resetDebugTrace();
    await this.browserSessions.resetDebugTrace();
    await this.runLoggedAction("initialize", undefined, async (operation) => {
      await this.migrateCompletionBellPreference();
      await operation.step("after-migrate-completion-bell");
      await this.ensureNativeTerminalControl();
      await operation.step("after-ensure-native-terminal-control");
      await this.ensureT3RuntimeForStoredSessions(this.getAllSessionRecords());
      await operation.step("after-ensure-t3-runtime");
      await this.syncT3RuntimeLease();
      this.t3Webviews.syncSessions(this.getAllSessionRecords());
      this.browserSessions.syncSessions(this.getAllSessionRecords());
      await operation.step("after-sync-external-session-managers", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.reconcileProjectedSessions(true);
      await operation.step("after-reconcile");
      await this.refreshSidebar("hydrate");
      await operation.step("after-refresh-sidebar");
    });
  }

  public getDebuggingState(): NativeTerminalWorkspaceDebugState {
    return {
      backend: this.backendKind,
      platform: process.platform,
      terminalUiPath: "VS Code native shell terminals",
    };
  }

  public dispose(): void {
    this.stopDebugStatePolling();
    this.clearStartupProjectionRecovery();
    this.clearStartupSidebarRefreshes();
    void this.releaseNativeTerminalControl();
    this.t3Runtime?.dispose();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  public async createSession(): Promise<void> {
    await this.runLoggedAction("createSession", undefined, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const sessionRecord = await this.store.createSession();
      if (!sessionRecord) {
        await operation.step("session-limit-reached");
        void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
        return;
      }

      await operation.step("after-store-create", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
        sessionId: sessionRecord.sessionId,
      });
      await this.backend.createOrAttachSession(sessionRecord);
      await operation.step("after-backend-create-or-attach");
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async focusDirection(direction: SessionGridDirection): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const changed = await this.store.focusDirection(direction);
    if (!changed) {
      return;
    }

    await this.reconcileProjectedSessions();
    await this.refreshSidebar();
  }

  public async focusSession(sessionId: string, preserveFocus = false): Promise<void> {
    if (this.isAlreadyActiveSession(sessionId)) {
      await this.logControllerEvent("ACTION", "focusSession-noop", {
        preserveFocus,
        sessionId,
      });
      return;
    }

    await this.runLoggedAction(
      "focusSession",
      {
        preserveFocus,
        sessionId,
      },
      async (operation) => {
        if (!(await this.ensureNativeTerminalControl())) {
          await operation.step("ensure-native-terminal-control-blocked");
          return;
        }

        const observedWorkbenchFocusResult = await this.focusSessionInObservedWorkbenchIfPossible(
          sessionId,
          preserveFocus,
        );
        await operation.step("after-observed-workbench-focus", {
          observedWorkbenchFocusResult,
        });
        if (observedWorkbenchFocusResult === "focused") {
          const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);
          await operation.step("after-acknowledge-attention", {
            acknowledgedAttention,
          });
          await this.refreshSidebar();
          await operation.step("after-refresh-sidebar");
          return;
        }
        if (observedWorkbenchFocusResult === "reconciled") {
          await this.reconcileProjectedSessions(preserveFocus);
          await operation.step("after-reconcile");
          const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);
          await operation.step("after-acknowledge-attention", {
            acknowledgedAttention,
          });
          await this.refreshSidebar();
          await operation.step("after-refresh-sidebar");
          return;
        }

        const shouldResumeAgentSession =
          this.sessionAgentLaunchBySessionId.has(sessionId) &&
          !this.backend.hasLiveTerminal(sessionId);
        const changed = await this.store.focusSession(sessionId);
        await operation.step("after-store-focus", {
          changed,
          expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
          shouldResumeAgentSession,
        });
        await this.reconcileProjectedSessions(preserveFocus);
        await operation.step("after-reconcile");

        if (shouldResumeAgentSession) {
          await this.resumeAgentSessionIfConfigured(sessionId);
          await operation.step("after-resume-agent-session");
        }

        if (!preserveFocus) {
          this.focusT3ComposerIfPossible(sessionId);
          await operation.step("after-focus-t3-composer-if-possible");
        }

        const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);
        await operation.step("after-acknowledge-attention", {
          acknowledgedAttention,
        });
        if ((changed || !preserveFocus) && !acknowledgedAttention) {
          await this.refreshSidebar();
          await operation.step("after-refresh-sidebar");
        }
      },
    );
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
    await this.revealSidebar();

    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

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
    await vscode.commands.executeCommand(
      `workbench.view.extension.${this.getSidebarContainerId()}`,
    );
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

    const archivedSessions: PreviousSessionHistoryEntry[] = [];
    for (const sessionRecord of this.getAllSessionRecords()) {
      const group = this.store.getSessionGroup(sessionRecord.sessionId);
      if (group) {
        const archivedSession = this.createPreviousSessionEntry(group, sessionRecord);
        if (archivedSession) {
          archivedSessions.push(archivedSession);
        }
      }
      await this.backend.killSession(sessionRecord.sessionId);
      await this.t3Webviews.disposeSession(sessionRecord.sessionId);
      await this.browserSessions.disposeSession(sessionRecord.sessionId);
    }

    this.sessionAgentLaunchBySessionId.clear();
    this.terminalTitleBySessionId.clear();
    this.titleDerivedActivityBySessionId.clear();
    this.sidebarAgentIconBySessionId.clear();
    await this.previousSessionHistory.append(archivedSessions);
    await this.persistSessionAgentCommands();
    await this.store.reset();
    await this.context.workspaceState.update(this.getDisableVsMuxStorageKey(), false);
    await this.reconcileProjectedSessions();
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

    if (isT3Session(sessionRecord)) {
      const t3Runtime = await this.getOrCreateT3Runtime();
      if (!t3Runtime) {
        return;
      }

      await t3Runtime.ensureRunning(sessionRecord.t3.workspaceRoot);
      await this.reconcileProjectedSessions();
      await this.refreshSidebar();
      return;
    }

    if (isBrowserSession(sessionRecord)) {
      await this.browserSessions.disposeSession(sessionId);
      await this.reconcileProjectedSessions();
      await this.refreshSidebar();
      return;
    }

    this.terminalTitleBySessionId.delete(sessionId);
    this.titleDerivedActivityBySessionId.delete(sessionId);
    await this.backend.restartSession(sessionRecord);
    await this.reconcileProjectedSessions();
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
      if (isT3Session(sessionRecord)) {
        await this.t3Webviews.reconcileVisibleSessions(this.getActiveSnapshot(), true);
      }
    }

    if (shouldSendRenameCommand && isTerminalSession(sessionRecord)) {
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
    await this.runLoggedAction("closeSession", { sessionId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const group = this.store.getSessionGroup(sessionId);
      const sessionRecord = this.store.getSession(sessionId);
      const archivedSession =
        group && sessionRecord ? this.createPreviousSessionEntry(group, sessionRecord) : undefined;
      const removed = await this.store.removeSession(sessionId);
      if (!removed) {
        await operation.step("session-not-removed");
        return;
      }

      await operation.step("after-store-remove", {
        archivedSessionCreated: Boolean(archivedSession),
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.t3Webviews.disposeSession(sessionId);
      await this.browserSessions.disposeSession(sessionId);
      await this.backend.killSession(sessionId);
      await this.deleteSessionAgentCommand(sessionId);
      this.terminalTitleBySessionId.delete(sessionId);
      this.titleDerivedActivityBySessionId.delete(sessionId);
      this.sidebarAgentIconBySessionId.delete(sessionId);
      if (archivedSession) {
        await this.previousSessionHistory.append([archivedSession]);
      }
      await operation.step("after-dispose-surface-state");
      const snapshot = this.getActiveSnapshot();
      const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];

      if (!this.backend.canReuseVisibleLayout(snapshot)) {
        await this.reconcileProjectedSessions();
        await operation.step("after-reconcile");
      } else {
        if (focusedSessionId) {
          await this.backend.focusSession(focusedSessionId, false);
        }
        await this.t3Webviews.reconcileVisibleSessions(snapshot);
        await this.browserSessions.reconcileVisibleSessions(snapshot);
        await operation.step("after-layout-reuse");
      }

      await this.syncT3RuntimeLease();
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async copyResumeCommand(sessionId: string): Promise<void> {
    const resumeText = this.buildCopyResumeCommandText(sessionId);
    if (!resumeText) {
      return;
    }

    await vscode.env.clipboard.writeText(resumeText);
  }

  public async setVisibleCount(visibleCount: VisibleSessionCount): Promise<void> {
    await this.runLoggedAction("setVisibleCount", { visibleCount }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      await this.store.setVisibleCount(visibleCount);
      await operation.step("after-store-set-visible-count", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async toggleFullscreenSession(): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    await this.store.toggleFullscreenSession();
    await this.reconcileProjectedSessions();
    await this.refreshSidebar();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    await this.runLoggedAction("setViewMode", { viewMode }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      await this.store.setViewMode(viewMode);
      await operation.step("after-store-set-view-mode", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
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
    if (!commandButton) {
      return;
    }

    if (commandButton.actionType === "browser") {
      await this.createBrowserSession(commandButton.name, commandButton.url);
      return;
    }

    const command = commandButton.command?.trim();
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
    if (agentId === "t3") {
      await this.createT3Session(command);
      return;
    }

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
    await this.reconcileProjectedSessions();
    await this.refreshSidebar();
    await this.backend.writeText(nextSessionRecord.sessionId, command, true);
  }

  public async restorePreviousSession(historyId: string): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const archivedSession = this.previousSessionHistory.getEntry(historyId);
    if (!archivedSession) {
      return;
    }

    const restoredSession =
      archivedSession.sessionRecord.kind === "browser"
        ? await this.store.createSession({
            browser: archivedSession.sessionRecord.browser,
            kind: "browser",
            title: archivedSession.sessionRecord.title,
          })
        : archivedSession.sessionRecord.kind === "t3"
          ? await this.store.createSession({
              kind: "t3",
              t3: archivedSession.sessionRecord.t3,
              title: archivedSession.sessionRecord.title,
            })
          : await this.store.createSession({
              title: archivedSession.sessionRecord.title,
            });
    if (!restoredSession) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
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
    if (archivedSession.agentLaunch) {
      await this.setSessionAgentLaunch(
        nextSessionRecord.sessionId,
        archivedSession.agentLaunch.agentId,
        archivedSession.agentLaunch.command,
      );
    }

    await this.backend.createOrAttachSession(nextSessionRecord);
    await this.reconcileProjectedSessions();
    if (archivedSession.agentLaunch) {
      await this.resumeAgentSessionIfConfigured(nextSessionRecord.sessionId);
    }
    await this.previousSessionHistory.remove(historyId);
    await this.refreshSidebar();
  }

  public async deletePreviousSession(historyId: string): Promise<void> {
    await this.previousSessionHistory.remove(historyId);
    await this.refreshSidebar();
  }

  private async createT3Session(startupCommand = "npx --yes t3"): Promise<void> {
    const workspaceRoot = getDefaultWorkspaceCwd();
    const t3Runtime = await this.getOrCreateT3Runtime();
    if (!t3Runtime) {
      return;
    }

    const t3SessionMetadata = await t3Runtime.createThreadSession(
      workspaceRoot,
      startupCommand,
      "T3 Code",
    );
    const sessionRecord = await this.store.createSession({
      kind: "t3",
      t3: t3SessionMetadata,
      title: "T3 Code",
    });
    if (!sessionRecord) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
      return;
    }

    this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, "t3");
    await this.backend.createOrAttachSession(sessionRecord);
    await this.reconcileProjectedSessions();
    await this.refreshSidebar();
  }

  private async createBrowserSession(title: string, url: string | undefined): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const normalizedUrl = url?.trim();
    if (!normalizedUrl) {
      return;
    }

    const sessionRecord = await this.store.createSession({
      browser: {
        url: normalizedUrl,
      },
      kind: "browser",
      title,
    });
    if (!sessionRecord) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
      return;
    }

    await this.backend.createOrAttachSession(sessionRecord);
    await this.reconcileProjectedSessions();
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
      commandId,
      name,
      command,
      url,
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
    await this.runLoggedAction("focusGroup", { groupId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      if (!this.store.getGroup(groupId)) {
        await operation.step("group-not-found");
        return;
      }

      await this.store.focusGroup(groupId);
      await operation.step("after-store-focus-group", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async focusGroupByIndex(groupIndex: number): Promise<void> {
    await this.runLoggedAction("focusGroupByIndex", { groupIndex }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      if (!this.store.getSnapshot().groups[groupIndex - 1]) {
        await operation.step("group-index-not-found");
        return;
      }

      await this.store.focusGroupByIndex(groupIndex);
      await operation.step("after-store-focus-group-index", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
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

    await this.reconcileProjectedSessions();
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
    await this.runLoggedAction(
      "moveSessionToGroup",
      {
        groupId,
        sessionId,
        targetIndex,
      },
      async (operation) => {
        if (!(await this.ensureNativeTerminalControl())) {
          await operation.step("ensure-native-terminal-control-blocked");
          return;
        }

        const changed = await this.store.moveSessionToGroup(sessionId, groupId, targetIndex);
        if (!changed) {
          await operation.step("store-move-no-change");
          return;
        }

        await operation.step("after-store-move", {
          expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
        });
        await this.reconcileProjectedSessions();
        await operation.step("after-reconcile");
        await this.refreshSidebar();
        await operation.step("after-refresh-sidebar");
      },
    );
  }

  public async createGroupFromSession(sessionId: string): Promise<void> {
    await this.runLoggedAction("createGroupFromSession", { sessionId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const groupId = await this.store.createGroupFromSession(sessionId);
      if (!groupId) {
        await operation.step("group-not-created");
        return;
      }

      await operation.step("after-store-create-group", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
        groupId,
      });
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
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

    const archivedSessions = group.snapshot.sessions.flatMap((sessionRecord) => {
      const archivedSession = this.createPreviousSessionEntry(group, sessionRecord);
      return archivedSession ? [archivedSession] : [];
    });
    for (const sessionRecord of group.snapshot.sessions) {
      await this.t3Webviews.disposeSession(sessionRecord.sessionId);
      await this.browserSessions.disposeSession(sessionRecord.sessionId);
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

    await this.previousSessionHistory.append(archivedSessions);
    await this.reconcileProjectedSessions();
    await this.refreshSidebar();
  }

  private createSidebarMessage(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): ExtensionToSidebarMessage {
    const workspaceSnapshot = this.store.getSnapshot();
    const activeSnapshot = this.getObservedActiveSidebarSnapshot();

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
        this.isVsMuxDisabled(),
      ),
      groups: workspaceSnapshot.groups.map((group) =>
        this.createSidebarGroup(
          group,
          group.groupId === workspaceSnapshot.activeGroupId ? activeSnapshot : group.snapshot,
        ),
      ),
      previousSessions: this.previousSessionHistory.getItems(),
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
    this.ownsNativeTerminalControl = true;
    if (!this.backendInitialized) {
      await this.backend.syncConfiguration();
      await this.backend.initialize(this.getAllSessionRecords());
      this.backendInitialized = true;
    }
    return true;
  }

  private async releaseNativeTerminalControl(): Promise<void> {
    this.ownsNativeTerminalControl = false;
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

  private clearStartupProjectionRecovery(): void {
    for (const timeout of this.startupProjectionRecoveryTimeouts) {
      clearTimeout(timeout);
    }

    this.startupProjectionRecoveryTimeouts.clear();
  }

  private createSidebarGroup(
    group: SessionGroupRecord,
    presentedSnapshot: SessionGridSnapshot,
  ): SidebarSessionGroup {
    return {
      groupId: group.groupId,
      isActive: this.store.getSnapshot().activeGroupId === group.groupId,
      isFocusModeActive:
        presentedSnapshot.visibleCount === 1 &&
        presentedSnapshot.fullscreenRestoreVisibleCount !== undefined,
      sessions: getOrderedSessions(group.snapshot).map((session) =>
        this.createSidebarItem(group, presentedSnapshot, session),
      ),
      title: group.title,
      viewMode: presentedSnapshot.viewMode,
      visibleCount: presentedSnapshot.visibleCount,
    };
  }

  private createSidebarItem(
    group: SessionGroupRecord,
    presentedSnapshot: SessionGridSnapshot,
    sessionRecord: SessionRecord,
  ): SidebarSessionItem {
    const isActiveGroup = this.store.getSnapshot().activeGroupId === group.groupId;
    const isVisible =
      isActiveGroup && presentedSnapshot.visibleSessionIds.includes(sessionRecord.sessionId);
    const isFocused =
      isActiveGroup && presentedSnapshot.focusedSessionId === sessionRecord.sessionId;

    if (isBrowserSession(sessionRecord)) {
      return {
        activity: "idle",
        activityLabel: undefined,
        agentIcon: undefined,
        alias: sessionRecord.alias,
        column: sessionRecord.column,
        detail: sessionRecord.browser.url,
        isFocused,
        isRunning: isVisible || this.browserSessions.hasLiveTab(sessionRecord.sessionId),
        isVisible,
        primaryTitle: getVisiblePrimaryTitle(sessionRecord.title) ?? "Browser",
        row: sessionRecord.row,
        sessionId: sessionRecord.sessionId,
        sessionNumber: getDebuggingSessionNumber(sessionRecord.displayId),
        shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, SHORTCUT_LABEL_PLATFORM),
        terminalTitle: undefined,
      };
    }

    if (isT3Session(sessionRecord)) {
      const activityState = this.getT3ActivityState(sessionRecord);
      return {
        activity: activityState.activity,
        activityLabel: getSessionActivityLabel(activityState.activity, "t3"),
        agentIcon: "t3",
        alias: sessionRecord.alias,
        column: sessionRecord.column,
        detail: `Thread ${sessionRecord.t3.threadId.slice(0, 8)}`,
        isFocused,
        isRunning: activityState.isRunning,
        isVisible,
        primaryTitle: getVisiblePrimaryTitle(sessionRecord.title) ?? "T3 Code",
        row: sessionRecord.row,
        sessionId: sessionRecord.sessionId,
        sessionNumber: getDebuggingSessionNumber(sessionRecord.displayId),
        shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, SHORTCUT_LABEL_PLATFORM),
        terminalTitle: undefined,
      };
    }

    const sessionSnapshot =
      this.backend.getSessionSnapshot(sessionRecord.sessionId) ??
      createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.workspaceId);
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
      isFocused,
      isRunning:
        sessionSnapshot.status === "running" &&
        this.backend.hasLiveTerminal(sessionRecord.sessionId),
      isVisible,
      primaryTitle: getVisibleTerminalTitle(getVisiblePrimaryTitle(sessionRecord.title)),
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
      sessionNumber: getDebuggingSessionNumber(sessionRecord.displayId),
      shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, SHORTCUT_LABEL_PLATFORM),
      terminalTitle: getVisibleTerminalTitle(
        this.terminalTitleBySessionId.get(sessionRecord.sessionId),
      ),
    };
  }

  private createPreviousSessionEntry(
    group: SessionGroupRecord,
    sessionRecord: SessionRecord,
  ): PreviousSessionHistoryEntry | undefined {
    if (isBrowserSession(sessionRecord)) {
      return undefined;
    }

    const sidebarItem = this.createSidebarItem(group, group.snapshot, sessionRecord);
    const closedAt = new Date().toISOString();
    return {
      agentIcon: this.sidebarAgentIconBySessionId.get(sessionRecord.sessionId),
      agentLaunch: this.sessionAgentLaunchBySessionId.get(sessionRecord.sessionId),
      closedAt,
      historyId: `${sessionRecord.sessionId}:${closedAt}`,
      sessionRecord,
      sidebarItem: {
        ...sidebarItem,
        isFocused: false,
        isRunning: false,
        isVisible: false,
      },
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
    if (message.type !== "ready") {
      this.clearStartupSidebarRefreshes();
    }

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

      case "toggleVsMuxDisabled":
        await this.toggleVsMuxDisabled();
        return;

      case "moveSidebarToOtherSide":
        await this.moveSidebarToOtherSide();
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
          message.actionType,
          message.closeTerminalOnExit,
          message.command,
          message.url,
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

      case "copyResumeCommand":
        if (message.sessionId) {
          await this.copyResumeCommand(message.sessionId);
        }
        return;

      case "restorePreviousSession":
        await this.restorePreviousSession(message.historyId);
        return;

      case "deletePreviousSession":
        await this.deletePreviousSession(message.historyId);
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

  private isAlreadyActiveSession(sessionId: string): boolean {
    return this.getObservedActiveSidebarSnapshot().focusedSessionId === sessionId;
  }

  private async focusSessionInObservedWorkbenchIfPossible(
    sessionId: string,
    preserveFocus: boolean,
  ): Promise<"none" | "focused" | "reconciled"> {
    const activeGroup = this.store.getActiveGroup();
    if (!activeGroup) {
      return "none";
    }

    const observedTabLocation = this.findObservedWorkbenchTabLocation(
      activeGroup.snapshot.sessions,
      sessionId,
    );
    if (!observedTabLocation) {
      return "none";
    }

    const observedSnapshot = this.getObservedActiveSidebarSnapshot();
    const workbench = captureWorkbenchState();
    const observedVisibleSessionIds = observedSnapshot.visibleSessionIds;
    const targetIsVisible = observedVisibleSessionIds.includes(sessionId);
    const focusedSessionId =
      observedSnapshot.focusedSessionId ?? observedVisibleSessionIds[0] ?? sessionId;

    if (!targetIsVisible) {
      const nextVisibleSessionIds = this.buildVisibleSessionIdsByReplacingFocusedObservedSession(
        activeGroup.snapshot.visibleCount,
        observedVisibleSessionIds,
        focusedSessionId,
        sessionId,
      );
      await this.store.applyObservedActiveGroupState(sessionId, nextVisibleSessionIds);
      if (observedTabLocation.viewColumn !== workbench.activeTabGroupViewColumn) {
        return "reconciled";
      }
    } else {
      await this.store.applyObservedActiveGroupState(sessionId, observedVisibleSessionIds);
    }

    const nextSnapshot = this.getActiveSnapshot();

    if (preserveFocus) {
      return "focused";
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return "focused";
    }

    if (isTerminalSession(sessionRecord)) {
      if (this.backend.hasLiveTerminal(sessionId)) {
        await this.backend.focusSession(sessionId, false);
      }
      return "focused";
    }

    if (isT3Session(sessionRecord)) {
      await this.revealT3SessionIfNeeded(sessionId, nextSnapshot, false);
      this.t3Webviews.focusComposer(sessionId);
      return "focused";
    }

    if (isBrowserSession(sessionRecord)) {
      await this.browserSessions.revealStoredSession(sessionRecord, nextSnapshot, false);
      return "focused";
    }

    return "none";
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

  private async handleT3ActivityChanged(): Promise<void> {
    await this.syncKnownSessionActivities(true);

    const focusedSessionId = this.getActiveSnapshot().focusedSessionId;
    if (focusedSessionId) {
      const sessionRecord = this.store.getSession(focusedSessionId);
      if (
        sessionRecord &&
        isT3Session(sessionRecord) &&
        this.getT3ActivityState(sessionRecord).activity === "attention" &&
        this.shouldAcknowledgeSessionAttention(focusedSessionId)
      ) {
        const acknowledgedAttention = await this.acknowledgeSessionAttention(focusedSessionId);
        if (acknowledgedAttention) {
          return;
        }
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

  private clearStartupSidebarRefreshes(): void {
    for (const timeout of this.startupSidebarRefreshTimeouts) {
      clearTimeout(timeout);
    }

    this.startupSidebarRefreshTimeouts.clear();
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

  private getSidebarContainerId(): string {
    return this.context.globalState.get<boolean>(SIDEBAR_LOCATION_IN_SECONDARY_KEY, false)
      ? SECONDARY_SESSIONS_CONTAINER_ID
      : PRIMARY_SESSIONS_CONTAINER_ID;
  }

  private async maybeShowSidebarWelcome(): Promise<void> {
    if (this.sidebarWelcomeHandled) {
      return;
    }

    this.sidebarWelcomeHandled = true;
    if (this.context.globalState.get<boolean>(SIDEBAR_WELCOME_DISMISSED_KEY, false)) {
      return;
    }

    const selection = await vscode.window.showInformationMessage(
      "Welcome to VSmux",
      {
        detail:
          'VSmux keeps your sessions organized with quick switching, layout controls, grouped workspaces, and resume-friendly terminal state.\n\nBy default it lives in the main sidebar on the left. If you would rather keep Explorer or Source Control there later, run "VSmux: Move to Secondary Sidebar" to open both sidebars and then drag the VSmux icon across.',
        modal: true,
      },
      SIDEBAR_WELCOME_OK_LABEL,
    );

    if (!selection) {
      this.sidebarWelcomeHandled = false;
      return;
    }

    await this.context.globalState.update(SIDEBAR_WELCOME_DISMISSED_KEY, true);
  }

  private async showSidebarMoveInstructions(): Promise<void> {
    await vscode.commands.executeCommand(
      `workbench.view.extension.${PRIMARY_SESSIONS_CONTAINER_ID}`,
    );
    await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
    await vscode.window.showInformationMessage(
      "Drag the VSmux icon to the other side to move it.",
      {
        detail:
          "The primary and secondary sidebars are open now. Drag the VSmux icon into the other sidebar to move it there.",
      },
      SIDEBAR_WELCOME_OK_LABEL,
    );
  }

  private async acknowledgeSessionAttention(sessionId: string): Promise<boolean> {
    const sessionRecord = this.store.getSession(sessionId);
    if (sessionRecord && isT3Session(sessionRecord)) {
      const acknowledgedAttention = this.t3ActivityMonitor.acknowledgeThread(
        sessionRecord.t3.threadId,
      );
      if (acknowledgedAttention) {
        await this.refreshSidebar();
      }
      return acknowledgedAttention;
    }

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
    const activeSnapshot = this.getActiveSnapshot();
    await this.revealT3SessionIfNeeded(sessionId, activeSnapshot, false);

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

  private shouldAcceptExternalSessionFocus(sessionId: string): boolean {
    if (!this.getActiveSnapshot().visibleSessionIds.includes(sessionId)) {
      return false;
    }

    if (
      this.externalFocusLockSessionId &&
      Date.now() <= this.externalFocusLockUntil &&
      this.externalFocusLockSessionId !== sessionId
    ) {
      return false;
    }

    if (this.externalFocusLockSessionId && Date.now() > this.externalFocusLockUntil) {
      this.externalFocusLockSessionId = undefined;
      this.externalFocusLockUntil = 0;
    }

    if (
      this.projectedReconcileDepth > 0 &&
      this.projectedReconcileFocusedSessionId &&
      this.projectedReconcileFocusedSessionId !== sessionId
    ) {
      return false;
    }

    return true;
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
    if (isT3Session(sessionRecord)) {
      return {
        activity: this.getT3ActivityState(sessionRecord).activity,
        agentName: "t3",
      };
    }

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
    void previousVisibleSessionIds;
    await this.reconcileProjectedSessions(preserveFocus);
  }

  private async reconcileProjectedSessions(preserveFocus = false): Promise<void> {
    await this.layoutTrace.runOperation("reconcileProjectedSessions", {
      captureState: () => this.captureTraceState(),
      execute: async (operation) => {
        if (this.isVsMuxDisabled()) {
          await operation.step("vsmux-disabled-before-apply");
          await this.applyDisabledVsMuxMode();
          await operation.step("vsmux-disabled-after-apply");
          return;
        }

        const snapshot = this.getActiveSnapshot();
        await operation.step("start", {
          expected: this.captureSnapshotTraceState(snapshot),
          preserveFocus,
        });
        this.t3Webviews.syncSessions(this.getAllSessionRecords());
        this.browserSessions.syncSessions(this.getAllSessionRecords());
        await operation.step("after-sync-session-managers");
        await this.ensureT3RuntimeForStoredSessions(this.getAllSessionRecords());
        await this.syncT3RuntimeLease();
        await operation.step("after-sync-t3-runtime");
        const layoutMatches = await doesCurrentEditorLayoutMatch(
          snapshot.visibleCount,
          snapshot.viewMode,
        );
        if (!layoutMatches) {
          await applyEditorLayout(snapshot.visibleCount, snapshot.viewMode, {
            joinAllGroups: false,
          });
        }
        await operation.step("after-apply-editor-layout", {
          layoutMatches,
        });
        await this.backend.reconcileVisibleTerminals(snapshot, preserveFocus);
        await operation.step("after-reconcile-terminals");
        await this.t3Webviews.reconcileVisibleSessions(snapshot, preserveFocus);
        await operation.step("after-reconcile-t3");
        await this.browserSessions.reconcileVisibleSessions(snapshot, preserveFocus);
        await operation.step("after-reconcile-browser");
        await this.restoreFocusedSessionProjection(snapshot, preserveFocus);
        await operation.step("after-restore-focused-session");
      },
      payload: {
        preserveFocus,
      },
    });
  }

  private async restoreFocusedSessionProjection(
    snapshot: ReturnType<NativeTerminalWorkspaceController["getActiveSnapshot"]>,
    preserveFocus: boolean,
  ): Promise<void> {
    if (preserveFocus) {
      return;
    }

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    if (!focusedSessionId) {
      return;
    }

    const sessionRecord = this.store.getSession(focusedSessionId);
    if (!sessionRecord) {
      return;
    }

    if (isTerminalSession(sessionRecord)) {
      if (!this.backend.hasLiveTerminal(focusedSessionId)) {
        return;
      }

      await this.backend.focusSession(focusedSessionId, false);
      return;
    }

    if (isT3Session(sessionRecord)) {
      await this.t3Webviews.focusComposer(sessionRecord.sessionId);
      return;
    }

    if (isBrowserSession(sessionRecord)) {
      await this.browserSessions.revealStoredSession(sessionRecord, snapshot, false);
    }
  }

  private async revealT3SessionIfNeeded(
    sessionId: string,
    snapshot: ReturnType<NativeTerminalWorkspaceController["getActiveSnapshot"]>,
    preserveFocus: boolean,
  ): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || !isT3Session(sessionRecord)) {
      return;
    }

    await this.ensureT3RuntimeForStoredSessions([sessionRecord]);
    await this.t3Webviews.revealStoredSession(sessionRecord, snapshot, preserveFocus);
  }

  private focusT3ComposerIfPossible(sessionId: string): void {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || !isT3Session(sessionRecord)) {
      return;
    }

    this.t3Webviews.focusComposer(sessionId);
  }

  private async ensureT3RuntimeForStoredSessions(
    sessionRecords: readonly SessionRecord[],
  ): Promise<void> {
    await this.syncT3RuntimeLease();
    const t3Sessions = sessionRecords.filter(isT3Session);
    if (t3Sessions.length === 0) {
      return;
    }

    const t3Runtime = await this.getOrCreateT3Runtime();
    if (!t3Runtime) {
      return;
    }

    const workspaceRoots = [
      ...new Set(t3Sessions.map((sessionRecord) => sessionRecord.t3.workspaceRoot)),
    ];
    for (const workspaceRoot of workspaceRoots) {
      await t3Runtime.ensureRunning(workspaceRoot);
    }
    await this.t3ActivityMonitor.refreshSnapshot();
  }

  private async getOrCreateT3Runtime(): Promise<T3RuntimeManager | undefined> {
    if (this.t3Runtime) {
      return this.t3Runtime;
    }

    this.t3RuntimeLoad ??= import("./t3-runtime-manager")
      .then(({ T3RuntimeManager }) => {
        this.t3Runtime = new T3RuntimeManager(this.context);
        return this.t3Runtime;
      })
      .catch(async (error: unknown) => {
        this.t3RuntimeLoad = undefined;
        const message = error instanceof Error ? error.message : String(error);
        await vscode.window.showErrorMessage(`T3 sessions are unavailable: ${message}`);
        return undefined;
      });

    return this.t3RuntimeLoad;
  }

  private async syncT3RuntimeLease(): Promise<void> {
    const hasStoredT3Sessions = this.getAllSessionRecords().some(isT3Session);
    await this.t3ActivityMonitor.setEnabled(hasStoredT3Sessions);
    if (!hasStoredT3Sessions) {
      await this.t3Runtime?.setLeaseActive(false);
      return;
    }

    const t3Runtime = await this.getOrCreateT3Runtime();
    await t3Runtime?.setLeaseActive(true);
  }

  private getT3ActivityState(sessionRecord: SessionRecord): {
    activity: TerminalAgentStatus;
    isRunning: boolean;
  } {
    if (!isT3Session(sessionRecord)) {
      return {
        activity: "idle",
        isRunning: false,
      };
    }

    const activityState = this.t3ActivityMonitor.getThreadActivity(sessionRecord.t3.threadId);
    return {
      activity: activityState?.activity ?? "idle",
      isRunning: activityState?.isRunning ?? true,
    };
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

  private buildCopyResumeCommandText(sessionId: string): string | undefined {
    const sessionRecord = this.store.getSession(sessionId);
    const sessionAlias = sessionRecord?.alias?.trim();
    if (!sessionAlias) {
      return undefined;
    }

    const agentLaunch = this.sessionAgentLaunchBySessionId.get(sessionId);
    const agentId =
      agentLaunch?.agentId.trim().toLowerCase() ??
      this.sidebarAgentIconBySessionId.get(sessionId)?.trim().toLowerCase();
    const agentCommand = agentLaunch?.command.trim();

    switch (agentId) {
      case "codex":
        return `${agentCommand || "codex"} resume ${quoteForSingleShellArgument(sessionAlias)}`;
      case "claude":
        return `${agentCommand || "claude"} -r ${quoteForSingleShellArgument(sessionAlias)}`;
      case "opencode":
        return sessionAlias;
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

  private async runLoggedAction<T>(
    action: string,
    payload: unknown,
    execute: (
      operation: import("./session-layout-trace").SessionLayoutTraceOperation,
    ) => Promise<T>,
  ): Promise<T> {
    return this.layoutTrace.runOperation(action, {
      captureState: () => this.captureTraceState(),
      execute,
      payload,
    });
  }

  private async logControllerEvent(tag: string, message: string, details?: unknown): Promise<void> {
    if (!this.layoutTrace.isEnabled()) {
      return;
    }

    await this.layoutTrace.log(tag, message, {
      details,
      state: this.captureTraceState(),
    });
  }

  private captureTraceState(): {
    activeSnapshot: ReturnType<NativeTerminalWorkspaceController["captureSnapshotTraceState"]>;
    backend: ReturnType<TerminalWorkspaceBackend["getDebugState"]>;
    browser: ReturnType<BrowserSessionManager["getDebugState"]>;
    ownsNativeTerminalControl: boolean;
    sidebar: {
      groups: SidebarSessionGroup[];
      hud: SidebarHydrateMessage["hud"];
    };
    store: {
      activeGroupId: string;
      groups: Array<{
        focusedSessionId?: string;
        fullscreenRestoreVisibleCount?: VisibleSessionCount;
        groupId: string;
        sessions: Array<{
          alias: string;
          displayId: string;
          kind: SessionRecord["kind"];
          sessionId: string;
          slotIndex: number;
          title: string;
        }>;
        title: string;
        viewMode: TerminalViewMode;
        visibleCount: VisibleSessionCount;
        visibleSessionIds: string[];
      }>;
    };
    t3: ReturnType<T3WebviewManager["getDebugState"]>;
    workbench: ReturnType<typeof captureWorkbenchState>;
    workspaceId: string;
  } {
    const sidebarState = this.createSidebarMessage("sessionState") as SidebarSessionStateMessage;
    const snapshot = this.store.getSnapshot();

    return {
      activeSnapshot: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      backend: this.backend.getDebugState(),
      browser: this.browserSessions.getDebugState(),
      ownsNativeTerminalControl: this.ownsNativeTerminalControl,
      sidebar: {
        groups: sidebarState.groups,
        hud: sidebarState.hud,
      },
      store: {
        activeGroupId: snapshot.activeGroupId,
        groups: snapshot.groups.map((group) => ({
          focusedSessionId: group.snapshot.focusedSessionId,
          fullscreenRestoreVisibleCount: group.snapshot.fullscreenRestoreVisibleCount,
          groupId: group.groupId,
          sessions: getOrderedSessions(group.snapshot).map((sessionRecord) => ({
            alias: sessionRecord.alias,
            displayId: sessionRecord.displayId,
            kind: sessionRecord.kind,
            sessionId: sessionRecord.sessionId,
            slotIndex: sessionRecord.slotIndex,
            title: sessionRecord.title,
          })),
          title: group.title,
          viewMode: group.snapshot.viewMode,
          visibleCount: group.snapshot.visibleCount,
          visibleSessionIds: [...group.snapshot.visibleSessionIds],
        })),
      },
      t3: this.t3Webviews.getDebugState(),
      workbench: captureWorkbenchState(),
      workspaceId: this.workspaceId,
    };
  }

  private captureSnapshotTraceState(snapshot: SessionGridSnapshot): {
    expectedProjection: {
      browser: Array<{
        isFocused: boolean;
        isVisible: boolean;
        sessionId: string;
        targetGroupIndex: number;
      }>;
      focusedSessionId?: string;
      t3: Array<{
        isFocused: boolean;
        isVisible: boolean;
        sessionId: string;
        targetGroupIndex: number;
      }>;
      terminals: Array<{
        isFocused: boolean;
        isVisible: boolean;
        sessionId: string;
        targetGroupIndex: number;
      }>;
      viewMode: TerminalViewMode;
      visibleCount: VisibleSessionCount;
      visibleSessionIds: string[];
    };
    focusedSessionId?: string;
    fullscreenRestoreVisibleCount?: VisibleSessionCount;
    sessions: Array<{
      alias: string;
      displayId: string;
      kind: SessionRecord["kind"];
      sessionId: string;
      slotIndex: number;
      title: string;
    }>;
    viewMode: TerminalViewMode;
    visibleCount: VisibleSessionCount;
    visibleSessionIds: string[];
  } {
    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    const expectedProjection = this.getAllSessionRecords().reduce(
      (state, sessionRecord) => {
        const visibleIndex = snapshot.visibleSessionIds.indexOf(sessionRecord.sessionId);
        const placement = {
          isFocused: focusedSessionId === sessionRecord.sessionId,
          isVisible: visibleIndex >= 0,
          sessionId: sessionRecord.sessionId,
          targetGroupIndex: visibleIndex >= 0 ? visibleIndex : 0,
        };

        if (isTerminalSession(sessionRecord)) {
          state.terminals.push(placement);
        } else if (isT3Session(sessionRecord)) {
          state.t3.push(placement);
        } else if (isBrowserSession(sessionRecord)) {
          state.browser.push(placement);
        }

        return state;
      },
      {
        browser: [] as Array<{
          isFocused: boolean;
          isVisible: boolean;
          sessionId: string;
          targetGroupIndex: number;
        }>,
        focusedSessionId,
        t3: [] as Array<{
          isFocused: boolean;
          isVisible: boolean;
          sessionId: string;
          targetGroupIndex: number;
        }>,
        terminals: [] as Array<{
          isFocused: boolean;
          isVisible: boolean;
          sessionId: string;
          targetGroupIndex: number;
        }>,
        viewMode: snapshot.viewMode,
        visibleCount: snapshot.visibleCount,
        visibleSessionIds: [...snapshot.visibleSessionIds],
      },
    );

    return {
      expectedProjection,
      focusedSessionId: snapshot.focusedSessionId,
      fullscreenRestoreVisibleCount: snapshot.fullscreenRestoreVisibleCount,
      sessions: getOrderedSessions(snapshot).map((sessionRecord) => ({
        alias: sessionRecord.alias,
        displayId: sessionRecord.displayId,
        kind: sessionRecord.kind,
        sessionId: sessionRecord.sessionId,
        slotIndex: sessionRecord.slotIndex,
        title: sessionRecord.title,
      })),
      viewMode: snapshot.viewMode,
      visibleCount: snapshot.visibleCount,
      visibleSessionIds: [...snapshot.visibleSessionIds],
    };
  }

  private getActiveSnapshot() {
    return this.store.getActiveGroup()?.snapshot ?? createEmptyWorkspaceSessionSnapshot();
  }

  private getObservedActiveSidebarSnapshot(): SessionGridSnapshot {
    const activeGroup = this.store.getActiveGroup();
    if (!activeGroup) {
      return createEmptyWorkspaceSessionSnapshot();
    }

    const snapshot = activeGroup.snapshot;
    const workbench = captureWorkbenchState();
    const observedVisibleSessionIds = workbench.tabGroups
      .filter((group) => group.viewColumn !== undefined)
      .sort((left, right) => (left.viewColumn ?? 0) - (right.viewColumn ?? 0))
      .map((group) =>
        this.findObservedSessionIdForWorkbenchTab(
          snapshot.sessions,
          group.activeTabLabel,
          group.viewColumn,
        ),
      )
      .filter((sessionId): sessionId is string => typeof sessionId === "string");

    const visibleSessionIds = dedupeStrings(
      observedVisibleSessionIds.filter((sessionId) =>
        snapshot.sessions.some((sessionRecord) => sessionRecord.sessionId === sessionId),
      ),
    );
    const focusedSessionId =
      this.findObservedSessionIdForWorkbenchTab(
        snapshot.sessions,
        workbench.tabGroups.find((group) => group.isActive)?.activeTabLabel,
        workbench.activeTabGroupViewColumn,
      ) ?? snapshot.focusedSessionId;

    return {
      ...snapshot,
      focusedSessionId,
      visibleSessionIds:
        visibleSessionIds.length > 0 ? visibleSessionIds : [...snapshot.visibleSessionIds],
    };
  }

  private buildVisibleSessionIdsByReplacingFocusedObservedSession(
    visibleCount: number,
    observedVisibleSessionIds: readonly string[],
    focusedSessionId: string | undefined,
    targetSessionId: string,
  ): string[] {
    if (observedVisibleSessionIds.includes(targetSessionId)) {
      return [...observedVisibleSessionIds];
    }

    if (observedVisibleSessionIds.length < visibleCount) {
      return dedupeStrings([...observedVisibleSessionIds, targetSessionId]);
    }

    const focusedIndex = focusedSessionId
      ? observedVisibleSessionIds.indexOf(focusedSessionId)
      : -1;
    const replacementIndex =
      focusedIndex >= 0 ? focusedIndex : observedVisibleSessionIds.length - 1;
    const nextVisibleSessionIds = [...observedVisibleSessionIds];
    nextVisibleSessionIds[replacementIndex] = targetSessionId;
    return dedupeStrings(nextVisibleSessionIds);
  }

  private findObservedWorkbenchTabLocation(
    sessionRecords: readonly SessionRecord[],
    targetSessionId: string,
  ): { viewColumn: number } | undefined {
    const workbench = captureWorkbenchState();
    for (const group of workbench.tabGroups) {
      if (group.viewColumn === undefined) {
        continue;
      }

      const hasSessionTab = group.tabs.some(
        (tab) =>
          this.findObservedSessionIdForWorkbenchTab(sessionRecords, tab.label, group.viewColumn) ===
          targetSessionId,
      );
      if (hasSessionTab) {
        return { viewColumn: group.viewColumn };
      }
    }

    return undefined;
  }

  private findObservedSessionIdForWorkbenchTab(
    sessionRecords: readonly SessionRecord[],
    activeTabLabel: string | undefined,
    viewColumn: number | undefined,
  ): string | undefined {
    const terminalMatch = sessionRecords.find(
      (sessionRecord) =>
        isTerminalSession(sessionRecord) &&
        getTerminalSessionSurfaceTitle(sessionRecord) === activeTabLabel,
    );
    if (terminalMatch) {
      return terminalMatch.sessionId;
    }

    const t3Match = sessionRecords.find(
      (sessionRecord) =>
        isT3Session(sessionRecord) && getT3SessionSurfaceTitle(sessionRecord) === activeTabLabel,
    );
    if (t3Match) {
      return t3Match.sessionId;
    }

    return this.browserSessions.getObservedActiveSessionId(viewColumn);
  }

  private getAllSessionRecords(): SessionRecord[] {
    return this.store.getSnapshot().groups.flatMap((group) => getOrderedSessions(group.snapshot));
  }

  private isVsMuxDisabled(): boolean {
    return this.context.workspaceState.get<boolean>(this.getDisableVsMuxStorageKey(), false);
  }

  private async toggleVsMuxDisabled(): Promise<void> {
    if (!(await this.ensureNativeTerminalControl())) {
      return;
    }

    const nextValue = !this.isVsMuxDisabled();
    await this.context.workspaceState.update(this.getDisableVsMuxStorageKey(), nextValue);
    await this.reconcileProjectedSessions(true);
    await this.refreshSidebar("hydrate");
  }

  private async applyDisabledVsMuxMode(): Promise<void> {
    await this.backend.reconcileVisibleTerminals(createEmptyWorkspaceSessionSnapshot(), true);
    this.t3Webviews.disposeAllSessions();
    await vscode.commands.executeCommand("workbench.action.joinAllGroups");
    await this.browserSessions.revealAllSessionsInOneGroup(
      this.getAllSessionRecords().filter(isBrowserSession),
      true,
    );
  }

  private getDisableVsMuxStorageKey(): string {
    return getWorkspaceStorageKey(DISABLE_VS_MUX_MODE_KEY, this.workspaceId);
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

function getKeepSessionGroupsUnlockedConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${KEEP_SESSION_GROUPS_UNLOCKED_SETTING}`;
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

function getDebuggingSessionNumber(displayId: string | undefined): string | undefined {
  if (!displayId) {
    return undefined;
  }

  return formatSessionDisplayId(displayId);
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
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function getClampedSidebarThemeSetting(): SidebarThemeSetting {
  return clampSidebarThemeSetting(getSidebarThemeSetting());
}

function getClampedCompletionSoundSetting(): CompletionSoundSetting {
  return clampCompletionSoundSetting(getCompletionSoundSetting());
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
