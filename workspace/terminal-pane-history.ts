import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";

export type TerminalHistoryReplay = {
  didApplyHistory: boolean;
  history?: string;
};

export function getTerminalHistoryReplay(
  session: TerminalSessionSnapshot,
  didApplyHistory: boolean,
): TerminalHistoryReplay {
  if (didApplyHistory) {
    return { didApplyHistory: true };
  }

  if (!Object.prototype.hasOwnProperty.call(session, "history")) {
    return { didApplyHistory: false };
  }

  return {
    didApplyHistory: true,
    history: session.history,
  };
}
