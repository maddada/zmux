import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getSidebarGitDisabledReason, type SidebarGitAction } from "../../shared/sidebar-git";
import type { SidebarAgentButton } from "../../shared/sidebar-agents";
import { generateCommitMessage, generatePrContent } from "./text-generation";
import {
  getGitStatusDetails,
  loadSidebarGitState,
  resolveDefaultBranchName,
  type GitStatusDetails,
} from "./status";
import { buildCommandLine, runGitCommand, runGitStdout, runShellCommand } from "./process";

const COMMIT_TIMEOUT_MS = 180_000;
const GITHUB_CLI_TIMEOUT_MS = 60_000;

type RunnableSidebarAgentButton = SidebarAgentButton & {
  command: string;
};

export type SidebarGitCommitScope = "allChanges" | "stagedOnly";

export type PreparedSidebarGitCommit = {
  body: string;
  scope: SidebarGitCommitScope;
  subject: string;
};

export type RunSidebarGitActionInput = {
  action: SidebarGitAction;
  agent: RunnableSidebarAgentButton;
  cwd: string;
  onProgress?: (message: string) => void;
  preparedCommit?: PreparedSidebarGitCommit;
};

export type RunSidebarGitActionResult = {
  message: string;
  prUrl?: string;
};

export type PrepareSidebarGitCommitInput = {
  action: SidebarGitAction;
  agent: RunnableSidebarAgentButton;
  cwd: string;
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

  input.onProgress?.("Generating commit message...");
  const generated = await generateCommitMessage({
    agent: input.agent,
    branch: status.branch,
    cwd: input.cwd,
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
      input.agent,
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
      input.agent,
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

  const createdPr = await createPullRequest(input.cwd, status, input.agent, input.onProgress);
  return {
    message: createdPr.number ? `Created PR #${createdPr.number}.` : "Created pull request.",
    prUrl: createdPr.url,
  };
}

async function commitWorkingTree(
  cwd: string,
  status: GitStatusDetails,
  agent: RunnableSidebarAgentButton,
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

    onProgress?.("Generating commit message...");
    const commitMessage = await generateCommitMessage({
      agent,
      branch: status.branch,
      cwd,
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
  agent: RunnableSidebarAgentButton,
  onProgress?: (message: string) => void,
): Promise<{ number?: number; url: string }> {
  if (!status.branch) {
    throw new Error("Create and checkout a branch before creating a PR.");
  }

  const baseBranch = status.defaultBranch ?? (await resolveDefaultBranchName(cwd, status.hasOriginRemote));
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
    agent,
    baseBranch,
    commitSummary,
    cwd,
    diffPatch,
    diffSummary,
    headBranch: status.branch,
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
        createResult.stderr.trim() || createResult.stdout.trim() || "Failed to create pull request.",
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

  return loadCommitContextFromTemporaryIndex(cwd);
}

async function loadCommitContextFromIndex(
  cwd: string,
  scope: SidebarGitCommitScope,
  env?: NodeJS.ProcessEnv,
): Promise<{ scope: SidebarGitCommitScope; stagedPatch: string; stagedSummary: string } | null> {
  const stagedSummary = (await runGitStdout(cwd, ["diff", "--cached", "--name-status"], 60_000, env)).trim();
  if (!stagedSummary) {
    return null;
  }

  const stagedPatch = await runGitStdout(cwd, ["diff", "--cached", "--patch", "--minimal"], 60_000, env);
  return {
    scope,
    stagedPatch,
    stagedSummary,
  };
}

async function loadCommitContextFromTemporaryIndex(
  cwd: string,
): Promise<{ scope: SidebarGitCommitScope; stagedPatch: string; stagedSummary: string } | null> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-git-index-"));
  const tempIndexPath = path.join(tempDir, "index");

  try {
    const gitIndexPath = (await runGitStdout(cwd, ["rev-parse", "--git-path", "index"])).trim();
    if (gitIndexPath) {
      await copyFile(path.resolve(cwd, gitIndexPath), tempIndexPath).catch(() => undefined);
    }

    const env = {
      ...process.env,
      GIT_INDEX_FILE: tempIndexPath,
    };
    await runGitCommand(cwd, ["add", "-A"], 60_000, env);
    return loadCommitContextFromIndex(cwd, "allChanges", env);
  } finally {
    await rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
  }
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

async function findCurrentPullRequest(cwd: string): Promise<{ number?: number; url: string } | null> {
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
