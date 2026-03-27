import * as vscode from "vscode";
import {
  getBrowserTabInputKind,
  getBrowserTabUrl,
  normalizeUrl,
} from "./browser-session-manager/helpers";

export const BROWSER_SIDEBAR_GROUP_ID = "browser-tabs";

const BROWSER_SIDEBAR_SESSION_PREFIX = "browser-tab:";
const SIMPLE_BROWSER_VIEW_TYPE = "simpleBrowser.view";

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
  const url = normalizeSidebarBrowserUrl(getBrowserTabUrl(tab));
  if (url) {
    return {
      detail: url,
      identity: url,
      url,
    };
  }

  const input = tab.input;
  if (input instanceof vscode.TabInputWebview && isBrowserWebviewViewType(input.viewType)) {
    return {
      detail: undefined,
      identity: input.viewType,
      url: undefined,
      viewType: input.viewType,
    };
  }

  return undefined;
}

function isBrowserWebviewViewType(viewType: string): boolean {
  const normalizedViewType = viewType.toLowerCase();
  return (
    normalizedViewType === SIMPLE_BROWSER_VIEW_TYPE.toLowerCase() ||
    normalizedViewType.includes("browser") ||
    normalizedViewType.includes("preview")
  );
}
