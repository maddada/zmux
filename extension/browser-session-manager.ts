import * as vscode from "vscode";
import {
  isBrowserSession,
  type BrowserSessionRecord,
  type SessionRecord,
} from "../shared/session-grid-contract";
import {
  focusEditorGroupByIndex,
  getActiveEditorGroupViewColumn,
  moveActiveEditorToGroup,
} from "./terminal-workspace-environment";
import { captureWorkbenchState } from "./session-layout-trace";
import { createWorkspaceTrace } from "./runtime-trace";
import {
  getBrowserTabInputKind,
  getBrowserTabUrl,
  getRenderKey,
  isBrowserLikeTab,
  normalizeUrl,
} from "./browser-session-manager/helpers";

type BrowserSessionManagerOptions = {
  onDidChangeSessions?: () => Promise<void> | void;
  onDidFocusSession: (sessionId: string) => Promise<void>;
};

type ManagedBrowserTab = {
  lastKnownLabel?: string;
  renderKey: string;
  sessionId: string;
  tab: vscode.Tab | undefined;
  url: string;
};

const SIMPLE_BROWSER_OPEN_COMMAND = "simpleBrowser.api.open";
const TRACE_FILE_NAME = "browser-session-reconcile.log";

export class BrowserSessionManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly managedTabsBySessionId = new Map<string, ManagedBrowserTab>();
  private readonly sessionRecordBySessionId = new Map<string, BrowserSessionRecord>();
  private readonly trace = createWorkspaceTrace(TRACE_FILE_NAME);
  private suppressFocusEvents = 0;

  public constructor(private readonly options: BrowserSessionManagerOptions) {
    this.disposables.push(
      vscode.window.tabGroups.onDidChangeTabs(() => {
        void this.handleTabChange();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        void this.handleTabChange();
      }),
    );
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
    this.managedTabsBySessionId.clear();
    this.sessionRecordBySessionId.clear();
  }

  public async resetDebugTrace(): Promise<void> {
    await this.trace.reset();
  }

  public syncSessions(sessionRecords: readonly SessionRecord[]): void {
    const nextRecords = new Map(
      sessionRecords
        .filter(isBrowserSession)
        .map((sessionRecord) => [sessionRecord.sessionId, sessionRecord]),
    );
    this.sessionRecordBySessionId.clear();
    for (const [sessionId, sessionRecord] of nextRecords) {
      this.sessionRecordBySessionId.set(sessionId, sessionRecord);
    }

    for (const sessionId of this.managedTabsBySessionId.keys()) {
      if (nextRecords.has(sessionId)) {
        continue;
      }

      void this.disposeSession(sessionId);
    }

    void this.logState("SYNC", "sessions", {
      trackedSessionIds: [...this.sessionRecordBySessionId.keys()],
    });
  }

  public async openSession(sessionRecord: BrowserSessionRecord): Promise<void> {
    this.syncSessions([
      ...Array.from(this.sessionRecordBySessionId.values()).filter(
        (existingSessionRecord) => existingSessionRecord.sessionId !== sessionRecord.sessionId,
      ),
      sessionRecord,
    ]);
    const renderKey = getRenderKey(sessionRecord);
    const managedTab =
      this.managedTabsBySessionId.get(sessionRecord.sessionId) ??
      this.createManagedTab(sessionRecord.sessionId, renderKey, sessionRecord.browser.url);
    managedTab.renderKey = renderKey;
    managedTab.url = sessionRecord.browser.url;

    let liveTab = this.resolveLiveTab(sessionRecord.sessionId);
    if (!liveTab) {
      liveTab = await this.openBrowserTab(sessionRecord);
    } else {
      await this.revealTab(liveTab, true);
    }

    managedTab.tab = liveTab;
    await this.logState("OPEN", liveTab ? "browser-tab" : "browser-tab-missing", {
      sessionId: sessionRecord.sessionId,
      url: sessionRecord.browser.url,
      viewColumn: liveTab?.group.viewColumn,
    });
  }

  public hasLiveTab(sessionId: string): boolean {
    return Boolean(this.resolveLiveTab(sessionId));
  }

  public getObservedViewColumn(sessionId: string): number | undefined {
    return this.resolveLiveTab(sessionId)?.group.viewColumn;
  }

  public isSessionForegroundVisible(sessionId: string): boolean {
    return this.resolveLiveTab(sessionId)?.isActive ?? false;
  }

  public async revealSessionInGroup(
    sessionRecord: BrowserSessionRecord,
    targetGroupIndex: number,
  ): Promise<boolean> {
    this.syncSessions([
      ...Array.from(this.sessionRecordBySessionId.values()).filter(
        (existingSessionRecord) => existingSessionRecord.sessionId !== sessionRecord.sessionId,
      ),
      sessionRecord,
    ]);

    const targetViewColumn = targetGroupIndex + 1;
    const liveTab = this.resolveLiveTab(sessionRecord.sessionId);
    if (!liveTab) {
      await this.openSessionInColumn(sessionRecord, targetViewColumn);
      return true;
    }

    if (liveTab.group.viewColumn !== targetViewColumn) {
      await this.moveTabToGroup(liveTab, targetGroupIndex);
      return true;
    }

    await this.revealTab(liveTab, true);

    await this.logState("REVEAL", "browser-tab-group", {
      sessionId: sessionRecord.sessionId,
      targetGroupIndex,
    });
    return true;
  }

  public getObservedActiveSessionId(viewColumn: number | undefined): string | undefined {
    if (!viewColumn) {
      return undefined;
    }

    for (const [sessionId] of this.managedTabsBySessionId) {
      const liveTab = this.resolveLiveTab(sessionId);
      if (liveTab?.group.viewColumn === viewColumn && liveTab.isActive) {
        return sessionId;
      }
    }

    return undefined;
  }

  public async disposeSession(sessionId: string): Promise<void> {
    const managedTab = this.managedTabsBySessionId.get(sessionId);
    this.managedTabsBySessionId.delete(sessionId);
    if (!managedTab?.tab) {
      return;
    }

    try {
      await vscode.window.tabGroups.close(managedTab.tab, true);
      await this.logState("DISPOSE", "session", { sessionId });
    } catch {
      // Ignore races with user-controlled browser tabs.
    }
  }

  private createManagedTab(sessionId: string, renderKey: string, url: string): ManagedBrowserTab {
    const managedTab: ManagedBrowserTab = {
      lastKnownLabel: undefined,
      renderKey,
      sessionId,
      tab: undefined,
      url,
    };
    this.managedTabsBySessionId.set(sessionId, managedTab);
    return managedTab;
  }

  private async openBrowserTab(sessionRecord: BrowserSessionRecord): Promise<vscode.Tab | undefined> {
    const targetViewColumn = getActiveEditorGroupViewColumn() ?? 1;
    const browserTabsBeforeOpen = new Set(this.getBrowserLikeTabs(targetViewColumn));
    await vscode.commands.executeCommand(
      SIMPLE_BROWSER_OPEN_COMMAND,
      vscode.Uri.parse(sessionRecord.browser.url),
      {
        viewColumn: targetViewColumn,
      },
    );
    const openedTab =
      this.findOpenedBrowserLikeTab(targetViewColumn, browserTabsBeforeOpen) ??
      this.findTabByUrl(sessionRecord.browser.url, targetViewColumn) ??
      this.findBestBrowserCandidate(sessionRecord.sessionId, targetViewColumn);
    const managedTab = this.managedTabsBySessionId.get(sessionRecord.sessionId);
    if (managedTab && openedTab) {
      managedTab.lastKnownLabel = openedTab.label;
    }
    await this.logState("OPEN", "browser-tab", {
      browserLikeTabLabelsAfterOpen: this.getBrowserLikeTabs(targetViewColumn).map(
        (tab) => tab.label,
      ),
      browserLikeTabLabelsBeforeOpen: [...browserTabsBeforeOpen].map((tab) => tab.label),
      openedTabInputKind: openedTab ? getBrowserTabInputKind(openedTab) : undefined,
      openedTabLabel: openedTab?.label,
      sessionId: sessionRecord.sessionId,
      targetViewColumn,
      url: sessionRecord.browser.url,
    });
    return openedTab;
  }

  private async openSessionInColumn(
    sessionRecord: BrowserSessionRecord,
    targetViewColumn: vscode.ViewColumn,
  ): Promise<void> {
    await focusEditorGroupByIndex(targetViewColumn - 1);
    const liveTab = await this.openBrowserTab(sessionRecord);
    const managedTab = this.managedTabsBySessionId.get(sessionRecord.sessionId);
    if (managedTab && liveTab) {
      managedTab.tab = liveTab;
    }
    if (liveTab) {
      await this.revealTab(liveTab, true);
    }
    await this.logState("OPEN", "browser-tab-group", {
      sessionId: sessionRecord.sessionId,
      targetViewColumn,
    });
  }

  private async revealTab(tab: vscode.Tab, shouldFocus: boolean): Promise<void> {
    const targetViewColumn = tab.group.viewColumn;
    if (!targetViewColumn) {
      return;
    }

    const restoreViewColumn = !shouldFocus ? getActiveEditorGroupViewColumn() : undefined;
    await focusEditorGroupByIndex(targetViewColumn - 1);
    const liveTab =
      this.resolveSpecificLiveTab(tab) ??
      this.findTabByUrl(getBrowserTabUrl(tab), targetViewColumn) ??
      this.findBestBrowserCandidate(undefined, targetViewColumn);
    if (!liveTab) {
      await this.logState("REVEAL", "browser-tab-missing", {
        shouldFocus,
        tabLabel: tab.label,
        tabUrl: getBrowserTabUrl(tab),
        targetViewColumn,
      });
      return;
    }

    const tabIndex = liveTab.group.tabs.indexOf(liveTab);
    if (tabIndex >= 0 && tabIndex < 9) {
      await vscode.commands.executeCommand(`workbench.action.openEditorAtIndex${tabIndex + 1}`);
    }

    if (!shouldFocus && restoreViewColumn && restoreViewColumn !== targetViewColumn) {
      await focusEditorGroupByIndex(restoreViewColumn - 1);
    }
    await this.logState("REVEAL", "browser-tab", {
      shouldFocus,
      targetViewColumn,
      tabLabel: tab.label,
      url: getBrowserTabUrl(tab),
    });
  }

  private async moveTabToGroup(tab: vscode.Tab, targetGroupIndex: number): Promise<void> {
    await this.revealTab(tab, true);
    await moveActiveEditorToGroup(targetGroupIndex);

    await this.logState("MOVE", "browser-tab-group", {
      tabLabel: tab.label,
      targetGroupIndex,
      url: getBrowserTabUrl(tab),
    });
  }

  private resolveLiveTab(sessionId: string): vscode.Tab | undefined {
    const managedTab = this.managedTabsBySessionId.get(sessionId);
    if (!managedTab) {
      return undefined;
    }

    const exactTab = this.resolveSpecificLiveTab(managedTab.tab);
    if (exactTab) {
      managedTab.lastKnownLabel = exactTab.label;
      return exactTab;
    }

    const urlMatch = this.findTabByUrl(managedTab.url);
    if (urlMatch) {
      managedTab.lastKnownLabel = urlMatch.label;
      return urlMatch;
    }

    const candidate = this.findBestBrowserCandidate(sessionId);
    if (candidate) {
      managedTab.lastKnownLabel = candidate.label;
    }
    return candidate;
  }

  private resolveSpecificLiveTab(tab: vscode.Tab | undefined): vscode.Tab | undefined {
    if (!tab) {
      return undefined;
    }

    return vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .find((candidate) => candidate === tab);
  }

  private findTabByUrl(
    url: string | undefined,
    viewColumn?: vscode.ViewColumn,
  ): vscode.Tab | undefined {
    const expectedUrl = normalizeUrl(url);
    return vscode.window.tabGroups.all
      .filter((group) => viewColumn === undefined || group.viewColumn === viewColumn)
      .flatMap((group) => group.tabs)
      .find((tab) => normalizeUrl(getBrowserTabUrl(tab)) === expectedUrl);
  }

  private findOpenedBrowserLikeTab(
    viewColumn: vscode.ViewColumn,
    tabsBeforeOpen: ReadonlySet<vscode.Tab>,
  ): vscode.Tab | undefined {
    return this.getBrowserLikeTabs(viewColumn).find((tab) => !tabsBeforeOpen.has(tab));
  }

  private findBestBrowserCandidate(
    sessionId: string | undefined,
    viewColumn?: vscode.ViewColumn,
  ): vscode.Tab | undefined {
    const managedTab = sessionId ? this.managedTabsBySessionId.get(sessionId) : undefined;
    const browserLikeTabs = this.getBrowserLikeTabs(viewColumn);
    if (browserLikeTabs.length === 0) {
      return undefined;
    }

    if (managedTab?.lastKnownLabel) {
      const labelMatch = browserLikeTabs.find((tab) => tab.label === managedTab.lastKnownLabel);
      if (labelMatch) {
        return labelMatch;
      }
    }

    const activeTab = browserLikeTabs.find((tab) => tab.group.isActive && tab.isActive);
    if (activeTab) {
      return activeTab;
    }

    if (this.sessionRecordBySessionId.size === 1) {
      return browserLikeTabs.at(-1);
    }

    return undefined;
  }

  private getBrowserLikeTabs(viewColumn?: vscode.ViewColumn): vscode.Tab[] {
    return vscode.window.tabGroups.all
      .filter((group) => viewColumn === undefined || group.viewColumn === viewColumn)
      .flatMap((group) => group.tabs)
      .filter(isBrowserLikeTab);
  }

  private async handleTabChange(): Promise<void> {
    await this.logState("EVENT", "tab-change", undefined);
    if (this.suppressFocusEvents > 0) {
      await this.options.onDidChangeSessions?.();
      return;
    }

    const activeSessionId = [...this.managedTabsBySessionId.keys()].find((sessionId) => {
      const liveTab = this.resolveLiveTab(sessionId);
      return Boolean(liveTab?.group.isActive && liveTab.isActive);
    });
    await this.options.onDidChangeSessions?.();
    if (!activeSessionId) {
      return;
    }

    await this.options.onDidFocusSession(activeSessionId);
  }

  public getDebugState(): {
    managedTabs: Array<{
      lastKnownLabel?: string;
      liveTabLabel?: string;
      liveTabViewColumn?: number;
      renderKey: string;
      sessionId: string;
      url: string;
    }>;
    trackedSessionIds: string[];
    workbench: ReturnType<typeof captureWorkbenchState>;
  } {
    return {
      managedTabs: [...this.managedTabsBySessionId.values()].map((managedTab) => {
        const liveTab = this.resolveLiveTab(managedTab.sessionId);
        return {
          lastKnownLabel: managedTab.lastKnownLabel,
          liveTabLabel: liveTab?.label,
          liveTabViewColumn: liveTab?.group.viewColumn,
          renderKey: managedTab.renderKey,
          sessionId: managedTab.sessionId,
          url: managedTab.url,
        };
      }),
      trackedSessionIds: [...this.sessionRecordBySessionId.keys()],
      workbench: captureWorkbenchState(),
    };
  }

  private async logState(tag: string, message: string, details?: unknown): Promise<void> {
    if (!this.trace.isEnabled()) {
      return;
    }

    await this.trace.log(tag, message, {
      details,
      state: this.getDebugState(),
    });
  }
}
