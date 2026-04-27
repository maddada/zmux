import { describe, expect, test } from "vite-plus/test";
import { createGroupFocusPlan } from "./group-focus";

describe("createGroupFocusPlan", () => {
  test("should do nothing for non-sidebar focus sources", () => {
    expect(
      createGroupFocusPlan({
        changed: false,
        hasFocusedSession: true,
        isWorkspacePanelVisible: false,
      }),
    ).toEqual({
      shouldEnqueueWorkspaceAutoFocus: false,
      shouldRefreshWorkspacePanel: false,
      shouldRevealWorkspacePanel: false,
    });
  });

  test("should enqueue workspace auto focus when the sidebar switches groups", () => {
    expect(
      createGroupFocusPlan({
        changed: true,
        hasFocusedSession: true,
        isWorkspacePanelVisible: true,
        source: "sidebar",
      }),
    ).toEqual({
      shouldEnqueueWorkspaceAutoFocus: true,
      shouldRefreshWorkspacePanel: false,
      shouldRevealWorkspacePanel: false,
    });
  });

  test("should reveal the workspace when reselecting the active group while the panel is hidden", () => {
    expect(
      createGroupFocusPlan({
        changed: false,
        hasFocusedSession: true,
        isWorkspacePanelVisible: false,
        source: "sidebar",
      }),
    ).toEqual({
      shouldEnqueueWorkspaceAutoFocus: true,
      shouldRefreshWorkspacePanel: true,
      shouldRevealWorkspacePanel: true,
    });
  });

  test("should skip refocusing when reselecting the active group while the panel is already visible", () => {
    expect(
      createGroupFocusPlan({
        changed: false,
        hasFocusedSession: true,
        isWorkspacePanelVisible: true,
        source: "sidebar",
      }),
    ).toEqual({
      shouldEnqueueWorkspaceAutoFocus: false,
      shouldRefreshWorkspacePanel: false,
      shouldRevealWorkspacePanel: false,
    });
  });
});
