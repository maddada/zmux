import type { ITerminalOptions } from "@xterm/xterm";
import type { WorkspacePanelTerminalAppearance } from "../shared/workspace-panel-contract";

export type TerminalAppearanceOptions = Pick<
  ITerminalOptions,
  "cursorBlink" | "cursorStyle" | "fontFamily" | "fontSize" | "letterSpacing" | "lineHeight"
>;

export type TerminalAppearanceDependencies = readonly [
  cursorBlink: boolean,
  cursorStyle: WorkspacePanelTerminalAppearance["cursorStyle"],
  fontFamily: string,
  fontSize: number,
  letterSpacing: number,
  lineHeight: number,
  scrollToBottomWhenTyping: boolean,
];

export function getTerminalAppearanceOptions(
  appearance: WorkspacePanelTerminalAppearance,
): TerminalAppearanceOptions {
  return {
    cursorBlink: appearance.cursorBlink,
    cursorStyle: appearance.cursorStyle,
    fontFamily: appearance.fontFamily,
    fontSize: appearance.fontSize,
    letterSpacing: appearance.letterSpacing,
    lineHeight: appearance.lineHeight,
  };
}

export function getTerminalAppearanceDependencies(
  appearance: WorkspacePanelTerminalAppearance,
): TerminalAppearanceDependencies {
  return [
    appearance.cursorBlink,
    appearance.cursorStyle,
    appearance.fontFamily,
    appearance.fontSize,
    appearance.letterSpacing,
    appearance.lineHeight,
    appearance.scrollToBottomWhenTyping,
  ];
}

export function getTerminalAppearanceFontLoadKey(fontFamily: string | undefined): string {
  return fontFamily?.trim() ?? "";
}
