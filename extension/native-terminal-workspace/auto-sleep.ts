import {
  getSidebarSessionLifecycleState,
  type SidebarSessionItem,
} from "../../shared/session-grid-contract";

const MIN_AUTO_SLEEP_CHECK_INTERVAL_MS = 5_000;
const MAX_AUTO_SLEEP_CHECK_INTERVAL_MS = 30_000;
export const AUTO_SLEEP_FOCUS_GRACE_MS = 10 * 60_000;

export function shouldAutoSleepSidebarSession(
  session: Pick<
    SidebarSessionItem,
    | "activity"
    | "agentIcon"
    | "isFocused"
    | "isRunning"
    | "isSleeping"
    | "isVisible"
    | "lifecycleState"
  >,
): boolean {
  if (session.isSleeping === true || session.isFocused === true || session.isVisible === true) {
    return false;
  }

  return (
    (session.agentIcon === "claude" ||
      session.agentIcon === "codex" ||
      session.agentIcon === "t3") &&
    session.activity === "idle" &&
    getSidebarSessionLifecycleState(session) === "running"
  );
}

export function hasReachedAutoSleepTimeout(args: {
  activityAt: string | undefined;
  now?: number;
  timeoutMs: number | null;
}): boolean {
  const { activityAt, now = Date.now(), timeoutMs } = args;
  if (timeoutMs === null || timeoutMs <= 0 || !activityAt) {
    return false;
  }

  const activityAtMs = Date.parse(activityAt);
  if (!Number.isFinite(activityAtMs)) {
    return false;
  }

  return Math.max(0, now - activityAtMs) >= timeoutMs;
}

export function hasAutoSleepFocusGrace(args: {
  focusedAt: number | undefined;
  now?: number;
  graceMs?: number;
}): boolean {
  const { focusedAt, now = Date.now(), graceMs = AUTO_SLEEP_FOCUS_GRACE_MS } = args;
  if (
    focusedAt === undefined ||
    !Number.isFinite(focusedAt) ||
    !Number.isFinite(graceMs) ||
    graceMs <= 0
  ) {
    return false;
  }

  return now < focusedAt + graceMs;
}

export function getAutoSleepCheckIntervalMs(timeoutMs: number | null): number | undefined {
  if (timeoutMs === null || timeoutMs <= 0) {
    return undefined;
  }

  return Math.max(
    MIN_AUTO_SLEEP_CHECK_INTERVAL_MS,
    Math.min(MAX_AUTO_SLEEP_CHECK_INTERVAL_MS, Math.floor(timeoutMs / 3)),
  );
}
