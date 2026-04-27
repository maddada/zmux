import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

const debugState = {
  enabled: true,
};

vi.mock("./native-terminal-workspace/settings", () => ({
  getDebuggingMode: () => debugState.enabled,
}));

import {
  appendTerminalRestartReproLog,
  getTerminalRestartReproLogPath,
} from "./terminal-restart-repro-log";

describe("terminal restart repro log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    debugState.enabled = true;

    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes restart repro events into a dedicated workspace .zmux file", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "terminal-restart-repro-log-"));
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    await appendTerminalRestartReproLog(workspaceRoot, "extension.activate.start", {
      extensionHostPid: 4242,
      workspaceId: "workspace-1",
    });

    const logPath = getTerminalRestartReproLogPath(workspaceRoot);
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");
    const contents = await readFile(logPath, "utf8");
    const excludeContents = await readFile(excludePath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".zmux", "terminal-restart-repro.log"));
    expect(contents).toContain("extension.activate.start");
    expect(contents).toContain('"workspaceId":"workspace-1"');
    expect(excludeContents).toContain(".zmux/");
  });

  test("does not create a log file when debugging mode is disabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "terminal-restart-repro-log-disabled-"));
    debugState.enabled = false;

    await appendTerminalRestartReproLog(workspaceRoot, "extension.activate.start", {
      workspaceId: "workspace-1",
    });

    await expect(access(getTerminalRestartReproLogPath(workspaceRoot))).rejects.toThrow();
  });
});
