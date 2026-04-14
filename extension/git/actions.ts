import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { GitTextGenerationSettings } from "../../shared/git-text-generation-provider";
import { getSidebarGitDisabledReason, type SidebarGitAction } from "../../shared/sidebar-git";
import { logVSmuxDebug } from "../vsmux-debug-log";
import { generateCommitMessage, generatePrContent } from "./text-generation";
import {
  getGitStatusDetails,
  loadSidebarGitState,
  resolveDefaultBranchName,
  type GitStatusDetails,
} from "./status";
import {
  buildCommandLine,
  runGitCommand,
  runGitCommandResult,
  runGitStdout,
  runShellCommand,
} from "./process";

const COMMIT_TIMEOUT_MS = 180_000;
const GITHUB_CLI_TIMEOUT_MS = 60_000;
const EMPTY_TREE_HASH = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

export type SidebarGitCommitScope = "allChanges" | "stagedOnly";

export type PreparedSidebarGitCommit = {
  body: string;
  scope: SidebarGitCommitScope;
  subject: string;
};

export type RunSidebarGitActionInput = {
  action: SidebarGitAction;
  cwd: string;
  generator: GitTextGenerationSettings;
  onProgress?: (message: string) => void;
  preparedCommit?: PreparedSidebarGitCommit;
};

export type RunSidebarGitActionResult = {
  message: string;
  prUrl?: string;
};

export type PrepareSidebarGitCommitInput = {
  action: SidebarGitAction;
  cwd: string;
  generator: GitTextGenerationSettings;
  onProgress?: (message: string) => void;
};

export async function prepareSidebarGitCommit(
  input: PrepareSidebarGitCommitInput,
): Promise<PreparedSidebarGitCommit> {
  const status = await getGitStatusDetails(input.cwd);
  const sidebarState = await loadSidebarGitState(input.cwd, input.action, false);
  const disabledReason = getSidebarGitDisabledReason(sidebarState, input.action);
  if (disabledReason) {
    throw new Error(disabledReason);
  }

  input.onProgress?.("Preparing commit changes...");
  const commitContext = await prepareCommitContext(input.cwd, status);
  if (!commitContext) {
    throw new Error("No changes available to commit.");
  }
  logGitCommitContext("prepareSidebarGitCommit", commitContext);

  input.onProgress?.("Generating commit message...");
  const generated = await generateCommitMessage({
    branch: status.branch,
    cwd: input.cwd,
    settings: input.generator,
    stagedPatch: commitContext.stagedPatch,
    stagedSummary: commitContext.stagedSummary,
  });

  return {
    body: generated.body,
    scope: commitContext.scope,
    subject: generated.subject,
  };
}

export async function runSidebarGitActionWorkflow(
  input: RunSidebarGitActionInput,
): Promise<RunSidebarGitActionResult> {
  let status = await getGitStatusDetails(input.cwd);
  const sidebarState = await loadSidebarGitState(input.cwd, input.action, false);
  const disabledReason = getSidebarGitDisabledReason(sidebarState, input.action);
  if (disabledReason) {
    throw new Error(disabledReason);
  }

  if (input.action === "commit") {
    const commitResult = await commitWorkingTree(
      input.cwd,
      status,
      input.generator,
      input.onProgress,
      input.preparedCommit,
    );
    return {
      message: `Committed ${shortenSha(commitResult.commitSha)}: ${commitResult.subject}`,
    };
  }

  let latestCommit: { commitSha: string; subject: string } | undefined;
  if (status.hasWorkingTreeChanges) {
    latestCommit = await commitWorkingTree(
      input.cwd,
      status,
      input.generator,
      input.onProgress,
      input.preparedCommit,
    );
    status = await getGitStatusDetails(input.cwd);
  }

  if (input.action === "push") {
    input.onProgress?.("Pushing...");
    const pushResult = await pushCurrentBranch(input.cwd, status);
    const summaryPrefix = latestCommit
      ? `Committed ${shortenSha(latestCommit.commitSha)} and pushed`
      : "Pushed";
    const branchLabel = pushResult.upstreamBranch ?? pushResult.branch;
    return {
      message: `${summaryPrefix}${branchLabel ? ` to ${branchLabel}` : ""}.`,
    };
  }

  if (!status.hasGitHubCli) {
    throw new Error("Install GitHub CLI to create or view pull requests.");
  }

  if (!status.pr?.url) {
    input.onProgress?.("Checking pull request state...");
  }

  if (!status.hasUpstream || status.aheadCount > 0) {
    input.onProgress?.("Pushing...");
    await pushCurrentBranch(input.cwd, status);
    status = await getGitStatusDetails(input.cwd);
  }

  if (status.pr?.state === "open" && status.pr.url) {
    return {
      message: status.pr.number ? `Opened PR #${status.pr.number}.` : "Opened pull request.",
      prUrl: status.pr.url,
    };
  }

  const createdPr = await createPullRequest(input.cwd, status, input.generator, input.onProgress);
  return {
    message: createdPr.number ? `Created PR #${createdPr.number}.` : "Created pull request.",
    prUrl: createdPr.url,
  };
}

