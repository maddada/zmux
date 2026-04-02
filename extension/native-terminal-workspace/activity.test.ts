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

import { syncKnownSessionActivities } from "./activity";
import { MIN_WORKING_DURATION_BEFORE_ATTENTION_MS } from "./activity";

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
});
