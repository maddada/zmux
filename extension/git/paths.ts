import { existsSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

export function resolveGitDir(workspaceRoot: string): string | undefined {
  const dotGitPath = path.join(workspaceRoot, ".git");
  if (!existsSync(dotGitPath)) {
    return undefined;
  }

  try {
    const stats = statSync(dotGitPath);
    if (stats.isDirectory()) {
      return dotGitPath;
    }

    if (!stats.isFile()) {
      return undefined;
    }

    const gitDirLine = readFileSync(dotGitPath, "utf8").trim();
    const match = /^gitdir:\s*(.+)$/i.exec(gitDirLine);
    if (!match) {
      return undefined;
    }

    return path.resolve(workspaceRoot, match[1]);
  } catch {
    return undefined;
  }
}

export function resolveGitCommonDir(gitDir: string): string {
  const commonDirPath = path.join(gitDir, "commondir");
  if (!existsSync(commonDirPath)) {
    return gitDir;
  }

  try {
    const commonDir = readFileSync(commonDirPath, "utf8").trim();
    return path.resolve(gitDir, commonDir);
  } catch {
    return gitDir;
  }
}
