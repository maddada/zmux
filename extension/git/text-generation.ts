import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GitTextGenerationSettings } from "../../shared/git-text-generation-provider";
import { GENERATED_SESSION_TITLE_MAX_LENGTH } from "../native-terminal-workspace/session-title-generation";
import { logzmuxDebug } from "../zmux-debug-log";
import { runShellCommand } from "./process";
import {
  buildGitTextGenerationShellCommand,
  getGitTextGenerationEffort,
  type GitTextGenerationPurpose,
  parseGeneratedCommitMessageText,
  parseGeneratedPrContentText,
  parseGeneratedSessionTitleText,
} from "./text-generation-utils";

const GIT_TEXT_GENERATION_TIMEOUT_MS = 180_000;

type CommitMessageGenerationInput = {
  branch: string | null;
  cwd: string;
  settings: GitTextGenerationSettings;
  stagedPatch: string;
  stagedSummary: string;
};

type PrContentGenerationInput = {
  baseBranch: string;
  commitSummary: string;
  cwd: string;
  diffPatch: string;
  diffSummary: string;
  headBranch: string;
  settings: GitTextGenerationSettings;
};

type CommitMessageGenerationResult = ReturnType<typeof parseGeneratedCommitMessageText>;
type PrContentGenerationResult = ReturnType<typeof parseGeneratedPrContentText>;
type SessionTitleGenerationResult = ReturnType<typeof parseGeneratedSessionTitleText>;

type SessionTitleGenerationInput = {
  cwd: string;
  settings: GitTextGenerationSettings;
  sourceText: string;
};

export async function generateCommitMessage(
  input: CommitMessageGenerationInput,
): Promise<CommitMessageGenerationResult> {
  const prompt = buildCommitMessagePrompt({
    branch: input.branch,
    stagedPatch: input.stagedPatch,
    stagedSummary: input.stagedSummary,
  });
  logzmuxDebug("git.textGeneration.generateCommitMessage.promptBuilt", {
    branch: input.branch,
    patchLength: input.stagedPatch.length,
    promptLength: prompt.length,
    provider: input.settings.provider,
    stagedSummaryLength: input.stagedSummary.length,
    summaryPreview: truncateDebugPreview(input.stagedSummary),
  });
  const generated = await runGitTextGenerationText({
    cwd: input.cwd,
    outputFileName: "commitmessage.txt",
    prompt,
    purpose: "commit-message",
    settings: input.settings,
    targetLabel: "commit message",
  });

  return parseGeneratedCommitMessageText(generated);
}

export async function generatePrContent(
  input: PrContentGenerationInput,
): Promise<PrContentGenerationResult> {
  const prompt = buildPrContentPrompt(input);
  logzmuxDebug("git.textGeneration.generatePrContent.promptBuilt", {
    commitSummaryLength: input.commitSummary.length,
    diffPatchLength: input.diffPatch.length,
    diffSummaryLength: input.diffSummary.length,
    promptLength: prompt.length,
    provider: input.settings.provider,
  });
  const generated = await runGitTextGenerationText({
    cwd: input.cwd,
    outputFileName: "prcontent.txt",
    prompt,
    purpose: "pull-request",
    settings: input.settings,
    targetLabel: "pull request content",
  });

  return parseGeneratedPrContentText(generated);
}

export async function generateSessionTitle(
  input: SessionTitleGenerationInput,
): Promise<SessionTitleGenerationResult> {
  const prompt = buildSessionTitlePrompt(input.sourceText);
  logzmuxDebug("git.textGeneration.generateSessionTitle.promptBuilt", {
    promptLength: prompt.length,
    provider: input.settings.provider,
    sourcePreview: truncateDebugPreview(input.sourceText),
    sourceTextLength: input.sourceText.length,
  });
  const generated = await runGitTextGenerationText({
    cwd: input.cwd,
    outputFileName: "sessiontitle.txt",
    prompt,
    purpose: "session-title",
    settings: input.settings,
    targetLabel: "session title",
  });

  return parseGeneratedSessionTitleText(generated);
}

async function runGitTextGenerationText(input: {
  cwd: string;
  outputFileName: string;
  prompt: string;
  purpose: GitTextGenerationPurpose;
  settings: GitTextGenerationSettings;
  targetLabel: string;
}): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "zmux-git-text-"));
  const outputFilePath = join(tempDir, input.outputFileName);
  const prompt = appendOutputHandlingInstructions(
    input.prompt,
    outputFilePath,
    input.settings,
    input.targetLabel,
  );
  const usesPromptStdin = input.settings.provider === "codex";
  const command = buildGitTextGenerationShellCommand(
    input.settings,
    prompt,
    outputFilePath,
    input.purpose,
  );

  logzmuxDebug("git.textGeneration.run.start", {
    commandPreview: truncateDebugPreview(command),
    outputFilePath,
    promptLength: prompt.length,
    provider: input.settings.provider,
    targetLabel: input.targetLabel,
    usesPromptStdin,
  });

  try {
    const result = await runShellCommand(command, {
      cwd: input.cwd,
      interactiveShell: !usesPromptStdin,
      stdin: usesPromptStdin ? prompt : undefined,
      timeoutMs: GIT_TEXT_GENERATION_TIMEOUT_MS,
    });
    logzmuxDebug("git.textGeneration.run.completed", {
      exitCode: result.exitCode,
      stderrPreview: truncateDebugPreview(result.stderr),
      stdoutPreview: truncateDebugPreview(result.stdout),
      targetLabel: input.targetLabel,
    });
    if (result.exitCode !== 0) {
      throw createGitTextGenerationCommandError(
        input.settings,
        result,
        input.targetLabel,
        input.purpose,
      );
    }

    const content = await readGeneratedOutput(outputFilePath, result.stdout);
    logzmuxDebug("git.textGeneration.run.outputResolved", {
      contentPreview: truncateDebugPreview(content),
      outputFilePath,
      readFromFile: await fileExists(outputFilePath),
      targetLabel: input.targetLabel,
    });
    if (!content.trim()) {
      throw new Error(`Git text generation returned an empty ${input.targetLabel}.`);
    }

    return content;
  } finally {
    await rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
  }
}

