import {
  createServer,
  type Server as HttpServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type ServerResponse,
} from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { connect } from "node:net";
import * as path from "node:path";
import type { Duplex } from "node:stream";
import * as vscode from "vscode";
import {
  getManagedT3BundledWebDirectoryName,
  getManagedT3WebDistPath,
  type ManagedT3Provider,
} from "./managed-t3-paths";

type AssetScope = "workspace" | "t3code-embed";
type AssetServerKind = "local" | "shared";
type T3BrowserAccessDocumentResolver = (input: {
  requestOrigin: string;
  sessionId?: string;
}) => Promise<string | undefined>;

const T3_PROXY_HOST = "127.0.0.1";
const T3_PROXY_PORT = 3774;
const T3_SHARED_ACCESS_PORT = 45438;

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};

type EmbeddedAssetIndexSignature = {
  scriptSrc: string | null;
  styleHref: string | null;
};

export class WorkspaceAssetServer implements vscode.Disposable {
  private readonly roots: Record<AssetScope, string>;
  private readonly localServer = this.createAssetServer();
  private readonly sharedServer = this.createAssetServer();
  private localListenPromise: Promise<number> | undefined;
  private localPort: number | undefined;
  private sharedListenPromise: Promise<number> | undefined;
  private sharedPort: number | undefined;
  private t3ProxyAuthorizationToken: string | undefined;
  private t3BrowserAccessDocumentResolver: T3BrowserAccessDocumentResolver | undefined;

  public constructor(context: vscode.ExtensionContext) {
    this.roots = {
      "t3code-embed": resolveManagedT3WebRoot("t3code", context),
      workspace: path.join(context.extensionPath, "out", "workspace"),
    };
  }

  public dispose(): void {
    this.localListenPromise = undefined;
    this.localPort = undefined;
    this.sharedListenPromise = undefined;
    this.sharedPort = undefined;
    this.localServer.close();
    this.sharedServer.close();
  }

  public async getUrl(scope: AssetScope, relativePath: string): Promise<string> {
    const port = await this.ensureListening("local");
    const normalizedPath = normalizeRelativePath(relativePath);
    return `http://127.0.0.1:${String(port)}/${scope}/${normalizedPath}`;
  }

  public async getRootUrl(scope: AssetScope): Promise<string> {
    const port = await this.ensureListening("local");
    return `http://127.0.0.1:${String(port)}/${scope}`;
  }

  public async getT3BrowserAccessUrl(): Promise<string> {
    const port = await this.ensureListening("shared");
    return `http://127.0.0.1:${String(port)}/t3-share`;
  }

  public async ensureT3BrowserAccessListening(): Promise<void> {
    await this.ensureListening("shared");
  }

  public setT3ProxyAuthorizationToken(token: string | undefined): void {
    this.t3ProxyAuthorizationToken = token?.trim() ? token : undefined;
  }

  public setT3BrowserAccessDocumentResolver(
    resolver: T3BrowserAccessDocumentResolver | undefined,
  ): void {
    this.t3BrowserAccessDocumentResolver = resolver;
  }

