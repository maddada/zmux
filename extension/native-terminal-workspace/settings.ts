import * as vscode from "vscode";
import {
  clampCompletionSoundSetting,
  type CompletionSoundSetting,
} from "../../shared/completion-sound";
import {
  clampAgentManagerZoomPercent,
  clampSidebarThemeSetting,
  DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
  type SidebarThemeSetting,
  type SidebarThemeVariant,
} from "../../shared/session-grid-contract";
import { DEFAULT_BROWSER_LAUNCH_URL } from "../../shared/sidebar-commands";

export const SETTINGS_SECTION = "VSmux";
export const BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING = "backgroundSessionTimeoutMinutes";
export const MATCH_VISIBLE_TERMINAL_ORDER_SETTING = "matchVisibleTerminalOrderInSessionsArea";
export const NATIVE_TERMINAL_ACTION_DELAY_MS_SETTING = "nativeTerminalActionDelayMs";
export const KEEP_SESSION_GROUPS_UNLOCKED_SETTING = "keepSessionGroupsUnlocked";
export const SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING = "sendRenameCommandOnSidebarRename";
export const SIDEBAR_THEME_SETTING = "sidebarTheme";
export const AGENT_MANAGER_ZOOM_SETTING = "agentManagerZoom";
export const SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING = "showCloseButtonOnSessionCards";
export const SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING = "showHotkeysOnSessionCards";
export const DEBUGGING_MODE_SETTING = "debuggingMode";
export const COMPLETION_SOUND_SETTING = "completionSound";
export const DEFAULT_BROWSER_LAUNCH_URL_SETTING = "defaultBrowserLaunchUrl";
export const AGENTS_SETTING = "agents";
export const COMPLETION_BELL_ENABLED_KEY = "VSmux.completionBellEnabled";
export const DISABLE_VS_MUX_MODE_KEY = "VSmux.disableVsMuxMode";
export const SCRATCH_PAD_CONTENT_KEY = "VSmux.sidebarScratchPadContent";
export const NATIVE_TERMINAL_DEBUG_STATE_KEY = "VSmux.nativeTerminalDebugState";
export const SIDEBAR_WELCOME_DISMISSED_KEY = "VSmux.sidebarWelcomeDismissed";
export const SIDEBAR_LOCATION_IN_SECONDARY_KEY = "VSmux.sidebarLocationInSecondary";
export const SESSIONS_VIEW_ID = "VSmux.sessions";
export const PRIMARY_SESSIONS_CONTAINER_ID = "VSmuxSessions";
export const SECONDARY_SESSIONS_CONTAINER_ID = "VSmuxSessionsSecondary";
export const DEBUG_STATE_POLL_INTERVAL_MS = 500;
export const SIDEBAR_WELCOME_OK_LABEL = "OK";
export const WORKING_ACTIVITY_STALE_TIMEOUT_MS = 10_000;
export const COMMAND_TERMINAL_EXIT_POLL_MS = 250;

export function getBackgroundSessionTimeoutConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING}`;
}

export function getSidebarThemeConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SIDEBAR_THEME_SETTING}`;
}

export function getAgentManagerZoomConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${AGENT_MANAGER_ZOOM_SETTING}`;
}

export function getMatchVisibleTerminalOrderConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${MATCH_VISIBLE_TERMINAL_ORDER_SETTING}`;
}

export function getNativeTerminalActionDelayConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${NATIVE_TERMINAL_ACTION_DELAY_MS_SETTING}`;
}

export function getKeepSessionGroupsUnlockedConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${KEEP_SESSION_GROUPS_UNLOCKED_SETTING}`;
}

export function getShowCloseButtonOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING}`;
}

export function getCompletionSoundConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${COMPLETION_SOUND_SETTING}`;
}

export function getAgentsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${AGENTS_SETTING}`;
}

export function getDefaultBrowserLaunchUrlConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${DEFAULT_BROWSER_LAUNCH_URL_SETTING}`;
}

export function getDebuggingModeConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${DEBUGGING_MODE_SETTING}`;
}

export function getShowHotkeysOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING}`;
}

export function getSidebarThemeVariant(): SidebarThemeVariant {
  const activeKind = vscode.window.activeColorTheme.kind;
  return activeKind === vscode.ColorThemeKind.Light ? "light" : "dark";
}

export function getShowCloseButtonOnSessionCards(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING, false) ?? false
  );
}

export function getShowHotkeysOnSessionCards(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING, false) ?? false
  );
}

export function getDebuggingMode(): boolean {
  return (
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<boolean>(DEBUGGING_MODE_SETTING) ??
    false
  );
}

export function getSendRenameCommandOnSidebarRename(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING, false) ?? false
  );
}

export function getClampedSidebarThemeSetting(): SidebarThemeSetting {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(SIDEBAR_THEME_SETTING, "auto") ?? "auto";
  return clampSidebarThemeSetting(value);
}

export function getClampedAgentManagerZoomPercent(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(AGENT_MANAGER_ZOOM_SETTING, DEFAULT_AGENT_MANAGER_ZOOM_PERCENT) ??
    DEFAULT_AGENT_MANAGER_ZOOM_PERCENT;
  return clampAgentManagerZoomPercent(value);
}

export function getClampedCompletionSoundSetting(): CompletionSoundSetting {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(COMPLETION_SOUND_SETTING, "ping") ?? "ping";
  return clampCompletionSoundSetting(value);
}

export function getDefaultBrowserLaunchUrl(): string {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(DEFAULT_BROWSER_LAUNCH_URL_SETTING, DEFAULT_BROWSER_LAUNCH_URL) ??
    DEFAULT_BROWSER_LAUNCH_URL;

  return value.trim() || DEFAULT_BROWSER_LAUNCH_URL;
}