async function commitWorkingTree(
  cwd: string,
  status: GitStatusDetails,
  generator: GitTextGenerationSettings,
  onProgress?: (message: string) => void,
  preparedCommit?: PreparedSidebarGitCommit,
): Promise<{ commitSha: string; subject: string }> {
  let generated = preparedCommit;
  if (!generated) {
    onProgress?.("Preparing commit changes...");
    const commitContext = await prepareCommitContext(cwd, status);
    if (!commitContext) {
      throw new Error("No working tree changes to commit.");
    }
    logGitCommitContext("commitWorkingTree", commitContext);

    onProgress?.("Generating commit message...");
    const commitMessage = await generateCommitMessage({
      branch: status.branch,
      cwd,
      settings: generator,
      stagedPatch: commitContext.stagedPatch,
      stagedSummary: commitContext.stagedSummary,
    });
    generated = {
      body: commitMessage.body,
      scope: commitContext.scope,
      subject: commitMessage.subject,
    };
  }

  onProgress?.("Committing...");
  const commitSha = await commitChanges(cwd, generated.subject, generated.body, generated.scope);
  return {
    commitSha,
    subject: generated.subject,
  };
}

async function createPullRequest(
  cwd: string,
  status: GitStatusDetails,
  generator: GitTextGenerationSettings,
  onProgress?: (message: string) => void,
): Promise<{ number?: number; url: string }> {
  if (!status.branch) {
    throw new Error("Create and checkout a branch before creating a PR.");
  }

  const baseBranch =
    status.defaultBranch ?? (await resolveDefaultBranchName(cwd, status.hasOriginRemote));
  if (!baseBranch) {
    throw new Error("Unable to determine a base branch for the pull request.");
  }

  const [commitSummary, diffSummary, diffPatch] = await Promise.all([
    runGitStdout(cwd, ["log", "--oneline", `${baseBranch}..HEAD`]).catch(() => ""),
    runGitStdout(cwd, ["diff", "--stat", `${baseBranch}...HEAD`]).catch(() => ""),
    runGitStdout(cwd, ["diff", "--patch", "--minimal", `${baseBranch}...HEAD`]).catch(() => ""),
  ]);

  onProgress?.("Generating PR content...");
  const generated = await generatePrContent({
    baseBranch,
    commitSummary,
    cwd,
    diffPatch,
    diffSummary,
    headBranch: status.branch,
    settings: generator,
  });

  onProgress?.("Creating PR...");
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-git-pr-"));
  const bodyPath = path.join(tempDir, "body.md");

  try {
    await writeFile(bodyPath, generated.body, "utf8");
    const createResult = await runShellCommand(
      buildCommandLine("gh", [
        "pr",
        "create",
        "--base",
        baseBranch,
        "--head",
        status.branch,
        "--title",
        generated.title,
        "--body-file",
        bodyPath,
      ]),
      {
        cwd,
        timeoutMs: GITHUB_CLI_TIMEOUT_MS,
      },
    );
    if (createResult.exitCode !== 0) {
      throw new Error(
        createResult.stderr.trim() ||
          createResult.stdout.trim() ||
          "Failed to create pull request.",
      );
    }
  } finally {
    await rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
  }

  const openPr = await findCurrentPullRequest(cwd);
  if (!openPr?.url) {
    throw new Error("Pull request was created but could not be resolved.");
  }

  return openPr;
}

async function prepareCommitContext(
  cwd: string,
  status: Pick<GitStatusDetails, "hasStagedChanges" | "hasWorkingTreeChanges">,
): Promise<{ scope: SidebarGitCommitScope; stagedPatch: string; stagedSummary: string } | null> {
  if (!status.hasWorkingTreeChanges) {
    return null;
  }

  if (status.hasStagedChanges) {
    return loadCommitContextFromIndex(cwd, "stagedOnly");
  }

  return loadCommitContextFromWorkingTree(cwd);
}

