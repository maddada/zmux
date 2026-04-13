import type { ITerminalOptions } from "@xterm/xterm";
import type { WorkspacePanelTerminalAppearance } from "../shared/workspace-panel-contract";

export type TerminalAppearanceOptions = Pick<
  ITerminalOptions,
  | "cursorBlink"
  | "cursorStyle"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "letterSpacing"
  | "lineHeight"
>;

const FALLBACK_TERMINAL_FONT_FAMILY = "monospace";

export type TerminalAppearanceDependencies = readonly [
  cursorBlink: boolean,
  cursorStyle: WorkspacePanelTerminalAppearance["cursorStyle"],
  fontFamily: string,
  fontSize: number,
  fontWeight: number,
  letterSpacing: number,
  lineHeight: number,
  scrollToBottomWhenTyping: boolean,
];

function normalizeTerminalFontFamily(fontFamily: string): string {
  return fontFamily.trim() || FALLBACK_TERMINAL_FONT_FAMILY;
}

export function getNormalizedTerminalAppearance(
  appearance: WorkspacePanelTerminalAppearance,
): TerminalAppearanceOptions {
  return {
    cursorBlink: appearance.cursorBlink,
    cursorStyle: appearance.cursorStyle,
    fontFamily: normalizeTerminalFontFamily(appearance.fontFamily),
    fontSize: appearance.fontSize,
    fontWeight: appearance.fontWeight,
    letterSpacing: appearance.letterSpacing,
    lineHeight: appearance.lineHeight,
  };
}

export function getTerminalAppearanceOptions(
  appearance: WorkspacePanelTerminalAppearance,
): TerminalAppearanceOptions {
  return getNormalizedTerminalAppearance(appearance);
}

export function getTerminalAppearanceDependencies(
  appearance: WorkspacePanelTerminalAppearance,
): TerminalAppearanceDependencies {
  const normalizedAppearance = getNormalizedTerminalAppearance(appearance);
  return [
    normalizedAppearance.cursorBlink,
    normalizedAppearance.cursorStyle,
    normalizedAppearance.fontFamily,
    normalizedAppearance.fontSize,
    normalizedAppearance.fontWeight,
    normalizedAppearance.letterSpacing,
    normalizedAppearance.lineHeight,
    appearance.scrollToBottomWhenTyping,
  ];
}

export function getTerminalAppearanceFontLoadKey(fontFamily: string | undefined): string {
  return normalizeTerminalFontFamily(fontFamily ?? "").trim();
}
