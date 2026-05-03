import {
  DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
  type SidebarThemeSetting,
  type TerminalEngine,
} from "./session-grid-contract-core";
import {
  clampAgentManagerZoomPercent,
  clampSidebarThemeSetting,
  normalizeTerminalEngine,
} from "./session-grid-contract-session";
import {
  clampCompletionSoundSetting,
  DEFAULT_COMPLETION_SOUND,
  type CompletionSoundSetting,
} from "./completion-sound";
import {
  DEFAULT_TERMINAL_FONT_PRESET,
  getTerminalFontFamilyForPreset,
  normalizeTerminalFontPreset,
  type TerminalFontPreset,
} from "./terminal-font-preset";
import {
  DEFAULT_zmux_HOTKEYS,
  normalizezmuxHotkeySettings,
  type zmuxHotkeySettings,
} from "./zmux-hotkeys";

export type TerminalCursorStyle = "bar" | "block" | "underline";
export type BrowserOpenMode = "chrome-canary" | "browser-pane";
export type ZedOverlayTargetApp = "zed" | "zed-preview" | "vscode" | "vscode-insiders";
const MIN_GHOSTTY_MOUSE_SCROLL_MULTIPLIER = 0.25;
const MAX_GHOSTTY_MOUSE_SCROLL_MULTIPLIER = 8;

/**
 * CDXC:Branding 2026-04-26-20:16
 * The app name must be written exactly as "zmux" in user-facing copy,
 * storage/protocol names, file paths, and code identifiers so the product is
 * not split across legacy mixed-case or alternate-spelling variants.
 */
export type zmuxSettings = {
  actionCompletionSound: CompletionSoundSetting;
  agentManagerZoomPercent: number;
  browserOpenMode: BrowserOpenMode;
  completionBellEnabled: boolean;
  completionSound: CompletionSoundSetting;
  createSessionOnSidebarDoubleClick: boolean;
  debuggingMode: boolean;
  renameSessionOnDoubleClick: boolean;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  showLastInteractionTimeOnSessionCards: boolean;
  showSidebarActions: boolean;
  showSidebarAgents: boolean;
  showSidebarGitButton: boolean;
  sidebarTheme: SidebarThemeSetting;
  terminalCursorStyle: TerminalCursorStyle;
  terminalEngine: TerminalEngine;
  terminalFontFamily: TerminalFontPreset;
  terminalFontSize: number;
  terminalFontWeight: number;
  terminalLetterSpacing: number;
  terminalLineHeight: number;
  terminalMouseScrollMultiplierDiscrete: number;
  terminalMouseScrollMultiplierPrecision: number;
  terminalScrollToBottomWhenTyping: boolean;
  hotkeys: zmuxHotkeySettings;
  workspaceActivePaneBorderColor: string;
  workspaceBackgroundColor: string;
  workspacePaneGap: number;
  syncOpenProjectWithZed: boolean;
  zedOverlayEnabled: boolean;
  zedOverlayHideTitlebarButton: boolean;
  zedOverlayTargetApp: ZedOverlayTargetApp;
};

/**
 * CDXC:IDEAttachment 2026-04-26-22:38
 * Users can attach zmux to the IDE selected in settings. Keep the existing
 * persisted Zed overlay keys for compatibility while widening the target list
 * to include VS Code and VS Code Insiders.
 *
 * CDXC:IDEAttachment 2026-05-01-13:52
 * The native title-bar Attach/Detach IDE button remains visible by default,
 * but users can hide it from Settings without disabling IDE attachment.
 */
