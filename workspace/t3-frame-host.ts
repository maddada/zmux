import { coalesceWorkingStartedAtMs, getWorkingStartedAtMsFromText } from "./t3-working-timer";

type T3FrameBootstrap = {
  browserBootstrapToken: string;
  scriptSrc: string;
  sessionId: string;
  sessionRecordTitle: string;
  serverOrigin: string;
  styleHref?: string;
  threadId: string;
  workspaceRoot: string;
  wsUrl: string;
};

type T3ClipboardFilePayload = {
  buffer: ArrayBuffer;
  name: string;
  type: string;
};

type T3ClipboardPayload = {
  files: T3ClipboardFilePayload[];
  text: string;
};

const zmux_PASTE_TRACE_TAG = "[zmux_PASTE_TRACE]";
const MAX_PASTE_TRACE_TEXT_LENGTH = 180;
const THREAD_SOURCE_REPRO_POLL_MS = 1_000;
const WORKING_STARTED_AT_POLL_MS = 1_000;

declare global {
  interface Window {
    __zmux_T3_ACTIVE_THREAD_ID__?: string;
    __zmux_T3_ACTIVE_THREAD_TITLE__?: string;
    __zmux_T3_COMPOSER_FOCUS_ENABLED__?: boolean;
    __zmux_T3_BOOTSTRAP__?: {
      embedMode: "zmux-mobile";
      httpOrigin: string;
      sessionId: string;
      threadId: string;
      workspaceRoot: string;
      wsUrl: string;
    };
    desktopBridge?: {
      browser: {
        close: (_input: unknown) => Promise<null>;
        closeTab: (_input: unknown) => Promise<null>;
        getState: (input: { threadId?: string } | undefined) => Promise<{
          activeTabId: null;
          lastError: null;
          open: false;
          tabs: [];
          threadId: string;
        }>;
        goBack: (_input: unknown) => Promise<null>;
        goForward: (_input: unknown) => Promise<null>;
        hide: (_input: unknown) => Promise<void>;
        navigate: (_input: unknown) => Promise<null>;
        newTab: (_input: unknown) => Promise<null>;
        onState: (_listener: (state: unknown) => void) => () => void;
        open: (_input: unknown) => Promise<null>;
        openDevTools: (_input: unknown) => Promise<void>;
        reload: (_input: unknown) => Promise<null>;
        selectTab: (_input: unknown) => Promise<null>;
        setPanelBounds: (_input: unknown) => Promise<null>;
      };
      confirm: (message: string) => Promise<boolean>;
      getClientSettings: () => Promise<null>;
      getLocalEnvironmentBootstrap: () => {
        bootstrapToken?: string;
        httpBaseUrl: string;
        label: string;
        wsBaseUrl: string;
      };
      getWsUrl: () => string;
      getSavedEnvironmentRegistry: () => Promise<readonly []>;
      getSavedEnvironmentSecret: () => Promise<null>;
      getServerExposureState: () => Promise<{
        advertisedHost: null;
        endpointUrl: null;
        mode: "local-only";
      }>;
      notifications: {
        isSupported: () => Promise<boolean>;
        show: (_input: unknown) => Promise<boolean>;
      };
      getUpdateState: () => Promise<{
        canRetry: false;
        checkedAt: null;
        checkedVersion: null;
        downloadPercent: null;
        downloadedVersion: null;
        errorContext: null;
        message: null;
        phase: "idle";
      }>;
      installUpdate: () => Promise<{
        accepted: false;
        completed: false;
        state: Awaited<ReturnType<NonNullable<Window["desktopBridge"]>["getUpdateState"]>>;
      }>;
      checkForUpdate: () => Promise<{
        checked: false;
        state: Awaited<ReturnType<NonNullable<Window["desktopBridge"]>["getUpdateState"]>>;
      }>;
      downloadUpdate: () => Promise<{
        accepted: false;
        completed: false;
        state: Awaited<ReturnType<NonNullable<Window["desktopBridge"]>["getUpdateState"]>>;
      }>;
      onMenuAction: (_listener: (action: string) => void) => () => void;
      onUpdateState: (_listener: (state: unknown) => void) => () => void;
      openExternal: (url: string) => Promise<boolean>;
      pickFolder: () => Promise<null>;
      removeSavedEnvironmentSecret: () => Promise<void>;
      setClientSettings: () => Promise<void>;
      setSavedEnvironmentRegistry: () => Promise<void>;
      setSavedEnvironmentSecret: () => Promise<boolean>;
      setServerExposureMode: () => Promise<{
        advertisedHost: null;
        endpointUrl: null;
        mode: "local-only";
      }>;
      setTheme: () => Promise<void>;
      showContextMenu: () => Promise<null>;
    };
  }
}

