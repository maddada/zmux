import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";
import {
  appendWtermWorkspaceDebugLog,
  getWtermWorkspaceDebugLogPath,
} from "./wterm-workspace-debug-log";

describe("wterm workspace debug log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    if (!workspaceRoot) {
      return;
    }
    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes wterm debug lines into a dedicated workspace log", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "wterm-workspace-debug-"));

    await appendWtermWorkspaceDebugLog(workspaceRoot, "workspace.webview.wterm.initSucceeded", {
      cols: 120,
      rows: 34,
      sessionId: "session-00",
    });

    const logPath = getWtermWorkspaceDebugLogPath(workspaceRoot);
    const logContent = await readFile(logPath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".vsmux", "wterm-debug.log"));
    expect(logContent).toContain("[wterm-debug] workspace.webview.wterm.initSucceeded");
    expect(logContent).toContain('"sessionId":"session-00"');
  });
});