export const DEFAULT_zmux_SETTINGS: zmuxSettings = {
  actionCompletionSound: "shamisenreverb",
  agentManagerZoomPercent: DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
  /**
   * CDXC:BrowserPanes 2026-05-02-06:35
   * Browser-pane support is opt-in so existing installs keep launching browser
   * actions through the established Chrome Canary placement flow until the user
   * chooses in-app browser panes from Settings.
   */
  browserOpenMode: "chrome-canary",
  completionBellEnabled: false,
  completionSound: DEFAULT_COMPLETION_SOUND,
  createSessionOnSidebarDoubleClick: false,
  debuggingMode: false,
  renameSessionOnDoubleClick: false,
  showCloseButtonOnSessionCards: false,
  showHotkeysOnSessionCards: false,
  showLastInteractionTimeOnSessionCards: false,
  showSidebarActions: true,
  showSidebarAgents: true,
  showSidebarGitButton: true,
  sidebarTheme: "auto",
  terminalCursorStyle: "bar",
  terminalEngine: "ghostty-native",
  terminalFontFamily: DEFAULT_TERMINAL_FONT_PRESET,
  terminalFontSize: 13,
  terminalFontWeight: 300,
  terminalLetterSpacing: 0,
  terminalLineHeight: 1.2,
  terminalMouseScrollMultiplierDiscrete: 3,
  terminalMouseScrollMultiplierPrecision: 1,
  terminalScrollToBottomWhenTyping: true,
  hotkeys: DEFAULT_zmux_HOTKEYS,
  workspaceActivePaneBorderColor: "#3b82f6",
  workspaceBackgroundColor: "#121212",
  workspacePaneGap: 12,
  syncOpenProjectWithZed: true,
  zedOverlayEnabled: false,
  zedOverlayHideTitlebarButton: false,
  zedOverlayTargetApp: "zed-preview",
};

