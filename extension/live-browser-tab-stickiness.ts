import * as vscode from "vscode";
import type { LiveBrowserTabEntry } from "./live-browser-tabs";

export type StickyLiveBrowserTabState = {
  entry: LiveBrowserTabEntry;
  lastSeenAt: number;
};

export function reconcileStickyLiveBrowserTabs({
  currentEntries,
  now,
  previousStickyEntriesByTab,
  stickyDurationMs,
  tabGroups = vscode.window.tabGroups.all,
}: {
  currentEntries: readonly LiveBrowserTabEntry[];
  now: number;
  previousStickyEntriesByTab: ReadonlyMap<vscode.Tab, StickyLiveBrowserTabState>;
  stickyDurationMs: number;
  tabGroups?: readonly vscode.TabGroup[];
}): {
  entries: LiveBrowserTabEntry[];
  stickyEntriesByTab: Map<vscode.Tab, StickyLiveBrowserTabState>;
} {
  const entries = [...currentEntries];
  const stickyEntriesByTab = new Map<vscode.Tab, StickyLiveBrowserTabState>();
  const currentTabs = new Set(currentEntries.map((entry) => entry.tab));
  const liveTabs = new Set(tabGroups.flatMap((group) => group.tabs));

  for (const entry of currentEntries) {
    stickyEntriesByTab.set(entry.tab, {
      entry,
      lastSeenAt: now,
    });
  }

  for (const [tab, stickyEntry] of previousStickyEntriesByTab) {
    if (
      currentTabs.has(tab) ||
      !liveTabs.has(tab) ||
      now - stickyEntry.lastSeenAt > stickyDurationMs
    ) {
      continue;
    }

    const refreshedEntry = refreshStickyLiveBrowserTabEntry(stickyEntry.entry, tab);
    if (!refreshedEntry) {
      continue;
    }

    entries.push(refreshedEntry);
    stickyEntriesByTab.set(tab, {
      entry: refreshedEntry,
      lastSeenAt: stickyEntry.lastSeenAt,
    });
  }

  return {
    entries,
    stickyEntriesByTab,
  };
}

function refreshStickyLiveBrowserTabEntry(
  entry: LiveBrowserTabEntry,
  tab: vscode.Tab,
): LiveBrowserTabEntry | undefined {
  const viewColumn = tab.group.viewColumn;
  if (viewColumn === undefined) {
    return undefined;
  }

  return {
    ...entry,
    isActive: tab.group.isActive && tab.isActive,
    tab,
    viewColumn,
  };
}
