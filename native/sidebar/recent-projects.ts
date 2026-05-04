import type { GroupedSessionWorkspaceSnapshot } from "../../shared/session-grid-contract";

export type RecentProjectState = {
  isChat?: boolean;
  isRecentProject?: boolean;
  recentClosedAt?: string;
  workspace: GroupedSessionWorkspaceSnapshot;
};

export type NormalizeStartupRecentProjectsResult<T extends RecentProjectState> = {
  changed: boolean;
  projects: T[];
};

export function countRecentProjectSessions(
  project: Pick<RecentProjectState, "workspace">,
): number {
  return project.workspace.groups.reduce(
    (projectTotal, group) => projectTotal + group.snapshot.sessions.length,
    0,
  );
}

export function hasRecentProjectSessions(project: Pick<RecentProjectState, "workspace">): boolean {
  return countRecentProjectSessions(project) > 0;
}

export function normalizeStartupRecentProjects<T extends RecentProjectState>(
  projects: readonly T[],
  recentClosedAt: string,
): NormalizeStartupRecentProjectsResult<T> {
  /**
   * CDXC:RecentProjects 2026-05-04-14:25
   * On app startup, Combined sidebar should auto-move only non-chat projects
   * with no stored sessions into Recent Projects. Sleeping sessions are still
   * stored sessions, so they keep the project in the main sidebar.
   */
  let changed = false;
  const normalizedProjects = projects.map((project) => {
    if (
      project.isChat === true ||
      project.isRecentProject === true ||
      hasRecentProjectSessions(project)
    ) {
      return project;
    }

    changed = true;
    return {
      ...project,
      isRecentProject: true,
      recentClosedAt: project.recentClosedAt || recentClosedAt,
    };
  });

  return {
    changed,
    projects: normalizedProjects,
  };
}

export function compareRecentProjectsByClosedAt(
  left: Pick<RecentProjectState, "recentClosedAt">,
  right: Pick<RecentProjectState, "recentClosedAt">,
): number {
  return recentProjectClosedAtTime(right) - recentProjectClosedAtTime(left);
}

function recentProjectClosedAtTime(project: Pick<RecentProjectState, "recentClosedAt">): number {
  const time = project.recentClosedAt ? new Date(project.recentClosedAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}
