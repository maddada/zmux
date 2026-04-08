import { isT3Session, type SessionRecord } from "../../shared/session-grid-contract";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
} from "../../shared/terminal-host-protocol";
import { createDisconnectedSessionSnapshot } from "../terminal-workspace-helpers";

export const MIN_WORKING_DURATION_BEFORE_ATTENTION_MS = 5_000;
export const INITIAL_ACTIVITY_SUPPRESSION_MS = 7_000;

type SessionActivityContext = {
  cancelPendingCompletionSound: (sessionId: string) => void;
  getActivitySuppressedUntil?: (sessionRecord: SessionRecord) => number | undefined;
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  getT3ActivityState: (sessionRecord: SessionRecord) => {
    activity: TerminalAgentStatus;
    isRunning: boolean;
  };
  lastKnownActivityBySessionId: Map<string, TerminalAgentStatus>;
  recordLastActivityTransition?: (
    sessionId: string,
    previousActivity: TerminalAgentStatus | undefined,
    nextActivity: TerminalAgentStatus,
  ) => void;
  queueCompletionSound: (sessionId: string) => void;
  workingStartedAtBySessionId: Map<string, number>;
  workspaceId: string;
};

export function shouldRefreshLastActivityOnTransition(
  previousActivity: TerminalAgentStatus | undefined,
  nextActivity: TerminalAgentStatus,
): boolean {
  return (
    (nextActivity === "working" && previousActivity !== "working") ||
    (previousActivity === "working" && nextActivity !== "working")
  );
}

export function getEffectiveSessionActivity(
  context: SessionActivityContext,
  sessionRecord: SessionRecord,
  sessionSnapshot: TerminalSessionSnapshot,
): { activity: TerminalAgentStatus; agentName: string | undefined } {
  if (isT3Session(sessionRecord)) {
    return {
      activity: context.getT3ActivityState(sessionRecord).activity,
      agentName: "t3",
    };
  }

  const sessionId = sessionRecord.sessionId;
  const activitySuppressedUntil = context.getActivitySuppressedUntil?.(sessionRecord);
  if (
    activitySuppressedUntil !== undefined &&
    Number.isFinite(activitySuppressedUntil) &&
    Date.now() < activitySuppressedUntil
  ) {
    context.workingStartedAtBySessionId.delete(sessionId);
    return {
      activity: "idle",
      agentName: sessionSnapshot.agentName,
    };
  }

  if (sessionSnapshot.agentStatus === "working") {
    if (!context.workingStartedAtBySessionId.has(sessionId)) {
      context.workingStartedAtBySessionId.set(sessionId, Date.now());
    }

    return {
      activity: "working",
      agentName: sessionSnapshot.agentName,
    };
  }

  if (sessionSnapshot.agentStatus === "attention") {
    const workingStartedAt = context.workingStartedAtBySessionId.get(sessionId);
    if (
      workingStartedAt === undefined ||
      Date.now() - workingStartedAt < MIN_WORKING_DURATION_BEFORE_ATTENTION_MS
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
    };
  }

  context.workingStartedAtBySessionId.delete(sessionId);
  return {
    activity: sessionSnapshot.agentStatus,
    agentName: sessionSnapshot.agentName,
  };
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
    if (shouldRefreshLastActivityOnTransition(previousActivity, effectiveActivity.activity)) {
      context.recordLastActivityTransition?.(
        sessionRecord.sessionId,
        previousActivity,
        effectiveActivity.activity,
      );
    }

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
