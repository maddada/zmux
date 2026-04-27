import { normalizeTerminalTitle } from "../shared/session-grid-contract";
import type { TerminalAgentStatus } from "../shared/terminal-host-protocol";
import { isGenericAgentSessionTitle } from "./first-prompt-session-title";
import type { PersistedSessionState } from "./session-state-file";

export type TerminalSessionPresentationStateInput = {
  lastKnownPersistedTitle?: string;
  liveTitle?: string;
  snapshotAgentName?: string;
  snapshotAgentStatus?: TerminalAgentStatus;
  titleActivityAgentName?: string;
  titleActivityStatus?: TerminalAgentStatus;
};

export function shouldPreferPersistedSessionPresentation(
  currentState: PersistedSessionState,
): boolean {
  return currentState.agentName?.trim().toLowerCase() === "opencode";
}

export function resolvePersistedSessionPresentationState(
  currentState: PersistedSessionState,
  input: TerminalSessionPresentationStateInput,
): PersistedSessionState {
  const sharedState = {
    ...(currentState.hasAutoTitleFromFirstPrompt === undefined
      ? {}
      : { hasAutoTitleFromFirstPrompt: currentState.hasAutoTitleFromFirstPrompt }),
    lastActivityAt: currentState.lastActivityAt,
    title: resolvePresentedSessionTitle(currentState, input),
  };

  if (shouldPreferPersistedSessionPresentation(currentState)) {
    return {
      agentName: currentState.agentName ?? input.snapshotAgentName ?? input.titleActivityAgentName,
      agentStatus: currentState.agentStatus,
      ...sharedState,
    };
  }

  return {
    agentName: input.titleActivityAgentName ?? input.snapshotAgentName ?? currentState.agentName,
    agentStatus: input.titleActivityStatus ?? input.snapshotAgentStatus ?? currentState.agentStatus,
    ...sharedState,
  };
}

export function resolvePresentedSessionTitle(
  currentState: PersistedSessionState,
  input: TerminalSessionPresentationStateInput,
): string | undefined {
  const liveTitleAgentName =
    currentState.agentName ?? input.titleActivityAgentName ?? input.snapshotAgentName;
  const isLiveTitleGeneric = isGenericAgentSessionTitle(liveTitleAgentName, input.liveTitle);

  if (isLiveTitleGeneric) {
    return normalizeTerminalTitle(currentState.title ?? input.lastKnownPersistedTitle);
  }

  return normalizeTerminalTitle(
    input.liveTitle ?? input.lastKnownPersistedTitle ?? currentState.title,
  );
}
