import {
  isT3Session,
  isTerminalSession,
  type SessionRecord,
} from "../../shared/session-grid-contract";

export type SessionRenamePlan = {
  shouldFocusRenamedSession: boolean;
  shouldScrollRenamedSessionToBottom: boolean;
};

export function createSessionRenamePlan(
  sessionRecord: SessionRecord,
  focusedSessionId: string | undefined,
): SessionRenamePlan {
  const shouldFocusRenamedSession =
    !isT3Session(sessionRecord) && sessionRecord.sessionId !== focusedSessionId;

  return {
    shouldFocusRenamedSession,
    shouldScrollRenamedSessionToBottom:
      shouldFocusRenamedSession && isTerminalSession(sessionRecord),
  };
}