const bootstrap = readBootstrap();
document.title = bootstrap.sessionRecordTitle;
window.__zmux_T3_BOOTSTRAP__ = {
  embedMode: "zmux-mobile",
  httpOrigin: bootstrap.serverOrigin,
  sessionId: bootstrap.sessionId,
  threadId: bootstrap.threadId,
  workspaceRoot: bootstrap.workspaceRoot,
  wsUrl: bootstrap.wsUrl,
};
window.__zmux_T3_ACTIVE_THREAD_ID__ = bootstrap.threadId;
window.__zmux_T3_COMPOSER_FOCUS_ENABLED__ = false;
installDesktopBridge();

if (bootstrap.styleHref) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = bootstrap.styleHref;
  document.head.append(stylesheet);
}

const root = document.getElementById("root");
if (root) {
  root.id = "root";
}

reportDebugLog("workspace.t3FrameHostBoot", {
  hash: window.location.hash,
  href: window.location.href,
  pathname: window.location.pathname,
  threadId: bootstrap.threadId,
});
reportThreadSourceRepro("frameHostBoot", {
  hash: window.location.hash,
  href: window.location.href,
  pathname: window.location.pathname,
  threadId: bootstrap.threadId,
  title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
});

window.addEventListener("message", (event) => {
  if (event.data?.type === "blurComposer") {
    window.__zmux_T3_COMPOSER_FOCUS_ENABLED__ = false;
    reportDebugLog("workspace.t3FrameHostBlurComposerMessage", {
      activeElementTag: document.activeElement?.tagName ?? null,
      currentThreadId: getCurrentThreadId(),
    });
    blurComposerEditor();
    return;
  }

  if (event.data?.type !== "focusComposer") {
    return;
  }

  window.__zmux_T3_COMPOSER_FOCUS_ENABLED__ = true;
  reportDebugLog("workspace.t3FrameHostFocusComposerMessage", {
    activeElementTag: document.activeElement?.tagName ?? null,
    currentThreadId: getCurrentThreadId(),
  });
  focusComposerEditor();
});

document.addEventListener(
  "pointerdown",
  (event) => {
    notifyParentFocus(event);
  },
  true,
);

let nextClipboardRequestId = 0;
const pendingClipboardReads = new Map<number, (payload: T3ClipboardPayload) => void>();
let pendingPasteFallbackTimer: number | undefined;
let pendingPrimedClipboardRead: Promise<T3ClipboardPayload> | undefined;
let lastPrimedClipboardPayload: T3ClipboardPayload | undefined;
let lastPrimedClipboardPayloadAt = 0;
let primedClipboardReadToken = 0;
let currentThreadId = bootstrap.threadId;
let pendingComposerFocusTimeoutId: number | undefined;
let composerFocusRequestVersion = 0;
let lastReportedWorkingStartedAtMs: number | undefined;
let lastObservedLocationKey = `${window.location.href}#${window.location.hash}`;
let lastObservedThreadSourceState = `${bootstrap.threadId}|${window.__zmux_T3_ACTIVE_THREAD_TITLE__ ?? ""}`;

installObservedThreadGlobals();
installHistoryObservers();
const threadSourceReproPollId = window.setInterval(() => {
  const nextLocationKey = `${window.location.href}#${window.location.hash}`;
  if (nextLocationKey !== lastObservedLocationKey) {
    reportThreadSourceRepro("frameLocationPolledChange", {
      currentThreadId: getCurrentThreadId(),
      hash: window.location.hash,
      href: window.location.href,
      previousLocationKey: lastObservedLocationKey,
      title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
    });
    lastObservedLocationKey = nextLocationKey;
  }

  const nextThreadSourceState = `${getCurrentThreadId() ?? ""}|${window.__zmux_T3_ACTIVE_THREAD_TITLE__ ?? ""}`;
  if (nextThreadSourceState !== lastObservedThreadSourceState) {
    reportThreadSourceRepro("frameThreadStatePolledChange", {
      currentThreadId: getCurrentThreadId(),
      hash: window.location.hash,
      href: window.location.href,
      previousState: lastObservedThreadSourceState,
      title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
    });
    lastObservedThreadSourceState = nextThreadSourceState;
  }
}, THREAD_SOURCE_REPRO_POLL_MS);

