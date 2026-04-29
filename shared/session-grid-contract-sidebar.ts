import type { CompletionSoundSetting } from "./completion-sound";
import type { SidebarAgentButton, SidebarAgentIcon } from "./sidebar-agents";
import type { SidebarCommandIcon } from "./sidebar-command-icons";
import type { WorkspaceDockIcon } from "./workspace-dock-icons";
import type {
  SidebarActionType,
  SidebarCommandButton,
  SidebarCommandRunMode,
} from "./sidebar-commands";
import type { SidebarGitAction, SidebarGitState } from "./sidebar-git";
import type { zmuxSettings } from "./zmux-settings";
import type { SidebarPinnedPrompt } from "./sidebar-pinned-prompts";
import type {
  SessionLifecycleState,
  SessionGridSnapshot,
  SidebarTheme,
  TerminalViewMode,
  VisibleSessionCount,
} from "./session-grid-contract-core";

export type SidebarCollapsibleSection = "actions" | "agents";

export type SidebarSectionVisibility = {
  actions: boolean;
  agents: boolean;
  browsers: boolean;
  git: boolean;
};

export type SidebarSectionCollapseState = {
  actions: boolean;
  agents: boolean;
};

export type SidebarActiveSessionsSortMode = "manual" | "lastActivity";

export function createDefaultSidebarSectionVisibility(): SidebarSectionVisibility {
  return {
    actions: true,
    agents: true,
    browsers: true,
    git: true,
  };
}

export function createDefaultSidebarSectionCollapseState(): SidebarSectionCollapseState {
  return {
    actions: false,
    agents: false,
  };
}

export type SidebarSessionItem = {
  kind?: "browser" | "workspace";
  sessionKind?: "browser" | "terminal" | "t3";
  activity: "idle" | "working" | "attention";
  activityLabel?: string;
  agentIcon?: SidebarAgentIcon;
  firstUserMessage?: string;
  isGeneratingFirstPromptTitle?: boolean;
  isReloading?: boolean;
  lifecycleState?: SessionLifecycleState;
  isFavorite?: boolean;
  lastInteractionAt?: string;
  sessionId: string;
  sessionNumber?: string;
  primaryTitle?: string;
  isPrimaryTitleTerminalTitle?: boolean;
  terminalTitle?: string;
  alias: string;
  shortcutLabel: string;
  row: number;
  column: number;
  isFocused: boolean;
  isSleeping?: boolean;
  isVisible: boolean;
  isRunning: boolean;
  detail?: string;
};

export function getSidebarSessionLifecycleState(
  session: Pick<SidebarSessionItem, "lifecycleState" | "isRunning" | "isSleeping">,
): SessionLifecycleState {
  if (session.lifecycleState) {
    return session.lifecycleState;
  }

  if (session.isSleeping) {
    return "sleeping";
  }

  return session.isRunning ? "running" : "done";
}

export type SidebarPreviousSessionItem = SidebarSessionItem & {
  closedAt: string;
  historyId: string;
  isGeneratedName: boolean;
  isRestorable: boolean;
};

export type SidebarSessionGroup = {
  kind?: "browser" | "workspace";
  groupId: string;
  isActive: boolean;
  isFocusModeActive: boolean;
  layoutVisibleCount: VisibleSessionCount;
  sessions: SidebarSessionItem[];
  title: string;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
};

export type SidebarProjectHeader = {
  directory: string;
  faviconDataUrl?: string;
  name: string;
  worktrees?: SidebarProjectWorktree[];
};

export type SidebarProjectWorktree = {
  branch?: string;
  directory: string;
  name: string;
};

export type SidebarCommandSessionIndicator = {
  commandId: string;
  isActive?: boolean;
  sessionId: string;
  status: "idle" | "running" | "error";
  title?: string;
};