function buildCommitMessagePrompt(input: {
  branch: string | null;
  stagedPatch: string;
  stagedSummary: string;
}): string {
  const prioritizedSummary = formatCommitSummaryForPrompt(input.stagedSummary);
  const prioritizedPatch = buildCommitPatchSampleForPrompt(input.stagedPatch, input.stagedSummary);

  return [
    "Write a Git commit message for the staged changes.",
    "Return plain text only.",
    "Use this exact format:",
    "type: descriptive imperative summary",
    "or",
    "type(scope): descriptive imperative summary",
    "- bullet point",
    "- bullet point",
    "",
    "Rules:",
    "- use a conventional commit type such as feat, fix, refactor, chore, docs, test, style, perf, build, or ci",
    "- prefer feat only when it really is a feature; otherwise pick the most accurate type",
    "- scope is optional; include it only when it clearly improves precision",
    "- if you use a scope, keep it short, lowercase, and specific",
    "- summary should read like a polished VS Code Copilot commit title: descriptive, specific, and imperative",
    "- do not artificially shorten a good summary just to fit a strict character cap",
    "- body should usually be 5 to 12 bullet points when there are multiple meaningful changes",
    "- each bullet should mention a concrete behavior, file area, refactor, or test change",
    "- prefer detailed, human-readable bullets over compressed shorthand",
    "- do not use markdown code fences or commentary",
    "",
    "Example:",
    "feat: Update session rename title auto summarization and git text generation",
    "- Increase the importance of session rename title auto summarization facts.",
    "- Update creation and modification timestamps in title summarization facts.",
    "- Refine session title generation facts for clarity and accuracy.",
    "- Expand the documented title sanitization and length-limit behavior.",
    "- Adjust git text generation commands for Codex and Claude providers.",
    "- Update tests to match the revised text generation commands.",
    "- Improve workspace panel bootstrapping with the latest embedded state.",
    "- Replay the latest workspace state before sending transient updates.",
    "- Refresh package settings to match the updated text generation behavior.",
    "",
    `Current branch: ${input.branch ?? "(detached)"}`,
    "",
    "Staged files:",
    prioritizedSummary,
    "",
    "Representative staged patch:",
    prioritizedPatch,
  ].join("\n");
}

function buildPrContentPrompt(input: {
  baseBranch: string;
  commitSummary: string;
  diffPatch: string;
  diffSummary: string;
  headBranch: string;
}): string {
  return [
    "Write GitHub pull request content for these changes.",
    "Return plain text only.",
    "Use this exact format:",
    "Concise PR title",
    "",
    "## Summary",
    "- bullet point",
    "",
    "## Testing",
    "- Not run",
    "",
    "Rules:",
    "- title must be concise and specific",
    "- body must be markdown",
    "- keep Summary and Testing short and concrete",
    "- do not use markdown code fences or commentary",
    "",
    `Base branch: ${input.baseBranch}`,
    `Head branch: ${input.headBranch}`,
    "",
    "Commits:",
    limitSection(input.commitSummary, 12_000),
    "",
    "Diff stat:",
    limitSection(input.diffSummary, 12_000),
    "",
    "Diff patch:",
    limitSection(input.diffPatch, 40_000),
  ].join("\n");
}

function buildSessionTitlePrompt(sourceText: string): string {
  return [
    "Write a concise session title that summarizes the user's text.",
    "Return plain text only.",
    "Rules:",
    "- keep it specific and scannable",
    "- prefer 2 to 4 words when possible",
    `- must be fewer than ${GENERATED_SESSION_TITLE_MAX_LENGTH + 1} characters`,
    "- do not use quotes, markdown, or commentary",
    "- do not end with punctuation",
    "- focus on the task, bug, feature, or topic",
    "",
    "User text:",
    limitSection(sourceText, 12_000),
  ].join("\n");
}