  private createAssetServer(): HttpServer {
    const server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });
    server.on("upgrade", (request, socket, head) => {
      void this.handleUpgrade(request, socket, head);
    });
    return server;
  }

  private async ensureListening(kind: AssetServerKind): Promise<number> {
    const currentPort = kind === "local" ? this.localPort : this.sharedPort;
    if (currentPort !== undefined) {
      return currentPort;
    }

    const existingPromise = kind === "local" ? this.localListenPromise : this.sharedListenPromise;
    if (existingPromise) {
      return existingPromise;
    }

    const nextPromise = new Promise<number>((resolve, reject) => {
      const server = kind === "local" ? this.localServer : this.sharedServer;
      server.once("error", (error: NodeJS.ErrnoException) => {
        if (kind === "shared" && error.code === "EADDRINUSE") {
          void this.probeExistingSharedServer().then((isReusable) => {
            if (isReusable) {
              this.sharedPort = T3_SHARED_ACCESS_PORT;
              resolve(T3_SHARED_ACCESS_PORT);
              return;
            }

            reject(
              new Error(
                `T3 browser access server failed to bind to port ${String(T3_SHARED_ACCESS_PORT)}.`,
                {
                  cause: error,
                },
              ),
            );
          });
          return;
        }

        if (kind === "shared") {
          reject(
            new Error(
              `T3 browser access server failed to bind to port ${String(T3_SHARED_ACCESS_PORT)}.`,
              {
                cause: error,
              },
            ),
          );
          return;
        }
        reject(error);
      });
      server.listen(
        kind === "local" ? 0 : T3_SHARED_ACCESS_PORT,
        kind === "local" ? "127.0.0.1" : "0.0.0.0",
        () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            reject(new Error("Workspace asset server failed to bind to a port."));
            return;
          }

          if (kind === "local") {
            this.localPort = address.port;
          } else {
            this.sharedPort = address.port;
          }
          resolve(address.port);
        },
      );
    });

    const trackedPromise = nextPromise.catch((error) => {
      if (kind === "local") {
        this.localListenPromise = undefined;
      } else {
        this.sharedListenPromise = undefined;
      }
      throw error;
    });

    if (kind === "local") {
      this.localListenPromise = trackedPromise;
    } else {
      this.sharedListenPromise = trackedPromise;
    }

    return trackedPromise;
  }

  private async probeExistingSharedServer(): Promise<boolean> {
    const expectedAssets = await readSharedAssetProbeFiles(this.roots);
    if (!expectedAssets) {
      return false;
    }

    try {
      const [frameHostResponse, t3IndexResponse] = await Promise.all([
        fetch(`http://127.0.0.1:${String(T3_SHARED_ACCESS_PORT)}/workspace/t3-frame-host.js`, {
          method: "GET",
          signal: AbortSignal.timeout(1_500),
        }),
        fetch(`http://127.0.0.1:${String(T3_SHARED_ACCESS_PORT)}/t3code-embed/index.html`, {
          method: "GET",
          signal: AbortSignal.timeout(1_500),
        }),
      ]);
      if (!frameHostResponse.ok || !t3IndexResponse.ok) {
        return false;
      }

      const [frameHostScript, t3IndexHtml] = await Promise.all([
        frameHostResponse.text(),
        t3IndexResponse.text(),
      ]);

      return areSharedT3EmbedAssetsCompatible({
        actualFrameHostScript: frameHostScript,
        actualT3IndexHtml: t3IndexHtml,
        expectedFrameHostScript: expectedAssets.frameHostScript,
        expectedT3IndexHtml: expectedAssets.t3IndexHtml,
      });
    } catch {
      return false;
    }
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (!request.url) {
        respondNotFound(request, response);
        return;
      }

      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "OPTIONS" && isT3ProxyPath(url.pathname)) {
        respondPreflight(request, response);
        return;
      }

      if (isT3ProxyPath(url.pathname)) {
        await this.proxyHttpRequest(url, request, response);
        return;
      }

      const t3ShareRequest = resolveT3ShareRequest(url.pathname);
      if (t3ShareRequest) {
        const html = await this.t3BrowserAccessDocumentResolver?.({
          requestOrigin: getRequestOrigin(request),
          sessionId: t3ShareRequest.sessionId,
        });
        if (!html) {
          respondNotFound(request, response);
          return;
        }

        response.writeHead(200, {
          "Cache-Control": "no-store",
          "Content-Type": "text/html; charset=utf-8",
          ...createCorsHeaders(request),
        });
        response.end(html);
        return;
      }

      const [scope, ...pathSegments] = url.pathname.split("/").filter(Boolean);
      if (scope !== "workspace" && scope !== "t3code-embed") {
        respondNotFound(request, response);
        return;
      }

      const root = this.roots[scope];
      const relativePath = normalizeRelativePath(pathSegments.join("/"));
      const filePath = path.join(root, relativePath);
      const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
      if (filePath !== root && !filePath.startsWith(rootWithSeparator)) {
        respondNotFound(request, response);
        return;
      }

      const file = await readFile(filePath);
      const contentType =
        CONTENT_TYPE_BY_EXTENSION[path.extname(filePath)] ?? "application/octet-stream";
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
        ...createCorsHeaders(request),
      });
      response.end(file);
    } catch {
      respondNotFound(request, response);
    }
  }

  private async proxyHttpRequest(
    url: URL,
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const targetUrl = new URL(`${url.pathname}${url.search}`, getT3ProxyOrigin());
    const method = request.method ?? "GET";
    const body = method === "GET" || method === "HEAD" ? undefined : await readRequestBody(request);

    let proxiedResponse: Response;
    try {
      proxiedResponse = await fetch(targetUrl, {
        body: body ? new Uint8Array(body) : undefined,
        headers: createProxyRequestHeaders(request.headers, this.t3ProxyAuthorizationToken),
        method,
        redirect: "manual",
      });
    } catch {
      respondBadGateway(request, response);
      return;
    }

    const responseBody =
      method === "HEAD" || proxiedResponse.status === 204 || proxiedResponse.status === 304
        ? Buffer.alloc(0)
        : Buffer.from(await proxiedResponse.arrayBuffer());
    const headers = createProxyResponseHeaders(
      request,
      proxiedResponse.headers,
      responseBody.length,
    );
    response.writeHead(proxiedResponse.status, headers);
    response.end(responseBody);
  }

  private async handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): Promise<void> {
    try {
      if (!request.url) {
        socket.destroy();
        return;
      }

      const url = new URL(request.url, "http://127.0.0.1");
      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      const upstreamSocket = connect(T3_PROXY_PORT, T3_PROXY_HOST, () => {
        upstreamSocket.write(
          createProxyUpgradeRequest(request, url, this.t3ProxyAuthorizationToken),
        );
        if (head.length > 0) {
          upstreamSocket.write(head);
        }
        socket.pipe(upstreamSocket);
        upstreamSocket.pipe(socket);
      });

      upstreamSocket.on("error", () => {
        socket.destroy();
      });
      socket.on("error", () => {
        upstreamSocket.destroy();
      });
    } catch {
      socket.destroy();
    }
  }
}

