import type { GitTextGenerationSettings } from "../../shared/git-text-generation-provider";
import { generateSessionTitle } from "../git/text-generation";

export const SESSION_RENAME_SUMMARY_THRESHOLD = 50;
export const GENERATED_SESSION_TITLE_MAX_LENGTH = 39;
export const GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH = 250;

type ResolveRenameTitleInput = {
  cwd: string;
  settings: GitTextGenerationSettings;
  title: string;
};

type ResolveFirstPromptRenameTitleInput = {
  cwd: string;
  prompt: string;
  settings: GitTextGenerationSettings;
};

type GenerateSessionTitleFn = (input: {
  cwd: string;
  settings: GitTextGenerationSettings;
  sourceText: string;
}) => Promise<string>;

export function shouldSummarizeSessionRenameTitle(title: string): boolean {
  return title.trim().length > SESSION_RENAME_SUMMARY_THRESHOLD;
}

function truncateGeneratedSessionTitleSourceText(title: string): string {
  if (title.length <= GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH) {
    return title;
  }

  return title.slice(0, GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH);
}

export async function resolveSessionRenameTitle(
  input: ResolveRenameTitleInput,
  generateTitle: GenerateSessionTitleFn = generateSessionTitle,
): Promise<string> {
  const trimmedTitle = input.title.trim();
  if (!shouldSummarizeSessionRenameTitle(trimmedTitle)) {
    return trimmedTitle;
  }

  return generateTitle({
    cwd: input.cwd,
    settings: input.settings,
    sourceText: truncateGeneratedSessionTitleSourceText(trimmedTitle),
  });
}

export async function resolveSessionRenameTitleFromPrompt(
  input: ResolveFirstPromptRenameTitleInput,
  generateTitle: GenerateSessionTitleFn = generateSessionTitle,
): Promise<string> {
  const trimmedPrompt = input.prompt.trim();
  if (!trimmedPrompt) {
    return trimmedPrompt;
  }

  return generateTitle({
    cwd: input.cwd,
    settings: input.settings,
    sourceText: truncateGeneratedSessionTitleSourceText(trimmedPrompt),
  });
}
