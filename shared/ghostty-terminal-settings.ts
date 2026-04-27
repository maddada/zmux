import { getGhosttyFontFamilyForPreset } from "./terminal-font-preset";
import type { zmuxSettings } from "./zmux-settings";

export type GhosttyTerminalConfigValues = {
  adjustCellHeightPercent: number;
  adjustCellWidth: number;
  fontFamily: string;
  fontSize: number;
  fontThicken: boolean;
  fontThickenStrength: number;
};

/**
 * CDXC:TerminalSettings 2026-04-26-19:02
 * Ghostty does not expose a CSS-style font-weight setting. zmux maps weights
 * above normal to Ghostty's macOS font-thicken controls and writes line height
 * through adjust-cell-height, matching the documented Ghostty config keys.
 */
export function getGhosttyTerminalConfigValues(
  settings: zmuxSettings,
): GhosttyTerminalConfigValues {
  return {
    adjustCellHeightPercent: settings.terminalLineHeight - 1,
    adjustCellWidth: settings.terminalLetterSpacing,
    fontFamily: getGhosttyFontFamilyForPreset(settings.terminalFontFamily),
    fontSize: settings.terminalFontSize,
    fontThicken: settings.terminalFontWeight > 400,
    fontThickenStrength: Math.round(
      clampNumber((settings.terminalFontWeight - 400) / 500, 0, 1) * 255,
    ),
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
