import { getVisiblePrimaryTitle, normalizeTerminalTitle } from "./session-grid-contract";

/**
 * CDXC:NativeOnlyCleanup 2026-05-05-02:22
 * Native zmux owns active terminal/session behavior. Keep first-prompt
 * title helpers in shared code so the retired VS Code extension tree can be
 * removed without changing native Ghostty session naming.
 */

export type FirstPromptAutoRenameStrategy = "sendBareRenameCommand" | "generateTitleAndRename";
export type FirstPromptAutoRenameDecisionReason =
  | "alreadyAutoNamed"
  | "alreadyPending"
  | "eligible"
  | "emptyPrompt"
  | "inlineSlashCommandReference"
  | "metaPrompt"
  | "nonGenericCurrentTitle"
  | "slashCommand"
  | "unsupportedAgent";

export type FirstPromptAutoRenameDecision = {
  normalizedPrompt?: string;
  reason: FirstPromptAutoRenameDecisionReason;
  shouldAutoName: boolean;
  strategy?: FirstPromptAutoRenameStrategy;
};

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
  /**
   * CDXC:SessionTitleSync 2026-04-28-03:49
   * First-prompt auto-title is allowed only while the session is effectively
   * untitled. Placeholder creation names and path-like shell titles are not
   * persisted names, but user/terminal/generated meaningful titles must block
   * generation so hooks cannot overwrite established session titles.
   */
  if (title !== undefined && !getVisiblePrimaryTitle(title)) {
    return true;
  }

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
  return explainFirstPromptAutoRenameDecision(input).shouldAutoName;
}

export function explainFirstPromptAutoRenameDecision(input: {
  agentName: string | undefined;
  currentTitle: string | undefined;
  hasAutoTitleFromFirstPrompt?: boolean;
  pendingFirstPromptAutoRenamePrompt?: string;
  prompt: string | undefined;
}): FirstPromptAutoRenameDecision {
  const strategy = resolveFirstPromptAutoRenameStrategy(input.agentName);
  if (!strategy) {
    return {
      reason: "unsupportedAgent",
      shouldAutoName: false,
    };
  }

  if (input.hasAutoTitleFromFirstPrompt) {
    return {
      reason: "alreadyAutoNamed",
      shouldAutoName: false,
      strategy,
    };
  }

  if (input.pendingFirstPromptAutoRenamePrompt?.trim()) {
    return {
      reason: "alreadyPending",
      shouldAutoName: false,
      strategy,
    };
  }

  if (!input.prompt?.trim()) {
    return {
      reason: "emptyPrompt",
      shouldAutoName: false,
      strategy,
    };
  }

  const normalizedPrompt = normalizePrompt(input.prompt);
  if (!normalizedPrompt) {
    return {
      reason: "emptyPrompt",
      shouldAutoName: false,
      strategy,
    };
  }

  if (isMetaPrompt(normalizedPrompt)) {
    return {
      normalizedPrompt,
      reason: "metaPrompt",
      shouldAutoName: false,
      strategy,
    };
  }

  if (normalizedPrompt.startsWith("/")) {
    return {
      normalizedPrompt,
      reason: "slashCommand",
      shouldAutoName: false,
      strategy,
    };
  }

  if (containsInlineSlashCommandReference(normalizedPrompt)) {
    return {
      normalizedPrompt,
      reason: "inlineSlashCommandReference",
      shouldAutoName: false,
      strategy,
    };
  }

  if (!isGenericAgentSessionTitle(input.agentName, input.currentTitle)) {
    return {
      normalizedPrompt,
      reason: "nonGenericCurrentTitle",
      shouldAutoName: false,
      strategy,
    };
  }

  return {
    normalizedPrompt,
    reason: "eligible",
    shouldAutoName: true,
    strategy,
  };
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
