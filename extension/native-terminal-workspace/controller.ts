import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import * as vscode from "vscode";
import {
  createSidebarHudState,
  getPreferredSessionTitle,
  getOrderedSessions,
  getVisibleTerminalTitle,
  isT3Session,
  isTerminalSession,
  normalizeTerminalTitle,
  resolveSidebarTheme,
  type SidebarCollapsibleSection,
  type ExtensionToSidebarMessage,
  type SessionGridDirection,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridSnapshot,
  type SessionRecord,
  type SidebarDaemonSessionItem,
  type SidebarT3SessionItem,
  type SessionGroupRecord,
  type SidebarHydrateMessage,
  type SidebarOrderSyncKind,
  type SidebarSessionItem,
  type SidebarSessionStateMessage,
  type SidebarToExtensionMessage,
  type TerminalEngine,
  type TerminalViewMode,
  type T3SessionRecord,
  type VisibleSessionCount,
} from "../../shared/session-grid-contract";
import { getDisplaySessionIdsInOrder } from "../../shared/active-sessions-sort";
import { getSidebarAgentIconById, type SidebarAgentIcon } from "../../shared/sidebar-agents";
import type { SidebarCommandIcon } from "../../shared/sidebar-command-icons";
import type { GitTextGenerationSettings } from "../../shared/git-text-generation-provider";
import {
  createDefaultSidebarGitState,
  resolveSidebarGitPrimaryActionState,
  type SidebarGitAction,
  type SidebarGitState,
} from "../../shared/sidebar-git";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelAutoFocusRequest,
} from "../../shared/workspace-panel-contract";
import {
  prepareSidebarGitCommit,
  runSidebarGitActionWorkflow,
  type PreparedSidebarGitCommit,
} from "../git/actions";
import { getGitStatusDetails, loadSidebarGitState } from "../git/status";
import {
  getGitTextGenerationSettings,
  hasConfiguredGitTextGenerationProvider,
} from "../git-text-generation-preferences";
import {
  buildSidebarMessage,
  createSidebarSessionItem,
  createPreviousSessionEntry,
} from "../native-terminal-workspace-sidebar-state";
import { getInterestingTitleSymbols } from "../session-title-activity";
import {
  getEffectiveSessionActivity,
  getDisplayedLastInteractionIso,
  INITIAL_ACTIVITY_SUPPRESSION_MS,
  shouldRecordLastActivityTransition,
  syncKnownSessionActivities,
} from "./activity";
import {
  resolveT3SessionLifecycleState,
  resolveTerminalSessionLifecycleState,
} from "./session-indicator-state";
import { createGroupFocusPlan } from "./group-focus";
import { shouldPreserveLastActivityForTerminalWrite } from "./last-activity-control-command";
import { createSessionFocusPlan } from "./session-focus";
import { createSessionRenamePlan } from "./session-rename";
import {
  PreviousSessionHistory,
  type PreviousSessionHistoryEntry,
} from "../previous-session-history";
import {
  deleteSidebarAgentPreference,
  getSidebarAgentButtonById,
  getSidebarAgentButtons,
  saveSidebarAgentPreference,
  syncSidebarAgentOrderPreference,
} from "../sidebar-agent-preferences";
import { getSidebarPinnedPrompts, saveSidebarPinnedPrompt } from "../sidebar-pinned-prompts";
import {
  deleteSidebarCommandPreference,
  getSidebarCommandButtonById,
  getSidebarCommandButtons,
  migrateSidebarCommandPreferences,
  saveSidebarCommandPreference,
  syncSidebarCommandOrderPreference,
} from "../sidebar-command-preferences";
import {
  getFirstBrowserSidebarCommandUrl,
  type SidebarCommandRunMode,
} from "../../shared/sidebar-commands";
import { logAgentTilerFocusTrace } from "../agent-tiler-focus-trace-log";
import { SessionGridStore } from "../session-grid-store";
import { SessionSidebarViewProvider } from "../session-sidebar-view";
import {
  getDefaultShell,
  getDefaultWorkspaceCwd,
  getErrorMessage,
  getWorkspaceId,
  focusEditorGroupByIndex,
} from "../terminal-workspace-environment";
import { T3RuntimeManager } from "../t3-runtime-manager";
import { T3ActivityMonitor } from "../t3-activity-monitor";
import {
  disposeVSmuxDebugLog,
  logVSmuxDebug,
  logVSmuxReproTrace,
  resetVSmuxDebugLog,
} from "../vsmux-debug-log";
import {
  findLiveBrowserTabBySessionId,
  getLiveBrowserTabs,
  isBrowserSidebarSessionId,
  normalizeSidebarBrowserUrl,
} from "../live-browser-tabs";
import { renderFindPreviousSessionPrompt } from "../find-previous-session-prompt";
import {
  writeCodexWelcomeStatusLine,
  writeCodexWelcomeTerminalTitle,
} from "../codex-terminal-title-config";
import { dispatchSidebarMessage } from "./sidebar-message-dispatch";
import { getVscodeWorkspaceLogLabel } from "../../shared/vscode-workspace-log-context";
import {
  shouldSkipSessionForGroupFullReload,
  shouldSkipSessionForIndicatorProtectedGroupAction,
} from "./full-reload";
import { finalizeRestoredPreviousSession } from "./restore-previous-session";
import {
  getWorkspacePaneSessionRecords,
  sortWorkspacePaneSessionRecords,
} from "./workspace-pane-session-projection";
import {
  resolveSessionRenameTitle,
  shouldSummarizeSessionRenameTitle,
} from "./session-title-generation";
import {
  isDefaultT3SessionTitle,
  shouldAutoPersistT3SessionTitle,
  shouldResetAutoPersistedT3SessionTitle,
} from "./t3-session-title-sync";
import {
  deleteWorkspacePaneOrderPreference,
  getWorkspacePaneOrderPreference,
  syncWorkspacePaneOrderPreference,
} from "./workspace-pane-order-preferences";
import {
  buildCopyResumeCommandText,
  buildDetachedResumeAction,
  buildForkAgentCommand,
  buildProgrammaticResumeAction,
  type DetachedResumeAction,
  loadStoredSessionAgentLaunches,
  persistSessionAgentLaunches,
  type ProgrammaticTerminalResumeAction,
  type StoredSessionAgentLaunch,
} from "../native-terminal-workspace-session-agent-launch";
import {
  getSidebarCommandTerminalRunPlan,
  getSidebarCommandWorkspaceSessionTitle,
} from "../sidebar-command-run-plan";
import { quoteShellLiteral } from "../agent-shell-integration-utils";
import type { ChatHistoryResumeRequest } from "../chat-history-vsmux-bridge";
import {
  getPrimarySidebarGitAction,
  getSidebarGitConfirmSuggestedCommit,
  getSidebarGitGenerateCommitBody,
  savePrimarySidebarGitAction,
  saveSidebarGitConfirmSuggestedCommit,
  saveSidebarGitGenerateCommitBody,
} from "../sidebar-git-preferences";
import {
  getSidebarSectionCollapseState,
  saveSidebarSectionCollapsed,
} from "../sidebar-section-preferences";
import {
  getSidebarActiveSessionsSortMode,
  saveSidebarActiveSessionsSortMode,
} from "../sidebar-active-sessions-sort-preferences";
import {
  COMPLETION_BELL_ENABLED_KEY,
  PRIMARY_SESSIONS_CONTAINER_ID,
  SCRATCH_PAD_CONTENT_KEY,
  SECONDARY_SESSIONS_CONTAINER_ID,
  SIDEBAR_LOCATION_IN_SECONDARY_KEY,
  getClampedActionCompletionSoundSetting,
  getClampedAgentManagerZoomPercent,
  getClampedCompletionSoundSetting,
  getClampedSidebarThemeSetting,
  getCreateSessionOnSidebarDoubleClick,
  getDefaultBrowserLaunchUrl,
  getDefaultTerminalEngine,
  getDebuggingMode,
  getFindPreviousSessionAgentId,
  getFindPreviousSessionPromptTemplate,
  getShowCloseButtonOnSessionCards,
  getShowLastInteractionTimeOnSessionCards,
  getShowSidebarActions,
  getShowSidebarAgents,
  getShowSidebarBrowsers,
  getShowSidebarGitButton,
  getShowHotkeysOnSessionCards,
  getSidebarThemeVariant,
  getWorkspaceActivePaneBorderColor,
  getWorkspacePaneGap,
  getTerminalCursorBlink,
  getTerminalScrollToBottomWhenTyping,
  getTerminalCursorStyle,
  getTerminalFontFamily,
  getTerminalFontSize,
  getTerminalFontWeight,
  getTerminalLetterSpacing,
  getTerminalLineHeight,
  getT3ZoomPercent,
  resetT3ZoomPercent,
  resetTerminalFontSize,
  setShowLastInteractionTimeOnSessionCards,
  setT3ZoomPercent,
  setTerminalFontSize,
  getXtermFrontendScrollback,
} from "./settings";
import { DaemonTerminalWorkspaceBackend } from "../daemon-terminal-workspace-backend";
import { WorkspacePanelManager } from "../workspace-panel";
import { WorkspaceAssetServer } from "../workspace-asset-server";
import { resolveT3BrowserAccessLink } from "../t3-browser-access";
import {
  readSharedT3BrowserAccessState,
  writeSharedT3BrowserAccessState,
} from "../t3-browser-access-state";
import {
  createPendingT3IframeSource,
  createT3BrowserAccessSource,
  createT3IframeSource,
} from "../t3-webview-manager/html";
import { playCloseTerminalOnExitSound } from "../terminal-exit-sound";
import {
  AgentManagerXBridgeClient,
  type AgentManagerXWorkspaceSession,
  type AgentManagerXWorkspaceSnapshotMessage,
} from "../agent-manager-x-bridge";
import type { TerminalAgentStatus } from "../../shared/terminal-host-protocol";

const SHORTCUT_LABEL_PLATFORM = process.platform === "darwin" ? "mac" : "default";
const COMMAND_TERMINAL_EXIT_POLL_MS = 250;
const COMPLETION_SOUND_CONFIRMATION_DELAY_MS = 1_000;
const FORK_RENAME_DELAY_MS = 4_000;
const WORKSPACE_RENAME_TOAST_DURATION_MS = 3_000;
const SIMPLE_BROWSER_OPEN_COMMAND = "simpleBrowser.api.open";
const TOGGLE_MAXIMIZE_EDITOR_GROUP_COMMAND = "workbench.action.toggleMaximizeEditorGroup";
const FULL_RELOAD_SUPPORTED_AGENTS_LABEL = "Codex, Claude, and OpenCode";
const SIDEBAR_ORDER_REPRO_TAG = "SIDEBAR_ORDER_REPRO";
const MAX_NATIVE_CLIPBOARD_OUTPUT_BYTES = 64 * 1024 * 1024;
const execFileAsync = promisify(execFile);

export { SESSIONS_VIEW_ID } from "./settings";

export type NativeTerminalWorkspaceDebugState = {
  backend: "native";
  platform: NodeJS.Platform;
  terminalUiPath: string;
};

