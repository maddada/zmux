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
  getGhosttyFontFamilyForPreset,
  getTerminalFontFamilyForPreset,
  normalizeTerminalFontPreset,
} from "./terminal-font-preset";
import {
  DEFAULT_zmux_HOTKEYS,
  normalizezmuxHotkeySettings,
  type zmuxHotkeySettings,
} from "./zmux-hotkeys";
import { GHOSTTY_THEME_OPTIONS } from "./ghostty-theme-options";

export type GhosttyConfirmCloseSurface = "false" | "true" | "always";
export type GhosttyCopyOnSelect = "false" | "true" | "clipboard";
export type GhosttyScrollbar = "system" | "never";
export type TerminalCursorStyle = "bar" | "block" | "underline";
export type ZedOverlayTargetApp = "zed" | "zed-preview" | "vscode" | "vscode-insiders";
const MIN_GHOSTTY_MOUSE_SCROLL_MULTIPLIER = 0.25;
const MAX_GHOSTTY_MOUSE_SCROLL_MULTIPLIER = 8;
const MIN_GHOSTTY_SCROLLBACK_LIMIT_MB = 1;
const MAX_GHOSTTY_SCROLLBACK_LIMIT_MB = 200;

/**
 * CDXC:Branding 2026-04-26-20:16
 * The app name must be written exactly as "zmux" in user-facing copy,
 * storage/protocol names, file paths, and code identifiers so the product is
 * not split across legacy mixed-case or alternate-spelling variants.
 */
export type zmuxSettings = {
  actionCompletionSound: CompletionSoundSetting;
  agentManagerZoomPercent: number;
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
  terminalCursorStyleBlink: boolean;
  terminalEngine: TerminalEngine;
  terminalFontFamily: string;
  terminalFontSize: number;
  terminalFontWeight: number;
  terminalGhosttyTheme: string;
  terminalLetterSpacing: number;
  terminalLineHeight: number;
  terminalMouseScrollMultiplierDiscrete: number;
  terminalMouseScrollMultiplierPrecision: number;
  terminalScrollToBottomWhenTyping: boolean;
  terminalScrollbackLimitMb: number;
  terminalCopyOnSelect: GhosttyCopyOnSelect;
  terminalConfirmCloseSurface: GhosttyConfirmCloseSurface;
  terminalClipboardTrimTrailingSpaces: boolean;
  terminalClipboardPasteProtection: boolean;
  terminalMouseHideWhileTyping: boolean;
  terminalScrollbar: GhosttyScrollbar;
  hotkeys: zmuxHotkeySettings;
  workspaceActivePaneBorderColor: string;
  workspaceBackgroundColor: string;
  workspacePaneGap: number;
  syncOpenProjectWithZed: boolean;
  zedOverlayEnabled: boolean;
  zedOverlayTargetApp: ZedOverlayTargetApp;
};

/**
 * CDXC:IDEAttachment 2026-04-26-22:38
 * Users can attach zmux to the IDE selected in settings. Keep the existing
 * persisted Zed overlay keys for compatibility while widening the target list
 * to include VS Code and VS Code Insiders.
 */
