import type { SessionLifecycleState } from "../../shared/session-grid-contract";
import type { TerminalSessionStatus } from "../../shared/terminal-host-protocol";

export function resolveTerminalSessionLifecycleState({
  hasLiveRuntime,
  isSleeping,
  status,
}: {
  hasLiveRuntime: boolean;
  isSleeping: boolean;
  status: TerminalSessionStatus;
}): SessionLifecycleState {
  if (isSleeping) {
    return "sleeping";
  }

  if (status === "error") {
    return "error";
  }

  if (status === "running" && hasLiveRuntime) {
    return "running";
  }

  return "done";
}

export function resolveT3SessionLifecycleState({
  isRunning,
  isSleeping,
}: {
  isRunning: boolean;
  isSleeping: boolean;
}): SessionLifecycleState {
  if (isSleeping) {
    return "sleeping";
  }

  if (!isRunning) {
    return "error";
  }

  return "running";
}

export function isRunningSessionLifecycleState(
  lifecycleState: SessionLifecycleState | undefined,
): boolean {
  return lifecycleState === "running";
}
