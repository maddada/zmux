import type { ITheme } from "@xterm/xterm";

const fallbackDarkTheme: ITheme = {
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

export function getTerminalTheme(): ITheme {
  const styles = getComputedStyle(document.documentElement);

  return {
    background: getCssColor(
      styles,
      ["--vscode-terminal-background", "--vscode-panel-background"],
      fallbackDarkTheme.background ?? "#080808",
    ),
    black: getCssColor(
      styles,
      ["--vscode-terminal-ansiBlack"],
      fallbackDarkTheme.black ?? "#000000",
    ),
    blue: getCssColor(styles, ["--vscode-terminal-ansiBlue"], fallbackDarkTheme.blue ?? "#2472c8"),
    brightBlack: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightBlack"],
      fallbackDarkTheme.brightBlack ?? "#666666",
    ),
    brightBlue: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightBlue"],
      fallbackDarkTheme.brightBlue ?? "#3b8eea",
    ),
    brightCyan: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightCyan"],
      fallbackDarkTheme.brightCyan ?? "#29b8db",
    ),
    brightGreen: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightGreen"],
      fallbackDarkTheme.brightGreen ?? "#23d18b",
    ),
    brightMagenta: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightMagenta"],
      fallbackDarkTheme.brightMagenta ?? "#d670d6",
    ),
    brightRed: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightRed"],
      fallbackDarkTheme.brightRed ?? "#f14c4c",
    ),
    brightWhite: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightWhite"],
      fallbackDarkTheme.brightWhite ?? "#ffffff",
    ),
    brightYellow: getCssColor(
      styles,
      ["--vscode-terminal-ansiBrightYellow"],
      fallbackDarkTheme.brightYellow ?? "#f5f543",
    ),
    cursor: getCssColor(
      styles,
      ["--vscode-terminalCursor-foreground", "--vscode-terminal-foreground"],
      fallbackDarkTheme.cursor ?? "#d4d4d4",
    ),
    cursorAccent: getCssColor(
      styles,
      ["--vscode-terminalCursor-background", "--vscode-terminal-background"],
      fallbackDarkTheme.cursorAccent ?? "#1e1e1e",
    ),
    cyan: getCssColor(styles, ["--vscode-terminal-ansiCyan"], fallbackDarkTheme.cyan ?? "#11a8cd"),
    foreground: getCssColor(
      styles,
      ["--vscode-terminal-foreground", "--vscode-editor-foreground"],
      fallbackDarkTheme.foreground ?? "#d4d4d4",
    ),
    green: getCssColor(
      styles,
      ["--vscode-terminal-ansiGreen"],
      fallbackDarkTheme.green ?? "#0dbc79",
    ),
    magenta: getCssColor(
      styles,
      ["--vscode-terminal-ansiMagenta"],
      fallbackDarkTheme.magenta ?? "#bc3fbc",
    ),
    red: getCssColor(styles, ["--vscode-terminal-ansiRed"], fallbackDarkTheme.red ?? "#cd3131"),
    selectionBackground: getCssColor(
      styles,
      ["--vscode-terminal-selectionBackground", "--vscode-editor-selectionBackground"],
      fallbackDarkTheme.selectionBackground ?? "#264f78",
    ),
    white: getCssColor(
      styles,
      ["--vscode-terminal-ansiWhite"],
      fallbackDarkTheme.white ?? "#e5e5e5",
    ),
    yellow: getCssColor(
      styles,
      ["--vscode-terminal-ansiYellow"],
      fallbackDarkTheme.yellow ?? "#e5e510",
    ),
  };
}
