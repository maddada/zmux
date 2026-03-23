import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  getT3SessionSurfaceTitle,
  isT3Session,
  type SessionGridSnapshot,
  type SessionRecord,
  type T3SessionRecord,
} from "../shared/session-grid-contract";
import {
  focusEditorGroupByIndex,
  getActiveEditorGroupViewColumn,
  getViewColumn,
} from "./terminal-workspace-helpers";
import { captureWorkbenchState } from "./session-layout-trace";
import { createWorkspaceTrace } from "./runtime-trace";

type T3WebviewManagerOptions = {
  context: vscode.ExtensionContext;
  onDidFocusSession: (sessionId: string) => Promise<void>;
};

type ManagedPanel = {
  panel: vscode.WebviewPanel;
  pendingComposerFocus: boolean;
  ready: boolean;
  readyWaiters: Array<() => void>;
  renderKey: string;
  sessionId: string;
};

const T3_PANEL_TYPE = "VSmux.t3Session";
const TRACE_FILE_NAME = "t3-webview-reconcile.log";

export class T3WebviewManager implements vscode.Disposable {
  private readonly panelsBySessionId = new Map<string, ManagedPanel>();
  private readonly sessionRecordBySessionId = new Map<string, T3SessionRecord>();
  private readonly trace = createWorkspaceTrace(TRACE_FILE_NAME);
  private suppressFocusEvents = 0;

  public constructor(private readonly options: T3WebviewManagerOptions) {}

  public dispose(): void {
    for (const managedPanel of this.panelsBySessionId.values()) {
      managedPanel.panel.dispose();
    }
    this.panelsBySessionId.clear();
    this.sessionRecordBySessionId.clear();
  }

  public async resetDebugTrace(): Promise<void> {
    await this.trace.reset();
  }

  public syncSessions(sessionRecords: readonly SessionRecord[]): void {
    const nextRecords = new Map(
      sessionRecords
        .filter(isT3Session)
        .map((sessionRecord) => [sessionRecord.sessionId, sessionRecord]),
    );
    this.sessionRecordBySessionId.clear();
    for (const [sessionId, sessionRecord] of nextRecords) {
      this.sessionRecordBySessionId.set(sessionId, sessionRecord);
    }

    for (const sessionId of this.panelsBySessionId.keys()) {
      if (nextRecords.has(sessionId)) {
        continue;
      }

      this.disposeSession(sessionId);
    }

    void this.logState("SYNC", "sessions", {
      trackedSessionIds: [...this.sessionRecordBySessionId.keys()],
    });
  }

  public async reconcileVisibleSessions(
    snapshot: SessionGridSnapshot,
    preserveFocus = false,
  ): Promise<void> {
    await this.closeUnknownPanels();
    const placements = this.getPlacements(snapshot);
    await this.logState("RECONCILE", "start", {
      placements: placements.map((placement) => ({
        isFocused: placement.isFocused,
        isVisible: placement.isVisible,
        sessionId: placement.sessionRecord.sessionId,
        targetViewColumn: placement.targetViewColumn,
      })),
      preserveFocus,
      snapshot,
    });
    this.suppressFocusEvents += 1;
    try {
      for (const placement of placements) {
        await this.logState("PLACE", "before", {
          isFocused: placement.isFocused,
          isVisible: placement.isVisible,
          sessionId: placement.sessionRecord.sessionId,
          targetViewColumn: placement.targetViewColumn,
        });
        await this.ensurePlacement(
          placement.sessionRecord,
          placement.targetViewColumn,
          placement.isFocused && !preserveFocus,
          placement.isVisible,
        );
        await this.logState("PLACE", "after", {
          isFocused: placement.isFocused,
          isVisible: placement.isVisible,
          sessionId: placement.sessionRecord.sessionId,
          targetViewColumn: placement.targetViewColumn,
        });
      }
    } finally {
      this.suppressFocusEvents = Math.max(0, this.suppressFocusEvents - 1);
    }
    await this.logState("RECONCILE", "complete", {
      preserveFocus,
      snapshot,
    });
  }

  public async revealStoredSession(
    sessionRecord: T3SessionRecord,
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    this.syncSessions([
      ...Array.from(this.sessionRecordBySessionId.values()).filter(
        (existingSessionRecord) => existingSessionRecord.sessionId !== sessionRecord.sessionId,
      ),
      sessionRecord,
    ]);
    await this.reconcileVisibleSessions(snapshot, preserveFocus);
  }

