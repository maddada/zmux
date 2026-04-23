import * as vscode from "vscode";
import {
  getBrowserTabInputKind,
  getBrowserTabUrl,
  normalizeUrl,
} from "./browser-session-manager/helpers";
import { logBrowserTabDetection } from "./browser-tab-detection-log";
import { logStorybookBrowserTabDebug } from "./storybook-browser-tab-debug-log";
import { T3_PANEL_TYPE } from "./t3-webview-manager/helpers";
import { WORKSPACE_PANEL_TYPE } from "./workspace-panel";

export const BROWSER_SIDEBAR_GROUP_ID = "browser-tabs";

const BROWSER_SIDEBAR_SESSION_PREFIX = "browser-tab:";
const SIMPLE_BROWSER_VIEW_TYPE = "simpleBrowser.view";
const SIMPLE_BROWSER_DEFAULT_LABEL = "simple browser";
const VSMUX_LABEL = "vsmux";
const VSMUX_VIEW_TYPE_PREFIX = "vsmux.";
const VSCODE_WELCOME_LABEL = "welcome";
const VSCODE_IGNORED_LABELS = new Set(["Settings", "Keyboard Shortcuts"]);
const VSMUX_SEARCH_LABEL_PREFIX = "VSmux Search";
const EXTENSION_LABEL_FRAGMENT = "Extension:";
const WORKING_TREE_LABEL_FRAGMENT = "(Working Tree)";
const INDEX_LABEL_FRAGMENT = "(Index)";
const FILE_LIKE_LABEL_SUFFIX_PATTERN = /\.(?:[a-z0-9]{1,8})(?:\s*\([^)]+\))?$/i;
const IGNORED_WEBVIEW_VIEW_TYPES = new Set([
  "claudevscodepanel",
  "claudeplanpreview",
  "claudevscodesidebar",
  "claudevscodesidebarsecondary",
  "claudevscodesessionslist",
]);

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

type LiveBrowserTabInspection =
  | {
      accepted: false;
      inputKind: string;
      labelUrl?: string;
      rawUrl?: string;
      reason: string;
      url?: string;
      viewType?: string;
    }
  | {
      accepted: true;
      detail?: string;
      identity: string;
      inputKind: string;
      labelUrl?: string;
      rawUrl?: string;
      reason: string;
      url?: string;
      viewType?: string;
    };

type StorybookBrowserTabDebugEntry = {
  accepted: boolean;
  groupIsActive: boolean;
  inputKind: string;
  isTabActive: boolean;
  label: string;
  reason: string;
  url?: string;
  viewColumn: vscode.ViewColumn;
  viewType?: string;
};

let lastStorybookBrowserTabScanSummarySignature: string | undefined;

