import { describe, expect, test } from "vite-plus/test";
import {
  createAgentEnvironment,
  extractCodexSessionId,
  getCandidateExecutableNames,
  getProcessTreeKillTarget,
  shouldSpawnAgentInDetachedGroup,
} from "./agent-shell-wrapper-runner";

describe("getCandidateExecutableNames", () => {
  test("should prefer Windows PATHEXT launchers over the extensionless shim", () => {
    expect(getCandidateExecutableNames("codex", "win32", ".COM;.EXE;.BAT;.CMD")).toEqual([
      "codex.com",
      "codex.exe",
      "codex.bat",
      "codex.cmd",
    ]);
  });

  test("should keep the bare executable name on non-Windows platforms", () => {
    expect(getCandidateExecutableNames("codex", "linux")).toEqual(["codex"]);
    expect(getCandidateExecutableNames("gemini", "linux")).toEqual(["gemini"]);
  });

  test("should not include the extensionless codex shim on Windows", () => {
    expect(getCandidateExecutableNames("codex", "win32", ".CMD")).not.toContain("codex");
  });
});

describe("createAgentEnvironment", () => {
  test("should disable Claude terminal title changes at the source", () => {
    expect(createAgentEnvironment("claude", {}).CLAUDE_CODE_DISABLE_TERMINAL_TITLE).toBe("1");
  });

  test("should not add the Claude title override for other agents", () => {
    expect(createAgentEnvironment("codex", {}).CLAUDE_CODE_DISABLE_TERMINAL_TITLE).toBeUndefined();
    expect(createAgentEnvironment("gemini", {}).CLAUDE_CODE_DISABLE_TERMINAL_TITLE).toBeUndefined();
  });

  test("should stamp the wrapper pid into the environment for descendant cleanup", () => {
    expect(createAgentEnvironment("codex", {}).VSMUX_WRAPPER_PID).toBe(String(process.pid));
  });
});

describe("extractCodexSessionId", () => {
  test("returns the session id from session meta log lines", () => {
    expect(
      extractCodexSessionId(
        JSON.stringify({
          payload: {
            id: "019db54a-e2e1-78c1-b05b-61335c73ad3a",
          },
          type: "session_meta",
        }),
      ),
    ).toBe("019db54a-e2e1-78c1-b05b-61335c73ad3a");
  });

  test("ignores non session-meta log lines", () => {
    expect(
      extractCodexSessionId(
        JSON.stringify({
          payload: {
            turn_id: "turn-123",
          },
          type: "event_msg",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("agent child process ownership", () => {
  test("should spawn unix agents in a detached process group", () => {
    expect(shouldSpawnAgentInDetachedGroup("darwin")).toBe(true);
    expect(shouldSpawnAgentInDetachedGroup("linux")).toBe(true);
  });

  test("should keep Windows agent launches attached to their direct pid", () => {
    expect(shouldSpawnAgentInDetachedGroup("win32")).toBe(false);
    expect(getProcessTreeKillTarget(4321, "win32")).toBe(4321);
  });

  test("should target the whole unix process group during cleanup", () => {
    expect(getProcessTreeKillTarget(4321, "darwin")).toBe(-4321);
    expect(getProcessTreeKillTarget(-4321, "linux")).toBe(-4321);
  });
});