  public focusComposer(sessionId: string): void {
    const managedPanel = this.panelsBySessionId.get(sessionId);
    if (!managedPanel) {
      void this.logState("FOCUS", "composer-missing", { sessionId });
      return;
    }

    void this.logState("FOCUS", "composer", { sessionId });
    managedPanel.panel.reveal(managedPanel.panel.viewColumn, false);
    this.requestComposerFocus(managedPanel);
  }

  public async waitForSessionReady(sessionId: string, timeoutMs = 750): Promise<void> {
    const managedPanel = this.panelsBySessionId.get(sessionId);
    if (!managedPanel || managedPanel.ready) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        managedPanel.readyWaiters = managedPanel.readyWaiters.filter((waiter) => waiter !== done);
        resolve();
      }, timeoutMs);
      const done = () => {
        clearTimeout(timeout);
        resolve();
      };
      managedPanel.readyWaiters.push(done);
    });
  }

  public disposeSession(sessionId: string): void {
    const managedPanel = this.panelsBySessionId.get(sessionId);
    if (!managedPanel) {
      return;
    }

    this.panelsBySessionId.delete(sessionId);
    managedPanel.panel.dispose();
    void this.logState("DISPOSE", "session", { sessionId });
  }

  public disposeAllSessions(): void {
    for (const sessionId of this.panelsBySessionId.keys()) {
      this.disposeSession(sessionId);
    }
  }

  private getPlacements(snapshot: SessionGridSnapshot): Array<{
    isFocused: boolean;
    isVisible: boolean;
    sessionRecord: T3SessionRecord;
    targetViewColumn: vscode.ViewColumn;
  }> {
    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    const placements = [...this.sessionRecordBySessionId.values()].map((sessionRecord) => {
      const visibleIndex = snapshot.visibleSessionIds.indexOf(sessionRecord.sessionId);
      const isVisible = visibleIndex >= 0;
      const currentViewColumn =
        this.panelsBySessionId.get(sessionRecord.sessionId)?.panel.viewColumn ??
        getObservedPanelViewColumn(getPanelTitle(sessionRecord));

      return {
        isFocused: focusedSessionId === sessionRecord.sessionId,
        isVisible,
        sessionRecord,
        targetViewColumn: isVisible ? getViewColumn(visibleIndex) : (currentViewColumn ?? 1),
      };
    });

    placements.sort((left, right) => {
      const leftRank = getPlacementRank(left.isVisible, left.isFocused);
      const rightRank = getPlacementRank(right.isVisible, right.isFocused);
      if (leftRank !== rightRank) {
        return rightRank - leftRank;
      }

      if (left.targetViewColumn !== right.targetViewColumn) {
        return left.targetViewColumn - right.targetViewColumn;
      }

      return left.sessionRecord.alias.localeCompare(right.sessionRecord.alias);
    });

    return placements;
  }

  private async ensurePlacement(
    sessionRecord: T3SessionRecord,
    targetViewColumn: vscode.ViewColumn,
    shouldFocus: boolean,
    isVisible: boolean,
  ): Promise<void> {
    const managedPanel = this.panelsBySessionId.get(sessionRecord.sessionId);
    const renderKey = getRenderKey(sessionRecord);
    const observedViewColumn = getObservedPanelViewColumn(getPanelTitle(sessionRecord));
    const currentViewColumn = managedPanel?.panel.viewColumn ?? observedViewColumn;

    if (
      managedPanel &&
      managedPanel.renderKey === renderKey &&
      currentViewColumn === targetViewColumn
    ) {
      await this.logState("PLACE", "reuse", {
        currentViewColumn,
        isVisible,
        observedViewColumn,
        sessionId: sessionRecord.sessionId,
        shouldFocus,
        targetViewColumn,
      });
      managedPanel.panel.title = getPanelTitle(sessionRecord);
      if (isVisible || shouldFocus) {
        managedPanel.panel.reveal(targetViewColumn, !shouldFocus);
      }
      if (shouldFocus) {
        this.requestComposerFocus(managedPanel);
      }
      return;
    }

    if (managedPanel) {
      await this.logState("PLACE", "recreate", {
        currentViewColumn,
        isVisible,
        observedViewColumn,
        sessionId: sessionRecord.sessionId,
        shouldFocus,
        targetViewColumn,
      });
      this.disposeSession(sessionRecord.sessionId);
    }

    const nextManagedPanel = await this.createPanel(sessionRecord, renderKey, targetViewColumn);
    if (isVisible || shouldFocus) {
      nextManagedPanel.panel.reveal(targetViewColumn, !shouldFocus);
    }
    if (shouldFocus) {
      this.requestComposerFocus(nextManagedPanel);
    }
  }

  private async createPanel(
    sessionRecord: T3SessionRecord,
    renderKey: string,
    targetViewColumn: vscode.ViewColumn,
  ): Promise<ManagedPanel> {
    const restoreViewColumn = getActiveEditorGroupViewColumn();
    const panel = vscode.window.createWebviewPanel(
      T3_PANEL_TYPE,
      getPanelTitle(sessionRecord),
      {
        preserveFocus: true,
        viewColumn: targetViewColumn,
      },
      {
        enableScripts: true,
        localResourceRoots: [getEmbeddedT3Root(this.options.context)],
        retainContextWhenHidden: true,
      },
    );
    const managedPanel: ManagedPanel = {
      panel,
      pendingComposerFocus: false,
      ready: false,
      readyWaiters: [],
      renderKey,
      sessionId: sessionRecord.sessionId,
    };
    this.panelsBySessionId.set(sessionRecord.sessionId, managedPanel);

    panel.onDidDispose(() => {
      if (this.panelsBySessionId.get(sessionRecord.sessionId)?.panel === panel) {
        this.panelsBySessionId.delete(sessionRecord.sessionId);
      }
    });
    panel.onDidChangeViewState((event) => {
      if (!event.webviewPanel.active || this.suppressFocusEvents > 0) {
        return;
      }

      void this.logState("EVENT", "panel-focus", {
        sessionId: sessionRecord.sessionId,
        viewColumn: panel.viewColumn,
      });
      void this.options.onDidFocusSession(sessionRecord.sessionId);
    });
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isT3WebviewMessage(message)) {
        return;
      }

      managedPanel.ready = true;
      void this.logState("EVENT", "panel-ready", {
        sessionId: sessionRecord.sessionId,
      });
      for (const waiter of managedPanel.readyWaiters.splice(0)) {
        waiter();
      }
      if (managedPanel.pendingComposerFocus) {
        this.requestComposerFocus(managedPanel);
      }
    });
    panel.webview.html = await this.createPanelHtml(panel.webview, sessionRecord);

    if (
      restoreViewColumn &&
      restoreViewColumn !== targetViewColumn &&
      this.suppressFocusEvents > 0
    ) {
      await focusEditorGroupByIndex(restoreViewColumn - 1);
    }

    return managedPanel;
  }

  private requestComposerFocus(managedPanel: ManagedPanel): void {
    if (!managedPanel.ready) {
      managedPanel.pendingComposerFocus = true;
      void this.logState("FOCUS", "composer-pending", {
        sessionId: managedPanel.sessionId,
      });
      return;
    }

    managedPanel.pendingComposerFocus = false;
    void this.logState("FOCUS", "composer-post", {
      sessionId: managedPanel.sessionId,
    });
    void managedPanel.panel.webview.postMessage({ type: "focusComposer" });
  }

  private async closeUnknownPanels(): Promise<void> {
    const expectedTitles = new Set(
      [...this.sessionRecordBySessionId.values()].map((sessionRecord) =>
        getPanelTitle(sessionRecord),
      ),
    );

    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (
          !(tab.input instanceof vscode.TabInputWebview) ||
          tab.input.viewType !== T3_PANEL_TYPE ||
          expectedTitles.has(tab.label)
        ) {
          continue;
        }

        await vscode.window.tabGroups.close(tab, true);
        await this.logState("DISPOSE", "unknown-panel", {
          label: tab.label,
          viewColumn: group.viewColumn,
        });
      }
    }
  }

  private async createPanelHtml(
    webview: vscode.Webview,
    sessionRecord: T3SessionRecord,
  ): Promise<string> {
    const embeddedRoot = getEmbeddedT3Root(this.options.context);
    const indexPath = path.join(embeddedRoot.fsPath, "index.html");
    const nonce = createNonce();

    let html: string;
    try {
      html = await readFile(indexPath, "utf8");
    } catch {
      return createMissingEmbedHtml(webview, nonce);
    }

    const webviewRootUri = webview.asWebviewUri(embeddedRoot).toString();
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} data:`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
      `connect-src ${sessionRecord.t3.serverOrigin} ${toWebSocketOrigin(sessionRecord.t3.serverOrigin)}`,
    ].join("; ");
    const bootstrapScript = `<script nonce="${nonce}">window.__VSMUX_T3_BOOTSTRAP__=${JSON.stringify(
      {
        embedMode: "vsmux-mobile",
        httpOrigin: sessionRecord.t3.serverOrigin,
        sessionId: sessionRecord.sessionId,
        threadId: sessionRecord.t3.threadId,
        workspaceRoot: sessionRecord.t3.workspaceRoot,
        wsUrl: toWebSocketOrigin(sessionRecord.t3.serverOrigin),
      },
    )};</script>`;

    return html
      .replace(
        /<meta\s+charset="UTF-8"\s*\/?>/i,
        `<meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="${csp}" />${bootstrapScript}`,
      )
      .replaceAll(/(src|href)="\/([^"]+)"/g, (_, attribute: string, assetPath: string) => {
        const resourceUri = `${webviewRootUri}/${assetPath}`;
        return `${attribute}="${resourceUri}"`;
      })
      .replace(/<script type="module"/g, `<script nonce="${nonce}" type="module"`);
  }

  public getDebugState(): {
    managedPanels: Array<{
      observedViewColumn?: number;
      panelTitle: string;
      pendingComposerFocus: boolean;
      ready: boolean;
      renderKey: string;
      sessionId: string;
      viewColumn?: number;
      visible: boolean;
    }>;
    trackedSessionIds: string[];
    workbench: ReturnType<typeof captureWorkbenchState>;
  } {
    return {
      managedPanels: [...this.panelsBySessionId.values()].map((managedPanel) => ({
        observedViewColumn: getObservedPanelViewColumn(managedPanel.panel.title),
        panelTitle: managedPanel.panel.title,
        pendingComposerFocus: managedPanel.pendingComposerFocus,
        ready: managedPanel.ready,
        renderKey: managedPanel.renderKey,
        sessionId: managedPanel.sessionId,
        viewColumn: managedPanel.panel.viewColumn,
        visible: managedPanel.panel.visible,
      })),
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

function getPlacementRank(isVisible: boolean, isFocused: boolean): number {
  if (isFocused) {
    return 2;
  }

  return isVisible ? 1 : 0;
}

function getEmbeddedT3Root(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.extensionUri, "forks", "t3code-embed", "dist");
}

function getPanelTitle(sessionRecord: T3SessionRecord): string {
  return getT3SessionSurfaceTitle(sessionRecord);
}

function getRenderKey(sessionRecord: T3SessionRecord): string {
  return [
    sessionRecord.alias,
    sessionRecord.t3.projectId,
    sessionRecord.t3.serverOrigin,
    sessionRecord.t3.threadId,
    sessionRecord.t3.workspaceRoot,
  ].join("|");
}

function getObservedPanelViewColumn(panelTitle: string): vscode.ViewColumn | undefined {
  for (const group of vscode.window.tabGroups.all) {
    if (group.viewColumn === undefined) {
      continue;
    }

    const hasMatchingTab = group.tabs.some(
      (tab) =>
        tab.input instanceof vscode.TabInputWebview &&
        tab.input.viewType === T3_PANEL_TYPE &&
        tab.label === panelTitle,
    );
    if (hasMatchingTab) {
      return group.viewColumn;
    }
  }

  return undefined;
}

function createMissingEmbedHtml(webview: vscode.Webview, nonce: string): string {
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>T3 Code</title>
  </head>
  <body>
    <p>Embedded T3 assets are missing.</p>
  </body>
</html>`;
}

function createNonce(): string {
  return Math.random().toString(36).slice(2);
}

function isT3WebviewMessage(message: unknown): message is { type: "vsmuxReady" } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "vsmuxReady"
  );
}

function toWebSocketOrigin(serverOrigin: string): string {
  return serverOrigin.replace(/^http/i, "ws");
}
