import { createRoot } from "react-dom/client";
import { installAppModalGlobalErrorLogging } from "../../sidebar/app-modal-error-log";
import { postAppModalHostMessage } from "../../sidebar/app-modal-host-bridge";
import { SidebarApp } from "../../sidebar/sidebar-app";
import {
  explainFirstPromptAutoRenameDecision,
  resolveFirstPromptAutoRenameStrategy,
  type FirstPromptAutoRenameStrategy,
} from "../../extension/first-prompt-session-title";
import {
  getTitleDerivedSessionActivityFromTransition,
  type TitleDerivedSessionActivity,
} from "../../extension/session-title-activity";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
  createSidebarHudState,
  createSidebarSessionItems,
  getVisiblePrimaryTitle,
  getVisibleTerminalTitle,
  type ExtensionToSidebarMessage,
  type GroupedSessionWorkspaceSnapshot,
  type SessionRecord,
  type SessionGridSnapshot,
  type SidebarActiveSessionsSortMode,
  type SidebarCollapsibleSection,
  type SidebarDaemonSessionItem,
  type SidebarDaemonSessionsStateMessage,
  type SidebarPreviousSessionItem,
  type SidebarSectionCollapseState,
  type SidebarSessionItem,
  type SidebarToExtensionMessage,
  type TerminalSessionRecord,
  type VisibleSessionCount,
} from "../../shared/session-grid-contract";
import {
  createDefaultSidebarGitState,
  type SidebarGitAction,
  type SidebarGitState,
} from "../../shared/sidebar-git";
import {
  createGroupFromSessionInSimpleWorkspace,
  createGroupInSimpleWorkspace,
  createSessionInSimpleWorkspace,
  focusGroupInSimpleWorkspace,
  focusSessionInSimpleWorkspace,
  moveSessionToGroupInSimpleWorkspace,
  normalizeSimpleGroupedSessionWorkspaceSnapshot,
  removeGroupInSimpleWorkspace,
  removeSessionInSimpleWorkspace,
  renameGroupInSimpleWorkspace,
  setGroupSleepingInSimpleWorkspace,
  setSessionFavoriteInSimpleWorkspace,
  setSessionSleepingInSimpleWorkspace,
  setSessionTitleInSimpleWorkspace,
  setTerminalSessionAgentNameInSimpleWorkspace,
  setViewModeInSimpleWorkspace,
  setVisibleCountInSimpleWorkspace,
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
  type StoredSidebarCommand,
} from "../../shared/sidebar-commands";
import {
  DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  normalizeSidebarCommandIconColor,
} from "../../shared/sidebar-command-icons";
import {
  DEFAULT_zmux_SETTINGS,
  normalizezmuxSettings,
  type zmuxSettings,
} from "../../shared/zmux-settings";
import { getGhosttyTerminalConfigValues } from "../../shared/ghostty-terminal-settings";
import "../../sidebar/styles.css";

type NativeHostCommand =
  | {
      cwd: string;
      env?: Record<string, string>;
      initialInput?: string;
      sessionId: string;
      title?: string;
      type: "createTerminal";
    }
  | { sessionId: string; type: "closeTerminal" }
  | { sessionId: string; type: "focusTerminal" }
  | { sessionId: string; text: string; type: "writeTerminalText" }
  | { sessionId: string; type: "sendTerminalEnter" }
  | {
      activeSessionIds: string[];
      focusedSessionId?: string;
      layout?: NativeTerminalLayout;
      type: "setActiveTerminalSet";
    }
  | { layout?: NativeTerminalLayout; type: "setTerminalLayout" }
  | { sessionId: string; type: "setTerminalVisibility"; visible: boolean }
  | { type: "pickWorkspaceFolder" }
  | { type: "showMessage"; level: "info" | "warning" | "error"; message: string }
  | { details?: string; event: string; type: "appendAgentDetectionDebugLog" }
  | { details?: string; event: string; type: "appendTerminalFocusDebugLog" }
  | { details?: string; event: string; type: "appendRestoreDebugLog" }
  | { details?: string; event: string; type: "appendSessionTitleDebugLog" }
  | { details?: string; event: string; type: "appendWorkspaceDockIndicatorDebugLog" }
  | { args: string[]; cwd?: string; env?: Record<string, string>; executable: string; requestId: string; type: "runProcess" }
  | {
      adjustCellHeightPercent: number;
      adjustCellWidth: number;
      fontFamily: string;
      fontSize: number;
      fontThicken: boolean;
      fontThickenStrength: number;
      type: "syncGhosttyTerminalSettings";
    }
  | { type: "openExternalUrl"; url: string }
  | { type: "openBrowserWindow"; url: string }
  | { type: "showBrowserWindow" }
  | { side: "left" | "right"; type: "setSidebarSide" }
  | {
      enabled: boolean;
      targetApp: "zed" | "zed-preview" | "vscode" | "vscode-insiders";
      type: "configureZedOverlay";
      workspacePath: string;
    };

type WorkspaceBarProject = {
  isActive: boolean;
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
  title: string;
};

type WorkspaceBarStateMessage = {
  activeProjectId: string;
  projects: WorkspaceBarProject[];
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
  | { foregroundPid?: number; sessionId: string; ttyName?: string; type: "terminalReady" }
  | { sessionId: string; title: string; type: "terminalTitleChanged" }
  | { cwd: string; sessionId: string; type: "terminalCwdChanged" }
  | { exitCode?: number; sessionId: string; type: "terminalExited" }
  | { sessionId: string; type: "terminalFocused" }
  | { sessionId: string; type: "terminalBell" }
  | { message: string; sessionId: string; type: "terminalError" }
  | { exitCode: number; requestId: string; stderr: string; stdout: string; type: "processResult" }
  | { protocolVersion: 1; type: "hostReady" };

type NativeProcessResult = Extract<NativeHostEvent, { type: "processResult" }>;

type NativeBootstrap = {
  cwd?: string;
  homeDir?: string;
  workspaceName?: string;
  zedOverlayEnabled?: boolean;
  zedOverlayTargetApp?: "zed" | "zed-preview" | "vscode" | "vscode-insiders";
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
      };
    };
    __zmux_NATIVE_WORKSPACE_BAR__?: {
      addProject: (path: string, name?: string) => void;
      focusProject: (projectId: string) => void;
      getState: () => WorkspaceBarStateMessage;
    };
    __zmux_NATIVE_SETTINGS__?: {
      attachZedOverlay: (targetApp: "zed" | "zed-preview" | "vscode" | "vscode-insiders") => void;
      detachZedOverlay: (targetApp: "zed" | "zed-preview" | "vscode" | "vscode-insiders") => void;
    };
    __zmux_NATIVE_CLI__?: {
      handleCommand: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
    };
    __zmux_NATIVE_MODAL_BRIDGE__?: {
      handleSidebarMessage: (message: SidebarToExtensionMessage) => void;
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
const CHROME_CANARY_PROCESS_NAME = "Google Chrome Canary";
const CHROME_CANARY_RUNNING_POLL_MS = 2_000;
const CHROME_CANARY_BROWSER_GROUP_ID = "browser-chrome-canary";
const CHROME_CANARY_BROWSER_SESSION_ID = "browser-chrome-canary-window";
const FIRST_PROMPT_AUTO_RENAME_POLL_MS = 2_000;
/**
 * CDXC:SessionTitleSync 2026-04-26-09:52
 * Codex needs the staged `/rename <title>` text to settle in the prompt before
 * zmux submits Enter. A one-second delay matches the requested native behavior;
 * the later native Enter command handles submission separately from text input.
 */
const AUTO_SUBMIT_STAGED_RENAME_DELAY_MS = 1_000;
const zmux_AGENT_NOTIFY_HOOK_PATH = `${nativeHomeDirectory()}/.zmux/hooks/agent-shell-notify.sh`;
/**
 * CDXC:SessionTitleSync 2026-04-26-09:23
 * Native first-prompt title generation must match zmux's Codex `/rename`
 * path, including the 39-character generated title cap and 250-character
 * prompt sample used before asking Codex for a short session name.
 */
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
let gitState = createDefaultSidebarGitState(gitPrimaryAction, gitConfirmCommit, gitGenerateCommitBody);
let isChromeCanaryRunning = false;
const pendingProcessResults = new Map<
  string,
  {
    reject: (reason?: unknown) => void;
    resolve: (result: NativeProcessResult) => void;
    timeout: number;
  }
>();
const pendingGitCommitRequests = new Map<string, { action: SidebarGitAction; body?: string; subject: string }>();

type NativeProject = {
  name: string;
  path: string;
  projectId: string;
  workspace: GroupedSessionWorkspaceSnapshot;
};

type NativeCliSessionSelector = {
  index?: number;
  sessionId?: string;
  sessionNumber?: number;
};

const restoredProjectState = readStoredProjects();
let projects: NativeProject[] = restoredProjectState.projects;
let activeProjectId = restoredProjectState.activeProjectId;
let settings = readStoredSettings();
let revision = 0;
let nextNativeSessionNumber = 1;
const sidebarBus = new SurfaceMessageBus<ExtensionToSidebarMessage>();
const terminalStateById = new Map<
  string,
  {
    activity: "attention" | "idle" | "working";
    agentName?: string;
    firstPromptAutoRenameInProgress?: boolean;
    firstPromptAutoRenameLastLogKey?: string;
    firstPromptAutoRenameProcessedPrompt?: string;
    lifecycleState: "done" | "error" | "running" | "sleeping";
    sessionStateFilePath?: string;
    terminalTitle?: string;
  }
>();
const titleDerivedActivityBySessionId = new Map<string, TitleDerivedSessionActivity>();
/**
 * CDXC:NativeTerminals 2026-04-26-06:45
 * Sidebar workspace snapshots normalize terminal ids back to canonical display
 * ids such as session-00. Native Ghostty surfaces use project-scoped ids, so
 * every native command/layout must translate at the bridge boundary.
 */
const nativeSessionIdBySidebarSessionId = new Map<string, string>();
const sidebarSessionIdByNativeSessionId = new Map<string, string>();

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
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendSessionTitleDebugLog",
  });
}

