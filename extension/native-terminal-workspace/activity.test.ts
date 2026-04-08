import { describe, expect, test, vi } from "vite-plus/test";
import { createSessionRecord } from "../../shared/session-grid-contract";
import type { TerminalSessionSnapshot } from "../../shared/terminal-host-protocol";

vi.mock("../terminal-workspace-helpers", () => ({
  createDisconnectedSessionSnapshot: (sessionId: string, workspaceId: string) => ({
    agentStatus: "idle",
    cols: 80,
    cwd: "/tmp",
    isAttached: false,
    restoreState: "replayed",
    rows: 24,
    sessionId,
    shell: "/bin/zsh",
    startedAt: "2026-01-01T00:00:00.000Z",
    status: "disconnected",
    workspaceId,
  }),
}));

import {
  INITIAL_ACTIVITY_SUPPRESSION_MS,
  MIN_WORKING_DURATION_BEFORE_ATTENTION_MS,
  getEffectiveSessionActivity,
  shouldRefreshLastActivityOnTransition,
  syncKnownSessionActivities,
} from "./activity";

function createSnapshot(
  sessionId: string,
  agentStatus: TerminalSessionSnapshot["agentStatus"],
): TerminalSessionSnapshot {
  return {
    agentStatus,
    cols: 80,
    cwd: "/tmp",
    isAttached: true,
    restoreState: "live",
    rows: 24,
    sessionId,
    shell: "/bin/zsh",
    startedAt: "2026-01-01T00:00:00.000Z",
    status: "running",
    workspaceId: "workspace-1",
  };
}

describe("syncKnownSessionActivities", () => {
  test("should queue a completion sound only when a session first turns attention", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const session = createSessionRecord(1, 0);
    const snapshots = new Map<string, TerminalSessionSnapshot>([
      [session.sessionId, createSnapshot(session.sessionId, "idle")],
    ]);
    const lastKnownActivityBySessionId = new Map<string, TerminalSessionSnapshot["agentStatus"]>();
    const workingStartedAtBySessionId = new Map<string, number>();
    const queueCompletionSound = vi.fn();
    const cancelPendingCompletionSound = vi.fn();
    const context = {
      cancelPendingCompletionSound,
      getSessionSnapshot: (sessionId: string) => snapshots.get(sessionId),
      getT3ActivityState: () => ({ activity: "idle" as const, isRunning: false }),
      lastKnownActivityBySessionId,
      queueCompletionSound,
      workingStartedAtBySessionId,
      workspaceId: "workspace-1",
    };

    await syncKnownSessionActivities(context, [session], true);
    expect(queueCompletionSound).not.toHaveBeenCalled();

    snapshots.set(session.sessionId, createSnapshot(session.sessionId, "working"));
    await syncKnownSessionActivities(context, [session], true);
    expect(queueCompletionSound).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MIN_WORKING_DURATION_BEFORE_ATTENTION_MS);
    snapshots.set(session.sessionId, createSnapshot(session.sessionId, "attention"));
    await syncKnownSessionActivities(context, [session], true);
    expect(queueCompletionSound).toHaveBeenCalledTimes(1);
    expect(queueCompletionSound).toHaveBeenCalledWith(session.sessionId);

    await syncKnownSessionActivities(context, [session], true);
    expect(queueCompletionSound).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  test("should cancel a pending completion sound when attention clears before confirmation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const session = createSessionRecord(1, 0);
    const snapshots = new Map<string, TerminalSessionSnapshot>([
      [session.sessionId, createSnapshot(session.sessionId, "working")],
    ]);
    const lastKnownActivityBySessionId = new Map<string, TerminalSessionSnapshot["agentStatus"]>([
      [session.sessionId, "working"],
    ]);
    const workingStartedAtBySessionId = new Map<string, number>([[session.sessionId, Date.now()]]);
    const queueCompletionSound = vi.fn();
    const cancelPendingCompletionSound = vi.fn();
    const context = {
      cancelPendingCompletionSound,
      getSessionSnapshot: (sessionId: string) => snapshots.get(sessionId),
      getT3ActivityState: () => ({ activity: "idle" as const, isRunning: false }),
      lastKnownActivityBySessionId,
      queueCompletionSound,
      workingStartedAtBySessionId,
      workspaceId: "workspace-1",
    };

    vi.advanceTimersByTime(MIN_WORKING_DURATION_BEFORE_ATTENTION_MS);
    snapshots.set(session.sessionId, createSnapshot(session.sessionId, "attention"));
    await syncKnownSessionActivities(context, [session], true);
    expect(queueCompletionSound).toHaveBeenCalledWith(session.sessionId);

    snapshots.set(session.sessionId, createSnapshot(session.sessionId, "working"));
    await syncKnownSessionActivities(context, [session], true);
    expect(cancelPendingCompletionSound).toHaveBeenCalledWith(session.sessionId);

    vi.useRealTimers();
  });

  test("should suppress attention and completion sound if working lasted under two seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const session = createSessionRecord(1, 0);
    const snapshots = new Map<string, TerminalSessionSnapshot>([
      [session.sessionId, createSnapshot(session.sessionId, "working")],
    ]);
    const lastKnownActivityBySessionId = new Map<string, TerminalSessionSnapshot["agentStatus"]>();
    const workingStartedAtBySessionId = new Map<string, number>();
    const queueCompletionSound = vi.fn();
    const cancelPendingCompletionSound = vi.fn();
    const context = {
      cancelPendingCompletionSound,
      getSessionSnapshot: (sessionId: string) => snapshots.get(sessionId),
      getT3ActivityState: () => ({ activity: "idle" as const, isRunning: false }),
      lastKnownActivityBySessionId,
      queueCompletionSound,
      workingStartedAtBySessionId,
      workspaceId: "workspace-1",
    };

    await syncKnownSessionActivities(context, [session], true);
    vi.advanceTimersByTime(MIN_WORKING_DURATION_BEFORE_ATTENTION_MS - 1);
    snapshots.set(session.sessionId, createSnapshot(session.sessionId, "attention"));

    await syncKnownSessionActivities(context, [session], true);

    expect(queueCompletionSound).not.toHaveBeenCalled();
    expect(lastKnownActivityBySessionId.get(session.sessionId)).toBe("idle");
    vi.useRealTimers();
  });

  test("should record last-activity transitions when a session starts and finishes working", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const session = createSessionRecord(1, 0);
    const snapshots = new Map<string, TerminalSessionSnapshot>([
      [session.sessionId, createSnapshot(session.sessionId, "idle")],
    ]);
    const recordLastActivityTransition = vi.fn();
    const context = {
      cancelPendingCompletionSound: vi.fn(),
      getSessionSnapshot: (sessionId: string) => snapshots.get(sessionId),
      getT3ActivityState: () => ({ activity: "idle" as const, isRunning: false }),
      lastKnownActivityBySessionId: new Map<string, TerminalSessionSnapshot["agentStatus"]>(),
      queueCompletionSound: vi.fn(),
      recordLastActivityTransition,
      workingStartedAtBySessionId: new Map<string, number>(),
      workspaceId: "workspace-1",
    };

    await syncKnownSessionActivities(context, [session], false);
    expect(recordLastActivityTransition).not.toHaveBeenCalled();

    snapshots.set(session.sessionId, createSnapshot(session.sessionId, "working"));
    await syncKnownSessionActivities(context, [session], false);

    vi.advanceTimersByTime(MIN_WORKING_DURATION_BEFORE_ATTENTION_MS);
    snapshots.set(session.sessionId, createSnapshot(session.sessionId, "attention"));
    await syncKnownSessionActivities(context, [session], false);

    expect(recordLastActivityTransition).toHaveBeenCalledTimes(2);
    expect(recordLastActivityTransition).toHaveBeenNthCalledWith(
      1,
      session.sessionId,
      "idle",
      "working",
    );
    expect(recordLastActivityTransition).toHaveBeenNthCalledWith(
      2,
      session.sessionId,
      "working",
      "attention",
    );
    vi.useRealTimers();
  });
});

