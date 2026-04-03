import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  createSidebarHudState,
  getOrderedSessions,
  isT3Session,
  isTerminalSession,
  resolveSidebarTheme,
  type SidebarCollapsibleSection,
  type ExtensionToSidebarMessage,
  type SessionGridDirection,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridSnapshot,
  type SessionRecord,
  type SidebarDaemonSessionItem,
  type SidebarHydrateMessage,
  type SidebarSessionStateMessage,
  type SidebarToExtensionMessage,
  type TerminalViewMode,
  type T3SessionRecord,
  type VisibleSessionCount,
} from '../../shared/session-grid-contract';
import { getSidebarAgentIconById, type SidebarAgentIcon } from '../../shared/sidebar-agents';
import type { GitTextGenerationSettings } from '../../shared/git-text-generation-provider';
import {
  createDefaultSidebarGitState,
  resolveSidebarGitPrimaryActionState,
  type SidebarGitAction,
  type SidebarGitState,
} from '../../shared/sidebar-git';
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelAutoFocusRequest,
} from '../../shared/workspace-panel-contract';
import { prepareSidebarGitCommit, runSidebarGitActionWorkflow, type PreparedSidebarGitCommit } from '../git/actions';
import { getGitStatusDetails, loadSidebarGitState } from '../git/status';
import {
  getGitTextGenerationSettings,
  hasConfiguredGitTextGenerationProvider,
} from '../git-text-generation-preferences';
import {
  buildSidebarMessage,
  createSidebarSessionItem,
  createPreviousSessionEntry,
} from '../native-terminal-workspace-sidebar-state';
import { getInterestingTitleSymbols } from '../session-title-activity';
import { getEffectiveSessionActivity, syncKnownSessionActivities } from './activity';
import { PreviousSessionHistory, type PreviousSessionHistoryEntry } from '../previous-session-history';
import {
  deleteSidebarAgentPreference,
  getSidebarAgentButtonById,
  getSidebarAgentButtons,
  saveSidebarAgentPreference,
  syncSidebarAgentOrderPreference,
} from '../sidebar-agent-preferences';
import {
  deleteSidebarCommandPreference,
  getSidebarCommandButtonById,
  getSidebarCommandButtons,
  saveSidebarCommandPreference,
  syncSidebarCommandOrderPreference,
} from '../sidebar-command-preferences';
import { getFirstBrowserSidebarCommandUrl } from '../../shared/sidebar-commands';
import { SessionGridStore } from '../session-grid-store';
import { SessionSidebarViewProvider } from '../session-sidebar-view';
import {
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getErrorMessage,
  getWorkspaceId,
  focusEditorGroupByIndex,
} from '../terminal-workspace-environment';
import { T3RuntimeManager } from '../t3-runtime-manager';
import { disposeVSmuxDebugLog, logVSmuxDebug, resetVSmuxDebugLog } from '../vsmux-debug-log';
import {
  findLiveBrowserTabBySessionId,
  getLiveBrowserTabs,
  isBrowserSidebarSessionId,
  normalizeSidebarBrowserUrl,
} from '../live-browser-tabs';
import { dispatchSidebarMessage } from './sidebar-message-dispatch';
import { finalizeRestoredPreviousSession } from './restore-previous-session';
import {
  buildCopyResumeCommandText,
  buildDetachedResumeAction,
  loadStoredSessionAgentLaunches,
  persistSessionAgentLaunches,
  type StoredSessionAgentLaunch,
} from '../native-terminal-workspace-session-agent-launch';
import {
  getPrimarySidebarGitAction,
  getSidebarGitConfirmSuggestedCommit,
  savePrimarySidebarGitAction,
  saveSidebarGitConfirmSuggestedCommit,
} from '../sidebar-git-preferences';
import { getSidebarSectionCollapseState, saveSidebarSectionCollapsed } from '../sidebar-section-preferences';
import {
  COMPLETION_BELL_ENABLED_KEY,
  PRIMARY_SESSIONS_CONTAINER_ID,
  SCRATCH_PAD_CONTENT_KEY,
  SECONDARY_SESSIONS_CONTAINER_ID,
  SIDEBAR_LOCATION_IN_SECONDARY_KEY,
  getClampedAgentManagerZoomPercent,
  getClampedCompletionSoundSetting,
  getClampedSidebarThemeSetting,
  getDefaultBrowserLaunchUrl,
  getDebuggingMode,
  getShowCloseButtonOnSessionCards,
  getShowSidebarActions,
  getShowSidebarAgents,
  getShowSidebarBrowsers,
  getShowSidebarGitButton,
  getShowHotkeysOnSessionCards,
  getSidebarThemeVariant,
  getWorkspaceActivePaneBorderColor,
  getWorkspacePaneGap,
  getTerminalCursorBlink,
  getTerminalCursorStyle,
  getTerminalFontFamily,
  getTerminalFontSize,
  getTerminalLetterSpacing,
  getTerminalLineHeight,
} from './settings';
import { DaemonTerminalWorkspaceBackend } from '../daemon-terminal-workspace-backend';
import { WorkspacePanelManager } from '../workspace-panel';
import { WorkspaceAssetServer } from '../workspace-asset-server';
import { createPendingT3IframeSource, createT3IframeSource } from '../t3-webview-manager/html';
import { playCloseTerminalOnExitSound } from '../terminal-exit-sound';

const SHORTCUT_LABEL_PLATFORM = process.platform === 'darwin' ? 'mac' : 'default';
const COMMAND_TERMINAL_EXIT_POLL_MS = 250;
const COMPLETION_SOUND_CONFIRMATION_DELAY_MS = 2_000;
const SIMPLE_BROWSER_OPEN_COMMAND = 'simpleBrowser.api.open';
const TOGGLE_MAXIMIZE_EDITOR_GROUP_COMMAND = 'workbench.action.toggleMaximizeEditorGroup';

export { SESSIONS_VIEW_ID } from './settings';

export type NativeTerminalWorkspaceDebugState = {
  backend: 'native';
  platform: NodeJS.Platform;
  terminalUiPath: string;
};

export class NativeTerminalWorkspaceController implements vscode.Disposable {
  private readonly backend: DaemonTerminalWorkspaceBackend;
  private readonly disposables: vscode.Disposable[] = [];
  private hasApprovedUntrustedShells = vscode.workspace.isTrusted;
  private pendingReconcileRequest: { version: number } | undefined;
  private reconcileRequestVersion = 0;
  private reconcileRunner: Promise<void> | undefined;
  private suppressedObservedFocusDepth = 0;
  private readonly sidebarAgentIconBySessionId = new Map<string, SidebarAgentIcon>();
  private browserEditorGroupIsMaximized = false;
  private readonly browserDetailBySessionId = new Map<string, string>();
  private readonly liveBrowserTabsBySessionId = new Map<string, vscode.Tab>();
  private readonly previousSessionHistory: PreviousSessionHistory;
  private readonly sessionAgentLaunchBySessionId: Map<string, StoredSessionAgentLaunch>;
  private readonly store: SessionGridStore;
  private readonly terminalTitleBySessionId = new Map<string, string>();
  private readonly lastPostedSidebarPresentationBySessionId = new Map<
    string,
    {
      activity: string;
      activityLabel: string | undefined;
      primaryTitle: string | undefined;
      terminalTitle: string | undefined;
    }
  >();
  private readonly lastKnownActivityBySessionId = new Map<string, 'idle' | 'working' | 'attention'>();
  private readonly workingStartedAtBySessionId = new Map<string, number>();
  private readonly pendingCompletionSoundTimeoutBySessionId = new Map<string, NodeJS.Timeout>();
  private readonly loggedTitleSymbolKeys = new Set<string>();
  private readonly pendingT3SessionIds = new Set<string>();
  private nextSidebarRevision = 0;
  private nextWorkspaceAutoFocusRequestId = 0;
  private focusRequestSequence = 0;
  private pendingWorkspaceAutoFocusRequest: WorkspacePanelAutoFocusRequest | undefined;
  private pendingSidebarGitCommitConfirmation:
    | {
        action: SidebarGitAction;
        generator: GitTextGenerationSettings;
        preparedCommit: PreparedSidebarGitCommit;
        requestId: string;
      }
    | undefined;
  private gitActionInProgress = false;
  private gitHudStateCache: { isStale: boolean; updatedAt: number; value: SidebarGitState } | undefined;
  private gitHudRefreshPromise: Promise<void> | undefined;
  private t3Runtime: T3RuntimeManager | undefined;
  private readonly workspaceId: string;
  private readonly workspaceAssetServer: WorkspaceAssetServer;
  private readonly workspacePanel: WorkspacePanelManager;
  public readonly sidebarProvider: SessionSidebarViewProvider;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.store = new SessionGridStore(context);
    this.previousSessionHistory = new PreviousSessionHistory(context);
    this.workspaceId = getWorkspaceId();
    this.sessionAgentLaunchBySessionId = loadStoredSessionAgentLaunches(context, this.workspaceId);
    this.backend = new DaemonTerminalWorkspaceBackend({
      context,
      ensureShellSpawnAllowed: async () => vscode.workspace.isTrusted,
      workspaceId: this.workspaceId,
    });
    this.workspaceAssetServer = new WorkspaceAssetServer(context);
    this.workspacePanel = new WorkspacePanelManager({
      context,
      onMessage: async (message) => {
        if (message.type === 'workspaceDebugLog') {
          logVSmuxDebug(`workspace.webview.${message.event}`, message.details);
          return;
        }

        if (message.type === 'focusSession') {
          await this.focusSession(message.sessionId, 'workspace');
          return;
        }

        if (message.type === 'closeSession') {
          await this.closeSession(message.sessionId);
          return;
        }

        if (message.type === 'syncSessionOrder') {
          await this.syncSessionOrder(message.groupId, message.sessionIds);
        }
      },
    });
    this.sidebarProvider = new SessionSidebarViewProvider({
      onMessage: async (message) => this.handleSidebarMessage(message),
    });

