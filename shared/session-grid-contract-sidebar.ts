import type { CompletionSoundSetting } from "./completion-sound";
import type { SidebarAgentButton, SidebarAgentIcon } from "./sidebar-agents";
import type { SidebarActionType, SidebarCommandButton } from "./sidebar-commands";
import type { SidebarGitAction, SidebarGitState } from "./sidebar-git";
import type {
  SessionGridSnapshot,
  TerminalViewMode,
  VisibleSessionCount,
} from "./session-grid-contract-core";

export type SidebarSessionItem = {
  kind?: "browser" | "workspace";
  activity: "idle" | "working" | "attention";
  activityLabel?: string;
  agentIcon?: SidebarAgentIcon;
  sessionId: string;
  sessionNumber?: string;
  primaryTitle?: string;
  terminalTitle?: string;
  alias: string;
  shortcutLabel: string;
  row: number;
  column: number;
  isFocused: boolean;
  isVisible: boolean;
  isRunning: boolean;
  detail?: string;
};

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

export type SidebarHudState = {
  agentManagerZoomPercent: number;
  agents: SidebarAgentButton[];
  commands: SidebarCommandButton[];
  completionBellEnabled: boolean;
  completionSound: CompletionSoundSetting;
  completionSoundLabel: string;
  debuggingMode: boolean;
  focusedSessionTitle?: string;
  git: SidebarGitState;
  isFocusModeActive: boolean;
  pendingAgentIds: string[];
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
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
  previousSessions: SidebarPreviousSessionItem[];
  revision: number;
  scratchPadContent: string;
  type: "hydrate";
  hud: SidebarHudState;
};

export type SidebarSessionStateMessage = {
  groups: SidebarSessionGroup[];
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
  type: "playCompletionSound";
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
  type: "daemonSessionsState";
};

export type SidebarPromptGitCommitMessage = {
  action: SidebarGitAction;
  confirmLabel: string;
  description: string;
  requestId: string;
  suggestedSubject: string;
  type: "promptGitCommit";
};

export type ExtensionToSidebarMessage =
  | SidebarHydrateMessage
  | SidebarSessionStateMessage
  | SidebarSessionPresentationChangedMessage
  | SidebarPlayCompletionSoundMessage
  | SidebarDaemonSessionsStateMessage
  | SidebarPromptGitCommitMessage;

export type SidebarToExtensionMessage =
  | {
      type: "ready";
    }
  | {
      type: "openSettings";
    }
  | {
      type: "toggleCompletionBell";
    }
  | {
      type: "refreshDaemonSessions";
    }
  | {
      type: "killTerminalDaemon";
    }
  | {
      type: "killDaemonSession";
      sessionId: string;
      workspaceId: string;
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
      type: "copyResumeCommand";
      sessionId: string;
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
      type: "clearGeneratedPreviousSessions";
    }
  | {
      content: string;
      type: "saveScratchPad";
    }
  | {
      type: "moveSessionToGroup";
      groupId: string;
      sessionId: string;
      targetIndex?: number;
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
      requestId: string;
      subject: string;
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
      name: string;
      command?: string;
      url?: string;
    }
  | {
      type: "deleteSidebarCommand";
      commandId: string;
    }
  | {
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
