import * as vscode from "vscode";
import { COMPLETION_SOUND_OPTIONS, getCompletionSoundFileName } from "../shared/completion-sound";
import type {
  ExtensionToSidebarMessage,
  SidebarToExtensionMessage,
} from "../shared/session-grid-contract";
import { logVSmuxDebug } from "./vsmux-debug-log";

const EXTENSION_ID = "maddada.VSmux";

type SessionSidebarViewOptions = {
  onDidResolveView?: () => void | Promise<void>;
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

        if (message.type === "sidebarDebugLog") {
          logVSmuxDebug(`sidebar.webview.${message.event}`, message.details);
          return;
        }

        if (message.type === "promptRenameSession") {
          logVSmuxDebug("sidebar.webview.received.promptRenameSession", {
            sessionId: message.sessionId,
          });
        }
        void this.options.onMessage(message);
      }),
    );

    void this.options.onDidResolveView?.();

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
    <p>Unable to resolve the VSmux extension assets.</p>
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
      window.__VSMUX_SOUND_URLS__ = ${soundUrlsJson};
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

  return vscode.extensions.all.find((extension) => extension.packageJSON.name === "VSmux")
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
      return true;
    case "sidebarDebugLog":
      return (
        typeof message.event === "string" &&
        message.event.length > 0 &&
        (message.details === undefined || typeof message.details === "string")
      );
    case "openSettings":
    case "toggleCompletionBell":
    case "toggleVsMuxDisabled":
    case "moveSidebarToOtherSide":
    case "createSession":
    case "openBrowser":
      return true;
    case "toggleFullscreenSession":
      return true;

    case "runSidebarCommand":
    case "deleteSidebarCommand":
      return typeof message.commandId === "string" && message.commandId.length > 0;

    case "syncSidebarCommandOrder":
      return (
        Array.isArray(message.commandIds) &&
        message.commandIds.every(
          (commandId) => typeof commandId === "string" && commandId.length > 0,
        )
      );

    case "runSidebarAgent":
    case "deleteSidebarAgent":
      return typeof message.agentId === "string" && message.agentId.length > 0;

    case "syncSidebarAgentOrder":
      return (
        Array.isArray(message.agentIds) &&
        message.agentIds.every((agentId) => typeof agentId === "string" && agentId.length > 0)
      );

    case "createSessionInGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "focusGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "focusSession":
      return typeof message.sessionId === "string" && message.sessionId.length > 0;

    case "promptRenameSession":
    case "restartSession":
    case "closeSession":
    case "copyResumeCommand":
      return typeof message.sessionId === "string" && message.sessionId.length > 0;

    case "restorePreviousSession":
    case "deletePreviousSession":
      return typeof message.historyId === "string" && message.historyId.length > 0;

    case "clearGeneratedPreviousSessions":
      return true;

    case "saveScratchPad":
      return typeof message.content === "string";

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
      return typeof message.visibleCount === "number" && [1, 2].includes(message.visibleCount);

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
        message.groupId.length > 0 &&
        (message.targetIndex === undefined ||
          (typeof message.targetIndex === "number" &&
            Number.isInteger(message.targetIndex) &&
            message.targetIndex >= 0))
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

    case "saveSidebarCommand":
      return (
        (message.commandId === undefined ||
          (typeof message.commandId === "string" && message.commandId.length > 0)) &&
        typeof message.name === "string" &&
        typeof message.actionType === "string" &&
        ["browser", "terminal"].includes(message.actionType) &&
        typeof message.closeTerminalOnExit === "boolean" &&
        (message.command === undefined || typeof message.command === "string") &&
        (message.url === undefined || typeof message.url === "string")
      );

    case "saveSidebarAgent":
      return (
        (message.agentId === undefined ||
          (typeof message.agentId === "string" && message.agentId.length > 0)) &&
        typeof message.name === "string" &&
        typeof message.command === "string" &&
        (message.icon === undefined || typeof message.icon === "string")
      );

    default:
      return false;
  }
}
