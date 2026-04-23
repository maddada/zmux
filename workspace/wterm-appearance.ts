import { loadFonts } from "@xterm/addon-web-fonts";
import type { ITheme } from "@xterm/xterm";
import type { WorkspacePanelTerminalAppearance } from "../shared/workspace-panel-contract";
import {
  getTerminalAppearanceFontLoadKey,
  getTerminalAppearanceOptions,
} from "./terminal-appearance";
import { getTerminalTheme } from "./terminal-theme";

const GENERIC_FONT_FAMILIES = new Set([
  "cursive",
  "emoji",
  "fangsong",
  "fantasy",
  "math",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif",
]);

const terminalWebFontLoadPromiseByKey = new Map<string, Promise<void>>();

export function applyWtermHostAppearance(
  host: HTMLElement,
  appearance: WorkspacePanelTerminalAppearance,
): void {
  const normalizedAppearance = getTerminalAppearanceOptions(appearance);
  const theme = getTerminalTheme();

  host.dataset.cursorStyle = normalizedAppearance.cursorStyle;
  host.style.setProperty("--term-font-family", normalizedAppearance.fontFamily);
  host.style.setProperty("--term-font-size", `${normalizedAppearance.fontSize}px`);
  host.style.setProperty("--term-line-height", String(normalizedAppearance.lineHeight));
  host.style.fontWeight = String(normalizedAppearance.fontWeight);
  // xterm applies letter spacing as a cell-metrics adjustment. WTerm renders
  // text runs directly in the DOM, so raw CSS letter-spacing makes the terminal
  // look overly wide and can distort alignment. Keep DOM glyph spacing normal.
  host.style.letterSpacing = "0px";

  const cssVariables = getWtermThemeCssVariables(theme);
  for (const [name, value] of Object.entries(cssVariables)) {
    host.style.setProperty(name, value);
  }
}

export function getWtermThemeCssVariables(theme: ITheme): Record<string, string> {
  const ansiPalette = [
    theme.black,
    theme.red,
    theme.green,
    theme.yellow,
    theme.blue,
    theme.magenta,
    theme.cyan,
    theme.white,
    theme.brightBlack,
    theme.brightRed,
    theme.brightGreen,
    theme.brightYellow,
    theme.brightBlue,
    theme.brightMagenta,
    theme.brightCyan,
    theme.brightWhite,
  ];

  const cssVariables: Record<string, string> = {
    "--term-bg": theme.background ?? "#080808",
    "--term-cursor": theme.cursor ?? theme.foreground ?? "#d4d4d4",
    "--term-fg": theme.foreground ?? "#d4d4d4",
    "--term-selection-background": theme.selectionBackground ?? "rgba(86, 156, 214, 0.3)",
  };
  ansiPalette.forEach((value, index) => {
    cssVariables[`--term-color-${index}`] = value ?? cssVariables["--term-fg"];
  });
  return cssVariables;
}

export async function ensureWtermWebFontsLoaded(
  fontFamily: string | undefined,
): Promise<{ families: string[] }> {
  const families = getLoadableWebFontFamilies(fontFamily);
  if (families.length === 0) {
    return { families };
  }

  const loadKey = getTerminalAppearanceFontLoadKey(fontFamily);
  let loadPromise = terminalWebFontLoadPromiseByKey.get(loadKey);
  if (!loadPromise) {
    loadPromise = loadFonts(families)
      .then(() => undefined)
      .catch((error) => {
        terminalWebFontLoadPromiseByKey.delete(loadKey);
        throw error;
      });
    terminalWebFontLoadPromiseByKey.set(loadKey, loadPromise);
  }

  await loadPromise;
  await document.fonts?.ready;
  return { families };
}

function getLoadableWebFontFamilies(fontFamily: string | undefined): string[] {
  if (!fontFamily) {
    return [];
  }

  const registeredFamilies = new Set(
    Array.from(document.fonts ?? [])
      .map((font) =>
        font.family
          .trim()
          .replace(/^['"]|['"]$/g, "")
          .toLowerCase(),
      )
      .filter((family) => family.length > 0),
  );
  const seen = new Set<string>();
  return (
    fontFamily
      .match(/"[^"]+"|'[^']+'|[^,]+/g)
      ?.map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
      .filter((family) => family.length > 0)
      .filter((family) => !GENERIC_FONT_FAMILIES.has(family.toLowerCase()))
      .filter(
        (family) => registeredFamilies.size === 0 || registeredFamilies.has(family.toLowerCase()),
      )
      .filter((family) => {
        const normalizedFamily = family.toLowerCase();
        if (seen.has(normalizedFamily)) {
          return false;
        }
        seen.add(normalizedFamily);
        return true;
      }) ?? []
  );
}