export function getLiveBrowserTabs(
  tabGroups: readonly vscode.TabGroup[] = vscode.window.tabGroups.all,
): LiveBrowserTabEntry[] {
  const browserTabs: LiveBrowserTabEntry[] = [];
  const occurrenceByIdentity = new Map<string, number>();
  const scanId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storybookDebugEntries: StorybookBrowserTabDebugEntry[] = [];
  let totalTabCount = 0;

  logBrowserTabDetection("browserTabs.scan.start", {
    groupCount: tabGroups.length,
    scanId,
  });

  for (const group of tabGroups) {
    if (group.viewColumn === undefined) {
      continue;
    }

    for (const tab of group.tabs) {
      totalTabCount += 1;
      const browserTabInspection = inspectLiveBrowserTab(tab);
      storybookDebugEntries.push({
        accepted: browserTabInspection.accepted,
        groupIsActive: group.isActive,
        inputKind: browserTabInspection.inputKind,
        isTabActive: tab.isActive,
        label: tab.label,
        reason: browserTabInspection.reason,
        url: browserTabInspection.url,
        viewColumn: group.viewColumn,
        viewType: browserTabInspection.viewType,
      });
      logStorybookCandidateTabDebug(scanId, group, tab, browserTabInspection);
      logBrowserTabDetection("browserTabs.scan.tab", {
        groupIsActive: group.isActive,
        inputDebug: getTabInputDebugInfo(tab.input),
        inputConstructorName: tab.input?.constructor?.name,
        inputKind: browserTabInspection.inputKind,
        isAccepted: browserTabInspection.accepted,
        isTabActive: tab.isActive,
        label: tab.label,
        labelUrl: browserTabInspection.labelUrl,
        rawUrl: browserTabInspection.rawUrl,
        reason: browserTabInspection.reason,
        scanId,
        url: browserTabInspection.url,
        viewColumn: group.viewColumn,
        viewType: browserTabInspection.viewType,
      });
      if (!browserTabInspection.accepted) {
        continue;
      }

      const inputKind = browserTabInspection.inputKind;
      const identity = [group.viewColumn, inputKind, tab.label, browserTabInspection.identity].join(
        "|",
      );
      const occurrence = occurrenceByIdentity.get(identity) ?? 0;
      occurrenceByIdentity.set(identity, occurrence + 1);
      browserTabs.push({
        detail: browserTabInspection.detail,
        inputKind,
        isActive: group.isActive && tab.isActive,
        label: tab.label,
        sessionId: createBrowserSidebarSessionId(
          group.viewColumn,
          inputKind,
          tab.label,
          browserTabInspection.identity,
          occurrence,
        ),
        tab,
        url: browserTabInspection.url,
        viewType: browserTabInspection.viewType,
        viewColumn: group.viewColumn,
      });
    }
  }

  logBrowserTabDetection("browserTabs.scan.complete", {
    browserTabCount: browserTabs.length,
    scanId,
  });
  logStorybookScanSummaryDebug(scanId, tabGroups.length, totalTabCount, storybookDebugEntries);

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

function normalizeSidebarBrowserLabelUrl(label: string): string | undefined {
  const explicitUrl = normalizeSidebarBrowserExplicitLabelUrl(label);
  if (explicitUrl) {
    return explicitUrl;
  }

  return normalizeDirectSidebarBrowserHostLabelUrl(label);
}

function normalizeSidebarBrowserExplicitLabelUrl(label: string): string | undefined {
  const trimmedLabel = unwrapBrowserHostLabel(label.trim());
  if (/^https?:\/\//i.test(trimmedLabel)) {
    return normalizeSidebarBrowserUrl(trimmedLabel);
  }

  const embeddedUrl = extractEmbeddedSidebarBrowserUrl(label);
  return embeddedUrl ? normalizeSidebarBrowserUrl(embeddedUrl) : undefined;
}

function normalizeDirectSidebarBrowserHostLabelUrl(label: string): string | undefined {
  const normalizedDirectLabel = normalizeDirectSidebarBrowserLabel(label);
  if (normalizedDirectLabel) {
    return normalizedDirectLabel;
  }

  return undefined;
}

function normalizeDirectSidebarBrowserLabel(label: string): string | undefined {
  const trimmedLabel = unwrapBrowserHostLabel(label.trim());
  if (!trimmedLabel) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmedLabel)) {
    return normalizeSidebarBrowserUrl(trimmedLabel);
  }

  if (isLikelyBrowserHostLabel(trimmedLabel)) {
    return normalizeSidebarBrowserUrl(`http://${trimmedLabel}`);
  }

  return undefined;
}

function trimTrailingBrowserUrlPunctuation(value: string): string {
  return value.replace(/[),.;]+$/g, "");
}

