import { describe, expect, test } from "vite-plus/test";
import { createSessionFocusPlan } from "./session-focus";

describe("createSessionFocusPlan", () => {
  test("should skip workspace reveal for non-sidebar focus sources", () => {
    expect(
      createSessionFocusPlan({
        isWorkspacePanelActiveEditorTab: false,
        source: "workspace",
      }),
    ).toEqual({
      shouldRevealWorkspacePanel: false,
    });
  });

  test("should reveal the workspace when the sidebar refocuses a session while the panel is hidden", () => {
    expect(
      createSessionFocusPlan({
        isWorkspacePanelActiveEditorTab: false,
        source: "sidebar",
      }),
    ).toEqual({
      shouldRevealWorkspacePanel: true,
    });
  });

  test("should skip reveal when the workspace panel is already the active editor tab", () => {
    expect(
      createSessionFocusPlan({
        isWorkspacePanelActiveEditorTab: true,
        source: "sidebar",
      }),
    ).toEqual({
      shouldRevealWorkspacePanel: false,
    });
  });
});