window.addEventListener("beforeunload", () => {
  workingStartedAtObserver.disconnect();
  window.clearInterval(workingStartedAtPollId);
  window.clearInterval(threadSourceReproPollId);
  reportDebugLog("workspace.t3FrameHostBeforeUnload", {
    currentThreadId: getCurrentThreadId(),
    hash: window.location.hash,
    href: window.location.href,
  });
  reportThreadSourceRepro("frameHostBeforeUnload", {
    currentThreadId: getCurrentThreadId(),
    href: window.location.href,
    title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
  });
});

window.addEventListener("pagehide", (event) => {
  reportDebugLog("workspace.t3FrameHostPageHide", {
    currentThreadId: getCurrentThreadId(),
    persisted: event.persisted,
  });
  reportThreadSourceRepro("frameHostPageHide", {
    currentThreadId: getCurrentThreadId(),
    persisted: event.persisted,
    title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
  });
});

document.addEventListener("visibilitychange", () => {
  reportDebugLog("workspace.t3FrameHostVisibilityChange", {
    currentThreadId: getCurrentThreadId(),
    visibilityState: document.visibilityState,
  });
  reportThreadSourceRepro("frameHostVisibilityChange", {
    currentThreadId: getCurrentThreadId(),
    title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
    visibilityState: document.visibilityState,
  });
});

window.addEventListener("message", (event) => {
  if (event.data?.type !== "zmuxT3ClipboardReadResult") {
    return;
  }

  const requestId = typeof event.data.requestId === "number" ? event.data.requestId : undefined;
  if (requestId === undefined) {
    return;
  }

  const resolver = pendingClipboardReads.get(requestId);
  if (!resolver) {
    return;
  }

  pendingClipboardReads.delete(requestId);
  logPasteTrace("host.clipboard.readResult", {
    ...summarizeClipboardPayload({
      files: Array.isArray(event.data.files) ? event.data.files : [],
      text: typeof event.data.text === "string" ? event.data.text : "",
    }),
    requestId,
  });
  resolver({
    files: Array.isArray(event.data.files)
      ? event.data.files.filter((entry: unknown): entry is T3ClipboardFilePayload => {
          return (
            entry != null &&
            typeof entry === "object" &&
            typeof (entry as { name?: unknown }).name === "string" &&
            typeof (entry as { type?: unknown }).type === "string" &&
            (entry as { buffer?: unknown }).buffer instanceof ArrayBuffer
          );
        })
      : [],
    text: typeof event.data.text === "string" ? event.data.text : "",
  });
});

document.addEventListener(
  "keydown",
  (event) => {
    const primaryModifier = navigator.platform.toLowerCase().includes("mac")
      ? event.metaKey
      : event.ctrlKey;
    if (!primaryModifier || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "c") {
      const text = readSelectedText();
      if (!text) {
        return;
      }
      event.preventDefault();
      writeClipboard(text);
      return;
    }

    if (key === "x") {
      const text = readSelectedText();
      if (!text || !isEditableTarget(document.activeElement)) {
        return;
      }
      event.preventDefault();
      writeClipboard(text);
      deleteSelectionFromActiveTarget();
      return;
    }

    if (key === "v" && isEditableTarget(document.activeElement)) {
      logPasteTrace("host.keydown.pasteShortcut", {
        activeTarget: summarizeEditableTarget(document.activeElement),
        currentThreadId: getCurrentThreadId(),
      });
      primeClipboardRead("keydownShortcut");
      schedulePasteFallback();
    }
  },
  true,
);

