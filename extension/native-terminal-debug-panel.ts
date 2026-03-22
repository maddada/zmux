import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { ExtensionToNativeTerminalDebugMessage } from "../shared/native-terminal-debug-contract";

const DEBUG_PANEL_TITLE = "VSmux Move Debugger";
const DEBUG_PANEL_HOST = "127.0.0.1";
const DEBUG_PANEL_CLEAR_PATH = "/clear";
const DEBUG_PANEL_STATE_POLL_PATH = "/state";

export class NativeTerminalDebugPanel implements vscode.Disposable {
  private currentUrl: string | undefined;
  private latestMessage: ExtensionToNativeTerminalDebugMessage | undefined;
  private server: Server | undefined;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly options?: {
      onClear?: () => Promise<void>;
    },
  ) {}

  public dispose(): void {
    if (!this.server) {
      this.currentUrl = undefined;
      return;
    }

    this.server.close();
    this.server = undefined;
    this.currentUrl = undefined;
  }

  public async postMessage(message: ExtensionToNativeTerminalDebugMessage): Promise<void> {
    this.latestMessage = message;
  }

  public async reveal(): Promise<void> {
    const url = await this.ensureServerStarted();
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  public hasPanel(): boolean {
    return this.currentUrl !== undefined;
  }

  private async ensureServerStarted(): Promise<string> {
    if (this.currentUrl) {
      return this.currentUrl;
    }

    const assetsDirectory = path.join(this.context.extensionUri.fsPath, "out", "debug-panel");
    this.server = createServer((request, response) => {
      void this.handleRequest(request, response, assetsDirectory);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(0, DEBUG_PANEL_HOST, () => {
        this.server?.off("error", reject);
        resolve();
      });
    });

    const address = this.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to start the VSmux move debugger server.");
    }

    this.currentUrl = `http://${DEBUG_PANEL_HOST}:${String(address.port)}/`;
    return this.currentUrl;
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    assetsDirectory: string,
  ): Promise<void> {
    const requestUrl = new URL(request.url ?? "/", this.currentUrl ?? "http://127.0.0.1/");
    if (requestUrl.pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(getDebugPanelHtml());
      return;
    }

    if (requestUrl.pathname === DEBUG_PANEL_STATE_POLL_PATH) {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify(this.latestMessage ?? { state: undefined, type: "hydrate" }));
      return;
    }

    if (requestUrl.pathname === DEBUG_PANEL_CLEAR_PATH && request.method === "POST") {
      await this.options?.onClear?.();
      response.writeHead(204);
      response.end();
      return;
    }

    if (requestUrl.pathname === "/debug-panel.js") {
      await this.respondWithAsset(
        response,
        path.join(assetsDirectory, "debug-panel.js"),
        "application/javascript; charset=utf-8",
      );
      return;
    }

    if (requestUrl.pathname === "/debug-panel.css") {
      await this.respondWithAsset(
        response,
        path.join(assetsDirectory, "debug-panel.css"),
        "text/css; charset=utf-8",
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }

  private async respondWithAsset(
    response: ServerResponse,
    filePath: string,
    contentType: string,
  ): Promise<void> {
    try {
      const content = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
      });
      response.end(content);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Missing debug panel asset");
    }
  }
}

function getDebugPanelHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${DEBUG_PANEL_TITLE}</title>
    <link href="/debug-panel.css" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__VSMUX_DEBUG_CLEAR_URL__ = "${DEBUG_PANEL_CLEAR_PATH}";
      window.__VSMUX_DEBUG_STATE_URL__ = "${DEBUG_PANEL_STATE_POLL_PATH}";
    </script>
    <script src="/debug-panel.js" type="module"></script>
  </body>
</html>`;
}
