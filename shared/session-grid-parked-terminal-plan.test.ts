import { describe, expect, test } from "vite-plus/test";
import {
  createSessionRecord,
  type SessionGridSnapshot,
  type TerminalViewMode,
} from "./session-grid-contract";
import { createParkedTerminalReconcilePlan } from "./session-grid-parked-terminal-plan";

describe("createParkedTerminalReconcilePlan", () => {
  test("should rebuild hidden-session replacement plans that would promote into an occupied slot", () => {
    const currentSnapshot = createSnapshot([1, 2], ["session-1"], "grid");
    const nextSnapshot = createSnapshot([1, 2], ["session-2"], "grid");
    const plan = createParkedTerminalReconcilePlan(currentSnapshot, nextSnapshot);

    expect(plan).toEqual({
      currentVisibleSessionIds: ["session-1"],
      nextVisibleSessionIds: ["session-2"],
      reason: "unsupported-transfer",
      strategy: "rebuild",
    });
  });

  test("should return a transfer no-op when the visible sessions already match", () => {
    const snapshot = createSnapshot([1, 2], ["session-1", "session-2"], "grid");
    const plan = createParkedTerminalReconcilePlan(snapshot, snapshot);

    expect(plan.strategy).toBe("transfer");
    if (plan.strategy !== "transfer") {
      throw new Error("Expected transfer plan");
    }

    expect(plan.hasChanges).toBe(false);
    expect(plan.promoteSteps).toEqual([]);
    expect(plan.demoteSteps).toEqual([]);
    expect(plan.steps).toEqual([]);
  });

  test("should rebuild when there is no current visible layout", () => {
    const nextSnapshot = createSnapshot([1, 2], ["session-1", "session-2"], "horizontal");
    const plan = createParkedTerminalReconcilePlan(undefined, nextSnapshot);

    expect(plan).toEqual({
      currentVisibleSessionIds: [],
      nextVisibleSessionIds: ["session-1", "session-2"],
      reason: "missing-current-layout",
      strategy: "rebuild",
    });
  });

  test("should rebuild when the requested layout shape changes", () => {
    const currentSnapshot = createSnapshot([1, 2], ["session-1", "session-2"], "vertical");
    const nextSnapshot = createSnapshot(
      [1, 2, 3, 4],
      ["session-1", "session-2", "session-3", "session-4"],
      "grid",
    );
    const plan = createParkedTerminalReconcilePlan(currentSnapshot, nextSnapshot);

    expect(plan).toEqual({
      currentVisibleSessionIds: ["session-1", "session-2"],
      nextVisibleSessionIds: ["session-1", "session-2", "session-3", "session-4"],
      reason: "layout-shape-changed",
      strategy: "rebuild",
    });
  });

  test("should rebuild backfill plans that require replacing occupied visible slots", () => {
    const currentSnapshot = createSnapshot(
      [1, 2, 3, 4],
      ["session-1", "session-2", "session-3"],
      "horizontal",
    );
    const nextSnapshot = createSnapshot(
      [1, 3, 4],
      ["session-1", "session-3", "session-4"],
      "horizontal",
    );
    const plan = createParkedTerminalReconcilePlan(currentSnapshot, nextSnapshot);

    expect(plan).toEqual({
      currentVisibleSessionIds: ["session-1", "session-2", "session-3"],
      nextVisibleSessionIds: ["session-1", "session-3", "session-4"],
      reason: "unsupported-transfer",
      strategy: "rebuild",
    });
  });

  test("should rebuild visible-session reorder plans that would need in-place slot replacement", () => {
    const currentSnapshot = createSnapshot(
      [1, 2, 3, 4],
      ["session-1", "session-2", "session-3", "session-4"],
      "grid",
    );
    const nextSnapshot = createSnapshot(
      [1, 3, 2, 4],
      ["session-1", "session-3", "session-2", "session-4"],
      "grid",
    );
    const plan = createParkedTerminalReconcilePlan(currentSnapshot, nextSnapshot);

    expect(plan).toEqual({
      currentVisibleSessionIds: ["session-1", "session-2", "session-3", "session-4"],
      nextVisibleSessionIds: ["session-1", "session-3", "session-2", "session-4"],
      reason: "unsupported-transfer",
      strategy: "rebuild",
    });
  });
});

function createSnapshot(
  orderedSessionNumbers: readonly number[],
  visibleSessionIds: readonly string[],
  viewMode: TerminalViewMode,
): SessionGridSnapshot {
  return {
    focusedSessionId: visibleSessionIds.at(-1),
    fullscreenRestoreVisibleCount: undefined,
    sessions: orderedSessionNumbers.map((sessionNumber, slotIndex) =>
      createSessionRecord(sessionNumber, slotIndex),
    ),
    viewMode,
    visibleCount: visibleSessionIds.length === 0 ? 1 : visibleSessionIds.length,
    visibleSessionIds: [...visibleSessionIds],
  };
}