type SidebarCommandTerminalOptions = {
  closeOnExit?: boolean;
  command?: string;
  location?: vscode.TerminalLocation | vscode.TerminalEditorLocationOptions;
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
  private readonly terminalPaneRenderNonceBySessionId = new Map<string, number>();
  private readonly lastPostedSidebarPresentationBySessionId = new Map<
    string,
    {
      activity: string;
      activityLabel: string | undefined;
      lifecycleState: string | undefined;
      isPrimaryTitleTerminalTitle: boolean | undefined;
      lastInteractionAt: string | undefined;
      primaryTitle: string | undefined;
      terminalTitle: string | undefined;
    }
  >();
  private readonly lastKnownActivityBySessionId = new Map<
    string,
    "idle" | "working" | "attention"
  >();
  private readonly activitySuppressedUntilBySessionId = new Map<string, number>();
  private readonly frozenLastActivityAtBySessionId = new Map<string, number | null>();
  private readonly lastActivityIgnoreUntilBySessionId = new Map<string, number>();
  private readonly lastActivityOverrideAtBySessionId = new Map<string, number>();
  private readonly workingStartedAtBySessionId = new Map<string, number>();
  private readonly pendingCompletionSoundTimeoutBySessionId = new Map<string, NodeJS.Timeout>();
  private readonly pendingForkRenameTimeoutBySessionId = new Map<string, NodeJS.Timeout>();
  private readonly loggedTitleSymbolKeys = new Set<string>();
  private readonly pendingT3SessionIds = new Set<string>();
  private readonly t3PaneHtmlBySessionId = new Map<string, { cacheKey: string; html: string }>();
  private readonly t3PaneRenderNonceBySessionId = new Map<string, number>();
  private readonly t3ActivityMonitor: T3ActivityMonitor;
  private readonly agentManagerXBridge: AgentManagerXBridgeClient;
  private hasCompletedInitialActivityHydration = false;
  private nextSidebarRevision = 0;
  private nextWorkspaceAutoFocusRequestId = 0;
  private nextWorkspaceScrollToBottomRequestId = 0;
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
  private gitHudStateCache:
    | { isStale: boolean; updatedAt: number; value: SidebarGitState }
    | undefined;
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
    this.t3ActivityMonitor = new T3ActivityMonitor({
      getWebSocketUrl: () => this.getOrCreateT3Runtime().createAuthenticatedWebSocketUrl(),
    });
    this.agentManagerXBridge = new AgentManagerXBridgeClient({
      onCloseSession: async (sessionId) => this.closeSessionFromAgentManagerX(sessionId),
      onFocusSession: async (sessionId) => this.focusSessionFromAgentManagerX(sessionId),
      onLog: (event, details) => {
        logVSmuxDebug(event, details);
      },
    });
    this.workspaceAssetServer = new WorkspaceAssetServer(context);
    this.workspaceAssetServer.setT3BrowserAccessDocumentResolver(async (input) =>
      this.createT3BrowserAccessDocument(input.requestOrigin, input.sessionId),
    );
    void this.enableAlwaysOnT3BrowserAccess();
    this.workspacePanel = new WorkspacePanelManager({
      context,
      onMessage: async (message) => {
        if (message.type === "reloadWorkspacePanel") {
          const sessionRecord = message.sessionId
            ? this.store.getSession(message.sessionId)
            : undefined;
          if (sessionRecord && isT3Session(sessionRecord)) {
            logVSmuxDebug("controller.reloadWorkspacePanel.ignored", {
              reason: "t3LagReloadBlocked",
              sessionId: message.sessionId,
              threadId: sessionRecord.t3.threadId,
            });
            return;
          }

          await this.reloadWorkspacePanel("webview-lag-notice", message.sessionId);
          return;
        }

        if (message.type === "reloadT3Session") {
          await this.reloadT3Session(message.sessionId, "workspace-refresh-button");
          return;
        }

        if (message.type === "resolveClipboardImagePath") {
          await this.resolveWorkspaceClipboardImagePath(message);
          return;
        }

        if (message.type === "readNativeClipboardPayload") {
          await this.readWorkspaceNativeClipboardPayload(message);
          return;
        }

        if (message.type === "t3ThreadChanged") {
          await this.handleWorkspaceT3ThreadChanged(
            message.sessionId,
            message.threadId,
            message.title,
          );
          return;
        }

        if (message.type === "applyCodexTerminalTitle") {
          await this.applyCodexTerminalTitleFromWelcome();
          return;
        }

        if (message.type === "applyCodexStatusLine") {
          await this.applyCodexStatusLineFromWelcome();
          return;
        }

        if (message.type === "workspaceDebugLog") {
          const event = `workspace.webview.${message.event}`;
          logVSmuxDebug(event, message.details);
          if (message.event.startsWith("repro.")) {
            logVSmuxReproTrace(event, message.details);
          }
          return;
        }

        if (message.type === "focusSession") {
          await this.focusSession(message.sessionId, "workspace");
          return;
        }

        if (message.type === "closeSession") {
          await this.closeSession(message.sessionId);
          return;
        }

        if (message.type === "fullReloadSession") {
          await this.fullReloadSession(message.sessionId);
          return;
        }

        if (message.type === "promptRenameSession") {
          await this.promptRenameSession(message.sessionId);
          return;
        }

        if (message.type === "adjustTerminalFontSize") {
          await this.adjustTerminalFontSize(message.delta);
          return;
        }

        if (message.type === "resetTerminalFontSize") {
          await this.resetTerminalFontSize();
          return;
        }

        if (message.type === "adjustT3ZoomPercent") {
          await this.adjustT3ZoomPercent(message.delta);
          return;
        }

        if (message.type === "resetT3ZoomPercent") {
          await this.resetT3ZoomPercent();
          return;
        }

        if (message.type === "forkSession") {
          await this.forkSession(message.sessionId);
          return;
        }

        if (message.type === "setSessionSleeping") {
          await this.setSessionSleeping(message.sessionId, message.sleeping);
          return;
        }

        if (message.type === "syncPaneOrder" || message.type === "syncSessionOrder") {
          await this.syncWorkspacePaneOrder(message.groupId, message.sessionIds);
        }
      },
    });
    this.sidebarProvider = new SessionSidebarViewProvider({
      onMessage: async (message) => this.handleSidebarMessage(message),
    });

    this.disposables.push(
      this.backend,
      this.t3ActivityMonitor,
      this.agentManagerXBridge,
      this.workspaceAssetServer,
      this.workspacePanel,
      this.sidebarProvider,
      this.backend.onDidChangeSessions(() => {
        void (async () => {
          await this.syncKnownSessionActivities(false);
          await this.refreshSidebar();
        })();
      }),
      this.backend.onDidChangeSessionActivity(({ didComplete, sessionId }) => {
        this.syncSessionActivityState(sessionId, didComplete === true);
        void this.postSessionPresentationMessage(sessionId);
      }),
      this.backend.onDidChangeSessionPresentation(({ sessionId, title }) => {
        const snapshot = this.backend.getSessionSnapshot(sessionId);
        this.syncSessionActivityState(sessionId, true);
        this.logSessionTitleSymbols(sessionId, title ?? snapshot?.title, snapshot?.agentName);
        logVSmuxDebug("controller.sessionPresentationChanged", {
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
      this.t3ActivityMonitor.onDidChange(() => {
        void (async () => {
          logVSmuxDebug("controller.t3ActivityMonitor.changed");
          const titlesChanged = await this.syncT3SessionTitlesFromMonitor();
          this.recordT3LastActivityTransitions();
          logVSmuxDebug("controller.t3ActivityMonitor.afterTitleSync", {
            titlesChanged,
            trackedSessions: this.getAllSessionRecords().flatMap((sessionRecord) => {
              if (!isT3Session(sessionRecord) || isPendingT3Metadata(sessionRecord.t3)) {
                return [];
              }

              return [
                {
                  activity: this.t3ActivityMonitor.getThreadActivity(sessionRecord.t3.threadId)
                    ?.activity,
                  liveTitle: this.terminalTitleBySessionId.get(sessionRecord.sessionId),
                  sessionId: sessionRecord.sessionId,
                  storedTitle: sessionRecord.title,
                  threadId: sessionRecord.t3.threadId,
                  threadTitle: this.t3ActivityMonitor.getThreadTitle(sessionRecord.t3.threadId),
                },
              ];
            }),
          });
          await this.syncKnownSessionActivities(true);
          if (titlesChanged) {
            logVSmuxDebug("controller.t3ActivityMonitor.titlesChanged");
          }
          await this.refreshSidebar();
          await this.refreshWorkspacePanel();
        })();
      }),
      vscode.workspace.onDidChangeConfiguration(() => {
        void this.backend.syncConfiguration();
        this.invalidateSidebarGitHudState();
        void this.refreshWorkspacePanel();
        void this.refreshSidebar("hydrate");
      }),
      vscode.window.onDidChangeActiveColorTheme(() => {
        void this.refreshSidebar("hydrate");
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => {
        void this.handleBrowserTabsChanged();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        void this.handleBrowserTabsChanged();
      }),
    );
  }

  private async enableAlwaysOnT3BrowserAccess(): Promise<void> {
    try {
      await this.workspaceAssetServer.ensureT3BrowserAccessListening();
    } catch (error) {
      logVSmuxDebug("controller.t3BrowserAccess.autostartFailed", {
        error: getErrorMessage(error),
      });
    }
  }

  public async initialize(): Promise<void> {
    await migrateSidebarCommandPreferences(this.context);
    await this.removeStalePendingT3Sessions();
    resetVSmuxDebugLog();
    logVSmuxDebug("controller.initialize", {
      activeGroupId: this.store.getSnapshot().activeGroupId,
      extensionHostPid: process.pid,
      sessionCount: this.getAllSessionRecords().length,
    });
    await this.backend.initialize(this.getAllSessionRecords());
    await this.syncT3ActivityMonitor();
    await this.syncKnownSessionActivities(false);
    this.hasCompletedInitialActivityHydration = true;
    this.syncSurfaceManagers();
    await this.reconcileProjectedSessions();
    await this.refreshSidebar("hydrate");
    await this.publishAgentManagerXSnapshot();
  }

  public dispose(): void {
    for (const timeout of this.pendingCompletionSoundTimeoutBySessionId.values()) {
      clearTimeout(timeout);
    }
    this.pendingCompletionSoundTimeoutBySessionId.clear();
    for (const timeout of this.pendingForkRenameTimeoutBySessionId.values()) {
      clearTimeout(timeout);
    }
    this.pendingForkRenameTimeoutBySessionId.clear();
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
      terminalUiPath: "Ghostty workspace webview",
    };
  }

  public async openWorkspace(): Promise<void> {
    await this.revealSidebar();
    if (this.getAllSessionRecords().length === 0) {
      await this.createSession();
      await this.workspacePanel.reveal();
      return;
    }

    await this.refreshWorkspacePanel();
    await this.workspacePanel.reveal();
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

  public async createSession(): Promise<void> {
    const sessionRecord = await this.createTerminalSession();
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

  public async focusSession(sessionId: string, source?: "sidebar" | "workspace"): Promise<void> {
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
    logVSmuxDebug("controller.focusSession", {
      focusRequestId,
      sessionId,
      sessionKind: sessionRecord.kind,
      source,
      startedAt: focusStartedAt,
    });
    logVSmuxReproTrace("repro.controller.focusSession.start", {
      focusRequestId,
      previouslyFocusedSessionId: this.store.getActiveGroup()?.snapshot.focusedSessionId,
      sessionId,
      sessionKind: sessionRecord.kind,
      source,
      startedAt: focusStartedAt,
    });
    logAgentTilerFocusTrace("controller.focusSession.request", {
      activeGroup: this.describeFocusTraceGroup(this.store.getActiveGroup()),
      focusRequestId,
      requestedSessionId: sessionId,
      source,
      targetGroup: this.describeFocusTraceGroup(this.store.getSessionGroup(sessionId)),
    });
    const shouldReattachDetachedTerminal =
      source === "sidebar" &&
      sessionRecord.kind === "terminal" &&
      !this.backend.hasAttachedTerminal(sessionRecord.sessionId);
    let terminalSurfaceEnsureResult: TerminalSurfaceEnsureResult = "non-terminal";
    const acknowledgedAttention = await this.acknowledgeSessionAttentionIfNeeded(sessionRecord);
    logVSmuxDebug("controller.focusSession.afterAcknowledge", {
      acknowledgedAttention,
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      sessionId,
    });
    const changed = await this.store.focusSession(sessionId);
    logVSmuxDebug("controller.focusSession.afterStoreFocus", {
      changed,
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      sessionId,
      snapshot: this.describeActiveSnapshot(),
    });
    logVSmuxReproTrace("repro.controller.focusSession.afterStoreFocus", {
      activeGroupId: this.store.getSnapshot().activeGroupId,
      changed,
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      focusedSessionId: this.store.getActiveGroup()?.snapshot.focusedSessionId,
      sessionId,
    });
    logAgentTilerFocusTrace("controller.focusSession.afterStoreFocus", {
      activeGroup: this.describeFocusTraceGroup(this.store.getActiveGroup()),
      changed,
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      requestedSessionId: sessionId,
      source,
      targetGroup: this.describeFocusTraceGroup(this.store.getSessionGroup(sessionId)),
    });
    if (source === "sidebar") {
      this.enqueueWorkspaceAutoFocus(sessionId, "sidebar");
    }
    if (shouldReattachDetachedTerminal) {
      terminalSurfaceEnsureResult = await this.createSurfaceIfNeeded(sessionRecord);
    }
    if (shouldReattachDetachedTerminal && terminalSurfaceEnsureResult === "created-terminal") {
      logVSmuxDebug("controller.focusSession.explicitTerminalCreateOrAttach", {
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
        shouldResumeDeadTerminal: true,
        source,
      });
    } else if (
      shouldReattachDetachedTerminal &&
      terminalSurfaceEnsureResult === "existing-live-terminal"
    ) {
      logVSmuxDebug("controller.focusSession.skipExplicitCreateOrAttachForLiveTerminal", {
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
        source,
      });
    }
    const isVisiblePresentationFocus =
      this.isSessionVisibleInWorkspace(sessionId) && !shouldReattachDetachedTerminal;
    const sidebarRefreshPromise =
      changed || acknowledgedAttention
        ? this.refreshSidebarFromCurrentState().then(() => {
            logVSmuxDebug("controller.focusSession.afterSidebarRefresh", {
              durationMs: Date.now() - focusStartedAt,
              focusRequestId,
              sessionId,
            });
          })
        : undefined;
    if (isVisiblePresentationFocus) {
      if (changed || acknowledgedAttention) {
        await this.refreshWorkspacePanel();
        logVSmuxDebug("controller.focusSession.afterImmediateWorkspaceRefresh", {
          durationMs: Date.now() - focusStartedAt,
          focusRequestId,
          sessionId,
        });
      }
      await this.revealWorkspacePanelForSidebarFocus(source);
      logVSmuxDebug("controller.focusSession.visiblePresentation", {
        acknowledgedAttention,
        changed,
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
        source,
      });
      logVSmuxReproTrace("repro.controller.focusSession.visiblePresentation", {
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
        logVSmuxDebug("controller.focusSession.afterStateChangeNoChangePath", {
          durationMs: Date.now() - focusStartedAt,
          focusRequestId,
          sessionId,
        });
        if (
          terminalSurfaceEnsureResult === "created-terminal" &&
          this.canResumeDetachedTerminalSession(sessionRecord)
        ) {
          await this.resumeDetachedTerminalSession(sessionRecord);
          logVSmuxDebug("controller.focusSession.afterResumeDetachedTerminal", {
            durationMs: Date.now() - focusStartedAt,
            focusRequestId,
            sessionId,
          });
        }
      }
      await this.revealWorkspacePanelForSidebarFocus(source);
      logVSmuxDebug("controller.focusSession.noChange", {
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
      });
      logVSmuxReproTrace("repro.controller.focusSession.noChange", {
        durationMs: Date.now() - focusStartedAt,
        focusRequestId,
        sessionId,
        source,
      });
      return;
    }

    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
    logVSmuxDebug("controller.focusSession.afterStateChange", {
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      sessionId,
    });
    logVSmuxReproTrace("repro.controller.focusSession.afterStateChange", {
      durationMs: Date.now() - focusStartedAt,
      focusRequestId,
      focusedSessionId: this.store.getActiveGroup()?.snapshot.focusedSessionId,
      sessionId,
      source,
    });
    if (
      terminalSurfaceEnsureResult === "created-terminal" &&
      this.canResumeDetachedTerminalSession(sessionRecord)
    ) {
      await this.resumeDetachedTerminalSession(sessionRecord);
      logVSmuxDebug("controller.focusSession.afterResumeDetachedTerminal", {
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

    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const sessionActivityContext = this.createSessionActivityContext();
    const session = this.getSidebarOrderedWorkspaceSessions(
      workspaceSnapshot,
      sessionActivityContext,
    ).at(targetIndex);
    if (session) {
      await this.focusSession(session.sessionId);
    }
  }

  public async focusAdjacentSidebarSession(direction: -1 | 1): Promise<void> {
    const orderedSessionIds = this.getSidebarOrderedSessionIds();
    if (orderedSessionIds.length === 0) {
      return;
    }

    const currentSessionId = this.getFocusedSidebarSessionId();
    const currentIndex = currentSessionId ? orderedSessionIds.indexOf(currentSessionId) : -1;
    const targetIndex =
      currentIndex < 0
        ? direction > 0
          ? 0
          : orderedSessionIds.length - 1
        : (currentIndex + direction + orderedSessionIds.length) % orderedSessionIds.length;
    const targetSessionId = orderedSessionIds[targetIndex];
    if (targetSessionId) {
      await this.focusSession(targetSessionId, "sidebar");
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
      if (sessionRecord.kind === "terminal") {
        this.retireTerminalPaneRuntimeGeneration(sessionRecord.sessionId);
      }
      await this.destroyWorkspaceTerminalRuntimeIfNeeded(sessionRecord);
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

    if (sessionRecord.kind === "terminal") {
      const restartedSessionRecord = await this.prepareSessionForTerminalRecreate(sessionRecord);
      await this.backend.restartSession(restartedSessionRecord);
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
    const sessionRecord = this.store.getSession(sessionId);
    const renamePlan = sessionRecord
      ? createSessionRenamePlan(sessionRecord, this.getActiveSnapshot().focusedSessionId)
      : undefined;
    const changed = await this.store.setSessionTitle(sessionId, title);

    const renamedSessionRecord = this.store.getSession(sessionId);
    if (renamedSessionRecord?.kind === "terminal") {
      await this.backend.renameSession(renamedSessionRecord);
      const normalizedRenameTitle =
        normalizeTerminalTitle(renamedSessionRecord.title) ?? renamedSessionRecord.title.trim();
      await this.writeTerminalTextPreservingLastActivity(
        sessionId,
        `/rename ${normalizedRenameTitle}`,
        false,
      );
      if (sessionId === this.getActiveSnapshot().focusedSessionId) {
        await this.requestWorkspaceTerminalScrollToBottom(sessionId);
      }
      await this.workspacePanel.postMessage({
        confirmOnTerminalEnterSessionId: sessionId,
        confirmedMessage: "Thread name synced into Agent CLI.",
        confirmedTitle: "Thread renamed",
        expiresAt: Date.now() + WORKSPACE_RENAME_TOAST_DURATION_MS,
        message: "Hit enter to sync the name into Agent CLI",
        title: "Name staged in terminal",
        type: "showToast",
      });
    }

    if (renamePlan?.shouldFocusRenamedSession) {
      await this.focusSession(sessionId, "sidebar");
      if (renamePlan.shouldScrollRenamedSessionToBottom) {
        await this.requestWorkspaceTerminalScrollToBottom(sessionId);
      }
      return;
    }

    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async renameSessionFromUserInput(sessionId: string, title: string): Promise<void> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const shouldAutoName = shouldSummarizeSessionRenameTitle(trimmedTitle);
    let resolvedTitle = trimmedTitle;
    if (shouldAutoName) {
      const generator = getGitTextGenerationSettings();
      if (!hasConfiguredGitTextGenerationProvider(generator)) {
        void vscode.window.showErrorMessage(
          "Git text generation is set to custom, but VSmux.gitTextGenerationCustomCommand is empty.",
        );
        return;
      }

      try {
        resolvedTitle = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "VSmux",
          },
          async (progress) => {
            progress.report({ message: "Generating session name..." });
            return resolveSessionRenameTitle({
              cwd: getDefaultWorkspaceCwd(),
              settings: generator,
              title: trimmedTitle,
            });
          },
        );
      } catch (error) {
        void vscode.window.showErrorMessage(getErrorMessage(error));
        return;
      }
    }

    await this.renameSession(sessionId, resolvedTitle);
  }

  public async promptRenameSession(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    const nextTitle = await vscode.window.showInputBox({
      prompt: "Rename session - Paste text over 50 char to auto-generate a name",
      value:
        getPreferredSessionTitle(
          sessionRecord.title,
          this.terminalTitleBySessionId.get(sessionId),
        ) ?? sessionRecord.title,
    });
    if (nextTitle) {
      await this.renameSessionFromUserInput(sessionId, nextTitle);
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
    if (sessionRecord.kind === "terminal") {
      this.retireTerminalPaneRuntimeGeneration(sessionId);
    }
    await this.destroyWorkspaceTerminalRuntimeIfNeeded(sessionRecord);
    await this.deletePersistedSessionStateIfNeeded(sessionRecord);
    this.clearSessionPresentationState(sessionId);
    if (archivedSession) {
      await this.previousSessionHistory.append([archivedSession]);
    }
    await this.persistSessionAgentLaunchState();
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
  }

  public async setSessionSleeping(sessionId: string, sleeping: boolean): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind === "browser") {
      return;
    }

    const changed = await this.store.setSessionSleeping(sessionId, sleeping);
    if (!changed) {
      return;
    }

    if (sleeping) {
      await this.disposeSleepingSessionSurface(sessionRecord);
      await this.refreshSidebarFromCurrentState();
      await this.afterStateChange({ sidebarAlreadyRefreshed: true });
      return;
    }

    await this.afterStateChange();
  }

  public async setSessionFavorite(sessionId: string, favorite: boolean): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind === "browser") {
      return;
    }

    const changed = await this.store.setSessionFavorite(sessionId, favorite);
    if (!changed) {
      return;
    }

    await this.refreshSidebarFromCurrentState();
  }

  public async setGroupSleeping(groupId: string, sleeping: boolean): Promise<void> {
    const group = this.store.getGroup(groupId);
    if (!group) {
      return;
    }

    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const sessionActivityContext = this.createSessionActivityContext();
    const sessionsToSleep = sleeping
      ? group.snapshot.sessions.filter(
          (sessionRecord) =>
            sessionRecord.kind !== "browser" &&
            sessionRecord.isSleeping !== true &&
            !shouldSkipSessionForIndicatorProtectedGroupAction(
              this.createSidebarSessionItem(
                sessionRecord,
                workspaceSnapshot,
                sessionActivityContext,
              ) ?? {
                activity: "idle",
              },
            ),
        )
      : [];
    const changed = await this.store.setGroupSleeping(
      groupId,
      sleeping,
      sleeping ? sessionsToSleep.map((sessionRecord) => sessionRecord.sessionId) : undefined,
    );
    if (!changed) {
      return;
    }

    if (sleeping) {
      for (const sessionRecord of sessionsToSleep) {
        await this.disposeSleepingSessionSurface(sessionRecord);
      }
      await this.refreshSidebarFromCurrentState();
      await this.afterStateChange({ sidebarAlreadyRefreshed: true });
      return;
    }

    await this.afterStateChange();
  }

  public async copyResumeCommand(sessionId?: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind !== "terminal") {
      return;
    }

    const commandText = buildCopyResumeCommandText(
      this.sessionAgentLaunchBySessionId.get(sessionId),
      this.getSidebarAgentIconForSession(sessionId),
      sessionRecord.title,
      this.terminalTitleBySessionId.get(sessionId),
    );
    if (!commandText) {
      void vscode.window.showInformationMessage("No resume command is available for this session.");
      return;
    }

    await vscode.env.clipboard.writeText(commandText);
  }

  public async forkSession(sessionId?: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    const sourceGroup = this.store.getSessionGroup(sessionId);
    if (!sessionRecord || sessionRecord.kind !== "terminal" || !sourceGroup) {
      return;
    }

    const terminalTitle = this.terminalTitleBySessionId.get(sessionId);
    const sourceTitle = normalizeTerminalTitle(
      getPreferredSessionTitle(sessionRecord.title, terminalTitle),
    )
      ?.replace(/\s+/g, " ")
      .trim();
    const forkCommand = buildForkAgentCommand(
      this.sessionAgentLaunchBySessionId.get(sessionId),
      this.getSidebarAgentIconForSession(sessionId),
      sessionRecord.title,
      terminalTitle,
    );
    if (!forkCommand || !sourceTitle) {
      void vscode.window.showInformationMessage(
        "Fork is only available for Codex and Claude sessions that have a visible title.",
      );
      return;
    }

    await this.store.focusGroup(sourceGroup.groupId);
    const forkedSession = await this.createTerminalSession();
    if (!forkedSession) {
      return;
    }

    const sourceAgentIcon = this.getSidebarAgentIconForSession(sessionId);
    if (sourceAgentIcon) {
      this.sidebarAgentIconBySessionId.set(forkedSession.sessionId, sourceAgentIcon);
    }

    const sourceAgentLaunch = this.sessionAgentLaunchBySessionId.get(sessionId);
    if (sourceAgentLaunch) {
      this.sessionAgentLaunchBySessionId.set(forkedSession.sessionId, sourceAgentLaunch);
    }

    const currentGroup = this.store.getGroup(sourceGroup.groupId);
    const orderedSessionIds = currentGroup
      ? getOrderedSessions(currentGroup.snapshot).map((groupSession) => groupSession.sessionId)
      : [];
    const sourceIndex = orderedSessionIds.indexOf(sessionId);
    if (sourceIndex >= 0) {
      await this.store.moveSessionToGroup(
        forkedSession.sessionId,
        sourceGroup.groupId,
        sourceIndex + 1,
      );
    }

    await this.persistSessionAgentLaunchState();
    await this.refreshSidebarFromCurrentState();
    const resolvedForkedSession = this.store.getSession(forkedSession.sessionId) ?? forkedSession;
    await this.backend.createOrAttachSession(resolvedForkedSession);
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
    await this.backend.writeText(resolvedForkedSession.sessionId, forkCommand, true);
    this.scheduleForkRename(resolvedForkedSession.sessionId, sourceTitle);
  }

  public async fullReloadSession(sessionId?: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind !== "terminal") {
      return;
    }

    const resumeAction = this.getProgrammaticResumeAction(sessionRecord);
    if (!resumeAction) {
      void vscode.window.showInformationMessage(
        `Full reload is only available for ${FULL_RELOAD_SUPPORTED_AGENTS_LABEL} sessions with a visible title.`,
      );
      return;
    }

    const didResume = await this.runProgrammaticTerminalResume(sessionRecord, resumeAction, {
      beforeWrite: async () => {
        this.retireTerminalPaneRuntimeGeneration(sessionId);
        await this.destroyWorkspaceTerminalRuntimeIfNeeded(sessionRecord);
        const reloadedSessionRecord = await this.prepareSessionForTerminalRecreate(sessionRecord);
        await this.backend.restartSession(reloadedSessionRecord);
      },
    });
    if (!didResume) {
      void vscode.window.showWarningMessage(
        "VSmux launched OpenCode but could not confirm it was ready to restore the session during full reload.",
      );
      return;
    }
    await this.afterStateChange();
  }

  public async fullReloadGroup(groupId: string): Promise<void> {
    const group = this.store.getGroup(groupId);
    if (!group) {
      return;
    }

    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const sessionActivityContext = this.createSessionActivityContext();
    const terminalSessions = group.snapshot.sessions.filter(
      (sessionRecord): sessionRecord is SessionRecord => sessionRecord.kind === "terminal",
    );
    let skippedUnsupportedCount = 0;
    let skippedIndicatorCount = 0;
    const fullReloadPlans = terminalSessions.flatMap((sessionRecord) => {
      const resumeAction = this.getProgrammaticResumeAction(sessionRecord);
      if (!resumeAction) {
        skippedUnsupportedCount += 1;
        return [];
      }

      const sidebarSession = this.createSidebarSessionItem(
        sessionRecord,
        workspaceSnapshot,
        sessionActivityContext,
      );
      if (sidebarSession && shouldSkipSessionForGroupFullReload(sidebarSession)) {
        skippedIndicatorCount += 1;
        return [];
      }

      return [{ resumeAction, sessionRecord }];
    });
    if (fullReloadPlans.length === 0) {
      void vscode.window.showInformationMessage(
        this.getFullReloadGroupSkippedMessage({
          reloadedCount: 0,
          skippedIndicatorCount,
          skippedUnsupportedCount,
        }) ??
          `Full reload is only available for ${FULL_RELOAD_SUPPORTED_AGENTS_LABEL} sessions with a visible title.`,
      );
      return;
    }

    let failedResumeCount = 0;
    for (const plan of fullReloadPlans) {
      const didResume = await this.runProgrammaticTerminalResume(
        plan.sessionRecord,
        plan.resumeAction,
        {
          beforeWrite: async () => {
            this.bumpTerminalPaneRenderNonce(plan.sessionRecord.sessionId);
            await this.destroyWorkspaceTerminalRuntimeIfNeeded(plan.sessionRecord);
            const reloadedSessionRecord = await this.prepareSessionForTerminalRecreate(
              plan.sessionRecord,
            );
            await this.backend.restartSession(reloadedSessionRecord);
          },
        },
      );
      if (!didResume) {
        failedResumeCount += 1;
      }
    }

    await this.afterStateChange();

    if (failedResumeCount > 0) {
      void vscode.window.showWarningMessage(
        `VSmux could not confirm ${String(failedResumeCount)} OpenCode session${failedResumeCount === 1 ? "" : "s"} was ready to restore during full reload.`,
      );
    }

    if (skippedIndicatorCount > 0 || skippedUnsupportedCount > 0) {
      const skippedMessage = this.getFullReloadGroupSkippedMessage({
        reloadedCount: fullReloadPlans.length,
        skippedIndicatorCount,
        skippedUnsupportedCount,
      });
      if (!skippedMessage) {
        return;
      }

      void vscode.window.showInformationMessage(skippedMessage);
    }
  }

  public async promptSetT3SessionThreadId(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind !== "t3") {
      return;
    }

    const nextThreadId = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: "Paste a T3 thread id",
      prompt: "Set Thread ID",
      validateInput: (value) => (value.trim().length > 0 ? undefined : "Thread ID is required."),
      value: sessionRecord.t3.threadId,
      valueSelection: [0, sessionRecord.t3.threadId.length],
    });
    if (nextThreadId === undefined) {
      return;
    }

    await this.setT3SessionThreadId(sessionId, nextThreadId);
  }

  public async setT3SessionThreadId(sessionId: string, threadId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind !== "t3") {
      return;
    }

    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId || normalizedThreadId === sessionRecord.t3.threadId) {
      return;
    }

    const changed = await this.store.setT3SessionMetadata(sessionId, {
      ...sessionRecord.t3,
      threadId: normalizedThreadId,
    });
    if (!changed) {
      return;
    }
    this.invalidateT3PaneHtml(sessionId);

    const refreshedSession = this.store.getSession(sessionId);
    if (refreshedSession?.kind === "t3") {
      await this.syncT3SessionTitleFromRuntime(refreshedSession);
    }

    await this.afterStateChange();
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

  public async promptFindPreviousSession(): Promise<void> {
    const query = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: "e.g. full reload should not update last active",
      prompt: "What do you remember talking about in that session?",
    });
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) {
      return;
    }

    const agentButton = this.resolveFindPreviousSessionAgent();
    if (!agentButton) {
      void vscode.window.showInformationMessage(
        "VSmux could not find a configured agent for Find a session. Update VSmux.findPreviousSessionAgentId or restore the Codex button.",
      );
      return;
    }

    if (agentButton.agentId === "t3") {
      void vscode.window.showInformationMessage(
        "Find a session needs a terminal-based agent. Choose another agent in VSmux.findPreviousSessionAgentId.",
      );
      return;
    }

    const sessionRecord = await this.launchSidebarTerminalAgent(agentButton);
    if (!sessionRecord) {
      return;
    }

    const prompt = renderFindPreviousSessionPrompt(
      getFindPreviousSessionPromptTemplate(),
      normalizedQuery,
    );
    const didReachAgentPromptTarget = await this.waitForSessionAgentPromptTarget(
      sessionRecord.sessionId,
      agentButton.agentId,
    );
    if (!didReachAgentPromptTarget) {
      await vscode.env.clipboard.writeText(prompt);
      void vscode.window.showWarningMessage(
        "VSmux launched the agent but could not confirm it was ready for pasted input. The prompt was copied to your clipboard instead.",
      );
      return;
    }

    await this.writeTerminalTextPreservingLastActivity(
      sessionRecord.sessionId,
      `/rename Search: ${normalizedQuery}`,
      true,
    );
    if (shouldUseExplicitPowerShellEnter()) {
      await this.backend.writeText(sessionRecord.sessionId, prompt, false);
      await this.backend.writeText(sessionRecord.sessionId, "\r", false);
      return;
    }

    await this.backend.writeText(sessionRecord.sessionId, prompt, false);
  }

  public async toggleCompletionBell(): Promise<void> {
    await this.context.workspaceState.update(
      COMPLETION_BELL_ENABLED_KEY,
      !this.getCompletionBellEnabled(),
    );
    await this.refreshSidebar("hydrate");
  }

  public async toggleShowLastInteractionTimeOnSessionCards(): Promise<void> {
    await setShowLastInteractionTimeOnSessionCards(!getShowLastInteractionTimeOnSessionCards());
    await this.refreshSidebar("hydrate");
  }

  public async adjustTerminalFontSize(delta: -1 | 1): Promise<void> {
    await setTerminalFontSize(getTerminalFontSize() + delta);
    await this.refreshWorkspacePanel();
  }

  public async resetTerminalFontSize(): Promise<void> {
    await resetTerminalFontSize();
    await this.refreshWorkspacePanel();
  }

  public async adjustT3ZoomPercent(delta: -1 | 1): Promise<void> {
    await setT3ZoomPercent(getT3ZoomPercent() + delta * 5);
    await this.refreshWorkspacePanel();
  }

  public async resetT3ZoomPercent(): Promise<void> {
    await resetT3ZoomPercent();
    await this.refreshWorkspacePanel();
  }

  public async runSidebarCommand(
    commandId: string,
    runMode: SidebarCommandRunMode = "default",
  ): Promise<void> {
    const commandButton = getSidebarCommandButtonById(this.context, commandId);
    if (!commandButton) {
      return;
    }

    if (commandButton.actionType === "browser") {
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

    const terminalRunPlan = getSidebarCommandTerminalRunPlan(
      commandButton.actionType,
      commandButton.closeTerminalOnExit,
      runMode,
    );
    if (!terminalRunPlan) {
      return;
    }

    if (terminalRunPlan.target === "vsmux-terminal") {
      await this.launchSidebarCommandInWorkspace(
        getSidebarCommandWorkspaceSessionTitle(commandButton.name, command, runMode),
        command,
      );
      return;
    }

    if (terminalRunPlan.closeOnExit) {
      const terminal = this.createSidebarCommandTerminal(commandButton.name, {
        closeOnExit: true,
        command,
      });
      terminal.show(true);
      this.observeSidebarCommandTerminalExit(terminal, {
        disposeTerminalOnExit: true,
        playCompletionSound: commandButton.playCompletionSound,
      });
      return;
    }

    const terminal = this.createSidebarCommandTerminal(commandButton.name, {
      location: vscode.TerminalLocation.Panel,
    });
    terminal.show(true);
    sendTerminalText(terminal, command, true);
  }

  public async runSidebarGitAction(action: SidebarGitAction): Promise<void> {
    if (this.gitActionInProgress) {
      return;
    }

    const generator = getGitTextGenerationSettings();
    if (!hasConfiguredGitTextGenerationProvider(generator)) {
      void vscode.window.showErrorMessage(
        "Git text generation is set to custom, but VSmux.gitTextGenerationCustomCommand is empty.",
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
      const needsCommit = action === "commit" || status.hasWorkingTreeChanges;
      const shouldPromptForCommit =
        needsCommit && getSidebarGitConfirmSuggestedCommit(this.context, this.workspaceId);

      if (shouldPromptForCommit) {
        const preparedCommit = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "VSmux Git",
          },
          async (progress) =>
            prepareSidebarGitCommit({
              action,
              cwd,
              generator,
              onProgress: (message) => progress.report({ message }),
            }),
        );

        const sidebarGitState = this.withSidebarGitPreferences(
          await loadSidebarGitState(cwd, action, false),
        );
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
            preparedCommit.scope === "stagedOnly"
              ? "Only staged changes will be committed."
              : "Review the suggested commit message.",
          requestId,
          suggestedBody: sidebarGitState.generateCommitBody ? preparedCommit.body : undefined,
          suggestedSubject: preparedCommit.subject,
          type: "promptGitCommit",
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

  public async setSidebarGitGenerateCommitBodyEnabled(enabled: boolean): Promise<void> {
    await saveSidebarGitGenerateCommitBody(this.context, this.workspaceId, enabled);
    this.invalidateSidebarGitHudState();
    await this.refreshSidebar();
  }

  public async confirmSidebarGitCommit(requestId: string, message: string): Promise<void> {
    const pending = this.pendingSidebarGitCommitConfirmation;
    if (!pending || pending.requestId !== requestId || this.gitActionInProgress) {
      return;
    }

    const parsedCommitMessage = parseSidebarCommitDraft(message);
    if (!parsedCommitMessage) {
      void vscode.window.showErrorMessage("Commit message cannot be empty.");
      return;
    }

    this.pendingSidebarGitCommitConfirmation = undefined;
    await this.executeSidebarGitAction(pending.action, pending.generator, {
      ...pending.preparedCommit,
      body: parsedCommitMessage.body,
      subject: parsedCommitMessage.subject,
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
    preparedCommit?: PreparedSidebarGitCommit,
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
          title: "VSmux Git",
        },
        async (progress) =>
          runSidebarGitActionWorkflow({
            action,
            cwd: getDefaultWorkspaceCwd(),
            generator,
            onProgress: (message) => progress.report({ message }),
            preparedCommit,
          }),
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
    const agentCommand = agentButton?.command?.trim();
    if (!agentButton || !agentCommand) {
      return;
    }

    if (agentId === "t3") {
      await this.createT3Session(agentCommand);
      return;
    }

    await this.launchSidebarTerminalAgent({
      agentId: agentButton.agentId,
      command: agentCommand,
      icon: agentButton.icon,
    });
  }

  public async resumeChatHistorySession(input: ChatHistoryResumeRequest): Promise<void> {
    const agentId = input.source.toLowerCase();
    const agentButton = getSidebarAgentButtonById(agentId);
    const agentCommand = agentButton?.command?.trim();
    if (!agentButton?.icon || !agentCommand) {
      void vscode.window.showInformationMessage(
        `VSmux could not find a configured ${input.source} agent command.`,
      );
      return;
    }

    const sessionRecord = await this.createTerminalSession();
    if (!sessionRecord) {
      return;
    }

    this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, agentButton.icon);
    this.sessionAgentLaunchBySessionId.set(sessionRecord.sessionId, {
      agentId,
      command: agentCommand,
    });
    await this.persistSessionAgentLaunchState();
    await this.refreshSidebarFromCurrentState();
    await this.backend.createOrAttachSession(sessionRecord);
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });

    const normalizedCwd = input.cwd?.trim();
    if (normalizedCwd && normalizedCwd !== getDefaultWorkspaceCwd()) {
      await this.backend.writeText(
        sessionRecord.sessionId,
        `cd ${quoteShellLiteral(normalizedCwd)}`,
        true,
      );
    }

    const resumeCommand =
      input.source === "Claude"
        ? `${agentCommand} --resume ${quoteShellLiteral(input.sessionId)}`
        : `${agentCommand} resume ${quoteShellLiteral(input.sessionId)}`;
    await this.backend.writeText(sessionRecord.sessionId, resumeCommand, true);
  }

  public async restorePreviousSession(historyId?: string): Promise<void> {
    if (!historyId) {
      return;
    }

    const archivedSession = this.previousSessionHistory.getEntry(historyId);
    if (!archivedSession) {
      return;
    }

    logVSmuxDebug("controller.restorePreviousSession.start", {
      historyId,
      kind: archivedSession.sessionRecord.kind,
      sessionTitle: archivedSession.sessionRecord.title,
      threadId:
        archivedSession.sessionRecord.kind === "t3"
          ? archivedSession.sessionRecord.t3.threadId
          : undefined,
    });

    const restoredSession =
      archivedSession.sessionRecord.kind === "t3"
        ? await this.store.createSession({
            kind: "t3",
            t3: archivedSession.sessionRecord.t3,
            title: archivedSession.sessionRecord.title,
          })
        : await this.createTerminalSession({
            title: archivedSession.sessionRecord.title,
          });
    if (!restoredSession) {
      return;
    }

    if (archivedSession.agentIcon) {
      this.sidebarAgentIconBySessionId.set(restoredSession.sessionId, archivedSession.agentIcon);
    }
    if (archivedSession.agentLaunch) {
      this.sessionAgentLaunchBySessionId.set(
        restoredSession.sessionId,
        archivedSession.agentLaunch,
      );
    }

    if (archivedSession.sessionRecord.alias !== restoredSession.alias) {
      await this.store.renameSessionAlias(
        restoredSession.sessionId,
        archivedSession.sessionRecord.alias,
      );
    }

    const restoredTerminalTitle = getVisibleTerminalTitle(
      archivedSession.sidebarItem.terminalTitle,
    );
    if (restoredTerminalTitle && restoredSession.kind === "terminal") {
      this.terminalTitleBySessionId.set(restoredSession.sessionId, restoredTerminalTitle);
    }

    const nextSessionRecord = this.store.getSession(restoredSession.sessionId) ?? restoredSession;
    await finalizeRestoredPreviousSession({
      afterStateChange: async () => this.afterStateChange(),
      createSurfaceIfNeeded: async () => {
        await this.createSurfaceIfNeeded(nextSessionRecord);
      },
      persistSessionAgentLaunchState: async () => this.persistSessionAgentLaunchState(),
      removePreviousSession: async () => this.previousSessionHistory.remove(historyId),
      resumeDetachedTerminalSession: async () =>
        this.resumeDetachedTerminalSession(nextSessionRecord),
    });

    const refreshedSession = this.store.getSession(restoredSession.sessionId) ?? restoredSession;
    logVSmuxDebug("controller.restorePreviousSession.complete", {
      historyId,
      restoredSessionId: restoredSession.sessionId,
      threadId: refreshedSession.kind === "t3" ? refreshedSession.t3.threadId : undefined,
      title: refreshedSession.title,
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

  public async savePinnedPrompt(
    promptId: string | undefined,
    title: string,
    content: string,
  ): Promise<void> {
    await saveSidebarPinnedPrompt(this.context, { content, promptId, title });
    await this.refreshSidebar();
  }

  public async setSidebarSectionCollapsed(
    section: SidebarCollapsibleSection,
    collapsed: boolean,
  ): Promise<void> {
    await saveSidebarSectionCollapsed(this.context, this.workspaceId, section, collapsed);
    await this.refreshSidebar("hydrate");
  }

  public async saveSidebarCommand(
    commandId: string | undefined,
    name: string,
    actionType: "browser" | "terminal",
    closeTerminalOnExit: boolean,
    playCompletionSound: boolean,
    command?: string,
    icon?: SidebarCommandIcon,
    iconColor?: string,
    isGlobal?: boolean,
    url?: string,
  ): Promise<void> {
    await saveSidebarCommandPreference(this.context, {
      actionType,
      closeTerminalOnExit,
      command,
      commandId,
      icon,
      iconColor,
      isGlobal: isGlobal === true,
      name,
      playCompletionSound,
      url,
    });
    await this.refreshSidebar("hydrate");
  }

  public async deleteSidebarCommand(commandId: string): Promise<void> {
    await deleteSidebarCommandPreference(this.context, commandId);
    await this.refreshSidebar("hydrate");
  }

  public async syncSidebarCommandOrder(
    requestId: string,
    commandIds: readonly string[],
  ): Promise<void> {
    await this.syncSidebarOrder("command", requestId, commandIds, (nextCommandIds) =>
      syncSidebarCommandOrderPreference(this.context, nextCommandIds),
    );
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

  public async syncSidebarAgentOrder(
    requestId: string,
    agentIds: readonly string[],
  ): Promise<void> {
    await this.syncSidebarOrder("agent", requestId, agentIds, (nextAgentIds) =>
      syncSidebarAgentOrderPreference(nextAgentIds),
    );
  }

  private async syncSidebarOrder(
    kind: SidebarOrderSyncKind,
    requestId: string,
    itemIds: readonly string[],
    syncPreference: (itemIds: readonly string[]) => Promise<void>,
  ): Promise<void> {
    this.logSidebarOrderTrace("repro.sidebarOrder.extension.syncStart", {
      beforeItemIds: this.getSidebarOrderIds(kind),
      kind,
      requestId,
      requestedItemIds: [...itemIds],
    });

    try {
      await syncPreference(itemIds);
      this.logSidebarOrderTrace("repro.sidebarOrder.extension.syncSuccess", {
        kind,
        persistedItemIds: this.getSidebarOrderIds(kind),
        requestId,
        requestedItemIds: [...itemIds],
      });
      await this.postSidebarOrderSyncResult({
        itemIds: [...itemIds],
        kind,
        requestId,
        status: "success",
        type: "sidebarOrderSyncResult",
      });
    } catch (error) {
      this.logSidebarOrderTrace("repro.sidebarOrder.extension.syncError", {
        error: error instanceof Error ? error.message : String(error),
        kind,
        requestId,
        requestedItemIds: [...itemIds],
      });
      await this.postSidebarOrderSyncResult({
        itemIds: [...itemIds],
        kind,
        requestId,
        status: "error",
        type: "sidebarOrderSyncResult",
      });
      throw error;
    }

    await this.refreshSidebar("hydrate");
  }

  private getSidebarOrderIds(kind: SidebarOrderSyncKind): string[] {
    return kind === "agent"
      ? getSidebarAgentButtons().map((agent) => agent.agentId)
      : getSidebarCommandButtons(this.context).map((command) => command.commandId);
  }

  private logSidebarOrderTrace(event: string, details?: unknown): void {
    logVSmuxReproTrace(event, enrichSidebarOrderTraceDetails(this.workspaceId, details));
  }

  private async postSidebarOrderSyncResult(
    message: Extract<ExtensionToSidebarMessage, { type: "sidebarOrderSyncResult" }>,
  ): Promise<void> {
    await this.sidebarProvider.postMessage(message);
  }

  public async focusGroup(groupId: string, source?: "sidebar"): Promise<void> {
    this.clearObservedSidebarFocusState();
    const beforeSnapshot = this.describeActiveSnapshot();
    logVSmuxDebug("controller.focusGroup.start", {
      beforeSnapshot,
      groupId,
      source,
      workspaceId: this.workspaceId,
    });
    const changed = await this.store.focusGroup(groupId);
    const afterSnapshot = this.describeActiveSnapshot();
    logVSmuxDebug("controller.focusGroup.afterStoreFocus", {
      afterSnapshot,
      changed,
      groupId,
      source,
      workspaceId: this.workspaceId,
    });
    const focusPlan = createGroupFocusPlan({
      changed,
      hasFocusedSession: this.getActiveSnapshot().focusedSessionId !== undefined,
      isWorkspacePanelVisible: this.workspacePanel.isVisible(),
      source,
    });
    if (focusPlan.shouldEnqueueWorkspaceAutoFocus) {
      this.enqueueWorkspaceAutoFocusForFocusedSession("sidebar");
    }
    if (changed) {
      await this.afterStateChange();
      return;
    }

    if (focusPlan.shouldRefreshWorkspacePanel) {
      await this.refreshWorkspacePanel();
    }
    if (focusPlan.shouldRevealWorkspacePanel) {
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

  public async syncWorkspacePaneOrder(
    groupId: string,
    sessionIds: readonly string[],
  ): Promise<void> {
    const changed = await syncWorkspacePaneOrderPreference(
      this.context,
      this.workspaceId,
      groupId,
      sessionIds,
    );
    logVSmuxDebug("controller.syncWorkspacePaneOrder", {
      changed,
      groupId,
      requestedSessionIds: [...sessionIds],
    });
    if (changed) {
      await this.refreshWorkspacePanel();
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
    await deleteWorkspacePaneOrderPreference(this.context, this.workspaceId, groupId);
    await this.refreshSidebarFromCurrentState();
    for (const sessionRecord of group.snapshot.sessions) {
      await this.disposeSurface(sessionRecord);
      if (sessionRecord.kind === "terminal") {
        this.retireTerminalPaneRuntimeGeneration(sessionRecord.sessionId);
      }
      await this.destroyWorkspaceTerminalRuntimeIfNeeded(sessionRecord);
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
    await this.syncT3ActivityMonitor();
    if (options?.sidebarAlreadyRefreshed) {
      this.clearObservedSidebarFocusState();
      this.syncSurfaceManagers();
    } else {
      await this.refreshSidebarFromCurrentState();
    }
    if (!options?.workspaceAlreadyRefreshed) {
      await this.refreshWorkspacePanel();
    }
    logVSmuxDebug("controller.afterStateChange", {
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
    if (message.type === "sidebarDebugLog") {
      logVSmuxDebug(`sidebar.webview.${message.event}`, message.details);
      if (message.event.startsWith("repro.sidebarOrder.")) {
        this.logSidebarOrderTrace(`sidebar.webview.${message.event}`, message.details);
      }
      return;
    }

    await dispatchSidebarMessage(message, {
      adjustTerminalFontSize: async (delta) => this.adjustTerminalFontSize(delta),
      cancelSidebarGitCommit: async (requestId) => this.cancelSidebarGitCommit(requestId),
      clearGeneratedPreviousSessions: async () => this.clearGeneratedPreviousSessions(),
      clearStartupSidebarRefreshes: () => {},
      closeGroup: async (groupId) => this.closeGroup(groupId),
      closeSession: async (sessionId) => this.closeSession(sessionId),
      confirmSidebarGitCommit: async (requestId, subject) =>
        this.confirmSidebarGitCommit(requestId, subject),
      copyResumeCommand: async (sessionId) => this.copyResumeCommand(sessionId),
      forkSession: async (sessionId) => this.forkSession(sessionId),
      fullReloadGroup: async (groupId) => this.fullReloadGroup(groupId),
      fullReloadSession: async (sessionId) => this.fullReloadSession(sessionId),
      openT3SessionBrowserAccessLink: async (url) => this.openT3SessionBrowserAccessLink(url),
      setGroupSleeping: async (groupId, sleeping) => this.setGroupSleeping(groupId, sleeping),
      setSessionFavorite: async (sessionId, favorite) =>
        this.setSessionFavorite(sessionId, favorite),
      setSessionSleeping: async (sessionId, sleeping) =>
        this.setSessionSleeping(sessionId, sleeping),
      setT3SessionThreadId: async (sessionId) => this.promptSetT3SessionThreadId(sessionId),
      requestT3SessionBrowserAccess: async (sessionId) =>
        this.requestT3SessionBrowserAccess(sessionId),
      createGroup: async () => this.createGroup(),
      createGroupFromSession: async (sessionId) => this.createGroupFromSession(sessionId),
      createSession: async () => this.createSession(),
      createSessionInGroup: async (groupId) => this.createSessionInGroup(groupId),
      deletePreviousSession: async (historyId) => this.deletePreviousSession(historyId),
      killDaemonSession: async (workspaceId, sessionId) =>
        this.killDaemonSession(workspaceId, sessionId),
      killTerminalDaemon: async () => this.killTerminalDaemon(),
      killT3RuntimeServer: async () => this.killT3RuntimeServer(),
      killT3RuntimeSession: async (sessionId) => this.killT3RuntimeSession(sessionId),
      deleteSidebarAgent: async (agentId) => this.deleteSidebarAgent(agentId),
      deleteSidebarCommand: async (commandId) => this.deleteSidebarCommand(commandId),
      focusGroup: async (groupId, source) => this.focusGroup(groupId, source),
      focusSession: async (sessionId, source) => this.focusSession(sessionId, source),
      moveSessionToGroup: async (sessionId, groupId, targetIndex) =>
        this.moveSessionToGroup(sessionId, groupId, targetIndex),
      moveSidebarToOtherSide: async () => this.moveSidebarToOtherSide(),
      openBrowser: async () => this.openDefaultBrowserUrl(),
      openWorkspaceWelcome: async () => {
        await this.workspacePanel.postMessage({
          mode: "optional",
          type: "showWelcomeModal",
        });
        await this.workspacePanel.reveal();
      },
      openSettings: async () => this.openSettings(),
      promptFindPreviousSession: async () => this.promptFindPreviousSession(),
      promptRenameSession: async (sessionId) => this.promptRenameSession(sessionId),
      refreshDaemonSessions: async () => this.refreshDaemonSessions(),
      refreshGitState: async () => this.refreshGitState(),
      refreshSidebarHydrate: async () => this.refreshSidebar("hydrate"),
      renameGroup: async (groupId, title) => this.renameGroup(groupId, title),
      renameSession: async (sessionId, title) => this.renameSessionFromUserInput(sessionId, title),
      restartSession: async (sessionId) => this.restartSession(sessionId),
      restorePreviousSession: async (historyId) => this.restorePreviousSession(historyId),
      runSidebarAgent: async (agentId) => this.runSidebarAgent(agentId),
      runSidebarCommand: async (commandId, runMode) => this.runSidebarCommand(commandId, runMode),
      runSidebarGitAction: async (action) => this.runSidebarGitAction(action),
      savePinnedPrompt: async (promptId, title, content) =>
        this.savePinnedPrompt(promptId, title, content),
      saveScratchPad: async (content) => this.saveScratchPad(content),
      setSidebarSectionCollapsed: async (section, collapsed) =>
        this.setSidebarSectionCollapsed(section, collapsed),
      saveSidebarAgent: async (agentId, name, command, icon) =>
        this.saveSidebarAgent(agentId, name, command, icon),
      saveSidebarCommand: async (
        commandId,
        name,
        actionType,
        closeTerminalOnExit,
        playCompletionSound,
        command,
        icon,
        iconColor,
        isGlobal,
        url,
      ) =>
        this.saveSidebarCommand(
          commandId,
          name,
          actionType,
          closeTerminalOnExit === true,
          playCompletionSound === true,
          command,
          icon,
          iconColor,
          isGlobal,
          url,
        ),
      setSidebarGitCommitConfirmationEnabled: async (enabled) =>
        this.setSidebarGitCommitConfirmationEnabled(enabled),
      setSidebarGitGenerateCommitBodyEnabled: async (enabled) =>
        this.setSidebarGitGenerateCommitBodyEnabled(enabled),
      setSidebarGitPrimaryAction: async (action) => this.setSidebarGitPrimaryAction(action),
      toggleActiveSessionsSortMode: async () => this.toggleActiveSessionsSortMode(),
      toggleShowLastInteractionTimeOnSessionCards: async () =>
        this.toggleShowLastInteractionTimeOnSessionCards(),
      setViewMode: async (viewMode) => this.setViewMode(viewMode),
      setVisibleCount: async (visibleCount) => this.setVisibleCount(visibleCount),
      syncSidebarAgentOrder: async (requestId, agentIds) =>
        this.syncSidebarAgentOrder(requestId, agentIds),
      syncGroupOrder: async (groupIds) => this.syncGroupOrder(groupIds),
      syncSessionOrder: async (groupId, sessionIds) => this.syncSessionOrder(groupId, sessionIds),
      syncSidebarCommandOrder: async (requestId, commandIds) =>
        this.syncSidebarCommandOrder(requestId, commandIds),
      toggleCompletionBell: async () => this.toggleCompletionBell(),
      toggleFullscreenSession: async () => this.toggleFullscreenSession(),
    });
  }

  private async refreshSidebar(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
  ): Promise<void> {
    const revision = ++this.nextSidebarRevision;
    await this.sidebarProvider.postMessage(await this.createSidebarMessage(type, revision));
    await this.publishAgentManagerXSnapshot();
  }

  private async publishAgentManagerXSnapshot(): Promise<void> {
    this.agentManagerXBridge.updateSnapshot(await this.createAgentManagerXWorkspaceSnapshot());
  }

  private async applyCodexTerminalTitleFromWelcome(): Promise<void> {
    try {
      const result = await writeCodexWelcomeTerminalTitle();
      await this.workspacePanel.postMessage({
        setting: "terminalTitle",
        status: result.changed ? "updated" : "alreadySet",
        type: "codexWelcomeSettingApplied",
      });
      await this.workspacePanel.postMessage({
        expiresAt: Date.now() + WORKSPACE_RENAME_TOAST_DURATION_MS,
        message: result.changed
          ? `Saved to ${result.configPath}`
          : `Already set in ${result.configPath}`,
        title: result.changed ? "Codex terminal title updated" : "Codex terminal title already set",
        type: "showToast",
      });
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Could not update the Codex terminal title setting. ${getErrorMessage(error)}`,
      );
    }
  }

  private async applyCodexStatusLineFromWelcome(): Promise<void> {
    try {
      const result = await writeCodexWelcomeStatusLine();
      await this.workspacePanel.postMessage({
        setting: "statusLine",
        status: result.changed ? "updated" : "alreadySet",
        type: "codexWelcomeSettingApplied",
      });
      await this.workspacePanel.postMessage({
        expiresAt: Date.now() + WORKSPACE_RENAME_TOAST_DURATION_MS,
        message: result.changed
          ? `Saved to ${result.configPath}`
          : `Already set in ${result.configPath}`,
        title: result.changed ? "Codex status line updated" : "Codex status line already set",
        type: "showToast",
      });
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Could not update the Codex status line setting. ${getErrorMessage(error)}`,
      );
    }
  }

  private getProgrammaticResumeAction(
    sessionRecord: SessionRecord,
  ): ProgrammaticTerminalResumeAction | undefined {
    if (sessionRecord.kind !== "terminal") {
      return undefined;
    }

    return buildProgrammaticResumeAction(
      this.sessionAgentLaunchBySessionId.get(sessionRecord.sessionId),
      this.getSidebarAgentIconForSession(sessionRecord.sessionId),
      sessionRecord.title,
      this.terminalTitleBySessionId.get(sessionRecord.sessionId),
    );
  }

  private async toggleActiveSessionsSortMode(): Promise<void> {
    const currentSortMode = getSidebarActiveSessionsSortMode(this.context, this.workspaceId);
    const nextSortMode = currentSortMode === "manual" ? "lastActivity" : "manual";

    await saveSidebarActiveSessionsSortMode(this.context, this.workspaceId, nextSortMode);
    await this.refreshSidebar();
  }

  private async createAgentManagerXWorkspaceSnapshot(): Promise<AgentManagerXWorkspaceSnapshotMessage> {
    const workspacePath = getDefaultWorkspaceCwd();
    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const sessionActivityContext = this.createSessionActivityContext();
    const sessions = workspaceSnapshot.groups.flatMap((group) =>
      getOrderedSessions(group.snapshot)
        .filter((sessionRecord) => sessionRecord.kind !== "browser")
        .map((sessionRecord) =>
          this.createSidebarSessionItem(sessionRecord, workspaceSnapshot, sessionActivityContext),
        )
        .filter((session): session is NonNullable<typeof session> => session !== undefined)
        .map((session) => this.toAgentManagerXWorkspaceSession(session)),
    );

    return {
      sessions,
      type: "workspaceSnapshot",
      updatedAt: new Date().toISOString(),
      workspaceId: this.workspaceId,
      workspaceName: AgentManagerXBridgeClient.getWorkspaceName(workspacePath),
      workspacePath,
    };
  }

  private toAgentManagerXWorkspaceSession(
    sidebarSession: SidebarSessionItem,
  ): AgentManagerXWorkspaceSession {
    const sessionRecord = this.store.getSession(sidebarSession.sessionId);
    const displayName =
      sidebarSession.primaryTitle?.trim() ||
      sidebarSession.terminalTitle?.trim() ||
      sessionRecord?.title.trim() ||
      sidebarSession.alias.trim() ||
      "Session";
    const resolvedAgent =
      sidebarSession.agentIcon ??
      (sessionRecord?.kind === "t3" ? "t3" : undefined) ??
      this.backend.getSessionSnapshot(sidebarSession.sessionId)?.agentName ??
      "unknown";

    return {
      agent: resolvedAgent,
      alias: sidebarSession.alias,
      displayName,
      isFocused: sidebarSession.isFocused,
      isRunning: sidebarSession.isRunning,
      isVisible: sidebarSession.isVisible,
      kind: sidebarSession.sessionKind === "t3" ? "t3" : "terminal",
      lastActiveAt: sidebarSession.lastInteractionAt ?? new Date(0).toISOString(),
      sessionId: sidebarSession.sessionId,
      status: sidebarSession.activity,
      terminalTitle: sidebarSession.terminalTitle,
      threadId: sessionRecord?.kind === "t3" ? sessionRecord.t3.threadId : undefined,
    };
  }

  private async focusSessionFromAgentManagerX(sessionId: string): Promise<void> {
    await this.focusSession(sessionId, "sidebar");
  }

  private async closeSessionFromAgentManagerX(sessionId: string): Promise<void> {
    await this.closeSession(sessionId);
  }

  private async refreshDaemonSessions(): Promise<void> {
    await this.sidebarProvider.postMessage(await this.createDaemonSessionsMessage());
  }

  private async createSidebarMessage(
    type: SidebarHydrateMessage["type"] | SidebarSessionStateMessage["type"] = "sessionState",
    revision = ++this.nextSidebarRevision,
  ): Promise<ExtensionToSidebarMessage> {
    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const activeSnapshot =
      workspaceSnapshot.groups.find((group) => group.groupId === workspaceSnapshot.activeGroupId)
        ?.snapshot ?? this.getEmptySnapshot();
    const browserTabs = this.refreshLiveBrowserTabs();
    const sessionActivityContext = this.createSessionActivityContext();
    const gitState =
      type === "sessionState"
        ? this.getCachedSidebarGitHudState()
        : await this.getSidebarGitHudState();
    if (type === "sessionState") {
      this.ensureSidebarGitHudStateFresh();
    }
    const message = buildSidebarMessage({
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
      getLastTerminalActivityAt: (sessionId) => this.getLastTerminalActivityAtForSidebar(sessionId),
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
        getClampedAgentManagerZoomPercent(),
        getShowCloseButtonOnSessionCards(),
        getShowHotkeysOnSessionCards(),
        getShowLastInteractionTimeOnSessionCards(),
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
        getSidebarSectionCollapseState(this.context, this.workspaceId),
        getSidebarActiveSessionsSortMode(this.context, this.workspaceId),
        getCreateSessionOnSidebarDoubleClick(),
      ),
      platform: SHORTCUT_LABEL_PLATFORM,
      pinnedPrompts: getSidebarPinnedPrompts(this.context),
      previousSessions: this.previousSessionHistory.getItems(),
      revision,
      scratchPadContent: this.getScratchPadContent(),
      terminalHasLiveProjection: (sessionId) => this.backend.hasLiveTerminal(sessionId),
      type,
      workspaceId: this.workspaceId,
      workspaceSnapshot,
    }) as SidebarHydrateMessage | SidebarSessionStateMessage;

    this.logSidebarOrderTrace("repro.sidebarOrder.extension.messageBuilt", {
      agentIds: message.hud.agents.map((agent) => agent.agentId),
      commandIds: message.hud.commands.map((command) => command.commandId),
      focusedSessionTitle: message.hud.focusedSessionTitle,
      groupTitles: message.groups.map((group) => group.title),
      messageType: type,
      revision,
    });

    return message;
  }

  private async createDaemonSessionsMessage(): Promise<ExtensionToSidebarMessage> {
    const daemonState = await this.backend.listGlobalSessions();
    const t3Runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
    const t3Server = await t3Runtime.getManagedRuntimeState();
    const focusedSessionId = this.getActiveSnapshot().focusedSessionId;
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
      t3Server,
      t3Sessions: this.getAllSessionRecords()
        .flatMap<SidebarT3SessionItem>((sessionRecord) => {
          if (!isT3Session(sessionRecord)) {
            return [];
          }

          const activityState = this.getT3ActivityState(sessionRecord);
          return [
            {
              activity: activityState.activity,
              detail: activityState.detail,
              isCurrentWorkspace: true,
              isFocused: focusedSessionId === sessionRecord.sessionId,
              isRunning: activityState.isRunning,
              isSleeping: sessionRecord.isSleeping === true,
              lastInteractionAt: activityState.lastInteractionAt,
              sessionId: sessionRecord.sessionId,
              threadId: isPendingT3Metadata(sessionRecord.t3)
                ? undefined
                : sessionRecord.t3.threadId,
              title: sessionRecord.title,
              workspaceId: this.workspaceId,
              workspaceRoot: isPendingT3Metadata(sessionRecord.t3)
                ? undefined
                : sessionRecord.t3.workspaceRoot,
            },
          ];
        })
        .sort(compareSidebarT3Sessions),
      type: "daemonSessionsState",
    };
  }

  private async killDaemonSession(workspaceId: string, sessionId: string): Promise<void> {
    try {
      await this.backend.killGlobalSession(workspaceId, sessionId);
    } catch (error) {
      void vscode.window.showWarningMessage(
        `Unable to terminate daemon session: ${getErrorMessage(error)}`,
      );
    }

    await this.refreshDaemonSessions();
  }

  private async killTerminalDaemon(): Promise<void> {
    const didShutdown = await this.backend.shutdownDaemon();
    if (!didShutdown) {
      void vscode.window.showInformationMessage("No VSmux daemon is currently running.");
    }
    await this.refreshDaemonSessions();
  }

  private async killT3RuntimeSession(sessionId: string): Promise<void> {
    await this.closeSession(sessionId);
    await this.refreshDaemonSessions();
  }

  private async killT3RuntimeServer(): Promise<void> {
    const runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
    const didShutdown = await runtime.shutdownManagedRuntime();
    if (!didShutdown) {
      void vscode.window.showInformationMessage("No shared T3 Code server is currently running.");
    }
    this.t3Runtime = undefined;
    this.workspaceAssetServer.setT3ProxyAuthorizationToken(undefined);
    for (const sessionRecord of this.getAllSessionRecords()) {
      if (!isT3Session(sessionRecord)) {
        continue;
      }
      this.invalidateT3PaneHtml(sessionRecord.sessionId);
    }
    await this.afterStateChange();
    await this.refreshDaemonSessions();
  }

  private async postSessionPresentationMessage(sessionId: string): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord) {
      return;
    }

    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const sessionActivityContext = this.createSessionActivityContext();
    const sidebarSession = this.createSidebarSessionItem(
      sessionRecord,
      workspaceSnapshot,
      sessionActivityContext,
    );
    if (sidebarSession) {
      const previousSidebarPresentation =
        this.lastPostedSidebarPresentationBySessionId.get(sessionId);
      const nextSidebarPresentation = {
        activity: sidebarSession.activity,
        activityLabel: sidebarSession.activityLabel,
        lifecycleState: sidebarSession.lifecycleState,
        isPrimaryTitleTerminalTitle: sidebarSession.isPrimaryTitleTerminalTitle,
        lastInteractionAt: sidebarSession.lastInteractionAt,
        primaryTitle: sidebarSession.primaryTitle,
        terminalTitle: sidebarSession.terminalTitle,
      };
      const payloadChanged =
        previousSidebarPresentation?.activity !== nextSidebarPresentation.activity ||
        previousSidebarPresentation?.activityLabel !== nextSidebarPresentation.activityLabel ||
        previousSidebarPresentation?.lifecycleState !== nextSidebarPresentation.lifecycleState ||
        previousSidebarPresentation?.isPrimaryTitleTerminalTitle !==
          nextSidebarPresentation.isPrimaryTitleTerminalTitle ||
        previousSidebarPresentation?.lastInteractionAt !==
          nextSidebarPresentation.lastInteractionAt ||
        previousSidebarPresentation?.primaryTitle !== nextSidebarPresentation.primaryTitle ||
        previousSidebarPresentation?.terminalTitle !== nextSidebarPresentation.terminalTitle;
      logVSmuxDebug("controller.postSessionPresentationMessage.sidebar", {
        activity: sidebarSession.activity,
        activityChanged: previousSidebarPresentation?.activity !== nextSidebarPresentation.activity,
        activityLabel: sidebarSession.activityLabel,
        activityLabelChanged:
          previousSidebarPresentation?.activityLabel !== nextSidebarPresentation.activityLabel,
        lifecycleState: sidebarSession.lifecycleState,
        lifecycleStateChanged:
          previousSidebarPresentation?.lifecycleState !== nextSidebarPresentation.lifecycleState,
        isPrimaryTitleTerminalTitle: sidebarSession.isPrimaryTitleTerminalTitle,
        isPrimaryTitleTerminalTitleChanged:
          previousSidebarPresentation?.isPrimaryTitleTerminalTitle !==
          nextSidebarPresentation.isPrimaryTitleTerminalTitle,
        payloadChanged,
        previousSidebarPresentation,
        primaryTitle: sidebarSession.primaryTitle,
        primaryTitleChanged:
          previousSidebarPresentation?.primaryTitle !== nextSidebarPresentation.primaryTitle,
        sessionId,
        terminalTitle: sidebarSession.terminalTitle,
        terminalTitleChanged:
          previousSidebarPresentation?.terminalTitle !== nextSidebarPresentation.terminalTitle,
      });
      if (payloadChanged) {
        this.lastPostedSidebarPresentationBySessionId.set(sessionId, nextSidebarPresentation);
        await this.sidebarProvider.postMessage({
          session: sidebarSession,
          type: "sessionPresentationChanged",
        });
        await this.publishAgentManagerXSnapshot();
      }
    }

    if (!isTerminalSession(sessionRecord) || !this.isSessionVisibleInWorkspace(sessionId)) {
      return;
    }

    logVSmuxDebug("controller.postSessionPresentationMessage.workspace", {
      agentStatus: this.backend.getSessionSnapshot(sessionId)?.agentStatus,
      sessionId,
      terminalTitle: this.terminalTitleBySessionId.get(sessionId),
    });
    await this.workspacePanel.postMessage({
      activity: sidebarSession?.activity,
      lifecycleState: sidebarSession?.lifecycleState,
      sessionId,
      snapshot: this.backend.getSessionSnapshot(sessionId),
      terminalTitle: this.terminalTitleBySessionId.get(sessionId),
      type: "terminalPresentationChanged",
    });
  }

  private logSessionTitleSymbols(
    sessionId: string,
    title: string | undefined,
    snapshotAgentName: string | undefined,
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
      "unknown";
    const symbolKey = `${agentHint}:${symbols.join("")}`;
    if (this.loggedTitleSymbolKeys.has(symbolKey)) {
      return;
    }

    this.loggedTitleSymbolKeys.add(symbolKey);
    logVSmuxDebug("controller.titleSymbolsObserved", {
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
    const defaultUrl =
      getFirstBrowserSidebarCommandUrl(sidebarCommands) ?? getDefaultBrowserLaunchUrl();
    await this.openBrowserUrl(defaultUrl);
  }

  private async openBrowserUrl(url: string): Promise<void> {
    const normalizedUrl = normalizeSidebarBrowserUrl(url);
    if (!normalizedUrl) {
      return;
    }

    const targetViewColumn =
      vscode.window.tabGroups.activeTabGroup?.viewColumn ?? vscode.ViewColumn.One;
    const browserTabsBeforeOpen = this.refreshLiveBrowserTabs().filter(
      (browserTab) => browserTab.viewColumn === targetViewColumn,
    );
    const browserSessionIdsBeforeOpen = new Set(
      browserTabsBeforeOpen.map((browserTab) => browserTab.sessionId),
    );

    await vscode.commands.executeCommand(
      SIMPLE_BROWSER_OPEN_COMMAND,
      vscode.Uri.parse(normalizedUrl),
      {
        viewColumn: targetViewColumn,
      },
    );

    const browserTabsAfterOpen = this.refreshLiveBrowserTabs();
    const openedBrowserTab =
      browserTabsAfterOpen.find(
        (browserTab) =>
          browserTab.viewColumn === targetViewColumn &&
          !browserSessionIdsBeforeOpen.has(browserTab.sessionId),
      ) ??
      browserTabsAfterOpen.find(
        (browserTab) =>
          browserTab.viewColumn === targetViewColumn && browserTab.url === normalizedUrl,
      ) ??
      browserTabsAfterOpen.find(
        (browserTab) =>
          browserTab.viewColumn === targetViewColumn &&
          browserTab.viewType === "simpleBrowser.view",
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
    const refreshedBrowserTab =
      findLiveBrowserTabBySessionId(sessionId, this.refreshLiveBrowserTabs()) ?? browserTab;
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

    const editorGroupCount = vscode.window.tabGroups.all.filter(
      (group) => group.viewColumn !== undefined,
    ).length;
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
      for (const sessionRecord of visibleSessions) {
        if (this.isReconcileCancelled(requestVersion)) {
          logVSmuxDebug("controller.reconcile.cancelled", {
            reason: "superseded-before-ensure",
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          return;
        }
        if (!this.shouldEnsureSessionSurface(sessionRecord)) {
          logVSmuxDebug("controller.reconcile.skipEnsure", {
            kind: sessionRecord.kind,
            reason: "surface-already-attached",
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
          continue;
        }
        const surfaceEnsureResult = await this.createSurfaceIfNeeded(sessionRecord);
        if (this.shouldAutoResumeVisibleTerminalSession(sessionRecord, surfaceEnsureResult)) {
          await this.resumeDetachedTerminalSession(sessionRecord);
          logVSmuxDebug("controller.reconcile.autoResumeVisibleTerminal", {
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
        } else if (
          sessionRecord.kind === "terminal" &&
          surfaceEnsureResult === "existing-live-terminal"
        ) {
          logVSmuxDebug("controller.reconcile.skipAutoResumeForLiveTerminal", {
            sessionId: sessionRecord.sessionId,
            version: requestVersion,
          });
        }
      }

      if (this.isReconcileCancelled(requestVersion)) {
        logVSmuxDebug("controller.reconcile.cancelled", {
          reason: "superseded-before-render",
          version: requestVersion,
        });
        return;
      }

      if (!this.workspacePanel.isVisible() && visibleSessions.length > 0) {
        await this.workspacePanel.reveal();
      }
      await this.refreshWorkspacePanel();
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

  private isReconcileCancelled(requestVersion: number): boolean {
    return requestVersion !== this.reconcileRequestVersion;
  }

  private async createSurfaceIfNeeded(
    sessionRecord: SessionRecord,
  ): Promise<TerminalSurfaceEnsureResult> {
    if (sessionRecord.kind === "terminal") {
      if (this.backend.hasLiveTerminal(sessionRecord.sessionId)) {
        logVSmuxDebug("controller.createSurfaceIfNeeded.skipCreateOrAttachForLiveTerminal", {
          sessionId: sessionRecord.sessionId,
        });
        return "existing-live-terminal";
      }

      const createOrAttachResult = await this.backend.createOrAttachSession(sessionRecord);
      if (
        !createOrAttachResult.didCreateTerminal &&
        this.backend.hasLiveTerminal(sessionRecord.sessionId)
      ) {
        logVSmuxDebug("controller.createSurfaceIfNeeded.attachedExistingLiveTerminal", {
          sessionId: sessionRecord.sessionId,
        });
        return "existing-live-terminal";
      }

      if (!createOrAttachResult.didCreateTerminal) {
        return "non-terminal";
      }

      return "created-terminal";
    }

    if (sessionRecord.kind !== "t3") {
      return "non-terminal";
    }

    if (
      this.pendingT3SessionIds.has(sessionRecord.sessionId) ||
      isPendingT3Metadata(sessionRecord.t3)
    ) {
      return "non-terminal";
    }

    await this.ensureT3Ready(sessionRecord);
    return "non-terminal";
  }

  private shouldEnsureSessionSurface(sessionRecord: SessionRecord): boolean {
    if (sessionRecord.kind !== "terminal") {
      return true;
    }

    return !this.backend.hasAttachedTerminal(sessionRecord.sessionId);
  }

  private async ensureT3Ready(sessionRecord: T3SessionRecord): Promise<void> {
    const runtime = this.getOrCreateT3Runtime();
    const nextMetadata = await runtime.ensureThreadSession(sessionRecord.t3, sessionRecord.title);
    const metadataChanged = !haveSameT3SessionMetadata(sessionRecord.t3, nextMetadata);
    let resolvedSessionRecord: T3SessionRecord = sessionRecord;
    if (metadataChanged) {
      this.invalidateT3PaneHtml(sessionRecord.sessionId);
      await this.store.setT3SessionMetadata(sessionRecord.sessionId, nextMetadata);
      const refreshedSession = this.store.getSession(sessionRecord.sessionId);
      if (refreshedSession && isT3Session(refreshedSession)) {
        resolvedSessionRecord = refreshedSession;
      }
      await this.afterStateChange();
    }

    const updatedTitle = await this.syncT3SessionTitleFromRuntime(resolvedSessionRecord, runtime);
    if (updatedTitle && !metadataChanged) {
      await this.refreshSidebar();
      await this.refreshWorkspacePanel();
    }
  }

  private async createT3Session(startupCommand: string): Promise<T3SessionRecord | undefined> {
    const runtime = this.getOrCreateT3Runtime();
    const sessionRecord = await this.store.createSession({
      kind: "t3",
      t3: createPendingT3Metadata(runtime.getServerOrigin()),
      title: "T3 Code",
    });
    if (!sessionRecord) {
      return undefined;
    }

    this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, "t3");
    this.pendingT3SessionIds.add(sessionRecord.sessionId);
    const createdAtMs = Date.parse(sessionRecord.createdAt);
    this.lastActivityOverrideAtBySessionId.set(
      sessionRecord.sessionId,
      Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
    );
    await this.workspacePanel.reveal();
    this.enqueueWorkspaceAutoFocus(sessionRecord.sessionId, "sidebar");
    await this.afterStateChange();
    void this.finishCreatingT3Session(sessionRecord.sessionId, startupCommand);
    return isT3Session(sessionRecord) ? sessionRecord : undefined;
  }

  private findBoundT3Session(
    metadata: T3SessionRecord["t3"],
    options?: { excludeSessionId?: string },
  ): T3SessionRecord | undefined {
    return this.getAllSessionRecords().find((sessionRecord): sessionRecord is T3SessionRecord => {
      return (
        isT3Session(sessionRecord) &&
        !isPendingT3Metadata(sessionRecord.t3) &&
        sessionRecord.sessionId !== options?.excludeSessionId &&
        sessionRecord.t3.serverOrigin === metadata.serverOrigin &&
        sessionRecord.t3.threadId === metadata.threadId
      );
    });
  }

  private async createBoundT3Session(
    metadata: T3SessionRecord["t3"],
    title?: string,
  ): Promise<T3SessionRecord | undefined> {
    const normalizedTitle = normalizeTerminalTitle(title) ?? "T3 Code";
    const sessionRecord = await this.store.createSession({
      kind: "t3",
      t3: metadata,
      title: normalizedTitle,
    });
    if (!sessionRecord || !isT3Session(sessionRecord)) {
      return undefined;
    }

    this.sidebarAgentIconBySessionId.set(sessionRecord.sessionId, "t3");
    const createdAtMs = Date.parse(sessionRecord.createdAt);
    this.lastActivityOverrideAtBySessionId.set(
      sessionRecord.sessionId,
      Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
    );
    await this.workspacePanel.reveal();
    this.enqueueWorkspaceAutoFocus(sessionRecord.sessionId, "sidebar");
    await this.afterStateChange();
    const refreshedSession = this.store.getSession(sessionRecord.sessionId);
    return refreshedSession && isT3Session(refreshedSession) ? refreshedSession : sessionRecord;
  }

  private async createTerminalSession(options?: {
    terminalEngine?: TerminalEngine;
    title?: string;
  }): Promise<SessionRecord | undefined> {
    return this.store.createSession({
      terminalEngine: options?.terminalEngine ?? getDefaultTerminalEngine(),
      title: options?.title,
    });
  }

  private resolveFindPreviousSessionAgent():
    | {
        agentId: string;
        command: string;
        icon?: SidebarAgentIcon;
      }
    | undefined {
    const configuredAgentId = getFindPreviousSessionAgentId();
    const candidates = [
      getSidebarAgentButtonById(configuredAgentId),
      configuredAgentId === "codex" ? undefined : getSidebarAgentButtonById("codex"),
    ];

    for (const candidate of candidates) {
      const command = candidate?.command?.trim();
      if (!candidate || !command) {
        continue;
      }

      return {
        agentId: candidate.agentId,
        command,
        icon: candidate.icon,
      };
    }

    return undefined;
  }

  private async launchSidebarTerminalAgent(agentButton: {
    agentId: string;
    command: string;
    icon?: SidebarAgentIcon;
  }): Promise<SessionRecord | undefined> {
    const sessionRecord = await this.createTerminalSession();
    if (!sessionRecord) {
      return undefined;
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
    if (shouldFocusBeforeLaunchingSidebarAgent()) {
      await this.workspacePanel.reveal();
      this.enqueueWorkspaceAutoFocus(sessionRecord.sessionId, "sidebar");
    }
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
    if (shouldUseExplicitPowerShellEnter()) {
      await this.backend.writeText(sessionRecord.sessionId, agentButton.command, false);
      await this.backend.writeText(sessionRecord.sessionId, "\r", false);
      return sessionRecord;
    }

    await this.backend.writeText(sessionRecord.sessionId, agentButton.command, true);
    return sessionRecord;
  }

  private async launchSidebarCommandInWorkspace(name: string, command: string): Promise<void> {
    const sessionRecord = await this.createTerminalSession({ title: name });
    if (!sessionRecord) {
      return;
    }

    await this.refreshSidebarFromCurrentState();
    await this.backend.createOrAttachSession(sessionRecord);
    await this.workspacePanel.reveal();
    this.enqueueWorkspaceAutoFocus(sessionRecord.sessionId, "sidebar");
    await this.afterStateChange({ sidebarAlreadyRefreshed: true });
    await this.backend.writeText(sessionRecord.sessionId, command, true);
  }

  private async prepareSessionForTerminalRecreate(
    sessionRecord: SessionRecord,
  ): Promise<SessionRecord> {
    if (!isTerminalSession(sessionRecord)) {
      return sessionRecord;
    }

    const nextTerminalEngine = getDefaultTerminalEngine();
    if (sessionRecord.terminalEngine === nextTerminalEngine) {
      return sessionRecord;
    }

    await this.store.setTerminalSessionEngine(sessionRecord.sessionId, nextTerminalEngine);
    const refreshedSessionRecord = this.store.getSession(sessionRecord.sessionId);
    return refreshedSessionRecord && isTerminalSession(refreshedSessionRecord)
      ? refreshedSessionRecord
      : {
          ...sessionRecord,
          terminalEngine: nextTerminalEngine,
        };
  }

  private async disposeSurface(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind === "terminal") {
      await this.backend.killSession(sessionRecord.sessionId);
    }
  }

  private async disposeSleepingSessionSurface(sessionRecord: SessionRecord): Promise<void> {
    await this.disposeSurface(sessionRecord);
    if (sessionRecord.kind !== "terminal") {
      return;
    }

    this.retireTerminalPaneRuntimeGeneration(sessionRecord.sessionId);
    await this.destroyWorkspaceTerminalRuntimeIfNeeded(sessionRecord);
  }

  private syncSurfaceManagers(): void {
    const sessions = this.getAllSessionRecords();
    this.backend.syncSessions(sessions);
  }

  private getT3ActivityState(sessionRecord: SessionRecord): {
    activity: "idle" | "working" | "attention";
    detail?: string;
    isRunning: boolean;
    lastInteractionAt?: string;
  } {
    if (!isT3Session(sessionRecord)) {
      return {
        activity: "idle",
        isRunning: false,
      };
    }

    if (
      this.pendingT3SessionIds.has(sessionRecord.sessionId) ||
      isPendingT3Metadata(sessionRecord.t3)
    ) {
      return {
        activity: "working",
        isRunning: true,
        lastInteractionAt: getDisplayedLastInteractionIso({
          fallbackInteractionAt: sessionRecord.createdAt,
          overrideActivityAt: this.lastActivityOverrideAtBySessionId.get(sessionRecord.sessionId),
        }),
      };
    }

    const threadActivity = this.t3ActivityMonitor.getThreadActivity(sessionRecord.t3.threadId);
    return {
      activity: threadActivity?.activity ?? "idle",
      detail:
        threadActivity?.activity !== "working" && sessionRecord.t3.threadId.trim()
          ? `Thread ${sessionRecord.t3.threadId.slice(0, 8)}`
          : undefined,
      isRunning: threadActivity?.isRunning ?? true,
      lastInteractionAt: getDisplayedLastInteractionIso({
        fallbackInteractionAt: threadActivity?.lastInteractionAt ?? sessionRecord.createdAt,
        overrideActivityAt: this.lastActivityOverrideAtBySessionId.get(sessionRecord.sessionId),
      }),
    };
  }

  private recordT3LastActivityTransitions(): void {
    for (const sessionRecord of this.getAllSessionRecords()) {
      if (!isT3Session(sessionRecord) || isPendingT3Metadata(sessionRecord.t3)) {
        continue;
      }

      const previousActivity = this.lastKnownActivityBySessionId.get(sessionRecord.sessionId);
      if (previousActivity === undefined) {
        continue;
      }

      const nextActivity = this.getT3ActivityState(sessionRecord).activity;
      this.recordLastActivityTransition(sessionRecord, previousActivity, nextActivity);
    }
  }

  private async syncT3ActivityMonitor(): Promise<void> {
    const hasLiveT3Sessions = this.getAllSessionRecords().some(
      (sessionRecord) => sessionRecord.kind === "t3" && !isPendingT3Metadata(sessionRecord.t3),
    );
    await this.t3ActivityMonitor.setEnabled(hasLiveT3Sessions);
  }

  private clearSessionPresentationState(sessionId: string): void {
    this.activitySuppressedUntilBySessionId.delete(sessionId);
    this.frozenLastActivityAtBySessionId.delete(sessionId);
    this.lastActivityIgnoreUntilBySessionId.delete(sessionId);
    this.pendingT3SessionIds.delete(sessionId);
    this.t3PaneHtmlBySessionId.delete(sessionId);
    this.sidebarAgentIconBySessionId.delete(sessionId);
    this.sessionAgentLaunchBySessionId.delete(sessionId);
    this.terminalTitleBySessionId.delete(sessionId);
    this.lastKnownActivityBySessionId.delete(sessionId);
    this.lastActivityOverrideAtBySessionId.delete(sessionId);
    this.workingStartedAtBySessionId.delete(sessionId);
    this.clearPendingCompletionSound(sessionId);
    this.clearPendingForkRename(sessionId);
  }

  private retireTerminalPaneRuntimeGeneration(sessionId: string): void {
    this.bumpTerminalPaneRenderNonce(sessionId);
  }

  private async destroyWorkspaceTerminalRuntimeIfNeeded(
    sessionRecord: SessionRecord,
  ): Promise<void> {
    if (sessionRecord.kind !== "terminal") {
      return;
    }

    await this.workspacePanel.postMessage({
      sessionId: sessionRecord.sessionId,
      type: "destroyTerminalRuntime",
    });
  }

  private async deletePersistedSessionStateIfNeeded(sessionRecord: SessionRecord): Promise<void> {
    if (sessionRecord.kind !== "terminal") {
      return;
    }

    await this.backend.deletePersistedSessionState(sessionRecord.sessionId);
  }

  private shouldAutoResumeVisibleTerminalSession(
    sessionRecord: SessionRecord,
    surfaceEnsureResult: TerminalSurfaceEnsureResult,
  ): boolean {
    return (
      sessionRecord.kind === "terminal" &&
      surfaceEnsureResult === "created-terminal" &&
      this.canResumeDetachedTerminalSession(sessionRecord)
    );
  }

  private canResumeDetachedTerminalSession(sessionRecord: SessionRecord): boolean {
    if (sessionRecord.kind !== "terminal") {
      return false;
    }

    return Boolean(
      this.getProgrammaticResumeAction(sessionRecord) ??
      buildDetachedResumeAction(
        this.sessionAgentLaunchBySessionId.get(sessionRecord.sessionId),
        this.getSidebarAgentIconForSession(sessionRecord.sessionId),
        sessionRecord.title,
        this.terminalTitleBySessionId.get(sessionRecord.sessionId),
      ),
    );
  }

  private createArchivedSessionEntry(
    sessionRecord: SessionRecord,
  ): PreviousSessionHistoryEntry | undefined {
    if (sessionRecord.kind === "t3" && isPendingT3Metadata(sessionRecord.t3)) {
      return undefined;
    }

    const group = this.store.getSessionGroup(sessionRecord.sessionId);
    if (!group) {
      return undefined;
    }

    const archivedSessionRecord = getArchivedSessionRecord(
      sessionRecord,
      this.terminalTitleBySessionId.get(sessionRecord.sessionId),
    );

    return createPreviousSessionEntry({
      browserHasLiveProjection: () => false,
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (candidateSessionRecord, sessionSnapshot) =>
        getEffectiveSessionActivity(
          this.createSessionActivityContext(),
          candidateSessionRecord,
          sessionSnapshot,
        ),
      getSessionAgentLaunch: (sessionId) => this.sessionAgentLaunchBySessionId.get(sessionId),
      getLastTerminalActivityAt: (sessionId) => this.getLastTerminalActivityAtForSidebar(sessionId),
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getSidebarAgentIcon: (sessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(sessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (candidateSessionRecord) =>
        this.getT3ActivityState(candidateSessionRecord),
      getTerminalTitle: (sessionId) => this.terminalTitleBySessionId.get(sessionId),
      group,
      platform: SHORTCUT_LABEL_PLATFORM,
      sessionRecord: archivedSessionRecord,
      terminalHasLiveProjection: (sessionId) => this.backend.hasLiveTerminal(sessionId),
      workspaceId: this.workspaceId,
    });
  }

  private createSessionActivityContext(): Parameters<typeof getEffectiveSessionActivity>[0] {
    return {
      cancelPendingCompletionSound: (sessionId) => this.clearPendingCompletionSound(sessionId),
      getActivitySuppressedUntil: (sessionRecord) => this.getActivitySuppressedUntil(sessionRecord),
      getSessionSnapshot: (sessionId) => this.backend.getSessionSnapshot(sessionId),
      getT3ActivityState: (sessionRecord) => this.getT3ActivityState(sessionRecord),
      lastKnownActivityBySessionId: this.lastKnownActivityBySessionId,
      queueCompletionSound: (sessionId) => this.queueCompletionSound(sessionId),
      workingStartedAtBySessionId: this.workingStartedAtBySessionId,
      workspaceId: this.workspaceId,
    };
  }

  private createSidebarSessionItem(
    sessionRecord: SessionRecord,
    workspaceSnapshot: GroupedSessionWorkspaceSnapshot,
    sessionActivityContext: Parameters<typeof getEffectiveSessionActivity>[0],
  ): SidebarSessionItem | undefined {
    return createSidebarSessionItem({
      browserHasLiveProjection: () => false,
      debuggingMode: getDebuggingMode(),
      getEffectiveSessionActivity: (candidateSessionRecord, sessionSnapshot) =>
        getEffectiveSessionActivity(
          sessionActivityContext,
          candidateSessionRecord,
          sessionSnapshot,
        ),
      getSessionAgentLaunch: (candidateSessionId) =>
        this.sessionAgentLaunchBySessionId.get(candidateSessionId),
      getLastTerminalActivityAt: (candidateSessionId) =>
        this.getLastTerminalActivityAtForSidebar(candidateSessionId),
      getSessionSnapshot: (candidateSessionId) =>
        this.backend.getSessionSnapshot(candidateSessionId),
      getSidebarAgentIcon: (candidateSessionId, snapshotAgentName, derivedAgentName) =>
        this.sidebarAgentIconBySessionId.get(candidateSessionId) ??
        getSidebarAgentIconById(snapshotAgentName) ??
        getSidebarAgentIconById(derivedAgentName),
      getT3ActivityState: (candidateSessionRecord) =>
        this.getT3ActivityState(candidateSessionRecord),
      getTerminalTitle: (candidateSessionId) =>
        this.terminalTitleBySessionId.get(candidateSessionId),
      platform: SHORTCUT_LABEL_PLATFORM,
      sessionRecord,
      terminalHasLiveProjection: (candidateSessionId) =>
        this.backend.hasLiveTerminal(candidateSessionId),
      workspaceId: this.workspaceId,
      workspaceSnapshot,
    });
  }

  private getSidebarOrderedWorkspaceSessions(
    workspaceSnapshot: GroupedSessionWorkspaceSnapshot,
    sessionActivityContext: Parameters<typeof getEffectiveSessionActivity>[0],
  ): SessionRecord[] {
    const workspaceGroupIds = workspaceSnapshot.groups.map((group) => group.groupId);
    const sessionIdsByGroup = Object.fromEntries(
      workspaceSnapshot.groups.map((group) => [
        group.groupId,
        getOrderedSessions(group.snapshot).map((sessionRecord) => sessionRecord.sessionId),
      ]),
    );
    const sessionsById = Object.fromEntries(
      workspaceSnapshot.groups.flatMap((group) =>
        getOrderedSessions(group.snapshot)
          .map((sessionRecord) =>
            this.createSidebarSessionItem(sessionRecord, workspaceSnapshot, sessionActivityContext),
          )
          .filter((session): session is SidebarSessionItem => session !== undefined)
          .map((session) => [session.sessionId, session] as const),
      ),
    );
    const sessionRecordById = new Map(
      workspaceSnapshot.groups.flatMap((group) =>
        getOrderedSessions(group.snapshot).map(
          (sessionRecord) => [sessionRecord.sessionId, sessionRecord] as const,
        ),
      ),
    );
    const sortMode = getSidebarActiveSessionsSortMode(this.context, this.workspaceId);

    return getDisplaySessionIdsInOrder({
      sessionIdsByGroup,
      sessionsById,
      sortMode,
      workspaceGroupIds,
    })
      .map((sessionId) => sessionRecordById.get(sessionId))
      .filter((sessionRecord): sessionRecord is SessionRecord => sessionRecord !== undefined);
  }

  private getSidebarOrderedSessionIds(): string[] {
    const browserSessionIds = getShowSidebarBrowsers()
      ? this.refreshLiveBrowserTabs().map((browserTab) => browserTab.sessionId)
      : [];
    const workspaceSnapshot = this.getPresentedWorkspaceSnapshot();
    const sessionActivityContext = this.createSessionActivityContext();
    const workspaceSessionIds = this.getSidebarOrderedWorkspaceSessions(
      workspaceSnapshot,
      sessionActivityContext,
    ).map((sessionRecord) => sessionRecord.sessionId);

    return [...browserSessionIds, ...workspaceSessionIds];
  }

  private getFocusedSidebarSessionId(): string | undefined {
    if (getShowSidebarBrowsers()) {
      const activeBrowserTab = this.refreshLiveBrowserTabs().find(
        (browserTab) => browserTab.isActive,
      );
      if (activeBrowserTab) {
        return activeBrowserTab.sessionId;
      }
    }

    return this.store.getActiveGroup()?.snapshot.focusedSessionId;
  }

  private suppressSessionActivityIndicators(sessionRecord: SessionRecord): void {
    if (sessionRecord.kind !== "terminal") {
      return;
    }

    const displayedLastActivityAt = this.getLastTerminalActivityAtForSidebar(
      sessionRecord.sessionId,
    );
    const rawLastActivityAt = this.getResolvedLastTerminalActivityAtForSidebar(
      sessionRecord.sessionId,
    );
    const suppressedUntil = Date.now() + INITIAL_ACTIVITY_SUPPRESSION_MS;
    this.frozenLastActivityAtBySessionId.set(
      sessionRecord.sessionId,
      displayedLastActivityAt ?? null,
    );
    this.lastActivityIgnoreUntilBySessionId.set(sessionRecord.sessionId, suppressedUntil);
    this.activitySuppressedUntilBySessionId.set(sessionRecord.sessionId, suppressedUntil);
    this.workingStartedAtBySessionId.delete(sessionRecord.sessionId);
    this.clearPendingCompletionSound(sessionRecord.sessionId);
    logVSmuxDebug("controller.activitySuppression.started", {
      displayedLastActivityAt: formatDebugActivityAt(displayedLastActivityAt),
      frozenLastActivityAt: formatDebugActivityAt(displayedLastActivityAt),
      rawLastActivityAt: formatDebugActivityAt(rawLastActivityAt),
      sessionCreatedAt: sessionRecord.createdAt,
      sessionId: sessionRecord.sessionId,
      suppressedUntil: formatDebugActivityAt(suppressedUntil),
    });
  }

  private preserveSessionLastActivity(sessionId: string): void {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.kind !== "terminal") {
      return;
    }

    const displayedLastActivityAt = this.getLastTerminalActivityAtForSidebar(sessionId);
    const rawLastActivityAt = this.getResolvedLastTerminalActivityAtForSidebar(sessionId);
    const nextIgnoredUntil = Date.now() + INITIAL_ACTIVITY_SUPPRESSION_MS;
    const ignoredUntil = Math.max(
      this.lastActivityIgnoreUntilBySessionId.get(sessionId) ?? 0,
      nextIgnoredUntil,
    );
    this.frozenLastActivityAtBySessionId.set(sessionId, displayedLastActivityAt ?? null);
    this.lastActivityIgnoreUntilBySessionId.set(sessionId, ignoredUntil);
    logVSmuxDebug("controller.activitySuppression.controlCommandPreserved", {
      displayedLastActivityAt: formatDebugActivityAt(displayedLastActivityAt),
      frozenLastActivityAt: formatDebugActivityAt(displayedLastActivityAt),
      ignoredUntil: formatDebugActivityAt(ignoredUntil),
      rawLastActivityAt: formatDebugActivityAt(rawLastActivityAt),
      sessionCreatedAt: sessionRecord.createdAt,
      sessionId,
    });
  }

  private async writeTerminalTextPreservingLastActivity(
    sessionId: string,
    data: string,
    shouldExecute = true,
  ): Promise<void> {
    if (shouldPreserveLastActivityForTerminalWrite(data)) {
      this.preserveSessionLastActivity(sessionId);
    }

    await this.backend.writeText(sessionId, data, shouldExecute);
  }

  private async runProgrammaticTerminalResume(
    sessionRecord: SessionRecord,
    action: ProgrammaticTerminalResumeAction | DetachedResumeAction,
    options?: {
      beforeWrite?: () => Promise<void> | void;
    },
  ): Promise<boolean> {
    if (sessionRecord.kind !== "terminal") {
      return false;
    }

    this.suppressSessionActivityIndicators(sessionRecord);
    await options?.beforeWrite?.();

    const steps =
      "steps" in action
        ? action.steps
        : [
            {
              data: action.text,
              postDelayMs: undefined,
              shouldExecute: action.shouldExecute,
              waitForAgentId: undefined,
            },
          ];
    for (const step of steps) {
      if (step.waitForAgentId) {
        const didReachAgentPromptTarget = await this.waitForSessionAgentPromptTarget(
          sessionRecord.sessionId,
          step.waitForAgentId,
        );
        if (!didReachAgentPromptTarget) {
          return false;
        }
      }

      if (step.data !== undefined) {
        await this.backend.writeText(
          sessionRecord.sessionId,
          step.data,
          step.shouldExecute ?? true,
        );
      }

      if (step.postDelayMs && Number.isFinite(step.postDelayMs) && step.postDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, step.postDelayMs));
      }
    }

    return true;
  }

  private getActivitySuppressedUntil(sessionRecord: SessionRecord): number | undefined {
    if (sessionRecord.kind !== "terminal") {
      return undefined;
    }

    const restartSuppressedUntil = this.activitySuppressedUntilBySessionId.get(
      sessionRecord.sessionId,
    );
    if (
      restartSuppressedUntil !== undefined &&
      Number.isFinite(restartSuppressedUntil) &&
      restartSuppressedUntil <= Date.now()
    ) {
      this.activitySuppressedUntilBySessionId.delete(sessionRecord.sessionId);
      logVSmuxDebug("controller.activitySuppression.expired", {
        sessionId: sessionRecord.sessionId,
        suppressedUntil: formatDebugActivityAt(restartSuppressedUntil),
      });
    }

    const createdAtMs = Date.parse(sessionRecord.createdAt);
    const createdAtSuppressedUntil = Number.isFinite(createdAtMs)
      ? createdAtMs + INITIAL_ACTIVITY_SUPPRESSION_MS
      : undefined;
    const effectiveSuppressedUntil = Math.max(
      createdAtSuppressedUntil ?? 0,
      restartSuppressedUntil ?? 0,
    );

    return effectiveSuppressedUntil > 0 ? effectiveSuppressedUntil : undefined;
  }

  private getFullReloadGroupSkippedMessage({
    reloadedCount,
    skippedIndicatorCount,
    skippedUnsupportedCount,
  }: {
    reloadedCount: number;
    skippedIndicatorCount: number;
    skippedUnsupportedCount: number;
  }): string | undefined {
    const skippedReasons: string[] = [];
    if (skippedIndicatorCount > 0) {
      skippedReasons.push(`${String(skippedIndicatorCount)} showing Running or Done indicators`);
    }
    if (skippedUnsupportedCount > 0) {
      skippedReasons.push(
        `${String(skippedUnsupportedCount)} because full reload is only available for ${FULL_RELOAD_SUPPORTED_AGENTS_LABEL} sessions with a visible title`,
      );
    }

    if (skippedReasons.length === 0) {
      return undefined;
    }

    const skippedSummary =
      skippedReasons.length === 1
        ? skippedReasons[0]
        : `${skippedReasons.slice(0, -1).join(", ")} and ${skippedReasons.at(-1)}`;

    if (reloadedCount === 0) {
      return `No sessions were reloaded. Skipped ${skippedSummary}.`;
    }

    return `Reloaded ${String(reloadedCount)} session${reloadedCount === 1 ? "" : "s"}. Skipped ${skippedSummary}.`;
  }

  private async syncKnownSessionActivities(playSound: boolean): Promise<void> {
    await syncKnownSessionActivities(
      this.createSessionActivityContext(),
      this.getAllSessionRecords(),
      playSound,
    );
  }

  private syncSessionActivityState(sessionId: string, playSound: boolean): void {
    const sessionRecord = this.store.getSession(sessionId);
    const sessionSnapshot = this.backend.getSessionSnapshot(sessionId);
    const nextActivity =
      sessionRecord && sessionSnapshot
        ? getEffectiveSessionActivity(
            this.createSessionActivityContext(),
            sessionRecord,
            sessionSnapshot,
          ).activity
        : "idle";
    const previousActivity = this.lastKnownActivityBySessionId.get(sessionId);
    this.recordLastActivityTransition(sessionRecord, previousActivity, nextActivity);
    if (playSound && nextActivity === "attention") {
      if (previousActivity !== undefined && previousActivity !== "attention") {
        this.queueCompletionSound(sessionId);
      }
    } else if (playSound) {
      this.clearPendingCompletionSound(sessionId);
    }

    this.lastKnownActivityBySessionId.set(sessionId, nextActivity);
  }

  private recordLastActivityTransition(
    sessionRecord: SessionRecord | undefined,
    previousActivity: TerminalAgentStatus | undefined,
    nextActivity: TerminalAgentStatus,
  ): void {
    if (!sessionRecord) {
      return;
    }

    if (
      !shouldRecordLastActivityTransition({
        hasCompletedInitialActivityHydration: this.hasCompletedInitialActivityHydration,
        nextActivity,
        previousActivity,
        sessionKind: sessionRecord.kind,
      })
    ) {
      return;
    }

    const activityAt = Date.now();
    if (sessionRecord.kind === "terminal") {
      void this.backend.persistLastTerminalActivityAt(sessionRecord.sessionId, activityAt);
      return;
    }

    this.lastActivityOverrideAtBySessionId.set(sessionRecord.sessionId, activityAt);
    logVSmuxDebug("controller.lastActivityTransitionRecorded", {
      activityAt: new Date(activityAt).toISOString(),
      nextActivity,
      previousActivity,
      sessionId: sessionRecord.sessionId,
    });
  }

  private getLastTerminalActivityAtForSidebar(sessionId: string): number | undefined {
    const sessionRecord = this.store.getSession(sessionId);
    const rawActivityAt = this.getResolvedLastTerminalActivityAtForSidebar(sessionId);
    if (!sessionRecord || sessionRecord.kind !== "terminal") {
      return rawActivityAt;
    }

    const activitySuppressedUntil = this.getActivitySuppressedUntil(sessionRecord);
    if (
      activitySuppressedUntil !== undefined &&
      Number.isFinite(activitySuppressedUntil) &&
      Date.now() < activitySuppressedUntil
    ) {
      if (!this.frozenLastActivityAtBySessionId.has(sessionId)) {
        this.frozenLastActivityAtBySessionId.set(sessionId, null);
        this.lastActivityIgnoreUntilBySessionId.set(sessionId, activitySuppressedUntil);
        logVSmuxDebug("controller.activitySuppression.frozenInitialized", {
          activitySuppressedUntil: formatDebugActivityAt(activitySuppressedUntil),
          fallback: "createdAt",
          rawLastActivityAt: formatDebugActivityAt(rawActivityAt),
          sessionCreatedAt: sessionRecord.createdAt,
          sessionId,
        });
      }

      const frozenActivityAt = this.frozenLastActivityAtBySessionId.get(sessionId) ?? undefined;
      logVSmuxDebug("controller.activitySuppression.lastActivityDecision", {
        activitySuppressedUntil: formatDebugActivityAt(activitySuppressedUntil),
        decision:
          frozenActivityAt === undefined
            ? "fallbackCreatedAtDuringSuppression"
            : "frozenDuringSuppression",
        frozenLastActivityAt: formatDebugActivityAt(frozenActivityAt),
        rawLastActivityAt: formatDebugActivityAt(rawActivityAt),
        sessionCreatedAt: sessionRecord.createdAt,
        sessionId,
      });
      return frozenActivityAt;
    }

    const lastActivityIgnoreUntil = this.lastActivityIgnoreUntilBySessionId.get(sessionId);
    if (
      lastActivityIgnoreUntil !== undefined &&
      Number.isFinite(lastActivityIgnoreUntil) &&
      (rawActivityAt === undefined || rawActivityAt <= lastActivityIgnoreUntil)
    ) {
      const frozenActivityAt = this.frozenLastActivityAtBySessionId.get(sessionId) ?? undefined;
      logVSmuxDebug("controller.activitySuppression.lastActivityDecision", {
        activitySuppressedUntil: formatDebugActivityAt(lastActivityIgnoreUntil),
        decision:
          frozenActivityAt === undefined
            ? "fallbackCreatedAtPendingRealActivity"
            : "frozenPendingRealActivity",
        frozenLastActivityAt: formatDebugActivityAt(frozenActivityAt),
        rawLastActivityAt: formatDebugActivityAt(rawActivityAt),
        sessionCreatedAt: sessionRecord.createdAt,
        sessionId,
      });
      return frozenActivityAt;
    }

    if (this.frozenLastActivityAtBySessionId.has(sessionId)) {
      logVSmuxDebug("controller.activitySuppression.released", {
        ignoredUntil: formatDebugActivityAt(lastActivityIgnoreUntil),
        rawLastActivityAt: formatDebugActivityAt(rawActivityAt),
        sessionId,
      });
    }
    this.frozenLastActivityAtBySessionId.delete(sessionId);
    this.lastActivityIgnoreUntilBySessionId.delete(sessionId);
    return rawActivityAt;
  }

  private getResolvedLastTerminalActivityAtForSidebar(sessionId: string): number | undefined {
    return this.backend.getLastTerminalActivityAt(sessionId);
  }

  private clearPendingCompletionSound(sessionId: string): void {
    const timeout = this.pendingCompletionSoundTimeoutBySessionId.get(sessionId);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.pendingCompletionSoundTimeoutBySessionId.delete(sessionId);
    logVSmuxDebug("controller.completionSound.cleared", {
      sessionId,
    });
  }

  private queueCompletionSound(sessionId: string): void {
    if (!this.getCompletionBellEnabled()) {
      logVSmuxDebug("controller.completionSound.skippedDisabled", {
        sessionId,
      });
      return;
    }

    if (this.pendingCompletionSoundTimeoutBySessionId.has(sessionId)) {
      logVSmuxDebug("controller.completionSound.alreadyQueued", {
        sessionId,
      });
      return;
    }

    logVSmuxDebug("controller.completionSound.queued", {
      delayMs: COMPLETION_SOUND_CONFIRMATION_DELAY_MS,
      sessionId,
      sound: getClampedCompletionSoundSetting(),
    });
    const timeout = setTimeout(() => {
      this.pendingCompletionSoundTimeoutBySessionId.delete(sessionId);
      if (!this.getCompletionBellEnabled()) {
        logVSmuxDebug("controller.completionSound.skippedDisabledAtFire", {
          sessionId,
        });
        return;
      }

      if (this.backend.getSessionSnapshot(sessionId)?.agentStatus !== "attention") {
        logVSmuxDebug("controller.completionSound.skippedNotAttentionAtFire", {
          agentStatus: this.backend.getSessionSnapshot(sessionId)?.agentStatus,
          sessionId,
        });
        return;
      }

      logVSmuxDebug("controller.completionSound.firing", {
        sessionId,
        sound: getClampedCompletionSoundSetting(),
      });
      void this.sidebarProvider.postMessage({
        sound: getClampedCompletionSoundSetting(),
        sessionId,
        type: "playCompletionSound",
      });
      void this.workspacePanel.postMessage({
        sessionId,
        type: "flashCompletionSession",
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
    await persistSessionAgentLaunches(
      this.context,
      this.workspaceId,
      this.sessionAgentLaunchBySessionId,
    );
  }

  private clearPendingForkRename(sessionId: string): void {
    const timeout = this.pendingForkRenameTimeoutBySessionId.get(sessionId);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.pendingForkRenameTimeoutBySessionId.delete(sessionId);
  }

  private scheduleForkRename(sessionId: string, sourceTitle: string): void {
    this.clearPendingForkRename(sessionId);
    const timeout = setTimeout(() => {
      this.pendingForkRenameTimeoutBySessionId.delete(sessionId);
      if (!this.store.getSession(sessionId)) {
        return;
      }

      void this.writeTerminalTextPreservingLastActivity(
        sessionId,
        `/rename fork ${sourceTitle}`,
        true,
      );
    }, FORK_RENAME_DELAY_MS);
    this.pendingForkRenameTimeoutBySessionId.set(sessionId, timeout);
  }

  private async resumeDetachedTerminalSession(sessionRecord: SessionRecord): Promise<void> {
    if (!this.canResumeDetachedTerminalSession(sessionRecord)) {
      return;
    }

    const action =
      this.getProgrammaticResumeAction(sessionRecord) ??
      buildDetachedResumeAction(
        this.sessionAgentLaunchBySessionId.get(sessionRecord.sessionId),
        this.getSidebarAgentIconForSession(sessionRecord.sessionId),
        sessionRecord.title,
        this.terminalTitleBySessionId.get(sessionRecord.sessionId),
      );
    if (!action) {
      return;
    }

    const didResume = await this.runProgrammaticTerminalResume(sessionRecord, action);
    if (!didResume) {
      void vscode.window.showWarningMessage(
        "VSmux launched OpenCode but could not confirm it was ready to resume the session automatically.",
      );
    }
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

  private async acknowledgeSessionAttentionIfNeeded(
    sessionRecord: SessionRecord,
  ): Promise<boolean> {
    if (isT3Session(sessionRecord)) {
      const acknowledgedAttention = this.t3ActivityMonitor.acknowledgeThread(
        sessionRecord.t3.threadId,
      );
      if (acknowledgedAttention) {
        await this.syncKnownSessionActivities(false);
      }
      logVSmuxDebug("controller.acknowledgeSessionAttentionIfNeeded.t3", {
        acknowledgedAttention,
        sessionId: sessionRecord.sessionId,
        threadId: sessionRecord.t3.threadId,
      });
      return acknowledgedAttention;
    }

    const sessionSnapshot = this.backend.getSessionSnapshot(sessionRecord.sessionId);
    if (sessionSnapshot?.agentStatus !== "attention") {
      return false;
    }

    const acknowledgedAttention = await this.backend.acknowledgeAttention(sessionRecord.sessionId);
    logVSmuxDebug("controller.acknowledgeSessionAttentionIfNeeded", {
      acknowledgedAttention,
      sessionId: sessionRecord.sessionId,
    });
    return acknowledgedAttention;
  }

  private createSidebarCommandTerminal(
    name: string,
    options: SidebarCommandTerminalOptions = {},
  ): vscode.Terminal {
    const { closeOnExit = false, command, location = vscode.TerminalLocation.Panel } = options;

    if (closeOnExit && command) {
      const shellPath = getDefaultShell();
      return vscode.window.createTerminal({
        cwd: getDefaultWorkspaceCwd(),
        iconPath: new vscode.ThemeIcon("terminal"),
        isTransient: true,
        location,
        name: `VSmux: ${name}`,
        shellArgs: getCommandTerminalShellArgs(shellPath, command),
        shellPath,
      });
    }

    return vscode.window.createTerminal({
      cwd: getDefaultWorkspaceCwd(),
      iconPath: new vscode.ThemeIcon("terminal"),
      isTransient: true,
      location,
      name: `VSmux: ${name}`,
    });
  }

  private observeSidebarCommandTerminalExit(
    terminal: vscode.Terminal,
    options: {
      disposeTerminalOnExit: boolean;
      playCompletionSound: boolean;
    },
  ): void {
    const interval = setInterval(() => {
      if (!terminal.exitStatus) {
        return;
      }

      clearInterval(interval);
      void this.handleSidebarCommandTerminalExit(options.playCompletionSound).finally(() => {
        if (options.disposeTerminalOnExit) {
          terminal.dispose();
        }
      });
    }, COMMAND_TERMINAL_EXIT_POLL_MS);
  }

  private async handleSidebarCommandTerminalExit(playCompletionSound: boolean): Promise<void> {
    if (!playCompletionSound) {
      return;
    }

    await playCloseTerminalOnExitSound({
      extensionUri: this.context.extensionUri,
      sound: getClampedActionCompletionSoundSetting(),
    });
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
      this.gitActionInProgress,
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
      createDefaultSidebarGitState(getPrimarySidebarGitAction(this.context, this.workspaceId)),
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

    return (
      cached.value.primaryAction !== getPrimarySidebarGitAction(this.context, this.workspaceId)
    );
  }

  private withSidebarGitPreferences(state: SidebarGitState): SidebarGitState {
    return {
      ...state,
      confirmSuggestedCommit: getSidebarGitConfirmSuggestedCommit(this.context, this.workspaceId),
      generateCommitBody: getSidebarGitGenerateCommitBody(this.context, this.workspaceId),
    };
  }

  private getSidebarContainerId(): string {
    return this.context.globalState.get<boolean>(SIDEBAR_LOCATION_IN_SECONDARY_KEY, false)
      ? SECONDARY_SESSIONS_CONTAINER_ID
      : PRIMARY_SESSIONS_CONTAINER_ID;
  }

  private async showSidebarMoveInstructions(): Promise<void> {
    await vscode.commands.executeCommand(
      `workbench.view.extension.${PRIMARY_SESSIONS_CONTAINER_ID}`,
    );
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

  private async waitForSessionAgentPromptTarget(
    sessionId: string,
    expectedAgentId: string,
  ): Promise<boolean> {
    const normalizedExpectedAgentId = expectedAgentId.trim().toLowerCase();
    if (!normalizedExpectedAgentId) {
      return true;
    }

    logVSmuxDebug("controller.waitForSessionAgentPromptTarget.start", {
      expectedAgentId: normalizedExpectedAgentId,
      sessionId,
    });
    const deadlineAt = Date.now() + 15_000;
    while (Date.now() < deadlineAt) {
      const snapshot = this.backend.getSessionSnapshot(sessionId);
      if (snapshot?.agentName?.trim().toLowerCase() === normalizedExpectedAgentId) {
        logVSmuxDebug("controller.waitForSessionAgentPromptTarget.ready", {
          agentName: snapshot.agentName,
          agentStatus: snapshot.agentStatus,
          expectedAgentId: normalizedExpectedAgentId,
          sessionId,
        });
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logVSmuxDebug("controller.waitForSessionAgentPromptTarget.timeout", {
      agentName: this.backend.getSessionSnapshot(sessionId)?.agentName,
      agentStatus: this.backend.getSessionSnapshot(sessionId)?.agentStatus,
      expectedAgentId: normalizedExpectedAgentId,
      sessionId,
    });
    return false;
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

  private describeFocusTraceGroup(group: SessionGroupRecord | undefined) {
    if (!group) {
      return undefined;
    }

    return {
      focusedSessionId: group.snapshot.focusedSessionId,
      groupId: group.groupId,
      sessions: group.snapshot.sessions.map((session, index) => ({
        alias: session.alias,
        displayId: session.displayId,
        index,
        isSleeping: session.isSleeping,
        kind: session.kind,
        sessionId: session.sessionId,
      })),
      title: group.title,
      viewMode: group.snapshot.viewMode,
      visibleCount: group.snapshot.visibleCount,
      visibleSlots: group.snapshot.visibleSessionIds.map((sessionId, slotIndex) => ({
        isFocused: sessionId === group.snapshot.focusedSessionId,
        sessionId,
        slotIndex,
      })),
    };
  }

  private clearObservedSidebarFocusState(): void {
    return;
  }

  private enqueueWorkspaceAutoFocus(
    sessionId: string,
    source: WorkspacePanelAutoFocusRequest["source"],
  ): void {
    this.pendingWorkspaceAutoFocusRequest = {
      requestId: ++this.nextWorkspaceAutoFocusRequestId,
      sessionId,
      source,
    };
  }

  private enqueueWorkspaceAutoFocusForFocusedSession(
    source: WorkspacePanelAutoFocusRequest["source"],
  ): void {
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

  private async requestWorkspaceTerminalScrollToBottom(sessionId: string): Promise<void> {
    await this.workspacePanel.postMessage({
      requestId: ++this.nextWorkspaceScrollToBottomRequestId,
      sessionId,
      type: "scrollTerminalToBottom",
    });
  }

  private async revealWorkspacePanelForSidebarFocus(
    source: "sidebar" | "workspace" | undefined,
  ): Promise<void> {
    const focusPlan = createSessionFocusPlan({
      isWorkspacePanelVisible: this.workspacePanel.isVisible(),
      source,
    });

    if (!focusPlan.shouldRevealWorkspacePanel) {
      return;
    }

    await this.workspacePanel.reveal();
  }

  private async refreshWorkspacePanel(): Promise<void> {
    const startedAt = Date.now();
    const message = await this.createWorkspacePanelMessage("sessionState");
    if (message.type !== "sessionState") {
      await this.workspacePanel.postMessage(message);
      return;
    }
    logVSmuxDebug("controller.refreshWorkspacePanel.prePostMessage", {
      activeGroupId: message.activeGroupId,
      durationMs: Date.now() - startedAt,
      focusedSessionId: message.focusedSessionId,
      paneIds: message.panes.map(
        (pane) => `${pane.sessionId}:${pane.isVisible ? "visible" : "hidden"}`,
      ),
    });
    await this.workspacePanel.postMessage(message);
    logVSmuxDebug("controller.refreshWorkspacePanel.postMessageComplete", {
      durationMs: Date.now() - startedAt,
      focusedSessionId: message.focusedSessionId,
    });
  }

  private async reloadWorkspacePanel(reason: string, preferredSessionId?: string): Promise<void> {
    const autoFocusSessionId = preferredSessionId ?? this.getActiveSnapshot().focusedSessionId;
    if (autoFocusSessionId) {
      this.enqueueWorkspaceAutoFocus(autoFocusSessionId, "reload");
    }
    logVSmuxDebug("controller.reloadWorkspacePanel.start", {
      autoFocusSessionId,
      reason,
      snapshot: this.describeActiveSnapshot(),
    });
    this.workspacePanel.hide();
    await this.refreshWorkspacePanel();
    await this.workspacePanel.reveal();
    logVSmuxDebug("controller.reloadWorkspacePanel.complete", {
      autoFocusSessionId,
      reason,
      snapshot: this.describeActiveSnapshot(),
    });
  }

  private async createWorkspacePanelMessage(
    type: "hydrate" | "sessionState",
  ): Promise<ExtensionToWorkspacePanelMessage> {
    const startedAt = Date.now();
    const workspaceSnapshot = this.store.getSnapshot();
    const activeSnapshot = this.getActiveSnapshot();
    const activeGroupSessions = sortWorkspacePaneSessionRecords(
      getWorkspacePaneSessionRecords(workspaceSnapshot),
      getWorkspacePaneOrderPreference(
        this.context,
        this.workspaceId,
        workspaceSnapshot.activeGroupId,
      ),
    );
    const visibleSessionIdSet = new Set(activeSnapshot.visibleSessionIds);
    const visibleSlotIndexBySessionId = new Map(
      activeSnapshot.visibleSessionIds.map((sessionId, visibleSlotIndex) => [
        sessionId,
        visibleSlotIndex,
      ]),
    );
    const connection = {
      ...(await this.backend.getConnection()),
      workspaceId: this.workspaceId,
    };
    const autoFocusRequest = this.consumeWorkspaceAutoFocusRequest();
    const activeT3Runtime = this.getOrCreateT3Runtime();
    const sessionActivityContext = this.createSessionActivityContext();
    const panes = (
      await Promise.all(
        activeGroupSessions.map(async (sessionRecord) => {
          if (sessionRecord.kind === "terminal") {
            const snapshot = this.backend.getSessionSnapshot(sessionRecord.sessionId);
            const effectiveActivity = snapshot
              ? getEffectiveSessionActivity(sessionActivityContext, sessionRecord, snapshot)
                  .activity
              : "idle";
            return {
              activity: effectiveActivity,
              lifecycleState: snapshot
                ? resolveTerminalSessionLifecycleState({
                    hasLiveRuntime:
                      snapshot.status === "running" &&
                      this.backend.hasLiveTerminal(sessionRecord.sessionId),
                    isSleeping: sessionRecord.isSleeping === true,
                    status: snapshot.status,
                  })
                : resolveTerminalSessionLifecycleState({
                    hasLiveRuntime: false,
                    isSleeping: sessionRecord.isSleeping === true,
                    status: "disconnected",
                  }),
              kind: "terminal" as const,
              isVisible: visibleSessionIdSet.has(sessionRecord.sessionId),
              visibleSlotIndex: visibleSlotIndexBySessionId.get(sessionRecord.sessionId),
              renderNonce: this.getTerminalPaneRenderNonce(sessionRecord.sessionId),
              sessionId: sessionRecord.sessionId,
              sessionRecord,
              snapshot,
              terminalTitle: this.terminalTitleBySessionId.get(sessionRecord.sessionId),
            };
          }

          if (sessionRecord.kind !== "t3") {
            return undefined;
          }

          const t3ActivityState = this.getT3ActivityState(sessionRecord);
          return {
            activity: t3ActivityState.activity,
            lifecycleState: resolveT3SessionLifecycleState({
              isRunning: t3ActivityState.isRunning,
              isSleeping: sessionRecord.isSleeping === true,
            }),
            kind: "t3" as const,
            isVisible: visibleSessionIdSet.has(sessionRecord.sessionId),
            visibleSlotIndex: visibleSlotIndexBySessionId.get(sessionRecord.sessionId),
            renderNonce: this.getT3PaneRenderNonce(sessionRecord.sessionId),
            sessionId: sessionRecord.sessionId,
            sessionRecord,
            html: await this.getT3PaneHtml(sessionRecord, activeT3Runtime),
          };
        }),
      )
    ).filter((pane): pane is NonNullable<typeof pane> => pane !== undefined);
    logVSmuxDebug("controller.createWorkspacePanelMessage.summary", {
      activeGroupId: workspaceSnapshot.activeGroupId,
      autoFocusRequest,
      durationMs: Date.now() - startedAt,
      focusedSessionId: activeSnapshot.focusedSessionId,
      groupSummaries: workspaceSnapshot.groups.map((group) => ({
        focusedSessionId: group.snapshot.focusedSessionId,
        groupId: group.groupId,
        sessionIds: group.snapshot.sessions.map((session) => session.sessionId),
        viewMode: group.snapshot.viewMode,
        visibleCount: group.snapshot.visibleCount,
        visibleSessionIds: [...group.snapshot.visibleSessionIds],
      })),
      paneIds: panes.map((pane) => `${pane.sessionId}:${pane.isVisible ? "visible" : "hidden"}`),
      type,
      viewMode: activeSnapshot.viewMode,
      visibleCount: activeSnapshot.visibleCount,
      visibleSessionIds: activeSnapshot.visibleSessionIds,
      workspaceId: this.workspaceId,
    });
    logAgentTilerFocusTrace("controller.createWorkspacePanelMessage.summary", {
      activeGroupId: workspaceSnapshot.activeGroupId,
      autoFocusRequest,
      focusedSessionId: activeSnapshot.focusedSessionId,
      paneIds: panes.map((pane) => `${pane.sessionId}:${pane.isVisible ? "visible" : "hidden"}`),
      type,
      visibleCount: activeSnapshot.visibleCount,
      visibleSessionIds: [...activeSnapshot.visibleSessionIds],
    });

    if (type === "hydrate") {
      return {
        activeGroupId: workspaceSnapshot.activeGroupId,
        autoFocusRequest,
        connection,
        debuggingMode: getDebuggingMode(),
        focusedSessionId: activeSnapshot.focusedSessionId,
        layoutAppearance: this.getWorkspaceLayoutAppearance(),
        panes,
        terminalAppearance: this.getWorkspaceTerminalAppearance(),
        t3Appearance: this.getWorkspaceT3Appearance(),
        type: "hydrate",
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
      t3Appearance: this.getWorkspaceT3Appearance(),
      type: "sessionState",
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
      fontWeight: getTerminalFontWeight(),
      letterSpacing: getTerminalLetterSpacing(),
      lineHeight: getTerminalLineHeight(),
      scrollToBottomWhenTyping: getTerminalScrollToBottomWhenTyping(),
      xtermFrontendScrollback: getXtermFrontendScrollback(),
    };
  }

  private getWorkspaceT3Appearance() {
    return {
      zoomPercent: getT3ZoomPercent(),
    };
  }

  private getTerminalPaneRenderNonce(sessionId: string): number {
    return this.terminalPaneRenderNonceBySessionId.get(sessionId) ?? 0;
  }

  private bumpTerminalPaneRenderNonce(sessionId: string): void {
    this.terminalPaneRenderNonceBySessionId.set(
      sessionId,
      this.getTerminalPaneRenderNonce(sessionId) + 1,
    );
  }

  private getT3PaneRenderNonce(sessionId: string): number {
    return this.t3PaneRenderNonceBySessionId.get(sessionId) ?? 0;
  }

  private bumpT3PaneRenderNonce(sessionId: string): void {
    this.t3PaneRenderNonceBySessionId.set(sessionId, this.getT3PaneRenderNonce(sessionId) + 1);
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
    return this.pendingT3SessionIds.size > 0 ? ["t3"] : [];
  }

  private async finishCreatingT3Session(sessionId: string, startupCommand: string): Promise<void> {
    try {
      const runtime = this.t3Runtime ?? new T3RuntimeManager(this.context);
      this.t3Runtime = runtime;
      const sessionMetadata = await runtime.createThreadSession(
        undefined,
        startupCommand,
        "T3 Code",
      );
      const sessionRecord = this.store.getSession(sessionId);
      if (
        !sessionRecord ||
        sessionRecord.kind !== "t3" ||
        !this.pendingT3SessionIds.has(sessionId)
      ) {
        return;
      }

      this.pendingT3SessionIds.delete(sessionId);
      this.invalidateT3PaneHtml(sessionId);
      await this.store.setT3SessionMetadata(sessionId, sessionMetadata);
      const refreshedSession = this.store.getSession(sessionId);
      if (refreshedSession && isT3Session(refreshedSession)) {
        await this.syncT3SessionTitleFromRuntime(refreshedSession, runtime);
      }
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
              !(session.kind === "t3" && isPendingT3Metadata(session.t3)),
          )
            ? group.snapshot.focusedSessionId
            : undefined,
        sessions: group.snapshot.sessions.filter(
          (session) => !(session.kind === "t3" && isPendingT3Metadata(session.t3)),
        ),
        visibleSessionIds: group.snapshot.visibleSessionIds.filter((sessionId) =>
          group.snapshot.sessions.some(
            (session) =>
              session.sessionId === sessionId &&
              !(session.kind === "t3" && isPendingT3Metadata(session.t3)),
          ),
        ),
      },
    }));
    const hasChanges = nextGroups.some(
      (group, index) =>
        group.snapshot.sessions.length !== snapshot.groups[index]?.snapshot.sessions.length,
    );
    if (!hasChanges) {
      return;
    }

    await this.store.replaceSnapshot({
      ...snapshot,
      groups: nextGroups,
    });
  }

  private async requestT3SessionBrowserAccess(sessionId: string): Promise<void> {
    const sessionRecord = await this.resolveOrCreateBrowserAccessT3Session(sessionId);
    if (!sessionRecord) {
      void vscode.window.showErrorMessage("Could not start T3 Code for remote access.");
      return;
    }

    await this.publishSharedT3BrowserAccessState(sessionRecord);
    const accessLink = await this.getT3SessionBrowserAccessLink();
    await this.sidebarProvider.postMessage({
      endpointUrl: accessLink.endpointUrl,
      localUrl: accessLink.localUrl,
      mode: accessLink.mode,
      note: accessLink.note,
      sessionId: sessionRecord.sessionId,
      sessionTitle: sessionRecord.title,
      tailscaleEnabled: accessLink.tailscaleEnabled,
      type: "showT3BrowserAccess",
    });
  }

  private async openT3SessionBrowserAccessLink(url: string): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  private async getT3SessionBrowserAccessLink() {
    const localUrl = await this.workspaceAssetServer.getT3BrowserAccessUrl();
    return resolveT3BrowserAccessLink(localUrl);
  }

  private resolveBrowserAccessT3Session(preferredSessionId?: string): T3SessionRecord | undefined {
    const candidateSessionIds = new Set<string>();
    if (preferredSessionId) {
      candidateSessionIds.add(preferredSessionId);
    }
    const focusedSessionId = this.getActiveSnapshot().focusedSessionId;
    if (focusedSessionId) {
      candidateSessionIds.add(focusedSessionId);
    }

    for (const sessionId of candidateSessionIds) {
      const sessionRecord = this.store.getSession(sessionId);
      if (sessionRecord && isT3Session(sessionRecord)) {
        return sessionRecord;
      }
    }

    return this.getAllSessionRecords().find((sessionRecord): sessionRecord is T3SessionRecord =>
      isT3Session(sessionRecord),
    );
  }

  private async resolveOrCreateBrowserAccessT3Session(
    preferredSessionId?: string,
  ): Promise<T3SessionRecord | undefined> {
    const existingSession = this.resolveBrowserAccessT3Session(preferredSessionId);
    if (existingSession) {
      return existingSession;
    }

    const startupCommand = getSidebarAgentButtonById("t3")?.command?.trim() ?? "npx --yes t3";
    const createdSession = await this.createT3Session(startupCommand);
    if (createdSession) {
      return createdSession;
    }

    return this.resolveBrowserAccessT3Session(preferredSessionId);
  }

  private async createT3BrowserAccessDocument(
    requestOrigin: string,
    preferredSessionId?: string,
  ): Promise<string | undefined> {
    const sharedBrowserAccessState = await readSharedT3BrowserAccessState(this.context);
    if (sharedBrowserAccessState) {
      return this.createSharedT3BrowserAccessDocument(requestOrigin, sharedBrowserAccessState);
    }

    const sessionRecord = await this.resolveOrCreateBrowserAccessT3Session(preferredSessionId);
    if (!sessionRecord) {
      return undefined;
    }

    await this.ensureT3Ready(sessionRecord);
    const runtime = this.getOrCreateT3Runtime();
    const resolvedSessionRecord = this.store.getSession(sessionRecord.sessionId);
    if (!resolvedSessionRecord || !isT3Session(resolvedSessionRecord)) {
      return undefined;
    }
    const embedBootstrap = await runtime.createEmbedBootstrap(
      resolvedSessionRecord.t3.workspaceRoot,
    );
    this.workspaceAssetServer.setT3ProxyAuthorizationToken(embedBootstrap.ownerBearerToken);
    return createT3BrowserAccessSource(this.context, resolvedSessionRecord, {
      assetServerOrigin: requestOrigin,
      browserBootstrapToken: embedBootstrap.browserBootstrapToken,
    });
  }

  private async createSharedT3BrowserAccessDocument(
    requestOrigin: string,
    sharedBrowserAccessState: NonNullable<
      Awaited<ReturnType<typeof readSharedT3BrowserAccessState>>
    >,
  ): Promise<string | undefined> {
    const runtime = this.getOrCreateT3Runtime();
    const embedBootstrap = await runtime.createEmbedBootstrap(
      sharedBrowserAccessState.workspaceRoot,
    );
    this.workspaceAssetServer.setT3ProxyAuthorizationToken(embedBootstrap.ownerBearerToken);
    return createT3BrowserAccessSource(
      this.context,
      {
        alias: "",
        column: 0,
        createdAt: sharedBrowserAccessState.updatedAt,
        displayId: "",
        kind: "t3",
        row: 0,
        sessionId: sharedBrowserAccessState.sessionId,
        slotIndex: 0,
        t3: {
          projectId: "",
          serverOrigin: runtime.getServerOrigin(),
          threadId: sharedBrowserAccessState.threadId,
          workspaceRoot: sharedBrowserAccessState.workspaceRoot,
        },
        title: sharedBrowserAccessState.sessionTitle,
      },
      {
        assetServerOrigin: requestOrigin,
        browserBootstrapToken: embedBootstrap.browserBootstrapToken,
      },
    );
  }

  private async publishSharedT3BrowserAccessState(sessionRecord: T3SessionRecord): Promise<void> {
    await writeSharedT3BrowserAccessState(this.context, {
      sessionId: sessionRecord.sessionId,
      sessionTitle: sessionRecord.title,
      threadId: sessionRecord.t3.threadId,
      updatedAt: new Date().toISOString(),
      workspaceRoot: sessionRecord.t3.workspaceRoot,
    });
  }

  private async getT3PaneHtml(
    sessionRecord: T3SessionRecord,
    runtime: T3RuntimeManager,
  ): Promise<string> {
    const cacheKey = this.getT3PaneHtmlCacheKey(sessionRecord);
    const cached = this.t3PaneHtmlBySessionId.get(sessionRecord.sessionId);
    if (cached?.cacheKey === cacheKey) {
      logVSmuxDebug("controller.t3PaneHtml.cacheHit", {
        cacheKey,
        renderNonce: this.getT3PaneRenderNonce(sessionRecord.sessionId),
        sessionId: sessionRecord.sessionId,
        threadId: sessionRecord.t3.threadId,
      });
      return cached.html;
    }

    const html =
      this.pendingT3SessionIds.has(sessionRecord.sessionId) || isPendingT3Metadata(sessionRecord.t3)
        ? createPendingT3IframeSource(sessionRecord.title)
        : await createT3IframeSource(
            this.context,
            sessionRecord,
            this.workspaceAssetServer,
            runtime,
          );

    this.t3PaneHtmlBySessionId.set(sessionRecord.sessionId, { cacheKey, html });
    logVSmuxDebug("controller.t3PaneHtml.cacheMiss", {
      cacheKey,
      renderNonce: this.getT3PaneRenderNonce(sessionRecord.sessionId),
      sessionId: sessionRecord.sessionId,
      threadId: sessionRecord.t3.threadId,
    });
    return html;
  }

  private getT3PaneHtmlCacheKey(sessionRecord: T3SessionRecord): string {
    if (
      this.pendingT3SessionIds.has(sessionRecord.sessionId) ||
      isPendingT3Metadata(sessionRecord.t3)
    ) {
      return `pending:${sessionRecord.sessionId}`;
    }

    return [
      "ready",
      sessionRecord.sessionId,
      sessionRecord.t3.projectId,
      sessionRecord.t3.workspaceRoot,
      sessionRecord.t3.serverOrigin,
    ].join(":");
  }

  private invalidateT3PaneHtml(sessionId: string): void {
    this.t3PaneHtmlBySessionId.delete(sessionId);
  }

  private async resolveWorkspaceClipboardImagePath(input: {
    path: string;
    requestId: number;
    sessionId: string;
    type: "resolveClipboardImagePath";
  }): Promise<void> {
    const normalizedPath = normalizeClipboardImagePath(input.path);
    const responseBase = {
      path: normalizedPath,
      requestId: input.requestId,
      sessionId: input.sessionId,
      type: "resolveClipboardImagePathResult" as const,
    };

    if (!looksLikeClipboardImagePath(normalizedPath)) {
      logVSmuxDebug("controller.resolveClipboardImagePath.unsupported", responseBase);
      await this.workspacePanel.postMessage({
        ...responseBase,
        error: "Clipboard path is not a supported image file.",
      });
      return;
    }

    try {
      const file = await readFile(normalizedPath);
      const mimeType = inferClipboardImageMimeType(normalizedPath);
      logVSmuxDebug("controller.resolveClipboardImagePath.success", {
        ...responseBase,
        byteLength: file.byteLength,
        mimeType,
      });
      await this.workspacePanel.postMessage({
        ...responseBase,
        buffer: file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
        mimeType,
        name: path.basename(normalizedPath),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logVSmuxDebug("controller.resolveClipboardImagePath.error", {
        ...responseBase,
        error: errorMessage,
      });
      await this.workspacePanel.postMessage({
        ...responseBase,
        error: errorMessage,
      });
    }
  }

  private async readWorkspaceNativeClipboardPayload(input: {
    requestId: number;
    sessionId: string;
    type: "readNativeClipboardPayload";
  }): Promise<void> {
    const responseBase = {
      requestId: input.requestId,
      sessionId: input.sessionId,
      type: "readNativeClipboardPayloadResult" as const,
    };

    try {
      const payload = await readNativeClipboardPayloadFromHost();
      logVSmuxDebug("controller.readNativeClipboardPayload.success", {
        ...responseBase,
        fileCount: payload.files.length,
        fileNames: payload.files.map((file) => file.name),
        source: payload.source,
        textLength: payload.text.length,
      });
      await this.workspacePanel.postMessage({
        ...responseBase,
        files: payload.files.map((file) => ({
          buffer: toArrayBuffer(file.buffer),
          name: file.name,
          type: file.type,
        })),
        source: payload.source,
        text: payload.text,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logVSmuxDebug("controller.readNativeClipboardPayload.error", {
        ...responseBase,
        error: errorMessage,
      });
      await this.workspacePanel.postMessage({
        ...responseBase,
        error: errorMessage,
        files: [],
        text: "",
      });
    }
  }

  private async reloadT3Session(
    sessionId: string,
    reason: string,
    options?: { autoFocus?: boolean },
  ): Promise<void> {
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || !isT3Session(sessionRecord)) {
      logVSmuxDebug("controller.reloadT3Session.ignored", {
        reason: "sessionUnavailable",
        requestedReason: reason,
        sessionId,
      });
      return;
    }

    const shouldAutoFocus = options?.autoFocus ?? true;
    if (shouldAutoFocus) {
      this.enqueueWorkspaceAutoFocus(sessionId, "reload");
    }
    this.invalidateT3PaneHtml(sessionId);
    this.bumpT3PaneRenderNonce(sessionId);
    logVSmuxDebug("controller.reloadT3Session.start", {
      reason,
      renderNonce: this.getT3PaneRenderNonce(sessionId),
      sessionId,
      shouldAutoFocus,
      threadId: sessionRecord.t3.threadId,
    });
    await this.refreshWorkspacePanel();
    const refreshedSessionRecord = this.store.getSession(sessionId);
    logVSmuxDebug("controller.reloadT3Session.complete", {
      reason,
      renderNonce: this.getT3PaneRenderNonce(sessionId),
      sessionId,
      shouldAutoFocus,
      threadId:
        refreshedSessionRecord && isT3Session(refreshedSessionRecord)
          ? refreshedSessionRecord.t3.threadId
          : undefined,
    });
  }

  private async preserveT3SessionBindingByCreatingSiblingSession(
    sessionRecord: T3SessionRecord,
    threadId: string,
    title?: string,
  ): Promise<boolean> {
    const nextMetadata = {
      ...sessionRecord.t3,
      threadId,
    };
    const existingSession = this.findBoundT3Session(nextMetadata, {
      excludeSessionId: sessionRecord.sessionId,
    });
    const normalizedTitle = normalizeTerminalTitle(title);

    logVSmuxDebug("controller.t3SessionBinding.threadNavigationDetected", {
      currentSessionId: sessionRecord.sessionId,
      currentThreadId: sessionRecord.t3.threadId,
      nextThreadId: threadId,
      reusedSessionId: existingSession?.sessionId,
      title: normalizedTitle,
    });

    let targetSessionId = existingSession?.sessionId;
    if (existingSession) {
      if (normalizedTitle) {
        await this.applyT3SessionTitle(existingSession.sessionId, normalizedTitle);
      }
      await this.focusSession(existingSession.sessionId, "workspace");
    } else {
      const createdSession = await this.createBoundT3Session(nextMetadata, normalizedTitle);
      targetSessionId = createdSession?.sessionId;
      if (createdSession && !normalizedTitle) {
        await this.syncT3SessionTitleFromRuntime(createdSession);
      }
    }

    await this.reloadT3Session(sessionRecord.sessionId, "thread-switch-restored-binding", {
      autoFocus: false,
    });

    if (!targetSessionId) {
      logVSmuxDebug("controller.t3SessionBinding.threadNavigationIgnored", {
        reason: "targetSessionUnavailable",
        sessionId: sessionRecord.sessionId,
        threadId,
      });
      return false;
    }

    await this.syncKnownSessionActivities(false);
    await this.afterStateChange();
    return true;
  }

  private async handleWorkspaceT3ThreadChanged(
    sessionId: string,
    threadId: string,
    title?: string,
  ): Promise<void> {
    const normalizedThreadId = threadId.trim();
    const normalizedTitle = normalizeTerminalTitle(title);
    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || !isT3Session(sessionRecord) || isPendingT3Metadata(sessionRecord.t3)) {
      logVSmuxDebug("controller.t3SessionTitle.threadChangedIgnored", {
        reason: "sessionUnavailable",
        sessionId,
        threadId: normalizedThreadId,
        title: normalizedTitle,
      });
      return;
    }

    if (!normalizedThreadId) {
      logVSmuxDebug("controller.t3SessionTitle.threadChangedIgnored", {
        reason: "emptyThreadId",
        sessionId,
        title: normalizedTitle,
      });
      return;
    }

    const threadChanged = normalizedThreadId !== sessionRecord.t3.threadId;
    let mutated = false;

    if (threadChanged) {
      const handledByBindingPreservation =
        await this.preserveT3SessionBindingByCreatingSiblingSession(
          sessionRecord,
          normalizedThreadId,
          normalizedTitle,
        );
      logVSmuxDebug("controller.t3SessionTitle.threadChanged", {
        handledByBindingPreservation,
        nextThreadId: normalizedThreadId,
        previousThreadId: sessionRecord.t3.threadId,
        sessionId,
        title: normalizedTitle,
      });
      return;
    }

    const refreshedSession = this.store.getSession(sessionId);
    if (
      !refreshedSession ||
      !isT3Session(refreshedSession) ||
      isPendingT3Metadata(refreshedSession.t3)
    ) {
      return;
    }

    if (normalizedTitle) {
      if (await this.applyT3SessionTitle(sessionId, normalizedTitle)) {
        mutated = true;
      }
    } else if (threadChanged) {
      if (await this.applyT3SessionTitle(sessionId, undefined)) {
        mutated = true;
      }
      if (await this.syncT3SessionTitleFromRuntime(refreshedSession)) {
        mutated = true;
      }
    }

    if (!mutated) {
      logVSmuxDebug("controller.t3SessionTitle.threadChangedIgnored", {
        reason: "noMutation",
        sessionId,
        threadId: normalizedThreadId,
        title: normalizedTitle,
      });
      return;
    }

    await this.syncKnownSessionActivities(false);
    await this.afterStateChange();
  }

  private async applyT3SessionTitle(
    sessionId: string,
    title: string | undefined,
  ): Promise<boolean> {
    const normalizedTitle = normalizeTerminalTitle(title);
    const previousLiveTitle = this.terminalTitleBySessionId.get(sessionId);
    let persistedTitleChanged = false;
    const sessionRecord = this.store.getSession(sessionId);
    if (
      normalizedTitle &&
      sessionRecord &&
      isT3Session(sessionRecord) &&
      shouldAutoPersistT3SessionTitle({
        nextLiveTitle: normalizedTitle,
        persistedTitle: sessionRecord.title,
        previousLiveTitle,
      })
    ) {
      persistedTitleChanged = await this.store.setSessionTitle(sessionId, normalizedTitle);
    }

    if (!normalizedTitle) {
      if (
        sessionRecord &&
        isT3Session(sessionRecord) &&
        shouldResetAutoPersistedT3SessionTitle({
          persistedTitle: sessionRecord.title,
          previousLiveTitle,
        })
      ) {
        persistedTitleChanged = await this.store.setSessionTitle(sessionId, "T3 Code");
      }
      logVSmuxDebug("controller.t3SessionTitle.empty", {
        previousLiveTitle,
        resetPersistedTitle: persistedTitleChanged,
        sessionId,
        storedTitle: sessionRecord?.title,
      });
      if (this.terminalTitleBySessionId.delete(sessionId)) {
        return true;
      }
      return persistedTitleChanged;
    }

    if (this.terminalTitleBySessionId.get(sessionId) === normalizedTitle) {
      logVSmuxDebug("controller.t3SessionTitle.unchanged", {
        normalizedTitle,
        persistedTitleChanged,
        previousLiveTitle,
        sessionId,
        storedTitle: sessionRecord?.title,
      });
      return persistedTitleChanged;
    }

    this.terminalTitleBySessionId.set(sessionId, normalizedTitle);
    logVSmuxDebug("controller.t3SessionTitle.applied", {
      normalizedTitle,
      persistedTitleChanged,
      previousLiveTitle,
      sessionId,
      storedTitle: sessionRecord?.title,
    });
    return true;
  }

  private async syncT3SessionTitleFromRuntime(
    sessionRecord: T3SessionRecord,
    runtime?: T3RuntimeManager,
  ): Promise<boolean> {
    if (isPendingT3Metadata(sessionRecord.t3)) {
      return false;
    }

    const activeRuntime = runtime ?? this.getOrCreateT3Runtime();

    try {
      const threadTitle = await activeRuntime.getThreadTitle(sessionRecord.t3.threadId);
      logVSmuxDebug("controller.t3SessionTitle.runtimeFetched", {
        sessionId: sessionRecord.sessionId,
        threadId: sessionRecord.t3.threadId,
        threadTitle,
      });
      return await this.applyT3SessionTitle(sessionRecord.sessionId, threadTitle);
    } catch (error) {
      logVSmuxDebug("controller.syncT3SessionTitleFromRuntime.error", {
        error: getErrorMessage(error),
        sessionId: sessionRecord.sessionId,
        threadId: sessionRecord.t3.threadId,
      });
      return false;
    }
  }

  private async syncT3SessionTitlesFromMonitor(): Promise<boolean> {
    let mutated = false;
    for (const sessionRecord of this.getAllSessionRecords()) {
      if (!isT3Session(sessionRecord) || isPendingT3Metadata(sessionRecord.t3)) {
        continue;
      }

      const threadTitle = this.t3ActivityMonitor.getThreadTitle(sessionRecord.t3.threadId);
      logVSmuxDebug("controller.t3SessionTitle.monitorObserved", {
        activity: this.t3ActivityMonitor.getThreadActivity(sessionRecord.t3.threadId)?.activity,
        currentLiveTitle: this.terminalTitleBySessionId.get(sessionRecord.sessionId),
        sessionId: sessionRecord.sessionId,
        storedTitle: sessionRecord.title,
        threadId: sessionRecord.t3.threadId,
        threadTitle,
      });
      if (await this.applyT3SessionTitle(sessionRecord.sessionId, threadTitle)) {
        mutated = true;
      }
    }

    return mutated;
  }

  private getOrCreateT3Runtime(): T3RuntimeManager {
    this.t3Runtime ??= new T3RuntimeManager(this.context);
    return this.t3Runtime;
  }
}

type TerminalSurfaceEnsureResult = "created-terminal" | "existing-live-terminal" | "non-terminal";

function createPendingT3Metadata(serverOrigin: string) {
  const pendingId = `pending-${randomUUID()}`;
  return {
    projectId: pendingId,
    serverOrigin,
    threadId: pendingId,
    workspaceRoot: getDefaultWorkspaceCwd(),
  };
}

function isPendingT3Metadata(metadata: T3SessionRecord["t3"]): boolean {
  return metadata.projectId.startsWith("pending-") && metadata.threadId.startsWith("pending-");
}

function getArchivedSessionRecord(
  sessionRecord: SessionRecord,
  liveTitle: string | undefined,
): SessionRecord {
  if (sessionRecord.kind !== "t3") {
    return sessionRecord;
  }

  const normalizedLiveTitle = normalizeTerminalTitle(liveTitle);
  if (!normalizedLiveTitle || isDefaultT3SessionTitle(sessionRecord.title)) {
    if (!normalizedLiveTitle) {
      return sessionRecord;
    }

    return {
      ...sessionRecord,
      title: normalizedLiveTitle,
    };
  }

  return sessionRecord;
}

function haveSameT3SessionMetadata(
  left: T3SessionRecord["t3"],
  right: T3SessionRecord["t3"],
): boolean {
  return (
    left.projectId === right.projectId &&
    left.serverOrigin === right.serverOrigin &&
    left.threadId === right.threadId &&
    left.workspaceRoot === right.workspaceRoot
  );
}

function cloneWorkspaceSnapshot(
  snapshot: GroupedSessionWorkspaceSnapshot,
): GroupedSessionWorkspaceSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as GroupedSessionWorkspaceSnapshot;
}

function parseSidebarCommitDraft(message: string): { body: string; subject: string } | undefined {
  const lines = message.split(/\r?\n/g).map((line) => line.replace(/\s+$/g, ""));
  const subjectLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (subjectLineIndex < 0) {
    return undefined;
  }

  const subject = lines[subjectLineIndex]?.trim();
  if (!subject) {
    return undefined;
  }

  return {
    body: lines
      .slice(subjectLineIndex + 1)
      .join("\n")
      .trim(),
    subject,
  };
}

function compareSidebarDaemonSessions(
  left: SidebarDaemonSessionItem,
  right: SidebarDaemonSessionItem,
): number {
  if (left.isCurrentWorkspace !== right.isCurrentWorkspace) {
    return left.isCurrentWorkspace ? -1 : 1;
  }

  const statusPriority =
    getSidebarDaemonStatusPriority(left.status) - getSidebarDaemonStatusPriority(right.status);
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

function compareSidebarT3Sessions(left: SidebarT3SessionItem, right: SidebarT3SessionItem): number {
  if (left.isCurrentWorkspace !== right.isCurrentWorkspace) {
    return left.isCurrentWorkspace ? -1 : 1;
  }

  if (left.isFocused !== right.isFocused) {
    return left.isFocused ? -1 : 1;
  }

  if (left.isRunning !== right.isRunning) {
    return left.isRunning ? -1 : 1;
  }

  if (left.isSleeping !== right.isSleeping) {
    return left.isSleeping ? 1 : -1;
  }

  const lastInteractionComparison = (right.lastInteractionAt ?? "").localeCompare(
    left.lastInteractionAt ?? "",
  );
  if (lastInteractionComparison !== 0) {
    return lastInteractionComparison;
  }

  const titleComparison = (left.title ?? left.sessionId).localeCompare(
    right.title ?? right.sessionId,
  );
  if (titleComparison !== 0) {
    return titleComparison;
  }

  return left.sessionId.localeCompare(right.sessionId);
}

function getSidebarDaemonStatusPriority(status: SidebarDaemonSessionItem["status"]): number {
  switch (status) {
    case "running":
      return 0;
    case "starting":
      return 1;
    case "error":
      return 2;
    case "disconnected":
      return 3;
    case "exited":
      return 4;
    default:
      return 5;
  }
}

function formatDebugActivityAt(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return new Date(value).toISOString();
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

function shouldFocusBeforeLaunchingSidebarAgent(): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  const shellName = path.basename(getDefaultShell()).toLowerCase();
  return (
    shellName === "powershell.exe" ||
    shellName === "powershell" ||
    shellName === "pwsh.exe" ||
    shellName === "pwsh"
  );
}

function shouldUseExplicitPowerShellEnter(): boolean {
  return shouldFocusBeforeLaunchingSidebarAgent();
}

function enrichSidebarOrderTraceDetails(workspaceId: string, details: unknown): unknown {
  const baseDetails = {
    projectTitle: getVscodeWorkspaceLogLabel(),
    tag: SIDEBAR_ORDER_REPRO_TAG,
    workspaceId,
  };

  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {
      ...baseDetails,
      details,
    };
  }

  return {
    ...baseDetails,
    ...details,
  };
}

function sendTerminalText(terminal: vscode.Terminal, data: string, shouldExecute = true): void {
  if (shouldExecute && shouldUseExplicitPowerShellEnter()) {
    terminal.sendText(data, false);
    terminal.sendText("\r", false);
    return;
  }

  terminal.sendText(data, shouldExecute);
}

function normalizeClipboardImagePath(inputPath: string): string {
  const trimmedPath = inputPath.trim();
  if (trimmedPath.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(trimmedPath).pathname);
    } catch {
      return trimmedPath;
    }
  }

  return trimmedPath;
}

function looksLikeClipboardImagePath(inputPath: string): boolean {
  return inferClipboardImageMimeType(inputPath) !== undefined;
}

function inferClipboardImageMimeType(inputPath: string): string | undefined {
  switch (path.extname(normalizeClipboardImagePath(inputPath)).toLowerCase()) {
    case ".apng":
      return "image/apng";
    case ".avif":
      return "image/avif";
    case ".bmp":
      return "image/bmp";
    case ".gif":
      return "image/gif";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return undefined;
  }
}

type NativeClipboardFilePayload = {
  buffer: Uint8Array;
  name: string;
  type: string;
};

type NativeClipboardPayload = {
  files: NativeClipboardFilePayload[];
  source: string;
  text: string;
};

type MacOSNativeClipboardSnapshot = {
  filePaths?: unknown;
  imageBase64?: unknown;
  imageMimeType?: unknown;
  imageName?: unknown;
  text?: unknown;
};

async function readNativeClipboardPayloadFromHost(): Promise<NativeClipboardPayload> {
  if (process.platform === "darwin") {
    return readMacOSNativeClipboardPayload();
  }

  return {
    files: [],
    source: `unsupported-platform:${process.platform}`,
    text: "",
  };
}

async function readMacOSNativeClipboardPayload(): Promise<NativeClipboardPayload> {
  const { stdout } = await execFileAsync(
    "swift",
    ["-e", READ_MACOS_NATIVE_CLIPBOARD_SWIFT_SOURCE],
    {
      maxBuffer: MAX_NATIVE_CLIPBOARD_OUTPUT_BYTES,
    },
  );
  const parsed = parseMacOSNativeClipboardSnapshot(stdout);
  const files: NativeClipboardFilePayload[] = [];

  if (typeof parsed.imageBase64 === "string" && parsed.imageBase64.length > 0) {
    const imageBuffer = Buffer.from(parsed.imageBase64, "base64");
    if (imageBuffer.byteLength > 0) {
      files.push({
        buffer: imageBuffer,
        name:
          typeof parsed.imageName === "string" && parsed.imageName.length > 0
            ? parsed.imageName
            : "clipboard-image.png",
        type:
          typeof parsed.imageMimeType === "string" && parsed.imageMimeType.length > 0
            ? parsed.imageMimeType
            : "image/png",
      });
    }
  }

  if (Array.isArray(parsed.filePaths)) {
    for (const candidatePath of parsed.filePaths) {
      if (typeof candidatePath !== "string" || candidatePath.trim().length === 0) {
        continue;
      }

      const normalizedPath = normalizeClipboardImagePath(candidatePath);
      if (!looksLikeClipboardImagePath(normalizedPath)) {
        continue;
      }

      try {
        const fileBuffer = await readFile(normalizedPath);
        files.push({
          buffer: fileBuffer,
          name: path.basename(normalizedPath),
          type: inferClipboardImageMimeType(normalizedPath) ?? "application/octet-stream",
        });
      } catch {
        continue;
      }
    }
  }

  return {
    files,
    source: "macos-swift",
    text: typeof parsed.text === "string" ? parsed.text : "",
  };
}

function parseMacOSNativeClipboardSnapshot(output: string): MacOSNativeClipboardSnapshot {
  const trimmedOutput = output.trim();
  if (!trimmedOutput) {
    return {};
  }

  const parsed = JSON.parse(trimmedOutput) as MacOSNativeClipboardSnapshot;
  return parsed && typeof parsed === "object" ? parsed : {};
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return Uint8Array.from(view).buffer;
}

const READ_MACOS_NATIVE_CLIPBOARD_SWIFT_SOURCE = String.raw`
import AppKit
import Foundation

let pasteboard = NSPasteboard.general
var result: [String: Any] = [
  "filePaths": [],
  "text": pasteboard.string(forType: .string) ?? "",
]

if let urls = pasteboard.readObjects(forClasses: [NSURL.self], options: nil) as? [URL] {
  result["filePaths"] = urls.filter { $0.isFileURL }.map { $0.path }
}

func setImagePayload(_ data: Data, name: String, mimeType: String) {
  result["imageBase64"] = data.base64EncodedString()
  result["imageMimeType"] = mimeType
  result["imageName"] = name
}

if let pngData = pasteboard.data(forType: .png), !pngData.isEmpty {
  setImagePayload(pngData, name: "clipboard-image.png", mimeType: "image/png")
} else if let tiffData = pasteboard.data(forType: .tiff),
          let bitmap = NSBitmapImageRep(data: tiffData),
          let pngData = bitmap.representation(using: .png, properties: [:]),
          !pngData.isEmpty {
  setImagePayload(pngData, name: "clipboard-image.png", mimeType: "image/png")
} else if let images = pasteboard.readObjects(forClasses: [NSImage.self], options: nil) as? [NSImage],
          let image = images.first,
          let tiffData = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiffData),
          let pngData = bitmap.representation(using: .png, properties: [:]),
          !pngData.isEmpty {
  setImagePayload(pngData, name: "clipboard-image.png", mimeType: "image/png")
}

let json = try JSONSerialization.data(withJSONObject: result, options: [])
if let output = String(data: json, encoding: .utf8) {
  print(output)
}
`;
