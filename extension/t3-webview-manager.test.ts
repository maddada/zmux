import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import type { T3SessionRecord } from "../shared/session-grid-contract";
import { T3WebviewManager } from "./t3-webview-manager";

const testState = vi.hoisted(() => {
  const createPanel = (viewColumn: number) => {
    const disposeListeners: Array<() => void> = [];
    const viewStateListeners: Array<(event: { webviewPanel: { active: boolean } }) => void> = [];
    const messageListeners: Array<(message: unknown) => void> = [];
    const panel = {
      dispose: vi.fn(() => {
        for (const listener of disposeListeners) {
          listener();
        }
      }),
      onDidChangeViewState: vi.fn(
        (listener: (event: { webviewPanel: { active: boolean } }) => void) => {
          viewStateListeners.push(listener);
          return { dispose: vi.fn() };
        },
      ),
      onDidDispose: vi.fn((listener: () => void) => {
        disposeListeners.push(listener);
        return { dispose: vi.fn() };
      }),
      reveal: vi.fn(),
      title: "",
      viewColumn,
      visible: true,
      webview: {
        asWebviewUri: vi.fn((value: { fsPath: string }) => ({ toString: () => value.fsPath })),
        html: "",
        onDidReceiveMessage: vi.fn((listener: (message: unknown) => void) => {
          messageListeners.push(listener);
          return { dispose: vi.fn() };
        }),
        postMessage: vi.fn(async () => undefined),
      },
      __emitMessage(message: unknown) {
        for (const listener of messageListeners) {
          listener(message);
        }
      },
      __emitActive() {
        for (const listener of viewStateListeners) {
          listener({ webviewPanel: { active: true } });
        }
      },
    };
    return panel;
  };

  return {
    closeTab: vi.fn(async () => undefined),
    createPanel,
    createdPanels: [] as Array<ReturnType<typeof createPanel>>,
    createWebviewPanel: vi.fn((_: string, __: string, column: { viewColumn: number } | number) => {
      const viewColumn = typeof column === "number" ? column : column.viewColumn;
      const panel = createPanel(viewColumn);
      testState.createdPanels.push(panel);
      return panel;
    }),
    focusEditorGroupByIndex: vi.fn(async () => true),
    getActiveEditorGroupViewColumn: vi.fn(() => 2),
    tabGroupsAll: [] as Array<{
      tabs: Array<{ input: unknown; label: string }>;
      viewColumn?: number;
    }>,
    TabInputWebviewClass: class MockTabInputWebview {
      public constructor(public readonly viewType: string) {}
    },
  };
});

vi.mock("vscode", () => ({
  TabInputWebview: testState.TabInputWebviewClass,
  Uri: {
    joinPath: (...parts: Array<{ fsPath?: string } | string>) => ({
      fsPath: parts
        .map((part) => (typeof part === "string" ? part : (part.fsPath ?? "")))
        .join("/"),
    }),
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  window: {
    activeTerminal: undefined,
    createWebviewPanel: testState.createWebviewPanel,
    tabGroups: {
      activeTabGroup: {
        viewColumn: 1,
      },
      close: testState.closeTab,
      get all() {
        return testState.tabGroupsAll;
      },
    },
    terminals: [],
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: (_key: string, defaultValue?: unknown) => defaultValue,
    })),
  },
}));

vi.mock("./terminal-workspace-helpers", () => ({
  focusEditorGroupByIndex: testState.focusEditorGroupByIndex,
  getDefaultWorkspaceCwd: () => "/workspace",
  getActiveEditorGroupViewColumn: testState.getActiveEditorGroupViewColumn,
  getViewColumn: (index: number) => index + 1,
}));

