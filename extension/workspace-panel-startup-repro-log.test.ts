import { mkdtemp, readFile, rm } from "node:fs/promises";
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
  appendWorkspacePanelStartupReproLog,
  getWorkspacePanelStartupReproLogPath,
} from "./workspace-panel-startup-repro-log";

describe("workspace panel startup repro log", () => {
  let workspaceRoot: string | undefined;

  afterEach(async () => {
    debugState.enabled = true;

    if (!workspaceRoot) {
      return;
    }

    await rm(workspaceRoot, { force: true, recursive: true });
    workspaceRoot = undefined;
  });

  test("should append repro entries to the startup log file", async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "workspace-panel-startup-repro-log-"));

    await appendWorkspacePanelStartupReproLog(
      workspaceRoot,
      "workspace.panel.ready.missingRenderableState",
      {
        hasLatestMessage: false,
        panelVisible: true,
      },
    );

    const logPath = getWorkspacePanelStartupReproLogPath(workspaceRoot);
    const contents = await readFile(logPath, "utf8");

    expect(logPath).toBe(path.join(workspaceRoot, ".zmux", "workspace-panel-startup-repro.log"));
    expect(contents).toContain("workspace.panel.ready.missingRenderableState");
    expect(contents).toContain('"panelVisible":true');
  });

  test("should not write startup repro entries when debugging mode is disabled", async () => {
    workspaceRoot = await mkdtemp(
      path.join(os.tmpdir(), "workspace-panel-startup-repro-log-disabled-"),
    );
    debugState.enabled = false;

    await appendWorkspacePanelStartupReproLog(workspaceRoot, "workspace.panel.ready", {
      panelVisible: true,
    });

    await expect(
      readFile(getWorkspacePanelStartupReproLogPath(workspaceRoot), "utf8"),
    ).rejects.toThrow();
  });
});
