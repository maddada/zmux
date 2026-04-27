export const T3_THREAD_CHANGE_DEBOUNCE_MS = 750;
export const T3_THREAD_CHANGE_DEDUPE_MS = 15_000;
export const T3_THREAD_CHANGE_STARTUP_SUPPRESSION_MS = 2_000;
export const T3_THREAD_INITIAL_BOUND_THREAD_CONFIRMATION_MS = 10_000;

export type T3ThreadChangeGuardInput = {
  currentThreadId: string;
  dedupeMs?: number;
  debounceMs?: number;
  isClosing: boolean;
  isFocused: boolean;
  isInFlight: boolean;
  isVisible: boolean;
  lastAcceptedAt?: number;
  lastAcceptedThreadId?: string;
  nextThreadId: string;
  now: number;
  requiresInitialBoundThreadConfirmation?: boolean;
  sessionCreatedAt?: number;
  startupSuppressionMs?: number;
};

export type T3ThreadChangeGuardResult =
  | {
      allow: true;
      nextThreadId: string;
      reason: "allowed";
    }
  | {
      allow: false;
      nextThreadId: string;
      reason:
        | "awaitingInitialBoundThreadConfirmation"
        | "debouncedThreadChange"
        | "duplicateThreadChange"
        | "emptyThreadId"
        | "sessionClosing"
        | "sessionBootstrapping"
        | "sessionHidden"
        | "sessionNotFocused"
        | "threadChangeInFlight"
        | "unchangedThread";
    };

export function evaluateT3ThreadChangeGuard(
  input: T3ThreadChangeGuardInput,
): T3ThreadChangeGuardResult {
  const nextThreadId = input.nextThreadId.trim();
  if (!nextThreadId) {
    return {
      allow: false,
      nextThreadId,
      reason: "emptyThreadId",
    };
  }

  if (input.isClosing) {
    return {
      allow: false,
      nextThreadId,
      reason: "sessionClosing",
    };
  }

  if (nextThreadId === input.currentThreadId.trim()) {
    return {
      allow: false,
      nextThreadId,
      reason: "unchangedThread",
    };
  }

  if (!input.isVisible) {
    return {
      allow: false,
      nextThreadId,
      reason: "sessionHidden",
    };
  }

  if (!input.isFocused) {
    return {
      allow: false,
      nextThreadId,
      reason: "sessionNotFocused",
    };
  }

  if (input.isInFlight) {
    return {
      allow: false,
      nextThreadId,
      reason: "threadChangeInFlight",
    };
  }

  if (input.requiresInitialBoundThreadConfirmation) {
    return {
      allow: false,
      nextThreadId,
      reason: "awaitingInitialBoundThreadConfirmation",
    };
  }

  const startupSuppressionMs =
    input.startupSuppressionMs ?? T3_THREAD_CHANGE_STARTUP_SUPPRESSION_MS;
  const sessionAgeMs =
    input.sessionCreatedAt === undefined
      ? Number.POSITIVE_INFINITY
      : input.now - input.sessionCreatedAt;
  if (Number.isFinite(sessionAgeMs) && sessionAgeMs < startupSuppressionMs) {
    return {
      allow: false,
      nextThreadId,
      reason: "sessionBootstrapping",
    };
  }

  const dedupeMs = input.dedupeMs ?? T3_THREAD_CHANGE_DEDUPE_MS;
  const debounceMs = input.debounceMs ?? T3_THREAD_CHANGE_DEBOUNCE_MS;
  const timeSinceLastAccepted =
    input.lastAcceptedAt === undefined
      ? Number.POSITIVE_INFINITY
      : input.now - input.lastAcceptedAt;

  if (
    input.lastAcceptedThreadId === nextThreadId &&
    Number.isFinite(timeSinceLastAccepted) &&
    timeSinceLastAccepted < dedupeMs
  ) {
    return {
      allow: false,
      nextThreadId,
      reason: "duplicateThreadChange",
    };
  }

  if (Number.isFinite(timeSinceLastAccepted) && timeSinceLastAccepted < debounceMs) {
    return {
      allow: false,
      nextThreadId,
      reason: "debouncedThreadChange",
    };
  }

  return {
    allow: true,
    nextThreadId,
    reason: "allowed",
  };
}
