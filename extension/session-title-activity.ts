import type { SidebarSessionActivityState } from "../shared/session-grid-contract";

const CLAUDE_CODE_IDLE_MARKERS = ["✳", "*"] as const;
const CLAUDE_CODE_WORKING_MARKERS = ["⠐", "⠂", "·"] as const;
const CLAUDE_CODE_TITLE = "Claude Code";
const CODEX_TITLE_KEYWORD = "codex";
const CODEX_WORKING_MARKERS = ["⠸", "⠴", "⠼", "⠧", "⠦", "⠏", "⠋", "⠇", "⠙", "⠹"] as const;
const GEMINI_WORKING_MARKER = "✦";
const GEMINI_IDLE_MARKER = "◇";
const COPILOT_WORKING_MARKER = "🤖";
const COPILOT_IDLE_MARKER = "🔔";
export const TITLE_ACTIVITY_WINDOW_MS = 1_000;
export const SLOW_SPINNER_ACTIVITY_WINDOW_MS = 3_000;

export type TitleDerivedSessionActivity = {
  activity: SidebarSessionActivityState;
  agentName: string;
  hasSeenWorking?: boolean;
  isAcknowledged?: boolean;
  lastTitleChangeAt?: number;
};

const ASCII_SYMBOL_LOG_ALLOWLIST = new Set(["*"]);

export function getTitleDerivedSessionActivity(
  title: string,
  previousDerivedActivity?: TitleDerivedSessionActivity,
  knownAgentName?: string,
): TitleDerivedSessionActivity | undefined {
  const titleState = getTitleState(title, knownAgentName ?? previousDerivedActivity?.agentName);
  if (!titleState) {
    return getFallbackActivity(previousDerivedActivity);
  }

  const sameAgent = previousDerivedActivity?.agentName === titleState.agentName;
  const hasSeenWorking = sameAgent
    ? (previousDerivedActivity?.hasSeenWorking ?? false) ||
      previousDerivedActivity?.activity === "working" ||
      previousDerivedActivity?.activity === "attention"
    : false;
  const isAcknowledged = sameAgent ? previousDerivedActivity?.isAcknowledged ?? false : false;
  const lastTitleChangeAt = sameAgent ? previousDerivedActivity?.lastTitleChangeAt : undefined;
  if (titleState.state === "idle") {
    return {
      activity: hasSeenWorking && !isAcknowledged ? "attention" : "idle",
      agentName: titleState.agentName,
      hasSeenWorking,
      isAcknowledged,
      lastTitleChangeAt,
    };
  }

  const effectiveLastTitleChangeAt =
    lastTitleChangeAt ??
    (requiresObservedTitleTransitions(titleState.agentName) ? undefined : Date.now());
  if (effectiveLastTitleChangeAt === undefined) {
    return {
      activity: hasSeenWorking && !isAcknowledged ? "attention" : "idle",
      agentName: titleState.agentName,
      hasSeenWorking,
      isAcknowledged,
      lastTitleChangeAt: undefined,
    };
  }
  return {
    activity:
      Date.now() - effectiveLastTitleChangeAt <= getTitleActivityWindowMs(titleState.agentName)
        ? "working"
        : isAcknowledged
          ? "idle"
          : "attention",
    agentName: titleState.agentName,
    hasSeenWorking: true,
    isAcknowledged,
    lastTitleChangeAt: effectiveLastTitleChangeAt,
  };
}

