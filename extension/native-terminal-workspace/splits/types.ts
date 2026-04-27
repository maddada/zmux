import type { EditorLayout } from "../../../shared/editor-layout";
import type {
  SessionGridSnapshot,
  VisibleSessionCount,
} from "../../../shared/session-grid-contract";

export type SessionSplitProjection = {
  focusedSessionId?: string;
  layout: EditorLayout;
  slotSessionIds: string[];
  splitCount: VisibleSessionCount;
};

export type SessionSplitStrategy = (snapshot: SessionGridSnapshot) => SessionSplitProjection;
