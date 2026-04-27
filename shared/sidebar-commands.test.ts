import { describe, expect, test } from "vite-plus/test";
import {
  createSidebarCommandButtons,
  getFirstBrowserSidebarCommandUrl,
  normalizeStoredSidebarCommandOrder,
  normalizeStoredSidebarCommands,
} from "./sidebar-commands";
import { DEFAULT_SIDEBAR_COMMAND_ICON_COLOR } from "./sidebar-command-icons";

describe("createSidebarCommandButtons", () => {
  test("should expose the default terminal action slots when no actions are configured", () => {
    expect(createSidebarCommandButtons([])).toEqual([
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "dev",
        isDefault: true,
        name: "Dev",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "build",
        isDefault: true,
        name: "Build",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "test",
        isDefault: true,
        name: "Test",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "setup",
        isDefault: true,
        name: "Setup",
        playCompletionSound: true,
        url: undefined,
      },
    ]);
  });

  test("should merge configured defaults and append custom terminal and browser actions", () => {
    expect(
      createSidebarCommandButtons([
        {
          actionType: "terminal",
          closeTerminalOnExit: false,
          command: "vp dev",
          commandId: "dev",
          isDefault: true,
          name: "App",
          playCompletionSound: true,
        },
        {
          actionType: "browser",
          closeTerminalOnExit: false,
          commandId: "custom-docs",
          isDefault: false,
          name: "Docs",
          playCompletionSound: false,
          url: "https://example.com/docs",
        },
      ]),
    ).toEqual([
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "vp dev",
        commandId: "dev",
        isDefault: true,
        name: "App",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "build",
        isDefault: true,
        name: "Build",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "test",
        isDefault: true,
        name: "Test",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "setup",
        isDefault: true,
        name: "Setup",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "browser",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "custom-docs",
        isDefault: false,
        name: "Docs",
        playCompletionSound: false,
        url: "https://example.com/docs",
      },
    ]);
  });

  test("should preserve configured icon metadata for custom actions", () => {
    expect(
      createSidebarCommandButtons([
        {
          actionType: "terminal",
          closeTerminalOnExit: false,
          command: "pnpm test",
          commandId: "custom-tests",
          icon: "bug",
          iconColor: "#92b4ff",
          isDefault: false,
          name: "",
          playCompletionSound: true,
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandId: "custom-tests",
          icon: "bug",
          iconColor: "#92b4ff",
          name: "",
          playCompletionSound: true,
        }),
      ]),
    );
  });

  test("should respect a stored action order for defaults and custom actions", () => {
    expect(
      createSidebarCommandButtons(
        [
          {
            actionType: "browser",
            closeTerminalOnExit: false,
            commandId: "custom-docs",
            isDefault: false,
            name: "Docs",
            playCompletionSound: false,
            url: "https://example.com/docs",
          },
        ],
        ["test", "custom-docs", "dev"],
      ),
    ).toEqual([
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "test",
        isDefault: true,
        name: "Test",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "browser",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "custom-docs",
        isDefault: false,
        name: "Docs",
        playCompletionSound: false,
        url: "https://example.com/docs",
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "dev",
        isDefault: true,
        name: "Dev",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "build",
        isDefault: true,
        name: "Build",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "setup",
        isDefault: true,
        name: "Setup",
        playCompletionSound: true,
        url: undefined,
      },
    ]);
  });

  test("should hide deleted default actions", () => {
    expect(createSidebarCommandButtons([], [], ["build", "test"])).toEqual([
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "dev",
        isDefault: true,
        name: "Dev",
        playCompletionSound: true,
        url: undefined,
      },
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: "setup",
        isDefault: true,
        name: "Setup",
        playCompletionSound: true,
        url: undefined,
      },
    ]);
  });
});

describe("getFirstBrowserSidebarCommandUrl", () => {
  test("should return the first browser action url in the current action order", () => {
    const commands = createSidebarCommandButtons(
      [
        {
          actionType: "browser",
          closeTerminalOnExit: false,
          commandId: "custom-docs",
          isDefault: false,
          name: "Docs",
          playCompletionSound: false,
          url: "https://example.com/docs",
        },
        {
          actionType: "browser",
          closeTerminalOnExit: false,
          commandId: "custom-app",
          isDefault: false,
          name: "App",
          playCompletionSound: false,
          url: "https://example.com/app",
        },
      ],
      ["custom-app", "custom-docs"],
    );

    expect(getFirstBrowserSidebarCommandUrl(commands)).toBe("https://example.com/app");
  });

  test("should return undefined when no browser actions exist", () => {
    expect(getFirstBrowserSidebarCommandUrl(createSidebarCommandButtons([]))).toBeUndefined();
  });
});

describe("normalizeStoredSidebarCommands", () => {
  test("should normalize legacy terminal actions and trim valid values", () => {
    expect(
      normalizeStoredSidebarCommands([
        {
          closeTerminalOnExit: false,
          command: "  vp dev  ",
          commandId: " dev ",
          isDefault: true,
          name: "  Dev server ",
          playCompletionSound: true,
        },
      ]),
    ).toEqual([
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "vp dev",
        commandId: "dev",
        isDefault: true,
        name: "Dev server",
        playCompletionSound: true,
      },
    ]);
  });

  test("should normalize browser actions and reject invalid values", () => {
    expect(
      normalizeStoredSidebarCommands([
        {
          actionType: "browser",
          commandId: " docs ",
          isDefault: false,
          name: " Docs ",
          playCompletionSound: true,
          url: " https://example.com/docs ",
        },
        {
          actionType: "browser",
          commandId: "missing-url",
          isDefault: false,
          name: "Broken",
          playCompletionSound: true,
        },
      ]),
    ).toEqual([
      {
        actionType: "browser",
        closeTerminalOnExit: false,
        commandId: "docs",
        isDefault: false,
        name: "Docs",
        playCompletionSound: false,
        url: "https://example.com/docs",
      },
    ]);
  });

  test("should normalize command icons and fall back to the default icon color", () => {
    expect(
      normalizeStoredSidebarCommands([
        {
          closeTerminalOnExit: false,
          command: "pnpm dev",
          commandId: "devtools",
          icon: "terminal",
          iconColor: "not-a-color",
          isDefault: false,
          name: "",
          playCompletionSound: true,
        },
      ]),
    ).toEqual([
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm dev",
        commandId: "devtools",
        icon: "terminal",
        iconColor: DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
        isDefault: false,
        name: "",
        playCompletionSound: true,
      },
    ]);
  });

  test("should preserve global action metadata", () => {
    expect(
      normalizeStoredSidebarCommands([
        {
          closeTerminalOnExit: false,
          command: "pnpm lint",
          commandId: "custom-lint",
          isDefault: false,
          isGlobal: true,
          name: "Lint",
          playCompletionSound: true,
        },
      ]),
    ).toEqual([
      {
        actionType: "terminal",
        closeTerminalOnExit: false,
        command: "pnpm lint",
        commandId: "custom-lint",
        isDefault: false,
        isGlobal: true,
        name: "Lint",
        playCompletionSound: true,
      },
    ]);
  });
});

describe("normalizeStoredSidebarCommandOrder", () => {
  test("should ignore invalid ids, trim values, and dedupe entries", () => {
    expect(normalizeStoredSidebarCommandOrder([" test ", "", "dev", "test", 42, null])).toEqual([
      "test",
      "dev",
    ]);
  });
});
