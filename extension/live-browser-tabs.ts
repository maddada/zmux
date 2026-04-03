import * as vscode from "vscode";
import {
  getBrowserTabInputKind,
  getBrowserTabUrl,
  isBrowserLikeTab,
  normalizeUrl,
} from "./browser-session-manager/helpers";
import { T3_PANEL_TYPE } from "./t3-webview-manager/helpers";
import { WORKSPACE_PANEL_TYPE } from "./workspace-panel";

export const BROWSER_SIDEBAR_GROUP_ID = "browser-tabs";

const BROWSER_SIDEBAR_SESSION_PREFIX = "browser-tab:";
const SIMPLE_BROWSER_VIEW_TYPE = "simpleBrowser.view";
const VSMUX_LABEL = "vsmux";
const VSMUX_VIEW_TYPE_PREFIX = "vsmux.";
const VSCODE_WELCOME_LABEL = "welcome";
const VSCODE_IGNORED_LABELS = new Set(["Settings", "Keyboard Shortcuts"]);
const WORKING_TREE_LABEL_FRAGMENT = "(Working Tree)";
const INDEX_LABEL_FRAGMENT = '(Index)';

export type LiveBrowserTabEntry = {
  detail?: string;
  inputKind: string;
  isActive: boolean;
  label: string;
  sessionId: string;
  tab: vscode.Tab;
  url?: string;
  viewType?: string;
  viewColumn: vscode.ViewColumn;
};

export function getLiveBrowserTabs(
  tabGroups: readonly vscode.TabGroup[] = vscode.window.tabGroups.all,
): LiveBrowserTabEntry[] {
  const browserTabs: LiveBrowserTabEntry[] = [];
  const occurrenceByIdentity = new Map<string, number>();

  for (const group of tabGroups) {
    if (group.viewColumn === undefined) {
      continue;
    }

    for (const tab of group.tabs) {
      const browserTabMetadata = getLiveBrowserTabMetadata(tab);
      if (!browserTabMetadata) {
        continue;
      }

      const inputKind = getBrowserTabInputKind(tab);
      const identity = [group.viewColumn, inputKind, tab.label, browserTabMetadata.identity].join(
        "|",
      );
      const occurrence = occurrenceByIdentity.get(identity) ?? 0;
      occurrenceByIdentity.set(identity, occurrence + 1);
      browserTabs.push({
        detail: browserTabMetadata.detail,
        inputKind,
        isActive: group.isActive && tab.isActive,
        label: tab.label,
        sessionId: createBrowserSidebarSessionId(
          group.viewColumn,
          inputKind,
          tab.label,
          browserTabMetadata.identity,
          occurrence,
        ),
        tab,
        url: browserTabMetadata.url,
        viewType: browserTabMetadata.viewType,
        viewColumn: group.viewColumn,
      });
    }
  }

  return browserTabs;
}

export function findLiveBrowserTabBySessionId(
  sessionId: string,
  tabs: readonly LiveBrowserTabEntry[] = getLiveBrowserTabs(),
): LiveBrowserTabEntry | undefined {
  return tabs.find((tab) => tab.sessionId === sessionId);
}

export function isBrowserSidebarSessionId(sessionId: string): boolean {
  return sessionId.startsWith(BROWSER_SIDEBAR_SESSION_PREFIX);
}

export function normalizeSidebarBrowserUrl(url: string | undefined): string | undefined {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    return undefined;
  }

  try {
    const uri = vscode.Uri.parse(normalizedUrl);
    return uri.scheme === "http" || uri.scheme === "https" ? uri.toString(true) : undefined;
  } catch {
    return undefined;
  }
}

function createBrowserSidebarSessionId(
  viewColumn: vscode.ViewColumn,
  inputKind: string,
  label: string,
  identity: string,
  occurrence: number,
): string {
  return [
    BROWSER_SIDEBAR_SESSION_PREFIX,
    viewColumn,
    occurrence,
    encodeURIComponent(inputKind),
    encodeURIComponent(label),
    encodeURIComponent(identity),
  ].join("|");
}

function getLiveBrowserTabMetadata(tab: vscode.Tab):
  | {
      detail?: string;
      identity: string;
      url?: string;
      viewType?: string;
    }
  | undefined {
  if (VSCODE_IGNORED_LABELS.has(tab.label.trim())) {
    return undefined;
  }

  if (tab.label.includes(WORKING_TREE_LABEL_FRAGMENT) || tab.label.includes(INDEX_LABEL_FRAGMENT)) {
    return undefined;
  }

  if (tab.label.trim().toLowerCase() === VSCODE_WELCOME_LABEL) {
    return undefined;
  }

  if (isDiffTabInput(tab.input)) {
    return undefined;
  }

  const viewType = getTabViewType(tab.input);
  const url = normalizeSidebarBrowserUrl(getBrowserTabUrl(tab));

  if (isVSmuxOwnedTab(tab, viewType, url)) {
    return undefined;
  }

  if (url) {
    return {
      detail: url,
      identity: url,
      url,
      viewType,
    };
  }

  if (viewType && isBrowserWebviewViewType(viewType)) {
    return {
      detail: undefined,
      identity: viewType,
      url: undefined,
      viewType,
    };
  }

  if (isBrowserLikeTab(tab)) {
    return {
      detail: undefined,
      identity: viewType ?? tab.label,
      url: undefined,
      viewType,
    };
  }

  return undefined;
}

function isVSmuxOwnedTab(
  tab: vscode.Tab,
  viewType: string | undefined,
  url: string | undefined,
): boolean {
  const normalizedViewType = viewType?.toLowerCase();
  if (viewType === T3_PANEL_TYPE || viewType === WORKSPACE_PANEL_TYPE) {
    return true;
  }

  if (normalizedViewType?.startsWith(VSMUX_VIEW_TYPE_PREFIX)) {
    return true;
  }

  if (tab.label.trim().toLowerCase() !== VSMUX_LABEL) {
    return false;
  }

  return url === undefined || isVSmuxLocalAssetUrl(url);
}

function isBrowserWebviewViewType(viewType: string): boolean {
  const normalizedViewType = viewType.toLowerCase();
  return (
    normalizedViewType === SIMPLE_BROWSER_VIEW_TYPE.toLowerCase() ||
    normalizedViewType.includes("browser") ||
    normalizedViewType.includes("preview")
  );
}

function isVSmuxLocalAssetUrl(url: string): boolean {
  return /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/(?:workspace|t3-embed)(?:\/|$)/i.test(
    url,
  );
}

function getTabViewType(input: vscode.Tab["input"]): string | undefined {
  if (!input || typeof input !== "object" || !("viewType" in input)) {
    return undefined;
  }

  const viewType = (input as { viewType?: unknown }).viewType;
  return typeof viewType === "string" && viewType.length > 0 ? viewType : undefined;
}

function isDiffTabInput(input: vscode.Tab["input"]): boolean {
  const textDiffInputConstructor = getOptionalVscodeConstructor("TabInputTextDiff");
  if (typeof textDiffInputConstructor === "function" && input instanceof textDiffInputConstructor) {
    return true;
  }

  const notebookDiffInputConstructor = getOptionalVscodeConstructor("TabInputNotebookDiff");
  return (
    typeof notebookDiffInputConstructor === "function" &&
    input instanceof notebookDiffInputConstructor
  );
}

function getOptionalVscodeConstructor(name: string): Function | undefined {
  const candidate =
    name in (vscode as object) ? (vscode as unknown as Record<string, unknown>)[name] : undefined;
  return typeof candidate === "function" ? candidate : undefined;
}
