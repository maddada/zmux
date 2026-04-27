import * as vscode from "vscode";
import type { BrowserSessionRecord } from "../../shared/session-grid-contract";

export function getPlacementRank(isVisible: boolean, isFocused: boolean): number {
  if (isFocused) {
    return 2;
  }

  return isVisible ? 1 : 0;
}

export function getRenderKey(sessionRecord: BrowserSessionRecord): string {
  return [sessionRecord.alias, sessionRecord.browser.url].join("|");
}

export function getBrowserTabUrl(tab: vscode.Tab): string | undefined {
  const input = tab.input;
  if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom) {
    return input.uri.toString(true);
  }

  return undefined;
}

export function getBrowserTabInputKind(tab: vscode.Tab): string {
  const input = tab.input;
  const terminalInputConstructor = getOptionalVscodeConstructor("TabInputTerminal");
  if (typeof terminalInputConstructor === "function" && input instanceof terminalInputConstructor) {
    return "terminal";
  }
  if (input instanceof vscode.TabInputText) {
    return "text";
  }
  if (input instanceof vscode.TabInputCustom) {
    return "custom";
  }
  const webviewInputConstructor = getOptionalVscodeConstructor("TabInputWebview");
  if (typeof webviewInputConstructor === "function" && input instanceof webviewInputConstructor) {
    return "webview";
  }

  return input?.constructor?.name ?? typeof input;
}

export function isBrowserLikeTab(tab: vscode.Tab): boolean {
  const input = tab.input;
  const terminalInputConstructor = getOptionalVscodeConstructor("TabInputTerminal");
  if (
    (typeof terminalInputConstructor === "function" && input instanceof terminalInputConstructor) ||
    input instanceof vscode.TabInputText
  ) {
    return false;
  }

  return true;
}

export function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return vscode.Uri.parse(url).toString(true);
  } catch {
    return url;
  }
}

function getOptionalVscodeConstructor(name: string): Function | undefined {
  const candidate =
    name in (vscode as object) ? (vscode as unknown as Record<string, unknown>)[name] : undefined;
  return typeof candidate === "function" ? candidate : undefined;
}
