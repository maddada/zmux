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

export function resolvePersistedSessionPresentationState(
  currentState: PersistedSessionState,
  input: TerminalSessionPresentationStateInput,
): PersistedSessionState {
  return {
    agentName: input.titleActivityAgentName ?? input.snapshotAgentName ?? currentState.agentName,
    agentStatus: input.titleActivityStatus ?? input.snapshotAgentStatus ?? currentState.agentStatus,
    title: normalizeTerminalTitle(
      input.liveTitle ?? input.lastKnownPersistedTitle ?? currentState.title,
    ),
  };
}
