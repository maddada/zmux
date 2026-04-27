import { access, mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  appendT3CloseSessionReproLog,
  getT3CloseSessionReproLogPath,
} from "./t3-close-session-repro-log";

describe("t3 close session repro log", () => {
  test("keeps the legacy log path stable without writing a log file", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "t3-close-session-repro-"));

    try {
      await appendT3CloseSessionReproLog(workspaceRoot, "controller.closeSession.start", {
        sessionId: "session-12",
        source: "sidebar",
      });

      const logPath = getT3CloseSessionReproLogPath(workspaceRoot);

      expect(logPath).toBe(path.join(workspaceRoot, ".zmux", "t3-close-session-repro.log"));
      await expect(access(logPath)).rejects.toThrow();
    } finally {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  });
});
