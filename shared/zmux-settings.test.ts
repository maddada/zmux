import { describe, expect, test } from "vitest";
import { DEFAULT_zmux_SETTINGS, normalizezmuxSettings } from "./zmux-settings";

describe("normalizezmuxSettings", () => {
  test("defaults the Zed overlay settings", () => {
    expect(normalizezmuxSettings({})).toMatchObject({
      terminalRestartSurvivalTimeoutMinutes:
        DEFAULT_zmux_SETTINGS.terminalRestartSurvivalTimeoutMinutes,
      terminalSessionPersistenceMode: DEFAULT_zmux_SETTINGS.terminalSessionPersistenceMode,
      zedOverlayEnabled: DEFAULT_zmux_SETTINGS.zedOverlayEnabled,
      zedOverlayTargetApp: DEFAULT_zmux_SETTINGS.zedOverlayTargetApp,
    });
  });

  test("normalizes the native terminal persistence mode", () => {
    expect(
      normalizezmuxSettings({
        terminalSessionPersistenceMode: "embedded",
      }).terminalSessionPersistenceMode,
    ).toBe("embedded");
    expect(
      normalizezmuxSettings({
        terminalSessionPersistenceMode: "persistent",
      }).terminalSessionPersistenceMode,
    ).toBe("persistent");
    expect(
      normalizezmuxSettings({
        terminalSessionPersistenceMode: "tmux",
      }).terminalSessionPersistenceMode,
    ).toBe(DEFAULT_zmux_SETTINGS.terminalSessionPersistenceMode);
  });

  test("clamps the native terminal restart survival timeout", () => {
    expect(
      normalizezmuxSettings({
        terminalRestartSurvivalTimeoutMinutes: -1,
      }).terminalRestartSurvivalTimeoutMinutes,
    ).toBe(0);
    expect(
      normalizezmuxSettings({
        terminalRestartSurvivalTimeoutMinutes: 2000,
      }).terminalRestartSurvivalTimeoutMinutes,
    ).toBe(1440);
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
