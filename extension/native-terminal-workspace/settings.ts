import * as vscode from "vscode";
import type { DefaultSidebarAgentId } from "../../shared/sidebar-agents";
import {
  clampCompletionSoundSetting,
  type CompletionSoundSetting,
} from "../../shared/completion-sound";
import { DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE } from "../find-previous-session-prompt";
import {
  clampAgentManagerZoomPercent,
  clampSidebarThemeSetting,
  DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
  normalizeTerminalEngine,
  type TerminalEngine,
  type SidebarThemeSetting,
  type SidebarThemeVariant,
} from "../../shared/session-grid-contract";
import { DEFAULT_BROWSER_LAUNCH_URL } from "../../shared/sidebar-commands";
import {
  DEFAULT_TERMINAL_FONT_PRESET,
  getTerminalFontFamilyForPreset,
  normalizeTerminalFontPreset,
} from "../../shared/terminal-font-preset";
import {
  clearSharedWorkspaceAppearancePreference,
  getSharedWorkspaceAppearancePreference,
  setSharedWorkspaceAppearancePreference,
} from "../shared-workspace-appearance-preferences";

export const SETTINGS_SECTION = "zmux";
export const BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING = "backgroundSessionTimeoutMinutes";
export const AUTO_SLEEP_TIMEOUT_MINUTES_SETTING = "autoSleepTimeoutMinutes";
export const AUTO_OPEN_SIDEBAR_VIEWS_ON_STARTUP_SETTING = "autoOpenSidebarViewsOnStartup";
export const SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING = "sendRenameCommandOnSidebarRename";
export const CREATE_SESSION_ON_SIDEBAR_DOUBLE_CLICK_SETTING = "createSessionOnSidebarDoubleClick";
export const RENAME_SESSION_ON_DOUBLE_CLICK_SETTING = "renameSessionOnDoubleClick";
export const SIDEBAR_THEME_SETTING = "sidebarTheme";
export const AGENT_MANAGER_ZOOM_SETTING = "agentManagerZoom";
export const SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING = "showCloseButtonOnSessionCards";
export const SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING = "showHotkeysOnSessionCards";
export const SHOW_LAST_INTERACTION_TIME_ON_SESSION_CARDS_SETTING =
  "showLastInteractionTimeOnSessionCards";