export type SidebarHudState = {
  activeSessionsSortMode: SidebarActiveSessionsSortMode;
  agentManagerZoomPercent: number;
  agents: SidebarAgentButton[];
  buildStamp?: string;
  collapsedSections: SidebarSectionCollapseState;
  commands: SidebarCommandButton[];
  commandSessionIndicators: SidebarCommandSessionIndicator[];
  completionBellEnabled: boolean;
  completionSound: CompletionSoundSetting;
  completionSoundLabel: string;
  debuggingMode: boolean;
  focusedSessionTitle?: string;
  git: SidebarGitState;
  isFocusModeActive: boolean;
  pendingAgentIds: string[];
  projectHeader?: SidebarProjectHeader;
  projectWorktrees?: SidebarProjectWorktree[];
  sectionVisibility: SidebarSectionVisibility;
  settings?: zmuxSettings;
  createSessionOnSidebarDoubleClick: boolean;
  renameSessionOnDoubleClick: boolean;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  showLastInteractionTimeOnSessionCards: boolean;
  theme:
    | "plain-dark"
    | "plain-light"
    | "dark-green"
    | "dark-blue"
    | "dark-red"
    | "dark-pink"
    | "dark-orange"
    | "light-blue"
    | "light-green"
    | "light-pink"
    | "light-orange";
  highlightedVisibleCount: VisibleSessionCount;
  visibleCount: VisibleSessionCount;
  visibleSlotLabels: string[];
  viewMode: TerminalViewMode;
};

export type SidebarHydrateMessage = {
  groups: SidebarSessionGroup[];
  pinnedPrompts: SidebarPinnedPrompt[];
  previousSessions: SidebarPreviousSessionItem[];
  revision: number;
  scratchPadContent: string;
  type: "hydrate";
  hud: SidebarHudState;
};

export type SidebarSessionStateMessage = {
  groups: SidebarSessionGroup[];
  pinnedPrompts: SidebarPinnedPrompt[];
  previousSessions: SidebarPreviousSessionItem[];
  revision: number;
  scratchPadContent: string;
  type: "sessionState";
  hud: SidebarHudState;
};

export type SidebarSessionPresentationChangedMessage = {
  session: SidebarSessionItem;
  type: "sessionPresentationChanged";
};

export type SidebarPlayCompletionSoundMessage = {
  sound: CompletionSoundSetting;
  sessionId?: string;
  type: "playCompletionSound";
};

export type SidebarOrderSyncKind = "agent" | "command";

export type SidebarOrderSyncResultMessage = {
  itemIds: string[];
  kind: SidebarOrderSyncKind;
  requestId: string;
  status: "error" | "success";
  type: "sidebarOrderSyncResult";
};

export type SidebarCommandRunState = "error" | "running" | "success";

export type SidebarCommandRunStateChangedMessage = {
  commandId: string;
  runId: string;
  state: SidebarCommandRunState;
  type: "sidebarCommandRunStateChanged";
};

export type SidebarCommandRunStateClearedMessage = {
  commandId: string;
  type: "sidebarCommandRunStateCleared";
};

export type SidebarDaemonInfo = {
  pid: number;
  port: number;
  protocolVersion: number;
  startedAt: string;
};

export type SidebarDaemonSessionItem = {
  agentName?: string;
  agentStatus: "idle" | "working" | "attention";
  cols: number;
  cwd: string;
  endedAt?: string;
  errorMessage?: string;
  exitCode?: number;
  isCurrentWorkspace: boolean;
  restoreState: "live" | "replayed";
  rows: number;
  sessionId: string;
  shell: string;
  startedAt: string;
  status: "starting" | "running" | "exited" | "error" | "disconnected";
  title?: string;
  workspaceId: string;
};

export type SidebarDaemonSessionsStateMessage = {
  daemon?: SidebarDaemonInfo;
  errorMessage?: string;
  sessions: SidebarDaemonSessionItem[];
  t3Server?: SidebarT3ServerInfo;
  t3Sessions: SidebarT3SessionItem[];
  type: "daemonSessionsState";
};

export type SidebarT3ServerInfo = {
  pid: number;
  port: number;
  startedAt?: string;
};

export type SidebarT3SessionItem = {
  activity: "idle" | "working" | "attention";
  detail?: string;
  isCurrentWorkspace: boolean;
  isFocused: boolean;
  isRunning: boolean;
  isSleeping: boolean;
  lastInteractionAt?: string;
  sessionId: string;
  threadId?: string;
  title?: string;
  workspaceId: string;
  workspaceRoot?: string;
};

export type SidebarPromptGitCommitMessage = {
  action: SidebarGitAction;
  confirmLabel: string;
  description: string;
  requestId: string;
  suggestedBody?: string;
  suggestedSubject: string;
  type: "promptGitCommit";
};

export type SidebarT3BrowserAccessMode = "external" | "local-network" | "local-only" | "tailscale";

