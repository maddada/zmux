import type {
  SessionGridDirection,
  TerminalViewMode,
  VisibleSessionCount,
} from "./session-grid-contract-core";

export type zmuxHotkeyActionId =
  | "createSession"
  | "openSettings"
  | "moveSidebar"
  | "renameActiveSession"
  | "focusPreviousSession"
  | "focusNextSession"
  | "focusUp"
  | "focusRight"
  | "focusDown"
  | "focusLeft"
  | "showOne"
  | "showTwo"
  | "showThree"
  | "showFour"
  | "showSix"
  | "showNine"
  | `focusGroup${1 | 2 | 3 | 4}`
  | `focusSessionSlot${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;

export type zmuxHotkeySettings = Partial<Record<zmuxHotkeyActionId, string>>;

export type zmuxHotkeyAction =
  | { id: zmuxHotkeyActionId; kind: "createSession" }
  | { id: zmuxHotkeyActionId; kind: "focusDirection"; direction: SessionGridDirection }
  | { id: zmuxHotkeyActionId; kind: "focusGroup"; groupIndex: number }
  | { id: zmuxHotkeyActionId; kind: "focusSessionSlot"; slotNumber: number }
  | { id: zmuxHotkeyActionId; kind: "moveSidebar" }
  | { id: zmuxHotkeyActionId; kind: "openSettings" }
  | { id: zmuxHotkeyActionId; kind: "renameActiveSession" }
  | { id: zmuxHotkeyActionId; kind: "setViewMode"; viewMode: TerminalViewMode }
  | { id: zmuxHotkeyActionId; kind: "setVisibleCount"; visibleCount: VisibleSessionCount };

export type zmuxHotkeyDefinition = {
  action: zmuxHotkeyAction;
  defaultKey: string;
  description: string;
  id: zmuxHotkeyActionId;
  title: string;
};

/**
 * CDXC:Hotkeys 2026-04-28-05:20
 * The native app must start with the same primary shortcuts as the reference
 * agent-tiler repo, while storing them as app settings so users can redefine
 * the bindings without changing code or relying on hard-coded VS Code keys.
 */
export const ZMUX_HOTKEY_DEFINITIONS: readonly zmuxHotkeyDefinition[] = [
  {
    action: { id: "createSession", kind: "createSession" },
    defaultKey: "cmd+alt+n",
    description: "Create a terminal session.",
    id: "createSession",
    title: "Create Session",
  },
  {
    action: { id: "openSettings", kind: "openSettings" },
    defaultKey: "cmd+alt+,",
    description: "Open app settings.",
    id: "openSettings",
    title: "Open Settings",
  },
  {
    action: { id: "moveSidebar", kind: "moveSidebar" },
    defaultKey: "cmd+alt+b",
    description: "Move the sidebar to the other side.",
    id: "moveSidebar",
    title: "Move Sidebar",
  },
  {
    action: { id: "renameActiveSession", kind: "renameActiveSession" },
    defaultKey: "cmd+alt+r",
    description: "Rename the focused session.",
    id: "renameActiveSession",
    title: "Rename Active Session",
  },
  {
    action: { id: "focusPreviousSession", kind: "focusSessionSlot", slotNumber: -1 },
    defaultKey: "cmd+alt+[",
    description: "Focus the previous visible session.",
    id: "focusPreviousSession",
    title: "Previous Session",
  },
  {
    action: { id: "focusNextSession", kind: "focusSessionSlot", slotNumber: 0 },
    defaultKey: "cmd+alt+]",
    description: "Focus the next visible session.",
    id: "focusNextSession",
    title: "Next Session",
  },
  ...(["up", "right", "down", "left"] as const).map((direction) => ({
    action: {
      direction,
      id: `focus${capitalize(direction)}` as zmuxHotkeyActionId,
      kind: "focusDirection" as const,
    },
    defaultKey: `cmd+alt+shift+${direction}`,
    description: `Move focus ${direction}.`,
    id: `focus${capitalize(direction)}` as zmuxHotkeyActionId,
    title: `Focus ${capitalize(direction)}`,
  })),
  ...[1, 2, 3, 4].map((groupIndex) => ({
    action: {
      groupIndex,
      id: `focusGroup${groupIndex}` as zmuxHotkeyActionId,
      kind: "focusGroup" as const,
    },
    defaultKey: `cmd+alt+shift+${groupIndex}`,
    description: `Focus group ${groupIndex}.`,
    id: `focusGroup${groupIndex}` as zmuxHotkeyActionId,
    title: `Focus Group ${groupIndex}`,
  })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slotNumber) => ({
    action: {
      id: `focusSessionSlot${slotNumber}` as zmuxHotkeyActionId,
      kind: "focusSessionSlot" as const,
      slotNumber,
    },
    defaultKey: `cmd+alt+${slotNumber}`,
    description: `Focus session slot ${slotNumber}.`,
    id: `focusSessionSlot${slotNumber}` as zmuxHotkeyActionId,
    title: `Focus Session ${slotNumber}`,
  })),
  ...[
    ["showOne", 1],
    ["showTwo", 2],
    ["showThree", 3],
    ["showFour", 4],
    ["showSix", 6],
    ["showNine", 9],
  ].map(([id, visibleCount]) => ({
    action: {
      id: id as zmuxHotkeyActionId,
      kind: "setVisibleCount" as const,
      visibleCount: visibleCount as VisibleSessionCount,
    },
    defaultKey: `cmd+alt+s ${visibleCount}`,
    description: `Show ${visibleCount} session${visibleCount === 1 ? "" : "s"}.`,
    id: id as zmuxHotkeyActionId,
    title: `Show ${visibleCount}`,
  })),
];

export const DEFAULT_zmux_HOTKEYS: zmuxHotkeySettings = Object.fromEntries(
  ZMUX_HOTKEY_DEFINITIONS.map((definition) => [definition.id, definition.defaultKey]),
);

export function normalizezmuxHotkeySettings(candidate: unknown): zmuxHotkeySettings {
  const source = isRecord(candidate) ? candidate : {};
  const normalized: zmuxHotkeySettings = {};
  for (const definition of ZMUX_HOTKEY_DEFINITIONS) {
    const value = source[definition.id];
    normalized[definition.id] =
      typeof value === "string" && value.trim() ? normalizeHotkeyText(value) : definition.defaultKey;
  }
  return normalized;
}

export function getzmuxHotkeyActionById(id: string): zmuxHotkeyAction | undefined {
  return ZMUX_HOTKEY_DEFINITIONS.find((definition) => definition.id === id)?.action;
}

export function normalizeHotkeyText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/⌘|command/g, "cmd")
    .replace(/⌥|option/g, "alt")
    .replace(/⌃|control/g, "ctrl")
    .replace(/⇧|shift/g, "shift")
    .replace(/\s+/g, " ");
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
