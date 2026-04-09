import { useEffect, useRef, useState } from "react";
import { IconArrowBigDownFilled } from "@tabler/icons-react";
import { Restty } from "restty";
import type {
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelConnection,
  WorkspacePanelTerminalAppearance,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import { logWorkspaceDebug } from "./workspace-debug";
import { getResttyFontSources, getResttyTheme } from "./restty-terminal-config";
import type { WorkspaceResttyTransportController } from "./restty-session-transport";
import {
  acquireCachedTerminalRuntime,
  getTerminalRuntimeCacheKey,
  releaseCachedTerminalRuntime,
  type CachedTerminalRuntime,
} from "./terminal-runtime-cache";
import "./terminal-pane.css";

let nextTerminalPaneInstanceId = 0;
const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const RESTTY_STARTUP_BACKGROUND = "#121212";
const TYPING_AUTO_SCROLL_BURST_WINDOW_MS = 450;
const TYPING_AUTO_SCROLL_TRIGGER_COUNT = 4;
const SCROLL_TO_BOTTOM_THRESHOLD_PX = 200;
const SCROLL_TO_BOTTOM_HIDE_THRESHOLD_PX = 40;
const LAG_NOTICE_OVERSHOOT_THRESHOLD_MS = 1_000;
const LAG_NOTICE_MONITOR_WINDOW_MS = 10_000;
const SCHEDULER_PROBE_INTERVAL_MS = 50;
const SCHEDULER_PROBE_WINDOW_MS = 5_000;
const SCHEDULER_OVERSHOOT_WARN_MS = 250;
const SEARCH_RESULTS_EMPTY = {
  resultCount: 0,
  resultIndex: -1,
};

export type TerminalPaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelConnection;
  debugLog?: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isFocused: boolean;
  isVisible: boolean;
  onLagDetected?: (payload: {
    overshootMs: number;
    sessionId: string;
    visibilityState: DocumentVisibilityState;
  }) => void;
  onActivate: (source: "focusin" | "pointer") => void;
  pane: WorkspacePanelTerminalPane;
  refreshRequestId: number;
  terminalAppearance: WorkspacePanelTerminalAppearance;
  workspaceGenerationId: string;
};

