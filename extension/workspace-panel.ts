import * as vscode from "vscode";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelHydrateMessage,
  WorkspacePanelSessionStateMessage,
  WorkspacePanelToExtensionMessage,
} from "../shared/workspace-panel-contract";
import { stripWorkspacePanelTransientFields } from "../shared/workspace-panel-contract";
import { getManagedT3WebDistPath } from "./managed-t3-paths";
import { focusEditorGroupByIndex, getDefaultWorkspaceCwd } from "./terminal-workspace-environment";
import { logzmuxDebug } from "./zmux-debug-log";
import { appendWorkspacePanelBlankGrayReproLog } from "./workspace-panel-blank-gray-repro-log";
import { appendWorkspacePanelStartupReproLog } from "./workspace-panel-startup-repro-log";

const WORKSPACE_PANEL_TYPE = "zmux.workspace";
const WORKSPACE_PANEL_TITLE = "zmux";
const WORKSPACE_PANEL_FOCUS_CONTEXT = "zmux.workspacePanelFocus";
const OPEN_EDITOR_AT_INDEX_COMMAND_PREFIX = "workbench.action.openEditorAtIndex";
const UNPIN_EDITOR_COMMAND = "workbench.action.unpinEditor";

let activeWorkspacePanelManager: WorkspacePanelManager | undefined;

type WorkspacePanelOptions = {
  context: vscode.ExtensionContext;
  onDidDispose?: () => Promise<void> | void;
  onDidReady?: () => Promise<void> | void;
  onMessage: (message: WorkspacePanelToExtensionMessage) => Promise<void> | void;
};

type WorkspaceRenderableMessage = WorkspacePanelHydrateMessage | WorkspacePanelSessionStateMessage;

export async function closeWorkspacePanelTabs(
  tabGroups: readonly vscode.TabGroup[] = vscode.window.tabGroups.all,
): Promise<number> {
  const workspaceTabs = tabGroups.flatMap((group) =>
    group.tabs.filter((tab) => getTabWebviewViewType(tab.input) === WORKSPACE_PANEL_TYPE),
  );
  if (workspaceTabs.length === 0) {
    return 0;
  }

  await unpinWorkspaceTabs(workspaceTabs, tabGroups);
  await vscode.window.tabGroups.close(workspaceTabs, true);
  logzmuxDebug("workspace.panel.closedRestoredTabs", {
    closedTabCount: workspaceTabs.length,
    viewColumns: workspaceTabs.map((tab) => tab.group.viewColumn),
  });
  return workspaceTabs.length;
}

