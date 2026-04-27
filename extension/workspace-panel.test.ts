import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

type Serializer = {
  deserializeWebviewPanel: (panel: MockWebviewPanel) => Promise<void>;
};

type MockDisposable = {
  dispose: ReturnType<typeof vi.fn>;
};

type MockWebview = {
  html: string;
  messageListeners: Array<(message: unknown) => void>;
  onDidReceiveMessage: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
  asWebviewUri: ReturnType<typeof vi.fn>;
};

type MockWebviewPanel = {
  active: boolean;
  dispose: ReturnType<typeof vi.fn>;
  iconPath?: unknown;
  onDidChangeViewState: ReturnType<typeof vi.fn>;
  onDidDispose: ReturnType<typeof vi.fn>;
  reveal: ReturnType<typeof vi.fn>;
  title: string;
  viewColumn?: number;
  visible: boolean;
  webview: MockWebview;
};

type MockPanelOptions = {
  active?: boolean;
  onHtmlAssigned?: (panel: MockWebviewPanel) => void;
  viewColumn?: number;
  visible?: boolean;
};

let registeredSerializer: Serializer | undefined;
let createdPanels: MockWebviewPanel[] = [];
let nextCreatedPanelOptions: MockPanelOptions | undefined;
const { closeTabGroupsMock, executeCommandMock } = vi.hoisted(() => ({
  closeTabGroupsMock: vi.fn(async () => true),
  executeCommandMock: vi.fn(async () => undefined),
}));

vi.mock("vscode", () => ({
  Uri: {
    file: (path: string) => ({ fsPath: path }),
    joinPath: (...parts: unknown[]) => parts,
  },
  TabInputWebview: class TabInputWebview {
    public constructor(public readonly viewType: string) {}
  },
  commands: {
    executeCommand: executeCommandMock,
  },
  ViewColumn: {
    Active: -1,
    One: 1,
  },
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    })),
    createWebviewPanel: vi.fn((_viewType: string, _title: string, viewColumn: number) => {
      const panel = createMockPanel({ ...nextCreatedPanelOptions, viewColumn });
      nextCreatedPanelOptions = undefined;
      createdPanels.push(panel);
      return panel;
    }),
    registerWebviewPanelSerializer: vi.fn((_viewType: string, serializer: Serializer) => {
      registeredSerializer = serializer;
      return createDisposable();
    }),
    tabGroups: {
      activeTabGroup: undefined,
      all: [],
      close: closeTabGroupsMock,
    },
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
    })),
  },
}));

import * as vscode from "vscode";
import { closeWorkspacePanelTabs, WorkspacePanelManager } from "./workspace-panel";

