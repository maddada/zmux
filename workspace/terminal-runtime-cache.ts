import { Restty } from "restty";
import type {
  WorkspacePanelConnection,
  WorkspacePanelTerminalAppearance,
} from "../shared/workspace-panel-contract";
import { getResttyFontSources } from "./restty-terminal-config";
import {
  createWorkspaceResttyTransport,
  type WorkspaceResttyTransportController,
} from "./restty-session-transport";

const TERMINAL_RUNTIME_HOST_CLASS_NAME = "terminal-pane-runtime-host";
const TERMINAL_STARTUP_BACKGROUND = "#121212";
const TERMINAL_PREFERRED_RENDERER = "auto";

export type CachedTerminalRuntimeCallbacks = {
  onFirstData?: (connectionId: number) => void;
  onRendererMode?: (rendererMode: string) => void;
  onSearchState?: (state: { selectedIndex?: number; total: number }) => void;
  onTermSize?: (cols: number, rows: number) => void;
  reportDebug?: (event: string, payload?: Record<string, unknown>) => void;
};

export type CachedTerminalRuntime = {
  activePane: NonNullable<ReturnType<Restty["activePane"]>>;
  appearancePromise: Promise<void>;
  appearanceRequestId: number;
  appliedFontSourcesSignature: string;
  bootstrapVisualsComplete: boolean;
  cacheKey: string;
  callbacks: CachedTerminalRuntimeCallbacks;
  canvasVisible: boolean;
  connectPtyStarted: boolean;
  host: HTMLDivElement;
  latestTermSize: { cols: number; rows: number } | null;
  maintenanceProbeId: number;
  refCount: number;
  rendererMode: string | null;
  renderNonce: number;
  restty: Restty;
  sessionId: string;
  transportController: WorkspaceResttyTransportController | null;
};

type CreateCachedTerminalRuntimeOptions = {
  cacheKey: string;
  callbacks: CachedTerminalRuntimeCallbacks;
  connection: WorkspacePanelConnection;
  renderNonce: number;
  sessionId: string;
  terminalAppearance: WorkspacePanelTerminalAppearance;
};

const cachedTerminalRuntimes = new Map<string, CachedTerminalRuntime>();

const buildRuntimeHost = () => {
  const host = document.createElement("div");
  host.className = TERMINAL_RUNTIME_HOST_CLASS_NAME;
  return host;
};

const destroyRuntime = (runtime: CachedTerminalRuntime) => {
  runtime.transportController?.transport.destroy?.();
  runtime.restty.destroy();
  runtime.host.remove();
};

export const getTerminalRuntimeCacheKey = (sessionId: string) => sessionId;

export const acquireCachedTerminalRuntime = (
  options: CreateCachedTerminalRuntimeOptions,
): CachedTerminalRuntime => {
  const existingRuntime = cachedTerminalRuntimes.get(options.cacheKey);
  if (existingRuntime) {
    if (existingRuntime.renderNonce !== options.renderNonce) {
      cachedTerminalRuntimes.delete(options.cacheKey);
      destroyRuntime(existingRuntime);
    } else {
      existingRuntime.refCount += 1;
      existingRuntime.callbacks = options.callbacks;
      return existingRuntime;
    }
  }

  const host = buildRuntimeHost();
  const runtime = {} as CachedTerminalRuntime;
  const transportController = options.connection.mock
    ? null
    : createWorkspaceResttyTransport({
        onFirstData: (connectionId) => {
          runtime.callbacks.onFirstData?.(connectionId);
        },
        reportDebug: (event, payload) => {
          runtime.callbacks.reportDebug?.(event, payload);
        },
        sessionId: options.sessionId,
      });
  const restty = new Restty({
    createInitialPane: true,
    defaultContextMenu: false,
    paneStyles: {
      paneBackground: TERMINAL_STARTUP_BACKGROUND,
      splitBackground: TERMINAL_STARTUP_BACKGROUND,
    },
    root: host,
    searchUi: false,
    shortcuts: false,
    appOptions: {
      attachWindowEvents: true,
      autoResize: false,
      callbacks: {
        onBackend: (backend) => {
          runtime.rendererMode = backend;
          runtime.callbacks.onRendererMode?.(backend);
          runtime.callbacks.reportDebug?.("terminal.rendererReady", {
            rendererMode: backend,
            sessionId: options.sessionId,
          });
        },
        onSearchState: (state) => {
          runtime.callbacks.onSearchState?.(state);
        },
        onTermSize: (cols, rows) => {
          runtime.latestTermSize = { cols, rows };
          runtime.callbacks.onTermSize?.(cols, rows);
        },
      },
      fontPreset: "none",
      fontSize: options.terminalAppearance.fontSize,
      fontSources: getResttyFontSources(options.terminalAppearance.fontFamily),
      ptyTransport: transportController?.transport,
      renderer: TERMINAL_PREFERRED_RENDERER,
    },
  });
  const activePane = restty.activePane();
  if (!activePane) {
    transportController?.transport.destroy?.();
    restty.destroy();
    throw new Error(`Missing Restty active pane for session ${options.sessionId}`);
  }
  activePane.setRenderer(TERMINAL_PREFERRED_RENDERER);

  runtime.activePane = activePane;
  runtime.appearancePromise = Promise.resolve();
  runtime.appearanceRequestId = 0;
  runtime.appliedFontSourcesSignature = "";
  runtime.bootstrapVisualsComplete = false;
  runtime.cacheKey = options.cacheKey;
  runtime.callbacks = options.callbacks;
  runtime.canvasVisible = false;
  runtime.connectPtyStarted = false;
  runtime.host = host;
  runtime.latestTermSize = null;
  runtime.maintenanceProbeId = 0;
  runtime.refCount = 1;
  runtime.rendererMode = null;
  runtime.renderNonce = options.renderNonce;
  runtime.restty = restty;
  runtime.sessionId = options.sessionId;
  runtime.transportController = transportController;

  runtime.callbacks.reportDebug?.("terminal.rendererPreference", {
    preferredRenderer: TERMINAL_PREFERRED_RENDERER,
    sessionId: options.sessionId,
  });

  cachedTerminalRuntimes.set(options.cacheKey, runtime);
  return runtime;
};

export const releaseCachedTerminalRuntime = (cacheKey: string) => {
  const runtime = cachedTerminalRuntimes.get(cacheKey);
  if (!runtime) {
    return;
  }

  runtime.refCount = Math.max(0, runtime.refCount - 1);
  runtime.callbacks = {};
  if (runtime.refCount > 0) {
    return;
  }

  runtime.host.remove();
};

export const destroyCachedTerminalRuntime = (cacheKey: string) => {
  const runtime = cachedTerminalRuntimes.get(cacheKey);
  if (!runtime) {
    return;
  }

  cachedTerminalRuntimes.delete(cacheKey);
  destroyRuntime(runtime);
};

const destroyAllCachedTerminalRuntimes = () => {
  for (const cacheKey of [...cachedTerminalRuntimes.keys()]) {
    destroyCachedTerminalRuntime(cacheKey);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", destroyAllCachedTerminalRuntimes);
}
