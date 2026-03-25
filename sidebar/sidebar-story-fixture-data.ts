import type { SidebarStoryFixture } from "./sidebar-story-fixtures";
import { createStorySession, type SidebarStoryGroup } from "./sidebar-story-fixture-helpers";

const DEFAULT_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: false,
    sessions: [
      createStorySession({
        alias: "show title in 2nd row",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
        alias: "layout drift fix",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
      createStorySession({
        alias: "Harbor Vale",
        agentIcon: "codex",
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
      createStorySession({
        activity: "attention",
        alias: "tooltip & show an indicator on the active card",
        detail: "OpenAI Codex",
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
      createStorySession({
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
      createStorySession({
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
      createStorySession({
        activity: "working",
        alias: "active refactor",
        detail: "Claude Code",
        isFocused: true,
        isVisible: true,
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
        alias: "ui hover audit",
        detail: "OpenAI Codex",
        isVisible: true,
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
      createStorySession({
        activity: "attention",
        alias: "terminal title indicator",
        detail: "OpenAI Codex",
        isVisible: true,
        sessionId: "session-3",
        shortcutLabel: "⌘⌥3",
      }),
      createStorySession({
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
      createStorySession({
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
      createStorySession({
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
      createStorySession({
        activity: "attention",
        alias: "hover tooltip verification for overflow and status chip alignment",
        detail:
          "Claude Code with a surprisingly verbose secondary line to stress wrapping assumptions",
        isVisible: true,
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
        terminalTitle: "Claude Code / visual diff / attention state",
      }),
      createStorySession({
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
      createStorySession({
        alias: "session card spacing audit across themes",
        detail: "OpenAI Codex",
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
      createStorySession({
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
      createStorySession({
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
      createStorySession({
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
      createStorySession({
        alias: "Atlas Forge",
        detail: "OpenAI Codex",
        isFocused: true,
        isVisible: true,
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
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
      createStorySession({
        alias: "Cinder Path",
        detail: "OpenAI Codex",
        sessionId: "session-3",
        shortcutLabel: "⌘⌥3",
      }),
      createStorySession({
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
      createStorySession({
        alias: "Elm Signal",
        detail: "OpenAI Codex",
        sessionId: "session-5",
        shortcutLabel: "⌘⌥5",
      }),
      createStorySession({
        alias: "Fjord Thread",
        detail: "OpenAI Codex",
        sessionId: "session-6",
        shortcutLabel: "⌘⌥6",
      }),
    ],
    title: "Group 3",
  },
];

export const GROUPS_BY_FIXTURE: Record<SidebarStoryFixture, SidebarStoryGroup[]> = {
  default: DEFAULT_GROUPS,
  "empty-groups": EMPTY_GROUPS,
  "overflow-stress": OVERFLOW_STRESS_GROUPS,
  "selector-states": SELECTOR_STATE_GROUPS,
  "three-groups-stress": THREE_GROUPS_STRESS,
};