describe("WorkspacePanelManager", () => {
  beforeEach(() => {
    createdPanels = [];
    registeredSerializer = undefined;
    executeCommandMock.mockClear();
    closeTabGroupsMock.mockClear();
    vi.mocked(vscode.window.createWebviewPanel).mockClear();
    closeTabGroupsMock.mockImplementation(async (tabsToClose: unknown) => {
      const closingTabs = Array.isArray(tabsToClose) ? tabsToClose : [tabsToClose];
      (vscode.window.tabGroups.all as unknown as Array<{ tabs: unknown[] }>) = (
        vscode.window.tabGroups.all as unknown as Array<{ tabs: unknown[] }>
      )
        .map((group) => ({
          ...group,
          tabs: group.tabs.filter((tab) => !closingTabs.includes(tab)),
        }))
        .filter((group) => group.tabs.length > 0);
      return true;
    });
    nextCreatedPanelOptions = undefined;
    (vscode.window.tabGroups.all as unknown as unknown[]) = [];
    (vscode.window.tabGroups.activeTabGroup as unknown) = undefined;
  });

  test("should close restored zmux workspace tabs on startup", async () => {
    const closedCount = await closeWorkspacePanelTabs([
      {
        isActive: true,
        tabs: [
          {
            group: { viewColumn: 1 },
            input: new vscode.TabInputWebview("zmux.workspace"),
            isActive: true,
            isPinned: true,
            label: "zmux",
          },
          {
            group: { viewColumn: 1 },
            input: new vscode.TabInputWebview("workbench.welcomePage"),
            isActive: false,
            label: "Welcome",
          },
        ],
        viewColumn: 1,
      } as never,
      {
        isActive: false,
        tabs: [
          {
            group: { viewColumn: 2 },
            input: new vscode.TabInputWebview("zmux.workspace"),
            isActive: false,
            isPinned: true,
            label: "zmux",
          },
        ],
        viewColumn: 2,
      } as never,
    ]);

    expect(closedCount).toBe(2);
    expect(closeTabGroupsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ label: "zmux" }), expect.objectContaining({ label: "zmux" })],
      true,
    );
    expect(executeCommandMock.mock.calls.map(([command]) => command)).toEqual([
      "workbench.action.focusFirstEditorGroup",
      "workbench.action.openEditorAtIndex1",
      "workbench.action.unpinEditor",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.openEditorAtIndex1",
      "workbench.action.unpinEditor",
    ]);
  });

  test("should skip tab closing when no restored zmux workspace tabs exist", async () => {
    const closedCount = await closeWorkspacePanelTabs([
      {
        isActive: true,
        tabs: [
          {
            group: { viewColumn: 1 },
            input: new vscode.TabInputWebview("workbench.welcomePage"),
            isActive: true,
            label: "Welcome",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(closedCount).toBe(0);
    expect(closeTabGroupsMock).not.toHaveBeenCalled();
  });

  test("should recreate visible restored workspace panels with fresh resource roots", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    const restoredPanel = createMockPanel({ active: true, viewColumn: 2, visible: true });

    await registeredSerializer?.deserializeWebviewPanel(restoredPanel);

    expect(restoredPanel.dispose).toHaveBeenCalledTimes(1);
    expect(createdPanels).toHaveLength(1);
    expect(restoredPanel.dispose.mock.invocationCallOrder[0]).toBeLessThan(
      (vscode.window.createWebviewPanel as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    );
    expect(createdPanels[0]?.viewColumn).toBe(2);
    expect(createdPanels[0]?.reveal).toHaveBeenCalledWith(2, false);
    expect(executeCommandMock).toHaveBeenCalledWith("workbench.action.pinEditor");

    manager.dispose();
  });

  test("should dispose hidden restored workspace panels without creating a replacement", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    const restoredPanel = createMockPanel({ active: false, viewColumn: 2, visible: false });

    await registeredSerializer?.deserializeWebviewPanel(restoredPanel);

    expect(restoredPanel.dispose).toHaveBeenCalledTimes(1);
    expect(createdPanels).toHaveLength(0);

    manager.dispose();
  });

  test("should pin the zmux tab when it creates a new workspace panel", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    await manager.reveal();

    expect(executeCommandMock).toHaveBeenCalledWith("workbench.action.pinEditor");

    manager.dispose();
  });

  test("should close existing zmux workspace tabs before creating a fresh panel", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    const firstGroupTabs = [
      {
        group: { viewColumn: 1 } as { tabs?: unknown[]; viewColumn: number },
        input: new vscode.TabInputWebview("zmux.workspace"),
        isActive: true,
        label: "zmux",
      },
    ];
    firstGroupTabs[0].group.tabs = firstGroupTabs;
    const secondGroupTabs = [
      {
        group: { viewColumn: 2 } as { tabs?: unknown[]; viewColumn: number },
        input: new vscode.TabInputWebview("zmux.workspace"),
        isActive: false,
        label: "zmux",
      },
      {
        group: { viewColumn: 2 } as { tabs?: unknown[]; viewColumn: number },
        input: new vscode.TabInputWebview("workbench.welcomePage"),
        isActive: false,
        label: "Welcome",
      },
    ];
    for (const tab of secondGroupTabs) {
      tab.group.tabs = secondGroupTabs;
    }

    (vscode.window.tabGroups.all as unknown as unknown[]) = [
      {
        isActive: true,
        tabs: firstGroupTabs,
        viewColumn: 1,
      } as never,
      {
        isActive: false,
        tabs: secondGroupTabs,
        viewColumn: 2,
      } as never,
    ];

    await manager.reveal();

    expect(closeTabGroupsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ label: "zmux" }), expect.objectContaining({ label: "zmux" })],
      true,
    );
    expect(createdPanels).toHaveLength(1);
    expect(closeTabGroupsMock.mock.invocationCallOrder[0]).toBeLessThan(
      (vscode.window.createWebviewPanel as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    );
    expect(createdPanels[0]?.viewColumn).toBe(1);
    expect(createdPanels[0]?.reveal).toHaveBeenCalledWith(1, false);
    expect(executeCommandMock.mock.calls.map(([command]) => command)).toEqual([
      "workbench.action.focusFirstEditorGroup",
      "workbench.action.openEditorAtIndex1",
      "workbench.action.unpinEditor",
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.openEditorAtIndex1",
      "workbench.action.unpinEditor",
      "workbench.action.pinEditor",
    ]);

    manager.dispose();
  });

  test("should close stale zmux tabs and create a fresh panel even when the stale tab cannot be selected by index", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    const groupTabs = Array.from({ length: 10 }, (_, index) => ({
      group: { viewColumn: 1 } as { tabs?: unknown[]; viewColumn: number },
      input: new vscode.TabInputWebview(index === 9 ? "zmux.workspace" : "workbench.welcomePage"),
      isActive: index === 0,
      label: index === 9 ? "zmux" : `Welcome ${index + 1}`,
    }));
    for (const tab of groupTabs) {
      tab.group.tabs = groupTabs;
    }

    (vscode.window.tabGroups.all as unknown as unknown[]) = [
      {
        isActive: true,
        tabs: groupTabs,
        viewColumn: 1,
      } as never,
    ];

    await manager.reveal();

    expect(closeTabGroupsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ label: "zmux" })],
      true,
    );
    expect(createdPanels).toHaveLength(1);
    expect(createdPanels[0]?.viewColumn).toBe(1);
    expect(createdPanels[0]?.reveal).toHaveBeenCalledWith(1, false);
    expect(executeCommandMock.mock.calls.map(([command]) => command)).toEqual([
      "workbench.action.focusFirstEditorGroup",
      "workbench.action.pinEditor",
    ]);

    manager.dispose();
  });

  test("should attach the webview message listener before assigning html", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    nextCreatedPanelOptions = {
      onHtmlAssigned: (panel) => {
        panel.webview.messageListeners[0]?.({ type: "ready" });
      },
    };

    await manager.reveal();

    const createdPanel = createdPanels[0];

    expect(createdPanel).toBeDefined();
    expect(createdPanel?.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
    expect(createdPanel?.webview.messageListeners).toHaveLength(1);

    manager.dispose();
  });

  test("should forward close session messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      sessionId: "session-1",
      type: "closeSession",
    });

    expect(onMessage).toHaveBeenCalledWith({
      sessionId: "session-1",
      type: "closeSession",
    });

    manager.dispose();
  });

  test("should forward create session messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      type: "createSession",
    });

    expect(onMessage).toHaveBeenCalledWith({
      type: "createSession",
    });

    manager.dispose();
  });

  test("should forward acknowledge session attention messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      reason: "escape",
      sessionId: "session-2",
      type: "acknowledgeSessionAttention",
    });

    expect(onMessage).toHaveBeenCalledWith({
      reason: "escape",
      sessionId: "session-2",
      type: "acknowledgeSessionAttention",
    });

    manager.dispose();
  });

  test("should forward workspace debug log messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();
    createdPanels[0]?.webview.messageListeners[0]?.({
      details: { sessionId: "session-2" },
      event: "repro.workspace.handleT3IframeFocus.received",
      type: "workspaceDebugLog",
    });

    expect(onMessage).toHaveBeenCalledWith({
      details: { sessionId: "session-2" },
      event: "repro.workspace.handleT3IframeFocus.received",
      type: "workspaceDebugLog",
    });

    manager.dispose();
  });

  test("should forward full reload session messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      sessionId: "session-1",
      type: "fullReloadSession",
    });

    expect(onMessage).toHaveBeenCalledWith({
      sessionId: "session-1",
      type: "fullReloadSession",
    });

    manager.dispose();
  });

  test("should forward prompt rename session messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      sessionId: "session-1",
      type: "promptRenameSession",
    });

    expect(onMessage).toHaveBeenCalledWith({
      sessionId: "session-1",
      type: "promptRenameSession",
    });

    manager.dispose();
  });

  test("should forward cancel first prompt auto rename messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      sessionId: "session-1",
      type: "cancelFirstPromptAutoRename",
    });

    expect(onMessage).toHaveBeenCalledWith({
      sessionId: "session-1",
      type: "cancelFirstPromptAutoRename",
    });

    manager.dispose();
  });

  test("should forward adjust terminal font size messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      delta: -1,
      type: "adjustTerminalFontSize",
    });

    expect(onMessage).toHaveBeenCalledWith({
      delta: -1,
      type: "adjustTerminalFontSize",
    });

    manager.dispose();
  });

  test("should forward fork session messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      sessionId: "session-1",
      type: "forkSession",
    });

    expect(onMessage).toHaveBeenCalledWith({
      sessionId: "session-1",
      type: "forkSession",
    });

    manager.dispose();
  });

  test("should forward set session sleeping messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      sessionId: "session-1",
      sleeping: true,
      type: "setSessionSleeping",
    });

    expect(onMessage).toHaveBeenCalledWith({
      sessionId: "session-1",
      sleeping: true,
      type: "setSessionSleeping",
    });

    manager.dispose();
  });

  test("should forward pane reorder messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      groupId: "group-1",
      sessionIds: ["session-2", "session-1"],
      type: "syncPaneOrder",
    });

    expect(onMessage).toHaveBeenCalledWith({
      groupId: "group-1",
      sessionIds: ["session-2", "session-1"],
      type: "syncPaneOrder",
    });

    manager.dispose();
  });

  test("should forward reload workspace messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      type: "reloadWorkspacePanel",
    });

    expect(onMessage).toHaveBeenCalledWith({
      type: "reloadWorkspacePanel",
    });

    manager.dispose();
  });

  test("should forward apply codex terminal title messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      type: "applyCodexTerminalTitle",
    });

    expect(onMessage).toHaveBeenCalledWith({
      type: "applyCodexTerminalTitle",
    });

    manager.dispose();
  });

  test("should forward apply codex status line messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      type: "applyCodexStatusLine",
    });

    expect(onMessage).toHaveBeenCalledWith({
      type: "applyCodexStatusLine",
    });

    manager.dispose();
  });

  test("should keep accepting legacy session reorder messages from the workspace webview", async () => {
    const onMessage = vi.fn();
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage,
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.webview.messageListeners[0]?.({
      groupId: "group-1",
      sessionIds: ["session-2", "session-1"],
      type: "syncSessionOrder",
    });

    expect(onMessage).toHaveBeenCalledWith({
      groupId: "group-1",
      sessionIds: ["session-2", "session-1"],
      type: "syncSessionOrder",
    });

    manager.dispose();
  });

  test("should not replay one-shot autofocus requests after the initial post", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    await manager.postMessage({
      activeGroupId: "group-1",
      autoFocusRequest: {
        requestId: 3,
        sessionId: "session-1",
        source: "sidebar",
      },
      connection: {
        baseUrl: "http://127.0.0.1:8080",
        token: "token",
        workspaceId: "workspace-1",
      },
      debuggingMode: false,
      focusedSessionId: "session-1",
      layoutAppearance: {
        activePaneBorderColor: "#fff",
        paneGap: 12,
      },
      panes: [],
      terminalAppearance: {
        cursorBlink: false,
        cursorStyle: "bar",
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1,
        scrollToBottomWhenTyping: false,
      },
      t3Appearance: {
        provider: "t3code",
        zoomPercent: 100,
      },
      type: "sessionState",
      viewMode: "grid",
      visibleCount: 1,
      workspaceSnapshot: {
        activeGroupId: "group-1",
        groups: [],
        nextGroupNumber: 1,
        nextSessionDisplayId: 1,
        nextSessionNumber: 1,
      },
    });

    expect(panel.webview.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        autoFocusRequest: {
          requestId: 3,
          sessionId: "session-1",
          source: "sidebar",
        },
      }),
    );

    panel.webview.messageListeners[0]?.({ type: "ready" });

    expect(panel.webview.postMessage).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        autoFocusRequest: expect.anything(),
      }),
    );

    manager.dispose();
  });

  test("should embed the latest workspace state into newly created panel html", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    await manager.postMessage(createWorkspaceStateMessage());
    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();
    expect(panel.webview.html).toContain("window.__zmux_WORKSPACE_BOOTSTRAP__ =");
    expect(panel.webview.html).toContain('"type":"sessionState"');
    expect(panel.webview.html).toContain('"sessionId":"session-1"');
    expect(panel.webview.html).toMatch(
      /<script nonce="[^"]+">window\.__zmux_WORKSPACE_BOOTSTRAP__/,
    );

    manager.dispose();
  });

  test("should replay the latest workspace state before a buffered transient message", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    await manager.postMessage(createWorkspaceStateMessage());
    await manager.postMessage({
      sessionId: "session-1",
      terminalTitle: "Claude is working",
      type: "terminalPresentationChanged",
    });
    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();
    expect(panel.webview.html).toContain('"type":"sessionState"');

    panel.webview.postMessage.mockClear();
    panel.webview.messageListeners[0]?.({ type: "ready" });
    await Promise.resolve();

    expect(panel.webview.postMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        focusedSessionId: "session-1",
        type: "sessionState",
      }),
    );
    expect(panel.webview.postMessage).toHaveBeenNthCalledWith(2, {
      sessionId: "session-1",
      terminalTitle: "Claude is working",
      type: "terminalPresentationChanged",
    });

    manager.dispose();
  });

  test("should replay the latest workspace state before a buffered scroll request", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    await manager.postMessage(createWorkspaceStateMessage());
    await manager.postMessage({
      requestId: 7,
      sessionId: "session-1",
      type: "scrollTerminalToBottom",
    });
    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();
    expect(panel.webview.html).toContain('"type":"sessionState"');

    panel.webview.postMessage.mockClear();
    panel.webview.messageListeners[0]?.({ type: "ready" });
    await Promise.resolve();

    expect(panel.webview.postMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        focusedSessionId: "session-1",
        type: "sessionState",
      }),
    );
    expect(panel.webview.postMessage).toHaveBeenNthCalledWith(2, {
      requestId: 7,
      sessionId: "session-1",
      type: "scrollTerminalToBottom",
    });

    manager.dispose();
  });

  test("should set and clear the workspace focus context as panel focus changes", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    await manager.reveal();

    const panel = createdPanels[0];
    expect(panel).toBeDefined();

    panel.active = true;
    panel.visible = true;
    emitViewStateChange(panel);
    await Promise.resolve();

    expect(executeCommandMock).toHaveBeenCalledWith(
      "setContext",
      "zmux.workspacePanelFocus",
      true,
    );

    panel.active = false;
    emitViewStateChange(panel);
    await Promise.resolve();

    expect(executeCommandMock).toHaveBeenCalledWith(
      "setContext",
      "zmux.workspacePanelFocus",
      false,
    );

    manager.dispose();
  });

  test("should detect when the zmux webview is the active editor tab", () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });

    expect(
      manager.isActiveEditorTab({
        activeTab: {
          input: new vscode.TabInputWebview("zmux.workspace"),
        },
        viewColumn: 1,
      } as never),
    ).toBe(true);

    expect(
      manager.isActiveEditorTab({
        activeTab: {
          input: new vscode.TabInputWebview("workbench.welcomePage"),
        },
        viewColumn: 1,
      } as never),
    ).toBe(false);

    expect(
      manager.isActiveEditorTab({
        activeTab: {
          input: new vscode.TabInputWebview("zmux.workspace"),
        },
        viewColumn: undefined,
      } as never),
    ).toBe(false);

    manager.dispose();
  });

  test("should replace an existing zmux editor tab after a hidden restored panel is disposed", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    const restoredPanel = createMockPanel({ active: false, viewColumn: 2, visible: false });
    await registeredSerializer?.deserializeWebviewPanel(restoredPanel);

    (vscode.window.tabGroups.all as unknown as unknown[]) = [
      {
        tabs: [
          {
            group: { tabs: [] as unknown[], viewColumn: 2 },
            input: new vscode.TabInputWebview("workbench.welcomePage"),
            isActive: false,
            label: "Welcome",
          },
          {
            group: { tabs: [] as unknown[], viewColumn: 2 },
            input: new vscode.TabInputWebview("zmux.workspace"),
            isActive: false,
            label: "zmux",
          },
        ],
        viewColumn: 2,
      },
    ];
    const group = (
      vscode.window.tabGroups.all as unknown as Array<{
        tabs: Array<{ group: { tabs: unknown[]; viewColumn: number } }>;
      }>
    )[0];
    for (const tab of group.tabs) {
      tab.group = group as never;
    }

    await manager.reveal();

    expect(closeTabGroupsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ label: "zmux" })],
      true,
    );
    expect(createdPanels).toHaveLength(1);
    expect(createdPanels[0]?.viewColumn).toBe(2);
    expect(createdPanels[0]?.reveal).toHaveBeenCalledWith(2, false);
    expect(executeCommandMock.mock.calls.map(([command]) => command)).toEqual([
      "workbench.action.focusSecondEditorGroup",
      "workbench.action.openEditorAtIndex2",
      "workbench.action.unpinEditor",
      "workbench.action.pinEditor",
    ]);

    manager.dispose();
  });
});

