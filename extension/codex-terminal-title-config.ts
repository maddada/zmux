import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const SECTION_HEADER_PATTERN = /^\[[^\]]+\]\s*(?:#.*)?$/;
const TERMINAL_TITLE_ASSIGNMENT_PATTERN = /^terminal_title\s*=/;
const STATUS_LINE_ASSIGNMENT_PATTERN = /^status_line\s*=/;
const TUI_SECTION_HEADER_PATTERN = /^\[tui\]\s*(?:#.*)?$/;

export const CODEX_WELCOME_TERMINAL_TITLE = ["spinner", "thread"] as const;
export const CODEX_WELCOME_STATUS_LINE = [
  "thread-title",
  "model-with-reasoning",
  "current-dir",
  "context-usage",
  "used-tokens",
  "weekly-limit",
] as const;

const CODEX_WELCOME_TERMINAL_TITLE_LINE = `terminal_title = ["${CODEX_WELCOME_TERMINAL_TITLE[0]}", "${CODEX_WELCOME_TERMINAL_TITLE[1]}"]`;
const CODEX_WELCOME_STATUS_LINE_LINE = `status_line = [${CODEX_WELCOME_STATUS_LINE.map((item) => `"${item}"`).join(", ")}]`;

export type WriteCodexWelcomeTuiSettingResult = {
  changed: boolean;
  configPath: string;
};

type TuiSettingName = "statusLine" | "terminalTitle";
type ResolveActiveCodexConfigPathOptions = {
  homeDir?: string;
  pathApi?: Pick<typeof path, "join">;
};

const isMissingFileError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

export const resolveActiveCodexConfigPath = (
  environment: NodeJS.ProcessEnv = process.env,
  options: ResolveActiveCodexConfigPathOptions = {},
) => {
  const pathApi = options.pathApi ?? path;
  const configuredCodexHome = environment.CODEX_HOME?.trim();
  const codexHome =
    configuredCodexHome && configuredCodexHome.length > 0
      ? configuredCodexHome
      : pathApi.join(options.homeDir ?? os.homedir(), ".codex");
  return pathApi.join(codexHome, "config.toml");
};

const getTuiSettingLine = (setting: TuiSettingName) =>
  setting === "terminalTitle" ? CODEX_WELCOME_TERMINAL_TITLE_LINE : CODEX_WELCOME_STATUS_LINE_LINE;

const getTuiSettingPattern = (setting: TuiSettingName) =>
  setting === "terminalTitle" ? TERMINAL_TITLE_ASSIGNMENT_PATTERN : STATUS_LINE_ASSIGNMENT_PATTERN;

function setCodexWelcomeTuiSetting(content: string, setting: TuiSettingName): string {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const trimmedContent = normalizedContent.trim();
  const lines = trimmedContent.length > 0 ? normalizedContent.replace(/\n+$/, "").split("\n") : [];
  const nextSettingLine = getTuiSettingLine(setting);
  const settingPattern = getTuiSettingPattern(setting);

  let tuiSectionStartIndex = -1;
  let tuiSectionEndIndex = lines.length;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const trimmedLine = lines[lineIndex]?.trim() ?? "";

    if (tuiSectionStartIndex === -1) {
      if (TUI_SECTION_HEADER_PATTERN.test(trimmedLine)) {
        tuiSectionStartIndex = lineIndex;
      }
      continue;
    }

    if (SECTION_HEADER_PATTERN.test(trimmedLine)) {
      tuiSectionEndIndex = lineIndex;
      break;
    }
  }

  if (tuiSectionStartIndex === -1) {
    const nextLines = [...lines];
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
      nextLines.push("");
    }
    nextLines.push("[tui]", nextSettingLine);
    return `${nextLines.join(newline)}${newline}`;
  }

  const beforeTuiSection = lines.slice(0, tuiSectionStartIndex + 1);
  const tuiSectionBody = lines.slice(tuiSectionStartIndex + 1, tuiSectionEndIndex);
  const afterTuiSection = lines.slice(tuiSectionEndIndex);
  const nextTuiSectionBody: string[] = [];
  let didWriteSetting = false;

  for (const line of tuiSectionBody) {
    const trimmedLine = line.trim();
    if (settingPattern.test(trimmedLine)) {
      if (!didWriteSetting) {
        nextTuiSectionBody.push(nextSettingLine);
        didWriteSetting = true;
      }
      continue;
    }

    nextTuiSectionBody.push(line);
  }

  if (!didWriteSetting) {
    let insertIndex = nextTuiSectionBody.length;
    while (insertIndex > 0 && nextTuiSectionBody[insertIndex - 1]?.trim() === "") {
      insertIndex -= 1;
    }
    nextTuiSectionBody.splice(insertIndex, 0, nextSettingLine);
  }

  return `${[...beforeTuiSection, ...nextTuiSectionBody, ...afterTuiSection].join(newline)}${newline}`;
}

async function writeCodexWelcomeTuiSetting(
  setting: TuiSettingName,
  configPath = resolveActiveCodexConfigPath(),
): Promise<WriteCodexWelcomeTuiSettingResult> {
  await mkdir(path.dirname(configPath), { recursive: true });

  const existingContent = await readFile(configPath, "utf8").catch((error: unknown) => {
    if (isMissingFileError(error)) {
      return "";
    }
    throw error;
  });
  const nextContent = setCodexWelcomeTuiSetting(existingContent, setting);

  if (nextContent === existingContent) {
    return {
      changed: false,
      configPath,
    };
  }

  await writeFile(configPath, nextContent, "utf8");
  return {
    changed: true,
    configPath,
  };
}

export const setCodexWelcomeTerminalTitle = (content: string) =>
  setCodexWelcomeTuiSetting(content, "terminalTitle");

export const setCodexWelcomeStatusLine = (content: string) =>
  setCodexWelcomeTuiSetting(content, "statusLine");

export const writeCodexWelcomeTerminalTitle = (configPath?: string) =>
  writeCodexWelcomeTuiSetting("terminalTitle", configPath);

export const writeCodexWelcomeStatusLine = (configPath?: string) =>
  writeCodexWelcomeTuiSetting("statusLine", configPath);
