import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";
import {
  appendTerminalRestartReproLog,
  getTerminalRestartReproLogPath,
} from "./terminal-restart-repro-log";

describe("terminal restart repro log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes restart repro events into a dedicated workspace .vsmux file", async () => {
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

    expect(logPath).toBe(path.join(workspaceRoot, ".vsmux", "terminal-restart-repro.log"));
    expect(contents).toContain("extension.activate.start");
    expect(contents).toContain('"workspaceId":"workspace-1"');
    expect(excludeContents).toContain(".vsmux/");
  });

  test("does not create a log file when there is no workspace root", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "terminal-restart-repro-log-empty-"));

    await appendTerminalRestartReproLog(undefined, "extension.activate.start", {
      workspaceId: "workspace-1",
    });

    await expect(access(getTerminalRestartReproLogPath(workspaceRoot))).rejects.toThrow();
  });
});