describe("T3WebviewManager", () => {
  beforeEach(() => {
    testState.closeTab.mockClear();
    testState.createdPanels.length = 0;
    testState.createWebviewPanel.mockClear();
    testState.focusEditorGroupByIndex.mockClear();
    testState.getActiveEditorGroupViewColumn.mockReset();
    testState.getActiveEditorGroupViewColumn.mockReturnValue(2);
    testState.tabGroupsAll = [];
  });

  test("should sync panels to tracked sessions", () => {
    const manager = new T3WebviewManager({
      context: { extensionUri: { fsPath: "/extension" } } as never,
      onDidFocusSession: vi.fn(async () => {}),
    });
    const stalePanel = testState.createPanel(1);
    (manager as any).panelsBySessionId.set("session-old", {
      panel: stalePanel,
      pendingComposerFocus: false,
      ready: true,
      readyWaiters: [],
      renderKey: "old",
      sessionId: "session-old",
    });

    manager.syncSessions([createT3Session("session-new", "001", "Alpha")]);

    expect(stalePanel.dispose).toHaveBeenCalledTimes(1);
    expect((manager as any).sessionRecordBySessionId.has("session-new")).toBe(true);
  });

  test("should create parked and visible panels in deterministic columns", async () => {
    const manager = new T3WebviewManager({
      context: { extensionUri: { fsPath: "/extension" } } as never,
      onDidFocusSession: vi.fn(async () => {}),
    });
    vi.spyOn(manager as never, "createPanelHtml").mockResolvedValue("<html></html>" as never);
    const parkedSession = createT3Session("session-1", "001", "Parked");
    const visibleSession = createT3Session("session-2", "002", "Visible");
    manager.syncSessions([parkedSession, visibleSession]);

    await manager.reconcileVisibleSessions(
      {
        focusedSessionId: visibleSession.sessionId,
        fullscreenRestoreVisibleCount: undefined,
        sessions: [parkedSession, visibleSession],
        viewMode: "grid",
        visibleCount: 2,
        visibleSessionIds: [visibleSession.sessionId],
      },
      false,
    );

    expect(testState.createWebviewPanel).toHaveBeenCalledTimes(2);
    expect(testState.createdPanels[0]?.viewColumn).toBe(1);
    expect(testState.createdPanels[1]?.viewColumn).toBe(1);
    expect(
      testState.createdPanels.some((panel) => {
        return panel.reveal.mock.calls.some(([viewColumn, preserveFocus]) => {
          return viewColumn === 1 && preserveFocus === false;
        });
      }),
    ).toBe(true);
  });

  test("should keep a hidden panel in its current group", async () => {
    const manager = new T3WebviewManager({
      context: { extensionUri: { fsPath: "/extension" } } as never,
      onDidFocusSession: vi.fn(async () => {}),
    });
    vi.spyOn(manager as never, "createPanelHtml").mockResolvedValue("<html></html>" as never);
    const visibleSession = createT3Session("session-1", "001", "Visible");
    const hiddenSession = createT3Session("session-2", "002", "Hidden");
    const hiddenPanel = testState.createPanel(2);
    hiddenPanel.title = "[002] T3: Hidden";
    testState.tabGroupsAll = [
      {
        tabs: [
          {
            input: new testState.TabInputWebviewClass("VSmux.t3Session"),
            label: "[002] T3: Hidden",
          },
        ],
        viewColumn: 2,
      },
    ];
    (manager as any).panelsBySessionId.set(hiddenSession.sessionId, {
      panel: hiddenPanel,
      pendingComposerFocus: false,
      ready: true,
      readyWaiters: [],
      renderKey: "Hidden|project-1|http://127.0.0.1:3773|thread-session-2|/workspace",
      sessionId: hiddenSession.sessionId,
    });

    manager.syncSessions([visibleSession, hiddenSession]);

    await manager.reconcileVisibleSessions(
      {
        focusedSessionId: visibleSession.sessionId,
        fullscreenRestoreVisibleCount: undefined,
        sessions: [visibleSession, hiddenSession],
        viewMode: "horizontal",
        visibleCount: 1,
        visibleSessionIds: [visibleSession.sessionId],
      },
      false,
    );

    expect(hiddenPanel.reveal).not.toHaveBeenCalled();
    expect((manager as any).panelsBySessionId.get(hiddenSession.sessionId)?.panel).toBe(
      hiddenPanel,
    );
  });

  test("should reuse a hidden panel already in the target group even if observed lookup misses it", async () => {
    const manager = new T3WebviewManager({
      context: { extensionUri: { fsPath: "/extension" } } as never,
      onDidFocusSession: vi.fn(async () => {}),
    });
    vi.spyOn(manager as never, "createPanelHtml").mockResolvedValue("<html></html>" as never);
    const visibleSession = createT3Session("session-1", "001", "Visible");
    const hiddenSession = createT3Session("session-2", "002", "Hidden");
    const hiddenPanel = testState.createPanel(1);
    hiddenPanel.title = "[002] T3: Hidden";
    (manager as any).panelsBySessionId.set(hiddenSession.sessionId, {
      panel: hiddenPanel,
      pendingComposerFocus: false,
      ready: true,
      readyWaiters: [],
      renderKey: "Hidden|project-1|http://127.0.0.1:3773|thread-session-2|/workspace",
      sessionId: hiddenSession.sessionId,
    });

    manager.syncSessions([visibleSession, hiddenSession]);

    await manager.reconcileVisibleSessions(
      {
        focusedSessionId: visibleSession.sessionId,
        fullscreenRestoreVisibleCount: undefined,
        sessions: [visibleSession, hiddenSession],
        viewMode: "horizontal",
        visibleCount: 1,
        visibleSessionIds: [visibleSession.sessionId],
      },
      false,
    );

    expect(hiddenPanel.dispose).not.toHaveBeenCalled();
    expect(testState.createWebviewPanel).toHaveBeenCalledTimes(1);
    expect((manager as any).panelsBySessionId.get(hiddenSession.sessionId)?.panel).toBe(
      hiddenPanel,
    );
  });

  test("should queue composer focus until the embedded app reports ready", async () => {
    const manager = new T3WebviewManager({
      context: { extensionUri: { fsPath: "/extension" } } as never,
      onDidFocusSession: vi.fn(async () => {}),
    });
    const panel = testState.createPanel(2);
    (manager as any).panelsBySessionId.set("session-1", {
      panel,
      pendingComposerFocus: false,
      ready: false,
      readyWaiters: [],
      renderKey: "render",
      sessionId: "session-1",
    });

    manager.focusComposer("session-1");
    expect((manager as any).panelsBySessionId.get("session-1")?.pendingComposerFocus).toBe(true);

    (manager as any).panelsBySessionId.get("session-1").ready = true;
    (manager as any).panelsBySessionId.get("session-1").pendingComposerFocus = true;
    (manager as any).requestComposerFocus((manager as any).panelsBySessionId.get("session-1"));

    expect(panel.reveal).toHaveBeenCalledWith(2, false);
    expect(panel.webview.postMessage).toHaveBeenCalledWith({ type: "focusComposer" });
  });

  test("should resolve waiters when a session becomes ready", async () => {
    const manager = new T3WebviewManager({
      context: { extensionUri: { fsPath: "/extension" } } as never,
      onDidFocusSession: vi.fn(async () => {}),
    });
    const panel = testState.createPanel(2);
    (manager as any).panelsBySessionId.set("session-1", {
      panel,
      pendingComposerFocus: false,
      ready: false,
      readyWaiters: [],
      renderKey: "render",
      sessionId: "session-1",
    });

    const waitPromise = manager.waitForSessionReady("session-1", 5_000);
    for (const waiter of (manager as any).panelsBySessionId
      .get("session-1")
      .readyWaiters.splice(0)) {
      waiter();
    }

    await waitPromise;
  });
});

function createT3Session(sessionId: string, displayId: string, alias: string): T3SessionRecord {
  return {
    alias,
    column: 0,
    createdAt: new Date().toISOString(),
    displayId,
    kind: "t3",
    row: 0,
    sessionId,
    slotIndex: 0,
    t3: {
      projectId: "project-1",
      serverOrigin: "http://127.0.0.1:3773",
      threadId: `thread-${sessionId}`,
      workspaceRoot: "/workspace",
    },
    title: alias,
  };
}
