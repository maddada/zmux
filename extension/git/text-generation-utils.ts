import { GENERATED_SESSION_TITLE_MAX_LENGTH } from "../native-terminal-workspace/session-title-generation";
import type { GitTextGenerationSettings } from "../../shared/git-text-generation-provider";
import { quoteShellLiteral } from "../agent-shell-integration-utils";

type CommitMessageGenerationResult = {
  body: string;
  subject: string;
};

type PrContentGenerationResult = {
  body: string;
  title: string;
};

export type GitTextGenerationPurpose = "commit-message" | "pull-request" | "session-title";

export function buildGitTextGenerationShellCommand(
  settings: GitTextGenerationSettings,
  prompt: string,
  outputFilePath: string,
  purpose: GitTextGenerationPurpose,
): string {
  const effort = getGitTextGenerationEffort(purpose);

  if (settings.provider === "claude") {
    return buildCommandLine("claude", ["--model", "haiku", "--effort", effort, "-p", prompt]);
  }

  if (settings.provider === "custom") {
    return buildCustomGitTextGenerationShellCommand(settings.customCommand, prompt, outputFilePath);
  }

  return buildCommandLine("codex", [
    "-m",
    "gpt-5.4-mini",
    "-c",
    `model_reasoning_effort="${effort}"`,
    "exec",
    "-",
  ]);
}

export function getGitTextGenerationEffort(purpose: GitTextGenerationPurpose): "low" | "medium" {
  return purpose === "session-title" ? "low" : "medium";
}

export function parseGeneratedCommitMessageText(value: string): CommitMessageGenerationResult {
  const lines = normalizeGeneratedText(value).split(/\r?\n/g);
  const subjectLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (subjectLineIndex < 0) {
    throw new Error("Git text generation returned an empty commit message.");
  }

  return {
    body: lines
      .slice(subjectLineIndex + 1)
      .join("\n")
      .trim(),
    subject: sanitizeCommitSubject(lines[subjectLineIndex] ?? ""),
  };
}

export function parseGeneratedPrContentText(value: string): PrContentGenerationResult {
  const lines = normalizeGeneratedText(value).split(/\r?\n/g);
  const titleLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (titleLineIndex < 0) {
    throw new Error("Git text generation returned empty pull request content.");
  }

  return {
    body: lines
      .slice(titleLineIndex + 1)
      .join("\n")
      .trim(),
    title: sanitizePrTitle(lines[titleLineIndex] ?? ""),
  };
}

export function parseGeneratedSessionTitleText(value: string): string {
  const lines = normalizeGeneratedText(value).split(/\r?\n/g);
  const titleLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (titleLineIndex < 0) {
    throw new Error("Git text generation returned an empty session title.");
  }

  return sanitizeSessionTitle(lines[titleLineIndex] ?? "");
}

function buildCustomGitTextGenerationShellCommand(
  customCommand: string,
  prompt: string,
  outputFilePath: string,
): string {
  const trimmedCommand = customCommand.trim();
  if (!trimmedCommand) {
    throw new Error(
      "VSmux.gitTextGenerationCustomCommand must be configured when the Git text generation provider is custom.",
    );
  }

  const usesPromptPlaceholder = trimmedCommand.includes("{prompt}");
  let command = trimmedCommand
    .replaceAll("{outputFile}", quoteShellLiteral(outputFilePath))
    .replaceAll("{prompt}", quoteShellLiteral(prompt));

  if (!usesPromptPlaceholder) {
    command = `${command} ${quoteShellLiteral(prompt)}`;
  }

  return command;
}

function normalizeGeneratedText(value: string): string {
  const trimmed = value.trim();
  const fencedMatch = /^```(?:[a-z0-9_-]+)?\n([\s\S]*?)\n```$/i.exec(trimmed);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function sanitizeCommitSubject(value: string): string {
  const sanitized = value.split(/\r?\n/g)[0]?.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
  if (!sanitized) {
    throw new Error("Git text generation returned an empty commit subject.");
  }

  const normalized = sanitized;
  if (/^[a-z]+\([a-z0-9._/-]+\):\s+.+$/i.test(normalized)) {
    return normalized;
  }

  const stripped = normalized.replace(/^[a-z]+(\([^)]+\))?:\s*/i, "").trim();
  if (!stripped) {
    throw new Error("Git text generation returned an empty commit subject.");
  }

  return `feat(changes): ${stripped}`;
}

function sanitizePrTitle(value: string): string {
  const sanitized = value.split(/\r?\n/g)[0]?.replace(/\s+/g, " ").trim();
  if (!sanitized) {
    throw new Error("Git text generation returned an empty pull request title.");
  }
  return sanitized;
}

function sanitizeSessionTitle(value: string): string {
  const sanitized = value
    .split(/\r?\n/g)[0]
    ?.replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
  if (!sanitized) {
    throw new Error("Git text generation returned an empty session title.");
  }

  return clampGeneratedSessionTitleLength(sanitized);
}

function clampGeneratedSessionTitleLength(value: string): string {
  if (value.length <= GENERATED_SESSION_TITLE_MAX_LENGTH) {
    return value;
  }

  const words = value.split(" ").filter(Boolean);
  let candidate = "";
  for (const word of words) {
    const nextCandidate = candidate ? `${candidate} ${word}` : word;
    if (nextCandidate.length > GENERATED_SESSION_TITLE_MAX_LENGTH) {
      break;
    }

    candidate = nextCandidate;
  }

  if (candidate) {
    return candidate;
  }

  return value.slice(0, GENERATED_SESSION_TITLE_MAX_LENGTH).trim();
}

function buildCommandLine(command: string, args: readonly string[]): string {
  if (args.length === 0) {
    return `exec ${command}`;
  }

  return `exec ${command} ${args.map(formatShellArgument).join(" ")}`;
}

function formatShellArgument(value: string): string {
  return /^[a-z0-9._-]+$/i.test(value) && !value.includes("/") ? value : quoteShellLiteral(value);
}
