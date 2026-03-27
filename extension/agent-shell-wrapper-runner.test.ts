import { describe, expect, test } from "vite-plus/test";
import { createAgentEnvironment, getCandidateExecutableNames } from "./agent-shell-wrapper-runner";

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
});
