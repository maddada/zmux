import type { SidebarSessionActivityState } from "../shared/session-grid-contract";

const CLAUDE_CODE_IDLE_MARKERS = ["✳", "*"] as const;
const CLAUDE_CODE_WORKING_MARKERS = ["·"] as const;
const CLAUDE_CODE_TITLE = "Claude Code";
const CODEX_TITLE_KEYWORD = "codex";
const CODEX_WORKING_MARKERS = ["⠸", "⠴", "⠼", "⠧", "⠦", "⠏", "⠋"] as const;
export const TITLE_ACTIVITY_WINDOW_MS = 1_000;

export type TitleDerivedSessionActivity = {
  activity: SidebarSessionActivityState;
  agentName: string;
  lastTitleChangeAt?: number;
};

export function getTitleDerivedSessionActivity(
  title: string,
  previousDerivedActivity?: TitleDerivedSessionActivity,
): TitleDerivedSessionActivity | undefined {
  const titleState = getTitleState(title);
  if (!titleState) {
    return undefined;
  }

  const lastTitleChangeAt =
    previousDerivedActivity?.agentName === titleState.agentName
      ? previousDerivedActivity.lastTitleChangeAt
      : undefined;
  if (titleState.state === "idle") {
    return {
      activity: "idle",
      agentName: titleState.agentName,
      lastTitleChangeAt,
    };
  }

  return {
    activity:
      lastTitleChangeAt !== undefined && Date.now() - lastTitleChangeAt <= TITLE_ACTIVITY_WINDOW_MS
        ? "working"
        : "idle",
    agentName: titleState.agentName,
    lastTitleChangeAt,
  };
}

export function getTitleDerivedSessionActivityFromTransition(
  previousTitle: string | undefined,
  nextTitle: string,
  previousDerivedActivity?: TitleDerivedSessionActivity,
): TitleDerivedSessionActivity | undefined {
  const nextTitleState = getTitleState(nextTitle);
  if (nextTitleState) {
    return {
      activity: nextTitleState.state === "working" ? "working" : "idle",
      agentName: nextTitleState.agentName,
      lastTitleChangeAt:
        nextTitleState.state === "working"
          ? previousDerivedActivity?.agentName === nextTitleState.agentName &&
            previousTitle?.trim() === nextTitle.trim()
            ? previousDerivedActivity.lastTitleChangeAt ?? Date.now()
            : Date.now()
          : previousDerivedActivity?.agentName === nextTitleState.agentName
            ? previousDerivedActivity.lastTitleChangeAt
            : undefined,
    };
  }

  const nextActivity = getTitleDerivedSessionActivity(nextTitle, previousDerivedActivity);
  if (!nextActivity) {
    return undefined;
  }

  return nextActivity;
}

export function haveSameTitleDerivedSessionActivity(
  left: TitleDerivedSessionActivity | undefined,
  right: TitleDerivedSessionActivity | undefined,
): boolean {
  return left?.activity === right?.activity && left?.agentName === right?.agentName;
}

function getTitleState(
  title: string,
): { agentName: "claude" | "codex"; state: "idle" | "working" } | undefined {
  const claudeCodeTitleState = getClaudeCodeTitleState(title);
  if (claudeCodeTitleState) {
    return {
      agentName: "claude",
      state: claudeCodeTitleState,
    };
  }

  const codexTitleState = getCodexTitleState(title);
  if (codexTitleState) {
    return {
      agentName: "codex",
      state: codexTitleState,
    };
  }

  return undefined;
}

function getClaudeCodeTitleState(title: string): "idle" | "working" | undefined {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  const lowerTitle = normalizedTitle.toLowerCase();
  const lowerClaudeCodeTitle = CLAUDE_CODE_TITLE.toLowerCase();

  if (!lowerTitle.includes(lowerClaudeCodeTitle)) {
    return undefined;
  }

  if (containsAnyMarker(normalizedTitle, CLAUDE_CODE_IDLE_MARKERS)) {
    return "idle";
  }

  if (containsAnyMarker(normalizedTitle, CLAUDE_CODE_WORKING_MARKERS)) {
    return "working";
  }

  return undefined;
}

function getCodexTitleState(title: string): "idle" | "working" | undefined {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  if (!normalizedTitle.toLowerCase().includes(CODEX_TITLE_KEYWORD)) {
    return undefined;
  }

  if (getCodexWorkingMarker(normalizedTitle) !== undefined) {
    return "working";
  }

  return "idle";
}

function getCodexWorkingMarker(title: string): string | undefined {
  return CODEX_WORKING_MARKERS.find((marker) => title.includes(marker));
}

function containsAnyMarker(title: string, markers: readonly string[]): boolean {
  return markers.some((marker) => title.includes(marker));
}