export function getTitleDerivedSessionActivityFromTransition(
  previousTitle: string | undefined,
  nextTitle: string,
  previousDerivedActivity?: TitleDerivedSessionActivity,
  knownAgentName?: string,
): TitleDerivedSessionActivity | undefined {
  const nextTitleState = getTitleState(nextTitle, knownAgentName ?? previousDerivedActivity?.agentName);
  if (nextTitleState) {
    const sameAgent = previousDerivedActivity?.agentName === nextTitleState.agentName;
    const hasSeenWorking = sameAgent
      ? (previousDerivedActivity?.hasSeenWorking ?? false) ||
        previousDerivedActivity?.activity === "working" ||
        previousDerivedActivity?.activity === "attention"
      : false;
    const isAcknowledged = sameAgent ? previousDerivedActivity?.isAcknowledged ?? false : false;
    return {
      activity:
        nextTitleState.state === "working"
          ? "working"
          : hasSeenWorking && !isAcknowledged
            ? "attention"
            : "idle",
      agentName: nextTitleState.agentName,
      hasSeenWorking: nextTitleState.state === "working" ? true : hasSeenWorking,
      isAcknowledged: nextTitleState.state === "working" ? false : isAcknowledged,
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

  return getFallbackActivity(previousDerivedActivity);
}

export function haveSameTitleDerivedSessionActivity(
  left: TitleDerivedSessionActivity | undefined,
  right: TitleDerivedSessionActivity | undefined,
): boolean {
  return (
    left?.activity === right?.activity &&
    left?.agentName === right?.agentName &&
    left?.isAcknowledged === right?.isAcknowledged
  );
}

export function acknowledgeTitleDerivedSessionActivity(
  activity: TitleDerivedSessionActivity | undefined,
): TitleDerivedSessionActivity | undefined {
  if (!activity || activity.activity !== "attention") {
    return activity;
  }

  return {
    ...activity,
    activity: "idle",
    isAcknowledged: true,
  };
}

export function getInterestingTitleSymbols(title: string): string[] {
  const symbols: string[] = [];

  for (const character of title) {
    if (/\s/u.test(character) || /[\p{L}\p{N}]/u.test(character)) {
      continue;
    }

    if (character.codePointAt(0)! <= 0x7f && !ASCII_SYMBOL_LOG_ALLOWLIST.has(character)) {
      continue;
    }

    if (!symbols.includes(character)) {
      symbols.push(character);
    }
  }

  return symbols;
}

function getTitleState(
  title: string,
  knownAgentName?: string,
): { agentName: "claude" | "codex" | "copilot" | "gemini"; state: "idle" | "working" } | undefined {
  const normalizedAgentName = normalizeKnownAgentName(knownAgentName);

  const claudeCodeTitleState = getClaudeCodeTitleState(title, normalizedAgentName === "claude");
  if (claudeCodeTitleState) {
    return {
      agentName: "claude",
      state: claudeCodeTitleState,
    };
  }

  const codexTitleState = getCodexTitleState(title, normalizedAgentName === "codex");
  if (codexTitleState) {
    return {
      agentName: "codex",
      state: codexTitleState,
    };
  }

  const geminiTitleState = getGeminiTitleState(title, normalizedAgentName === "gemini");
  if (geminiTitleState) {
    return {
      agentName: "gemini",
      state: geminiTitleState,
    };
  }

  const copilotTitleState = getCopilotTitleState(title, normalizedAgentName === "copilot");
  if (copilotTitleState) {
    return {
      agentName: "copilot",
      state: copilotTitleState,
    };
  }

  return undefined;
}

function getClaudeCodeTitleState(
  title: string,
  allowAgentHintMatch = false,
): "idle" | "working" | undefined {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  const lowerTitle = normalizedTitle.toLowerCase();
  const lowerClaudeCodeTitle = CLAUDE_CODE_TITLE.toLowerCase();

  const hasClaudeKeyword = lowerTitle.includes(lowerClaudeCodeTitle);
  const hasClaudeInferenceMarker =
    normalizedTitle.includes("✳") ||
    normalizedTitle.includes("⠐") ||
    normalizedTitle.includes("⠂");
  if (!allowAgentHintMatch && !hasClaudeKeyword && !hasClaudeInferenceMarker) {
    return undefined;
  }

  if (
    normalizedTitle.includes("✳") ||
    allowAgentHintMatch ||
    hasClaudeKeyword ||
    normalizedTitle.includes("*")
  ) {
    if (containsAnyMarker(normalizedTitle, CLAUDE_CODE_IDLE_MARKERS)) {
      return "idle";
    }
  }

  if (
    normalizedTitle.includes("⠐") ||
    normalizedTitle.includes("⠂") ||
    allowAgentHintMatch ||
    hasClaudeKeyword ||
    normalizedTitle.includes("·")
  ) {
    if (containsAnyMarker(normalizedTitle, CLAUDE_CODE_WORKING_MARKERS)) {
      return "working";
    }
  }

  if (allowAgentHintMatch || hasClaudeKeyword) {
    if (containsAnyMarker(normalizedTitle, CLAUDE_CODE_IDLE_MARKERS)) {
      return "idle";
    }

    if (containsAnyMarker(normalizedTitle, CLAUDE_CODE_WORKING_MARKERS)) {
      return "working";
    }
  }

  return undefined;
}

function getCodexTitleState(title: string, allowAgentHintMatch = false): "idle" | "working" | undefined {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  const hasCodexKeyword = normalizedTitle.toLowerCase().includes(CODEX_TITLE_KEYWORD);
  const hasCodexWorkingMarker = getCodexWorkingMarker(normalizedTitle) !== undefined;
  if (!allowAgentHintMatch && !hasCodexKeyword && !hasCodexWorkingMarker) {
    return undefined;
  }

  if (hasCodexWorkingMarker) {
    return "working";
  }

  return "idle";
}

function getGeminiTitleState(title: string, allowAgentHintMatch = false): "idle" | "working" | undefined {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  const lowerTitle = normalizedTitle.toLowerCase();
  if (
    !allowAgentHintMatch &&
    !lowerTitle.includes("gemini") &&
    !normalizedTitle.includes(GEMINI_WORKING_MARKER) &&
    !normalizedTitle.includes(GEMINI_IDLE_MARKER)
  ) {
    return undefined;
  }

  if (normalizedTitle.includes(GEMINI_WORKING_MARKER)) {
    return "working";
  }

  if (normalizedTitle.includes(GEMINI_IDLE_MARKER)) {
    return "idle";
  }

  return undefined;
}

function getCopilotTitleState(title: string, allowAgentHintMatch = false): "idle" | "working" | undefined {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  const lowerTitle = normalizedTitle.toLowerCase();
  if (
    !allowAgentHintMatch &&
    !lowerTitle.includes("copilot") &&
    !lowerTitle.includes("github copilot") &&
    !normalizedTitle.includes(COPILOT_WORKING_MARKER) &&
    !normalizedTitle.includes(COPILOT_IDLE_MARKER)
  ) {
    return undefined;
  }

  if (normalizedTitle.includes(COPILOT_WORKING_MARKER)) {
    return "working";
  }

  if (normalizedTitle.includes(COPILOT_IDLE_MARKER)) {
    return "idle";
  }

  return undefined;
}

function getCodexWorkingMarker(title: string): string | undefined {
  return CODEX_WORKING_MARKERS.find((marker) => title.includes(marker));
}

function containsAnyMarker(title: string, markers: readonly string[]): boolean {
  return markers.some((marker) => title.includes(marker));
}

function normalizeKnownAgentName(
  knownAgentName: string | undefined,
): "claude" | "codex" | "copilot" | "gemini" | undefined {
  const normalizedAgentName = knownAgentName?.trim().toLowerCase();
  if (normalizedAgentName === "claude code") {
    return "claude";
  }
  if (normalizedAgentName === "codex cli") {
    return "codex";
  }
  if (normalizedAgentName === "github copilot") {
    return "copilot";
  }
  if (
    normalizedAgentName === "claude" ||
    normalizedAgentName === "codex" ||
    normalizedAgentName === "gemini" ||
    normalizedAgentName === "copilot"
  ) {
    return normalizedAgentName;
  }

  return undefined;
}

function requiresObservedTitleTransitions(
  agentName: TitleDerivedSessionActivity["agentName"],
): boolean {
  return agentName === "claude" || agentName === "codex";
}

export function getTitleActivityWindowMs(
  agentName: TitleDerivedSessionActivity["agentName"],
): number {
  return requiresObservedTitleTransitions(agentName)
    ? SLOW_SPINNER_ACTIVITY_WINDOW_MS
    : TITLE_ACTIVITY_WINDOW_MS;
}

function getFallbackActivity(
  previousDerivedActivity: TitleDerivedSessionActivity | undefined,
): TitleDerivedSessionActivity | undefined {
  if (!previousDerivedActivity?.hasSeenWorking) {
    return undefined;
  }

  return {
    ...previousDerivedActivity,
    activity: previousDerivedActivity.isAcknowledged ? "idle" : "attention",
  };
}