document.addEventListener(
  "copy",
  (event) => {
    const text = readSelectedText();
    if (!text) {
      return;
    }
    event.preventDefault();
    writeClipboard(text);
  },
  true,
);

document.addEventListener(
  "cut",
  (event) => {
    const text = readSelectedText();
    if (!text || !isEditableTarget(document.activeElement)) {
      return;
    }
    event.preventDefault();
    writeClipboard(text);
    deleteSelectionFromActiveTarget();
  },
  true,
);

document.addEventListener(
  "paste",
  (event) => {
    const clipboardSummary = summarizeClipboardData(event.clipboardData);
    logPasteTrace("host.paste.capture", {
      activeTarget: summarizeEditableTarget(document.activeElement),
      clipboard: clipboardSummary,
      currentThreadId: getCurrentThreadId(),
    });

    if (!isEditableTarget(document.activeElement)) {
      logPasteTrace("host.paste.ignored.nonEditableTarget", {
        activeTarget: summarizeEditableTarget(document.activeElement),
      });
      return;
    }

    clearPasteFallback();

    const clipboardData = event.clipboardData;
    if (clipboardData?.files.length) {
      clearPrimedClipboardPayload();
      logPasteTrace("host.paste.nativeFiles", clipboardSummary);
      return;
    }

    if ((clipboardData?.getData("text/plain") ?? "").length > 0) {
      clearPrimedClipboardPayload();
      logPasteTrace("host.paste.nativeText", clipboardSummary);
      return;
    }

    event.preventDefault();
    logPasteTrace("host.paste.preventDefaultForBridge", {
      activeTarget: summarizeEditableTarget(document.activeElement),
      clipboard: clipboardSummary,
    });
    void pasteFromClipboardBridge();
  },
  true,
);

const script = document.createElement("script");
script.type = "module";
script.src = bootstrap.scriptSrc;
document.body.append(script);

function readBootstrap(): T3FrameBootstrap {
  const bootstrapElement = document.getElementById("zmux-t3-bootstrap");
  const encoded = bootstrapElement?.textContent;
  if (!encoded) {
    throw new Error("Missing zmux T3 iframe bootstrap payload.");
  }

  return JSON.parse(encoded) as T3FrameBootstrap;
}

function focusComposerEditor() {
  const maxAttempts = 10;
  let attempt = 0;
  const requestVersion = ++composerFocusRequestVersion;

  if (pendingComposerFocusTimeoutId !== undefined) {
    window.clearTimeout(pendingComposerFocusTimeoutId);
    pendingComposerFocusTimeoutId = undefined;
  }

  reportDebugLog("workspace.t3FrameHostFocusComposerStart", {
    requestVersion,
  });

  const tryFocus = () => {
    if (requestVersion !== composerFocusRequestVersion) {
      reportDebugLog("workspace.t3FrameHostFocusComposerCancelled", {
        attempt,
        requestVersion,
      });
      return;
    }

    const composer = document.querySelector(
      '[data-testid="composer-editor"][contenteditable="true"]',
    );
    if (!(composer instanceof HTMLElement)) {
      if (attempt < maxAttempts) {
        attempt += 1;
        reportDebugLog("workspace.t3FrameHostFocusComposerRetry", {
          attempt,
          requestVersion,
        });
        pendingComposerFocusTimeoutId = window.setTimeout(tryFocus, 50);
      } else {
        reportDebugLog("workspace.t3FrameHostFocusComposerMissing", {
          attempt,
          requestVersion,
        });
      }
      return;
    }

    pendingComposerFocusTimeoutId = undefined;

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
    reportDebugLog("workspace.t3FrameHostFocusComposerApplied", {
      activeElementTag: document.activeElement?.tagName ?? null,
      requestVersion,
      selectionRangeCount: selection.rangeCount,
    });
  };

  tryFocus();
}

