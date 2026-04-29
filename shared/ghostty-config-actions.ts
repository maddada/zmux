export const GHOSTTY_SETTINGS_DOCS_URL = "https://ghostty.org/docs/config/reference";

/**
 * CDXC:GhosttySettings 2026-04-30-01:48
 * Settings users need one-click Ghostty defaults, zmux recommended settings,
 * docs, and direct config-file access. Keep the managed key list explicit so
 * reset removes only the keys zmux owns while preserving unrelated user config.
 */
export const ZMUX_GHOSTTY_MANAGED_CONFIG_KEYS = [
  "adjust-cell-height",
  "adjust-cell-width",
  "background",
  "cursor-color",
  "cursor-style",
  "cursor-style-blink",
  "font-family",
  "font-size",
  "font-thicken",
  "font-thicken-strength",
  "foreground",
  "macos-option-as-alt",
  "mouse-scroll-multiplier",
  "mouse-shift-capture",
  "selection-background",
  "theme",
  "unfocused-split-opacity",
] as const;

export const ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES = [
  "# Applied by zmux:",
  "theme = GitHub Dark",
  "background = #000000",
  "foreground = #ffffff",
  "selection-background = #07284f",
  "cursor-style = bar",
  "cursor-style-blink = false",
  "cursor-color = #FFFFFF",
  "",
  "unfocused-split-opacity = 1",
  "mouse-shift-capture = always",
  "macos-option-as-alt = true",
  "",
  'font-family = "JetBrains Mono"',
  "font-size = 13",
  "font-thicken = false",
  "font-thicken-strength = 0",
  "adjust-cell-height = 20%",
  "adjust-cell-width = 0",
  "mouse-scroll-multiplier = 1",
] as const;

export function mergeGhosttyConfigLines(
  config: string,
  managedLines: readonly string[],
  managedKeys: readonly string[] = ZMUX_GHOSTTY_MANAGED_CONFIG_KEYS,
): string {
  const managedKeySet = new Set(managedKeys);
  const retainedLines = config
    .split(/\r?\n/u)
    .filter((line) => !managedKeySet.has(readGhosttyConfigKey(line)));

  while (retainedLines.at(-1)?.trim() === "") {
    retainedLines.pop();
  }

  const nextLines = [...retainedLines, ...managedLines];
  while (nextLines.at(-1)?.trim() === "") {
    nextLines.pop();
  }

  return nextLines.length > 0 ? `${nextLines.join("\n")}\n` : "";
}

function readGhosttyConfigKey(line: string): string {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return "";
  }
  return trimmedLine.split("=", 1)[0]?.trim() ?? "";
}
