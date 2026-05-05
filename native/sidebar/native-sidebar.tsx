import { createRoot } from "react-dom/client";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconFolderOpen,
  IconMessageCirclePlus,
  IconPlus,
  IconPalette,
  IconTrash,
} from "@tabler/icons-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { installAppModalGlobalErrorLogging } from "../../sidebar/app-modal-error-log";
import { openAppModal, postAppModalHostMessage } from "../../sidebar/app-modal-host-bridge";
import { SidebarApp } from "../../sidebar/sidebar-app";
import { AGENT_LOGO_COLORS, AGENT_LOGOS } from "../../sidebar/agent-logos";
import {
  explainFirstPromptAutoRenameDecision,
  isGenericAgentSessionTitle,
  resolveFirstPromptAutoRenameStrategy,
  type FirstPromptAutoRenameStrategy,
} from "../../shared/first-prompt-session-title";
import {
  DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE,
  renderFindPreviousSessionPrompt,
} from "../../shared/find-previous-session-prompt";
import {
  acknowledgeTitleDerivedSessionActivity,
  getTitleDerivedSessionActivityFromTransition,
  haveSameTitleDerivedSessionActivity,
  type TitleDerivedSessionActivity,
} from "../../shared/session-title-activity";
import {
  clampVisibleSessionCount,
  createAgentSessionDefaultTitle,
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSidebarHudState,
  DEFAULT_TERMINAL_SESSION_TITLE,
  createSidebarSessionItems,
  getSessionCardPrimaryTitle,
  normalizeTerminalTitle,
  getVisiblePrimaryTitle,
  getVisibleTerminalTitle,
  resolveSidebarTheme,
  type ExtensionToSidebarMessage,
  type GroupedSessionWorkspaceSnapshot,
  type SessionRecord,
  type SessionGridSnapshot,
  type SidebarActiveSessionsSortMode,
  type SidebarCollapsibleSection,
  type SidebarDaemonSessionItem,
  type SidebarDaemonSessionsStateMessage,
  type SidebarT3SessionItem,
  type SidebarHydrateMessage,
  type SidebarPreviousSessionItem,
  type SidebarRecentProject,
  type SidebarSectionCollapseState,
  type SidebarSessionGroup,
  type SidebarSessionItem,
  type SidebarTheme,
  type SidebarToExtensionMessage,
  type TerminalSessionRecord,
  type T3SessionRecord,
  type VisibleSessionCount,
  type SidebarCommandSessionIndicator,
  type SessionGridDirection,
  type SessionGroupRecord,
  type BrowserSessionRecord,
} from "../../shared/session-grid-contract";
import { createDisplaySessionLayout } from "../../shared/active-sessions-sort";
import { focusDirectionInSnapshot } from "../../shared/session-grid-state-create-focus";
import {
  createDefaultSidebarGitState,
  type SidebarGitAction,
  type SidebarGitState,
} from "../../shared/sidebar-git";
import {
  createGroupFromSessionInSimpleWorkspace,
  createGroupInSimpleWorkspace,
  createSessionInSimpleWorkspace,
  focusGroupByIndexInSimpleWorkspace,
  focusGroupInSimpleWorkspace,
  focusSessionInSimpleWorkspace,
  moveSessionToGroupInSimpleWorkspace,
  normalizeSimpleGroupedSessionWorkspaceSnapshot,
  removeGroupInSimpleWorkspace,
  removeSessionInSimpleWorkspace,
  renameGroupInSimpleWorkspace,
  setGroupSleepingInSimpleWorkspace,
  setBrowserSessionFaviconDataUrlInSimpleWorkspace,
  setBrowserSessionUrlInSimpleWorkspace,
  setSessionFavoriteInSimpleWorkspace,
  setSessionSleepingInSimpleWorkspace,
  setSessionTitleInSimpleWorkspace,
  setT3SessionMetadataInSimpleWorkspace,
  setTerminalSessionAgentNameInSimpleWorkspace,
  setTerminalSessionPersistenceNameInSimpleWorkspace,
  setViewModeInSimpleWorkspace,
  setVisibleCountInSimpleWorkspace,
  swapVisibleSessionsInSimpleWorkspace,
  syncGroupOrderInSimpleWorkspace,
  syncSessionOrderInSimpleWorkspace,
  toggleFullscreenSessionInSimpleWorkspace,
} from "../../shared/simple-grouped-session-workspace-state";
import {
  normalizeSidebarPinnedPrompts,
  type SidebarPinnedPrompt,
} from "../../shared/sidebar-pinned-prompts";
import {
  createSidebarAgentButtons,
  DEFAULT_SIDEBAR_AGENTS,
  getDefaultSidebarAgentByIcon,
  getDefaultSidebarAgentById,
  getSidebarAgentIconById,
  isDefaultSidebarAgentId,
  normalizeStoredSidebarAgentOrder,
  normalizeStoredSidebarAgents,
  shouldPreferTerminalTitleForAgentIcon,
  type SidebarAgentButton,
  type StoredSidebarAgent,
} from "../../shared/sidebar-agents";
import {
  createSidebarCommandButtons,
  DEFAULT_BROWSER_LAUNCH_URL,
  isDefaultSidebarCommandId,
  normalizeStoredSidebarCommandOrder,
  normalizeStoredSidebarCommands,
  type SidebarCommandButton,
  type SidebarCommandRunMode,
  type StoredSidebarCommand,
} from "../../shared/sidebar-commands";
import {
  DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  normalizeSidebarCommandIconColor,
} from "../../shared/sidebar-command-icons";
import { SidebarCommandIconGlyph } from "../../sidebar/sidebar-command-icon";
import {
  createCombinedProjectGroupId,
  createCombinedProjectSessionId,
  parseCombinedProjectGroupId,
  parseCombinedProjectSessionId,
} from "./combined-sidebar-mode";
import {
  compareRecentProjectsByClosedAt,
  countRecentProjectSessions,
  normalizeStartupRecentProjects,
} from "./recent-projects";
import {
  DEFAULT_WORKSPACE_THEME_COLOR,
  getWorkspaceThemeForeground,
  normalizeWorkspaceDockIcon,
  normalizeWorkspaceDockIconDataUrl,
  normalizeWorkspaceThemeColor,
  readWorkspaceThemeColorHistory,
  updateWorkspaceThemeColorHistory,
  writeWorkspaceThemeColorHistory,
  type WorkspaceDockIcon,
} from "../../shared/workspace-dock-icons";
import {
  DEFAULT_zmux_SETTINGS,
  getZedOverlayTargetAppLabel,
  normalizezmuxSettings,
  type ZedOverlayTargetApp,
  type zmuxSettings,
} from "../../shared/zmux-settings";
import {
  getCompletionSoundFileName,
  type CompletionSoundSetting,
} from "../../shared/completion-sound";
import { getzmuxHotkeyActionById, type zmuxHotkeyActionId } from "../../shared/zmux-hotkeys";
import { getGhosttyTerminalConfigValues } from "../../shared/ghostty-terminal-settings";
import {
  GHOSTTY_SETTINGS_DOCS_URL,
  ZMUX_GHOSTTY_MANAGED_CONFIG_KEYS,
  ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES,
} from "../../shared/ghostty-config-actions";
import "../../sidebar/styles.css";

type NativeHostCommand =
  | {
      activateOnCreate?: boolean;
      cwd: string;
      env?: Record<string, string>;
      initialInput?: string;
      sessionId: string;
      sessionPersistenceName?: string;
      sessionPersistenceProvider?: "tmux" | "zmx";
      title?: string;
      type: "createTerminal";
    }
  | {
      cwd?: string;
      projectId?: string;
      sessionId: string;
      threadId?: string;
      title: string;
      type: "createWebPane";
      url: string;
    }
  | { sessionId: string; type: "closeTerminal" }
  | { sessionId: string; type: "closeWebPane" }
  | { sessionId: string; type: "focusTerminal" }
  | { sessionId: string; type: "focusWebPane" }
  | { sessionId: string; type: "reloadWebPane" }
  | { cwd: string; type: "startT3CodeRuntime" }
  | { type: "stopT3CodeRuntime" }
  | { type: "activateApp" }
  | { sessionId: string; text: string; type: "writeTerminalText" }
  | { sessionId: string; type: "sendTerminalEnter" }
  | {
      activeSessionIds: string[];
      attentionSessionIds?: string[];
      backgroundColor?: string;
      focusRequestId?: number;
      focusedSessionId?: string;
      layout?: NativeTerminalLayout;
      paneGap?: number;
      sessionAgentIconDataUrls?: Record<string, string>;
      sessionAgentIconColors?: Record<string, string>;
      sessionActivities?: Record<string, "attention" | "working">;
      sessionTitles?: Record<string, string>;
      type: "setActiveTerminalSet";
    }
  | { layout?: NativeTerminalLayout; type: "setTerminalLayout" }
  | { sessionId: string; type: "setTerminalVisibility"; visible: boolean }
  | { type: "pickWorkspaceFolder" }
  | { projectId: string; type: "pickWorkspaceIcon" }
  | { type: "showMessage"; level: "info" | "warning" | "error"; message: string }
  | { details?: string; event: string; type: "appendAgentDetectionDebugLog" }
  | { details?: string; event: string; type: "appendTerminalFocusDebugLog" }
  | { details?: string; event: string; type: "appendRestoreDebugLog" }
  | { details?: string; event: string; type: "appendSessionTitleDebugLog" }
  | { details?: string; event: string; type: "appendWorkspaceDockIndicatorDebugLog" }
  | {
      key: "previousSessions" | "projects" | "settings";
      payloadJson: string;
      type: "persistSharedSidebarStorage";
    }
  | { fileName: string; type: "playSound"; volume?: number }
  | {
      args: string[];
      cwd?: string;
      env?: Record<string, string>;
      executable: string;
      requestId: string;
      type: "runProcess";
    }
  | {
      adjustCellHeightPercent: number;
      adjustCellWidth: number;
      fontFamily: string;
      fontSize: number;
      fontThicken: boolean;
      fontThickenStrength: number;
      mouseScrollMultiplierDiscrete: number;
      mouseScrollMultiplierPrecision: number;
      reloadImmediately?: boolean;
      type: "syncGhosttyTerminalSettings";
    }
  | {
      lines: string[];
      managedKeys: string[];
      reloadImmediately?: boolean;
      type: "applyGhosttyConfigSettings";
    }
  | { type: "openGhosttyConfigFile" }
  | { type: "openExternalUrl"; url: string }
  | { type: "openWorkspaceInFinder"; workspacePath: string }
  | {
      targetApp: ZedOverlayTargetApp;
      type: "openWorkspaceInIde";
      workspacePath: string;
    }
  | { type: "openBrowserWindow"; url: string }
  | { type: "showBrowserWindow" }
  | { sessionId: string; type: "openBrowserDevTools" }
  | { sessionId: string; type: "injectBrowserReactGrab" }
  | { sessionId: string; type: "showBrowserProfilePicker" }
  | { sessionId: string; type: "showBrowserImportSettings" }
  | { side: "left" | "right"; type: "setSidebarSide" }
  | {
      enabled: boolean;
      hideTitlebarButton: boolean;
      reason?: "settings-save" | "startup" | "workspace-focus";
      targetApp: ZedOverlayTargetApp;
      type: "configureZedOverlay";
      workspacePath: string;
    }
  | {
      targetApp: ZedOverlayTargetApp;
      type: "openZedWorkspace";
      workspacePath: string;
    };

export type WorkspaceBarProject = {
  icon?: WorkspaceDockIcon;
  iconDataUrl?: string;
  isActive: boolean;
  isChat?: boolean;
  path: string;
  projectId: string;
  /**
   * CDXC:WorkspaceDock 2026-04-27-06:19
   * The native workspace rail must split session-card state into three badges:
   * idle running sessions are gray, working sessions are orange, and completed
   * sessions are green. Use "working" instead of "active" because "active"
   * already means selected/current workspace, group, session, or modal.
   */
  sessionCounts: {
    done: number;
    running: number;
    working: number;
  };
  theme?: SidebarTheme;
  themeColor?: string;
  title: string;
};

export type WorkspaceBarStateMessage = {
  activeProjectId: string;
  projects: WorkspaceBarProject[];
  sidebarMode: zmuxSettings["sidebarMode"];
  type: "workspaceBarState";
};

type NativeTerminalLayout =
  | { kind: "leaf"; sessionId: string }
  | {
      children: NativeTerminalLayout[];
      direction: "horizontal" | "vertical";
      kind: "split";
      ratio?: number;
    };

type NativeHostEvent =
  | {
      foregroundPid?: number;
      sessionId: string;
      sessionPersistenceName?: string;
      ttyName?: string;
      type: "terminalReady";
    }
  | {
      sessionId: string;
      sessionPersistenceName?: string;
      title: string;
      type: "terminalTitleChanged";
    }
  | { faviconDataUrl?: string; sessionId: string; type: "browserFaviconChanged" }
  | { sessionId: string; type: "browserUrlChanged"; url: string }
  | {
      action: "close" | "fork" | "reload" | "rename" | "sleep";
      sessionId: string;
      type: "terminalTitleBarAction";
    }
  | { sourceSessionId: string; targetSessionId: string; type: "paneReorderRequested" }
  | { cwd: string; sessionId: string; type: "terminalCwdChanged" }
  | { exitCode?: number; sessionId: string; type: "terminalExited" }
  | { sessionId: string; type: "terminalFocused" }
  | { sessionId: string; type: "terminalBell" }
  | { message: string; sessionId: string; type: "terminalError" }
  | {
      projectId: string;
      serverOrigin: string;
      sessionId: string;
      threadId: string;
      type: "t3ThreadReady";
      workspaceRoot: string;
    }
  | { sessionId: string; threadId: string; title?: string; type: "t3ThreadChanged" }
  | { exitCode: number; requestId: string; stderr: string; stdout: string; type: "processResult" }
  | { actionId: zmuxHotkeyActionId; type: "nativeHotkey" }
  | { protocolVersion: 1; type: "hostReady" };

type NativeProcessResult = Extract<NativeHostEvent, { type: "processResult" }>;

type NativeBootstrap = {
  accessibilityPermissionGranted?: boolean;
  cwd?: string;
  homeDir?: string;
  sharedSidebarStorage?: {
    previousSessions?: string;
    projects?: string;
    settings?: string;
  };
  zmuxHomeDir?: string;
  workspaceName?: string;
  zedOverlayEnabled?: boolean;
  zedOverlayHideTitlebarButton?: boolean;
  zedOverlayTargetApp?: ZedOverlayTargetApp;
};

declare global {
  interface Window {
    __zmux_NATIVE_HOST__?: NativeBootstrap;
    webkit?: {
      messageHandlers?: {
        zmuxAppModalHost?: {
          postMessage: (message: unknown) => void;
        };
        zmuxNativeHost?: {
          postMessage: (message: unknown) => void;
        };
        zmuxWorkspaceBar?: {
          postMessage: (message: unknown) => void;
        };
        zmuxNativeHostDiagnostics?: {
          postMessage: (message: unknown) => void;
        };
      };
    };
    __zmux_NATIVE_WORKSPACE_BAR__?: {
      addProject: (path: string, name?: string) => void;
      focusProject: (projectId: string) => void;
      getState: () => WorkspaceBarStateMessage;
      removeProject: (projectId: string) => void;
      reorderProjects: (projectIds: string[]) => void;
      setProjectIcon: (projectId: string, iconDataUrl: string | undefined) => void;
      setProjectTheme: (projectId: string, theme: SidebarTheme) => void;
      setProjectThemeColor: (projectId: string, themeColor: string) => void;
    };
    __zmux_NATIVE_SETTINGS__?: {
      attachZedOverlay: (targetApp: ZedOverlayTargetApp) => void;
      detachZedOverlay: (targetApp: ZedOverlayTargetApp) => void;
    };
    __zmux_NATIVE_CLI__?: {
      handleCommand: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
    };
    __zmux_NATIVE_MODAL_BRIDGE__?: {
      handleSidebarMessage: (message: SidebarToExtensionMessage) => void;
    };
    __zmux_NATIVE_HOTKEYS__?: {
      handleNativeHotkey: (actionId: zmuxHotkeyActionId) => void;
    };
  }
}

class SurfaceMessageBus<T> {
  private readonly target = new EventTarget();

  public addEventListener(type: "message", listener: EventListenerOrEventListenerObject): void {
    this.target.addEventListener(type, listener);
  }

  public removeEventListener(type: "message", listener: EventListenerOrEventListenerObject): void {
    this.target.removeEventListener(type, listener);
  }

  public post(message: T): void {
    this.target.dispatchEvent(new MessageEvent("message", { data: message }));
  }
}

/**
 * CDXC:PublicRelease 2026-04-27-05:36
 * Public source must not expose a maintainer's local checkout path. When the
 * native host does not provide a cwd, seed the demo workspace from HOME.
 */
const initialWorkspacePath = window.__zmux_NATIVE_HOST__?.cwd || nativeFallbackHomeDirectory();
const initialWorkspaceName = window.__zmux_NATIVE_HOST__?.workspaceName || "zmux";
const SETTINGS_STORAGE_KEY = "zmux-native-settings";
const AGENTS_STORAGE_KEY = "zmux-native-agents";
const AGENT_ORDER_STORAGE_KEY = "zmux-native-agent-order";
const COMMANDS_STORAGE_KEY = "zmux-native-commands";
const COMMAND_ORDER_STORAGE_KEY = "zmux-native-command-order";
const DELETED_DEFAULT_COMMANDS_STORAGE_KEY = "zmux-native-deleted-default-commands";
const PROJECTS_STORAGE_KEY = "zmux-native-projects";
const SCRATCH_PAD_STORAGE_KEY = "zmux-native-scratch-pad";
const PINNED_PROMPTS_STORAGE_KEY = "zmux-native-pinned-prompts";
const COLLAPSED_SECTIONS_STORAGE_KEY = "zmux-native-collapsed-sections";
const ACTIVE_SESSIONS_SORT_MODE_STORAGE_KEY = "zmux-native-active-sessions-sort-mode";
const PREVIOUS_SESSIONS_STORAGE_KEY = "zmux-native-previous-sessions";
const SIDEBAR_SIDE_STORAGE_KEY = "zmux-native-sidebar-side";
const GIT_PRIMARY_ACTION_STORAGE_KEY = "zmux-native-git-primary-action";
const GIT_CONFIRM_COMMIT_STORAGE_KEY = "zmux-native-git-confirm-commit";
const GIT_GENERATE_COMMIT_BODY_STORAGE_KEY = "zmux-native-git-generate-commit-body";
const WORKSPACE_DOCK_STATE_EVENT = "zmux-workspace-dock-state";
const CHROME_CANARY_PROCESS_NAME = "Google Chrome Canary";
const CHROME_CANARY_RUNNING_POLL_MS = 2_000;
const CHROME_CANARY_BROWSER_GROUP_ID = "browser-chrome-canary";
const CHROME_CANARY_BROWSER_SESSION_ID = "browser-chrome-canary-window";
const COMBINED_CHATS_GROUP_ID = "combined-chats";
const NATIVE_T3_REMOTE_ACCESS_ORIGIN = "http://127.0.0.1:3774";
const NATIVE_T3_REMOTE_ACCESS_AUTH_ATTEMPTS = 30;
const NATIVE_T3_REMOTE_ACCESS_AUTH_RETRY_MS = 500;
/**
 * CDXC:T3Code 2026-05-04-04:41
 * T3 can emit a thread-change event before the sidebar summary title has caught
 * up. Keep new zmux T3 cards responsive by creating them immediately, then
 * retry the snapshot-backed title sync a few times so the card title converges
 * to the title visible inside T3.
 */
const NATIVE_T3_TITLE_SYNC_RETRY_DELAYS_MS = [500, 1_500, 3_000] as const;
const FIRST_PROMPT_AUTO_RENAME_POLL_MS = 2_000;
const SYNC_OPEN_PROJECT_WITH_ZED_DEBOUNCE_MS = 2_000;
/**
 * CDXC:SessionTitleSync 2026-04-26-09:52
 * Codex needs the staged `/rename <title>` text to settle in the prompt before
 * zmux submits Enter. A one-second delay matches the requested native behavior;
 * the later native Enter command handles submission separately from text input.
 */
const AUTO_SUBMIT_STAGED_RENAME_DELAY_MS = 1_000;
const NATIVE_INITIAL_ACTIVITY_SUPPRESSION_MS = 7_000;
const NATIVE_MIN_WORKING_DURATION_BEFORE_ATTENTION_MS = 5_000;
const zmux_AGENT_NOTIFY_HOOK_PATH = `${nativeZmuxHomeDirectory()}/hooks/agent-shell-notify.sh`;
const FIND_PREVIOUS_SESSION_AGENT_ID = "codex";
const FIND_PREVIOUS_SESSION_AGENT_STAGING_DELAY_MS = 1_500;
/**
 * CDXC:WorkspaceDock 2026-04-27-08:48
 * Workspace context-menu themes use the same concrete theme palette names as
 * Settings, excluding Auto because per-workspace selection must persist a
 * deterministic color and apply that theme when the workspace becomes active.
 */
const WORKSPACE_DOCK_THEME_OPTIONS: ReadonlyArray<{ label: string; value: SidebarTheme }> = [
  { label: "Dark Gray", value: "plain-dark" },
  { label: "Dark Green", value: "dark-green" },
  { label: "Dark Blue", value: "dark-blue" },
  { label: "Dark Red", value: "dark-red" },
  { label: "Dark Pink", value: "dark-pink" },
  { label: "Dark Orange", value: "dark-orange" },
  { label: "Light Blue", value: "light-blue" },
  { label: "Light Green", value: "light-green" },
  { label: "Light Pink", value: "light-pink" },
  { label: "Light Orange", value: "light-orange" },
];
/**
 * CDXC:SessionTitleSync 2026-04-26-09:23
 * Native first-prompt title generation must match zmux's Codex `/rename`
 * path, including the 39-character generated title cap and 250-character
 * prompt sample used before asking Codex for a short session name.
 *
 * CDXC:SessionNaming 2026-05-04-14:57
 * Pasting more than 50 characters into the rename modal is a request to name
 * the session from the pasted text. Native rename handling must generate the
 * title before persisting or staging `/rename` so the full paste never becomes
 * the thread name.
 */
const SESSION_RENAME_SUMMARY_THRESHOLD = 50;
const GENERATED_SESSION_TITLE_MAX_LENGTH = 39;
const GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH = 250;
let storedAgents: StoredSidebarAgent[] = [];
let storedAgentOrder: string[] = [];
let agents: SidebarAgentButton[] = [];
let storedCommands: StoredSidebarCommand[] = [];
let storedCommandOrder: string[] = [];
let deletedDefaultCommandIds: string[] = [];
let commands: SidebarCommandButton[] = [];
let scratchPadContent = readScratchPadContent();
let pinnedPrompts = readPinnedPrompts();
let collapsedSections = readCollapsedSections();
let activeSessionsSortMode = readActiveSessionsSortMode();
let previousSessions = readPreviousSessions();
let sidebarSide = readSidebarSide();
let gitPrimaryAction = readGitPrimaryAction();
let gitConfirmCommit = readBooleanStorage(GIT_CONFIRM_COMMIT_STORAGE_KEY, false);
let gitGenerateCommitBody = readBooleanStorage(GIT_GENERATE_COMMIT_BODY_STORAGE_KEY, true);
let gitState = createDefaultSidebarGitState(
  gitPrimaryAction,
  gitConfirmCommit,
  gitGenerateCommitBody,
);
let isChromeCanaryRunning = false;
const pendingProcessResults = new Map<
  string,
  {
    reject: (reason?: unknown) => void;
    resolve: (result: NativeProcessResult) => void;
    timeout: number;
  }
>();
const pendingGitCommitRequests = new Map<
  string,
  { action: SidebarGitAction; body?: string; subject: string }
>();

type NativeProject = {
  icon?: WorkspaceDockIcon;
  iconDataUrl?: string;
  isChat?: boolean;
  isRecentProject?: boolean;
  name: string;
  path: string;
  projectId: string;
  recentClosedAt?: string;
  theme?: SidebarTheme;
  themeColor?: string;
  workspace: GroupedSessionWorkspaceSnapshot;
};

type NativeCliSessionSelector = {
  index?: number;
  sessionId?: string;
  sessionNumber?: number;
};

type AgentManagerXMuxSource = "zmux";

type AgentManagerXWorkspaceSession = {
  agent: string;
  alias: string;
  displayName: string;
  isFocused: boolean;
  isRunning: boolean;
  isVisible: boolean;
  kind: "t3" | "terminal";
  lastActiveAt: string;
  projectName?: string;
  projectPath?: string;
  sessionId: string;
  status: "attention" | "idle" | "working";
  terminalTitle?: string;
  threadId?: string;
};

type AgentManagerXWorkspaceSnapshotMessage = {
  sessions: AgentManagerXWorkspaceSession[];
  source: AgentManagerXMuxSource;
  type: "workspaceSnapshot";
  updatedAt: string;
  workspaceFaviconDataUrl?: string;
  workspaceId: string;
  workspaceName: string;
  workspacePath: string;
};

type AgentManagerXSessionCommandMessage = {
  sessionId: string;
  type: "closeSession" | "focusSession";
  workspaceId: string;
};

const AGENT_MANAGER_X_BRIDGE_URL = "ws://127.0.0.1:47652/zmux";
const AGENT_MANAGER_X_RECONNECT_INITIAL_DELAY_MS = 1000;
const AGENT_MANAGER_X_RECONNECT_MAX_DELAY_MS = 5000;

class AgentManagerXNativeBridgeClient {
  private latestSnapshotJsonByWorkspaceId = new Map<string, string>();
  private reconnectDelayMs = AGENT_MANAGER_X_RECONNECT_INITIAL_DELAY_MS;
  private reconnectTimer: number | undefined;
  private socket: WebSocket | undefined;

  publish(snapshots: readonly AgentManagerXWorkspaceSnapshotMessage[]): void {
    const nextWorkspaceIds = new Set<string>();
    for (const snapshot of snapshots) {
      nextWorkspaceIds.add(snapshot.workspaceId);
      this.latestSnapshotJsonByWorkspaceId.set(snapshot.workspaceId, JSON.stringify(snapshot));
    }
    for (const workspaceId of Array.from(this.latestSnapshotJsonByWorkspaceId.keys())) {
      if (!nextWorkspaceIds.has(workspaceId)) {
        this.latestSnapshotJsonByWorkspaceId.delete(workspaceId);
      }
    }
    this.ensureConnected();
    this.flush();
  }

  private ensureConnected(): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      return;
    }
    if (this.reconnectTimer !== undefined) {
      return;
    }

    try {
      const socket = new WebSocket(AGENT_MANAGER_X_BRIDGE_URL);
      this.socket = socket;
      socket.addEventListener("open", () => {
        this.reconnectDelayMs = AGENT_MANAGER_X_RECONNECT_INITIAL_DELAY_MS;
        this.flush();
      });
      socket.addEventListener("message", (event) => {
        handleAgentManagerXSessionCommand(event.data);
      });
      socket.addEventListener("close", () => {
        if (this.socket === socket) {
          this.socket = undefined;
        }
        this.scheduleReconnect();
      });
      socket.addEventListener("error", () => {
        socket.close();
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  private flush(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    for (const snapshotJson of this.latestSnapshotJsonByWorkspaceId.values()) {
      this.socket.send(snapshotJson);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== undefined) {
      return;
    }
    const delayMs = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(
      AGENT_MANAGER_X_RECONNECT_MAX_DELAY_MS,
      this.reconnectDelayMs * 2,
    );
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.ensureConnected();
    }, delayMs);
  }
}

let settings = readStoredSettings();
/**
 * CDXC:NativeSidebar 2026-04-29-22:03
 * Debug-gated startup diagnostics can run while reading persisted projects, so
 * settings must initialize first; otherwise the sidebar can fail before React
 * renders and leave only the native shell surface visible.
 */
const restoredProjectState = readStoredProjects();
let projects: NativeProject[] = restoredProjectState.projects;
let activeProjectId = restoredProjectState.activeProjectId;
let revision = 0;
let nextNativeLayoutFocusRequestId = 0;
let pendingNativeLayoutFocusRequest:
  | { reason: string; requestId: number; sessionId: string }
  | undefined;
let pendingZedProjectSyncTimeout: number | undefined;
const sidebarBus = new SurfaceMessageBus<ExtensionToSidebarMessage>();
const terminalStateById = new Map<
  string,
  {
    activity: "attention" | "idle" | "working";
    agentName?: string;
    firstPromptAutoRenameInProgress?: boolean;
    firstPromptAutoRenameLastLogKey?: string;
    firstPromptAutoRenameProcessedPrompt?: string;
    firstUserMessage?: string;
    lastActivityAt?: string;
    lifecycleState: "done" | "error" | "running" | "sleeping";
    sessionPersistenceName?: string;
    sessionPersistenceProvider?: zmuxSettings["sessionPersistenceProvider"];
    sessionStateFilePath?: string;
    terminalTitle?: string;
  }
>();
const titleDerivedActivityBySessionId = new Map<string, TitleDerivedSessionActivity>();
const nativeActivitySuppressedUntilBySessionId = new Map<string, number>();
const nativeWorkingStartedAtBySessionId = new Map<string, number>();
type NativeSidebarCommandSession = {
  closeOnExit: boolean;
  commandId: string;
  playCompletionSound: boolean;
  runId?: string;
  sessionId: string;
};
/**
 * CDXC:Actions 2026-04-28-02:54
 * Native action buttons keep the same command-to-terminal association as the
 * reference sidebar so background runs can show indicators, spinners, and
 * close-on-exit completion state without appearing as normal session cards.
 */
const sidebarCommandSessionByCommandId = new Map<string, NativeSidebarCommandSession>();
const sidebarCommandCommandIdBySessionId = new Map<string, string>();
/**
 * CDXC:NativeTerminals 2026-04-26-06:45
 * Sidebar workspace snapshots normalize terminal ids back to canonical display
 * ids such as session-00. Native Ghostty surfaces use project-scoped ids, so
 * every native command/layout must translate at the bridge boundary.
 */
const nativeSessionIdBySidebarSessionId = new Map<string, string>();
const sidebarSessionIdByNativeSessionId = new Map<string, string>();
const nativeT3ThreadChangeInFlightBySessionId = new Set<string>();
/**
 * CDXC:AgentManagerXBridge 2026-04-27-20:34
 * Agent Manager X reads live mux sessions from a localhost WebSocket. The
 * packaged zmux app owns native sidebar state, so it must publish snapshots
 * directly instead of relying on the VS Code extension bridge path.
 */
const agentManagerXBridgeClient = new AgentManagerXNativeBridgeClient();

/**
 * CDXC:NativeTerminals 2026-04-28-12:06
 * Persistent helper mode was removed, but native terminal ids still need to be
 * project-scoped so sidebar commands, layouts, and focus events never collide
 * across workspaces during one embedded-host app session.
 */
function createDurableNativeSessionId(projectId: string, sidebarSessionId: string): string {
  return `${projectId}:${sidebarSessionId}`;
}

function rememberNativeSessionMapping(projectId: string, sidebarSessionId: string): string {
  const nativeSessionId = createDurableNativeSessionId(projectId, sidebarSessionId);
  nativeSessionIdBySidebarSessionId.set(sidebarSessionId, nativeSessionId);
  sidebarSessionIdByNativeSessionId.set(nativeSessionId, sidebarSessionId);
  return nativeSessionId;
}

/**
 * CDXC:NativeSidebar 2026-04-26-00:47
 * The native app reuses the web sidebar UI, but it owns state locally instead
 * of depending on the old extension backend. Every sidebar command must either
 * perform native behavior or give explicit native feedback so controls never
 * fail silently.
 */
const vscode = {
  postMessage(message: SidebarToExtensionMessage) {
    handleSidebarMessage(message);
  },
};

window.__zmux_NATIVE_MODAL_BRIDGE__ = {
  handleSidebarMessage(message) {
    handleSidebarMessage(message);
  },
};

window.__zmux_NATIVE_HOTKEYS__ = {
  handleNativeHotkey(actionId) {
    logNativeHotkeyDebug("nativeHotkeys.bridgeActionReceived", { actionId });
    runNativeHotkeyAction(actionId);
  },
};

let pendingHotkeyPrefix: string | undefined;

document.addEventListener(
  "keydown",
  (event) => {
    const hotkeyText = keyboardEventToNativeHotkeyText(event);
    const isCandidate = isNativeHotkeyCandidate(event, hotkeyText);
    if (event.defaultPrevented || isNativeHotkeyEditableTarget(event.target)) {
      if (isCandidate) {
        logNativeHotkeyDebug("nativeHotkeys.domKeyIgnored", {
          defaultPrevented: event.defaultPrevented,
          hotkeyText,
          target: describeNativeHotkeyTarget(event.target),
        });
      }
      return;
    }
    const actionId = getMatchingNativeHotkeyActionId(hotkeyText, Date.now(), "dom");
    if (!actionId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    runNativeHotkeyAction(actionId);
  },
  true,
);

/**
 * CDXC:Hotkeys 2026-04-28-05:36
 * Hotkey failures need boundary diagnostics because shortcuts can be swallowed
 * by AppKit, Ghostty, editable DOM targets, or the action resolver. Log only
 * modifier/prefix candidates so normal typing does not flood native logs.
 */
function logNativeHotkeyDebug(event: string, details: Record<string, unknown>): void {
  if (!isNativeSidebarDebugLoggingEnabled()) {
    return;
  }
  console.debug("[zmux-native-hotkeys]", event, details);
  appendTerminalFocusDebugLog(event, details);
}

function postNative(command: NativeHostCommand): void {
  if (isTerminalFocusDebugCommand(command)) {
    const snapshot = getTerminalFocusDebugSnapshot();
    appendTerminalFocusDebugLog("nativeSidebar.postNative", {
      command: summarizeNativeFocusCommand(command),
      focusedSessionId: snapshot?.focusedSessionId,
      visibleSessionIds: snapshot?.visibleSessionIds,
    });
  }
  window.webkit?.messageHandlers?.zmuxNativeHost?.postMessage(command);
}

function postAppModalHost(message: unknown): void {
  postAppModalHostMessage(message, "AppModals:sidebarState");
}

function showNativeMessage(level: "info" | "warning" | "error", message: string): void {
  postNative({ level, message, type: "showMessage" });
}

function appendSessionTitleDebugLog(event: string, details?: unknown): void {
  if (!isNativeSidebarDebugLoggingEnabled()) {
    return;
  }
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendSessionTitleDebugLog",
  });
}

function appendAgentDetectionDebugLog(event: string, details?: unknown): void {
  /**
   * CDXC:AgentDetection 2026-04-29-09:16
   * Non-error native sidebar diagnostics must follow the settings debug switch,
   * and high-frequency title/projection traces are intentionally not emitted so
   * spinner-driven status updates do not create multi-GB log files.
   */
  if (!isNativeSidebarDebugLoggingEnabled()) {
    return;
  }
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendAgentDetectionDebugLog",
  });
}

function appendTerminalFocusDebugLog(event: string, details?: unknown): void {
  /**
   * CDXC:NativeTerminalFocus 2026-04-29-09:16
   * Native sidebar actions can focus terminals directly or indirectly through
   * layout sync. Mirror those actions into the focus-only log so split-terminal
   * focus jumps can be traced only when debugging mode is enabled.
   */
  if (!isNativeSidebarDebugLoggingEnabled()) {
    return;
  }
  window.webkit?.messageHandlers?.zmuxNativeHost?.postMessage({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendTerminalFocusDebugLog",
  });
}

function appendTerminalLaunchDebugLog(event: string, details?: unknown): void {
  /**
   * CDXC:CrashDiagnostics 2026-05-04-09:10
   * Rapid agent-button clicks can crash during terminal creation. Persist the
   * sidebar launch order before native Ghostty receives each create/focus/layout
   * command so the failing boundary is visible after the process exits.
   */
  appendTerminalFocusDebugLog(event, details);
}

const AGENT_COLOR_ENVIRONMENT_KEYS = [
  "ANSI_COLORS_DISABLED",
  "CI",
  "CLICOLOR",
  "CLICOLOR_FORCE",
  "COLORTERM",
  "FORCE_COLOR",
  "NO_COLOR",
  "NODE_DISABLE_COLORS",
  "TERM",
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
] as const;

function readAgentColorEnvironmentSnapshot(
  environment: Record<string, string | undefined>,
): Record<string, string | null> {
  /**
   * CDXC:AgentCliColorDiagnostics 2026-05-04-15:39
   * Native Ghostty receives a session env overlay from the sidebar before the
   * agent wrapper starts. Log color-affecting keys here so restored and newly
   * opened agent terminals can be compared against the wrapper's inherited env.
   */
  return Object.fromEntries(
    AGENT_COLOR_ENVIRONMENT_KEYS.map((key) => [key, environment[key] ?? null]),
  ) as Record<string, string | null>;
}

function appendRestoreDebugLog(event: string, details?: unknown): void {
  if (!isNativeSidebarDebugLoggingEnabled()) {
    return;
  }
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendRestoreDebugLog",
  });
}

function appendWorkspaceDockIndicatorDebugLog(event: string, details?: unknown): void {
  if (!isNativeSidebarDebugLoggingEnabled()) {
    return;
  }
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendWorkspaceDockIndicatorDebugLog",
  });
}

function isNativeSidebarDebugLoggingEnabled(): boolean {
  return settings.debuggingMode;
}

function isTerminalFocusDebugCommand(command: NativeHostCommand): boolean {
  return (
    command.type === "createTerminal" ||
    command.type === "createWebPane" ||
    command.type === "focusTerminal" ||
    command.type === "focusWebPane" ||
    command.type === "sendTerminalEnter" ||
    command.type === "setActiveTerminalSet" ||
    command.type === "setTerminalLayout" ||
    command.type === "setTerminalVisibility" ||
    command.type === "writeTerminalText"
  );
}

function summarizeNativeFocusCommand(command: NativeHostCommand): Record<string, unknown> {
  return {
    activeSessionIds: "activeSessionIds" in command ? command.activeSessionIds : undefined,
    backgroundColor: "backgroundColor" in command ? command.backgroundColor : undefined,
    focusRequestId: "focusRequestId" in command ? command.focusRequestId : undefined,
    focusedSessionId: "focusedSessionId" in command ? command.focusedSessionId : undefined,
    hasInitialInput: "initialInput" in command ? Boolean(command.initialInput) : undefined,
    layoutLeafSessionIds:
      "layout" in command ? summarizeNativeLayoutLeafSessionIds(command.layout) : undefined,
    paneGap: "paneGap" in command ? command.paneGap : undefined,
    sessionId: "sessionId" in command ? command.sessionId : undefined,
    textLength: "text" in command ? command.text.length : undefined,
    textPreview: "text" in command ? summarizeTerminalText(command.text) : undefined,
    title: "title" in command ? command.title : undefined,
    type: command.type,
    visible: "visible" in command ? command.visible : undefined,
  };
}

function queueNativeLayoutFocusRequest(sessionId: string, reason: string): void {
  pendingNativeLayoutFocusRequest = {
    reason,
    requestId: ++nextNativeLayoutFocusRequestId,
    sessionId,
  };
}

function summarizeNativeLayoutLeafSessionIds(layout: NativeTerminalLayout | undefined): string[] {
  if (!layout) {
    return [];
  }
  if (layout.kind === "leaf") {
    return [layout.sessionId];
  }
  return layout.children.flatMap(summarizeNativeLayoutLeafSessionIds);
}

function summarizeTerminalText(text: string): string {
  return text.replace(/\r/g, "\\r").replace(/\n/g, "\\n").slice(0, 160);
}

function getTerminalFocusDebugSnapshot():
  | { focusedSessionId?: string; visibleSessionIds: string[] }
  | undefined {
  try {
    const snapshot = activeSnapshot();
    return {
      focusedSessionId: snapshot.focusedSessionId,
      visibleSessionIds: snapshot.visibleSessionIds,
    };
  } catch {
    return undefined;
  }
}

function safeSerializeForNativeLog(details: unknown): string {
  try {
    return JSON.stringify(details);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
}

function openNativeExternalUrl(url: string): void {
  postNative({ type: "openExternalUrl", url });
}

function openNativeWorkspaceInFinder(workspacePath: string): void {
  postNative({ type: "openWorkspaceInFinder", workspacePath });
}

function openNativeWorkspaceInSelectedIde(
  workspacePath: string,
  targetApp: ZedOverlayTargetApp = settings.zedOverlayTargetApp,
): void {
  /**
   * CDXC:WorkspaceActions 2026-05-04-08:22
   * Project right-click IDE opens are explicit user commands. They use the
   * Settings-selected IDE target directly and do not require IDE attachment or
   * sync-open settings to be enabled first.
   *
   * CDXC:SidebarActions 2026-05-05-03:11
   * Sidebar Open In can choose a concrete IDE per click. Accepting an explicit
   * target here keeps context-menu opens settings-driven while letting the
   * Actions dropdown open Finder, VS Code, or Zed without mutating Settings.
   */
  postNative({
    targetApp,
    type: "openWorkspaceInIde",
    workspacePath,
  });
}

function openChromeCanaryBrowserWindow(url: string): void {
  /**
   * CDXC:BrowserOverlay 2026-04-26-05:14
   * Browser-type actions should not use the user's default browser. They launch
   * Chrome Canary through the native host so Swift can place that browser
   * window above the currently attached zmux window.
   */
  postNative({ type: "openBrowserWindow", url });
}

function openNativeBrowserWindow(url: string): BrowserSessionRecord | undefined {
  if (settings.browserOpenMode === "browser-pane") {
    return createNativeBrowserSession(url);
  }
  openChromeCanaryBrowserWindow(url);
  return undefined;
}

function normalizeBrowserPaneUrl(url: string): string {
  const trimmedUrl = url.trim() || DEFAULT_BROWSER_LAUNCH_URL;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl)) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
}

function browserPaneTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname || "Browser";
  } catch {
    return "Browser";
  }
}

function createNativeBrowserSession(url: string, groupId?: string): BrowserSessionRecord | undefined {
  const project = activeProject();
  const normalizedUrl = normalizeBrowserPaneUrl(url);
  const targetWorkspace = groupId
    ? focusGroupInSimpleWorkspace(project.workspace, groupId).snapshot
    : project.workspace;
  /**
   * CDXC:BrowserPanes 2026-05-02-06:35
   * Browser-pane mode turns every browser action into a first-class workspace
   * browser session. The card lives beside terminal and T3 cards in the active
   * group instead of appearing in the old dedicated Chrome Canary Browsers
   * section, matching the requested pane-based workflow.
   */
  const result = createSessionInSimpleWorkspace(targetWorkspace, {
    browser: { url: normalizedUrl },
    kind: "browser",
    title: browserPaneTitleFromUrl(normalizedUrl),
  });
  const session = result.session?.kind === "browser" ? result.session : undefined;
  if (!session) {
    return undefined;
  }

  const nativeSessionId = rememberNativeSessionMapping(project.projectId, session.sessionId);
  updateActiveProjectWorkspace(() => result.snapshot);
  postNative({
    cwd: project.path,
    sessionId: nativeSessionId,
    title: session.title || "Browser",
    type: "createWebPane",
    url: normalizedUrl,
  });
  postNative({ sessionId: nativeSessionId, type: "focusWebPane" });
  publish();
  return session;
}

function revealSessionAsAdditionalNativePane(
  sessionId: string,
): void {
  const group = activeWorkspaceGroup();
  const nextVisibleCount = clampVisibleSessionCount(
    Math.min(group.snapshot.sessions.length, group.snapshot.visibleCount + 1),
  );
  /**
   * CDXC:BrowserPanes 2026-05-02-17:48
   * Browser top-row split controls must create visible native panes, not
   * background sidebar cards. Zmux's workspace state is the source of truth for
   * the AppKit layout, so focus the new session and expand visibleCount before
   * the next native layout sync.
   */
  updateActiveProjectWorkspace((workspace) =>
    setVisibleCountInSimpleWorkspace(
      focusSessionInSimpleWorkspace(workspace, sessionId).snapshot,
      nextVisibleCount,
    ),
  );
  syncNativeLayout();
  publish();
}

function applyRecommendedGhosttySettings(): void {
  /**
   * CDXC:GhosttySettings 2026-04-30-01:48
   * Recommended Ghostty settings are written as a managed config block through
   * the native host so the app updates the same file embedded Ghostty reads.
   */
  postNative({
    lines: [...ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES],
    managedKeys: [...ZMUX_GHOSTTY_MANAGED_CONFIG_KEYS],
    reloadImmediately: true,
    type: "applyGhosttyConfigSettings",
  });
}

function resetGhosttySettingsToDefault(): void {
  postNative({
    lines: [],
    managedKeys: [...ZMUX_GHOSTTY_MANAGED_CONFIG_KEYS],
    reloadImmediately: true,
    type: "applyGhosttyConfigSettings",
  });
}

function openGhosttyConfigFile(): void {
  postNative({ type: "openGhosttyConfigFile" });
}

function showNativeBrowserWindow(): void {
  /**
   * CDXC:BrowserOverlay 2026-04-26-07:37
   * When Chrome Canary is already running, the sidebar Browsers section exposes
   * one " Chrome Canary" control for every zmux session. The control asks
   * Swift to raise and resize the existing Canary window above the zmux
   * workarea, without opening a replacement URL or using a browser fallback.
   */
  postNative({ type: "showBrowserWindow" });
}

function runNativeProcess(
  executable: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> } = {},
): Promise<NativeProcessResult> {
  /**
   * CDXC:NativeCommandBridge 2026-04-26-03:16
   * Native sidebar features can request background process execution from Swift.
   * This keeps Git and URL-launch workflows native while preserving the shared
   * sidebar UI contract.
   */
  const requestId = `process-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  postNative({
    args,
    cwd: options.cwd,
    env: options.env,
    executable,
    requestId,
    type: "runProcess",
  });
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingProcessResults.delete(requestId);
      reject(new Error(`${executable} ${args.join(" ")} timed out`));
    }, 30_000);
    pendingProcessResults.set(requestId, { reject, resolve, timeout });
  });
}

async function runGit(
  args: string[],
  options: { allowFailure?: boolean } = {},
): Promise<NativeProcessResult> {
  const result = await runNativeProcess("/usr/bin/env", ["git", ...args], {
    cwd: activeProject().path,
  });
  if (!options.allowFailure && result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `git ${args.join(" ")} failed`);
  }
  return result;
}

async function runGh(
  args: string[],
  options: { allowFailure?: boolean } = {},
): Promise<NativeProcessResult> {
  const result = await runNativeProcess("/usr/bin/env", ["gh", ...args], {
    cwd: activeProject().path,
  });
  if (!options.allowFailure && result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `gh ${args.join(" ")} failed`);
  }
  return result;
}

async function refreshChromeCanaryRunningState(): Promise<void> {
  /**
   * CDXC:BrowserOverlay 2026-04-26-07:37
   * The native sidebar should bring back the existing Browsers section only
   * while Chrome Canary is actually running. Poll the macOS process table from
   * the native process bridge so every project/session gets the same one-button
   * Canary control without inventing persistent browser sessions.
   */
  const result = await runNativeProcess("/usr/bin/pgrep", ["-qx", CHROME_CANARY_PROCESS_NAME]);
  const nextIsRunning = result.exitCode === 0;
  if (isChromeCanaryRunning === nextIsRunning) {
    return;
  }

  isChromeCanaryRunning = nextIsRunning;
  publish();
}

function startChromeCanaryRunningMonitor(): void {
  void refreshChromeCanaryRunningState().catch((error) => {
    console.warn("Failed to refresh Chrome Canary running state.", error);
  });
  window.setInterval(() => {
    void refreshChromeCanaryRunningState().catch((error) => {
      console.warn("Failed to refresh Chrome Canary running state.", error);
    });
  }, CHROME_CANARY_RUNNING_POLL_MS);
}

function startFirstPromptAutoRenameMonitor(): void {
  void ensureNativeAgentFirstPromptHooks().catch((error) => {
    appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.hookInstallFailed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  void pollNativeFirstPromptAutoRenameSessions().catch((error) => {
    appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.pollFailed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  window.setInterval(() => {
    void pollNativeFirstPromptAutoRenameSessions().catch((error) => {
      appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.pollFailed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, FIRST_PROMPT_AUTO_RENAME_POLL_MS);
}

function readStoredSettings(): zmuxSettings {
  try {
    const sharedSettingsJson = window.__zmux_NATIVE_HOST__?.sharedSidebarStorage?.settings;
    const storedSettingsSource = JSON.parse(
      sharedSettingsJson || localStorage.getItem(SETTINGS_STORAGE_KEY) || "null",
    );
    const storedSettings = normalizezmuxSettings(
      normalizeStoredSettingsSidebarMode(storedSettingsSource),
    );
    if (!sharedSettingsJson) {
      persistSharedSettingsSnapshot(storedSettings);
    }
    const bootstrap = window.__zmux_NATIVE_HOST__;
    return normalizezmuxSettings({
      ...storedSettings,
      ...(bootstrap?.zedOverlayEnabled === undefined
        ? {}
        : { zedOverlayEnabled: bootstrap.zedOverlayEnabled }),
      ...(bootstrap?.zedOverlayTargetApp === undefined
        ? {}
        : { zedOverlayTargetApp: bootstrap.zedOverlayTargetApp }),
      ...(bootstrap?.zedOverlayHideTitlebarButton === undefined
        ? {}
        : { zedOverlayHideTitlebarButton: bootstrap.zedOverlayHideTitlebarButton }),
    });
  } catch {
    return DEFAULT_zmux_SETTINGS;
  }
}

function normalizeStoredSettingsSidebarMode(candidate: unknown): unknown {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    "sidebarMode" in candidate
  ) {
    return candidate;
  }

  /**
   * CDXC:SidebarMode 2026-05-03-10:42
   * Combined is the default for first installs with no settings object. Existing
   * installs that already persisted settings before sidebarMode existed should
   * remain on the previous Separated presentation until the user changes the
   * new settings dropdown.
   */
  return {
    ...candidate,
    sidebarMode: "separated",
  };
}

function saveSettings(nextSettings: zmuxSettings): void {
  const previousSettings = settings;
  settings = normalizezmuxSettings(nextSettings);
  if (!settings.zedOverlayEnabled || !settings.syncOpenProjectWithZed) {
    clearPendingZedProjectSync();
  }
  persistSharedSettingsSnapshot(settings);
  syncGhosttyTerminalSettings(settings, previousSettings);
  postZedOverlaySettings();
  publish();
  previewNativeSoundSettingChange(previousSettings, settings);
}

function nextSessionPersistenceProvider(
  provider: zmuxSettings["sessionPersistenceProvider"],
): zmuxSettings["sessionPersistenceProvider"] {
  switch (provider) {
    case "off":
      return "tmux";
    case "tmux":
      return "zmx";
    case "zmx":
      return "off";
  }
}

function syncGhosttyTerminalSettings(
  nextSettings: zmuxSettings,
  previousSettings?: zmuxSettings,
): void {
  /**
   * CDXC:TerminalSettings 2026-04-26-19:02
   * Native zmux settings are stored in sidebar localStorage, so terminal
   * typography must also be posted to AppDelegate to update the shared Ghostty
   * config file used by external Ghostty windows.
   *
   * CDXC:TerminalScrollSettings 2026-04-29-08:56
   * Scroll multipliers must be testable as soon as the slider settles. Reload
   * Ghostty immediately for scroll-only changes instead of waiting for the
   * delayed font-metric reload path used during typography drags.
   */
  postNative({
    ...getGhosttyTerminalConfigValues(nextSettings),
    reloadImmediately:
      previousSettings !== undefined &&
      (previousSettings.terminalMouseScrollMultiplierDiscrete !==
        nextSettings.terminalMouseScrollMultiplierDiscrete ||
        previousSettings.terminalMouseScrollMultiplierPrecision !==
          nextSettings.terminalMouseScrollMultiplierPrecision),
    type: "syncGhosttyTerminalSettings",
  });
}

function saveSettingsFromNative(nextSettings: zmuxSettings): void {
  /**
   * CDXC:ZedOverlay 2026-04-26-10:54
   * Native Detach has already persisted and applied the disabled Zed attach
   * state. Mirror that state into sidebar localStorage and React state without
   * posting a duplicate configure command back to the native host.
  */
  settings = normalizezmuxSettings(nextSettings);
  if (!settings.zedOverlayEnabled || !settings.syncOpenProjectWithZed) {
    clearPendingZedProjectSync();
  }
  persistSharedSettingsSnapshot(settings);
  publish();
}

function persistSharedSettingsSnapshot(nextSettings: zmuxSettings): void {
  const payloadJson = JSON.stringify(nextSettings);
  localStorage.setItem(SETTINGS_STORAGE_KEY, payloadJson);
  postNative({ key: "settings", payloadJson, type: "persistSharedSidebarStorage" });
}

function playNativeSound(sound: CompletionSoundSetting, volume = 0.5): void {
  postNative({
    fileName: getCompletionSoundFileName(sound),
    type: "playSound",
    volume,
  });
}

function playNativeSessionCompletionSound(sessionId: string, source: string): void {
  /**
   * CDXC:NativeSound 2026-04-29-16:30
   * Session completion sounds follow the completion bell setting and play when
   * a terminal first enters attention/done state. Native playback uses the
   * configured completion sound instead of the sidebar webview audio path.
   */
  if (!settings.completionBellEnabled) {
    return;
  }

  appendAgentDetectionDebugLog("nativeSidebar.completionSound.session", {
    sessionId,
    sound: settings.completionSound,
    source,
  });
  playNativeSound(settings.completionSound);
}

function previewNativeSoundSettingChange(
  previousSettings: zmuxSettings,
  nextSettings: zmuxSettings,
): void {
  /**
   * CDXC:Settings 2026-04-29-16:30
   * Sound picker changes should immediately preview the selected sound so
   * users can choose completion and action alerts by ear without waiting for a
   * terminal session or action to finish.
   */
  if (previousSettings.completionSound !== nextSettings.completionSound) {
    playNativeSound(nextSettings.completionSound);
    return;
  }

  if (previousSettings.actionCompletionSound !== nextSettings.actionCompletionSound) {
    playNativeSound(nextSettings.actionCompletionSound);
  }
}

function readStoredAgents(): StoredSidebarAgent[] {
  try {
    return normalizeStoredSidebarAgents(
      JSON.parse(localStorage.getItem(AGENTS_STORAGE_KEY) || "null"),
    );
  } catch {
    return [];
  }
}

function readStoredAgentOrder(): string[] {
  try {
    return normalizeStoredSidebarAgentOrder(
      JSON.parse(localStorage.getItem(AGENT_ORDER_STORAGE_KEY) || "null"),
    );
  } catch {
    return [];
  }
}

function writeStoredAgents(nextAgents: readonly StoredSidebarAgent[]): void {
  storedAgents = normalizeStoredSidebarAgents(nextAgents);
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(storedAgents));
  refreshAgents();
}

function writeStoredAgentOrder(nextOrder: readonly string[]): void {
  storedAgentOrder = normalizeStoredSidebarAgentOrder(nextOrder);
  localStorage.setItem(AGENT_ORDER_STORAGE_KEY, JSON.stringify(storedAgentOrder));
  refreshAgents();
}

function refreshAgents(): void {
  agents = createSidebarAgentButtons(storedAgents, storedAgentOrder);
}

function readStoredCommands(): StoredSidebarCommand[] {
  try {
    return normalizeStoredSidebarCommands(
      JSON.parse(localStorage.getItem(COMMANDS_STORAGE_KEY) || "null"),
    );
  } catch {
    return [];
  }
}

function readStoredCommandOrder(): string[] {
  try {
    return normalizeStoredSidebarCommandOrder(
      JSON.parse(localStorage.getItem(COMMAND_ORDER_STORAGE_KEY) || "null"),
    );
  } catch {
    return [];
  }
}

function readDeletedDefaultCommandIds(): string[] {
  try {
    return normalizeStoredSidebarCommandOrder(
      JSON.parse(localStorage.getItem(DELETED_DEFAULT_COMMANDS_STORAGE_KEY) || "null"),
    );
  } catch {
    return [];
  }
}

function writeStoredCommands(nextCommands: readonly StoredSidebarCommand[]): void {
  storedCommands = normalizeStoredSidebarCommands(nextCommands);
  localStorage.setItem(COMMANDS_STORAGE_KEY, JSON.stringify(storedCommands));
  refreshCommands();
}

function writeStoredCommandOrder(nextOrder: readonly string[]): void {
  storedCommandOrder = normalizeStoredSidebarCommandOrder(nextOrder);
  localStorage.setItem(COMMAND_ORDER_STORAGE_KEY, JSON.stringify(storedCommandOrder));
  refreshCommands();
}

function writeDeletedDefaultCommandIds(nextCommandIds: readonly string[]): void {
  deletedDefaultCommandIds = normalizeStoredSidebarCommandOrder(nextCommandIds);
  localStorage.setItem(
    DELETED_DEFAULT_COMMANDS_STORAGE_KEY,
    JSON.stringify(deletedDefaultCommandIds),
  );
  refreshCommands();
}

function refreshCommands(): void {
  commands = createNativeSidebarCommandButtons();
}

function readStoredProjects(): { activeProjectId: string; projects: NativeProject[] } {
  const fallbackProject = createInitialProject();
  try {
    const sharedProjectsJson = window.__zmux_NATIVE_HOST__?.sharedSidebarStorage?.projects;
    const candidate = JSON.parse(
      sharedProjectsJson || localStorage.getItem(PROJECTS_STORAGE_KEY) || "null",
    );
    const candidateProjects: NativeProject[] = Array.isArray(candidate?.projects)
      ? candidate.projects.flatMap((project: unknown) => normalizeStoredNativeProject(project))
      : [];
    const projects = candidateProjects.length > 0 ? candidateProjects : [fallbackProject];
    const restoredActiveProjectId =
      typeof candidate?.activeProjectId === "string" &&
      projects.some((project) => project.projectId === candidate.activeProjectId)
        ? candidate.activeProjectId
        : projects[0]!.projectId;
    /**
     * CDXC:RecentProjects 2026-05-04-14:25
     * Combined-mode installs keep the sidebar clean by moving only empty
     * non-chat startup projects into the bottom Recent Projects drawer. Stored
     * sleeping sessions still count, so restart does not hide parked work.
     */
    const startupRecentProjects =
      settings.sidebarMode === "combined"
        ? normalizeStartupRecentProjects(projects, new Date().toISOString())
        : { changed: false, projects };
    const activeProjectId = resolveStartupActiveProjectId(
      startupRecentProjects.projects,
      restoredActiveProjectId,
      settings.sidebarMode === "combined",
    );
    const startupProjects = normalizeStartupTerminalSleepState(
      startupRecentProjects.projects,
      activeProjectId,
    );
    if (candidateProjects.length > 0) {
      persistSharedProjectsSnapshot(activeProjectId, startupProjects);
    }
    appendRestoreDebugLog("nativeSidebar.projects.read", {
      activeProjectId,
      projectCount: startupProjects.length,
      projects: startupProjects.map(summarizeNativeProject),
      source:
        candidateProjects.length > 0
          ? sharedProjectsJson
            ? "sharedStorage"
            : "localStorage"
          : "fallback",
    });
    return { activeProjectId, projects: startupProjects };
  } catch (error) {
    appendRestoreDebugLog("nativeSidebar.projects.readFailed", {
      error: error instanceof Error ? error.message : String(error),
      fallbackProject: summarizeNativeProject(fallbackProject),
    });
    return { activeProjectId: fallbackProject.projectId, projects: [fallbackProject] };
  }
}

function resolveStartupActiveProjectId(
  startupProjects: readonly NativeProject[],
  restoredActiveProjectId: string,
  shouldSkipRecentProjects: boolean,
): string {
  const restoredActiveProject = startupProjects.find(
    (project) => project.projectId === restoredActiveProjectId,
  );
  if (
    restoredActiveProject &&
    (!shouldSkipRecentProjects || restoredActiveProject.isRecentProject !== true)
  ) {
    return restoredActiveProjectId;
  }

  const fallbackProject = shouldSkipRecentProjects
    ? startupProjects.find((project) => project.isRecentProject !== true)
    : startupProjects[0];
  return fallbackProject?.projectId ?? restoredActiveProjectId;
}

function normalizeStartupTerminalSleepState(
  storedProjects: readonly NativeProject[],
  storedActiveProjectId: string,
): NativeProject[] {
  /**
   * CDXC:SessionSleep 2026-04-27-09:12
   * Native startup restores layout state, not every terminal process. Background
   * workspaces, inactive groups, and off-screen terminal cards start sleeping;
   * only the last active workspace group's visible terminal cards are eligible
   * to wake immediately.
   */
  return storedProjects.map((project) => ({
    ...project,
    workspace: {
      ...project.workspace,
      groups: project.workspace.groups.map((group) => {
        const visibleIds = new Set(group.snapshot.visibleSessionIds);
        const isActiveVisibleGroup =
          project.projectId === storedActiveProjectId &&
          group.groupId === project.workspace.activeGroupId;
        return {
          ...group,
          snapshot: {
            ...group.snapshot,
            sessions: group.snapshot.sessions.map((session) =>
              session.kind === "terminal"
                ? {
                    ...session,
                    isSleeping: !(isActiveVisibleGroup && visibleIds.has(session.sessionId)),
                  }
                : session,
            ),
          },
        };
      }),
    },
  }));
}

function writeStoredProjects(reason: string): void {
  persistSharedProjectsSnapshot(activeProjectId, projects);
  /**
   * CDXC:WorkspaceRestore 2026-04-26-10:00
   * CDXC:DevAppFlavor 2026-04-28-02:01
   * zmux-dev and default zmux must share workspace/session state. Persist the
   * canonical project snapshot to the native shared state file and mirror it to
   * localStorage only as a same-webview cache.
   */
  appendRestoreDebugLog("nativeSidebar.projects.persist", {
    activeProjectId,
    projectCount: projects.length,
    projects: projects.map(summarizeNativeProject),
    reason,
  });
}

function persistSharedProjectsSnapshot(
  nextActiveProjectId: string,
  nextProjects: readonly NativeProject[],
): void {
  const payloadJson = JSON.stringify({
    activeProjectId: nextActiveProjectId,
    projects: nextProjects,
  });
  localStorage.setItem(PROJECTS_STORAGE_KEY, payloadJson);
  postNative({ key: "projects", payloadJson, type: "persistSharedSidebarStorage" });
}

function normalizeStoredNativeProject(candidate: unknown): NativeProject[] {
  if (!candidate || typeof candidate !== "object") {
    return [];
  }
  const project = candidate as Partial<NativeProject>;
  const path = project.path?.trim();
  if (!path) {
    return [];
  }
  const projectId = project.projectId?.trim() || createProjectId(path);
  return [
    {
      icon: normalizeWorkspaceDockIcon(project.icon) ?? normalizeLegacyWorkspaceDockIcon(project),
      iconDataUrl: normalizeWorkspaceDockIconDataUrl(project.iconDataUrl),
      isChat: project.isChat === true,
      isRecentProject: project.isRecentProject === true,
      name: project.name?.trim() || projectNameFromPath(path),
      path,
      projectId,
      recentClosedAt:
        typeof project.recentClosedAt === "string" &&
        !Number.isNaN(Date.parse(project.recentClosedAt))
          ? project.recentClosedAt
          : undefined,
      theme: normalizeWorkspaceDockTheme(project.theme),
      themeColor: normalizeWorkspaceThemeColor(project.themeColor),
      workspace: normalizeSimpleGroupedSessionWorkspaceSnapshot(project.workspace),
    },
  ];
}

function createInitialProject(): NativeProject {
  return {
    isChat: false,
    name: initialWorkspaceName,
    path: initialWorkspacePath,
    projectId: createProjectId(initialWorkspacePath),
    theme: resolveSidebarTheme(DEFAULT_zmux_SETTINGS.sidebarTheme, "dark"),
    workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
  };
}

function normalizeLegacyWorkspaceDockIcon(
  project: Partial<NativeProject>,
): WorkspaceDockIcon | undefined {
  const legacyIconDataUrl = normalizeWorkspaceDockIconDataUrl(project.iconDataUrl);
  return legacyIconDataUrl ? { dataUrl: legacyIconDataUrl, kind: "image" } : undefined;
}

function normalizeWorkspaceDockTheme(value: unknown): SidebarTheme | undefined {
  return WORKSPACE_DOCK_THEME_OPTIONS.some((theme) => theme.value === value)
    ? (value as SidebarTheme)
    : undefined;
}

function summarizeNativeProject(project: NativeProject) {
  return {
    activeGroupId: project.workspace.activeGroupId,
    groupCount: project.workspace.groups.length,
    groups: project.workspace.groups.map((group) => ({
      focusedSessionId: group.snapshot.focusedSessionId,
      groupId: group.groupId,
      sessionCount: group.snapshot.sessions.length,
      sessions: group.snapshot.sessions.map((session) => ({
        agentName: session.kind === "terminal" ? session.agentName : undefined,
        isSleeping: session.isSleeping === true,
        kind: session.kind,
        sessionId: session.sessionId,
        title: session.title,
      })),
      title: group.title,
      visibleSessionIds: group.snapshot.visibleSessionIds,
    })),
    isChat: project.isChat === true,
    isRecentProject: project.isRecentProject === true,
    name: project.name,
    path: project.path,
    projectId: project.projectId,
    recentClosedAt: project.recentClosedAt,
    theme: project.theme,
    themeColor: project.themeColor,
  };
}

function readScratchPadContent(): string {
  return localStorage.getItem(SCRATCH_PAD_STORAGE_KEY) || "";
}

function saveScratchPadContent(content: string): void {
  /**
   * CDXC:ScratchPadFocus 2026-04-28-05:21
   * Scratch Pad saves must be visible in the same terminal-focus repro trace
   * as textarea focus changes. Record only lengths so debugging can confirm
   * whether typing reached storage without persisting note text in logs.
   */
  appendTerminalFocusDebugLog("scratchPadFocus.nativeSave", {
    nextLength: content.length,
    previousLength: scratchPadContent.length,
  });
  scratchPadContent = content;
  localStorage.setItem(SCRATCH_PAD_STORAGE_KEY, scratchPadContent);
  publish();
}

function readPinnedPrompts(): SidebarPinnedPrompt[] {
  try {
    return normalizeSidebarPinnedPrompts(
      JSON.parse(localStorage.getItem(PINNED_PROMPTS_STORAGE_KEY) || "null"),
    );
  } catch {
    return [];
  }
}

function savePinnedPrompt(
  message: Extract<SidebarToExtensionMessage, { type: "savePinnedPrompt" }>,
): void {
  const now = new Date().toISOString();
  const promptId = message.promptId ?? `native-prompt-${Date.now().toString(36)}`;
  const existingPrompt = pinnedPrompts.find((prompt) => prompt.promptId === promptId);
  const nextPrompt: SidebarPinnedPrompt = {
    content: message.content,
    createdAt: existingPrompt?.createdAt ?? now,
    promptId,
    title: message.title.trim(),
    updatedAt: now,
  };
  pinnedPrompts = normalizeSidebarPinnedPrompts(
    existingPrompt
      ? pinnedPrompts.map((prompt) => (prompt.promptId === promptId ? nextPrompt : prompt))
      : [nextPrompt, ...pinnedPrompts],
  );
  localStorage.setItem(PINNED_PROMPTS_STORAGE_KEY, JSON.stringify(pinnedPrompts));
  publish();
}

function readCollapsedSections(): SidebarSectionCollapseState {
  try {
    const candidate = JSON.parse(localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY) || "null");
    if (!candidate || typeof candidate !== "object") {
      return { actions: false, agents: false };
    }
    return {
      actions: (candidate as Partial<SidebarSectionCollapseState>).actions === true,
      agents: (candidate as Partial<SidebarSectionCollapseState>).agents === true,
    };
  } catch {
    return { actions: false, agents: false };
  }
}

function setSidebarSectionCollapsed(section: SidebarCollapsibleSection, collapsed: boolean): void {
  collapsedSections = {
    ...collapsedSections,
    [section]: collapsed,
  };
  localStorage.setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify(collapsedSections));
  publish();
}

function readActiveSessionsSortMode(): SidebarActiveSessionsSortMode {
  /**
   * CDXC:NativeSidebar 2026-04-28-05:14
   * Last-active ordering must match the reference repo: missing or legacy sort
   * preferences default to last-activity ordering, and only an explicit manual
   * preference preserves manual card order.
   */
  return localStorage.getItem(ACTIVE_SESSIONS_SORT_MODE_STORAGE_KEY) === "manual"
    ? "manual"
    : "lastActivity";
}

function toggleActiveSessionsSortMode(): void {
  activeSessionsSortMode = activeSessionsSortMode === "manual" ? "lastActivity" : "manual";
  localStorage.setItem(ACTIVE_SESSIONS_SORT_MODE_STORAGE_KEY, activeSessionsSortMode);
  publish();
}

function readSidebarSide(): "left" | "right" {
  return localStorage.getItem(SIDEBAR_SIDE_STORAGE_KEY) === "right" ? "right" : "left";
}

function moveSidebarToOtherSide(): void {
  sidebarSide = sidebarSide === "left" ? "right" : "left";
  localStorage.setItem(SIDEBAR_SIDE_STORAGE_KEY, sidebarSide);
  postNative({ side: sidebarSide, type: "setSidebarSide" });
  publish();
}

function readGitPrimaryAction(): SidebarGitAction {
  const value = localStorage.getItem(GIT_PRIMARY_ACTION_STORAGE_KEY);
  return value === "push" || value === "pr" ? value : "commit";
}

function readBooleanStorage(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key);
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function setGitPrimaryAction(action: SidebarGitAction): void {
  gitPrimaryAction = action;
  localStorage.setItem(GIT_PRIMARY_ACTION_STORAGE_KEY, action);
  void refreshGitState();
}

function setGitCommitConfirmationEnabled(enabled: boolean): void {
  gitConfirmCommit = enabled;
  localStorage.setItem(GIT_CONFIRM_COMMIT_STORAGE_KEY, String(enabled));
  void refreshGitState();
}

function setGitGenerateCommitBodyEnabled(enabled: boolean): void {
  gitGenerateCommitBody = enabled;
  localStorage.setItem(GIT_GENERATE_COMMIT_BODY_STORAGE_KEY, String(enabled));
  void refreshGitState();
}

async function refreshGitState(): Promise<void> {
  /**
   * CDXC:NativeSidebarGit 2026-04-26-00:47
   * Git controls run through the native process bridge so commit/push/PR
   * commands execute in the selected project without showing macOS Terminal.
   */
  const baseState = createDefaultSidebarGitState(
    gitPrimaryAction,
    gitConfirmCommit,
    gitGenerateCommitBody,
  );
  gitState = { ...gitState, ...baseState, isBusy: true };
  publish();

  try {
    const repoCheck = await runGit(["rev-parse", "--is-inside-work-tree"], { allowFailure: true });
    if (repoCheck.exitCode !== 0 || repoCheck.stdout.trim() !== "true") {
      gitState = { ...baseState, isRepo: false };
      publish();
      return;
    }

    const [branch, status, diff, upstream, remotes, ghPath, pr] = await Promise.all([
      runGit(["branch", "--show-current"], { allowFailure: true }),
      runGit(["status", "--porcelain"], { allowFailure: true }),
      runGit(["diff", "--numstat", "HEAD"], { allowFailure: true }),
      runGit(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], { allowFailure: true }),
      runGit(["remote"], { allowFailure: true }),
      runNativeProcess("/usr/bin/env", ["which", "gh"]),
      runGh(["pr", "view", "--json", "number,state,title,url"], { allowFailure: true }),
    ]);

    const totals = parseGitNumstat(diff.stdout);
    const upstreamParts = upstream.exitCode === 0 ? upstream.stdout.trim().split(/\s+/) : [];
    const prValue = parseGitHubPullRequest(pr.stdout, pr.exitCode === 0);
    gitState = {
      ...baseState,
      additions: totals.additions,
      aheadCount: Number(upstreamParts[0] || 0) || 0,
      behindCount: Number(upstreamParts[1] || 0) || 0,
      branch: branch.stdout.trim() || null,
      deletions: totals.deletions,
      hasGitHubCli: ghPath.exitCode === 0,
      hasOriginRemote: remotes.stdout.split(/\s+/).includes("origin"),
      hasUpstream: upstream.exitCode === 0,
      hasWorkingTreeChanges: status.stdout.trim().length > 0,
      isBusy: false,
      isRepo: true,
      pr: prValue,
    };
  } catch (error) {
    gitState = { ...baseState, isBusy: false, isRepo: false };
    showNativeMessage(
      "error",
      error instanceof Error ? error.message : "Failed to refresh git state.",
    );
  }
  publish();
}

function parseGitNumstat(stdout: string): { additions: number; deletions: number } {
  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .reduce(
      (totals, line) => {
        const [additions, deletions] = line.split(/\s+/);
        return {
          additions: totals.additions + (Number(additions) || 0),
          deletions: totals.deletions + (Number(deletions) || 0),
        };
      },
      { additions: 0, deletions: 0 },
    );
}

function parseGitHubPullRequest(stdout: string, success: boolean): SidebarGitState["pr"] {
  if (!success || !stdout.trim()) {
    return null;
  }
  try {
    const candidate = JSON.parse(stdout) as Partial<NonNullable<SidebarGitState["pr"]>>;
    const state = String(candidate.state || "").toLowerCase();
    if (!candidate.url || !candidate.title || !["open", "closed", "merged"].includes(state)) {
      return null;
    }
    return {
      number: typeof candidate.number === "number" ? candidate.number : undefined,
      state: state as NonNullable<SidebarGitState["pr"]>["state"],
      title: candidate.title,
      url: candidate.url,
    };
  } catch {
    return null;
  }
}

function createGitCommitDraft(action: SidebarGitAction): { body?: string; subject: string } {
  const project = activeProject();
  const subject = `Update ${project.name}`;
  return {
    body: gitGenerateCommitBody
      ? `Native zmux commit from ${project.path}.\n\nAdditions: ${gitState.additions}\nDeletions: ${gitState.deletions}`
      : undefined,
    subject,
  };
}

async function runSidebarGitAction(action: SidebarGitAction): Promise<void> {
  await refreshGitState();
  if (!gitState.isRepo) {
    showNativeMessage("warning", "Open a Git repository to use Git actions.");
    return;
  }

  try {
    gitState = { ...gitState, isBusy: true };
    publish();
    if (action === "commit") {
      if ((await commitWorkingTree(action)) === "pending") {
        return;
      }
    } else if (action === "push") {
      if ((await commitWorkingTreeIfNeeded(action)) === "pending") {
        return;
      }
      await pushCurrentBranch();
    } else {
      if ((await commitWorkingTreeIfNeeded(action)) === "pending") {
        return;
      }
      await pushCurrentBranch();
      await openOrCreatePullRequest();
    }
    await refreshGitState();
  } catch (error) {
    gitState = { ...gitState, isBusy: false };
    publish();
    showNativeMessage("error", error instanceof Error ? error.message : `Git ${action} failed.`);
  }
}

async function commitWorkingTreeIfNeeded(
  action: SidebarGitAction,
): Promise<"committed" | "pending" | "skipped"> {
  if (!gitState.hasWorkingTreeChanges) {
    return "skipped";
  }
  return commitWorkingTree(action);
}

async function commitWorkingTree(
  action: SidebarGitAction,
): Promise<"committed" | "pending" | "skipped"> {
  if (!gitState.hasWorkingTreeChanges) {
    showNativeMessage("info", "There are no working tree changes to commit.");
    return "skipped";
  }
  const draft = createGitCommitDraft(action);
  if (gitConfirmCommit) {
    const requestId = `git-commit-${Date.now().toString(36)}`;
    pendingGitCommitRequests.set(requestId, { action, ...draft });
    sidebarBus.post({
      action,
      confirmLabel:
        action === "commit" ? "Commit" : action === "push" ? "Commit & Push" : "Commit, Push & PR",
      description: `Commit changes in ${activeProject().name}.`,
      requestId,
      suggestedBody: draft.body,
      suggestedSubject: draft.subject,
      type: "promptGitCommit",
    });
    gitState = { ...gitState, isBusy: false };
    publish();
    return "pending";
  }
  await commitWithMessage(draft.subject, draft.body);
  return "committed";
}

async function commitWithMessage(subject: string, body?: string): Promise<void> {
  await runGit(["add", "-A"]);
  const args = ["commit", "-m", subject.trim() || "Update project"];
  if (body?.trim()) {
    args.push("-m", body.trim());
  }
  await runGit(args);
}

async function continueGitActionAfterCommitConfirmation(
  requestId: string,
  message: string,
): Promise<void> {
  const pending = pendingGitCommitRequests.get(requestId);
  if (!pending) {
    return;
  }
  pendingGitCommitRequests.delete(requestId);
  try {
    gitState = { ...gitState, isBusy: true };
    publish();
    await commitWithMessage(message.trim() || pending.subject, pending.body);
    if (pending.action === "push") {
      await pushCurrentBranch();
    }
    if (pending.action === "pr") {
      await pushCurrentBranch();
      await openOrCreatePullRequest();
    }
    await refreshGitState();
  } catch (error) {
    gitState = { ...gitState, isBusy: false };
    publish();
    showNativeMessage("error", error instanceof Error ? error.message : "Git commit failed.");
  }
}

async function pushCurrentBranch(): Promise<void> {
  const branch = gitState.branch;
  if (!branch) {
    throw new Error("Create and checkout a branch before pushing.");
  }
  if (gitState.hasUpstream) {
    await runGit(["push"]);
    return;
  }
  if (!gitState.hasOriginRemote) {
    throw new Error('Add an "origin" remote before pushing.');
  }
  await runGit(["push", "-u", "origin", branch]);
}

async function openOrCreatePullRequest(): Promise<void> {
  if (gitState.pr?.state === "open") {
    openNativeExternalUrl(gitState.pr.url);
    return;
  }
  if (!gitState.hasGitHubCli) {
    throw new Error("Install GitHub CLI to create or view pull requests.");
  }
  const result = await runGh(["pr", "create", "--fill"]);
  const url = result.stdout
    .split(/\s+/)
    .find((part) => /^https:\/\/github\.com\/.+\/pull\/\d+/.test(part));
  if (url) {
    openNativeExternalUrl(url);
  }
}

function readPreviousSessions(): SidebarPreviousSessionItem[] {
  try {
    const sharedPreviousSessionsJson =
      window.__zmux_NATIVE_HOST__?.sharedSidebarStorage?.previousSessions;
    const candidate = JSON.parse(
      sharedPreviousSessionsJson || localStorage.getItem(PREVIOUS_SESSIONS_STORAGE_KEY) || "null",
    );
    if (!Array.isArray(candidate)) {
      return [];
    }
    const sessions = candidate
      .filter(isSidebarPreviousSessionItem)
      .filter(shouldKeepStoredPreviousSessionItem)
      .slice(0, 80);
    if (!sharedPreviousSessionsJson && sessions.length > 0) {
      postNative({
        key: "previousSessions",
        payloadJson: JSON.stringify(sessions),
        type: "persistSharedSidebarStorage",
      });
    }
    return sessions;
  } catch {
    return [];
  }
}

function writePreviousSessions(nextSessions: readonly SidebarPreviousSessionItem[]): void {
  previousSessions = nextSessions.slice(0, 80);
  const payloadJson = JSON.stringify(previousSessions);
  localStorage.setItem(PREVIOUS_SESSIONS_STORAGE_KEY, payloadJson);
  postNative({ key: "previousSessions", payloadJson, type: "persistSharedSidebarStorage" });
}

function rememberPreviousSession(sessionId: string, project = activeProject()): void {
  const previousItem = createPreviousSessionItem(sessionId, project);
  if (!previousItem) {
    return;
  }
  writePreviousSessions([
    previousItem,
    ...previousSessions.filter((session) => session.historyId !== previousItem.historyId),
  ]);
}

function createPreviousSessionItem(
  sessionId: string,
  project: NativeProject,
): SidebarPreviousSessionItem | undefined {
  for (const group of project.workspace.groups) {
    const sessionRecord = group.snapshot.sessions.find((session) => session.sessionId === sessionId);
    if (!sessionRecord) {
      continue;
    }
    const terminalState = terminalStateById.get(sessionId);
    const archivedSessionRecord = createArchivedPreviousSessionRecord(
      sessionRecord,
      terminalState,
    );
    if (!shouldRememberPreviousSessionRecord(archivedSessionRecord)) {
      appendRestoreDebugLog("nativeSidebar.previousSession.skipped", {
        agentName:
          archivedSessionRecord.kind === "terminal" ? archivedSessionRecord.agentName : undefined,
        reason: "default-or-untrusted-title",
        sessionId,
        title: archivedSessionRecord.title,
        titleSource: archivedSessionRecord.titleSource,
      });
      return undefined;
    }
    const sidebarSession = createProjectedSidebarSessionsForGroup({
      ...group,
      snapshot: {
        ...group.snapshot,
        sessions: group.snapshot.sessions.map((session) =>
          session.sessionId === archivedSessionRecord.sessionId ? archivedSessionRecord : session,
        ),
      },
    }).find((session) => session.sessionId === sessionId);
    if (!sidebarSession) {
      continue;
    }
    return {
      ...sidebarSession,
      activity: "idle",
      closedAt: new Date().toISOString(),
      firstUserMessage: archivedSessionRecord.firstUserMessage ?? sidebarSession.firstUserMessage,
      groupId: group.groupId,
      historyId: `native-history-${Date.now().toString(36)}-${sessionId}`,
      isGeneratedName: false,
      isRestorable: archivedSessionRecord.kind === "terminal",
      isRunning: false,
      lifecycleState: terminalState?.lifecycleState === "error" ? "error" : "done",
      projectId: project.projectId,
      projectName: project.name,
      projectPath: project.path,
      sessionRecord: archivedSessionRecord,
      terminalTitle: terminalState?.terminalTitle ?? sidebarSession.terminalTitle,
    };
  }
  return undefined;
}

function createArchivedPreviousSessionRecord(
  session: SessionRecord,
  terminalState: ReturnType<typeof terminalStateById.get>,
): SessionRecord {
  if (session.kind !== "terminal") {
    return {
      ...session,
      isSleeping: false,
    };
  }

  const archiveTitle = getNativePreviousSessionArchiveTitle(session, terminalState);
  return {
    ...session,
    agentName: terminalState?.agentName ?? session.agentName,
    firstUserMessage: session.firstUserMessage ?? terminalState?.firstUserMessage,
    isSleeping: false,
    title: archiveTitle.title ?? session.title,
    titleSource: archiveTitle.title
      ? (archiveTitle.titleSource ?? session.titleSource)
      : session.titleSource,
  };
}

function getNativePreviousSessionArchiveTitle(
  session: TerminalSessionRecord,
  terminalState: ReturnType<typeof terminalStateById.get>,
): {
  title?: string;
  titleSource?: TerminalSessionRecord["titleSource"];
} {
  const storedTitle = getNativeStoredTrustedResumeTitle(session);
  if (storedTitle.title) {
    return { title: storedTitle.title, titleSource: session.titleSource };
  }

  const visibleTerminalTitle = getVisibleTerminalTitle(terminalState?.terminalTitle)?.trim();
  const agentName = terminalState?.agentName ?? session.agentName;
  if (visibleTerminalTitle && isValidNativeAgentTerminalTitle(visibleTerminalTitle, agentName)) {
    return { title: visibleTerminalTitle, titleSource: "terminal-auto" };
  }

  return {};
}

function shouldRememberPreviousSessionRecord(session: SessionRecord): boolean {
  if (session.kind !== "terminal") {
    return true;
  }

  /**
   * CDXC:PreviousSessions 2026-05-05-05:30
   * Previous Sessions must only contain terminals with a real user/agent
   * session name. Default creation titles such as `Terminal Session` and
   * `Codex Session` are placeholders, so closing those terminals should remove
   * the pane without adding a low-signal history card.
   */
  return getNativeStoredTrustedResumeTitle(session).title !== undefined;
}

function shouldKeepStoredPreviousSessionItem(session: SidebarPreviousSessionItem): boolean {
  const archivedRecord = normalizePreviousSessionRecord(session.sessionRecord);
  if (archivedRecord) {
    return shouldRememberPreviousSessionRecord(archivedRecord);
  }

  if (!session.isRestorable) {
    return true;
  }

  const displayTitle = session.primaryTitle?.trim() || session.terminalTitle?.trim();
  return Boolean(displayTitle && getVisibleTerminalTitle(displayTitle));
}

function normalizePreviousSessionRecord(candidate: unknown): SessionRecord | undefined {
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }
  const record = candidate as Partial<SessionRecord>;
  if (
    record.kind === "terminal" &&
    typeof record.sessionId === "string" &&
    typeof record.displayId === "string" &&
    typeof record.alias === "string" &&
    typeof record.title === "string"
  ) {
    return record as TerminalSessionRecord;
  }
  if (
    record.kind === "browser" &&
    typeof record.sessionId === "string" &&
    typeof record.displayId === "string" &&
    typeof record.alias === "string" &&
    typeof record.title === "string" &&
    typeof (record as Partial<BrowserSessionRecord>).browser?.url === "string"
  ) {
    return record as BrowserSessionRecord;
  }
  if (
    record.kind === "t3" &&
    typeof record.sessionId === "string" &&
    typeof record.displayId === "string" &&
    typeof record.alias === "string" &&
    typeof record.title === "string" &&
    typeof (record as Partial<T3SessionRecord>).t3?.threadId === "string"
  ) {
    return record as T3SessionRecord;
  }
  return undefined;
}

function deletePreviousSession(historyId: string): void {
  writePreviousSessions(previousSessions.filter((session) => session.historyId !== historyId));
  publish();
}

function restorePreviousSession(historyId: string): void {
  const previousSession = previousSessions.find((session) => session.historyId === historyId);
  if (!previousSession?.isRestorable) {
    return;
  }
  const archivedRecord = normalizePreviousSessionRecord(previousSession.sessionRecord);
  if (archivedRecord?.kind === "terminal") {
    if (restorePreviousTerminalSession(previousSession, archivedRecord)) {
      deletePreviousSession(historyId);
    }
    return;
  }

  createTerminal(previousSession.primaryTitle || previousSession.alias || "Restored Session");
  deletePreviousSession(historyId);
}

function restorePreviousTerminalSession(
  previousSession: SidebarPreviousSessionItem,
  archivedRecord: TerminalSessionRecord,
): boolean {
  /**
   * CDXC:PreviousSessions 2026-05-05-05:30
   * Restoring a previous agent session is a session recreation operation, not a
   * title-only terminal launch. Use the archived terminal record to preserve the
   * agent id, first user message, favorite state, title provenance, and resume
   * command inputs while assigning a fresh live terminal id.
   */
  const project = activatePreviousSessionProject(previousSession);
  const groupId = resolvePreviousSessionRestoreGroupId(project, previousSession.groupId);
  const initialInput = buildNativeRestoredTerminalInitialInput(archivedRecord);
  const restoredSession = createTerminal(
    archivedRecord.title || previousSession.primaryTitle || DEFAULT_TERMINAL_SESSION_TITLE,
    initialInput,
    groupId,
    archivedRecord.agentName,
  );
  if (!restoredSession) {
    return false;
  }

  const restoredRecord = mergeArchivedTerminalDetails(restoredSession, archivedRecord);
  updateProjectWorkspace(project.projectId, (workspace) =>
    replaceSessionRecordInWorkspace(workspace, restoredSession.sessionId, restoredRecord),
  );

  const terminalState = terminalStateById.get(restoredSession.sessionId);
  if (terminalState) {
    terminalState.agentName = restoredRecord.agentName;
    terminalState.firstUserMessage = restoredRecord.firstUserMessage;
    terminalState.terminalTitle = restoredRecord.title;
  }
  publish();
  return true;
}

function activatePreviousSessionProject(previousSession: SidebarPreviousSessionItem): NativeProject {
  const projectId = previousSession.projectId?.trim();
  const existingProject = projectId ? findProject(projectId) : undefined;
  if (existingProject) {
    const didSwitchProject = activeProjectId !== existingProject.projectId;
    const didRestoreRecentProject = existingProject.isRecentProject === true;
    projects = projects.map((project) =>
      project.projectId === existingProject.projectId
        ? { ...project, isRecentProject: false, recentClosedAt: undefined }
        : project,
    );
    activeProjectId = existingProject.projectId;
    writeStoredProjects("restorePreviousSessionProject");
    postZedOverlaySettings("workspace-focus");
    if (didSwitchProject || didRestoreRecentProject) {
      scheduleSyncOpenProjectWithZed("restorePreviousSessionProject");
    }
    void refreshGitState();
    return activeProject();
  }

  const projectPath = previousSession.projectPath?.trim();
  if (!projectPath) {
    return activeProject();
  }

  const restoredProjectId = projectId || createProjectId(projectPath);
  projects = [
    ...projects,
    {
      isChat: false,
      name: previousSession.projectName?.trim() || projectNameFromPath(projectPath),
      path: projectPath,
      projectId: restoredProjectId,
      theme: resolveSidebarTheme(settings.sidebarTheme, "dark"),
      workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
    },
  ];
  activeProjectId = restoredProjectId;
  writeStoredProjects("restorePreviousSessionProject");
  postZedOverlaySettings("workspace-focus");
  scheduleSyncOpenProjectWithZed("restorePreviousSessionProject");
  void refreshGitState();
  return activeProject();
}

function resolvePreviousSessionRestoreGroupId(
  project: NativeProject,
  groupId: string | undefined,
): string | undefined {
  return groupId && project.workspace.groups.some((group) => group.groupId === groupId)
    ? groupId
    : undefined;
}

function mergeArchivedTerminalDetails(
  restoredSession: TerminalSessionRecord,
  archivedRecord: TerminalSessionRecord,
): TerminalSessionRecord {
  return {
    ...restoredSession,
    agentName: archivedRecord.agentName ?? restoredSession.agentName,
    firstUserMessage: archivedRecord.firstUserMessage,
    isFavorite: archivedRecord.isFavorite,
    isSleeping: false,
    sessionPersistenceName:
      archivedRecord.sessionPersistenceName ??
      archivedRecord.tmuxSessionName ??
      restoredSession.sessionPersistenceName,
    terminalEngine: archivedRecord.terminalEngine ?? restoredSession.terminalEngine,
    title: archivedRecord.title || restoredSession.title,
    titleSource: archivedRecord.titleSource ?? restoredSession.titleSource,
  };
}

function replaceSessionRecordInWorkspace(
  workspace: GroupedSessionWorkspaceSnapshot,
  sessionId: string,
  restoredRecord: SessionRecord,
): GroupedSessionWorkspaceSnapshot {
  return normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...workspace,
    groups: workspace.groups.map((group) => ({
      ...group,
      snapshot: {
        ...group.snapshot,
        sessions: group.snapshot.sessions.map((session) =>
          session.sessionId === sessionId ? restoredRecord : session,
        ),
      },
    })),
  });
}

function clearGeneratedPreviousSessions(): void {
  writePreviousSessions(previousSessions.filter((session) => !session.isGeneratedName));
  publish();
}

function isSidebarPreviousSessionItem(candidate: unknown): candidate is SidebarPreviousSessionItem {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }
  const item = candidate as Partial<SidebarPreviousSessionItem>;
  return (
    typeof item.historyId === "string" &&
    typeof item.sessionId === "string" &&
    typeof item.closedAt === "string" &&
    typeof item.alias === "string" &&
    typeof item.isGeneratedName === "boolean" &&
    typeof item.isRestorable === "boolean"
  );
}

function createNativeSidebarCommandButtons(): SidebarCommandButton[] {
  return createSidebarCommandButtons(
    storedCommands,
    storedCommandOrder,
    deletedDefaultCommandIds,
  ).map((command) => {
    if (command.command || command.actionType !== "terminal") {
      return command;
    }

    switch (command.commandId) {
      case "dev":
        return { ...command, command: "bun run start" };
      case "build":
        return { ...command, command: "bun run build" };
      case "test":
        return { ...command, command: "bun run test" };
      case "setup":
        return { ...command, command: "bun install" };
      default:
        return command;
    }
  });
}

storedAgents = readStoredAgents();
storedAgentOrder = readStoredAgentOrder();
refreshAgents();
storedCommands = readStoredCommands();
storedCommandOrder = readStoredCommandOrder();
deletedDefaultCommandIds = readDeletedDefaultCommandIds();
refreshCommands();

function postZedOverlaySettings(reason: "settings-save" | "startup" | "workspace-focus" = "settings-save"): void {
  /**
   * CDXC:IDEAttachment 2026-04-26-22:38
   * Attach commands always use the IDE selected in settings. VS Code targets
   * are posted through the existing native overlay channel so the native host
   * can resolve their process names and `code`/`code-insiders` commands.
   *
   * CDXC:IDEAttachment 2026-05-01-13:32
   * Workspace selection is only a settings sync, not a user request to attach.
   * Include the reason so native detach can reject stale workspace-focus
   * `enabled: true` messages while still allowing explicit Settings attach.
   */
  postNative({
    enabled: settings.zedOverlayEnabled,
    hideTitlebarButton: settings.zedOverlayHideTitlebarButton,
    reason,
    targetApp: settings.zedOverlayTargetApp,
    type: "configureZedOverlay",
    workspacePath: activeProject().path,
  });
}

function clearPendingZedProjectSync(): void {
  if (!pendingZedProjectSyncTimeout) {
    return;
  }
  window.clearTimeout(pendingZedProjectSyncTimeout);
  pendingZedProjectSyncTimeout = undefined;
}

function scheduleSyncOpenProjectWithZed(reason: string): void {
  clearPendingZedProjectSync();
  if (!settings.zedOverlayEnabled || !settings.syncOpenProjectWithZed) {
    return;
  }

  const scheduledProject = activeProject();
  /**
   * CDXC:ZedOverlayWorkspace 2026-04-28-05:18
   * Switching zmux workspaces syncs the selected project into the configured
   * Zed target after a 2s trailing debounce. The native Show Zed button only
   * toggles zmux visibility, so rapid workspace clicks coalesce into one
   * editor-open request for the final active project.
   */
  pendingZedProjectSyncTimeout = window.setTimeout(() => {
    pendingZedProjectSyncTimeout = undefined;
    if (
      !settings.zedOverlayEnabled ||
      !settings.syncOpenProjectWithZed ||
      activeProjectId !== scheduledProject.projectId
    ) {
      return;
    }
    postNative({
      targetApp: settings.zedOverlayTargetApp,
      type: "openZedWorkspace",
      workspacePath: scheduledProject.path,
    });
  }, SYNC_OPEN_PROJECT_WITH_ZED_DEBOUNCE_MS);
  appendRestoreDebugLog("nativeSidebar.zedProjectSync.scheduled", {
    projectId: scheduledProject.projectId,
    reason,
  });
}

function createProjectId(path: string): string {
  return `project-${hashString(path)}`;
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function projectNameFromPath(path: string): string {
  const normalizedPath = path.replace(/\/+$/, "");
  return normalizedPath.split("/").filter(Boolean).pop() || normalizedPath || "Project";
}

function nativeChatTitleFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `Chat ${year}-${month}-${day} ${hour}:${minute}`;
}

function nativeChatsRootDirectory(): string {
  return `${nativeHomeDirectory()}/zmux/chats`;
}

function createNativeChatDirectoryPath(title: string, date = new Date()): string {
  const normalizedTitle = sanitizeNativePathPart(title || "chat").toLowerCase();
  return `${nativeChatsRootDirectory()}/${formatNativeChatTimestamp(date)}-${normalizedTitle}`;
}

function formatNativeChatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const millisecond = String(date.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}-${hour}${minute}${second}${millisecond}`;
}

function orderNativeProjectsForSidebar(projectsToOrder: readonly NativeProject[]): NativeProject[] {
  /**
   * CDXC:Chats 2026-05-04-09:30
   * Chat workspaces are intentionally projectless, so they must remain above
   * code projects in the rail and Combined project list while preserving the
   * user's relative order inside each category.
   */
  return [
    ...projectsToOrder.filter((project) => project.isChat === true),
    ...projectsToOrder.filter((project) => project.isChat !== true),
  ];
}

function activeProject(): NativeProject {
  return projects.find((project) => project.projectId === activeProjectId) ?? projects[0]!;
}

function findProject(projectId: string): NativeProject | undefined {
  return projects.find((project) => project.projectId === projectId);
}

function updateProjectWorkspace(
  projectId: string,
  updater: (workspace: GroupedSessionWorkspaceSnapshot) => GroupedSessionWorkspaceSnapshot,
): void {
  projects = projects.map((project) =>
    project.projectId === projectId ? { ...project, workspace: updater(project.workspace) } : project,
  );
  writeStoredProjects("updateProjectWorkspace");
}

function updateActiveProjectWorkspace(
  updater: (workspace: GroupedSessionWorkspaceSnapshot) => GroupedSessionWorkspaceSnapshot,
): void {
  const currentProjectId = activeProject().projectId;
  updateProjectWorkspace(currentProjectId, updater);
}

function findSessionRecord(sessionId: string): SessionRecord | undefined {
  const reference = resolveSidebarSessionReference(sessionId);
  for (const group of reference.project.workspace.groups) {
    const session = group.snapshot.sessions.find(
      (candidate) => candidate.sessionId === reference.sessionId,
    );
    if (session) {
      return session;
    }
  }
  return undefined;
}

function findSessionRecordInProject(
  project: NativeProject,
  sessionId: string,
): SessionRecord | undefined {
  for (const group of project.workspace.groups) {
    const session = group.snapshot.sessions.find((candidate) => candidate.sessionId === sessionId);
    if (session) {
      return session;
    }
  }
  return undefined;
}

function resolveSidebarSessionReference(sessionId: string): {
  project: NativeProject;
  sessionId: string;
} {
  const combinedReference = parseCombinedProjectSessionId(sessionId);
  const project = combinedReference ? findProject(combinedReference.projectId) : undefined;
  return {
    project: project ?? activeProject(),
    sessionId: combinedReference?.sessionId ?? sessionId,
  };
}

function resolveSidebarGroupReference(groupId: string): {
  isChatCollection?: boolean;
  groupId?: string;
  project: NativeProject;
} {
  if (groupId === COMBINED_CHATS_GROUP_ID) {
    return {
      isChatCollection: true,
      project:
        projects.find((project) => project.isChat === true && project.projectId === activeProjectId) ??
        projects.find((project) => project.isChat === true) ??
        activeProject(),
    };
  }

  const combinedProjectId = parseCombinedProjectGroupId(groupId);
  const project = combinedProjectId ? findProject(combinedProjectId) : undefined;
  return {
    groupId: combinedProjectId ? undefined : groupId,
    project: project ?? activeProject(),
  };
}

function setTerminalSessionAgentName(sessionId: string, agentName: string | undefined): void {
  updateActiveProjectWorkspace(
    (workspace) =>
      setTerminalSessionAgentNameInSimpleWorkspace(workspace, sessionId, agentName).snapshot,
  );
}

function setTerminalSessionPersistenceName(
  sessionId: string,
  sessionPersistenceName: string | undefined,
): void {
  updateActiveProjectWorkspace(
    (workspace) =>
      setTerminalSessionPersistenceNameInSimpleWorkspace(
        workspace,
        sessionId,
        sessionPersistenceName,
      )
        .snapshot,
  );
}

function nativeSessionIdForSidebarSession(sessionId: string): string {
  const reference = resolveSidebarSessionReference(sessionId);
  return nativeSessionIdForProjectSidebarSession(reference.project.projectId, reference.sessionId);
}

function nativeSessionIdForProjectSidebarSession(projectId: string, sessionId: string): string {
  return createDurableNativeSessionId(projectId, sessionId);
}

function sidebarSessionIdForNativeSession(sessionId: string): string {
  return sidebarSessionIdByNativeSessionId.get(sessionId) ?? sessionId;
}

function forgetNativeSessionMapping(sidebarSessionId: string): string {
  const reference = resolveSidebarSessionReference(sidebarSessionId);
  return forgetNativeSessionMappingForProject(reference.project.projectId, reference.sessionId);
}

function forgetNativeSessionMappingForProject(projectId: string, sidebarSessionId: string): string {
  const nativeSessionId = nativeSessionIdForProjectSidebarSession(projectId, sidebarSessionId);
  if (nativeSessionIdBySidebarSessionId.get(sidebarSessionId) === nativeSessionId) {
    nativeSessionIdBySidebarSessionId.delete(sidebarSessionId);
  }
  sidebarSessionIdByNativeSessionId.delete(nativeSessionId);
  return nativeSessionId;
}

function activeWorkspaceGroup(): SessionGroupRecord {
  const workspace = activeProject().workspace;
  return (
    workspace.groups.find((group) => group.groupId === workspace.activeGroupId) ??
    workspace.groups[0]!
  );
}

function activeSnapshot(): SessionGridSnapshot {
  return activeWorkspaceGroup().snapshot;
}

function replaceActiveSnapshot(snapshot: SessionGridSnapshot): void {
  const workspace = activeProject().workspace;
  updateActiveProjectWorkspace(() => ({
    ...workspace,
    groups: workspace.groups.map((group) =>
      group.groupId === workspace.activeGroupId ? { ...group, snapshot } : group,
    ),
  }));
}

function buildChromeCanaryBrowserGroup(): SidebarSessionGroup {
  /**
   * CDXC:BrowserOverlay 2026-04-27-05:32
   * The running Chrome Canary control should read as one browser button with
   * only its text label visible. Leave agentIcon empty so the shared session
   * card does not add both leading and trailing browser glyphs around it.
   */
  const session: SidebarSessionItem = {
    activity: "idle",
    activityLabel: undefined,
    agentIcon: undefined,
    alias: "Chrome Canary",
    column: 0,
    detail: "Place the running Canary window over zmux",
    isFocused: false,
    isFavorite: false,
    isReloading: false,
    isRunning: true,
    isVisible: true,
    kind: "browser",
    lastInteractionAt: undefined,
    lifecycleState: "running",
    primaryTitle: "Chrome Canary",
    row: 0,
    sessionId: CHROME_CANARY_BROWSER_SESSION_ID,
    sessionKind: "browser",
    sessionNumber: undefined,
    shortcutLabel: "",
    terminalTitle: undefined,
  };

  return {
    groupId: CHROME_CANARY_BROWSER_GROUP_ID,
    isActive: false,
    isFocusModeActive: false,
    kind: "browser",
    layoutVisibleCount: 1,
    sessions: [session],
    title: "Browsers",
    viewMode: "grid",
    visibleCount: 1,
  };
}

function createProjectedSidebarGroupsForProject(project: NativeProject): SidebarSessionGroup[] {
  const workspace = project.workspace;
  return workspace.groups.map((group) => ({
    groupId: group.groupId,
    isActive: group.groupId === workspace.activeGroupId,
    isFocusModeActive: group.snapshot.visibleCount === 1,
    kind: "workspace",
    layoutVisibleCount: group.snapshot.visibleCount,
    sessions: createProjectedSidebarSessionsForGroup(group),
    title: group.title,
    viewMode: group.snapshot.viewMode,
    visibleCount: group.snapshot.visibleCount,
  }));
}

function createCombinedSidebarGroups(): SidebarSessionGroup[] {
  /**
   * CDXC:Chats 2026-05-04-14:49
   * The sidebar must always show one Chats header, even before any chat exists.
   * Users create chats through that group's plus button; standalone New Chat
   * buttons are intentionally omitted so there is one obvious creation path.
   *
   * CDXC:Chats 2026-05-04-09:41
   * Combined mode groups all projectless chat folders under one Chats header.
   * Each chat still owns exactly one project-scoped terminal session so the
   * native terminal title/agent-icon detection path stays unchanged.
   *
   * CDXC:SidebarMode 2026-05-03-10:42
   * Non-chat projects still render as one draggable group per project. The
   * underlying separated workspace groups stay intact, so switching back to
   * Separated restores the existing group layout.
   */
  const orderedProjects = orderNativeProjectsForSidebar(projects);
  const chatProjects = orderedProjects.filter((project) => project.isChat === true);
  const projectGroups = orderedProjects
    .filter((project) => project.isChat !== true && project.isRecentProject !== true)
    .map((project) => createCombinedProjectSidebarGroup(project));

  const activeChatProject = chatProjects.find((project) => project.projectId === activeProjectId);
  const chatSessions = chatProjects.flatMap((project) => {
    const session = createProjectedSidebarGroupsForProject(project).flatMap(
      (group) => group.sessions,
    )[0];
    return session
      ? [
          {
            ...session,
            isFocused: project.projectId === activeProjectId && session.isFocused,
            isVisible: project.projectId === activeProjectId && session.isVisible,
            sessionId: createCombinedProjectSessionId(project.projectId, session.sessionId),
          },
        ]
      : [];
  });
  const activeChatGroup = activeChatProject
    ? createProjectedSidebarGroupsForProject(activeChatProject).find(
        (group) => group.groupId === activeChatProject.workspace.activeGroupId,
      )
    : undefined;

  return [
    {
      groupId: COMBINED_CHATS_GROUP_ID,
      isActive: Boolean(activeChatProject),
      isChatCollection: true,
      isFocusModeActive: activeChatGroup?.isFocusModeActive ?? false,
      kind: "workspace",
      layoutVisibleCount: 1,
      sessions: chatSessions,
      title: "Chats",
      viewMode: activeChatGroup?.viewMode ?? "grid",
      visibleCount: 1,
    },
    ...projectGroups,
  ];
}

function createSidebarRecentProjects(): SidebarRecentProject[] {
  /**
   * CDXC:RecentProjects 2026-05-04-14:25
   * Recent Projects are full native projects parked out of the main Combined
   * group list. Show them newest-closed first and include the preserved session
   * count so restoring a closed project with sessions does not imply a blank
   * terminal will be created.
   */
  return projects
    .filter((project) => project.isChat !== true && project.isRecentProject === true)
    .sort(compareRecentProjectsByClosedAt)
    .map((project) => ({
      icon: project.icon ?? normalizeLegacyWorkspaceDockIcon(project),
      iconDataUrl: project.iconDataUrl,
      path: project.path,
      projectId: project.projectId,
      recentClosedAt: project.recentClosedAt,
      sessionCount: countRecentProjectSessions(project),
      theme: project.theme ?? resolveSidebarTheme(settings.sidebarTheme, "dark"),
      themeColor: project.themeColor,
      title: project.name,
    }));
}

function createCombinedProjectSidebarGroup(project: NativeProject): SidebarSessionGroup {
  const projectedGroups = createProjectedSidebarGroupsForProject(project);
  const activeGroup =
    projectedGroups.find((group) => group.groupId === project.workspace.activeGroupId) ??
    projectedGroups[0];
  const isActiveProject = project.projectId === activeProjectId;
  const sessions = projectedGroups.flatMap((group) =>
    group.sessions.map((session) => ({
      ...session,
      isFocused: isActiveProject && session.isFocused,
      isVisible: isActiveProject && session.isVisible,
      sessionId: createCombinedProjectSessionId(project.projectId, session.sessionId),
    })),
  );

  return {
    groupId: createCombinedProjectGroupId(project.projectId),
    isActive: isActiveProject,
    isFocusModeActive: isActiveProject && activeGroup ? activeGroup.isFocusModeActive : false,
    kind: "workspace",
    layoutVisibleCount: activeGroup?.layoutVisibleCount ?? 1,
    projectContext: {
      canRemoveProject: true,
      theme: project.theme ?? resolveSidebarTheme(settings.sidebarTheme, "dark"),
      themeColor: project.themeColor,
    },
    sessions,
    title: project.name,
    viewMode: activeGroup?.viewMode ?? "grid",
    visibleCount: activeGroup?.visibleCount ?? 1,
  };
}

function createProjectedSidebarSessionsForGroup(group: SessionGroupRecord): SidebarSessionItem[] {
  return createSidebarSessionItems(group.snapshot, "mac").map((session) => {
    const sessionRecord = group.snapshot.sessions.find(
      (candidate) => candidate.sessionId === session.sessionId,
    );
    if (sessionRecord?.kind === "t3") {
      const isSleeping = sessionRecord.isSleeping === true;
      return {
        ...session,
        agentIcon: "t3",
        isRunning: !isSleeping,
        lastInteractionAt: sessionRecord.createdAt,
        lifecycleState: isSleeping ? "sleeping" : "running",
        primaryTitle: session.primaryTitle ?? "T3 Code",
      };
    }

    const persistedAgentName =
      sessionRecord?.kind === "terminal" ? sessionRecord.agentName : undefined;
    const terminalState = terminalStateById.get(session.sessionId);
    if (session.sessionKind !== "terminal") {
      return session;
    }
    const visibleTerminalTitle = getVisibleTerminalTitle(terminalState?.terminalTitle);
    const displayPrimaryTitle =
      sessionRecord && sessionRecord.kind === "terminal"
        ? getSessionCardPrimaryTitle(sessionRecord)
        : session.primaryTitle;
    const visiblePrimaryTitle = getVisiblePrimaryTitle(displayPrimaryTitle ?? "");
    /**
     * CDXC:AgentDetection 2026-04-27-02:36
     * Session cards must show the detected agent from the canonical session
     * record even when the native terminal state is not currently mounted.
     * Live terminal state can still refine the value as title detection runs.
     */
    const projectedAgentName = terminalState?.agentName ?? persistedAgentName;
    const agentIcon = resolveNativeSidebarAgentIcon(projectedAgentName);
    const shouldPreferTerminalTitle =
      Boolean(visibleTerminalTitle) && shouldPreferTerminalTitleForAgentIcon(agentIcon);
    const hasTrustedStoredResumeTitle =
      sessionRecord?.kind === "terminal" &&
      getNativeStoredTrustedResumeTitle(sessionRecord).title !== undefined;
    const primaryTitle = shouldPreferTerminalTitle
      ? visibleTerminalTitle
      : visiblePrimaryTitle
        ? displayPrimaryTitle
        : (visibleTerminalTitle ?? displayPrimaryTitle);
    const secondaryTerminalTitle = shouldPreferTerminalTitle
      ? undefined
      : displayPrimaryTitle
        ? visibleTerminalTitle
        : undefined;
    return {
      ...session,
      activity: terminalState?.activity ?? session.activity,
      agentIcon,
      firstUserMessage: sessionRecord?.firstUserMessage ?? terminalState?.firstUserMessage,
      lifecycleState: terminalState?.lifecycleState ?? session.lifecycleState,
      isGeneratingFirstPromptTitle: terminalState?.firstPromptAutoRenameInProgress === true,
      isRunning: terminalState?.lifecycleState === "running",
      isPrimaryTitleTerminalTitle:
        (Boolean(visibleTerminalTitle) && (!visiblePrimaryTitle || shouldPreferTerminalTitle)) ||
        (!visibleTerminalTitle && hasTrustedStoredResumeTitle),
      primaryTitle,
      /**
       * CDXC:NativeSidebar 2026-04-28-05:14
       * Session-card hover timestamps follow agent-tiler's projection rule:
       * terminal sessions always expose a last-interaction value, using the
       * live activity timestamp when known and the session creation time as
       * the canonical baseline.
       */
      lastInteractionAt: terminalState?.lastActivityAt ?? sessionRecord?.createdAt,
      terminalTitle: secondaryTerminalTitle,
    };
  });
}

function resolveNativeSidebarAgentIcon(agentName: string | undefined): SidebarAgentButton["icon"] {
  const directIcon = getSidebarAgentIconById(agentName);
  if (directIcon) {
    return directIcon;
  }

  const normalizedAgentName = agentName?.trim().toLowerCase();
  if (!normalizedAgentName) {
    return undefined;
  }

  /**
   * CDXC:SidebarSessions 2026-04-28-05:18
   * The card trailing-mode toggle can only reveal the agent icon on hover when
   * native session projection resolves one. Native state may hold display names
   * like "Codex" instead of canonical ids like "codex", so resolve both forms.
   */
  return DEFAULT_SIDEBAR_AGENTS.find(
    (agent) =>
      agent.agentId === normalizedAgentName ||
      agent.name.trim().toLowerCase() === normalizedAgentName,
  )?.icon;
}

function getNativeSidebarCommandSessionIndicators(
  commands: readonly { commandId: string }[],
): SidebarCommandSessionIndicator[] {
  const focusedSessionId = activeSnapshot().focusedSessionId;
  return commands.flatMap((command) => {
    const storedSession = sidebarCommandSessionByCommandId.get(command.commandId);
    if (!storedSession) {
      return [];
    }

    const session = findSessionRecord(storedSession.sessionId);
    const terminalState = terminalStateById.get(storedSession.sessionId);
    if (!session || !terminalState) {
      return [];
    }

    const status =
      terminalState.lifecycleState === "running"
        ? "running"
        : terminalState.lifecycleState === "error"
          ? "error"
          : "idle";

    return [
      {
        commandId: command.commandId,
        isActive: storedSession.sessionId === focusedSessionId,
        sessionId: storedSession.sessionId,
        status,
        title: terminalState.terminalTitle ?? session.title.trim() ?? undefined,
      },
    ];
  });
}

function buildSidebarMessage(): SidebarHydrateMessage {
  const project = activeProject();
  const snapshot = activeSnapshot();
  const isCombinedSidebarMode = settings.sidebarMode === "combined";
  /**
   * CDXC:BrowserPanes 2026-05-02-06:35
   * Browser-pane mode hides the dedicated Chrome Canary Browsers section
   * because browser actions become ordinary workspace session cards. Canary
   * remains visible only while the Chrome Canary integration is selected.
   */
  const showChromeCanaryBrowserGroup =
    !isCombinedSidebarMode && settings.browserOpenMode === "chrome-canary" && isChromeCanaryRunning;
  const browserGroups = showChromeCanaryBrowserGroup ? [buildChromeCanaryBrowserGroup()] : [];
  /**
   * CDXC:NativeSidebar 2026-04-27-17:03
   * Native sidebar editor checks must stay aligned with the shipped UX. Keep
   * the hydrate payload exact and resolve persisted theme settings before
   * passing them to shared sidebar HUD creation.
   */
  return {
    groups: isCombinedSidebarMode
      ? createCombinedSidebarGroups()
      : browserGroups.concat(createProjectedSidebarGroupsForProject(project)),
    hud: {
      ...createSidebarHudState(
        snapshot,
        project.theme ?? resolveSidebarTheme(settings.sidebarTheme, "dark"),
        settings.agentManagerZoomPercent,
        settings.showCloseButtonOnSessionCards,
        settings.showHotkeysOnSessionCards,
        settings.showLastInteractionTimeOnSessionCards,
        settings.debuggingMode,
        settings.completionBellEnabled,
        settings.completionSound,
        agents,
        commands,
        [],
        gitState,
        {
          /**
           * CDXC:SidebarMode 2026-05-03-17:34
           * Combined mode is for scanning project sessions, so the native
           * sidebar suppresses Actions and the dedicated browser group while
           * leaving Agents governed by the user's sidebar setting.
           */
          actions: !isCombinedSidebarMode && settings.showSidebarActions,
          agents: settings.showSidebarAgents,
          browsers: showChromeCanaryBrowserGroup,
          git: settings.showSidebarGitButton,
        },
        collapsedSections,
        activeSessionsSortMode,
        settings.createSessionOnSidebarDoubleClick,
        settings.renameSessionOnDoubleClick,
        getNativeSidebarCommandSessionIndicators(commands),
      ),
      /**
       * CDXC:SidebarMode 2026-05-04-07:00
       * Combined mode still needs the top current-project header so users can
       * see which project receives new agent/action launches after selecting a
       * project group with no sessions.
       */
      projectHeader: {
        directory: project.path,
        name: project.name,
      },
      customThemeColor: normalizeWorkspaceThemeColor(project.themeColor),
      recentProjects: isCombinedSidebarMode ? createSidebarRecentProjects() : [],
      settings,
    },
    pinnedPrompts,
    previousSessions,
    revision: ++revision,
    scratchPadContent,
    type: "hydrate",
  };
}

function createAgentManagerXWorkspaceSnapshots(): AgentManagerXWorkspaceSnapshotMessage[] {
  const updatedAt = new Date().toISOString();
  return projects
    .filter((project) => project.isRecentProject !== true)
    .map((project) => {
    const sessions = createProjectedSidebarGroupsForProject(project).flatMap((group) =>
      group.sessions.flatMap((session): AgentManagerXWorkspaceSession[] => {
        if (session.sessionKind === "browser") {
          return [];
        }
        const primaryTitle = session.primaryTitle?.trim();
        const terminalTitle = session.terminalTitle?.trim();
        const alias = session.alias.trim();
        return [
          {
            agent: session.agentIcon ?? "unknown",
            alias: session.alias,
            displayName: primaryTitle || terminalTitle || alias || "Session",
            isFocused: project.projectId === activeProjectId && session.isFocused,
            isRunning: session.isRunning,
            isVisible: project.projectId === activeProjectId && session.isVisible,
            kind: session.sessionKind === "t3" ? "t3" : "terminal",
            lastActiveAt: session.lastInteractionAt ?? updatedAt,
            projectName: project.name,
            projectPath: project.path,
            sessionId: session.sessionId,
            status: session.activity,
            terminalTitle: session.terminalTitle,
          },
        ];
      }),
    );

    return {
      sessions,
      source: "zmux",
      type: "workspaceSnapshot",
      updatedAt,
      workspaceFaviconDataUrl: project.iconDataUrl,
      workspaceId: project.projectId,
      workspaceName: project.name,
      workspacePath: project.path,
    };
    });
}

function handleAgentManagerXSessionCommand(rawData: unknown): void {
  const rawText = typeof rawData === "string" ? rawData : undefined;
  if (!rawText) {
    return;
  }

  let message: AgentManagerXSessionCommandMessage;
  try {
    message = JSON.parse(rawText) as AgentManagerXSessionCommandMessage;
  } catch {
    return;
  }

  if (message.type !== "focusSession" && message.type !== "closeSession") {
    return;
  }
  const project = projects.find((candidate) => candidate.projectId === message.workspaceId);
  if (!project) {
    return;
  }
  const hasSession = project.workspace.groups.some((group) =>
    group.snapshot.sessions.some((session) => session.sessionId === message.sessionId),
  );
  if (!hasSession) {
    return;
  }

  if (activeProjectId !== project.projectId) {
    focusProject(project.projectId);
  }
  if (message.type === "focusSession") {
    /**
     * CDXC:AgentManagerXBridge 2026-04-27-20:34
     * Clicking a zmux session in Agent Manager must raise the native zmux
     * workarea before focusing the terminal, because Agent Manager no longer
     * opens an editor window for zmux-owned sessions.
     */
    postNative({ type: "activateApp" });
    focusSidebarSession(message.sessionId);
  } else {
    closeTerminal(message.sessionId);
  }
}

function publish(): void {
  ensureVisibleNativeSessions("publish");
  const sidebarMessage = buildSidebarMessage();
  sidebarBus.post(sidebarMessage);
  agentManagerXBridgeClient.publish(createAgentManagerXWorkspaceSnapshots());
  /**
   * CDXC:AppModals 2026-04-26-15:10
   * App-level modals need the same sidebar store data as the sidebar webview.
   * Mirror each authoritative sidebar snapshot into the full-window modal host
   * instead of letting modals read stale duplicated state.
   */
  postAppModalHost({ message: sidebarMessage, type: "sidebarState" });
  postWorkspaceBarState();
  syncNativeLayout();
}

function ensureVisibleNativeSessions(reason: string): void {
  /**
   * CDXC:SessionRestore 2026-04-29-09:16
   * Native zmux only recreates terminal processes for sessions that are actually
   * on screen: the active workspace, active group, and current visible card set.
   * Hidden terminals remain sleeping until focus/wake asks for their resume;
   * this hot publish path must not emit per-session diagnostics.
   *
   * CDXC:T3Code 2026-04-30-19:23
   * Visible restored T3 sessions also need their native WKWebView recreated at
   * startup. A persisted T3 card without a native web-pane surface leaves the
   * workspace focused on a session id AppKit cannot render, producing the blank
   * gray pane even though the sidebar card is selected.
   */
  for (const project of projects) {
    for (const group of project.workspace.groups) {
      const visibleIds = new Set(group.snapshot.visibleSessionIds);
      for (const session of group.snapshot.sessions) {
        const isVisibleOnScreen =
          project.projectId === activeProjectId &&
          group.groupId === project.workspace.activeGroupId &&
          visibleIds.has(session.sessionId);
        if (!isVisibleOnScreen) {
          continue;
        }
        if (session.kind === "t3") {
          if (!nativeSessionIdBySidebarSessionId.has(session.sessionId)) {
            restoreNativeT3Session(project, session, reason);
          }
          continue;
        }
        if (session.kind === "browser") {
          if (!nativeSessionIdBySidebarSessionId.has(session.sessionId)) {
            restoreNativeBrowserSession(project, session, reason);
          }
          continue;
        }
        if (session.kind !== "terminal" || session.isSleeping === true) {
          continue;
        }
        if (terminalStateById.has(session.sessionId)) {
          continue;
        }
        restoreNativeTerminalSession(project, session, reason);
      }
    }
  }
}

function restoreNativeTerminalSession(
  project: NativeProject,
  session: TerminalSessionRecord,
  reason: string,
): void {
  const nativeSessionId = rememberNativeSessionMapping(project.projectId, session.sessionId);
  const sessionStateFilePath = createNativeSessionStateFilePath(
    project.projectId,
    session.sessionId,
  );
  const initialInput = buildNativeRestoredTerminalInitialInput(session);
  if (initialInput.trim()) {
    suppressNativeSessionActivityIndicators(session.sessionId, "restore-resume-command");
  }
  terminalStateById.set(session.sessionId, {
    activity: "idle",
    agentName: session.agentName,
    lifecycleState: "running",
    sessionPersistenceName: session.sessionPersistenceName ?? session.tmuxSessionName,
    sessionPersistenceProvider: settings.sessionPersistenceProvider,
    sessionStateFilePath,
    terminalTitle: session.title,
  });
  appendAgentDetectionDebugLog("nativeSidebar.restoreTerminalState.created", {
    agentName: session.agentName,
    initialActivity: "idle",
    initialInputPreview: initialInput.trim().slice(0, 120),
    nativeSessionId,
    reason,
    sessionId: session.sessionId,
    sessionStateFilePath,
    sessionPersistenceName: session.sessionPersistenceName ?? session.tmuxSessionName,
    sessionPersistenceProvider: settings.sessionPersistenceProvider,
    terminalTitle: session.title,
  });
  const nativeEnvironment = createNativeAgentSessionEnvironment({
    agentName: session.agentName,
    project,
    sessionId: session.sessionId,
    sessionStateFilePath,
  });
  appendTerminalLaunchDebugLog("nativeSidebar.restoreTerminalState.colorEnv", {
    agentName: session.agentName,
    colorEnv: readAgentColorEnvironmentSnapshot(nativeEnvironment),
    nativeSessionId,
    reason,
    sessionId: session.sessionId,
  });
  postNative({
    /**
     * CDXC:CrashRootCause 2026-05-04-11:53
     * Sleeping-session restore uses the same native creation path as new agent
     * launches, so it must also mount inactive and wait for the sidebar's
     * authoritative setActiveTerminalSet command. Otherwise rapidly clicking
     * sleeping cards can transiently activate the previous and restored Ghostty
     * surfaces and crash before layout sync reaches native.
    */
    activateOnCreate: false,
    cwd: project.path,
    env: nativeEnvironment,
    initialInput,
    sessionId: nativeSessionId,
    sessionPersistenceName: session.sessionPersistenceName ?? session.tmuxSessionName,
    sessionPersistenceProvider:
      settings.sessionPersistenceProvider === "off"
        ? undefined
        : settings.sessionPersistenceProvider,
    title: session.title,
    type: "createTerminal",
  });
  appendRestoreDebugLog("nativeSidebar.restoreNativeTerminalSession", {
    nativeSessionId,
    projectId: project.projectId,
    reason,
    restoredWithResumeInput: Boolean(initialInput.trim()),
    sessionId: session.sessionId,
    title: session.title,
  });
}

function createWorkspaceBarState(): WorkspaceBarStateMessage {
  /**
   * CDXC:WorkspaceDock 2026-04-29-09:16
   * Workspace dock badges are recomputed on every sidebar publish. Keep that
   * state path silent by default so routine spinner/status updates do not write
   * dock snapshots continuously.
   */
  /**
   * CDXC:RecentProjects 2026-05-04-14:25
   * Recent Projects are hidden from Combined-mode native/status surfaces while
   * Separated mode keeps the historical full workspace rail behavior.
   */
  const visibleProjects =
    settings.sidebarMode === "combined"
      ? projects.filter((project) => project.isRecentProject !== true)
      : projects;

  return {
    activeProjectId,
    projects: orderNativeProjectsForSidebar(visibleProjects).map((project) => ({
      icon: project.icon ?? normalizeLegacyWorkspaceDockIcon(project),
      iconDataUrl: project.iconDataUrl,
      isActive: project.projectId === activeProjectId,
      isChat: project.isChat,
      path: project.path,
      projectId: project.projectId,
      sessionCounts: countWorkspaceBarSessions(project),
      theme: project.theme ?? resolveSidebarTheme(settings.sidebarTheme, "dark"),
      themeColor: project.themeColor,
      title: project.name,
    })),
    sidebarMode: settings.sidebarMode,
    type: "workspaceBarState",
  };
}

function countWorkspaceBarSessions(project: NativeProject): WorkspaceBarProject["sessionCounts"] {
  /**
   * CDXC:WorkspaceDock 2026-04-27-06:19
   * Count dock badges from the same projection as session cards: the orange
   * rail badge follows the session-card orange working dot, while running idle
   * sessions remain gray at the bottom-right of the workspace button.
   */
  const counts: WorkspaceBarProject["sessionCounts"] = {
    done: 0,
    running: 0,
    working: 0,
  };
  for (const group of project.workspace.groups) {
    for (const session of group.snapshot.sessions) {
      if (session.isSleeping === true) {
        continue;
      }
      if (session.kind === "browser") {
        counts.running += 1;
        continue;
      }
      if (session.kind === "t3") {
        counts.done += 1;
        continue;
      }
      const terminalState = terminalStateById.get(session.sessionId);
      const lifecycleState = terminalState?.lifecycleState ?? "done";
      if (lifecycleState === "running" && terminalState?.activity === "working") {
        counts.working += 1;
      } else if (lifecycleState === "running") {
        counts.running += 1;
      } else if (lifecycleState === "done" && terminalState?.activity === "attention") {
        counts.done += 1;
      }
    }
  }
  return counts;
}

function postWorkspaceBarState(): void {
  /**
   * CDXC:WorkspaceDock 2026-04-27-08:45
   * The workspace dock is rendered inside the same React sidebar tree as the
   * session sidebar. Publish state through a browser event instead of the old
   * second WKWebView bridge so context menus, drag feedback, and workspace
   * buttons share one React surface.
   */
  window.dispatchEvent(
    new CustomEvent<WorkspaceBarStateMessage>(WORKSPACE_DOCK_STATE_EVENT, {
      detail: createWorkspaceBarState(),
    }),
  );
}

function createNativeSessionStateFilePath(projectId: string, sessionId: string): string {
  const safeProjectId = sanitizeNativePathPart(projectId);
  const safeSessionId = sanitizeNativePathPart(sessionId);
  return `${nativeZmuxHomeDirectory()}/session-state/${safeProjectId}/${safeSessionId}.env`;
}

function createNativeAgentSessionEnvironment(args: {
  agentName?: string;
  project: NativeProject;
  sessionId: string;
  sessionStateFilePath: string;
}): Record<string, string> {
  /**
   * CDXC:SessionTitleSync 2026-04-26-09:23
   * VSmux first-message auto-renaming depends on Codex/Claude hooks writing a
   * session state file keyed by VSMUX_SESSION_STATE_FILE. Native Ghostty
   * sessions must launch agents with the same env contract so the sidebar can
   * generate `/rename <title>` from the first submitted Codex prompt.
   *
   * CDXC:SessionTitleSync 2026-04-26-20:27
   * First-prompt hooks may be installed by either the old VSmux pipeline or the
   * native zmux pipeline. Provide both VSMUX_* and ZMUX_* environment keys so
   * the hook can write one canonical session-state file.
   */
  return {
    VSMUX_AGENT: args.agentName ?? "",
    VSMUX_SESSION_ID: args.sessionId,
    VSMUX_SESSION_STATE_FILE: args.sessionStateFilePath,
    VSMUX_WORKSPACE_ID: args.project.projectId,
    VSMUX_WORKSPACE_ROOT: args.project.path,
    ZMUX_AGENT: args.agentName ?? "",
    ZMUX_SESSION_ID: args.sessionId,
    ZMUX_SESSION_STATE_FILE: args.sessionStateFilePath,
    ZMUX_WORKSPACE_ID: args.project.projectId,
    ZMUX_WORKSPACE_ROOT: args.project.path,
    zmux_AGENT: args.agentName ?? "",
    zmux_SESSION_ID: args.sessionId,
    zmux_SESSION_STATE_FILE: args.sessionStateFilePath,
    zmux_WORKSPACE_ID: args.project.projectId,
    zmux_WORKSPACE_ROOT: args.project.path,
  };
}

function nativeHomeDirectory(): string {
  return (
    window.__zmux_NATIVE_HOST__?.homeDir?.trim() ||
    inferHomeDirectoryFromPath(initialWorkspacePath) ||
    nativeFallbackHomeDirectory()
  );
}

function nativeZmuxHomeDirectory(): string {
  /**
   * CDXC:DevAppFlavor 2026-04-28-02:01
   * Native zmux-dev and default zmux intentionally share hook scripts and
   * per-session state under ~/.zmux so both app identities show the same
   * workspaces and restorable sessions.
   */
  return (
    window.__zmux_NATIVE_HOST__?.zmuxHomeDir?.trim() ||
    `${nativeHomeDirectory()}/.zmux`
  );
}

function nativeFallbackHomeDirectory(): string {
  return "/Users/Shared";
}

function inferHomeDirectoryFromPath(path: string): string | undefined {
  const match = /^\/Users\/[^/]+/.exec(path);
  return match?.[0];
}

function sanitizeNativePathPart(value: string): string {
  return value.replace(/[^a-z0-9._-]+/giu, "-").replace(/^-+|-+$/g, "") || "session";
}

async function ensureNativeAgentFirstPromptHooks(): Promise<void> {
  /**
   * CDXC:SessionTitleSync 2026-04-26-09:23
   * The native app is outside VS Code, so it cannot rely on extension activation
   * to install agent UserPromptSubmit hooks. Install a small zmux-owned hook
   * beside existing Codex and Claude hooks; it writes the first prompt into the
   * session state file that the native sidebar polls before sending Codex
   * `/rename <title>` or Claude's bare `/rename`.
   *
   * CDXC:SessionTitleSync 2026-05-05-04:27
   * Codex terminals launched from zmux can run with CODEX_HOME pointed at a
   * profile directory such as ~/.codex-profiles/personal. Install the native
   * first-prompt hook into every existing Codex profile as well as ~/.codex so
   * prompt capture follows the Codex home that the terminal actually uses.
   */
  const command = buildEnsureNativeAgentHooksCommand();
  const result = await runNativeProcess("/bin/zsh", ["-lc", command]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Agent hook install failed.");
  }
  const installedCodexHooksPaths = result.stdout
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("codexHooksPath="))
    .map((line) => line.slice("codexHooksPath=".length))
    .filter(Boolean);
  appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.hooksInstalled", {
    claudeSettingsPath: `${nativeHomeDirectory()}/.claude/settings.json`,
    codexHooksPaths: installedCodexHooksPaths.length
      ? installedCodexHooksPaths
      : [`${nativeHomeDirectory()}/.codex/hooks.json`],
    notifyHookPath: zmux_AGENT_NOTIFY_HOOK_PATH,
  });
}

function buildEnsureNativeAgentHooksCommand(): string {
  const notifyHookPath = zmux_AGENT_NOTIFY_HOOK_PATH;
  const homeDirectory = nativeHomeDirectory();
  const claudeSettingsPath = `${nativeHomeDirectory()}/.claude/settings.json`;
  return [
    "set -e",
    `mkdir -p ${quoteNativeShellArg(dirnameNativePath(notifyHookPath))} ${quoteNativeShellArg(dirnameNativePath(claudeSettingsPath))}`,
    `cat > ${quoteNativeShellArg(notifyHookPath)} <<'zmux_NOTIFY_HOOK'`,
    getNativeCodexNotifyHookScript(),
    "zmux_NOTIFY_HOOK",
    `chmod 755 ${quoteNativeShellArg(notifyHookPath)}`,
    `/usr/bin/python3 - ${quoteNativeShellArg(notifyHookPath)} ${quoteNativeShellArg(homeDirectory)} <<'zmux_CODEX_HOOK_MERGE_ALL'`,
    getNativeCodexHookMergeAllScript(),
    "zmux_CODEX_HOOK_MERGE_ALL",
    `/usr/bin/python3 - ${quoteNativeShellArg(claudeSettingsPath)} ${quoteNativeShellArg(notifyHookPath)} claude <<'zmux_CLAUDE_HOOK_MERGE'`,
    getNativeAgentHookMergeScript(),
    "zmux_CLAUDE_HOOK_MERGE",
  ].join("\n");
}

function getNativeCodexNotifyHookScript(): string {
  return `#!/bin/bash
if [ -n "$1" ]; then
  INPUT="$1"
else
  INPUT="$(cat)"
fi

SESSION_STATE_FILE="\${VSMUX_SESSION_STATE_FILE:-\${ZMUX_SESSION_STATE_FILE:-$zmux_SESSION_STATE_FILE}}"
if [ -z "$SESSION_STATE_FILE" ]; then
  printf '{"continue":true}'
  exit 0
fi

/usr/bin/python3 - "$SESSION_STATE_FILE" "$INPUT" <<'PY'
import datetime
import base64
import json
import os
import pathlib
import sys

state_path = sys.argv[1]
raw_input = sys.argv[2]
try:
    payload = json.loads(raw_input)
except Exception:
    payload = {}

event_name = payload.get("hook_event_name")
if event_name != "UserPromptSubmit":
    sys.exit(0)

prompt = str(payload.get("prompt") or "").strip()
if not prompt:
    sys.exit(0)

state = {}
try:
    with open(state_path, "r", encoding="utf-8") as handle:
        for line in handle:
            key, separator, value = line.partition("=")
            if separator:
                state[key] = value.strip() if key == "firstUserMessageBase64" else " ".join(value.strip().split())
except FileNotFoundError:
    pass

if state.get("autoTitleFromFirstPrompt") in {"1", "true", "TRUE", "True"}:
    sys.exit(0)

payload_agent = payload.get("agent")
state["status"] = state.get("status") or "idle"
state["agent"] = state.get("agent") or (payload_agent if isinstance(payload_agent, str) else "") or os.environ.get("VSMUX_AGENT") or os.environ.get("ZMUX_AGENT") or os.environ.get("zmux_AGENT") or "codex"
state["firstUserMessageBase64"] = state.get("firstUserMessageBase64") or base64.b64encode(prompt.encode("utf-8")).decode("ascii")
if state.get("pendingFirstPromptAutoRenamePrompt", "").strip():
    path = pathlib.Path(state_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text("".join(f"{key}={state.get(key, '')}\\n" for key in [
        "status",
        "agent",
        "agentSessionId",
        "firstUserMessageBase64",
        "frozenAt",
        "autoTitleFromFirstPrompt",
        "historyBase64",
        "lastActivityAt",
        "pendingFirstPromptAutoRenamePrompt",
        "title",
    ]), encoding="utf-8")
    temp_path.replace(path)
    sys.exit(0)

state["lastActivityAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
state["pendingFirstPromptAutoRenamePrompt"] = " ".join(prompt.split())

keys = [
    "status",
    "agent",
    "agentSessionId",
    "firstUserMessageBase64",
    "frozenAt",
    "autoTitleFromFirstPrompt",
    "historyBase64",
    "lastActivityAt",
    "pendingFirstPromptAutoRenamePrompt",
    "title",
]
path = pathlib.Path(state_path)
path.parent.mkdir(parents=True, exist_ok=True)
temp_path = path.with_suffix(path.suffix + ".tmp")
with open(temp_path, "w", encoding="utf-8") as handle:
    for key in keys:
        handle.write(f"{key}={state.get(key, '')}\\n")
temp_path.replace(path)
PY

printf '{"continue":true}'
exit 0
`;
}

function getNativeAgentHookMergeScript(): string {
  return `import json
import pathlib
import sys

hooks_path = pathlib.Path(sys.argv[1])
notify_hook_path = sys.argv[2]
agent_name = sys.argv[3]
command = notify_hook_path
try:
    with open(hooks_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
except FileNotFoundError:
    data = {}

if not isinstance(data, dict):
    data = {}
hooks = data.get("hooks")
if not isinstance(hooks, dict):
    hooks = {}
    data["hooks"] = hooks

groups = hooks.get("UserPromptSubmit")
if not isinstance(groups, list):
    groups = []

def is_zmux_command(hook):
    return isinstance(hook, dict) and hook.get("command") == command

matcher = "*" if agent_name == "claude" else None

for group in groups:
    if not isinstance(group, dict):
        continue
    group_hooks = group.get("hooks")
    if isinstance(group_hooks, list) and any(is_zmux_command(hook) for hook in group_hooks):
        hooks["UserPromptSubmit"] = groups
        hooks_path.parent.mkdir(parents=True, exist_ok=True)
        with open(hooks_path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\\n")
        sys.exit(0)

next_group = {
    "hooks": [
        {
            "type": "command",
            "command": command,
        }
    ]
}
if matcher is not None:
    next_group["matcher"] = matcher
groups.append(next_group)
hooks["UserPromptSubmit"] = groups
hooks_path.parent.mkdir(parents=True, exist_ok=True)
with open(hooks_path, "w", encoding="utf-8") as handle:
    json.dump(data, handle, indent=2)
    handle.write("\\n")
	`;
}

function getNativeCodexHookMergeAllScript(): string {
  return `import json
import pathlib
import sys

notify_hook_path = pathlib.Path(sys.argv[1])
home_path = pathlib.Path(sys.argv[2])
command = str(notify_hook_path)

def load_hooks_data(hooks_path):
    try:
        with open(hooks_path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        data = {}

    if not isinstance(data, dict):
        data = {}
    hooks = data.get("hooks")
    if not isinstance(hooks, dict):
        hooks = {}
        data["hooks"] = hooks
    return data, hooks

def is_zmux_command(hook):
    return isinstance(hook, dict) and hook.get("command") == command

def merge_hook(hooks_path):
    data, hooks = load_hooks_data(hooks_path)
    groups = hooks.get("UserPromptSubmit")
    if not isinstance(groups, list):
        groups = []

    for group in groups:
        if not isinstance(group, dict):
            continue
        group_hooks = group.get("hooks")
        if isinstance(group_hooks, list) and any(is_zmux_command(hook) for hook in group_hooks):
            hooks["UserPromptSubmit"] = groups
            hooks_path.parent.mkdir(parents=True, exist_ok=True)
            with open(hooks_path, "w", encoding="utf-8") as handle:
                json.dump(data, handle, indent=2)
                handle.write("\\n")
            return

    groups.append({
        "hooks": [
            {
                "type": "command",
                "command": command,
            }
        ]
    })
    hooks["UserPromptSubmit"] = groups
    hooks_path.parent.mkdir(parents=True, exist_ok=True)
    with open(hooks_path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\\n")

hook_paths = [home_path / ".codex" / "hooks.json"]
profiles_path = home_path / ".codex-profiles"
if profiles_path.is_dir():
    for profile_path in sorted(profiles_path.iterdir()):
        if profile_path.is_dir():
            hook_paths.append(profile_path / "hooks.json")

seen = set()
for hooks_path in hook_paths:
    resolved = str(hooks_path)
    if resolved in seen:
        continue
    seen.add(resolved)
    merge_hook(hooks_path)
    print(f"codexHooksPath={resolved}")
`;
}

function dirnameNativePath(path: string): string {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : ".";
}

function quoteNativeShellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function suppressNativeSessionActivityIndicators(
  sessionId: string,
  reason: "agent-launch" | "restore-resume-command",
): void {
  const suppressedUntil = Date.now() + NATIVE_INITIAL_ACTIVITY_SUPPRESSION_MS;
  nativeActivitySuppressedUntilBySessionId.set(sessionId, suppressedUntil);
  nativeWorkingStartedAtBySessionId.delete(sessionId);
  const terminalState = terminalStateById.get(sessionId);
  if (terminalState?.activity === "attention" || terminalState?.activity === "working") {
    terminalState.activity = "idle";
  }
  /**
   * CDXC:SessionRestore 2026-04-27-08:20
   * Native Ghostty title events can briefly report agent working/done markers
   * while a new or resumed agent is still booting. Mirror agent-tiler's startup
   * activity suppression so launch/resume noise does not flash Working or Done
   * before the agent has had a real chance to work.
   */
  appendAgentDetectionDebugLog("nativeSidebar.activitySuppression.started", {
    reason,
    sessionId,
    suppressedUntil: new Date(suppressedUntil).toISOString(),
  });
}

function getNativeActivitySuppressedUntil(sessionId: string): number | undefined {
  const suppressedUntil = nativeActivitySuppressedUntilBySessionId.get(sessionId);
  if (
    suppressedUntil !== undefined &&
    Number.isFinite(suppressedUntil) &&
    suppressedUntil <= Date.now()
  ) {
    nativeActivitySuppressedUntilBySessionId.delete(sessionId);
    appendAgentDetectionDebugLog("nativeSidebar.activitySuppression.expired", {
      sessionId,
      suppressedUntil: new Date(suppressedUntil).toISOString(),
    });
    return undefined;
  }

  return suppressedUntil;
}

function getNativeEffectiveTitleActivity(
  sessionId: string,
  nextDerivedActivity: TitleDerivedSessionActivity,
): TitleDerivedSessionActivity {
  const now = Date.now();
  const suppressedUntil = getNativeActivitySuppressedUntil(sessionId);
  if (suppressedUntil !== undefined && Number.isFinite(suppressedUntil) && now < suppressedUntil) {
    nativeWorkingStartedAtBySessionId.delete(sessionId);
    return { ...nextDerivedActivity, activity: "idle" };
  }

  if (nextDerivedActivity.activity === "working") {
    if (!nativeWorkingStartedAtBySessionId.has(sessionId)) {
      nativeWorkingStartedAtBySessionId.set(sessionId, now);
    }
    return nextDerivedActivity;
  }

  if (nextDerivedActivity.activity === "attention") {
    const workingStartedAt = nativeWorkingStartedAtBySessionId.get(sessionId);
    const workingDurationMs =
      workingStartedAt === undefined ? undefined : Math.max(0, now - workingStartedAt);
    if (
      workingStartedAt === undefined ||
      (workingDurationMs ?? 0) < NATIVE_MIN_WORKING_DURATION_BEFORE_ATTENTION_MS
    ) {
      nativeWorkingStartedAtBySessionId.delete(sessionId);
      appendAgentDetectionDebugLog("nativeSidebar.activitySuppression.attentionSuppressed", {
        sessionId,
        workingDurationMs,
      });
      return { ...nextDerivedActivity, activity: "idle" };
    }
    return nextDerivedActivity;
  }

  nativeWorkingStartedAtBySessionId.delete(sessionId);
  return nextDerivedActivity;
}

function buildNativeRestoredTerminalInitialInput(session: TerminalSessionRecord): string {
  const command = buildNativeResumeAgentCommand(session);
  return command ? `${command}\r` : "";
}

type NativeResumeAgentId = "claude" | "codex" | "copilot" | "gemini" | "opencode";

function buildNativeResumeAgentCommand(session: TerminalSessionRecord): string | undefined {
  const agentId = resolveNativeResumeAgentId(session.agentName);
  if (agentId !== "claude" && agentId !== "codex" && agentId !== "opencode") {
    return undefined;
  }
  const agentCommand = resolveNativeAgentCommand(agentId);
  const resumeTitle = getNativeTrustedResumeTitle(session);
  if (!agentId || !agentCommand || !resumeTitle) {
    return undefined;
  }

  /**
   * CDXC:SessionRestore 2026-04-27-07:38
   * Automatic reopen uses the agent-specific resume syntax that users expect:
   * Claude receives `claude --resume <title>`, Codex receives
   * `codex resume <title>`, and OpenCode resolves the stored title to its
   * session ID before launching so restored terminals attach to saved sessions.
   */
  switch (agentId) {
    case "codex":
      return `${agentCommand} resume ${quoteNativeShellArg(resumeTitle)}`;
    case "claude":
      return `${agentCommand} --resume ${quoteNativeShellArg(resumeTitle)}`;
    case "opencode":
      return buildNativeOpenCodeResumeCommand(agentCommand, resumeTitle);
    default:
      return undefined;
  }
}

function buildNativeCopyResumeCommand(
  session: TerminalSessionRecord,
): string | undefined {
  const agentId = resolveNativeResumeAgentId(session.agentName);
  const agentCommand = resolveNativeAgentCommand(agentId);
  if (!agentId || !agentCommand) {
    return undefined;
  }
  const resumeTitle = getNativeTrustedResumeTitle(session);

  switch (agentId) {
    case "codex":
      return resumeTitle
        ? `${agentCommand} resume ${quoteNativeShellArg(resumeTitle)}`
        : `${agentCommand} resume`;
    case "claude":
      return resumeTitle
        ? `${agentCommand} --resume ${quoteNativeShellArg(resumeTitle)}`
        : `${agentCommand} --resume`;
    case "opencode":
      return buildNativeOpenCodeCopyResumeCommand(agentCommand, session);
    case "gemini":
      return `${agentCommand} --list-sessions && echo 'Enter ${agentCommand} -r id' to resume a session`;
    case "copilot":
      return `${agentCommand} --continue && echo 'Or use ${agentCommand} --resume to pick a session, or ${agentCommand} --resume SESSION-ID if you know it'`;
    default:
      return undefined;
  }
}

function buildNativeOpenCodeResumeCommand(agentCommand: string, resumeTitle: string): string {
  return `${agentCommand} -s "$(${agentCommand} session list --format json | /usr/bin/python3 -c ${quoteNativeShellArg(getNativeOpenCodeSessionLookupScript())} ${quoteNativeShellArg(resumeTitle)})"`;
}

function buildNativeOpenCodeCopyResumeCommand(
  agentCommand: string,
  session: TerminalSessionRecord,
): string {
  const resumeTitle = getNativeTrustedResumeTitle(session);
  return resumeTitle
    ? buildNativeOpenCodeResumeCommand(agentCommand, resumeTitle)
    : `${agentCommand} session list && echo 'Enter ${agentCommand} -s id' to resume a session`;
}

function getNativeTrustedResumeTitle(session: TerminalSessionRecord): string | undefined {
  const result = getNativeStoredTrustedResumeTitle(session);
  /**
   * CDXC:SessionRestore 2026-04-28-06:06
   * Restore trust is based on persisted title provenance plus title filtering,
   * not the sidebar `∗` marker. Generated, terminal-auto, and native user
   * titles are resumable because native user renames are submitted to the agent
   * with `/rename <title>`. Legacy records without a title source can also
   * resume when the title itself passes filtering. Explicit placeholders,
   * paths, bare agent names, and command noise remain rejected.
   */
  appendRestoreDebugLog("nativeSidebar.resumeTitleTrust", {
    reason: result.reason,
    sessionId: session.sessionId,
    title: session.title,
    titleSource: session.titleSource,
    trusted: result.title !== undefined,
  });
  return result.title;
}

function getNativeStoredTrustedResumeTitle(
  session: TerminalSessionRecord,
): { reason: string; title?: string } {
  if (!isNativeTrustedResumeTitleSource(session.titleSource)) {
    return { reason: `untrusted-title-source:${session.titleSource ?? "missing"}` };
  }
  const resumeTitle = getVisibleTerminalTitle(session.title)?.trim();
  if (!resumeTitle) {
    return { reason: "title-empty-or-filtered" };
  }
  if (isRejectedNativeResumeTitle(resumeTitle)) {
    return { reason: "title-rejected-as-command-or-noise" };
  }
  return { reason: "trusted-stored-title", title: resumeTitle };
}

function isNativeTrustedResumeTitleSource(
  titleSource: TerminalSessionRecord["titleSource"],
): boolean {
  return titleSource !== "placeholder";
}

function isRejectedNativeResumeTitle(title: string): boolean {
  const normalizedTitle = title.trim();
  const normalizedLowerTitle = normalizedTitle.toLowerCase();
  /**
   * CDXC:SessionRestore 2026-04-27-17:45
   * Resume must never target transient terminal command titles. Ghostty can
   * briefly publish the launched agent command (`x`, `codex`, etc.) or mojibake
   * status bytes as the title; those values are display noise, not persisted
   * agent session names.
   */
  return (
    normalizedTitle === "ð^ß^Ñ»" ||
    /[\u0000-\u001f\u007f]/u.test(normalizedTitle) ||
    (normalizedTitle.startsWith("ð") && normalizedTitle.endsWith("»")) ||
    getNativeAgentCommandExecutableNames().has(normalizedLowerTitle) ||
    getNativeAgentCommandExecutableNames().has(getNativeCommandExecutableName(normalizedLowerTitle) ?? "")
  );
}

function getNativeAgentCommandExecutableNames(): Set<string> {
  return new Set(
    [...DEFAULT_SIDEBAR_AGENTS.map((agent) => agent.command), ...storedAgents.map((agent) => agent.command)]
      .map(getNativeCommandExecutableName)
      .filter((commandName): commandName is string => Boolean(commandName)),
  );
}

function getNativeCommandExecutableName(command: string | undefined): string | undefined {
  const firstPart = command?.trim().split(/\s+/u)[0]?.trim();
  return firstPart ? firstPart.replace(/^['"]|['"]$/gu, "").toLowerCase() : undefined;
}

function getNativeOpenCodeSessionLookupScript(): string {
  return `import json, os, sys
title = sys.argv[1].strip()
sessions = json.load(sys.stdin)
cwd = os.getcwd()
match = next((session for session in sessions if session.get("title") == title and session.get("directory") == cwd), None)
if match is None:
    match = next((session for session in sessions if session.get("title") == title), None)
if not match or not match.get("id"):
    sys.exit(1)
sys.stdout.write(str(match["id"]))
`;
}

function resolveNativeResumeAgentId(
  agentName: string | undefined,
): NativeResumeAgentId | undefined {
  const normalizedAgentName = agentName?.trim().toLowerCase();
  if (!normalizedAgentName) {
    return undefined;
  }

  if (isNativeResumeAgentId(normalizedAgentName)) {
    return normalizedAgentName;
  }

  const defaultAgent = getDefaultSidebarAgentById(normalizedAgentName);
  if (isNativeResumeAgentId(defaultAgent?.agentId)) {
    return defaultAgent.agentId;
  }

  const matchingAgent = agents.find(
    (agent) =>
      agent.agentId.trim().toLowerCase() === normalizedAgentName ||
      agent.name.trim().toLowerCase() === normalizedAgentName,
  );
  return isNativeResumeAgentId(matchingAgent?.agentId) ? matchingAgent.agentId : undefined;
}

function isNativeResumeAgentId(agentId: string | undefined): agentId is NativeResumeAgentId {
  return (
    agentId === "claude" ||
    agentId === "codex" ||
    agentId === "copilot" ||
    agentId === "gemini" ||
    agentId === "opencode"
  );
}

function resolveNativeAgentCommand(agentId: NativeResumeAgentId | undefined): string | undefined {
  if (!agentId) {
    return undefined;
  }

  return (
    agents.find((agent) => agent.agentId === agentId)?.command?.trim() ??
    getDefaultSidebarAgentById(agentId)?.command
  );
}

function createTerminal(
  title = DEFAULT_TERMINAL_SESSION_TITLE,
  initialInput = "",
  groupId?: string,
  agentName?: string,
  options?: {
    initialPresentation?: "background" | "focused";
    focusAfterCreate?: boolean;
  },
): TerminalSessionRecord | undefined {
  const project = activeProject();
  if (project.isChat === true) {
    const existingChatSession = findFirstTerminalSessionInProject(project);
    if (existingChatSession) {
      /**
       * CDXC:Chats 2026-05-04-09:41
       * Each chat folder is a single-terminal conversation container. Requests
       * to create another terminal while a chat is active should select the
       * existing chat terminal instead of adding a second session to that chat.
       */
      updateActiveProjectWorkspace(
        (workspace) =>
          focusSessionInSimpleWorkspace(workspace, existingChatSession.sessionId).snapshot,
      );
      publish();
      if (options?.focusAfterCreate !== false) {
        postNative({
          sessionId: nativeSessionIdForProjectSidebarSession(
            project.projectId,
            existingChatSession.sessionId,
          ),
          type: "focusTerminal",
        });
      }
      return existingChatSession;
    }
  }
  const targetWorkspace = groupId
    ? focusGroupInSimpleWorkspace(project.workspace, groupId).snapshot
    : project.workspace;
  const beforeSnapshot = targetWorkspace.groups.find(
    (group) => group.groupId === targetWorkspace.activeGroupId,
  )?.snapshot;
  appendTerminalLaunchDebugLog("nativeSidebar.createTerminal.request", {
    activeProjectId,
    agentName,
    focusedSessionIdBefore: beforeSnapshot?.focusedSessionId,
    groupId,
    initialInputPreview: initialInput.trim().slice(0, 80),
    initialPresentation: options?.initialPresentation ?? "focused",
    projectId: project.projectId,
    sessionCountBefore: beforeSnapshot?.sessions.length,
    title,
    visibleSessionIdsBefore: beforeSnapshot?.visibleSessionIds,
  });
  const result = createSessionInSimpleWorkspace(targetWorkspace, {
    agentName,
    initialPresentation: options?.initialPresentation,
    terminalEngine: "ghostty-native",
    title,
  });
  const generatedSession = result.session?.kind === "terminal" ? result.session : undefined;
  if (!generatedSession) {
    appendTerminalLaunchDebugLog("nativeSidebar.createTerminal.noSession", {
      agentName,
      groupId,
      projectId: project.projectId,
      title,
    });
    return undefined;
  }
  const nativeSessionId = rememberNativeSessionMapping(project.projectId, generatedSession.sessionId);
  const sessionStateFilePath = createNativeSessionStateFilePath(
    project.projectId,
    generatedSession.sessionId,
  );
  updateActiveProjectWorkspace(() => result.snapshot);
  const session = generatedSession;
  if (!session) {
    return undefined;
  }
  if (initialInput.trim() && agentName) {
    suppressNativeSessionActivityIndicators(session.sessionId, "agent-launch");
  }

  terminalStateById.set(session.sessionId, {
    activity: initialInput.trim() && !agentName ? "working" : "idle",
    agentName,
    lifecycleState: "running",
    sessionPersistenceName: session.sessionPersistenceName ?? session.tmuxSessionName,
    sessionPersistenceProvider: settings.sessionPersistenceProvider,
    sessionStateFilePath,
    terminalTitle: title,
  });
  appendTerminalLaunchDebugLog("nativeSidebar.createTerminal.created", {
    activateOnCreate: false,
    agentName,
    focusedSessionIdAfter: result.snapshot.groups.find(
      (group) => group.groupId === result.snapshot.activeGroupId,
    )?.snapshot.focusedSessionId,
    focusAfterCreate: options?.focusAfterCreate !== false,
    initialInputPreview: initialInput.trim().slice(0, 80),
    nativeSessionId,
    projectId: project.projectId,
    sessionId: session.sessionId,
    visibleSessionIdsAfter: result.snapshot.groups.find(
      (group) => group.groupId === result.snapshot.activeGroupId,
    )?.snapshot.visibleSessionIds,
  });
  appendAgentDetectionDebugLog("nativeSidebar.terminalState.created", {
    agentName,
    initialActivity: initialInput.trim() && !agentName ? "working" : "idle",
    initialInputPreview: initialInput.trim().slice(0, 120),
    nativeSessionId,
    sessionId: session.sessionId,
    sessionStateFilePath,
    terminalTitle: title,
  });
  const nativeEnvironment = createNativeAgentSessionEnvironment({
    agentName,
    project,
    sessionId: session.sessionId,
    sessionStateFilePath,
  });
  appendTerminalLaunchDebugLog("nativeSidebar.createTerminal.colorEnv", {
    agentName,
    colorEnv: readAgentColorEnvironmentSnapshot(nativeEnvironment),
    nativeSessionId,
    projectId: project.projectId,
    sessionPersistenceProvider: settings.sessionPersistenceProvider,
    sessionId: session.sessionId,
  });
  postNative({
    /**
     * CDXC:CrashRootCause 2026-05-04-09:19
     * Rapid agent launches must not let native createTerminal briefly activate
     * and focus a new Ghostty surface before the sidebar publishes the current
     * visible terminal set. The sidebar workspace snapshot is the source of
     * truth for visibility, and focus is sent only after that layout command.
    */
    activateOnCreate: false,
    cwd: project.path,
    env: nativeEnvironment,
    initialInput,
    sessionId: nativeSessionId,
    sessionPersistenceName: session.sessionPersistenceName ?? session.tmuxSessionName,
    sessionPersistenceProvider:
      settings.sessionPersistenceProvider === "off"
        ? undefined
        : settings.sessionPersistenceProvider,
    title,
    type: "createTerminal",
  });
  publish();
  if (options?.focusAfterCreate !== false) {
    postNative({ sessionId: nativeSessionId, type: "focusTerminal" });
  }
  return session;
}

function createNativeT3Session(groupId?: string): T3SessionRecord | undefined {
  const project = activeProject();
  const targetWorkspace = groupId
    ? focusGroupInSimpleWorkspace(project.workspace, groupId).snapshot
    : project.workspace;
  const pendingThreadId = `pending-${Date.now().toString(36)}`;
  /**
   * CDXC:T3Code 2026-04-30-02:24
   * Native T3 Code buttons must create T3 pane records, matching the reference
   * app's special T3 path. Do not launch `npx --yes t3` in a terminal because
   * the CLI opens its own browser instead of becoming an embedded zmux pane.
   */
  const result = createSessionInSimpleWorkspace(targetWorkspace, {
    kind: "t3",
    t3: {
      boundThreadId: pendingThreadId,
      projectId: `native-${project.projectId}`,
      serverOrigin: "http://127.0.0.1:0",
      threadId: pendingThreadId,
      workspaceRoot: project.path,
    },
    title: "T3 Code",
  });
  const session = result.session?.kind === "t3" ? result.session : undefined;
  if (!session) {
    return undefined;
  }

  const nativeSessionId = rememberNativeSessionMapping(project.projectId, session.sessionId);
  updateActiveProjectWorkspace(() => result.snapshot);
  postNative({ cwd: project.path, type: "startT3CodeRuntime" });
  postNative({
    cwd: project.path,
    projectId: session.t3.projectId,
    sessionId: nativeSessionId,
    threadId: session.t3.threadId,
    title: "T3 Code",
    type: "createWebPane",
    url: "http://127.0.0.1:3774",
  });
  postNative({ sessionId: nativeSessionId, type: "focusWebPane" });
  publish();
  return session;
}

function restoreNativeT3Session(
  project: NativeProject,
  session: T3SessionRecord,
  reason: string,
  options: { focusAfterRestore?: boolean } = {},
): void {
  /**
   * CDXC:T3Code 2026-04-30-09:33
   * Persisted native T3 cards outlive their WKWebView surfaces across app
   * restarts. Focusing a restored T3 card must recreate the embedded web pane
   * and managed runtime instead of only sending focus to a missing native id.
   */
  const nativeSessionId = rememberNativeSessionMapping(project.projectId, session.sessionId);
  const workspaceRoot = session.t3?.workspaceRoot ?? project.path;
  const serverOrigin =
    session.t3?.serverOrigin?.startsWith("http") && !session.t3.serverOrigin.endsWith(":0")
      ? session.t3.serverOrigin
      : "http://127.0.0.1:3774";
  postNative({ cwd: workspaceRoot, type: "startT3CodeRuntime" });
  postNative({
    cwd: workspaceRoot,
    projectId: session.t3.projectId,
    sessionId: nativeSessionId,
    threadId: session.t3.threadId,
    title: session.title || "T3 Code",
    type: "createWebPane",
    url: serverOrigin,
  });
  if (options.focusAfterRestore !== false) {
    postNative({ sessionId: nativeSessionId, type: "focusWebPane" });
  }
  appendAgentDetectionDebugLog("nativeSidebar.t3Session.restored", {
    nativeSessionId,
    reason,
    sessionId: session.sessionId,
    workspaceRoot,
  });
}

function findNativeT3SessionBoundToThread(
  project: NativeProject,
  threadId: string,
  options: { excludeSessionId?: string } = {},
): T3SessionRecord | undefined {
  /**
   * CDXC:T3Code 2026-05-04-03:06
   * Native T3 sidebar cards are durable bindings to one T3 thread. When the
   * embedded T3 UI navigates to a different thread, zmux must first look for an
   * existing card bound to that thread instead of replacing the current card's
   * stored thread metadata.
   */
  const normalizedThreadId = normalizeNativeT3ThreadId(threadId);
  if (!normalizedThreadId) {
    return undefined;
  }

  for (const group of project.workspace.groups) {
    for (const session of group.snapshot.sessions) {
      if (session.kind !== "t3" || session.sessionId === options.excludeSessionId) {
        continue;
      }
      const sessionThreadId = normalizeNativeT3ThreadId(
        session.t3.boundThreadId || session.t3.threadId,
      );
      if (sessionThreadId === normalizedThreadId) {
        return session;
      }
    }
  }

  return undefined;
}

function createNativeT3SessionForBoundThread(
  project: NativeProject,
  sourceSession: T3SessionRecord,
  threadId: string,
  title?: string,
): T3SessionRecord | undefined {
  /**
   * CDXC:T3Code 2026-05-04-03:06
   * Opening a different T3 thread from inside an embedded pane should create a
   * sibling T3 pane/card linked to the new thread. This preserves the original
   * sidebar card as a stable shortcut to its bound thread while keeping multiple
   * T3 threads visible in zmux at the same time.
   */
  const groupId = project.workspace.groups.find((group) =>
    group.snapshot.sessions.some((session) => session.sessionId === sourceSession.sessionId),
  )?.groupId;
  const targetWorkspace = groupId
    ? focusGroupInSimpleWorkspace(project.workspace, groupId).snapshot
    : project.workspace;
  const resolvedTitle = normalizeNativeT3ThreadTitle(title) ?? "T3 Code";
  const result = createSessionInSimpleWorkspace(targetWorkspace, {
    kind: "t3",
    t3: {
      ...sourceSession.t3,
      boundThreadId: threadId,
      threadId,
    },
    title: resolvedTitle,
  });
  const session = result.session?.kind === "t3" ? result.session : undefined;
  if (!session) {
    return undefined;
  }

  const nativeSessionId = rememberNativeSessionMapping(project.projectId, session.sessionId);
  updateProjectWorkspace(project.projectId, () => result.snapshot);
  postNative({ cwd: session.t3.workspaceRoot || project.path, type: "startT3CodeRuntime" });
  postNative({
    cwd: session.t3.workspaceRoot || project.path,
    projectId: session.t3.projectId,
    sessionId: nativeSessionId,
    threadId: session.t3.threadId,
    title: resolvedTitle,
    type: "createWebPane",
    url: session.t3.serverOrigin || NATIVE_T3_REMOTE_ACCESS_ORIGIN,
  });
  postNative({ sessionId: nativeSessionId, type: "focusWebPane" });
  return session;
}

function normalizeNativeT3ThreadId(threadId: string | undefined): string | undefined {
  const normalized = threadId?.trim();
  if (!normalized || normalized.startsWith("pending-")) {
    return undefined;
  }
  return normalized.toLowerCase();
}

function normalizeNativeT3ThreadTitle(title: string | undefined): string | undefined {
  const normalized = title?.replace(/\s+/g, " ").trim();
  const lower = normalized?.toLowerCase();
  if (
    !normalized ||
    lower === "t3 code" ||
    lower === "t3 code (alpha)" ||
    lower === "no active thread" ||
    lower === "pick a thread to continue"
  ) {
    return undefined;
  }
  return normalized;
}

function persistNativeT3SessionTitle(
  projectId: string,
  sessionId: string,
  title: string | undefined,
): boolean {
  const normalizedTitle = normalizeNativeT3ThreadTitle(title);
  if (!normalizedTitle) {
    return false;
  }

  updateProjectWorkspace(
    projectId,
    (workspace) =>
      setSessionTitleInSimpleWorkspace(workspace, sessionId, normalizedTitle, {
        titleSource: "generated",
      }).snapshot,
  );
  return true;
}

async function resolveNativeT3ThreadTitle(
  threadId: string,
  fallbackTitle?: string,
): Promise<string | undefined> {
  const normalizedFallback = normalizeNativeT3ThreadTitle(fallbackTitle);
  if (normalizedFallback) {
    return normalizedFallback;
  }

  try {
    return await fetchNativeT3ThreadTitle(threadId);
  } catch (error) {
    appendAgentDetectionDebugLog("nativeSidebar.t3ThreadTitle.fetch.failed", {
      error: error instanceof Error ? error.message : String(error),
      threadId,
    });
    return undefined;
  }
}

function findNativeT3ProjectSession(projectId: string, sessionId: string): T3SessionRecord | undefined {
  const project = findProject(projectId);
  const session = project ? findSessionRecordInProject(project, sessionId) : undefined;
  return session?.kind === "t3" ? session : undefined;
}

async function syncNativeT3ProjectSessionTitleFromRuntime(
  projectId: string,
  sessionId: string,
  threadId: string,
  fallbackTitle?: string,
): Promise<boolean> {
  const title = await resolveNativeT3ThreadTitle(threadId, fallbackTitle);
  if (!persistNativeT3SessionTitle(projectId, sessionId, title)) {
    return false;
  }
  publish();
  return true;
}

function scheduleNativeT3SessionTitleSync(
  projectId: string,
  sessionId: string,
  threadId: string,
  fallbackTitle?: string,
): void {
  /**
   * CDXC:T3Code 2026-05-04-04:41
   * Binding a newly opened T3 thread and naming its zmux sidebar card are
   * separate concerns. If T3 has not projected the thread title yet, retry the
   * snapshot lookup for the bound session without changing its thread binding.
   */
  const fallback = normalizeNativeT3ThreadTitle(fallbackTitle);
  void (async () => {
    for (const delayMs of NATIVE_T3_TITLE_SYNC_RETRY_DELAYS_MS) {
      await delay(delayMs);
      const session = findNativeT3ProjectSession(projectId, sessionId);
      if (!session) {
        return;
      }
      const boundThreadId = normalizeNativeT3ThreadId(session.t3.boundThreadId || session.t3.threadId);
      if (boundThreadId !== normalizeNativeT3ThreadId(threadId)) {
        return;
      }
      const synced = await syncNativeT3ProjectSessionTitleFromRuntime(
        projectId,
        sessionId,
        threadId,
        fallback,
      );
      if (synced) {
        return;
      }
    }
  })().catch((error) => {
    appendAgentDetectionDebugLog("nativeSidebar.t3ThreadTitle.retry.failed", {
      error: error instanceof Error ? error.message : String(error),
      projectId,
      sessionId,
      threadId,
    });
  });
}

async function fetchNativeT3ThreadTitle(threadId: string): Promise<string | undefined> {
  const normalizedThreadId = normalizeNativeT3ThreadId(threadId);
  if (!normalizedThreadId) {
    return undefined;
  }

  const ownerBearerToken = await waitForNativeT3OwnerBearerToken();
  const result = await runNativeProcess(
    "/bin/sh",
    [
      "-lc",
      [
        "/usr/bin/curl",
        "--fail",
        "--silent",
        "--show-error",
        "--max-time",
        "5",
        "-H",
        '"authorization: Bearer $T3_OWNER_BEARER"',
        '"$T3_ORIGIN/api/orchestration/snapshot"',
      ].join(" "),
    ],
    {
      env: {
        T3_ORIGIN: NATIVE_T3_REMOTE_ACCESS_ORIGIN,
        T3_OWNER_BEARER: ownerBearerToken,
      },
    },
  );
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || "T3 snapshot request failed.");
  }

  const snapshot = JSON.parse(result.stdout) as {
    threads?: Array<{ deletedAt?: unknown; id?: unknown; title?: unknown }>;
  };
  const thread = snapshot.threads?.find((candidate) => {
    if (typeof candidate.id !== "string" || candidate.deletedAt != null) {
      return false;
    }
    return normalizeNativeT3ThreadId(candidate.id) === normalizedThreadId;
  });
  return typeof thread?.title === "string" ? normalizeNativeT3ThreadTitle(thread.title) : undefined;
}

function handleNativeT3ThreadReady(
  sidebarSessionId: string,
  hostEvent: Extract<NativeHostEvent, { type: "t3ThreadReady" }>,
): void {
  const reference = resolveSidebarSessionReference(sidebarSessionId);
  updateProjectWorkspace(
    reference.project.projectId,
    (workspace) =>
      setT3SessionMetadataInSimpleWorkspace(workspace, reference.sessionId, {
        boundThreadId: hostEvent.threadId,
        projectId: hostEvent.projectId,
        serverOrigin: hostEvent.serverOrigin,
        threadId: hostEvent.threadId,
        workspaceRoot: hostEvent.workspaceRoot,
      }).snapshot,
  );
  publish();
  void syncNativeT3SessionTitleFromRuntime(sidebarSessionId, hostEvent.threadId);
}

async function syncNativeT3SessionTitleFromRuntime(
  sidebarSessionId: string,
  threadId: string,
  fallbackTitle?: string,
): Promise<void> {
  const reference = resolveSidebarSessionReference(sidebarSessionId);
  const synced = await syncNativeT3ProjectSessionTitleFromRuntime(
    reference.project.projectId,
    reference.sessionId,
    threadId,
    fallbackTitle,
  );
  if (!synced) {
    scheduleNativeT3SessionTitleSync(
      reference.project.projectId,
      reference.sessionId,
      threadId,
      fallbackTitle,
    );
  }
}

async function relinkNativeT3SessionThread(
  sidebarSessionId: string,
  threadId: string,
): Promise<void> {
  const normalizedThreadId = normalizeNativeT3ThreadId(threadId);
  if (!normalizedThreadId) {
    return;
  }

  const reference = resolveSidebarSessionReference(sidebarSessionId);
  const session = findSessionRecordInProject(reference.project, reference.sessionId);
  if (session?.kind !== "t3") {
    return;
  }

  const title = await resolveNativeT3ThreadTitle(threadId);
  updateProjectWorkspace(
    reference.project.projectId,
    (workspace) =>
      setT3SessionMetadataInSimpleWorkspace(workspace, reference.sessionId, {
        ...session.t3,
        boundThreadId: threadId.trim(),
        threadId: threadId.trim(),
      }).snapshot,
  );
  persistNativeT3SessionTitle(reference.project.projectId, reference.sessionId, title);
  const refreshedProject = findProject(reference.project.projectId) ?? reference.project;
  const refreshedSession = findSessionRecordInProject(refreshedProject, reference.sessionId);
  if (refreshedSession?.kind === "t3") {
    restoreNativeT3Session(refreshedProject, refreshedSession, "manual-thread-link");
  }
  publish();
}

async function handleNativeT3ThreadChanged(
  sidebarSessionId: string,
  threadId: string,
  title?: string,
): Promise<void> {
  /**
   * CDXC:T3Code 2026-05-04-03:06
   * T3's in-app navigation changes the web route inside one WKWebView. zmux keeps
   * card identity stable by focusing/creating the card for the navigated thread,
   * then re-routing the source WKWebView back to its bound thread without taking
   * focus back from the user's selected target thread.
   */
  const normalizedThreadId = normalizeNativeT3ThreadId(threadId);
  if (!normalizedThreadId || nativeT3ThreadChangeInFlightBySessionId.has(sidebarSessionId)) {
    return;
  }

  const reference = resolveSidebarSessionReference(sidebarSessionId);
  const session = findSessionRecordInProject(reference.project, reference.sessionId);
  if (session?.kind !== "t3") {
    return;
  }

  const currentBoundThreadId = session.t3.boundThreadId || session.t3.threadId;
  if (normalizeNativeT3ThreadId(currentBoundThreadId) === normalizedThreadId) {
    await syncNativeT3SessionTitleFromRuntime(sidebarSessionId, threadId, title);
    return;
  }

  nativeT3ThreadChangeInFlightBySessionId.add(sidebarSessionId);
  try {
    const resolvedTitle = await resolveNativeT3ThreadTitle(threadId, title);
    let targetSession = findNativeT3SessionBoundToThread(reference.project, threadId, {
      excludeSessionId: reference.sessionId,
    });

    appendAgentDetectionDebugLog("nativeSidebar.t3ThreadChanged.bindingPreservationStart", {
      currentSessionId: reference.sessionId,
      currentThreadId: currentBoundThreadId,
      nextThreadId: threadId,
      reusedSessionId: targetSession?.sessionId,
      title: resolvedTitle,
    });

    if (targetSession) {
      if (
        !persistNativeT3SessionTitle(reference.project.projectId, targetSession.sessionId, resolvedTitle)
      ) {
        scheduleNativeT3SessionTitleSync(
          reference.project.projectId,
          targetSession.sessionId,
          threadId,
          title,
        );
      }
    } else {
      targetSession = createNativeT3SessionForBoundThread(
        reference.project,
        session,
        threadId.trim(),
        resolvedTitle,
      );
      if (targetSession && !normalizeNativeT3ThreadTitle(resolvedTitle)) {
        scheduleNativeT3SessionTitleSync(
          reference.project.projectId,
          targetSession.sessionId,
          threadId,
          title,
        );
      }
    }

    const refreshedSource = findSessionRecordInProject(reference.project, reference.sessionId);
    if (refreshedSource?.kind === "t3") {
      restoreNativeT3Session(reference.project, refreshedSource, "thread-switch-restored-binding", {
        focusAfterRestore: false,
      });
    }

    if (targetSession) {
      if (activeProjectId !== reference.project.projectId) {
        focusProject(reference.project.projectId);
      }
      focusTerminal(targetSession.sessionId);
    } else {
      publish();
    }
  } finally {
    nativeT3ThreadChangeInFlightBySessionId.delete(sidebarSessionId);
  }
}

function restoreNativeBrowserSession(
  project: NativeProject,
  session: BrowserSessionRecord,
  reason: string,
): void {
  /**
   * CDXC:BrowserPanes 2026-05-02-06:35
   * Persisted browser-pane cards restore through the same native web-pane host
   * as newly opened browser actions. This keeps app restarts from turning
   * browser session cards into inert sidebar entries.
   */
  const nativeSessionId = rememberNativeSessionMapping(project.projectId, session.sessionId);
  postNative({
    cwd: project.path,
    sessionId: nativeSessionId,
    title: session.title || browserPaneTitleFromUrl(session.browser.url),
    type: "createWebPane",
    url: session.browser.url,
  });
  postNative({ sessionId: nativeSessionId, type: "focusWebPane" });
  appendAgentDetectionDebugLog("nativeSidebar.browserSession.restored", {
    nativeSessionId,
    reason,
    sessionId: session.sessionId,
    url: session.browser.url,
  });
}

function syncSessionTitleFromNativeTerminalTitle(
  sessionId: string,
  rawTitle: string,
  previousTerminalTitle: string | undefined,
): void {
  const terminalState = terminalStateById.get(sessionId);
  const session = findSessionRecord(sessionId);
  const visibleTitle = getVisibleTerminalTitle(rawTitle);
  if (!terminalState || !session || !visibleTitle) {
    appendSessionTitleDebugLog("nativeSidebar.sessionRenameSkipped", {
      agentName: terminalState?.agentName,
      hasSessionRecord: Boolean(session),
      hasTerminalState: Boolean(terminalState),
      rawTitle,
      reason: !terminalState
        ? "terminal-state-missing"
        : !session
          ? "session-record-not-found"
          : "terminal-title-not-visible",
      sessionId,
      visibleTitle,
    });
    return;
  }
  if (isEllipsizedNativeTerminalWindowTitle(visibleTitle)) {
    /**
     * CDXC:NativeTerminals 2026-04-30-03:41
     * Agent/window titles that already include trailing ellipses are display
     * artifacts, not canonical session names. Do not sync them into the
     * workspace record, because native pane title bars now read that record.
     */
    appendSessionTitleDebugLog("nativeSidebar.sessionRenameSkipped", {
      agentName: terminalState.agentName,
      currentSessionTitle: session.title,
      previousTerminalTitle,
      rawTitle,
      reason: "terminal-title-already-ellipsized",
      sessionId,
      visibleTitle,
    });
    return;
  }
  const decision = getNativeTerminalTitleSessionSyncDecision({
    agentName: terminalState.agentName,
    previousTerminalTitle,
    session,
    sessionPersistenceProvider: terminalState.sessionPersistenceProvider,
    visibleTitle,
  });
  if (!decision.shouldSync) {
    appendSessionTitleDebugLog("nativeSidebar.sessionRenameSkipped", {
      agentName: terminalState.agentName,
      currentSessionTitle: session.title,
      previousTerminalTitle,
      rawTitle,
      reason: decision.reason,
      sessionId,
      visibleTitle,
    });
    return;
  }

  updateActiveProjectWorkspace(
    (workspace) =>
      setSessionTitleInSimpleWorkspace(workspace, sessionId, visibleTitle, {
        titleSource: "terminal-auto",
      }).snapshot,
  );
  appendSessionTitleDebugLog("nativeSidebar.sessionRenameApplied", {
    agentName: terminalState.agentName,
    previousSessionTitle: session.title,
    previousTerminalTitle,
    reason: decision.reason,
    sessionId,
    visibleTitle,
  });
}

function isEllipsizedNativeTerminalWindowTitle(title: string): boolean {
  return /\u2026$|\.{3}$/.test(title.trim());
}

function getNativeTerminalTitleSessionSyncDecision(args: {
  agentName?: string;
  previousTerminalTitle?: string;
  session: SessionRecord;
  sessionPersistenceProvider?: zmuxSettings["sessionPersistenceProvider"];
  visibleTitle: string;
}): { reason: string; shouldSync: boolean } {
  if (args.session.kind !== "terminal") {
    return { reason: "non-terminal-session", shouldSync: false };
  }

  const currentTitle = args.session.title.trim();
  if (currentTitle === args.visibleTitle) {
    return { reason: "already-synced", shouldSync: false };
  }

  const previousVisibleTitle = getVisibleTerminalTitle(args.previousTerminalTitle);
  /**
   * CDXC:SessionTitleSync 2026-04-27-17:45
   * Terminal-title events are auto-captured unless they came through explicit
   * zmux UI rename or first-prompt generation paths. Valid agent terminal titles
   * may still replace user/generated titles so in-agent `/rename` remains useful,
   * while command names, paths, placeholders, and mojibake stay blocked.
   */
  if (isValidNativeAgentTerminalTitle(args.visibleTitle, args.agentName)) {
    return {
      reason: `valid-agent-terminal-title-from-${args.session.titleSource ?? "unknown"}`,
      shouldSync: true,
    };
  }

  if (
    args.sessionPersistenceProvider !== undefined &&
    args.sessionPersistenceProvider !== "off" &&
    !isRejectedNativeResumeTitle(args.visibleTitle)
  ) {
    /**
     * CDXC:SessionPersistence 2026-05-05-07:28
     * Persistence providers ask sidebar cards to follow the terminal title
     * reported through the attached pane. Trust visible, non-command titles even
     * for plain terminal sessions so the card maps to tmux/zmx pane identity.
     */
    return {
      reason: `${args.sessionPersistenceProvider}-terminal-title-from-${args.session.titleSource ?? "unknown"}`,
      shouldSync: true,
    };
  }

  return {
    reason:
      previousVisibleTitle !== undefined && currentTitle === previousVisibleTitle
        ? "previous-terminal-title-not-trusted"
        : "terminal-title-not-trusted",
    shouldSync: false,
  };
}

function isValidNativeAgentTerminalTitle(title: string, agentName: string | undefined): boolean {
  return (
    resolveNativeResumeAgentId(agentName) !== undefined &&
    title.trim().length > 1 &&
    /[\p{L}\p{N}]/u.test(title) &&
    getVisibleTerminalTitle(title) !== undefined &&
    !isRejectedNativeResumeTitle(title)
  );
}

type NativePersistedSessionState = {
  agentName?: string;
  firstUserMessage?: string;
  hasAutoTitleFromFirstPrompt?: boolean;
  lastActivityAt?: string;
  pendingFirstPromptAutoRenamePrompt?: string;
  title?: string;
};

async function pollNativeFirstPromptAutoRenameSessions(): Promise<void> {
  for (const [sessionId, terminalState] of terminalStateById.entries()) {
    if (
      terminalState.lifecycleState !== "running" ||
      terminalState.firstPromptAutoRenameInProgress
    ) {
      continue;
    }
    await processNativeFirstPromptAutoRename(sessionId, terminalState);
  }
}

async function processNativeFirstPromptAutoRename(
  sessionId: string,
  terminalState: NonNullable<ReturnType<typeof terminalStateById.get>>,
): Promise<void> {
  const session = findSessionRecord(sessionId);
  if (session?.kind !== "terminal" || !terminalState.sessionStateFilePath) {
    logNativeFirstPromptAutoRenameSkipOnce(
      sessionId,
      terminalState,
      "missing-terminal-session-state",
      {
        hasSessionRecord: Boolean(session),
        sessionStateFilePath: terminalState.sessionStateFilePath,
      },
    );
    return;
  }

  const persistedState = await readNativePersistedSessionState(terminalState.sessionStateFilePath);
  const didUpdateFirstUserMessage =
    persistedState.firstUserMessage !== undefined &&
    terminalState.firstUserMessage !== persistedState.firstUserMessage;
  if (didUpdateFirstUserMessage) {
    terminalState.firstUserMessage = persistedState.firstUserMessage;
    publish();
  }
  const didUpdateLastActivity =
    persistedState.lastActivityAt !== undefined &&
    terminalState.lastActivityAt !== persistedState.lastActivityAt;
  if (didUpdateLastActivity && persistedState.lastActivityAt) {
    /**
     * CDXC:NativeSidebar 2026-04-28-05:14
     * Native terminal hooks write the same lastActivityAt state used by the
     * reference extension. Promote it into live sidebar state so hover
     * timestamps and last-active ordering advance after user prompts.
     */
    terminalState.lastActivityAt = persistedState.lastActivityAt;
    publish();
  }
  const pendingPrompt = persistedState.pendingFirstPromptAutoRenamePrompt?.trim();
  const agentName = persistedState.agentName || terminalState.agentName;
  /**
   * CDXC:SessionTitleSync 2026-05-05-04:27
   * A pending first prompt is stronger than a terminal-auto title. Codex can set
   * its thread title before the native poller processes the hook state; treating
   * that terminal-auto title as the current user title makes auto-generation
   * clear the prompt as stale instead of sending `/rename <generated title>`.
   */
  const shouldLetFirstPromptAutoRenameClaimTitle =
    Boolean(pendingPrompt) &&
    (session.titleSource === "terminal-auto" || isGenericAgentSessionTitle(agentName, session.title));
  const currentTitle = shouldLetFirstPromptAutoRenameClaimTitle
    ? undefined
    : persistedState.title || session.title || terminalState.terminalTitle;
  const decision = explainFirstPromptAutoRenameDecision({
    agentName,
    /**
     * CDXC:SessionTitleSync 2026-04-28-03:49
     * Native first-prompt auto-title may only name still-untitled sessions.
     * Hooks can fire after resume or mid-conversation, so meaningful persisted,
     * terminal-auto, generated, and user titles must block generation instead
     * of being overwritten by a later prompt sample.
     */
    currentTitle,
    hasAutoTitleFromFirstPrompt: persistedState.hasAutoTitleFromFirstPrompt,
    pendingFirstPromptAutoRenamePrompt:
      terminalState.firstPromptAutoRenameProcessedPrompt === pendingPrompt
        ? pendingPrompt
        : undefined,
    prompt: pendingPrompt,
  });
  if (!decision.shouldAutoName || !pendingPrompt) {
    const shouldClearStalePendingPrompt =
      Boolean(pendingPrompt) &&
      (decision.reason === "nonGenericCurrentTitle" || decision.reason === "alreadyAutoNamed");
    if (shouldClearStalePendingPrompt && pendingPrompt && terminalState.sessionStateFilePath) {
      await clearNativeFirstPromptAutoRenamePendingPrompt(
        terminalState.sessionStateFilePath,
        pendingPrompt,
      );
      terminalState.firstPromptAutoRenameProcessedPrompt = pendingPrompt;
    }
    logNativeFirstPromptAutoRenameSkipOnce(sessionId, terminalState, decision.reason, {
      agentName,
      currentTitle,
      hasAutoTitleFromFirstPrompt: persistedState.hasAutoTitleFromFirstPrompt,
      hasPendingPrompt: Boolean(pendingPrompt),
      pendingPromptCleared: shouldClearStalePendingPrompt,
      sessionStateFilePath: terminalState.sessionStateFilePath,
      strategy: decision.strategy,
    });
    return;
  }

  const strategy = resolveFirstPromptAutoRenameStrategy(agentName);
  if (!strategy) {
    logNativeFirstPromptAutoRenameSkipOnce(sessionId, terminalState, "unsupportedAgent", {
      agentName,
      sessionStateFilePath: terminalState.sessionStateFilePath,
    });
    return;
  }

  terminalState.firstPromptAutoRenameInProgress = true;
  terminalState.firstPromptAutoRenameLastLogKey = undefined;
  publish();
  appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.started", {
    agentName,
    promptPreview: getNativePromptPreview(pendingPrompt),
    sessionId,
    strategy,
  });
  try {
    const title =
      strategy === "sendBareRenameCommand"
        ? undefined
        : await generateNativeSessionTitleFromPrompt(activeProject().path, pendingPrompt);
    await sendNativeFirstPromptRenameCommand(sessionId, strategy, title);
    terminalState.firstPromptAutoRenameProcessedPrompt = pendingPrompt;
    if (title) {
      updateActiveProjectWorkspace(
        (workspace) =>
          setSessionTitleInSimpleWorkspace(workspace, sessionId, title, {
            titleSource: "generated",
          }).snapshot,
      );
    }
    appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.applied", {
      agentName,
      promptPreview: getNativePromptPreview(pendingPrompt),
      sessionId,
      strategy,
      title,
    });
    publish();
  } catch (error) {
    await clearNativeFirstPromptAutoRenamePendingPrompt(
      terminalState.sessionStateFilePath,
      pendingPrompt,
    );
    terminalState.firstPromptAutoRenameProcessedPrompt = pendingPrompt;
    appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.failed", {
      agentName,
      error: error instanceof Error ? error.message : String(error),
      pendingPromptCleared: true,
      sessionId,
      strategy,
    });
  } finally {
    terminalState.firstPromptAutoRenameInProgress = false;
    publish();
  }
}

async function readNativePersistedSessionState(
  sessionStateFilePath: string,
): Promise<NativePersistedSessionState> {
  const result = await runNativeProcess("/bin/cat", [sessionStateFilePath]);
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return {};
  }
  return parseNativePersistedSessionState(result.stdout);
}

async function clearNativeFirstPromptAutoRenamePendingPrompt(
  sessionStateFilePath: string,
  failedPrompt: string,
): Promise<void> {
  /**
   * CDXC:SessionTitleSync 2026-04-26-20:27
   * A failed first-prompt title generation must not leave the same pending
   * prompt in the state file. Otherwise the poller restarts every few seconds
   * and the sidebar repeatedly flashes the "generating title" state.
   */
  const command = [
    `/usr/bin/python3 - ${quoteNativeShellArg(sessionStateFilePath)} ${quoteNativeShellArg(failedPrompt)} <<'ZMUX_CLEAR_PENDING_PROMPT'`,
    getClearNativeFirstPromptPendingPromptScript(),
    "ZMUX_CLEAR_PENDING_PROMPT",
  ].join("\n");
  const result = await runNativeProcess("/bin/zsh", ["-lc", command]);
  if (result.exitCode !== 0) {
    appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.clearPendingFailed", {
      error: result.stderr.trim() || result.stdout.trim() || "clear pending prompt failed",
      sessionStateFilePath,
    });
  }
}

function getClearNativeFirstPromptPendingPromptScript(): string {
  return `import pathlib
import sys

state_path = pathlib.Path(sys.argv[1])
failed_prompt = " ".join(sys.argv[2].split())
try:
    lines = state_path.read_text(encoding="utf-8").splitlines()
except FileNotFoundError:
    sys.exit(0)

state = {}
for line in lines:
    key, separator, value = line.partition("=")
    if separator:
        state[key] = value

if " ".join(state.get("pendingFirstPromptAutoRenamePrompt", "").split()) != failed_prompt:
    sys.exit(0)

state["pendingFirstPromptAutoRenamePrompt"] = ""
keys = [
    "status",
    "agent",
    "agentSessionId",
    "firstUserMessageBase64",
    "frozenAt",
    "autoTitleFromFirstPrompt",
    "historyBase64",
    "lastActivityAt",
    "pendingFirstPromptAutoRenamePrompt",
    "title",
]
state_path.parent.mkdir(parents=True, exist_ok=True)
temp_path = state_path.with_suffix(state_path.suffix + ".tmp")
temp_path.write_text("".join(f"{key}={state.get(key, '')}\\n" for key in keys), encoding="utf-8")
temp_path.replace(state_path)
`;
}

function parseNativePersistedSessionState(rawState: string): NativePersistedSessionState {
  const state: NativePersistedSessionState = {};
  for (const line of rawState.split(/\r?\n/g)) {
    const [key, ...valueParts] = line.split("=");
    const rawValue = valueParts.join("=").trim();
    const value = key === "firstUserMessageBase64" ? rawValue : rawValue.replace(/\s+/g, " ");
    if (!value) {
      continue;
    }
    if (key === "agent") {
      state.agentName = value;
    } else if (key === "firstUserMessageBase64") {
      state.firstUserMessage = normalizeNativePersistedTextBase64(value);
    } else if (key === "autoTitleFromFirstPrompt") {
      state.hasAutoTitleFromFirstPrompt = value === "1" || /^true$/iu.test(value);
    } else if (key === "lastActivityAt") {
      state.lastActivityAt = normalizeNativeIsoTimestamp(value);
    } else if (key === "pendingFirstPromptAutoRenamePrompt") {
      state.pendingFirstPromptAutoRenamePrompt = value;
    } else if (key === "title") {
      state.title = getVisibleTerminalTitle(value);
    }
  }
  /**
   * CDXC:FirstMessage 2026-04-28-05:48
   * Existing agent sessions may only have the first prompt in the legacy
   * pending auto-title field. Treat that saved prompt as the first message
   * until a newer hook writes the dedicated base64 field.
   */
  state.firstUserMessage = state.firstUserMessage ?? state.pendingFirstPromptAutoRenamePrompt;
  return state;
}

function normalizeNativePersistedTextBase64(value: string): string | undefined {
  try {
    const decodedBytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    const decodedValue = new TextDecoder().decode(decodedBytes).trim();
    return decodedValue || undefined;
  } catch {
    return undefined;
  }
}

function normalizeNativeIsoTimestamp(value: string): string | undefined {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }
  return new Date(timestamp).toISOString();
}

async function generateNativeSessionTitleFromPrompt(cwd: string, prompt: string): Promise<string> {
  const sourceText = prompt.slice(0, GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH);
  const generationPrompt = buildNativeSessionTitlePrompt(sourceText);
  const delimiter = `zmux_SESSION_TITLE_${Date.now().toString(36)}`;
  const command = [
    /**
     * CDXC:SessionTitleSync 2026-04-26-20:27
     * Internal first-prompt title generation summarizes user text only. It must
     * not require the terminal cwd to be a trusted Git repository, because new
     * empty sessions can start at `/` or another non-repo path.
     */
    "codex exec --skip-git-repo-check -m gpt-5.4-mini -c 'model_reasoning_effort=\"low\"' - <<'",
    delimiter,
    "'\n",
    generationPrompt,
    "\n",
    delimiter,
  ].join("");
  const result = await runNativeProcess("/bin/zsh", ["-lc", command], { cwd });
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr.trim() || result.stdout.trim() || "Codex title generation failed.",
    );
  }
  return parseNativeGeneratedSessionTitleText(result.stdout);
}

function buildNativeSessionTitlePrompt(sourceText: string): string {
  return [
    "Write a concise session title that summarizes the user's text.",
    "Return plain text only.",
    "Rules:",
    "- keep it specific and scannable",
    "- prefer 2 to 4 words when possible",
    `- must be fewer than ${GENERATED_SESSION_TITLE_MAX_LENGTH + 1} characters`,
    "- do not use quotes, markdown, or commentary",
    "- do not end with punctuation",
    "- focus on the task, bug, feature, or topic",
    "",
    "User text:",
    sourceText,
    "",
    "Output handling:",
    "- Produce only the final session title.",
    "- Do not wrap the result in backticks.",
    "- Print only the final result to stdout.",
  ].join("\n");
}

function parseNativeGeneratedSessionTitleText(value: string): string {
  const normalized = normalizeNativeGeneratedText(value);
  const titleLine = normalized.split(/\r?\n/g).find((line) => line.trim().length > 0);
  if (!titleLine) {
    throw new Error("Codex title generation returned an empty session title.");
  }
  const sanitized = titleLine
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/g, "");
  if (!sanitized) {
    throw new Error("Codex title generation returned an empty session title.");
  }
  return clampNativeGeneratedSessionTitleLength(sanitized);
}

function normalizeNativeGeneratedText(value: string): string {
  const trimmed = value.trim();
  const fencedMatch = /^```(?:[a-z0-9_-]+)?\n([\s\S]*?)\n```$/iu.exec(trimmed);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function clampNativeGeneratedSessionTitleLength(value: string): string {
  if (value.length <= GENERATED_SESSION_TITLE_MAX_LENGTH) {
    return value;
  }
  const words = value.split(" ").filter(Boolean);
  let candidate = "";
  for (const word of words) {
    const nextCandidate = candidate ? `${candidate} ${word}` : word;
    if (nextCandidate.length > GENERATED_SESSION_TITLE_MAX_LENGTH) {
      break;
    }
    candidate = nextCandidate;
  }
  return candidate || value.slice(0, GENERATED_SESSION_TITLE_MAX_LENGTH).trim();
}

async function sendNativeFirstPromptRenameCommand(
  sessionId: string,
  strategy: FirstPromptAutoRenameStrategy,
  title: string | undefined,
): Promise<void> {
  const nativeSessionId = nativeSessionIdForSidebarSession(sessionId);
  const commandText =
    strategy === "sendBareRenameCommand" ? "/rename" : `/rename ${title ?? ""}`.trim();
  postNative({ sessionId: nativeSessionId, text: commandText, type: "writeTerminalText" });
  await new Promise((resolve) => window.setTimeout(resolve, AUTO_SUBMIT_STAGED_RENAME_DELAY_MS));
  /**
   * CDXC:SessionTitleSync 2026-04-26-10:04
   * Auto rename must submit the staged `/rename <title>` through Ghostty's
   * Return-key path, matching zmux. Writing "\r" as terminal text creates a
   * visible newline in Codex instead of accepting the command.
   */
  postNative({ sessionId: nativeSessionId, type: "sendTerminalEnter" });
  appendSessionTitleDebugLog("terminalRenameCommand.sent", {
    commandText,
    nativeSessionId,
    reason: "first-prompt-auto-rename",
    sessionId,
    strategy,
  });
}

function logNativeFirstPromptAutoRenameSkipOnce(
  sessionId: string,
  terminalState: NonNullable<ReturnType<typeof terminalStateById.get>>,
  reason: string,
  details?: Record<string, unknown>,
): void {
  const key = `${reason}:${details?.hasPendingPrompt ?? ""}:${details?.currentTitle ?? ""}`;
  if (terminalState.firstPromptAutoRenameLastLogKey === key) {
    return;
  }
  terminalState.firstPromptAutoRenameLastLogKey = key;
  appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.skipped", {
    ...details,
    reason,
    sessionId,
  });
}

function getNativePromptPreview(prompt: string | undefined): string | undefined {
  const normalizedPrompt = prompt?.replace(/\s+/g, " ").trim();
  if (!normalizedPrompt) {
    return undefined;
  }
  return normalizedPrompt.length > 160
    ? `${normalizedPrompt.slice(0, 157).trimEnd()}...`
    : normalizedPrompt;
}

function closeTerminal(sessionId: string): void {
  const reference = resolveSidebarSessionReference(sessionId);
  const sessionRecord = findSessionRecordInProject(reference.project, reference.sessionId);
  const nativeSessionId = forgetNativeSessionMappingForProject(
    reference.project.projectId,
    reference.sessionId,
  );
  clearNativeSidebarCommandSessionBySessionId(reference.sessionId);
  rememberPreviousSession(reference.sessionId, reference.project);
  updateProjectWorkspace(
    reference.project.projectId,
    (workspace) => removeSessionInSimpleWorkspace(workspace, reference.sessionId).snapshot,
  );
  terminalStateById.delete(reference.sessionId);
  titleDerivedActivityBySessionId.delete(reference.sessionId);
  nativeActivitySuppressedUntilBySessionId.delete(reference.sessionId);
  nativeWorkingStartedAtBySessionId.delete(reference.sessionId);
  postNative({
    sessionId: nativeSessionId,
    type:
      sessionRecord?.kind === "t3" || sessionRecord?.kind === "browser"
        ? "closeWebPane"
        : "closeTerminal",
  });
  publish();
}

function focusTerminal(sessionId: string): void {
  const reference = resolveSidebarSessionReference(sessionId);
  if (activeProjectId !== reference.project.projectId) {
    focusProject(reference.project.projectId);
  }
  updateActiveProjectWorkspace(
    (workspace) => focusSessionInSimpleWorkspace(workspace, reference.sessionId).snapshot,
  );
  queueNativeLayoutFocusRequest(reference.sessionId, "focusTerminal");
  const sessionRecord = findSessionRecord(reference.sessionId);
  if (sessionRecord?.kind === "t3" || sessionRecord?.kind === "browser") {
    if (!nativeSessionIdBySidebarSessionId.has(reference.sessionId)) {
      if (sessionRecord.kind === "t3") {
        restoreNativeT3Session(activeProject(), sessionRecord, "focus-restored-session");
      } else {
        restoreNativeBrowserSession(activeProject(), sessionRecord, "focus-restored-session");
      }
    }
    postNative({
      sessionId: nativeSessionIdForProjectSidebarSession(
        reference.project.projectId,
        reference.sessionId,
      ),
      type: "focusWebPane",
    });
    publish();
    return;
  }
  const session = findTerminalSession(reference.sessionId);
  /**
   * CDXC:SessionSleep 2026-04-27-09:09
   * Sleeping a native Ghostty session destroys its terminal surface. Activating
   * that card must first recreate the terminal and run the agent resume command
   * before sending native focus, matching agent-tiler's detached-session wake.
   * CDXC:CrashRootCause 2026-05-04-11:53
   * Restored sleeping terminals mount inactive, so the focused sidebar snapshot
   * must be published to native before the explicit focus command. This keeps
   * restore ordering aligned with new terminal launches and prevents a
   * previous+restored active-surface window during rapid card clicks.
   */
  let restoredSleepingTerminal = false;
  if (session && !terminalStateById.has(reference.sessionId)) {
    restoreNativeTerminalSession(activeProject(), session, "focus-sleeping-session");
    restoredSleepingTerminal = true;
  }
  acknowledgeNativeTerminalAttention(reference.sessionId, "sidebar-focus");
  if (restoredSleepingTerminal) {
    publish();
    postNative({
      sessionId: nativeSessionIdForProjectSidebarSession(
        reference.project.projectId,
        reference.sessionId,
      ),
      type: "focusTerminal",
    });
    return;
  }
  postNative({
    sessionId: nativeSessionIdForProjectSidebarSession(
      reference.project.projectId,
      reference.sessionId,
    ),
    type: activeSnapshot().sessions.some(
      (candidate) =>
        candidate.sessionId === reference.sessionId &&
        (candidate.kind === "t3" || candidate.kind === "browser"),
    )
      ? "focusWebPane"
      : "focusTerminal",
  });
  publish();
}

function focusSidebarSession(sessionId: string): void {
  /**
   * CDXC:BrowserOverlay 2026-04-27-10:23
   * The sidebar Chrome Canary card is a browser-window control, not a terminal
   * session. Any sidebar focus path, including debug CLI replay, must route it
   * to Swift's Canary show command so clicking it reveals the existing Canary
   * window the same way the browser new-tab button reveals a Canary window.
   */
  if (sessionId === CHROME_CANARY_BROWSER_SESSION_ID) {
    showNativeBrowserWindow();
    return;
  }
  focusTerminal(sessionId);
}

function runNativeHotkeyAction(actionId: zmuxHotkeyActionId): void {
  const action = getzmuxHotkeyActionById(actionId);
  if (!action) {
    logNativeHotkeyDebug("nativeHotkeys.actionMissing", { actionId });
    return;
  }
  logNativeHotkeyDebug("nativeHotkeys.actionStart", {
    actionId,
    kind: action.kind,
  });

  /**
   * CDXC:Hotkeys 2026-04-28-05:20
   * App-level hotkeys execute against the same native sidebar state mutations
   * as clicks and CLI commands. Do the real command directly here so terminal
   * focus shortcuts do not depend on a hidden fallback UI path.
   */
  switch (action.kind) {
    case "createSession":
      if (activeProject().isChat === true) {
        void createNativeChat();
      } else {
        createTerminal();
      }
      return;
    case "focusDirection":
      focusNativeHotkeyDirection(action.direction);
      return;
    case "focusGroup":
      updateActiveProjectWorkspace(
        (workspace) => focusGroupByIndexInSimpleWorkspace(workspace, action.groupIndex).snapshot,
      );
      publish();
      return;
    case "focusSessionSlot":
      if (action.slotNumber === -1) {
        focusAdjacentNativeHotkeySession(-1);
        return;
      }
      if (action.slotNumber === 0) {
        focusAdjacentNativeHotkeySession(1);
        return;
      }
      focusNativeHotkeySessionSlot(action.slotNumber);
      return;
    case "moveSidebar":
      moveSidebarToOtherSide();
      return;
    case "openSettings":
      openAppModal({ modal: "settings", type: "open" });
      return;
    case "renameActiveSession":
      promptRenameFocusedNativeHotkeySession();
      return;
    case "setVisibleCount":
      updateActiveProjectWorkspace((workspace) =>
        setVisibleCountInSimpleWorkspace(workspace, action.visibleCount),
      );
      publish();
      return;
    case "setViewMode":
      updateActiveProjectWorkspace((workspace) =>
        setViewModeInSimpleWorkspace(workspace, action.viewMode),
      );
      publish();
      return;
  }
}

function getMatchingNativeHotkeyActionId(
  hotkeyText: string | undefined,
  now: number,
  source: "dom" | "native",
): zmuxHotkeyActionId | undefined {
  if (!hotkeyText) {
    pendingHotkeyPrefix = undefined;
    return undefined;
  }
  const normalizedHotkeys = settings.hotkeys;
  const sequence = pendingHotkeyPrefix ? `${pendingHotkeyPrefix} ${hotkeyText}` : hotkeyText;
  const matchedDefinition = Object.entries(normalizedHotkeys).find(
    ([, value]) => value === sequence,
  );
  if (matchedDefinition) {
    logNativeHotkeyDebug("nativeHotkeys.match", {
      actionId: matchedDefinition[0],
      hotkeyText,
      sequence,
      source,
    });
    pendingHotkeyPrefix = undefined;
    return matchedDefinition[0] as zmuxHotkeyActionId;
  }

  const hasPrefix = Object.values(normalizedHotkeys).some((value) =>
    value?.startsWith(`${hotkeyText} `),
  );
  if (hasPrefix) {
    logNativeHotkeyDebug("nativeHotkeys.prefixStarted", {
      hotkeyText,
      source,
    });
  } else if (hotkeyText.includes("+")) {
    logNativeHotkeyDebug("nativeHotkeys.noMatch", {
      configuredCount: Object.keys(normalizedHotkeys).length,
      hotkeyText,
      pendingHotkeyPrefix,
      sequence,
      source,
    });
  }
  pendingHotkeyPrefix = hasPrefix ? hotkeyText : undefined;
  window.setTimeout(() => {
    if (pendingHotkeyPrefix === hotkeyText && Date.now() - now >= 1_000) {
      logNativeHotkeyDebug("nativeHotkeys.prefixExpired", {
        hotkeyText,
        source,
      });
      pendingHotkeyPrefix = undefined;
    }
  }, 1_000);
  return undefined;
}

function keyboardEventToNativeHotkeyText(event: KeyboardEvent): string | undefined {
  const key = normalizeNativeHotkeyKey(event.key);
  if (!key) {
    return undefined;
  }
  const parts = [
    event.metaKey ? "cmd" : "",
    event.ctrlKey ? "ctrl" : "",
    event.altKey ? "alt" : "",
    event.shiftKey ? "shift" : "",
    key,
  ].filter(Boolean);
  return parts.length > 1 ? parts.join("+") : key;
}

function normalizeNativeHotkeyKey(key: string): string | undefined {
  if (key.length === 1) {
    return key.toLowerCase();
  }
  switch (key) {
    case "ArrowUp":
      return "up";
    case "ArrowRight":
      return "right";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "Escape":
    case "Meta":
    case "Control":
    case "Alt":
    case "Shift":
      return undefined;
    default:
      return key.toLowerCase();
  }
}

function isNativeHotkeyEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isNativeHotkeyCandidate(event: KeyboardEvent, hotkeyText: string | undefined): boolean {
  return Boolean(hotkeyText && (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey));
}

function describeNativeHotkeyTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) {
    return target === null ? "null" : typeof target;
  }
  const tagName = target.tagName.toLowerCase();
  const role = target.getAttribute("role");
  const dataSlot = target.getAttribute("data-slot");
  return [tagName, role ? `role=${role}` : "", dataSlot ? `slot=${dataSlot}` : ""]
    .filter(Boolean)
    .join(" ");
}

function focusNativeHotkeyDirection(direction: SessionGridDirection): void {
  const result = focusDirectionInSnapshot(activeSnapshot(), direction);
  if (!result.changed) {
    logNativeHotkeyDebug("nativeHotkeys.focusDirectionUnchanged", {
      direction,
      focusedSessionId: activeSnapshot().focusedSessionId,
    });
    return;
  }
  replaceActiveSnapshot(result.snapshot);
  publish();
  const focusedSessionId = result.snapshot.focusedSessionId;
  if (focusedSessionId) {
    focusSidebarSession(focusedSessionId);
  }
}

function focusNativeHotkeySessionSlot(slotNumber: number): void {
  const sessions = getVisualNativeHotkeySessionsForActiveGroup();
  const session = sessions[slotNumber - 1];
  if (session) {
    focusSidebarSession(session.sessionId);
    return;
  }
  logNativeHotkeyDebug("nativeHotkeys.sessionSlotMissing", {
    activeSessionsSortMode,
    sessionCount: sessions.length,
    slotNumber,
  });
}

function focusAdjacentNativeHotkeySession(direction: -1 | 1): void {
  const snapshot = activeSnapshot();
  const sessions = getVisualNativeHotkeySessionsForActiveGroup();
  if (sessions.length === 0) {
    logNativeHotkeyDebug("nativeHotkeys.adjacentSessionMissing", { direction });
    return;
  }
  const focusedIndex = Math.max(
    0,
    sessions.findIndex((session) => session.sessionId === snapshot.focusedSessionId),
  );
  const nextIndex = (focusedIndex + direction + sessions.length) % sessions.length;
  focusSidebarSession(sessions[nextIndex]!.sessionId);
}

function getVisualNativeHotkeySessionsForActiveGroup(): SidebarSessionItem[] {
  const group = activeWorkspaceGroup();
  const projectedSessions = createProjectedSidebarSessionsForGroup(group);
  const sessionsById = Object.fromEntries(
    projectedSessions.map((session) => [session.sessionId, session]),
  );
  const manualSessionIds = projectedSessions.map((session) => session.sessionId);
  const displayLayout = createDisplaySessionLayout({
    sessionIdsByGroup: { [group.groupId]: manualSessionIds },
    sessionsById,
    sortMode: activeSessionsSortMode,
    workspaceGroupIds: [group.groupId],
  });
  const visualSessionIds = displayLayout.sessionIdsByGroup[group.groupId] ?? manualSessionIds;
  /**
   * CDXC:Hotkeys 2026-04-28-16:08
   * Numeric session hotkeys must target the same visual order the user sees in
   * the sidebar. Reuse the rendered active-session sorting projection so
   * Cmd+Opt+number follows last-activity order when that mode is selected.
   */
  return visualSessionIds
    .map((sessionId) => sessionsById[sessionId])
    .filter((session): session is SidebarSessionItem => session !== undefined);
}

function promptRenameFocusedNativeHotkeySession(): void {
  const focusedSessionId = activeSnapshot().focusedSessionId;
  if (!focusedSessionId) {
    logNativeHotkeyDebug("nativeHotkeys.renameNoFocusedSession", {});
    return;
  }
  const session = findTerminalSession(focusedSessionId);
  if (!session) {
    logNativeHotkeyDebug("nativeHotkeys.renameFocusedSessionNotTerminal", { focusedSessionId });
    return;
  }
  /**
   * CDXC:AppModals 2026-04-28-16:18
   * Native hotkey rename must use the shared React modal host instead of
   * browser prompt UI, matching the no VS Code/native prompt requirement.
   */
  openAppModal({
    initialTitle: session.title || DEFAULT_TERMINAL_SESSION_TITLE,
    modal: "renameSession",
    sessionId: focusedSessionId,
    type: "open",
  });
}

function acknowledgeNativeTerminalAttention(
  sessionId: string,
  reason: "native-focus" | "sidebar-focus",
): boolean {
  const terminalState = terminalStateById.get(sessionId);
  if (terminalState?.activity !== "attention") {
    return false;
  }

  /**
   * CDXC:NativeSessionStatus 2026-04-27-07:39
   * Done/green is an attention state, not just an exited lifecycle. Clicking a
   * green session card acknowledges that completion and clears both the card
   * dot and workspace-bar done count until the next working-to-done transition.
   */
  const previousDerivedActivity = titleDerivedActivityBySessionId.get(sessionId);
  const acknowledgedDerivedActivity =
    acknowledgeTitleDerivedSessionActivity(previousDerivedActivity);
  if (acknowledgedDerivedActivity) {
    titleDerivedActivityBySessionId.set(sessionId, acknowledgedDerivedActivity);
  }
  terminalState.activity = "idle";
  appendAgentDetectionDebugLog("nativeSidebar.sessionAttentionAcknowledged", {
    acknowledgedDerivedActivity,
    previousDerivedActivity,
    reason,
    sessionId,
  });
  return true;
}

function findSessionGroupId(sessionId: string): string | undefined {
  const reference = resolveSidebarSessionReference(sessionId);
  return reference.project.workspace.groups.find((group) =>
    group.snapshot.sessions.some((session) => session.sessionId === reference.sessionId),
  )?.groupId;
}

function findTerminalSession(sessionId: string): TerminalSessionRecord | undefined {
  const reference = resolveSidebarSessionReference(sessionId);
  return findTerminalSessionInProject(reference.project, reference.sessionId);
}

function findTerminalSessionInProject(
  project: NativeProject,
  sessionId: string,
): TerminalSessionRecord | undefined {
  for (const group of project.workspace.groups) {
    const session = group.snapshot.sessions.find(
      (candidate) => candidate.sessionId === sessionId,
    );
    if (session?.kind === "terminal") {
      return session;
    }
  }
  return undefined;
}

function findFirstTerminalSessionInProject(
  project: NativeProject,
): TerminalSessionRecord | undefined {
  for (const group of project.workspace.groups) {
    const session = group.snapshot.sessions.find(
      (candidate): candidate is TerminalSessionRecord => candidate.kind === "terminal",
    );
    if (session) {
      return session;
    }
  }
  return undefined;
}

async function renameNativeSidebarTerminalSession(
  sessionId: string,
  title: string,
  source: string,
): Promise<void> {
  const reference = resolveSidebarSessionReference(sessionId);
  if (!findTerminalSessionInProject(reference.project, reference.sessionId)) {
    return;
  }

  const requestedTitleInput = title.trim();
  if (!requestedTitleInput) {
    return;
  }

  const shouldGenerateTitle =
    requestedTitleInput.length > SESSION_RENAME_SUMMARY_THRESHOLD;
  const terminalState = terminalStateById.get(reference.sessionId);
  let requestedTitle = requestedTitleInput;
  if (shouldGenerateTitle) {
    if (terminalState) {
      terminalState.firstPromptAutoRenameInProgress = true;
      publish();
    }
    appendSessionTitleDebugLog("nativeSidebar.renameSession.generateTitle.started", {
      pastedTextLength: requestedTitleInput.length,
      sessionId: reference.sessionId,
      source,
    });
    try {
      requestedTitle = await generateNativeSessionTitleFromPrompt(
        reference.project.path,
        requestedTitleInput,
      );
      appendSessionTitleDebugLog("nativeSidebar.renameSession.generateTitle.completed", {
        pastedTextLength: requestedTitleInput.length,
        sessionId: reference.sessionId,
        source,
        title: requestedTitle,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendSessionTitleDebugLog("nativeSidebar.renameSession.generateTitle.failed", {
        error: message,
        pastedTextLength: requestedTitleInput.length,
        sessionId: reference.sessionId,
        source,
      });
      showNativeMessage("error", message);
      return;
    } finally {
      if (terminalState) {
        terminalState.firstPromptAutoRenameInProgress = false;
        publish();
      }
    }
  }

  updateProjectWorkspace(
    reference.project.projectId,
    (workspace) =>
      setSessionTitleInSimpleWorkspace(workspace, reference.sessionId, requestedTitle, {
        titleSource: shouldGenerateTitle ? "generated" : "user",
      }).snapshot,
  );
  const nativeSessionId = nativeSessionIdForProjectSidebarSession(
    reference.project.projectId,
    reference.sessionId,
  );
  const normalizedRenameTitle = normalizeTerminalTitle(requestedTitle) ?? requestedTitle;
  const commandText = `/rename ${normalizedRenameTitle}`;
  /**
   * CDXC:SidebarRename 2026-04-28-15:49
   * Manual sidebar renames in the native app must match the reference
   * controller flow: persist the card title, stage `/rename <title>` in the
   * targeted terminal, then submit through the native Enter path so the Agent
   * CLI thread name changes instead of only the sidebar label changing.
   */
  postNative({ sessionId: nativeSessionId, text: commandText, type: "writeTerminalText" });
  window.setTimeout(() => {
    postNative({ sessionId: nativeSessionId, type: "sendTerminalEnter" });
    appendSessionTitleDebugLog("terminalRenameCommand.sent", {
      commandText,
      nativeSessionId,
      requestedTitle,
      sessionId: reference.sessionId,
      source,
    });
  }, AUTO_SUBMIT_STAGED_RENAME_DELAY_MS);
  publish();
}

function disposeNativeSleepingSessionSurface(sessionId: string, project = activeProject()): void {
  const nativeSessionId = forgetNativeSessionMappingForProject(project.projectId, sessionId);
  clearNativeSidebarCommandSessionBySessionId(sessionId);
  terminalStateById.delete(sessionId);
  titleDerivedActivityBySessionId.delete(sessionId);
  nativeActivitySuppressedUntilBySessionId.delete(sessionId);
  nativeWorkingStartedAtBySessionId.delete(sessionId);
  postNative({ sessionId: nativeSessionId, type: "closeTerminal" });
}

function setNativeSessionSleeping(sessionId: string, sleeping: boolean): void {
  const reference = resolveSidebarSessionReference(sessionId);
  const session = findTerminalSessionInProject(reference.project, reference.sessionId);
  if (!session) {
    return;
  }
  updateProjectWorkspace(
    reference.project.projectId,
    (workspace) =>
      setSessionSleepingInSimpleWorkspace(workspace, reference.sessionId, sleeping).snapshot,
  );
  if (sleeping) {
    disposeNativeSleepingSessionSurface(reference.sessionId, reference.project);
  } else if (!terminalStateById.has(reference.sessionId)) {
    const nextSession = findTerminalSessionInProject(reference.project, reference.sessionId);
    if (nextSession) {
      restoreNativeTerminalSession(reference.project, nextSession, "wake-session");
    }
  }
  publish();
}

function setNativeGroupSleeping(groupId: string, sleeping: boolean): void {
  const group = activeProject().workspace.groups.find((candidate) => candidate.groupId === groupId);
  if (!group) {
    return;
  }
  const sessionsToSleep = sleeping
    ? group.snapshot.sessions.filter(
        (session): session is TerminalSessionRecord =>
          session.kind === "terminal" && session.isSleeping !== true,
      )
    : [];
  updateActiveProjectWorkspace(
    (workspace) =>
      setGroupSleepingInSimpleWorkspace(
        workspace,
        groupId,
        sleeping,
        sleeping ? sessionsToSleep.map((session) => session.sessionId) : undefined,
      ).snapshot,
  );
  if (sleeping) {
    for (const session of sessionsToSleep) {
      disposeNativeSleepingSessionSurface(session.sessionId);
    }
  } else {
    const nextGroup = activeProject().workspace.groups.find(
      (candidate) => candidate.groupId === groupId,
    );
    for (const session of nextGroup?.snapshot.sessions ?? []) {
      if (session.kind === "terminal" && !terminalStateById.has(session.sessionId)) {
        restoreNativeTerminalSession(activeProject(), session, "wake-group");
      }
    }
  }
  publish();
}

function restartNativeSession(sessionId: string): void {
  const reference = resolveSidebarSessionReference(sessionId);
  const session = findTerminalSessionInProject(reference.project, reference.sessionId);
  const groupId = findSessionGroupId(sessionId);
  if (!session) {
    return;
  }
  const initialInput = buildNativeRestoredTerminalInitialInput(session);
  if (!initialInput.trim()) {
    showNativeMessage(
      "info",
      "Full reload is only available for Codex, Claude, and OpenCode sessions with a visible title.",
    );
    return;
  }
  /**
   * CDXC:SessionRestore 2026-04-27-08:04
   * Right-click Full reload follows agent-tiler semantics in native zmux:
   * recreate the terminal as the same agent type, then immediately send the
   * agent-specific resume command instead of opening a fresh shell.
   */
  if (activeProjectId !== reference.project.projectId) {
    focusProject(reference.project.projectId);
  }
  closeTerminal(reference.sessionId);
  createTerminal(
    session.title || DEFAULT_TERMINAL_SESSION_TITLE,
    initialInput,
    groupId,
    session.agentName,
  );
}

function forkNativeSession(sessionId: string): void {
  const reference = resolveSidebarSessionReference(sessionId);
  const session = findTerminalSessionInProject(reference.project, reference.sessionId);
  const groupId = findSessionGroupId(sessionId);
  if (!session) {
    return;
  }
  if (activeProjectId !== reference.project.projectId) {
    focusProject(reference.project.projectId);
  }
  createTerminal(`${session.title || DEFAULT_TERMINAL_SESSION_TITLE} Fork`, "", groupId);
}

function findSidebarSessionForCli(
  selector: NativeCliSessionSelector,
): SidebarSessionItem | undefined {
  const sidebarMessage = buildSidebarMessage();
  const sessions = sidebarMessage.groups.flatMap((group) => group.sessions);
  if (selector.sessionId) {
    return sessions.find((session) => session.sessionId === selector.sessionId);
  }
  if (typeof selector.sessionNumber === "number") {
    return sessions.find((session) => session.sessionNumber === selector.sessionNumber);
  }
  if (typeof selector.index === "number") {
    return sessions[selector.index];
  }
  const focusedSessionId = activeSnapshot().focusedSessionId;
  return focusedSessionId
    ? sessions.find((session) => session.sessionId === focusedSessionId)
    : sessions[0];
}

function requireCliSession(payload: Record<string, unknown>): SidebarSessionItem {
  const session = findSidebarSessionForCli({
    index: typeof payload.index === "number" ? payload.index : undefined,
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
    sessionNumber: typeof payload.sessionNumber === "number" ? payload.sessionNumber : undefined,
  });
  if (!session) {
    throw new Error("No matching session was found.");
  }
  return session;
}

function terminalTextForCliKey(key: unknown): string | undefined {
  switch (String(key)) {
    case "ctrl-c":
    case "Control+C":
      return "\u0003";
    case "escape":
    case "Escape":
      return "\u001b";
    case "tab":
    case "Tab":
      return "\t";
    case "arrow-up":
    case "ArrowUp":
      return "\u001b[A";
    case "arrow-down":
    case "ArrowDown":
      return "\u001b[B";
    case "arrow-right":
    case "ArrowRight":
      return "\u001b[C";
    case "arrow-left":
    case "ArrowLeft":
      return "\u001b[D";
    default:
      return undefined;
  }
}

function summarizeCliState() {
  const sidebarMessage = buildSidebarMessage();
  return {
    activeProjectId,
    projects: projects.map((project) => ({
      activeGroupId: project.workspace.activeGroupId,
      groupCount: project.workspace.groups.length,
      isActive: project.projectId === activeProjectId,
      name: project.name,
      path: project.path,
      projectId: project.projectId,
    })),
    revision,
    sidebar: {
      groups: sidebarMessage.groups,
      hud: sidebarMessage.hud,
      previousSessions,
    },
    terminalStates: Object.fromEntries(
      [...terminalStateById.entries()].map(([sessionId, state]) => [
        sessionId,
        {
          ...state,
          nativeSessionId: nativeSessionIdForSidebarSession(sessionId),
        },
      ]),
    ),
  };
}

function assertCliSidebarCard(payload: Record<string, unknown>) {
  const session = requireCliSession(payload);
  const sessionReference = resolveSidebarSessionReference(session.sessionId);
  const terminalState = terminalStateById.get(sessionReference.sessionId);
  const failures: string[] = [];
  const expectedAgentIcon = typeof payload.agentIcon === "string" ? payload.agentIcon : undefined;
  const expectedAgentName = typeof payload.agentName === "string" ? payload.agentName : undefined;
  const expectedVisible = typeof payload.visible === "boolean" ? payload.visible : undefined;
  if (expectedAgentIcon !== undefined && session.agentIcon !== expectedAgentIcon) {
    failures.push(
      `agentIcon expected ${expectedAgentIcon}, received ${session.agentIcon ?? "<empty>"}`,
    );
  }
  if (expectedAgentName !== undefined && terminalState?.agentName !== expectedAgentName) {
    failures.push(
      `agentName expected ${expectedAgentName}, received ${terminalState?.agentName ?? "<empty>"}`,
    );
  }
  if (expectedVisible !== undefined && session.isVisible !== expectedVisible) {
    failures.push(`visible expected ${expectedVisible}, received ${session.isVisible}`);
  }
  return {
    failures,
    ok: failures.length === 0,
    session,
    terminalState,
  };
}

async function waitForCliSidebarCard(payload: Record<string, unknown>) {
  const timeoutMs = typeof payload.timeoutMs === "number" ? payload.timeoutMs : 5_000;
  const intervalMs = typeof payload.intervalMs === "number" ? payload.intervalMs : 200;
  const startedAt = Date.now();
  let result = assertCliSidebarCard(payload);
  while (!result.ok && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    result = assertCliSidebarCard(payload);
  }
  return {
    ...result,
    elapsedMs: Date.now() - startedAt,
  };
}

function runCliAgent(agentId: string, groupId?: string): SessionRecord | undefined {
  const agent = agents.find((candidate) => candidate.agentId === agentId);
  if (!agent?.command) {
    throw new Error(`Unknown or unconfigured agent: ${agentId}`);
  }
  if (agent.agentId === "t3") {
    return createNativeT3Session(groupId);
  }
  return createTerminal(
    createAgentSessionDefaultTitle(agent.name),
    `${agent.command}\r`,
    groupId,
    agent.agentId,
  );
}

/**
 * CDXC:PreviousSessions 2026-04-28-05:12
 * Native zmux must mirror the reference Prompt to Find Session workflow:
 * receive the modal's remembered-topic query, launch a terminal Codex session,
 * rename that helper session, then stage the local-session search prompt.
 */
function promptFindPreviousSession(queryInput?: string): void {
  const query = queryInput?.trim();
  if (!query) {
    showNativeMessage("info", "Type what you remember in the Previous Sessions search field.");
    return;
  }

  const agent = resolveFindPreviousSessionAgent();
  if (!agent) {
    showNativeMessage(
      "info",
      "zmux could not find Codex for Find a session. Restore the Codex agent button.",
    );
    return;
  }

  const session = createTerminal(
    createAgentSessionDefaultTitle(agent.name),
    `${agent.command}\r`,
    undefined,
    agent.agentId,
  );
  if (!session) {
    return;
  }

  const prompt = renderFindPreviousSessionPrompt(
    DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE,
    query,
  );
  window.setTimeout(() => {
    const nativeSessionId = nativeSessionIdForSidebarSession(session.sessionId);
    postNative({
      sessionId: nativeSessionId,
      text: `/rename Search: ${query}`,
      type: "writeTerminalText",
    });
    postNative({ sessionId: nativeSessionId, type: "sendTerminalEnter" });
    postNative({ sessionId: nativeSessionId, text: prompt, type: "writeTerminalText" });
  }, FIND_PREVIOUS_SESSION_AGENT_STAGING_DELAY_MS);
}

function resolveFindPreviousSessionAgent(): SidebarAgentButton | undefined {
  return (
    agents.find((candidate) => candidate.agentId === FIND_PREVIOUS_SESSION_AGENT_ID) ??
    createSidebarAgentButtons(storedAgents, storedAgentOrder).find(
      (candidate) => candidate.agentId === FIND_PREVIOUS_SESSION_AGENT_ID,
    ) ??
    createSidebarAgentButtons([], []).find(
      (candidate) => candidate.agentId === FIND_PREVIOUS_SESSION_AGENT_ID,
    )
  );
}

function runCliCommandButton(commandId: string): TerminalSessionRecord | undefined {
  const command = commands.find((candidate) => candidate.commandId === commandId);
  if (!command) {
    throw new Error(`Unknown command button: ${commandId}`);
  }
  if (command.actionType === "browser" && command.url) {
    openNativeBrowserWindow(command.url);
    return undefined;
  }
  if (!command.command) {
    throw new Error(`Command button is not configured: ${commandId}`);
  }
  return runNativeSidebarCommand(command);
}

function getNativeSidebarCommandSessionTitle(command: SidebarCommandButton): string {
  const normalizedActionName = command.name.trim();
  return normalizedActionName.length > 0
    ? normalizedActionName
    : (command.command ?? "").trim().slice(0, 20);
}

function getNativeSidebarCommandExecutionText(command: string, closeOnExit: boolean): string {
  if (!closeOnExit) {
    return command;
  }

  return `${command}; __zmux_exit=$?; exit $__zmux_exit`;
}

function createNativeSidebarCommandRunId(commandId: string): string {
  return `${commandId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function postNativeSidebarCommandRunState(
  commandId: string,
  runId: string,
  state: "error" | "running" | "success",
): void {
  sidebarBus.post({
    commandId,
    runId,
    state,
    type: "sidebarCommandRunStateChanged",
  });
}

function clearNativeSidebarCommandRunState(commandId: string): void {
  sidebarBus.post({
    commandId,
    type: "sidebarCommandRunStateCleared",
  });
}

function playNativeSidebarActionCompletionSound(sessionId?: string): void {
  /**
   * CDXC:NativeActions 2026-04-29-16:30
   * Terminal action completion sounds are per-command feedback and use the
   * action completion sound, independent of the global session completion
   * bell toggle.
   */
  appendAgentDetectionDebugLog("nativeSidebar.completionSound.action", {
    sessionId,
    sound: settings.actionCompletionSound,
  });
  playNativeSound(settings.actionCompletionSound);
}

function setNativeSidebarCommandSession(
  command: SidebarCommandButton,
  sessionId: string,
  closeOnExit: boolean,
  runId?: string,
): void {
  const existingSession = sidebarCommandSessionByCommandId.get(command.commandId);
  if (existingSession?.sessionId && existingSession.sessionId !== sessionId) {
    sidebarCommandCommandIdBySessionId.delete(existingSession.sessionId);
  }

  sidebarCommandSessionByCommandId.set(command.commandId, {
    closeOnExit,
    commandId: command.commandId,
    playCompletionSound: command.playCompletionSound,
    runId,
    sessionId,
  });
  sidebarCommandCommandIdBySessionId.set(sessionId, command.commandId);
}

function clearNativeSidebarCommandSessionBySessionId(sessionId: string): void {
  const commandId = sidebarCommandCommandIdBySessionId.get(sessionId);
  if (!commandId) {
    return;
  }

  sidebarCommandCommandIdBySessionId.delete(sessionId);
  const storedSession = sidebarCommandSessionByCommandId.get(commandId);
  if (storedSession?.sessionId === sessionId) {
    sidebarCommandSessionByCommandId.delete(commandId);
  }
}

function closeNativeSidebarCommandSession(sessionId: string): void {
  clearNativeSidebarCommandSessionBySessionId(sessionId);
  closeTerminal(sessionId);
}

function writeNativeSidebarCommandToSession(
  sessionId: string,
  command: string,
  closeOnExit: boolean,
): void {
  const nativeSessionId = nativeSessionIdForSidebarSession(sessionId);
  postNative({
    sessionId: nativeSessionId,
    text: getNativeSidebarCommandExecutionText(command, closeOnExit),
    type: "writeTerminalText",
  });
  postNative({ sessionId: nativeSessionId, type: "sendTerminalEnter" });
}

function handleNativeSidebarCommandSessionExit(
  sessionId: string,
  exitCode: number | undefined,
): void {
  const commandId = sidebarCommandCommandIdBySessionId.get(sessionId);
  if (!commandId) {
    return;
  }

  const storedSession = sidebarCommandSessionByCommandId.get(commandId);
  if (!storedSession || storedSession.sessionId !== sessionId) {
    return;
  }

  const didFail = (exitCode ?? 0) !== 0;
  const runId = storedSession.runId ?? createNativeSidebarCommandRunId(commandId);
  postNativeSidebarCommandRunState(commandId, runId, didFail ? "error" : "success");

  if (didFail || storedSession.playCompletionSound) {
    playNativeSidebarActionCompletionSound(sessionId);
  }

  if (storedSession.closeOnExit && !didFail) {
    closeNativeSidebarCommandSession(sessionId);
    return;
  }

  if (!storedSession.closeOnExit) {
    sidebarCommandSessionByCommandId.set(commandId, {
      ...storedSession,
      runId: undefined,
    });
  }
  publish();
}

/**
 * CDXC:Actions 2026-04-28-02:54
 * Native sidebar terminal actions must match the reference sidebar flow:
 * default runs open managed background terminals with button spinner/status
 * feedback, while Debug Action creates a normal visible session for inspection.
 */
function runNativeSidebarCommand(
  command: SidebarCommandButton,
  runMode: SidebarCommandRunMode = "default",
): TerminalSessionRecord | undefined {
  if (command.actionType === "browser" && command.url) {
    openNativeBrowserWindow(command.url);
    return undefined;
  }
  const commandText = command.command?.trim();
  if (!commandText) {
    return undefined;
  }

  const sessionTitle = getNativeSidebarCommandSessionTitle(command);
  if (runMode === "debug") {
    return createTerminal(`Debug: ${sessionTitle}`, `${commandText}\r`);
  }

  const existingSession = sidebarCommandSessionByCommandId.get(command.commandId);
  if (command.closeTerminalOnExit && existingSession) {
    closeNativeSidebarCommandSession(existingSession.sessionId);
  }

  if (command.closeTerminalOnExit) {
    const session = createTerminal(sessionTitle, "", undefined, undefined, {
      focusAfterCreate: false,
      initialPresentation: "background",
    });
    if (!session) {
      return undefined;
    }

    const runId = createNativeSidebarCommandRunId(command.commandId);
    setNativeSidebarCommandSession(command, session.sessionId, true, runId);
    postNativeSidebarCommandRunState(command.commandId, runId, "running");
    writeNativeSidebarCommandToSession(session.sessionId, commandText, true);
    publish();
    return session;
  }

  const reusableSession =
    existingSession && terminalStateById.get(existingSession.sessionId)?.lifecycleState === "running"
      ? findTerminalSession(existingSession.sessionId)
      : undefined;
  if (existingSession && !reusableSession) {
    closeNativeSidebarCommandSession(existingSession.sessionId);
  }

  const session =
    reusableSession ??
    createTerminal(sessionTitle, "", undefined, undefined, {
      focusAfterCreate: false,
      initialPresentation: "background",
    });
  if (!session) {
    return undefined;
  }

  setNativeSidebarCommandSession(command, session.sessionId, false);
  writeNativeSidebarCommandToSession(session.sessionId, commandText, false);
  publish();
  return session;
}

async function handleNativeCliCommand(action: string, payload: Record<string, unknown>) {
  /**
   * CDXC:DebugCli 2026-04-27-07:18
   * CLI actions are intentionally routed through the native sidebar runtime so
   * automated repros can create sessions, press sidebar buttons, send terminal
   * input, and inspect projected card state without bypassing app behavior.
   */
  try {
    switch (action) {
      case "state":
      case "dumpState":
        return { ok: true, state: summarizeCliState() };
      case "createSession": {
        const groupId = typeof payload.groupId === "string" ? payload.groupId : undefined;
        if (groupId === COMBINED_CHATS_GROUP_ID || (!groupId && activeProject().isChat === true)) {
          await createNativeChat(typeof payload.title === "string" ? payload.title : undefined);
          return { ok: true, state: summarizeCliState() };
        }
        const session = createTerminal(
          typeof payload.title === "string" ? payload.title : DEFAULT_TERMINAL_SESSION_TITLE,
          typeof payload.input === "string" ? payload.input : "",
          groupId,
        );
        return { ok: true, session, state: summarizeCliState() };
      }
      case "createChat":
        await createNativeChat(typeof payload.title === "string" ? payload.title : undefined);
        return { ok: true, state: summarizeCliState() };
      case "createAgentSession":
      case "runAgent": {
        const agentId = typeof payload.agentId === "string" ? payload.agentId : "";
        const session = runCliAgent(
          agentId,
          typeof payload.groupId === "string" ? payload.groupId : undefined,
        );
        return { ok: true, session, state: summarizeCliState() };
      }
      case "runCommand": {
        const session = runCliCommandButton(String(payload.commandId ?? ""));
        return { ok: true, session, state: summarizeCliState() };
      }
      case "clickButton": {
        const kind = String(payload.kind ?? "");
        const id = String(payload.id ?? "");
        if (kind === "agent") {
          return { ok: true, session: runCliAgent(id), state: summarizeCliState() };
        }
        if (kind === "command") {
          return { ok: true, session: runCliCommandButton(id), state: summarizeCliState() };
        }
        if (kind === "section") {
          const section = id as SidebarCollapsibleSection;
          setSidebarSectionCollapsed(section, !collapsedSections[section]);
          return { ok: true, state: summarizeCliState() };
        }
        throw new Error(`Unsupported button kind: ${kind}`);
      }
      case "focusSession": {
        const session = requireCliSession(payload);
        focusSidebarSession(session.sessionId);
        return { ok: true, session, state: summarizeCliState() };
      }
      case "focusGroup": {
        const groupReference = resolveSidebarGroupReference(String(payload.groupId));
        const groupId = groupReference.groupId;
        if (!groupId) {
          focusProject(groupReference.project.projectId);
          return { ok: true, state: summarizeCliState() };
        }
        updateProjectWorkspace(
          groupReference.project.projectId,
          (workspace) => focusGroupInSimpleWorkspace(workspace, groupId).snapshot,
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      }
      case "switchProject": {
        const project = projects.find(
          (candidate) =>
            candidate.projectId === payload.projectId ||
            candidate.path === payload.path ||
            candidate.name === payload.name,
        );
        if (!project) {
          throw new Error("No matching project was found.");
        }
        focusProject(project.projectId);
        return { ok: true, state: summarizeCliState() };
      }
      case "addProject":
        addProject(
          String(payload.path),
          typeof payload.name === "string" ? payload.name : undefined,
        );
        return { ok: true, state: summarizeCliState() };
      case "closeSession": {
        const session = requireCliSession(payload);
        closeTerminal(session.sessionId);
        return { ok: true, state: summarizeCliState() };
      }
      case "restartSession": {
        const session = requireCliSession(payload);
        restartNativeSession(session.sessionId);
        return { ok: true, state: summarizeCliState() };
      }
      case "forkSession": {
        const session = requireCliSession(payload);
        forkNativeSession(session.sessionId);
        return { ok: true, state: summarizeCliState() };
      }
      case "fullReloadSession": {
        const session = requireCliSession(payload);
        restartNativeSession(session.sessionId);
        return { ok: true, state: summarizeCliState() };
      }
      case "renameSession": {
        const session = requireCliSession(payload);
        await renameNativeSidebarTerminalSession(
          session.sessionId,
          String(payload.title ?? ""),
          "native-cli-rename-session",
        );
        return { ok: true, state: summarizeCliState() };
      }
      case "sleepSession": {
        const session = requireCliSession(payload);
        setNativeSessionSleeping(session.sessionId, payload.sleeping !== false);
        return { ok: true, state: summarizeCliState() };
      }
      case "favoriteSession": {
        const session = requireCliSession(payload);
        const reference = resolveSidebarSessionReference(session.sessionId);
        updateProjectWorkspace(
          reference.project.projectId,
          (workspace) =>
            setSessionFavoriteInSimpleWorkspace(
              workspace,
              reference.sessionId,
              payload.favorite !== false,
            ).snapshot,
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      }
      case "sendText": {
        const session = requireCliSession(payload);
        postNative({
          sessionId: nativeSessionIdForSidebarSession(session.sessionId),
          text: String(payload.text ?? ""),
          type: "writeTerminalText",
        });
        return { ok: true, session };
      }
      case "sendEnter": {
        const session = requireCliSession(payload);
        postNative({
          sessionId: nativeSessionIdForSidebarSession(session.sessionId),
          type: "sendTerminalEnter",
        });
        return { ok: true, session };
      }
      case "sendKey": {
        const session = requireCliSession(payload);
        const text = terminalTextForCliKey(payload.key);
        if (!text) {
          throw new Error(`Unsupported key: ${String(payload.key)}`);
        }
        postNative({
          sessionId: nativeSessionIdForSidebarSession(session.sessionId),
          text,
          type: "writeTerminalText",
        });
        return { ok: true, session };
      }
      case "renameCommand": {
        const session = requireCliSession(payload);
        postNative({
          sessionId: nativeSessionIdForSidebarSession(session.sessionId),
          text: `/rename ${String(payload.title ?? "")}`,
          type: "writeTerminalText",
        });
        await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        postNative({
          sessionId: nativeSessionIdForSidebarSession(session.sessionId),
          type: "sendTerminalEnter",
        });
        return { ok: true, session };
      }
      case "toggleSection":
        setSidebarSectionCollapsed(
          String(payload.section) as SidebarCollapsibleSection,
          typeof payload.collapsed === "boolean"
            ? payload.collapsed
            : !collapsedSections[String(payload.section) as SidebarCollapsibleSection],
        );
        return { ok: true, state: summarizeCliState() };
      case "setVisibleCount":
        updateActiveProjectWorkspace((workspace) =>
          setVisibleCountInSimpleWorkspace(
            workspace,
            clampVisibleSessionCount(Number(payload.count)),
          ),
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      case "setViewMode":
        updateActiveProjectWorkspace((workspace) =>
          setViewModeInSimpleWorkspace(
            workspace,
            String(payload.mode) as "grid" | "horizontal" | "vertical",
          ),
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      case "openBrowser":
        openNativeBrowserWindow(
          typeof payload.url === "string" ? payload.url : DEFAULT_BROWSER_LAUNCH_URL,
        );
        return { ok: true };
      case "openBrowserPane":
        /**
         * CDXC:ChromiumBrowserPanes 2026-05-04-17:04
         * CEF pane testing needs a non-UI path that exercises the same
         * in-workspace browser creation as the sidebar button when macOS
         * accessibility automation is unavailable in local agent sessions.
         */
        return { ok: true, session: createNativeBrowserSession(DEFAULT_BROWSER_LAUNCH_URL) };
      case "showBrowser":
        showNativeBrowserWindow();
        return { ok: true };
      case "moveSidebar":
        moveSidebarToOtherSide();
        return { ok: true, state: summarizeCliState() };
      case "assertSidebarCard":
        return assertCliSidebarCard(payload);
      case "waitFor":
        return waitForCliSidebarCard(payload);
      default:
        throw new Error(`Unsupported CLI action: ${action}`);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}

function copyResumeCommand(sessionId: string): void {
  const reference = resolveSidebarSessionReference(sessionId);
  const session = findTerminalSessionInProject(reference.project, reference.sessionId);
  if (!session) {
    return;
  }
  const resumeCommand = buildNativeCopyResumeCommand(session);
  if (!resumeCommand) {
    showNativeMessage("info", "No resume command is available for this session.");
    return;
  }
  const text = `cd ${quoteNativeShellArg(reference.project.path)} && ${resumeCommand}`;
  void navigator.clipboard?.writeText(text).catch(() => undefined);
}

function resolveNativeBrowserAccessT3Session(preferredSessionId?: string): T3SessionRecord | undefined {
  const preferredReference = preferredSessionId
    ? resolveSidebarSessionReference(preferredSessionId)
    : undefined;
  const project = preferredReference?.project ?? activeProject();
  const candidateSessionIds = new Set<string>();
  if (preferredReference) {
    candidateSessionIds.add(preferredReference.sessionId);
  }

  for (const group of project.workspace.groups) {
    if (group.snapshot.focusedSessionId) {
      candidateSessionIds.add(group.snapshot.focusedSessionId);
    }
  }

  for (const sessionId of candidateSessionIds) {
    const sessionRecord = findSessionRecordInProject(project, sessionId);
    if (sessionRecord?.kind === "t3") {
      return sessionRecord;
    }
  }

  for (const group of project.workspace.groups) {
    const sessionRecord = group.snapshot.sessions.find(
      (candidate): candidate is T3SessionRecord => candidate.kind === "t3",
    );
    if (sessionRecord) {
      return sessionRecord;
    }
  }

  return undefined;
}

function resolveOrCreateNativeBrowserAccessT3Session(
  preferredSessionId?: string,
): T3SessionRecord | undefined {
  const existingSession = resolveNativeBrowserAccessT3Session(preferredSessionId);
  if (existingSession) {
    return existingSession;
  }

  const preferredReference = preferredSessionId
    ? resolveSidebarSessionReference(preferredSessionId)
    : undefined;
  if (preferredReference && activeProjectId !== preferredReference.project.projectId) {
    focusProject(preferredReference.project.projectId);
  }
  return createNativeT3Session();
}

async function requestNativeT3SessionBrowserAccess(preferredSessionId?: string): Promise<void> {
  /**
   * CDXC:T3RemoteAccess 2026-05-02-01:18
   * Native zmux cannot delegate Remote Access to the extension controller. It
   * must reuse the managed desktop T3 runtime, issue a one-time pairing link,
   * and send the QR payload through the shared sidebar modal contract.
   */
  const sessionRecord = resolveOrCreateNativeBrowserAccessT3Session(preferredSessionId);
  if (!sessionRecord) {
    showNativeMessage("error", "Could not start T3 Code for remote access.");
    return;
  }

  postNative({ cwd: sessionRecord.t3.workspaceRoot, type: "startT3CodeRuntime" });

  try {
    const ownerBearerToken = await waitForNativeT3OwnerBearerToken();
    const credential = await issueNativeT3PairingCredential(ownerBearerToken);
    const localPairingUrl = buildT3PairingUrl(NATIVE_T3_REMOTE_ACCESS_ORIGIN, credential);
    const accessLink = await resolveNativeT3BrowserAccessLink(localPairingUrl);
    sidebarBus.post({
      endpointUrl: accessLink.endpointUrl,
      localUrl: accessLink.localUrl,
      mode: accessLink.mode,
      note: accessLink.note,
      sessionId: sessionRecord.sessionId,
      sessionTitle: sessionRecord.title,
      tailscaleEnabled: accessLink.tailscaleEnabled,
      type: "showT3BrowserAccess",
    });
  } catch (error) {
    appendAgentDetectionDebugLog("nativeSidebar.t3BrowserAccess.failed", {
      error: error instanceof Error ? error.message : String(error),
      sessionId: sessionRecord.sessionId,
    });
    showNativeMessage(
      "error",
      error instanceof Error ? error.message : "Could not create the T3 remote access link.",
    );
  }
}

async function waitForNativeT3OwnerBearerToken(): Promise<string> {
  for (let attempt = 0; attempt < NATIVE_T3_REMOTE_ACCESS_AUTH_ATTEMPTS; attempt += 1) {
    const token = await readNativeT3OwnerBearerToken();
    if (token) {
      return token;
    }
    await delay(NATIVE_T3_REMOTE_ACCESS_AUTH_RETRY_MS);
  }

  throw new Error("T3 Code is still starting. Try Remote Access again in a moment.");
}

async function readNativeT3OwnerBearerToken(): Promise<string | undefined> {
  const zmuxHomeDir = window.__zmux_NATIVE_HOST__?.zmuxHomeDir;
  if (!zmuxHomeDir) {
    return undefined;
  }

  const authStatePath = `${zmuxHomeDir.replace(/\/+$/, "")}/t3-runtime/auth-state.json`;
  const result = await runNativeProcess("/bin/cat", [authStatePath]);
  if (result.exitCode !== 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(result.stdout) as { ownerBearerToken?: unknown; provider?: unknown };
    return parsed.provider === "t3code" && typeof parsed.ownerBearerToken === "string"
      ? parsed.ownerBearerToken.trim() || undefined
      : undefined;
  } catch {
    return undefined;
  }
}

async function issueNativeT3PairingCredential(ownerBearerToken: string): Promise<string> {
  const requestBody = JSON.stringify({ label: "zmux Remote Access" });
  const result = await runNativeProcess(
    "/bin/sh",
    [
      "-lc",
      [
        "/usr/bin/curl",
        "--fail",
        "--silent",
        "--show-error",
        "--max-time",
        "5",
        "-X",
        "POST",
        `${NATIVE_T3_REMOTE_ACCESS_ORIGIN}/api/auth/pairing-token`,
        "-H",
        '"authorization: Bearer $T3_OWNER_BEARER"',
        "-H",
        '"content-type: application/json"',
        "--data",
        '"$T3_PAIRING_BODY"',
      ].join(" "),
    ],
    {
      env: {
        T3_OWNER_BEARER: ownerBearerToken,
        T3_PAIRING_BODY: requestBody,
      },
    },
  );
  if (result.exitCode !== 0) {
    throw new Error(`Could not create the T3 pairing link: ${result.stderr || result.stdout}`);
  }

  const parsed = JSON.parse(result.stdout) as { credential?: unknown };
  if (typeof parsed.credential !== "string" || !parsed.credential.trim()) {
    throw new Error("T3 pairing link response did not include a credential.");
  }
  return parsed.credential.trim();
}

async function resolveNativeT3BrowserAccessLink(localUrl: string): Promise<{
  endpointUrl: string;
  localUrl: string;
  mode: "external" | "local-network" | "local-only" | "tailscale";
  note: string;
  tailscaleEnabled: boolean;
}> {
  const parsedLocalUrl = new URL(localUrl);
  const [tailscaleHost, localNetworkHost] = await Promise.all([
    detectNativeTailscaleIpv4(),
    detectNativeLocalNetworkIpv4(),
  ]);
  const localNetworkUrl = localNetworkHost
    ? replaceT3AccessUrlHost(parsedLocalUrl, localNetworkHost)
    : undefined;

  if (tailscaleHost) {
    return {
      endpointUrl: replaceT3AccessUrlHost(parsedLocalUrl, tailscaleHost),
      localUrl: localNetworkUrl ?? localUrl,
      mode: "tailscale",
      note: localNetworkUrl
        ? "QR code and Copy link use your machine's Tailscale address. Open link uses your machine's local network address."
        : "QR code and Copy link use your machine's Tailscale address. No local network address was detected, so Open link falls back to this machine only.",
      tailscaleEnabled: true,
    };
  }

  if (localNetworkHost) {
    const resolvedLocalNetworkUrl = replaceT3AccessUrlHost(parsedLocalUrl, localNetworkHost);
    return {
      endpointUrl: resolvedLocalNetworkUrl,
      localUrl: resolvedLocalNetworkUrl,
      mode: "local-network",
      note: "Tailscale is not connected, so QR code, Copy link, and Open link all use your machine's local network address.",
      tailscaleEnabled: false,
    };
  }

  return {
    endpointUrl: localUrl,
    localUrl,
    mode: "local-only",
    note: "No Tailscale or local network address was detected, so QR code, Copy link, and Open link only work on this machine for now.",
    tailscaleEnabled: false,
  };
}

async function detectNativeTailscaleIpv4(): Promise<string | undefined> {
  const result = await runNativeProcess("/usr/bin/env", ["tailscale", "ip", "-4"]);
  if (result.exitCode !== 0) {
    return undefined;
  }
  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(isIpv4Host);
}

async function detectNativeLocalNetworkIpv4(): Promise<string | undefined> {
  const result = await runNativeProcess("/bin/sh", [
    "-lc",
    [
      'iface="$(/sbin/route get default 2>/dev/null | /usr/bin/awk \'/interface:/{print $2; exit}\')"',
      'if [ -n "$iface" ]; then /usr/sbin/ipconfig getifaddr "$iface" 2>/dev/null && exit 0; fi',
      "for fallback in en0 en1; do /usr/sbin/ipconfig getifaddr \"$fallback\" 2>/dev/null && exit 0; done",
      "exit 1",
    ].join("; "),
  ]);
  if (result.exitCode !== 0) {
    return undefined;
  }
  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(isIpv4Host);
}

function buildT3PairingUrl(origin: string, credential: string): string {
  const url = new URL("/pair", origin);
  url.hash = `token=${encodeURIComponent(credential)}`;
  return url.toString();
}

function replaceT3AccessUrlHost(url: URL, host: string): string {
  const nextUrl = new URL(url.toString());
  nextUrl.hostname = host;
  return nextUrl.toString();
}

function isIpv4Host(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d{1,3}$/u.test(part)) {
      return false;
    }
    const value = Number(part);
    return Number.isInteger(value) && value >= 0 && value <= 255;
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function refreshDaemonSessionsState(): void {
  const now = new Date().toISOString();
  const sessions: SidebarDaemonSessionItem[] = [];
  const t3Sessions: SidebarT3SessionItem[] = [];
  for (const project of projects) {
    for (const group of project.workspace.groups) {
      for (const session of group.snapshot.sessions) {
        if (session.kind === "t3") {
          t3Sessions.push({
            activity: "idle",
            detail: session.t3?.serverOrigin ?? "Native T3 Code pane",
            isCurrentWorkspace: project.projectId === activeProjectId,
            isFocused: group.snapshot.focusedSessionId === session.sessionId,
            isRunning: true,
            isSleeping: false,
            lastInteractionAt: now,
            sessionId: session.sessionId,
            threadId: session.t3?.threadId,
            title: session.title,
            workspaceId: project.projectId,
            workspaceRoot: session.t3?.workspaceRoot ?? project.path,
          });
          continue;
        }
        if (session.kind !== "terminal") {
          continue;
        }
        const state = terminalStateById.get(session.sessionId);
        sessions.push({
          agentStatus: state?.activity ?? "idle",
          cols: 80,
          cwd: project.path,
          isCurrentWorkspace: project.projectId === activeProjectId,
          restoreState: "live",
          rows: 24,
          sessionId: session.sessionId,
          shell: session.title || "Native Ghostty",
          startedAt: now,
          status:
            state?.lifecycleState === "error"
              ? "error"
              : state?.lifecycleState === "done"
                ? "exited"
                : "running",
          title: state?.terminalTitle ?? session.title,
          workspaceId: project.projectId,
        });
      }
    }
  }
  const message: SidebarDaemonSessionsStateMessage = {
    daemon: {
      pid: 0,
      port: 0,
      protocolVersion: 1,
      startedAt: now,
    },
    sessions,
    t3Server:
      t3Sessions.length > 0
        ? {
            pid: 0,
            port: 3774,
            startedAt: now,
          }
        : undefined,
    t3Sessions,
    type: "daemonSessionsState",
  };
  sidebarBus.post(message);
  postAppModalHost({ message, type: "sidebarState" });
}

function closeAllNativeSessions(): void {
  const sessionIds = projects.flatMap((project) =>
    project.workspace.groups.flatMap((group) =>
      group.snapshot.sessions
        .filter((session) => session.kind === "terminal")
        .map((session) => session.sessionId),
    ),
  );
  for (const sessionId of sessionIds) {
    const nativeSessionId = forgetNativeSessionMapping(sessionId);
    postNative({ sessionId: nativeSessionId, type: "closeTerminal" });
    terminalStateById.delete(sessionId);
    titleDerivedActivityBySessionId.delete(sessionId);
  }
  sidebarCommandSessionByCommandId.clear();
  sidebarCommandCommandIdBySessionId.clear();
  projects = projects.map((project) => ({
    ...project,
    workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
  }));
  previousSessions = [];
  writeStoredProjects("closeAllNativeSessions");
  publish();
}

function addProject(path: string, name = projectNameFromPath(path)): void {
  const normalizedPath = path.replace(/\/+$/, "") || path;
  const projectId = createProjectId(normalizedPath);
  if (!projects.some((project) => project.projectId === projectId)) {
    projects = [
      ...projects,
      {
        name: name.trim() || projectNameFromPath(normalizedPath),
        path: normalizedPath,
        projectId,
        theme: resolveSidebarTheme(settings.sidebarTheme, "dark"),
        workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
      },
    ];
    writeStoredProjects("addProject");
  }
  focusProject(projectId);
  if (activeSnapshot().sessions.length === 0) {
    createTerminal(DEFAULT_TERMINAL_SESSION_TITLE);
    return;
  }
  publish();
}

async function createNativeChat(title = "chat"): Promise<void> {
  /**
   * CDXC:Chats 2026-05-04-09:30
   * A chat is not tied to an existing code project. Starting one must create a
   * real folder under ~/zmux/chats/<date>-title and then launch a normal empty
   * terminal in that directory so the user can choose any agent from the shell.
   */
  const createdAt = new Date();
  const chatTitle = title.trim() || "chat";
  const chatPath = createNativeChatDirectoryPath(chatTitle, createdAt);
  const result = await runNativeProcess("/bin/mkdir", ["-p", chatPath]);
  if (result.exitCode !== 0) {
    showNativeMessage(
      "error",
      result.stderr.trim() || result.stdout.trim() || `Unable to create chat folder: ${chatPath}`,
    );
    return;
  }

  const projectId = createProjectId(chatPath);
  if (!projects.some((project) => project.projectId === projectId)) {
    projects = orderNativeProjectsForSidebar([
      ...projects,
      {
        isChat: true,
        name: nativeChatTitleFromDate(createdAt),
        path: chatPath,
        projectId,
        theme: resolveSidebarTheme(settings.sidebarTheme, "dark"),
        workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
      },
    ]);
    writeStoredProjects("createChat");
  }
  focusProject(projectId);
  if (activeSnapshot().sessions.length === 0) {
    createTerminal(DEFAULT_TERMINAL_SESSION_TITLE);
    return;
  }
  publish();
}

function removeProject(projectId: string): void {
  if (projects.length <= 1) {
    showNativeMessage("warning", "Keep at least one workspace in zmux.");
    return;
  }
  const projectIndex = projects.findIndex((project) => project.projectId === projectId);
  if (projectIndex < 0) {
    return;
  }
  const project = projects[projectIndex]!;
  /**
   * CDXC:WorkspaceDock 2026-04-27-08:45
   * Right-click removal belongs to the React workspace dock context menu. When
   * a workspace is removed, close its native terminal surfaces and delete the
   * sidebar/native id mappings before persisting the remaining workspaces so
   * removed sessions cannot keep drawing behind the new active project.
   */
  for (const group of project.workspace.groups) {
    for (const session of group.snapshot.sessions) {
      if (session.kind !== "terminal") {
        continue;
      }
      const nativeSessionId = nativeSessionIdBySidebarSessionId.get(session.sessionId);
      if (nativeSessionId) {
        postNative({ sessionId: nativeSessionId, type: "closeTerminal" });
        sidebarSessionIdByNativeSessionId.delete(nativeSessionId);
      }
      nativeSessionIdBySidebarSessionId.delete(session.sessionId);
      terminalStateById.delete(session.sessionId);
      titleDerivedActivityBySessionId.delete(session.sessionId);
      nativeActivitySuppressedUntilBySessionId.delete(session.sessionId);
      nativeWorkingStartedAtBySessionId.delete(session.sessionId);
    }
  }
  const nextProjects = projects.filter((project) => project.projectId !== projectId);
  projects = nextProjects;
  if (activeProjectId === projectId) {
    activeProjectId =
      nextProjects[Math.min(projectIndex, nextProjects.length - 1)]?.projectId ??
      nextProjects[0]!.projectId;
    postZedOverlaySettings("workspace-focus");
    scheduleSyncOpenProjectWithZed("removeProject");
    void refreshGitState();
  }
  writeStoredProjects("removeProject");
  publish();
}

function closeProjectToRecent(projectId: string): void {
  const projectIndex = projects.findIndex((project) => project.projectId === projectId);
  if (projectIndex < 0) {
    return;
  }
  const project = projects[projectIndex]!;
  if (project.isChat === true) {
    return;
  }

  /**
   * CDXC:RecentProjects 2026-05-04-14:25
   * Closing a Combined project parks it in Recent Projects instead of deleting
   * sessions. All native surfaces are torn down and records are marked
   * sleeping so restoring can bring back the saved split/group state.
   */
  for (const group of project.workspace.groups) {
    for (const session of group.snapshot.sessions) {
      disposeNativeRecentProjectSessionSurface(project, session);
    }
  }

  const nextProjects = projects.map((candidate) =>
    candidate.projectId === projectId
      ? {
          ...candidate,
          isRecentProject: true,
          recentClosedAt: new Date().toISOString(),
          workspace: setProjectSessionsSleeping(candidate.workspace, true),
        }
      : candidate,
  );
  projects = nextProjects;

  const didCloseActiveProject = activeProjectId === projectId;
  if (didCloseActiveProject) {
    const nextVisibleProject = findNearestVisibleProjectAfterClose(projectIndex, projectId);
    if (nextVisibleProject) {
      activeProjectId = nextVisibleProject.projectId;
      postZedOverlaySettings("workspace-focus");
      scheduleSyncOpenProjectWithZed("closeProjectToRecent");
      void refreshGitState();
    }
  }

  writeStoredProjects("closeProjectToRecent");
  publish();
}

function restoreRecentProject(projectId: string): void {
  const project = findProject(projectId);
  if (!project || project.isRecentProject !== true) {
    return;
  }

  const sessionCount = countRecentProjectSessions(project);
  const didSwitchProject = activeProjectId !== projectId;
  projects = projects.map((candidate) =>
    candidate.projectId === projectId
      ? {
          ...candidate,
          isRecentProject: false,
          recentClosedAt: undefined,
          workspace:
            sessionCount > 0
              ? wakeVisibleProjectSessions(candidate.workspace)
              : candidate.workspace,
        }
      : candidate,
  );
  activeProjectId = projectId;
  writeStoredProjects("restoreRecentProject");
  postZedOverlaySettings("workspace-focus");
  if (didSwitchProject) {
    scheduleSyncOpenProjectWithZed("restoreRecentProject");
  }
  void refreshGitState();

  if (sessionCount === 0) {
    createTerminal(DEFAULT_TERMINAL_SESSION_TITLE);
    return;
  }

  publish();
}

function disposeNativeRecentProjectSessionSurface(
  project: NativeProject,
  session: SessionRecord,
): void {
  const nativeSessionId = forgetNativeSessionMappingForProject(
    project.projectId,
    session.sessionId,
  );
  clearNativeSidebarCommandSessionBySessionId(session.sessionId);
  terminalStateById.delete(session.sessionId);
  titleDerivedActivityBySessionId.delete(session.sessionId);
  nativeActivitySuppressedUntilBySessionId.delete(session.sessionId);
  nativeWorkingStartedAtBySessionId.delete(session.sessionId);
  postNative({
    sessionId: nativeSessionId,
    type: session.kind === "t3" || session.kind === "browser" ? "closeWebPane" : "closeTerminal",
  });
}

function setProjectSessionsSleeping(
  workspace: GroupedSessionWorkspaceSnapshot,
  sleeping: boolean,
): GroupedSessionWorkspaceSnapshot {
  return normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...workspace,
    groups: workspace.groups.map((group) => ({
      ...group,
      snapshot: {
        ...group.snapshot,
        sessions: group.snapshot.sessions.map((session) => ({
          ...session,
          isSleeping: sleeping,
        })),
      },
    })),
  });
}

function wakeVisibleProjectSessions(
  workspace: GroupedSessionWorkspaceSnapshot,
): GroupedSessionWorkspaceSnapshot {
  const activeGroup =
    workspace.groups.find((group) => group.groupId === workspace.activeGroupId) ??
    workspace.groups[0];
  if (!activeGroup) {
    return workspace;
  }

  const visibleSessionIds = activeGroup.snapshot.visibleSessionIds.filter((sessionId) =>
    activeGroup.snapshot.sessions.some((session) => session.sessionId === sessionId),
  );
  const sessionIdsToWake =
    visibleSessionIds.length > 0
      ? visibleSessionIds
      : activeGroup.snapshot.focusedSessionId
        ? [activeGroup.snapshot.focusedSessionId]
        : activeGroup.snapshot.sessions[0]
          ? [activeGroup.snapshot.sessions[0].sessionId]
          : [];
  const wakeIds = new Set(sessionIdsToWake);

  return normalizeSimpleGroupedSessionWorkspaceSnapshot({
    ...workspace,
    groups: workspace.groups.map((group) => ({
      ...group,
      snapshot: {
        ...group.snapshot,
        sessions: group.snapshot.sessions.map((session) =>
          wakeIds.has(session.sessionId) ? { ...session, isSleeping: false } : session,
        ),
        visibleSessionIds:
          group.groupId === activeGroup.groupId && visibleSessionIds.length === 0
            ? sessionIdsToWake
            : group.snapshot.visibleSessionIds,
      },
    })),
  });
}

function findNearestVisibleProjectAfterClose(
  closedProjectIndex: number,
  closedProjectId: string,
): NativeProject | undefined {
  const visibleProjects = projects.filter(
    (project) => project.projectId !== closedProjectId && project.isRecentProject !== true,
  );
  if (visibleProjects.length === 0) {
    return undefined;
  }

  return (
    projects
      .slice(closedProjectIndex + 1)
      .find((project) => project.projectId !== closedProjectId && project.isRecentProject !== true) ??
    projects
      .slice(0, closedProjectIndex)
      .reverse()
      .find((project) => project.projectId !== closedProjectId && project.isRecentProject !== true) ??
    visibleProjects[0]
  );
}

function setProjectIcon(projectId: string, iconDataUrl: string | undefined): void {
  /**
   * CDXC:WorkspaceDock 2026-04-27-08:48
   * Native-picked workspace images still enter through the legacy data URL API.
   * Convert them into the typed workspace icon model so the dock can share one
   * renderer for image and Tabler icon variants.
   */
  const icon = iconDataUrl
    ? ({ dataUrl: iconDataUrl, kind: "image" } satisfies WorkspaceDockIcon)
    : undefined;
  projects = projects.map((project) =>
    project.projectId === projectId ? { ...project, icon, iconDataUrl } : project,
  );
  writeStoredProjects("setProjectIcon");
  publish();
}

function setProjectTheme(projectId: string, theme: SidebarTheme): void {
  projects = projects.map((project) =>
    project.projectId === projectId ? removeProjectCustomThemeColor(project, theme) : project,
  );
  writeStoredProjects("setProjectTheme");
  publish();
}

/**
 * CDXC:WorkspaceTheme 2026-05-05-05:01
 * Choosing a preset theme is not a Custom theme update. Remove the persisted
 * custom color field instead of leaving an undefined marker so every renderer
 * falls back to preset icon, sidebar, and project-header colors immediately.
 */
function removeProjectCustomThemeColor(project: NativeProject, theme: SidebarTheme): NativeProject {
  const { themeColor: _removedThemeColor, ...projectWithoutCustomTheme } = project;
  return { ...projectWithoutCustomTheme, theme };
}

function setProjectThemeColor(projectId: string, themeColor: string): void {
  const normalizedColor = normalizeWorkspaceThemeColor(themeColor);
  if (!normalizedColor) {
    return;
  }

  /**
   * CDXC:WorkspaceTheme 2026-05-05-02:58
   * The Theme context menu owns custom workspace colors. Applying Custom keeps
   * the current preset as fallback metadata but writes a validated color that
   * immediately overrides the dock button and Combined-mode project header.
   */
  projects = projects.map((project) =>
    project.projectId === projectId ? { ...project, themeColor: normalizedColor } : project,
  );
  writeStoredProjects("setProjectThemeColor");
  publish();
}

function focusProject(projectId: string): void {
  if (!projects.some((project) => project.projectId === projectId)) {
    return;
  }
  const didSwitchProject = activeProjectId !== projectId;
  activeProjectId = projectId;
  writeStoredProjects("focusProject");
  postZedOverlaySettings("workspace-focus");
  if (didSwitchProject) {
    scheduleSyncOpenProjectWithZed("focusProject");
  }
  void refreshGitState();
  const focusedSessionId = activeSnapshot().focusedSessionId;
  if (focusedSessionId) {
    queueNativeLayoutFocusRequest(focusedSessionId, "focusProject");
  }
  publish();
}

function reorderProjects(projectIds: string[]): void {
  const requestedIds = projectIds.filter((projectId) =>
    projects.some((project) => project.projectId === projectId),
  );
  if (requestedIds.length === 0) {
    return;
  }

  /**
   * CDXC:WorkspaceDock 2026-04-27-08:22
   * Workspace rail drag/drop reorders workareas persistently. Preserve any
   * projects missing from the drag payload at the end so stale rail messages
   * cannot drop workspaces from localStorage.
   */
  const requestedIdSet = new Set(requestedIds);
  const orderedProjects = requestedIds
    .map((projectId) => projects.find((project) => project.projectId === projectId))
    .filter((project): project is NativeProject => Boolean(project));
  const remainingProjects = projects.filter((project) => !requestedIdSet.has(project.projectId));
  const nextProjects = orderNativeProjectsForSidebar([...orderedProjects, ...remainingProjects]);
  if (
    nextProjects.length === projects.length &&
    nextProjects.every((project, index) => project.projectId === projects[index]?.projectId)
  ) {
    return;
  }

  projects = nextProjects;
  writeStoredProjects("reorderProjects");
  publish();
}

function saveSidebarAgent(
  message: Extract<SidebarToExtensionMessage, { type: "saveSidebarAgent" }>,
): void {
  const name = message.name.trim();
  const command = message.command.trim();
  if (!name || !command) {
    return;
  }

  const currentAgentIds = agents.map((candidate) => candidate.agentId);
  const requestedAgentId = message.agentId?.trim();
  const selectedDefaultAgent = getDefaultSidebarAgentByIcon(message.icon);
  const shouldRestoreHiddenDefault =
    !requestedAgentId &&
    Boolean(
      selectedDefaultAgent && !isSidebarAgentVisible(storedAgents, selectedDefaultAgent.agentId),
    );
  const agentId =
    requestedAgentId ||
    (shouldRestoreHiddenDefault ? selectedDefaultAgent?.agentId : undefined) ||
    createCustomAgentId(name);
  const existingIndex = storedAgents.findIndex((agent) => agent.agentId === agentId);
  const previousAgent = existingIndex >= 0 ? storedAgents[existingIndex] : undefined;
  const defaultAgent = getDefaultSidebarAgentById(agentId);
  const nextAgent: StoredSidebarAgent = {
    agentId,
    command,
    hidden: false,
    icon: message.icon ?? previousAgent?.icon ?? defaultAgent?.icon,
    isDefault: isDefaultSidebarAgentId(agentId),
    name,
  };
  const nextAgents =
    existingIndex >= 0
      ? storedAgents.map((agent, index) => (index === existingIndex ? nextAgent : agent))
      : [...storedAgents, nextAgent];
  const nextOrder =
    existingIndex >= 0 || storedAgentOrder.includes(agentId) || isDefaultSidebarAgentId(agentId)
      ? storedAgentOrder
      : [...currentAgentIds, agentId];

  writeStoredAgents(nextAgents);
  if (!areStringArraysEqual(nextOrder, storedAgentOrder)) {
    writeStoredAgentOrder(nextOrder);
  }
  publish();
}

function deleteSidebarAgent(agentId: string): void {
  if (!isDefaultSidebarAgentId(agentId)) {
    writeStoredAgents(storedAgents.filter((agent) => agent.agentId !== agentId));
    writeStoredAgentOrder(
      storedAgentOrder.filter((candidateAgentId) => candidateAgentId !== agentId),
    );
    publish();
    return;
  }

  const defaultAgent = getDefaultSidebarAgentById(agentId);
  if (!defaultAgent) {
    return;
  }

  const existingIndex = storedAgents.findIndex((agent) => agent.agentId === agentId);
  const nextAgent: StoredSidebarAgent = {
    agentId: defaultAgent.agentId,
    command: storedAgents[existingIndex]?.command ?? defaultAgent.command,
    hidden: true,
    icon: storedAgents[existingIndex]?.icon ?? defaultAgent.icon,
    isDefault: true,
    name: storedAgents[existingIndex]?.name ?? defaultAgent.name,
  };
  const nextAgents =
    existingIndex >= 0
      ? storedAgents.map((agent, index) => (index === existingIndex ? nextAgent : agent))
      : [...storedAgents, nextAgent];

  writeStoredAgents(nextAgents);
  writeStoredAgentOrder(
    storedAgentOrder.filter((candidateAgentId) => candidateAgentId !== agentId),
  );
  publish();
}

function syncSidebarAgentOrder(requestId: string, agentIds: readonly string[]): void {
  const currentAgentIds = agents.map((agent) => agent.agentId);
  const normalizedAgentIds = normalizeStoredSidebarAgentOrder(agentIds).filter((agentId) =>
    currentAgentIds.includes(agentId),
  );
  const nextOrder = [
    ...normalizedAgentIds,
    ...currentAgentIds.filter((agentId) => !normalizedAgentIds.includes(agentId)),
  ];
  writeStoredAgentOrder(nextOrder);
  sidebarBus.post({
    itemIds: agents.map((agent) => agent.agentId),
    kind: "agent",
    requestId,
    status: "success",
    type: "sidebarOrderSyncResult",
  });
  publish();
}

function saveSidebarCommand(
  message: Extract<SidebarToExtensionMessage, { type: "saveSidebarCommand" }>,
): void {
  const name = message.name.trim();
  const command = message.command?.trim();
  const url = message.url?.trim();
  const iconColor = message.icon
    ? (normalizeSidebarCommandIconColor(message.iconColor) ?? DEFAULT_SIDEBAR_COMMAND_ICON_COLOR)
    : undefined;

  if (!name && !message.icon) {
    return;
  }
  if (message.actionType === "browser" && !url) {
    return;
  }
  if (message.actionType === "terminal" && !command) {
    return;
  }

  const currentCommandIds = commands.map((candidate) => candidate.commandId);
  const commandId = message.commandId?.trim() || createCustomCommandId();
  const nextCommand: StoredSidebarCommand = {
    actionType: message.actionType,
    closeTerminalOnExit: message.actionType === "terminal" ? message.closeTerminalOnExit : false,
    commandId,
    isDefault: isDefaultSidebarCommandId(commandId),
    ...(message.isGlobal === true ? { isGlobal: true } : {}),
    name,
    playCompletionSound: message.actionType === "terminal" ? message.playCompletionSound : false,
    ...(message.icon ? { icon: message.icon, iconColor } : {}),
    ...(message.actionType === "browser" ? { url } : { command }),
  };
  const existingIndex = storedCommands.findIndex((candidate) => candidate.commandId === commandId);
  const nextCommands =
    existingIndex >= 0
      ? storedCommands.map((candidate, index) =>
          index === existingIndex ? nextCommand : candidate,
        )
      : [...storedCommands, nextCommand];
  const nextOrder =
    existingIndex >= 0 ||
    storedCommandOrder.includes(commandId) ||
    isDefaultSidebarCommandId(commandId)
      ? storedCommandOrder
      : currentCommandIds.includes(commandId)
        ? currentCommandIds
        : [...currentCommandIds, commandId];

  writeStoredCommands(nextCommands);
  if (!areStringArraysEqual(nextOrder, storedCommandOrder)) {
    writeStoredCommandOrder(nextOrder);
  }
  if (isDefaultSidebarCommandId(commandId) && deletedDefaultCommandIds.includes(commandId)) {
    writeDeletedDefaultCommandIds(
      deletedDefaultCommandIds.filter((candidateCommandId) => candidateCommandId !== commandId),
    );
  }
  publish();
}

function deleteSidebarCommand(commandId: string): void {
  const existingSession = sidebarCommandSessionByCommandId.get(commandId);
  if (existingSession) {
    closeNativeSidebarCommandSession(existingSession.sessionId);
  }
  writeStoredCommands(storedCommands.filter((command) => command.commandId !== commandId));
  writeStoredCommandOrder(
    storedCommandOrder.filter((candidateCommandId) => candidateCommandId !== commandId),
  );
  if (isDefaultSidebarCommandId(commandId) && !deletedDefaultCommandIds.includes(commandId)) {
    writeDeletedDefaultCommandIds([...deletedDefaultCommandIds, commandId]);
  }
  publish();
}

function syncSidebarCommandOrder(requestId: string, commandIds: readonly string[]): void {
  const currentCommandIds = commands.map((command) => command.commandId);
  const normalizedCommandIds = normalizeStoredSidebarCommandOrder(commandIds).filter((commandId) =>
    currentCommandIds.includes(commandId),
  );
  const nextOrder = [
    ...normalizedCommandIds,
    ...currentCommandIds.filter((commandId) => !normalizedCommandIds.includes(commandId)),
  ];
  writeStoredCommandOrder(nextOrder);
  sidebarBus.post({
    itemIds: commands.map((command) => command.commandId),
    kind: "command",
    requestId,
    status: "success",
    type: "sidebarOrderSyncResult",
  });
  publish();
}

function isSidebarAgentVisible(agents: readonly StoredSidebarAgent[], agentId: string): boolean {
  return agents.find((agent) => agent.agentId === agentId)?.hidden !== true;
}

function createCustomAgentId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return `custom-${slug || "agent"}-${Date.now().toString(36)}`;
}

function createCustomCommandId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function handleSidebarMessage(message: SidebarToExtensionMessage): void {
  /**
   * CDXC:NativeSidebarCommands 2026-04-26-00:47
   * Keep the native sidebar contract exhaustive. User-facing actions such as
   * agents, command buttons, groups, previous sessions, and workspace controls
   * are handled here so the native app matches the old sidebar experience.
   */
  switch (message.type) {
    case "createSession":
      if (activeProject().isChat === true) {
        void createNativeChat();
      } else {
        createTerminal();
      }
      return;
    case "createChat":
      void createNativeChat(message.title);
      return;
    case "createSessionInGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      if (groupReference.isChatCollection) {
        void createNativeChat();
        return;
      }
      if (!groupReference.groupId) {
        if (activeProjectId !== groupReference.project.projectId) {
          focusProject(groupReference.project.projectId);
        }
        createTerminal();
        return;
      }
      createTerminal(DEFAULT_TERMINAL_SESSION_TITLE, "", message.groupId);
      return;
    }
    case "openBrowser":
      openNativeBrowserWindow(DEFAULT_BROWSER_LAUNCH_URL);
      return;
    case "openBrowserPane":
      /**
       * CDXC:ChromiumBrowserPanes 2026-05-04-17:00
       * The dedicated sidebar test button must create the Chromium pane
       * directly, not route through browserOpenMode where legacy Canary remains
       * a valid user setting for browser command actions.
       */
      createNativeBrowserSession(DEFAULT_BROWSER_LAUNCH_URL);
      return;
    case "openWorkspaceWelcome":
      openNativeExternalUrl("https://github.com/maddada/zmux");
      return;
    case "openSettings":
      publish();
      return;
    case "refreshDaemonSessions":
      refreshDaemonSessionsState();
      return;
    case "killTerminalDaemon":
      closeAllNativeSessions();
      refreshDaemonSessionsState();
      return;
    case "killT3RuntimeServer":
      /**
       * CDXC:T3Code 2026-04-30-09:23
       * The native Running modal must control the same embedded T3 resources
       * that T3 panes create. Killing the T3 server asks Swift to stop the
       * managed localhost runtime instead of only refreshing modal state.
       */
      postNative({ type: "stopT3CodeRuntime" });
      refreshDaemonSessionsState();
      return;
    case "killT3RuntimeSession":
      closeTerminal(message.sessionId);
      refreshDaemonSessionsState();
      return;
    case "killDaemonSession":
      closeTerminal(message.sessionId);
      refreshDaemonSessionsState();
      return;
    case "moveSidebarToOtherSide":
      moveSidebarToOtherSide();
      return;
    case "toggleShowLastInteractionTimeOnSessionCards":
      saveSettings({
        ...settings,
        showLastInteractionTimeOnSessionCards: !settings.showLastInteractionTimeOnSessionCards,
      });
      return;
    case "cycleSessionPersistenceProvider":
      saveSettings({
        ...settings,
        sessionPersistenceProvider: nextSessionPersistenceProvider(
          settings.sessionPersistenceProvider,
        ),
      });
      return;
    case "adjustTerminalFontSize":
      saveSettings({
        ...settings,
        terminalFontSize: settings.terminalFontSize + message.delta,
      });
      return;
    case "createGroup": {
      updateActiveProjectWorkspace((workspace) => createGroupInSimpleWorkspace(workspace).snapshot);
      publish();
      return;
    }
    case "createGroupFromSession": {
      updateActiveProjectWorkspace(
        (workspace) =>
          createGroupFromSessionInSimpleWorkspace(workspace, message.sessionId).snapshot,
      );
      publish();
      return;
    }
    case "focusGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      if (!groupReference.groupId) {
        focusProject(groupReference.project.projectId);
        return;
      }
      updateActiveProjectWorkspace(
        (workspace) => focusGroupInSimpleWorkspace(workspace, message.groupId).snapshot,
      );
      publish();
      return;
    }
    case "focusSession":
      focusSidebarSession(message.sessionId);
      return;
    case "promptRenameSession": {
      const session = findTerminalSession(message.sessionId);
      if (session) {
        openAppModal({
          initialTitle: session.title || DEFAULT_TERMINAL_SESSION_TITLE,
          modal: "renameSession",
          sessionId: message.sessionId,
          type: "open",
        });
      }
      return;
    }
    case "renameSession":
      void renameNativeSidebarTerminalSession(
        message.sessionId,
        message.title,
        "native-sidebar-rename-session",
      );
      return;
    case "renameGroup":
      updateActiveProjectWorkspace(
        (workspace) =>
          renameGroupInSimpleWorkspace(workspace, message.groupId, message.title).snapshot,
      );
      publish();
      return;
    case "copyWorkspaceProjectPathForGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      /*
       * CDXC:SidebarMode 2026-05-04-07:00
       * Combined-mode project groups need to copy the owning project's path
       * from the group context menu, so resolve the group id server-side
       * instead of trusting client-provided path text.
       */
      void navigator.clipboard?.writeText(groupReference.project.path).catch(() => undefined);
      return;
    }
    case "restoreRecentProject":
      restoreRecentProject(message.projectId);
      return;
    case "openWorkspaceProjectInFinderForGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      openNativeWorkspaceInFinder(groupReference.project.path);
      return;
    }
    case "openWorkspaceProjectInIdeForGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      openNativeWorkspaceInSelectedIde(groupReference.project.path);
      return;
    }
    case "openActiveWorkspaceProjectInFinder":
      openNativeWorkspaceInFinder(activeProject().path);
      return;
    case "openActiveWorkspaceProjectInIde":
      openNativeWorkspaceInSelectedIde(activeProject().path, message.targetApp);
      return;
    case "setWorkspaceProjectThemeForGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      const themeColor = normalizeWorkspaceThemeColor(message.themeColor);
      if (themeColor) {
        setProjectThemeColor(groupReference.project.projectId, themeColor);
        return;
      }
      if (message.theme) {
        setProjectTheme(groupReference.project.projectId, message.theme);
      }
      return;
    }
    case "closeWorkspaceProjectForGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      closeProjectToRecent(groupReference.project.projectId);
      return;
    }
    case "removeWorkspaceProjectForGroup": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      removeProject(groupReference.project.projectId);
      return;
    }
    case "closeSession":
      closeTerminal(message.sessionId);
      return;
    case "restartSession":
      restartNativeSession(message.sessionId);
      return;
    case "forkSession":
      forkNativeSession(message.sessionId);
      return;
    case "fullReloadSession":
      restartNativeSession(message.sessionId);
      return;
    case "attachToIde":
      saveSettings({
        ...settings,
        zedOverlayEnabled: true,
      });
      return;
    case "fullReloadGroup": {
      const group = activeProject().workspace.groups.find(
        (candidate) => candidate.groupId === message.groupId,
      );
      for (const session of group?.snapshot.sessions ?? []) {
        if (
          session.kind === "terminal" &&
          buildNativeRestoredTerminalInitialInput(session).trim()
        ) {
          restartNativeSession(session.sessionId);
        }
      }
      return;
    }
    case "copyResumeCommand":
      copyResumeCommand(message.sessionId);
      return;
    case "requestT3SessionBrowserAccess":
      void requestNativeT3SessionBrowserAccess(message.sessionId);
      return;
    case "closeGroup": {
      const project = activeProject();
      const group = project.workspace.groups.find(
        (candidate) => candidate.groupId === message.groupId,
      );
      for (const session of group?.snapshot.sessions ?? []) {
        terminalStateById.delete(session.sessionId);
        titleDerivedActivityBySessionId.delete(session.sessionId);
        nativeActivitySuppressedUntilBySessionId.delete(session.sessionId);
        nativeWorkingStartedAtBySessionId.delete(session.sessionId);
        const nativeSessionId = forgetNativeSessionMapping(session.sessionId);
        postNative({ sessionId: nativeSessionId, type: "closeTerminal" });
      }
      updateActiveProjectWorkspace(
        (workspace) => removeGroupInSimpleWorkspace(workspace, message.groupId).snapshot,
      );
      publish();
      return;
    }
    case "setSessionSleeping":
      setNativeSessionSleeping(message.sessionId, message.sleeping);
      return;
    case "setSessionFavorite":
      {
        const reference = resolveSidebarSessionReference(message.sessionId);
        updateProjectWorkspace(
          reference.project.projectId,
          (workspace) =>
            setSessionFavoriteInSimpleWorkspace(workspace, reference.sessionId, message.favorite)
              .snapshot,
        );
      }
      publish();
      return;
    case "setGroupSleeping": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      if (!groupReference.groupId) {
        return;
      }
      setNativeGroupSleeping(groupReference.groupId, message.sleeping);
      return;
    }
    case "moveSessionToGroup": {
      const sessionReference = resolveSidebarSessionReference(message.sessionId);
      const groupReference = resolveSidebarGroupReference(message.groupId);
      if (
        !groupReference.groupId ||
        groupReference.project.projectId !== sessionReference.project.projectId
      ) {
        return;
      }
      const targetGroupId = groupReference.groupId;
      updateProjectWorkspace(
        sessionReference.project.projectId,
        (workspace) =>
          moveSessionToGroupInSimpleWorkspace(
            workspace,
            sessionReference.sessionId,
            targetGroupId,
            message.targetIndex,
          ).snapshot,
      );
      publish();
      return;
    }
    case "toggleFullscreenSession":
      updateActiveProjectWorkspace((workspace) =>
        toggleFullscreenSessionInSimpleWorkspace(workspace),
      );
      publish();
      return;
    case "syncGroupOrder": {
      const combinedProjectIds = message.groupIds
        .filter((groupId) => groupId !== COMBINED_CHATS_GROUP_ID)
        .map((groupId) => parseCombinedProjectGroupId(groupId));
      if (
        combinedProjectIds.length > 0 &&
        combinedProjectIds.every((projectId): projectId is string => projectId !== undefined)
      ) {
        /**
         * CDXC:Chats 2026-05-04-09:41
         * The synthetic Chats group is pinned above projects and excluded from
         * drag persistence. Reorder only concrete project groups from Combined
         * mode so chats stay under one stable top header.
         *
         * CDXC:SidebarMode 2026-05-03-10:42
         * Combined-mode group dragging reorders projects, not the separated
         * groups inside one project. Session drag is disabled in the React
         * view, so this path cannot move sessions across projects.
         */
        reorderProjects(combinedProjectIds);
        return;
      }
      if (message.groupIds.includes(COMBINED_CHATS_GROUP_ID)) {
        return;
      }
      updateActiveProjectWorkspace(
        (workspace) => syncGroupOrderInSimpleWorkspace(workspace, message.groupIds).snapshot,
      );
      publish();
      return;
    }
    case "toggleActiveSessionsSortMode":
      toggleActiveSessionsSortMode();
      return;
    case "saveScratchPad":
      saveScratchPadContent(message.content);
      return;
    case "savePinnedPrompt":
      savePinnedPrompt(message);
      return;
    case "restorePreviousSession":
      restorePreviousSession(message.historyId);
      return;
    case "deletePreviousSession":
      deletePreviousSession(message.historyId);
      return;
    case "clearGeneratedPreviousSessions":
      clearGeneratedPreviousSessions();
      return;
    case "promptFindPreviousSession":
      if (message.query?.trim()) {
        promptFindPreviousSession(message.query);
      } else {
        openAppModal({ modal: "findPreviousSession", type: "open" });
      }
      return;
    case "setT3SessionThreadId":
      void relinkNativeT3SessionThread(message.sessionId, message.threadId);
      return;
    case "runSidebarGitAction":
      void runSidebarGitAction(message.action);
      return;
    case "setSidebarGitPrimaryAction":
      setGitPrimaryAction(message.action);
      return;
    case "refreshGitState":
      void refreshGitState();
      return;
    case "setSidebarGitCommitConfirmationEnabled":
      setGitCommitConfirmationEnabled(message.enabled);
      return;
    case "setSidebarGitGenerateCommitBodyEnabled":
      setGitGenerateCommitBodyEnabled(message.enabled);
      return;
    case "confirmSidebarGitCommit":
      void continueGitActionAfterCommitConfirmation(message.requestId, message.message);
      return;
    case "cancelSidebarGitCommit":
      pendingGitCommitRequests.delete(message.requestId);
      publish();
      return;
    case "setSidebarSectionCollapsed":
      setSidebarSectionCollapsed(message.section, message.collapsed);
      return;
    case "openT3SessionBrowserAccessLink":
      openNativeExternalUrl(message.url);
      return;
    case "runBrowserPaneAction": {
      const reference = resolveSidebarSessionReference(message.sessionId);
      const sessionRecord = findSessionRecordInProject(reference.project, reference.sessionId);
      if (sessionRecord?.kind !== "browser") {
        return;
      }
      const nativeSessionId = nativeSessionIdForProjectSidebarSession(
        reference.project.projectId,
        reference.sessionId,
      );
      switch (message.action) {
        case "devtools":
          postNative({ sessionId: nativeSessionId, type: "openBrowserDevTools" });
          return;
        case "react-grab":
          postNative({ sessionId: nativeSessionId, type: "injectBrowserReactGrab" });
          return;
        case "profile-picker":
          postNative({ sessionId: nativeSessionId, type: "showBrowserProfilePicker" });
          return;
        case "import-settings":
          postNative({ sessionId: nativeSessionId, type: "showBrowserImportSettings" });
          return;
      }
    }
    case "sidebarDebugLog":
      if (!isNativeSidebarDebugLoggingEnabled()) {
        return;
      }
      if (message.event.startsWith("sidebar.agentIcon.")) {
        appendAgentDetectionDebugLog(message.event, message.details);
      }
      if (message.event.startsWith("scratchPadFocus.")) {
        appendTerminalFocusDebugLog(message.event, message.details);
      }
      console.debug("[zmux-native-sidebar]", message.event, message.details);
      return;
    case "runSidebarAgent": {
      const agent = agents.find((candidate) => candidate.agentId === message.agentId);
      if (agent?.agentId === "t3") {
        createNativeT3Session();
      } else if (agent?.command) {
        createTerminal(
          createAgentSessionDefaultTitle(agent.name),
          `${agent.command}\r`,
          undefined,
          agent.agentId,
        );
      }
      return;
    }
    case "saveSidebarAgent":
      saveSidebarAgent(message);
      return;
    case "deleteSidebarAgent":
      deleteSidebarAgent(message.agentId);
      return;
    case "syncSidebarAgentOrder":
      syncSidebarAgentOrder(message.requestId, message.agentIds);
      return;
    case "runSidebarCommand": {
      const command = commands.find((candidate) => candidate.commandId === message.commandId);
      if (command) {
        runNativeSidebarCommand(command, message.runMode);
      }
      return;
    }
    case "endSidebarCommandRun":
      if (message.commandId) {
        const existingSession = sidebarCommandSessionByCommandId.get(message.commandId);
        if (existingSession) {
          closeNativeSidebarCommandSession(existingSession.sessionId);
        }
        clearNativeSidebarCommandRunState(message.commandId);
      }
      publish();
      return;
    case "saveSidebarCommand":
      saveSidebarCommand(message);
      return;
    case "deleteSidebarCommand":
      deleteSidebarCommand(message.commandId);
      return;
    case "syncSidebarCommandOrder":
      syncSidebarCommandOrder(message.requestId, message.commandIds);
      return;
    case "toggleCompletionBell":
      saveSettings({
        ...settings,
        completionBellEnabled: !settings.completionBellEnabled,
      });
      return;
    case "updateSettings":
      saveSettings(message.settings);
      return;
    case "applyRecommendedGhosttySettings":
      applyRecommendedGhosttySettings();
      return;
    case "resetGhosttySettingsToDefault":
      resetGhosttySettingsToDefault();
      return;
    case "openGhosttySettingsDocs":
      openNativeExternalUrl(GHOSTTY_SETTINGS_DOCS_URL);
      return;
    case "openGhosttyConfigFile":
      openGhosttyConfigFile();
      return;
    case "setVisibleCount":
      updateActiveProjectWorkspace((workspace) =>
        setVisibleCountInSimpleWorkspace(workspace, message.visibleCount),
      );
      publish();
      return;
    case "setViewMode":
      updateActiveProjectWorkspace((workspace) =>
        setViewModeInSimpleWorkspace(workspace, message.viewMode),
      );
      publish();
      return;
    case "syncSessionOrder": {
      const groupReference = resolveSidebarGroupReference(message.groupId);
      if (!groupReference.groupId) {
        return;
      }
      const groupId = groupReference.groupId;
      updateProjectWorkspace(
        groupReference.project.projectId,
        (workspace) =>
          syncSessionOrderInSimpleWorkspace(workspace, groupId, message.sessionIds).snapshot,
      );
      publish();
      return;
    }
    default:
      return;
  }
}

function syncNativeLayout(): void {
  const sidebarSessionsById = new Map(
    createProjectedSidebarSessionsForGroup(activeWorkspaceGroup()).map((session) => [
      session.sessionId,
      session,
    ]),
  );
  const snapshot = activeSnapshot();
  const visibleSessionRecordsById = new Map(
    snapshot.sessions.map((session) => [session.sessionId, session]),
  );
  /**
   * CDXC:BrowserPanes 2026-05-02-11:59
   * Browser-pane mode must feed browser sessions into the same native AppKit
   * layout tree as terminals and T3 panes. Creating the WKWebView is not
   * enough; omitting the browser id from setActiveTerminalSet makes Swift move
   * the loaded web pane offscreen during the next layout sync.
   *
   * CDXC:NativePaneReorder 2026-05-03-06:38
   * Native layout order must follow visibleSessionIds directly. Filtering the
   * full stored session list can resurrect hidden sessions when pane
   * drag-and-drop changes only the visible split placement.
   */
  const visibleSessions = snapshot.visibleSessionIds
    .map((sessionId) => visibleSessionRecordsById.get(sessionId))
    .filter((session): session is NonNullable<typeof session> => session !== undefined);
  const visibleSessionIds = visibleSessions
    .map((session) => nativeSessionIdForSidebarSession(session.sessionId));
  const attentionSessionIds = visibleSessions
    .filter((session) => {
      if (session.kind !== "terminal") {
        return false;
      }
      const terminalState = terminalStateById.get(session.sessionId);
      return terminalState?.activity === "attention";
    })
    .map((session) => nativeSessionIdForSidebarSession(session.sessionId));
  const sessionActivities: Record<string, "attention" | "working"> = {};
  const sessionAgentIconColors: Record<string, string> = {};
  const sessionAgentIconDataUrls: Record<string, string> = {};
  const sessionTitles: Record<string, string> = {};
  for (const session of visibleSessions) {
    const nativeSessionId = nativeSessionIdForSidebarSession(session.sessionId);
    sessionTitles[nativeSessionId] = session.title;
    /**
     * CDXC:NativePaneReorder 2026-05-03-03:57
     * Native pane reorder feedback must show the same identity cue as the
     * session card. Send the projected sidebar icon data URL and CSS mask
     * color through layout sync so Swift uses live agent detection and renders
     * the same tinted logo instead of re-implementing agent artwork.
     */
    const agentIcon = sidebarSessionsById.get(session.sessionId)?.agentIcon;
    if (agentIcon) {
      sessionAgentIconDataUrls[nativeSessionId] = AGENT_LOGOS[agentIcon];
      sessionAgentIconColors[nativeSessionId] = AGENT_LOGO_COLORS[agentIcon];
    }
    if (session.kind !== "terminal") {
      continue;
    }
    const activity = terminalStateById.get(session.sessionId)?.activity;
    if (activity === "attention" || activity === "working") {
      sessionActivities[nativeSessionId] = activity;
    }
  }
  const layout = buildLayout(
    visibleSessionIds,
    snapshot.visibleCount,
  );
  const focusedNativeSessionId = snapshot.focusedSessionId
    ? nativeSessionIdForSidebarSession(snapshot.focusedSessionId)
    : undefined;
  const shouldConsumeFocusRequest =
    pendingNativeLayoutFocusRequest !== undefined &&
    pendingNativeLayoutFocusRequest.sessionId === snapshot.focusedSessionId &&
    visibleSessions.some((session) => session.sessionId === pendingNativeLayoutFocusRequest?.sessionId);
  const focusRequestId = shouldConsumeFocusRequest
    ? pendingNativeLayoutFocusRequest?.requestId
    : undefined;
  /**
   * CDXC:NativeTerminals 2026-04-28-03:37
   * Native title bars must mirror the same per-session state used by sidebar
   * cards: green for done/attention and orange for working. Send the activity
   * projection with the layout command so AppKit renders the indicator from
   * the same source of truth as the React card indicator.
   *
   * CDXC:NativeTerminals 2026-04-30-03:41
   * Native pane title bars must render the full sidebar session title, not the
   * Ghostty window title. Agent terminal titles can already contain an
   * ellipsis, so the layout sync owns the display title used by AppKit chrome.
   *
   * CDXC:NativeTerminalFocus 2026-05-04-16:02
   * A visible side terminal becoming done/green must not move keyboard focus
   * away from the terminal the user is typing in. Treat focusedSessionId in
   * passive status/layout sync as selection display only; Swift receives
   * focusRequestId only for explicit user focus commands such as sidebar
   * session focus, hotkeys, or project switching.
   */
  postNative({
    activeSessionIds: visibleSessionIds,
    attentionSessionIds,
    backgroundColor: settings.workspaceBackgroundColor,
    ...(focusRequestId !== undefined ? { focusRequestId } : {}),
    focusedSessionId: focusedNativeSessionId,
    layout,
    /**
     * CDXC:WorkspaceLayout 2026-04-28-06:01
     * The Pane Gap settings control must affect native Ghostty pane layout,
     * not only the React workspace panel. Send the normalized persisted value
     * with every native layout sync so slider drags repaint AppKit spacing.
     */
    paneGap: settings.workspacePaneGap,
    sessionAgentIconDataUrls,
    sessionAgentIconColors,
    sessionActivities,
    sessionTitles,
    type: "setActiveTerminalSet",
  });
  if (shouldConsumeFocusRequest) {
    pendingNativeLayoutFocusRequest = undefined;
  }
}

function buildLayout(
  sessionIds: string[],
  visibleCount: VisibleSessionCount,
): NativeTerminalLayout | undefined {
  const visible = sessionIds.slice(0, visibleCount);
  if (visible.length === 0) {
    return undefined;
  }
  if (visible.length === 1) {
    return { kind: "leaf", sessionId: visible[0]! };
  }

  const columns = visible.length === 2 ? 2 : visible.length <= 4 ? 2 : 3;
  const rows: NativeTerminalLayout[] = [];
  for (let index = 0; index < visible.length; index += columns) {
    const row = visible.slice(index, index + columns).map<NativeTerminalLayout>((sessionId) => ({
      kind: "leaf",
      sessionId,
    }));
    rows.push(
      row.length === 1 ? row[0]! : { children: row, direction: "horizontal", kind: "split" },
    );
  }
  return rows.length === 1 ? rows[0] : { children: rows, direction: "vertical", kind: "split" };
}

window.addEventListener("zmux-native-host-event", (event) => {
  const hostEvent = (event as CustomEvent<NativeHostEvent>).detail;
  if (!hostEvent || hostEvent.type === "hostReady") {
    return;
  }
  if (hostEvent.type === "processResult") {
    const pending = pendingProcessResults.get(hostEvent.requestId);
    if (!pending) {
      return;
    }
    window.clearTimeout(pending.timeout);
    pendingProcessResults.delete(hostEvent.requestId);
    pending.resolve(hostEvent);
    return;
  }
  if (hostEvent.type === "nativeHotkey") {
    /**
     * CDXC:Hotkeys 2026-04-28-06:15
     * Native AppKit hotkeys now arrive as typed host events. Handle them
     * before terminal-session event normalization, because shortcut actions do
     * not carry a sessionId and should execute even while Ghostty owns focus.
     */
    logNativeHotkeyDebug("nativeHotkeys.hostEventReceived", {
      actionId: hostEvent.actionId,
    });
    runNativeHotkeyAction(hostEvent.actionId);
    return;
  }
  if (hostEvent.type === "paneReorderRequested") {
    handleNativePaneReorderRequested(
      sidebarSessionIdForNativeSession(hostEvent.sourceSessionId),
      sidebarSessionIdForNativeSession(hostEvent.targetSessionId),
    );
    return;
  }
  const sidebarSessionId = sidebarSessionIdForNativeSession(hostEvent.sessionId);
  if (hostEvent.type === "t3ThreadReady") {
    /**
     * CDXC:T3Code 2026-05-01-13:31
     * Native T3 panes must persist the resolved project/thread metadata that
     * Swift ensured from the T3 orchestration API. This mirrors the reference
     * controller's `ensureThreadSession` path so restoring a T3 card reopens
     * its bound thread and only creates a replacement thread when that bound
     * thread no longer exists.
     */
    handleNativeT3ThreadReady(sidebarSessionId, hostEvent);
    return;
  }
  if (hostEvent.type === "t3ThreadChanged") {
    void handleNativeT3ThreadChanged(sidebarSessionId, hostEvent.threadId, hostEvent.title);
    return;
  }
  if (hostEvent.type === "terminalTitleChanged") {
    const session = findSessionRecord(sidebarSessionId);
    if (session?.kind === "browser") {
      /**
       * CDXC:BrowserPanes 2026-05-03-01:58
       * WKWebView reports page titles over the existing native title event.
       * Browser sessions do not have terminal activity state, so accept these
       * updates before terminal-specific title detection and persist them for
       * the next native layout sync.
       */
      updateActiveProjectWorkspace(
        (workspace) =>
          setSessionTitleInSimpleWorkspace(workspace, sidebarSessionId, hostEvent.title, {
            titleSource: "browser-auto",
          }).snapshot,
      );
      publish();
      return;
    }
  }
  if (hostEvent.type === "browserUrlChanged") {
    const session = findSessionRecord(sidebarSessionId);
    if (session?.kind === "browser") {
      /**
       * CDXC:BrowserPanes 2026-05-03-03:41
       * Native browser panes own navigation, so the sidebar must accept the
       * committed WKWebView URL over the host event bus and persist it on the
       * browser card before app restart.
       */
      updateActiveProjectWorkspace(
        (workspace) =>
          setBrowserSessionUrlInSimpleWorkspace(workspace, sidebarSessionId, hostEvent.url)
            .snapshot,
      );
      publish();
      return;
    }
  }
  if (hostEvent.type === "browserFaviconChanged") {
    const session = findSessionRecord(sidebarSessionId);
    if (session?.kind === "browser") {
      /**
       * CDXC:BrowserPanes 2026-05-03-11:28
       * Browser pane cards should show the page favicon when WebKit has one,
       * falling back to the default browser glyph otherwise. Native WebKit
       * already resolves the page favicon for the pane title bar, so persist
       * that same data URL here instead of duplicating browser fetch logic in
       * the sidebar.
       */
      updateActiveProjectWorkspace(
        (workspace) =>
          setBrowserSessionFaviconDataUrlInSimpleWorkspace(
            workspace,
            sidebarSessionId,
            hostEvent.faviconDataUrl,
          ).snapshot,
      );
      publish();
      return;
    }
  }
  if (hostEvent.type === "terminalTitleBarAction") {
    /**
     * CDXC:BrowserPanes 2026-05-03-11:15
     * Browser panes use the shared native title-bar action event, but they do
     * not have terminal runtime state. Handle title-bar actions before the
     * terminal-only state guard so the browser close button removes the pane
     * through the same workspace/session path as T3 Code and terminals.
     */
    handleNativeTerminalTitleBarAction(sidebarSessionId, hostEvent.action);
    return;
  }
  if (hostEvent.type === "terminalFocused") {
    /**
     * CDXC:NativeTerminalFocus 2026-04-26-21:32
     * Clicking or typing in a split Ghostty surface changes AppKit focus before
     * sidebar state knows about it. Treat native terminalFocused as the
     * authoritative user-focus signal so later layout sync sends the focused
     * session the user is actually typing in instead of stale sidebar focus.
     *
     * CDXC:NativeWebPaneFocus 2026-05-03-06:59
     * T3 Code and browser panes use the same native focus event even though
     * they do not have terminal runtime state. Handle focus before the
     * terminal-only state guard so clicking a WKWebView updates the active
     * sidebar card instead of only drawing the AppKit border.
     */
    const previousFocusedSessionId = activeSnapshot().focusedSessionId;
    if (previousFocusedSessionId === sidebarSessionId) {
      const acknowledgedAttention = acknowledgeNativeTerminalAttention(
        sidebarSessionId,
        "native-focus",
      );
      appendTerminalFocusDebugLog("nativeSidebar.terminalFocused.duplicateSkipped", {
        acknowledgedAttention,
        nativeSessionId: hostEvent.sessionId,
        sessionId: sidebarSessionId,
      });
      if (acknowledgedAttention) {
        publish();
      }
      return;
    }
    let focusChanged = false;
    updateActiveProjectWorkspace((workspace) => {
      const result = focusSessionInSimpleWorkspace(workspace, sidebarSessionId);
      focusChanged = result.changed;
      return result.snapshot;
    });
    appendTerminalFocusDebugLog("nativeSidebar.terminalFocused.applied", {
      focusChanged,
      nativeSessionId: hostEvent.sessionId,
      previousFocusedSessionId,
      sessionId: sidebarSessionId,
    });
    acknowledgeNativeTerminalAttention(sidebarSessionId, "native-focus");
    if (!focusChanged) {
      return;
    }
  } else {
    const terminalState = terminalStateById.get(sidebarSessionId);
    if (!terminalState) {
      appendSessionTitleDebugLog("nativeSidebar.nativeEventIgnored", {
        nativeSessionId: hostEvent.sessionId,
        reason: "terminal-state-missing",
        sidebarSessionId,
        type: hostEvent.type,
      });
      return;
    }
    if (hostEvent.type === "terminalTitleChanged") {
      const previousActivity = terminalState.activity;
      const previousTerminalTitle = terminalState.terminalTitle;
      const knownAgentNameBeforeDetection = terminalState.agentName;
      const previousVisibleTerminalTitle = getVisibleTerminalTitle(previousTerminalTitle);
      const previousDerivedActivity = titleDerivedActivityBySessionId.get(sidebarSessionId);
      const nextDerivedActivity = getTitleDerivedSessionActivityFromTransition(
        previousTerminalTitle,
        hostEvent.title,
        previousDerivedActivity,
        knownAgentNameBeforeDetection,
      );
      const effectiveDerivedActivity = nextDerivedActivity
        ? getNativeEffectiveTitleActivity(sidebarSessionId, nextDerivedActivity)
        : undefined;
      const didUpdateSessionPersistenceName =
        hostEvent.sessionPersistenceName !== undefined &&
        terminalState.sessionPersistenceName !== hostEvent.sessionPersistenceName;
      terminalState.terminalTitle = hostEvent.title;
      if (hostEvent.sessionPersistenceName !== undefined) {
        /**
         * CDXC:SessionPersistence 2026-05-05-07:28
         * Native persistence names are the durable reconnect identity. Persist
         * them separately from the visible card title so app restart can attach
         * to a live tmux/zmx session before recreating and resuming the agent.
         */
        terminalState.sessionPersistenceName = hostEvent.sessionPersistenceName;
        setTerminalSessionPersistenceName(sidebarSessionId, hostEvent.sessionPersistenceName);
      }
      /**
       * CDXC:AgentDetection 2026-04-26-10:50
       * Native Ghostty sessions may start as plain shells and only later reveal
       * the active agent through terminal titles. Mirror demo-project's title
       * detector so Codex, Claude, Gemini, and Copilot titles update the sidebar
       * icon/status without requiring launch through an agent button.
       */
      if (effectiveDerivedActivity) {
        titleDerivedActivityBySessionId.set(sidebarSessionId, effectiveDerivedActivity);
        terminalState.agentName = effectiveDerivedActivity.agentName;
        terminalState.activity = effectiveDerivedActivity.activity;
        setTerminalSessionAgentName(sidebarSessionId, effectiveDerivedActivity.agentName);
        if (previousActivity !== "attention" && terminalState.activity === "attention") {
          playNativeSessionCompletionSound(sidebarSessionId, "terminal-title");
        }
      } else {
        titleDerivedActivityBySessionId.delete(sidebarSessionId);
      }
      syncSessionTitleFromNativeTerminalTitle(
        sidebarSessionId,
        hostEvent.title,
        previousTerminalTitle,
      );
      /**
       * CDXC:AgentDetection 2026-04-29-09:16
       * Codex/Claude spinner glyphs can change terminal titles many times per
       * second. Preserve the title-derived activity state above, but skip sidebar
       * publishes when only the spinner glyph changed and the visible title/status
       * stayed equivalent.
       */
      if (
        previousVisibleTerminalTitle === getVisibleTerminalTitle(hostEvent.title) &&
        previousActivity === terminalState.activity &&
        knownAgentNameBeforeDetection === terminalState.agentName &&
        haveSameTitleDerivedSessionActivity(previousDerivedActivity, effectiveDerivedActivity) &&
        !didUpdateSessionPersistenceName
      ) {
        return;
      }
    } else if (hostEvent.type === "terminalExited") {
      terminalState.lifecycleState = "done";
      terminalState.activity = "idle";
      nativeWorkingStartedAtBySessionId.delete(sidebarSessionId);
      handleNativeSidebarCommandSessionExit(sidebarSessionId, hostEvent.exitCode);
    } else if (hostEvent.type === "terminalError") {
      terminalState.lifecycleState = "error";
      terminalState.activity = "attention";
      terminalState.terminalTitle = hostEvent.message;
      nativeWorkingStartedAtBySessionId.delete(sidebarSessionId);
    } else if (hostEvent.type === "terminalBell") {
      const suppressedUntil = getNativeActivitySuppressedUntil(sidebarSessionId);
      if (
        suppressedUntil !== undefined &&
        Number.isFinite(suppressedUntil) &&
        Date.now() < suppressedUntil
      ) {
        appendAgentDetectionDebugLog("nativeSidebar.activitySuppression.bellSuppressed", {
          sessionId: sidebarSessionId,
          suppressedUntil: new Date(suppressedUntil).toISOString(),
        });
        return;
      }
      const previousActivity = terminalState.activity;
      terminalState.activity = "attention";
      if (previousActivity !== "attention") {
        playNativeSessionCompletionSound(sidebarSessionId, "terminal-bell");
      }
    } else if (hostEvent.type === "terminalReady") {
      terminalState.lifecycleState = "running";
      if (hostEvent.sessionPersistenceName !== undefined) {
        terminalState.sessionPersistenceName = hostEvent.sessionPersistenceName;
        setTerminalSessionPersistenceName(sidebarSessionId, hostEvent.sessionPersistenceName);
      }
    }
  }
  publish();
});

function handleNativePaneReorderRequested(
  sourceSessionId: string,
  targetSessionId: string,
): void {
  if (sourceSessionId === targetSessionId) {
    return;
  }
  const group = activeWorkspaceGroup();
  const currentVisibleSessionIds = group.snapshot.visibleSessionIds;
  const sourceIndex = currentVisibleSessionIds.indexOf(sourceSessionId);
  const targetIndex = currentVisibleSessionIds.indexOf(targetSessionId);
  if (sourceIndex < 0 || targetIndex < 0) {
    appendTerminalFocusDebugLog("nativePaneReorder.ignored", {
      groupId: group.groupId,
      reason: "session-not-visible",
      sourceSessionId,
      targetSessionId,
    });
    return;
  }

  const nextVisibleSessionIds = currentVisibleSessionIds.map((sessionId) => {
    if (sessionId === sourceSessionId) {
      return targetSessionId;
    }
    if (sessionId === targetSessionId) {
      return sourceSessionId;
    }
    return sessionId;
  });
  /**
   * CDXC:NativePaneReorder 2026-05-02-17:33
   * AppKit title bars own pointer events for native Ghostty, T3, and browser
   * panes. When Swift reports a header drop, mutate the active sidebar
   * workspace order so the next native layout sync moves the panes and
   * persists the same order used by sidebar/session state.
   *
   * CDXC:NativePaneReorder 2026-05-03-06:38
   * A pane drop swaps only the two currently surfaced panes. Hidden sessions
   * must stay hidden; using the full session list here can make a background
   * T3/browser/terminal pane appear when the visible split is reordered.
   */
  updateActiveProjectWorkspace(
    (workspace) =>
      swapVisibleSessionsInSimpleWorkspace(
        workspace,
        group.groupId,
        sourceSessionId,
        targetSessionId,
      ).snapshot,
  );
  appendTerminalFocusDebugLog("nativePaneReorder.applied", {
    groupId: group.groupId,
    nextVisibleSessionIds,
    sourceSessionId,
    targetSessionId,
  });
  publish();
}

function handleNativeTerminalTitleBarAction(
  sessionId: string,
  action: Extract<NativeHostEvent, { type: "terminalTitleBarAction" }>["action"],
): void {
  const session = findSessionRecord(sessionId);
  if (!session) {
    return;
  }
  /**
   * CDXC:NativeTerminals 2026-04-28-13:20
   * Native per-session title bars must expose the same right-side actions as
   * the reference workspace pane header. Route AppKit button clicks back into
   * the sidebar's existing session handlers so title-bar controls and sidebar
   * card controls mutate one source of workspace truth.
   */
  switch (action) {
    case "rename":
      openAppModal({
        initialTitle: session.title || DEFAULT_TERMINAL_SESSION_TITLE,
        modal: "renameSession",
        sessionId,
        type: "open",
      });
      return;
    case "fork":
      if (session.kind === "terminal") {
        forkNativeSession(sessionId);
      } else if (session.kind === "browser") {
        const nextSession = createNativeBrowserSession(session.browser.url, findSessionGroupId(sessionId));
        if (nextSession) {
          revealSessionAsAdditionalNativePane(nextSession.sessionId);
        }
      } else if (session.kind === "t3") {
        const nextSession = createNativeT3Session(findSessionGroupId(sessionId));
        if (nextSession) {
          revealSessionAsAdditionalNativePane(nextSession.sessionId);
        }
      }
      return;
    case "reload":
      if (session.kind === "terminal") {
        restartNativeSession(sessionId);
      } else {
        postNative({
          sessionId: nativeSessionIdForSidebarSession(sessionId),
          type: "reloadWebPane",
        });
      }
      return;
    case "sleep":
      if (session.kind === "terminal") {
        setNativeSessionSleeping(sessionId, true);
      }
      return;
    case "close":
      closeTerminal(sessionId);
      return;
  }
}

window.__zmux_NATIVE_WORKSPACE_BAR__ = {
  addProject,
  focusProject,
  getState: createWorkspaceBarState,
  removeProject,
  reorderProjects,
  setProjectIcon,
  setProjectTheme,
  setProjectThemeColor,
};

window.__zmux_NATIVE_SETTINGS__ = {
  attachZedOverlay(targetApp) {
    saveSettingsFromNative({
      ...settings,
      zedOverlayEnabled: true,
      zedOverlayTargetApp: targetApp,
    });
  },
  detachZedOverlay(targetApp) {
    saveSettingsFromNative({
      ...settings,
      zedOverlayEnabled: false,
      zedOverlayTargetApp: targetApp,
    });
  },
};

window.__zmux_NATIVE_CLI__ = {
  handleCommand(action, payload) {
    return handleNativeCliCommand(action, payload);
  },
};

type WorkspaceDockMenuState = {
  left: number;
  projectId: string;
  view: "customTheme" | "root" | "themes";
  top: number;
};

type WorkspaceDockDragState = {
  didDrag: boolean;
  ghostText: string;
  pointerId: number;
  projectId: string;
  startX: number;
  startY: number;
  targetProjectId?: string;
  placeAfterTarget: boolean;
};

function NativeSidebarRoot() {
  const [workspaceDockState, setWorkspaceDockState] = useState(createWorkspaceBarState);

  useEffect(() => {
    document.body.classList.add("native-sidebar-body");
    const handleState = (event: Event) => {
      setWorkspaceDockState((event as CustomEvent<WorkspaceBarStateMessage>).detail);
    };
    window.addEventListener(WORKSPACE_DOCK_STATE_EVENT, handleState);
    return () => {
      document.body.classList.remove("native-sidebar-body");
      window.removeEventListener(WORKSPACE_DOCK_STATE_EVENT, handleState);
    };
  }, []);

  return (
    <div className="native-sidebar-shell" data-sidebar-mode={workspaceDockState.sidebarMode}>
      {/*
       * CDXC:SidebarMode 2026-05-03-19:19
       * Combined mode already shows every project as a draggable sidebar
       * group, so the separate workspace rail is redundant and should be
       * hidden until the user returns to Separated mode.
       */}
      {workspaceDockState.sidebarMode === "combined" ? null : (
        <WorkspaceDock state={workspaceDockState} />
      )}
      <main className="native-sidebar-main">
        <SidebarApp messageSource={sidebarBus} vscode={vscode} />
      </main>
    </div>
  );
}

type WorkspaceDockActions = {
  focusProject: (projectId: string) => void;
  openProjectInFinder: (projectId: string) => void;
  openProjectInIde: (projectId: string) => void;
  pickWorkspaceFolder: () => void;
  pickWorkspaceIcon: (projectId: string) => void;
  removeProject: (projectId: string) => void;
  reorderProjects: (projectIds: string[]) => void;
  setProjectTheme: (projectId: string, theme: SidebarTheme) => void;
  setProjectThemeColor: (projectId: string, themeColor: string) => void;
};

/**
 * CDXC:WorkspaceDock 2026-04-27-09:23
 * Keep the React workspace dock action-driven so Storybook can exercise icon,
 * remove, and theme menu UX without entering native publish/modal code paths.
 */
export function WorkspaceDock({
  actions,
  state,
}: {
  actions?: Partial<WorkspaceDockActions>;
  state: WorkspaceBarStateMessage;
}) {
  const [dragVisual, setDragVisual] = useState<{
    ghostText: string;
    isDragging: boolean;
    line?: { top: number; left: number; width: number };
    pointerX: number;
    pointerY: number;
    sourceProjectId?: string;
  }>({ ghostText: "", isDragging: false, pointerX: 0, pointerY: 0 });
  const [menu, setMenu] = useState<WorkspaceDockMenuState>();
  const [customThemeColor, setCustomThemeColor] = useState(DEFAULT_WORKSPACE_THEME_COLOR);
  const [recentThemeColors, setRecentThemeColors] = useState(readWorkspaceThemeColorHistory);
  const dockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<WorkspaceDockDragState | undefined>(undefined);
  const selectedIdeLabel = getZedOverlayTargetAppLabel(settings.zedOverlayTargetApp);
  const workspaceActions: WorkspaceDockActions = {
    focusProject,
    openProjectInFinder: (projectId) => {
      const project = state.projects.find((candidate) => candidate.projectId === projectId);
      if (project) {
        openNativeWorkspaceInFinder(project.path);
      }
    },
    openProjectInIde: (projectId) => {
      const project = state.projects.find((candidate) => candidate.projectId === projectId);
      if (project) {
        openNativeWorkspaceInSelectedIde(project.path);
      }
    },
    pickWorkspaceFolder: () => postNative({ type: "pickWorkspaceFolder" }),
    pickWorkspaceIcon: (projectId) => postNative({ projectId, type: "pickWorkspaceIcon" }),
    removeProject,
    reorderProjects,
    setProjectTheme,
    setProjectThemeColor,
    ...actions,
  };

  const activeProjectIds = useMemo(
    () => new Set(state.projects.map((project) => project.projectId)),
    [state.projects],
  );

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        setMenu(undefined);
        return;
      }
      if (!dockRef.current?.contains(event.target)) {
        setMenu(undefined);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(undefined);
      }
    };
    document.addEventListener("click", closeMenu);
    document.addEventListener("contextmenu", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("contextmenu", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (menu && !activeProjectIds.has(menu.projectId)) {
      setMenu(undefined);
    }
  }, [activeProjectIds, menu]);

  const dragProjectIds = state.projects.map((project) => project.projectId);

  const getDropTarget = (clientY: number, sourceProjectId: string) => {
    const buttons = Array.from(
      dockRef.current?.querySelectorAll<HTMLButtonElement>(".workspace-dock-button") ?? [],
    ).filter((button) => button.dataset.projectId !== sourceProjectId);
    for (const button of buttons) {
      const bounds = button.getBoundingClientRect();
      if (clientY < bounds.top + bounds.height / 2) {
        return { bounds, placeAfterTarget: false, projectId: button.dataset.projectId };
      }
    }
    const lastButton = buttons.at(-1);
    if (!lastButton) {
      return undefined;
    }
    const bounds = lastButton.getBoundingClientRect();
    return { bounds, placeAfterTarget: true, projectId: lastButton.dataset.projectId };
  };

  const nextProjectOrder = (
    sourceProjectId: string,
    targetProjectId: string | undefined,
    placeAfterTarget: boolean,
  ) => {
    if (!targetProjectId || sourceProjectId === targetProjectId) {
      return undefined;
    }
    const ids = [...dragProjectIds];
    const fromIndex = ids.indexOf(sourceProjectId);
    if (fromIndex < 0 || !ids.includes(targetProjectId)) {
      return undefined;
    }
    const [movedProjectId] = ids.splice(fromIndex, 1);
    const targetIndex = ids.indexOf(targetProjectId);
    ids.splice(targetIndex + (placeAfterTarget ? 1 : 0), 0, movedProjectId);
    return ids;
  };

  const wouldReorder = (
    sourceProjectId: string,
    targetProjectId: string | undefined,
    placeAfterTarget: boolean,
  ) => {
    const nextIds = nextProjectOrder(sourceProjectId, targetProjectId, placeAfterTarget);
    return Boolean(
      nextIds?.some((projectId, index) => projectId !== state.projects[index]?.projectId),
    );
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    project: WorkspaceBarProject,
  ) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragRef.current = {
      didDrag: false,
      ghostText: workspaceDockInitials(project.title, state.projects.indexOf(project)),
      pointerId: event.pointerId,
      projectId: project.projectId,
      startX: event.clientX,
      startY: event.clientY,
      placeAfterTarget: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.didDrag && Math.hypot(deltaX, deltaY) < 5) {
      return;
    }
    drag.didDrag = true;
    const target = getDropTarget(event.clientY, drag.projectId);
    const canDrop = wouldReorder(
      drag.projectId,
      target?.projectId,
      target?.placeAfterTarget ?? false,
    );
    drag.targetProjectId = canDrop ? target?.projectId : undefined;
    drag.placeAfterTarget = canDrop ? (target?.placeAfterTarget ?? false) : false;
    setDragVisual({
      ghostText: drag.ghostText,
      isDragging: true,
      line:
        canDrop && target
          ? {
              left: target.bounds.left + 1,
              top: target.placeAfterTarget ? target.bounds.bottom + 4 : target.bounds.top - 4,
              width: Math.max(34, target.bounds.width - 2),
            }
          : undefined,
      pointerX: event.clientX,
      pointerY: event.clientY,
      sourceProjectId: drag.projectId,
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>, projectId: string) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = undefined;
    setDragVisual({ ghostText: "", isDragging: false, pointerX: 0, pointerY: 0 });
    if (!drag.didDrag) {
      workspaceActions.focusProject(projectId);
      return;
    }
    const nextIds = nextProjectOrder(drag.projectId, drag.targetProjectId, drag.placeAfterTarget);
    if (nextIds) {
      workspaceActions.reorderProjects(nextIds);
    }
  };

  const openMenu = (event: ReactMouseEvent<HTMLButtonElement>, projectId: string) => {
    event.preventDefault();
    const offset = 8;
    const menuWidth = 196;
    const rootMenuHeight = 196;
    /**
     * CDXC:WorkspaceDock 2026-04-27-09:40
     * Opening the workspace context menu directly under the right-click point
     * lets the release/click that opened the menu accidentally activate the
     * first item. Offset the menu from the pointer and require explicit clicks
     * for destructive/native actions such as picking an icon.
     */
    setMenu({
      left: Math.min(event.clientX + offset, window.innerWidth - menuWidth),
      projectId,
      top: Math.min(event.clientY + offset, window.innerHeight - rootMenuHeight),
      view: "root",
    });
  };

  /**
   * CDXC:WorkspaceDock 2026-04-27-09:17
   * Workspace theme selection is a submenu, matching the worktree action menu
   * UX. Open it only from an explicit click so hovering Theme previews nothing
   * and cannot make the menu feel like it is navigating by itself.
   */
  const openThemeMenu = () => {
    setMenu((currentMenu) => (currentMenu ? { ...currentMenu, view: "themes" } : currentMenu));
  };

  const openRootMenu = () => {
    setMenu((currentMenu) => (currentMenu ? { ...currentMenu, view: "root" } : currentMenu));
  };

  const openCustomThemeMenu = () => {
    if (!menu) {
      return;
    }
    const project = state.projects.find((candidate) => candidate.projectId === menu.projectId);
    setCustomThemeColor(
      project?.themeColor ?? recentThemeColors[0] ?? DEFAULT_WORKSPACE_THEME_COLOR,
    );
    setMenu({ ...menu, view: "customTheme" });
  };

  const chooseTheme = (projectId: string, theme: SidebarTheme) => {
    workspaceActions.setProjectTheme(projectId, theme);
    setMenu(undefined);
  };

  const chooseCustomThemeColor = (projectId: string, themeColor: string) => {
    const normalizedColor = normalizeWorkspaceThemeColor(themeColor);
    if (!normalizedColor) {
      return;
    }

    workspaceActions.setProjectThemeColor(projectId, normalizedColor);
    const nextRecentThemeColors = updateWorkspaceThemeColorHistory(
      recentThemeColors,
      normalizedColor,
    );
    setRecentThemeColors(nextRecentThemeColors);
    writeWorkspaceThemeColorHistory(nextRecentThemeColors);
    setMenu(undefined);
  };

  const menuProject = menu
    ? state.projects.find((project) => project.projectId === menu.projectId)
    : undefined;

  return (
    <aside className="workspace-dock" ref={dockRef}>
      <div className="workspace-dock-scroll">
        {state.projects.map((project, index) => (
          <button
            aria-label={`Open ${project.title}`}
            className="workspace-dock-button"
            data-active={String(project.isActive)}
            data-dragging={String(dragVisual.sourceProjectId === project.projectId)}
            data-project-id={project.projectId}
            data-workspace-theme={project.theme ?? "dark-blue"}
            key={project.projectId}
            onContextMenu={(event) => openMenu(event, project.projectId)}
            onPointerCancel={() => {
              dragRef.current = undefined;
              setDragVisual({ ghostText: "", isDragging: false, pointerX: 0, pointerY: 0 });
            }}
            onPointerDown={(event) => handlePointerDown(event, project)}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => handlePointerUp(event, project.projectId)}
            style={getWorkspaceDockThemeStyle(project.themeColor)}
            title={workspaceDockTitle(project)}
            type="button"
          >
            <WorkspaceDockProjectIcon project={project} projectIndex={index} />
            <WorkspaceDockIndicators project={project} />
          </button>
        ))}
      </div>
      <button
        aria-label="Add workspace"
        className="workspace-dock-add-button"
        onClick={workspaceActions.pickWorkspaceFolder}
        title="Add workspace"
        type="button"
      >
        <IconPlus aria-hidden="true" size={18} stroke={2.4} />
      </button>
      {dragVisual.isDragging ? (
        <div
          aria-hidden="true"
          className="workspace-dock-drag-ghost"
          style={{ left: dragVisual.pointerX, top: dragVisual.pointerY }}
        >
          {dragVisual.ghostText}
        </div>
      ) : null}
      {dragVisual.line ? (
        <div
          aria-hidden="true"
          className="workspace-dock-drop-line"
          style={{
            left: dragVisual.line.left,
            top: dragVisual.line.top,
            width: dragVisual.line.width,
          }}
        />
      ) : null}
      {menu && menuProject ? (
        <div
          className="session-context-menu workspace-dock-context-menu"
          role="menu"
          style={{ left: menu.left, top: menu.top }}
          /**
           * CDXC:WorkspaceDock 2026-04-27-09:46
           * Workspace context-menu clicks are internal navigation/actions. Stop
           * them at the menu boundary so the document outside-click listener
           * does not close the menu before the Theme submenu can replace it.
           */
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {menu.view === "root" ? (
            <>
              <button
                className="session-context-menu-item"
                onClick={openThemeMenu}
                role="menuitem"
                type="button"
              >
                <IconPalette aria-hidden="true" className="session-context-menu-icon" size={14} />
                Theme
                <IconChevronRight
                  aria-hidden="true"
                  className="session-context-menu-trailing-icon"
                  size={14}
                />
              </button>
              <button
                className="session-context-menu-item"
                onClick={() => {
                  workspaceActions.openProjectInFinder(menu.projectId);
                  setMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconFolderOpen
                  aria-hidden="true"
                  className="session-context-menu-icon"
                  size={14}
                />
                Open in Finder
              </button>
              {/*
               * CDXC:WorkspaceActions 2026-05-04-08:22
               * Right-clicking a project in the workspace dock must expose the
               * same direct open actions as combined project cards. The IDE
               * action names and targets the Settings-selected IDE.
               */}
              <button
                className="session-context-menu-item"
                onClick={() => {
                  workspaceActions.openProjectInIde(menu.projectId);
                  setMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconCode aria-hidden="true" className="session-context-menu-icon" size={14} />
                Open in {selectedIdeLabel}
              </button>
              <div className="session-context-menu-divider" role="separator" />
              <button
                className="session-context-menu-item session-context-menu-item-danger"
                disabled={state.projects.length <= 1}
                onClick={() => {
                  workspaceActions.removeProject(menu.projectId);
                  setMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconTrash aria-hidden="true" className="session-context-menu-icon" size={14} />
                Remove
              </button>
            </>
          ) : menu.view === "themes" ? (
            <>
              <button
                className="session-context-menu-item"
                onClick={openRootMenu}
                role="menuitem"
                type="button"
              >
                <IconChevronLeft
                  aria-hidden="true"
                  className="session-context-menu-icon"
                  size={14}
                />
                Back
              </button>
              <div className="session-context-menu-divider" role="separator" />
              <button
                className="session-context-menu-item workspace-dock-theme-menu-item"
                data-selected={String(Boolean(menuProject.themeColor))}
                onClick={openCustomThemeMenu}
                role="menuitemradio"
                type="button"
              >
                <span
                  className="workspace-dock-theme-swatch"
                  style={getWorkspaceDockThemeSwatchStyle(
                    menuProject.themeColor ?? recentThemeColors[0] ?? DEFAULT_WORKSPACE_THEME_COLOR,
                  )}
                />
                Custom
                <IconChevronRight
                  aria-hidden="true"
                  className="session-context-menu-trailing-icon"
                  size={14}
                />
              </button>
              {WORKSPACE_DOCK_THEME_OPTIONS.map((theme) => (
                <button
                  className="session-context-menu-item workspace-dock-theme-menu-item"
                  data-selected={String(
                    !menuProject.themeColor && (menuProject.theme ?? "dark-blue") === theme.value,
                  )}
                  key={theme.value}
                  onClick={() => chooseTheme(menu.projectId, theme.value)}
                  role="menuitemradio"
                  type="button"
                >
                  <span
                    className="workspace-dock-theme-swatch"
                    data-workspace-theme={theme.value}
                  />
                  {theme.label}
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                className="session-context-menu-item"
                onClick={openThemeMenu}
                role="menuitem"
                type="button"
              >
                <IconChevronLeft
                  aria-hidden="true"
                  className="session-context-menu-icon"
                  size={14}
                />
                Back
              </button>
              <div className="session-context-menu-divider" role="separator" />
              <div className="workspace-theme-custom-picker">
                {/*
                 * CDXC:WorkspaceTheme 2026-05-05-02:58
                 * Custom color selection belongs in the Theme context menu.
                 * The picker writes a project theme color immediately and also
                 * records recent validated colors for the palette below.
                 */}
                <input
                  aria-label="Custom workspace theme color"
                  className="workspace-theme-color-input"
                  onChange={(event) => {
                    const normalizedColor = normalizeWorkspaceThemeColor(
                      event.currentTarget.value,
                    );
                    if (normalizedColor) {
                      setCustomThemeColor(normalizedColor);
                    }
                  }}
                  type="color"
                  value={customThemeColor}
                />
                <input
                  aria-label="Custom workspace theme color hex"
                  className="workspace-theme-color-text"
                  onChange={(event) => {
                    const normalizedColor = normalizeWorkspaceThemeColor(
                      event.currentTarget.value,
                    );
                    if (normalizedColor) {
                      setCustomThemeColor(normalizedColor);
                    }
                  }}
                  value={customThemeColor}
                />
                <button
                  aria-label="Apply custom workspace theme color"
                  className="workspace-theme-color-apply"
                  onClick={() => chooseCustomThemeColor(menu.projectId, customThemeColor)}
                  type="button"
                >
                  <IconCheck aria-hidden="true" size={14} stroke={2.2} />
                </button>
              </div>
              {recentThemeColors.length > 0 ? (
                <div className="workspace-theme-color-palette">
                  {recentThemeColors.map((themeColor) => (
                    <button
                      aria-label={`Use ${themeColor}`}
                      className="workspace-theme-color-palette-button"
                      key={themeColor}
                      onClick={() => chooseCustomThemeColor(menu.projectId, themeColor)}
                      style={getWorkspaceDockThemeSwatchStyle(themeColor)}
                      type="button"
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function WorkspaceDockProjectIcon({
  project,
  projectIndex,
}: {
  project: WorkspaceBarProject;
  projectIndex: number;
}) {
  const icon =
    project.icon ??
    (project.iconDataUrl ? { dataUrl: project.iconDataUrl, kind: "image" as const } : undefined);
  if (icon?.kind === "image") {
    return <img alt="" className="workspace-dock-icon-image" src={icon.dataUrl} />;
  }
  if (icon?.kind === "tabler") {
    return (
      <SidebarCommandIconGlyph
        className="workspace-dock-tabler-icon"
        color={icon.color ?? "currentColor"}
        icon={icon.icon}
        size={22}
        stroke={1.9}
      />
    );
  }
  if (project.isChat) {
    return <IconMessageCirclePlus aria-hidden="true" size={21} stroke={2} />;
  }
  return (
    <span className="workspace-dock-initials">
      {workspaceDockInitials(project.title, projectIndex)}
    </span>
  );
}

function WorkspaceDockIndicators({ project }: { project: WorkspaceBarProject }) {
  const { done, running, working } = project.sessionCounts;
  return (
    <>
      {done > 0 || working > 0 ? (
        <span className="workspace-dock-indicators">
          {done > 0 ? (
            <span className="workspace-dock-indicator" data-status="done">
              {formatWorkspaceDockCount(done)}
            </span>
          ) : null}
          {working > 0 ? (
            <span className="workspace-dock-indicator" data-status="working">
              {formatWorkspaceDockCount(working)}
            </span>
          ) : null}
        </span>
      ) : null}
      {running > 0 ? (
        <span className="workspace-dock-indicator" data-status="running">
          {formatWorkspaceDockCount(running)}
        </span>
      ) : null}
    </>
  );
}

function workspaceDockInitials(title: string, index: number): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return String(index + 1);
  }
  const words = trimmed.split(/\s+/u).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function workspaceDockTitle(project: WorkspaceBarProject): string {
  const summary = [
    project.sessionCounts.running > 0 ? `${project.sessionCounts.running} running` : "",
    project.sessionCounts.working > 0 ? `${project.sessionCounts.working} working` : "",
    project.sessionCounts.done > 0 ? `${project.sessionCounts.done} done` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return summary ? `${project.path || project.title} - ${summary}` : project.path || project.title;
}

/**
 * CDXC:WorkspaceTheme 2026-05-05-02:58
 * Custom workspace theme colors should tint the same dock button variables as
 * preset themes. Compute the contrast foreground once in React so CSS can keep
 * using the existing workspace-dock variable contract.
 */
function getWorkspaceDockThemeStyle(themeColor: string | undefined): CSSProperties | undefined {
  const normalizedColor = normalizeWorkspaceThemeColor(themeColor);
  if (!normalizedColor) {
    return undefined;
  }

  return {
    "--workspace-dock-button-background": normalizedColor,
    "--workspace-dock-button-border": `color-mix(in srgb, ${normalizedColor} 68%, white 32%)`,
    "--workspace-dock-button-foreground": getWorkspaceThemeForeground(normalizedColor),
  } as CSSProperties;
}

function getWorkspaceDockThemeSwatchStyle(themeColor: string | undefined): CSSProperties | undefined {
  const normalizedColor = normalizeWorkspaceThemeColor(themeColor);
  if (!normalizedColor) {
    return undefined;
  }

  return {
    "--workspace-dock-button-background": normalizedColor,
  } as CSSProperties;
}

function formatWorkspaceDockCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

const rootElement = document.getElementById("root");
const isStorybookPreview = "__STORYBOOK_PREVIEW__" in window;
if (!rootElement && !isStorybookPreview) {
  throw new Error("Native sidebar root element was not found.");
}

if (rootElement && !isStorybookPreview) {
  installAppModalGlobalErrorLogging("AppModals:nativeSidebar");
  createRoot(rootElement).render(<NativeSidebarRoot />);
  queueMicrotask(() => {
    postNative({ side: sidebarSide, type: "setSidebarSide" });
    postZedOverlaySettings("startup");
    startChromeCanaryRunningMonitor();
    startFirstPromptAutoRenameMonitor();
    void refreshGitState();
    if (activeSnapshot().sessions.length === 0) {
      createTerminal(DEFAULT_TERMINAL_SESSION_TITLE);
    } else {
      publish();
    }
  });
}
