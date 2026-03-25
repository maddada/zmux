import type { TerminalAgentStatus } from "../shared/terminal-host-protocol";

export type SnapshotThread = {
  deletedAt?: string | null;
  id?: string;
  latestTurn?: {
    completedAt?: string | null;
    state?: string | null;
    turnId?: string;
  } | null;
  session?: {
    activeTurnId?: string | null;
    lastError?: string | null;
    status?: string | null;
    updatedAt?: string;
  } | null;
};

export type SnapshotResponse = {
  threads?: SnapshotThread[];
};

export type T3ThreadActivityState = {
  activity: TerminalAgentStatus;
  completionMarker?: string;
  isRunning: boolean;
};

export function resolveThreadActivity(
  thread: SnapshotThread,
  previousState?: T3ThreadActivityState,
): T3ThreadActivityState {
  const sessionStatus = normalizeThreadSessionStatus(thread.session?.status);
  const latestTurnState = normalizeLatestTurnState(thread.latestTurn?.state);
  const isWorking =
    sessionStatus === "starting" || sessionStatus === "running" || latestTurnState === "running";
  const completionMarker = getCompletionMarker(thread);
  const shouldRaiseAttention =
    !isWorking &&
    previousState !== undefined &&
    completionMarker !== undefined &&
    completionMarker !== previousState?.completionMarker &&
    (latestTurnState === "completed" ||
      latestTurnState === "interrupted" ||
      latestTurnState === "error");
  const shouldKeepAttention =
    !isWorking &&
    completionMarker !== undefined &&
    previousState?.activity === "attention" &&
    previousState.completionMarker === completionMarker;

  return {
    activity: isWorking
      ? "working"
      : shouldRaiseAttention || shouldKeepAttention
        ? "attention"
        : "idle",
    completionMarker,
    isRunning: sessionStatus !== "error",
  };
}

export function haveSameThreadStateMaps(
  left: ReadonlyMap<string, T3ThreadActivityState>,
  right: ReadonlyMap<string, T3ThreadActivityState>,
): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const [threadId, leftState] of left) {
    const rightState = right.get(threadId);
    if (
      !rightState ||
      leftState.activity !== rightState.activity ||
      leftState.isRunning !== rightState.isRunning ||
      leftState.completionMarker !== rightState.completionMarker
    ) {
      return false;
    }
  }

  return true;
}

function getCompletionMarker(thread: SnapshotThread): string | undefined {
  const latestTurnState = normalizeLatestTurnState(thread.latestTurn?.state);
  if (
    latestTurnState === "completed" ||
    latestTurnState === "interrupted" ||
    latestTurnState === "error"
  ) {
    return [
      "turn",
      thread.latestTurn?.turnId ?? "",
      latestTurnState,
      thread.latestTurn?.completedAt ?? "",
    ].join(":");
  }

  if (normalizeThreadSessionStatus(thread.session?.status) === "error") {
    return [
      "session",
      thread.session?.updatedAt ?? "",
      "error",
      thread.session?.lastError ?? "",
    ].join(":");
  }

  return undefined;
}

function normalizeThreadSessionStatus(status: unknown): string | undefined {
  return typeof status === "string" ? status : undefined;
}

function normalizeLatestTurnState(state: unknown): string | undefined {
  return typeof state === "string" ? state : undefined;
}
