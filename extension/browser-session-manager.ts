import * as vscode from "vscode";
import {
  isBrowserSession,
  type BrowserSessionRecord,
  type SessionGridSnapshot,
} from "../shared/session-grid-contract";
import { createWorkspaceTrace, RuntimeTrace } from "./runtime-trace";
import {
  focusEditorGroupByIndex,
  getActiveEditorGroupViewColumn,
  getViewColumn,
} from "./terminal-workspace-helpers";

type BrowserSessionManagerOptions = {
  onDidChangeSessions?: () => Promise<void> | void;
  onDidFocusSession: (sessionId: string) => Promise<void>;
};

type ManagedBrowserTab = {
  renderKey: string;
  sessionId: string;
  tab: vscode.Tab | undefined;
  url: string;
  viewColumn: vscode.ViewColumn | undefined;
};

const INTEGRATED_BROWSER_VIEW_TYPE = "browserPreview";
const SIMPLE_BROWSER_OPEN_COMMAND = "simpleBrowser.api.open";
const SIMPLE_BROWSER_VIEW_TYPE = "simpleBrowser.view";
const TRACE_FILE_NAME = "browser-session-manager.log";

export class BrowserSessionManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly managedTabsBySessionId = new Map<string, ManagedBrowserTab>();
  private readonly trace: RuntimeTrace;
  private lastFocusedSessionId: string | undefined;
  private pendingProgrammaticFocus:
    | {
        clearTimeout: ReturnType<typeof setTimeout>;
        sessionId: string;
      }
    | undefined;

  public constructor(private readonly options: BrowserSessionManagerOptions) {
    this.trace = createWorkspaceTrace(TRACE_FILE_NAME);
    void this.trace.reset();
    this.disposables.push(
      vscode.window.tabGroups.onDidChangeTabs(() => {
        this.handleTabStateChange();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        this.handleTabStateChange();
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("VSmux.debuggingMode")) {
          return;
        }

        this.trace.setEnabled(
          vscode.workspace.getConfiguration("VSmux").get<boolean>("debuggingMode", false),
        );
        void this.trace.reset();
      }),
    );
  }

  public dispose(): void {
    void this.trace.log("DISPOSE", "dispose", {
      managedSessions: [...this.managedTabsBySessionId.keys()],
    });
    this.clearPendingProgrammaticFocus();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
    this.managedTabsBySessionId.clear();
  }

  public async reconcileVisibleSessions(
    snapshot: SessionGridSnapshot,
    preserveFocus = false,
  ): Promise<void> {
    const orderedVisibleSessions = snapshot.visibleSessionIds
      .map((sessionId) => snapshot.sessions.find((session) => session.sessionId === sessionId))
      .filter((session): session is BrowserSessionRecord =>
        Boolean(session && isBrowserSession(session)),
      );
    const visibleSessionIdSet = new Set(orderedVisibleSessions.map((session) => session.sessionId));

    for (const [sessionId] of this.managedTabsBySessionId.entries()) {
      if (visibleSessionIdSet.has(sessionId)) {
        continue;
      }
    }

    const focusedVisibleSession = orderedVisibleSessions.find(
      (session) => session.sessionId === snapshot.focusedSessionId,
    );
    const nonFocusedSessions = orderedVisibleSessions.filter(
      (session) => session.sessionId !== focusedVisibleSession?.sessionId,
    );

    for (const session of nonFocusedSessions) {
      await this.revealSession(session, snapshot, true);
    }

    if (focusedVisibleSession) {
      await this.revealSession(focusedVisibleSession, snapshot, preserveFocus);
    }
  }

  public async revealStoredSession(
    sessionRecord: BrowserSessionRecord,
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    await this.revealSession(sessionRecord, snapshot, preserveFocus);
  }

  public async disposeSession(sessionId: string): Promise<void> {
    const managedTab = this.managedTabsBySessionId.get(sessionId);
    if (!managedTab) {
      return;
    }

    void this.trace.log("SESSION", "disposeSession", {
      sessionId,
      tab: describeTab(managedTab.tab),
    });
    await this.closeManagedTab(managedTab, true);
    this.managedTabsBySessionId.delete(sessionId);
  }

  public hasLiveTab(sessionId: string): boolean {
    const managedTab = this.managedTabsBySessionId.get(sessionId);
    if (!managedTab) {
      return false;
    }

    const liveTab = this.recoverLiveTab(managedTab);
    if (liveTab) {
      managedTab.tab = liveTab;
      void this.trace.log("LIVE", "hasLiveTab:hit", {
        recoveredFrom: managedTab.tab === liveTab ? "managed-or-recovered" : "recovered",
        sessionId,
        tab: describeTab(liveTab),
      });
      return true;
    }

    void this.trace.log("LIVE", "hasLiveTab:miss", {
      sessionId,
      tabs: describeAllTabGroups(),
    });
    return false;
  }

  public async revealAllSessionsInOneGroup(
    sessionRecords: readonly BrowserSessionRecord[],
    preserveFocus = true,
  ): Promise<void> {
    const sessionIds = new Set(sessionRecords.map((sessionRecord) => sessionRecord.sessionId));
    for (const [sessionId, managedTab] of this.managedTabsBySessionId.entries()) {
      if (sessionIds.has(sessionId)) {
        continue;
      }

      await this.closeManagedTab(managedTab, true);
      this.managedTabsBySessionId.delete(sessionId);
    }

    const targetViewColumn = getActiveEditorGroupViewColumn() ?? vscode.ViewColumn.One;
    for (const sessionRecord of sessionRecords) {
      const renderKey = getRenderKey(sessionRecord);
      const managedTab =
        this.managedTabsBySessionId.get(sessionRecord.sessionId) ??
        this.createManagedTab(sessionRecord.sessionId, renderKey, sessionRecord.browser.url);
      managedTab.url = sessionRecord.browser.url;
      managedTab.viewColumn = targetViewColumn;
      let currentTab =
        this.recoverLiveTab(managedTab) ?? this.findMatchingTab(sessionRecord, targetViewColumn);

      if (managedTab.renderKey !== renderKey) {
        await this.closeManagedTab(managedTab, true);
        managedTab.renderKey = renderKey;
        currentTab = undefined;
      }

      if (!currentTab || currentTab.group.viewColumn !== targetViewColumn) {
        managedTab.tab = await this.openBrowserTab(
          sessionRecord,
          targetViewColumn,
          preserveFocus,
          undefined,
        );
        continue;
      }

      managedTab.tab = currentTab;
    }
  }

  private async revealSession(
    sessionRecord: BrowserSessionRecord,
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    const visibleIndex = snapshot.visibleSessionIds.indexOf(sessionRecord.sessionId);
    if (visibleIndex < 0) {
      return;
    }

    const viewColumn = getViewColumn(visibleIndex);
    const renderKey = getRenderKey(sessionRecord);
    const managedTab =
      this.managedTabsBySessionId.get(sessionRecord.sessionId) ??
      this.createManagedTab(sessionRecord.sessionId, renderKey, sessionRecord.browser.url);
    managedTab.url = sessionRecord.browser.url;
    managedTab.viewColumn = viewColumn;
    let currentTab =
      this.recoverLiveTab(managedTab) ?? this.findMatchingTab(sessionRecord, viewColumn);
    void this.trace.log("REVEAL", "start", {
      currentTab: describeTab(currentTab),
      preserveFocus,
      renderKey,
      sessionId: sessionRecord.sessionId,
      tabs: describeAllTabGroups(),
      viewColumn,
      visibleIndex,
    });

    if (managedTab.renderKey !== renderKey) {
      void this.trace.log("REVEAL", "renderKeyChanged", {
        nextRenderKey: renderKey,
        previousRenderKey: managedTab.renderKey,
        sessionId: sessionRecord.sessionId,
      });
      await this.closeManagedTab(managedTab, true);
      managedTab.renderKey = renderKey;
      currentTab = undefined;
    }

    if (!currentTab || currentTab.group.viewColumn !== viewColumn) {
      void this.trace.log("REVEAL", "openRequired", {
        currentTab: describeTab(currentTab),
        sessionId: sessionRecord.sessionId,
        targetViewColumn: viewColumn,
      });
      if (!preserveFocus) {
        this.beginProgrammaticFocus(sessionRecord.sessionId);
      }
      managedTab.tab = await this.openBrowserTab(
        sessionRecord,
        viewColumn,
        preserveFocus,
        visibleIndex,
      );
      return;
    }

    managedTab.tab = currentTab;
    if (!preserveFocus && (!currentTab.group.isActive || !currentTab.isActive)) {
      this.beginProgrammaticFocus(sessionRecord.sessionId);
      void this.trace.log("REVEAL", "focusExistingTab", {
        sessionId: sessionRecord.sessionId,
        tab: describeTab(currentTab),
        visibleIndex,
      });
      const focusedTab = await this.focusExistingTab(currentTab, visibleIndex);
      managedTab.tab = focusedTab ?? currentTab;
    }
  }

  private createManagedTab(sessionId: string, renderKey: string, url: string): ManagedBrowserTab {
    const managedTab: ManagedBrowserTab = {
      renderKey,
      sessionId,
      tab: undefined,
      url,
      viewColumn: undefined,
    };
    this.managedTabsBySessionId.set(sessionId, managedTab);
    return managedTab;
  }

  private async closeManagedTab(
    managedTab: ManagedBrowserTab,
    preserveFocus: boolean,
  ): Promise<void> {
    const liveTab = this.recoverLiveTab(managedTab);
    void this.trace.log("CLOSE", "closeManagedTab", {
      preserveFocus,
      sessionId: managedTab.sessionId,
      tab: describeTab(liveTab),
    });
    managedTab.tab = undefined;
    if (!liveTab) {
      return;
    }

    try {
      await vscode.window.tabGroups.close(liveTab, preserveFocus);
    } catch {
      // The built-in browser can disappear outside VSmux control; ignore close races.
    }
  }

  private handleTabStateChange(): void {
    let changed = false;
    for (const managedTab of this.managedTabsBySessionId.values()) {
      const recoveredTab = this.recoverLiveTab(managedTab);
      if (recoveredTab !== managedTab.tab) {
        void this.trace.log("TAB", "recoveredTabChanged", {
          nextTab: describeTab(recoveredTab),
          previousTab: describeTab(managedTab.tab),
          sessionId: managedTab.sessionId,
        });
        managedTab.tab = recoveredTab;
        changed = true;
        continue;
      }

      if (!recoveredTab && managedTab.tab) {
        managedTab.tab = undefined;
        changed = true;
      }
    }

    const activeSessionId = Array.from(this.managedTabsBySessionId.values()).find(
      (managedTab) => managedTab.tab?.group.isActive && managedTab.tab.isActive,
    )?.sessionId;
    void this.trace.log("TAB", "handleTabStateChange", {
      activeSessionId,
      changed,
      tabs: describeAllTabGroups(),
    });
    if (changed) {
      void this.options.onDidChangeSessions?.();
    }

    if (!activeSessionId || activeSessionId === this.lastFocusedSessionId) {
      return;
    }

    if (this.shouldIgnoreFocusEvent(activeSessionId)) {
      this.lastFocusedSessionId = activeSessionId;
      return;
    }

    this.lastFocusedSessionId = activeSessionId;
    void this.options.onDidFocusSession(activeSessionId);
  }

  private async openBrowserTab(
    sessionRecord: BrowserSessionRecord,
    viewColumn: vscode.ViewColumn,
    preserveFocus: boolean,
    visibleIndex?: number,
  ): Promise<vscode.Tab | undefined> {
    const tabsBeforeOpen = new Set(this.getTabsInViewColumn(viewColumn));
    if (!preserveFocus && visibleIndex !== undefined) {
      await focusEditorGroupByIndex(visibleIndex);
    }

    void this.trace.log("OPEN", "openBrowserTab:start", {
      preserveFocus,
      sessionId: sessionRecord.sessionId,
      tabsBeforeOpen: [...tabsBeforeOpen].map((tab) => describeTab(tab)),
      url: sessionRecord.browser.url,
      viewColumn,
      visibleIndex,
    });
    await vscode.commands.executeCommand(
      SIMPLE_BROWSER_OPEN_COMMAND,
      vscode.Uri.parse(sessionRecord.browser.url),
      {
        preserveFocus,
        viewColumn,
      },
    );

    const openedTab =
      this.findMatchingTab(sessionRecord, viewColumn) ??
      this.findOpenedTab(viewColumn, tabsBeforeOpen) ??
      this.getLastTabInViewColumn(viewColumn);
    void this.trace.log("OPEN", "openBrowserTab:complete", {
      openedTab: describeTab(openedTab),
      sessionId: sessionRecord.sessionId,
      tabs: describeAllTabGroups(),
    });
    return openedTab;
  }

  private async focusExistingTab(
    tab: vscode.Tab,
    visibleIndex: number,
  ): Promise<vscode.Tab | undefined> {
    if (!tab.group.isActive) {
      await focusEditorGroupByIndex(visibleIndex);
    }

    if (!tab.isActive) {
      const tabIndex = tab.group.tabs.indexOf(tab);
      if (tabIndex >= 0 && tabIndex < 9) {
        await vscode.commands.executeCommand(`workbench.action.openEditorAtIndex${tabIndex + 1}`);
      }
    }

    const focusedTab =
      this.resolveLiveTab(tab) ?? this.getTabsInViewColumn(getViewColumn(visibleIndex)).at(-1);
    void this.trace.log("FOCUS", "focusExistingTab", {
      inputTab: describeTab(tab),
      resultTab: describeTab(focusedTab),
      visibleIndex,
    });
    return focusedTab;
  }

  private findMatchingTab(
    sessionRecord: BrowserSessionRecord,
    viewColumn: vscode.ViewColumn,
  ): vscode.Tab | undefined {
    const expectedUrl = normalizeUrl(sessionRecord.browser.url);
    const exactGroupMatch = vscode.window.tabGroups.all.find(
      (group) => group.viewColumn === viewColumn,
    );
    const exactMatch = exactGroupMatch?.tabs.find(
      (tab) => normalizeUrl(getBrowserTabUrl(tab)) === expectedUrl,
    );
    if (exactMatch) {
      void this.trace.log("MATCH", "findMatchingTab:exact", {
        expectedUrl,
        tab: describeTab(exactMatch),
        viewColumn,
      });
      return exactMatch;
    }

    const looseMatch = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .find((tab) => normalizeUrl(getBrowserTabUrl(tab)) === expectedUrl);
    if (looseMatch) {
      void this.trace.log("MATCH", "findMatchingTab:loose", {
        expectedUrl,
        tab: describeTab(looseMatch),
        viewColumn,
      });
      return looseMatch;
    }

    const groupMatch = this.findManagedBrowserTabByViewColumn(viewColumn);
    void this.trace.log("MATCH", "findMatchingTab:groupFallback", {
      expectedUrl,
      tab: describeTab(groupMatch),
      tabs: describeAllTabGroups(),
      viewColumn,
    });
    return groupMatch;
  }

  private resolveLiveTab(tab: vscode.Tab | undefined): vscode.Tab | undefined {
    if (!tab) {
      return undefined;
    }

    return vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .find((candidate) => candidate === tab);
  }

  private findOpenedTab(
    viewColumn: vscode.ViewColumn,
    tabsBeforeOpen: ReadonlySet<vscode.Tab>,
  ): vscode.Tab | undefined {
    return this.getTabsInViewColumn(viewColumn).find((tab) => !tabsBeforeOpen.has(tab));
  }

  private getLastTabInViewColumn(viewColumn: vscode.ViewColumn): vscode.Tab | undefined {
    const tabs = this.getTabsInViewColumn(viewColumn);
    return tabs.at(-1);
  }

  private getTabsInViewColumn(viewColumn: vscode.ViewColumn): readonly vscode.Tab[] {
    return vscode.window.tabGroups.all.find((group) => group.viewColumn === viewColumn)?.tabs ?? [];
  }

  private recoverLiveTab(managedTab: ManagedBrowserTab): vscode.Tab | undefined {
    const recoveredTab =
      this.resolveLiveTab(managedTab.tab) ??
      this.findTabByUrl(managedTab.url) ??
      this.findManagedBrowserTabByViewColumn(managedTab.viewColumn);
    if (recoveredTab !== managedTab.tab) {
      void this.trace.log("RECOVER", "recoverLiveTab", {
        previousTab: describeTab(managedTab.tab),
        recoveredTab: describeTab(recoveredTab),
        sessionId: managedTab.sessionId,
        tabs: describeAllTabGroups(),
        url: managedTab.url,
        viewColumn: managedTab.viewColumn,
      });
    }

    return recoveredTab;
  }

  private findTabByUrl(url: string): vscode.Tab | undefined {
    const expectedUrl = normalizeUrl(url);
    return vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .find((tab) => normalizeUrl(getBrowserTabUrl(tab)) === expectedUrl);
  }

  private findManagedBrowserTabByViewColumn(
    viewColumn: vscode.ViewColumn | undefined,
  ): vscode.Tab | undefined {
    if (viewColumn === undefined) {
      return undefined;
    }

    const group = vscode.window.tabGroups.all.find(
      (candidate) => candidate.viewColumn === viewColumn,
    );
    if (!group) {
      return undefined;
    }

    const browserTabs = group.tabs.filter(isManagedBrowserTabInput);
    if (browserTabs.length === 0) {
      if (group.tabs.length === 1) {
        void this.trace.log("MATCH", "findManagedBrowserTabByViewColumn:singleOpaqueTab", {
          tab: describeTab(group.tabs[0]),
          viewColumn,
        });
        return group.tabs[0];
      }

      void this.trace.log("MATCH", "findManagedBrowserTabByViewColumn:activeFallback", {
        tab: describeTab(group.tabs.find((tab) => tab.isActive)),
        viewColumn,
      });
      return group.tabs.find((tab) => tab.isActive);
    }

    if (browserTabs.length === 1) {
      return browserTabs[0];
    }

    return browserTabs.find((tab) => tab.isActive) ?? browserTabs.at(-1);
  }

  private beginProgrammaticFocus(sessionId: string): void {
    this.clearPendingProgrammaticFocus();
    this.pendingProgrammaticFocus = {
      clearTimeout: setTimeout(() => {
        if (this.pendingProgrammaticFocus?.sessionId === sessionId) {
          this.pendingProgrammaticFocus = undefined;
        }
      }, 250),
      sessionId,
    };
  }

  private clearPendingProgrammaticFocus(): void {
    if (!this.pendingProgrammaticFocus) {
      return;
    }

    clearTimeout(this.pendingProgrammaticFocus.clearTimeout);
    this.pendingProgrammaticFocus = undefined;
  }

  private shouldIgnoreFocusEvent(sessionId: string): boolean {
    const pendingProgrammaticFocus = this.pendingProgrammaticFocus;
    if (!pendingProgrammaticFocus) {
      return false;
    }

    if (pendingProgrammaticFocus.sessionId === sessionId) {
      this.clearPendingProgrammaticFocus();
      return true;
    }

    return true;
  }
}

