import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { createSessionRecord } from "../shared/session-grid-contract";
import { BrowserSessionManager } from "./browser-session-manager";

const testState = vi.hoisted(() => ({
  changeConfigurationListeners: [] as Array<
    (event: { affectsConfiguration: (section: string) => boolean }) => void
  >,
  changeTabGroupListeners: [] as Array<() => void>,
  changeTabsListeners: [] as Array<() => void>,
  closeTab: vi.fn(async () => undefined),
  configValues: new Map<string, unknown>(),
  executeCommand: vi.fn(async () => undefined),
  TabInputCustomClass: class MockTabInputCustom {
    public constructor(public readonly uri: { toString: (skipEncoding?: boolean) => string }) {}
  },
  TabInputTextClass: class MockTabInputText {
    public constructor(public readonly uri: { toString: (skipEncoding?: boolean) => string }) {}
  },
  TabInputWebviewClass: class MockTabInputWebview {
    public constructor(public readonly viewType: string) {}
  },
  tabGroupsAll: [] as Array<{
    isActive: boolean;
    tabs: Array<{
      group: unknown;
      input: unknown;
      isActive: boolean;
      label: string;
    }>;
    viewColumn: number;
  }>,
}));

vi.mock("vscode", () => ({
  TabInputCustom: testState.TabInputCustomClass,
  TabInputText: testState.TabInputTextClass,
  TabInputWebview: testState.TabInputWebviewClass,
  Uri: {
    parse: (value: string) => ({
      toString: () => value,
    }),
  },
  ViewColumn: {
    Nine: 9,
    One: 1,
    Two: 2,
  },
  commands: {
    executeCommand: testState.executeCommand,
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: (key: string, defaultValue?: unknown) =>
        testState.configValues.has(key) ? testState.configValues.get(key) : defaultValue,
    })),
    onDidChangeConfiguration: vi.fn(
      (listener: (event: { affectsConfiguration: (section: string) => boolean }) => void) => {
        testState.changeConfigurationListeners.push(listener);
        return { dispose: vi.fn() };
      },
    ),
  },
  window: {
    tabGroups: {
      close: testState.closeTab,
      get all() {
        return testState.tabGroupsAll;
      },
      onDidChangeTabGroups: vi.fn((listener: () => void) => {
        testState.changeTabGroupListeners.push(listener);
        return { dispose: vi.fn() };
      }),
      onDidChangeTabs: vi.fn((listener: () => void) => {
        testState.changeTabsListeners.push(listener);
        return { dispose: vi.fn() };
      }),
    },
  },
}));

