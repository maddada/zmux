import type { GitTextGenerationSettings } from "../../shared/git-text-generation-provider";
import { generateSessionTitle } from "../git/text-generation";

export const SESSION_RENAME_SUMMARY_THRESHOLD = 50;
export const GENERATED_SESSION_TITLE_MAX_LENGTH = 39;

type ResolveRenameTitleInput = {
  cwd: string;
  settings: GitTextGenerationSettings;
  title: string;
};

type GenerateSessionTitleFn = (input: {
  cwd: string;
  settings: GitTextGenerationSettings;
  sourceText: string;
}) => Promise<string>;

export function shouldSummarizeSessionRenameTitle(title: string): boolean {
  return title.trim().length > SESSION_RENAME_SUMMARY_THRESHOLD;
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
    sourceText: trimmedTitle,
  });
}
