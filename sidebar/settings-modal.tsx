import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Fuse from "fuse.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { COMPLETION_SOUND_OPTIONS, type CompletionSoundSetting } from "../shared/completion-sound";
import { TERMINAL_FONT_PRESETS, type TerminalFontPreset } from "../shared/terminal-font-preset";
import { ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES } from "../shared/ghostty-config-actions";
import {
  resolveSidebarTheme,
  type SidebarTheme,
  type SidebarThemeSetting,
  type SidebarThemeVariant,
} from "../shared/session-grid-contract";
import {
  BROWSER_OPEN_MODE_OPTIONS,
  DEFAULT_zmux_SETTINGS,
  SESSION_PERSISTENCE_PROVIDER_OPTIONS,
  SIDEBAR_MODE_OPTIONS,
  SIDEBAR_THEME_SETTING_OPTIONS,
  ZED_OVERLAY_TARGET_APP_OPTIONS,
  normalizezmuxSettings,
  type BrowserOpenMode,
  type SessionPersistenceProvider,
  type SidebarMode,
  type TerminalCursorStyle,
  type ZedOverlayTargetApp,
  type zmuxSettings,
} from "../shared/zmux-settings";

const NUMERIC_SETTINGS_DEBOUNCE_MS = 180;

type SettingSearchDefinition = {
  key: string;
  options?: ReadonlyArray<{ label: string; value: string }>;
  subtitle?: string;
  title: string;
};

type SettingsSectionSearchResult = {
  isSearching: boolean;
  sectionMatches: boolean;
  visibleSettingKeys: Set<string>;
};

export type GhosttySettingsAction =
  | "applyRecommendedGhosttySettings"
  | "openGhosttyConfigFile"
  | "openGhosttySettingsDocs"
  | "resetGhosttySettingsToDefault";

export type SettingsModalProps = {
  accessibilityPermissionGranted?: boolean;
  isOpen: boolean;
  onChange: (settings: zmuxSettings) => void;
  onClose: () => void;
  onGhosttySettingsAction?: (action: GhosttySettingsAction) => void;
  settings?: zmuxSettings;
  theme?: SidebarTheme;
};

