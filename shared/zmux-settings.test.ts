import { describe, expect, test } from "vitest";
import {
  DEFAULT_zmux_SETTINGS,
  normalizezmuxSettings,
  ZED_OVERLAY_TARGET_APP_OPTIONS,
} from "./zmux-settings";

describe("normalizezmuxSettings", () => {
  test("defaults the Zed overlay settings", () => {
    expect(normalizezmuxSettings({})).toMatchObject({
      syncOpenProjectWithZed: DEFAULT_zmux_SETTINGS.syncOpenProjectWithZed,
      zedOverlayEnabled: DEFAULT_zmux_SETTINGS.zedOverlayEnabled,
      zedOverlayTargetApp: DEFAULT_zmux_SETTINGS.zedOverlayTargetApp,
    });
  });

  test("keeps Sync Open Project with Zed enabled by default", () => {
    /**
     * CDXC:ZedOverlayWorkspace 2026-04-28-05:18
     * The sync setting must default on so existing users get project-to-Zed
     * syncing after switching zmux workspaces, with the debounce owned by the
     * sidebar instead of by the native Show Zed button.
     */
    expect(DEFAULT_zmux_SETTINGS.syncOpenProjectWithZed).toBe(true);
    expect(normalizezmuxSettings({ syncOpenProjectWithZed: false })).toMatchObject({
      syncOpenProjectWithZed: false,
    });
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
