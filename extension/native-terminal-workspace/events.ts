import {
  isT3Session,
  type SessionGridSnapshot,
  type SessionRecord,
} from "../../shared/session-grid-contract";
import { getT3SessionBoundThreadId } from "../../shared/t3-session-metadata";
import type { TerminalAgentStatus } from "../../shared/terminal-host-protocol";
import {
  getTitleDerivedSessionActivityFromTransition,
  haveSameTitleDerivedSessionActivity,
  type TitleDerivedSessionActivity,
} from "../session-title-activity";
import { syncKnownSessionActivities } from "./activity";

type SessionEventContext = {
  acknowledgeT3Thread: (threadId: string) => boolean;
  backend: {
    acknowledgeAttention: (sessionId: string) => Promise<boolean>;
    getSessionSnapshot: (sessionId: string) =>
      | {
          agentStatus: TerminalAgentStatus;
        }
      | undefined;
  };
  createSessionActivityContext: () => Parameters<typeof syncKnownSessionActivities>[0];
  getActiveSnapshot: () => SessionGridSnapshot;
  getAllSessionRecords: () => SessionRecord[];
  getSession: (sessionId: string) => SessionRecord | undefined;
  getT3ActivityState: (sessionRecord: SessionRecord) => {
    activity: TerminalAgentStatus;
    isRunning: boolean;
  };
  refreshSidebar: () => Promise<void>;
  terminalTitleBySessionId: Map<string, string>;
  titleDerivedActivityBySessionId: Map<string, TitleDerivedSessionActivity>;
};

export async function handleBackendSessionsChanged(context: SessionEventContext): Promise<void> {
  const focusedSessionId = context.getActiveSnapshot().focusedSessionId;
  if (
    focusedSessionId &&
    context.backend.getSessionSnapshot(focusedSessionId)?.agentStatus === "attention" &&
    shouldAcknowledgeSessionAttention(context.getActiveSnapshot(), focusedSessionId)
  ) {
    const acknowledgedAttention = await acknowledgeSessionAttention(context, focusedSessionId);
    if (acknowledgedAttention) {
      return;
    }
  }

  await syncKnownSessionActivities(
    context.createSessionActivityContext(),
    context.getAllSessionRecords(),
    true,
  );
  await context.refreshSidebar();
}

export async function handleT3ActivityChanged(context: SessionEventContext): Promise<void> {
  const focusedSessionId = context.getActiveSnapshot().focusedSessionId;
  if (focusedSessionId) {
    const sessionRecord = context.getSession(focusedSessionId);
    if (
      sessionRecord &&
      isT3Session(sessionRecord) &&
      context.getT3ActivityState(sessionRecord).activity === "attention" &&
      shouldAcknowledgeSessionAttention(context.getActiveSnapshot(), focusedSessionId)
    ) {
      const acknowledgedAttention = await acknowledgeSessionAttention(context, focusedSessionId);
      if (acknowledgedAttention) {
        return;
      }
    }
  }

  await syncKnownSessionActivities(
    context.createSessionActivityContext(),
    context.getAllSessionRecords(),
    true,
  );
  await context.refreshSidebar();
}

export async function syncSessionTitle(
  context: SessionEventContext,
  sessionId: string,
  title: string,
): Promise<void> {
  const nextTitle = title.trim();
  if (!nextTitle) {
    return;
  }

  const previousTitle = context.terminalTitleBySessionId.get(sessionId);
  if (previousTitle === nextTitle) {
    return;
  }

  const previousDerivedActivity = context.titleDerivedActivityBySessionId.get(sessionId);
  const nextDerivedActivity = getTitleDerivedSessionActivityFromTransition(
    previousTitle,
    nextTitle,
    previousDerivedActivity,
  );
  context.terminalTitleBySessionId.set(sessionId, nextTitle);
  if (nextDerivedActivity) {
    context.titleDerivedActivityBySessionId.set(sessionId, nextDerivedActivity);
  } else {
    context.titleDerivedActivityBySessionId.delete(sessionId);
  }

  const titleActivityChanged = !haveSameTitleDerivedSessionActivity(
    previousDerivedActivity,
    nextDerivedActivity,
  );
  await syncKnownSessionActivities(
    context.createSessionActivityContext(),
    context.getAllSessionRecords(),
    true,
  );

  if (titleActivityChanged || previousTitle !== nextTitle) {
    await context.refreshSidebar();
  }
}

export async function acknowledgeSessionAttention(
  context: SessionEventContext,
  sessionId: string,
): Promise<boolean> {
  const sessionRecord = context.getSession(sessionId);
  if (sessionRecord && isT3Session(sessionRecord)) {
    const acknowledgedAttention = context.acknowledgeT3Thread(
      getT3SessionBoundThreadId(sessionRecord.t3),
    );
    if (acknowledgedAttention) {
      await context.refreshSidebar();
    }
    return acknowledgedAttention;
  }

  let acknowledgedAttention = false;
  const titleDerivedActivity = context.titleDerivedActivityBySessionId.get(sessionId);
  if (titleDerivedActivity?.activity === "attention") {
    context.titleDerivedActivityBySessionId.set(sessionId, {
      ...titleDerivedActivity,
      activity: "idle",
    });
    acknowledgedAttention = true;
  }

  const sessionSnapshot = context.backend.getSessionSnapshot(sessionId);
  if (!sessionSnapshot || sessionSnapshot.agentStatus !== "attention") {
    if (acknowledgedAttention) {
      await context.refreshSidebar();
    }
    return acknowledgedAttention;
  }

  const backendAcknowledged = await context.backend.acknowledgeAttention(sessionId);
  if (!backendAcknowledged && !acknowledgedAttention) {
    return false;
  }

  await context.refreshSidebar();
  return true;
}

function shouldAcknowledgeSessionAttention(
  snapshot: SessionGridSnapshot,
  sessionId: string,
): boolean {
  return snapshot.focusedSessionId === sessionId && snapshot.visibleSessionIds.includes(sessionId);
}