async function loadCommitContextFromIndex(
  cwd: string,
  scope: SidebarGitCommitScope,
  env?: NodeJS.ProcessEnv,
): Promise<{ scope: SidebarGitCommitScope; stagedPatch: string; stagedSummary: string } | null> {
  const stagedSummary = (
    await runGitStdout(cwd, ["diff", "--cached", "--name-status"], 60_000, env)
  ).trim();
  if (!stagedSummary) {
    return null;
  }

  const stagedPatch = await runGitStdout(
    cwd,
    ["diff", "--cached", "--patch", "--minimal"],
    60_000,
    env,
  );
  return {
    scope,
    stagedPatch,
    stagedSummary,
  };
}

function logGitCommitContext(
  event: string,
  context: { scope: SidebarGitCommitScope; stagedPatch: string; stagedSummary: string },
): void {
  const stagedFiles = context.stagedSummary
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  logVSmuxDebug(`git.commitContext.${event}`, {
    patchLength: context.stagedPatch.length,
    patchPreview: truncateDebugPreview(context.stagedPatch),
    scope: context.scope,
    stagedFiles,
    stagedSummaryLength: context.stagedSummary.length,
  });
}

function truncateDebugPreview(value: string, maxLength = 400): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

async function loadCommitContextFromWorkingTree(
  cwd: string,
): Promise<{ scope: SidebarGitCommitScope; stagedPatch: string; stagedSummary: string } | null> {
  const statusOutput = await runGitStdout(cwd, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  const statusEntries = parseWorkingTreeStatusEntries(statusOutput);
  if (statusEntries.length === 0) {
    return null;
  }

  const baseRef = await resolveAllChangesBaseRef(cwd);
  const trackedSummary = (await runGitStdout(cwd, ["diff", "--name-status", baseRef, "--"])).trim();
  const trackedPatch = await runGitStdout(cwd, ["diff", "--patch", "--minimal", baseRef, "--"]);
  const untrackedEntries = statusEntries.filter((entry) => entry.kind === "untracked");
  const untrackedPatchParts = await Promise.all(
    untrackedEntries.map((entry) => loadUntrackedFilePatch(cwd, entry.path)),
  );
  const stagedSummary = buildAllChangesSummary(trackedSummary, statusEntries);
  const stagedPatch = [
    trackedPatch.trim(),
    ...untrackedPatchParts.map((part) => part.trim()).filter(Boolean),
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!stagedSummary || !stagedPatch) {
    return null;
  }

  return {
    scope: "allChanges",
    stagedPatch: `${stagedPatch}\n`,
    stagedSummary,
  };
}

async function resolveAllChangesBaseRef(cwd: string): Promise<string> {
  const head = (await runGitStdout(cwd, ["rev-parse", "--verify", "HEAD"]).catch(() => "")).trim();
  return head || EMPTY_TREE_HASH;
}

async function loadUntrackedFilePatch(cwd: string, filePath: string): Promise<string> {
  const result = await runGitCommandResult(
    cwd,
    ["diff", "--no-index", "--", "/dev/null", filePath],
    60_000,
  );
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(
      result.stderr.trim() || result.stdout.trim() || "Failed to diff untracked file.",
    );
  }

  return result.stdout;
}

type WorkingTreeStatusEntry = {
  kind: "added" | "deleted" | "modified" | "renamed" | "untracked";
  path: string;
  summaryLine: string;
};

function parseWorkingTreeStatusEntries(statusOutput: string): WorkingTreeStatusEntry[] {
  const entries = statusOutput
    .split(/\r?\n/g)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parseWorkingTreeStatusEntry)
    .filter((entry): entry is WorkingTreeStatusEntry => entry !== undefined);

  const seenSummaryLines = new Set<string>();
  return entries.filter((entry) => {
    if (seenSummaryLines.has(entry.summaryLine)) {
      return false;
    }
    seenSummaryLines.add(entry.summaryLine);
    return true;
  });
}

