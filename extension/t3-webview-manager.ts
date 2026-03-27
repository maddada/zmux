import * as vscode from "vscode";
import {
  isT3Session,
  type SessionRecord,
  type T3SessionRecord,
} from "../shared/session-grid-contract";
import {
  focusEditorGroupByIndex,
  getActiveEditorGroupViewColumn,
} from "./terminal-workspace-environment";
import { captureWorkbenchState } from "./session-layout-trace";
import { createWorkspaceTrace } from "./runtime-trace";
import { createT3PanelHtml, getEmbeddedT3Root } from "./t3-webview-manager/html";
import {
  T3_PANEL_TYPE,
  getObservedPanelViewColumn,
  getPanelTitle,
  getRenderKey,
  isT3WebviewMessage,
} from "./t3-webview-manager/helpers";

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
      const managedPanel = this.panelsBySessionId.get(sessionId);
      if (managedPanel) {
        managedPanel.panel.title = getPanelTitle(sessionRecord);
      }
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

  public async openSession(
    sessionRecord: T3SessionRecord,
    shouldFocusAfterReveal = true,
  ): Promise<void> {
    this.syncSessions([
      ...Array.from(this.sessionRecordBySessionId.values()).filter(
        (existingSessionRecord) => existingSessionRecord.sessionId !== sessionRecord.sessionId,
      ),
      sessionRecord,
    ]);
    const managedPanel = this.panelsBySessionId.get(sessionRecord.sessionId);
    const renderKey = getRenderKey(sessionRecord);
    const targetViewColumn =
      managedPanel?.panel.viewColumn ?? getActiveEditorGroupViewColumn() ?? 1;

    if (managedPanel && managedPanel.renderKey === renderKey) {
      managedPanel.panel.title = getPanelTitle(sessionRecord);
      managedPanel.panel.reveal(targetViewColumn, !shouldFocusAfterReveal);
      await this.logState("OPEN", "reuse-panel", {
        shouldFocusAfterReveal,
        sessionId: sessionRecord.sessionId,
        targetViewColumn,
      });
      return;
    }

    if (managedPanel) {
      this.disposeSession(sessionRecord.sessionId);
    }

    const nextManagedPanel = await this.createPanel(sessionRecord, renderKey, targetViewColumn);
    nextManagedPanel.panel.reveal(targetViewColumn, !shouldFocusAfterReveal);
    await this.logState("OPEN", "panel", {
      shouldFocusAfterReveal,
      sessionId: sessionRecord.sessionId,
      targetViewColumn,
    });
  }

  public hasLivePanel(sessionId: string): boolean {
    return this.panelsBySessionId.has(sessionId);
  }

  public getObservedViewColumn(sessionId: string): number | undefined {
    return this.panelsBySessionId.get(sessionId)?.panel.viewColumn;
  }

  public isSessionForegroundVisible(sessionId: string): boolean {
    return this.panelsBySessionId.get(sessionId)?.panel.visible ?? false;
  }

  public getLivePanelTitles(): string[] {
    return [...this.panelsBySessionId.values()].map((managedPanel) => managedPanel.panel.title);
  }

  public async revealSessionInGroup(
    sessionRecord: T3SessionRecord,
    targetGroupIndex: number,
    shouldFocusAfterReveal = true,
  ): Promise<boolean> {
    const targetViewColumn = targetGroupIndex + 1;
    const restoreViewColumn = shouldFocusAfterReveal ? undefined : getActiveEditorGroupViewColumn();
    await this.openSession(sessionRecord, shouldFocusAfterReveal);

    const managedPanel = this.panelsBySessionId.get(sessionRecord.sessionId);
    if (!managedPanel) {
      return false;
    }

    managedPanel.panel.reveal(targetViewColumn, !shouldFocusAfterReveal);
    if (!shouldFocusAfterReveal && restoreViewColumn && restoreViewColumn !== targetViewColumn) {
      await focusEditorGroupByIndex(restoreViewColumn - 1);
    }

    await this.logState("REVEAL", "panel-group", {
      shouldFocusAfterReveal,
      sessionId: sessionRecord.sessionId,
      targetGroupIndex,
    });
    return true;
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

  private async createPanel(
    sessionRecord: T3SessionRecord,
    renderKey: string,
    targetViewColumn: vscode.ViewColumn,
  ): Promise<ManagedPanel> {
    const panel = vscode.window.createWebviewPanel(
      T3_PANEL_TYPE,
      getPanelTitle(sessionRecord),
      {
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
  private async createPanelHtml(
    webview: vscode.Webview,
    sessionRecord: T3SessionRecord,
  ): Promise<string> {
    return createT3PanelHtml(webview, this.options.context, sessionRecord);
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
