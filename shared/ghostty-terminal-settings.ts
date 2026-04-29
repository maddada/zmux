import { getGhosttyFontFamilyForPreset } from "./terminal-font-preset";
import type { zmuxSettings } from "./zmux-settings";

export type GhosttyTerminalConfigValues = {
  adjustCellHeightPercent: number;
  adjustCellWidth: number;
  fontFamily: string;
  fontSize: number;
  fontThicken: boolean;
  fontThickenStrength: number;
  mouseScrollMultiplierDiscrete: number;
  mouseScrollMultiplierPrecision: number;
};

/**
 * CDXC:TerminalSettings 2026-04-26-19:02
 * Ghostty does not expose a CSS-style font-weight setting. zmux maps weights
 * above normal to Ghostty's macOS font-thicken controls and writes line height
 * through adjust-cell-height, matching the documented Ghostty config keys.
 *
 * CDXC:TerminalScrollSettings 2026-04-29-08:56
 * Mouse wheel speed is a native Ghostty setting, not a zmux event transform.
 * Emit precision and discrete mouse-scroll-multiplier values so Ghostty starts
 * in the requested scroll mode and external Ghostty windows share the setting.
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
    mouseScrollMultiplierDiscrete: settings.terminalMouseScrollMultiplierDiscrete,
    mouseScrollMultiplierPrecision: settings.terminalMouseScrollMultiplierPrecision,
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