export const SIDEBAR_THEME_SETTING_OPTIONS: ReadonlyArray<{
  label: string;
  value: SidebarThemeSetting;
}> = [
  { label: "Auto", value: "auto" },
  /**
   * CDXC:SidebarTheme 2026-04-26-21:32: Keep the persisted value as "plain"
   * for compatibility, but present it as Dark Gray because the option now
   * always selects the dark gray sidebar palette.
   */
  { label: "Dark Gray", value: "plain" },
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

export const TERMINAL_ENGINE_SETTING_OPTIONS: ReadonlyArray<{
  label: string;
  value: TerminalEngine;
}> = [{ label: "Ghostty Native", value: "ghostty-native" }];

export const BROWSER_OPEN_MODE_OPTIONS: ReadonlyArray<{
  label: string;
  value: BrowserOpenMode;
}> = [
  { label: "Chrome Canary", value: "chrome-canary" },
  { label: "Browser Panes", value: "browser-pane" },
];

export const ZED_OVERLAY_TARGET_APP_OPTIONS: ReadonlyArray<{
  label: string;
  value: ZedOverlayTargetApp;
}> = [
  { label: "Zed", value: "zed" },
  /**
   * CDXC:IDEAttachment 2026-04-28-00:05
   * Settings must distinguish regular Zed from Zed Preview because the
   * attach target is persisted separately from the shortened title-bar labels.
   */
  { label: "Zed Preview", value: "zed-preview" },
  { label: "VS Code", value: "vscode" },
  { label: "VS Code Insiders", value: "vscode-insiders" },
];

export function normalizezmuxSettings(candidate: unknown): zmuxSettings {
  const source = isRecord(candidate) ? candidate : {};
  return {
    actionCompletionSound: clampCompletionSoundSetting(
      readString(source, "actionCompletionSound", DEFAULT_zmux_SETTINGS.actionCompletionSound),
    ),
    agentManagerZoomPercent: clampAgentManagerZoomPercent(
      readNumber(source, "agentManagerZoomPercent", DEFAULT_zmux_SETTINGS.agentManagerZoomPercent),
    ),
    /**
     * CDXC:BrowserPanes 2026-05-02-06:35
     * The setting chooses the browser action target: Chrome Canary keeps the
     * native external browser integration, while Browser Panes creates normal
     * workspace session cards backed by native WKWebView panes.
     */
    browserOpenMode: normalizeBrowserOpenMode(
      readString(source, "browserOpenMode", DEFAULT_zmux_SETTINGS.browserOpenMode),
    ),
    completionBellEnabled: readBoolean(
      source,
      "completionBellEnabled",
      DEFAULT_zmux_SETTINGS.completionBellEnabled,
    ),
    completionSound: clampCompletionSoundSetting(
      readString(source, "completionSound", DEFAULT_zmux_SETTINGS.completionSound),
    ),
    createSessionOnSidebarDoubleClick: readBoolean(
      source,
      "createSessionOnSidebarDoubleClick",
      DEFAULT_zmux_SETTINGS.createSessionOnSidebarDoubleClick,
    ),
    debuggingMode: readBoolean(source, "debuggingMode", DEFAULT_zmux_SETTINGS.debuggingMode),
    renameSessionOnDoubleClick: readBoolean(
      source,
      "renameSessionOnDoubleClick",
      DEFAULT_zmux_SETTINGS.renameSessionOnDoubleClick,
    ),
    showCloseButtonOnSessionCards: readBoolean(
      source,
      "showCloseButtonOnSessionCards",
      DEFAULT_zmux_SETTINGS.showCloseButtonOnSessionCards,
    ),
    showHotkeysOnSessionCards: readBoolean(
      source,
      "showHotkeysOnSessionCards",
      DEFAULT_zmux_SETTINGS.showHotkeysOnSessionCards,
    ),
    showLastInteractionTimeOnSessionCards: readBoolean(
      source,
      "showLastInteractionTimeOnSessionCards",
      DEFAULT_zmux_SETTINGS.showLastInteractionTimeOnSessionCards,
    ),
    showSidebarActions: readBoolean(
      source,
      "showSidebarActions",
      DEFAULT_zmux_SETTINGS.showSidebarActions,
    ),
    showSidebarAgents: readBoolean(
      source,
      "showSidebarAgents",
      DEFAULT_zmux_SETTINGS.showSidebarAgents,
    ),
    showSidebarGitButton: readBoolean(
      source,
      "showSidebarGitButton",
      DEFAULT_zmux_SETTINGS.showSidebarGitButton,
    ),
    sidebarTheme: clampSidebarThemeSetting(
      readString(source, "sidebarTheme", DEFAULT_zmux_SETTINGS.sidebarTheme),
    ),
    terminalCursorStyle: normalizeTerminalCursorStyle(
      readString(source, "terminalCursorStyle", DEFAULT_zmux_SETTINGS.terminalCursorStyle),
    ),
    terminalEngine: normalizeTerminalEngine(
      readString(source, "terminalEngine", DEFAULT_zmux_SETTINGS.terminalEngine),
    ),
    terminalFontFamily: normalizeTerminalFontPreset(
      readString(source, "terminalFontFamily", DEFAULT_zmux_SETTINGS.terminalFontFamily),
    ),
    terminalFontSize: clampNumber(
      readNumber(source, "terminalFontSize", DEFAULT_zmux_SETTINGS.terminalFontSize),
      8,
      32,
      DEFAULT_zmux_SETTINGS.terminalFontSize,
    ),
    terminalFontWeight: clampNumber(
      readNumber(source, "terminalFontWeight", DEFAULT_zmux_SETTINGS.terminalFontWeight),
      100,
      900,
      DEFAULT_zmux_SETTINGS.terminalFontWeight,
    ),
    terminalLetterSpacing: clampNumber(
      readNumber(source, "terminalLetterSpacing", DEFAULT_zmux_SETTINGS.terminalLetterSpacing),
      -2,
      8,
      DEFAULT_zmux_SETTINGS.terminalLetterSpacing,
    ),
    terminalLineHeight: clampNumber(
      readNumber(source, "terminalLineHeight", DEFAULT_zmux_SETTINGS.terminalLineHeight),
      0.8,
      2,
      DEFAULT_zmux_SETTINGS.terminalLineHeight,
    ),
    /**
     * CDXC:TerminalScrollSettings 2026-04-29-08:56
     * Ghostty exposes mouse wheel speed through mouse-scroll-multiplier with
     * separate precision and discrete device prefixes. Store both values so
     * trackpads and notched mouse wheels can be tuned independently while
     * matching the settings modal's 0.25-step practical range. Ghostty accepts
     * 0.01..10000, but those extremes are intentionally not exposed because
     * the docs warn they produce a bad experience.
     */
    terminalMouseScrollMultiplierDiscrete: clampNumber(
      readNumber(
        source,
        "terminalMouseScrollMultiplierDiscrete",
        DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierDiscrete,
      ),
      MIN_GHOSTTY_MOUSE_SCROLL_MULTIPLIER,
      MAX_GHOSTTY_MOUSE_SCROLL_MULTIPLIER,
      DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierDiscrete,
    ),
    terminalMouseScrollMultiplierPrecision: clampNumber(
      readNumber(
        source,
        "terminalMouseScrollMultiplierPrecision",
        DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierPrecision,
      ),
      MIN_GHOSTTY_MOUSE_SCROLL_MULTIPLIER,
      MAX_GHOSTTY_MOUSE_SCROLL_MULTIPLIER,
      DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierPrecision,
    ),
    terminalScrollToBottomWhenTyping: readBoolean(
      source,
      "terminalScrollToBottomWhenTyping",
      DEFAULT_zmux_SETTINGS.terminalScrollToBottomWhenTyping,
    ),
    /**
     * CDXC:Hotkeys 2026-04-28-05:20
     * User-defined app shortcuts are normalized with defaults on every settings
     * read so older settings files gain configurable native hotkeys without a
     * migration or fallback execution path.
     */
    hotkeys: normalizezmuxHotkeySettings(source.hotkeys),
    workspaceActivePaneBorderColor:
      readString(
        source,
        "workspaceActivePaneBorderColor",
        DEFAULT_zmux_SETTINGS.workspaceActivePaneBorderColor,
      ).trim() || DEFAULT_zmux_SETTINGS.workspaceActivePaneBorderColor,
    /**
     * CDXC:WorkspaceLayout 2026-04-28-06:08
     * Users can choose the background visible behind terminal panes. Persist a
     * normalized CSS color string so the React workspace and native AppKit
     * workspace render the same color instead of hardcoding dark gray.
     */
    workspaceBackgroundColor:
      readString(source, "workspaceBackgroundColor", DEFAULT_zmux_SETTINGS.workspaceBackgroundColor)
        .trim() || DEFAULT_zmux_SETTINGS.workspaceBackgroundColor,
    workspacePaneGap: clampNumber(
      readNumber(source, "workspacePaneGap", DEFAULT_zmux_SETTINGS.workspacePaneGap),
      0,
      48,
      DEFAULT_zmux_SETTINGS.workspacePaneGap,
    ),
    /**
     * CDXC:ZedOverlayWorkspace 2026-04-28-05:18
     * Project-to-Zed syncing is a user-facing behavior setting and defaults
     * on, so switching zmux workspaces can drive the editor project after the
     * sidebar's debounce instead of doing that work from the Show Zed button.
     */
    syncOpenProjectWithZed: readBoolean(
      source,
      "syncOpenProjectWithZed",
      DEFAULT_zmux_SETTINGS.syncOpenProjectWithZed,
    ),
    zedOverlayEnabled: readBoolean(
      source,
      "zedOverlayEnabled",
      DEFAULT_zmux_SETTINGS.zedOverlayEnabled,
    ),
    zedOverlayHideTitlebarButton: readBoolean(
      source,
      "zedOverlayHideTitlebarButton",
      DEFAULT_zmux_SETTINGS.zedOverlayHideTitlebarButton,
    ),
    zedOverlayTargetApp: normalizeZedOverlayTargetApp(
      readString(source, "zedOverlayTargetApp", DEFAULT_zmux_SETTINGS.zedOverlayTargetApp),
    ),
  };
}

export function getTerminalFontFamilyForzmuxSettings(settings: zmuxSettings): string {
  return getTerminalFontFamilyForPreset(settings.terminalFontFamily);
}

function normalizeTerminalCursorStyle(value: string | undefined): TerminalCursorStyle {
  return value === "block" || value === "underline" ? value : "bar";
}

function normalizeBrowserOpenMode(value: string | undefined): BrowserOpenMode {
  return value === "browser-pane" ? "browser-pane" : DEFAULT_zmux_SETTINGS.browserOpenMode;
}

function normalizeZedOverlayTargetApp(value: string | undefined): ZedOverlayTargetApp {
  return value === "zed" ||
    value === "zed-preview" ||
    value === "vscode" ||
    value === "vscode-insiders"
    ? value
    : DEFAULT_zmux_SETTINGS.zedOverlayTargetApp;
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(
  source: Record<string, unknown>,
  key: keyof zmuxSettings,
  fallback: boolean,
): boolean {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(
  source: Record<string, unknown>,
  key: keyof zmuxSettings,
  fallback: number,
): number {
  const value = source[key];
  return typeof value === "number" ? value : fallback;
}

function readString(
  source: Record<string, unknown>,
  key: keyof zmuxSettings,
  fallback: string,
): string {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
}