function blurComposerEditor() {
  const previousRequestVersion = composerFocusRequestVersion;
  composerFocusRequestVersion += 1;
  if (pendingComposerFocusTimeoutId !== undefined) {
    window.clearTimeout(pendingComposerFocusTimeoutId);
    pendingComposerFocusTimeoutId = undefined;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  const selection = window.getSelection();
  selection?.removeAllRanges();
  reportDebugLog("workspace.t3FrameHostBlurComposerApplied", {
    activeElementTag: document.activeElement?.tagName ?? null,
    previousRequestVersion,
    selectionRangeCount: selection?.rangeCount ?? 0,
  });
}

function notifyParentFocus(event?: PointerEvent) {
  const target = event?.target instanceof Element ? event.target : undefined;
  window.parent?.postMessage(
    {
      payload: {
        activeElementTag: document.activeElement?.tagName ?? null,
        button: event?.button ?? null,
        composerFocusEnabled: window.__zmux_T3_COMPOSER_FOCUS_ENABLED__ ?? null,
        currentThreadId: getCurrentThreadId(),
        detail: event?.detail ?? null,
        pointerType: event?.pointerType ?? null,
        selectionTextLength: window.getSelection()?.toString().length ?? 0,
        targetRole: target?.getAttribute("role") ?? null,
        targetTag: target?.tagName ?? null,
      },
      sessionId: bootstrap.sessionId,
      type: "zmuxT3Focus",
    },
    "*",
  );
}

function reportDebugLog(event: string, payload?: Record<string, unknown>) {
  window.parent?.postMessage(
    {
      event,
      payload,
      sessionId: bootstrap.sessionId,
      type: "zmuxT3DebugLog",
    },
    "*",
  );
}

function reportThreadSourceRepro(event: string, payload?: Record<string, unknown>) {
  reportDebugLog(`repro.t3ThreadSource.${event}`, payload);
}

function installObservedThreadGlobals(): void {
  observeThreadGlobal("__zmux_T3_ACTIVE_THREAD_ID__");
  observeThreadGlobal("__zmux_T3_ACTIVE_THREAD_TITLE__");
}

function observeThreadGlobal(
  key: "__zmux_T3_ACTIVE_THREAD_ID__" | "__zmux_T3_ACTIVE_THREAD_TITLE__",
): void {
  let value = window[key];
  Object.defineProperty(window, key, {
    configurable: true,
    enumerable: true,
    get() {
      return value;
    },
    set(nextValue: string | undefined) {
      const previousValue = value;
      value = nextValue;
      reportThreadSourceRepro("frameGlobalChanged", {
        currentThreadId: key === "__zmux_T3_ACTIVE_THREAD_ID__" ? nextValue : getCurrentThreadId(),
        globalKey: key,
        hash: window.location.hash,
        href: window.location.href,
        nextValue,
        previousValue,
        title:
          key === "__zmux_T3_ACTIVE_THREAD_TITLE__"
            ? nextValue
            : window.__zmux_T3_ACTIVE_THREAD_TITLE__,
      });
    },
  });
  window[key] = value;
}

function installHistoryObservers(): void {
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = (...args) => {
    originalPushState(...args);
    reportThreadSourceRepro("frameHistoryPushState", {
      currentThreadId: getCurrentThreadId(),
      hash: window.location.hash,
      href: window.location.href,
      title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
    });
  };

  window.history.replaceState = (...args) => {
    originalReplaceState(...args);
    reportThreadSourceRepro("frameHistoryReplaceState", {
      currentThreadId: getCurrentThreadId(),
      hash: window.location.hash,
      href: window.location.href,
      title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
    });
  };

  window.addEventListener("hashchange", () => {
    reportThreadSourceRepro("frameHashChange", {
      currentThreadId: getCurrentThreadId(),
      hash: window.location.hash,
      href: window.location.href,
      title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
    });
  });

  window.addEventListener("popstate", () => {
    reportThreadSourceRepro("framePopState", {
      currentThreadId: getCurrentThreadId(),
      hash: window.location.hash,
      href: window.location.href,
      title: window.__zmux_T3_ACTIVE_THREAD_TITLE__,
    });
  });
}

function getCurrentThreadId(): string | undefined {
  return (
    window.__zmux_T3_ACTIVE_THREAD_ID__ ??
    currentThreadId ??
    window.__zmux_T3_BOOTSTRAP__?.threadId
  );
}

function syncWorkingStartedAt(reason: string): void {
  const workingStartedAtText = document.body?.innerText ?? document.body?.textContent ?? "";
  const nextWorkingStartedAtMs = coalesceWorkingStartedAtMs({
    nextWorkingStartedAtMs: getWorkingStartedAtMsFromText(workingStartedAtText, Date.now()),
    previousWorkingStartedAtMs: lastReportedWorkingStartedAtMs,
  });
  if (nextWorkingStartedAtMs === lastReportedWorkingStartedAtMs) {
    return;
  }

  lastReportedWorkingStartedAtMs = nextWorkingStartedAtMs;
  const workingStartedAt =
    nextWorkingStartedAtMs === undefined
      ? undefined
      : new Date(nextWorkingStartedAtMs).toISOString();
  reportDebugLog("workspace.t3FrameHostWorkingStartedAtChanged", {
    reason,
    workingStartedAt,
  });
  window.parent?.postMessage(
    {
      sessionId: bootstrap.sessionId,
      type: "zmuxT3WorkingStartedAtChanged",
      workingStartedAt,
    },
    "*",
  );
}

syncWorkingStartedAt("initial");
const workingStartedAtObserver = new MutationObserver(() => {
  syncWorkingStartedAt("mutation");
});
workingStartedAtObserver.observe(document.documentElement, {
  characterData: true,
  childList: true,
  subtree: true,
});
const workingStartedAtPollId = window.setInterval(() => {
  syncWorkingStartedAt("poll");
}, WORKING_STARTED_AT_POLL_MS);

function normalizeTitle(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function installDesktopBridge() {
  const updateState = {
    canRetry: false,
    checkedAt: null,
    checkedVersion: null,
    downloadPercent: null,
    downloadedVersion: null,
    errorContext: null,
    message: null,
    phase: "idle" as const,
  } as const;
  const serverExposureState = {
    advertisedHost: null,
    endpointUrl: null,
    mode: "local-only" as const,
  };

  window.desktopBridge = {
    browser: {
      close: async () => null,
      closeTab: async () => null,
      getState: async (input) => ({
        activeTabId: null,
        lastError: null,
        open: false,
        tabs: [],
        threadId: input?.threadId ?? currentThreadId,
      }),
      goBack: async () => null,
      goForward: async () => null,
      hide: async () => undefined,
      navigate: async () => null,
      newTab: async () => null,
      onState: () => () => undefined,
      open: async () => null,
      openDevTools: async () => undefined,
      reload: async () => null,
      selectTab: async () => null,
      setPanelBounds: async () => null,
    },
    confirm: async (message: string) => window.confirm(message),
    getClientSettings: async () => null,
    getLocalEnvironmentBootstrap: () => ({
      bootstrapToken: bootstrap.browserBootstrapToken,
      httpBaseUrl: bootstrap.serverOrigin,
      label: bootstrap.sessionRecordTitle || "T3 Code",
      wsBaseUrl: bootstrap.wsUrl,
    }),
    getWsUrl: () => bootstrap.wsUrl,
    getSavedEnvironmentRegistry: async () => [],
    getSavedEnvironmentSecret: async () => null,
    getServerExposureState: async () => serverExposureState,
    notifications: {
      isSupported: async () => false,
      show: async () => false,
    },
    getUpdateState: async () => updateState,
    installUpdate: async () => ({ accepted: false, completed: false, state: updateState }),
    checkForUpdate: async () => ({ checked: false, state: updateState }),
    downloadUpdate: async () => ({ accepted: false, completed: false, state: updateState }),
    onMenuAction: () => () => undefined,
    onUpdateState: () => () => undefined,
    openExternal: async (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    },
    pickFolder: async () => null,
    removeSavedEnvironmentSecret: async () => undefined,
    setClientSettings: async () => undefined,
    setSavedEnvironmentRegistry: async () => undefined,
    setSavedEnvironmentSecret: async () => false,
    setServerExposureMode: async () => serverExposureState,
    setTheme: async () => undefined,
    showContextMenu: async () => null,
  };
}

function writeClipboard(text: string) {
  window.parent?.postMessage(
    {
      text,
      type: "zmuxT3ClipboardWrite",
    },
    "*",
  );
}

function readClipboard(): Promise<T3ClipboardPayload> {
  const requestId = nextClipboardRequestId++;
  return new Promise((resolve) => {
    pendingClipboardReads.set(requestId, resolve);
    window.parent?.postMessage(
      {
        requestId,
        type: "zmuxT3ClipboardReadRequest",
      },
      "*",
    );
  });
}

function readSelectedText(): string {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart ?? 0;
    const end = activeElement.selectionEnd ?? start;
    return start === end ? "" : activeElement.value.slice(start, end);
  }

  return window.getSelection()?.toString() ?? "";
}

function schedulePasteFallback() {
  clearPasteFallback();
  logPasteTrace("host.paste.fallbackScheduled", {
    activeTarget: summarizeEditableTarget(document.activeElement),
  });
  pendingPasteFallbackTimer = window.setTimeout(() => {
    pendingPasteFallbackTimer = undefined;
    logPasteTrace("host.paste.fallbackTriggered", {
      activeTarget: summarizeEditableTarget(document.activeElement),
    });
    void pasteFromClipboardBridge();
  }, 75);
}

function clearPasteFallback() {
  if (pendingPasteFallbackTimer === undefined) {
    return;
  }

  window.clearTimeout(pendingPasteFallbackTimer);
  pendingPasteFallbackTimer = undefined;
}

async function pasteFromClipboardBridge() {
  if (!isEditableTarget(document.activeElement)) {
    logPasteTrace("host.paste.bridge.aborted.nonEditableTarget", {
      activeTarget: summarizeEditableTarget(document.activeElement),
    });
    return;
  }

  logPasteTrace("host.paste.bridge.start", {
    activeTarget: summarizeEditableTarget(document.activeElement),
  });
  const payload = await resolveClipboardPayloadForPasteBridge();
  logPasteTrace("host.paste.bridge.payload", {
    activeTarget: summarizeEditableTarget(document.activeElement),
    payload: summarizeClipboardPayload(payload),
  });
  if (payload.files.length > 0) {
    logPasteTrace("host.paste.bridge.postPayload", {
      activeTarget: summarizeEditableTarget(document.activeElement),
      payload: summarizeClipboardPayload(payload),
    });
    window.postMessage(
      {
        files: payload.files,
        text: payload.text,
        type: "zmuxPastePayload",
      },
      "*",
    );
    return;
  }

  logPasteTrace("host.paste.bridge.insertText", {
    activeTarget: summarizeEditableTarget(document.activeElement),
    looksLikeFilePath: looksLikeFilesystemPath(payload.text),
    payload: summarizeClipboardPayload(payload),
  });
  insertTextIntoActiveTarget(payload.text);
}

function primeClipboardRead(reason: string): void {
  if (pendingPrimedClipboardRead) {
    logPasteTrace("host.paste.bridge.primeSkipped.pending", {
      activeTarget: summarizeEditableTarget(document.activeElement),
      reason,
    });
    return;
  }

  logPasteTrace("host.paste.bridge.primeStart", {
    activeTarget: summarizeEditableTarget(document.activeElement),
    reason,
  });
  const readToken = ++primedClipboardReadToken;
  pendingPrimedClipboardRead = readClipboard()
    .then((payload) => {
      if (readToken !== primedClipboardReadToken) {
        logPasteTrace("host.paste.bridge.primeDiscarded", {
          reason,
        });
        return payload;
      }
      lastPrimedClipboardPayload = payload;
      lastPrimedClipboardPayloadAt = Date.now();
      logPasteTrace("host.paste.bridge.primeResolved", {
        payload: summarizeClipboardPayload(payload),
        reason,
      });
      return payload;
    })
    .finally(() => {
      pendingPrimedClipboardRead = undefined;
    });
}

async function resolveClipboardPayloadForPasteBridge(): Promise<T3ClipboardPayload> {
  if (pendingPrimedClipboardRead) {
    logPasteTrace("host.paste.bridge.payloadSource", {
      source: "primedPending",
    });
    return pendingPrimedClipboardRead;
  }

  if (lastPrimedClipboardPayload && Date.now() - lastPrimedClipboardPayloadAt <= 1_500) {
    const payload = lastPrimedClipboardPayload;
    clearPrimedClipboardPayload();
    logPasteTrace("host.paste.bridge.payloadSource", {
      source: "primedCache",
    });
    return payload;
  }

  logPasteTrace("host.paste.bridge.payloadSource", {
    source: "freshRead",
  });
  return readClipboard();
}

function clearPrimedClipboardPayload(): void {
  primedClipboardReadToken += 1;
  lastPrimedClipboardPayload = undefined;
  lastPrimedClipboardPayloadAt = 0;
}

function isEditableTarget(
  target: Element | null,
): target is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function insertTextIntoActiveTarget(text: string) {
  if (!text) {
    logPasteTrace("host.insertText.skipped.emptyText", {
      activeTarget: summarizeEditableTarget(document.activeElement),
    });
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    logPasteTrace("host.insertText.input", {
      activeTarget: summarizeEditableTarget(activeElement),
      looksLikeFilePath: looksLikeFilesystemPath(text),
      textSnippet: summarizeTextSnippet(text),
      textLength: text.length,
    });
    const start = activeElement.selectionStart ?? activeElement.value.length;
    const end = activeElement.selectionEnd ?? start;
    activeElement.setRangeText(text, start, end, "end");
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertFromPaste",
      }),
    );
    return;
  }

  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    logPasteTrace("host.insertText.contentEditable", {
      activeTarget: summarizeEditableTarget(activeElement),
      looksLikeFilePath: looksLikeFilesystemPath(text),
      textSnippet: summarizeTextSnippet(text),
      textLength: text.length,
    });
    activeElement.focus();
    if (
      typeof document.execCommand === "function" &&
      document.execCommand("insertText", false, text)
    ) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    if (selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(activeElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertFromPaste",
      }),
    );
  }
}

