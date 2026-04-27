import { describe, expect, test } from "vitest";
import { DEFAULT_zmux_SETTINGS, normalizezmuxSettings } from "./zmux-settings";

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
});