export type SidebarShowT3BrowserAccessMessage = {
  endpointUrl: string;
  localUrl: string;
  mode: SidebarT3BrowserAccessMode;
  note: string;
  sessionId: string;
  sessionTitle: string;
  tailscaleEnabled: boolean;
  type: "showT3BrowserAccess";
};

/**
 * CDXC:AppModals 2026-04-28-16:18
 * User-input flows must not use VS Code input boxes, quick picks, or modal
 * editors. Extension-initiated prompts are represented as sidebar messages so
 * the existing React modal host owns rendering and styling.
 */
export type SidebarShowSessionRenameModalMessage = {
  initialTitle: string;
  sessionId: string;
  type: "showSessionRenameModal";
};

export type SidebarShowFindPreviousSessionModalMessage = {
  initialQuery?: string;
  type: "showFindPreviousSessionModal";
};

export type SidebarShowT3ThreadIdModalMessage = {
  currentThreadId: string;
  sessionId: string;
  type: "showT3ThreadIdModal";
};

export type ExtensionToSidebarMessage =
  | SidebarHydrateMessage
  | SidebarSessionStateMessage
  | SidebarSessionPresentationChangedMessage
  | SidebarPlayCompletionSoundMessage
  | SidebarOrderSyncResultMessage
  | SidebarCommandRunStateChangedMessage
  | SidebarCommandRunStateClearedMessage
  | SidebarDaemonSessionsStateMessage
  | SidebarPromptGitCommitMessage
  | SidebarShowT3BrowserAccessMessage
  | SidebarShowSessionRenameModalMessage
  | SidebarShowFindPreviousSessionModalMessage
  | SidebarShowT3ThreadIdModalMessage;

