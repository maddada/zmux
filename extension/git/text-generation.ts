import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { SidebarAgentButton } from "../../shared/sidebar-agents";
import { buildShellCommand, runShellCommand } from "./process";

const GIT_TEXT_GENERATION_TIMEOUT_MS = 180_000;

type RunnableSidebarAgentButton = SidebarAgentButton & {
  command: string;
};

type CommitMessageGenerationInput = {
  agent: RunnableSidebarAgentButton;
  branch: string | null;
  cwd: string;
  stagedPatch: string;
  stagedSummary: string;
};

type PrContentGenerationInput = {
  agent: RunnableSidebarAgentButton;
  baseBranch: string;
  commitSummary: string;
  cwd: string;
  diffPatch: string;
  diffSummary: string;
  headBranch: string;
};

type CommitMessageGenerationResult = {
  body: string;
  subject: string;
};

type PrContentGenerationResult = {
  body: string;
  title: string;
};

const COMMIT_MESSAGE_SCHEMA = {
  additionalProperties: false,
  properties: {
    body: { type: "string" },
    subject: { type: "string" },
  },
  required: ["subject", "body"],
  type: "object",
} as const;

const PR_CONTENT_SCHEMA = {
  additionalProperties: false,
  properties: {
    body: { type: "string" },
    title: { type: "string" },
  },
  required: ["title", "body"],
  type: "object",
} as const;

export async function generateCommitMessage(
  input: CommitMessageGenerationInput,
): Promise<CommitMessageGenerationResult> {
  const prompt = buildCommitMessagePrompt({
    branch: input.branch,
    includeBranch: false,
    stagedPatch: input.stagedPatch,
    stagedSummary: input.stagedSummary,
  });
  const generated = await runAgentJson(input.agent, input.cwd, prompt, COMMIT_MESSAGE_SCHEMA);

  return {
    body: String(generated.body ?? "").trim(),
    subject: sanitizeCommitSubject(String(generated.subject ?? "")),
  };
}

export async function generatePrContent(
  input: PrContentGenerationInput,
): Promise<PrContentGenerationResult> {
  const prompt = buildPrContentPrompt(input);
  const generated = await runAgentJson(input.agent, input.cwd, prompt, PR_CONTENT_SCHEMA);

  return {
    body: String(generated.body ?? "").trim(),
    title: sanitizePrTitle(String(generated.title ?? "")),
  };
}

async function runAgentJson(
  agent: RunnableSidebarAgentButton,
  cwd: string,
  prompt: string,
  jsonSchema: object,
): Promise<Record<string, unknown>> {
  const provider = resolveAgentProvider(agent);
  if (provider === "codex") {
    return runCodexJson(agent, cwd, prompt, jsonSchema);
  }
  if (provider === "claude") {
    return runClaudeJson(agent, cwd, prompt, jsonSchema);
  }
  return runGenericJson(agent, cwd, prompt);
}

async function runCodexJson(
  agent: RunnableSidebarAgentButton,
  cwd: string,
  prompt: string,
  jsonSchema: object,
): Promise<Record<string, unknown>> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-git-codex-"));
  const schemaPath = path.join(tempDir, "schema.json");
  const outputPath = path.join(tempDir, "output.json");

  try {
    await writeFile(schemaPath, JSON.stringify(jsonSchema), "utf8");
    await writeFile(outputPath, "", "utf8");
    const command = buildShellCommand(agent.command, [
      "exec",
      "--ephemeral",
      "-s",
      "read-only",
      "--output-schema",
      schemaPath,
      "--output-last-message",
      outputPath,
      "-",
    ]);
    const result = await runShellCommand(command, {
      cwd,
      interactiveShell: true,
      stdin: prompt,
      timeoutMs: GIT_TEXT_GENERATION_TIMEOUT_MS,
    });
    if (result.exitCode !== 0) {
      throw createAgentCommandError(agent, result, "Codex command failed.");
    }

    return parseJsonObject(await readFile(outputPath, "utf8"));
  } finally {
    await rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
  }
}