function logPasteTrace(event: string, payload?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const serializedPayload = payload ? JSON.stringify(payload) : "{}";
  console.info(`${zmux_PASTE_TRACE_TAG} ${timestamp} ${event} ${serializedPayload}`);
}

function summarizeClipboardData(data: DataTransfer | null): Record<string, unknown> {
  return {
    files: summarizeFileLikeEntries(data?.files ?? []),
    textLength: data?.getData("text/plain").length ?? 0,
    textSnippet: summarizeTextSnippet(data?.getData("text/plain") ?? ""),
    types: data ? [...data.types] : [],
  };
}

function summarizeClipboardPayload(payload: T3ClipboardPayload): Record<string, unknown> {
  return {
    files: summarizeFileLikeEntries(payload.files),
    textLength: payload.text.length,
    textSnippet: summarizeTextSnippet(payload.text),
  };
}

function summarizeFileLikeEntries(
  entries: ArrayLike<{ name?: string; type?: string; size?: number }>,
): Array<Record<string, unknown>> {
  return Array.from(entries).map((entry) => ({
    name: entry.name ?? "",
    size: typeof entry.size === "number" ? entry.size : undefined,
    type: entry.type ?? "",
  }));
}

function summarizeEditableTarget(target: Element | null): Record<string, unknown> {
  if (!target) {
    return { kind: "none" };
  }

  return {
    ariaLabel: target.getAttribute("aria-label"),
    contentEditable: target instanceof HTMLElement ? target.isContentEditable : false,
    kind:
      target instanceof HTMLInputElement
        ? "input"
        : target instanceof HTMLTextAreaElement
          ? "textarea"
          : target instanceof HTMLElement && target.isContentEditable
            ? "contenteditable"
            : target.tagName.toLowerCase(),
    role: target.getAttribute("role"),
    tagName: target.tagName.toLowerCase(),
  };
}

function summarizeTextSnippet(text: string): string | undefined {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return undefined;
  }

  return trimmedText.slice(0, MAX_PASTE_TRACE_TEXT_LENGTH);
}

function looksLikeFilesystemPath(text: string): boolean {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return false;
  }

  return (
    trimmedText.startsWith("/") ||
    trimmedText.startsWith("file://") ||
    /^[A-Za-z]:[\\/]/.test(trimmedText)
  );
}

function deleteSelectionFromActiveTarget() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart ?? 0;
    const end = activeElement.selectionEnd ?? start;
    if (start === end) {
      return;
    }
    activeElement.setRangeText("", start, end, "start");
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: "",
        inputType: "deleteByCut",
      }),
    );
    return;
  }

  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      return;
    }
    range.deleteContents();
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: "",
        inputType: "deleteByCut",
      }),
    );
  }
}
