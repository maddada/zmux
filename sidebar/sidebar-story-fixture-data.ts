import type { SidebarStoryFixture } from "./sidebar-story-fixtures";
import { createStorySession, type SidebarStoryGroup } from "./sidebar-story-fixture-helpers";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function secondsAgo(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

const DEFAULT_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: false,
    sessions: [
      createStorySession({
        alias: "show title in 2nd row",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        lastInteractionAt: secondsAgo(30),
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
        alias: "layout drift fix",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        lastInteractionAt: minutesAgo(7),
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
      createStorySession({
        alias: "Harbor Vale",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        lastInteractionAt: minutesAgo(18),
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
        lastInteractionAt: minutesAgo(3),
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
      createStorySession({
        alias: "Indigo Grove",
        detail: "OpenAI Codex",
        lastInteractionAt: minutesAgo(11),
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

const COMMAND_INDICATOR_ACTIVE_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: true,
    sessions: [
      createStorySession({
        alias: "Dev server",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        isFocused: true,
        isVisible: true,
        lastInteractionAt: secondsAgo(12),
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
        alias: "layout drift fix",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        lastInteractionAt: minutesAgo(7),
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
    ],
    title: "Main",
  },
];

const BROWSER_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "browser-main",
    isActive: false,
    kind: "browser",
    sessions: [
      {
        ...createStorySession({
          alias: "22",
          detail: "https://chatgpt.com",
          isFocused: true,
          isVisible: true,
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-1",
          shortcutLabel: "⌘⌥1",
        }),
        agentIcon: "browser",
        kind: "browser",
        sessionKind: "browser",
      },
      {
        ...createStorySession({
          alias: "Auto Thread Naming (WT)",
          detail: "https://chatgpt.com",
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-2",
          shortcutLabel: "⌘⌥2",
        }),
        agentIcon: "browser",
        kind: "browser",
        sessionKind: "browser",
      },
      {
        ...createStorySession({
          alias: "DPCode Embed UI Changes",
          detail: "https://chatgpt.com",
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-3",
          shortcutLabel: "⌘⌥3",
        }),
        agentIcon: "browser",
        kind: "browser",
        sessionKind: "browser",
      },
      {
        ...createStorySession({
          alias: "T3Code Paste Issue",
          detail: "https://chatgpt.com",
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-4",
          shortcutLabel: "⌘⌥4",
        }),
        agentIcon: "browser",
        kind: "browser",
        sessionKind: "browser",
      },
      {
        ...createStorySession({
          alias: "Collapsed Group Click Fix",
          detail: "https://chatgpt.com",
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-5",
          shortcutLabel: "⌘⌥5",
        }),
        agentIcon: "browser",
        kind: "browser",
        sessionKind: "browser",
      },
      {
        ...createStorySession({
          alias: "T3 Code",
          detail: "https://t3.chat",
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-6",
          shortcutLabel: "⌘⌥6",
        }),
        agentIcon: "t3",
        kind: "browser",
        sessionKind: "browser",
      },
      {
        ...createStorySession({
          alias: "Pinned Prompts",
          detail: "https://chatgpt.com",
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-7",
          shortcutLabel: "⌘⌥7",
        }),
        agentIcon: "browser",
        kind: "browser",
        sessionKind: "browser",
      },
      {
        ...createStorySession({
          alias: "Auto Thread Naming",
          detail: "https://chatgpt.com",
          lastInteractionAt: secondsAgo(2),
          sessionId: "browser-session-8",
          shortcutLabel: "⌘⌥8",
        }),
        agentIcon: "browser",
        kind: "browser",
        sessionKind: "browser",
      },
    ],
    title: "Main",
  },
  {
    groupId: "browser-ghostty",
    isActive: false,
    kind: "browser",
    sessions: [],
    title: "Ghostty",
  },
  {
    groupId: "browser-cicd",
    isActive: false,
    kind: "browser",
    sessions: [],
    title: "CI/CD",
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
        lastInteractionAt: minutesAgo(2),
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
        alias: "ui hover audit",
        detail: "OpenAI Codex",
        isVisible: true,
        lastInteractionAt: minutesAgo(6),
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
      createStorySession({
        activity: "attention",
        alias: "terminal title indicator",
        detail: "OpenAI Codex",
        isVisible: true,
        lastInteractionAt: minutesAgo(9),
        sessionId: "session-3",
        shortcutLabel: "⌘⌥3",
      }),
      createStorySession({
        alias: "workspace sync",
        detail: "OpenAI Codex",
        isVisible: true,
        lastInteractionAt: minutesAgo(24),
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
        lastInteractionAt: minutesAgo(42),
        sessionId: "session-5",
        shortcutLabel: "⌘⌥5",
      }),
    ],
    title: "Review",
  },
];

const SORT_TOGGLE_DEMO_GROUPS: SidebarStoryGroup[] = [
  {
    groupId: "group-1",
    isActive: true,
    sessions: [
      createStorySession({
        alias: "older draft first",
        detail: "OpenAI Codex",
        isFocused: true,
        isVisible: true,
        lastInteractionAt: minutesAgo(18),
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
        activity: "working",
        alias: "most recent follow-up",
        detail: "OpenAI Codex",
        isVisible: true,
        lastInteractionAt: minutesAgo(2),
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
      }),
      createStorySession({
        alias: "middle checkpoint",
        detail: "OpenAI Codex",
        lastInteractionAt: minutesAgo(9),
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
        alias: "stale notes",
        detail: "OpenAI Codex",
        lastInteractionAt: minutesAgo(27),
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
      createStorySession({
        activity: "attention",
        alias: "recent interrupt",
        detail: "OpenAI Codex",
        lastInteractionAt: minutesAgo(4),
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
        lastInteractionAt: secondsAgo(45),
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
        lastInteractionAt: minutesAgo(8),
        sessionId: "session-2",
        shortcutLabel: "⌘⌥2",
        terminalTitle: "Claude Code / visual diff / attention state",
      }),
      createStorySession({
        alias: "inactive session with close button",
        detail: "Gemini CLI",
        isRunning: false,
        lastInteractionAt: minutesAgo(15),
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
        lastInteractionAt: minutesAgo(4),
        sessionId: "session-4",
        shortcutLabel: "⌘⌥4",
      }),
      createStorySession({
        alias: "secondary label overflow with keyboard shortcut visible",
        detail: "OpenAI Codex with another very long provider name for stress testing",
        lastInteractionAt: minutesAgo(12),
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
        lastInteractionAt: minutesAgo(26),
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
        lastInteractionAt: minutesAgo(1),
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
        lastInteractionAt: secondsAgo(20),
        sessionId: "session-1",
        shortcutLabel: "⌘⌥1",
      }),
      createStorySession({
        alias: "Beryl Note",
        detail: "OpenAI Codex",
        isVisible: true,
        lastInteractionAt: minutesAgo(6),
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
        lastInteractionAt: minutesAgo(13),
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
  "browser-groups": BROWSER_GROUPS,
  "command-indicator-active": COMMAND_INDICATOR_ACTIVE_GROUPS,
  default: DEFAULT_GROUPS,
  "empty-groups": EMPTY_GROUPS,
  "overflow-stress": OVERFLOW_STRESS_GROUPS,
  "selector-states": SELECTOR_STATE_GROUPS,
  "sort-toggle-demo": SORT_TOGGLE_DEMO_GROUPS,
  "three-groups-stress": THREE_GROUPS_STRESS,
};