function parseWorkingTreeStatusEntry(line: string): WorkingTreeStatusEntry | undefined {
  if (line.startsWith("!! ")) {
    return undefined;
  }

  if (line.startsWith("?? ")) {
    const path = line.slice(3).trim();
    return path
      ? {
          kind: "untracked",
          path,
          summaryLine: `A\t${path}`,
        }
      : undefined;
  }

  if (line.length < 4) {
    return undefined;
  }

  const statusCode = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  if (!rawPath) {
    return undefined;
  }

  const renameParts = rawPath.split(" -> ");
  const resolvedPath = renameParts[renameParts.length - 1]?.trim();
  if (!resolvedPath) {
    return undefined;
  }

  if (statusCode.includes("R") || statusCode.includes("C")) {
    return {
      kind: "renamed",
      path: resolvedPath,
      summaryLine: `R\t${rawPath}`,
    };
  }

  if (statusCode.includes("D")) {
    return {
      kind: "deleted",
      path: resolvedPath,
      summaryLine: `D\t${resolvedPath}`,
    };
  }

  if (statusCode.includes("A")) {
    return {
      kind: "added",
      path: resolvedPath,
      summaryLine: `A\t${resolvedPath}`,
    };
  }

  return {
    kind: "modified",
    path: resolvedPath,
    summaryLine: `M\t${resolvedPath}`,
  };
}

function buildAllChangesSummary(
  trackedSummary: string,
  statusEntries: readonly WorkingTreeStatusEntry[],
): string {
  const lines = trackedSummary
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  const seenPaths = new Set(lines.map((line) => extractSummaryIdentity(line)));
  const mergedLines = [...lines];

  for (const entry of statusEntries) {
    const identity = extractSummaryIdentity(entry.summaryLine);
    if (seenPaths.has(identity)) {
      continue;
    }

    mergedLines.push(entry.summaryLine);
    seenPaths.add(identity);
  }

  return mergedLines.join("\n").trim();
}

function extractSummaryIdentity(summaryLine: string): string {
  const trimmedLine = summaryLine.trim();
  if (/^[RC]\d*\t/.test(trimmedLine)) {
    const renameFields = trimmedLine.split("\t");
    return renameFields[renameFields.length - 1]?.trim() ?? trimmedLine;
  }

  if (/^[RC]\t/.test(trimmedLine)) {
    const renameText = trimmedLine.slice(2);
    const renameParts = renameText.split(" -> ");
    return renameParts[renameParts.length - 1]?.trim() ?? renameText;
  }

  return trimmedLine.split("\t").slice(1).join("\t").trim();
}

async function commitChanges(
  cwd: string,
  subject: string,
  body: string,
  scope: SidebarGitCommitScope,
): Promise<string> {
  if (scope === "allChanges") {
    await runGitCommand(cwd, ["add", "-A"]);
  }
  const args = ["commit", "-m", subject];
  const trimmedBody = body.trim();
  if (trimmedBody) {
    args.push("-m", trimmedBody);
  }
  await runGitCommand(cwd, args, COMMIT_TIMEOUT_MS);
  return (await runGitStdout(cwd, ["rev-parse", "HEAD"])).trim();
}

async function pushCurrentBranch(
  cwd: string,
  status: GitStatusDetails,
): Promise<{ branch: string; upstreamBranch?: string }> {
  const branch = status.branch;
  if (!branch) {
    throw new Error("Create and checkout a branch before pushing.");
  }

  if (!status.hasUpstream) {
    const remoteName = status.hasOriginRemote ? "origin" : await resolveFirstRemoteName(cwd);
    if (!remoteName) {
      throw new Error('Add an "origin" remote before pushing.');
    }
    await runGitCommand(cwd, ["push", "-u", remoteName, branch], GITHUB_CLI_TIMEOUT_MS);
    return {
      branch,
      upstreamBranch: `${remoteName}/${branch}`,
    };
  }

  if (status.aheadCount === 0) {
    return {
      branch,
      upstreamBranch: status.upstreamRef ?? undefined,
    };
  }

  await runGitCommand(cwd, ["push"], GITHUB_CLI_TIMEOUT_MS);
  return {
    branch,
    upstreamBranch: status.upstreamRef ?? undefined,
  };
}

async function findCurrentPullRequest(
  cwd: string,
): Promise<{ number?: number; url: string } | null> {
  const result = await runShellCommand(
    buildCommandLine("gh", ["pr", "view", "--json", "number,url"]),
    {
      cwd,
      timeoutMs: 15_000,
    },
  );
  if (result.exitCode !== 0) {
    return null;
  }

  const parsed = JSON.parse(result.stdout) as { number?: number; url?: string };
  return parsed.url ? { number: parsed.number, url: parsed.url } : null;
}

async function resolveFirstRemoteName(cwd: string): Promise<string | null> {
  const stdout = await runGitStdout(cwd, ["remote"]).catch(() => "");
  const [firstRemote] = stdout
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return firstRemote ?? null;
}

function shortenSha(value: string): string {
  return value.slice(0, 7);
}
