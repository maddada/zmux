import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { T3SessionRecord } from "../../shared/session-grid-contract";

export function getEmbeddedT3Root(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.extensionUri, "forks", "t3code-embed", "dist");
}

export async function createT3PanelHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  sessionRecord: T3SessionRecord,
): Promise<string> {
  const embeddedRoot = getEmbeddedT3Root(context);
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
  const bootstrapScript = `<script nonce="${nonce}">window.__VSMUX_T3_BOOTSTRAP__=${JSON.stringify({
    embedMode: "vsmux-mobile",
    httpOrigin: sessionRecord.t3.serverOrigin,
    sessionId: sessionRecord.sessionId,
    threadId: sessionRecord.t3.threadId,
    workspaceRoot: sessionRecord.t3.workspaceRoot,
    wsUrl: toWebSocketOrigin(sessionRecord.t3.serverOrigin),
  })};
window.addEventListener("message", (event) => {
  if (event.data?.type !== "focusComposer") {
    return;
  }

  focusComposerEditor();
});

function focusComposerEditor() {
  const maxAttempts = 8;
  let attempt = 0;

  const tryFocus = () => {
    const composer = document.querySelector('[data-testid="composer-editor"][contenteditable="true"]');
    if (!(composer instanceof HTMLElement)) {
      if (attempt < maxAttempts) {
        attempt += 1;
        window.setTimeout(tryFocus, 50);
      }
      return;
    }

    composer.focus();
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(composer);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  tryFocus();
}
</script>`;

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

function toWebSocketOrigin(serverOrigin: string): string {
  return serverOrigin.replace(/^http/i, "ws");
}
