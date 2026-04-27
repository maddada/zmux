import type { SessionGridSnapshot } from "../../../shared/session-grid-contract";
import type { SessionSplitProjection, SessionSplitStrategy } from "./types";

export const createSplitOneProjection: SessionSplitStrategy = (
  snapshot: SessionGridSnapshot,
): SessionSplitProjection => {
  const slotSessionIds = snapshot.visibleSessionIds.slice(0, 1);

  return {
    focusedSessionId: snapshot.focusedSessionId,
    layout: {
      groups: [{}],
      orientation: 0,
    },
    slotSessionIds,
    splitCount: 1,
  };
};
