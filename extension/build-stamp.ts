import { statSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";

type WebviewBuildStampSurface = "sidebar" | "workspace";

const BUILD_STAMP_RELATIVE_PATHS: Record<WebviewBuildStampSurface, readonly string[][]> = {
  sidebar: [["out", "sidebar", "sidebar.js"], ["package.json"]],
  workspace: [["out", "workspace", "workspace.js"], ["package.json"]],
};

const buildStampCache = new Map<string, string | undefined>();

export function getWebviewBuildStamp(
  context: Pick<vscode.ExtensionContext, "extension" | "extensionPath">,
  surface: WebviewBuildStampSurface,
): string | undefined {
  const cacheKey = `${context.extensionPath}:${surface}`;
  if (buildStampCache.has(cacheKey)) {
    return buildStampCache.get(cacheKey);
  }

  const version = formatExtensionVersion(context.extension.packageJSON.version);
  const builtAt = resolveSurfaceBuildTimestamp(context.extensionPath, surface);
  const buildStamp =
    version && builtAt ? `v${version} - ${builtAt}` : version ? `v${version}` : builtAt;

  buildStampCache.set(cacheKey, buildStamp);
  return buildStamp;
}

function resolveSurfaceBuildTimestamp(
  extensionPath: string,
  surface: WebviewBuildStampSurface,
): string | undefined {
  const relativePaths = BUILD_STAMP_RELATIVE_PATHS[surface];
  for (const relativePath of relativePaths) {
    try {
      const stats = statSync(join(extensionPath, ...relativePath));
      if (Number.isFinite(stats.mtimeMs)) {
        return formatBuildTimestamp(new Date(stats.mtimeMs));
      }
    } catch {
      // Fall through to the next candidate path.
    }
  }

  return undefined;
}

function formatExtensionVersion(version: unknown): string | undefined {
  if (typeof version !== "string") {
    return undefined;
  }

  const normalizedVersion = version.trim().replace(/^v/i, "");
  if (normalizedVersion.length === 0) {
    return undefined;
  }

  const [major, minor, patch, ...rest] = normalizedVersion.split(".");
  if (!major || !minor) {
    return normalizedVersion;
  }

  if (!patch || patch === "0") {
    return `${major}.${minor}`;
  }

  return [major, minor, patch, ...rest].join(".");
}

function formatBuildTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours24 = value.getHours();
  const meridiem = hours24 >= 12 ? "pm" : "am";
  const hours12 = hours24 % 12 || 12;
  const hours = String(hours12).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${meridiem}`;
}
