import * as vscode from "vscode";
import { COMPLETION_SOUND_OPTIONS, getCompletionSoundFileName } from "../shared/completion-sound";
import type {
  ExtensionToSidebarMessage,
  SidebarToExtensionMessage,
} from "../shared/session-grid-contract";

const EXTENSION_ID = "maddada.VS-AGENT-MUX";

type SessionSidebarViewOptions = {
  onMessage: (message: SidebarToExtensionMessage) => void | Promise<void>;
};

export class SessionSidebarViewProvider implements vscode.Disposable, vscode.WebviewViewProvider {
  private readonly disposables: vscode.Disposable[] = [];
  private view: vscode.WebviewView | undefined;
  private latestMessage: ExtensionToSidebarMessage | undefined;

  public constructor(private readonly options: SessionSidebarViewOptions) {}

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    this.view = undefined;
  }

  public async postMessage(message: ExtensionToSidebarMessage): Promise<void> {
    if (message.type === "hydrate" || message.type === "sessionState") {
      this.latestMessage = message;
    }

    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage(message);
  }

  public async reveal(): Promise<void> {
    this.view?.show?.(true);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    const extensionUri = getExtensionUri();
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: extensionUri
        ? [
            vscode.Uri.joinPath(extensionUri, "media", "sounds"),
            vscode.Uri.joinPath(extensionUri, "out", "sidebar"),
          ]
        : undefined,
    };
    webviewView.webview.html = getSidebarHtml(webviewView.webview, extensionUri);

    this.disposables.push(
      webviewView.onDidDispose(() => {
        if (this.view === webviewView) {
          this.view = undefined;
        }
      }),
      webviewView.webview.onDidReceiveMessage((message: unknown) => {
        if (!isSidebarMessage(message)) {
          return;
        }

        void this.options.onMessage(message);
      }),
    );

    if (this.latestMessage) {
      void webviewView.webview.postMessage(this.latestMessage);
    }
  }
}

function getSidebarHtml(webview: vscode.Webview, extensionUri: vscode.Uri | undefined): string {
  if (!extensionUri) {
    return `<!DOCTYPE html>
<html lang="en">
  <body>
    <p>Unable to resolve the VS-AGENT-MUX extension assets.</p>
  </body>
</html>`;
  }

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "out", "sidebar", "sidebar.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "out", "sidebar", "sidebar.css"),
  );
  const nonce = getNonce();
  const soundUrls = Object.fromEntries(
    COMPLETION_SOUND_OPTIONS.map((option) => [
      option.value,
      webview
        .asWebviewUri(
          vscode.Uri.joinPath(
            extensionUri,
            "media",
            "sounds",
            getCompletionSoundFileName(option.value),
          ),
        )
        .toString(),
    ]),
  );
  const soundUrlsJson = JSON.stringify(soundUrls).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; img-src ${webview.cspSource} data:; media-src ${webview.cspSource};"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Sessions</title>
    <link href="${styleUri}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.__VS_AGENT_MUX_SOUND_URLS__ = ${soundUrlsJson};
    </script>
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
  </body>
</html>`;
}

function getExtensionUri(): vscode.Uri | undefined {
  const directMatch = vscode.extensions.getExtension(EXTENSION_ID);
  if (directMatch) {
    return directMatch.extensionUri;
  }

  return vscode.extensions.all.find((extension) => extension.packageJSON.name === "VS-AGENT-MUX")
    ?.extensionUri;
}

function getNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function isSidebarMessage(candidate: unknown): candidate is SidebarToExtensionMessage {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const message = candidate as Partial<SidebarToExtensionMessage>;
  switch (message.type) {
    case "ready":
    case "openSettings":
    case "toggleCompletionBell":
    case "createSession":
    case "toggleFullscreenSession":
      return true;

    case "createSessionInGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "focusGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "focusSession":
      return (
        typeof message.sessionId === "string" &&
        message.sessionId.length > 0 &&
        (message.preserveFocus === undefined || typeof message.preserveFocus === "boolean")
      );

    case "promptRenameSession":
    case "restartSession":
    case "closeSession":
      return typeof message.sessionId === "string" && message.sessionId.length > 0;

    case "renameSession":
      return (
        typeof message.sessionId === "string" &&
        message.sessionId.length > 0 &&
        typeof message.title === "string"
      );

    case "renameGroup":
      return (
        typeof message.groupId === "string" &&
        message.groupId.length > 0 &&
        typeof message.title === "string"
      );

    case "setVisibleCount":
      return (
        typeof message.visibleCount === "number" &&
        [1, 2, 3, 4, 6, 9].includes(message.visibleCount)
      );

    case "setViewMode":
      return (
        typeof message.viewMode === "string" &&
        ["horizontal", "vertical", "grid"].includes(message.viewMode)
      );

    case "moveSessionToGroup":
      return (
        typeof message.sessionId === "string" &&
        message.sessionId.length > 0 &&
        typeof message.groupId === "string" &&
        message.groupId.length > 0
      );

    case "createGroupFromSession":
      return typeof message.sessionId === "string" && message.sessionId.length > 0;

    case "syncSessionOrder":
      return (
        typeof message.groupId === "string" &&
        message.groupId.length > 0 &&
        Array.isArray(message.sessionIds) &&
        message.sessionIds.every(
          (sessionId) => typeof sessionId === "string" && sessionId.length > 0,
        )
      );

    case "closeGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "syncGroupOrder":
      return (
        Array.isArray(message.groupIds) &&
        message.groupIds.every((groupId) => typeof groupId === "string" && groupId.length > 0)
      );

    default:
      return false;
  }
}