function appendAgentDetectionDebugLog(event: string, details?: unknown): void {
  /**
   * CDXC:AgentDetection 2026-04-26-11:14
   * Agent icons can disappear at several boundaries: Ghostty title events,
   * title-derived agent detection, terminal state storage, or sidebar card
   * projection. Keep this issue isolated in its own log file so repro traces
   * identify the first boundary that loses the agent.
   */
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendAgentDetectionDebugLog",
  });
}

function appendTerminalFocusDebugLog(event: string, details?: unknown): void {
  /**
   * CDXC:NativeTerminalFocus 2026-04-26-21:32
   * Native sidebar actions can focus terminals directly or indirectly through
   * layout sync. Mirror those actions into the focus-only log so split-terminal
   * focus jumps can be traced from sidebar state to AppKit first responder.
   */
  window.webkit?.messageHandlers?.zmuxNativeHost?.postMessage({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendTerminalFocusDebugLog",
  });
}

function appendRestoreDebugLog(event: string, details?: unknown): void {
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendRestoreDebugLog",
  });
}

function appendWorkspaceDockIndicatorDebugLog(event: string, details?: unknown): void {
  postNative({
    details: details === undefined ? undefined : safeSerializeForNativeLog(details),
    event,
    type: "appendWorkspaceDockIndicatorDebugLog",
  });
}

function isTerminalFocusDebugCommand(command: NativeHostCommand): boolean {
  return (
    command.type === "createTerminal" ||
    command.type === "focusTerminal" ||
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
    focusedSessionId: "focusedSessionId" in command ? command.focusedSessionId : undefined,
    hasInitialInput: "initialInput" in command ? Boolean(command.initialInput) : undefined,
    layoutLeafSessionIds: "layout" in command ? summarizeNativeLayoutLeafSessionIds(command.layout) : undefined,
    sessionId: "sessionId" in command ? command.sessionId : undefined,
    textLength: "text" in command ? command.text.length : undefined,
    textPreview: "text" in command ? summarizeTerminalText(command.text) : undefined,
    title: "title" in command ? command.title : undefined,
    type: command.type,
    visible: "visible" in command ? command.visible : undefined,
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

function openNativeBrowserWindow(url: string): void {
  /**
   * CDXC:BrowserOverlay 2026-04-26-05:14
   * Browser-type actions should not use the user's default browser. They launch
   * Chrome Canary through the native host so Swift can place that browser
   * window above the currently attached zmux window.
   */
  postNative({ type: "openBrowserWindow", url });
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

async function runGit(args: string[], options: { allowFailure?: boolean } = {}): Promise<NativeProcessResult> {
  const result = await runNativeProcess("/usr/bin/env", ["git", ...args], { cwd: activeProject().path });
  if (!options.allowFailure && result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `git ${args.join(" ")} failed`);
  }
  return result;
}

async function runGh(args: string[], options: { allowFailure?: boolean } = {}): Promise<NativeProcessResult> {
  const result = await runNativeProcess("/usr/bin/env", ["gh", ...args], { cwd: activeProject().path });
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
    const storedSettings = normalizezmuxSettings(
      JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null"),
    );
    const bootstrap = window.__zmux_NATIVE_HOST__;
    return normalizezmuxSettings({
      ...storedSettings,
      ...(bootstrap?.zedOverlayEnabled === undefined
        ? {}
        : { zedOverlayEnabled: bootstrap.zedOverlayEnabled }),
      ...(bootstrap?.zedOverlayTargetApp === undefined
        ? {}
        : { zedOverlayTargetApp: bootstrap.zedOverlayTargetApp }),
    });
  } catch {
    return DEFAULT_zmux_SETTINGS;
  }
}

function saveSettings(nextSettings: zmuxSettings): void {
  settings = normalizezmuxSettings(nextSettings);
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  syncGhosttyTerminalSettings(settings);
  postZedOverlaySettings();
  publish();
}

function syncGhosttyTerminalSettings(nextSettings: zmuxSettings): void {
  /**
   * CDXC:TerminalSettings 2026-04-26-19:02
   * Native zmux settings are stored in sidebar localStorage, so terminal
   * typography must also be posted to AppDelegate to update the shared Ghostty
   * config file used by external Ghostty windows.
   */
  postNative({
    ...getGhosttyTerminalConfigValues(nextSettings),
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
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  publish();
}

function readStoredAgents(): StoredSidebarAgent[] {
  try {
    return normalizeStoredSidebarAgents(JSON.parse(localStorage.getItem(AGENTS_STORAGE_KEY) || "null"));
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
    const candidate = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || "null");
    const candidateProjects = Array.isArray(candidate?.projects)
      ? candidate.projects.flatMap(normalizeStoredNativeProject)
      : [];
    const projects = candidateProjects.length > 0 ? candidateProjects : [fallbackProject];
    const activeProjectId =
      typeof candidate?.activeProjectId === "string" &&
      projects.some((project) => project.projectId === candidate.activeProjectId)
        ? candidate.activeProjectId
        : projects[0]!.projectId;
    appendRestoreDebugLog("nativeSidebar.projects.read", {
      activeProjectId,
      projectCount: projects.length,
      projects: projects.map(summarizeNativeProject),
      source: candidateProjects.length > 0 ? "localStorage" : "fallback",
    });
    return { activeProjectId, projects };
  } catch (error) {
    appendRestoreDebugLog("nativeSidebar.projects.readFailed", {
      error: error instanceof Error ? error.message : String(error),
      fallbackProject: summarizeNativeProject(fallbackProject),
    });
    return { activeProjectId: fallbackProject.projectId, projects: [fallbackProject] };
  }
}

function writeStoredProjects(reason: string): void {
  localStorage.setItem(
    PROJECTS_STORAGE_KEY,
    JSON.stringify({
      activeProjectId,
      projects,
    }),
  );
  /**
   * CDXC:WorkspaceRestore 2026-04-26-10:00
   * The packaged native app owns workspace/session state in the sidebar
   * webview, so project additions and session grid mutations must persist to
   * localStorage instead of relying on the older Bun workspaces.json store.
   */
  appendRestoreDebugLog("nativeSidebar.projects.persist", {
    activeProjectId,
    projectCount: projects.length,
    projects: projects.map(summarizeNativeProject),
    reason,
  });
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
      name: project.name?.trim() || projectNameFromPath(path),
      path,
      projectId,
      workspace: normalizeSimpleGroupedSessionWorkspaceSnapshot(project.workspace),
    },
  ];
}