    this.disposables.push(
      this.backend,
      this.workspaceAssetServer,
      this.workspacePanel,
      this.sidebarProvider,
      this.backend.onDidChangeSessions(() => {
        void (async () => {
          await this.syncKnownSessionActivities(false);
          await this.refreshSidebar();
        })();
      }),
      this.backend.onDidChangeSessionPresentation(({ sessionId, title }) => {
        const snapshot = this.backend.getSessionSnapshot(sessionId);
        this.syncCompletionSoundForSession(sessionId);
        this.logSessionTitleSymbols(sessionId, title ?? snapshot?.title, snapshot?.agentName);
        logVSmuxDebug('controller.sessionPresentationChanged', {
          agentName: snapshot?.agentName,
          agentStatus: snapshot?.agentStatus,
          sessionId,
          title,
        });
        if (title) {
          this.terminalTitleBySessionId.set(sessionId, title);
        } else {
          this.terminalTitleBySessionId.delete(sessionId);
        }
        void this.postSessionPresentationMessage(sessionId);
      }),
      vscode.workspace.onDidChangeConfiguration(() => {
        void this.backend.syncConfiguration();
        this.invalidateSidebarGitHudState();
        void this.refreshWorkspacePanel();
        void this.refreshSidebar('hydrate');
      }),
      vscode.window.onDidChangeActiveColorTheme(() => {
        void this.refreshSidebar('hydrate');
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => {
        void this.handleBrowserTabsChanged();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        void this.handleBrowserTabsChanged();
      })
    );
  }

  public async initialize(): Promise<void> {
    await this.removeStalePendingT3Sessions();
    resetVSmuxDebugLog();
    logVSmuxDebug('controller.initialize', {
      activeGroupId: this.store.getSnapshot().activeGroupId,
      sessionCount: this.getAllSessionRecords().length,
    });
    await this.backend.initialize(this.getAllSessionRecords());
    await this.syncKnownSessionActivities(false);
    this.syncSurfaceManagers();
    await this.reconcileProjectedSessions();
    await this.refreshSidebar('hydrate');
  }

  public dispose(): void {
    for (const timeout of this.pendingCompletionSoundTimeoutBySessionId.values()) {
      clearTimeout(timeout);
    }
    this.pendingCompletionSoundTimeoutBySessionId.clear();
    this.t3Runtime?.dispose();
    disposeVSmuxDebugLog();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  public getDebuggingState(): NativeTerminalWorkspaceDebugState {
    return {
      backend: 'native',
      platform: process.platform,
      terminalUiPath: 'Ghostty workspace webview',
    };
  }

  public async openWorkspace(): Promise<void> {
    await this.revealSidebar();
    await this.workspacePanel.reveal();
    if (this.getAllSessionRecords().length === 0) {
      await this.createSession();
      return;
    }

    await this.refreshWorkspacePanel();
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

    await this.refreshSidebarFromCurrentState();
    await this.createSurfaceIfNeeded(sessionRecord);
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
  }

  public async focusDirection(direction: SessionGridDirection): Promise<void> {
    const changed = await this.store.focusDirection(direction);
    if (!changed) {
      return;
    }

    await this.afterStateChange();
  }

  public async focusSession(sessionId: string, source?: 'sidebar' | 'workspace'): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      if (isBrowserSidebarSessionId(sessionId)) {
        await this.focusLiveBrowserTab(sessionId);
      }
      return;
    }

    this.browserEditorGroupIsMaximized = false;
    this.clearObservedSidebarFocusState();
    const focusRequestId = ++this.focusRequestSequence;
    const focusStartedAt = Date.now();
    logVSmuxDebug('controller.focusSession', {
      focusRequestId,
      sessionId,
      sessionKind: sessionRecord.kind,
      source,
      startedAt: focusStartedAt,
    });
    const hadLiveTerminal = sessionRecord.kind === 'terminal' && this.backend.hasLiveTerminal(sessionRecord.sessionId);
    const shouldReattachDetachedTerminal =
      source === 'sidebar' &&
      sessionRecord.kind === 'terminal' &&
      !this.backend.hasAttachedTerminal(sessionRecord.sessionId);
    const shouldResumeDeadTerminal =
      shouldReattachDetachedTerminal && sessionRecord.kind === 'terminal' && !hadLiveTerminal;
    const acknowledgedAttention = await this.acknowledgeSessionAttentionIfNeeded(sessionId);
    logVSmuxDebug('controller.focusSession.afterAcknowledge', {
      acknowledgedAttention,
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      sessionId,
    });
    const changed = await this.store.focusSession(sessionId);
    logVSmuxDebug('controller.focusSession.afterStoreFocus', {
      changed,
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      sessionId,
      snapshot: this.describeActiveSnapshot(),
    });
    if (source === 'sidebar') {
      this.enqueueWorkspaceAutoFocus(sessionId, 'sidebar');
    }
    if (shouldReattachDetachedTerminal) {
      await this.backend.createOrAttachSession(sessionRecord);
      logVSmuxDebug('controller.focusSession.explicitTerminalCreateOrAttach', {
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
        shouldResumeDeadTerminal,
        source,
      });
    }
    const isVisiblePresentationFocus = this.isSessionVisibleInWorkspace(sessionId) && !shouldReattachDetachedTerminal;
    const sidebarRefreshPromise =
      changed || acknowledgedAttention
        ? this.refreshSidebarFromCurrentState().then(() => {
            logVSmuxDebug('controller.focusSession.afterSidebarRefresh', {
              durationMs: Date.now() - focusStartedAt,
              focusRequestId,
              sessionId,
            });
          })
        : undefined;
    if (isVisiblePresentationFocus) {
      if (changed || acknowledgedAttention) {
        await this.refreshWorkspacePanel();
        logVSmuxDebug('controller.focusSession.afterImmediateWorkspaceRefresh', {
          durationMs: Date.now() - focusStartedAt,
          focusRequestId,
          sessionId,
        });
      }
      await this.revealWorkspacePanelForSidebarFocus(source);
      logVSmuxDebug('controller.focusSession.visiblePresentation', {
        acknowledgedAttention,
        changed,
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
        source,
      });
      if (sidebarRefreshPromise) {
        void sidebarRefreshPromise;
      }
      return;
    }

    if (sidebarRefreshPromise) {
      await sidebarRefreshPromise;
    }

