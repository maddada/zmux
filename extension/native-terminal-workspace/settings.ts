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
export const SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING = "sendRenameCommandOnSidebarRename";
export const SIDEBAR_THEME_SETTING = "sidebarTheme";
export const AGENT_MANAGER_ZOOM_SETTING = "agentManagerZoom";
export const SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING = "showCloseButtonOnSessionCards";
export const SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING = "showHotkeysOnSessionCards";
export const SHOW_SIDEBAR_ACTIONS_SETTING = "showSidebarActions";
export const SHOW_SIDEBAR_AGENTS_SETTING = "showSidebarAgents";
export const SHOW_SIDEBAR_BROWSERS_SETTING = "showSidebarBrowsers";
export const SHOW_SIDEBAR_GIT_BUTTON_SETTING = "showSidebarGitButton";
export const DEBUGGING_MODE_SETTING = "debuggingMode";
export const COMPLETION_SOUND_SETTING = "completionSound";
export const DEFAULT_BROWSER_LAUNCH_URL_SETTING = "defaultBrowserLaunchUrl";
export const AGENTS_SETTING = "agents";
export const GIT_TEXT_GENERATION_PROVIDER_SETTING = "gitTextGenerationProvider";
export const GIT_TEXT_GENERATION_CUSTOM_COMMAND_SETTING = "gitTextGenerationCustomCommand";
export const GIT_TEXT_GENERATION_AGENT_ID_SETTING = "gitTextGenerationAgentId";
export const GIT_SKIP_SUGGESTED_COMMIT_CONFIRMATION_SETTING = "gitSkipSuggestedCommitConfirmation";
export const TERMINAL_FONT_FAMILY_SETTING = "terminalFontFamily";
export const TERMINAL_FONT_SIZE_SETTING = "terminalFontSize";
export const TERMINAL_LINE_HEIGHT_SETTING = "terminalLineHeight";
export const TERMINAL_LETTER_SPACING_SETTING = "terminalLetterSpacing";
export const TERMINAL_CURSOR_STYLE_SETTING = "terminalCursorStyle";
export const TERMINAL_CURSOR_BLINK_SETTING = "terminalCursorBlink";
export const TERMINAL_SCROLL_TO_BOTTOM_WHEN_TYPING_SETTING = "terminalScrollToBottomWhenTyping";
export const MIN_TERMINAL_FONT_SIZE = 8;
export const MAX_TERMINAL_FONT_SIZE = 32;
export const WORKSPACE_PANE_GAP_SETTING = "workspacePaneGap";
export const WORKSPACE_ACTIVE_PANE_BORDER_COLOR_SETTING = "workspaceActivePaneBorderColor";
export const COMPLETION_BELL_ENABLED_KEY = "VSmux.completionBellEnabled";
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

export function getShowCloseButtonOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING}`;
}

export function getCompletionSoundConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${COMPLETION_SOUND_SETTING}`;
}

export function getAgentsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${AGENTS_SETTING}`;
}

export function getGitTextGenerationProviderConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${GIT_TEXT_GENERATION_PROVIDER_SETTING}`;
}

export function getGitTextGenerationCustomCommandConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${GIT_TEXT_GENERATION_CUSTOM_COMMAND_SETTING}`;
}

export function getGitTextGenerationAgentIdConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${GIT_TEXT_GENERATION_AGENT_ID_SETTING}`;
}

export function getGitSkipSuggestedCommitConfirmationConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${GIT_SKIP_SUGGESTED_COMMIT_CONFIRMATION_SETTING}`;
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

export function getShowSidebarActions(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_SIDEBAR_ACTIONS_SETTING, true) ?? true
  );
}

export function getShowSidebarAgents(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_SIDEBAR_AGENTS_SETTING, true) ?? true
  );
}

export function getShowSidebarBrowsers(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_SIDEBAR_BROWSERS_SETTING, true) ?? true
  );
}

export function getShowSidebarGitButton(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_SIDEBAR_GIT_BUTTON_SETTING, true) ?? true
  );
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

export function getGitSkipSuggestedCommitConfirmation(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(GIT_SKIP_SUGGESTED_COMMIT_CONFIRMATION_SETTING, false) ?? false
  );
}

export function getTerminalFontFamily(): string {
  const defaultFontFamily = '"MesloLGL Nerd Font Mono", Menlo, Monaco, "Courier New", monospace';
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(TERMINAL_FONT_FAMILY_SETTING, defaultFontFamily) ?? defaultFontFamily;

  return value.trim() || defaultFontFamily;
}

export function getTerminalFontSize(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(TERMINAL_FONT_SIZE_SETTING, 12) ?? 12;
  return clampTerminalFontSize(value);
}

export function clampTerminalFontSize(value: number): number {
  return clampNumber(value, MIN_TERMINAL_FONT_SIZE, MAX_TERMINAL_FONT_SIZE, 12);
}

export async function setTerminalFontSize(fontSize: number): Promise<void> {
  const configuration = vscode.workspace.getConfiguration(SETTINGS_SECTION);
  const inspection = configuration.inspect<number>(TERMINAL_FONT_SIZE_SETTING);
  const target =
    inspection?.workspaceValue !== undefined
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;

  await configuration.update(TERMINAL_FONT_SIZE_SETTING, clampTerminalFontSize(fontSize), target);
}

export function getTerminalLineHeight(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(TERMINAL_LINE_HEIGHT_SETTING, 1) ?? 1;
  return clampNumber(value, 0.8, 2, 1);
}

export function getTerminalLetterSpacing(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(TERMINAL_LETTER_SPACING_SETTING, 0) ?? 0;
  return clampNumber(value, -2, 8, 0);
}

export function getTerminalCursorStyle(): "bar" | "block" | "underline" {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(TERMINAL_CURSOR_STYLE_SETTING, "bar") ?? "bar";
  return value === "block" || value === "underline" ? value : "bar";
}

export function getTerminalCursorBlink(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(TERMINAL_CURSOR_BLINK_SETTING, true) ?? true
  );
}

export function getTerminalScrollToBottomWhenTyping(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(TERMINAL_SCROLL_TO_BOTTOM_WHEN_TYPING_SETTING, false) ?? false
  );
}

export function getWorkspacePaneGap(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(WORKSPACE_PANE_GAP_SETTING, 12) ?? 12;
  return clampNumber(value, 0, 48, 12);
}

export function getWorkspaceActivePaneBorderColor(): string {
  const defaultColor = "rgba(90, 134, 255, 0.95)";
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(WORKSPACE_ACTIVE_PANE_BORDER_COLOR_SETTING, defaultColor) ?? defaultColor;
  return value.trim() || defaultColor;
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
