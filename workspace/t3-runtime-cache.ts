let nextCachedT3RuntimeId = 0;
const THREAD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CachedT3Runtime = {
  cacheKey: string;
  html: string;
  iframe: HTMLIFrameElement;
  iframeSrc: string;
  renderNonce: number;
  runtimeId: string;
  sessionId: string;
  title: string;
  blobUrl: string;
  refCount: number;
};

type AcquireCachedT3RuntimeOptions = {
  cacheKey: string;
  html: string;
  renderNonce: number;
  sessionId: string;
  threadId: string;
  title: string;
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void;
};

const cachedT3Runtimes = new Map<string, CachedT3Runtime>();
let parkingLot: HTMLDivElement | undefined;

export function acquireCachedT3Runtime(options: AcquireCachedT3RuntimeOptions): CachedT3Runtime {
  const existingRuntime = cachedT3Runtimes.get(options.cacheKey);
  if (existingRuntime) {
    if (
      existingRuntime.renderNonce !== options.renderNonce ||
      existingRuntime.html !== options.html
    ) {
      options.reportDebug?.("workspace.t3RuntimeCacheReplace", {
        cacheKey: options.cacheKey,
        existingRenderNonce: existingRuntime.renderNonce,
        nextRenderNonce: options.renderNonce,
        runtimeId: existingRuntime.runtimeId,
        sessionId: options.sessionId,
      });
      destroyCachedT3Runtime(options.cacheKey);
    } else {
      existingRuntime.refCount += 1;
      existingRuntime.title = options.title;
      existingRuntime.iframe.title = options.title;
      options.reportDebug?.("workspace.t3RuntimeCacheReused", {
        cacheKey: options.cacheKey,
        refCount: existingRuntime.refCount,
        runtimeId: existingRuntime.runtimeId,
        sessionId: options.sessionId,
      });
      return existingRuntime;
    }
  }

  const blob = new Blob([options.html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const iframeSrc = buildT3IframeSrc(blobUrl, options.threadId);
  const iframe = document.createElement("iframe");
  iframe.allow = "clipboard-read; clipboard-write";
  iframe.className = "t3-pane-frame";
  iframe.sandbox.value =
    "allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads";
  iframe.title = options.title;
  iframe.src = iframeSrc;

  const runtime: CachedT3Runtime = {
    blobUrl,
    cacheKey: options.cacheKey,
    html: options.html,
    iframe,
    iframeSrc,
    refCount: 1,
    renderNonce: options.renderNonce,
    runtimeId: `t3-runtime-${++nextCachedT3RuntimeId}`,
    sessionId: options.sessionId,
    title: options.title,
  };

  cachedT3Runtimes.set(options.cacheKey, runtime);
  options.reportDebug?.("workspace.t3RuntimeCacheCreated", {
    cacheKey: options.cacheKey,
    iframeSrc,
    renderNonce: options.renderNonce,
    runtimeId: runtime.runtimeId,
    sessionId: options.sessionId,
  });
  return runtime;
}

export function attachCachedT3Runtime(
  runtime: CachedT3Runtime,
  host: HTMLDivElement | null | undefined,
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void,
): void {
  if (!host) {
    return;
  }

  const previousParent = runtime.iframe.parentElement;
  runtime.iframe.style.display = "";
  if (runtime.iframe.parentElement !== host) {
    host.appendChild(runtime.iframe);
  }
  reportDebug?.("workspace.t3RuntimeCacheAttached", {
    hostChildCount: host.childElementCount,
    hostConnected: host.isConnected,
    previousParentTag: previousParent?.tagName ?? null,
    runtimeId: runtime.runtimeId,
    sessionId: runtime.sessionId,
    targetParentTag: host.tagName,
  });
}

export function releaseCachedT3Runtime(
  cacheKey: string,
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void,
): void {
  const runtime = cachedT3Runtimes.get(cacheKey);
  if (!runtime) {
    return;
  }

  runtime.refCount = Math.max(0, runtime.refCount - 1);
  reportDebug?.("workspace.t3RuntimeCacheReleased", {
    cacheKey,
    refCount: runtime.refCount,
    runtimeId: runtime.runtimeId,
    sessionId: runtime.sessionId,
  });
  if (runtime.refCount > 0) {
    return;
  }

  const previousParent = runtime.iframe.parentElement;
  runtime.iframe.style.display = "none";
  ensureParkingLot().appendChild(runtime.iframe);
  reportDebug?.("workspace.t3RuntimeCacheParked", {
    cacheKey,
    parkingLotChildCount: parkingLot?.childElementCount ?? undefined,
    previousParentTag: previousParent?.tagName ?? null,
    runtimeId: runtime.runtimeId,
    sessionId: runtime.sessionId,
  });
}

export function blurAllCachedT3Runtimes(
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void,
): void {
  for (const runtime of cachedT3Runtimes.values()) {
    runtime.iframe.contentWindow?.postMessage({ type: "blurComposer" }, "*");
    runtime.iframe.blur();
    runtime.iframe.tabIndex = -1;
    reportDebug?.("workspace.t3RuntimeCacheBlurred", {
      isConnected: runtime.iframe.isConnected,
      parentTag: runtime.iframe.parentElement?.tagName ?? null,
      runtimeId: runtime.runtimeId,
      sessionId: runtime.sessionId,
      title: runtime.title,
    });
  }
}

export function destroyCachedT3Runtime(cacheKey: string): void {
  const runtime = cachedT3Runtimes.get(cacheKey);
  if (!runtime) {
    return;
  }

  cachedT3Runtimes.delete(cacheKey);
  URL.revokeObjectURL(runtime.blobUrl);
  runtime.iframe.remove();
}

function ensureParkingLot(): HTMLDivElement {
  if (parkingLot?.isConnected) {
    return parkingLot;
  }

  parkingLot = document.createElement("div");
  parkingLot.dataset.zmuxT3ParkingLot = "true";
  parkingLot.style.height = "1px";
  parkingLot.style.left = "-10000px";
  parkingLot.style.overflow = "hidden";
  parkingLot.style.pointerEvents = "none";
  parkingLot.style.position = "fixed";
  parkingLot.style.top = "-10000px";
  parkingLot.style.width = "1px";
  document.body.appendChild(parkingLot);
  return parkingLot;
}

function destroyAllCachedT3Runtimes(): void {
  for (const cacheKey of [...cachedT3Runtimes.keys()]) {
    destroyCachedT3Runtime(cacheKey);
  }
}

export function buildT3IframeSrc(blobUrl: string, threadId: string): string {
  const normalizedThreadId = normalizeThreadId(threadId);
  return normalizedThreadId ? `${blobUrl}#/${normalizedThreadId}` : blobUrl;
}

function normalizeThreadId(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return undefined;
  }

  return THREAD_ID_PATTERN.test(normalizedValue) ? normalizedValue : undefined;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", destroyAllCachedT3Runtimes);
}
