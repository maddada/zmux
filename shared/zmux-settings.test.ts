import { describe, expect, test } from "vitest";
import {
  DEFAULT_zmux_SETTINGS,
  normalizezmuxSettings,
  ZED_OVERLAY_TARGET_APP_OPTIONS,
} from "./zmux-settings";

describe("normalizezmuxSettings", () => {
  test("defaults the Zed overlay settings", () => {
    expect(normalizezmuxSettings({})).toMatchObject({
      zedOverlayEnabled: DEFAULT_zmux_SETTINGS.zedOverlayEnabled,
      zedOverlayTargetApp: DEFAULT_zmux_SETTINGS.zedOverlayTargetApp,
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
