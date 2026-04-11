import { describe, expect, test } from "vite-plus/test";
import { getSidebarCommandTerminalRunPlan } from "./sidebar-command-run-plan";

describe("getSidebarCommandTerminalRunPlan", () => {
  test("should keep default terminal runs in a VS Code terminal", () => {
    expect(getSidebarCommandTerminalRunPlan("terminal", false, "default")).toEqual({
      closeOnExit: false,
      target: "vscode-terminal",
    });
  });

  test("should preserve close-on-exit behavior for default terminal runs", () => {
    expect(getSidebarCommandTerminalRunPlan("terminal", true, "default")).toEqual({
      closeOnExit: true,
      target: "vscode-terminal",
    });
  });

  test("should route debug terminal runs into VSmux", () => {
    expect(getSidebarCommandTerminalRunPlan("terminal", true, "debug")).toEqual({
      target: "vsmux-terminal",
    });
  });

  test("should ignore browser actions", () => {
    expect(getSidebarCommandTerminalRunPlan("browser", false, "debug")).toBeUndefined();
  });
});
