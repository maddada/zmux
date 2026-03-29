import { describe, expect, test } from "vite-plus/test";
import {
  buildSidebarGitMenuItems,
  createDefaultSidebarGitState,
  getSidebarGitDisabledReason,
  resolveSidebarGitPrimaryActionState,
} from "./sidebar-git";

describe("resolveSidebarGitPrimaryActionState", () => {
  test("should show commit and push copy for push actions with local changes", () => {
    const state = {
      ...createDefaultSidebarGitState("push"),
      branch: "feature/test",
      hasOriginRemote: true,
      hasWorkingTreeChanges: true,
      isRepo: true,
    };

    expect(resolveSidebarGitPrimaryActionState(state)).toEqual({
      action: "push",
      disabled: false,
      disabledReason: undefined,
      label: "Commit & Push",
    });
  });

  test("should show commit push and pr copy for pr actions with local changes", () => {
    const state = {
      ...createDefaultSidebarGitState("pr"),
      branch: "feature/test",
      hasGitHubCli: true,
      hasOriginRemote: true,
      hasWorkingTreeChanges: true,
      isRepo: true,
    };

    expect(resolveSidebarGitPrimaryActionState(state).label).toBe("Commit, Push & PR");
  });

  test("should show view pr copy when an open pr already exists", () => {
    const state = {
      ...createDefaultSidebarGitState("pr"),
      branch: "feature/test",
      hasGitHubCli: true,
      hasOriginRemote: true,
      hasUpstream: true,
      isRepo: true,
      pr: {
        state: "open" as const,
        title: "Add test feature",
        url: "https://example.com/pr/1",
      },
    };

    expect(resolveSidebarGitPrimaryActionState(state).label).toBe("View PR");
  });
});

describe("buildSidebarGitMenuItems", () => {
  test("should rename the pr menu item to view pr when a pr already exists", () => {
    const state = {
      ...createDefaultSidebarGitState("commit"),
      branch: "feature/test",
      hasGitHubCli: true,
      hasOriginRemote: true,
      hasUpstream: true,
      isRepo: true,
      pr: {
        state: "open" as const,
        title: "Add test feature",
        url: "https://example.com/pr/1",
      },
    };

    expect(buildSidebarGitMenuItems(state).map((item) => item.label)).toEqual([
      "Commit",
      "Push",
      "View PR",
    ]);
  });
});

describe("getSidebarGitDisabledReason", () => {
  test("should block push actions on detached head", () => {
    expect(
      getSidebarGitDisabledReason(
        {
          ...createDefaultSidebarGitState("push"),
          hasOriginRemote: true,
          isRepo: true,
        },
        "push",
      ),
    ).toBe("Create and checkout a branch before pushing or creating a PR.");
  });

  test("should require gh for pr actions", () => {
    expect(
      getSidebarGitDisabledReason(
        {
          ...createDefaultSidebarGitState("pr"),
          branch: "feature/test",
          hasOriginRemote: true,
          isRepo: true,
        },
        "pr",
      ),
    ).toBe("Install GitHub CLI to create or view pull requests.");
  });
});
