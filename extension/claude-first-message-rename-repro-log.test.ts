import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";
import {
  appendClaudeFirstMessageRenameReproLog,
  getClaudeFirstMessageRenameReproLogPath,
} from "./claude-first-message-rename-repro-log";

describe("claude first message rename repro log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes events into a dedicated workspace .zmux file", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-first-message-rename-repro-"));
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    await appendClaudeFirstMessageRenameReproLog({
      details: {
        reason: "nonGenericCurrentTitle",
        sessionId: "session-1",
      },
      enabled: true,
      event: "hook.promptSubmitDecision",
      workspaceRoot,
    });

    const logPath = getClaudeFirstMessageRenameReproLogPath(workspaceRoot);
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");
    const contents = await readFile(logPath, "utf8");
    const excludeContents = await readFile(excludePath, "utf8");

    expect(logPath).toBe(
      path.join(workspaceRoot, ".zmux", "claude-first-message-rename-repro.log"),
    );
    expect(contents).toContain("hook.promptSubmitDecision");
    expect(contents).toContain('"sessionId":"session-1"');
    expect(excludeContents).toContain(".zmux/");
  });

  test("does not create the log file when debugging mode is disabled", async () => {
    workspaceRoot = await mkdtemp(
      path.join(os.tmpdir(), "claude-first-message-rename-repro-disabled-"),
    );

    await appendClaudeFirstMessageRenameReproLog({
      details: { sessionId: "session-1" },
      enabled: false,
      event: "hook.promptSubmitDecision",
      workspaceRoot,
    });

    await expect(access(getClaudeFirstMessageRenameReproLogPath(workspaceRoot))).rejects.toThrow();
  });
});
