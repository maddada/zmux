import {
  isBrowserSession,
  isT3Session,
  isTerminalSession,
  type SessionRecord,
} from "../../shared/session-grid-contract";

export type SessionActivationPlan = {
  shouldCreateOrAttachTerminal: boolean;
  shouldFocusStoredSession: boolean;
  shouldNoop: boolean;
  shouldRefreshAfterActivation: boolean;
  shouldResumeAgentAfterReveal: boolean;
};

export type CreateSessionActivationPlanOptions = {
  hasLiveBrowserTab: boolean;
  hasLiveT3Panel: boolean;
  hasLiveTerminal: boolean;
  hasStoredAgentLaunch: boolean;
  isAlreadyFocused: boolean;
  isT3Running: boolean;
};

export function createSessionActivationPlan(
  sessionRecord: SessionRecord,
  options: CreateSessionActivationPlanOptions,
): SessionActivationPlan {
  const hasLiveSurface = getHasLiveSurface(sessionRecord, options);
  const shouldNoop = options.isAlreadyFocused && hasLiveSurface;
  const shouldCreateOrAttachTerminal = isTerminalSession(sessionRecord) && !options.hasLiveTerminal;

  return {
    shouldCreateOrAttachTerminal,
    shouldFocusStoredSession: !options.isAlreadyFocused,
    shouldNoop,
    shouldRefreshAfterActivation: !hasLiveSurface,
    shouldResumeAgentAfterReveal: shouldCreateOrAttachTerminal && options.hasStoredAgentLaunch,
  };
}

function getHasLiveSurface(
  sessionRecord: SessionRecord,
  options: CreateSessionActivationPlanOptions,
): boolean {
  if (isTerminalSession(sessionRecord)) {
    return options.hasLiveTerminal;
  }

  if (isBrowserSession(sessionRecord)) {
    return options.hasLiveBrowserTab;
  }

  if (isT3Session(sessionRecord)) {
    return options.hasLiveT3Panel && options.isT3Running;
  }

  return false;
}
