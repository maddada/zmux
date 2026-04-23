import { normalizeTerminalTitle } from "../shared/session-grid-contract";

export type FirstPromptAutoRenameStrategy = "sendBareRenameCommand" | "generateTitleAndRename";

const META_PROMPT_PREFIXES = [
  "<command",
  "<environment_context",
  "<permissions instructions>",
  "<user_instructions>",
  "<INSTRUCTIONS>",
  "<collaboration_mode>",
  "<app-context>",
  "<turn_aborted>",
  "<ide_opened_file>",
  "<local-",
  "[Tool Result]",
  "Caveat:",
] as const;

const GENERIC_SESSION_TITLES_BY_AGENT = new Map<string, ReadonlySet<string>>([
  ["claude", new Set(["claude", "claude code"])],
  ["codex", new Set(["codex", "openai codex", "codex cli"])],
  ["gemini", new Set(["gemini"])],
  ["opencode", new Set(["opencode", "open code"])],
]);
const LEADING_PROMPT_FILLER_PATTERN =
  /^(?:(?:please|kindly|hey|hi|hello)\s+|(?:can|could|would|will)\s+you\s+|(?:can|could|would)\s+we\s+|help\s+me\s+|i\s+need(?:\s+you)?\s+to\s+|i\s+need\s+|how\s+do\s+i\s+|how\s+does\s+|is\s+there\s+(?:any\s+)?way\s+to\s+)+/iu;
const INLINE_SLASH_COMMAND_PATTERN = /(?:^|[\s([{"'`])\/[a-z][\w-]*(?=\s|$|[).,:;!?'"`])/iu;

export function resolveFirstPromptAutoRenameStrategy(
  agentName: string | undefined,
): FirstPromptAutoRenameStrategy | undefined {
  const normalizedAgentName = agentName?.trim().toLowerCase();
  if (normalizedAgentName === "claude") {
    return "sendBareRenameCommand";
  }

  if (normalizedAgentName === "codex") {
    return "generateTitleAndRename";
  }

  return undefined;
}

export function isGenericAgentSessionTitle(
  agentName: string | undefined,
  title: string | undefined,
): boolean {
  const normalizedTitle = normalizeTerminalTitle(title)?.toLowerCase();
  if (!normalizedTitle) {
    return true;
  }

  const genericTitles = GENERIC_SESSION_TITLES_BY_AGENT.get(agentName?.trim().toLowerCase() ?? "");
  return genericTitles ? genericTitles.has(normalizedTitle) : false;
}

export function shouldAutoNameSessionFromFirstPrompt(input: {
  agentName: string | undefined;
  currentTitle: string | undefined;
  hasAutoTitleFromFirstPrompt?: boolean;
  pendingFirstPromptAutoRenamePrompt?: string;
  prompt: string | undefined;
}): boolean {
  if (!resolveFirstPromptAutoRenameStrategy(input.agentName)) {
    return false;
  }

  if (input.hasAutoTitleFromFirstPrompt) {
    return false;
  }

  if (input.pendingFirstPromptAutoRenamePrompt?.trim()) {
    return false;
  }

  if (!input.prompt?.trim()) {
    return false;
  }

  const normalizedPrompt = normalizePrompt(input.prompt);
  if (
    !normalizedPrompt ||
    isMetaPrompt(normalizedPrompt) ||
    normalizedPrompt.startsWith("/") ||
    containsInlineSlashCommandReference(normalizedPrompt)
  ) {
    return false;
  }

  return isGenericAgentSessionTitle(input.agentName, input.currentTitle);
}

function normalizePrompt(prompt: string): string | undefined {
  const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();
  if (!normalizedPrompt) {
    return undefined;
  }

  const strippedPrompt = normalizedPrompt.replace(LEADING_PROMPT_FILLER_PATTERN, "").trim();
  const cleanedPrompt = (strippedPrompt || normalizedPrompt).replace(/[.?!:;,]+$/g, "").trim();
  return cleanedPrompt || undefined;
}

function containsInlineSlashCommandReference(prompt: string): boolean {
  return INLINE_SLASH_COMMAND_PATTERN.test(prompt);
}

function isMetaPrompt(prompt: string): boolean {
  if (prompt.startsWith("# AGENTS")) {
    return true;
  }

  if (prompt.includes("tool_use_id")) {
    return true;
  }

  return META_PROMPT_PREFIXES.some((prefix) => prompt.startsWith(prefix));
}
