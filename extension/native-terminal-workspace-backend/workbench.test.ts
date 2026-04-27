import { beforeEach, describe, expect, test } from "vite-plus/test";
import { vi } from "vite-plus/test";

type MockTab = {
  input: unknown;
  isActive: boolean;
  label: string;
};

type MockTabGroup = {
  activeTab?: MockTab;
  tabs: MockTab[];
  viewColumn?: number;
};

type MockTerminal = {
  creationOptions: {
    name?: string;
  };
  exitStatus:
    | {
        code: number | undefined;
        reason: number;
      }
    | undefined;
  name: string;
};

type MockWindow = {
  activeTerminal: MockTerminal | undefined;
  tabGroups: {
    activeTabGroup: MockTabGroup | undefined;
    all: MockTabGroup[];
  };
};

const { mockWindow } = vi.hoisted(() => ({
  mockWindow: {
    activeTerminal: undefined,
    tabGroups: {
      activeTabGroup: undefined,
      all: [],
    },
  } as MockWindow,
}));

vi.mock("vscode", () => ({
  TabInputTerminal: class MockTabInputTerminal {},
  ViewColumn: {
    Nine: 9,
    One: 1,
  },
  window: mockWindow,
}));

import * as vscode from "vscode";
import {
  findTerminalTabIndex,
  findTerminalGroupIndex,
  getActiveEditorTerminalTabLabel,
  getActivePanelTerminalTabLabel,
  getActiveTerminalTabLocation,
  getTerminalDisplayName,
  isTerminalTabActive,
  resolveTerminalRestoreTarget,
} from "./workbench";

describe("native terminal workbench helpers", () => {
  beforeEach(() => {
    getMockWindow().activeTerminal = undefined;
    getMockWindow().tabGroups.activeTabGroup = undefined;
    getMockWindow().tabGroups.all = [];
  });

  test("should read the selected terminal tab in the panel", () => {
    const editorGroup = createTerminalGroup(1, [{ isActive: true, label: "editor" }]);
    const panelGroup = createTerminalGroup(undefined, [{ isActive: true, label: "panel" }]);

    getMockWindow().tabGroups.all = [editorGroup, panelGroup];

    expect(getActivePanelTerminalTabLabel()).toBe("panel");
  });

  test("should read the selected terminal tab in the active editor group", () => {
    getMockWindow().tabGroups.activeTabGroup = createTerminalGroup(2, [
      { isActive: true, label: "editor" },
    ]);

    expect(getActiveEditorTerminalTabLabel()).toBe("editor");
  });

  test("should not treat panel terminals as editor-group terminals", () => {
    getMockWindow().tabGroups.all = [
      createTerminalGroup(undefined, [{ isActive: true, label: "panel" }]),
    ];

    expect(findTerminalGroupIndex("panel")).toBeUndefined();
  });

  test("should classify an active terminal tab in the editor area", () => {
    const activeTerminal = createTerminal("editor");
    getMockWindow().activeTerminal = activeTerminal;
    getMockWindow().tabGroups.activeTabGroup = createTerminalGroup(2, [
      { isActive: true, label: "editor" },
    ]);

    expect(getActiveTerminalTabLocation()).toBe("editor");
    expect(isTerminalTabActive("editor", activeTerminal)).toBe(true);
  });

  test("should classify an active terminal tab in the panel", () => {
    getMockWindow().tabGroups.activeTabGroup = createTerminalGroup(undefined, [
      { isActive: true, label: "panel" },
    ]);

    expect(getActiveTerminalTabLocation()).toBe("panel");
  });

  test("should return other when the active tab is not a terminal", () => {
    const activeTerminal = createTerminal("notes");
    getMockWindow().activeTerminal = activeTerminal;
    getMockWindow().tabGroups.activeTabGroup = {
      activeTab: {
        input: {},
        isActive: true,
        label: "notes",
      },
      tabs: [
        {
          input: {},
          isActive: true,
          label: "notes",
        },
      ],
      viewColumn: 1,
    };

    expect(getActiveTerminalTabLocation()).toBe("other");
    expect(isTerminalTabActive("notes", activeTerminal)).toBe(false);
  });

  test("should require the exact terminal tab label for active-tab detection", () => {
    const activeTerminal = createTerminal("editor");
    getMockWindow().activeTerminal = activeTerminal;
    getMockWindow().tabGroups.activeTabGroup = createTerminalGroup(1, [
      { isActive: true, label: "other" },
    ]);

    expect(isTerminalTabActive("editor", activeTerminal)).toBe(false);
  });

  test("should find the terminal tab index inside an editor group", () => {
    getMockWindow().tabGroups.all = [
      createTerminalGroup(1, [
        { isActive: false, label: "first" },
        { isActive: true, label: "second" },
      ]),
    ];

    expect(findTerminalTabIndex("second", 0)).toBe(1);
  });

  test("should prefer the exact saved terminal when restoring the panel selection", () => {
    const activeTerminal = createTerminal("panel");
    const otherTerminal = createTerminal("panel");

    expect(
      resolveTerminalRestoreTarget([otherTerminal, activeTerminal], activeTerminal, "panel"),
    ).toBe(activeTerminal);
  });

  test("should fall back to the matching panel tab label when the saved terminal changed", () => {
    const replacementTerminal = createTerminal("panel");

    expect(
      resolveTerminalRestoreTarget(
        [createTerminal("other"), replacementTerminal],
        undefined,
        "panel",
      ),
    ).toBe(replacementTerminal);
  });

  test("should ignore exited terminals when restoring the panel selection", () => {
    const exitedTerminal = createTerminal("panel", {
      exitStatus: {
        code: 0,
        reason: 0,
      },
    });

    expect(resolveTerminalRestoreTarget([exitedTerminal], exitedTerminal, "panel")).toBeUndefined();
  });

  test("should read the terminal creation name when no runtime name is available", () => {
    expect(
      getTerminalDisplayName({
        creationOptions: {
          name: "created-name",
        },
        exitStatus: undefined,
        name: "",
      }),
    ).toBe("created-name");
  });
});

function createTerminalGroup(
  viewColumn: number | undefined,
  tabs: Array<{ isActive: boolean; label: string }>,
): MockTabGroup {
  const resolvedTabs = tabs.map<MockTab>(({ isActive, label }) => ({
    input: new vscode.TabInputTerminal(),
    isActive,
    label,
  }));

  return {
    activeTab: resolvedTabs.find((tab) => tab.isActive),
    tabs: resolvedTabs,
    viewColumn,
  };
}

function createTerminal(name: string, overrides: Partial<MockTerminal> = {}): MockTerminal {
  return {
    creationOptions: {
      name,
    },
    exitStatus: undefined,
    name,
    ...overrides,
  };
}

function getMockWindow(): {
  activeTerminal: MockTerminal | undefined;
  tabGroups: {
    activeTabGroup: MockTabGroup | undefined;
    all: MockTabGroup[];
  };
} {
  return mockWindow;
}