type SearchResultsState = {
  resultCount: number;
  resultIndex: number;
};

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  autoFocusRequest,
  connection,
  debugLog,
  debuggingMode,
  isFocused,
  isVisible,
  onLagDetected,
  onActivate,
  pane,
  refreshRequestId,
  terminalAppearance,
  workspaceGenerationId,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<CachedTerminalRuntime | null>(null);
  const paneInstanceIdRef = useRef(`terminal-pane-${++nextTerminalPaneInstanceId}`);
  const debugLogRef = useRef(debugLog);
  const debuggingModeRef = useRef(debuggingMode);
  const isFocusedRef = useRef(isFocused);
  const isVisibleRef = useRef(isVisible);
  const lagDetectedRef = useRef(false);
  const lagDetectedHandlerRef = useRef(onLagDetected);
  const handledAutoFocusRequestIdRef = useRef<number | undefined>(undefined);
  const handledRefreshRequestIdRef = useRef(refreshRequestId);
  const boundScrollHostRef = useRef<HTMLElement | null>(null);
  const scrollHostListenerRef = useRef<EventListener>(() => {
    scrollVisibilityUpdaterRef.current();
  });
  const scrollVisibilityUpdaterRef = useRef<() => void>(() => {});
  const bootstrapVisualsCompleteRef = useRef(false);
  const canvasVisibleRef = useRef(false);
  const appearanceRequestIdRef = useRef(0);
  const appearancePromiseRef = useRef<Promise<void>>(Promise.resolve());
  const appliedFontSourcesSignatureRef = useRef("");
  const activePaneRef = useRef<ReturnType<Restty["activePane"]>>(null);
  const connectPtyStartedRef = useRef(false);
  const maintenanceProbeIdRef = useRef(0);
  const latestTermSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const rapidTypingCountRef = useRef(0);
  const rapidTypingWindowStartedAtRef = useRef(0);
  const rendererModeRef = useRef<string | null>(null);
  const resttyRef = useRef<Restty | null>(null);
  const postSettleAppearanceAppliedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastMeasuredBoundsRef = useRef<{ height: number; width: number } | null>(null);
  const transportRef = useRef<WorkspaceResttyTransportController | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultsState>(SEARCH_RESULTS_EMPTY);
  const runtimeCacheKey = getTerminalRuntimeCacheKey(pane.sessionId, workspaceGenerationId);

  useEffect(() => {
    debugLogRef.current = debugLog;
  }, [debugLog]);

  useEffect(() => {
    debuggingModeRef.current = debuggingMode;
  }, [debuggingMode]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    lagDetectedHandlerRef.current = onLagDetected;
  }, [onLagDetected]);

  const reportDebug = (event: string, payload?: Record<string, unknown>) => {
    const runtime = runtimeRef.current;
    const decoratedPayload = {
      paneInstanceId: paneInstanceIdRef.current,
      portalTargetId:
        rootRef.current?.parentElement?.dataset.vsmuxPortalTargetId ??
        runtime?.host.parentElement?.dataset.vsmuxPortalTargetId,
      renderNonce: pane.renderNonce,
      runtimeCacheKey,
      runtimeHostId: runtime?.runtimeHostId,
      runtimeInstanceId: runtime?.runtimeInstanceId,
      sessionId: pane.sessionId,
      ...payload,
    };
    logWorkspaceDebug(debuggingModeRef.current, event, decoratedPayload);
    debugLogRef.current?.(event, decoratedPayload);
  };

  const collectSnapshotMetrics = () => ({
    snapshotAgentName: pane.snapshot?.agentName,
    snapshotHistoryBytes: pane.snapshot?.history?.length ?? 0,
    snapshotIsAttached: pane.snapshot?.isAttached,
    snapshotStatus: pane.snapshot?.status,
  });

  const syncRefsFromRuntime = (runtime: CachedTerminalRuntime) => {
    activePaneRef.current = runtime.activePane;
    appearancePromiseRef.current = runtime.appearancePromise;
    appearanceRequestIdRef.current = runtime.appearanceRequestId;
    appliedFontSourcesSignatureRef.current = runtime.appliedFontSourcesSignature;
    bootstrapVisualsCompleteRef.current = runtime.bootstrapVisualsComplete;
    canvasVisibleRef.current = runtime.canvasVisible;
    connectPtyStartedRef.current = runtime.connectPtyStarted;
    latestTermSizeRef.current = runtime.latestTermSize;
    maintenanceProbeIdRef.current = runtime.maintenanceProbeId;
    postSettleAppearanceAppliedRef.current = runtime.postSettleAppearanceApplied;
    rendererModeRef.current = runtime.rendererMode;
    resttyRef.current = runtime.restty;
    transportRef.current = runtime.transportController;
  };

  const syncRuntimeFromRefs = () => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.appearancePromise = appearancePromiseRef.current;
    runtime.appearanceRequestId = appearanceRequestIdRef.current;
    runtime.appliedFontSourcesSignature = appliedFontSourcesSignatureRef.current;
    runtime.bootstrapVisualsComplete = bootstrapVisualsCompleteRef.current;
    runtime.canvasVisible = canvasVisibleRef.current;
    runtime.connectPtyStarted = connectPtyStartedRef.current;
    runtime.latestTermSize = latestTermSizeRef.current;
    runtime.maintenanceProbeId = maintenanceProbeIdRef.current;
    runtime.postSettleAppearanceApplied = postSettleAppearanceAppliedRef.current;
    runtime.rendererMode = rendererModeRef.current;
  };

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  };

  const isTerminalFocusWithin = () => {
    const root = rootRef.current;
    const activeElement = document.activeElement;
    return !!root && !!activeElement && root.contains(activeElement);
  };

  const focusTerminal = () => {
    activePaneRef.current?.focus();
  };

  const focusTerminalWithRetries = (reason: string) => {
    const maxAttempts = 12;
    let attempts = 0;

    const tryFocus = () => {
      if (!isVisibleRef.current) {
        return;
      }

      attempts += 1;
      focusTerminal();

      requestAnimationFrame(() => {
        if (isTerminalFocusWithin()) {
          reportDebug("terminal.focusSettled", {
            attempts,
            reason,
            sessionId: pane.sessionId,
          });
          return;
        }

        if (attempts >= maxAttempts) {
          reportDebug("terminal.focusSettleTimedOut", {
            attempts,
            reason,
            sessionId: pane.sessionId,
          });
          return;
        }

        tryFocus();
      });
    };

    tryFocus();
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    focusSearchInput();
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    activePaneRef.current?.clearSearch();
    setSearchResults(SEARCH_RESULTS_EMPTY);
    requestAnimationFrame(() => {
      focusTerminal();
    });
  };

  const applyAppearance = (sourceLabel = "vscode"): Promise<void> => {
    const restty = resttyRef.current;
    const activePane = activePaneRef.current;
    if (!restty || !activePane) {
      return Promise.resolve();
    }

    const requestId = appearanceRequestIdRef.current + 1;
    appearanceRequestIdRef.current = requestId;
    const fontSources = getResttyFontSources(terminalAppearance.fontFamily);
    const fontSourcesSignature = JSON.stringify(fontSources);
    const theme = getResttyTheme();
    const appearancePromise = new Promise<void>((resolve) => {
      const resolveAppearance = () => {
        resolve();
      };

      const applyResolvedTheme = (phase: string) => {
        if (
          appearanceRequestIdRef.current !== requestId ||
          resttyRef.current !== restty ||
          activePaneRef.current !== activePane
        ) {
          return;
        }

        if (theme) {
          activePane.applyTheme(theme, `${sourceLabel}:${phase}`);
        }
      };

      activePane.setFontSize(terminalAppearance.fontSize);

      const finishAppearanceApply = () => {
        if (
          appearanceRequestIdRef.current !== requestId ||
          resttyRef.current !== restty ||
          activePaneRef.current !== activePane
        ) {
          resolveAppearance();
          return;
        }

        activePane.setFontSize(terminalAppearance.fontSize);
        applyResolvedTheme("applied");
        resolveAppearance();
        requestAnimationFrame(() => {
          if (appearanceRequestIdRef.current !== requestId) {
            return;
          }

          applyResolvedTheme("raf-1");
          requestAnimationFrame(() => {
            if (appearanceRequestIdRef.current !== requestId) {
              return;
            }

            applyResolvedTheme("raf-2");
          });
        });
        window.setTimeout(() => {
          if (appearanceRequestIdRef.current !== requestId) {
            return;
          }

          applyResolvedTheme("timeout");
        }, 120);
      };

      if (appliedFontSourcesSignatureRef.current === fontSourcesSignature) {
        finishAppearanceApply();
        return;
      }

      void restty
        .setFontSources(fontSources)
        .then(() => {
          if (appearanceRequestIdRef.current !== requestId) {
            resolveAppearance();
            return;
          }

          appliedFontSourcesSignatureRef.current = fontSourcesSignature;
          finishAppearanceApply();
        })
        .catch(() => {
          if (appearanceRequestIdRef.current !== requestId) {
            resolveAppearance();
            return;
          }

          finishAppearanceApply();
        });
    });
    appearancePromiseRef.current = appearancePromise;
    syncRuntimeFromRefs();
    return appearancePromise;
  };

  const updateTerminalSize = () => {
    const container = containerRef.current;
    const activePane = activePaneRef.current;
    if (!container || !activePane) {
      return false;
    }

    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return false;
    }

    const roundedBounds = {
      height: Math.round(bounds.height),
      width: Math.round(bounds.width),
    };
    const previousBounds = lastMeasuredBoundsRef.current;
    const boundsUnchanged =
      previousBounds?.width === roundedBounds.width &&
      previousBounds?.height === roundedBounds.height;
    if (boundsUnchanged && connectPtyStartedRef.current && latestTermSizeRef.current) {
      return false;
    }

    lastMeasuredBoundsRef.current = roundedBounds;
    activePane.updateSize(true);
    return true;
  };

  const shouldFreezeHiddenTerminal = () => !isVisible && connectPtyStartedRef.current;

  const runVisibleMaintenance = (
    sourceLabel: string,
    options: {
      updateSize?: boolean;
    } = {},
  ) => {
    if (options.updateSize) {
      updateTerminalSize();
    }
    if (!bootstrapVisualsCompleteRef.current) {
      seedResttyBackgroundSurfaces();
      if (maybeRevealResttyCanvas(sourceLabel)) {
        bootstrapVisualsCompleteRef.current = true;
        syncRuntimeFromRefs();
      }
    }
    ensureScrollHostListener();
    updateScrollToBottomVisibility();
  };

  const seedResttyBackgroundSurfaces = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.style.backgroundColor = RESTTY_STARTUP_BACKGROUND;
    const surfaceSelectors = [
      ".restty-pane-root",
      ".pane-split",
      ".pane",
      ".pane-canvas",
      ".restty-native-scroll-root",
      ".restty-native-scroll-host",
      ".restty-native-scroll-canvas",
      "canvas",
    ];
    for (const selector of surfaceSelectors) {
      const elements = container.querySelectorAll<HTMLElement>(selector);
      for (const element of elements) {
        element.style.backgroundColor = RESTTY_STARTUP_BACKGROUND;
      }
    }
  };

  const setResttyCanvasVisibility = (visible: boolean) => {
    const container = containerRef.current;
    const previousVisible = canvasVisibleRef.current;
    canvasVisibleRef.current = visible;
    syncRuntimeFromRefs();
    if (!container) {
      reportDebug("terminal.canvasVisibilitySet", {
        nextVisible: visible,
        previousVisible,
        withContainer: false,
      });
      return;
    }

    const opacity = visible ? "1" : "0";
    let affectedCanvasCount = 0;
    for (const element of container.querySelectorAll<HTMLElement>(
      ".pane-canvas, .restty-native-scroll-canvas, canvas",
    )) {
      element.style.opacity = opacity;
      affectedCanvasCount += 1;
    }
    reportDebug("terminal.canvasVisibilitySet", {
      affectedCanvasCount,
      nextVisible: visible,
      previousVisible,
      withContainer: true,
    });
  };

  const maybeRevealResttyCanvas = (sourceLabel: string) => {
    const container = containerRef.current;
    if (!container) {
      return false;
    }

    const canvas = container.querySelector<HTMLCanvasElement>(
      ".restty-native-scroll-canvas, .pane-canvas, canvas",
    );
    if (!canvas) {
      return false;
    }

    const hasRealBackingSize = canvas.width > 1 && canvas.height > 1;
    const bounds = canvas.getBoundingClientRect();
    const hasRealLayoutSize = bounds.width > 2 && bounds.height > 2;
    if (!hasRealBackingSize || !hasRealLayoutSize) {
      return false;
    }

    if (!canvasVisibleRef.current) {
      setResttyCanvasVisibility(true);
      reportDebug("terminal.canvasRevealed", {
        canvasHeight: canvas.height,
        canvasWidth: canvas.width,
        source: sourceLabel,
      });
    }

    return true;
  };

  const getScrollHost = () =>
    containerRef.current?.querySelector<HTMLElement>(".restty-native-scroll-host") ?? null;

  const updateScrollToBottomVisibility = () => {
    const scrollHost = getScrollHost();
    if (!scrollHost || !isVisibleRef.current) {
      setShowScrollToBottom(false);
      return;
    }

    const distanceFromBottom =
      scrollHost.scrollHeight - scrollHost.clientHeight - scrollHost.scrollTop;
    setShowScrollToBottom((currentValue) => {
      if (currentValue) {
        return distanceFromBottom > SCROLL_TO_BOTTOM_HIDE_THRESHOLD_PX;
      }

      return distanceFromBottom > SCROLL_TO_BOTTOM_THRESHOLD_PX;
    });
  };

  scrollVisibilityUpdaterRef.current = updateScrollToBottomVisibility;

  const ensureScrollHostListener = () => {
    const scrollHost = getScrollHost();
    if (boundScrollHostRef.current === scrollHost) {
      scrollVisibilityUpdaterRef.current();
      return;
    }

    if (boundScrollHostRef.current) {
      boundScrollHostRef.current.removeEventListener("scroll", scrollHostListenerRef.current);
    }

    boundScrollHostRef.current = scrollHost;
    scrollHost?.addEventListener("scroll", scrollHostListenerRef.current, { passive: true });
    scrollVisibilityUpdaterRef.current();
  };

  const scrollTerminalToBottom = () => {
    const scrollHost = getScrollHost();
    if (!scrollHost) {
      return;
    }

    scrollHost.scrollTop = scrollHost.scrollHeight;
    requestAnimationFrame(() => {
      scrollHost.scrollTop = scrollHost.scrollHeight;
      updateTerminalSize();
      updateScrollToBottomVisibility();
    });
  };

  const noteRapidTypingAndMaybeScrollToBottom = (event: KeyboardEvent | React.KeyboardEvent) => {
    if (!terminalAppearance.scrollToBottomWhenTyping || !isVisible) {
      rapidTypingCountRef.current = 0;
      rapidTypingWindowStartedAtRef.current = 0;
      return;
    }

    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.key.length !== 1
    ) {
      rapidTypingCountRef.current = 0;
      rapidTypingWindowStartedAtRef.current = 0;
      return;
    }

    const now = performance.now();
    if (now - rapidTypingWindowStartedAtRef.current > TYPING_AUTO_SCROLL_BURST_WINDOW_MS) {
      rapidTypingWindowStartedAtRef.current = now;
      rapidTypingCountRef.current = 1;
      return;
    }

    rapidTypingCountRef.current += 1;
    if (rapidTypingCountRef.current < TYPING_AUTO_SCROLL_TRIGGER_COUNT) {
      return;
    }

    rapidTypingCountRef.current = 0;
    rapidTypingWindowStartedAtRef.current = 0;
    scrollTerminalToBottom();
  };

  const sendRawTerminalInput = (data: string) => {
    if (!data) {
      return false;
    }

    return transportRef.current?.sendRawInput(data) ?? false;
  };

  const collectViewportMetrics = () => {
    const container = containerRef.current;
    const scrollHost = getScrollHost();
    const bounds = container?.getBoundingClientRect();
    const distanceFromBottom = scrollHost
      ? scrollHost.scrollHeight - scrollHost.clientHeight - scrollHost.scrollTop
      : undefined;

    return {
      containerHeight: bounds ? Math.round(bounds.height) : undefined,
      containerWidth: bounds ? Math.round(bounds.width) : undefined,
      distanceFromBottomPx:
        distanceFromBottom === undefined ? undefined : Math.max(0, Math.round(distanceFromBottom)),
      rendererMode: rendererModeRef.current,
      scrollClientHeight: scrollHost ? Math.round(scrollHost.clientHeight) : undefined,
      scrollHeight: scrollHost ? Math.round(scrollHost.scrollHeight) : undefined,
      scrollTop: scrollHost ? Math.round(scrollHost.scrollTop) : undefined,
      showScrollToBottom,
      terminalCols: latestTermSizeRef.current?.cols,
      terminalRows: latestTermSizeRef.current?.rows,
    };
  };

  const collectCanvasMetrics = () => {
    const container = containerRef.current;
    if (!container) {
      return {
        canvasDetails: [],
        hiddenCanvasCount: 0,
        visibleCanvasCount: 0,
      };
    }

    let hiddenCanvasCount = 0;
    let visibleCanvasCount = 0;
    const canvasDetails: Array<{
      className: string;
      clientHeight: number;
      clientWidth: number;
      height: number;
      opacity: string;
      visibility: string;
      width: number;
    }> = [];
    const canvases = container.querySelectorAll<HTMLCanvasElement>(
      ".restty-native-scroll-canvas, .pane-canvas, canvas",
    );
    for (const canvas of canvases) {
      const canvasStyle = window.getComputedStyle(canvas);
      const isVisible =
        canvasStyle.display !== "none" &&
        canvasStyle.visibility !== "hidden" &&
        canvasStyle.opacity !== "0";
      if (isVisible) {
        visibleCanvasCount += 1;
      } else {
        hiddenCanvasCount += 1;
      }
      canvasDetails.push({
        className: canvas.className,
        clientHeight: Math.round(canvas.getBoundingClientRect().height),
        clientWidth: Math.round(canvas.getBoundingClientRect().width),
        height: canvas.height,
        opacity: canvasStyle.opacity,
        visibility: canvasStyle.visibility,
        width: canvas.width,
      });
    }

    return {
      canvasDetails,
      hiddenCanvasCount,
      visibleCanvasCount,
    };
  };

  const logViewportMetrics = (event: string, payload?: Record<string, unknown>) => {
    reportDebug(event, {
      ...collectViewportMetrics(),
      ...collectCanvasMetrics(),
      sessionId: pane.sessionId,
      ...payload,
    });
  };

  const schedulePostReplayViewportLogs = (connectionId: number) => {
    logViewportMetrics("terminal.postReplayViewport", {
      connectionId,
      phase: "first-data",
    });

    for (const delayMs of [150, 600, 1500]) {
      window.setTimeout(() => {
        logViewportMetrics("terminal.postReplayViewport", {
          connectionId,
          phase: `after-${String(delayMs)}ms`,
        });
      }, delayMs);
    }
  };

  const schedulePostSettleAppearance = () => {
    if (postSettleAppearanceAppliedRef.current) {
      return;
    }

    postSettleAppearanceAppliedRef.current = true;
    syncRuntimeFromRefs();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void applyAppearance("post-settle");
      });
    });
  };

  const waitForAnimationFrame = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

  const waitForStableTerminalSize = async (): Promise<{ cols: number; rows: number } | null> => {
    let previousMeasurement = "";
    let stableMeasurementCount = 0;
    const startedAt = performance.now();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      updateTerminalSize();
      await waitForAnimationFrame();

      const container = containerRef.current;
      const stableSize = latestTermSizeRef.current;
      const bounds = container?.getBoundingClientRect();
      if (!container || !bounds || bounds.width <= 0 || bounds.height <= 0 || !stableSize) {
        await waitForAnimationFrame();
        continue;
      }

      const measurement = [
        stableSize.cols,
        stableSize.rows,
        Math.round(bounds.width),
        Math.round(bounds.height),
      ].join("x");
      stableMeasurementCount = measurement === previousMeasurement ? stableMeasurementCount + 1 : 1;
      previousMeasurement = measurement;
      if (stableMeasurementCount >= 2) {
        reportDebug("terminal.stableSizeResolved", {
          attempts: attempt + 1,
          cols: stableSize.cols,
          durationMs: Math.round(performance.now() - startedAt),
          rows: stableSize.rows,
        });
        return stableSize;
      }

      await waitForAnimationFrame();
    }

    reportDebug("terminal.stableSizeFallback", {
      attempts: 20,
      cols: latestTermSizeRef.current?.cols,
      durationMs: Math.round(performance.now() - startedAt),
      rows: latestTermSizeRef.current?.rows,
    });
    return latestTermSizeRef.current;
  };

  const startReconnectPerformanceProbe = (sourceLabel: string) => {
    const probeId = maintenanceProbeIdRef.current + 1;
    maintenanceProbeIdRef.current = probeId;
    syncRuntimeFromRefs();
    const startedAt = performance.now();
    let previousFrameAt = startedAt;
    let maxFrameGapMs = 0;
    let frameCount = 0;
    let longTaskCount = 0;
    let longTaskTotalDurationMs = 0;
    let observer: PerformanceObserver | undefined;

    if (typeof PerformanceObserver !== "undefined") {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskCount += 1;
            longTaskTotalDurationMs += entry.duration;
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
      } catch {
        observer = undefined;
      }
    }

    const sampleFrame = () => {
      if (maintenanceProbeIdRef.current !== probeId) {
        observer?.disconnect();
        return;
      }

      const now = performance.now();
      maxFrameGapMs = Math.max(maxFrameGapMs, now - previousFrameAt);
      previousFrameAt = now;
      frameCount += 1;
      if (now - startedAt >= 5_000) {
        observer?.disconnect();
        reportDebug("terminal.performanceWindow", {
          durationMs: Math.round(now - startedAt),
          frameCount,
          longTaskCount,
          longTaskTotalDurationMs: Math.round(longTaskTotalDurationMs),
          maxFrameGapMs: Math.round(maxFrameGapMs),
          rendererMode: rendererModeRef.current,
          sessionId: pane.sessionId,
          source: sourceLabel,
        });
        return;
      }

      requestAnimationFrame(sampleFrame);
    };

    requestAnimationFrame(sampleFrame);
  };

  const connectTerminalWhenReady = async (sourceLabel: string) => {
    if (connection.mock) {
      reportDebug("terminal.connectSkipped", {
        reason: "mock-connection",
        sessionId: pane.sessionId,
        source: sourceLabel,
        ...collectSnapshotMetrics(),
      });
      return;
    }

    if (connectPtyStartedRef.current) {
      reportDebug("terminal.connectSkipped", {
        reason: "connect-already-started",
        sessionId: pane.sessionId,
        source: sourceLabel,
        ...collectSnapshotMetrics(),
      });
      return;
    }

    const activePane = activePaneRef.current;
    const transportController = transportRef.current;
    if (!activePane || !transportController) {
      reportDebug("terminal.connectSkipped", {
        hasActivePane: !!activePane,
        hasTransportController: !!transportController,
        reason: "missing-runtime-primitives",
        sessionId: pane.sessionId,
        source: sourceLabel,
        ...collectSnapshotMetrics(),
      });
      return;
    }

    reportDebug("terminal.connectAttempt", {
      isFocused: isFocusedRef.current,
      isVisible: isVisibleRef.current,
      renderNonce: pane.renderNonce,
      sessionId: pane.sessionId,
      source: sourceLabel,
      ...collectSnapshotMetrics(),
    });

    await appearancePromiseRef.current;
    const stableTerminalSize = await waitForStableTerminalSize();
    if (!stableTerminalSize || connectPtyStartedRef.current) {
      reportDebug("terminal.connectSkipped", {
        connectPtyStarted: connectPtyStartedRef.current,
        reason: stableTerminalSize ? "connect-started-during-wait" : "missing-stable-size",
        sessionId: pane.sessionId,
        source: sourceLabel,
        ...collectSnapshotMetrics(),
      });
      return;
    }

    transportController.markTerminalReady(stableTerminalSize.cols, stableTerminalSize.rows);
    activePane.connectPty(buildSessionSocketUrl(connection, pane.sessionId));
    connectPtyStartedRef.current = true;
    syncRuntimeFromRefs();
    startReconnectPerformanceProbe(sourceLabel);
    logViewportMetrics("terminal.connectWhenReady", {
      cols: stableTerminalSize.cols,
      rows: stableTerminalSize.rows,
      source: sourceLabel,
    });
  };

  const pasteClipboardText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sendRawTerminalInput(text);
      }
    } catch {
      // Clipboard access can fail outside a user gesture.
    }
  };

  useEffect(() => {
    if (!debuggingMode) {
      return;
    }

    let didDispose = false;
    let timerId: number | undefined;
    let rafId = 0;
    let flushTimeoutId: number | undefined;
    let visibilityListener: (() => void) | undefined;
    let focusListener: (() => void) | undefined;
    let blurListener: (() => void) | undefined;
    let expectedTimerAt = performance.now() + SCHEDULER_PROBE_INTERVAL_MS;
    let previousRafAt = performance.now();
    let timerTickCount = 0;
    let timerOvershootTotalMs = 0;
    let timerOvershootMaxMs = 0;
    let timerOvershootWarnCount = 0;
    let rafFrameCount = 0;
    let rafGapTotalMs = 0;
    let rafGapMaxMs = 0;
    const monitorStartedAt = performance.now();
    let startedAt = monitorStartedAt;

    const flushWindow = (source: string) => {
      const now = performance.now();
      const visibilityState = document.visibilityState;
      const documentHasFocus = document.hasFocus();
      const isVisible = isVisibleRef.current;
      const timerOvershootAvgMs =
        timerTickCount > 0 ? Math.round(timerOvershootTotalMs / timerTickCount) : 0;
      const windowDurationMs = Math.round(now - startedAt);
      reportDebug("terminal.schedulerWindow", {
        ...collectViewportMetrics(),
        ...collectCanvasMetrics(),
        documentHasFocus,
        hidden: document.hidden,
        isVisible,
        rafFrameCount,
        rafGapAvgMs: rafFrameCount > 0 ? Math.round(rafGapTotalMs / rafFrameCount) : 0,
        rafGapMaxMs: Math.round(rafGapMaxMs),
        rendererMode: rendererModeRef.current,
        sessionId: pane.sessionId,
        source,
        timerOvershootAvgMs,
        timerOvershootMaxMs: Math.round(timerOvershootMaxMs),
        timerOvershootWarnCount,
        timerTickCount,
        visibilityState,
        windowDurationMs,
      });

      const shouldTreatSchedulerWindowAsLaggy =
        !lagDetectedRef.current &&
        now - monitorStartedAt <= LAG_NOTICE_MONITOR_WINDOW_MS &&
        isVisible &&
        isFocusedRef.current &&
        visibilityState === "visible" &&
        !document.hidden &&
        documentHasFocus &&
        timerOvershootAvgMs >= LAG_NOTICE_OVERSHOOT_THRESHOLD_MS;

      if (shouldTreatSchedulerWindowAsLaggy) {
        reportDebug("terminal.schedulerLagDetected", {
          documentHasFocus,
          elapsedMs: Math.round(now - monitorStartedAt),
          hidden: document.hidden,
          isFocused: isFocusedRef.current,
          isVisible,
          sessionId: pane.sessionId,
          timerOvershootAvgMs,
          timerOvershootMaxMs: Math.round(timerOvershootMaxMs),
          timerOvershootWarnCount,
          timerTickCount,
          visibilityState,
          windowDurationMs,
        });
        lagDetectedRef.current = true;
        lagDetectedHandlerRef.current?.({
          overshootMs: timerOvershootAvgMs,
          sessionId: pane.sessionId,
          visibilityState,
        });
      }

      startedAt = now;
      timerTickCount = 0;
      timerOvershootTotalMs = 0;
      timerOvershootMaxMs = 0;
      timerOvershootWarnCount = 0;
      rafFrameCount = 0;
      rafGapTotalMs = 0;
      rafGapMaxMs = 0;
    };

    const sampleRaf = () => {
      if (didDispose) {
        return;
      }

      const now = performance.now();
      const gapMs = now - previousRafAt;
      previousRafAt = now;
      rafFrameCount += 1;
      rafGapTotalMs += gapMs;
      rafGapMaxMs = Math.max(rafGapMaxMs, gapMs);
      rafId = requestAnimationFrame(sampleRaf);
    };

    const sampleTimer = () => {
      if (didDispose) {
        return;
      }

      const now = performance.now();
      const overshootMs = Math.max(0, now - expectedTimerAt);
      expectedTimerAt += SCHEDULER_PROBE_INTERVAL_MS;
      timerTickCount += 1;
      timerOvershootTotalMs += overshootMs;
      timerOvershootMaxMs = Math.max(timerOvershootMaxMs, overshootMs);
      if (overshootMs >= SCHEDULER_OVERSHOOT_WARN_MS) {
        timerOvershootWarnCount += 1;
      }

      timerId = window.setTimeout(sampleTimer, SCHEDULER_PROBE_INTERVAL_MS);
    };

    const scheduleFlush = () => {
      flushTimeoutId = window.setTimeout(() => {
        flushWindow("timer");
        scheduleFlush();
      }, SCHEDULER_PROBE_WINDOW_MS);
    };

    const logSchedulerState = (source: string) => {
      reportDebug("terminal.schedulerState", {
        ...collectViewportMetrics(),
        ...collectCanvasMetrics(),
        activeElementTagName: document.activeElement?.tagName,
        documentHasFocus: document.hasFocus(),
        hidden: document.hidden,
        isVisible: isVisibleRef.current,
        rendererMode: rendererModeRef.current,
        sessionId: pane.sessionId,
        source,
        visibilityState: document.visibilityState,
      });
    };

    visibilityListener = () => logSchedulerState("document.visibilitychange");
    focusListener = () => logSchedulerState("window.focus");
    blurListener = () => logSchedulerState("window.blur");

    document.addEventListener("visibilitychange", visibilityListener);
    window.addEventListener("focus", focusListener);
    window.addEventListener("blur", blurListener);

    logSchedulerState("mount");
    sampleTimer();
    rafId = requestAnimationFrame(sampleRaf);
    scheduleFlush();

    return () => {
      didDispose = true;
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
      if (flushTimeoutId !== undefined) {
        window.clearTimeout(flushTimeoutId);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (visibilityListener) {
        document.removeEventListener("visibilitychange", visibilityListener);
      }
      if (focusListener) {
        window.removeEventListener("focus", focusListener);
      }
      if (blurListener) {
        window.removeEventListener("blur", blurListener);
      }
    };
  }, [debuggingMode, pane.sessionId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.style.backgroundColor = RESTTY_STARTUP_BACKGROUND;
    let didDispose = false;
    const canvasContextListeners: Array<{
      canvas: HTMLCanvasElement;
      handleContextLost: EventListener;
      handleContextRestored: EventListener;
    }> = [];
    reportDebug("terminal.paneMount", {
      isFocused,
      isVisible,
      ...collectSnapshotMetrics(),
    });
    const runtime = acquireCachedTerminalRuntime({
      cacheKey: runtimeCacheKey,
      callbacks: {
        onFirstData: (connectionId) => {
          schedulePostReplayViewportLogs(connectionId);
          schedulePostSettleAppearance();
        },
        onRendererMode: (rendererMode) => {
          rendererModeRef.current = rendererMode;
          syncRuntimeFromRefs();
        },
        onSearchState: (state) => {
          if (didDispose) {
            return;
          }

          setSearchResults({
            resultCount: state.total,
            resultIndex: state.selectedIndex ?? -1,
          });
        },
        onTermSize: (cols, rows) => {
          latestTermSizeRef.current = { cols, rows };
          syncRuntimeFromRefs();
          reportDebug("terminal.termSizeChanged", {
            cols,
            rows,
          });
        },
        reportDebug,
      },
      connection,
      renderNonce: pane.renderNonce,
      sessionId: pane.sessionId,
      terminalAppearance,
    });
    runtimeRef.current = runtime;
    syncRefsFromRuntime(runtime);
    const previousHostParentTagName = runtime.host.parentElement?.tagName ?? null;
    container.replaceChildren(runtime.host);
    reportDebug("terminal.runtimeHostAttached", {
      hostParentPortalTargetId: runtime.host.parentElement?.dataset.vsmuxPortalTargetId ?? null,
      previousHostParentTagName,
    });
    if (!bootstrapVisualsCompleteRef.current) {
      seedResttyBackgroundSurfaces();
    }
    setResttyCanvasVisibility(canvasVisibleRef.current);
    for (const canvas of container.querySelectorAll<HTMLCanvasElement>(
      ".restty-native-scroll-canvas, .pane-canvas, canvas",
    )) {
      const handleContextLost = (event: Event) => {
        reportDebug("terminal.canvasContextLost", {
          className: canvas.className,
          type: event.type,
        });
      };
      const handleContextRestored = (event: Event) => {
        reportDebug("terminal.canvasContextRestored", {
          className: canvas.className,
          type: event.type,
        });
      };
      canvas.addEventListener("webglcontextlost", handleContextLost as EventListener);
      canvas.addEventListener("webglcontextrestored", handleContextRestored as EventListener);
      canvas.addEventListener("contextlost", handleContextLost as EventListener);
      canvas.addEventListener("contextrestored", handleContextRestored as EventListener);
      canvasContextListeners.push({
        canvas,
        handleContextLost: handleContextLost as EventListener,
        handleContextRestored: handleContextRestored as EventListener,
      });
    }
    if (runtime.appearanceRequestId === 0) {
      applyAppearance("mount-init");
    }
    ensureScrollHostListener();

    const onWindowFocus = () => {
      if (!isVisibleRef.current || !isFocusedRef.current) {
        return;
      }
      focusTerminalWithRetries("window-focus");
    };
    window.addEventListener("focus", onWindowFocus);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (didDispose) {
          return;
        }

        updateTerminalSize();
        runVisibleMaintenance("mount-visible");
        if (document.hasFocus() && isVisibleRef.current && isFocusedRef.current) {
          focusTerminalWithRetries("mount-visible");
        }

        if (connection.mock) {
          if (pane.snapshot?.history) {
            runtime.activePane.sendInput(pane.snapshot.history, "pty");
          }
          runVisibleMaintenance("mock-history");
          return;
        }

        runVisibleMaintenance("mount-visible");
        void connectTerminalWhenReady("mount-visible");
      });
    });

    return () => {
      didDispose = true;
      for (const { canvas, handleContextLost, handleContextRestored } of canvasContextListeners) {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener("webglcontextrestored", handleContextRestored);
        canvas.removeEventListener("contextlost", handleContextLost);
        canvas.removeEventListener("contextrestored", handleContextRestored);
      }
      reportDebug("terminal.paneUnmount", {
        isFocused: isFocusedRef.current,
        isVisible: isVisibleRef.current,
        ...collectSnapshotMetrics(),
      });
      appearanceRequestIdRef.current += 1;
      window.removeEventListener("focus", onWindowFocus);
      boundScrollHostRef.current?.removeEventListener("scroll", scrollHostListenerRef.current);
      syncRuntimeFromRefs();
      runtime.callbacks = {};
      if (runtime.host.parentElement === container) {
        reportDebug("terminal.runtimeHostDetached", {
          hostParentPortalTargetId: runtime.host.parentElement?.dataset.vsmuxPortalTargetId ?? null,
        });
        runtime.host.remove();
      }
      releaseCachedTerminalRuntime(runtimeCacheKey);
      boundScrollHostRef.current = null;
      activePaneRef.current = null;
      resttyRef.current = null;
      transportRef.current = null;
      runtimeRef.current = null;
      canvasVisibleRef.current = false;
      maintenanceProbeIdRef.current += 1;
      rapidTypingCountRef.current = 0;
      rapidTypingWindowStartedAtRef.current = 0;
      postSettleAppearanceAppliedRef.current = false;
      setShowScrollToBottom(false);
      setSearchResults(SEARCH_RESULTS_EMPTY);
    };
  }, [
    connection.baseUrl,
    connection.mock,
    connection.token,
    connection.workspaceId,
    pane.renderNonce,
    pane.sessionId,
    runtimeCacheKey,
  ]);

  useEffect(() => {
    if (handledRefreshRequestIdRef.current === refreshRequestId) {
      return;
    }

    handledRefreshRequestIdRef.current = refreshRequestId;
    if (!isVisible) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        runVisibleMaintenance("refresh", {
          updateSize: true,
        });
      });
    });
  }, [isVisible, refreshRequestId]);

  useEffect(() => {
    reportDebug("terminal.visibilityStateChanged", {
      isFocused,
      isVisible,
      ...collectSnapshotMetrics(),
    });

    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!isVisible) {
      setShowScrollToBottom(false);
    }

    if (!isVisible) {
      // Hidden panes stay painted behind the active pane; don't redraw them on visibility flips.
    } else if (!connectPtyStartedRef.current || !bootstrapVisualsCompleteRef.current) {
      runVisibleMaintenance("visible-effect");
    } else {
      ensureScrollHostListener();
      updateScrollToBottomVisibility();
    }

    const handleCapturedScroll = () => {
      updateScrollToBottomVisibility();
    };
    container.addEventListener("scroll", handleCapturedScroll, {
      capture: true,
      passive: true,
    });

    const resizeObserver = new ResizeObserver(() => {
      reportDebug("terminal.resizeObserved", {
        bounds: {
          height: Math.round(container.getBoundingClientRect().height),
          width: Math.round(container.getBoundingClientRect().width),
        },
        isVisible,
        sessionId: pane.sessionId,
      });
      if (shouldFreezeHiddenTerminal()) {
        return;
      }
      runVisibleMaintenance("resize-observer", {
        updateSize: true,
      });
      void connectTerminalWhenReady("resize-observer");
    });
    resizeObserver.observe(container);

    const mutationObserver = new MutationObserver(() => {
      if (shouldFreezeHiddenTerminal()) {
        return;
      }
      runVisibleMaintenance("mutation-observer");
    });
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      container.removeEventListener("scroll", handleCapturedScroll, true);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [isVisible, pane.sessionId]);

  useEffect(() => {
    if (isFocused || !isSearchOpen) {
      return;
    }

    closeSearch();
  }, [isFocused, isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    focusSearchInput();
  }, [isSearchOpen]);

  useEffect(() => {
    const activePane = activePaneRef.current;
    if (!activePane) {
      return;
    }

    if (!isSearchOpen || searchQuery.length === 0) {
      activePane.clearSearch();
      setSearchResults(SEARCH_RESULTS_EMPTY);
      return;
    }

    activePane.setSearchQuery(searchQuery);
  }, [isSearchOpen, searchQuery]);

  useEffect(() => {
    if (
      !autoFocusRequest ||
      handledAutoFocusRequestIdRef.current === autoFocusRequest.requestId ||
      !isVisible
    ) {
      return;
    }

    handledAutoFocusRequestIdRef.current = autoFocusRequest.requestId;
    focusTerminalWithRetries(`auto-focus:${autoFocusRequest.source}`);
    reportDebug("terminal.autoFocusRequestApplied", {
      requestId: autoFocusRequest.requestId,
      sessionId: pane.sessionId,
      source: autoFocusRequest.source,
    });
  }, [autoFocusRequest, isVisible, pane.sessionId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const handleFocusIn = () => {
      if (!isVisibleRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        if (!isVisibleRef.current) {
          return;
        }

        if (!root.matches(":focus-within")) {
          return;
        }

        reportDebug("terminal.focusActivate", {
          sessionId: pane.sessionId,
        });
        onActivate("focusin");
      });
    };

    root.addEventListener("focusin", handleFocusIn);
    return () => {
      root.removeEventListener("focusin", handleFocusIn);
    };
  }, [onActivate, pane.sessionId]);

  return (
    <div
      className="terminal-pane-root"
      ref={rootRef}
      onPointerDownCapture={(event) => {
        if (!isVisible) {
          return;
        }

        if (event.button !== 0 && event.button !== -1) {
          return;
        }

        reportDebug("terminal.pointerActivate", {
          pointerType: event.pointerType,
          sessionId: pane.sessionId,
        });
        onActivate("pointer");
      }}
      onKeyDownCapture={(event) => {
        const primaryModifier = IS_MAC ? event.metaKey : event.ctrlKey;
        const lowerKey = event.key.toLowerCase();

        if (primaryModifier && lowerKey === "f") {
          event.preventDefault();
          event.stopPropagation();
          openSearch();
          return;
        }

        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1b[13;2u");
          return;
        }

        if (IS_MAC && event.metaKey && !event.altKey && event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x01");
          return;
        }

        if (IS_MAC && event.metaKey && !event.altKey && event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x05");
          return;
        }

        if (IS_MAC && event.altKey && !event.metaKey && event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bb");
          return;
        }

        if (IS_MAC && event.altKey && !event.metaKey && event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bf");
          return;
        }

        if (event.ctrlKey && !event.metaKey && event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bb");
          return;
        }

        if (event.ctrlKey && !event.metaKey && event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          sendRawTerminalInput("\x1bf");
          return;
        }

        if (event.shiftKey && event.key === "Insert") {
          event.preventDefault();
          event.stopPropagation();
          void pasteClipboardText();
          return;
        }

        noteRapidTypingAndMaybeScrollToBottom(event);
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        reportDebug("terminal.mouseFocusRequest", {
          sessionId: pane.sessionId,
        });
        focusTerminal();
      }}
    >
      <div className="terminal-pane-canvas terminal-tab" ref={containerRef} />
      {showScrollToBottom ? (
        <button
          aria-label="Scroll terminal to bottom"
          className="terminal-pane-scroll-to-bottom"
          onClick={(event) => {
            event.stopPropagation();
            scrollTerminalToBottom();
            focusTerminal();
          }}
          type="button"
        >
          <IconArrowBigDownFilled size={16} stroke={2} />
        </button>
      ) : null}
      {isSearchOpen ? (
        <div
          className="terminal-pane-search"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <input
            aria-label="Search terminal output"
            className="terminal-pane-search-input"
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeSearch();
                return;
              }

              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              if (searchQuery.length === 0) {
                return;
              }

              if (event.shiftKey) {
                activePaneRef.current?.searchPrevious();
                return;
              }

              activePaneRef.current?.searchNext();
            }}
            placeholder="Find in terminal"
            ref={searchInputRef}
            spellCheck={false}
            type="text"
            value={searchQuery}
          />
          <div className="terminal-pane-search-status">
            {getTerminalSearchStatusLabel(searchQuery, searchResults)}
          </div>
          <button
            className="terminal-pane-search-button"
            onClick={(event) => {
              event.stopPropagation();
              if (searchQuery.length === 0) {
                return;
              }
              activePaneRef.current?.searchPrevious();
            }}
            type="button"
          >
            Prev
          </button>
          <button
            className="terminal-pane-search-button"
            onClick={(event) => {
              event.stopPropagation();
              if (searchQuery.length === 0) {
                return;
              }
              activePaneRef.current?.searchNext();
            }}
            type="button"
          >
            Next
          </button>
          <button
            className="terminal-pane-search-close"
            onClick={(event) => {
              event.stopPropagation();
              closeSearch();
            }}
            type="button"
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
};

function buildSessionSocketUrl(connection: WorkspacePanelConnection, sessionId: string): string {
  const socketUrl = new URL("/session", connection.baseUrl);
  socketUrl.searchParams.set("token", connection.token);
  socketUrl.searchParams.set("workspaceId", connection.workspaceId);
  socketUrl.searchParams.set("sessionId", sessionId);
  return socketUrl.toString();
}

function getTerminalSearchStatusLabel(query: string, searchResults: SearchResultsState): string {
  if (query.length === 0) {
    return "Type to search";
  }

  if (searchResults.resultCount === 0 || searchResults.resultIndex < 0) {
    return "No matches";
  }

  return `${String(searchResults.resultIndex + 1)} / ${String(searchResults.resultCount)}`;
}
