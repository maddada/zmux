export type SidebarGitAction = "commit" | "push" | "pr";

export type SidebarGitPullRequest = {
  number?: number;
  state: "open" | "closed" | "merged";
  title: string;
  url: string;
};

export type SidebarGitState = {
  additions: number;
  aheadCount: number;
  behindCount: number;
  branch: string | null;
  deletions: number;
  hasGitHubCli: boolean;
  hasOriginRemote: boolean;
  hasUpstream: boolean;
  hasWorkingTreeChanges: boolean;
  isBusy: boolean;
  isRepo: boolean;
  pr: SidebarGitPullRequest | null;
  primaryAction: SidebarGitAction;
};

export type SidebarGitMenuItem = {
  action: SidebarGitAction;
  disabled: boolean;
  disabledReason?: string;
  label: string;
};

export type SidebarGitPrimaryActionState = {
  action: SidebarGitAction;
  disabled: boolean;
  disabledReason?: string;
  label: string;
};

export const DEFAULT_SIDEBAR_GIT_ACTION: SidebarGitAction = "commit";

export function createDefaultSidebarGitState(
  primaryAction: SidebarGitAction = DEFAULT_SIDEBAR_GIT_ACTION,
): SidebarGitState {
  return {
    additions: 0,
    aheadCount: 0,
    behindCount: 0,
    branch: null,
    deletions: 0,
    hasGitHubCli: false,
    hasOriginRemote: false,
    hasUpstream: false,
    hasWorkingTreeChanges: false,
    isBusy: false,
    isRepo: false,
    pr: null,
    primaryAction,
  };
}

export function hasSidebarGitDiffStat(state: Pick<SidebarGitState, "additions" | "deletions">): boolean {
  return state.additions > 0 || state.deletions > 0;
}

export function normalizeSidebarGitAction(candidate: string | undefined): SidebarGitAction {
  return candidate === "push" || candidate === "pr" ? candidate : "commit";
}

export function buildSidebarGitMenuItems(state: SidebarGitState): SidebarGitMenuItem[] {
  return [
    buildSidebarGitMenuItem("commit", "Commit", state),
    buildSidebarGitMenuItem("push", "Push", state),
    buildSidebarGitMenuItem("pr", state.pr?.state === "open" ? "View PR" : "Create PR", state),
  ];
}

export function resolveSidebarGitPrimaryActionState(
  state: SidebarGitState,
): SidebarGitPrimaryActionState {
  const action = normalizeSidebarGitAction(state.primaryAction);
  const disabledReason = getSidebarGitDisabledReason(state, action);

  if (action === "push") {
    return {
      action,
      disabled: disabledReason !== undefined,
      disabledReason,
      label: state.hasWorkingTreeChanges ? "Commit & Push" : "Push",
    };
  }

  if (action === "pr") {
    return {
      action,
      disabled: disabledReason !== undefined,
      disabledReason,
      label: resolveSidebarGitPrPrimaryLabel(state),
    };
  }

  return {
    action,
    disabled: disabledReason !== undefined,
    disabledReason,
    label: "Commit",
  };
}

export function getSidebarGitDisabledReason(
  state: SidebarGitState,
  action: SidebarGitAction,
): string | undefined {
  if (state.isBusy) {
    return "Git action already running.";
  }

  if (!state.isRepo) {
    return "Open a Git repository to use Git actions.";
  }

  if (action === "commit") {
    return state.hasWorkingTreeChanges ? undefined : "No working tree changes to commit.";
  }

  if (!state.branch) {
    return "Create and checkout a branch before pushing or creating a PR.";
  }

  if (state.behindCount > 0) {
    return "Branch is behind upstream. Pull or rebase first.";
  }

  if (action === "push") {
    if (state.hasWorkingTreeChanges) {
      return undefined;
    }

    if (state.aheadCount > 0) {
      return undefined;
    }

    if (!state.hasUpstream && state.hasOriginRemote) {
      return undefined;
    }

    if (!state.hasOriginRemote) {
      return 'Add an "origin" remote before pushing.';
    }

    return "No local commits to push.";
  }

  if (!state.hasGitHubCli) {
    return "Install GitHub CLI to create or view pull requests.";
  }

  if (state.hasWorkingTreeChanges) {
    return undefined;
  }

  if (state.pr?.state === "open") {
    return undefined;
  }

  if (state.aheadCount > 0) {
    return undefined;
  }

  if (!state.hasUpstream && state.hasOriginRemote) {
    return undefined;
  }

  if (!state.hasOriginRemote) {
    return 'Add an "origin" remote before creating a PR.';
  }

  if (state.hasUpstream) {
    return undefined;
  }

  return "No branch state available for PR creation.";
}

function buildSidebarGitMenuItem(
  action: SidebarGitAction,
  label: string,
  state: SidebarGitState,
): SidebarGitMenuItem {
  const disabledReason = getSidebarGitDisabledReason(state, action);
  return {
    action,
    disabled: disabledReason !== undefined,
    disabledReason,
    label,
  };
}

function resolveSidebarGitPrPrimaryLabel(state: SidebarGitState): string {
  const needsPush = state.hasWorkingTreeChanges || state.aheadCount > 0 || !state.hasUpstream;
  if (state.hasWorkingTreeChanges) {
    return "Commit, Push & PR";
  }
  if (state.pr?.state === "open" && !needsPush) {
    return "View PR";
  }
  if (needsPush) {
    return state.pr?.state === "open" ? "Push & View PR" : "Push & Create PR";
  }
  return state.pr?.state === "open" ? "View PR" : "Create PR";
}
