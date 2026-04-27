import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { T3SessionRecord } from "../../shared/session-grid-contract";
import { getT3SessionBoundThreadId } from "../../shared/t3-session-metadata";
import { getManagedT3BundledWebDirectoryName, getManagedT3WebDistPath } from "../managed-t3-paths";
import type { T3RuntimeManager } from "../t3-runtime-manager";
import type { WorkspaceAssetServer } from "../workspace-asset-server";

function getEmbeddedT3Scope(): "t3code-embed" {
  return "t3code-embed";
}

export function getEmbeddedT3Root(context: vscode.ExtensionContext): vscode.Uri {
  const packagedRoot = vscode.Uri.joinPath(
    context.extensionUri,
    "out",
    getManagedT3BundledWebDirectoryName("t3code"),
  );
  if (existsSync(path.join(packagedRoot.fsPath, "index.html"))) {
    return packagedRoot;
  }

  return vscode.Uri.file(getManagedT3WebDistPath("t3code", context));
}

export async function createT3IframeSource(
  context: vscode.ExtensionContext,
  sessionRecord: T3SessionRecord,
  workspaceAssetServer: WorkspaceAssetServer,
  runtime: T3RuntimeManager,
): Promise<string> {
  const embeddedRoot = getEmbeddedT3Root(context);
  const indexPath = path.join(embeddedRoot.fsPath, "index.html");
  const assetRootUri = await workspaceAssetServer.getRootUrl(getEmbeddedT3Scope());
  const assetServerOrigin = new URL(assetRootUri).origin;
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

  const embedBootstrap = await runtime.createEmbedBootstrap(sessionRecord.t3.workspaceRoot);
  workspaceAssetServer.setT3ProxyAuthorizationToken(embedBootstrap.ownerBearerToken);
  const payload: T3IframeBootstrapPayload = {
    bootstrapScriptSrc: iframeHostScriptUri.toString(),
    browserBootstrapToken: embedBootstrap.browserBootstrapToken,
    scriptSrc,
    serverOrigin: assetServerOrigin,
    sessionId: sessionRecord.sessionId,
    sessionRecordTitle: sessionRecord.title,
    styleHref: resolveEmbeddedAssetUrl(assetRootUri, stylePathMatch?.[1]),
    threadId: getT3SessionBoundThreadId(sessionRecord.t3),
    workspaceRoot: sessionRecord.t3.workspaceRoot,
    wsUrl: toWebSocketOrigin(assetServerOrigin),
  };

  return createT3IframeHtml(payload);
}

export async function createT3BrowserAccessSource(
  context: vscode.ExtensionContext,
  sessionRecord: T3SessionRecord,
  input: {
    assetServerOrigin: string;
    browserBootstrapToken: string;
  },
): Promise<string> {
  const embeddedRoot = getEmbeddedT3Root(context);
  const indexPath = path.join(embeddedRoot.fsPath, "index.html");
  const assetRootUri = `${input.assetServerOrigin.replace(/\/$/, "")}/${getEmbeddedT3Scope()}`;
  const iframeHostScriptUri = `${input.assetServerOrigin.replace(/\/$/, "")}/workspace/t3-frame-host.js`;

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

  return createT3IframeHtml({
    bootstrapScriptSrc: iframeHostScriptUri,
    browserBootstrapToken: input.browserBootstrapToken,
    scriptSrc,
    serverOrigin: input.assetServerOrigin,
    sessionId: sessionRecord.sessionId,
    sessionRecordTitle: sessionRecord.title,
    styleHref: resolveEmbeddedAssetUrl(assetRootUri, stylePathMatch?.[1]),
    threadId: getT3SessionBoundThreadId(sessionRecord.t3),
    workspaceRoot: sessionRecord.t3.workspaceRoot,
    wsUrl: toWebSocketOrigin(input.assetServerOrigin),
  });
}

export function createPendingT3IframeSource(title = "T3 Code"): string {
  return createStatusIframeHtml(title, "Loading T3 Code…", {
    caption: "Preparing the embedded workspace",
    loading: true,
  });
}

function createMissingIframeHtml(): string {
  return createStatusIframeHtml("T3 Code", "Embedded T3 assets are missing.");
}

function resolveEmbeddedAssetUrl(
  assetRootUri: string,
  assetPath: string | undefined,
): string | undefined {
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
  browserBootstrapToken: string;
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
  const wsConnectOrigin = new URL(payload.wsUrl).origin.replace(/^http/i, "ws");
  const csp = [
    "default-src 'none'",
    "script-src http:",
    "style-src 'unsafe-inline' http:",
    "img-src http: https: data: blob:",
    "font-src http: https: data:",
    `connect-src ${payload.serverOrigin} ${wsConnectOrigin}`,
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
    <script id="zmux-t3-bootstrap" type="application/json">${escapeHtmlText(JSON.stringify(payload))}</script>
    <script type="module" src="${escapeHtmlAttribute(payload.bootstrapScriptSrc)}"></script>
  </body>
</html>`;
}

function createStatusIframeHtml(
  title: string,
  message: string,
  options?: { caption?: string; loading?: boolean },
): string {
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
        align-items: center;
        color: #d8e1ee;
        display: flex;
        flex-direction: column;
        font-size: 14px;
        gap: 10px;
        letter-spacing: 0.02em;
        opacity: 0.86;
        text-align: center;
      }

      .spinner {
        animation: spin 0.9s linear infinite;
        border: 2px solid rgba(216, 225, 238, 0.18);
        border-radius: 999px;
        border-top-color: rgba(216, 225, 238, 0.95);
        height: 18px;
        width: 18px;
      }

      .caption {
        font-size: 12px;
        opacity: 0.66;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="status">
      ${options?.loading ? '<div class="spinner" aria-hidden="true"></div>' : ""}
      <div>${escapeHtmlText(message)}</div>
      ${options?.caption ? `<div class="caption">${escapeHtmlText(options.caption)}</div>` : ""}
    </div>
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
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function toWebSocketOrigin(serverOrigin: string): string {
  return `${serverOrigin.replace(/^http/i, "ws").replace(/\/$/, "")}/ws`;
}