export class WorkspacePanelManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private latestMessage: ExtensionToWorkspacePanelMessage | undefined;
  private latestRenderableMessage: WorkspaceRenderableMessage | undefined;
  private panelFocusContext = false;
  private panel: vscode.WebviewPanel | undefined;
  public constructor(private readonly options: WorkspacePanelOptions) {
    activeWorkspacePanelManager = this;
    this.disposables.push(
      vscode.window.registerWebviewPanelSerializer(WORKSPACE_PANEL_TYPE, {
        deserializeWebviewPanel: async (webviewPanel) => {
          if (this.panel && this.panel !== webviewPanel) {
            logzmuxDebug("workspace.panel.disposingDuplicateRestoredPanel", {
              active: webviewPanel.active,
              existingViewColumn: this.panel.viewColumn,
              viewColumn: webviewPanel.viewColumn,
              visible: webviewPanel.visible,
            });
            webviewPanel.dispose();
            return;
          }

          logzmuxDebug("workspace.panel.disposingRestoredPanelForFreshResourceRoots", {
            active: webviewPanel.active,
            viewColumn: webviewPanel.viewColumn,
            visible: webviewPanel.visible,
          });
          void appendWorkspacePanelStartupReproLog(
            getDefaultWorkspaceCwd(),
            "workspace.panel.disposingRestoredPanelForFreshResourceRoots",
            {
              active: webviewPanel.active,
              hasLatestMessage: this.latestMessage !== undefined,
              hasLatestRenderableMessage: this.latestRenderableMessage !== undefined,
              viewColumn: webviewPanel.viewColumn,
              visible: webviewPanel.visible,
            },
          );
          void appendWorkspacePanelBlankGrayReproLog(
            getDefaultWorkspaceCwd(),
            "workspace.panel.disposingRestoredPanelForFreshResourceRoots",
            {
              active: webviewPanel.active,
              hasLatestMessage: this.latestMessage !== undefined,
              hasLatestRenderableMessage: this.latestRenderableMessage !== undefined,
              viewColumn: webviewPanel.viewColumn,
              visible: webviewPanel.visible,
            },
          );
          const shouldRecreateVisiblePanel = webviewPanel.active || webviewPanel.visible;
          const targetViewColumn = webviewPanel.viewColumn ?? vscode.ViewColumn.One;
          webviewPanel.dispose();
          if (shouldRecreateVisiblePanel) {
            await this.recreatePanelAfterRestoredResourceFailure(targetViewColumn);
          }
        },
      }),
    );
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    this.panel?.dispose();
    this.panel = undefined;
    if (activeWorkspacePanelManager === this) {
      activeWorkspacePanelManager = undefined;
    }
    void this.setWorkspacePanelFocusContext(false);
  }

  public async reveal(): Promise<void> {
    const panel = await this.getOrCreatePanelForReveal();
    if (!panel) {
      return;
    }

    const revealedExistingTab = await this.revealExistingWorkspaceTab(panel);
    logzmuxDebug("workspace.panel.reveal", {
      active: panel.active,
      hasLatestMessage: this.latestMessage !== undefined,
      revealedExistingTab,
      visible: panel.visible,
    });
    if (!revealedExistingTab) {
      panel.reveal(panel.viewColumn ?? vscode.ViewColumn.Active, false);
    }
  }

  public async revealInBackground(): Promise<boolean> {
    if (!this.panel) {
      return false;
    }

    this.panel.reveal(this.panel.viewColumn ?? vscode.ViewColumn.Active, true);
    logzmuxDebug("workspace.panel.revealInBackground", {
      active: this.panel.active,
      visible: this.panel.visible,
      viewColumn: this.panel.viewColumn,
    });
    return true;
  }

  public hide(): void {
    logzmuxDebug("workspace.panel.hide", {
      hadPanel: this.panel !== undefined,
    });
    this.panel?.dispose();
    this.panel = undefined;
    void this.setWorkspacePanelFocusContext(false);
  }

  public async postMessage(message: ExtensionToWorkspacePanelMessage): Promise<void> {
    this.latestMessage = stripWorkspacePanelTransientFields(message);
    if (isWorkspaceRenderableMessage(this.latestMessage)) {
      this.latestRenderableMessage = this.latestMessage;
    }
    if (!this.panel) {
      logzmuxDebug("workspace.panel.postMessageBuffered", {
        messageType: message.type,
      });
      void appendWorkspacePanelStartupReproLog(
        getDefaultWorkspaceCwd(),
        "workspace.panel.postMessageBuffered",
        {
          hasRenderableMessage: isWorkspaceRenderableMessage(this.latestMessage),
          messageType: message.type,
        },
      );
      return;
    }

    logzmuxDebug("workspace.panel.postMessage", {
      messageType: message.type,
      visible: this.panel.visible,
    });
    await this.panel.webview.postMessage(message);
  }

  public isVisible(): boolean {
    return this.panel?.visible ?? false;
  }

  public isFocused(): boolean {
    return this.panelFocusContext;
  }

  public isActiveEditorTab(
    activeGroup: vscode.TabGroup | undefined = vscode.window.tabGroups.activeTabGroup,
  ): boolean {
    if (activeGroup?.viewColumn === undefined) {
      return false;
    }

    return getTabWebviewViewType(activeGroup.activeTab?.input) === WORKSPACE_PANEL_TYPE;
  }

  public getWebview(): vscode.Webview {
    return this.getOrCreatePanel().webview;
  }

  private async getOrCreatePanelForReveal(): Promise<vscode.WebviewPanel | undefined> {
    if (this.panel) {
      return this.panel;
    }

    const existingWorkspaceTab = findWorkspaceTab(vscode.window.tabGroups.all);
    if (existingWorkspaceTab) {
      const targetViewColumn = existingWorkspaceTab.group.viewColumn ?? vscode.ViewColumn.One;
      const closedTabCount = await closeWorkspacePanelTabs();
      logzmuxDebug("workspace.panel.replacedExistingTabWithoutPanel", {
        closedTabCount,
        hasLatestMessage: this.latestMessage !== undefined,
        targetViewColumn,
      });
      const panel = this.getOrCreatePanel(targetViewColumn);
      await this.pinWorkspaceTab();
      return panel;
    }

    const panel = this.getOrCreatePanel();
    await this.pinWorkspaceTab();
    return panel;
  }

  private getOrCreatePanel(
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One,
  ): vscode.WebviewPanel {
    if (this.panel) {
      return this.panel;
    }

    const panel = vscode.window.createWebviewPanel(
      WORKSPACE_PANEL_TYPE,
      WORKSPACE_PANEL_TITLE,
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.options.context.extensionUri, "out", "workspace"),
          vscode.Uri.joinPath(this.options.context.extensionUri, "out", "t3code-embed"),
          vscode.Uri.file(getManagedT3WebDistPath("t3code", this.options.context)),
        ],
      },
    );
    logzmuxDebug("workspace.panel.created", {
      retainContextWhenHidden: true,
      viewColumn: panel.viewColumn,
    });
    void appendWorkspacePanelBlankGrayReproLog(
      getDefaultWorkspaceCwd(),
      "workspace.panel.created",
      {
        active: panel.active,
        hasLatestMessage: this.latestMessage !== undefined,
        hasLatestRenderableMessage: this.latestRenderableMessage !== undefined,
        retainContextWhenHidden: true,
        viewColumn: panel.viewColumn,
        visible: panel.visible,
      },
    );
    this.panel = panel;
    this.configurePanel(panel);
    return panel;
  }

  /**
   * CDXC:Workspace-panel 2026-04-24-19:20
   * Restored VS Code webviews can retain stale resource authorization and return 401 for
   * extension-bundled JS. Recreate visible restored panels so workspace.js loads with fresh roots.
   */
  private async recreatePanelAfterRestoredResourceFailure(
    viewColumn: vscode.ViewColumn,
  ): Promise<void> {
    await closeWorkspacePanelTabs();
    const panel = this.getOrCreatePanel(viewColumn);
    await this.pinWorkspaceTab();
    panel.reveal(viewColumn, false);
  }

  private configurePanel(panel: vscode.WebviewPanel): void {
    panel.title = WORKSPACE_PANEL_TITLE;
    panel.iconPath = vscode.Uri.joinPath(this.options.context.extensionUri, "media", "icon.svg");
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWorkspaceMessage(message)) {
        return;
      }
      if (message.type === "ready") {
        logzmuxDebug("workspace.panel.ready", {
          hasLatestMessage: this.latestMessage !== undefined,
        });
        void appendWorkspacePanelStartupReproLog(
          getDefaultWorkspaceCwd(),
          this.latestRenderableMessage
            ? "workspace.panel.ready"
            : "workspace.panel.ready.missingRenderableState",
          {
            active: panel.active,
            hasLatestMessage: this.latestMessage !== undefined,
            hasLatestRenderableMessage: this.latestRenderableMessage !== undefined,
            visible: panel.visible,
          },
        );
        void appendWorkspacePanelBlankGrayReproLog(
          getDefaultWorkspaceCwd(),
          "workspace.panel.ready",
          {
            active: panel.active,
            hasLatestMessage: this.latestMessage !== undefined,
            hasLatestRenderableMessage: this.latestRenderableMessage !== undefined,
            visible: panel.visible,
          },
        );
        void this.postBufferedMessages(panel.webview);
        void this.options.onDidReady?.();
        return;
      }
      void this.options.onMessage(message);
    });
    panel.webview.html = getWorkspaceHtml(
      panel.webview,
      this.options.context.extensionUri,
      this.latestRenderableMessage,
    );
    void appendWorkspacePanelBlankGrayReproLog(
      getDefaultWorkspaceCwd(),
      "workspace.panel.htmlAssigned",
      {
        active: panel.active,
        bootstrapMessageType: this.latestRenderableMessage?.type,
        hasLatestMessage: this.latestMessage !== undefined,
        hasLatestRenderableMessage: this.latestRenderableMessage !== undefined,
        visible: panel.visible,
      },
    );
    void appendWorkspacePanelStartupReproLog(
      getDefaultWorkspaceCwd(),
      "workspace.panel.configurePanel",
      {
        active: panel.active,
        hasLatestMessage: this.latestMessage !== undefined,
        hasLatestRenderableMessage: this.latestRenderableMessage !== undefined,
        visible: panel.visible,
      },
    );
    void this.syncWorkspacePanelFocusContext(panel);
    this.disposables.push(
      panel.onDidChangeViewState((event) => {
        logzmuxDebug("workspace.panel.viewStateChanged", {
          active: event.webviewPanel.active,
          visible: event.webviewPanel.visible,
          viewColumn: event.webviewPanel.viewColumn,
        });
        void appendWorkspacePanelBlankGrayReproLog(
          getDefaultWorkspaceCwd(),
          "workspace.panel.viewStateChanged",
          {
            active: event.webviewPanel.active,
            visible: event.webviewPanel.visible,
            viewColumn: event.webviewPanel.viewColumn,
          },
        );
        void this.syncWorkspacePanelFocusContext(event.webviewPanel);
      }),
    );
    panel.onDidDispose(() => {
      logzmuxDebug("workspace.panel.disposed", {
        wasActivePanel: this.panel === panel,
      });
      if (this.panel === panel) {
        this.panel = undefined;
      }
      void this.setWorkspacePanelFocusContext(false);
      void this.options.onDidDispose?.();
    });
  }

  private async postBufferedMessages(webview: vscode.Webview): Promise<void> {
    void appendWorkspacePanelBlankGrayReproLog(
      getDefaultWorkspaceCwd(),
      "workspace.panel.postBufferedMessages",
      {
        latestMessageType: this.latestMessage?.type,
        latestRenderableMessageType: this.latestRenderableMessage?.type,
      },
    );
    void appendWorkspacePanelStartupReproLog(
      getDefaultWorkspaceCwd(),
      "workspace.panel.postBufferedMessages",
      {
        latestMessageType: this.latestMessage?.type,
        latestRenderableMessageType: this.latestRenderableMessage?.type,
      },
    );
    if (this.latestRenderableMessage) {
      await webview.postMessage(this.latestRenderableMessage);
    }
    if (this.latestMessage && this.latestMessage !== this.latestRenderableMessage) {
      await webview.postMessage(this.latestMessage);
    }
  }

  private async syncWorkspacePanelFocusContext(panel: vscode.WebviewPanel): Promise<void> {
    await this.setWorkspacePanelFocusContext(panel.active && panel.visible);
  }

  private async revealExistingWorkspaceTab(panel?: vscode.WebviewPanel): Promise<boolean> {
    const workspaceTab = findWorkspaceTab(vscode.window.tabGroups.all, panel?.viewColumn);
    if (!workspaceTab) {
      return false;
    }

    return this.revealWorkspaceTab(workspaceTab);
  }

  private async revealWorkspaceTab(workspaceTab: vscode.Tab): Promise<boolean> {
    const targetViewColumn = workspaceTab.group.viewColumn;
    if (targetViewColumn === undefined) {
      return false;
    }

    await focusEditorGroupByIndex(targetViewColumn - 1);
    const liveWorkspaceTab =
      findWorkspaceTab(vscode.window.tabGroups.all, targetViewColumn) ?? workspaceTab;
    const tabIndex = liveWorkspaceTab.group.tabs.indexOf(liveWorkspaceTab);
    if (tabIndex >= 0 && tabIndex < 9) {
      await vscode.commands.executeCommand(`${OPEN_EDITOR_AT_INDEX_COMMAND_PREFIX}${tabIndex + 1}`);
      return true;
    }

    return false;
  }

  private async pinWorkspaceTab(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.pinEditor");
  }

  private async setWorkspacePanelFocusContext(isFocused: boolean): Promise<void> {
    if (this.panelFocusContext === isFocused) {
      return;
    }

    this.panelFocusContext = isFocused;
    await vscode.commands.executeCommand("setContext", WORKSPACE_PANEL_FOCUS_CONTEXT, isFocused);
  }
}

