import type { SessionGridSnapshot } from "../../../shared/session-grid-contract";
import type { SessionSplitProjection, SessionSplitStrategy } from "./types";

export const createSplitTwoProjection: SessionSplitStrategy = (
  snapshot: SessionGridSnapshot,
): SessionSplitProjection => {
  const slotSessionIds = snapshot.visibleSessionIds.slice(0, 2);
  const hasTwoVisibleSessions = slotSessionIds.length === 2;

  return {
    focusedSessionId: snapshot.focusedSessionId,
    layout: hasTwoVisibleSessions
      ? {
          groups: [{}, {}],
          orientation: 0,
        }
      : {
          groups: [{}],
          orientation: 0,
        },
    slotSessionIds,
    splitCount: 2,
  };
};
