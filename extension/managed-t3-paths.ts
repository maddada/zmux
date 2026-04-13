import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as vscode from "vscode";

const MANAGED_T3_REPO_DIRECTORY_NAME = "dpcode-embed";
const MANAGED_T3_ENTRYPOINT_SEGMENTS = ["apps", "server", "src", "index.ts"] as const;
const MANAGED_T3_WINDOWS_ENTRYPOINT_SEGMENTS = ["apps", "server", "dist", "index.mjs"] as const;
const MANAGED_T3_WEB_DIST_SEGMENTS = ["apps", "web", "dist"] as const;
const DEFAULT_MANAGED_T3_REPO_ROOT = join(
  homedir(),
  "dev",
  "_active",
  MANAGED_T3_REPO_DIRECTORY_NAME,
);

export const MANAGED_T3_REPO_ROOT_SETTING = "VSmux.t3RepoRoot";

type ManagedT3Context = Pick<vscode.ExtensionContext, "extensionPath">;

export function getManagedT3RepoRoot(context?: ManagedT3Context): string {
  const overrideRoot = process.env.VSMUX_T3_REPO_ROOT?.trim();
  if (overrideRoot) {
    return overrideRoot;
  }

  const configuredRoot = getConfiguredManagedT3RepoRoot();
  if (configuredRoot) {
    return configuredRoot;
  }

  const detectedRoot = getManagedT3RepoRootCandidates(context).find((candidate) =>
    hasManagedT3Entrypoint(candidate),
  );
  if (detectedRoot) {
    return detectedRoot;
  }

  return getDefaultManagedT3RepoRootCandidate(context) ?? DEFAULT_MANAGED_T3_REPO_ROOT;
}

export function getManagedT3EntrypointPath(context?: ManagedT3Context): string {
  return join(getManagedT3RepoRoot(context), ...MANAGED_T3_ENTRYPOINT_SEGMENTS);
}

export function getManagedT3WindowsEntrypointPath(context?: ManagedT3Context): string {
  return join(getManagedT3RepoRoot(context), ...MANAGED_T3_WINDOWS_ENTRYPOINT_SEGMENTS);
}

export function getManagedT3WebDistPath(context?: ManagedT3Context): string {
  return join(getManagedT3RepoRoot(context), ...MANAGED_T3_WEB_DIST_SEGMENTS);
}

export function hasManagedT3Entrypoint(repoRoot: string): boolean {
  return existsSync(join(repoRoot, ...MANAGED_T3_ENTRYPOINT_SEGMENTS));
}

function getManagedT3RepoRootCandidates(context?: ManagedT3Context): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const addCandidate = (candidate: string | undefined): void => {
    const trimmedCandidate = candidate?.trim();
    if (!trimmedCandidate || seen.has(trimmedCandidate)) {
      return;
    }

    seen.add(trimmedCandidate);
    candidates.push(trimmedCandidate);
  };

  const addWithParents = (candidate: string | undefined): void => {
    const trimmedCandidate = candidate?.trim();
    if (!trimmedCandidate) {
      return;
    }

    let current = trimmedCandidate;
    while (!seen.has(current)) {
      seen.add(current);
      candidates.push(current);
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  };

  const addSiblingCandidates = (candidate: string | undefined): void => {
    const trimmedCandidate = candidate?.trim();
    if (!trimmedCandidate) {
      return;
    }

    addCandidate(join(trimmedCandidate, MANAGED_T3_REPO_DIRECTORY_NAME));
    addCandidate(join(dirname(trimmedCandidate), MANAGED_T3_REPO_DIRECTORY_NAME));
  };

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    addWithParents(folder.uri.fsPath);
    addSiblingCandidates(folder.uri.fsPath);
  }

  if (context?.extensionPath) {
    addWithParents(context.extensionPath);
    addWithParents(dirname(context.extensionPath));
    addSiblingCandidates(context.extensionPath);
    addSiblingCandidates(dirname(context.extensionPath));
  }

  addWithParents(process.cwd());
  addWithParents(dirname(process.cwd()));
  addSiblingCandidates(process.cwd());
  addSiblingCandidates(dirname(process.cwd()));
  addCandidate(DEFAULT_MANAGED_T3_REPO_ROOT);

  return candidates;
}

function getDefaultManagedT3RepoRootCandidate(context?: ManagedT3Context): string | undefined {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceFolder) {
    if (basename(workspaceFolder) === MANAGED_T3_REPO_DIRECTORY_NAME) {
      return workspaceFolder;
    }

    return join(dirname(workspaceFolder), MANAGED_T3_REPO_DIRECTORY_NAME);
  }

  if (context?.extensionPath) {
    if (basename(context.extensionPath) === MANAGED_T3_REPO_DIRECTORY_NAME) {
      return context.extensionPath;
    }

    if (basename(context.extensionPath) === "out") {
      return join(dirname(dirname(context.extensionPath)), MANAGED_T3_REPO_DIRECTORY_NAME);
    }

    return join(dirname(context.extensionPath), MANAGED_T3_REPO_DIRECTORY_NAME);
  }

  if (basename(process.cwd()) === MANAGED_T3_REPO_DIRECTORY_NAME) {
    return process.cwd();
  }

  return join(dirname(process.cwd()), MANAGED_T3_REPO_DIRECTORY_NAME);
}

export function getConfiguredManagedT3RepoRoot(): string | undefined {
  const configured = vscode.workspace
    .getConfiguration()
    .get<string>(MANAGED_T3_REPO_ROOT_SETTING)
    ?.trim();
  return configured && configured.length > 0 ? configured : undefined;
}
