import * as vscode from "vscode";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelToExtensionMessage,
} from "../shared/workspace-panel-contract";
import { stripWorkspacePanelTransientFields } from "../shared/workspace-panel-contract";

const WORKSPACE_PANEL_TYPE = "vsmux.workspace";
const WORKSPACE_PANEL_TITLE = "VSmux";

type WorkspacePanelOptions = {
  context: vscode.ExtensionContext;
  onMessage: (message: WorkspacePanelToExtensionMessage) => Promise<void> | void;
};

export class WorkspacePanelManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private latestMessage: ExtensionToWorkspacePanelMessage | undefined;
  private panel: vscode.WebviewPanel | undefined;

  public constructor(private readonly options: WorkspacePanelOptions) {
    this.disposables.push(
      vscode.window.registerWebviewPanelSerializer(WORKSPACE_PANEL_TYPE, {
        deserializeWebviewPanel: async (webviewPanel) => {
          if (!(await this.tryAdoptPanel(webviewPanel))) {
            return;
          }
          this.panel = webviewPanel;
          this.configurePanel(webviewPanel);
          if (this.latestMessage) {
            await webviewPanel.webview.postMessage(this.latestMessage);
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
  }

  public async reveal(): Promise<void> {
    const panel = this.getOrCreatePanel();
    panel.reveal(vscode.ViewColumn.One, false);
    if (this.latestMessage) {
      await panel.webview.postMessage(this.latestMessage);
    }
  }

  public hide(): void {
    this.panel?.dispose();
    this.panel = undefined;
  }

  public async postMessage(message: ExtensionToWorkspacePanelMessage): Promise<void> {
    this.latestMessage = stripWorkspacePanelTransientFields(message);
    if (!this.panel) {
      return;
    }

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

    const panel = vscode.window.createWebviewPanel(
      WORKSPACE_PANEL_TYPE,
      WORKSPACE_PANEL_TITLE,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.options.context.extensionUri, "out", "workspace"),
          vscode.Uri.joinPath(this.options.context.extensionUri, "forks", "t3code-embed", "dist"),
        ],
      },
    );
    this.panel = panel;
    this.configurePanel(panel);
    return panel;
  }

  private async tryAdoptPanel(panel: vscode.WebviewPanel): Promise<boolean> {
    if (!this.panel || this.panel === panel) {
      return true;
    }

    if (panel.active || panel.visible) {
      this.panel.reveal(panel.viewColumn ?? vscode.ViewColumn.Active, false);
    }
    panel.dispose();
    return false;
  }

  private configurePanel(panel: vscode.WebviewPanel): void {
    panel.title = WORKSPACE_PANEL_TITLE;
    panel.iconPath = vscode.Uri.joinPath(this.options.context.extensionUri, "media", "icon.svg");
    panel.webview.html = getWorkspaceHtml(panel.webview, this.options.context.extensionUri);
    panel.onDidDispose(() => {
      if (this.panel === panel) {
        this.panel = undefined;
      }
    });
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWorkspaceMessage(message)) {
        return;
      }
      if (message.type === "workspaceDebugLog") {
        void this.options.onMessage(message);
        return;
      }
      if (message.type === "ready") {
        if (this.latestMessage) {
          void panel.webview.postMessage(this.latestMessage);
        }
        return;
      }
      void this.options.onMessage(message);
    });
  }
}

function getWorkspaceHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${WORKSPACE_PANEL_TITLE}</title>
    <link href="${styleUri}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
  </body>
</html>`;
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
    return (
      typeof message.event === "string" &&
      message.event.length > 0 &&
      (message.details === undefined || typeof message.details === "string")
    );
  }
  if (message.type === "focusSession" || message.type === "closeSession") {
    return typeof message.sessionId === "string" && message.sessionId.length > 0;
  }
  if (message.type === "syncSessionOrder") {
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

export { WORKSPACE_PANEL_TYPE };
