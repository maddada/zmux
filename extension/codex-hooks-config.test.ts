import { describe, expect, test } from "vite-plus/test";
import {
  getCodexHookCommand,
  getCodexHookSettingsContent,
  mergeCodexHookSettingsContent,
  resolveActiveCodexHooksPath,
} from "./codex-hooks-config";

describe("resolveActiveCodexHooksPath", () => {
  test("should prefer CODEX_HOME when it is set", () => {
    expect(
      resolveActiveCodexHooksPath({
        CODEX_HOME: "/Users/test/.codex-profiles/work",
      } as NodeJS.ProcessEnv),
    ).toBe("/Users/test/.codex-profiles/work/hooks.json");
  });

  test("should fall back to the default Codex home directory", () => {
    expect(
      resolveActiveCodexHooksPath({} as NodeJS.ProcessEnv, {
        homeDir: "/Users/test",
      }),
    ).toBe("/Users/test/.codex/hooks.json");
  });
});

describe("getCodexHookSettingsContent", () => {
  test("should wire UserPromptSubmit to the shared notify runner", () => {
    const settings = JSON.parse(
      getCodexHookSettingsContent("/tmp/zmux-notify.js", "/usr/local/bin/node", "linux"),
    ) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };

    expect(settings.hooks.UserPromptSubmit).toEqual([
      {
        hooks: [
          {
            command: "ELECTRON_RUN_AS_NODE=1 '/usr/local/bin/node' '/tmp/zmux-notify.js'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.Stop).toBeUndefined();
  });
});

describe("getCodexHookCommand", () => {
  test("should force Node mode for non-Windows Codex hook commands", () => {
    expect(getCodexHookCommand("/tmp/zmux-notify.js", "/usr/local/bin/node", "linux")).toBe(
      "ELECTRON_RUN_AS_NODE=1 '/usr/local/bin/node' '/tmp/zmux-notify.js'",
    );
  });
});

describe("mergeCodexHookSettingsContent", () => {
  test("should append the zmux hook without removing existing hooks", () => {
    const mergedSettings = JSON.parse(
      mergeCodexHookSettingsContent(
        JSON.stringify(
          {
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      command: "python3 ~/.codex/hooks/stop.py",
                      type: "command",
                    },
                  ],
                },
              ],
            },
          },
          null,
          2,
        ),
        "/tmp/zmux-notify.js",
        "/usr/local/bin/node",
        "linux",
      ),
    ) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };

    expect(mergedSettings.hooks.Stop).toHaveLength(1);
    expect(mergedSettings.hooks.Stop?.[0]?.hooks?.[0]?.command).toBe(
      "python3 ~/.codex/hooks/stop.py",
    );
    expect(mergedSettings.hooks.UserPromptSubmit?.[0]?.hooks?.[0]?.command).toBe(
      "ELECTRON_RUN_AS_NODE=1 '/usr/local/bin/node' '/tmp/zmux-notify.js'",
    );
  });

  test("should avoid duplicating the same zmux hook command", () => {
    const mergedContent = mergeCodexHookSettingsContent(
      getCodexHookSettingsContent("/tmp/zmux-notify.js", "/usr/local/bin/node", "linux"),
      "/tmp/zmux-notify.js",
      "/usr/local/bin/node",
      "linux",
    );
    const mergedSettings = JSON.parse(mergedContent) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };

    expect(mergedSettings.hooks.UserPromptSubmit).toHaveLength(1);
    expect(mergedSettings.hooks.Stop).toBeUndefined();
  });

  test("should replace stale zmux commands and remove the old zmux Stop hook", () => {
    const mergedContent = mergeCodexHookSettingsContent(
      JSON.stringify(
        {
          hooks: {
            Stop: [
              {
                hooks: [
                  {
                    command: "'/usr/local/bin/node' '/tmp/zmux-notify.js'",
                    type: "command",
                  },
                ],
              },
            ],
            UserPromptSubmit: [
              {
                hooks: [
                  {
                    command: "'/usr/local/bin/node' '/tmp/zmux-notify.js'",
                    type: "command",
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      ),
      "/tmp/zmux-notify.js",
      "/usr/local/bin/node",
      "linux",
    );
    const mergedSettings = JSON.parse(mergedContent) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };

    expect(mergedSettings.hooks.Stop).toBeUndefined();
    expect(mergedSettings.hooks.UserPromptSubmit).toEqual([
      {
        hooks: [
          {
            command: "ELECTRON_RUN_AS_NODE=1 '/usr/local/bin/node' '/tmp/zmux-notify.js'",
            type: "command",
          },
        ],
      },
    ]);
  });

  test("should collapse old versioned zmux hook commands to the current runner", () => {
    const mergedContent = mergeCodexHookSettingsContent(
      JSON.stringify(
        {
          hooks: {
            UserPromptSubmit: [
              {
                hooks: [
                  {
                    command:
                      "ELECTRON_RUN_AS_NODE=1 '/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin)' '/Users/test/.vscode/extensions/maddada.zmux-4.1.0/out/extension/agent-shell-notify-runner.js'",
                    type: "command",
                  },
                ],
              },
              {
                hooks: [
                  {
                    command:
                      "ELECTRON_RUN_AS_NODE=1 '/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin)' '/Users/test/.vscode/extensions/maddada.zmux-4.2.0/out/extension/agent-shell-notify-runner.js'",
                    type: "command",
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      ),
      "/Users/test/.vscode/extensions/maddada.zmux-4.3.1/out/extension/agent-shell-notify-runner.js",
      "/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin)",
      "darwin",
    );
    const mergedSettings = JSON.parse(mergedContent) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };

    expect(mergedSettings.hooks.UserPromptSubmit).toEqual([
      {
        hooks: [
          {
            command:
              "ELECTRON_RUN_AS_NODE=1 '/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin)' '/Users/test/.vscode/extensions/maddada.zmux-4.3.1/out/extension/agent-shell-notify-runner.js'",
            type: "command",
          },
        ],
      },
    ]);
  });
});
