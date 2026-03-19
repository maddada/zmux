import type { SidebarSessionActivityState } from "../shared/session-grid-contract";

const CLAUDE_CODE_IDLE_MARKER = "✳";
const CLAUDE_CODE_TITLE = "Claude Code";

export type TitleDerivedSessionActivity = {
  activity: SidebarSessionActivityState;
  agentName: string;
};

export function getTitleDerivedSessionActivity(
  title: string,
  previousDerivedActivity?: TitleDerivedSessionActivity,
): TitleDerivedSessionActivity | undefined {
  const claudeCodeTitleState = getClaudeCodeTitleState(title);
  if (!claudeCodeTitleState) {
    return undefined;
  }

  if (claudeCodeTitleState === "working") {
    return {
      activity: "working",
      agentName: "claude",
    };
  }

  if (previousDerivedActivity?.activity === "attention") {
    return previousDerivedActivity;
  }

  return {
    activity: "idle",
    agentName: "claude",
  };
}

export function getTitleDerivedSessionActivityFromTransition(
  previousTitle: string | undefined,
  nextTitle: string,
  previousDerivedActivity?: TitleDerivedSessionActivity,
): TitleDerivedSessionActivity | undefined {
  const nextActivity = getTitleDerivedSessionActivity(nextTitle, previousDerivedActivity);
  if (!nextActivity) {
    return undefined;
  }

  const previousTitleState = previousTitle ? getClaudeCodeTitleState(previousTitle) : undefined;
  if (
    nextActivity.activity === "idle" &&
    (previousTitleState === "working" || previousDerivedActivity?.activity === "working")
  ) {
    return {
      activity: "attention",
      agentName: nextActivity.agentName,
    };
  }

  return nextActivity;
}

export function haveSameTitleDerivedSessionActivity(
  left: TitleDerivedSessionActivity | undefined,
  right: TitleDerivedSessionActivity | undefined,
): boolean {
  return left?.activity === right?.activity && left?.agentName === right?.agentName;
}

function getClaudeCodeTitleState(title: string): "idleMarkerVisible" | "working" | undefined {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  if (normalizedTitle.toLowerCase() === CLAUDE_CODE_TITLE.toLowerCase()) {
    return "working";
  }

  const markedClaudeCodeTitle = `${CLAUDE_CODE_IDLE_MARKER} ${CLAUDE_CODE_TITLE}`;
  if (normalizedTitle.toLowerCase() === markedClaudeCodeTitle.toLowerCase()) {
    return "idleMarkerVisible";
  }

  return undefined;
}