function normalizeRelativePath(relativePath: string): string {
  const normalized = path.posix.normalize(relativePath).replace(/^\/+/, "");
  if (normalized === "." || normalized.length === 0) {
    return "index.html";
  }

  return normalized;
}

function resolveT3ShareRequest(pathname: string): { sessionId?: string } | undefined {
  if (pathname === "/t3-share") {
    return {};
  }

  const match = pathname.match(/^\/t3-share\/([^/]+)$/u);
  if (!match?.[1]) {
    return undefined;
  }

  try {
    return {
      sessionId: decodeURIComponent(match[1]),
    };
  } catch {
    return undefined;
  }
}

function isT3ProxyPath(pathname: string): boolean {
  return (
    pathname === "/ws" ||
    pathname === "/.well-known/t3/environment" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/attachments/")
  );
}

function getT3ProxyOrigin(): string {
  return `http://${T3_PROXY_HOST}:${String(T3_PROXY_PORT)}`;
}

function resolveManagedT3WebRoot(
  provider: ManagedT3Provider,
  context: Pick<vscode.ExtensionContext, "extensionPath">,
): string {
  const bundledRoot = path.join(
    context.extensionPath,
    "out",
    getManagedT3BundledWebDirectoryName(provider),
  );
  if (existsSync(path.join(bundledRoot, "index.html"))) {
    return bundledRoot;
  }

  return getManagedT3WebDistPath(provider, context);
}

async function readSharedAssetProbeFiles(roots: Record<AssetScope, string>): Promise<
  | {
      frameHostScript: string;
      t3IndexHtml: string;
    }
  | undefined
> {
  try {
    const [frameHostScript, t3IndexHtml] = await Promise.all([
      readFile(path.join(roots.workspace, "t3-frame-host.js"), "utf8"),
      readFile(path.join(roots["t3code-embed"], "index.html"), "utf8"),
    ]);
    return {
      frameHostScript,
      t3IndexHtml,
    };
  } catch {
    return undefined;
  }
}

export function resolveEmbeddedAssetIndexSignature(html: string): EmbeddedAssetIndexSignature {
  const scriptPathMatch = html.match(/<script[^>]+src="([^"]+)"/i);
  const stylePathMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/i);
  return {
    scriptSrc: scriptPathMatch?.[1] ?? null,
    styleHref: stylePathMatch?.[1] ?? null,
  };
}

