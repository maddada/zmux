import type {
  SessionGridSnapshot,
  SidebarHudState,
  SidebarSessionGroup,
} from "./session-grid-contract";

export type NativeTerminalDebugMoveAction = {
  currentLocation?: string;
  desiredVisibleIndex?: number;
  kind: string;
  sessionId?: string;
  startedAt: string;
  terminalName?: string;
};

export type NativeTerminalDebugMoveHistoryEntry = NativeTerminalDebugMoveAction & {
  detail?: string;
  event: "complete" | "fallback" | "start";
  timestamp: string;
};

export type NativeTerminalDebugProjection = {
  alias?: string;
  exitCode?: number;
  isParked: boolean;
  isTracked: boolean;
  location: string;
  sessionId: string;
  terminalName?: string;
};

export type NativeTerminalLayoutDebugState = {
  activeTerminalName?: string;
  editorSurfaceGroups: Array<{
    labels: string[];
    sessionIds: string[];
    visibleIndex: number;
    viewColumn?: number;
  }>;
  parkedTerminals: NativeTerminalDebugProjection[];
  processAssociations: Array<{
    processId: number;
    sessionId: string;
  }>;
  projections: NativeTerminalDebugProjection[];
  rawTabGroups: Array<{
    labels: string[];
    terminalLabels: string[];
    viewColumn?: number;
  }>;
  terminalCount: number;
  terminalNames: string[];
  trackedSessionIds: string[];
};

export type NativeTerminalBackendDebugState = {
  currentMoveAction?: NativeTerminalDebugMoveAction;
  lastVisibleSnapshot?: SessionGridSnapshot;
  layout: NativeTerminalLayoutDebugState;
  matchVisibleTerminalOrder: boolean;
  moveHistory: NativeTerminalDebugMoveHistoryEntry[];
  nativeTerminalActionDelayMs: number;
  observedAt: string;
  workspaceId: string;
};

export type NativeTerminalDebugPanelState = {
  backend: NativeTerminalBackendDebugState;
  observedAt: string;
  sidebar: {
    groups: SidebarSessionGroup[];
    hud: SidebarHudState;
  };
  workspaceId: string;
};

export type ExtensionToNativeTerminalDebugMessage = {
  state: NativeTerminalDebugPanelState;
  type: "hydrate";
};

export type NativeTerminalDebugToExtensionMessage = {
  type: "ready";
};
