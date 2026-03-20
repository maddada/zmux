import { describe, expect, test } from "vite-plus/test";
import {
  createSidebarCommandButtons,
  normalizeStoredSidebarCommands,
} from "./sidebar-commands";

describe("createSidebarCommandButtons", () => {
  test("should expose the default command slots when no commands are configured", () => {
    expect(createSidebarCommandButtons([])).toEqual([
      {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "dev",
        isDefault: true,
        name: "Dev",
      },
      {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "build",
        isDefault: true,
        name: "Build",
      },
      {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "test",
        isDefault: true,
        name: "Test",
      },
      {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "setup",
        isDefault: true,
        name: "Setup",
      },
    ]);
  });

  test("should merge configured defaults and append custom commands", () => {
    expect(
      createSidebarCommandButtons([
        {
          closeTerminalOnExit: false,
          command: "vp dev",
          commandId: "dev",
          isDefault: true,
          name: "App",
        },
        {
          closeTerminalOnExit: true,
          command: "vp run docs",
          commandId: "custom-docs",
          isDefault: false,
          name: "Docs",
        },
      ]),
    ).toEqual([
      {
        closeTerminalOnExit: false,
        command: "vp dev",
        commandId: "dev",
        isDefault: true,
        name: "App",
      },
      {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "build",
        isDefault: true,
        name: "Build",
      },
      {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "test",
        isDefault: true,
        name: "Test",
      },
      {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "setup",
        isDefault: true,
        name: "Setup",
      },
      {
        closeTerminalOnExit: true,
        command: "vp run docs",
        commandId: "custom-docs",
        isDefault: false,
        name: "Docs",
      },
    ]);
  });
});

describe("normalizeStoredSidebarCommands", () => {
  test("should ignore invalid entries and trim valid values", () => {
    expect(
      normalizeStoredSidebarCommands([
        {
          closeTerminalOnExit: false,
          command: "  vp dev  ",
          commandId: " dev ",
          isDefault: true,
          name: "  Dev server ",
        },
        {
          closeTerminalOnExit: "nope",
          command: "vp test",
          commandId: "test",
          isDefault: true,
          name: "Test",
        },
      ]),
    ).toEqual([
      {
        closeTerminalOnExit: false,
        command: "vp dev",
        commandId: "dev",
        isDefault: true,
        name: "Dev server",
      },
    ]);
  });
});
