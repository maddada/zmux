import {
  DEFAULT_COMPLETION_SOUND,
  getCompletionSoundLabel,
  type CompletionSoundSetting,
} from "./completion-sound";
import {
  createDefaultSidebarAgentButtons,
  type SidebarAgentButton,
  type SidebarAgentIcon,
} from "./sidebar-agents";
import { createDefaultSidebarCommandButtons, type SidebarCommandButton } from "./sidebar-commands";

export const GRID_COLUMN_COUNT = 3;
export const MAX_SESSION_COUNT = GRID_COLUMN_COUNT * GRID_COLUMN_COUNT;
export const MAX_GROUP_COUNT = 4;
export const DEFAULT_MAIN_GROUP_ID = "group-1";
export const DEFAULT_MAIN_GROUP_TITLE = "Main";

export type VisibleSessionCount = 1 | 2 | 3 | 4 | 6 | 9;

export type TerminalViewMode = "horizontal" | "vertical" | "grid";

export type SessionGridDirection = "up" | "right" | "down" | "left";

export type SidebarSessionActivityState = "idle" | "working" | "attention";

export type SidebarTheme =
  | "plain-dark"
  | "plain-light"
  | "dark-green"
  | "dark-blue"
  | "dark-red"
  | "dark-pink"
  | "dark-orange"
  | "light-blue"
  | "light-green"
  | "light-pink"
  | "light-orange";

export type SidebarThemeSetting =
  | "auto"
  | "plain"
  | "dark-green"
  | "dark-blue"
  | "dark-red"
  | "dark-pink"
  | "dark-orange"
  | "light-blue"
  | "light-green"
  | "light-pink"
  | "light-orange";

export type SidebarThemeVariant = "light" | "dark";

export type SessionRecord = {
  sessionId: string;
  title: string;
  alias: string;
  slotIndex: number;
  row: number;
  column: number;
  createdAt: string;
};

export type SessionGridSnapshot = {
  focusedSessionId?: string;
  fullscreenRestoreVisibleCount?: VisibleSessionCount;
  sessions: SessionRecord[];
  visibleCount: VisibleSessionCount;
  visibleSessionIds: string[];
  viewMode: TerminalViewMode;
};

export type SessionGroupRecord = {
  groupId: string;
  snapshot: SessionGridSnapshot;
  title: string;
};

export type GroupedSessionWorkspaceSnapshot = {
  activeGroupId: string;
  groups: SessionGroupRecord[];
  nextGroupNumber: number;
  nextSessionNumber: number;
};

export type SidebarSessionItem = {
  activity: SidebarSessionActivityState;
  activityLabel?: string;
  agentIcon?: SidebarAgentIcon;
  sessionId: string;
  sessionNumber?: number;
  primaryTitle?: string;
  terminalTitle?: string;
  alias: string;
  shortcutLabel: string;
  row: number;
  column: number;
  isFocused: boolean;
  isVisible: boolean;
  isRunning: boolean;
  detail?: string;
};

export type SidebarSessionGroup = {
  groupId: string;
  isActive: boolean;
  isFocusModeActive: boolean;
  sessions: SidebarSessionItem[];
  title: string;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
};

export type SidebarHudState = {
  agents: SidebarAgentButton[];
  commands: SidebarCommandButton[];
  completionBellEnabled: boolean;
  completionSound: CompletionSoundSetting;
  completionSoundLabel: string;
  debuggingMode: boolean;
  focusedSessionTitle?: string;
  isFocusModeActive: boolean;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  theme: SidebarTheme;
  highlightedVisibleCount: VisibleSessionCount;
  visibleCount: VisibleSessionCount;
  visibleSlotLabels: string[];
  viewMode: TerminalViewMode;
};

export type SidebarHydrateMessage = {
  groups: SidebarSessionGroup[];
  type: "hydrate";
  hud: SidebarHudState;
};

export type SidebarSessionStateMessage = {
  groups: SidebarSessionGroup[];
  type: "sessionState";
  hud: SidebarHudState;
};

export type SidebarPlayCompletionSoundMessage = {
  sound: CompletionSoundSetting;
  type: "playCompletionSound";
};

export type ExtensionToSidebarMessage =
  | SidebarHydrateMessage
  | SidebarSessionStateMessage
  | SidebarPlayCompletionSoundMessage;

