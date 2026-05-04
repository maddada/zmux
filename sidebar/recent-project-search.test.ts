import { describe, expect, test } from "vitest";
import { filterRecentProjects } from "./recent-project-search";
import type { SidebarRecentProject } from "../shared/session-grid-contract";

const PROJECTS: SidebarRecentProject[] = [
  {
    path: "/Users/story/dev/agent-manager-x",
    projectId: "agent-manager-x",
    sessionCount: 2,
    title: "agent-manager-x",
  },
  {
    path: "/Users/story/dev/open-design",
    projectId: "open-design",
    sessionCount: 0,
    title: "open-design",
  },
];

describe("filterRecentProjects", () => {
  test("keeps native recency order when query is blank", () => {
    expect(filterRecentProjects(PROJECTS, "")).toEqual(PROJECTS);
  });

  test("matches project names and paths fuzzily", () => {
    /**
     * CDXC:RecentProjects 2026-05-04-14:25
     * Recent Projects search should find parked projects by name or path while
     * leaving restore ordering owned by the native recency projection.
     */
    expect(filterRecentProjects(PROJECTS, "agm").map((project) => project.projectId)).toEqual([
      "agent-manager-x",
    ]);
    expect(
      filterRecentProjects(PROJECTS, "open design").map((project) => project.projectId),
    ).toEqual(["open-design"]);
  });
});