export type SidebarToExtensionMessage =
  | {
      type: "openSettings";
    }
  | {
      settings: zmuxSettings;
      type: "updateSettings";
    }
  | {
      /**
       * CDXC:GhosttySettings 2026-04-30-01:48
       * The settings modal exposes Ghostty-specific actions that are not plain
       * zmux preference changes: reset managed config keys, apply the
       * recommended config block, open docs, and open the platform config file.
       */
      type:
        | "applyRecommendedGhosttySettings"
        | "openGhosttyConfigFile"
        | "openGhosttySettingsDocs"
        | "resetGhosttySettingsToDefault";
    }
  | {
      type: "toggleCompletionBell";
    }
  | {
      type: "toggleShowLastInteractionTimeOnSessionCards";
    }
  | {
      delta: -1 | 1;
      type: "adjustTerminalFontSize";
    }
  | {
      type: "refreshDaemonSessions";
    }
  | {
      type: "killTerminalDaemon";
    }
  | {
      type: "killT3RuntimeServer";
    }
  | {
      type: "killDaemonSession";
      sessionId: string;
      workspaceId: string;
    }
  | {
      type: "killT3RuntimeSession";
      sessionId: string;
    }
  | {
      type: "moveSidebarToOtherSide";
    }
  | {
      type: "createSession";
    }
  | {
      type: "openBrowser";
    }
  | {
      type: "openWorkspaceWelcome";
    }
  | {
      type: "createSessionInGroup";
      groupId: string;
    }
  | {
      type: "focusGroup";
      groupId: string;
    }
  | {
      type: "toggleFullscreenSession";
    }
  | {
      type: "focusSession";
      sessionId: string;
    }
  | {
      type: "promptRenameSession";
      sessionId: string;
    }
  | {
      type: "restartSession";
      sessionId: string;
    }
  | {
      type: "renameSession";
      sessionId: string;
      title: string;
    }
  | {
      sessionId: string;
      threadId: string;
      type: "setT3SessionThreadId";
    }
  | {
      type: "renameGroup";
      groupId: string;
      title: string;
    }
  | {
      type: "closeGroup";
      groupId: string;
    }
  | {
      type: "closeSession";
      sessionId: string;
    }
  | {
      type: "setSessionSleeping";
      sessionId: string;
      sleeping: boolean;
    }
  | {
      favorite: boolean;
      type: "setSessionFavorite";
      sessionId: string;
    }
  | {
      type: "setGroupSleeping";
      groupId: string;
      sleeping: boolean;
    }
  | {
      type: "copyResumeCommand";
      sessionId: string;
    }
  | {
      type: "forkSession";
      sessionId: string;
    }
  | {
      /**
       * CDXC:SessionNaming 2026-04-30-01:50
       * Sidebar context menus can manually request the existing per-agent
       * thread naming flow. The controller must choose Claude or Codex naming
       * behavior from persisted agent identity instead of the UI sending a
       * generated title.
       */
      type: "generateSessionName";
      sessionId: string;
    }
  | {
      type: "fullReloadSession";
      sessionId: string;
    }
  | {
      type: "attachToIde";
    }
  | {
      type: "fullReloadGroup";
      groupId: string;
    }
  | {
      type: "requestT3SessionBrowserAccess";
      sessionId: string;
    }
  | {
      type: "openT3SessionBrowserAccessLink";
      url: string;
    }
  | {
      historyId: string;
      type: "restorePreviousSession";
    }
  | {
      historyId: string;
      type: "deletePreviousSession";
    }
  | {
      /**
       * CDXC:PreviousSessions 2026-04-28-05:36
       * Native full-window modals cannot rely on WKWebView JavaScript prompt
       * dialogs. Carry the user's typed search text with the command so the
       * native launcher can create the agent session immediately.
       */
      query?: string;
      type: "promptFindPreviousSession";
    }
  | {
      type: "clearGeneratedPreviousSessions";
    }
  | {
      content: string;
      type: "saveScratchPad";
    }
  | {
      content: string;
      promptId?: string;
      title: string;
      type: "savePinnedPrompt";
    }
  | {
      collapsed: boolean;
      section: SidebarCollapsibleSection;
      type: "setSidebarSectionCollapsed";
    }
  | {
      type: "moveSessionToGroup";
      groupId: string;
      sessionId: string;
      targetIndex?: number;
    }
  | {
      type: "sidebarDebugLog";
      event: string;
      details?: unknown;
    }
  | {
      type: "createGroupFromSession";
      sessionId: string;
    }
  | {
      type: "createGroup";
    }
  | {
      type: "setVisibleCount";
      visibleCount: VisibleSessionCount;
    }
  | {
      type: "setViewMode";
      viewMode: TerminalViewMode;
    }
  | {
      type: "toggleActiveSessionsSortMode";
    }
  | {
      type: "syncSessionOrder";
      groupId: string;
      sessionIds: string[];
    }
  | {
      type: "syncGroupOrder";
      groupIds: string[];
    }
  | {
      type: "runSidebarCommand";
      commandId: string;
      runMode?: SidebarCommandRunMode;
      worktreePath?: string;
    }
  | {
      type: "endSidebarCommandRun";
      commandId: string;
    }
  | {
      action: SidebarGitAction;
      type: "runSidebarGitAction";
    }
  | {
      action: SidebarGitAction;
      type: "setSidebarGitPrimaryAction";
    }
  | {
      type: "refreshGitState";
    }
  | {
      enabled: boolean;
      type: "setSidebarGitCommitConfirmationEnabled";
    }
  | {
      enabled: boolean;
      type: "setSidebarGitGenerateCommitBodyEnabled";
    }
  | {
      message: string;
      requestId: string;
      type: "confirmSidebarGitCommit";
    }
  | {
      requestId: string;
      type: "cancelSidebarGitCommit";
    }
  | {
      type: "saveSidebarCommand";
      actionType: SidebarActionType;
      closeTerminalOnExit: boolean;
      commandId?: string;
      icon?: SidebarCommandIcon;
      iconColor?: string;
      isGlobal?: boolean;
      name: string;
      playCompletionSound: boolean;
      command?: string;
      url?: string;
    }
  | {
      type: "saveWorkspaceConfig";
      icon?: WorkspaceDockIcon;
      name: string;
      projectId: string;
      theme?: SidebarTheme;
    }
  | {
      type: "deleteSidebarCommand";
      commandId: string;
    }
  | {
      requestId: string;
      type: "syncSidebarCommandOrder";
      commandIds: string[];
    }
  | {
      type: "runSidebarAgent";
      agentId: string;
    }
  | {
      type: "saveSidebarAgent";
      agentId?: string;
      command: string;
      icon?: SidebarAgentIcon;
      name: string;
    }
  | {
      type: "deleteSidebarAgent";
      agentId: string;
    }
  | {
      requestId: string;
      type: "syncSidebarAgentOrder";
      agentIds: string[];
    };

export type SidebarHudSnapshot = Pick<
  SessionGridSnapshot,
  | "focusedSessionId"
  | "fullscreenRestoreVisibleCount"
  | "sessions"
  | "visibleCount"
  | "visibleSessionIds"
  | "viewMode"
>;
