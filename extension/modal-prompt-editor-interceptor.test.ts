import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

const {
  executeCommandMock,
  onDidChangeTabsMock,
  onDidChangeVisibleTextEditorsMock,
  onDidOpenTextDocumentMock,
  openPromptTempFilesInModalEditorState,
  saveMock,
  tabGroupsCloseMock,
  tabGroupsState,
  activeTextEditorState,
  visibleTextEditorsState,
} = vi.hoisted(() => ({
  executeCommandMock: vi.fn(async () => undefined),
  onDidChangeTabsMock: vi.fn(() => ({ dispose() {} })),
  onDidChangeVisibleTextEditorsMock: vi.fn(() => ({ dispose() {} })),
  onDidOpenTextDocumentMock: vi.fn(() => ({ dispose() {} })),
  openPromptTempFilesInModalEditorState: { value: true },
  saveMock: vi.fn(async () => true),
  tabGroupsCloseMock: vi.fn(async () => true),
  activeTextEditorState: {
    value: undefined as
      | undefined
      | {
          document: { save: () => Promise<boolean>; uri: MockUri };
        },
  },
  tabGroupsState: [] as Array<{
    activeTab?: unknown;
    isActive: boolean;
    tabs: unknown[];
    viewColumn: number;
  }>,
  visibleTextEditorsState: [] as Array<{ document: { uri: MockUri } }>,
}));

vi.mock("vscode", () => ({
  Disposable: class Disposable {
    public constructor(private readonly callback: () => void) {}

    public dispose(): void {
      this.callback();
    }
  },
  commands: {
    executeCommand: executeCommandMock,
  },
  TabInputText: class TabInputText {
    public constructor(public readonly uri: MockUri) {}
  },
  window: {
    get activeTextEditor() {
      return activeTextEditorState.value;
    },
    get visibleTextEditors() {
      return visibleTextEditorsState;
    },
    onDidChangeVisibleTextEditors: onDidChangeVisibleTextEditorsMock,
    tabGroups: {
      close: tabGroupsCloseMock,
      onDidChangeTabs: onDidChangeTabsMock,
      get activeTabGroup() {
        return tabGroupsState.find((group) => group.isActive) ?? tabGroupsState[0];
      },
      get all() {
        return tabGroupsState;
      },
    },
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: (key: string, defaultValue?: unknown) =>
        key === "openPromptTempFilesInModalEditor"
          ? openPromptTempFilesInModalEditorState.value
          : defaultValue,
    })),
    onDidOpenTextDocument: onDidOpenTextDocumentMock,
  },
}));

import * as vscode from "vscode";
import {
  isAgentPromptTempPath,
  registerModalPromptEditorInterceptor,
  resetModalPromptEditorInterceptorState,
  saveAndCloseActivePromptTempModalEditor,
} from "./modal-prompt-editor-interceptor";

type MockUri = {
  fsPath: string;
  scheme: string;
  toString: (skipEncoding?: boolean) => string;
};

describe("isAgentPromptTempPath", () => {
  test("should match Claude prompt temp markdown files in /tmp", () => {
    expect(
      isAgentPromptTempPath("/tmp/claude-prompt-93db98b9-c6a2-499e-a822-12f9ce2538dd.md"),
    ).toBe(true);
  });

  test("should match Codex temp markdown files in macOS temp folders", () => {
    expect(
      isAgentPromptTempPath("/var/folders/g_/3k86750x4gn2fxr3frv4mpmr0000gn/T/.tmpovlSBg.md"),
    ).toBe(true);
  });

  test("should match dot-tmp markdown files in /tmp", () => {
    expect(isAgentPromptTempPath("/tmp/.tmpPromptDraft.md")).toBe(true);
  });

  test("should reject non-markdown files and regular project markdown files", () => {
    expect(isAgentPromptTempPath("/tmp/claude-prompt-abc.txt")).toBe(false);
    expect(isAgentPromptTempPath("/workspace/docs/claude-prompt-abc.md")).toBe(false);
  });

  test("should reject non-file schemes", () => {
    expect(isAgentPromptTempPath("/tmp/claude-prompt-abc.md", "untitled")).toBe(false);
  });
});