export type SidebarToExtensionMessage =
  | {
      type: "ready";
    }
  | {
      type: "openSettings";
    }
  | {
      type: "openDebugInspector";
    }
  | {
      type: "toggleCompletionBell";
    }
  | {
      type: "createSession";
    }
  | {
      type: "createSessionInGroup";
      groupId: string;
    }
  | {
      type: "focusGroup";
      groupId: string;
    }
  | {
      type: "toggleFullscreenSession";
    }
  | {
      type: "focusSession";
      sessionId: string;
      preserveFocus?: boolean;
    }
  | {
      type: "promptRenameSession";
      sessionId: string;
    }
  | {
      type: "restartSession";
      sessionId: string;
    }
  | {
      type: "renameSession";
      sessionId: string;
      title: string;
    }
  | {
      type: "renameGroup";
      groupId: string;
      title: string;
    }
  | {
      type: "closeGroup";
      groupId: string;
    }
  | {
      type: "closeSession";
      sessionId: string;
    }
  | {
      type: "moveSessionToGroup";
      groupId: string;
      sessionId: string;
      targetIndex?: number;
    }
  | {
      type: "createGroupFromSession";
      sessionId: string;
    }
  | {
      type: "setVisibleCount";
      visibleCount: VisibleSessionCount;
    }
  | {
      type: "setViewMode";
      viewMode: TerminalViewMode;
    }
  | {
      type: "syncSessionOrder";
      groupId: string;
      sessionIds: string[];
    }
  | {
      type: "syncGroupOrder";
      groupIds: string[];
    }
  | {
      type: "runSidebarCommand";
      commandId: string;
    }
  | {
      type: "saveSidebarCommand";
      closeTerminalOnExit: boolean;
      command: string;
      commandId?: string;
      name: string;
    }
  | {
      type: "deleteSidebarCommand";
      commandId: string;
    }
  | {
      type: "syncSidebarCommandOrder";
      commandIds: string[];
    }
  | {
      type: "runSidebarAgent";
      agentId: string;
    }
  | {
      type: "saveSidebarAgent";
      agentId?: string;
      command: string;
      name: string;
    }
  | {
      type: "deleteSidebarAgent";
      agentId: string;
    };

export function clampVisibleSessionCount(value: number): VisibleSessionCount {
  if (value <= 1) {
    return 1;
  }

  if (value === 2) {
    return 2;
  }

  if (value === 3) {
    return 3;
  }

  if (value <= 4) {
    return 4;
  }

  if (value <= 6) {
    return 6;
  }

  return 9;
}

export function clampTerminalViewMode(value: string | undefined): TerminalViewMode {
  switch (value) {
    case "horizontal":
    case "vertical":
    case "grid":
      return value;
    default:
      return "grid";
  }
}

export function clampSidebarThemeSetting(value: string | undefined): SidebarThemeSetting {
  switch (value) {
    case "auto":
    case "plain":
    case "dark-modern":
    case "dark-green":
      return value === "dark-modern" ? "dark-green" : value;

    case "dark-plus":
    case "dark-blue":
      return value === "dark-plus" ? "dark-blue" : value;

    case "dark-red":
    case "dark-pink":
    case "dark-orange":
    case "light-plus":
    case "light-blue":
    case "light-green":
    case "light-pink":
    case "light-orange":
      return value === "light-plus" ? "light-blue" : value;

    case "monokai":
      return "dark-green";

    case "solarized-dark":
      return "dark-blue";

    default:
      return "auto";
  }
}

export function resolveSidebarTheme(
  themeSetting: SidebarThemeSetting,
  variant: SidebarThemeVariant,
): SidebarTheme {
  if (themeSetting === "auto") {
    return variant === "light" ? "light-blue" : "dark-blue";
  }

  if (themeSetting === "plain") {
    return variant === "light" ? "plain-light" : "plain-dark";
  }

  return themeSetting;
}

export function createDefaultSessionGridSnapshot(): SessionGridSnapshot {
  return {
    focusedSessionId: undefined,
    fullscreenRestoreVisibleCount: undefined,
    sessions: [],
    visibleCount: 1,
    visibleSessionIds: [],
    viewMode: "grid",
  };
}

export function createDefaultGroupedSessionWorkspaceSnapshot(): GroupedSessionWorkspaceSnapshot {
  return {
    activeGroupId: DEFAULT_MAIN_GROUP_ID,
    groups: [
      {
        groupId: DEFAULT_MAIN_GROUP_ID,
        snapshot: createDefaultSessionGridSnapshot(),
        title: DEFAULT_MAIN_GROUP_TITLE,
      },
    ],
    nextGroupNumber: 2,
    nextSessionNumber: 1,
  };
}

export function getSlotPosition(slotIndex: number): Pick<SessionRecord, "column" | "row"> {
  const normalizedSlotIndex = Math.max(0, Math.min(MAX_SESSION_COUNT - 1, Math.floor(slotIndex)));

  return {
    column: normalizedSlotIndex % GRID_COLUMN_COUNT,
    row: Math.floor(normalizedSlotIndex / GRID_COLUMN_COUNT),
  };
}

