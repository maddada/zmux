import * as vscode from "vscode";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelHydrateMessage,
  WorkspacePanelSessionStateMessage,
  WorkspacePanelToExtensionMessage,
} from "../shared/workspace-panel-contract";
import { stripWorkspacePanelTransientFields } from "../shared/workspace-panel-contract";
import { getManagedT3WebDistPath } from "./managed-t3-paths";
import { logVSmuxDebug } from "./vsmux-debug-log";

const WORKSPACE_PANEL_TYPE = "vsmux.workspace";
const WORKSPACE_PANEL_TITLE = "VSmux";
const WORKSPACE_PANEL_FOCUS_CONTEXT = "vsmux.workspacePanelFocus";

type WorkspacePanelOptions = {
  context: vscode.ExtensionContext;
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

  await vscode.window.tabGroups.close(workspaceTabs, true);
  logVSmuxDebug("workspace.panel.closedRestoredTabs", {
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
    this.disposables.push(
      vscode.window.registerWebviewPanelSerializer(WORKSPACE_PANEL_TYPE, {
        deserializeWebviewPanel: async (webviewPanel) => {
          logVSmuxDebug("workspace.panel.disposingRestoredPanel", {
            active: webviewPanel.active,
            viewColumn: webviewPanel.viewColumn,
            visible: webviewPanel.visible,
          });
          webviewPanel.dispose();
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
    void this.setWorkspacePanelFocusContext(false);
  }

  public async reveal(): Promise<void> {
    const panel = this.getOrCreatePanel();
    logVSmuxDebug("workspace.panel.reveal", {
      active: panel.active,
      hasLatestMessage: this.latestMessage !== undefined,
      visible: panel.visible,
    });
    panel.reveal(vscode.ViewColumn.One, false);
  }

  public hide(): void {
    logVSmuxDebug("workspace.panel.hide", {
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
      logVSmuxDebug("workspace.panel.postMessageBuffered", {
        messageType: message.type,
      });
      return;
    }

    logVSmuxDebug("workspace.panel.postMessage", {
      messageType: message.type,
      visible: this.panel.visible,
    });
    await this.panel.webview.postMessage(message);
  }

  public isVisible(): boolean {
    return this.panel?.visible ?? false;
  }

  public getWebview(): vscode.Webview {
    return this.getOrCreatePanel().webview;
  }

  private getOrCreatePanel(): vscode.WebviewPanel {
    if (this.panel) {
      return this.panel;
    }

    const packagedEmbedRoot = vscode.Uri.joinPath(
      this.options.context.extensionUri,
      "out",
      "t3-embed",
    );
    const panel = vscode.window.createWebviewPanel(
      WORKSPACE_PANEL_TYPE,
      WORKSPACE_PANEL_TITLE,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [
          vscode.Uri.joinPath(this.options.context.extensionUri, "out", "workspace"),
          packagedEmbedRoot,
          vscode.Uri.file(getManagedT3WebDistPath(this.options.context)),
        ],
      },
    );
    logVSmuxDebug("workspace.panel.created", {
      retainContextWhenHidden: false,
      viewColumn: panel.viewColumn,
    });
    this.panel = panel;
    this.configurePanel(panel);
    return panel;
  }

  private configurePanel(panel: vscode.WebviewPanel): void {
    panel.title = WORKSPACE_PANEL_TITLE;
    panel.iconPath = vscode.Uri.joinPath(this.options.context.extensionUri, "media", "icon.svg");
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWorkspaceMessage(message)) {
        return;
      }
      if (message.type === "ready") {
        logVSmuxDebug("workspace.panel.ready", {
          hasLatestMessage: this.latestMessage !== undefined,
        });
        void this.postBufferedMessages(panel.webview);
        return;
      }
      void this.options.onMessage(message);
    });
    panel.webview.html = getWorkspaceHtml(
      panel.webview,
      this.options.context.extensionUri,
      this.latestRenderableMessage,
    );
    void this.syncWorkspacePanelFocusContext(panel);
    this.disposables.push(
      panel.onDidChangeViewState((event) => {
        logVSmuxDebug("workspace.panel.viewStateChanged", {
          active: event.webviewPanel.active,
          visible: event.webviewPanel.visible,
          viewColumn: event.webviewPanel.viewColumn,
        });
        void this.syncWorkspacePanelFocusContext(event.webviewPanel);
      }),
    );
    panel.onDidDispose(() => {
      logVSmuxDebug("workspace.panel.disposed", {
        wasActivePanel: this.panel === panel,
      });
      if (this.panel === panel) {
        this.panel = undefined;
      }
      void this.setWorkspacePanelFocusContext(false);
    });
  }

  private async postBufferedMessages(webview: vscode.Webview): Promise<void> {
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

  private async setWorkspacePanelFocusContext(isFocused: boolean): Promise<void> {
    if (this.panelFocusContext === isFocused) {
      return;
    }

    this.panelFocusContext = isFocused;
    await vscode.commands.executeCommand("setContext", WORKSPACE_PANEL_FOCUS_CONTEXT, isFocused);
  }
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
    `img-src ${webview.cspSource} data: http://127.0.0.1:*`,
    `font-src ${webview.cspSource} data: http://127.0.0.1:*`,
    `worker-src ${webview.cspSource} blob: http://127.0.0.1:*`,
    `connect-src ${webview.cspSource} ws://127.0.0.1:* http://127.0.0.1:*`,
    `frame-src ${webview.cspSource} data: blob:`,
  ].join("; ");
  const bootstrapScript = getWorkspaceBootstrapScript(bootstrapMessage);

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
    ${bootstrapScript}
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
  </body>
</html>`;
}

function getWorkspaceBootstrapScript(message?: WorkspaceRenderableMessage): string {
  const lines: string[] = [];
  if (message) {
    const serializedMessage = JSON.stringify(message).replace(/</g, "\\u003c");
    lines.push(`window.__VSMUX_WORKSPACE_BOOTSTRAP__ = ${serializedMessage};`);
  }
  if (lines.length === 0) {
    return "";
  }

  return `<script>${lines.join("")}</script>`;
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
  if (message.type === "workspaceDebugLog") {
    return typeof message.event === "string" && message.event.length > 0;
  }
  if (message.type === "reloadWorkspacePanel") {
    return true;
  }
  if (message.type === "reloadT3Session") {
    return typeof message.sessionId === "string" && message.sessionId.length > 0;
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
    message.type === "focusSession" ||
    message.type === "closeSession" ||
    message.type === "fullReloadSession" ||
    message.type === "promptRenameSession" ||
    message.type === "forkSession"
  ) {
    return typeof message.sessionId === "string" && message.sessionId.length > 0;
  }
  if (message.type === "setSessionSleeping") {
    return (
      typeof message.sessionId === "string" &&
      message.sessionId.length > 0 &&
      typeof message.sleeping === "boolean"
    );
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

function getOptionalVscodeConstructor(name: string): Function | undefined {
  const candidate =
    name in (vscode as object) ? (vscode as unknown as Record<string, unknown>)[name] : undefined;
  return typeof candidate === "function" ? candidate : undefined;
}

export { WORKSPACE_PANEL_TYPE };