describe("registerModalPromptEditorInterceptor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    executeCommandMock.mockReset();
    executeCommandMock.mockResolvedValue(undefined);
    onDidChangeTabsMock.mockReset();
    onDidChangeTabsMock.mockReturnValue({ dispose() {} });
    onDidChangeVisibleTextEditorsMock.mockReset();
    onDidChangeVisibleTextEditorsMock.mockReturnValue({ dispose() {} });
    onDidOpenTextDocumentMock.mockReset();
    onDidOpenTextDocumentMock.mockReturnValue({ dispose() {} });
    openPromptTempFilesInModalEditorState.value = true;
    saveMock.mockReset();
    saveMock.mockResolvedValue(true);
    activeTextEditorState.value = undefined;
    tabGroupsCloseMock.mockReset();
    tabGroupsCloseMock.mockResolvedValue(true);
    tabGroupsState.length = 0;
    visibleTextEditorsState.length = 0;
    resetModalPromptEditorInterceptorState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should reopen visible prompt temp editors in the modal group", async () => {
    tabGroupsState.push(
      createTabGroup(1, false, [createTextTab("/tmp/claude-prompt-visible.md", true)]),
    );
    tabGroupsState.push(
      createTabGroup(-4, true, [createTextTab("/tmp/claude-prompt-visible.md", true)]),
    );
    visibleTextEditorsState.push({
      document: {
        uri: createMockUri("/tmp/claude-prompt-visible.md"),
      },
    });

    const disposable = registerModalPromptEditorInterceptor();
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();

    expect(executeCommandMock).toHaveBeenNthCalledWith(
      1,
      "_workbench.openWith",
      expect.objectContaining({ fsPath: "/tmp/claude-prompt-visible.md" }),
      "default",
      [-4, { preserveFocus: false }],
    );
    expect(executeCommandMock).toHaveBeenNthCalledWith(2, "zmux.revealWorkspaceInBackground");
    expect(tabGroupsCloseMock).not.toHaveBeenCalled();

    disposable.dispose();
  });

  test("should intercept matching documents opened after registration", async () => {
    let openListener: ((document: { uri: MockUri }) => void) | undefined;
    onDidOpenTextDocumentMock.mockImplementation((listener) => {
      openListener = listener;
      return { dispose() {} };
    });

    const disposable = registerModalPromptEditorInterceptor();
    openListener?.({
      uri: createMockUri("/var/folders/test/T/.tmpModalPrompt.md"),
    });
    tabGroupsState.push(
      createTabGroup(1, false, [createTextTab("/var/folders/test/T/.tmpModalPrompt.md", true)]),
    );
    tabGroupsState.push(
      createTabGroup(-4, true, [createTextTab("/var/folders/test/T/.tmpModalPrompt.md", true)]),
    );
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();

    expect(executeCommandMock).toHaveBeenCalledTimes(2);
    expect(executeCommandMock).toHaveBeenNthCalledWith(
      1,
      "_workbench.openWith",
      expect.objectContaining({ fsPath: "/var/folders/test/T/.tmpModalPrompt.md" }),
      "default",
      [-4, { preserveFocus: false }],
    );
    expect(executeCommandMock).toHaveBeenNthCalledWith(2, "zmux.revealWorkspaceInBackground");
    expect(tabGroupsCloseMock).not.toHaveBeenCalled();

    disposable.dispose();
  });

  test("should close the remaining matching tab after one duplicate closes", async () => {
    let openListener: ((document: { uri: MockUri }) => void) | undefined;
    let tabChangeListener:
      | ((event: { opened: unknown[]; closed: unknown[]; changed: unknown[] }) => void)
      | undefined;
    onDidOpenTextDocumentMock.mockImplementation((listener) => {
      openListener = listener;
      return { dispose() {} };
    });
    onDidChangeTabsMock.mockImplementation((listener) => {
      tabChangeListener = listener;
      return { dispose() {} };
    });

    const disposable = registerModalPromptEditorInterceptor();
    const uri = createMockUri("/tmp/claude-prompt-close-after-modal.md");
    const backgroundTab = createTextTab(uri.fsPath, false);
    const modalTab = createTextTab(uri.fsPath, true);

    tabGroupsState.push(createTabGroup(1, false, [backgroundTab]));
    tabGroupsState.push(createTabGroup(-4, true, [modalTab]));

    openListener?.({ uri });
    await flushPromises();

    tabChangeListener?.({
      opened: [modalTab],
      closed: [],
      changed: [],
    });

    tabGroupsState[1] = createTabGroup(-4, false, []);
    tabChangeListener?.({
      opened: [],
      closed: [modalTab],
      changed: [],
    });

    expect(tabGroupsCloseMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(tabGroupsCloseMock).toHaveBeenCalledTimes(1);
    expect(tabGroupsCloseMock).toHaveBeenCalledWith(backgroundTab, true);

    disposable.dispose();
  });

  test("should only try once per temp document uri", async () => {
    let openListener: ((document: { uri: MockUri }) => void) | undefined;
    onDidOpenTextDocumentMock.mockImplementation((listener) => {
      openListener = listener;
      return { dispose() {} };
    });

    const disposable = registerModalPromptEditorInterceptor();
    const uri = createMockUri("/tmp/claude-prompt-once.md");

    openListener?.({ uri });
    openListener?.({ uri });
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();

    expect(executeCommandMock).toHaveBeenCalledTimes(2);

    disposable.dispose();
  });

  test("should ignore non-matching documents", async () => {
    let openListener: ((document: { uri: MockUri }) => void) | undefined;
    onDidOpenTextDocumentMock.mockImplementation((listener) => {
      openListener = listener;
      return { dispose() {} };
    });

    const disposable = registerModalPromptEditorInterceptor();
    openListener?.({
      uri: createMockUri("/workspace/notes/prompt.md"),
    });
    await flushPromises();

    expect(executeCommandMock).not.toHaveBeenCalled();

    disposable.dispose();
  });

  test("should skip modal interception entirely when the setting is disabled", async () => {
    let openListener: ((document: { uri: MockUri }) => void) | undefined;
    onDidOpenTextDocumentMock.mockImplementation((listener) => {
      openListener = listener;
      return { dispose() {} };
    });
    openPromptTempFilesInModalEditorState.value = false;

    const disposable = registerModalPromptEditorInterceptor();
    openListener?.({
      uri: createMockUri("/tmp/claude-prompt-disabled.md"),
    });
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();

    expect(executeCommandMock).not.toHaveBeenCalled();
    expect(tabGroupsCloseMock).not.toHaveBeenCalled();

    disposable.dispose();
  });
});

