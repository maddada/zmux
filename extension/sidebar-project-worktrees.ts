import * as path from "node:path";
import type { SidebarProjectWorktree } from "../shared/session-grid-contract";
import { runGitStdout } from "./git/process";

export async function resolveSidebarProjectWorktrees(
  workspaceRoot: string,
): Promise<SidebarProjectWorktree[]> {
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot.trim());
  if (!normalizedWorkspaceRoot) {
    return [];
  }

  let currentProjectRoot: string;
  let worktreeListOutput: string;

  try {
    [currentProjectRoot, worktreeListOutput] = await Promise.all([
      runGitStdout(normalizedWorkspaceRoot, ["rev-parse", "--show-toplevel"]).then((stdout) =>
        path.resolve(stdout.trim()),
      ),
      runGitStdout(normalizedWorkspaceRoot, ["worktree", "list", "--porcelain"]),
    ]);
  } catch {
    return [];
  }

  return parseGitWorktreeList(worktreeListOutput)
    .filter((worktree) => path.resolve(worktree.directory) !== currentProjectRoot)
    .map((worktree) => ({
      ...worktree,
      directory: path.resolve(worktree.directory),
      name: path.basename(worktree.directory.trim()) || worktree.directory.trim(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

type ParsedGitWorktree = {
  branch?: string;
  directory: string;
};

export function parseGitWorktreeList(output: string): ParsedGitWorktree[] {
  const worktrees: ParsedGitWorktree[] = [];
  let current: ParsedGitWorktree | undefined;

  const flushCurrent = () => {
    if (!current?.directory?.trim()) {
      current = undefined;
      return;
    }

    worktrees.push({
      ...(current.branch ? { branch: current.branch } : {}),
      directory: current.directory.trim(),
    });
    current = undefined;
  };

  for (const rawLine of output.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flushCurrent();
      continue;
    }

    if (line.startsWith("worktree ")) {
      flushCurrent();
      current = {
        directory: line.slice("worktree ".length).trim(),
      };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("branch ")) {
      const branchRef = line.slice("branch ".length).trim();
      current.branch = branchRef.replace(/^refs\/heads\//u, "");
    }
  }

  flushCurrent();
  return worktrees;
}
