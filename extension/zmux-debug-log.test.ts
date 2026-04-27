import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

const debugState = {
  enabled: false,
};
const workspaceState = {
  workspaceRoot: undefined as string | undefined,
};

vi.mock("vscode", () => ({
  workspace: {
    get workspaceFolders() {
      return workspaceState.workspaceRoot
        ? [{ uri: { fsPath: workspaceState.workspaceRoot } }]
        : undefined;
    },
  },
}));

vi.mock("./native-terminal-workspace/settings", () => ({
  getDebuggingMode: () => debugState.enabled,
}));

import {
  getzmuxDebugLogPath,
  logzmuxDebug,
  logzmuxReproTrace,
  resetzmuxDebugLog,
} from "./zmux-debug-log";
import {
  appendWorkspacePanelBlankGrayReproLog,
  getWorkspacePanelBlankGrayReproLogPath,
} from "./workspace-panel-blank-gray-repro-log";

describe("zmux debug log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    debugState.enabled = false;
    workspaceState.workspaceRoot = undefined;

    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes allowlisted debug events to the workspace .zmux log only when debugging is enabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "zmux-debug-log-"));
    workspaceState.workspaceRoot = workspaceRoot;
    debugState.enabled = true;
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    resetzmuxDebugLog();
    await waitForQueueDrain();

    logzmuxDebug("controller.waitForTerminalFrontendConnectionAfterReload.timeout", {
      reason: "neverObservedDetach",
      sessionId: "session-04",
    });
    logzmuxDebug("backend.daemon.sessionState", {
      isAttached: false,
      sessionId: "session-04",
    });
    logzmuxReproTrace("repro.controller.focusSession.start", {
      sessionId: "session-04",
    });
    await waitForQueueDrain();

    const logPath = getzmuxDebugLogPath(workspaceRoot);
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");
    const contents = await readFile(logPath, "utf8");
    const excludeContents = await readFile(excludePath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".zmux", "full-reload-terminal-reconnect.log"));
    expect(contents).toContain("controller.waitForTerminalFrontendConnectionAfterReload.timeout");
    expect(contents).toContain("repro.controller.focusSession.start");
    expect(contents).not.toContain("backend.daemon.sessionState");
    expect(excludeContents).toContain(".zmux/");
  });

  test("does not create the debug log file when debugging is disabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "zmux-debug-log-disabled-"));
    workspaceState.workspaceRoot = workspaceRoot;

    logzmuxDebug("controller.waitForTerminalFrontendConnectionAfterReload.timeout", {
      sessionId: "session-04",
    });
    await waitForQueueDrain();

    await expect(access(getzmuxDebugLogPath(workspaceRoot))).rejects.toThrow();
  });

  test("writes blank gray repro events to a separate workspace log only when debugging is enabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "zmux-blank-gray-log-"));
    debugState.enabled = true;
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    await appendWorkspacePanelBlankGrayReproLog(workspaceRoot, "workspace.panel.htmlAssigned", {
      bootstrapMessageType: "sessionState",
    });
    await waitForQueueDrain();

    const logPath = getWorkspacePanelBlankGrayReproLogPath(workspaceRoot);
    const contents = await readFile(logPath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".zmux", "workspace-panel-blank-gray-repro.log"));
    expect(contents).toContain("workspace.panel.htmlAssigned");
    expect(contents).toContain("bootstrapMessageType");
  });

  test("does not create the blank gray repro log when debugging is disabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "zmux-blank-gray-disabled-"));

    await appendWorkspacePanelBlankGrayReproLog(workspaceRoot, "workspace.panel.htmlAssigned");
    await waitForQueueDrain();

    await expect(access(getWorkspacePanelBlankGrayReproLogPath(workspaceRoot))).rejects.toThrow();
  });
});

async function waitForQueueDrain(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