describe("saveAndCloseActivePromptTempModalEditor", () => {
  beforeEach(() => {
    executeCommandMock.mockReset();
    executeCommandMock.mockResolvedValue(undefined);
    openPromptTempFilesInModalEditorState.value = true;
    saveMock.mockReset();
    saveMock.mockResolvedValue(true);
    activeTextEditorState.value = undefined;
  });

  test("should save the active prompt temp document and close the modal", async () => {
    activeTextEditorState.value = {
      document: {
        save: saveMock,
        uri: createMockUri("/tmp/claude-prompt-save-and-close.md"),
      },
    };

    await saveAndCloseActivePromptTempModalEditor();

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(executeCommandMock).toHaveBeenCalledWith("workbench.action.closeModalEditor");
  });

  test("should ignore non-prompt documents", async () => {
    activeTextEditorState.value = {
      document: {
        save: saveMock,
        uri: createMockUri("/workspace/readme.md"),
      },
    };

    await saveAndCloseActivePromptTempModalEditor();

    expect(saveMock).not.toHaveBeenCalled();
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  test("should do nothing when the modal prompt feature is disabled", async () => {
    openPromptTempFilesInModalEditorState.value = false;
    activeTextEditorState.value = {
      document: {
        save: saveMock,
        uri: createMockUri("/tmp/claude-prompt-disabled-save.md"),
      },
    };

    await saveAndCloseActivePromptTempModalEditor();

    expect(saveMock).not.toHaveBeenCalled();
    expect(executeCommandMock).not.toHaveBeenCalled();
  });
});

function createMockUri(fsPath: string): MockUri {
  return {
    fsPath,
    scheme: "file",
    toString: () => `file://${fsPath}`,
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createTextTab(
  path: string,
  isActive: boolean,
): {
  group: { isActive: boolean };
  input: InstanceType<typeof vscode.TabInputText>;
  isActive: boolean;
} {
  return {
    group: { isActive: false },
    input: new vscode.TabInputText(createMockUri(path)),
    isActive,
  };
}

function createTabGroup(
  viewColumn: number,
  isActive: boolean,
  tabs: Array<ReturnType<typeof createTextTab>>,
): {
  activeTab: ReturnType<typeof createTextTab> | undefined;
  isActive: boolean;
  tabs: Array<ReturnType<typeof createTextTab>>;
  viewColumn: number;
} {
  const group = {
    activeTab: tabs.find((tab) => tab.isActive),
    isActive,
    tabs,
    viewColumn,
  };

  for (const tab of tabs) {
    tab.group = group;
  }

  return group;
}
