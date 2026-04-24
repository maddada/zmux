export type TerminalPaneBounds = {
  height: number;
  width: number;
};

export type TerminalResizeStabilityState = {
  lastAcceptedBounds?: TerminalPaneBounds;
  pendingCollapsedBounds?: TerminalPaneBounds;
  pendingCollapsedFirstSeenAt?: number;
  pendingCollapsedObservationCount: number;
};

export type TerminalResizeStabilityDecision =
  | {
      accept: true;
    }
  | {
      accept: false;
      retryAfterMs: number;
      reason: "transient-collapsed-bounds";
    };

const COLLAPSED_BOUNDS_RATIO = 0.65;
const COLLAPSED_BOUNDS_SETTLE_MS = 160;
const COLLAPSED_BOUNDS_REQUIRED_OBSERVATIONS = 2;
const FULL_PANE_MIN_HEIGHT_PX = 240;
const FULL_PANE_MIN_WIDTH_PX = 320;
const SIMILAR_BOUNDS_TOLERANCE_PX = 8;

function areSimilarBounds(a: TerminalPaneBounds, b: TerminalPaneBounds): boolean {
  return (
    Math.abs(a.width - b.width) <= SIMILAR_BOUNDS_TOLERANCE_PX &&
    Math.abs(a.height - b.height) <= SIMILAR_BOUNDS_TOLERANCE_PX
  );
}

function isImplausibleCollapse(
  previousBounds: TerminalPaneBounds,
  nextBounds: TerminalPaneBounds,
): boolean {
  if (
    previousBounds.width < FULL_PANE_MIN_WIDTH_PX ||
    previousBounds.height < FULL_PANE_MIN_HEIGHT_PX
  ) {
    return false;
  }

  return (
    nextBounds.width < previousBounds.width * COLLAPSED_BOUNDS_RATIO ||
    nextBounds.height < previousBounds.height * COLLAPSED_BOUNDS_RATIO
  );
}

export function createTerminalResizeStabilityState(): TerminalResizeStabilityState {
  return {
    pendingCollapsedObservationCount: 0,
  };
}

export function evaluateTerminalResizeBounds(
  state: TerminalResizeStabilityState,
  nextBounds: TerminalPaneBounds,
  now: number,
): TerminalResizeStabilityDecision {
  const previousAcceptedBounds = state.lastAcceptedBounds;
  if (!previousAcceptedBounds || !isImplausibleCollapse(previousAcceptedBounds, nextBounds)) {
    state.lastAcceptedBounds = nextBounds;
    state.pendingCollapsedBounds = undefined;
    state.pendingCollapsedFirstSeenAt = undefined;
    state.pendingCollapsedObservationCount = 0;
    return { accept: true };
  }

  if (
    !state.pendingCollapsedBounds ||
    !areSimilarBounds(state.pendingCollapsedBounds, nextBounds)
  ) {
    state.pendingCollapsedBounds = nextBounds;
    state.pendingCollapsedFirstSeenAt = now;
    state.pendingCollapsedObservationCount = 1;
  } else {
    state.pendingCollapsedObservationCount += 1;
  }

  const firstSeenAt = state.pendingCollapsedFirstSeenAt ?? now;
  const elapsedMs = now - firstSeenAt;
  if (
    state.pendingCollapsedObservationCount >= COLLAPSED_BOUNDS_REQUIRED_OBSERVATIONS &&
    elapsedMs >= COLLAPSED_BOUNDS_SETTLE_MS
  ) {
    state.lastAcceptedBounds = nextBounds;
    state.pendingCollapsedBounds = undefined;
    state.pendingCollapsedFirstSeenAt = undefined;
    state.pendingCollapsedObservationCount = 0;
    return { accept: true };
  }

  return {
    accept: false,
    reason: "transient-collapsed-bounds",
    retryAfterMs: Math.max(0, COLLAPSED_BOUNDS_SETTLE_MS - elapsedMs),
  };
}

export function resetTerminalResizeStabilityState(state: TerminalResizeStabilityState): void {
  state.lastAcceptedBounds = undefined;
  state.pendingCollapsedBounds = undefined;
  state.pendingCollapsedFirstSeenAt = undefined;
  state.pendingCollapsedObservationCount = 0;
}
