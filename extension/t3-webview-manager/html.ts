import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { T3SessionRecord } from "../../shared/session-grid-contract";
import type { WorkspaceAssetServer } from "../workspace-asset-server";

export function getEmbeddedT3Root(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.extensionUri, "forks", "t3code-embed", "dist");
}

export async function createT3IframeSource(
  context: vscode.ExtensionContext,
  sessionRecord: T3SessionRecord,
  workspaceAssetServer: WorkspaceAssetServer,
): Promise<string> {
  const embeddedRoot = getEmbeddedT3Root(context);
  const indexPath = path.join(embeddedRoot.fsPath, "index.html");
  const assetRootUri = await workspaceAssetServer.getRootUrl("t3-embed");
  const iframeHostScriptUri = await workspaceAssetServer.getUrl("workspace", "t3-frame-host.js");

  let html: string;
  try {
    html = await readFile(indexPath, "utf8");
  } catch {
    return createMissingIframeHtml();
  }

  const scriptPathMatch = html.match(/<script[^>]+src="([^"]+)"/i);
  const stylePathMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/i);
  const scriptSrc = resolveEmbeddedAssetUrl(assetRootUri, scriptPathMatch?.[1]);
  if (!scriptSrc) {
    return createMissingIframeHtml();
  }

  const payload: T3IframeBootstrapPayload = {
    bootstrapScriptSrc: iframeHostScriptUri.toString(),
    scriptSrc,
    serverOrigin: sessionRecord.t3.serverOrigin,
    sessionId: sessionRecord.sessionId,
    sessionRecordTitle: sessionRecord.title,
    styleHref: resolveEmbeddedAssetUrl(assetRootUri, stylePathMatch?.[1]),
    threadId: sessionRecord.t3.threadId,
    workspaceRoot: sessionRecord.t3.workspaceRoot,
    wsUrl: toWebSocketOrigin(sessionRecord.t3.serverOrigin),
  };

  return createT3IframeHtml(payload);
}

export function createPendingT3IframeSource(title = "T3 Code"): string {
  return createStatusIframeHtml(title, "Starting T3 Code…");
}

function createMissingIframeHtml(): string {
  return createStatusIframeHtml("T3 Code", "Embedded T3 assets are missing.");
}

function resolveEmbeddedAssetUrl(assetRootUri: string, assetPath: string | undefined): string | undefined {
  if (!assetPath) {
    return undefined;
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  return `${assetRootUri}/${assetPath.replace(/^\//, "")}`;
}

type T3IframeBootstrapPayload = {
  bootstrapScriptSrc: string;
  scriptSrc: string;
  serverOrigin: string;
  sessionId: string;
  sessionRecordTitle: string;
  styleHref?: string;
  threadId: string;
  workspaceRoot: string;
  wsUrl: string;
};

function createT3IframeHtml(payload: T3IframeBootstrapPayload): string {
  const csp = [
    "default-src 'none'",
    "script-src http:",
    "style-src 'unsafe-inline' http:",
    "img-src http: https: data:",
    "font-src http: https: data:",
    `connect-src ${payload.serverOrigin} ${payload.wsUrl}`,
    "worker-src http: blob:",
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtmlText(payload.sessionRecordTitle || "T3 Code")}</title>
    <style>
      html, body, #root {
        background: #101722;
        height: 100%;
        margin: 0;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script id="vsmux-t3-bootstrap" type="application/json">${escapeHtmlText(JSON.stringify(payload))}</script>
    <script type="module" src="${escapeHtmlAttribute(payload.bootstrapScriptSrc)}"></script>
  </body>
</html>`;
}

function createStatusIframeHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtmlText(title || "T3 Code")}</title>
    <style>
      html, body {
        background: #101722;
        color: #d8e1ee;
        font-family: ui-sans-serif, system-ui, sans-serif;
        height: 100%;
        margin: 0;
      }

      body {
        align-items: center;
        display: flex;
        justify-content: center;
        padding: 24px;
      }

      .status {
        color: #d8e1ee;
        font-size: 14px;
        letter-spacing: 0.02em;
        opacity: 0.86;
      }
    </style>
  </head>
  <body>
    <div class="status">${escapeHtmlText(message)}</div>
  </body>
</html>`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toWebSocketOrigin(serverOrigin: string): string {
  return serverOrigin.replace(/^http/i, "ws");
}