async function runClaudeJson(
  agent: RunnableSidebarAgentButton,
  cwd: string,
  prompt: string,
  jsonSchema: object,
): Promise<Record<string, unknown>> {
  const result = await runShellCommand(
    buildShellCommand(agent.command, [
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(jsonSchema),
      "--dangerously-skip-permissions",
    ]),
    {
      cwd,
      interactiveShell: true,
      stdin: prompt,
      timeoutMs: GIT_TEXT_GENERATION_TIMEOUT_MS,
    },
  );
  if (result.exitCode !== 0) {
    throw createAgentCommandError(agent, result, "Claude command failed.");
  }

  const parsed = parseJsonObject(result.stdout);
  if (parsed.structured_output && typeof parsed.structured_output === "object") {
    return parsed.structured_output as Record<string, unknown>;
  }
  return parsed;
}

async function runGenericJson(
  agent: RunnableSidebarAgentButton,
  cwd: string,
  prompt: string,
): Promise<Record<string, unknown>> {
  const result = await runShellCommand(buildShellCommand(agent.command, []), {
    cwd,
    interactiveShell: true,
    stdin: prompt,
    timeoutMs: GIT_TEXT_GENERATION_TIMEOUT_MS,
  });
  if (result.exitCode !== 0) {
    throw createAgentCommandError(agent, result, "Agent command failed.");
  }

  const parsed = parseJsonObject(result.stdout);
  if (parsed.structured_output && typeof parsed.structured_output === "object") {
    return parsed.structured_output as Record<string, unknown>;
  }
  return parsed;
}

function buildCommitMessagePrompt(input: {
  branch: string | null;
  includeBranch: boolean;
  stagedPatch: string;
  stagedSummary: string;
}): string {
  const wantsBranch = input.includeBranch === true;
  return [
    "You write concise git commit messages.",
    wantsBranch
      ? "Return a JSON object with keys: subject, body, branch."
      : "Return a JSON object with keys: subject, body.",
    "Rules:",
    "- subject must use the format feat(area): commit message",
    "- always use feat as the type unless the diff clearly demands a different conventional-commit type",
    "- area must be a short lowercase scope like ui, git, sidebar, sessions, or api",
    "- subject must stay imperative, <= 72 chars, and have no trailing period",
    "- body can be empty string or short bullet points",
    ...(wantsBranch ? ["- branch must be a short semantic git branch fragment for this change"] : []),
    "- capture the primary user-visible or developer-visible change",
    "",
    `Branch: ${input.branch ?? "(detached)"}`,
    "",
    "Staged files:",
    limitSection(input.stagedSummary, 6_000),
    "",
    "Staged patch:",
    limitSection(input.stagedPatch, 40_000),
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
    "You write GitHub pull request content.",
    "Return a JSON object with keys: title, body.",
    "Rules:",
    "- title should be concise and specific",
    "- body must be markdown and include headings '## Summary' and '## Testing'",
    "- under Summary, provide short bullet points",
    "- under Testing, include bullet points with concrete checks or 'Not run' where appropriate",
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

function resolveAgentProvider(agent: RunnableSidebarAgentButton): "claude" | "codex" | "generic" {
  if (agent.icon === "claude" || agent.agentId === "claude") {
    return "claude";
  }
  if (agent.icon === "codex" || agent.agentId === "codex") {
    return "codex";
  }
  return "generic";
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Agent did not return a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function sanitizeCommitSubject(value: string): string {
  const sanitized = value
    .split(/\r?\n/g)[0]
    ?.replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
  if (!sanitized) {
    throw new Error("Agent returned an empty commit subject.");
  }

  const normalized = sanitized.slice(0, 72).trim();
  if (/^[a-z]+\([a-z0-9._/-]+\):\s+.+$/i.test(normalized)) {
    return normalized;
  }

  const stripped = normalized
    .replace(/^[a-z]+(\([^)]+\))?:\s*/i, "")
    .trim();
  if (!stripped) {
    throw new Error("Agent returned an empty commit subject.");
  }

  return `feat(changes): ${stripped}`.slice(0, 72).trim();
}

function sanitizePrTitle(value: string): string {
  const sanitized = value.split(/\r?\n/g)[0]?.replace(/\s+/g, " ").trim();
  if (!sanitized) {
    throw new Error("Agent returned an empty pull request title.");
  }
  return sanitized;
}

function limitSection(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength).trimEnd();
}

function createAgentCommandError(
  agent: RunnableSidebarAgentButton,
  result: {
    stderr: string;
    stdout: string;
  },
  fallbackMessage: string,
): Error {
  const detail = result.stderr.trim() || result.stdout.trim() || fallbackMessage;
  return new Error(
    `Git text generation via "${agent.name}" failed for command "${agent.command}": ${detail}`,
  );
}
