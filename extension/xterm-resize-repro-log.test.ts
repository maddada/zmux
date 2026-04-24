import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { appendXtermResizeReproLog, getXtermResizeReproLogPath } from "./xterm-resize-repro-log";

describe("xterm resize repro log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes xterm resize traces into a dedicated workspace .vsmux file", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "xterm-resize-repro-log-"));
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    await appendXtermResizeReproLog(workspaceRoot, "workspace.webview.xtermResize.resizeSent", {
      cols: 119,
      rows: 31,
      sessionId: "session-1",
    });

    const logPath = getXtermResizeReproLogPath(workspaceRoot);
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");
    const contents = await readFile(logPath, "utf8");
    const excludeContents = await readFile(excludePath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".vsmux", "xterm-resize-repro.log"));
    expect(contents).toContain("workspace.webview.xtermResize.resizeSent");
    expect(contents).toContain('"cols":119');
    expect(excludeContents).toContain(".vsmux/");
  });
});
