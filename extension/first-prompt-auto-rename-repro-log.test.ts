import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";

import {
  appendFirstPromptAutoRenameReproLog,
  getFirstPromptAutoRenameReproLogPath,
} from "./first-prompt-auto-rename-repro-log";

describe("first prompt auto rename repro log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    process.env.VSMUX_DEBUGGING_MODE = "true";

    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes events into a dedicated workspace .vsmux file", async () => {
    process.env.VSMUX_DEBUGGING_MODE = "true";
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "first-prompt-auto-rename-repro-log-"));
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    await appendFirstPromptAutoRenameReproLog(
      workspaceRoot,
      "controller.firstPromptAutoRename.inspect",
      {
        hasAutoTitleFromFirstPrompt: false,
        pendingPromptLength: 41,
        sessionId: "session-1",
      },
    );

    const logPath = getFirstPromptAutoRenameReproLogPath(workspaceRoot);
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");
    const contents = await readFile(logPath, "utf8");
    const excludeContents = await readFile(excludePath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".vsmux", "first-prompt-auto-rename-repro.log"));
    expect(contents).toContain("controller.firstPromptAutoRename.inspect");
    expect(contents).toContain('"sessionId":"session-1"');
    expect(excludeContents).toContain(".vsmux/");
  });

  test("does not create the log file when debugging mode is disabled", async () => {
    workspaceRoot = await mkdtemp(
      path.join(os.tmpdir(), "first-prompt-auto-rename-repro-log-disabled-"),
    );
    process.env.VSMUX_DEBUGGING_MODE = "false";

    await appendFirstPromptAutoRenameReproLog(
      workspaceRoot,
      "controller.firstPromptAutoRename.inspect",
      { sessionId: "session-1" },
    );

    await expect(access(getFirstPromptAutoRenameReproLogPath(workspaceRoot))).rejects.toThrow();
  });
});