describe("BrowserSessionManager", () => {
  beforeEach(() => {
    testState.changeConfigurationListeners.length = 0;
    testState.changeTabGroupListeners.length = 0;
    testState.changeTabsListeners.length = 0;
    testState.closeTab.mockReset();
    testState.closeTab.mockResolvedValue(undefined);
    testState.configValues.clear();
    testState.executeCommand.mockReset();
    testState.executeCommand.mockResolvedValue(undefined);
    testState.tabGroupsAll = [];
  });

  test("should recover a stale integrated browser tab from the same editor group", () => {
    const onDidChangeSessions = vi.fn();
    const manager = new BrowserSessionManager({
      onDidChangeSessions,
      onDidFocusSession: vi.fn(async () => {}),
    });
    const staleTab = createBrowserPreviewTab(1, false);
    const liveTab = createBrowserPreviewTab(1, true);
    testState.tabGroupsAll = [liveTab.group as (typeof testState.tabGroupsAll)[number]];
    (manager as any).managedTabsBySessionId.set("session-1", {
      renderKey: "Vale|https://example.com",
      sessionId: "session-1",
      tab: staleTab.tab,
      url: "https://example.com",
      viewColumn: 1,
    });

    fireTabChange();

    expect(manager.hasLiveTab("session-1")).toBe(true);
    expect((manager as any).managedTabsBySessionId.get("session-1")?.tab).toBe(liveTab.tab);
    expect(onDidChangeSessions).toHaveBeenCalledTimes(1);
  });

  test("should recover a stale browser tab from a single-tab group even with an opaque input", () => {
    const manager = new BrowserSessionManager({
      onDidChangeSessions: vi.fn(async () => {}),
      onDidFocusSession: vi.fn(async () => {}),
    });
    const staleTab = createBrowserPreviewTab(1, false);
    const liveTab = createOpaqueTab(1, true);
    testState.tabGroupsAll = [liveTab.group as (typeof testState.tabGroupsAll)[number]];
    (manager as any).managedTabsBySessionId.set("session-1", {
      renderKey: "Vale|https://example.com",
      sessionId: "session-1",
      tab: staleTab.tab,
      url: "https://example.com",
      viewColumn: 1,
    });

    fireTabChange();

    expect(manager.hasLiveTab("session-1")).toBe(true);
    expect((manager as any).managedTabsBySessionId.get("session-1")?.tab).toBe(liveTab.tab);
  });

  test("should reuse an existing integrated browser tab instead of opening a duplicate", async () => {
    const manager = new BrowserSessionManager({
      onDidChangeSessions: vi.fn(async () => {}),
      onDidFocusSession: vi.fn(async () => {}),
    });
    const session = createSessionRecord(1, 0, {
      browser: {
        url: "https://example.com/docs",
      },
      kind: "browser",
      title: "Docs",
    });
    const liveTab = createBrowserPreviewTab(1, true);
    testState.tabGroupsAll = [liveTab.group as (typeof testState.tabGroupsAll)[number]];

    await manager.revealStoredSession(
      session,
      {
        focusedSessionId: session.sessionId,
        fullscreenRestoreVisibleCount: undefined,
        sessions: [session],
        viewMode: "grid",
        visibleCount: 1,
        visibleSessionIds: [session.sessionId],
      },
      false,
    );

    expect(
      testState.executeCommand.mock.calls.some(([command]) => command === "simpleBrowser.api.open"),
    ).toBe(false);
    expect((manager as any).managedTabsBySessionId.get(session.sessionId)?.tab).toBe(liveTab.tab);
  });

  test("should preserve managed browser tabs when the session becomes temporarily hidden", async () => {
    const manager = new BrowserSessionManager({
      onDidChangeSessions: vi.fn(async () => {}),
      onDidFocusSession: vi.fn(async () => {}),
    });
    const session = createSessionRecord(1, 0, {
      browser: {
        url: "https://example.com/docs",
      },
      kind: "browser",
      title: "Docs",
    });
    const liveTab = createBrowserPreviewTab(1, true);
    testState.tabGroupsAll = [liveTab.group as (typeof testState.tabGroupsAll)[number]];
    (manager as any).managedTabsBySessionId.set(session.sessionId, {
      renderKey: "Vale|https://example.com/docs",
      sessionId: session.sessionId,
      tab: liveTab.tab,
      url: "https://example.com/docs",
      viewColumn: 1,
    });

    await manager.reconcileVisibleSessions(
      {
        focusedSessionId: undefined,
        fullscreenRestoreVisibleCount: undefined,
        sessions: [session],
        viewMode: "grid",
        visibleCount: 1,
        visibleSessionIds: [],
      },
      true,
    );

    expect((manager as any).managedTabsBySessionId.has(session.sessionId)).toBe(true);
    expect(testState.closeTab).not.toHaveBeenCalled();
  });
});

function createBrowserPreviewTab(viewColumn: number, isActive: boolean) {
  const tab = {
    group: undefined as unknown,
    input: new testState.TabInputWebviewClass("browserPreview"),
    isActive,
    label: "Docs",
  };
  const group = {
    isActive,
    tabs: [tab],
    viewColumn,
  };
  tab.group = group;
  return { group, tab };
}

function createOpaqueTab(viewColumn: number, isActive: boolean) {
  const tab = {
    group: undefined as unknown,
    input: {},
    isActive,
    label: "Docs",
  };
  const group = {
    isActive,
    tabs: [tab],
    viewColumn,
  };
  tab.group = group;
  return { group, tab };
}

function fireTabChange(): void {
  for (const listener of testState.changeTabsListeners) {
    listener();
  }
  for (const listener of testState.changeTabGroupListeners) {
    listener();
  }
}