function createMockContext() {
  return {
    extensionUri: { path: "/extension" },
  } as never;
}

function createMockPanel({
  active = false,
  onHtmlAssigned,
  viewColumn,
  visible = false,
}: MockPanelOptions = {}): MockWebviewPanel {
  const disposables: Array<() => void> = [];
  const viewStateListeners: Array<(event: { webviewPanel: MockWebviewPanel }) => void> = [];
  let html = "";
  const panel: MockWebviewPanel = {
    active,
    dispose: vi.fn(() => {
      for (const dispose of disposables) {
        dispose();
      }
    }),
    onDidChangeViewState: vi.fn((listener: (event: { webviewPanel: MockWebviewPanel }) => void) => {
      viewStateListeners.push(listener);
      return createDisposable();
    }),
    onDidDispose: vi.fn((listener: () => void) => {
      disposables.push(listener);
      return createDisposable();
    }),
    reveal: vi.fn(),
    title: "",
    viewColumn,
    visible,
    webview: {
      asWebviewUri: vi.fn((value: unknown) => value),
      html: "",
      messageListeners: [],
      onDidReceiveMessage: vi.fn((listener: (message: unknown) => void) => {
        panel.webview.messageListeners.push(listener);
        return createDisposable();
      }),
      postMessage: vi.fn(async () => true),
    },
  };

  Object.defineProperty(panel, "__emitViewStateChange", {
    value: () => {
      for (const listener of viewStateListeners) {
        listener({ webviewPanel: panel });
      }
    },
  });
  Object.defineProperty(panel.webview, "html", {
    get: () => html,
    set: (value: string) => {
      html = value;
      onHtmlAssigned?.(panel);
    },
  });

  return panel;
}

