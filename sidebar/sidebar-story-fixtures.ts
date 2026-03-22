import { DEFAULT_COMPLETION_SOUND, getCompletionSoundLabel } from "../shared/completion-sound";
import { createDefaultSidebarAgentButtons } from "../shared/sidebar-agents";
import { createDefaultSidebarCommandButtons } from "../shared/sidebar-commands";
import type {
  SidebarHydrateMessage,
  SidebarHudState,
  SidebarSessionGroup,
  SidebarSessionItem,
  SidebarTheme,
  TerminalViewMode,
  VisibleSessionCount,
} from "../shared/session-grid-contract";
import { clampVisibleSessionCount } from "../shared/session-grid-contract";

export type SidebarStoryFixture =
  | "default"
  | "selector-states"
  | "overflow-stress"
  | "empty-groups"
  | "three-groups-stress";

export type SidebarStoryArgs = {
  fixture: SidebarStoryFixture;
  highlightedVisibleCount: VisibleSessionCount;
  isFocusModeActive: boolean;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  theme: SidebarTheme;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
};

type SidebarStoryGroup = Omit<
  SidebarSessionGroup,
  "isFocusModeActive" | "viewMode" | "visibleCount"
>;

const DEFAULT_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: false,
    sessions: [
      createSession({
        alias: "show title in 2nd row",
        detail: "OpenAI Codex",
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createSession({
        alias: "layout drift fix",
        detail: "OpenAI Codex",
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
      createSession({
        alias: "Harbor Vale",
        detail: "OpenAI Codex",
        sessionId: "session-3",
        shortcutLabel: "⌘⌥3",
      }),
    ],
    title: "Main",
  },
  {
    groupId: "group-2",
    isActive: false,
    sessions: [
      createSession({
        activity: "attention",
        alias: "tooltip & show an indicator on the active card",
        detail: "OpenAI Codex",
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
      createSession({
        alias: "Indigo Grove",
        detail: "OpenAI Codex",
        sessionId: "session-5",
        shortcutLabel: "⌘⌥5",
      }),
    ],
    title: "Group 2",
  },
  {
    groupId: "group-4",
    isActive: true,
    sessions: [
      createSession({
        alias: "Amber Lattice",
        detail: "OpenAI Codex",
        isFocused: true,
        isVisible: true,
        sessionId: "session-6",
        shortcutLabel: "⌘⌥6",
      }),
    ],
    title: "Group 4",
  },
];

const SELECTOR_STATE_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: true,
    sessions: [
      createSession({
        activity: "working",
        alias: "active refactor",
        detail: "Claude Code",
        isFocused: true,
        isVisible: true,
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createSession({
        alias: "ui hover audit",
        detail: "OpenAI Codex",
        isVisible: true,
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
      createSession({
        activity: "attention",
        alias: "terminal title indicator",
        detail: "OpenAI Codex",
        isVisible: true,
        sessionId: "session-3",
        shortcutLabel: "⌘⌥3",
      }),
      createSession({
        alias: "workspace sync",
        detail: "OpenAI Codex",
        isVisible: true,
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
    ],
    title: "Main",
  },
  {
    groupId: "group-2",
    isActive: false,
    sessions: [
      createSession({
        alias: "fallback styling pass",
        detail: "OpenAI Codex",
        isRunning: false,
        sessionId: "session-5",
        shortcutLabel: "⌘⌥5",
      }),
    ],
    title: "Review",
  },
];

const OVERFLOW_STRESS_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: true,
    sessions: [
      createSession({
        activity: "working",
        alias:
          "extremely long alias for the primary debugging session that should truncate cleanly",
        detail: "OpenAI Codex running a sidebar layout regression pass with long secondary text",
        isFocused: true,
        isVisible: true,
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
        terminalTitle:
          "OpenAI Codex / terminal / feature/sidebar-storybook / very-long-branch-name",
      }),
      createSession({
        activity: "attention",
        alias: "hover tooltip verification for overflow and status chip alignment",
        detail:
          "Claude Code with a surprisingly verbose secondary line to stress wrapping assumptions",
        isVisible: true,
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
        terminalTitle: "Claude Code / visual diff / attention state",
      }),
      createSession({
        alias: "inactive session with close button",
        detail: "Gemini CLI",
        isRunning: false,
        sessionId: "session-3",
        shortcutLabel: "⌘⌥3",
      }),
    ],
    title: "Main workspace with a deliberately long group title",
  },
  {
    groupId: "group-2",
    isActive: false,
    sessions: [
      createSession({
        alias: "session card spacing audit across themes",
        detail: "OpenAI Codex",
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
      createSession({
        alias: "secondary label overflow with keyboard shortcut visible",
        detail: "OpenAI Codex with another very long provider name for stress testing",
        sessionId: "session-5",
        shortcutLabel: "⌘⌥5",
      }),
    ],
    title: "Secondary investigations",
  },
  {
    groupId: "group-3",
    isActive: false,
    sessions: [
      createSession({
        alias: "one more card for density",
        detail: "OpenAI Codex",
        sessionId: "session-6",
        shortcutLabel: "⌘⌥6",
      }),
    ],
    title: "QA",
  },
];

const EMPTY_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: true,
    sessions: [
      createSession({
        alias: "fresh workspace",
        detail: "OpenAI Codex",
        isFocused: true,
        isVisible: true,
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
    ],
    title: "Main",
  },
  {
    groupId: "group-2",
    isActive: false,
    sessions: [],
    title: "Design",
  },
  {
    groupId: "group-3",
    isActive: false,
    sessions: [],
    title: "Review",
  },
];

const THREE_GROUPS_STRESS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: true,
    sessions: [
      createSession({
        alias: "Atlas Forge",
        detail: "OpenAI Codex",
        isFocused: true,
        isVisible: true,
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createSession({
        alias: "Beryl Note",
        detail: "OpenAI Codex",
        isVisible: true,
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
    ],
    title: "Main",
  },
  {
    groupId: "group-2",
    isActive: false,
    sessions: [
      createSession({
        alias: "Cinder Path",
        detail: "OpenAI Codex",
        sessionId: "session-3",
        shortcutLabel: "⌘⌥3",
      }),
      createSession({
        alias: "Dune Echo",
        detail: "OpenAI Codex",
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
    ],
    title: "Group 2",
  },
  {
    groupId: "group-3",
    isActive: false,
    sessions: [
      createSession({
        alias: "Elm Signal",
        detail: "OpenAI Codex",
        sessionId: "session-5",
        shortcutLabel: "⌘⌥5",
      }),
      createSession({
        alias: "Fjord Thread",
        detail: "OpenAI Codex",
        sessionId: "session-6",
        shortcutLabel: "⌘⌥6",
      }),
    ],
    title: "Group 3",
  },
];

const GROUPS_BY_FIXTURE: Record<SidebarStoryFixture, SidebarStoryGroup[]> = {
  default: DEFAULT_GROUPS,
  "empty-groups": EMPTY_GROUPS,
  "overflow-stress": OVERFLOW_STRESS_GROUPS,
  "selector-states": SELECTOR_STATE_GROUPS,
  "three-groups-stress": THREE_GROUPS_STRESS,
};

export function createSidebarStoryMessage(args: SidebarStoryArgs): SidebarHydrateMessage {
  const groups = cloneGroups(GROUPS_BY_FIXTURE[args.fixture]).map((group) => ({
    ...group,
    isFocusModeActive: group.isActive ? args.isFocusModeActive : false,
    viewMode: group.isActive ? args.viewMode : "grid",
    visibleCount: group.isActive
      ? args.visibleCount
      : clampVisibleSessionCount(Math.max(1, group.sessions.length)),
  }));
  const hud: SidebarHudState = {
    agents: createDefaultSidebarAgentButtons(),
    commands: createDefaultSidebarCommandButtons(),
    completionBellEnabled: false,
    completionSound: DEFAULT_COMPLETION_SOUND,
    completionSoundLabel: getCompletionSoundLabel(DEFAULT_COMPLETION_SOUND),
    debuggingMode: false,
    focusedSessionTitle: getFocusedSessionTitle(groups),
    highlightedVisibleCount: args.highlightedVisibleCount,
    isFocusModeActive: args.isFocusModeActive,
    showCloseButtonOnSessionCards: args.showCloseButtonOnSessionCards,
    showHotkeysOnSessionCards: args.showHotkeysOnSessionCards,
    theme: args.theme,
    viewMode: args.viewMode,
    visibleCount: args.visibleCount,
    visibleSlotLabels: getVisibleSlotLabels(groups),
  };

  return {
    groups,
    hud,
    type: "hydrate",
  };
}

function createSession({
  activity = "idle",
  activityLabel,
  alias,
  detail,
  isFocused = false,
  isRunning = true,
  isVisible = false,
  primaryTitle,
  sessionId,
  shortcutLabel,
  terminalTitle,
}: {
  activity?: SidebarSessionItem["activity"];
  activityLabel?: string;
  alias: string;
  detail?: string;
  isFocused?: boolean;
  isRunning?: boolean;
  isVisible?: boolean;
  primaryTitle?: string;
  sessionId: string;
  shortcutLabel: string;
  terminalTitle?: string;
}): SidebarSessionItem {
  return {
    activity,
    activityLabel,
    alias,
    column: 0,
    detail,
    isFocused,
    isRunning,
    isVisible,
    primaryTitle,
    row: 0,
    sessionId,
    shortcutLabel,
    terminalTitle,
  };
}

function cloneGroups(groups: SidebarStoryGroup[]): SidebarStoryGroup[] {
  return groups.map((group) => ({
    ...group,
    sessions: group.sessions.map((session) => ({ ...session })),
  }));
}

function getFocusedSessionTitle(groups: SidebarSessionGroup[]): string | undefined {
  const focusedSession = groups
    .flatMap((group) => group.sessions)
    .find((session) => session.isFocused);

  if (!focusedSession) {
    return undefined;
  }

  return (
    focusedSession.alias ??
    focusedSession.terminalTitle ??
    focusedSession.primaryTitle ??
    focusedSession.detail
  );
}

function getVisibleSlotLabels(groups: SidebarSessionGroup[]): string[] {
  return groups
    .flatMap((group) => group.sessions)
    .filter((session) => session.isVisible)
    .map((session) => session.shortcutLabel);
}