function getRenderKey(sessionRecord: BrowserSessionRecord): string {
  return [sessionRecord.alias, sessionRecord.browser.url].join("|");
}

function getBrowserTabUrl(tab: vscode.Tab): string | undefined {
  const input = tab.input;
  if (input instanceof vscode.TabInputText) {
    return input.uri.toString(true);
  }

  if (input instanceof vscode.TabInputCustom) {
    return input.uri.toString(true);
  }

  return undefined;
}

function isManagedBrowserTabInput(tab: vscode.Tab): boolean {
  const input = tab.input;
  return (
    input instanceof vscode.TabInputWebview &&
    (input.viewType === INTEGRATED_BROWSER_VIEW_TYPE || input.viewType === SIMPLE_BROWSER_VIEW_TYPE)
  );
}

function describeAllTabGroups(): Array<{
  isActive: boolean;
  tabs: ReturnType<typeof describeTab>[];
  viewColumn: vscode.ViewColumn | undefined;
}> {
  return vscode.window.tabGroups.all.map((group) => ({
    isActive: group.isActive,
    tabs: group.tabs.map((tab) => describeTab(tab)),
    viewColumn: group.viewColumn,
  }));
}

function describeTab(tab: vscode.Tab | undefined): {
  groupIsActive?: boolean;
  inputKind?: string;
  isActive?: boolean;
  label?: string;
  url?: string;
  viewColumn?: vscode.ViewColumn | undefined;
  viewType?: string;
} | null {
  if (!tab) {
    return null;
  }

  const input = tab.input;
  if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom) {
    return {
      groupIsActive: tab.group.isActive,
      inputKind: input.constructor.name,
      isActive: tab.isActive,
      label: tab.label,
      url: input.uri.toString(true),
      viewColumn: tab.group.viewColumn,
    };
  }

  if (input instanceof vscode.TabInputWebview) {
    return {
      groupIsActive: tab.group.isActive,
      inputKind: input.constructor.name,
      isActive: tab.isActive,
      label: tab.label,
      viewColumn: tab.group.viewColumn,
      viewType: input.viewType,
    };
  }

  return {
    groupIsActive: tab.group.isActive,
    inputKind: input?.constructor?.name ?? typeof input,
    isActive: tab.isActive,
    label: tab.label,
    viewColumn: tab.group.viewColumn,
  };
}

function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return vscode.Uri.parse(url).toString(true);
  } catch {
    return url;
  }
}