export async function revealWorkspacePanelInBackground(): Promise<boolean> {
  return (await activeWorkspacePanelManager?.revealInBackground()) ?? false;
}

function getWorkspaceHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  bootstrapMessage?: WorkspaceRenderableMessage,
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "out", "workspace", "workspace.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "out", "workspace", "style.css"),
  );
  const nonce = getNonce();
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline' http://127.0.0.1:*`,
    `script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval' 'wasm-unsafe-eval' http://127.0.0.1:*`,
    `img-src ${webview.cspSource} data: blob: http://127.0.0.1:*`,
    `font-src ${webview.cspSource} data: http://127.0.0.1:*`,
    `worker-src ${webview.cspSource} blob: http://127.0.0.1:*`,
    `connect-src ${webview.cspSource} ws://127.0.0.1:* http://127.0.0.1:*`,
    `frame-src ${webview.cspSource} data: blob:`,
  ].join("; ");
  const bootstrapScript = getWorkspaceBootstrapScript(bootstrapMessage, nonce);
  const earlyDiagnosticsScript = getWorkspaceEarlyDiagnosticsScript(bootstrapMessage, nonce);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${WORKSPACE_PANEL_TITLE}</title>
    <style>
      html,
      body,
      #root {
        background: #121212;
        height: 100%;
        margin: 0;
      }
    </style>
    <link href="${styleUri}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    ${earlyDiagnosticsScript}
    ${bootstrapScript}
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
  </body>