    if (!changed) {
      if (shouldReattachDetachedTerminal) {
        await this.afterStateChange({ sidebarAlreadyRefreshed: changed || acknowledgedAttention });
        logVSmuxDebug('controller.focusSession.afterStateChangeNoChangePath', {
          durationMs: Date.now() - focusStartedAt,
          focusRequestId,
          sessionId,
        });
        if (shouldResumeDeadTerminal) {
          await this.resumeDetachedTerminalSession(sessionRecord);
          logVSmuxDebug('controller.focusSession.afterResumeDetachedTerminal', {
            durationMs: Date.now() - focusStartedAt,
            focusRequestId,
            sessionId,
          });
        }
      }
      await this.revealWorkspacePanelForSidebarFocus(source);
      logVSmuxDebug('controller.focusSession.noChange', {
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
      });
      return;
    }

    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
    logVSmuxDebug('controller.focusSession.afterStateChange', {
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      sessionId,
    });
    if (shouldResumeDeadTerminal) {
      await this.resumeDetachedTerminalSession(sessionRecord);
      logVSmuxDebug('controller.focusSession.afterResumeDetachedTerminal', {
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
      });
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
    const resolvedSessionId = sessionId ?? (await this.promptForSessionId('Reveal session'));
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
      await this.deletePersistedSessionStateIfNeeded(sessionRecord);
      this.clearSessionPresentationState(sessionRecord.sessionId);
    }
    if (archivedSessions.length > 0) {
      await this.previousSessionHistory.append(archivedSessions);
    }
    await this.persistSessionAgentLaunchState();
    await this.store.reset();
    await this.afterStateChange();
  }

  public async restartSession(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    if (sessionRecord.kind === 'terminal') {
      await this.backend.restartSession(sessionRecord);
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
    if (sessionRecord?.kind === 'terminal') {
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
      return;
    }

    const nextTitle = await vscode.window.showInputBox({
      prompt: 'Rename session',
      value: sessionRecord.title,
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
      if (isBrowserSidebarSessionId(sessionId)) {
        await this.closeLiveBrowserTab(sessionId);
      }
      return;
    }

    const archivedSession = this.createArchivedSessionEntry(sessionRecord);
    const removed = await this.store.removeSession(sessionId);
    if (!removed) {
      return;
    }
    await this.refreshSidebarFromCurrentState();
    await this.disposeSurface(sessionRecord);
    await this.deletePersistedSessionStateIfNeeded(sessionRecord);
    this.clearSessionPresentationState(sessionId);
    if (archivedSession) {
      await this.previousSessionHistory.append([archivedSession]);
    }
    await this.persistSessionAgentLaunchState();
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
  }

  public async copyResumeCommand(sessionId?: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind !== 'terminal') {
      return;
    }

    const commandText = buildCopyResumeCommandText(
      this.sessionAgentLaunchBySessionId.get(sessionId),
      this.getSidebarAgentIconForSession(sessionId),
      sessionRecord.title,
      this.terminalTitleBySessionId.get(sessionId)
    );
    if (!commandText) {
      void vscode.window.showInformationMessage('No resume command is available for this session.');
      return;
    }

    await vscode.env.clipboard.writeText(commandText);
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
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:maddada.VSmux');
  }

  public async toggleCompletionBell(): Promise<void> {
    await this.context.workspaceState.update(COMPLETION_BELL_ENABLED_KEY, !this.getCompletionBellEnabled());
    await this.refreshSidebar('hydrate');
  }

  public async runSidebarCommand(commandId: string): Promise<void> {
    const commandButton = getSidebarCommandButtonById(this.context, commandId);
    if (!commandButton) {
      return;
    }

    if (commandButton.actionType === 'browser') {
      const url = commandButton.url?.trim();
      if (!url) {
        return;
      }

      await this.openBrowserUrl(url);
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

  public async runSidebarGitAction(action: SidebarGitAction): Promise<void> {
    if (this.gitActionInProgress) {
      return;
    }

    const generator = getGitTextGenerationSettings();
    if (!hasConfiguredGitTextGenerationProvider(generator)) {
      void vscode.window.showErrorMessage(
        'Git text generation is set to custom, but VSmux.gitTextGenerationCustomCommand is empty.'
      );
      return;
    }

    this.pendingSidebarGitCommitConfirmation = undefined;
    this.gitActionInProgress = true;
    await savePrimarySidebarGitAction(this.context, this.workspaceId, action);
    this.invalidateSidebarGitHudState();
    await this.refreshSidebar();

    try {
      const cwd = getDefaultWorkspaceCwd();
      const status = await getGitStatusDetails(cwd);
      const needsCommit = action === 'commit' || status.hasWorkingTreeChanges;
      const shouldPromptForCommit = needsCommit && getSidebarGitConfirmSuggestedCommit(this.context, this.workspaceId);

      if (shouldPromptForCommit) {
        const preparedCommit = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'VSmux Git',
          },
          async (progress) =>
            prepareSidebarGitCommit({
              action,
              cwd,
              generator,
              onProgress: (message) => progress.report({ message }),
            })
        );

        const sidebarGitState = await loadSidebarGitState(cwd, action, false);
        const primaryAction = resolveSidebarGitPrimaryActionState(sidebarGitState);
        const requestId = randomUUID();
        this.pendingSidebarGitCommitConfirmation = {
          action,
          generator,
          preparedCommit,
          requestId,
        };
        await this.sidebarProvider.postMessage({
          action,
          confirmLabel: primaryAction.label,
          description:
            preparedCommit.scope === 'stagedOnly'
              ? 'Review the suggested commit title. Only staged changes will be committed.'
              : 'Review the suggested commit title before continuing with all current working tree changes.',
          requestId,
          suggestedSubject: preparedCommit.subject,
          type: 'promptGitCommit',
        });
        return;
      }

      this.gitActionInProgress = false;
      this.invalidateSidebarGitHudState();
      await this.refreshSidebar();
      await this.executeSidebarGitAction(action, generator);
    } catch (error) {
      void vscode.window.showErrorMessage(getErrorMessage(error));
    } finally {
      this.gitActionInProgress = false;
      this.invalidateSidebarGitHudState();
      await this.refreshSidebar();
    }
  }

  public async refreshGitState(): Promise<void> {
    this.invalidateSidebarGitHudState();
    await this.refreshSidebar();
  }

  public async setSidebarGitPrimaryAction(action: SidebarGitAction): Promise<void> {
    await savePrimarySidebarGitAction(this.context, this.workspaceId, action);
    this.invalidateSidebarGitHudState();
    await this.refreshSidebar();
  }

  public async setSidebarGitCommitConfirmationEnabled(enabled: boolean): Promise<void> {
    await saveSidebarGitConfirmSuggestedCommit(this.context, this.workspaceId, enabled);
    this.invalidateSidebarGitHudState();
    await this.refreshSidebar();
  }

  public async confirmSidebarGitCommit(requestId: string, subject: string): Promise<void> {
    const pending = this.pendingSidebarGitCommitConfirmation;
    if (!pending || pending.requestId !== requestId || this.gitActionInProgress) {
      return;
    }

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      void vscode.window.showErrorMessage('Commit title cannot be empty.');
      return;
    }

    this.pendingSidebarGitCommitConfirmation = undefined;
    await this.executeSidebarGitAction(pending.action, pending.generator, {
      ...pending.preparedCommit,
      subject: trimmedSubject,
    });
  }

  public async cancelSidebarGitCommit(requestId: string): Promise<void> {
    if (this.pendingSidebarGitCommitConfirmation?.requestId !== requestId) {
      return;
    }

    this.pendingSidebarGitCommitConfirmation = undefined;
  }

  private async executeSidebarGitAction(
    action: SidebarGitAction,
    generator: GitTextGenerationSettings,
    preparedCommit?: PreparedSidebarGitCommit
  ): Promise<void> {
    if (this.gitActionInProgress) {
      return;
    }

    this.gitActionInProgress = true;
    this.invalidateSidebarGitHudState();
    await this.refreshSidebar();

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'VSmux Git',
        },
        async (progress) =>
          runSidebarGitActionWorkflow({
            action,
            cwd: getDefaultWorkspaceCwd(),
            generator,
            onProgress: (message) => progress.report({ message }),
            preparedCommit,
          })
      );

      if (result.prUrl) {
        await vscode.env.openExternal(vscode.Uri.parse(result.prUrl));
      }
      void vscode.window.showInformationMessage(result.message);
    } catch (error) {
      void vscode.window.showErrorMessage(getErrorMessage(error));
    } finally {
      this.gitActionInProgress = false;
      this.invalidateSidebarGitHudState();
      await this.refreshSidebar();
    }
  }

  public async runSidebarAgent(agentId: string): Promise<void> {
    const agentButton = getSidebarAgentButtonById(agentId);
    if (!agentButton?.command) {
      return;
    }

    if (agentId === 't3') {
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
    this.sessionAgentLaunchBySessionId.set(sessionRecord.sessionId, {
      agentId: agentButton.agentId,
      command: agentButton.command,
    });
    await this.persistSessionAgentLaunchState();
    await this.refreshSidebarFromCurrentState();
    await this.backend.createOrAttachSession(sessionRecord);
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
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
      archivedSession.sessionRecord.kind === 't3'
        ? await this.store.createSession({
            kind: 't3',
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
    if (archivedSession.agentLaunch) {
      this.sessionAgentLaunchBySessionId.set(restoredSession.sessionId, archivedSession.agentLaunch);
    }

    if (archivedSession.sessionRecord.alias !== restoredSession.alias) {
      await this.store.renameSessionAlias(restoredSession.sessionId, archivedSession.sessionRecord.alias);
    }

    const nextSessionRecord = this.store.getSession(restoredSession.sessionId) ?? restoredSession;
    await finalizeRestoredPreviousSession({
      afterStateChange: async () => this.afterStateChange(),
      createSurfaceIfNeeded: async () => this.createSurfaceIfNeeded(nextSessionRecord),
      persistSessionAgentLaunchState: async () => this.persistSessionAgentLaunchState(),
      removePreviousSession: async () => this.previousSessionHistory.remove(historyId),
      resumeDetachedTerminalSession: async () => this.resumeDetachedTerminalSession(nextSessionRecord),
    });
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

  public async setSidebarSectionCollapsed(section: SidebarCollapsibleSection, collapsed: boolean): Promise<void> {
    await saveSidebarSectionCollapsed(this.context, this.workspaceId, section, collapsed);
    await this.refreshSidebar('hydrate');
  }

  public async saveSidebarCommand(
    commandId: string | undefined,
    name: string,
    actionType: 'browser' | 'terminal',
    closeTerminalOnExit: boolean,
    command?: string,
    url?: string
  ): Promise<void> {
    await saveSidebarCommandPreference(this.context, {
      actionType,
      closeTerminalOnExit,
      command,
      commandId,
      name,
      url,
    });
    await this.refreshSidebar('hydrate');
  }

  public async deleteSidebarCommand(commandId: string): Promise<void> {
    await deleteSidebarCommandPreference(this.context, commandId);
    await this.refreshSidebar('hydrate');
  }

  public async syncSidebarCommandOrder(commandIds: readonly string[]): Promise<void> {
    await syncSidebarCommandOrderPreference(this.context, commandIds);
    await this.refreshSidebar('hydrate');
  }

  public async saveSidebarAgent(
    agentId: string | undefined,
    name: string,
    command: string,
    icon?: SidebarAgentIcon
  ): Promise<void> {
    await saveSidebarAgentPreference({ agentId, command, icon, name });
    await this.refreshSidebar('hydrate');
  }

  public async deleteSidebarAgent(agentId: string): Promise<void> {
    await deleteSidebarAgentPreference(agentId);
    await this.refreshSidebar('hydrate');
  }

  public async syncSidebarAgentOrder(agentIds: readonly string[]): Promise<void> {
    await syncSidebarAgentOrderPreference(agentIds);
    await this.refreshSidebar('hydrate');
  }

  public async focusGroup(groupId: string, source?: 'sidebar'): Promise<void> {
    this.clearObservedSidebarFocusState();
    const changed = await this.store.focusGroup(groupId);
    if (source === 'sidebar') {
      this.enqueueWorkspaceAutoFocusForFocusedSession('sidebar');
    }
    if (changed) {
      await this.afterStateChange();
      return;
    }

    if (source === 'sidebar' && this.pendingWorkspaceAutoFocusRequest) {
      await this.refreshWorkspacePanel();
      await this.revealWorkspacePanelForSidebarFocus(source);
    }
  }

  public async focusGroupByIndex(groupIndex: number): Promise<void> {
    this.clearObservedSidebarFocusState();
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

  public async moveSessionToGroup(sessionId: string, groupId: string, targetIndex?: number): Promise<void> {
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

  public async createGroup(): Promise<void> {
    const groupId = await this.store.createGroup();
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
    await this.store.removeGroup(groupId);
    await this.refreshSidebarFromCurrentState();
    for (const sessionRecord of group.snapshot.sessions) {
      await this.disposeSurface(sessionRecord);
      await this.deletePersistedSessionStateIfNeeded(sessionRecord);
      this.clearSessionPresentationState(sessionRecord.sessionId);
    }
    if (archivedSessions.length > 0) {
      await this.previousSessionHistory.append(archivedSessions);
    }
    await this.persistSessionAgentLaunchState();
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
  }

  private async afterStateChange(options?: {
    sidebarAlreadyRefreshed?: boolean;
    workspaceAlreadyRefreshed?: boolean;
  }): Promise<void> {
    if (options?.sidebarAlreadyRefreshed) {
      this.clearObservedSidebarFocusState();
      this.syncSurfaceManagers();
    } else {
      await this.refreshSidebarFromCurrentState();
    }
    if (!options?.workspaceAlreadyRefreshed) {
      await this.refreshWorkspacePanel();
    }
    logVSmuxDebug('controller.afterStateChange', {
      activeGroupId: this.store.getSnapshot().activeGroupId,
      snapshot: this.describeActiveSnapshot(),
    });
    await this.reconcileProjectedSessions();
  }

  private async refreshSidebarFromCurrentState(): Promise<void> {
    this.clearObservedSidebarFocusState();
    this.syncSurfaceManagers();
    await this.refreshSidebar();
  }

  private async handleSidebarMessage(message: SidebarToExtensionMessage): Promise<void> {
    if (message.type === 'sidebarDebugLog') {
      logVSmuxDebug(`sidebar.webview.${message.event}`, message.details);
      return;
    }

    await dispatchSidebarMessage(message, {
      cancelSidebarGitCommit: async (requestId) => this.cancelSidebarGitCommit(requestId),
      clearGeneratedPreviousSessions: async () => this.clearGeneratedPreviousSessions(),
      clearStartupSidebarRefreshes: () => {},
      closeGroup: async (groupId) => this.closeGroup(groupId),
      closeSession: async (sessionId) => this.closeSession(sessionId),
      confirmSidebarGitCommit: async (requestId, subject) => this.confirmSidebarGitCommit(requestId, subject),
      copyResumeCommand: async (sessionId) => this.copyResumeCommand(sessionId),
      createGroup: async () => this.createGroup(),
      createGroupFromSession: async (sessionId) => this.createGroupFromSession(sessionId),
      createSession: async () => this.createSession(),
      createSessionInGroup: async (groupId) => this.createSessionInGroup(groupId),
      deletePreviousSession: async (historyId) => this.deletePreviousSession(historyId),
      killDaemonSession: async (workspaceId, sessionId) => this.killDaemonSession(workspaceId, sessionId),
      killTerminalDaemon: async () => this.killTerminalDaemon(),
      deleteSidebarAgent: async (agentId) => this.deleteSidebarAgent(agentId),
      deleteSidebarCommand: async (commandId) => this.deleteSidebarCommand(commandId),
      focusGroup: async (groupId, source) => this.focusGroup(groupId, source),
      focusSession: async (sessionId, source) => this.focusSession(sessionId, source),
      moveSessionToGroup: async (sessionId, groupId, targetIndex) =>
        this.moveSessionToGroup(sessionId, groupId, targetIndex),
      moveSidebarToOtherSide: async () => this.moveSidebarToOtherSide(),
      openBrowser: async () => this.openDefaultBrowserUrl(),
      openSettings: async () => this.openSettings(),
      promptRenameSession: async (sessionId) => this.promptRenameSession(sessionId),
      refreshDaemonSessions: async () => this.refreshDaemonSessions(),
      refreshGitState: async () => this.refreshGitState(),
      refreshSidebarHydrate: async () => this.refreshSidebar('hydrate'),
      renameGroup: async (groupId, title) => this.renameGroup(groupId, title),
      renameSession: async (sessionId, title) => this.renameSession(sessionId, title),
      restartSession: async (sessionId) => this.restartSession(sessionId),
      restorePreviousSession: async (historyId) => this.restorePreviousSession(historyId),
      runSidebarAgent: async (agentId) => this.runSidebarAgent(agentId),
      runSidebarCommand: async (commandId) => this.runSidebarCommand(commandId),
      runSidebarGitAction: async (action) => this.runSidebarGitAction(action),
      saveScratchPad: async (content) => this.saveScratchPad(content),
      setSidebarSectionCollapsed: async (section, collapsed) => this.setSidebarSectionCollapsed(section, collapsed),
      saveSidebarAgent: async (agentId, name, command, icon) => this.saveSidebarAgent(agentId, name, command, icon),
      saveSidebarCommand: async (commandId, name, actionType, closeTerminalOnExit, command, url) =>
        this.saveSidebarCommand(commandId, name, actionType, closeTerminalOnExit === true, command, url),
      setSidebarGitCommitConfirmationEnabled: async (enabled) => this.setSidebarGitCommitConfirmationEnabled(enabled),
      setSidebarGitPrimaryAction: async (action) => this.setSidebarGitPrimaryAction(action),
      setViewMode: async (viewMode) => this.setViewMode(viewMode),
      setVisibleCount: async (visibleCount) => this.setVisibleCount(visibleCount),
      syncSidebarAgentOrder: async (agentIds) => this.syncSidebarAgentOrder(agentIds),
      syncGroupOrder: async (groupIds) => this.syncGroupOrder(groupIds),
      syncSessionOrder: async (groupId, sessionIds) => this.syncSessionOrder(groupId, sessionIds),
      syncSidebarCommandOrder: async (commandIds) => this.syncSidebarCommandOrder(commandIds),
      toggleCompletionBell: async () => this.toggleCompletionBell(),
      toggleFullscreenSession: async () => this.toggleFullscreenSession(),
    });
  }

  private async refreshSidebar(
    type: SidebarHydrateMessage['type'] | SidebarSessionStateMessage['type'] = 'sessionState'
  ): Promise<void> {
    const revision = ++this.nextSidebarRevision;
    await this.sidebarProvider.postMessage(await this.createSidebarMessage(type, revision));
  }

  private async refreshDaemonSessions(): Promise<void> {
    await this.sidebarProvider.postMessage(await this.createDaemonSessionsMessage());
  }

  private async createSidebarMessage(
    type: SidebarHydrateMessage['type'] | SidebarSessionStateMessage['type'] = 'sessionState',
    revision = ++this.nextSidebarRevision
  ): Promise<ExtensionToSidebarMessage> {
    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const activeSnapshot =
      workspaceSnapshot.groups.find((group) => group.groupId === workspaceSnapshot.activeGroupId)?.snapshot ??
      this.getEmptySnapshot();
    const browserTabs = this.refreshLiveBrowserTabs();
    const sessionActivityContext = this.createSessionActivityContext();
    const gitState = type === 'sessionState' ? this.getCachedSidebarGitHudState() : await this.getSidebarGitHudState();
    if (type === 'sessionState') {
      this.ensureSidebarGitHudStateFresh();
    }
    return buildSidebarMessage({
      activeSnapshot,
      browserTabs: browserTabs.map((browserTab) => ({
        detail: browserTab.detail ?? this.browserDetailBySessionId.get(browserTab.sessionId),
        isActive: browserTab.isActive,
        label: browserTab.label,
        sessionId: browserTab.sessionId,
      })),
      browserHasLiveProjection: () => false,
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
      getT3ActivityState: (sessionRecord) => ({
        activity: 'idle',
        detail:
          !isT3Session(sessionRecord) || this.pendingT3SessionIds.has(sessionRecord.sessionId)
            ? undefined
            : `Thread ${sessionRecord.t3.threadId.slice(0, 8)}`,
        isRunning:
          this.pendingT3SessionIds.has(sessionRecord.sessionId) ||
          this.isSessionVisibleInWorkspace(sessionRecord.sessionId),
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
        this.getPendingSidebarAgentIds(),
        gitState,
        {
          actions: getShowSidebarActions(),
          agents: getShowSidebarAgents(),
          browsers: getShowSidebarBrowsers(),
          git: getShowSidebarGitButton(),
        },
        getSidebarSectionCollapseState(this.context, this.workspaceId)
      ),
      platform: SHORTCUT_LABEL_PLATFORM,
      previousSessions: this.previousSessionHistory.getItems(),
      revision,
      scratchPadContent: this.getScratchPadContent(),
      terminalHasLiveProjection: (sessionId) => this.backend.hasLiveTerminal(sessionId),
      type,
      workspaceId: this.workspaceId,
      workspaceSnapshot,
    });
  }

  private async createDaemonSessionsMessage(): Promise<ExtensionToSidebarMessage> {
    const daemonState = await this.backend.listGlobalSessions();
    return {
      daemon: daemonState.daemon,
      errorMessage: daemonState.errorMessage,
      sessions: daemonState.sessions
        .map<SidebarDaemonSessionItem>((session) => ({
          agentName: session.agentName,
          agentStatus: session.agentStatus,
          cols: session.cols,
          cwd: session.cwd,
          endedAt: session.endedAt,
          errorMessage: session.errorMessage,
          exitCode: session.exitCode,
          isCurrentWorkspace: session.workspaceId === this.workspaceId,
          restoreState: session.restoreState,
          rows: session.rows,
          sessionId: session.sessionId,
          shell: session.shell,
          startedAt: session.startedAt,
          status: session.status,
          title: session.title,
          workspaceId: session.workspaceId,
        }))
        .sort(compareSidebarDaemonSessions),
      type: 'daemonSessionsState',
    };
  }

  private async killDaemonSession(workspaceId: string, sessionId: string): Promise<void> {
    try {
      await this.backend.killGlobalSession(workspaceId, sessionId);
    } catch (error) {
      void vscode.window.showWarningMessage(`Unable to terminate daemon session: ${getErrorMessage(error)}`);
    }

    await this.refreshDaemonSessions();
  }

  private async killTerminalDaemon(): Promise<void> {
    const didShutdown = await this.backend.shutdownDaemon();
    if (!didShutdown) {
      void vscode.window.showInformationMessage('No VSmux daemon is currently running.');
    }
    await this.refreshDaemonSessions();
  }

  private async postSessionPresentationMessage(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const sessionActivityContext = this.createSessionActivityContext();
    const sidebarSession = createSidebarSessionItem({
      browserHasLiveProjection: () => false,
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (candidateSessionRecord, sessionSnapshot) =>
        getEffectiveSessionActivity(sessionActivityContext, candidateSessionRecord, sessionSnapshot),
      getSessionAgentLaunch: (candidateSessionId) => this.sessionAgentLaunchBySessionId.get(candidateSessionId),
      getSessionSnapshot: (candidateSessionId) => this.backend.getSessionSnapshot(candidateSessionId),
      getSidebarAgentIcon: (candidateSessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(candidateSessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (candidateSessionRecord) => ({
        activity: 'idle',
        detail:
          !isT3Session(candidateSessionRecord) || this.pendingT3SessionIds.has(candidateSessionRecord.sessionId)
            ? undefined
            : `Thread ${candidateSessionRecord.t3.threadId.slice(0, 8)}`,
        isRunning:
          this.pendingT3SessionIds.has(candidateSessionRecord.sessionId) ||
          this.isSessionVisibleInWorkspace(candidateSessionRecord.sessionId),
      }),
      getTerminalTitle: (candidateSessionId) => this.terminalTitleBySessionId.get(candidateSessionId),
      platform: SHORTCUT_LABEL_PLATFORM,
      sessionRecord,
      terminalHasLiveProjection: (candidateSessionId) => this.backend.hasLiveTerminal(candidateSessionId),
      workspaceId: this.workspaceId,
      workspaceSnapshot,
    });
    if (sidebarSession) {
      const previousSidebarPresentation = this.lastPostedSidebarPresentationBySessionId.get(sessionId);
      const nextSidebarPresentation = {
        activity: sidebarSession.activity,
        activityLabel: sidebarSession.activityLabel,
        primaryTitle: sidebarSession.primaryTitle,
        terminalTitle: sidebarSession.terminalTitle,
      };
      const payloadChanged =
        previousSidebarPresentation?.activity !== nextSidebarPresentation.activity ||
        previousSidebarPresentation?.activityLabel !== nextSidebarPresentation.activityLabel ||
        previousSidebarPresentation?.primaryTitle !== nextSidebarPresentation.primaryTitle ||
        previousSidebarPresentation?.terminalTitle !== nextSidebarPresentation.terminalTitle;
      logVSmuxDebug('controller.postSessionPresentationMessage.sidebar', {
        activity: sidebarSession.activity,
        activityChanged: previousSidebarPresentation?.activity !== nextSidebarPresentation.activity,
        activityLabel: sidebarSession.activityLabel,
        activityLabelChanged: previousSidebarPresentation?.activityLabel !== nextSidebarPresentation.activityLabel,
        payloadChanged,
        previousSidebarPresentation,
        primaryTitle: sidebarSession.primaryTitle,
        primaryTitleChanged: previousSidebarPresentation?.primaryTitle !== nextSidebarPresentation.primaryTitle,
        sessionId,
        terminalTitle: sidebarSession.terminalTitle,
        terminalTitleChanged: previousSidebarPresentation?.terminalTitle !== nextSidebarPresentation.terminalTitle,
      });
      if (payloadChanged) {
        this.lastPostedSidebarPresentationBySessionId.set(sessionId, nextSidebarPresentation);
        await this.sidebarProvider.postMessage({
          session: sidebarSession,
          type: 'sessionPresentationChanged',
        });
      }
    }

    if (!isTerminalSession(sessionRecord) || !this.isSessionVisibleInWorkspace(sessionId)) {
      return;
    }

    logVSmuxDebug('controller.postSessionPresentationMessage.workspace', {
      agentStatus: this.backend.getSessionSnapshot(sessionId)?.agentStatus,
      sessionId,
      terminalTitle: this.terminalTitleBySessionId.get(sessionId),
    });
    await this.workspacePanel.postMessage({
      sessionId,
      snapshot: this.backend.getSessionSnapshot(sessionId),
      terminalTitle: this.terminalTitleBySessionId.get(sessionId),
      type: 'terminalPresentationChanged',
    });
  }

  private logSessionTitleSymbols(
    sessionId: string,
    title: string | undefined,
    snapshotAgentName: string | undefined
  ): void {
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) {
      return;
    }

    const symbols = getInterestingTitleSymbols(normalizedTitle);
    if (symbols.length === 0) {
      return;
    }

    const agentHint =
      snapshotAgentName?.trim().toLowerCase() ||
      this.sessionAgentLaunchBySessionId.get(sessionId)?.agentId.trim().toLowerCase() ||
      'unknown';
    const symbolKey = `${agentHint}:${symbols.join('')}`;
    if (this.loggedTitleSymbolKeys.has(symbolKey)) {
      return;
    }

    this.loggedTitleSymbolKeys.add(symbolKey);
    logVSmuxDebug('controller.titleSymbolsObserved', {
      agentHint,
      sessionId,
      symbols,
      title: normalizedTitle,
    });
  }

  private refreshLiveBrowserTabs() {
    const browserTabs = getLiveBrowserTabs();
    this.liveBrowserTabsBySessionId.clear();
    const liveBrowserSessionIds = new Set(browserTabs.map((browserTab) => browserTab.sessionId));
    for (const browserTab of browserTabs) {
      this.liveBrowserTabsBySessionId.set(browserTab.sessionId, browserTab.tab);
      if (browserTab.detail) {
        this.browserDetailBySessionId.set(browserTab.sessionId, browserTab.detail);
      }
    }
    for (const sessionId of this.browserDetailBySessionId.keys()) {
      if (!liveBrowserSessionIds.has(sessionId)) {
        this.browserDetailBySessionId.delete(sessionId);
      }
    }

    if (!browserTabs.some((browserTab) => browserTab.isActive)) {
      this.browserEditorGroupIsMaximized = false;
    }

    return browserTabs;
  }

  private async handleBrowserTabsChanged(): Promise<void> {
    await this.refreshSidebar();
  }

  private async openDefaultBrowserUrl(): Promise<void> {
    const sidebarCommands = getSidebarCommandButtons(this.context);
    const defaultUrl = getFirstBrowserSidebarCommandUrl(sidebarCommands) ?? getDefaultBrowserLaunchUrl();
    await this.openBrowserUrl(defaultUrl);
  }

  private async openBrowserUrl(url: string): Promise<void> {
    const normalizedUrl = normalizeSidebarBrowserUrl(url);
    if (!normalizedUrl) {
      return;
    }

    const targetViewColumn = vscode.window.tabGroups.activeTabGroup?.viewColumn ?? vscode.ViewColumn.One;
    const browserTabsBeforeOpen = this.refreshLiveBrowserTabs().filter(
      (browserTab) => browserTab.viewColumn === targetViewColumn
    );
    const browserSessionIdsBeforeOpen = new Set(browserTabsBeforeOpen.map((browserTab) => browserTab.sessionId));

    await vscode.commands.executeCommand(SIMPLE_BROWSER_OPEN_COMMAND, vscode.Uri.parse(normalizedUrl), {
      viewColumn: targetViewColumn,
    });

    const browserTabsAfterOpen = this.refreshLiveBrowserTabs();
    const openedBrowserTab =
      browserTabsAfterOpen.find(
        (browserTab) =>
          browserTab.viewColumn === targetViewColumn && !browserSessionIdsBeforeOpen.has(browserTab.sessionId)
      ) ??
      browserTabsAfterOpen.find(
        (browserTab) => browserTab.viewColumn === targetViewColumn && browserTab.url === normalizedUrl
      ) ??
      browserTabsAfterOpen.find(
        (browserTab) => browserTab.viewColumn === targetViewColumn && browserTab.viewType === 'simpleBrowser.view'
      ) ??
      browserTabsAfterOpen.at(-1);

    if (!openedBrowserTab) {
      await this.refreshSidebar();
      return;
    }

    this.browserDetailBySessionId.set(openedBrowserTab.sessionId, normalizedUrl);
    await this.revealBrowserTab(openedBrowserTab.sessionId);
  }

  private async focusLiveBrowserTab(sessionId: string): Promise<void> {
    if (!(await this.revealBrowserTab(sessionId))) {
      await this.refreshSidebar();
    }
  }

  private async closeLiveBrowserTab(sessionId: string): Promise<void> {
    const browserTab =
      this.liveBrowserTabsBySessionId.get(sessionId) ??
      findLiveBrowserTabBySessionId(sessionId, this.refreshLiveBrowserTabs())?.tab;
    if (!browserTab) {
      await this.refreshSidebar();
      return;
    }

    try {
      await vscode.window.tabGroups.close(browserTab, true);
    } catch {
      // Ignore races with tabs that were already closed outside the sidebar.
    }

    await this.refreshSidebar();
  }

  private async revealBrowserTab(sessionId: string): Promise<boolean> {
    const browserTab = findLiveBrowserTabBySessionId(sessionId, this.refreshLiveBrowserTabs());
    if (!browserTab) {
      return false;
    }

    await focusEditorGroupByIndex(browserTab.viewColumn - 1);
    const refreshedBrowserTab = findLiveBrowserTabBySessionId(sessionId, this.refreshLiveBrowserTabs()) ?? browserTab;
    const tabIndex = refreshedBrowserTab.tab.group.tabs.indexOf(refreshedBrowserTab.tab);
    if (tabIndex >= 0 && tabIndex < 9) {
      await vscode.commands.executeCommand(`workbench.action.openEditorAtIndex${tabIndex + 1}`);
    }

    await this.ensureBrowserEditorGroupMaximized();
    await this.refreshSidebar();
    return true;
  }

  private async ensureBrowserEditorGroupMaximized(): Promise<void> {
    if (this.browserEditorGroupIsMaximized) {
      return;
    }

    const editorGroupCount = vscode.window.tabGroups.all.filter((group) => group.viewColumn !== undefined).length;
    if (editorGroupCount <= 1) {
      return;
    }

    await vscode.commands.executeCommand(TOGGLE_MAXIMIZE_EDITOR_GROUP_COMMAND);
    this.browserEditorGroupIsMaximized = true;
  }

  private async reconcileProjectedSessions(): Promise<void> {
    const version = ++this.reconcileRequestVersion;
    this.pendingReconcileRequest = { version };
    if (!this.reconcileRunner) {
      this.reconcileRunner = this.runReconcileLoop();
    }
    await this.reconcileRunner;
  }

  private async runReconcileLoop(): Promise<void> {
    try {
      while (this.pendingReconcileRequest) {
        const request = this.pendingReconcileRequest;
        this.pendingReconcileRequest = undefined;
        logVSmuxDebug('controller.reconcile.dequeue', {
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
        logVSmuxDebug('controller.reconcile.cancelled', {
          reason: 'superseded-before-start',
          version: requestVersion,
        });
        return;
      }
      this.syncSurfaceManagers();

      const activeSnapshot = this.getActiveSnapshot();
      const visibleSessions = activeSnapshot.visibleSessionIds
        .map((sessionId) => this.store.getSession(sessionId))
        .filter((session): session is SessionRecord => session !== undefined);
      logVSmuxDebug('controller.reconcile.start', {
        snapshot: this.describeActiveSnapshot(),
        version: requestVersion,
        visibleSessions: visibleSessions.map((sessionRecord) => ({
          kind: sessionRecord.kind,
          sessionId: sessionRecord.sessionId,
        })),
      });
      for (const sessionRecord of visibleSessions) {
        if (this.isReconcileCancelled(requestVersion)) {
          logVSmuxDebug('controller.reconcile.cancelled', {
            reason: 'superseded-before-ensure',
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          return;
        }
        if (!this.shouldEnsureSessionSurface(sessionRecord)) {
          logVSmuxDebug('controller.reconcile.skipEnsure', {
            kind: sessionRecord.kind,
            reason: 'surface-already-attached',
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          continue;
        }
        await this.createSurfaceIfNeeded(sessionRecord);
      }

      if (this.isReconcileCancelled(requestVersion)) {
        logVSmuxDebug('controller.reconcile.cancelled', {
          reason: 'superseded-before-render',
          version: requestVersion,
        });
        return;
      }

      if (!this.workspacePanel.isVisible() && visibleSessions.length > 0) {
        await this.workspacePanel.reveal();
      }
      await this.refreshWorkspacePanel();
      logVSmuxDebug('controller.reconcile.complete', {
        snapshot: this.describeActiveSnapshot(),
        version: requestVersion,
      });
    } finally {
      this.suppressedObservedFocusDepth = Math.max(0, this.suppressedObservedFocusDepth - 1);
      logVSmuxDebug('controller.reconcile.focusEventsResumed', {
        pendingReconcile: this.pendingReconcileRequest !== undefined,
        suppressedObservedFocusDepth: this.suppressedObservedFocusDepth,
      });
    }
  }

  private isReconcileCancelled(requestVersion: number): boolean {
    return requestVersion !== this.reconcileRequestVersion;
  }

  private async createSurfaceIfNeeded(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind === 'terminal') {
      await this.backend.createOrAttachSession(sessionRecord);
      return;
    }

    if (sessionRecord.kind !== 't3') {
      return;
    }

    if (this.pendingT3SessionIds.has(sessionRecord.sessionId) || isPendingT3Metadata(sessionRecord.t3)) {
      return;
    }

    await this.ensureT3Ready(sessionRecord);
  }

  private shouldEnsureSessionSurface(sessionRecord: SessionRecord): boolean {
    if (sessionRecord.kind !== 'terminal') {
      return true;
    }

    return !this.backend.hasAttachedTerminal(sessionRecord.sessionId);
  }

  private async ensureT3Ready(sessionRecord: T3SessionRecord): Promise<void> {
    const runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
    this.t3Runtime = runtime;
    await runtime.ensureRunning(sessionRecord.t3.workspaceRoot);
  }

  private async createT3Session(startupCommand: string): Promise<void> {
    const runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
    this.t3Runtime = runtime;
    const sessionRecord = await this.store.createSession({
      kind: 't3',
      t3: createPendingT3Metadata(runtime.getServerOrigin()),
      title: 'T3 Code',
    });
    if (!sessionRecord) {
      return;
    }

    this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, 't3');
    this.pendingT3SessionIds.add(sessionRecord.sessionId);
    await this.afterStateChange();
    void this.finishCreatingT3Session(sessionRecord.sessionId, startupCommand);
  }

  private async disposeSurface(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind === 'terminal') {
      await this.backend.killSession(sessionRecord.sessionId);
    }
  }

  private syncSurfaceManagers(): void {
    const sessions = this.getAllSessionRecords();
    this.backend.syncSessions(sessions);
  }

  private clearSessionPresentationState(sessionId: string): void {
    this.pendingT3SessionIds.delete(sessionId);
    this.sidebarAgentIconBySessionId.delete(sessionId);
    this.sessionAgentLaunchBySessionId.delete(sessionId);
    this.terminalTitleBySessionId.delete(sessionId);
    this.lastKnownActivityBySessionId.delete(sessionId);
    this.workingStartedAtBySessionId.delete(sessionId);
    this.clearPendingCompletionSound(sessionId);
  }

  private async deletePersistedSessionStateIfNeeded(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind !== "terminal") {
      return;
    }

    await this.backend.deletePersistedSessionState(sessionRecord.sessionId);
  }

  private createArchivedSessionEntry(sessionRecord: SessionRecord): PreviousSessionHistoryEntry | undefined {
    if (sessionRecord.kind === 't3' && isPendingT3Metadata(sessionRecord.t3)) {
      return undefined;
    }

    const group = this.store.getSessionGroup(sessionRecord.sessionId);
    if (!group) {
      return undefined;
    }

    return createPreviousSessionEntry({
      browserHasLiveProjection: () => false,
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (candidateSessionRecord, sessionSnapshot) =>
        getEffectiveSessionActivity(this.createSessionActivityContext(), candidateSessionRecord, sessionSnapshot),
      getSessionAgentLaunch: (sessionId) => this.sessionAgentLaunchBySessionId.get(sessionId),
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getSidebarAgentIcon: (sessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(sessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (candidateSessionRecord) => ({
        activity: 'idle',
        isRunning: this.isSessionVisibleInWorkspace(candidateSessionRecord.sessionId),
      }),
      getTerminalTitle: (sessionId) => this.terminalTitleBySessionId.get(sessionId),
      group,
      platform: SHORTCUT_LABEL_PLATFORM,
      sessionRecord,
      terminalHasLiveProjection: (sessionId) => this.backend.hasLiveTerminal(sessionId),
      workspaceId: this.workspaceId,
    });
  }

  private createSessionActivityContext(): Parameters<typeof getEffectiveSessionActivity>[0] {
    return {
      cancelPendingCompletionSound: (sessionId) => this.clearPendingCompletionSound(sessionId),
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getT3ActivityState: (sessionRecord) => ({
        activity: this.pendingT3SessionIds.has(sessionRecord.sessionId) ? 'working' : 'idle',
        isRunning:
          this.pendingT3SessionIds.has(sessionRecord.sessionId) ||
          this.isSessionVisibleInWorkspace(sessionRecord.sessionId),
      }),
      lastKnownActivityBySessionId: this.lastKnownActivityBySessionId,
      queueCompletionSound: (sessionId) => this.queueCompletionSound(sessionId),
      workingStartedAtBySessionId: this.workingStartedAtBySessionId,
      workspaceId: this.workspaceId,
    };
  }

  private async syncKnownSessionActivities(playSound: boolean): Promise<void> {
    await syncKnownSessionActivities(this.createSessionActivityContext(), this.getAllSessionRecords(), playSound);
  }

  private syncCompletionSoundForSession(sessionId: string): void {
    const sessionRecord = this.store.getSession(sessionId);
    const sessionSnapshot = this.backend.getSessionSnapshot(sessionId);
    const nextActivity =
      sessionRecord && sessionSnapshot
        ? getEffectiveSessionActivity(this.createSessionActivityContext(), sessionRecord, sessionSnapshot).activity
        : 'idle';
    const previousActivity = this.lastKnownActivityBySessionId.get(sessionId);
    if (nextActivity === 'attention') {
      if (previousActivity !== undefined && previousActivity !== 'attention') {
        this.queueCompletionSound(sessionId);
      }
    } else {
      this.clearPendingCompletionSound(sessionId);
    }

    this.lastKnownActivityBySessionId.set(sessionId, nextActivity);
  }

  private clearPendingCompletionSound(sessionId: string): void {
    const timeout = this.pendingCompletionSoundTimeoutBySessionId.get(sessionId);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.pendingCompletionSoundTimeoutBySessionId.delete(sessionId);
    logVSmuxDebug('controller.completionSound.cleared', {
      sessionId,
    });
  }

  private queueCompletionSound(sessionId: string): void {
    if (!this.getCompletionBellEnabled()) {
      logVSmuxDebug('controller.completionSound.skippedDisabled', {
        sessionId,
      });
      return;
    }

    if (this.pendingCompletionSoundTimeoutBySessionId.has(sessionId)) {
      logVSmuxDebug('controller.completionSound.alreadyQueued', {
        sessionId,
      });
      return;
    }

    logVSmuxDebug('controller.completionSound.queued', {
      delayMs: COMPLETION_SOUND_CONFIRMATION_DELAY_MS,
      sessionId,
      sound: getClampedCompletionSoundSetting(),
    });
    const timeout = setTimeout(() => {
      this.pendingCompletionSoundTimeoutBySessionId.delete(sessionId);
      if (!this.getCompletionBellEnabled()) {
        logVSmuxDebug('controller.completionSound.skippedDisabledAtFire', {
          sessionId,
        });
        return;
      }

      if (this.backend.getSessionSnapshot(sessionId)?.agentStatus !== 'attention') {
        logVSmuxDebug('controller.completionSound.skippedNotAttentionAtFire', {
          agentStatus: this.backend.getSessionSnapshot(sessionId)?.agentStatus,
          sessionId,
        });
        return;
      }

      logVSmuxDebug('controller.completionSound.firing', {
        sessionId,
        sound: getClampedCompletionSoundSetting(),
      });
      void this.sidebarProvider.postMessage({
        sound: getClampedCompletionSoundSetting(),
        type: 'playCompletionSound',
      });
    }, COMPLETION_SOUND_CONFIRMATION_DELAY_MS);
    this.pendingCompletionSoundTimeoutBySessionId.set(sessionId, timeout);
  }

  private getSidebarAgentIconForSession(sessionId: string): SidebarAgentIcon | undefined {
    return (
      this.sidebarAgentIconBySessionId.get(sessionId) ??
      getSidebarAgentIconById(this.backend.getSessionSnapshot(sessionId)?.agentName)
    );
  }

  private async persistSessionAgentLaunchState(): Promise<void> {
    await persistSessionAgentLaunches(this.context, this.workspaceId, this.sessionAgentLaunchBySessionId);
  }

  private async resumeDetachedTerminalSession(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind !== 'terminal') {
      return;
    }

    const action = buildDetachedResumeAction(
      this.sessionAgentLaunchBySessionId.get(sessionRecord.sessionId),
      this.getSidebarAgentIconForSession(sessionRecord.sessionId),
      sessionRecord.title,
      this.terminalTitleBySessionId.get(sessionRecord.sessionId)
    );
    if (!action) {
      return;
    }

    await this.backend.writeText(sessionRecord.sessionId, action.text, action.shouldExecute);
  }

  private async ensureShellSpawnAllowed(): Promise<boolean> {
    if (vscode.workspace.isTrusted || this.hasApprovedUntrustedShells) {
      this.hasApprovedUntrustedShells = true;
      return true;
    }

    const approval = await vscode.window.showWarningMessage(
      'VSmux is about to start a shell in an untrusted workspace.',
      {
        detail:
          'Shell sessions can run commands against files in this workspace. Trust the workspace or explicitly allow shell access to continue.',
        modal: true,
      },
      'Allow Shell Access'
    );
    if (!approval) {
      return false;
    }

    this.hasApprovedUntrustedShells = true;
    return true;
  }

  private async acknowledgeSessionAttentionIfNeeded(sessionId: string): Promise<boolean> {
    const sessionSnapshot = this.backend.getSessionSnapshot(sessionId);
    if (sessionSnapshot?.agentStatus !== 'attention') {
      return false;
    }

    const acknowledgedAttention = await this.backend.acknowledgeAttention(sessionId);
    logVSmuxDebug('controller.acknowledgeSessionAttentionIfNeeded', {
      acknowledgedAttention,
      sessionId,
    });
    return acknowledgedAttention;
  }

  private createSidebarCommandTerminal(name: string, command?: string, closeOnExit = false): vscode.Terminal {
    if (closeOnExit && command) {
      const shellPath = getDefaultShell();
      return vscode.window.createTerminal({
        cwd: getDefaultWorkspaceCwd(),
        iconPath: new vscode.ThemeIcon('terminal'),
        isTransient: true,
        location: vscode.TerminalLocation.Panel,
        name: `VSmux: ${name}`,
        shellArgs: getCommandTerminalShellArgs(shellPath, command),
        shellPath,
      });
    }

    return vscode.window.createTerminal({
      cwd: getDefaultWorkspaceCwd(),
      iconPath: new vscode.ThemeIcon('terminal'),
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
      void playCloseTerminalOnExitSound().finally(() => {
        terminal.dispose();
      });
    }, COMMAND_TERMINAL_EXIT_POLL_MS);
  }

  private getActiveSnapshot(): SessionGridSnapshot {
    return this.store.getActiveGroup()?.snapshot ?? this.getEmptySnapshot();
  }

  private getPresentedWorkspaceSnapshot(): GroupedSessionWorkspaceSnapshot {
    return cloneWorkspaceSnapshot(this.store.getSnapshot());
  }

  private getEmptySnapshot(): SessionGridSnapshot {
    return {
      focusedSessionId: undefined,
      fullscreenRestoreVisibleCount: undefined,
      sessions: [],
      viewMode: 'grid',
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
    return this.context.workspaceState.get<string>(SCRATCH_PAD_CONTENT_KEY, '') ?? '';
  }

  private async getSidebarGitHudState(): Promise<SidebarGitState> {
    const cached = this.gitHudStateCache;
    if (cached && !cached.isStale && Date.now() - cached.updatedAt < 1_500) {
      if (cached.value.isBusy === this.gitActionInProgress) {
        return this.withSidebarGitPreferences(cached.value);
      }
    }

    const nextState = await loadSidebarGitState(
      getDefaultWorkspaceCwd(),
      getPrimarySidebarGitAction(this.context, this.workspaceId),
      this.gitActionInProgress
    );
    this.gitHudStateCache = {
      isStale: false,
      updatedAt: Date.now(),
      value: nextState,
    };
    return this.withSidebarGitPreferences(nextState);
  }

  private getCachedSidebarGitHudState(): SidebarGitState {
    const cached = this.gitHudStateCache;
    if (cached) {
      if (cached.value.isBusy !== this.gitActionInProgress) {
        return this.withSidebarGitPreferences({
          ...cached.value,
          isBusy: this.gitActionInProgress,
        });
      }

      return this.withSidebarGitPreferences(cached.value);
    }

    return this.withSidebarGitPreferences(
      createDefaultSidebarGitState(getPrimarySidebarGitAction(this.context, this.workspaceId))
    );
  }

  private invalidateSidebarGitHudState(): void {
    if (this.gitHudStateCache) {
      this.gitHudStateCache = {
        ...this.gitHudStateCache,
        isStale: true,
      };
    }
  }

  private ensureSidebarGitHudStateFresh(): void {
    if (!this.shouldRefreshSidebarGitHudState() || this.gitHudRefreshPromise) {
      return;
    }

    this.gitHudRefreshPromise = this.getSidebarGitHudState()
      .then(async () => {
        await this.refreshSidebar();
      })
      .catch(() => undefined)
      .finally(() => {
        this.gitHudRefreshPromise = undefined;
      });
  }

  private shouldRefreshSidebarGitHudState(): boolean {
    const cached = this.gitHudStateCache;
    if (!cached) {
      return true;
    }

    if (cached.isStale) {
      return true;
    }

    if (Date.now() - cached.updatedAt >= 1_500) {
      return true;
    }

    return cached.value.primaryAction !== getPrimarySidebarGitAction(this.context, this.workspaceId);
  }

  private withSidebarGitPreferences(state: SidebarGitState): SidebarGitState {
    return {
      ...state,
      confirmSuggestedCommit: getSidebarGitConfirmSuggestedCommit(this.context, this.workspaceId),
    };
  }

  private getSidebarContainerId(): string {
    return this.context.globalState.get<boolean>(SIDEBAR_LOCATION_IN_SECONDARY_KEY, false)
      ? SECONDARY_SESSIONS_CONTAINER_ID
      : PRIMARY_SESSIONS_CONTAINER_ID;
  }

  private async showSidebarMoveInstructions(): Promise<void> {
    await vscode.commands.executeCommand(`workbench.view.extension.${PRIMARY_SESSIONS_CONTAINER_ID}`);
    await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
    void vscode.window.showInformationMessage('Drag the VSmux icon to the other sidebar.');
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

  private clearObservedSidebarFocusState(): void {
    return;
  }

  private enqueueWorkspaceAutoFocus(sessionId: string, source: WorkspacePanelAutoFocusRequest['source']): void {
    this.pendingWorkspaceAutoFocusRequest = {
      requestId: ++this.nextWorkspaceAutoFocusRequestId,
      sessionId,
      source,
    };
  }

  private enqueueWorkspaceAutoFocusForFocusedSession(source: WorkspacePanelAutoFocusRequest['source']): void {
    const focusedSessionId = this.getActiveSnapshot().focusedSessionId;
    if (!focusedSessionId) {
      return;
    }

    this.enqueueWorkspaceAutoFocus(focusedSessionId, source);
  }

  private consumeWorkspaceAutoFocusRequest(): WorkspacePanelAutoFocusRequest | undefined {
    const autoFocusRequest = this.pendingWorkspaceAutoFocusRequest;
    this.pendingWorkspaceAutoFocusRequest = undefined;
    return autoFocusRequest;
  }

  private async revealWorkspacePanelForSidebarFocus(source: 'sidebar' | 'workspace' | undefined): Promise<void> {
    if (source !== 'sidebar') {
      return;
    }

    await this.workspacePanel.reveal();
  }

  private async refreshWorkspacePanel(): Promise<void> {
    const startedAt = Date.now();
    const message = await this.createWorkspacePanelMessage('sessionState');
    if (message.type !== 'sessionState') {
      await this.workspacePanel.postMessage(message);
      return;
    }
    logVSmuxDebug('controller.refreshWorkspacePanel.prePostMessage', {
      activeGroupId: message.activeGroupId,
      durationMs: Date.now() - startedAt,
      focusedSessionId: message.focusedSessionId,
      paneIds: message.panes.map((pane) => `${pane.sessionId}:${pane.isVisible ? 'visible' : 'hidden'}`),
    });
    await this.workspacePanel.postMessage(message);
    logVSmuxDebug('controller.refreshWorkspacePanel.postMessageComplete', {
      durationMs: Date.now() - startedAt,
      focusedSessionId: message.focusedSessionId,
    });
  }

  private async createWorkspacePanelMessage(
    type: 'hydrate' | 'sessionState'
  ): Promise<ExtensionToWorkspacePanelMessage> {
    const workspaceSnapshot = this.store.getSnapshot();
    const activeSnapshot = this.getActiveSnapshot();
    const activeGroup = workspaceSnapshot.groups.find((group) => group.groupId === workspaceSnapshot.activeGroupId);
    const activeGroupSessions = (activeGroup?.snapshot.sessions ?? []).filter(
      (sessionRecord): sessionRecord is SessionRecord => sessionRecord !== undefined
    );
    const allTerminalSessions = workspaceSnapshot.groups.flatMap((group) =>
      group.snapshot.sessions.filter(
        (sessionRecord): sessionRecord is SessionRecord =>
          sessionRecord !== undefined && sessionRecord.kind === 'terminal'
      )
    );
    const visibleSessionIdSet = new Set(activeSnapshot.visibleSessionIds);
    const connection = {
      ...(await this.backend.getConnection()),
      workspaceId: this.workspaceId,
    };
    const autoFocusRequest = this.consumeWorkspaceAutoFocusRequest();
    const panes = (
      await Promise.all(
        [
          ...allTerminalSessions,
          ...activeGroupSessions.filter((sessionRecord) => sessionRecord.kind !== 'terminal'),
        ].map(async (sessionRecord) => {
          if (sessionRecord.kind === 'terminal') {
            return {
              kind: 'terminal' as const,
              isVisible: visibleSessionIdSet.has(sessionRecord.sessionId),
              sessionId: sessionRecord.sessionId,
              sessionRecord,
              snapshot: this.backend.getSessionSnapshot(sessionRecord.sessionId),
              terminalTitle: this.terminalTitleBySessionId.get(sessionRecord.sessionId),
            };
          }

          if (sessionRecord.kind !== 't3') {
            return undefined;
          }

          return {
            kind: 't3' as const,
            isVisible: visibleSessionIdSet.has(sessionRecord.sessionId),
            sessionId: sessionRecord.sessionId,
            sessionRecord,
            html:
              this.pendingT3SessionIds.has(sessionRecord.sessionId) ||
              isPendingT3Metadata(sessionRecord.t3)
                ? createPendingT3IframeSource(sessionRecord.title)
                : await createT3IframeSource(
                    this.context,
                    sessionRecord,
                    this.workspaceAssetServer,
                  ),
          };
        })
      )
    ).filter((pane): pane is NonNullable<typeof pane> => pane !== undefined);

    if (type === 'hydrate') {
      return {
        activeGroupId: workspaceSnapshot.activeGroupId,
        autoFocusRequest,
        connection,
        debuggingMode: getDebuggingMode(),
        focusedSessionId: activeSnapshot.focusedSessionId,
        layoutAppearance: this.getWorkspaceLayoutAppearance(),
        panes,
        terminalAppearance: this.getWorkspaceTerminalAppearance(),
        type: 'hydrate',
        viewMode: activeSnapshot.viewMode,
        visibleCount: activeSnapshot.visibleCount,
        workspaceSnapshot,
      };
    }

    return {
      activeGroupId: workspaceSnapshot.activeGroupId,
      autoFocusRequest,
      connection,
      debuggingMode: getDebuggingMode(),
      focusedSessionId: activeSnapshot.focusedSessionId,
      layoutAppearance: this.getWorkspaceLayoutAppearance(),
      panes,
      terminalAppearance: this.getWorkspaceTerminalAppearance(),
      type: 'sessionState',
      viewMode: activeSnapshot.viewMode,
      visibleCount: activeSnapshot.visibleCount,
      workspaceSnapshot,
    };
  }

  private getWorkspaceTerminalAppearance() {
    return {
      cursorBlink: getTerminalCursorBlink(),
      cursorStyle: getTerminalCursorStyle(),
      fontFamily: getTerminalFontFamily(),
      fontSize: getTerminalFontSize(),
      letterSpacing: getTerminalLetterSpacing(),
      lineHeight: getTerminalLineHeight(),
    };
  }

  private getWorkspaceLayoutAppearance() {
    return {
      activePaneBorderColor: getWorkspaceActivePaneBorderColor(),
      paneGap: getWorkspacePaneGap(),
    };
  }

  private isSessionVisibleInWorkspace(sessionId: string): boolean {
    const activeSnapshot = this.getActiveSnapshot();
    return activeSnapshot.visibleSessionIds.includes(sessionId);
  }

  private getPendingSidebarAgentIds(): string[] {
    return this.pendingT3SessionIds.size > 0 ? ['t3'] : [];
  }

  private async finishCreatingT3Session(sessionId: string, startupCommand: string): Promise<void> {
    try {
      const runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
      this.t3Runtime = runtime;
      const sessionMetadata = await runtime.createThreadSession(undefined, startupCommand, 'T3 Code');
      const sessionRecord = this.store.getSession(sessionId);
      if (!sessionRecord || sessionRecord.kind !== 't3' || !this.pendingT3SessionIds.has(sessionId)) {
        return;
      }

      this.pendingT3SessionIds.delete(sessionId);
      await this.store.setT3SessionMetadata(sessionId, sessionMetadata);
      await this.afterStateChange();
    } catch (error) {
      const hadPendingSession = this.pendingT3SessionIds.delete(sessionId);
      const sessionRecord = this.store.getSession(sessionId);
      if (hadPendingSession && sessionRecord) {
        await this.store.removeSession(sessionId);
        this.clearSessionPresentationState(sessionId);
        await this.afterStateChange();
      } else {
        await this.refreshSidebar();
        await this.refreshWorkspacePanel();
      }
      void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  private async removeStalePendingT3Sessions(): Promise<void> {
    const snapshot = this.store.getSnapshot();
    const nextGroups = snapshot.groups.map((group) => ({
      ...group,
      snapshot: {
        ...group.snapshot,
        focusedSessionId:
          group.snapshot.focusedSessionId &&
          group.snapshot.sessions.some(
            (session) =>
              session.sessionId === group.snapshot.focusedSessionId &&
              !(session.kind === 't3' && isPendingT3Metadata(session.t3))
          )
            ? group.snapshot.focusedSessionId
            : undefined,
        sessions: group.snapshot.sessions.filter(
          (session) => !(session.kind === 't3' && isPendingT3Metadata(session.t3))
        ),
        visibleSessionIds: group.snapshot.visibleSessionIds.filter((sessionId) =>
          group.snapshot.sessions.some(
            (session) => session.sessionId === sessionId && !(session.kind === 't3' && isPendingT3Metadata(session.t3))
          )
        ),
      },
    }));
    const hasChanges = nextGroups.some(
      (group, index) => group.snapshot.sessions.length !== snapshot.groups[index]?.snapshot.sessions.length
    );
    if (!hasChanges) {
      return;
    }

    await this.store.replaceSnapshot({
      ...snapshot,
      groups: nextGroups,
    });
  }

}

function createPendingT3Metadata(serverOrigin: string) {
  const pendingId = `pending-${randomUUID()}`;
  return {
    projectId: pendingId,
    serverOrigin,
    threadId: pendingId,
    workspaceRoot: getDefaultWorkspaceCwd(),
  };
}

function isPendingT3Metadata(metadata: T3SessionRecord['t3']): boolean {
  return metadata.projectId.startsWith('pending-') && metadata.threadId.startsWith('pending-');
}

function cloneWorkspaceSnapshot(snapshot: GroupedSessionWorkspaceSnapshot): GroupedSessionWorkspaceSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as GroupedSessionWorkspaceSnapshot;
}

function compareSidebarDaemonSessions(left: SidebarDaemonSessionItem, right: SidebarDaemonSessionItem): number {
  if (left.isCurrentWorkspace !== right.isCurrentWorkspace) {
    return left.isCurrentWorkspace ? -1 : 1;
  }

  const statusPriority = getSidebarDaemonStatusPriority(left.status) - getSidebarDaemonStatusPriority(right.status);
  if (statusPriority !== 0) {
    return statusPriority;
  }

  if (left.workspaceId !== right.workspaceId) {
    return left.workspaceId.localeCompare(right.workspaceId);
  }

  const startedAtComparison = right.startedAt.localeCompare(left.startedAt);
  if (startedAtComparison !== 0) {
    return startedAtComparison;
  }

  return left.sessionId.localeCompare(right.sessionId);
}

function getSidebarDaemonStatusPriority(status: SidebarDaemonSessionItem['status']): number {
  switch (status) {
    case 'running':
      return 0;
    case 'starting':
      return 1;
    case 'error':
      return 2;
    case 'disconnected':
      return 3;
    case 'exited':
      return 4;
    default:
      return 5;
  }
}

function getCommandTerminalShellArgs(shellPath: string, command: string): string[] {
  const shellName = path.basename(shellPath).toLowerCase();

  if (process.platform === 'win32') {
    if (shellName === 'cmd.exe' || shellName === 'cmd') {
      return ['/d', '/c', command];
    }

    return ['-NoLogo', '-NoProfile', '-Command', command];
  }

  return ['-l', '-c', command];
}
