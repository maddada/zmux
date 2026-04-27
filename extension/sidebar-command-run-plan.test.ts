import { describe, expect, test } from "vite-plus/test";
import {
  getSidebarCommandTerminalExecutionText,
  getSidebarCommandTerminalRunPlan,
  getSidebarCommandWorkspaceSessionTitle,
} from "./sidebar-command-run-plan";

describe("getSidebarCommandTerminalRunPlan", () => {
  test("should route default terminal runs into background zmux sessions", () => {
    expect(getSidebarCommandTerminalRunPlan("terminal", false, "default")).toEqual({
      closeOnExit: false,
      presentation: "background-indicator",
      target: "zmux-terminal",
    });
  });

  test("should preserve close-on-exit behavior for default terminal runs", () => {
    expect(getSidebarCommandTerminalRunPlan("terminal", true, "default")).toEqual({
      closeOnExit: true,
      presentation: "background-indicator",
      target: "zmux-terminal",
    });
  });

  test("should keep debug terminal runs in the sidebar card flow", () => {
    expect(getSidebarCommandTerminalRunPlan("terminal", true, "debug")).toEqual({
      presentation: "sidebar-card",
      target: "zmux-terminal",
    });
  });

  test("should ignore browser actions", () => {
    expect(getSidebarCommandTerminalRunPlan("browser", false, "debug")).toBeUndefined();
  });
});

describe("getSidebarCommandWorkspaceSessionTitle", () => {
  test("should preserve the action name for default runs", () => {
    expect(getSidebarCommandWorkspaceSessionTitle("Build", "pnpm build", "default")).toBe("Build");
  });

  test("should prefix debug runs with the debug label", () => {
    expect(getSidebarCommandWorkspaceSessionTitle("Build", "pnpm build", "debug")).toBe(
      "Debug: Build",
    );
  });

  test("should fall back to the first 20 command characters when the action only has an icon", () => {
    expect(
      getSidebarCommandWorkspaceSessionTitle("", "pnpm build --watch --filter web", "debug"),
    ).toBe("Debug: pnpm build --watch -");
  });
});

describe("getSidebarCommandTerminalExecutionText", () => {
  test("should preserve the raw command for persistent action terminals", () => {
    expect(getSidebarCommandTerminalExecutionText("/bin/zsh", "pnpm dev", false)).toBe("pnpm dev");
  });

  test("should append an explicit shell exit for close-on-exit action terminals", () => {
    expect(getSidebarCommandTerminalExecutionText("/bin/zsh", "pnpm build", true)).toBe(
      "pnpm build; __zmux_exit=$?; exit $__zmux_exit",
    );
  });
});
