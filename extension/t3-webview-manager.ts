import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  isT3Session,
  type SessionGridSnapshot,
  type T3SessionRecord,
} from "../shared/session-grid-contract";
import { getViewColumn } from "./terminal-workspace-helpers";

type T3WebviewManagerOptions = {
  context: vscode.ExtensionContext;
  onDidFocusSession: (sessionId: string) => Promise<void>;
};

type ManagedPanel = {
  panel: vscode.WebviewPanel;
  sessionId: string;
};

const T3_PANEL_TYPE = "VSmux.t3Session";

export class T3WebviewManager implements vscode.Disposable {
  private readonly panelsBySessionId = new Map<string, ManagedPanel>();

  public constructor(private readonly options: T3WebviewManagerOptions) {}

  public dispose(): void {
    for (const managedPanel of this.panelsBySessionId.values()) {
      managedPanel.panel.dispose();
    }
    this.panelsBySessionId.clear();
  }

  public async reconcileVisibleSessions(
    snapshot: SessionGridSnapshot,
    preserveFocus = false,
  ): Promise<void> {
    const orderedVisibleSessions = snapshot.visibleSessionIds
      .map((sessionId) => snapshot.sessions.find((session) => session.sessionId === sessionId))
      .filter((session): session is T3SessionRecord => Boolean(session && isT3Session(session)));
    const visibleSessionIdSet = new Set(orderedVisibleSessions.map((session) => session.sessionId));

    for (const [sessionId, managedPanel] of this.panelsBySessionId.entries()) {
      if (visibleSessionIdSet.has(sessionId)) {
        continue;
      }

      managedPanel.panel.dispose();
      this.panelsBySessionId.delete(sessionId);
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
    sessionRecord: T3SessionRecord,
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    await this.revealSession(sessionRecord, snapshot, preserveFocus);
  }

  public disposeSession(sessionId: string): void {
    const managedPanel = this.panelsBySessionId.get(sessionId);
    if (!managedPanel) {
      return;
    }

    managedPanel.panel.dispose();
    this.panelsBySessionId.delete(sessionId);
  }

  private async revealSession(
    sessionRecord: T3SessionRecord,
    snapshot: SessionGridSnapshot,
    preserveFocus: boolean,
  ): Promise<void> {
    const visibleIndex = snapshot.visibleSessionIds.indexOf(sessionRecord.sessionId);
    if (visibleIndex < 0) {
      return;
    }

    const managedPanel = this.panelsBySessionId.get(sessionRecord.sessionId);
    const viewColumn = getViewColumn(visibleIndex);
    if (managedPanel) {
      managedPanel.panel.title = getPanelTitle(sessionRecord);
      managedPanel.panel.webview.html = await this.createPanelHtml(
        managedPanel.panel.webview,
        sessionRecord,
      );
      managedPanel.panel.reveal(viewColumn, preserveFocus);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      T3_PANEL_TYPE,
      getPanelTitle(sessionRecord),
      {
        preserveFocus,
        viewColumn,
      },
      {
        enableScripts: true,
        localResourceRoots: [getEmbeddedT3Root(this.options.context)],
        retainContextWhenHidden: true,
      },
    );
    const nextManagedPanel = {
      panel,
      sessionId: sessionRecord.sessionId,
    } satisfies ManagedPanel;
    this.panelsBySessionId.set(sessionRecord.sessionId, nextManagedPanel);

    panel.onDidDispose(() => {
      if (this.panelsBySessionId.get(sessionRecord.sessionId)?.panel === panel) {
        this.panelsBySessionId.delete(sessionRecord.sessionId);
      }
    });
    panel.onDidChangeViewState((event) => {
      if (!event.webviewPanel.active) {
        return;
      }

      void this.options.onDidFocusSession(sessionRecord.sessionId);
    });
    panel.webview.html = await this.createPanelHtml(panel.webview, sessionRecord);
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
}

function getEmbeddedT3Root(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.extensionUri, "forks", "t3code-embed", "dist");
}

function getPanelTitle(sessionRecord: T3SessionRecord): string {
  return `T3 Code: ${sessionRecord.alias}`;
}

function toWebSocketOrigin(serverOrigin: string): string {
  return serverOrigin.replace(/^http/i, "ws");
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
    <style>
      body {
        margin: 0;
        background: #111827;
        color: #f9fafb;
        font: 13px/1.5 -apple-system, BlinkMacSystemFont, sans-serif;
        padding: 24px;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
    </style>
  </head>
  <body>
    <h1>Embedded T3 assets are missing</h1>
    <p>Build the patched T3 frontend into <code>forks/t3code-embed/dist</code> to render T3 sessions.</p>
  </body>
</html>`;
}

function createNonce(): string {
  return Math.random().toString(36).slice(2);
}
