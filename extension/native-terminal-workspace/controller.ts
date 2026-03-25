import * as path from "node:path";
import * as vscode from "vscode";
import {
  MAX_SESSION_COUNT,
  createSidebarHudState,
  getOrderedSessions,
  isNumericSessionAlias,
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
  type SidebarSessionStateMessage,
  type SidebarToExtensionMessage,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../../shared/session-grid-contract";
import type { ExtensionToNativeTerminalDebugMessage } from "../../shared/native-terminal-debug-contract";
import { getSidebarAgentIconById, type SidebarAgentIcon } from "../../shared/sidebar-agents";
import type { TerminalAgentStatus } from "../../shared/terminal-host-protocol";
import { SessionGridStore } from "../session-grid-store";
import { NativeTerminalDebugPanel } from "../native-terminal-debug-panel";
import { SessionSidebarViewProvider } from "../session-sidebar-view";
import { T3ActivityMonitor } from "../t3-activity-monitor";
import { T3WebviewManager } from "../t3-webview-manager";
import { BrowserSessionManager } from "../browser-session-manager";
import type { T3RuntimeManager } from "../t3-runtime-manager";
import {
  deleteSidebarAgentPreference,
  getSidebarAgentButtonById,
  getSidebarAgentButtons,
  saveSidebarAgentPreference,
} from "../sidebar-agent-preferences";
import {
  deleteSidebarCommandPreference,
  getSidebarCommandButtonById,
  getSidebarCommandButtons,
  saveSidebarCommandPreference,
  syncSidebarCommandOrderPreference,
} from "../sidebar-command-preferences";
import { type TitleDerivedSessionActivity } from "../session-title-activity";
import type { TerminalWorkspaceBackend } from "../terminal-workspace-backend";
import {
  createEmptyWorkspaceSessionSnapshot,
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getWorkspaceId,
  getWorkspaceStorageKey,
} from "../terminal-workspace-helpers";
import { NativeTerminalWorkspaceBackend } from "../native-terminal-workspace-backend";
import { captureWorkbenchState, SessionLayoutTrace } from "../session-layout-trace";
import {
  buildSidebarMessage,
  createPreviousSessionEntry,
} from "../native-terminal-workspace-sidebar-state";
import {
  buildCopyResumeCommandText,
  buildResumeAgentCommand,
  loadStoredSessionAgentLaunches,
  persistSessionAgentLaunches,
  type StoredSessionAgentLaunch,
} from "../native-terminal-workspace-session-agent-launch";
import { createSessionActivationPlan } from "./session-activation";
import {
  captureControllerTraceState,
  captureSnapshotTraceState,
  createDebugInspectorMessage,
} from "../native-terminal-workspace-trace-state";
import { getEffectiveSessionActivity, syncKnownSessionActivities } from "./activity";
import {
  acknowledgeSessionAttention,
  handleBackendSessionsChanged,
  handleT3ActivityChanged,
  syncSessionTitle,
} from "./events";
import {
  COMMAND_TERMINAL_EXIT_POLL_MS,
  COMPLETION_BELL_ENABLED_KEY,
  DEBUG_STATE_POLL_INTERVAL_MS,
  DISABLE_VS_MUX_MODE_KEY,
  NATIVE_TERMINAL_DEBUG_STATE_KEY,
  PRIMARY_SESSIONS_CONTAINER_ID,
  SCRATCH_PAD_CONTENT_KEY,
  SECONDARY_SESSIONS_CONTAINER_ID,
  SIDEBAR_LOCATION_IN_SECONDARY_KEY,
  SIDEBAR_WELCOME_DISMISSED_KEY,
  SIDEBAR_WELCOME_OK_LABEL,
  getAgentsConfigurationKey,
  getBackgroundSessionTimeoutConfigurationKey,
  getClampedCompletionSoundSetting,
  getClampedSidebarThemeSetting,
  getCompletionSoundConfigurationKey,
  getDebuggingMode,
  getDebuggingModeConfigurationKey,
  getKeepSessionGroupsUnlockedConfigurationKey,
  getMatchVisibleTerminalOrderConfigurationKey,
  getNativeTerminalActionDelayConfigurationKey,
  getSendRenameCommandOnSidebarRename,
  getShowCloseButtonOnSessionCards,
  getShowCloseButtonOnSessionCardsConfigurationKey,
  getShowHotkeysOnSessionCards,
  getShowHotkeysOnSessionCardsConfigurationKey,
  getSidebarThemeConfigurationKey,
  getSidebarThemeVariant,
} from "./settings";
import { dispatchSidebarMessage } from "./sidebar-message-dispatch";
import {
  PreviousSessionHistory,
  type PreviousSessionHistoryEntry,
} from "../previous-session-history";
const SHORTCUT_LABEL_PLATFORM = process.platform === "darwin" ? "mac" : "default";
const SESSION_LAYOUT_TRACE_FILE_NAME = "session-layout.log";

export { SESSIONS_VIEW_ID } from "./settings";

type NativeTerminalWorkspaceBackendKind = "native";

export type NativeTerminalWorkspaceDebugState = {
  backend: NativeTerminalWorkspaceBackendKind;
  platform: NodeJS.Platform;
  terminalUiPath: string;
};

export class NativeTerminalWorkspaceController implements vscode.Disposable {
  private hasApprovedUntrustedShells = vscode.workspace.isTrusted;
  private readonly backend: TerminalWorkspaceBackend;
  private backendInitialized = false;
  private readonly backendKind: NativeTerminalWorkspaceBackendKind = "native";
  private readonly disposables: vscode.Disposable[] = [];
  private debugStatePollTimer: NodeJS.Timeout | undefined;
  private readonly lastKnownActivityBySessionId = new Map<string, TerminalAgentStatus>();
  private projectionActionQueue: Promise<unknown> = Promise.resolve();
  private projectionActionDepth = 0;
  private ownsNativeTerminalControl = false;
  private readonly sessionAgentLaunchBySessionId = new Map<string, StoredSessionAgentLaunch>();
  private readonly sidebarAgentIconBySessionId = new Map<string, SidebarAgentIcon>();
  private sidebarWelcomeHandled = false;
  private readonly debugPanel: NativeTerminalDebugPanel;
  private readonly previousSessionHistory: PreviousSessionHistory;
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
        await this.logControllerEvent("EVENT", "t3-focus-observed", { sessionId });
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
        await this.logControllerEvent("EVENT", "browser-focus-observed", { sessionId });
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
        void handleT3ActivityChanged(this.createSessionEventContext());
      }),
      this.backend.onDidActivateSession((sessionId) => {
        void this.logControllerEvent("EVENT", "terminal-activated-observed", { sessionId });
      }),
      this.backend.onDidChangeSessions(() => {
        void this.logControllerEvent("EVENT", "backend-sessions-changed");
        void handleBackendSessionsChanged(this.createSessionEventContext());
      }),
      this.backend.onDidChangeDebugState(() => {
        void this.refreshDebugInspector();
      }),
      this.backend.onDidChangeSessionTitle(({ sessionId, title }) => {
        void this.logControllerEvent("EVENT", "backend-session-title-changed", {
          sessionId,
          title,
        });
        void syncSessionTitle(this.createSessionEventContext(), sessionId, title);
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
      await this.enforceSingleBrowserSession();
      await operation.step("after-enforce-single-browser-session");
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
    await this.runLoggedAction("focusDirection", { direction }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const changed = await this.store.focusDirection(direction);
      await operation.step("after-store-focus-direction", {
        changed,
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      if (!changed) {
        return;
      }

      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async focusSession(sessionId: string, preserveFocus = false): Promise<void> {
    await this.runLoggedAction(
      "focusSession",
      {
        preserveFocus,
        sessionId,
      },
      async (operation) => {
        const sessionRecord = this.store.getSession(sessionId);
        if (!sessionRecord) {
          await operation.step("session-not-found");
          return;
        }

        const activationPlan = createSessionActivationPlan(sessionRecord, {
          hasLiveBrowserTab: this.browserSessions.hasLiveTab(sessionId),
          hasLiveT3Panel: this.t3Webviews.hasLivePanel(sessionId),
          hasLiveTerminal: this.backend.hasLiveTerminal(sessionId),
          hasStoredAgentLaunch: this.sessionAgentLaunchBySessionId.has(sessionId),
          isAlreadyFocused: this.isAlreadyActiveSession(sessionId),
          isT3Running: this.getT3ActivityState(sessionRecord).isRunning,
        });

        if (activationPlan.shouldNoop) {
          await this.logControllerEvent("ACTION", "focusSession-noop", {
            preserveFocus,
            sessionId,
          });
          return;
        }

        if (!(await this.ensureNativeTerminalControl())) {
          await operation.step("ensure-native-terminal-control-blocked");
          return;
        }

        const changed = activationPlan.shouldFocusStoredSession
          ? await this.store.focusSession(sessionId)
          : false;
        await operation.step("after-store-focus", {
          activationPlan,
          changed,
          expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
        });

        if (activationPlan.shouldCreateOrAttachTerminal) {
          const nextSessionRecord = this.store.getSession(sessionId) ?? sessionRecord;
          await this.backend.createOrAttachSession(nextSessionRecord);
          await operation.step("after-create-or-attach-session");
        }

        await this.reconcileProjectedSessions(preserveFocus);
        await operation.step("after-reconcile");

        if (activationPlan.shouldResumeAgentAfterReveal) {
          await this.resumeAgentSessionIfConfigured(sessionId);
          await operation.step("after-resume-agent-session");
        }

        if (!preserveFocus) {
          this.focusT3ComposerIfPossible(sessionId);
          await operation.step("after-focus-t3-composer-if-possible");
        }

        const acknowledgedAttention = await acknowledgeSessionAttention(
          this.createSessionEventContext(),
          sessionId,
        );
        await operation.step("after-acknowledge-attention", {
          acknowledgedAttention,
        });
        if (
          (changed || !preserveFocus || activationPlan.shouldRefreshAfterActivation) &&
          !acknowledgedAttention
        ) {
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
    await this.runLoggedAction("openWorkspace", undefined, async (operation) => {
      await this.revealSidebar();
      await operation.step("after-reveal-sidebar");

      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      if (this.getAllSessionRecords().length === 0) {
        await operation.step("before-create-initial-session");
        await this.createSession();
        await operation.step("after-create-initial-session");
        return;
      }

      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
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
    await this.runLoggedAction("resetWorkspace", undefined, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
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
        await operation.step("reset-cancelled");
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
      await operation.step("after-store-reset", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async restartSession(sessionId: string): Promise<void> {
    await this.runLoggedAction("restartSession", { sessionId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const sessionRecord = this.store.getSession(sessionId);
      if (!sessionRecord) {
        await operation.step("session-not-found");
        return;
      }

      if (isT3Session(sessionRecord)) {
        const t3Runtime = await this.getOrCreateT3Runtime();
        if (!t3Runtime) {
          await operation.step("t3-runtime-unavailable");
          return;
        }

        await t3Runtime.ensureRunning(sessionRecord.t3.workspaceRoot);
        await operation.step("after-ensure-t3-running");
        await this.reconcileProjectedSessions();
        await operation.step("after-reconcile");
        await this.refreshSidebar();
        await operation.step("after-refresh-sidebar");
        return;
      }

      if (isBrowserSession(sessionRecord)) {
        await this.browserSessions.disposeSession(sessionId);
        await operation.step("after-dispose-browser-session");
        await this.reconcileProjectedSessions();
        await operation.step("after-reconcile");
        await this.refreshSidebar();
        await operation.step("after-refresh-sidebar");
        return;
      }

      this.terminalTitleBySessionId.delete(sessionId);
      this.titleDerivedActivityBySessionId.delete(sessionId);
      await this.backend.restartSession(sessionRecord);
      await operation.step("after-backend-restart");
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
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
    await this.runLoggedAction("renameSession", { sessionId, title }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const nextAlias = title.trim();
      if (!nextAlias) {
        await operation.step("empty-alias");
        return;
      }

      if (isNumericSessionAlias(nextAlias)) {
        await operation.step("numeric-alias-rejected");
        return;
      }

      const changed = await this.store.renameSessionAlias(sessionId, nextAlias);
      const shouldSendRenameCommand = getSendRenameCommandOnSidebarRename();
      await operation.step("after-store-rename", {
        changed,
        shouldSendRenameCommand,
      });
      if (!changed && !shouldSendRenameCommand) {
        return;
      }

      const sessionRecord = this.store.getSession(sessionId);
      if (!sessionRecord) {
        await operation.step("session-not-found");
        return;
      }

      if (changed) {
        await this.backend.renameSession(sessionRecord);
        await this.reconcileProjectedSessions(true);
        await operation.step("after-surface-rename");
      }

      if (shouldSendRenameCommand && isTerminalSession(sessionRecord)) {
        await this.writePendingRenameCommand(sessionId, nextAlias);
        await operation.step("after-write-pending-rename-command");
        await this.focusSession(sessionId);
        await operation.step("after-focus-renamed-session");
      }

      if (changed) {
        await this.refreshSidebar();
        await operation.step("after-refresh-sidebar");
      }
    });
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
        value.trim().length === 0
          ? "Session nickname cannot be empty."
          : isNumericSessionAlias(value)
            ? "Session nickname cannot be only numbers."
            : undefined,
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
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");

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
    await this.runLoggedAction("toggleFullscreenSession", undefined, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      await this.store.toggleFullscreenSession();
      await operation.step("after-store-toggle-fullscreen", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
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
    await this.runLoggedAction("runSidebarAgent", { agentId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const agentButton = getSidebarAgentButtonById(agentId);
      if (!agentButton) {
        await operation.step("agent-button-not-found");
        return;
      }

      const command = agentButton.command?.trim();
      if (agentId === "t3") {
        await this.createT3Session(command);
        await operation.step("after-create-t3-session");
        return;
      }

      if (!command) {
        await operation.step("agent-command-missing");
        return;
      }

      const sessionRecord = await this.store.createSession();
      if (!sessionRecord) {
        await operation.step("session-limit-reached");
        void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
        return;
      }

      if (agentButton.icon) {
        this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, agentButton.icon);
      }

      const nextSessionRecord = this.store.getSession(sessionRecord.sessionId) ?? sessionRecord;
      await this.setSessionAgentLaunch(nextSessionRecord.sessionId, agentId, command);
      await this.backend.createOrAttachSession(nextSessionRecord);
      await operation.step("after-create-or-attach-session");
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
      await this.backend.writeText(nextSessionRecord.sessionId, command, true);
      await operation.step("after-write-command");
    });
  }

  public async restorePreviousSession(historyId: string): Promise<void> {
    await this.runLoggedAction("restorePreviousSession", { historyId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const archivedSession = this.previousSessionHistory.getEntry(historyId);
      if (!archivedSession) {
        await operation.step("history-entry-not-found");
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
        await operation.step("session-limit-reached");
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
      await operation.step("after-create-or-attach-session");
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      if (archivedSession.agentLaunch) {
        await this.resumeAgentSessionIfConfigured(nextSessionRecord.sessionId);
        await operation.step("after-resume-agent-session");
      }
      await this.previousSessionHistory.remove(historyId);
      await operation.step("after-remove-history-entry");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async deletePreviousSession(historyId: string): Promise<void> {
    await this.previousSessionHistory.remove(historyId);
    await this.refreshSidebar();
  }

  public async clearGeneratedPreviousSessions(): Promise<void> {
    await this.previousSessionHistory.removeGeneratedNames();
    await this.refreshSidebar();
  }

  public async saveScratchPad(content: string): Promise<void> {
    const nextContent = typeof content === "string" ? content : "";
    if (nextContent === this.getScratchPadContent()) {
      return;
    }

    await this.context.workspaceState.update(this.getScratchPadStorageKey(), nextContent);
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

    await this.enforceSingleBrowserSession();
    const existingBrowserSession = this.getPrimaryBrowserSession();
    if (existingBrowserSession) {
      await this.store.setBrowserSessionMetadata(
        existingBrowserSession.sessionId,
        title,
        normalizedUrl,
      );
      await this.store.focusSession(existingBrowserSession.sessionId);
      const nextSessionRecord = this.store.getSession(existingBrowserSession.sessionId);
      if (nextSessionRecord && isBrowserSession(nextSessionRecord)) {
        await this.backend.createOrAttachSession(nextSessionRecord);
      }
      await this.reconcileProjectedSessions();
      await this.refreshSidebar();
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

  private getPrimaryBrowserSession(): SessionRecord | undefined {
    return this.getAllSessionRecords().find(isBrowserSession);
  }

  private async enforceSingleBrowserSession(): Promise<void> {
    const browserSessions = this.getAllSessionRecords().filter(isBrowserSession);
    if (browserSessions.length <= 1) {
      return;
    }

    for (const sessionRecord of browserSessions.slice(1)) {
      await this.browserSessions.disposeSession(sessionRecord.sessionId);
      await this.store.removeSession(sessionRecord.sessionId);
    }
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
    await this.runLoggedAction("syncSessionOrder", { groupId, sessionIds }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const changed = await this.store.syncSessionOrder(groupId, sessionIds);
      await operation.step("after-store-sync-session-order", {
        changed,
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });
      if (!changed) {
        return;
      }

      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async syncGroupOrder(groupIds: readonly string[]): Promise<void> {
    await this.runLoggedAction("syncGroupOrder", { groupIds }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const changed = await this.store.syncGroupOrder(groupIds);
      await operation.step("after-store-sync-group-order", { changed });
      if (!changed) {
        return;
      }

      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
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
    await this.runLoggedAction("createSessionInGroup", { groupId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      if (!this.store.getGroup(groupId)) {
        await operation.step("group-not-found");
        return;
      }

      const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
      await this.store.focusGroup(groupId);
      await operation.step("after-store-focus-group", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
      });

      const sessionRecord = await this.store.createSession();
      if (!sessionRecord) {
        await operation.step("session-limit-reached");
        void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
        await this.updateFocusedTerminal(previousVisibleSessionIds, false);
        await operation.step("after-update-focused-terminal");
        await this.refreshSidebar();
        await operation.step("after-refresh-sidebar");
        return;
      }

      await this.backend.createOrAttachSession(sessionRecord);
      await operation.step("after-create-or-attach-session");
      await this.updateFocusedTerminal(previousVisibleSessionIds, false);
      await operation.step("after-update-focused-terminal");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  public async closeGroup(groupId: string): Promise<void> {
    await this.runLoggedAction("closeGroup", { groupId }, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const group = this.store.getGroup(groupId);
      if (!group || this.store.getSnapshot().groups.length <= 1) {
        await operation.step("group-not-closable");
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
      await operation.step("after-store-remove-group", {
        expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
        removed,
      });
      if (!removed) {
        return;
      }

      await this.previousSessionHistory.append(archivedSessions);
      await this.reconcileProjectedSessions();
      await operation.step("after-reconcile");
      await this.refreshSidebar();
      await operation.step("after-refresh-sidebar");
    });
  }

  private createSidebarMessage(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): ExtensionToSidebarMessage {
    const sessionActivityContext = this.createSessionActivityContext();
    const activeSnapshot = this.getActiveSnapshot();
    return buildSidebarMessage({
      activeSnapshot,
      browserHasLiveProjection: (sessionId) => this.browserSessions.hasLiveTab(sessionId),
      completionBellEnabled: this.getCompletionBellEnabled(),
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (sessionRecord, sessionSnapshot) =>
        getEffectiveSessionActivity(sessionActivityContext, sessionRecord, sessionSnapshot),
      getSessionAgentLaunch: (sessionId) => this.sessionAgentLaunchBySessionId.get(sessionId),
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getSidebarAgentIcon: (sessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(sessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (sessionRecord) => this.getT3ActivityState(sessionRecord),
      getTerminalTitle: (sessionId) => this.terminalTitleBySessionId.get(sessionId),
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
      ownsNativeTerminalControl: this.ownsNativeTerminalControl,
      platform: SHORTCUT_LABEL_PLATFORM,
      previousSessions: this.previousSessionHistory.getItems(),
      scratchPadContent: this.getScratchPadContent(),
      terminalHasLiveProjection: (sessionId) => this.backend.hasLiveTerminal(sessionId),
      type,
      workspaceId: this.workspaceId,
      workspaceSnapshot: this.store.getSnapshot(),
    });
  }

  private createDebugInspectorMessage(): ExtensionToNativeTerminalDebugMessage {
    const sidebarState = this.createSidebarMessage("sessionState") as SidebarSessionStateMessage;
    return createDebugInspectorMessage({
      backendState: this.backend.getDebugState(),
      sidebarGroups: sidebarState.groups,
      sidebarHud: sidebarState.hud,
      workspaceId: this.workspaceId,
    });
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

  private createPreviousSessionEntry(
    group: SessionGroupRecord,
    sessionRecord: SessionRecord,
  ): PreviousSessionHistoryEntry | undefined {
    const sessionActivityContext = this.createSessionActivityContext();
    return createPreviousSessionEntry({
      browserHasLiveProjection: (sessionId) => this.browserSessions.hasLiveTab(sessionId),
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (session, snapshot) =>
        getEffectiveSessionActivity(sessionActivityContext, session, snapshot),
      getSessionAgentLaunch: (sessionId) => this.sessionAgentLaunchBySessionId.get(sessionId),
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getSidebarAgentIcon: (sessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(sessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (session) => this.getT3ActivityState(session),
      getTerminalTitle: (sessionId) => this.terminalTitleBySessionId.get(sessionId),
      group,
      ownsNativeTerminalControl: this.ownsNativeTerminalControl,
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

  private async handleSidebarMessage(message: SidebarToExtensionMessage): Promise<void> {
    await dispatchSidebarMessage(message, {
      clearGeneratedPreviousSessions: async () => this.clearGeneratedPreviousSessions(),
      clearStartupSidebarRefreshes: () => this.clearStartupSidebarRefreshes(),
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
      focusSession: async (sessionId, preserveFocus) =>
        this.focusSession(sessionId, preserveFocus === true),
      moveSessionToGroup: async (sessionId, groupId, targetIndex) =>
        this.moveSessionToGroup(sessionId, groupId, targetIndex),
      moveSidebarToOtherSide: async () => this.moveSidebarToOtherSide(),
      openDebugInspector: async () => this.openDebugInspector(),
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
      saveSidebarAgent: async (agentId, name, command) =>
        this.saveSidebarAgent(agentId, name, command),
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
      syncGroupOrder: async (groupIds) => this.syncGroupOrder(groupIds),
      syncSessionOrder: async (groupId, sessionIds) => this.syncSessionOrder(groupId, sessionIds),
      syncSidebarCommandOrder: async (commandIds) => this.syncSidebarCommandOrder(commandIds),
      toggleCompletionBell: async () => this.toggleCompletionBell(),
      toggleFullscreenSession: async () => this.toggleFullscreenSession(),
      toggleVsMuxDisabled: async () => this.toggleVsMuxDisabled(),
    });
  }

  private isAlreadyActiveSession(sessionId: string): boolean {
    return this.getActiveSnapshot().focusedSessionId === sessionId;
  }

  private async refreshSidebar(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): Promise<void> {
    await syncKnownSessionActivities(
      this.createSessionActivityContext(),
      this.getAllSessionRecords(),
      false,
    );
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

  private async writePendingRenameCommand(sessionId: string, alias: string): Promise<void> {
    await this.backend.writeText(sessionId, `/rename ${alias}`, false);
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
        const sessionRecords = this.getAllSessionRecords();
        this.backend.syncSessions(sessionRecords);
        this.t3Webviews.syncSessions(sessionRecords);
        this.browserSessions.syncSessions(sessionRecords);
        await operation.step("after-sync-session-managers", {
          expected: this.captureSnapshotTraceState(this.getActiveSnapshot()),
          preserveFocus,
        });
        await this.ensureT3RuntimeForStoredSessions(sessionRecords);
        await this.syncT3RuntimeLease();
        await operation.step("after-sync-t3-runtime");

        if (this.isVsMuxDisabled()) {
          await operation.step("vsmux-disabled");
          return;
        }

        const focusedSessionId =
          this.getActiveSnapshot().focusedSessionId ?? this.getActiveSnapshot().visibleSessionIds[0];
        if (!focusedSessionId) {
          await operation.step("no-focused-session");
          return;
        }

        await this.revealSessionSurface(focusedSessionId, preserveFocus);
        await operation.step("after-reveal-focused-session", {
          focusedSessionId,
          preserveFocus,
        });
      },
      payload: {
        preserveFocus,
      },
    });
  }

  private async revealSessionSurface(sessionId: string, preserveFocus = false): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    if (isTerminalSession(sessionRecord)) {
      if (this.backend.hasLiveTerminal(sessionId)) {
        await this.backend.focusSession(sessionId, preserveFocus);
      }
      return;
    }

    if (isT3Session(sessionRecord)) {
      await this.t3Webviews.openSession(sessionRecord, preserveFocus);
      if (!preserveFocus) {
        this.t3Webviews.focusComposer(sessionId);
      }
      return;
    }

    if (isBrowserSession(sessionRecord)) {
      await this.browserSessions.openSession(sessionRecord, preserveFocus);
    }
  }

  private focusT3ComposerIfPossible(sessionId: string): void {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || !isT3Session(sessionRecord)) {
      return;
    }

    this.t3Webviews.focusComposer(sessionId);
  }

  private createSessionActivityContext() {
    return {
      getCompletionBellEnabled: () => this.getCompletionBellEnabled(),
      getLastTerminalActivityAt: (sessionId: string) =>
        this.backend.getLastTerminalActivityAt(sessionId),
      getSessionSnapshot: (sessionId: string) => this.backend.getSessionSnapshot(sessionId),
      getT3ActivityState: (sessionRecord: SessionRecord) => this.getT3ActivityState(sessionRecord),
      lastKnownActivityBySessionId: this.lastKnownActivityBySessionId,
      playCompletionSound: async () => {
        await this.sidebarProvider.postMessage({
          sound: getClampedCompletionSoundSetting(),
          type: "playCompletionSound",
        });
      },
      terminalTitleBySessionId: this.terminalTitleBySessionId,
      titleDerivedActivityBySessionId: this.titleDerivedActivityBySessionId,
      workspaceId: this.workspaceId,
    };
  }

  private createSessionEventContext() {
    return {
      acknowledgeT3Thread: (threadId: string) => this.t3ActivityMonitor.acknowledgeThread(threadId),
      backend: this.backend,
      createSessionActivityContext: () => this.createSessionActivityContext(),
      getActiveSnapshot: () => this.getActiveSnapshot(),
      getAllSessionRecords: () => this.getAllSessionRecords(),
      getSession: (sessionId: string) => this.store.getSession(sessionId),
      getT3ActivityState: (sessionRecord: SessionRecord) => this.getT3ActivityState(sessionRecord),
      refreshSidebar: async () => this.refreshSidebar(),
      terminalTitleBySessionId: this.terminalTitleBySessionId,
      titleDerivedActivityBySessionId: this.titleDerivedActivityBySessionId,
    };
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

    this.t3RuntimeLoad ??= import("../t3-runtime-manager")
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
    const sessionRecord = this.store.getSession(sessionId);
    return buildResumeAgentCommand(
      this.sessionAgentLaunchBySessionId.get(sessionId),
      sessionRecord?.alias,
    );
  }

  private buildCopyResumeCommandText(sessionId: string): string | undefined {
    const sessionRecord = this.store.getSession(sessionId);
    return buildCopyResumeCommandText(
      this.sessionAgentLaunchBySessionId.get(sessionId),
      this.sidebarAgentIconBySessionId.get(sessionId),
      sessionRecord?.alias,
    );
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
    this.sessionAgentLaunchBySessionId.clear();
    for (const [sessionId, launch] of loadStoredSessionAgentLaunches(
      this.context,
      this.workspaceId,
    )) {
      this.sessionAgentLaunchBySessionId.set(sessionId, launch);
    }
  }

  private async persistSessionAgentCommands(): Promise<void> {
    await persistSessionAgentLaunches(
      this.context,
      this.workspaceId,
      this.sessionAgentLaunchBySessionId,
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
      operation: import("../session-layout-trace").SessionLayoutTraceOperation,
    ) => Promise<T>,
  ): Promise<T> {
    const run = async (): Promise<T> => {
      this.projectionActionDepth += 1;
      try {
        return await this.layoutTrace.runOperation(action, {
          captureState: () => this.captureTraceState(),
          execute,
          payload,
        });
      } finally {
        this.projectionActionDepth = Math.max(0, this.projectionActionDepth - 1);
      }
    };
    if (this.projectionActionDepth > 0) {
      return run();
    }
    const previous = this.projectionActionQueue;
    const next = previous.then(run, run);
    this.projectionActionQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
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
    activeSnapshot: ReturnType<typeof captureSnapshotTraceState>;
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
    return captureControllerTraceState({
      activeSnapshot: this.getActiveSnapshot(),
      allSessionRecords: this.getAllSessionRecords(),
      backendState: this.backend.getDebugState(),
      browserState: this.browserSessions.getDebugState(),
      ownsNativeTerminalControl: this.ownsNativeTerminalControl,
      sidebarGroups: sidebarState.groups,
      sidebarHud: sidebarState.hud,
      storeSnapshot: this.store.getSnapshot(),
      t3State: this.t3Webviews.getDebugState(),
      workspaceId: this.workspaceId,
    });
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
    return captureSnapshotTraceState(snapshot, this.getAllSessionRecords());
  }

  private getActiveSnapshot() {
    return this.store.getActiveGroup()?.snapshot ?? createEmptyWorkspaceSessionSnapshot();
  }

  private getAllSessionRecords(): SessionRecord[] {
    return this.store.getSnapshot().groups.flatMap((group) => getOrderedSessions(group.snapshot));
  }

  private isVsMuxDisabled(): boolean {
    return this.context.workspaceState.get<boolean>(this.getDisableVsMuxStorageKey(), false);
  }

  private getScratchPadContent(): string {
    const storedContent = this.context.workspaceState.get<string>(
      this.getScratchPadStorageKey(),
      "",
    );
    return typeof storedContent === "string" ? storedContent : "";
  }

  private async toggleVsMuxDisabled(): Promise<void> {
    await this.runLoggedAction("toggleVsMuxDisabled", undefined, async (operation) => {
      if (!(await this.ensureNativeTerminalControl())) {
        await operation.step("ensure-native-terminal-control-blocked");
        return;
      }

      const nextValue = !this.isVsMuxDisabled();
      await this.context.workspaceState.update(this.getDisableVsMuxStorageKey(), nextValue);
      await operation.step("after-store-toggle", { nextValue });
      if (nextValue) {
        await this.applyDisabledVsMuxMode();
        await operation.step("after-apply-disabled-mode");
      } else {
        await this.reconcileProjectedSessions();
        await operation.step("after-reconcile");
      }
      await this.refreshSidebar("hydrate");
      await operation.step("after-refresh-sidebar");
    });
  }

  private async applyDisabledVsMuxMode(): Promise<void> {
    this.t3Webviews.disposeAllSessions();
  }

  private getDisableVsMuxStorageKey(): string {
    return getWorkspaceStorageKey(DISABLE_VS_MUX_MODE_KEY, this.workspaceId);
  }

  private getScratchPadStorageKey(): string {
    return getWorkspaceStorageKey(SCRATCH_PAD_CONTENT_KEY, this.workspaceId);
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
