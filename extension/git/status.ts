import {
  createDefaultSidebarGitState,
  type SidebarGitAction,
  type SidebarGitPullRequest,
  type SidebarGitState,
} from "../../shared/sidebar-git";
import { buildCommandLine, runGitCommand, runGitStdout, runShellCommand } from "./process";

type GitWorkingTreeFile = {
  deletions: number;
  insertions: number;
  path: string;
};

export type GitStatusDetails = {
  aheadCount: number;
  behindCount: number;
  branch: string | null;
  defaultBranch: string | null;
  hasGitHubCli: boolean;
  hasOriginRemote: boolean;
  hasStagedChanges: boolean;
  hasUpstream: boolean;
  hasUnstagedChanges: boolean;
  hasWorkingTreeChanges: boolean;
  isRepo: boolean;
  pr: SidebarGitPullRequest | null;
  upstreamRef: string | null;
  workingTree: {
    deletions: number;
    files: GitWorkingTreeFile[];
    insertions: number;
  };
};

export async function loadSidebarGitState(
  cwd: string,
  primaryAction: SidebarGitAction,
  isBusy: boolean,
): Promise<SidebarGitState> {
  const details = await getGitStatusDetails(cwd);
  if (!details.isRepo) {
    return {
      ...createDefaultSidebarGitState(primaryAction),
      isBusy,
    };
  }

  return {
    additions: details.workingTree.insertions,
    aheadCount: details.aheadCount,
    behindCount: details.behindCount,
    branch: details.branch,
    deletions: details.workingTree.deletions,
    hasGitHubCli: details.hasGitHubCli,
    hasOriginRemote: details.hasOriginRemote,
    hasUpstream: details.hasUpstream,
    hasWorkingTreeChanges: details.hasWorkingTreeChanges,
    isBusy,
    isRepo: true,
    pr: details.pr,
    primaryAction,
  };
}

export async function getGitStatusDetails(cwd: string): Promise<GitStatusDetails> {
  try {
    await runGitCommand(cwd, ["rev-parse", "--show-toplevel"]);
  } catch {
    return {
      ...createEmptyStatusDetails(),
      isRepo: false,
    };
  }

  const [statusResult, stagedNumstat, unstagedNumstat, remotes, hasGitHubCli] = await Promise.all([
    runGitStdout(cwd, ["status", "--porcelain=v2", "--branch"]),
    runGitStdout(cwd, ["diff", "--cached", "--numstat"]).catch(() => ""),
    runGitStdout(cwd, ["diff", "--numstat"]).catch(() => ""),
    runGitStdout(cwd, ["remote"]).catch(() => ""),
    hasGitHubCliInstalled(cwd),
  ]);

  let branch: string | null = null;
  let upstreamRef: string | null = null;
  let aheadCount = 0;
  let behindCount = 0;
  let hasStagedChanges = false;
  let hasUnstagedChanges = false;
  let hasWorkingTreeChanges = false;
  const changedFilesWithoutNumstat = new Set<string>();

  for (const line of statusResult.split(/\r?\n/g)) {
    if (line.startsWith("# branch.head ")) {
      const value = line.slice("# branch.head ".length).trim();
      branch = value === "(detached)" ? null : value || null;
      continue;
    }
    if (line.startsWith("# branch.upstream ")) {
      const value = line.slice("# branch.upstream ".length).trim();
      upstreamRef = value || null;
      continue;
    }
    if (line.startsWith("# branch.ab ")) {
      const parsed = parseBranchAb(line.slice("# branch.ab ".length).trim());
      aheadCount = parsed.ahead;
      behindCount = parsed.behind;
      continue;
    }
    if (line.trim().length > 0 && !line.startsWith("#")) {
      hasWorkingTreeChanges = true;
      if (line.startsWith("? ")) {
        hasUnstagedChanges = true;
      } else if (line.startsWith("u ")) {
        hasStagedChanges = true;
        hasUnstagedChanges = true;
      } else {
        const parsedStatus = parsePorcelainStatus(line);
        if (parsedStatus) {
          if (parsedStatus.indexStatus !== ".") {
            hasStagedChanges = true;
          }
          if (parsedStatus.workTreeStatus !== ".") {
            hasUnstagedChanges = true;
          }
        }
      }
      const filePath = parsePorcelainPath(line);
      if (filePath) {
        changedFilesWithoutNumstat.add(filePath);
      }
    }
  }

  const remoteNames = parseRemoteNames(remotes);
  const hasOriginRemote = remoteNames.includes("origin");
  const defaultBranch = await resolveDefaultBranchName(cwd, hasOriginRemote);

  if (!upstreamRef && branch) {
    aheadCount = await computeAheadCountAgainstDefaultBranch(cwd, branch, defaultBranch);
  }

  const fileStatMap = new Map<string, { deletions: number; insertions: number }>();
  for (const entry of [...parseNumstatEntries(stagedNumstat), ...parseNumstatEntries(unstagedNumstat)]) {
    const existing = fileStatMap.get(entry.path) ?? { deletions: 0, insertions: 0 };
    existing.insertions += entry.insertions;
    existing.deletions += entry.deletions;
    fileStatMap.set(entry.path, existing);
  }

  let insertions = 0;
  let deletions = 0;
  const files = Array.from(fileStatMap.entries())
    .map(([path, stat]) => {
      insertions += stat.insertions;
      deletions += stat.deletions;
      return {
        deletions: stat.deletions,
        insertions: stat.insertions,
        path,
      };
    })
    .toSorted((left, right) => left.path.localeCompare(right.path));

  for (const path of changedFilesWithoutNumstat) {
    if (!fileStatMap.has(path)) {
      files.push({ deletions: 0, insertions: 0, path });
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path));

  return {
    aheadCount,
    behindCount,
    branch,
    defaultBranch,
    hasGitHubCli,
    hasOriginRemote,
    hasStagedChanges,
    hasUpstream: upstreamRef !== null,
    hasUnstagedChanges,
    hasWorkingTreeChanges,
    isRepo: true,
    pr: hasGitHubCli && branch ? await getCurrentPullRequest(cwd) : null,
    upstreamRef,
    workingTree: {
      deletions,
      files,
      insertions,
    },
  };
}

