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
      all: [],
      close: closeTabGroupsMock,
    },
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(() => false),
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
    nextCreatedPanelOptions = undefined;
    (vscode.window.tabGroups.all as unknown as unknown[]) = [];
  });

  test("should close restored VSmux workspace tabs on startup", async () => {
    const closedCount = await closeWorkspacePanelTabs([
      {
        isActive: true,
        tabs: [
          {
            group: { viewColumn: 1 },
            input: new vscode.TabInputWebview("vsmux.workspace"),
            isActive: true,
            label: "VSmux",
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
            input: new vscode.TabInputWebview("vsmux.workspace"),
            isActive: false,
            label: "VSmux",
          },
        ],
        viewColumn: 2,
      } as never,
    ]);

    expect(closedCount).toBe(2);
    expect(closeTabGroupsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ label: "VSmux" }), expect.objectContaining({ label: "VSmux" })],
      true,
    );
  });

  test("should skip tab closing when no restored VSmux workspace tabs exist", async () => {
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

  test("should dispose restored workspace panels instead of adopting them", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    const restoredPanel = createMockPanel({ active: true, viewColumn: 2, visible: true });

    await registeredSerializer?.deserializeWebviewPanel(restoredPanel);
    await manager.reveal();

    expect(restoredPanel.dispose).toHaveBeenCalledTimes(1);
    expect(createdPanels).toHaveLength(1);

    manager.dispose();
  });

  test("should create a fresh workspace panel after discarding a restored one", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    const restoredPanel = createMockPanel({ viewColumn: 3 });

    await registeredSerializer?.deserializeWebviewPanel(restoredPanel);
    await manager.reveal();

    expect(restoredPanel.dispose).toHaveBeenCalledTimes(1);
    expect(createdPanels).toHaveLength(1);

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
        cursorBlink: true,
        cursorStyle: "bar",
        fontFamily: "monospace",
        fontSize: 12,
        letterSpacing: 0,
        lineHeight: 1,
        scrollToBottomWhenTyping: false,
        xtermFrontendScrollback: 75_000,
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
    expect(panel.webview.html).toContain("window.__VSMUX_WORKSPACE_BOOTSTRAP__ =");
    expect(panel.webview.html).toContain('"type":"sessionState"');
    expect(panel.webview.html).toContain('"sessionId":"session-1"');

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
      "vsmux.workspacePanelFocus",
      true,
    );

    panel.active = false;
    emitViewStateChange(panel);
    await Promise.resolve();

    expect(executeCommandMock).toHaveBeenCalledWith(
      "setContext",
      "vsmux.workspacePanelFocus",
      false,
    );

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
          terminalEngine: "xterm" as const,
          title: "Session 1",
        },
      },
    ],
    terminalAppearance: {
      cursorBlink: true,
      cursorStyle: "bar" as const,
      fontFamily: "monospace",
      fontSize: 12,
      letterSpacing: 0,
      lineHeight: 1,
      scrollToBottomWhenTyping: false,
      xtermFrontendScrollback: 75_000,
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
