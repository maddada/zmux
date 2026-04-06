import { parseGhosttyTheme, type GhosttyTheme, type ResttyFontSource } from "restty";
import mesloRegularUrl from "./fonts/MesloLGLNerdFontMono-Regular.ttf";

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

const DEFAULT_TERMINAL_FONT_FAMILIES = [
  "MesloLGL Nerd Font Mono",
  "Menlo",
  "Monaco",
  "Courier New",
] as const;

const DEFAULT_LOCAL_FONT_MATCHERS = ["MesloLGL Nerd Font Mono", "MesloLGL Nerd Font"] as const;

const fallbackTheme = {
  background: "#080808",
  black: "#000000",
  blue: "#2472c8",
  brightBlack: "#666666",
  brightBlue: "#3b8eea",
  brightCyan: "#29b8db",
  brightGreen: "#23d18b",
  brightMagenta: "#d670d6",
  brightRed: "#f14c4c",
  brightWhite: "#ffffff",
  brightYellow: "#f5f543",
  cursor: "#d4d4d4",
  cursorAccent: "#1e1e1e",
  cyan: "#11a8cd",
  foreground: "#d4d4d4",
  green: "#0dbc79",
  magenta: "#bc3fbc",
  red: "#cd3131",
  selectionBackground: "#264f78",
  white: "#e5e5e5",
  yellow: "#e5e510",
};

export function getResttyFontSources(fontFamily: string | undefined): ResttyFontSource[] {
  const fallbackSources: ResttyFontSource[] = [
    {
      label: "Meslo fallback",
      type: "url",
      url: mesloRegularUrl,
    },
  ];

  if (usesBundledDefaultFontStack(fontFamily)) {
    return fallbackSources;
  }

  return [
    {
      label: "Configured font",
      matchers: getConfiguredFontMatchers(fontFamily),
      required: false,
      type: "local",
    },
    ...fallbackSources,
  ];
}

export function getResttyTheme(): GhosttyTheme | undefined {
  const styles = getComputedStyle(document.documentElement);
  const themeSource = [
    `foreground = ${getCssColor(styles, ["--vscode-terminal-foreground", "--vscode-editor-foreground"], fallbackTheme.foreground)}`,
    `background = ${getCssColor(styles, ["--vscode-terminal-background", "--vscode-panel-background"], fallbackTheme.background)}`,
    `cursor-color = ${getCssColor(styles, ["--vscode-terminalCursor-foreground", "--vscode-terminal-foreground"], fallbackTheme.cursor)}`,
    `cursor-text = ${getCssColor(styles, ["--vscode-terminalCursor-background", "--vscode-terminal-background"], fallbackTheme.cursorAccent)}`,
    `selection-background = ${getCssColor(styles, ["--vscode-terminal-selectionBackground", "--vscode-editor-selectionBackground"], fallbackTheme.selectionBackground)}`,
    `palette = 0=${getCssColor(styles, ["--vscode-terminal-ansiBlack"], fallbackTheme.black)}`,
    `palette = 1=${getCssColor(styles, ["--vscode-terminal-ansiRed"], fallbackTheme.red)}`,
    `palette = 2=${getCssColor(styles, ["--vscode-terminal-ansiGreen"], fallbackTheme.green)}`,
    `palette = 3=${getCssColor(styles, ["--vscode-terminal-ansiYellow"], fallbackTheme.yellow)}`,
    `palette = 4=${getCssColor(styles, ["--vscode-terminal-ansiBlue"], fallbackTheme.blue)}`,
    `palette = 5=${getCssColor(styles, ["--vscode-terminal-ansiMagenta"], fallbackTheme.magenta)}`,
    `palette = 6=${getCssColor(styles, ["--vscode-terminal-ansiCyan"], fallbackTheme.cyan)}`,
    `palette = 7=${getCssColor(styles, ["--vscode-terminal-ansiWhite"], fallbackTheme.white)}`,
    `palette = 8=${getCssColor(styles, ["--vscode-terminal-ansiBrightBlack"], fallbackTheme.brightBlack)}`,
    `palette = 9=${getCssColor(styles, ["--vscode-terminal-ansiBrightRed"], fallbackTheme.brightRed)}`,
    `palette = 10=${getCssColor(styles, ["--vscode-terminal-ansiBrightGreen"], fallbackTheme.brightGreen)}`,
    `palette = 11=${getCssColor(styles, ["--vscode-terminal-ansiBrightYellow"], fallbackTheme.brightYellow)}`,
    `palette = 12=${getCssColor(styles, ["--vscode-terminal-ansiBrightBlue"], fallbackTheme.brightBlue)}`,
    `palette = 13=${getCssColor(styles, ["--vscode-terminal-ansiBrightMagenta"], fallbackTheme.brightMagenta)}`,
    `palette = 14=${getCssColor(styles, ["--vscode-terminal-ansiBrightCyan"], fallbackTheme.brightCyan)}`,
    `palette = 15=${getCssColor(styles, ["--vscode-terminal-ansiBrightWhite"], fallbackTheme.brightWhite)}`,
  ].join("\n");

  return parseGhosttyTheme(themeSource);
}

function getConfiguredFontMatchers(fontFamily: string | undefined): string[] {
  const families = getConfiguredFontFamilies(fontFamily);
  return families.length > 0 ? families : [...DEFAULT_LOCAL_FONT_MATCHERS];
}

function usesBundledDefaultFontStack(fontFamily: string | undefined): boolean {
  const families = getConfiguredFontFamilies(fontFamily);
  if (families.length === 0) {
    return true;
  }

  return familiesMatch(families, DEFAULT_TERMINAL_FONT_FAMILIES);
}

function getConfiguredFontFamilies(fontFamily: string | undefined): string[] {
  const seen = new Set<string>();
  return (
    fontFamily
      ?.match(/"[^"]+"|'[^']+'|[^,]+/g)
      ?.map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
      .filter((family) => family.length > 0)
      .filter((family) => !GENERIC_FONT_FAMILIES.has(family.toLowerCase()))
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

function familiesMatch(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((family, index) => family.toLowerCase() === right[index]?.toLowerCase());
}

function getCssColor(
  styles: CSSStyleDeclaration,
  variableNames: readonly string[],
  fallback: string,
): string {
  for (const variableName of variableNames) {
    const value = styles.getPropertyValue(variableName).trim();
    if (value) {
      return value;
    }
  }

  return fallback;
}