function createInitialProject(): NativeProject {
  return {
    name: initialWorkspaceName,
    path: initialWorkspacePath,
    projectId: createProjectId(initialWorkspacePath),
    workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
  };
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
    name: project.name,
    path: project.path,
    projectId: project.projectId,
  };
}

function readScratchPadContent(): string {
  return localStorage.getItem(SCRATCH_PAD_STORAGE_KEY) || "";
}

function saveScratchPadContent(content: string): void {
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

function savePinnedPrompt(message: Extract<SidebarToExtensionMessage, { type: "savePinnedPrompt" }>): void {
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
  return localStorage.getItem(ACTIVE_SESSIONS_SORT_MODE_STORAGE_KEY) === "lastActivity"
    ? "lastActivity"
    : "manual";
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
    showNativeMessage("error", error instanceof Error ? error.message : "Failed to refresh git state.");
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

async function commitWorkingTreeIfNeeded(action: SidebarGitAction): Promise<"committed" | "pending" | "skipped"> {
  if (!gitState.hasWorkingTreeChanges) {
    return "skipped";
  }
  return commitWorkingTree(action);
}

async function commitWorkingTree(action: SidebarGitAction): Promise<"committed" | "pending" | "skipped"> {
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
      confirmLabel: action === "commit" ? "Commit" : action === "push" ? "Commit & Push" : "Commit, Push & PR",
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

async function continueGitActionAfterCommitConfirmation(requestId: string, message: string): Promise<void> {
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
    const candidate = JSON.parse(localStorage.getItem(PREVIOUS_SESSIONS_STORAGE_KEY) || "null");
    if (!Array.isArray(candidate)) {
      return [];
    }
    return candidate.filter(isSidebarPreviousSessionItem).slice(0, 80);
  } catch {
    return [];
  }
}

function writePreviousSessions(nextSessions: readonly SidebarPreviousSessionItem[]): void {
  previousSessions = nextSessions.slice(0, 80);
  localStorage.setItem(PREVIOUS_SESSIONS_STORAGE_KEY, JSON.stringify(previousSessions));
}

function rememberPreviousSession(sessionId: string): void {
  const previousItem = createPreviousSessionItem(sessionId);
  if (!previousItem) {
    return;
  }
  writePreviousSessions([
    previousItem,
    ...previousSessions.filter((session) => session.historyId !== previousItem.historyId),
  ]);
}

function createPreviousSessionItem(sessionId: string): SidebarPreviousSessionItem | undefined {
  for (const group of activeProject().workspace.groups) {
    const sidebarSession = createSidebarSessionItems(group.snapshot, "mac").find(
      (session) => session.sessionId === sessionId,
    );
    if (!sidebarSession) {
      continue;
    }
    const terminalState = terminalStateById.get(sessionId);
    return {
      ...sidebarSession,
      activity: "idle",
      closedAt: new Date().toISOString(),
      historyId: `native-history-${Date.now().toString(36)}-${sessionId}`,
      isGeneratedName: false,
      isRestorable: sidebarSession.sessionKind === "terminal",
      isRunning: false,
      lifecycleState: terminalState?.lifecycleState === "error" ? "error" : "done",
      terminalTitle: terminalState?.terminalTitle ?? sidebarSession.terminalTitle,
    };
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
  createTerminal(previousSession.primaryTitle || previousSession.alias || "Restored Session");
  deletePreviousSession(historyId);
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

function postZedOverlaySettings(): void {
  /**
   * CDXC:IDEAttachment 2026-04-26-22:38
   * Attach commands always use the IDE selected in settings. VS Code targets
   * are posted through the existing native overlay channel so the native host
   * can resolve their process names and `code`/`code-insiders` commands.
   */
  postNative({
    enabled: settings.zedOverlayEnabled,
    targetApp: settings.zedOverlayTargetApp,
    type: "configureZedOverlay",
    workspacePath: activeProject().path,
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

function activeProject(): NativeProject {
  return projects.find((project) => project.projectId === activeProjectId) ?? projects[0]!;
}

function updateActiveProjectWorkspace(
  updater: (workspace: GroupedSessionWorkspaceSnapshot) => GroupedSessionWorkspaceSnapshot,
): void {
  const currentProjectId = activeProject().projectId;
  projects = projects.map((project) =>
    project.projectId === currentProjectId
      ? { ...project, workspace: updater(project.workspace) }
      : project,
  );
  writeStoredProjects("updateActiveProjectWorkspace");
}

function findSessionRecord(sessionId: string): SessionRecord | undefined {
  for (const group of activeProject().workspace.groups) {
    const session = group.snapshot.sessions.find((candidate) => candidate.sessionId === sessionId);
    if (session) {
      return session;
    }
  }
  return undefined;
}

function setTerminalSessionAgentName(sessionId: string, agentName: string | undefined): void {
  updateActiveProjectWorkspace((workspace) =>
    setTerminalSessionAgentNameInSimpleWorkspace(workspace, sessionId, agentName).snapshot,
  );
}

function nativeSessionIdForSidebarSession(sessionId: string): string {
  return nativeSessionIdBySidebarSessionId.get(sessionId) ?? sessionId;
}

function sidebarSessionIdForNativeSession(sessionId: string): string {
  return sidebarSessionIdByNativeSessionId.get(sessionId) ?? sessionId;
}

function forgetNativeSessionMapping(sidebarSessionId: string): string {
  const nativeSessionId = nativeSessionIdForSidebarSession(sidebarSessionId);
  nativeSessionIdBySidebarSessionId.delete(sidebarSessionId);
  sidebarSessionIdByNativeSessionId.delete(nativeSessionId);
  return nativeSessionId;
}

function activeSnapshot(): SessionGridSnapshot {
  const workspace = activeProject().workspace;
  return (
    workspace.groups.find((group) => group.groupId === workspace.activeGroupId)?.snapshot ??
    workspace.groups[0]!.snapshot
  );
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

function buildSidebarMessage(): ExtensionToSidebarMessage {
  const project = activeProject();
  const workspace = project.workspace;
  const snapshot = activeSnapshot();
  const browserGroups = isChromeCanaryRunning ? [buildChromeCanaryBrowserGroup()] : [];
  return {
    groups: browserGroups.concat(workspace.groups.map((group) => ({
      groupId: group.groupId,
      isActive: group.groupId === workspace.activeGroupId,
      isFocusModeActive: group.snapshot.visibleCount === 1,
      kind: "workspace",
      layoutVisibleCount: group.snapshot.visibleCount,
      sessions: createSidebarSessionItems(group.snapshot, "mac").map((session) => {
        const sessionRecord = group.snapshot.sessions.find(
          (candidate) => candidate.sessionId === session.sessionId,
        );
        const persistedAgentName = sessionRecord?.kind === "terminal" ? sessionRecord.agentName : undefined;
        const terminalState = terminalStateById.get(session.sessionId);
        if (session.sessionKind !== "terminal") {
          return session;
        }
        const visibleTerminalTitle = getVisibleTerminalTitle(terminalState?.terminalTitle);
        const visiblePrimaryTitle = getVisiblePrimaryTitle(session.primaryTitle);
        /**
         * CDXC:AgentDetection 2026-04-27-02:36
         * Session cards must show the detected agent from the canonical session
         * record even when the native terminal state is not currently mounted.
         * Live terminal state can still refine the value as title detection runs.
         */
        const projectedAgentName = terminalState?.agentName ?? persistedAgentName;
        const agentIcon = getSidebarAgentIconById(projectedAgentName);
        const shouldPreferTerminalTitle =
          Boolean(visibleTerminalTitle) && shouldPreferTerminalTitleForAgentIcon(agentIcon);
        const primaryTitle = shouldPreferTerminalTitle
          ? visibleTerminalTitle
          : (visiblePrimaryTitle ?? visibleTerminalTitle ?? session.primaryTitle);
        const secondaryTerminalTitle = shouldPreferTerminalTitle
          ? undefined
          : visiblePrimaryTitle
            ? visibleTerminalTitle
            : undefined;
        appendSessionTitleDebugLog("nativeSidebar.sidebarTitleProjection", {
          agentIcon,
          primaryTitle,
          rawTerminalTitle: terminalState?.terminalTitle,
          reason: getNativeSidebarTitleProjectionReason({
            hasTerminalState: Boolean(terminalState),
            shouldPreferTerminalTitle,
            visiblePrimaryTitle,
            visibleTerminalTitle,
          }),
          sessionId: session.sessionId,
          terminalTitle: secondaryTerminalTitle,
          visiblePrimaryTitle,
          visibleTerminalTitle,
        });
        appendAgentDetectionDebugLog("nativeSidebar.sidebarCardProjection", {
          agentIcon,
          agentName: projectedAgentName,
          hasTerminalState: Boolean(terminalState),
          lifecycleState: terminalState?.lifecycleState,
          persistedAgentName,
          rawTerminalTitle: terminalState?.terminalTitle,
          sessionActivity: session.activity,
          sessionId: session.sessionId,
          terminalActivity: terminalState?.activity,
          titleProjectionReason: getNativeSidebarTitleProjectionReason({
            hasTerminalState: Boolean(terminalState),
            shouldPreferTerminalTitle,
            visiblePrimaryTitle,
            visibleTerminalTitle,
          }),
          visibleTerminalTitle,
        });
        return {
          ...session,
          activity: terminalState?.activity ?? session.activity,
          agentIcon,
          lifecycleState: terminalState?.lifecycleState ?? session.lifecycleState,
          isGeneratingFirstPromptTitle: terminalState?.firstPromptAutoRenameInProgress === true,
          isRunning: terminalState?.lifecycleState === "running",
          isPrimaryTitleTerminalTitle:
            Boolean(visibleTerminalTitle) && (!visiblePrimaryTitle || shouldPreferTerminalTitle),
          primaryTitle,
          terminalTitle: secondaryTerminalTitle,
        };
      }),
      title: group.title,
      viewMode: group.snapshot.viewMode,
      visibleCount: group.snapshot.visibleCount,
    }))),
    hud: {
      ...createSidebarHudState(
        snapshot,
        settings.sidebarTheme === "auto" ? "dark-blue" : settings.sidebarTheme,
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
          actions: settings.showSidebarActions,
          agents: settings.showSidebarAgents,
          browsers: isChromeCanaryRunning,
          git: settings.showSidebarGitButton,
        },
        collapsedSections,
        activeSessionsSortMode,
        settings.createSessionOnSidebarDoubleClick,
        settings.renameSessionOnDoubleClick,
      ),
      projectHeader: {
        directory: project.path,
        name: project.name,
      },
      settings,
    },
    pinnedPrompts,
    previousSessions,
    revision: ++revision,
    scratchPadContent,
    type: "hydrate",
  };
}

function getNativeSidebarTitleProjectionReason(args: {
  hasTerminalState: boolean;
  shouldPreferTerminalTitle: boolean;
  visiblePrimaryTitle: string | undefined;
  visibleTerminalTitle: string | undefined;
}): string {
  if (!args.hasTerminalState) {
    return "terminal-state-missing";
  }

  if (!args.visibleTerminalTitle) {
    return "terminal-title-empty-or-filtered";
  }

  if (args.shouldPreferTerminalTitle) {
    return "agent-terminal-title-promoted-to-primary";
  }

  if (args.visiblePrimaryTitle) {
    return "terminal-title-visible-as-secondary";
  }

  return "terminal-title-used-because-primary-title-missing";
}

function publish(): void {
  ensureVisibleNativeTerminals("publish");
  const sidebarMessage = buildSidebarMessage();
  sidebarBus.post(sidebarMessage);
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

function ensureVisibleNativeTerminals(reason: string): void {
  const project = activeProject();
  const snapshot = activeSnapshot();
  const visibleIds = new Set(snapshot.visibleSessionIds);
  const decisions: unknown[] = [];
  for (const session of snapshot.sessions) {
    if (session.kind !== "terminal" || session.isSleeping === true || !visibleIds.has(session.sessionId)) {
      decisions.push({
        isSleeping: session.isSleeping === true,
        isVisible: visibleIds.has(session.sessionId),
        kind: session.kind,
        persistedAgentName: session.kind === "terminal" ? session.agentName : undefined,
        reason:
          session.kind !== "terminal"
            ? "non-terminal"
            : session.isSleeping === true
              ? "sleeping"
              : "not-visible",
        sessionId: session.sessionId,
        title: session.title,
      });
      continue;
    }
    if (terminalStateById.has(session.sessionId)) {
      decisions.push({
        persistedAgentName: session.agentName,
        isVisible: true,
        reason: "already-has-terminal-state",
        sessionId: session.sessionId,
        title: session.title,
      });
      continue;
    }
    restoreNativeTerminalSession(project, session, reason);
    decisions.push({
      persistedAgentName: session.agentName,
      isVisible: true,
      reason: "restored-native-terminal",
      sessionId: session.sessionId,
      title: session.title,
    });
  }
  appendRestoreDebugLog("nativeSidebar.ensureVisibleNativeTerminals", {
    activeProjectId,
    decisions,
    project: summarizeNativeProject(project),
    reason,
    visibleIds: [...visibleIds],
  });
}

function restoreNativeTerminalSession(
  project: NativeProject,
  session: TerminalSessionRecord,
  reason: string,
): void {
  const nativeSessionId = `${project.projectId}-session-${nextNativeSessionNumber++}`;
  const sessionStateFilePath = createNativeSessionStateFilePath(project.projectId, session.sessionId);
  nativeSessionIdBySidebarSessionId.set(session.sessionId, nativeSessionId);
  sidebarSessionIdByNativeSessionId.set(nativeSessionId, session.sessionId);
  terminalStateById.set(session.sessionId, {
    activity: "idle",
    agentName: session.agentName,
    lifecycleState: "running",
    sessionStateFilePath,
    terminalTitle: session.title,
  });
  appendAgentDetectionDebugLog("nativeSidebar.restoreTerminalState.created", {
    agentName: session.agentName,
    initialActivity: "idle",
    nativeSessionId,
    reason,
    sessionId: session.sessionId,
    sessionStateFilePath,
    terminalTitle: session.title,
  });
  postNative({
    cwd: project.path,
    env: createNativeAgentSessionEnvironment({
      project,
      sessionId: session.sessionId,
      sessionStateFilePath,
    }),
    initialInput: "",
    sessionId: nativeSessionId,
    title: session.title,
    type: "createTerminal",
  });
  appendRestoreDebugLog("nativeSidebar.restoreNativeTerminalSession", {
    nativeSessionId,
    projectId: project.projectId,
    reason,
    sessionId: session.sessionId,
    title: session.title,
  });
}

function createWorkspaceBarState(): WorkspaceBarStateMessage {
  const workspaceBarState: WorkspaceBarStateMessage = {
    activeProjectId,
    projects: projects.map((project) => ({
      isActive: project.projectId === activeProjectId,
      path: project.path,
      projectId: project.projectId,
      sessionCounts: countWorkspaceBarSessions(project),
      title: project.name,
    })),
    type: "workspaceBarState",
  };
  appendWorkspaceDockIndicatorDebugLog("nativeSidebar.workspaceBarState", {
    activeProjectId,
    projects: workspaceBarState.projects,
    sourceProjects: projects.map((project) => summarizeWorkspaceBarIndicatorProject(project)),
  });
  return workspaceBarState;
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
      } else if (lifecycleState === "done") {
        counts.done += 1;
      }
    }
  }
  return counts;
}

function summarizeWorkspaceBarIndicatorProject(project: NativeProject) {
  return {
    name: project.name,
    path: project.path,
    projectId: project.projectId,
    groups: project.workspace.groups.map((group) => ({
      groupId: group.groupId,
      sessions: group.snapshot.sessions.map((session) => ({
        countedAs: getWorkspaceBarIndicatorDecision(
          session.isSleeping === true,
          session.kind,
          terminalStateById.get(session.sessionId)?.activity,
          terminalStateById.get(session.sessionId)?.lifecycleState,
        ),
        activity: terminalStateById.get(session.sessionId)?.activity,
        kind: session.kind,
        lifecycleState: terminalStateById.get(session.sessionId)?.lifecycleState,
        sessionId: session.sessionId,
        sleeping: session.isSleeping === true,
        title: session.title,
      })),
    })),
  };
}

function getWorkspaceBarIndicatorDecision(
  isSleeping: boolean,
  kind: string,
  activity: string | undefined,
  lifecycleState: string | undefined,
): "done" | "ignored-error" | "ignored-sleeping" | "running" | "working" {
  if (isSleeping) {
    return "ignored-sleeping";
  }
  if (kind === "browser") {
    return "running";
  }
  if (kind === "t3") {
    return "done";
  }
  if (lifecycleState === "running" && activity === "working") {
    return "working";
  }
  if (lifecycleState === "running") {
    return "running";
  }
  if (lifecycleState === "error") {
    return "ignored-error";
  }
  return "done";
}

function postWorkspaceBarState(): void {
  window.webkit?.messageHandlers?.zmuxWorkspaceBar?.postMessage(createWorkspaceBarState());
}

function createNativeSessionStateFilePath(projectId: string, sessionId: string): string {
  const safeProjectId = sanitizeNativePathPart(projectId);
  const safeSessionId = sanitizeNativePathPart(sessionId);
  return `${nativeHomeDirectory()}/.zmux/session-state/${safeProjectId}/${safeSessionId}.env`;
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
   */
  const command = buildEnsureNativeAgentHooksCommand();
  const result = await runNativeProcess("/bin/zsh", ["-lc", command]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Agent hook install failed.");
  }
  appendSessionTitleDebugLog("nativeSidebar.firstPromptAutoRename.hooksInstalled", {
    claudeSettingsPath: `${nativeHomeDirectory()}/.claude/settings.json`,
    codexHooksPath: `${nativeHomeDirectory()}/.codex/hooks.json`,
    notifyHookPath: zmux_AGENT_NOTIFY_HOOK_PATH,
  });
}

function buildEnsureNativeAgentHooksCommand(): string {
  const notifyHookPath = zmux_AGENT_NOTIFY_HOOK_PATH;
  const codexHooksPath = `${nativeHomeDirectory()}/.codex/hooks.json`;
  const claudeSettingsPath = `${nativeHomeDirectory()}/.claude/settings.json`;
  return [
    "set -e",
    `mkdir -p ${quoteNativeShellArg(dirnameNativePath(notifyHookPath))} ${quoteNativeShellArg(dirnameNativePath(codexHooksPath))} ${quoteNativeShellArg(dirnameNativePath(claudeSettingsPath))}`,
    `cat > ${quoteNativeShellArg(notifyHookPath)} <<'zmux_NOTIFY_HOOK'`,
    getNativeCodexNotifyHookScript(),
    "zmux_NOTIFY_HOOK",
    `chmod 755 ${quoteNativeShellArg(notifyHookPath)}`,
    `/usr/bin/python3 - ${quoteNativeShellArg(codexHooksPath)} ${quoteNativeShellArg(notifyHookPath)} codex <<'zmux_CODEX_HOOK_MERGE'`,
    getNativeAgentHookMergeScript(),
    "zmux_CODEX_HOOK_MERGE",
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
                state[key] = " ".join(value.strip().split())
except FileNotFoundError:
    pass

if state.get("autoTitleFromFirstPrompt") in {"1", "true", "TRUE", "True"}:
    sys.exit(0)
if state.get("pendingFirstPromptAutoRenamePrompt", "").strip():
    sys.exit(0)

state["status"] = state.get("status") or "idle"
state["agent"] = state.get("agent") or os.environ.get("VSMUX_AGENT") or os.environ.get("ZMUX_AGENT") or os.environ.get("zmux_AGENT") or "codex"
state["lastActivityAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
state["pendingFirstPromptAutoRenamePrompt"] = " ".join(prompt.split())

keys = [
    "status",
    "agent",
    "agentSessionId",
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

function dirnameNativePath(path: string): string {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : ".";
}

function quoteNativeShellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function createTerminal(
  title = "Shell",
  initialInput = "",
  groupId?: string,
  agentName?: string,
): TerminalSessionRecord | undefined {
  const project = activeProject();
  const targetWorkspace = groupId
    ? focusGroupInSimpleWorkspace(project.workspace, groupId).snapshot
    : project.workspace;
  const result = createSessionInSimpleWorkspace(targetWorkspace, {
    agentName,
    terminalEngine: "ghostty-native",
    title,
  });
  const generatedSession = result.session?.kind === "terminal" ? result.session : undefined;
  if (!generatedSession) {
    return undefined;
  }
  const nativeSessionId = `${project.projectId}-session-${nextNativeSessionNumber++}`;
  const sessionStateFilePath = createNativeSessionStateFilePath(project.projectId, generatedSession.sessionId);
  nativeSessionIdBySidebarSessionId.set(generatedSession.sessionId, nativeSessionId);
  sidebarSessionIdByNativeSessionId.set(nativeSessionId, generatedSession.sessionId);
  updateActiveProjectWorkspace(() => result.snapshot);
  const session = generatedSession;
  if (!session) {
    return undefined;
  }

  terminalStateById.set(session.sessionId, {
    activity: initialInput.trim() ? "working" : "idle",
    agentName,
    lifecycleState: "running",
    sessionStateFilePath,
    terminalTitle: title,
  });
  appendAgentDetectionDebugLog("nativeSidebar.terminalState.created", {
    agentName,
    initialActivity: initialInput.trim() ? "working" : "idle",
    initialInputPreview: initialInput.trim().slice(0, 120),
    nativeSessionId,
    sessionId: session.sessionId,
    sessionStateFilePath,
    terminalTitle: title,
  });
  postNative({
    cwd: project.path,
    env: createNativeAgentSessionEnvironment({
      agentName,
      project,
      sessionId: session.sessionId,
      sessionStateFilePath,
    }),
    initialInput,
    sessionId: nativeSessionId,
    title,
    type: "createTerminal",
  });
  postNative({ sessionId: nativeSessionId, type: "focusTerminal" });
  publish();
  return session;
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

  const decision = getNativeTerminalTitleSessionSyncDecision({
    agentName: terminalState.agentName,
    previousTerminalTitle,
    session,
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

  updateActiveProjectWorkspace((workspace) =>
    setSessionTitleInSimpleWorkspace(workspace, sessionId, visibleTitle).snapshot,
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

function getNativeTerminalTitleSessionSyncDecision(args: {
  agentName?: string;
  previousTerminalTitle?: string;
  session: SessionRecord;
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
   * CDXC:SessionTitleSync 2026-04-26-08:03
   * Native-sidebar sessions are the packaged app path. They must apply the
   * same terminal-title auto-renaming policy as the Bun controller: generated
   * or generic agent titles may follow Ghostty pty titles, while deliberate
   * user names remain authoritative.
   */
  if (isGeneratedSessionTitle(currentTitle)) {
    return { reason: "generated-session-title", shouldSync: true };
  }

  if (isGenericAgentTitle(currentTitle, args.agentName)) {
    return { reason: "generic-agent-title", shouldSync: true };
  }

  if (previousVisibleTitle !== undefined && currentTitle === previousVisibleTitle) {
    return { reason: "already-following-terminal-title", shouldSync: true };
  }

  return { reason: "manual-session-title", shouldSync: false };
}

function isGeneratedSessionTitle(title: string): boolean {
  return /^Session\s+\d+$/iu.test(title);
}

function isGenericAgentTitle(title: string, agentName: string | undefined): boolean {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedAgentName = agentName?.trim().toLowerCase();
  if (!normalizedTitle) {
    return true;
  }

  if (normalizedAgentName && normalizedTitle === normalizedAgentName) {
    return true;
  }

  return GENERIC_AGENT_TITLES.has(normalizedTitle);
}

const GENERIC_AGENT_TITLES = new Set([
  "claude",
  "claude code",
  "codex",
  "codex cli",
  "copilot",
  "gemini",
  "openai codex",
  "opencode",
  "open code",
]);

type NativePersistedSessionState = {
  agentName?: string;
  hasAutoTitleFromFirstPrompt?: boolean;
  pendingFirstPromptAutoRenamePrompt?: string;
  title?: string;
};

async function pollNativeFirstPromptAutoRenameSessions(): Promise<void> {
  for (const [sessionId, terminalState] of terminalStateById.entries()) {
    if (terminalState.lifecycleState !== "running" || terminalState.firstPromptAutoRenameInProgress) {
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
    logNativeFirstPromptAutoRenameSkipOnce(sessionId, terminalState, "missing-terminal-session-state", {
      hasSessionRecord: Boolean(session),
      sessionStateFilePath: terminalState.sessionStateFilePath,
    });
    return;
  }

  const persistedState = await readNativePersistedSessionState(terminalState.sessionStateFilePath);
  const pendingPrompt = persistedState.pendingFirstPromptAutoRenamePrompt?.trim();
  const agentName = persistedState.agentName || terminalState.agentName;
  const currentTitle = persistedState.title || session.title || terminalState.terminalTitle;
  const decision = explainFirstPromptAutoRenameDecision({
    agentName,
    /**
     * CDXC:SessionTitleSync 2026-04-26-09:52
     * Native first-prompt auto-rename should not skip just because a terminal
     * or sidebar title already exists. Preserve zmux's slash/meta/pending
     * guards, but always allow the first prompt to request `/rename <title>`.
     */
    currentTitle: undefined,
    hasAutoTitleFromFirstPrompt: persistedState.hasAutoTitleFromFirstPrompt,
    pendingFirstPromptAutoRenamePrompt:
      terminalState.firstPromptAutoRenameProcessedPrompt === pendingPrompt ? pendingPrompt : undefined,
    prompt: pendingPrompt,
  });
  if (!decision.shouldAutoName || !pendingPrompt) {
    logNativeFirstPromptAutoRenameSkipOnce(sessionId, terminalState, decision.reason, {
      agentName,
      currentTitle,
      hasAutoTitleFromFirstPrompt: persistedState.hasAutoTitleFromFirstPrompt,
      hasPendingPrompt: Boolean(pendingPrompt),
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
      updateActiveProjectWorkspace((workspace) =>
        setSessionTitleInSimpleWorkspace(workspace, sessionId, title).snapshot,
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
    const value = valueParts.join("=").replace(/\s+/g, " ").trim();
    if (!value) {
      continue;
    }
    if (key === "agent") {
      state.agentName = value;
    } else if (key === "autoTitleFromFirstPrompt") {
      state.hasAutoTitleFromFirstPrompt = value === "1" || /^true$/iu.test(value);
    } else if (key === "pendingFirstPromptAutoRenamePrompt") {
      state.pendingFirstPromptAutoRenamePrompt = value;
    } else if (key === "title") {
      state.title = getVisibleTerminalTitle(value);
    }
  }
  return state;
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
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Codex title generation failed.");
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
  const commandText = strategy === "sendBareRenameCommand" ? "/rename" : `/rename ${title ?? ""}`.trim();
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
  const nativeSessionId = forgetNativeSessionMapping(sessionId);
  rememberPreviousSession(sessionId);
  updateActiveProjectWorkspace((workspace) => removeSessionInSimpleWorkspace(workspace, sessionId).snapshot);
  terminalStateById.delete(sessionId);
  titleDerivedActivityBySessionId.delete(sessionId);
  postNative({ sessionId: nativeSessionId, type: "closeTerminal" });
  publish();
}

function focusTerminal(sessionId: string): void {
  updateActiveProjectWorkspace((workspace) => focusSessionInSimpleWorkspace(workspace, sessionId).snapshot);
  postNative({ sessionId: nativeSessionIdForSidebarSession(sessionId), type: "focusTerminal" });
  publish();
}

function findSessionGroupId(sessionId: string): string | undefined {
  return activeProject().workspace.groups.find((group) =>
    group.snapshot.sessions.some((session) => session.sessionId === sessionId),
  )?.groupId;
}

function findTerminalSession(sessionId: string): TerminalSessionRecord | undefined {
  for (const group of activeProject().workspace.groups) {
    const session = group.snapshot.sessions.find((candidate) => candidate.sessionId === sessionId);
    if (session?.kind === "terminal") {
      return session;
    }
  }
  return undefined;
}

function restartNativeSession(sessionId: string): void {
  const session = findTerminalSession(sessionId);
  const groupId = findSessionGroupId(sessionId);
  if (!session) {
    return;
  }
  closeTerminal(sessionId);
  createTerminal(session.title || "Shell", "", groupId);
}

function forkNativeSession(sessionId: string): void {
  const session = findTerminalSession(sessionId);
  const groupId = findSessionGroupId(sessionId);
  if (!session) {
    return;
  }
  createTerminal(`${session.title || "Shell"} Fork`, "", groupId);
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
  const terminalState = terminalStateById.get(session.sessionId);
  const failures: string[] = [];
  const expectedAgentIcon = typeof payload.agentIcon === "string" ? payload.agentIcon : undefined;
  const expectedAgentName = typeof payload.agentName === "string" ? payload.agentName : undefined;
  const expectedVisible = typeof payload.visible === "boolean" ? payload.visible : undefined;
  if (expectedAgentIcon !== undefined && session.agentIcon !== expectedAgentIcon) {
    failures.push(`agentIcon expected ${expectedAgentIcon}, received ${session.agentIcon ?? "<empty>"}`);
  }
  if (expectedAgentName !== undefined && terminalState?.agentName !== expectedAgentName) {
    failures.push(`agentName expected ${expectedAgentName}, received ${terminalState?.agentName ?? "<empty>"}`);
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

function runCliAgent(agentId: string, groupId?: string): TerminalSessionRecord | undefined {
  const agent = agents.find((candidate) => candidate.agentId === agentId);
  if (!agent?.command) {
    throw new Error(`Unknown or unconfigured agent: ${agentId}`);
  }
  return createTerminal(agent.name, `${agent.command}\r`, groupId, agent.agentId);
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
  return createTerminal(command.name, `${command.command}\r`);
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
        const session = createTerminal(
          typeof payload.title === "string" ? payload.title : "Shell",
          typeof payload.input === "string" ? payload.input : "",
          typeof payload.groupId === "string" ? payload.groupId : undefined,
        );
        return { ok: true, session, state: summarizeCliState() };
      }
      case "createAgentSession":
      case "runAgent": {
        const agentId = typeof payload.agentId === "string" ? payload.agentId : "";
        const session = runCliAgent(agentId, typeof payload.groupId === "string" ? payload.groupId : undefined);
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
        focusTerminal(session.sessionId);
        return { ok: true, session, state: summarizeCliState() };
      }
      case "focusGroup":
        updateActiveProjectWorkspace((workspace) =>
          focusGroupInSimpleWorkspace(workspace, String(payload.groupId)).snapshot,
        );
        publish();
        return { ok: true, state: summarizeCliState() };
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
        addProject(String(payload.path), typeof payload.name === "string" ? payload.name : undefined);
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
        updateActiveProjectWorkspace((workspace) =>
          setSessionTitleInSimpleWorkspace(workspace, session.sessionId, String(payload.title ?? "")).snapshot,
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      }
      case "sleepSession": {
        const session = requireCliSession(payload);
        updateActiveProjectWorkspace((workspace) =>
          setSessionSleepingInSimpleWorkspace(workspace, session.sessionId, payload.sleeping !== false).snapshot,
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      }
      case "favoriteSession": {
        const session = requireCliSession(payload);
        updateActiveProjectWorkspace((workspace) =>
          setSessionFavoriteInSimpleWorkspace(workspace, session.sessionId, payload.favorite !== false).snapshot,
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
        postNative({ sessionId: nativeSessionIdForSidebarSession(session.sessionId), type: "sendTerminalEnter" });
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
        postNative({ sessionId: nativeSessionIdForSidebarSession(session.sessionId), type: "sendTerminalEnter" });
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
          setVisibleCountInSimpleWorkspace(workspace, Number(payload.count)),
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      case "setViewMode":
        updateActiveProjectWorkspace((workspace) =>
          setViewModeInSimpleWorkspace(workspace, String(payload.mode) as "grid" | "horizontal" | "vertical"),
        );
        publish();
        return { ok: true, state: summarizeCliState() };
      case "openBrowser":
        openNativeBrowserWindow(typeof payload.url === "string" ? payload.url : DEFAULT_BROWSER_LAUNCH_URL);
        return { ok: true };
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
  const session = findTerminalSession(sessionId);
  if (!session) {
    return;
  }
  const text = `cd ${JSON.stringify(activeProject().path)} && ${session.title || "echo No resume command available"}`;
  void navigator.clipboard?.writeText(text).catch(() => undefined);
}

function refreshDaemonSessionsState(): void {
  const now = new Date().toISOString();
  const sessions: SidebarDaemonSessionItem[] = [];
  for (const project of projects) {
    for (const group of project.workspace.groups) {
      for (const session of group.snapshot.sessions) {
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
    t3Sessions: [],
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
        workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
      },
    ];
    writeStoredProjects("addProject");
  }
  focusProject(projectId);
  if (activeSnapshot().sessions.length === 0) {
    createTerminal("Native Ghostty");
    return;
  }
  publish();
}

function focusProject(projectId: string): void {
  if (!projects.some((project) => project.projectId === projectId)) {
    return;
  }
  activeProjectId = projectId;
  writeStoredProjects("focusProject");
  postZedOverlaySettings();
  void refreshGitState();
  publish();
}

function saveSidebarAgent(message: Extract<SidebarToExtensionMessage, { type: "saveSidebarAgent" }>): void {
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
    Boolean(selectedDefaultAgent && !isSidebarAgentVisible(storedAgents, selectedDefaultAgent.agentId));
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
    writeStoredAgentOrder(storedAgentOrder.filter((candidateAgentId) => candidateAgentId !== agentId));
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
  writeStoredAgentOrder(storedAgentOrder.filter((candidateAgentId) => candidateAgentId !== agentId));
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
      ? storedCommands.map((candidate, index) => (index === existingIndex ? nextCommand : candidate))
      : [...storedCommands, nextCommand];
  const nextOrder =
    existingIndex >= 0 || storedCommandOrder.includes(commandId) || isDefaultSidebarCommandId(commandId)
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
      createTerminal();
      return;
    case "createSessionInGroup":
      createTerminal("Shell", "", message.groupId);
      return;
    case "openBrowser":
      openNativeBrowserWindow(DEFAULT_BROWSER_LAUNCH_URL);
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
    case "killT3RuntimeSession":
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
      updateActiveProjectWorkspace((workspace) =>
        createGroupFromSessionInSimpleWorkspace(workspace, message.sessionId).snapshot,
      );
      publish();
      return;
    }
    case "focusGroup":
      updateActiveProjectWorkspace((workspace) =>
        focusGroupInSimpleWorkspace(workspace, message.groupId).snapshot,
      );
      publish();
      return;
    case "focusSession":
      if (message.sessionId === CHROME_CANARY_BROWSER_SESSION_ID) {
        showNativeBrowserWindow();
        return;
      }
      focusTerminal(message.sessionId);
      return;
    case "promptRenameSession": {
      const session = findTerminalSession(message.sessionId);
      if (session) {
        const title = window.prompt("Rename session", session.title || "Shell");
        if (title?.trim()) {
          updateActiveProjectWorkspace((workspace) =>
            setSessionTitleInSimpleWorkspace(workspace, message.sessionId, title.trim()).snapshot,
          );
          appendSessionTitleDebugLog("terminalRenameCommand.notSent", {
            reason: "sidebar-rename-updates-zmux-session-record-only",
            requestedTitle: title.trim(),
            sessionId: message.sessionId,
            source: "native-sidebar-prompt-rename-session",
          });
          publish();
        }
      }
      return;
    }
    case "renameSession":
      updateActiveProjectWorkspace((workspace) =>
        setSessionTitleInSimpleWorkspace(workspace, message.sessionId, message.title).snapshot,
      );
      appendSessionTitleDebugLog("terminalRenameCommand.notSent", {
        reason: "sidebar-rename-updates-zmux-session-record-only",
        requestedTitle: message.title,
        sessionId: message.sessionId,
        source: "native-sidebar-rename-session",
      });
      publish();
      return;
    case "renameGroup":
      updateActiveProjectWorkspace((workspace) =>
        renameGroupInSimpleWorkspace(workspace, message.groupId, message.title).snapshot,
      );
      publish();
      return;
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
      const group = activeProject().workspace.groups.find((candidate) => candidate.groupId === message.groupId);
      for (const session of group?.snapshot.sessions ?? []) {
        if (session.kind === "terminal") {
          restartNativeSession(session.sessionId);
        }
      }
      return;
    }
    case "copyResumeCommand":
      copyResumeCommand(message.sessionId);
      return;
    case "requestT3SessionBrowserAccess":
      showNativeMessage("info", "This native workspace does not have a T3 browser session to expose.");
      return;
    case "closeGroup": {
      const project = activeProject();
      const group = project.workspace.groups.find((candidate) => candidate.groupId === message.groupId);
      for (const session of group?.snapshot.sessions ?? []) {
        terminalStateById.delete(session.sessionId);
        titleDerivedActivityBySessionId.delete(session.sessionId);
        const nativeSessionId = forgetNativeSessionMapping(session.sessionId);
        postNative({ sessionId: nativeSessionId, type: "closeTerminal" });
      }
      updateActiveProjectWorkspace((workspace) =>
        removeGroupInSimpleWorkspace(workspace, message.groupId).snapshot,
      );
      publish();
      return;
    }
    case "setSessionSleeping":
      updateActiveProjectWorkspace((workspace) =>
        setSessionSleepingInSimpleWorkspace(workspace, message.sessionId, message.sleeping).snapshot,
      );
      publish();
      return;
    case "setSessionFavorite":
      updateActiveProjectWorkspace((workspace) =>
        setSessionFavoriteInSimpleWorkspace(workspace, message.sessionId, message.favorite).snapshot,
      );
      publish();
      return;
    case "setGroupSleeping":
      updateActiveProjectWorkspace((workspace) =>
        setGroupSleepingInSimpleWorkspace(workspace, message.groupId, message.sleeping).snapshot,
      );
      publish();
      return;
    case "moveSessionToGroup":
      updateActiveProjectWorkspace((workspace) =>
        moveSessionToGroupInSimpleWorkspace(
          workspace,
          message.sessionId,
          message.groupId,
          message.targetIndex,
        ).snapshot,
      );
      publish();
      return;
    case "toggleFullscreenSession":
      updateActiveProjectWorkspace((workspace) => toggleFullscreenSessionInSimpleWorkspace(workspace));
      publish();
      return;
    case "syncGroupOrder":
      updateActiveProjectWorkspace((workspace) =>
        syncGroupOrderInSimpleWorkspace(workspace, message.groupIds).snapshot,
      );
      publish();
      return;
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
      publish();
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
    case "sidebarDebugLog":
      if (message.event.startsWith("sidebar.agentIcon.")) {
        appendAgentDetectionDebugLog(message.event, message.details);
      }
      console.debug("[zmux-native-sidebar]", message.event, message.details);
      return;
    case "runSidebarAgent": {
      const agent = agents.find((candidate) => candidate.agentId === message.agentId);
      if (agent?.command) {
        createTerminal(agent.name, `${agent.command}\r`, undefined, agent.agentId);
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
      if (command?.actionType === "browser" && command.url) {
        openNativeBrowserWindow(command.url);
      } else if (command?.command) {
        createTerminal(command.name, `${command.command}\r`);
      }
      return;
    }
    case "endSidebarCommandRun":
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
    case "setVisibleCount":
      updateActiveProjectWorkspace((workspace) =>
        setVisibleCountInSimpleWorkspace(workspace, message.visibleCount),
      );
      publish();
      return;
    case "setViewMode":
      updateActiveProjectWorkspace((workspace) => setViewModeInSimpleWorkspace(workspace, message.viewMode));
      publish();
      return;
    case "syncSessionOrder":
      updateActiveProjectWorkspace((workspace) =>
        syncSessionOrderInSimpleWorkspace(workspace, message.groupId, message.sessionIds).snapshot,
      );
      publish();
      return;
    default:
      return;
  }
}

function syncNativeLayout(): void {
  const snapshot = activeSnapshot();
  const visibleIds = new Set(snapshot.visibleSessionIds);
  const visibleSessionIds = snapshot.sessions
    .filter((session) => session.kind === "terminal" && visibleIds.has(session.sessionId))
    .map((session) => nativeSessionIdForSidebarSession(session.sessionId));
  const layout = buildLayout(visibleSessionIds, snapshot.visibleCount);
  postNative({
    activeSessionIds: visibleSessionIds,
    focusedSessionId: snapshot.focusedSessionId
      ? nativeSessionIdForSidebarSession(snapshot.focusedSessionId)
      : undefined,
    layout,
    type: "setActiveTerminalSet",
  });
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
    rows.push(row.length === 1 ? row[0]! : { children: row, direction: "horizontal", kind: "split" });
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
  const sidebarSessionId = sidebarSessionIdForNativeSession(hostEvent.sessionId);
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
    const previousTerminalTitle = terminalState.terminalTitle;
    const knownAgentNameBeforeDetection = terminalState.agentName;
    const previousDerivedActivity = titleDerivedActivityBySessionId.get(sidebarSessionId);
    const nextDerivedActivity = getTitleDerivedSessionActivityFromTransition(
      previousTerminalTitle,
      hostEvent.title,
      previousDerivedActivity,
      knownAgentNameBeforeDetection,
    );
    terminalState.terminalTitle = hostEvent.title;
    /**
     * CDXC:AgentDetection 2026-04-26-10:50
     * Native Ghostty sessions may start as plain shells and only later reveal
     * the active agent through terminal titles. Mirror demo-project's title
     * detector so Codex, Claude, Gemini, and Copilot titles update the sidebar
     * icon/status without requiring launch through an agent button.
     */
    if (nextDerivedActivity) {
      titleDerivedActivityBySessionId.set(sidebarSessionId, nextDerivedActivity);
      terminalState.agentName = nextDerivedActivity.agentName;
      terminalState.activity = nextDerivedActivity.activity;
      setTerminalSessionAgentName(sidebarSessionId, nextDerivedActivity.agentName);
    } else {
      titleDerivedActivityBySessionId.delete(sidebarSessionId);
    }
    appendAgentDetectionDebugLog("nativeSidebar.terminalTitleDetection", {
      knownAgentNameAfterDetection: terminalState.agentName,
      knownAgentNameBeforeDetection,
      nativeSessionId: hostEvent.sessionId,
      nextDerivedActivity,
      previousDerivedActivity,
      previousTerminalTitle,
      sessionId: sidebarSessionId,
      title: hostEvent.title,
      titleDerivedActivityStored: titleDerivedActivityBySessionId.has(sidebarSessionId),
    });
    appendSessionTitleDebugLog("terminalRenameCommand.notSent", {
      detectedAgentName: nextDerivedActivity?.agentName,
      detectedAgentStatus: nextDerivedActivity?.activity,
      nativeSessionId: hostEvent.sessionId,
      previousTerminalTitle,
      reason: "native-title-event-is-source-of-truth",
      sessionId: sidebarSessionId,
      title: hostEvent.title,
    });
    syncSessionTitleFromNativeTerminalTitle(sidebarSessionId, hostEvent.title, previousTerminalTitle);
  } else if (hostEvent.type === "terminalExited") {
    terminalState.lifecycleState = "done";
    terminalState.activity = "idle";
  } else if (hostEvent.type === "terminalError") {
    terminalState.lifecycleState = "error";
    terminalState.activity = "attention";
    terminalState.terminalTitle = hostEvent.message;
  } else if (hostEvent.type === "terminalBell") {
    terminalState.activity = "attention";
  } else if (hostEvent.type === "terminalReady") {
    terminalState.lifecycleState = "running";
  } else if (hostEvent.type === "terminalFocused") {
    /**
     * CDXC:NativeTerminalFocus 2026-04-26-21:32
     * Clicking or typing in a split Ghostty surface changes AppKit focus before
     * sidebar state knows about it. Treat native terminalFocused as the
     * authoritative user-focus signal so later layout sync sends the focused
     * session the user is actually typing in instead of stale sidebar focus.
     */
    const previousFocusedSessionId = activeSnapshot().focusedSessionId;
    if (previousFocusedSessionId === sidebarSessionId) {
      appendTerminalFocusDebugLog("nativeSidebar.terminalFocused.duplicateSkipped", {
        nativeSessionId: hostEvent.sessionId,
        sessionId: sidebarSessionId,
      });
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
    if (!focusChanged) {
      return;
    }
  }
  publish();
});

window.__zmux_NATIVE_WORKSPACE_BAR__ = {
  addProject,
  focusProject,
  getState: createWorkspaceBarState,
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

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Native sidebar root element was not found.");
}

installAppModalGlobalErrorLogging("AppModals:nativeSidebar");
createRoot(rootElement).render(<SidebarApp messageSource={sidebarBus} vscode={vscode} />);
queueMicrotask(() => {
  postNative({ side: sidebarSide, type: "setSidebarSide" });
  postZedOverlaySettings();
  startChromeCanaryRunningMonitor();
  startFirstPromptAutoRenameMonitor();
  void refreshGitState();
  if (activeSnapshot().sessions.length === 0) {
    createTerminal("Native Ghostty");
  } else {
    publish();
  }
});