export const DEFAULT_zmux_SETTINGS: zmuxSettings = {
  actionCompletionSound: "shamisenreverb",
  agentManagerZoomPercent: DEFAULT_AGENT_MANAGER_ZOOM_PERCENT,
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
  terminalCursorStyleBlink: true,
  terminalEngine: "ghostty-native",
  terminalFontFamily: "",
  terminalFontSize: 13,
  terminalFontWeight: 400,
  terminalGhosttyTheme: "",
  terminalLetterSpacing: 0,
  terminalLineHeight: 1,
  terminalMouseScrollMultiplierDiscrete: 3,
  terminalMouseScrollMultiplierPrecision: 1,
  terminalScrollToBottomWhenTyping: true,
  terminalScrollbackLimitMb: 10,
  terminalCopyOnSelect: "true",
  terminalConfirmCloseSurface: "true",
  terminalClipboardTrimTrailingSpaces: true,
  terminalClipboardPasteProtection: true,
  terminalMouseHideWhileTyping: false,
  terminalScrollbar: "system",
  hotkeys: DEFAULT_zmux_HOTKEYS,
  workspaceActivePaneBorderColor: "#3b82f6",
  workspaceBackgroundColor: "#121212",
  workspacePaneGap: 12,
  syncOpenProjectWithZed: true,
  zedOverlayEnabled: false,
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

export const GHOSTTY_COPY_ON_SELECT_OPTIONS: ReadonlyArray<{
  label: string;
  value: GhosttyCopyOnSelect;
}> = [
  { label: "Off", value: "false" },
  { label: "Selection clipboard", value: "true" },
  { label: "System and selection clipboard", value: "clipboard" },
];

export const GHOSTTY_CONFIRM_CLOSE_SURFACE_OPTIONS: ReadonlyArray<{
  label: string;
  value: GhosttyConfirmCloseSurface;
}> = [
  { label: "Smart confirmation", value: "true" },
  { label: "Always confirm", value: "always" },
  { label: "Do not confirm", value: "false" },
];

export const GHOSTTY_SCROLLBAR_OPTIONS: ReadonlyArray<{
  label: string;
  value: GhosttyScrollbar;
}> = [
  { label: "System", value: "system" },
  { label: "Never", value: "never" },
];

export const GHOSTTY_THEME_SETTING_OPTIONS: ReadonlyArray<{
  label: string;
  value: string;
}> = [
  /**
   * CDXC:TerminalThemeSettings 2026-04-29-09:32
   * Users may already manage Ghostty themes directly in their Ghostty config.
   * The sentinel value lets zmux leave any existing `theme` line untouched
   * until the user deliberately chooses a bundled theme from this modal.
   */
  { label: "Use existing Ghostty config", value: "__zmux_ghostty_theme_unmanaged__" },
  ...GHOSTTY_THEME_OPTIONS.map((theme) => ({ label: theme, value: theme })),
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
    terminalCursorStyleBlink: readBoolean(
      source,
      "terminalCursorStyleBlink",
      DEFAULT_zmux_SETTINGS.terminalCursorStyleBlink,
    ),
    terminalEngine: normalizeTerminalEngine(
      readString(source, "terminalEngine", DEFAULT_zmux_SETTINGS.terminalEngine),
    ),
    /**
     * CDXC:TerminalTypographySettings 2026-04-29-09:32
     * Font family is a raw Ghostty font-family string so users can type any
     * installed font from `ghostty +list-fonts`. Empty means zmux leaves an
     * existing Ghostty font-family line or Ghostty's platform default in charge.
     * Legacy preset labels are converted to their Ghostty family name.
     */
    terminalFontFamily: normalizeGhosttyFontFamily(
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
    /**
     * CDXC:TerminalThemeSettings 2026-04-29-09:32
     * Ghostty themes are exact strings. Preserve only bundled theme names from
     * the settings list, or an empty unmanaged value that keeps an existing
     * user-authored Ghostty `theme` line outside zmux control.
     */
    terminalGhosttyTheme: normalizeGhosttyTheme(
      readString(source, "terminalGhosttyTheme", DEFAULT_zmux_SETTINGS.terminalGhosttyTheme),
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
     * CDXC:TerminalBehaviorSettings 2026-04-29-09:32
     * Common Ghostty terminal behavior settings are persisted with the same
     * practical UI ranges and enum values that the settings modal exposes,
     * then written as documented Ghostty config keys by the native host.
     */
    terminalScrollbackLimitMb: clampNumber(
      readNumber(
        source,
        "terminalScrollbackLimitMb",
        DEFAULT_zmux_SETTINGS.terminalScrollbackLimitMb,
      ),
      MIN_GHOSTTY_SCROLLBACK_LIMIT_MB,
      MAX_GHOSTTY_SCROLLBACK_LIMIT_MB,
      DEFAULT_zmux_SETTINGS.terminalScrollbackLimitMb,
    ),
    terminalCopyOnSelect: normalizeGhosttyCopyOnSelect(
      readString(source, "terminalCopyOnSelect", DEFAULT_zmux_SETTINGS.terminalCopyOnSelect),
    ),
    terminalConfirmCloseSurface: normalizeGhosttyConfirmCloseSurface(
      readString(
        source,
        "terminalConfirmCloseSurface",
        DEFAULT_zmux_SETTINGS.terminalConfirmCloseSurface,
      ),
    ),
    /**
     * CDXC:TerminalBehaviorSettings 2026-04-29-09:32
     * Clipboard cleanup/protection and mouse/scrollbar visibility mirror
     * Ghostty's documented defaults unless the user changes them in zmux.
     */
    terminalClipboardTrimTrailingSpaces: readBoolean(
      source,
      "terminalClipboardTrimTrailingSpaces",
      DEFAULT_zmux_SETTINGS.terminalClipboardTrimTrailingSpaces,
    ),
    terminalClipboardPasteProtection: readBoolean(
      source,
      "terminalClipboardPasteProtection",
      DEFAULT_zmux_SETTINGS.terminalClipboardPasteProtection,
    ),
    terminalMouseHideWhileTyping: readBoolean(
      source,
      "terminalMouseHideWhileTyping",
      DEFAULT_zmux_SETTINGS.terminalMouseHideWhileTyping,
    ),
    terminalScrollbar: normalizeGhosttyScrollbar(
      readString(source, "terminalScrollbar", DEFAULT_zmux_SETTINGS.terminalScrollbar),
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
    zedOverlayTargetApp: normalizeZedOverlayTargetApp(
      readString(source, "zedOverlayTargetApp", DEFAULT_zmux_SETTINGS.zedOverlayTargetApp),
    ),
  };
}

export function getTerminalFontFamilyForzmuxSettings(settings: zmuxSettings): string {
  return settings.terminalFontFamily.trim() || getTerminalFontFamilyForPreset("JetBrains Mono");
}

function normalizeTerminalCursorStyle(value: string | undefined): TerminalCursorStyle {
  return value === "block" || value === "underline" ? value : "bar";
}

function normalizeGhosttyTheme(value: string | undefined): string {
  if (!value || value === "__zmux_ghostty_theme_unmanaged__") {
    return "";
  }
  return (GHOSTTY_THEME_OPTIONS as readonly string[]).includes(value) ? value : "";
}

function normalizeGhosttyFontFamily(value: string | undefined): string {
  const trimmedValue = (value ?? "").trim();
  if (!trimmedValue) {
    return "";
  }
  const legacyPreset = normalizeTerminalFontPreset(trimmedValue);
  if (legacyPreset === trimmedValue) {
    return getGhosttyFontFamilyForPreset(legacyPreset);
  }
  return trimmedValue;
}

function normalizeGhosttyCopyOnSelect(value: string | undefined): GhosttyCopyOnSelect {
  return value === "false" || value === "clipboard" ? value : "true";
}

function normalizeGhosttyConfirmCloseSurface(
  value: string | undefined,
): GhosttyConfirmCloseSurface {
  return value === "false" || value === "always" ? value : "true";
}

function normalizeGhosttyScrollbar(value: string | undefined): GhosttyScrollbar {
  return value === "never" ? "never" : "system";
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
