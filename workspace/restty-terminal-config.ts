import { parseGhosttyTheme, type GhosttyTheme, type ResttyFontSource } from "restty";

const bundledJetBrainsMonoUrl = new URL("./fonts/JetBrainsMono[wght].ttf", import.meta.url).href;
const bundledJetBrainsMonoItalicUrl = new URL(
  "./fonts/JetBrainsMono-Italic[wght].ttf",
  import.meta.url,
).href;
const bundledMesloRegularUrl = new URL("./fonts/MesloLGLNerdFontMono-Regular.ttf", import.meta.url)
  .href;

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

const BUNDLED_FONT_SOURCES: ResttyFontSource[] = [
  {
    label: "Bundled JetBrains Mono",
    type: "url",
    url: bundledJetBrainsMonoUrl,
  },
  {
    label: "Bundled JetBrains Mono Italic",
    type: "url",
    url: bundledJetBrainsMonoItalicUrl,
  },
  {
    label: "Bundled Meslo Nerd Font Mono",
    type: "url",
    url: bundledMesloRegularUrl,
  },
];

export function getResttyFontSources(fontFamily: string | undefined): ResttyFontSource[] {
  const configuredFamilies = getConfiguredFontFamilies(fontFamily);
  const localSources = canUseLocalFontSources()
    ? configuredFamilies.flatMap(createLocalFontSourcesForFamily)
    : [];
  return [...localSources, ...BUNDLED_FONT_SOURCES];
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

function createLocalFontSourcesForFamily(family: string): ResttyFontSource[] {
  return [
    {
      label: family,
      matchers: createFamilyMatchers(family),
      required: false,
      type: "local" as const,
    },
  ];
}

function createFamilyMatchers(family: string): string[] {
  const trimmedFamily = family.trim();
  const compactFamily = trimmedFamily.replace(/[\s_-]+/g, "");
  return dedupeMatchers([trimmedFamily, compactFamily]);
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

function dedupeMatchers(matchers: readonly string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const matcher of matchers) {
    const normalizedMatcher = matcher.trim().toLowerCase();
    if (!normalizedMatcher || seen.has(normalizedMatcher)) {
      continue;
    }

    seen.add(normalizedMatcher);
    deduped.push(matcher.trim());
  }

  return deduped;
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

function canUseLocalFontSources(): boolean {
  const globalWithLocalFonts = globalThis as typeof globalThis & {
    queryLocalFonts?: unknown;
  };
  const navigatorWithLocalFonts =
    typeof navigator === "undefined"
      ? undefined
      : (navigator as Navigator & { queryLocalFonts?: unknown });
  const hasQueryLocalFonts =
    typeof globalWithLocalFonts.queryLocalFonts === "function" ||
    typeof navigatorWithLocalFonts?.queryLocalFonts === "function";

  if (!hasQueryLocalFonts) {
    return false;
  }

  if (typeof document === "undefined") {
    return true;
  }

  if (globalThis.location?.protocol === "vscode-webview:") {
    return false;
  }

  const documentWithPolicy = document as Document & {
    featurePolicy?: {
      allowsFeature?: (feature: string) => boolean;
    };
    permissionsPolicy?: {
      allowsFeature?: (feature: string) => boolean;
    };
  };
  const policy =
    documentWithPolicy.permissionsPolicy ?? documentWithPolicy.featurePolicy ?? undefined;

  if (typeof policy?.allowsFeature === "function") {
    return policy.allowsFeature("local-fonts");
  }

  return true;
}
