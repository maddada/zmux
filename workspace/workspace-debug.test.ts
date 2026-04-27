import { describe, expect, test, vi } from "vite-plus/test";
import { logWorkspaceDebug } from "./workspace-debug";

describe("logWorkspaceDebug", () => {
  test("should not write workspace debug events to the browser console", () => {
    const consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    logWorkspaceDebug(true, "terminal.socketOpen", {
      connectionId: 219,
      sessionId: "session-09",
    });

    expect(consoleDebugSpy).not.toHaveBeenCalled();
  });
});
