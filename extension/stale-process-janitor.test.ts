import { describe, expect, test, vi } from "vite-plus/test";
import { parseUnixProcessList, selectStaleVsmuxProcessIds } from "./stale-process-janitor";

vi.mock("vscode", () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(() => false),
    })),
  },
}));

describe("parseUnixProcessList", () => {
  test("should parse pid, ppid, and full command lines", () => {
    expect(
      parseUnixProcessList(
        [
          "123 1 node /Users/test/.vscode/extensions/maddada.zmux-4.4.1/out/extension/agent-shell-wrapper-runner.js",
          "456 123 /bin/zsh -lc codex",
        ].join("\n"),
      ),
    ).toEqual([
      {
        command:
          "node /Users/test/.vscode/extensions/maddada.zmux-4.4.1/out/extension/agent-shell-wrapper-runner.js",
        pid: 123,
        ppid: 1,
      },
      {
        command: "/bin/zsh -lc codex",
        pid: 456,
        ppid: 123,
      },
    ]);
  });
});

describe("selectStaleVsmuxProcessIds", () => {
  test("should leave current-version orphaned helpers alone so timeout-based resume still works", () => {
    const pids = selectStaleVsmuxProcessIds(
      [
        {
          command:
            "node /Users/test/.vscode/extensions/maddada.zmux-4.4.1/out/extension/agent-shell-wrapper-runner.js",
          pid: 101,
          ppid: 1,
        },
        {
          command:
            "opencode serve zmux_AGENT=opencode OPENCODE_CONFIG_DIR=/Users/test/Library/Application Support/Code/User/globalStorage/maddada.zmux/terminal-host-daemon/agent-shell-integration/hooks/opencode",
          pid: 102,
          ppid: 1,
        },
        {
          command:
            "node /Users/test/.vscode/extensions/maddada.zmux-4.4.1/out/extension/agent-shell-wrapper-runner.js",
          pid: 103,
          ppid: 900,
        },
      ],
      {
        currentExtensionPath: "/Users/test/.vscode/extensions/maddada.zmux-4.4.1",
        currentPid: 900,
        globalStoragePath:
          "/Users/test/Library/Application Support/Code/User/globalStorage/maddada.zmux",
      },
    );

    expect(pids).toEqual([]);
  });

  test("should select helpers from older extension installs even when not orphaned", () => {
    const pids = selectStaleVsmuxProcessIds(
      [
        {
          command:
            "node /Users/test/.vscode/extensions/maddada.zmux-4.3.1/out/extension/agent-shell-wrapper-runner.js",
          pid: 201,
          ppid: 777,
        },
      ],
      {
        currentExtensionPath: "/Users/test/.vscode/extensions/maddada.zmux-4.4.1",
        currentPid: 900,
        globalStoragePath:
          "/Users/test/Library/Application Support/Code/User/globalStorage/maddada.zmux",
      },
    );

    expect(pids).toEqual([201]);
  });

  test("should select orphaned old-version owned descendants", () => {
    const pids = selectStaleVsmuxProcessIds(
      [
        {
          command:
            "opencode serve zmux_AGENT=opencode OPENCODE_CONFIG_DIR=/Users/test/Library/Application Support/Code/User/globalStorage/maddada.zmux/terminal-host-daemon /Users/test/.vscode/extensions/maddada.zmux-4.3.1/out/extension/agent-shell-wrapper-runner.js",
          pid: 301,
          ppid: 1,
        },
      ],
      {
        currentExtensionPath: "/Users/test/.vscode/extensions/maddada.zmux-4.4.1",
        currentPid: 900,
        globalStoragePath:
          "/Users/test/Library/Application Support/Code/User/globalStorage/maddada.zmux",
      },
    );

    expect(pids).toEqual([301]);
  });

  test("should ignore the current extension host and live current-version helpers", () => {
    const pids = selectStaleVsmuxProcessIds(
      [
        {
          command:
            "node /Users/test/.vscode/extensions/maddada.zmux-4.4.1/out/extension/agent-shell-wrapper-runner.js",
          pid: 900,
          ppid: 1,
        },
        {
          command:
            "node /Users/test/.vscode/extensions/maddada.zmux-4.4.1/out/extension/agent-shell-wrapper-runner.js",
          pid: 901,
          ppid: 900,
        },
      ],
      {
        currentExtensionPath: "/Users/test/.vscode/extensions/maddada.zmux-4.4.1",
        currentPid: 900,
        globalStoragePath:
          "/Users/test/Library/Application Support/Code/User/globalStorage/maddada.zmux",
      },
    );

    expect(pids).toEqual([]);
  });

  test("should preserve reusable helper pids from janitor cleanup", () => {
    const pids = selectStaleVsmuxProcessIds(
      [
        {
          command:
            "node /Users/test/.vscode/extensions/maddada.zmux-4.3.1/out/extension/agent-shell-notify-runner.js",
          pid: 1001,
          ppid: 1,
        },
        {
          command:
            "node /Users/test/.vscode/extensions/maddada.zmux-4.3.1/out/extension/agent-shell-wrapper-runner.js",
          pid: 1002,
          ppid: 1,
        },
      ],
      {
        currentExtensionPath: "/Users/test/.vscode/extensions/maddada.zmux-4.4.1",
        currentPid: 900,
        globalStoragePath:
          "/Users/test/Library/Application Support/Code/User/globalStorage/maddada.zmux",
        reusableDaemonProcessIds: new Set([1001]),
      },
    );

    expect(pids).toEqual([1002]);
  });
});
