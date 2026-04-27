import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("vscode", () => ({
  EventEmitter: class MockEventEmitter<T> {
    private readonly listeners = new Set<(value: T) => void>();

    public readonly event = (listener: (value: T) => void) => {
      this.listeners.add(listener);
      return {
        dispose: () => {
          this.listeners.delete(listener);
        },
      };
    };

    public dispose(): void {
      this.listeners.clear();
    }

    public fire(value: T): void {
      for (const listener of this.listeners) {
        listener(value);
      }
    }
  },
  workspace: {
    getConfiguration: () => ({
      get: () => false,
    }),
  },
}));

import { T3ActivityMonitor } from "./t3-activity-monitor";
import { resolveThreadActivity } from "./t3-activity-state";

describe("resolveThreadActivity", () => {
  test("should keep threads without a live session object marked as running", () => {
    expect(
      resolveThreadActivity({
        id: "thread-1",
      }),
    ).toEqual({
      activity: "idle",
      completionMarker: undefined,
      isRunning: true,
    });
  });

  test("should not raise attention from the first completed snapshot after reload", () => {
    expect(
      resolveThreadActivity({
        id: "thread-1",
        latestTurn: {
          completedAt: "2026-03-22T10:00:00.000Z",
          state: "completed",
          turnId: "turn-1",
        },
        session: {
          status: "ready",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      }),
    ).toEqual({
      activity: "idle",
      completionMarker: "turn:turn-1:completed:2026-03-22T10:00:00.000Z",
      isRunning: true,
      lastInteractionAt: "2026-03-22T10:00:00.000Z",
    });
  });

  test("should raise attention when a new completion follows a previously observed working state", () => {
    expect(
      resolveThreadActivity(
        {
          id: "thread-1",
          latestTurn: {
            completedAt: "2026-03-22T10:00:00.000Z",
            state: "completed",
            turnId: "turn-1",
          },
          session: {
            status: "ready",
            updatedAt: "2026-03-22T10:00:00.000Z",
          },
        },
        {
          activity: "working",
          completionMarker: undefined,
          isRunning: true,
        },
      ),
    ).toEqual({
      activity: "attention",
      completionMarker: "turn:turn-1:completed:2026-03-22T10:00:00.000Z",
      isRunning: true,
      lastInteractionAt: "2026-03-22T10:00:00.000Z",
    });
  });

  test("should mark errored thread sessions as not running", () => {
    expect(
      resolveThreadActivity({
        id: "thread-1",
        session: {
          lastError: "boom",
          status: "error",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      }),
    ).toEqual({
      activity: "idle",
      completionMarker: "session:2026-03-22T10:00:00.000Z:error:boom",
      isRunning: false,
      lastInteractionAt: "2026-03-22T10:00:00.000Z",
    });
  });

  test("should refresh thread activity from a direct snapshot callback", async () => {
    const getSnapshot = vi.fn(async () => ({
      threads: [
        {
          id: "thread-1",
          latestTurn: {
            state: "running",
            turnId: "turn-1",
          },
          session: {
            status: "running",
            updatedAt: "2026-03-22T10:00:00.000Z",
          },
          title: "Thread One",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      ],
    }));
    const monitor = new T3ActivityMonitor({ getSnapshot });

    await monitor.setEnabled(true);

    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(monitor.getThreadTitle("thread-1")).toBe("Thread One");
    expect(monitor.getThreadActivity("thread-1")).toEqual({
      activity: "working",
      completionMarker: undefined,
      isRunning: true,
      lastInteractionAt: "2026-03-22T10:00:00.000Z",
    });
  });
});
