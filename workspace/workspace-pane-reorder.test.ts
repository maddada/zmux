import { describe, expect, test } from "vite-plus/test";
import type { WorkspacePanelPane } from "../shared/workspace-panel-contract";
import {
  buildFullSessionOrderFromVisiblePaneOrder,
  buildVisiblePaneOrderForDrop,
  sortPanesBySessionIds,
} from "./workspace-pane-reorder";

describe("buildVisiblePaneOrderForDrop", () => {
  test("should swap only the dragged and target terminal slots and keep non-terminal panes fixed", () => {
    expect(
      buildVisiblePaneOrderForDrop(
        ["terminal-1", "t3-1", "terminal-2", "terminal-3"],
        ["terminal-1", "terminal-2", "terminal-3"],
        "terminal-3",
        "terminal-1",
      ),
    ).toEqual(["terminal-3", "t3-1", "terminal-2", "terminal-1"]);
  });

  test("should swap two visible panes when dragging the left pane onto the right pane", () => {
    expect(
      buildVisiblePaneOrderForDrop(
        ["terminal-1", "terminal-2"],
        ["terminal-1", "terminal-2"],
        "terminal-1",
        "terminal-2",
      ),
    ).toEqual(["terminal-2", "terminal-1"]);
  });

  test("should swap two non-adjacent terminal panes without shifting the middle terminal", () => {
    expect(
      buildVisiblePaneOrderForDrop(
        ["terminal-1", "terminal-2", "terminal-3"],
        ["terminal-1", "terminal-2", "terminal-3"],
        "terminal-1",
        "terminal-3",
      ),
    ).toEqual(["terminal-3", "terminal-2", "terminal-1"]);
  });

  test("should return undefined when the drop target is the dragged pane", () => {
    expect(
      buildVisiblePaneOrderForDrop(
        ["terminal-1", "terminal-2"],
        ["terminal-1", "terminal-2"],
        "terminal-1",
        "terminal-1",
      ),
    ).toBeUndefined();
  });
});

describe("buildFullSessionOrderFromVisiblePaneOrder", () => {
  test("should append hidden sessions after the visible pane order", () => {
    expect(
      buildFullSessionOrderFromVisiblePaneOrder(
        ["terminal-1", "terminal-2", "terminal-3", "terminal-4"],
        ["terminal-3", "terminal-1"],
      ),
    ).toEqual(["terminal-3", "terminal-1", "terminal-2", "terminal-4"]);
  });
});

describe("sortPanesBySessionIds", () => {
  test("should sort panes to match the provided session order", () => {
    const panes: WorkspacePanelPane[] = [
      createTerminalPane("terminal-2"),
      createTerminalPane("terminal-3"),
      createTerminalPane("terminal-1"),
    ];

    expect(sortPanesBySessionIds(panes, ["terminal-1", "terminal-2", "terminal-3"])).toEqual([
      createTerminalPane("terminal-1"),
      createTerminalPane("terminal-2"),
      createTerminalPane("terminal-3"),
    ]);
  });
});

function createTerminalPane(sessionId: string): WorkspacePanelPane {
  return {
    isVisible: true,
    kind: "terminal",
    sessionId,
    sessionRecord: {
      alias: sessionId,
      column: 0,
      createdAt: new Date(0).toISOString(),
      displayId: sessionId,
      kind: "terminal",
      row: 0,
      sessionId,
      slotIndex: 0,
      title: sessionId,
    },
  };
}
