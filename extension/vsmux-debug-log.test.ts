import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

const workspaceState = {
  debuggingMode: false,
  workspaceFolders: undefined as Array<{ uri: { fsPath: string } }> | undefined,
};

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: () => workspaceState.debuggingMode,
    }),
    get workspaceFolders() {
      return workspaceState.workspaceFolders;
    },
  },
}));

import { getVSmuxDebugLogPath, logVSmuxDebug, resetVSmuxDebugLog } from "./vsmux-debug-log";

describe("vsmux debug log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    workspaceState.debuggingMode = false;
    workspaceState.workspaceFolders = undefined;

    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes allowlisted debug events to the workspace .vsmux log only when debugging is enabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "vsmux-debug-log-"));
    workspaceState.workspaceFolders = [{ uri: { fsPath: workspaceRoot } }];
    workspaceState.debuggingMode = true;
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    const logPath = getVSmuxDebugLogPath(workspaceRoot);
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");

    resetVSmuxDebugLog();
    await waitForQueueDrain();

    logVSmuxDebug("controller.waitForTerminalFrontendConnectionAfterReload.timeout", {
      reason: "neverObservedDetach",
      sessionId: "session-04",
    });
    logVSmuxDebug("backend.daemon.sessionState", {
      isAttached: false,
      sessionId: "session-04",
    });
    logVSmuxDebug("controller.focusSession.afterStateChange", {
      sessionId: "session-04",
    });
    await waitForQueueDrain();

    expect(logPath).toBe(path.join(workspaceRoot, ".vsmux", "full-reload-terminal-reconnect.log"));
    const contents = await readFile(logPath, "utf8");
    const excludeContents = await readFile(excludePath, "utf8");
    expect(contents).toContain("controller.waitForTerminalFrontendConnectionAfterReload.timeout");
    expect(contents).toContain('"sessionId":"session-04"');
    expect(contents).not.toContain("backend.daemon.sessionState");
    expect(contents).not.toContain("controller.focusSession.afterStateChange");
    expect(excludeContents).toContain(".vsmux/");
  });

  test("does not create the debug log file when debugging is disabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "vsmux-debug-log-disabled-"));
    workspaceState.workspaceFolders = [{ uri: { fsPath: workspaceRoot } }];
    workspaceState.debuggingMode = false;

    logVSmuxDebug("controller.waitForTerminalFrontendConnectionAfterReload.timeout", {
      sessionId: "session-04",
    });
    await waitForQueueDrain();

    await expect(access(getVSmuxDebugLogPath(workspaceRoot))).rejects.toThrow();
  });
});

async function waitForQueueDrain(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
