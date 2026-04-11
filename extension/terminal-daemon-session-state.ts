import { normalizeTerminalTitle } from "../shared/session-grid-contract";
import type { TerminalAgentStatus } from "../shared/terminal-host-protocol";
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
  if (shouldPreferPersistedSessionPresentation(currentState)) {
    return {
      agentName: currentState.agentName ?? input.snapshotAgentName ?? input.titleActivityAgentName,
      agentStatus: currentState.agentStatus,
      lastActivityAt: currentState.lastActivityAt,
      title: normalizeTerminalTitle(
        currentState.title ?? input.lastKnownPersistedTitle ?? input.liveTitle,
      ),
    };
  }

  return {
    agentName: input.titleActivityAgentName ?? input.snapshotAgentName ?? currentState.agentName,
    agentStatus: input.titleActivityStatus ?? input.snapshotAgentStatus ?? currentState.agentStatus,
    lastActivityAt: currentState.lastActivityAt,
    title: normalizeTerminalTitle(
      input.liveTitle ?? input.lastKnownPersistedTitle ?? currentState.title,
    ),
  };
}
