import { describe, expect, test } from "vitest";
import {
  BROWSER_OPEN_MODE_OPTIONS,
  DEFAULT_zmux_SETTINGS,
  GHOSTTY_THEME_SETTING_OPTIONS,
  normalizezmuxSettings,
  SESSION_PERSISTENCE_PROVIDER_OPTIONS,
  SIDEBAR_MODE_OPTIONS,
  SIDEBAR_SIDE_OPTIONS,
  ZED_OVERLAY_TARGET_APP_OPTIONS,
} from "./zmux-settings";

describe("normalizezmuxSettings", () => {
  test("defaults the Zed overlay settings", () => {
    expect(normalizezmuxSettings({})).toMatchObject({
      syncOpenProjectWithZed: DEFAULT_zmux_SETTINGS.syncOpenProjectWithZed,
      zedOverlayEnabled: DEFAULT_zmux_SETTINGS.zedOverlayEnabled,
      zedOverlayHideTitlebarButton: DEFAULT_zmux_SETTINGS.zedOverlayHideTitlebarButton,
      zedOverlayTargetApp: DEFAULT_zmux_SETTINGS.zedOverlayTargetApp,
    });
  });

  test("keeps the IDE title-bar button visible by default", () => {
    /**
     * CDXC:IDEAttachment 2026-05-01-13:52
     * Hiding the native Attach/Detach IDE title-bar button is opt-in. The
     * default must remain visible so existing users keep the current control.
     */
    expect(DEFAULT_zmux_SETTINGS.zedOverlayHideTitlebarButton).toBe(false);
    expect(normalizezmuxSettings({ zedOverlayHideTitlebarButton: true })).toMatchObject({
      zedOverlayHideTitlebarButton: true,
    });
  });

  test("keeps active project IDE sync enabled by default", () => {
    /**
     * CDXC:IDEAttachment 2026-05-06-12:49
     * The sync setting must default on so project activation in either sidebar
     * mode can debounce one attached-IDE workspace sync from the sidebar.
     */
    expect(DEFAULT_zmux_SETTINGS.syncOpenProjectWithZed).toBe(true);
    expect(normalizezmuxSettings({ syncOpenProjectWithZed: false })).toMatchObject({
      syncOpenProjectWithZed: false,
    });
  });

  test("defaults browser actions to Chrome Canary and keeps browser panes opt-in", () => {
    /**
     * CDXC:BrowserPanes 2026-05-02-06:35
     * Chrome Canary remains the default browser action target. Browser panes are
     * selected explicitly so the existing browser-window workflow is not
     * replaced by a persisted-settings migration.
     */
    expect(DEFAULT_zmux_SETTINGS.browserOpenMode).toBe("chrome-canary");
    expect(normalizezmuxSettings({})).toMatchObject({
      browserOpenMode: "chrome-canary",
    });
    expect(normalizezmuxSettings({ browserOpenMode: "browser-pane" })).toMatchObject({
      browserOpenMode: "browser-pane",
    });
    expect(normalizezmuxSettings({ browserOpenMode: "Safari" })).toMatchObject({
      browserOpenMode: "chrome-canary",
    });
    expect(BROWSER_OPEN_MODE_OPTIONS).toContainEqual({
      label: "Browser Panes",
      value: "browser-pane",
    });
  });

  test("defaults new installs to Combined sidebar mode and keeps Separated selectable", () => {
    /**
     * CDXC:SidebarMode 2026-05-03-10:42
     * Combined mode is the first-install default so native zmux shows one
     * group per project across all projects. Separated remains a valid setting
     * so the previous per-project, multi-group sidebar behavior is preserved.
     */
    expect(DEFAULT_zmux_SETTINGS.sidebarMode).toBe("combined");
    expect(normalizezmuxSettings({})).toMatchObject({
      sidebarMode: "combined",
    });
    expect(normalizezmuxSettings({ sidebarMode: "separated" })).toMatchObject({
      sidebarMode: "separated",
    });
    expect(normalizezmuxSettings({ sidebarMode: "invalid" })).toMatchObject({
      sidebarMode: "combined",
    });
    expect(SIDEBAR_MODE_OPTIONS).toEqual([
      { label: "Combined", value: "combined" },
      { label: "Separated", value: "separated" },
    ]);
  });

  test("keeps sidebar side as a selectable left or right setting", () => {
    /**
     * CDXC:SidebarPlacement 2026-05-06-17:32
     * Sidebar placement is persisted with the rest of Settings so users can
     * choose right-side chrome from the top Sidebar setting, while invalid
     * values still normalize to the left-side default AppKit layout.
     */
    expect(DEFAULT_zmux_SETTINGS.sidebarSide).toBe("left");
    expect(normalizezmuxSettings({})).toMatchObject({
      sidebarSide: "left",
    });
    expect(normalizezmuxSettings({ sidebarSide: "right" })).toMatchObject({
      sidebarSide: "right",
    });
    expect(normalizezmuxSettings({ sidebarSide: "bottom" })).toMatchObject({
      sidebarSide: "left",
    });
    expect(SIDEBAR_SIDE_OPTIONS).toEqual([
      { label: "Left", value: "left" },
      { label: "Right", value: "right" },
    ]);
  });

  test("keeps the workspace background color setting", () => {
    expect(DEFAULT_zmux_SETTINGS.workspaceBackgroundColor).toBe("#121212");
    expect(normalizezmuxSettings({ workspaceBackgroundColor: "#202020" })).toMatchObject({
      workspaceBackgroundColor: "#202020",
    });
    expect(normalizezmuxSettings({ workspaceBackgroundColor: "   " })).toMatchObject({
      workspaceBackgroundColor: DEFAULT_zmux_SETTINGS.workspaceBackgroundColor,
    });
  });

  test("keeps Ghostty mouse scroll multipliers in the settings slider range", () => {
    /**
     * CDXC:TerminalScrollSettings 2026-04-29-08:56
     * The settings modal exposes Ghostty's precision and discrete scroll
     * multipliers as 0.25-step sliders, so normalization preserves valid
     * tuning values and clamps saved values to the same practical range before
     * writing the shared Ghostty config.
     */
    expect(DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierPrecision).toBe(1);
    expect(DEFAULT_zmux_SETTINGS.terminalMouseScrollMultiplierDiscrete).toBe(3);
    expect(
      normalizezmuxSettings({
        terminalMouseScrollMultiplierDiscrete: 4,
        terminalMouseScrollMultiplierPrecision: 0.75,
      }),
    ).toMatchObject({
      terminalMouseScrollMultiplierDiscrete: 4,
      terminalMouseScrollMultiplierPrecision: 0.75,
    });
    expect(
      normalizezmuxSettings({
        terminalMouseScrollMultiplierDiscrete: 10001,
        terminalMouseScrollMultiplierPrecision: 0,
      }),
    ).toMatchObject({
      terminalMouseScrollMultiplierDiscrete: 8,
      terminalMouseScrollMultiplierPrecision: 0.25,
    });
  });

  test("keeps session persistence provider opt-in", () => {
    /**
     * CDXC:SessionPersistence 2026-05-05-07:28
     * Session persistence must not change existing launch behavior until the
     * user selects a provider in Settings. Legacy tmuxMode=true settings should
     * migrate to the tmux provider, and zmx/zellij must persist as provider
     * choices with the same restart-safe attach/recreate contract.
     */
    expect(DEFAULT_zmux_SETTINGS.sessionPersistenceProvider).toBe("off");
    expect(DEFAULT_zmux_SETTINGS.tmuxMode).toBe(false);
    expect(normalizezmuxSettings({})).toMatchObject({
      sessionPersistenceProvider: "off",
      tmuxMode: false,
    });
    expect(normalizezmuxSettings({ tmuxMode: true })).toMatchObject({
      sessionPersistenceProvider: "tmux",
      tmuxMode: true,
    });
    expect(normalizezmuxSettings({ sessionPersistenceProvider: "zmx" })).toMatchObject({
      sessionPersistenceProvider: "zmx",
      tmuxMode: false,
    });
    expect(normalizezmuxSettings({ sessionPersistenceProvider: "zellij" })).toMatchObject({
      sessionPersistenceProvider: "zellij",
      tmuxMode: false,
    });
    expect(SESSION_PERSISTENCE_PROVIDER_OPTIONS).toContainEqual({
      label: "zellij",
      value: "zellij",
    });
    expect(normalizezmuxSettings({ sessionPersistenceProvider: "wat" })).toMatchObject({
      sessionPersistenceProvider: "off",
      tmuxMode: false,
    });
  });

  test("keeps common Ghostty terminal behavior settings", () => {
    /**
     * CDXC:TerminalBehaviorSettings 2026-04-29-09:32
     * The settings modal owns common Ghostty behavior controls and writes the
     * documented enum/range values into the shared Ghostty config.
     */
    expect(normalizezmuxSettings({})).toMatchObject({
      terminalClipboardPasteProtection: true,
      terminalClipboardTrimTrailingSpaces: true,
      terminalConfirmCloseSurface: "true",
      terminalCopyOnSelect: "true",
      terminalCursorStyleBlink: true,
      terminalMouseHideWhileTyping: false,
      terminalScrollbackLimitMb: 10,
      terminalScrollbar: "system",
    });
    expect(
      normalizezmuxSettings({
        terminalClipboardPasteProtection: false,
        terminalClipboardTrimTrailingSpaces: false,
        terminalConfirmCloseSurface: "always",
        terminalCopyOnSelect: "clipboard",
        terminalCursorStyleBlink: false,
        terminalMouseHideWhileTyping: true,
        terminalScrollbackLimitMb: 25,
        terminalScrollbar: "never",
      }),
    ).toMatchObject({
      terminalClipboardPasteProtection: false,
      terminalClipboardTrimTrailingSpaces: false,
      terminalConfirmCloseSurface: "always",
      terminalCopyOnSelect: "clipboard",
      terminalCursorStyleBlink: false,
      terminalMouseHideWhileTyping: true,
      terminalScrollbackLimitMb: 25,
      terminalScrollbar: "never",
    });
    expect(
      normalizezmuxSettings({
        terminalConfirmCloseSurface: "ask-me",
        terminalCopyOnSelect: "system",
        terminalScrollbackLimitMb: 1000,
        terminalScrollbar: "always",
      }),
    ).toMatchObject({
      terminalConfirmCloseSurface: "true",
      terminalCopyOnSelect: "true",
      terminalScrollbackLimitMb: 200,
      terminalScrollbar: "system",
    });
  });

  test("keeps Ghostty typography settings in documented practical ranges", () => {
    /**
     * CDXC:TerminalTypographySettings 2026-04-29-09:32
     * Typography settings default to Ghostty's macOS defaults where possible:
     * font family is unmanaged, font size is 13pt, no thickening is requested,
     * and cell metric adjustments start at zero.
     */
    expect(normalizezmuxSettings({})).toMatchObject({
      terminalFontFamily: "",
      terminalFontSize: 13,
      terminalFontWeight: 400,
      terminalLetterSpacing: 0,
      terminalLineHeight: 1,
    });
    expect(
      normalizezmuxSettings({
        terminalFontFamily: "Hack",
        terminalFontSize: 13.5,
        terminalFontWeight: 650,
        terminalLetterSpacing: 0.6,
        terminalLineHeight: 1.3,
      }),
    ).toMatchObject({
      terminalFontFamily: "Hack",
      terminalFontSize: 13.5,
      terminalFontWeight: 650,
      terminalLetterSpacing: 0.6,
      terminalLineHeight: 1.3,
    });
    expect(
      normalizezmuxSettings({
        terminalFontFamily: "Cross Platform Mono",
        terminalFontSize: 512,
        terminalFontWeight: 10,
        terminalLetterSpacing: 99,
        terminalLineHeight: -1,
      }),
    ).toMatchObject({
      terminalFontFamily: "Consolas",
      terminalFontSize: 32,
      terminalFontWeight: 100,
      terminalLetterSpacing: 8,
      terminalLineHeight: 0.8,
    });
  });

  test("keeps bundled Ghostty theme settings", () => {
    /**
     * CDXC:TerminalThemeSettings 2026-04-29-09:32
     * Ghostty theme names are exact strings from the bundled theme list. The
     * empty value means zmux should leave the user's Ghostty theme unmanaged.
     */
    expect(GHOSTTY_THEME_SETTING_OPTIONS).toContainEqual({
      label: "Use existing Ghostty config",
      value: "__zmux_ghostty_theme_unmanaged__",
    });
    expect(GHOSTTY_THEME_SETTING_OPTIONS).toContainEqual({
      label: "GitHub Dark Default",
      value: "GitHub Dark Default",
    });
    expect(
      normalizezmuxSettings({
        terminalGhosttyTheme: "GitHub Dark Default",
      }),
    ).toMatchObject({
      terminalGhosttyTheme: "GitHub Dark Default",
    });
    expect(normalizezmuxSettings({ terminalGhosttyTheme: "Not A Bundled Theme" })).toMatchObject({
      terminalGhosttyTheme: "",
    });
  });

  test("keeps valid Zed overlay settings", () => {
    expect(
      normalizezmuxSettings({
        zedOverlayEnabled: true,
        zedOverlayTargetApp: "zed",
      }),
    ).toMatchObject({
      zedOverlayEnabled: true,
      zedOverlayTargetApp: "zed",
    });
  });

  test("rejects invalid Zed overlay target apps", () => {
    expect(
      normalizezmuxSettings({
        zedOverlayTargetApp: "Cursor",
      }),
    ).toMatchObject({
      zedOverlayTargetApp: DEFAULT_zmux_SETTINGS.zedOverlayTargetApp,
    });
  });

  test("keeps VS Code IDE attachment targets", () => {
    expect(
      normalizezmuxSettings({
        zedOverlayTargetApp: "vscode",
      }).zedOverlayTargetApp,
    ).toBe("vscode");
    expect(
      normalizezmuxSettings({
        zedOverlayTargetApp: "vscode-insiders",
      }).zedOverlayTargetApp,
    ).toBe("vscode-insiders");
  });

  test("keeps IDE attachment dropdown labels distinguishable", () => {
    /**
     * CDXC:IDEAttachment 2026-04-28-00:05
     * The settings dropdown must show Zed Preview explicitly, even though
     * native title-bar buttons use the shorter "Attach Zed" text.
     */
    expect(ZED_OVERLAY_TARGET_APP_OPTIONS).toContainEqual({ label: "Zed", value: "zed" });
    expect(ZED_OVERLAY_TARGET_APP_OPTIONS).toContainEqual({
      label: "Zed Preview",
      value: "zed-preview",
    });
  });
});