export function getSlotLabel(row: number, column: number): string {
  return `R${row + 1}C${column + 1}`;
}

export function getSessionShortcutLabel(slotIndex: number, platform: "default" | "mac"): string {
  const shortcutNumber = Math.max(1, Math.min(MAX_SESSION_COUNT, Math.floor(slotIndex) + 1));

  return platform === "mac" ? `⌘⌥${shortcutNumber}` : `⌃⌥${shortcutNumber}`;
}

export function createSessionAlias(sessionNumber: number, slotIndex: number): string {
  const words = [
    "Atlas",
    "Beacon",
    "Comet",
    "Drift",
    "Ember",
    "Field",
    "Grove",
    "Harbor",
    "Lattice",
    "Mosaic",
    "Signal",
    "Vale",
  ];

  return words[(sessionNumber * 11 + slotIndex * 3) % words.length] ?? words[0]!;
}

export function createSessionRecord(sessionNumber: number, slotIndex: number): SessionRecord {
  const position = getSlotPosition(slotIndex);

  return {
    alias: createSessionAlias(sessionNumber, slotIndex),
    column: position.column,
    createdAt: new Date().toISOString(),
    row: position.row,
    sessionId: `session-${sessionNumber}`,
    slotIndex,
    title: `Session ${sessionNumber}`,
  };
}

export function getVisiblePrimaryTitle(title: string): string | undefined {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || /^Session \d+$/.test(normalizedTitle)) {
    return undefined;
  }

  return normalizedTitle;
}

export function getOrderedSessions(snapshot: SessionGridSnapshot): SessionRecord[] {
  return [...snapshot.sessions].sort((left, right) => left.slotIndex - right.slotIndex);
}

export function createSidebarHudState(
  snapshot: SessionGridSnapshot,
  theme: SidebarTheme = "dark-blue",
  showCloseButtonOnSessionCards = false,
  showHotkeysOnSessionCards = false,
  debuggingMode = false,
  completionBellEnabled = false,
  completionSound: CompletionSoundSetting = DEFAULT_COMPLETION_SOUND,
  agents: SidebarAgentButton[] = createDefaultSidebarAgentButtons(),
  commands: SidebarCommandButton[] = createDefaultSidebarCommandButtons(),
): SidebarHudState {
  const sessionById = new Map(snapshot.sessions.map((session) => [session.sessionId, session]));
  const focusedSession = snapshot.focusedSessionId
    ? sessionById.get(snapshot.focusedSessionId)
    : undefined;

  return {
    agents,
    commands,
    completionBellEnabled,
    completionSound,
    completionSoundLabel: getCompletionSoundLabel(completionSound),
    debuggingMode,
    focusedSessionTitle: focusedSession?.title,
    isFocusModeActive:
      snapshot.visibleCount === 1 && snapshot.fullscreenRestoreVisibleCount !== undefined,
    highlightedVisibleCount: snapshot.fullscreenRestoreVisibleCount ?? snapshot.visibleCount,
    showCloseButtonOnSessionCards,
    showHotkeysOnSessionCards,
    theme,
    visibleCount: snapshot.visibleCount,
    visibleSlotLabels: snapshot.visibleSessionIds
      .map((sessionId) => sessionById.get(sessionId))
      .filter((session): session is SessionRecord => session !== undefined)
      .map((session) => getSlotLabel(session.row, session.column)),
    viewMode: snapshot.viewMode,
  };
}

export function createSidebarSessionItems(
  snapshot: SessionGridSnapshot,
  platform: "default" | "mac" = "default",
): SidebarSessionItem[] {
  const visibleIds = new Set(snapshot.visibleSessionIds);
  const orderedSessions = getOrderedSessions(snapshot);

  return orderedSessions.map((session) => ({
    alias: session.alias,
    activity: "idle",
    activityLabel: undefined,
    agentIcon: undefined,
    column: session.column,
    detail: undefined,
    isFocused: snapshot.focusedSessionId === session.sessionId,
    isRunning: false,
    isVisible: visibleIds.has(session.sessionId),
    primaryTitle: getVisiblePrimaryTitle(session.title),
    row: session.row,
    sessionId: session.sessionId,
    sessionNumber: getSessionNumber(session),
    shortcutLabel: getSessionShortcutLabel(session.slotIndex, platform),
  }));
}

function getSessionNumber(session: SessionRecord): number | undefined {
  const match = /^session-(\d+)$/.exec(session.sessionId);
  if (!match) {
    return undefined;
  }

  const sessionNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(sessionNumber) && sessionNumber > 0 ? sessionNumber : undefined;
}
