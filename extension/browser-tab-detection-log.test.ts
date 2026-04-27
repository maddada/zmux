import { access, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

const debugState = {
  enabled: true,
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

import { getBrowserTabDetectionLogPath, logBrowserTabDetection } from "./browser-tab-detection-log";

describe("browser tab detection log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    debugState.enabled = true;
    workspaceState.workspaceRoot = undefined;

    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("writes browser tab traces into the workspace .zmux folder when debugging is enabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "browser-tab-detection-log-"));
    workspaceState.workspaceRoot = workspaceRoot;
    await mkdir(path.join(workspaceRoot, ".git", "info"), { recursive: true });

    logBrowserTabDetection("browserTabs.scan.start", {
      groupCount: 2,
      scanId: "scan-1",
    });

    await waitForQueueDrain();

    const logPath = getBrowserTabDetectionLogPath(workspaceRoot);
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");
    const contents = await readFile(logPath, "utf8");
    const excludeContents = await readFile(excludePath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".zmux", "browser-tab-detection-debug.log"));
    expect(contents).toContain("browserTabs.scan.start");
    expect(contents).toContain('"scanId":"scan-1"');
    expect(excludeContents).toContain(".zmux/");
  });

  test("does not create the browser tab debug log when debugging is disabled", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "browser-tab-detection-log-disabled-"));
    workspaceState.workspaceRoot = workspaceRoot;
    debugState.enabled = false;

    logBrowserTabDetection("browserTabs.scan.start", {
      scanId: "scan-2",
    });
    await waitForQueueDrain();

    await expect(access(getBrowserTabDetectionLogPath(workspaceRoot))).rejects.toThrow();
  });
});

async function waitForQueueDrain(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
