import { describe, expect, test } from "vite-plus/test";
import {
  createSessionRecord,
  type SessionGridSnapshot,
  type TerminalViewMode,
} from "./session-grid-contract";
import { createParkedTerminalReconcilePlan } from "./session-grid-parked-terminal-plan";

describe("createParkedTerminalReconcilePlan", () => {
  test("should promote the incoming hidden session before demoting the outgoing visible session", () => {
    const currentSnapshot = createSnapshot([1, 2, 3], ["session-1", "session-2"], "vertical");
    const nextSnapshot = createSnapshot([1, 2, 3], ["session-1", "session-3"], "vertical");
    const plan = createParkedTerminalReconcilePlan(currentSnapshot, nextSnapshot);

    expect(plan.strategy).toBe("transfer");
    if (plan.strategy !== "transfer") {
      throw new Error("Expected transfer plan");
    }

    expect(plan.promoteSteps).toEqual([{ sessionId: "session-3", slotIndex: 1, type: "promote" }]);
    expect(plan.demoteSteps).toEqual([{ sessionId: "session-2", slotIndex: 1, type: "demote" }]);
    expect(plan.steps).toEqual([
      { sessionId: "session-3", slotIndex: 1, type: "promote" },
      { sessionId: "session-2", slotIndex: 1, type: "demote" },
    ]);
    expect(plan.unchangedSlots).toEqual([{ sessionId: "session-1", slotIndex: 0 }]);
    expect(applyTransferSteps(currentSnapshot.visibleSessionIds, plan.steps)).toEqual(
      nextSnapshot.visibleSessionIds,
    );
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

  test("should resolve backfill by using panel transit steps instead of rebuilding", () => {
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

    expect(plan.strategy).toBe("transfer");
    if (plan.strategy !== "transfer") {
      throw new Error("Expected transfer plan");
    }

    expect(plan.steps).toEqual([
      { sessionId: "session-4", slotIndex: 2, type: "promote" },
      { sessionId: "session-3", slotIndex: 2, type: "demote" },
      { sessionId: "session-3", slotIndex: 1, type: "promote" },
      { sessionId: "session-2", slotIndex: 1, type: "demote" },
    ]);
    expect(applyTransferSteps(currentSnapshot.visibleSessionIds, plan.steps)).toEqual(
      nextSnapshot.visibleSessionIds,
    );
  });

  test("should resolve visible-session reorder cycles with the minimum panel break sequence", () => {
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

    expect(plan.strategy).toBe("transfer");
    if (plan.strategy !== "transfer") {
      throw new Error("Expected transfer plan");
    }

    expect(plan.steps).toEqual([
      { sessionId: "session-3", slotIndex: 2, type: "demote" },
      { sessionId: "session-3", slotIndex: 1, type: "promote" },
      { sessionId: "session-2", slotIndex: 1, type: "demote" },
      { sessionId: "session-2", slotIndex: 2, type: "promote" },
    ]);
    expect(applyTransferSteps(currentSnapshot.visibleSessionIds, plan.steps)).toEqual(
      nextSnapshot.visibleSessionIds,
    );
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

function applyTransferSteps(
  currentVisibleSessionIds: readonly string[],
  steps: ReadonlyArray<{ sessionId: string; slotIndex: number; type: "promote" | "demote" }>,
): Array<string | undefined> {
  const currentSlots = currentVisibleSessionIds.map((sessionId) => [sessionId]);
  const panelSessionIds = new Set<string>();

  for (const step of steps) {
    if (step.type === "demote") {
      expect(currentSlots[step.slotIndex]?.includes(step.sessionId)).toBe(true);
      currentSlots[step.slotIndex] = currentSlots[step.slotIndex]?.filter(
        (sessionId) => sessionId !== step.sessionId,
      );
      panelSessionIds.add(step.sessionId);
      continue;
    }

    expect(
      panelSessionIds.has(step.sessionId) || !currentVisibleSessionIds.includes(step.sessionId),
    ).toBe(true);
    currentSlots[step.slotIndex] = [...(currentSlots[step.slotIndex] ?? []), step.sessionId];
    panelSessionIds.delete(step.sessionId);
  }

  return currentSlots.map((slotSessions) => slotSessions?.at(-1));
}
