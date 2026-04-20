import { describe, expect, test } from "vitest";
import { getCommandButtonAriaLabel, getCommandButtonTooltip } from "./command-button-copy";

describe("getCommandButtonTooltip", () => {
  test("should show the title and command on separate lines when both exist", () => {
    expect(
      getCommandButtonTooltip({
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm test",
        commandId: "test",
        isDefault: false,
        name: "Test",
        playCompletionSound: true,
      }),
    ).toBe("Test\npnpm test");
  });

  test("should show only the command when the title is blank", () => {
    expect(
      getCommandButtonTooltip({
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm dev",
        commandId: "dev",
        icon: "rocket",
        isDefault: false,
        name: "   ",
        playCompletionSound: true,
      }),
    ).toBe("pnpm dev");
  });

  test("should show only the url when the title is blank", () => {
    expect(
      getCommandButtonTooltip({
        actionType: "browser",
        closeTerminalOnExit: false,
        commandId: "docs",
        icon: "world",
        isDefault: false,
        name: "",
        playCompletionSound: false,
        url: "https://example.com/docs",
      }),
    ).toBe("https://example.com/docs");
  });

  test("should not use the icon label as tooltip copy", () => {
    expect(
      getCommandButtonTooltip({
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm lint",
        commandId: "lint",
        icon: "flask",
        isDefault: false,
        name: "",
        playCompletionSound: true,
      }),
    ).toBe("pnpm lint");
  });
});

describe("getCommandButtonAriaLabel", () => {
  test("should use the target copy when there is no title", () => {
    expect(
      getCommandButtonAriaLabel({
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm check",
        commandId: "check",
        icon: "tool",
        isDefault: false,
        name: "",
        playCompletionSound: true,
      }),
    ).toBe("Run pnpm check");
  });
});
