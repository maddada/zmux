import { isT3Session, type SessionRecord } from "../../shared/session-grid-contract";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
} from "../../shared/terminal-host-protocol";
import { createDisconnectedSessionSnapshot } from "../terminal-workspace-helpers";

export const MIN_WORKING_DURATION_BEFORE_ATTENTION_MS = 5_000;
export const INITIAL_ACTIVITY_SUPPRESSION_MS = 7_000;
export const MIN_WORKING_DURATION_BEFORE_LAST_ACTIVITY_MS = 7_000;

type SessionActivityContext = {
  cancelPendingCompletionSound: (sessionId: string) => void;
  getActivitySuppressedUntil?: (sessionRecord: SessionRecord) => number | undefined;
  getAttentionSuppressedUntil?: (sessionRecord: SessionRecord) => number | undefined;
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  getT3ActivityState: (sessionRecord: SessionRecord) => {
    activity: TerminalAgentStatus;
    isRunning: boolean;
  };
  lastKnownActivityBySessionId: Map<string, TerminalAgentStatus>;
  queueCompletionSound: (sessionId: string) => void;
  workingStartedAtBySessionId: Map<string, number>;
  workspaceId: string;
};

export function hasReachedLastActivityThreshold(
  workingDurationMs: number | undefined,
): workingDurationMs is number {
  return (
    workingDurationMs !== undefined &&
    workingDurationMs >= MIN_WORKING_DURATION_BEFORE_LAST_ACTIVITY_MS
  );
}

export function getDisplayedLastInteractionIso(args: {
  fallbackInteractionAt: string | undefined;
  overrideActivityAt: number | undefined;
}): string | undefined {
  if (args.overrideActivityAt === undefined) {
    return args.fallbackInteractionAt;
  }

  return new Date(args.overrideActivityAt).toISOString();
}

export function shouldRefreshLastActivityOnTransition(
  previousActivity: TerminalAgentStatus | undefined,
  nextActivity: TerminalAgentStatus,
): boolean {
  return (
    (nextActivity === "working" && previousActivity !== "working") ||
    (previousActivity === "working" && nextActivity !== "working")
  );
}

export function shouldRecordLastActivityTransition(args: {
  hasCompletedInitialActivityHydration: boolean;
  nextActivity: TerminalAgentStatus;
  previousActivity: TerminalAgentStatus | undefined;
  sessionKind: SessionRecord["kind"];
}): boolean {
  if (!shouldRefreshLastActivityOnTransition(args.previousActivity, args.nextActivity)) {
    return false;
  }

  return args.sessionKind !== "terminal" || args.hasCompletedInitialActivityHydration;
}

export function getEffectiveSessionActivity(
  context: SessionActivityContext,
  sessionRecord: SessionRecord,
  sessionSnapshot: TerminalSessionSnapshot,
): {
  activity: TerminalAgentStatus;
  agentName: string | undefined;
  workingDurationMs?: number;
} {
  if (isT3Session(sessionRecord)) {
    return {
      activity: context.getT3ActivityState(sessionRecord).activity,
      agentName: "t3",
    };
  }

  const sessionId = sessionRecord.sessionId;
  const now = Date.now();
  const shouldTrustNativeAgentStatus = isTrustedNativeAgentStatus(sessionSnapshot.agentName);
  const activitySuppressedUntil = context.getActivitySuppressedUntil?.(sessionRecord);
  if (
    !shouldTrustNativeAgentStatus &&
    activitySuppressedUntil !== undefined &&
    Number.isFinite(activitySuppressedUntil) &&
    now < activitySuppressedUntil
  ) {
    context.workingStartedAtBySessionId.delete(sessionId);
    return {
      activity: "idle",
      agentName: sessionSnapshot.agentName,
    };
  }

  if (sessionSnapshot.agentStatus === "working") {
    if (!context.workingStartedAtBySessionId.has(sessionId)) {
      context.workingStartedAtBySessionId.set(sessionId, now);
    }

    const workingStartedAt = context.workingStartedAtBySessionId.get(sessionId);
    return {
      activity: "working",
      agentName: sessionSnapshot.agentName,
      workingDurationMs:
        workingStartedAt === undefined ? undefined : Math.max(0, now - workingStartedAt),
    };
  }

  if (sessionSnapshot.agentStatus === "attention") {
    const workingStartedAt = context.workingStartedAtBySessionId.get(sessionId);
    const workingDurationMs =
      workingStartedAt === undefined ? undefined : Math.max(0, now - workingStartedAt);
    const attentionSuppressedUntil = context.getAttentionSuppressedUntil?.(sessionRecord);
    if (
      attentionSuppressedUntil !== undefined &&
      Number.isFinite(attentionSuppressedUntil) &&
      now < attentionSuppressedUntil
    ) {
      const suppressedActivity =
        context.lastKnownActivityBySessionId.get(sessionId) === "working" ? "working" : "idle";
      return {
        activity: suppressedActivity,
        agentName: sessionSnapshot.agentName,
        workingDurationMs,
      };
    }

    if (
      (!shouldTrustNativeAgentStatus && workingStartedAt === undefined) ||
      (!shouldTrustNativeAgentStatus &&
        (workingDurationMs ?? 0) < MIN_WORKING_DURATION_BEFORE_ATTENTION_MS)
    ) {
      context.workingStartedAtBySessionId.delete(sessionId);
      return {
        activity: "idle",
        agentName: sessionSnapshot.agentName,
      };
    }

    return {
      activity: "attention",
      agentName: sessionSnapshot.agentName,
      workingDurationMs,
    };
  }

  const workingStartedAt = context.workingStartedAtBySessionId.get(sessionId);
  const workingDurationMs =
    workingStartedAt === undefined ? undefined : Math.max(0, now - workingStartedAt);
  context.workingStartedAtBySessionId.delete(sessionId);
  return {
    activity: sessionSnapshot.agentStatus,
    agentName: sessionSnapshot.agentName,
    workingDurationMs,
  };
}

function isTrustedNativeAgentStatus(agentName: string | undefined): boolean {
  return agentName?.trim().toLowerCase() === "opencode";
}

export async function syncKnownSessionActivities(
  context: SessionActivityContext,
  sessionRecords: readonly SessionRecord[],
  playSound: boolean,
): Promise<void> {
  const nextActivityBySessionId = new Map<string, TerminalAgentStatus>();

  for (const sessionRecord of sessionRecords) {
    const sessionSnapshot =
      context.getSessionSnapshot(sessionRecord.sessionId) ??
      createDisconnectedSessionSnapshot(sessionRecord.sessionId, context.workspaceId);
    const effectiveActivity = getEffectiveSessionActivity(context, sessionRecord, sessionSnapshot);
    const previousActivity = context.lastKnownActivityBySessionId.get(sessionRecord.sessionId);
    nextActivityBySessionId.set(sessionRecord.sessionId, effectiveActivity.activity);
    if (!playSound) {
      continue;
    }

    if (effectiveActivity.activity === "attention") {
      if (previousActivity !== "attention") {
        context.queueCompletionSound(sessionRecord.sessionId);
      }
      continue;
    }

    context.cancelPendingCompletionSound(sessionRecord.sessionId);
  }

  context.lastKnownActivityBySessionId.clear();
  for (const [sessionId, activity] of nextActivityBySessionId) {
    context.lastKnownActivityBySessionId.set(sessionId, activity);
  }
}