export function areSharedT3EmbedAssetsCompatible(input: {
  actualFrameHostScript: string;
  actualT3IndexHtml: string;
  expectedFrameHostScript: string;
  expectedT3IndexHtml: string;
}): boolean {
  if (input.actualFrameHostScript !== input.expectedFrameHostScript) {
    return false;
  }

  const expectedSignature = resolveEmbeddedAssetIndexSignature(input.expectedT3IndexHtml);
  const actualSignature = resolveEmbeddedAssetIndexSignature(input.actualT3IndexHtml);
  if (!expectedSignature.scriptSrc || !actualSignature.scriptSrc) {
    return false;
  }

  return (
    expectedSignature.scriptSrc === actualSignature.scriptSrc &&
    expectedSignature.styleHref === actualSignature.styleHref
  );
}

function getRequestOrigin(request: IncomingMessage): string {
  const host =
    typeof request.headers.host === "string" && request.headers.host.length > 0
      ? request.headers.host
      : "127.0.0.1";
  return `http://${host}`;
}

function createCorsHeaders(request: IncomingMessage): OutgoingHttpHeaders {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "*",
    };
  }

  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

function respondPreflight(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(204, {
    "Access-Control-Allow-Headers":
      typeof request.headers["access-control-request-headers"] === "string"
        ? request.headers["access-control-request-headers"]
        : "authorization, content-type",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Cache-Control": "no-store",
    ...createCorsHeaders(request),
  });
  response.end();
}

function respondNotFound(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(404, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    ...createCorsHeaders(request),
  });
  response.end("Not found");
}

function respondBadGateway(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(502, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    ...createCorsHeaders(request),
  });
  response.end("Bad gateway");
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function createProxyRequestHeaders(
  headers: IncomingHttpHeaders,
  authorizationToken: string | undefined,
): Headers {
  const proxiedHeaders = new Headers();
  for (const [key, rawValue] of Object.entries(headers)) {
    if (!rawValue) {
      continue;
    }

    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "host" ||
      lowerKey === "origin" ||
      lowerKey === "connection" ||
      lowerKey === "content-length"
    ) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        proxiedHeaders.append(key, value);
      }
      continue;
    }

    proxiedHeaders.set(key, rawValue);
  }

  if (authorizationToken) {
    proxiedHeaders.set("authorization", `Bearer ${authorizationToken}`);
  }

  return proxiedHeaders;
}

function createProxyResponseHeaders(
  request: IncomingMessage,
  responseHeaders: Headers,
  bodyLength: number,
): OutgoingHttpHeaders {
  const headers: OutgoingHttpHeaders = {
    "Cache-Control": "no-store",
    "Content-Length": String(bodyLength),
    ...createCorsHeaders(request),
  };

  responseHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "access-control-allow-credentials" ||
      lowerKey === "access-control-allow-headers" ||
      lowerKey === "access-control-allow-methods" ||
      lowerKey === "access-control-allow-origin" ||
      lowerKey === "connection" ||
      lowerKey === "content-length" ||
      lowerKey === "keep-alive" ||
      lowerKey === "transfer-encoding"
    ) {
      return;
    }

    headers[key] = value;
  });

  const setCookies = responseHeaders.getSetCookie();
  if (setCookies.length > 0) {
    headers["set-cookie"] = setCookies;
  }

  return headers;
}

function createProxyUpgradeRequest(
  request: IncomingMessage,
  url: URL,
  authorizationToken: string | undefined,
): string {
  const upstreamUrl = new URL(url.pathname, getT3ProxyOrigin());
  if (authorizationToken) {
    upstreamUrl.searchParams.set("token", authorizationToken);
  } else {
    upstreamUrl.search = url.search;
  }

  const headerLines = [
    `Host: ${T3_PROXY_HOST}:${String(T3_PROXY_PORT)}`,
    `Origin: ${getT3ProxyOrigin()}`,
  ];

  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const headerName = request.rawHeaders[index];
    const headerValue = request.rawHeaders[index + 1];
    if (!headerName || headerValue === undefined) {
      continue;
    }

    const lowerName = headerName.toLowerCase();
    if (lowerName === "host" || lowerName === "origin") {
      continue;
    }

    headerLines.push(`${headerName}: ${headerValue}`);
  }

  if (authorizationToken) {
    headerLines.push(`Authorization: Bearer ${authorizationToken}`);
  }

  return `${request.method ?? "GET"} ${upstreamUrl.pathname}${upstreamUrl.search} HTTP/${request.httpVersion}\r\n${headerLines.join("\r\n")}\r\n\r\n`;
}
