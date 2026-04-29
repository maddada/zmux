import { describe, expect, test } from "vitest";
import { DEFAULT_zmux_SETTINGS } from "./zmux-settings";
import { getGhosttyTerminalConfigValues } from "./ghostty-terminal-settings";

describe("getGhosttyTerminalConfigValues", () => {
  test("maps zmux terminal settings to documented Ghostty config values", () => {
    expect(
      getGhosttyTerminalConfigValues({
        ...DEFAULT_zmux_SETTINGS,
        terminalFontFamily: "JetBrains Mono",
        terminalFontSize: 13,
        terminalFontWeight: 650,
        terminalLetterSpacing: 0.5,
        terminalLineHeight: 1.1,
        terminalMouseScrollMultiplierDiscrete: 4,
        terminalMouseScrollMultiplierPrecision: 0.75,
      }),
    ).toEqual({
      adjustCellHeightPercent: 0.10000000000000009,
      adjustCellWidth: 0.5,
      fontFamily: "JetBrains Mono",
      fontSize: 13,
      fontThicken: true,
      fontThickenStrength: 128,
      mouseScrollMultiplierDiscrete: 4,
      mouseScrollMultiplierPrecision: 0.75,
    });
  });
});
