import { createEditorLayoutPlan } from "../../../shared/editor-layout";
import type { SessionGridSnapshot } from "../../../shared/session-grid-contract";
import type { SessionSplitProjection, SessionSplitStrategy } from "./types";

export const createSplitThreeProjection: SessionSplitStrategy = (
  snapshot: SessionGridSnapshot,
): SessionSplitProjection => {
  const slotSessionIds = snapshot.visibleSessionIds.slice(0, 3);

  return {
    focusedSessionId: snapshot.focusedSessionId,
    layout: createEditorLayoutPlan(slotSessionIds.length, snapshot.viewMode).layout,
    slotSessionIds,
    splitCount: 3,
  };
};