function extractEmbeddedSidebarBrowserUrl(label: string): string | undefined {
  const urlStartIndex = label.search(/https?:\/\//i);
  if (urlStartIndex < 0) {
    return undefined;
  }

  const urlTail = label.slice(urlStartIndex);
  const wrapperEndIndex = urlTail.search(/[)\]>]/);
  const candidate = wrapperEndIndex >= 0 ? urlTail.slice(0, wrapperEndIndex) : urlTail;
  const sanitizedCandidate = trimTrailingBrowserUrlPunctuation(candidate)
    .replace(/\|(?=[/?#])/g, "")
    .replace(/\s+/g, "");

  return sanitizedCandidate || undefined;
}

function getEmbeddedSidebarBrowserUrlDebugInfo(label: string): Record<string, unknown> {
  const urlStartIndex = label.search(/https?:\/\//i);
  if (urlStartIndex < 0) {
    return {
      found: false,
      normalizedUrl: undefined,
    };
  }

  const urlTail = label.slice(urlStartIndex);
  const wrapperEndIndex = urlTail.search(/[)\]>]/);
  const candidate = wrapperEndIndex >= 0 ? urlTail.slice(0, wrapperEndIndex) : urlTail;
  const trimmedCandidate = trimTrailingBrowserUrlPunctuation(candidate);
  const sanitizedCandidate = trimmedCandidate.replace(/\|(?=[/?#])/g, "").replace(/\s+/g, "");

  return {
    candidate,
    found: true,
    normalizedUrl: normalizeSidebarBrowserUrl(sanitizedCandidate),
    sanitizedCandidate,
    trimmedCandidate,
    urlStartIndex,
    urlTailPreview: urlTail.slice(0, 240),
    wrapperEndIndex,
  };
}

function logStorybookCandidateTabDebug(
  scanId: string,
  group: vscode.TabGroup,
  tab: vscode.Tab,
  inspection: LiveBrowserTabInspection,
): void {
  if (!isStorybookBrowserTabDebugCandidate(tab.label, inspection)) {
    return;
  }

  logStorybookBrowserTabDebug("storybookBrowserTabs.scan.candidate", {
    groupIsActive: group.isActive,
    inputDebug: getTabInputDebugInfo(tab.input),
    inputConstructorName: tab.input?.constructor?.name,
    inputKind: inspection.inputKind,
    isAccepted: inspection.accepted,
    isTabActive: tab.isActive,
    label: tab.label,
    labelAnalysis: getStorybookBrowserTabLabelDebugInfo(tab.label),
    labelUrl: inspection.labelUrl,
    rawUrl: inspection.rawUrl,
    reason: inspection.reason,
    scanId,
    url: inspection.url,
    viewColumn: group.viewColumn,
    viewType: inspection.viewType,
  });
}

function logStorybookScanSummaryDebug(
  scanId: string,
  groupCount: number,
  totalTabCount: number,
  entries: readonly StorybookBrowserTabDebugEntry[],
): void {
  const candidateEntries = entries.filter((entry) =>
    isStorybookBrowserTabDebugCandidateLabel(entry.label),
  );
  const acceptedEntries = entries.filter((entry) => entry.accepted);
  const signature = JSON.stringify({
    accepted: acceptedEntries.map((entry) => [entry.label, entry.reason, entry.url]),
    candidates: candidateEntries.map((entry) => [entry.label, entry.reason, entry.url]),
    labels: entries.map((entry) => entry.label),
  });

  if (signature === lastStorybookBrowserTabScanSummarySignature) {
    return;
  }

  lastStorybookBrowserTabScanSummarySignature = signature;
  logStorybookBrowserTabDebug("storybookBrowserTabs.scan.summary", {
    acceptedBrowserTabCount: acceptedEntries.length,
    acceptedBrowserTabs: acceptedEntries.map((entry) => ({
      inputKind: entry.inputKind,
      label: entry.label,
      reason: entry.reason,
      url: entry.url,
      viewColumn: entry.viewColumn,
      viewType: entry.viewType,
    })),
    candidateTabCount: candidateEntries.length,
    candidateTabs: candidateEntries.map((entry) => ({
      inputKind: entry.inputKind,
      label: entry.label,
      reason: entry.reason,
      url: entry.url,
      viewColumn: entry.viewColumn,
      viewType: entry.viewType,
    })),
    groupCount,
    scanId,
    tabLabels: entries.map((entry) => ({
      accepted: entry.accepted,
      inputKind: entry.inputKind,
      label: entry.label,
      reason: entry.reason,
      viewColumn: entry.viewColumn,
      viewType: entry.viewType,
    })),
    totalTabCount,
  });
}

function isStorybookBrowserTabDebugCandidate(
  label: string,
  inspection: LiveBrowserTabInspection,
): boolean {
  return (
    isStorybookBrowserTabDebugCandidateLabel(label) ||
    inspection.reason.includes("label-url") ||
    inspection.url?.includes(":6006") === true ||
    inspection.url?.includes(":6007") === true
  );
}

function isStorybookBrowserTabDebugCandidateLabel(label: string): boolean {
  return /storybook|https?:\/\/|localhost|127\.0\.0\.1|192\.168\.|:6006|:6007/i.test(label);
}

function getStorybookBrowserTabLabelDebugInfo(label: string): Record<string, unknown> {
  return {
    directHostLabelUrl: normalizeDirectSidebarBrowserHostLabelUrl(label),
    explicitLabelUrl: normalizeSidebarBrowserExplicitLabelUrl(label),
    hasHttpUrl: /https?:\/\//i.test(label),
    hasStorybookText: /storybook/i.test(label),
    looksFileLike: FILE_LIKE_LABEL_SUFFIX_PATTERN.test(label.trim()),
    normalizedLabelUrl: normalizeSidebarBrowserLabelUrl(label),
    rawLength: label.length,
    trimmedLabel: label.trim(),
    unknownTitleHeuristic: isLikelyUnknownBrowserTabTitle(label),
    urlExtraction: getEmbeddedSidebarBrowserUrlDebugInfo(label),
  };
}

function unwrapBrowserHostLabel(label: string): string {
  const wrapperPairs: ReadonlyArray<readonly [string, string]> = [
    ["[", "]"],
    ["(", ")"],
    ["<", ">"],
  ];

  for (const [start, end] of wrapperPairs) {
    if (label.startsWith(start) && label.endsWith(end) && label.length > 2) {
      return label.slice(1, -1).trim();
    }
  }

  return label;
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

function inspectLiveBrowserTab(tab: vscode.Tab): LiveBrowserTabInspection {
  const inputKind = getBrowserTabInputKind(tab);
  if (tab.label.trim().startsWith(VSMUX_SEARCH_LABEL_PREFIX)) {
    return { accepted: false, inputKind, reason: "ignored:vsmux-search-label" };
  }

  if (tab.label.includes(EXTENSION_LABEL_FRAGMENT)) {
    return { accepted: false, inputKind, reason: "ignored:extension-label" };
  }

  if (VSCODE_IGNORED_LABELS.has(tab.label.trim())) {
    return { accepted: false, inputKind, reason: "ignored:vscode-label" };
  }

  if (tab.label.includes(WORKING_TREE_LABEL_FRAGMENT) || tab.label.includes(INDEX_LABEL_FRAGMENT)) {
    return { accepted: false, inputKind, reason: "ignored:git-diff-label" };
  }

  if (tab.label.trim().toLowerCase() === VSCODE_WELCOME_LABEL) {
    return { accepted: false, inputKind, reason: "ignored:welcome-label" };
  }

  if (isDiffTabInput(tab.input)) {
    return { accepted: false, inputKind, reason: "ignored:diff-input" };
  }

  const viewType = getTabViewType(tab.input);
  const rawUrl = getBrowserTabUrl(tab);
  const url = normalizeSidebarBrowserUrl(rawUrl);
  const labelUrl =
    inputKind === "webview" || inputKind === "custom"
      ? normalizeSidebarBrowserLabelUrl(tab.label)
      : inputKind === "undefined"
        ? normalizeSidebarBrowserExplicitLabelUrl(tab.label)
        : undefined;

  if (isVSmuxOwnedTab(tab, viewType, url)) {
    return {
      accepted: false,
      inputKind,
      labelUrl,
      rawUrl,
      reason: "ignored:vsmux-owned",
      url,
      viewType,
    };
  }

  if (isIgnoredNonBrowserWebviewViewType(viewType)) {
    return {
      accepted: false,
      inputKind,
      labelUrl,
      rawUrl,
      reason: "ignored:non-browser-webview",
      url,
      viewType,
    };
  }

  if (url) {
    return {
      accepted: true,
      detail: url,
      identity: url,
      inputKind,
      labelUrl,
      rawUrl,
      reason: "accepted:input-url",
      url,
      viewType,
    };
  }

  if (labelUrl) {
    return {
      accepted: true,
      detail: labelUrl,
      identity: labelUrl,
      inputKind,
      labelUrl,
      rawUrl,
      reason: "accepted:label-url",
      url: labelUrl,
      viewType,
    };
  }

  if (
    viewType?.toLowerCase() === SIMPLE_BROWSER_VIEW_TYPE.toLowerCase() &&
    tab.label.trim().toLowerCase() !== SIMPLE_BROWSER_DEFAULT_LABEL
  ) {
    return {
      accepted: true,
      detail: undefined,
      identity: `${viewType}:${tab.label}`,
      inputKind,
      labelUrl,
      rawUrl,
      reason: "accepted:simple-browser-title",
      url: undefined,
      viewType,
    };
  }

  if (inputKind === "undefined" && isLikelyUnknownBrowserTabTitle(tab.label)) {
    return {
      accepted: true,
      detail: undefined,
      identity: `unknown-input:${tab.label}`,
      inputKind,
      labelUrl,
      rawUrl,
      reason: "accepted:unknown-input-title",
      url: undefined,
      viewType,
    };
  }

  return {
    accepted: false,
    inputKind,
    labelUrl,
    rawUrl,
    reason: "ignored:no-supported-browser-signal",
    url,
    viewType,
  };
}

function getTabInputDebugInfo(input: vscode.Tab["input"]): Record<string, unknown> {
  if (input === undefined || input === null) {
    return { kind: typeof input };
  }

  if (typeof input !== "object") {
    return {
      kind: typeof input,
      valuePreview: String(input),
    };
  }

  const record = input as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(input) as Record<string, unknown> | null;
  const prototypeLevelTwo =
    prototype && typeof prototype === "object"
      ? (Object.getPrototypeOf(prototype) as Record<string, unknown> | null)
      : null;

  return {
    commonValues: {
      modified: getDebugValuePreview(record.modified),
      original: getDebugValuePreview(record.original),
      resource: getDebugValuePreview(record.resource),
      uri: getDebugValuePreview(record.uri),
      viewType: getDebugValuePreview(record.viewType),
    },
    constructorName: input.constructor?.name,
    ownKeys: Object.getOwnPropertyNames(input).sort(),
    prototypeConstructorName:
      prototype && "constructor" in prototype && prototype.constructor
        ? (prototype.constructor as { name?: unknown }).name
        : undefined,
    prototypeKeys:
      prototype && typeof prototype === "object"
        ? Object.getOwnPropertyNames(prototype).sort().slice(0, 20)
        : undefined,
    prototypeLevelTwoConstructorName:
      prototypeLevelTwo && "constructor" in prototypeLevelTwo && prototypeLevelTwo.constructor
        ? (prototypeLevelTwo.constructor as { name?: unknown }).name
        : undefined,
    prototypeLevelTwoKeys:
      prototypeLevelTwo && typeof prototypeLevelTwo === "object"
        ? Object.getOwnPropertyNames(prototypeLevelTwo).sort().slice(0, 20)
        : undefined,
  };
}

function isLikelyUnknownBrowserTabTitle(label: string): boolean {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    return false;
  }

  if (normalizeSidebarBrowserExplicitLabelUrl(trimmedLabel)) {
    return true;
  }

  if (
    trimmedLabel.includes("/") ||
    trimmedLabel.includes("\\") ||
    FILE_LIKE_LABEL_SUFFIX_PATTERN.test(trimmedLabel)
  ) {
    return false;
  }

  return /[a-z]/i.test(trimmedLabel);
}

function getDebugValuePreview(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "object") {
    if ("toString" in value && typeof value.toString === "function") {
      try {
        return value.toString();
      } catch {
        return {
          constructorName: (value as { constructor?: { name?: unknown } }).constructor?.name,
          ownKeys: Object.getOwnPropertyNames(value).sort().slice(0, 10),
        };
      }
    }

    return {
      constructorName: (value as { constructor?: { name?: unknown } }).constructor?.name,
      ownKeys: Object.getOwnPropertyNames(value).sort().slice(0, 10),
    };
  }

  return typeof value;
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

function isIgnoredNonBrowserWebviewViewType(viewType: string | undefined): boolean {
  if (!viewType) {
    return false;
  }

  return IGNORED_WEBVIEW_VIEW_TYPES.has(viewType.toLowerCase());
}

function isVSmuxLocalAssetUrl(url: string): boolean {
  return /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/(?:workspace|t3code-embed)(?:\/|$)/i.test(
    url,
  );
}

function isLikelyBrowserHostLabel(label: string): boolean {
  return (
    /^(?:localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?(?:[/?#].*)?$/i.test(label) ||
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])(?::\d{1,5})?(?:[/?#].*)?$/i.test(
      label,
    )
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
