import { describe, expect, test, vi } from "vite-plus/test";
import { finalizeRestoredPreviousSession } from "./restore-previous-session";

describe("finalizeRestoredPreviousSession", () => {
  test("should resume the restored terminal before removing history and refreshing state", async () => {
    const callOrder: string[] = [];

    await finalizeRestoredPreviousSession({
      afterStateChange: async () => {
        callOrder.push("afterStateChange");
      },
      createSurfaceIfNeeded: async () => {
        callOrder.push("createSurfaceIfNeeded");
      },
      persistSessionAgentLaunchState: async () => {
        callOrder.push("persistSessionAgentLaunchState");
      },
      removePreviousSession: async () => {
        callOrder.push("removePreviousSession");
      },
      resumeDetachedTerminalSession: async () => {
        callOrder.push("resumeDetachedTerminalSession");
      },
    });

    expect(callOrder).toEqual([
      "createSurfaceIfNeeded",
      "persistSessionAgentLaunchState",
      "resumeDetachedTerminalSession",
      "removePreviousSession",
      "afterStateChange",
    ]);
  });

  test("should stop immediately when resuming the restored terminal fails", async () => {
    const removePreviousSession = vi.fn(async () => undefined);
    const afterStateChange = vi.fn(async () => undefined);

    await expect(
      finalizeRestoredPreviousSession({
        afterStateChange,
        createSurfaceIfNeeded: async () => undefined,
        persistSessionAgentLaunchState: async () => undefined,
        removePreviousSession,
        resumeDetachedTerminalSession: async () => {
          throw new Error("resume failed");
        },
      }),
    ).rejects.toThrow("resume failed");

    expect(removePreviousSession).not.toHaveBeenCalled();
    expect(afterStateChange).not.toHaveBeenCalled();
  });
});