describe("getEffectiveSessionActivity", () => {
  test("should suppress working indicators during the initial timeout for non-t3 sessions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const session = createSessionRecord(1, 0);

    const activity = getEffectiveSessionActivity(
      {
        cancelPendingCompletionSound: vi.fn(),
        getActivitySuppressedUntil: () => Date.now() + INITIAL_ACTIVITY_SUPPRESSION_MS,
        getSessionSnapshot: () => createSnapshot(session.sessionId, "working"),
        getT3ActivityState: () => ({ activity: "idle" as const, isRunning: false }),
        lastKnownActivityBySessionId: new Map<string, TerminalSessionSnapshot["agentStatus"]>(),
        queueCompletionSound: vi.fn(),
        workingStartedAtBySessionId: new Map<string, number>(),
        workspaceId: "workspace-1",
      },
      session,
      createSnapshot(session.sessionId, "working"),
    );

    expect(activity.activity).toBe("idle");
    vi.useRealTimers();
  });

  test("should keep t3 activity behavior unchanged when suppression is configured", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const session = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        serverOrigin: "http://127.0.0.1:3774",
        sessionId: "thread-session",
        threadId: "thread-1",
      },
      title: "T3 Code",
    });

    const activity = getEffectiveSessionActivity(
      {
        cancelPendingCompletionSound: vi.fn(),
        getActivitySuppressedUntil: () => Date.now() + INITIAL_ACTIVITY_SUPPRESSION_MS,
        getSessionSnapshot: () => createSnapshot(session.sessionId, "working"),
        getT3ActivityState: () => ({ activity: "working" as const, isRunning: true }),
        lastKnownActivityBySessionId: new Map<string, TerminalSessionSnapshot["agentStatus"]>(),
        queueCompletionSound: vi.fn(),
        workingStartedAtBySessionId: new Map<string, number>(),
        workspaceId: "workspace-1",
      },
      session,
      createSnapshot(session.sessionId, "working"),
    );

    expect(activity.activity).toBe("working");
    vi.useRealTimers();
  });
});

describe("shouldRefreshLastActivityOnTransition", () => {
  test("should return true when a session starts or finishes working", () => {
    expect(shouldRefreshLastActivityOnTransition("idle", "working")).toBe(true);
    expect(shouldRefreshLastActivityOnTransition("working", "idle")).toBe(true);
    expect(shouldRefreshLastActivityOnTransition("working", "attention")).toBe(true);
  });

  test("should return false for non-working transitions", () => {
    expect(shouldRefreshLastActivityOnTransition(undefined, "idle")).toBe(false);
    expect(shouldRefreshLastActivityOnTransition("idle", "attention")).toBe(false);
    expect(shouldRefreshLastActivityOnTransition("attention", "idle")).toBe(false);
    expect(shouldRefreshLastActivityOnTransition("working", "working")).toBe(false);
  });
});
