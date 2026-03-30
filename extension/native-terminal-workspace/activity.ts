import { isT3Session, type SessionRecord } from "../../shared/session-grid-contract";
import type {
  TerminalAgentStatus,
  TerminalSessionSnapshot,
} from "../../shared/terminal-host-protocol";
import { createDisconnectedSessionSnapshot } from "../terminal-workspace-helpers";

type SessionActivityContext = {
  cancelPendingCompletionSound: (sessionId: string) => void;
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  getT3ActivityState: (sessionRecord: SessionRecord) => {
    activity: TerminalAgentStatus;
    isRunning: boolean;
  };
  lastKnownActivityBySessionId: Map<string, TerminalAgentStatus>;
  queueCompletionSound: (sessionId: string) => void;
  workspaceId: string;
};

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