function createDisposable(): MockDisposable {
  return {
    dispose: vi.fn(),
  };
}

function emitViewStateChange(panel: MockWebviewPanel): void {
  (panel as MockWebviewPanel & { __emitViewStateChange?: () => void }).__emitViewStateChange?.();
}

function createWorkspaceStateMessage() {
  return {
    activeGroupId: "group-1",
    connection: {
      baseUrl: "http://127.0.0.1:8080",
      token: "token",
      workspaceId: "workspace-1",
    },
    debuggingMode: false,
    focusedSessionId: "session-1",
    layoutAppearance: {
      activePaneBorderColor: "#fff",
      paneGap: 12,
    },
    panes: [
      {
        isVisible: true,
        kind: "terminal" as const,
        renderNonce: 0,
        sessionId: "session-1",
        sessionRecord: {
          alias: "Session 1",
          column: 0,
          createdAt: new Date(0).toISOString(),
          displayId: "01",
          kind: "terminal" as const,
          row: 0,
          sessionId: "session-1",
          slotIndex: 0,
          terminalEngine: "ghostty-native" as const,
          title: "Session 1",
        },
      },
    ],
    terminalAppearance: {
      cursorBlink: false,
      cursorStyle: "bar" as const,
      fontFamily: "monospace",
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1,
      scrollToBottomWhenTyping: false,
    },
    t3Appearance: {
      provider: "t3code",
      zoomPercent: 100,
    },
    type: "sessionState" as const,
    viewMode: "grid" as const,
    visibleCount: 1 as const,
    workspaceSnapshot: {
      activeGroupId: "group-1",
      groups: [],
      nextGroupNumber: 1,
      nextSessionDisplayId: 1,
      nextSessionNumber: 1,
    },
  };
}