function appendOutputHandlingInstructions(
  prompt: string,
  outputFilePath: string,
  settings: GitTextGenerationSettings,
  targetLabel: string,
): string {
  const outputHandlingLines =
    settings.provider === "custom"
      ? [
          `- If you can write files in this environment, write the exact final result to ${outputFilePath}.`,
          "- If you cannot write the file, print only the final result to stdout.",
        ]
      : ["- Print only the final result to stdout."];

  return [
    prompt,
    "",
    "Output handling:",
    `- Produce only the final ${targetLabel}.`,
    "- Do not wrap the result in backticks.",
    ...outputHandlingLines,
  ].join("\n");
}

function formatCommitSummaryForPrompt(stagedSummary: string): string {
  const entries = parseCommitSummaryEntries(stagedSummary);
  if (entries.length === 0) {
    return limitSection(stagedSummary, 6_000);
  }

  const orderedEntries = sortCommitSummaryEntries(entries);
  return orderedEntries
    .slice(0, 120)
    .map((entry) => `${entry.status}\t${entry.path}`)
    .join("\n");
}

function buildCommitPatchSampleForPrompt(stagedPatch: string, stagedSummary: string): string {
  const sections = splitGitPatchSections(stagedPatch);
  if (sections.length === 0) {
    return limitSection(stagedPatch, 40_000);
  }

  const entryByPath = new Map(
    parseCommitSummaryEntries(stagedSummary).map((entry) => [entry.path, entry] as const),
  );
  const orderedSections = sections
    .map((section, index) => {
      const entry = entryByPath.get(section.path);
      const priority = getCommitEntryPriority(entry?.status);
      return {
        index,
        priority,
        section,
      };
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    });

  const selectedSections: string[] = [];
  let totalLength = 0;
  for (const { section } of orderedSections) {
    const trimmedSection = limitSection(section.content, 6_000);
    if (!trimmedSection.trim()) {
      continue;
    }

    if (selectedSections.length >= 12 || totalLength + trimmedSection.length > 40_000) {
      break;
    }

    selectedSections.push(trimmedSection);
    totalLength += trimmedSection.length;
  }

  if (selectedSections.length === 0) {
    return limitSection(stagedPatch, 40_000);
  }

  return selectedSections.join("\n\n");
}

function parseCommitSummaryEntries(stagedSummary: string): Array<{ path: string; status: string }> {
  return stagedSummary
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [statusPart, ...pathParts] = line.split("\t");
      const path = pathParts.join("\t").trim();
      return {
        path,
        status: statusPart?.trim() ?? "",
      };
    })
    .filter((entry) => entry.path.length > 0 && entry.status.length > 0);
}

function sortCommitSummaryEntries(
  entries: Array<{ path: string; status: string }>,
): Array<{ path: string; status: string }> {
  return [...entries].sort((left, right) => {
    const leftPriority = getCommitEntryPriority(left.status);
    const rightPriority = getCommitEntryPriority(right.status);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.path.localeCompare(right.path);
  });
}

function getCommitEntryPriority(status: string | undefined): number {
  const normalizedStatus = status?.trim().toUpperCase() ?? "";
  if (normalizedStatus.startsWith("M")) {
    return 0;
  }

  if (normalizedStatus.startsWith("A")) {
    return 1;
  }

  if (normalizedStatus.startsWith("R")) {
    return 2;
  }

  if (normalizedStatus.startsWith("C")) {
    return 3;
  }

  if (normalizedStatus.startsWith("T")) {
    return 4;
  }

  if (normalizedStatus.startsWith("D")) {
    return 9;
  }

  return 5;
}

function splitGitPatchSections(stagedPatch: string): Array<{ content: string; path: string }> {
  const parts = stagedPatch.split(/^diff --git /m);
  const sections: Array<{ content: string; path: string }> = [];

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) {
      continue;
    }

    const sectionContent = `diff --git ${trimmedPart}`;
    const headerLine = sectionContent.split(/\r?\n/g)[0] ?? "";
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(headerLine);
    const path = match?.[2] ?? match?.[1] ?? headerLine;
    sections.push({
      content: sectionContent,
      path,
    });
  }

  return sections;
}

async function readGeneratedOutput(outputFilePath: string, stdout: string): Promise<string> {
  if (await fileExists(outputFilePath)) {
    return readFile(outputFilePath, "utf8");
  }

  return stdout;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function limitSection(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength).trimEnd();
}

function createGitTextGenerationCommandError(
  settings: GitTextGenerationSettings,
  result: {
    stderr: string;
    stdout: string;
  },
  targetLabel: string,
  purpose: GitTextGenerationPurpose,
): Error {
  const detail = result.stderr.trim() || result.stdout.trim() || "Git text generation failed.";
  return new Error(
    `Git ${targetLabel} generation via ${describeGitTextGenerationSettings(settings, purpose)} failed: ${detail}`,
  );
}

function describeGitTextGenerationSettings(
  settings: GitTextGenerationSettings,
  purpose: GitTextGenerationPurpose = "commit-message",
): string {
  if (settings.provider === "custom") {
    return `custom command "${settings.customCommand}"`;
  }

  const effort = getGitTextGenerationEffort(purpose);
  return settings.provider === "claude"
    ? `Claude Haiku (${effort} effort)`
    : `Codex gpt-5.4-mini (${effort} effort)`;
}

function truncateDebugPreview(value: string, maxLength = 400): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}