export const SHOW_SIDEBAR_ACTIONS_SETTING = "showSidebarActions";
export const SHOW_SIDEBAR_AGENTS_SETTING = "showSidebarAgents";
export const SHOW_SIDEBAR_BROWSERS_SETTING = "showSidebarBrowsers";
export const SHOW_SIDEBAR_GIT_BUTTON_SETTING = "showSidebarGitButton";
export const HIDE_SIDEBAR_PROJECT_HEADER_SETTING = "hideSidebarProjectHeader";
export const DEBUGGING_MODE_SETTING = "debuggingMode";
export const OPEN_PROMPT_TEMP_FILES_IN_MODAL_EDITOR_SETTING = "openPromptTempFilesInModalEditor";
export const COMPLETION_SOUND_SETTING = "completionSound";
export const ACTION_COMPLETION_SOUND_SETTING = "actionCompletionSound";
export const DEFAULT_BROWSER_LAUNCH_URL_SETTING = "defaultBrowserLaunchUrl";
export const DEFAULT_AGENT_COMMANDS_SETTING = "defaultAgentCommands";
export const AGENTS_SETTING = "agents";
export const GIT_TEXT_GENERATION_PROVIDER_SETTING = "gitTextGenerationProvider";
export const GIT_TEXT_GENERATION_CUSTOM_COMMAND_SETTING = "gitTextGenerationCustomCommand";
export const GIT_TEXT_GENERATION_AGENT_ID_SETTING = "gitTextGenerationAgentId";
export const FIND_PREVIOUS_SESSION_AGENT_ID_SETTING = "findPreviousSessionAgentId";
export const FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE_SETTING = "findPreviousSessionPromptTemplate";
export const GIT_SKIP_SUGGESTED_COMMIT_CONFIRMATION_SETTING = "gitSkipSuggestedCommitConfirmation";
export const TERMINAL_FONT_FAMILY_SETTING = "terminalFontFamily";
export const TERMINAL_FONT_SIZE_SETTING = "terminalFontSize";
export const T3_ZOOM_PERCENT_SETTING = "t3ZoomPercent";
export const TERMINAL_FONT_WEIGHT_SETTING = "terminalFontWeight";
export const TERMINAL_LINE_HEIGHT_SETTING = "terminalLineHeight";
export const TERMINAL_LETTER_SPACING_SETTING = "terminalLetterSpacing";
export const TERMINAL_CURSOR_STYLE_SETTING = "terminalCursorStyle";
export const TERMINAL_ENGINE_SETTING = "terminalEngine";
export const TERMINAL_SCROLL_TO_BOTTOM_WHEN_TYPING_SETTING = "terminalScrollToBottomWhenTyping";
export const MIN_TERMINAL_FONT_SIZE = 8;
export const MAX_TERMINAL_FONT_SIZE = 32;
export const DEFAULT_TERMINAL_FONT_SIZE = 13;
export const MIN_T3_ZOOM_PERCENT = 50;
export const MAX_T3_ZOOM_PERCENT = 200;
export const DEFAULT_T3_ZOOM_PERCENT = 100;
export const DEFAULT_TERMINAL_FONT_WEIGHT = 300;
export const WORKSPACE_PANE_GAP_SETTING = "workspacePaneGap";
export const WORKSPACE_ACTIVE_PANE_BORDER_COLOR_SETTING = "workspaceActivePaneBorderColor";
export const WORKSPACE_BACKGROUND_COLOR_SETTING = "workspaceBackgroundColor";
export const COMPLETION_BELL_ENABLED_KEY = "zmux.completionBellEnabled";
export const SCRATCH_PAD_CONTENT_KEY = "zmux.sidebarScratchPadContent";
export const NATIVE_TERMINAL_DEBUG_STATE_KEY = "zmux.nativeTerminalDebugState";
export const SIDEBAR_WELCOME_DISMISSED_KEY = "zmux.sidebarWelcomeDismissed";
export const SIDEBAR_LOCATION_IN_SECONDARY_KEY = "zmux.sidebarLocationInSecondary";
export const SESSIONS_VIEW_ID = "zmux.sessions";
export const PRIMARY_SESSIONS_CONTAINER_ID = "zmuxSessions";
export const SECONDARY_SESSIONS_CONTAINER_ID = "zmuxSessionsSecondary";
export const DEBUG_STATE_POLL_INTERVAL_MS = 500;
export const SIDEBAR_WELCOME_OK_LABEL = "OK";
export const WORKING_ACTIVITY_STALE_TIMEOUT_MS = 10_000;
export const COMMAND_TERMINAL_EXIT_POLL_MS = 250;

export type DefaultAgentCommandsSetting = Record<DefaultSidebarAgentId, string | null>;

const DEFAULT_AGENT_COMMANDS: DefaultAgentCommandsSetting = {
  claude: null,
  codex: null,
  copilot: null,
  gemini: null,
  opencode: null,
  t3: null,
};

export function getBackgroundSessionTimeoutConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING}`;
}

export function getAutoSleepTimeoutConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${AUTO_SLEEP_TIMEOUT_MINUTES_SETTING}`;
}

export function getBackgroundSessionTimeoutMinutes(): number {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING, 5) ?? 5
  );
}

export function getBackgroundSessionTimeoutMs(): number | null {
  const timeoutMinutes = getBackgroundSessionTimeoutMinutes();
  if (timeoutMinutes <= 0) {
    return null;
  }

  return Math.max(0, Math.round(timeoutMinutes * 60_000));
}

export function getAutoSleepTimeoutMinutes(): number {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(AUTO_SLEEP_TIMEOUT_MINUTES_SETTING, 20) ?? 20
  );
}

export function getAutoSleepTimeoutMs(): number | null {
  const timeoutMinutes = getAutoSleepTimeoutMinutes();
  if (timeoutMinutes <= 0) {
    return null;
  }

  return Math.max(0, Math.round(timeoutMinutes * 60_000));
}

export function getAutoOpenSidebarViewsOnStartupConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${AUTO_OPEN_SIDEBAR_VIEWS_ON_STARTUP_SETTING}`;
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

export function getActionCompletionSoundConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${ACTION_COMPLETION_SOUND_SETTING}`;
}

export function getShowLastInteractionTimeOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_LAST_INTERACTION_TIME_ON_SESSION_CARDS_SETTING}`;
}

export function getAgentsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${AGENTS_SETTING}`;
}

export function getDefaultAgentCommandsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${DEFAULT_AGENT_COMMANDS_SETTING}`;
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

export function getFindPreviousSessionAgentIdConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${FIND_PREVIOUS_SESSION_AGENT_ID_SETTING}`;
}

export function getFindPreviousSessionPromptTemplateConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE_SETTING}`;
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

export function getOpenPromptTempFilesInModalEditorConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${OPEN_PROMPT_TEMP_FILES_IN_MODAL_EDITOR_SETTING}`;
}

export function getShowHotkeysOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING}`;
}

export function getOpenPromptTempFilesInModalEditor(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(OPEN_PROMPT_TEMP_FILES_IN_MODAL_EDITOR_SETTING, true) ?? true
  );
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

export function getHideSidebarProjectHeader(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(HIDE_SIDEBAR_PROJECT_HEADER_SETTING, false) ?? false
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

export function getShowLastInteractionTimeOnSessionCards(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(SHOW_LAST_INTERACTION_TIME_ON_SESSION_CARDS_SETTING, false) ?? false
  );
}

export async function setShowLastInteractionTimeOnSessionCards(enabled: boolean): Promise<void> {
  const configuration = vscode.workspace.getConfiguration(SETTINGS_SECTION);
  const inspection = configuration.inspect<boolean>(
    SHOW_LAST_INTERACTION_TIME_ON_SESSION_CARDS_SETTING,
  );
  const target =
    inspection?.workspaceValue !== undefined
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;

  await configuration.update(SHOW_LAST_INTERACTION_TIME_ON_SESSION_CARDS_SETTING, enabled, target);
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

export function getAutoOpenSidebarViewsOnStartup(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(AUTO_OPEN_SIDEBAR_VIEWS_ON_STARTUP_SETTING, false) ?? false
  );
}

export function getCreateSessionOnSidebarDoubleClick(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(CREATE_SESSION_ON_SIDEBAR_DOUBLE_CLICK_SETTING, false) ?? false
  );
}

export function getRenameSessionOnDoubleClick(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(RENAME_SESSION_ON_DOUBLE_CLICK_SETTING, false) ?? false
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
      .get<string>(COMPLETION_SOUND_SETTING, "arcade") ?? "arcade";
  return clampCompletionSoundSetting(value);
}

export function getClampedActionCompletionSoundSetting(): CompletionSoundSetting {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(ACTION_COMPLETION_SOUND_SETTING, "shamisenreverb") ?? "shamisenreverb";
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

export function getDefaultAgentCommands(): DefaultAgentCommandsSetting {
  const candidate =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<unknown>(DEFAULT_AGENT_COMMANDS_SETTING, DEFAULT_AGENT_COMMANDS) ??
    DEFAULT_AGENT_COMMANDS;

  return {
    claude: normalizeDefaultAgentCommandValue(candidate, "claude"),
    codex: normalizeDefaultAgentCommandValue(candidate, "codex"),
    copilot: normalizeDefaultAgentCommandValue(candidate, "copilot"),
    gemini: normalizeDefaultAgentCommandValue(candidate, "gemini"),
    opencode: normalizeDefaultAgentCommandValue(candidate, "opencode"),
    t3: normalizeDefaultAgentCommandValue(candidate, "t3"),
  };
}

export function getDefaultAgentCommand(agentId: DefaultSidebarAgentId): string | undefined {
  return getDefaultAgentCommands()[agentId] ?? undefined;
}

export function getFindPreviousSessionAgentId(): string {
  const defaultAgentId = "codex";
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(FIND_PREVIOUS_SESSION_AGENT_ID_SETTING, defaultAgentId) ?? defaultAgentId;

  return value.trim() || defaultAgentId;
}

export function getFindPreviousSessionPromptTemplate(): string {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(
        FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE_SETTING,
        DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE,
      ) ?? DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE;

  return value.trim() || DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE;
}

export function getGitSkipSuggestedCommitConfirmation(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(GIT_SKIP_SUGGESTED_COMMIT_CONFIRMATION_SETTING, false) ?? false
  );
}

export function getTerminalFontFamily(): string {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(TERMINAL_FONT_FAMILY_SETTING, DEFAULT_TERMINAL_FONT_PRESET) ??
    DEFAULT_TERMINAL_FONT_PRESET;

  return getTerminalFontFamilyForPreset(normalizeTerminalFontPreset(value));
}

export function getTerminalFontSize(): number {
  const sharedValue = getSharedWorkspaceAppearancePreference("terminalFontSize");
  if (sharedValue !== undefined) {
    return clampTerminalFontSize(sharedValue);
  }

  const value =
    vscode.workspace.getConfiguration(SETTINGS_SECTION).inspect<number>(TERMINAL_FONT_SIZE_SETTING)
      ?.globalValue ?? DEFAULT_TERMINAL_FONT_SIZE;
  return clampTerminalFontSize(value);
}

export function getT3ZoomPercent(): number {
  const sharedValue = getSharedWorkspaceAppearancePreference("t3ZoomPercent");
  if (sharedValue !== undefined) {
    return clampT3ZoomPercent(sharedValue);
  }

  const value =
    vscode.workspace.getConfiguration(SETTINGS_SECTION).inspect<number>(T3_ZOOM_PERCENT_SETTING)
      ?.globalValue ?? DEFAULT_T3_ZOOM_PERCENT;
  return clampT3ZoomPercent(value);
}

export function getTerminalFontWeight(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(TERMINAL_FONT_WEIGHT_SETTING, DEFAULT_TERMINAL_FONT_WEIGHT) ??
    DEFAULT_TERMINAL_FONT_WEIGHT;
  return clampTerminalFontWeight(value);
}

export function clampTerminalFontWeight(value: number): number {
  return clampNumber(value, 100, 900, DEFAULT_TERMINAL_FONT_WEIGHT);
}

export function clampTerminalFontSize(value: number): number {
  return clampNumber(
    value,
    MIN_TERMINAL_FONT_SIZE,
    MAX_TERMINAL_FONT_SIZE,
    DEFAULT_TERMINAL_FONT_SIZE,
  );
}

export function clampT3ZoomPercent(value: number): number {
  return clampNumber(value, MIN_T3_ZOOM_PERCENT, MAX_T3_ZOOM_PERCENT, DEFAULT_T3_ZOOM_PERCENT);
}

export async function setTerminalFontSize(fontSize: number): Promise<void> {
  await setSharedWorkspaceAppearancePreference("terminalFontSize", clampTerminalFontSize(fontSize));
}

export async function resetTerminalFontSize(): Promise<void> {
  await clearSharedWorkspaceAppearancePreference("terminalFontSize");
}

export async function setT3ZoomPercent(zoomPercent: number): Promise<void> {
  await setSharedWorkspaceAppearancePreference("t3ZoomPercent", clampT3ZoomPercent(zoomPercent));
}

export async function resetT3ZoomPercent(): Promise<void> {
  await clearSharedWorkspaceAppearancePreference("t3ZoomPercent");
}

export function getTerminalLineHeight(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(TERMINAL_LINE_HEIGHT_SETTING, 1.1) ?? 1.1;
  return clampNumber(value, 0.8, 2, 1.1);
}

export function getTerminalLetterSpacing(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(TERMINAL_LETTER_SPACING_SETTING, 1.1) ?? 1.1;
  return clampNumber(value, -2, 8, 1.1);
}

export function getTerminalCursorStyle(): "bar" | "block" | "underline" {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(TERMINAL_CURSOR_STYLE_SETTING, "bar") ?? "bar";
  return value === "block" || value === "underline" ? value : "bar";
}

export function getTerminalCursorBlink(): boolean {
  return false;
}

export function getDefaultTerminalEngine(): TerminalEngine {
  return "ghostty-native";
}

export function getTerminalScrollToBottomWhenTyping(): boolean {
  return (
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<boolean>(TERMINAL_SCROLL_TO_BOTTOM_WHEN_TYPING_SETTING, true) ?? true
  );
}

export function getWorkspacePaneGap(): number {
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<number>(WORKSPACE_PANE_GAP_SETTING, 10) ?? 10;
  return clampNumber(value, 0, 48, 10);
}

export function getWorkspaceActivePaneBorderColor(): string {
  const defaultColor = "rgba(90, 134, 255, 0.95)";
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(WORKSPACE_ACTIVE_PANE_BORDER_COLOR_SETTING, defaultColor) ?? defaultColor;
  return value.trim() || defaultColor;
}

export function getWorkspaceBackgroundColor(): string {
  const defaultColor = "#121212";
  const value =
    vscode.workspace
      .getConfiguration(SETTINGS_SECTION)
      .get<string>(WORKSPACE_BACKGROUND_COLOR_SETTING, defaultColor) ?? defaultColor;
  return value.trim() || defaultColor;
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function normalizeDefaultAgentCommandValue(
  candidate: unknown,
  agentId: DefaultSidebarAgentId,
): string | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const value = (candidate as Partial<Record<DefaultSidebarAgentId, unknown>>)[agentId];
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue || null;
}
