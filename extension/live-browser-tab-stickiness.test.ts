import { describe, expect, test, vi } from "vite-plus/test";
import type { LiveBrowserTabEntry } from "./live-browser-tabs";
import {
  reconcileStickyLiveBrowserTabs,
  type StickyLiveBrowserTabState,
} from "./live-browser-tab-stickiness";

vi.mock("vscode", () => ({
  window: {
    tabGroups: {
      all: [],
    },
  },
  workspace: {
    workspaceFolders: undefined,
  },
}));

describe("reconcileStickyLiveBrowserTabs", () => {
  test("should keep a recently seen browser tab while detection briefly drops it", () => {
    const group = createTabGroup(2, true);
    const tab = createTab("Docs", true, group);
    const previousStickyEntriesByTab = new Map<unknown, StickyLiveBrowserTabState>([
      [
        tab,
        {
          entry: createBrowserTabEntry({
            isActive: true,
            label: "Docs",
            sessionId: "browser-tab:docs",
            tab,
            viewColumn: 2,
          }),
          lastSeenAt: 1_000,
        },
      ],
    ]);

    const result = reconcileStickyLiveBrowserTabs({
      currentEntries: [],
      now: 1_800,
      previousStickyEntriesByTab: previousStickyEntriesByTab as ReadonlyMap<
        never,
        StickyLiveBrowserTabState
      >,
      stickyDurationMs: 1_500,
      tabGroups: [group as never],
    });

    expect(result.entries).toEqual([
      expect.objectContaining({
        isActive: true,
        label: "Docs",
        sessionId: "browser-tab:docs",
        tab,
        viewColumn: 2,
      }),
    ]);
    expect(result.stickyEntriesByTab.get(tab as never)).toEqual(
      expect.objectContaining({
        entry: expect.objectContaining({
          sessionId: "browser-tab:docs",
        }),
        lastSeenAt: 1_000,
      }),
    );
  });

  test("should drop a sticky browser tab once the grace window expires", () => {
    const group = createTabGroup(1, false);
    const tab = createTab("Docs", false, group);
    const previousStickyEntriesByTab = new Map<unknown, StickyLiveBrowserTabState>([
      [
        tab,
        {
          entry: createBrowserTabEntry({
            label: "Docs",
            sessionId: "browser-tab:docs",
            tab,
          }),
          lastSeenAt: 1_000,
        },
      ],
    ]);

    const result = reconcileStickyLiveBrowserTabs({
      currentEntries: [],
      now: 2_600,
      previousStickyEntriesByTab: previousStickyEntriesByTab as ReadonlyMap<
        never,
        StickyLiveBrowserTabState
      >,
      stickyDurationMs: 1_500,
      tabGroups: [group as never],
    });

    expect(result.entries).toEqual([]);
    expect(result.stickyEntriesByTab.size).toBe(0);
  });
});

function createBrowserTabEntry(
  overrides: Partial<LiveBrowserTabEntry> & Pick<LiveBrowserTabEntry, "sessionId" | "tab">,
): LiveBrowserTabEntry {
  return {
    inputKind: "webview",
    isActive: false,
    label: "Browser",
    sessionId: overrides.sessionId,
    tab: overrides.tab,
    viewColumn: 1,
    ...overrides,
  };
}

function createTabGroup(viewColumn: number, isActive: boolean) {
  return {
    isActive,
    tabs: [] as unknown[],
    viewColumn,
  };
}

function createTab(label: string, isActive: boolean, group: ReturnType<typeof createTabGroup>) {
  const tab = {
    group,
    input: undefined,
    isActive,
    label,
  };
  group.tabs.push(tab);
  return tab;
}
