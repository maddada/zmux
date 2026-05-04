import { describe, expect, test } from "vitest";
import {
  compareRecentProjectsByClosedAt,
  countRecentProjectSessions,
  normalizeStartupRecentProjects,
} from "./recent-projects";
import {
  createDefaultGroupedSessionWorkspaceSnapshot,
} from "../../shared/session-grid-contract";
import { createSessionInSimpleWorkspace } from "../../shared/simple-grouped-session-workspace-state";

describe("recent projects", () => {
  test("moves only empty non-chat startup projects into recent projects", () => {
    const startedAt = "2026-05-04T10:25:00.000Z";
    const { projects, changed } = normalizeStartupRecentProjects(
      [
        {
          isChat: false,
          workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
        },
        {
          isChat: true,
          workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
        },
      ],
      startedAt,
    );

    expect(changed).toBe(true);
    expect(projects[0]).toMatchObject({
      isRecentProject: true,
      recentClosedAt: startedAt,
    });
    expect(projects[1]?.isRecentProject).toBeUndefined();
  });

  test("counts sleeping sessions so startup keeps the project visible", () => {
    const created = createSessionInSimpleWorkspace(createDefaultGroupedSessionWorkspaceSnapshot(), {
      title: "Sleeping session",
    });
    const workspace = {
      ...created.snapshot,
      groups: created.snapshot.groups.map((group) => ({
        ...group,
        snapshot: {
          ...group.snapshot,
          sessions: group.snapshot.sessions.map((session) => ({
            ...session,
            isSleeping: true,
          })),
        },
      })),
    };

    const { projects, changed } = normalizeStartupRecentProjects(
      [
        {
          isChat: false,
          workspace,
        },
      ],
      "2026-05-04T10:25:00.000Z",
    );

    expect(countRecentProjectSessions(projects[0]!)).toBe(1);
    expect(changed).toBe(false);
    expect(projects[0]?.isRecentProject).toBeUndefined();
  });

  test("sorts recent projects by last closed time descending", () => {
    const projects = [
      {
        recentClosedAt: "2026-05-04T10:00:00.000Z",
        workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
      },
      {
        recentClosedAt: "2026-05-04T12:00:00.000Z",
        workspace: createDefaultGroupedSessionWorkspaceSnapshot(),
      },
    ];

    expect([...projects].sort(compareRecentProjectsByClosedAt)).toEqual([
      projects[1],
      projects[0],
    ]);
  });
});
