import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
import {
  resolveSidebarTheme,
  type SidebarTheme,
  type SidebarThemeSetting,
  type SidebarThemeVariant,
} from "../shared/session-grid-contract";
import {
  DEFAULT_zmux_SETTINGS,
  SIDEBAR_THEME_SETTING_OPTIONS,
  ZED_OVERLAY_TARGET_APP_OPTIONS,
  normalizezmuxSettings,
  type TerminalCursorStyle,
  type ZedOverlayTargetApp,
  type zmuxSettings,
} from "../shared/zmux-settings";

const NUMERIC_SETTINGS_DEBOUNCE_MS = 180;

export type SettingsModalProps = {
  accessibilityPermissionGranted?: boolean;
  isOpen: boolean;
  onChange: (settings: zmuxSettings) => void;
  onClose: () => void;
  settings?: zmuxSettings;
  theme?: SidebarTheme;
};

export function SettingsModal({
  accessibilityPermissionGranted,
  isOpen,
  onChange,
  onClose,
  settings,
  theme = "dark-blue",
}: SettingsModalProps) {
  const [draft, setDraft] = useState<zmuxSettings>(normalizezmuxSettings(settings));
  const pendingSettingsRef = useRef<zmuxSettings | undefined>(undefined);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const modalTheme = resolveSidebarTheme(draft.sidebarTheme, getSidebarThemeVariant(theme));

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

            <SettingsSection title="Sidebar">
              <SelectField
                description="Choose the sidebar color scheme."
                label="Theme"
                onChange={(value) => updateDraft("sidebarTheme", value as SidebarThemeSetting)}
                options={SIDEBAR_THEME_SETTING_OPTIONS}
                value={draft.sidebarTheme}
              />
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
              <ToggleField
                checked={draft.showSidebarActions}
                description="Show the command and action launcher."
                label="Show Actions section"
                onChange={(checked) => updateDraft("showSidebarActions", checked)}
              />
              <ToggleField
                checked={draft.showSidebarAgents}
                description="Show active agent sessions."
                label="Show Agents section"
                onChange={(checked) => updateDraft("showSidebarAgents", checked)}
              />
              <ToggleField
                checked={draft.showSidebarGitButton}
                description="Show git tools in the sidebar toolbar."
                label="Show Git button"
                onChange={(checked) => updateDraft("showSidebarGitButton", checked)}
              />
              <ToggleField
                checked={draft.createSessionOnSidebarDoubleClick}
                description="Create a session from empty sidebar space."
                label="Double-click empty sidebar space to create a session"
                onChange={(checked) => updateDraft("createSessionOnSidebarDoubleClick", checked)}
              />
              <ToggleField
                checked={draft.renameSessionOnDoubleClick}
                description="Rename sessions directly from their cards."
                label="Double-click session cards to rename"
                onChange={(checked) => updateDraft("renameSessionOnDoubleClick", checked)}
              />
            </SettingsSection>

            <SettingsSection title="Session Cards">
              <ToggleField
                checked={draft.showCloseButtonOnSessionCards}
                description="Reveal the close control when hovering a card."
                label="Show close button on hover"
                onChange={(checked) => updateDraft("showCloseButtonOnSessionCards", checked)}
              />
              <ToggleField
                checked={draft.showHotkeysOnSessionCards}
                description="Display card shortcuts where available."
                label="Show hotkeys on cards"
                onChange={(checked) => updateDraft("showHotkeysOnSessionCards", checked)}
              />
              <ToggleField
                checked={draft.showLastInteractionTimeOnSessionCards}
                description="Keep recent activity timestamps visible."
                label="Show last active time by default"
                onChange={(checked) =>
                  updateDraft("showLastInteractionTimeOnSessionCards", checked)
                }
              />
            </SettingsSection>

            <SettingsSection title="Terminal">
              {/* CDXC:TerminalSettings 2026-04-26-18:36: Terminal settings in
                  zmux edit the shared Ghostty config file, so users must see
                  that external Ghostty windows receive the same values and can
                  reload them with Ghostty's normal config shortcut. */}
              <div className="rounded-lg border border-destructive/45 bg-destructive/10 px-4 py-3 text-sm leading-6 text-foreground">
                Whatever you set here also applies to your external Ghostty terminal because this
                Ghostty terminal uses the same settings file. zmux reloads its embedded Ghostty
                terminal about 3 seconds after you stop changing these controls; external Ghostty
                windows may still need Cmd+Shift+, to reload.
              </div>
              <SelectField
                description="Pick the terminal typeface."
                label="Font Family"
                onChange={(value) => updateDraft("terminalFontFamily", value as TerminalFontPreset)}
                options={TERMINAL_FONT_PRESETS.map((preset) => ({
                  label: preset.preset,
                  value: preset.preset,
                }))}
                value={draft.terminalFontFamily}
              />
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
            </SettingsSection>

            <SettingsSection title="Terminal Scrolling">
              {/* CDXC:TerminalScrollSettings 2026-04-29-08:56: Ghostty
                  scroll speed is controlled by mouse-scroll-multiplier.
                  Precision and discrete devices need separate controls because
                  Ghostty defaults trackpads to 1 and notched wheels to 3.
                  The modal exposes 0.25-step sliders from 0.25 to 8 because
                  Ghostty's documented 0.01..10000 bounds are extreme. */}
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
              <ToggleField
                checked={draft.terminalScrollToBottomWhenTyping}
                description="Keep the prompt visible while typing."
                label="Scroll to bottom when typing"
                onChange={(checked) => updateDraft("terminalScrollToBottomWhenTyping", checked)}
              />
            </SettingsSection>

            <SettingsSection title="Workspace">
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
              <TextField
                description="CSS color for the focused pane border."
                label="Active Pane Border"
                onChange={(value) => updateDraft("workspaceActivePaneBorderColor", value)}
                value={draft.workspaceActivePaneBorderColor}
              />
              <ColorField
                description="Color shown behind terminal panes."
                label="Terminal Background"
                onChange={(value) => updateDraft("workspaceBackgroundColor", value)}
                value={draft.workspaceBackgroundColor}
              />
              <ToggleField
                checked={draft.debuggingMode}
                description="Expose debugging-only sidebar controls."
                label="Show debugging UI"
                onChange={(checked) => updateDraft("debuggingMode", checked)}
              />
            </SettingsSection>

            <SettingsSection title="IDE Attachment">
              {/* CDXC:IDEAttachment 2026-04-26-22:38: Settings select the IDE
                  that the workspace header link button attaches to. The
                  persisted keys remain zedOverlay* so existing installs keep
                  their saved attach state and target. */}
              <ToggleField
                checked={draft.zedOverlayEnabled}
                description="Attach zmux as an overlay to the selected IDE."
                label="Attach zmux to IDE"
                onChange={(checked) => updateDraft("zedOverlayEnabled", checked)}
              />
              <SelectField
                description="Select which IDE should receive the overlay."
                label="Target IDE"
                onChange={(value) =>
                  updateDraft("zedOverlayTargetApp", value as ZedOverlayTargetApp)
                }
                options={ZED_OVERLAY_TARGET_APP_OPTIONS}
                value={draft.zedOverlayTargetApp}
              />
              {/* CDXC:ZedOverlayWorkspace 2026-04-28-05:18: Project sync is a
                  separate setting from attachment. When enabled, zmux opens
                  the active project in Zed after workspace switches instead of
                  waiting for the native Show Zed button click. */}
              <ToggleField
                checked={draft.syncOpenProjectWithZed}
                description="Open the active zmux project in Zed after switching workspaces."
                label="Sync open project with Zed"
                onChange={(checked) => updateDraft("syncOpenProjectWithZed", checked)}
              />
            </SettingsSection>

            <SettingsSection title="Sounds">
              <ToggleField
                checked={draft.completionBellEnabled}
                description="Play a completion sound when work finishes."
                label="Enable completion bell"
                onChange={(checked) => updateDraft("completionBellEnabled", checked)}
              />
              <SoundField
                description="Sound for terminal completions."
                label="Completion Sound"
                onChange={(value) => updateDraft("completionSound", value)}
                value={draft.completionSound}
              />
              <SoundField
                description="Sound for action completions."
                label="Action Completion Sound"
                onChange={(value) => updateDraft("actionCompletionSound", value)}
                value={draft.actionCompletionSound}
              />
            </SettingsSection>

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

/**
 * CDXC:Settings 2026-04-26-21:27: The settings modal previews the same theme
 * as the sidebar. The modal updates immediately when the Theme select changes,
 * without waiting for the native host to echo a new HUD snapshot.
 */
function getSidebarThemeVariant(theme: SidebarTheme): SidebarThemeVariant {
  return theme.startsWith("light-") || theme === "plain-light" ? "light" : "dark";
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