</html>`;
}

function getWorkspaceEarlyDiagnosticsScript(
  message: WorkspaceRenderableMessage | undefined,
  nonce: string,
): string {
  const bootstrapSummary = JSON.stringify(summarizeBootstrapMessage(message)).replace(
    /</g,
    "\\u003c",
  );

  return `<script nonce="${nonce}">
(function () {
  var vscodeApi = window.__zmux_WORKSPACE_VSCODE__ || acquireVsCodeApi();
  window.__zmux_WORKSPACE_VSCODE__ = vscodeApi;
  var bootStartedAt = Date.now();
  var bootstrapSummary = ${bootstrapSummary};
  function describeRoot() {
    var root = document.getElementById("root");
    return {
      childElementCount: root ? root.childElementCount : undefined,
      hasRoot: !!root,
      rootTextLength: root && root.textContent ? root.textContent.length : 0
    };
  }
  function post(event, details) {
    try {
      vscodeApi.postMessage({
        details: Object.assign({
          appMounted: window.__zmux_WORKSPACE_APP_MOUNTED__ === true,
          bootstrap: bootstrapSummary,
          documentReadyState: document.readyState,
          elapsedMs: Date.now() - bootStartedAt,
          hidden: document.hidden,
          reactRenderScheduled: window.__zmux_WORKSPACE_REACT_RENDER_SCHEDULED__ === true,
          readyPosted: window.__zmux_WORKSPACE_READY_POSTED__ === true,
          root: describeRoot(),
          visibilityState: document.visibilityState
        }, details || {}),
        event: event,
        type: "workspaceDebugLog"
      });
    } catch (_error) {}
  }
  window.__zmux_WORKSPACE_EARLY_LOG__ = post;
  window.addEventListener("error", function (event) {
    post("workspaceStartup.windowError", {
      colno: event.colno,
      filename: event.filename,
      lineno: event.lineno,
      message: event.message
    });
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    post("workspaceStartup.unhandledRejection", {
      message: reason && reason.message ? String(reason.message) : String(reason),
      name: reason && reason.name ? String(reason.name) : undefined,
      stack: reason && reason.stack ? String(reason.stack) : undefined
    });
  });
  document.addEventListener("DOMContentLoaded", function () {
    post("workspaceStartup.domContentLoaded");
  }, { once: true });
  window.addEventListener("load", function () {
    post("workspaceStartup.windowLoaded");
  }, { once: true });
  post("workspaceStartup.htmlBoot");
  window.setTimeout(function () {
    post("workspaceStartup.earlyCheckpoint");
  }, 1500);
})();
</script>`;
}

function summarizeBootstrapMessage(message: WorkspaceRenderableMessage | undefined) {
  return {
    activeGroupId: message?.activeGroupId,
    focusedSessionId: message?.focusedSessionId,
    paneCount: message?.panes.length ?? 0,
    paneIds: message?.panes.map((pane) => pane.sessionId) ?? [],
    type: message?.type,
  };
}

function getWorkspaceBootstrapScript(
  message: WorkspaceRenderableMessage | undefined,
  nonce: string,
): string {
  const lines: string[] = [];
  if (message) {
    const serializedMessage = JSON.stringify(message).replace(/</g, "\\u003c");
    lines.push(`window.__zmux_WORKSPACE_BOOTSTRAP__ = ${serializedMessage};`);
  }
  if (lines.length === 0) {
    return "";
  }

  return `<script nonce="${nonce}">${lines.join("")}</script>`;
}

function isWorkspaceRenderableMessage(
  message: ExtensionToWorkspacePanelMessage,
): message is WorkspaceRenderableMessage {
  return message.type === "hydrate" || message.type === "sessionState";
}

function isWorkspaceMessage(candidate: unknown): candidate is WorkspacePanelToExtensionMessage {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const message = candidate as Partial<WorkspacePanelToExtensionMessage>;
  if (message.type === "ready") {
    return true;
  }
  if (message.type === "createSession") {
    return true;
  }
  if (message.type === "workspaceDebugLog") {
    return typeof message.event === "string" && message.event.length > 0;
  }
  if (message.type === "reloadWorkspacePanel") {
    return true;
  }
  if (message.type === "attachToIde") {
    return true;
  }
  if (message.type === "reloadT3Session") {
    return typeof message.sessionId === "string" && message.sessionId.length > 0;
  }
  if (message.type === "resolveClipboardImagePath") {
    return (
      typeof message.path === "string" &&
      message.path.length > 0 &&
      typeof message.requestId === "number" &&
      Number.isFinite(message.requestId) &&
      typeof message.sessionId === "string" &&
      message.sessionId.length > 0
    );
  }
  if (message.type === "readNativeClipboardPayload") {
    return (
      typeof message.requestId === "number" &&
      Number.isFinite(message.requestId) &&
      typeof message.sessionId === "string" &&
      message.sessionId.length > 0
    );
  }
  if (message.type === "completeWelcome") {
    return true;
  }
  if (message.type === "applyCodexTerminalTitle") {
    return true;
  }
  if (message.type === "applyCodexStatusLine") {
    return true;
  }
  if (message.type === "t3ThreadChanged") {
    return (
      typeof message.sessionId === "string" &&
      message.sessionId.length > 0 &&
      typeof message.threadId === "string" &&
      message.threadId.length > 0 &&
      (message.title === undefined || typeof message.title === "string")
    );
  }
  if (
    message.type === "acknowledgeSessionAttention" ||
    message.type === "focusSession" ||
    message.type === "closeSession" ||
    message.type === "fullReloadSession" ||
    message.type === "cancelFirstPromptAutoRename" ||
    message.type === "promptRenameSession" ||
    message.type === "forkSession"
  ) {
    return (
      typeof message.sessionId === "string" &&
      message.sessionId.length > 0 &&
      (message.type !== "acknowledgeSessionAttention" ||
        message.reason === "click" ||
        message.reason === "escape" ||
        message.reason === "focusDwell" ||
        message.reason === "typing")
    );
  }
  if (message.type === "setSessionSleeping") {
    return (
      typeof message.sessionId === "string" &&
      message.sessionId.length > 0 &&
      typeof message.sleeping === "boolean"
    );
  }
  if (message.type === "adjustTerminalFontSize") {
    return message.delta === -1 || message.delta === 1;
  }
  if (message.type === "resetTerminalFontSize") {
    return true;
  }
  if (message.type === "adjustT3ZoomPercent") {
    return message.delta === -1 || message.delta === 1;
  }
  if (message.type === "resetT3ZoomPercent") {
    return true;
  }
  if (message.type === "syncPaneOrder" || message.type === "syncSessionOrder") {
    return (
      typeof message.groupId === "string" &&
      message.groupId.length > 0 &&
      Array.isArray(message.sessionIds) &&
      message.sessionIds.every((sessionId) => typeof sessionId === "string" && sessionId.length > 0)
    );
  }

  return false;
}

function getNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function getTabWebviewViewType(input: unknown): string | undefined {
  const webviewInputConstructor = getOptionalVscodeConstructor("TabInputWebview");
  if (
    typeof webviewInputConstructor !== "function" ||
    !(input instanceof webviewInputConstructor)
  ) {
    return undefined;
  }

  return (input as vscode.TabInputWebview).viewType;
}

async function unpinWorkspaceTabs(
  tabs: readonly vscode.Tab[],
  fallbackTabGroups: readonly vscode.TabGroup[],
): Promise<void> {
  /**
   * CDXC:WorkspacePanel 2026-04-23-15:00
   * VS Code can restore multiple pinned zmux tabs across editor groups. We must
   * unpin each restored workspace tab before closing it so a fresh reveal does
   * not leave duplicate pinned tabs behind or fail to clear the stale restore.
   */
  for (const tab of tabs) {
    const targetViewColumn = tab.group.viewColumn;
    if (targetViewColumn === undefined) {
      continue;
    }

    await focusEditorGroupByIndex(targetViewColumn - 1);
    const liveTabIndex =
      findWorkspaceTabIndex(vscode.window.tabGroups.all, tab, targetViewColumn) ??
      findWorkspaceTabIndex(fallbackTabGroups, tab, targetViewColumn) ??
      -1;
    if (liveTabIndex < 0 || liveTabIndex >= 9) {
      continue;
    }

    await vscode.commands.executeCommand(
      `${OPEN_EDITOR_AT_INDEX_COMMAND_PREFIX}${liveTabIndex + 1}`,
    );
    await vscode.commands.executeCommand(UNPIN_EDITOR_COMMAND);
  }
}

function findWorkspaceTab(
  tabGroups: readonly vscode.TabGroup[],
  preferredViewColumn?: vscode.ViewColumn,
): vscode.Tab | undefined {
  if (preferredViewColumn !== undefined) {
    const preferredGroup = tabGroups.find((group) => group.viewColumn === preferredViewColumn);
    const preferredTab = preferredGroup?.tabs.find(
      (tab) => getTabWebviewViewType(tab.input) === WORKSPACE_PANEL_TYPE,
    );
    if (preferredTab) {
      return preferredTab;
    }
  }

  return tabGroups
    .filter((group) => group.viewColumn !== undefined)
    .flatMap((group) => group.tabs)
    .find((tab) => getTabWebviewViewType(tab.input) === WORKSPACE_PANEL_TYPE);
}

function findWorkspaceTabIndex(
  tabGroups: readonly vscode.TabGroup[],
  originalTab: vscode.Tab,
  viewColumn: vscode.ViewColumn,
): number | undefined {
  const liveGroup = tabGroups.find((group) => group.viewColumn === viewColumn);
  if (!liveGroup) {
    return undefined;
  }

  const originalGroupTabs = Array.isArray(originalTab.group.tabs)
    ? originalTab.group.tabs
    : undefined;
  const originalIndex = originalGroupTabs?.indexOf(originalTab) ?? -1;
  const liveTabAtOriginalIndex = originalIndex >= 0 ? liveGroup.tabs[originalIndex] : undefined;
  if (getTabWebviewViewType(liveTabAtOriginalIndex?.input) === WORKSPACE_PANEL_TYPE) {
    return originalIndex;
  }

  const fallbackIndex = liveGroup.tabs.findIndex(
    (tab) => getTabWebviewViewType(tab.input) === WORKSPACE_PANEL_TYPE,
  );
  return fallbackIndex >= 0 ? fallbackIndex : undefined;
}

function getOptionalVscodeConstructor(name: string): Function | undefined {
  const candidate =
    name in (vscode as object) ? (vscode as unknown as Record<string, unknown>)[name] : undefined;
  return typeof candidate === "function" ? candidate : undefined;
}

export { WORKSPACE_PANEL_TYPE };
