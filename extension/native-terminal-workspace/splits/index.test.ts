import { describe, expect, test } from "vite-plus/test";
import { createSessionRecord } from "../../../shared/session-grid-contract";
import { createSessionSplitProjection } from "./index";

describe("createSessionSplitProjection", () => {
  test("should keep split-2 in a single column while only one session is visible", () => {
    const projection = createSessionSplitProjection({
      focusedSessionId: "session-1",
      sessions: [createSessionRecord(1, 0)],
      viewMode: "grid",
      visibleCount: 2,
      visibleSessionIds: ["session-1"],
    });

    expect(projection.splitCount).toBe(2);
    expect(projection.slotSessionIds).toEqual(["session-1"]);
    expect(projection.layout).toEqual({
      groups: [{}],
      orientation: 0,
    });
  });

  test("should create a two-column layout for two visible sessions in split-2", () => {
    const projection = createSessionSplitProjection({
      focusedSessionId: "session-2",
      sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1)],
      viewMode: "grid",
      visibleCount: 2,
      visibleSessionIds: ["session-1", "session-2"],
    });

    expect(projection.slotSessionIds).toEqual(["session-1", "session-2"]);
    expect(projection.layout).toEqual({
      groups: [{}, {}],
      orientation: 0,
    });
  });

  test("should keep higher split counts in separate modules", () => {
    const projection = createSessionSplitProjection({
      focusedSessionId: "session-3",
      sessions: [createSessionRecord(1, 0), createSessionRecord(2, 1), createSessionRecord(3, 2)],
      viewMode: "grid",
      visibleCount: 3,
      visibleSessionIds: ["session-1", "session-2", "session-3"],
    });

    expect(projection.splitCount).toBe(3);
    expect(projection.slotSessionIds).toEqual(["session-1", "session-2", "session-3"]);
    expect(projection.layout).toEqual({
      groups: [
        { groups: [{}, {}], orientation: 0 },
        { groups: [{}], orientation: 0 },
      ],
      orientation: 1,
    });
  });
});