export function SettingsModal({
  accessibilityPermissionGranted,
  isOpen,
  onChange,
  onClose,
  onGhosttySettingsAction,
  settings,
  theme = "dark-blue",
}: SettingsModalProps) {
  const [draft, setDraft] = useState<zmuxSettings>(normalizezmuxSettings(settings));
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const pendingSettingsRef = useRef<zmuxSettings | undefined>(undefined);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const modalTheme = resolveSidebarTheme(draft.sidebarTheme, getSidebarThemeVariant(theme));
  const terminalFontOptions = useMemo(
    () =>
      TERMINAL_FONT_PRESETS.map((preset) => ({
        label: preset.preset,
        value: preset.preset,
      })),
    [],
  );

  /**
   * CDXC:SettingsSearch 2026-05-04-02:30
   * Settings search must be fuzzy and cover section titles, setting subtitles,
   * and selectable option text so users can find controls by the value they
   * want to choose, not only by the visible setting label.
   */
  const settingsSearch = {
    browser: getSettingsSectionSearch(settingsSearchQuery, "Browser", [
      {
        key: "browserOpenMode",
        options: BROWSER_OPEN_MODE_OPTIONS,
        subtitle: "Choose where browser actions open URLs.",
        title: "Open URLs With",
      },
    ]),
    ideAttachment: getSettingsSectionSearch(settingsSearchQuery, "IDE Attachment", [
      {
        key: "zedOverlayEnabled",
        subtitle: "Attach zmux as an overlay to the selected IDE.",
        title: "Attach zmux to IDE",
      },
      {
        key: "zedOverlayHideTitlebarButton",
        subtitle: "Hide the native Attach/Detach IDE button from the zmux title bar.",
        title: "Hide title-bar attach button",
      },
      {
        key: "zedOverlayTargetApp",
        options: ZED_OVERLAY_TARGET_APP_OPTIONS,
        subtitle: "Select which IDE should receive the overlay.",
        title: "Target IDE",
      },
      {
        key: "syncOpenProjectWithZed",
        subtitle: "Open the active zmux project in Zed after switching workspaces.",
        title: "Sync open project with Zed",
      },
    ]),
    sessionCards: getSettingsSectionSearch(settingsSearchQuery, "Session Cards", [
      {
        key: "showCloseButtonOnSessionCards",
        subtitle: "Reveal the close control when hovering a card.",
        title: "Show close button on hover",
      },
      {
        key: "showHotkeysOnSessionCards",
        subtitle: "Display card shortcuts where available.",
        title: "Show hotkeys on cards",
      },
      {
        key: "showLastInteractionTimeOnSessionCards",
        subtitle: "Choose Last Active as the default trailing card detail instead of Agent Icon.",
        title: "Use Last Active instead of Agent Icon",
      },
    ]),
    sidebar: getSettingsSectionSearch(settingsSearchQuery, "Sidebar", [
      {
        key: "sidebarMode",
        options: SIDEBAR_MODE_OPTIONS,
        subtitle: "Choose how project sessions are grouped.",
        title: "Mode",
      },
      {
        key: "sidebarTheme",
        options: SIDEBAR_THEME_SETTING_OPTIONS,
        subtitle: "Choose the sidebar color scheme.",
        title: "Theme",
      },
      {
        key: "agentManagerZoomPercent",
        subtitle: "Scale the agent manager UI.",
        title: "Agent Manager Zoom",
      },
      {
        key: "showSidebarActions",
        subtitle: "Show the command and action launcher.",
        title: "Show Actions section",
      },
      {
        key: "showSidebarAgents",
        subtitle: "Show active agent sessions.",
        title: "Show Agents section",
      },
      {
        key: "showSidebarGitButton",
        subtitle: "Show git tools in the sidebar toolbar.",
        title: "Show Git button",
      },
      {
        key: "createSessionOnSidebarDoubleClick",
        subtitle: "Create a session from empty sidebar space.",
        title: "Double-click empty sidebar space to create a session",
      },
      {
        key: "renameSessionOnDoubleClick",
        subtitle: "Rename sessions directly from their cards.",
        title: "Double-click session cards to rename",
      },
    ]),
    sounds: getSettingsSectionSearch(settingsSearchQuery, "Sounds", [
      {
        key: "completionBellEnabled",
        subtitle: "Play a completion sound when work finishes.",
        title: "Enable completion bell",
      },
      {
        key: "completionSound",
        options: COMPLETION_SOUND_OPTIONS,
        subtitle: "Sound for terminal completions.",
        title: "Completion Sound",
      },
      {
        key: "actionCompletionSound",
        options: COMPLETION_SOUND_OPTIONS,
        subtitle: "Sound for action completions.",
        title: "Action Completion Sound",
      },
    ]),
    terminal: getSettingsSectionSearch(settingsSearchQuery, "Terminal", [
      {
        key: "ghosttySettingsActions",
        options: [
          { label: "Apply recommended", value: "applyRecommendedGhosttySettings" },
          { label: "Open Ghostty config", value: "openGhosttyConfigFile" },
          { label: "Open Ghostty docs", value: "openGhosttySettingsDocs" },
          { label: "Reset Ghostty defaults", value: "resetGhosttySettingsToDefault" },
        ],
        subtitle:
          "Recommended Ghostty settings, Ghostty config file, Ghostty docs, and Ghostty defaults.",
        title: "Ghostty settings actions",
      },
      {
        key: "terminalFontFamily",
        options: terminalFontOptions,
        subtitle: "Pick the terminal typeface.",
        title: "Font Family",
      },
      {
        key: "terminalFontSize",
        subtitle: "Set terminal text size.",
        title: "Font Size",
      },
      {
        key: "terminalFontWeight",
        subtitle: "Set terminal text weight.",
        title: "Font Weight",
      },
      {
        key: "terminalLineHeight",
        subtitle: "Adjust terminal row height.",
        title: "Line Height",
      },
      {
        key: "terminalLetterSpacing",
        subtitle: "Adjust spacing between glyphs.",
        title: "Letter Spacing",
      },
      {
        key: "terminalCursorStyle",
        options: [
          { label: "Line", value: "bar" },
          { label: "Block", value: "block" },
          { label: "Underline", value: "underline" },
        ],
        subtitle: "Choose the cursor shape.",
        title: "Cursor Style",
      },
      {
        key: "sessionPersistenceProvider",
        options: SESSION_PERSISTENCE_PROVIDER_OPTIONS,
        subtitle: "Choose Off, tmux, or zmx for restart-safe terminal sessions.",
        title: "Session Persistence",
      },
    ]),
    terminalScrolling: getSettingsSectionSearch(settingsSearchQuery, "Terminal Scrolling", [
      {
        key: "terminalMouseScrollMultiplierPrecision",
        subtitle: "Trackpads and high-resolution scroll wheels. Ghostty default is 1.",
        title: "Precision scroll multiplier",
      },
      {
        key: "terminalMouseScrollMultiplierDiscrete",
        subtitle: "Traditional notched mouse wheels. Ghostty default is 3.",
        title: "Discrete scroll multiplier",
      },
      {
        key: "terminalScrollToBottomWhenTyping",
        subtitle: "Keep the prompt visible while typing.",
        title: "Scroll to bottom when typing",
      },
    ]),
    workspace: getSettingsSectionSearch(settingsSearchQuery, "Workspace", [
      {
        key: "workspacePaneGap",
        subtitle: "Control spacing between panes.",
        title: "Pane Gap",
      },
      {
        key: "workspaceActivePaneBorderColor",
        subtitle: "CSS color for the focused pane border.",
        title: "Active Pane Border",
      },
      {
        key: "workspaceBackgroundColor",
        subtitle: "Color shown behind terminal panes.",
        title: "Terminal Background",
      },
      {
        key: "debuggingMode",
        subtitle: "Expose debugging-only sidebar controls.",
        title: "Show debugging UI",
      },
    ]),
  };
  const hasVisibleSettings = Object.values(settingsSearch).some(hasVisibleSettingsSearchResult);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraft(normalizezmuxSettings(settings));
  }, [isOpen, settings]);

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  const clearPendingSettings = () => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = undefined;
    }
  };

  const flushPendingSettings = () => {
    clearPendingSettings();
    const pendingSettings = pendingSettingsRef.current;
    pendingSettingsRef.current = undefined;
    if (pendingSettings) {
      onChange(pendingSettings);
    }
  };

  const applySettings = (nextSettings: zmuxSettings) => {
    const normalizedSettings = normalizezmuxSettings(nextSettings);
    clearPendingSettings();
    pendingSettingsRef.current = undefined;
    setDraft(normalizedSettings);
    onChange(normalizedSettings);
  };

  /**
   * CDXC:Settings 2026-04-26-11:13: Numeric settings use sliders with adjacent
   * number boxes. Dragging or typing updates the visible value immediately, but
   * persists through a short trailing debounce to avoid flooding settings writes.
   * Number boxes keep local edit text so partial values can be typed cleanly.
   */
  const applySettingsDebounced = (nextSettings: zmuxSettings) => {
    const normalizedSettings = normalizezmuxSettings(nextSettings);
    pendingSettingsRef.current = normalizedSettings;
    setDraft(normalizedSettings);
    clearPendingSettings();
    pendingTimeoutRef.current = setTimeout(() => {
      const pendingSettings = pendingSettingsRef.current;
      pendingSettingsRef.current = undefined;
      pendingTimeoutRef.current = undefined;
      if (pendingSettings) {
        onChange(pendingSettings);
      }
    }, NUMERIC_SETTINGS_DEBOUNCE_MS);
  };

  /**
   * CDXC:Settings 2026-04-26-10:12: Settings changes must apply immediately.
   * The settings dialog keeps local state only for responsive controls, then
   * posts every normalized change instead of waiting for Save/Cancel actions.
   */
  const updateDraft = <Key extends keyof zmuxSettings>(key: Key, value: zmuxSettings[Key]) => {
    applySettings({ ...(pendingSettingsRef.current ?? draft), [key]: value });
  };
  const updateDraftDebounced = <Key extends keyof zmuxSettings>(
    key: Key,
    value: zmuxSettings[Key],
  ) => {
    applySettingsDebounced({ ...(pendingSettingsRef.current ?? draft), [key]: value });
  };

  const resetSettings = () => applySettings(DEFAULT_zmux_SETTINGS);

  const applyRecommendedGhosttySettings = () => {
    /**
     * CDXC:GhosttySettings 2026-04-30-01:48
     * The recommended Ghostty button must update both the visible zmux controls
     * and the real Ghostty config keys that are not modeled in zmux settings.
     */
    applySettings({
      ...draft,
      terminalCursorStyle: "bar",
      terminalFontFamily: "JetBrains Mono",
      terminalFontSize: 13,
      terminalFontWeight: 400,
      terminalLetterSpacing: 0,
      terminalLineHeight: 1.2,
      terminalMouseScrollMultiplierDiscrete: 1,
      terminalMouseScrollMultiplierPrecision: 1,
    });
    onGhosttySettingsAction?.("applyRecommendedGhosttySettings");
  };

  const resetGhosttySettingsToDefault = () => {
    /**
     * CDXC:GhosttySettings 2026-04-30-01:48
     * Resetting Ghostty defaults should also move the visible terminal
     * controls back to zmux defaults, then remove managed keys from the real
     * Ghostty config so Ghostty's own defaults take effect.
     */
    applySettings({
      ...draft,
      terminalCursorStyle: DEFAULT_zmux_SETTINGS.terminalCursorStyle,
      terminalFontFamily: DEFAULT_zmux_SETTINGS.terminalFontFamily,
      terminalFontSize: DEFAULT_zmux_SETTINGS.terminalFontSize,
      terminalFontWeight: DEFAULT_zmux_SETTINGS.terminalFontWeight,
      terminalLetterSpacing: DEFAULT_zmux_SETTINGS.terminalLetterSpacing,
      terminalLineHeight: DEFAULT_zmux_SETTINGS.terminalLineHeight,
      terminalMouseScrollMultiplierDiscrete:
        DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierDiscrete,
      terminalMouseScrollMultiplierPrecision:
        DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierPrecision,
      terminalScrollToBottomWhenTyping: DEFAULT_zmux_SETTINGS.terminalScrollToBottomWhenTyping,
    });
    onGhosttySettingsAction?.("resetGhosttySettingsToDefault");
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          flushPendingSettings();
          onClose();
        }
      }}
      open={isOpen}
    >
      <DialogContent
        className="zmux-settings-shadcn max-h-[min(700px,calc(100vh-2rem))] gap-0 overflow-hidden p-0 font-sans sm:max-w-xl"
        data-sidebar-theme={modalTheme}
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-xl">Settings</DialogTitle>
          <Input
            aria-label="Search settings"
            className="mt-3 h-10 px-3 text-sm"
            onChange={(event) => setSettingsSearchQuery(event.currentTarget.value)}
            placeholder="Search settings"
            value={settingsSearchQuery}
          />
        </DialogHeader>

        {/* CDXC:Settings 2026-04-26-10:43: The settings dialog lives inside a
            narrow sidebar webview, so the Radix scroll area needs an explicit
            height instead of letting Dialog crop an auto-height viewport. */}
        <ScrollArea className="h-[min(560px,calc(100vh-9rem))] min-h-0">
          <div className="flex flex-col gap-6 px-5 pb-5">
            {accessibilityPermissionGranted === false ? (
              /**
               * CDXC:AccessibilityPermissions 2026-04-28-16:57
               * Settings should keep a short, persistent notice when macOS
               * Accessibility is disabled because browser placement and IDE
               * attachment are the two user-facing features that depend on it.
               */
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-foreground">
                Accessibility is off. Browser placement and IDE attachment won't work.
              </div>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.sidebar) ? (
              <SettingsSection title="Sidebar">
              {/* CDXC:SidebarMode 2026-05-03-10:42: Combined mode is a
                  sidebar-wide presentation choice, not a section visibility
                  toggle. Keep it above the per-section controls so users can
                  switch back to the previous separated multi-group behavior. */}
              {shouldShowSetting(settingsSearch.sidebar, "sidebarMode") ? (
              <SelectField
                description="Choose how project sessions are grouped."
                label="Mode"
                onChange={(value) => updateDraft("sidebarMode", value as SidebarMode)}
                options={SIDEBAR_MODE_OPTIONS}
                value={draft.sidebarMode}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sidebar, "sidebarTheme") ? (
              <SelectField
                description="Choose the sidebar color scheme."
                label="Theme"
                onChange={(value) => updateDraft("sidebarTheme", value as SidebarThemeSetting)}
                options={SIDEBAR_THEME_SETTING_OPTIONS}
                value={draft.sidebarTheme}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sidebar, "agentManagerZoomPercent") ? (
              <SliderNumberField
                description="Scale the agent manager UI."
                label="Agent Manager Zoom"
                max={200}
                min={50}
                onCommit={(value) => updateDraft("agentManagerZoomPercent", value)}
                onChange={(value) => updateDraftDebounced("agentManagerZoomPercent", value)}
                step={1}
                value={draft.agentManagerZoomPercent}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sidebar, "showSidebarActions") ? (
              <ToggleField
                checked={draft.showSidebarActions}
                description="Show the command and action launcher."
                label="Show Actions section"
                onChange={(checked) => updateDraft("showSidebarActions", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sidebar, "showSidebarAgents") ? (
              <ToggleField
                checked={draft.showSidebarAgents}
                description="Show active agent sessions."
                label="Show Agents section"
                onChange={(checked) => updateDraft("showSidebarAgents", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sidebar, "showSidebarGitButton") ? (
              <ToggleField
                checked={draft.showSidebarGitButton}
                description="Show git tools in the sidebar toolbar."
                label="Show Git button"
                onChange={(checked) => updateDraft("showSidebarGitButton", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sidebar, "createSessionOnSidebarDoubleClick") ? (
              <ToggleField
                checked={draft.createSessionOnSidebarDoubleClick}
                description="Create a session from empty sidebar space."
                label="Double-click empty sidebar space to create a session"
                onChange={(checked) => updateDraft("createSessionOnSidebarDoubleClick", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sidebar, "renameSessionOnDoubleClick") ? (
              <ToggleField
                checked={draft.renameSessionOnDoubleClick}
                description="Rename sessions directly from their cards."
                label="Double-click session cards to rename"
                onChange={(checked) => updateDraft("renameSessionOnDoubleClick", checked)}
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.sessionCards) ? (
            <SettingsSection title="Session Cards">
              {shouldShowSetting(settingsSearch.sessionCards, "showCloseButtonOnSessionCards") ? (
              <ToggleField
                checked={draft.showCloseButtonOnSessionCards}
                description="Reveal the close control when hovering a card."
                label="Show close button on hover"
                onChange={(checked) => updateDraft("showCloseButtonOnSessionCards", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sessionCards, "showHotkeysOnSessionCards") ? (
              <ToggleField
                checked={draft.showHotkeysOnSessionCards}
                description="Display card shortcuts where available."
                label="Show hotkeys on cards"
                onChange={(checked) => updateDraft("showHotkeysOnSessionCards", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sessionCards, "showLastInteractionTimeOnSessionCards") ? (
              /* CDXC:Sidebar-overflow-menu 2026-05-04-03:54
                  Agent Icon/Last Active is a session-card display preference,
                  so it belongs in Settings instead of the quick overflow menu. */
              <ToggleField
                checked={draft.showLastInteractionTimeOnSessionCards}
                description="Use Last Active as the default trailing card detail instead of Agent Icon."
                label="Use Last Active instead of Agent Icon"
                onChange={(checked) =>
                  updateDraft("showLastInteractionTimeOnSessionCards", checked)
                }
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.terminal) ? (
            <SettingsSection title="Terminal">
              {/* CDXC:TerminalSettings 2026-04-26-18:36: Terminal settings in
                  zmux edit the shared Ghostty config file, so users must see
                  that external Ghostty windows receive the same values and can
                  reload them with Ghostty's normal config shortcut. */}
              {shouldShowSetting(settingsSearch.terminal, "ghosttySettingsActions") ? (
                <>
                  <div className="rounded-lg border border-destructive/45 bg-destructive/10 px-4 py-3 text-sm leading-6 text-foreground">
                    Whatever you set here also applies to your external Ghostty terminal because this
                    Ghostty terminal uses the same settings file. zmux reloads its embedded Ghostty
                    terminal about 3 seconds after you stop changing these controls; external Ghostty
                    windows may still need Cmd+Shift+, to reload.
                  </div>
                  <GhosttySettingsActions
                    onApplyRecommended={applyRecommendedGhosttySettings}
                    onOpenConfigFile={() => onGhosttySettingsAction?.("openGhosttyConfigFile")}
                    onOpenDocs={() => onGhosttySettingsAction?.("openGhosttySettingsDocs")}
                    onResetDefaults={resetGhosttySettingsToDefault}
                  />
                </>
              ) : null}
              {shouldShowSetting(settingsSearch.terminal, "terminalFontFamily") ? (
              <SelectField
                description="Pick the terminal typeface."
                label="Font Family"
                onChange={(value) => updateDraft("terminalFontFamily", value as TerminalFontPreset)}
                options={terminalFontOptions}
                value={draft.terminalFontFamily}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminal, "terminalFontSize") ? (
              <SliderNumberField
                description="Set terminal text size."
                label="Font Size"
                max={32}
                min={8}
                onCommit={(value) => updateDraft("terminalFontSize", value)}
                onChange={(value) => updateDraftDebounced("terminalFontSize", value)}
                step={1}
                value={draft.terminalFontSize}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminal, "terminalFontWeight") ? (
              <SliderNumberField
                description="Set terminal text weight."
                label="Font Weight"
                max={900}
                min={100}
                onCommit={(value) => updateDraft("terminalFontWeight", value)}
                onChange={(value) => updateDraftDebounced("terminalFontWeight", value)}
                step={50}
                value={draft.terminalFontWeight}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminal, "terminalLineHeight") ? (
              <SliderNumberField
                description="Adjust terminal row height."
                label="Line Height"
                max={2}
                min={0.8}
                onCommit={(value) => updateDraft("terminalLineHeight", value)}
                onChange={(value) => updateDraftDebounced("terminalLineHeight", value)}
                step={0.05}
                value={draft.terminalLineHeight}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminal, "terminalLetterSpacing") ? (
              <SliderNumberField
                description="Adjust spacing between glyphs."
                label="Letter Spacing"
                max={8}
                min={-2}
                onCommit={(value) => updateDraft("terminalLetterSpacing", value)}
                onChange={(value) => updateDraftDebounced("terminalLetterSpacing", value)}
                step={0.1}
                value={draft.terminalLetterSpacing}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminal, "terminalCursorStyle") ? (
              <SelectField
                description="Choose the cursor shape."
                label="Cursor Style"
                onChange={(value) =>
                  updateDraft("terminalCursorStyle", value as TerminalCursorStyle)
                }
                options={[
                  { label: "Line", value: "bar" },
                  { label: "Block", value: "block" },
                  { label: "Underline", value: "underline" },
                ]}
                value={draft.terminalCursorStyle}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminal, "sessionPersistenceProvider") ? (
              /* CDXC:SessionPersistence 2026-05-05-07:28
                  Session persistence is a provider choice for new terminal and
                  agent launches. Existing panes keep their current process;
                  new panes can use tmux or zmx so restart restores by attach
                  first and recreate+resume only when the named session is gone. */
              <SelectField
                description="Choose Off, tmux, or zmx for restart-safe terminal sessions."
                label="Session Persistence"
                onChange={(value) =>
                  updateDraft("sessionPersistenceProvider", value as SessionPersistenceProvider)
                }
                options={SESSION_PERSISTENCE_PROVIDER_OPTIONS}
                value={draft.sessionPersistenceProvider}
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.terminalScrolling) ? (
            <SettingsSection title="Terminal Scrolling">
              {/* CDXC:TerminalScrollSettings 2026-04-29-08:56: Ghostty
                  scroll speed is controlled by mouse-scroll-multiplier.
                  Precision and discrete devices need separate controls because
                  Ghostty defaults trackpads to 1 and notched wheels to 3.
                  The modal exposes 0.25-step sliders from 0.25 to 8 because
                  Ghostty's documented 0.01..10000 bounds are extreme. */}
              {shouldShowSetting(settingsSearch.terminalScrolling, "terminalMouseScrollMultiplierPrecision") ? (
              <SliderNumberField
                description="Trackpads and high-resolution scroll wheels. Ghostty default is 1."
                label="Precision scroll multiplier"
                max={8}
                min={0.25}
                onCommit={(value) => updateDraft("terminalMouseScrollMultiplierPrecision", value)}
                onChange={(value) =>
                  updateDraftDebounced("terminalMouseScrollMultiplierPrecision", value)
                }
                step={0.25}
                value={draft.terminalMouseScrollMultiplierPrecision}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminalScrolling, "terminalMouseScrollMultiplierDiscrete") ? (
              <SliderNumberField
                description="Traditional notched mouse wheels. Ghostty default is 3."
                label="Discrete scroll multiplier"
                max={8}
                min={0.25}
                onCommit={(value) => updateDraft("terminalMouseScrollMultiplierDiscrete", value)}
                onChange={(value) =>
                  updateDraftDebounced("terminalMouseScrollMultiplierDiscrete", value)
                }
                step={0.25}
                value={draft.terminalMouseScrollMultiplierDiscrete}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.terminalScrolling, "terminalScrollToBottomWhenTyping") ? (
              <ToggleField
                checked={draft.terminalScrollToBottomWhenTyping}
                description="Keep the prompt visible while typing."
                label="Scroll to bottom when typing"
                onChange={(checked) => updateDraft("terminalScrollToBottomWhenTyping", checked)}
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.workspace) ? (
            <SettingsSection title="Workspace">
              {shouldShowSetting(settingsSearch.workspace, "workspacePaneGap") ? (
              <SliderNumberField
                description="Control spacing between panes."
                label="Pane Gap"
                max={48}
                min={0}
                onCommit={(value) => updateDraft("workspacePaneGap", value)}
                onChange={(value) => updateDraftDebounced("workspacePaneGap", value)}
                step={1}
                value={draft.workspacePaneGap}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.workspace, "workspaceActivePaneBorderColor") ? (
              <TextField
                description="CSS color for the focused pane border."
                label="Active Pane Border"
                onChange={(value) => updateDraft("workspaceActivePaneBorderColor", value)}
                value={draft.workspaceActivePaneBorderColor}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.workspace, "workspaceBackgroundColor") ? (
              <ColorField
                description="Color shown behind terminal panes."
                label="Terminal Background"
                onChange={(value) => updateDraft("workspaceBackgroundColor", value)}
                value={draft.workspaceBackgroundColor}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.workspace, "debuggingMode") ? (
              <ToggleField
                checked={draft.debuggingMode}
                description="Expose debugging-only sidebar controls."
                label="Show debugging UI"
                onChange={(checked) => updateDraft("debuggingMode", checked)}
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.browser) ? (
            <SettingsSection title="Browser">
              {/* CDXC:BrowserPanes 2026-05-02-06:35: Users can keep the
                  existing Chrome Canary native-window integration or route
                  browser actions into workspace browser panes that behave like
                  normal session cards inside sidebar groups. */}
              {shouldShowSetting(settingsSearch.browser, "browserOpenMode") ? (
              <SelectField
                description="Choose where browser actions open URLs."
                label="Open URLs With"
                onChange={(value) => updateDraft("browserOpenMode", value as BrowserOpenMode)}
                options={BROWSER_OPEN_MODE_OPTIONS}
                value={draft.browserOpenMode}
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.ideAttachment) ? (
            <SettingsSection title="IDE Attachment">
              {/* CDXC:IDEAttachment 2026-04-26-22:38: Settings select the IDE
                  that the workspace header link button attaches to. The
                  persisted keys remain zedOverlay* so existing installs keep
                  their saved attach state and target. */}
              {shouldShowSetting(settingsSearch.ideAttachment, "zedOverlayEnabled") ? (
              <ToggleField
                checked={draft.zedOverlayEnabled}
                description="Attach zmux as an overlay to the selected IDE."
                label="Attach zmux to IDE"
                onChange={(checked) => updateDraft("zedOverlayEnabled", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.ideAttachment, "zedOverlayHideTitlebarButton") ? (
              <ToggleField
                checked={draft.zedOverlayHideTitlebarButton}
                description="Hide the native Attach/Detach IDE button from the zmux title bar."
                label="Hide title-bar attach button"
                onChange={(checked) => updateDraft("zedOverlayHideTitlebarButton", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.ideAttachment, "zedOverlayTargetApp") ? (
              <SelectField
                description="Select which IDE should receive the overlay."
                label="Target IDE"
                onChange={(value) =>
                  updateDraft("zedOverlayTargetApp", value as ZedOverlayTargetApp)
                }
                options={ZED_OVERLAY_TARGET_APP_OPTIONS}
                value={draft.zedOverlayTargetApp}
              />
              ) : null}
              {/* CDXC:ZedOverlayWorkspace 2026-04-28-05:18: Project sync is a
                  separate setting from attachment. When enabled, zmux opens
                  the active project in Zed after workspace switches instead of
                  waiting for the native Show Zed button click. */}
              {shouldShowSetting(settingsSearch.ideAttachment, "syncOpenProjectWithZed") ? (
              <ToggleField
                checked={draft.syncOpenProjectWithZed}
                description="Open the active zmux project in Zed after switching workspaces."
                label="Sync open project with Zed"
                onChange={(checked) => updateDraft("syncOpenProjectWithZed", checked)}
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {shouldShowSettingsSection(settingsSearch.sounds) ? (
            <SettingsSection title="Sounds">
              {shouldShowSetting(settingsSearch.sounds, "completionBellEnabled") ? (
              <ToggleField
                checked={draft.completionBellEnabled}
                description="Play a completion sound when work finishes."
                label="Enable completion bell"
                onChange={(checked) => updateDraft("completionBellEnabled", checked)}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sounds, "completionSound") ? (
              <SoundField
                description="Sound for terminal completions."
                label="Completion Sound"
                onChange={(value) => updateDraft("completionSound", value)}
                value={draft.completionSound}
              />
              ) : null}
              {shouldShowSetting(settingsSearch.sounds, "actionCompletionSound") ? (
              <SoundField
                description="Sound for action completions."
                label="Action Completion Sound"
                onChange={(value) => updateDraft("actionCompletionSound", value)}
                value={draft.actionCompletionSound}
              />
              ) : null}
            </SettingsSection>
            ) : null}

            {!hasVisibleSettings ? (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                No settings match your search.
              </div>
            ) : null}

            <Separator className="bg-border" />
            <div className="flex justify-between gap-3">
              <Button
                className="h-10 px-5 text-sm"
                onClick={resetSettings}
                type="button"
                variant="outline"
              >
                Reset to defaults
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function GhosttySettingsActions({
  onApplyRecommended,
  onOpenConfigFile,
  onOpenDocs,
  onResetDefaults,
}: {
  onApplyRecommended: () => void;
  onOpenConfigFile: () => void;
  onOpenDocs: () => void;
  onResetDefaults: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Button className="h-10 px-4 text-sm" onClick={onResetDefaults} type="button" variant="outline">
        Reset Ghostty defaults
      </Button>
      <Button
        className="h-10 px-4 text-sm"
        onClick={onApplyRecommended}
        title={ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES.join("\n")}
        type="button"
        variant="outline"
      >
        Apply recommended
      </Button>
      <Button className="h-10 px-4 text-sm" onClick={onOpenDocs} type="button" variant="outline">
        Open Ghostty docs
      </Button>
      <Button
        className="h-10 px-4 text-sm"
        onClick={onOpenConfigFile}
        type="button"
        variant="outline"
      >
        Open Ghostty config
      </Button>
    </div>
  );
}

/**
 * CDXC:Settings 2026-04-26-21:27: The settings modal previews the same theme
 * as the sidebar. The modal updates immediately when the Theme select changes,
 * without waiting for the native host to echo a new HUD snapshot.
 */
function getSidebarThemeVariant(theme: SidebarTheme): SidebarThemeVariant {
  return theme.startsWith("light-") || theme === "plain-light" ? "light" : "dark";
}

function getSettingsSectionSearch(
  query: string,
  sectionTitle: string,
  settings: ReadonlyArray<SettingSearchDefinition>,
): SettingsSectionSearchResult {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      isSearching: false,
      sectionMatches: true,
      visibleSettingKeys: new Set(settings.map((setting) => setting.key)),
    };
  }

  const searchItems = [
    {
      id: "__section",
      options: [],
      subtitle: "",
      title: sectionTitle,
    },
    ...settings.map((setting) => ({
      id: setting.key,
      options: setting.options?.flatMap((option) => [option.label, option.value]) ?? [],
      subtitle: setting.subtitle ?? "",
      title: setting.title,
    })),
  ];
  const fuse = new Fuse(searchItems, {
    ignoreLocation: true,
    includeScore: true,
    keys: [
      { name: "title", weight: 0.55 },
      { name: "subtitle", weight: 0.25 },
      { name: "options", weight: 0.2 },
    ],
    threshold: 0.38,
  });
  const results = fuse.search(trimmedQuery);
  const sectionMatches = results.some((result) => result.item.id === "__section");
  return {
    isSearching: true,
    sectionMatches,
    visibleSettingKeys: new Set(
      results
        .map((result) => result.item.id)
        .filter((settingKey) => settingKey !== "__section"),
    ),
  };
}

function hasVisibleSettingsSearchResult(result: SettingsSectionSearchResult): boolean {
  return result.sectionMatches || result.visibleSettingKeys.size > 0;
}

function shouldShowSettingsSection(result: SettingsSectionSearchResult): boolean {
  return hasVisibleSettingsSearchResult(result);
}

function shouldShowSetting(result: SettingsSectionSearchResult, settingKey: string): boolean {
  return !result.isSearching || result.sectionMatches || result.visibleSettingKeys.has(settingKey);
}

function SettingsSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Card className="relative mt-5 overflow-visible pt-8" size="sm">
      {/* CDXC:Settings 2026-04-26-12:31: The target settings examples stack the
          text above controls. Keeping rows vertical avoids squeezing labels in
          the narrow zmux sidebar modal. */}
      {/* CDXC:Settings 2026-04-26-21:00: Settings sections need extra space
          above each header, while adjacent settings should separate by rhythm
          instead of divider lines. */}
      {/* CDXC:Settings 2026-04-26-21:03: Each settings category is a distinct
          shadcn card. The heading is larger and sits over the top border so
          the card reads as a labeled group without reintroducing row dividers. */}
      {/* CDXC:Settings 2026-04-26-21:22: Section card labels must stay on one
          line and clear the card contents, including multi-word headings like
          Session Cards. */}
      {/* CDXC:Settings 2026-04-27-01:01: The title pill cannot use shadcn
          CardHeader because its container-query size containment makes
          max-content resolve to the padding width instead of the text width. */}
      <div className="settings-section-title-pill">
        <CardTitle className="settings-section-title-pill-text">{title}</CardTitle>
      </div>
      <CardContent className="pt-2">
        <FieldGroup className="gap-6">{children}</FieldGroup>
      </CardContent>
    </Card>
  );
}

function SliderNumberField({
  description,
  label,
  max,
  min,
  onChange,
  onCommit,
  step,
  value,
}: {
  description?: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  step: number;
  value: number;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState(() => formatSliderNumber(value, step));
  const valueText = formatSliderNumber(value, step);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setInputText(valueText);
    }
  }, [valueText]);

  const updateValue = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) {
      return value;
    }
    const clampedValue = clampNumber(snapNumberToStep(nextValue, min, step), min, max);
    onChange(clampedValue);
    return clampedValue;
  };

  const commitValue = (nextValue: number) => {
    const clampedValue = Number.isFinite(nextValue)
      ? clampNumber(snapNumberToStep(nextValue, min, step), min, max)
      : value;
    setInputText(formatSliderNumber(clampedValue, step));
    onCommit(clampedValue);
  };

  const updateInputText = (nextText: string) => {
    setInputText(nextText);
    const nextValue = Number(nextText);
    if (
      nextText.trim() === "" ||
      !Number.isFinite(nextValue) ||
      nextValue < min ||
      nextValue > max
    ) {
      return;
    }
    onChange(clampNumber(snapNumberToStep(nextValue, min, step), min, max));
  };

  return (
    <SettingRow description={description} htmlFor={id} label={label}>
      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-3">
        <Slider
          aria-label={label}
          max={max}
          min={min}
          onValueCommit={([nextValue]) => commitValue(nextValue ?? value)}
          onValueChange={([nextValue]) => updateValue(nextValue ?? value)}
          step={step}
          value={[value]}
        />
        <Input
          id={id}
          className="h-10 px-3 text-sm tabular-nums"
          onBlur={(event) => commitValue(Number(event.currentTarget.value))}
          onChange={(event) => updateInputText(event.currentTarget.value)}
          onFocus={(event) => event.currentTarget.select()}
          max={max}
          min={min}
          ref={inputRef}
          step={step}
          type="number"
          value={inputText}
        />
      </div>
    </SettingRow>
  );
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapNumberToStep(value: number, min: number, step: number): number {
  /**
   * CDXC:Settings 2026-04-29-08:56
   * Slider-backed numeric settings must persist the same step increments the
   * UI presents. This keeps Ghostty scroll multipliers on 0.25 increments even
   * when users type values into the adjacent number field.
   */
  const decimals = Math.max(0, step.toString().split(".")[1]?.length ?? 0);
  const scaledValue = Math.round((value - min) / step) * step + min;
  return Number(scaledValue.toFixed(decimals));
}

function formatSliderNumber(value: number, step: number): string {
  if (Number.isInteger(step)) {
    return String(Math.round(value));
  }
  const decimals = Math.max(0, step.toString().split(".")[1]?.length ?? 0);
  return value.toFixed(decimals);
}

function SelectField({
  contentClassName,
  description,
  label,
  onChange,
  options,
  showScrollButtons,
  value,
}: {
  contentClassName?: string;
  description?: string;
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  showScrollButtons?: boolean;
  value: string;
}) {
  const id = useId();
  return (
    <SettingRow description={description} htmlFor={id} label={label}>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger className="h-10 w-full px-3 text-sm" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClassName} showScrollButtons={showScrollButtons}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </SettingRow>
  );
}

function SoundField({
  description,
  label,
  onChange,
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: CompletionSoundSetting) => void;
  value: CompletionSoundSetting;
}) {
  /**
   * CDXC:Settings 2026-04-29-17:01
   * Sound pickers have enough options that Radix hover-scroll buttons can
   * fight wheel scrolling inside the modal. Disable those auto-scroll zones so
   * mouse and trackpad wheel direction remains stable.
   */
  return (
    <SelectField
      contentClassName="max-h-72"
      description={description}
      label={label}
      onChange={(nextValue) => onChange(nextValue as CompletionSoundSetting)}
      options={COMPLETION_SOUND_OPTIONS}
      showScrollButtons={false}
      value={value}
    />
  );
}

function TextField({
  description,
  label,
  onChange,
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const id = useId();
  return (
    <SettingRow description={description} htmlFor={id} label={label}>
      <Input
        id={id}
        className="h-10 px-3 text-sm"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </SettingRow>
  );
}

function ColorField({
  description,
  label,
  onChange,
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const id = useId();
  const colorValue = normalizeColorInputValue(value);
  return (
    <SettingRow description={description} htmlFor={id} label={label}>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3">
        <Input
          aria-label={`${label} picker`}
          className="h-10 cursor-pointer rounded-xl p-1"
          onChange={(event) => onChange(event.currentTarget.value)}
          type="color"
          value={colorValue}
        />
        <Input
          id={id}
          className="h-10 px-3 text-sm"
          onChange={(event) => onChange(event.currentTarget.value)}
          value={value}
        />
      </div>
    </SettingRow>
  );
}

function normalizeColorInputValue(value: string): string {
  return /^#[0-9a-f]{6}$/iu.test(value.trim()) ? value.trim() : "#121212";
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <SettingRow description={description} htmlFor={id} label={label}>
      <Switch checked={checked} id={id} onCheckedChange={onChange} />
    </SettingRow>
  );
}

function SettingRow({
  children,
  description,
  htmlFor,
  label,
}: {
  children: ReactNode;
  description?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <Field className="gap-2.5" orientation="vertical">
      <FieldContent>
        <FieldTitle className="text-sm">
          <FieldLabel className="text-sm" htmlFor={htmlFor}>
            {label}
          </FieldLabel>
        </FieldTitle>
        {description ? (
          <FieldDescription className="text-sm">{description}</FieldDescription>
        ) : null}
      </FieldContent>
      <div className="min-w-0">{children}</div>
    </Field>
  );
}