export async function resolveDefaultBranchName(
  cwd: string,
  hasOriginRemote?: boolean,
): Promise<string | null> {
  if (hasOriginRemote !== false) {
    try {
      const raw = (await runGitStdout(cwd, ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"])).trim();
      if (raw.includes("/")) {
        return raw.slice(raw.indexOf("/") + 1);
      }
    } catch {
      // Ignore and fall back to local defaults.
    }
  }

  for (const candidate of ["main", "master", "trunk"]) {
    try {
      await runGitCommand(cwd, ["rev-parse", "--verify", candidate]);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function hasGitHubCliInstalled(cwd: string): Promise<boolean> {
  try {
    const result = await runShellCommand(buildCommandLine("gh", ["--version"]), {
      cwd,
      timeoutMs: 5_000,
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

async function getCurrentPullRequest(cwd: string): Promise<SidebarGitPullRequest | null> {
  try {
    const result = await runShellCommand(
      buildCommandLine("gh", ["pr", "view", "--json", "number,state,title,url"]),
      {
        cwd,
        timeoutMs: 15_000,
      },
    );
    if (result.exitCode !== 0) {
      return null;
    }

    const parsed = JSON.parse(result.stdout) as Partial<SidebarGitPullRequest> & { number?: number };
    if (!parsed.url || !parsed.title || typeof parsed.state !== "string") {
      return null;
    }

    return {
      number: typeof parsed.number === "number" ? parsed.number : undefined,
      state: parsed.state === "closed" || parsed.state === "merged" ? parsed.state : "open",
      title: parsed.title,
      url: parsed.url,
    };
  } catch {
    return null;
  }
}

async function computeAheadCountAgainstDefaultBranch(
  cwd: string,
  branch: string,
  defaultBranch: string | null,
): Promise<number> {
  if (!defaultBranch || defaultBranch === branch) {
    return 0;
  }

  const baseRefCandidates = [`origin/${defaultBranch}`, defaultBranch];
  for (const baseRef of baseRefCandidates) {
    try {
      const stdout = await runGitStdout(cwd, ["rev-list", "--count", `${baseRef}..HEAD`]);
      const count = Number.parseInt(stdout.trim(), 10);
      if (Number.isFinite(count)) {
        return count;
      }
    } catch {
      continue;
    }
  }

  return 0;
}

function createEmptyStatusDetails(): GitStatusDetails {
  return {
    aheadCount: 0,
    behindCount: 0,
    branch: null,
    defaultBranch: null,
    hasGitHubCli: false,
    hasOriginRemote: false,
    hasStagedChanges: false,
    hasUpstream: false,
    hasUnstagedChanges: false,
    hasWorkingTreeChanges: false,
    isRepo: false,
    pr: null,
    upstreamRef: null,
    workingTree: {
      deletions: 0,
      files: [],
      insertions: 0,
    },
  };
}

function parseBranchAb(value: string): { ahead: number; behind: number } {
  const match = value.match(/^\+(\d+)\s+-(\d+)$/);
  if (!match) {
    return { ahead: 0, behind: 0 };
  }

  return {
    ahead: Number.parseInt(match[1] ?? "0", 10),
    behind: Number.parseInt(match[2] ?? "0", 10),
  };
}

function parseRemoteNames(stdout: string): string[] {
  return stdout
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parsePorcelainStatus(value: string): {
  indexStatus: string;
  workTreeStatus: string;
} | null {
  const match = value.match(/^[12u] ([A-Z.]{2}) /);
  if (!match) {
    return null;
  }

  const status = match[1] ?? "..";
  return {
    indexStatus: status[0] ?? ".",
    workTreeStatus: status[1] ?? ".",
  };
}

function parseNumstatEntries(stdout: string): GitWorkingTreeFile[] {
  const entries: GitWorkingTreeFile[] = [];
  for (const line of stdout.split(/\r?\n/g)) {
    if (line.trim().length === 0) {
      continue;
    }

    const [insertionsRaw, deletionsRaw, ...pathParts] = line.split("\t");
    const rawPath =
      pathParts.length > 1 ? (pathParts.at(-1) ?? "").trim() : pathParts.join("\t").trim();
    if (!rawPath) {
      continue;
    }

    const renameArrowIndex = rawPath.indexOf(" => ");
    const path =
      renameArrowIndex >= 0 ? rawPath.slice(renameArrowIndex + " => ".length).trim() : rawPath;
    entries.push({
      deletions: Number.parseInt(deletionsRaw ?? "0", 10) || 0,
      insertions: Number.parseInt(insertionsRaw ?? "0", 10) || 0,
      path: path || rawPath,
    });
  }

  return entries;
}

function parsePorcelainPath(line: string): string | null {
  if (line.startsWith("? ") || line.startsWith("! ")) {
    const path = line.slice(2).trim();
    return path || null;
  }

  if (!(line.startsWith("1 ") || line.startsWith("2 ") || line.startsWith("u "))) {
    return null;
  }

  const tabIndex = line.indexOf("\t");
  if (tabIndex >= 0) {
    const [path] = line.slice(tabIndex + 1).split("\t");
    return path?.trim() || null;
  }

  const parts = line.trim().split(/\s+/g);
  return parts.at(-1) ?? null;
}
