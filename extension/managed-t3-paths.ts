import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as vscode from "vscode";

export type ManagedT3Provider = "t3code";

const MANAGED_T3_WEB_DIST_SEGMENTS = ["apps", "web", "dist"] as const;

const MANAGED_T3_PROVIDER_CONFIG: Record<
  ManagedT3Provider,
  {
    sourceEntrypointSegments: readonly string[];
    windowsEntrypointSegments: readonly string[];
    bundledServerDirectoryName: string;
    bundledWebDirectoryName: string;
    displayName: string;
    envVarName: string;
    repoDirectoryName: string;
    repoRootSetting?: string;
  }
> = {
  /**
   * CDXC:T3Code 2026-05-01-07:04
   * The managed T3 Code provider uses the same repo-root override contract as
   * the reference project so a shared `t3code-embed` checkout can be selected
   * consistently across the embedded runtime and any extension-side tooling.
   */
  t3code: {
    sourceEntrypointSegments: ["apps", "server", "src", "bin.ts"],
    windowsEntrypointSegments: ["apps", "server", "dist", "bin.mjs"],
    bundledServerDirectoryName: "t3code-server",
    bundledWebDirectoryName: "t3code-embed",
    displayName: "T3 Code",
    envVarName: "VSMUX_T3CODE_REPO_ROOT",
    repoDirectoryName: "t3code-embed",
    repoRootSetting: "VSmux.t3codeRepoRoot",
  },
};

type ManagedT3Context = Pick<vscode.ExtensionContext, "extensionPath">;

export function getManagedT3Provider(): ManagedT3Provider {
  return "t3code";
}

export function getManagedT3ProviderDisplayName(provider: ManagedT3Provider): string {
  return MANAGED_T3_PROVIDER_CONFIG[provider].displayName;
}

export function getManagedT3BundledServerDirectoryName(provider: ManagedT3Provider): string {
  return MANAGED_T3_PROVIDER_CONFIG[provider].bundledServerDirectoryName;
}

export function getManagedT3BundledWebDirectoryName(provider: ManagedT3Provider): string {
  return MANAGED_T3_PROVIDER_CONFIG[provider].bundledWebDirectoryName;
}

export function getManagedT3RepoRoot(
  provider = getManagedT3Provider(),
  context?: ManagedT3Context,
): string {
  const overrideRoot = getManagedT3RepoRootOverride(provider);
  if (overrideRoot) {
    return overrideRoot;
  }

  const configuredRoot = getConfiguredManagedT3RepoRoot(provider);
  if (configuredRoot) {
    return configuredRoot;
  }

  const detectedRoot = getManagedT3RepoRootCandidates(provider, context).find((candidate) =>
    hasManagedT3Entrypoint(candidate, provider),
  );
  if (detectedRoot) {
    return detectedRoot;
  }

  return (
    getDefaultManagedT3RepoRootCandidate(provider, context) ?? getDefaultManagedT3RepoRoot(provider)
  );
}

export function getManagedT3EntrypointPath(
  provider = getManagedT3Provider(),
  context?: ManagedT3Context,
): string {
  return join(
    getManagedT3RepoRoot(provider, context),
    ...MANAGED_T3_PROVIDER_CONFIG[provider].sourceEntrypointSegments,
  );
}

export function getManagedT3WindowsEntrypointPath(
  provider = getManagedT3Provider(),
  context?: ManagedT3Context,
): string {
  return join(
    getManagedT3RepoRoot(provider, context),
    ...MANAGED_T3_PROVIDER_CONFIG[provider].windowsEntrypointSegments,
  );
}

export function getManagedT3WebDistPath(
  provider = getManagedT3Provider(),
  context?: ManagedT3Context,
): string {
  return join(getManagedT3RepoRoot(provider, context), ...MANAGED_T3_WEB_DIST_SEGMENTS);
}

export function hasManagedT3Entrypoint(
  repoRoot: string,
  provider = getManagedT3Provider(),
): boolean {
  return existsSync(
    join(repoRoot, ...MANAGED_T3_PROVIDER_CONFIG[provider].sourceEntrypointSegments),
  );
}

export function getConfiguredManagedT3RepoRoot(
  provider = getManagedT3Provider(),
): string | undefined {
  const providerSetting = MANAGED_T3_PROVIDER_CONFIG[provider].repoRootSetting;
  if (!providerSetting) {
    return undefined;
  }

  const configuredProviderRoot = vscode.workspace
    .getConfiguration()
    .get<string>(providerSetting)
    ?.trim();
  return configuredProviderRoot && configuredProviderRoot.length > 0
    ? configuredProviderRoot
    : undefined;
}

function getManagedT3RepoRootOverride(provider: ManagedT3Provider): string | undefined {
  const providerEnv = process.env[MANAGED_T3_PROVIDER_CONFIG[provider].envVarName]?.trim();
  return providerEnv && providerEnv.length > 0 ? providerEnv : undefined;
}

function getDefaultManagedT3RepoRoot(provider: ManagedT3Provider): string {
  return join(homedir(), "dev", "_active", MANAGED_T3_PROVIDER_CONFIG[provider].repoDirectoryName);
}

function getManagedT3RepoRootCandidates(
  provider: ManagedT3Provider,
  context?: ManagedT3Context,
): string[] {
  const repoDirectoryName = MANAGED_T3_PROVIDER_CONFIG[provider].repoDirectoryName;
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

    addCandidate(join(trimmedCandidate, repoDirectoryName));
    addCandidate(join(dirname(trimmedCandidate), repoDirectoryName));
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
  addCandidate(getDefaultManagedT3RepoRoot(provider));

  return candidates;
}

function getDefaultManagedT3RepoRootCandidate(
  provider: ManagedT3Provider,
  context?: ManagedT3Context,
): string | undefined {
  const repoDirectoryName = MANAGED_T3_PROVIDER_CONFIG[provider].repoDirectoryName;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceFolder) {
    if (basename(workspaceFolder) === repoDirectoryName) {
      return workspaceFolder;
    }

    return join(dirname(workspaceFolder), repoDirectoryName);
  }

  if (context?.extensionPath) {
    if (basename(context.extensionPath) === repoDirectoryName) {
      return context.extensionPath;
    }

    if (basename(context.extensionPath) === "out") {
      return join(dirname(dirname(context.extensionPath)), repoDirectoryName);
    }

    return join(dirname(context.extensionPath), repoDirectoryName);
  }

  if (basename(process.cwd()) === repoDirectoryName) {
    return process.cwd();
  }

  return join(dirname(process.cwd()), repoDirectoryName);
}
