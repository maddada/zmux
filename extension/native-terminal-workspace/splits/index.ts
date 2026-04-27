import type {
  SessionGridSnapshot,
  VisibleSessionCount,
} from "../../../shared/session-grid-contract";
import { createSplitOneProjection } from "./split-1";
import { createSplitTwoProjection } from "./split-2";
import { createSplitThreeProjection } from "./split-3";
import { createSplitFourProjection } from "./split-4";
import { createSplitSixProjection } from "./split-6";
import { createSplitNineProjection } from "./split-9";
import type { SessionSplitProjection, SessionSplitStrategy } from "./types";

const STRATEGY_BY_COUNT: Record<VisibleSessionCount, SessionSplitStrategy> = {
  1: createSplitOneProjection,
  2: createSplitTwoProjection,
  3: createSplitThreeProjection,
  4: createSplitFourProjection,
  6: createSplitSixProjection,
  9: createSplitNineProjection,
};

export function createSessionSplitProjection(
  snapshot: SessionGridSnapshot,
): SessionSplitProjection {
  return STRATEGY_BY_COUNT[snapshot.visibleCount](snapshot);
}

export type { SessionSplitProjection } from "./types";
