import { createHash } from "node:crypto";
import * as path from "node:path";
import * as vscode from "vscode";
import { resolveGitCommonDir, resolveGitDir } from "./git/paths";
import { getDefaultWorkspaceCwd } from "./terminal-workspace-environment";

const SETTINGS_SECTION = "VSmux";
const SHARE_COMMANDS_ACROSS_WORKTREES_SETTING = "shareSidebarCommandsAcrossWorktrees";

export function shouldShareSidebarCommandsAcrossWorktrees(): boolean {
  return vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<boolean>(SHARE_COMMANDS_ACROSS_WORKTREES_SETTING, true);
}

export function getSidebarCommandProjectFamilyKey(): string {
  const workspaceRoot = getDefaultWorkspaceCwd();
  const familyRoot = resolveGitCommonWorkspaceRoot(workspaceRoot) ?? workspaceRoot;
  return createHash("sha1").update(path.resolve(familyRoot)).digest("hex").slice(0, 16);
}

function resolveGitCommonWorkspaceRoot(workspaceRoot: string): string | undefined {
  const gitDir = resolveGitDir(workspaceRoot);
  if (!gitDir) {
    return undefined;
  }

  const commonDir = resolveGitCommonDir(gitDir);
  return path.basename(commonDir) === ".git" ? path.dirname(commonDir) : undefined;
}
