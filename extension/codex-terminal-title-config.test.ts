import * as path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  resolveActiveCodexConfigPath,
  setCodexWelcomeStatusLine,
  setCodexWelcomeTerminalTitle,
} from "./codex-terminal-title-config";

describe("resolveActiveCodexConfigPath", () => {
  test("should prefer CODEX_HOME when it is set", () => {
    expect(
      resolveActiveCodexConfigPath({
        CODEX_HOME: "/Users/test/.codex-profiles/personal",
      } as NodeJS.ProcessEnv),
    ).toBe("/Users/test/.codex-profiles/personal/config.toml");
  });

  test("should resolve the default config path correctly on Windows", () => {
    expect(
      resolveActiveCodexConfigPath({} as NodeJS.ProcessEnv, {
        homeDir: "C:\\Users\\test",
        pathApi: path.win32,
      }),
    ).toBe("C:\\Users\\test\\.codex\\config.toml");
  });
});

describe("setCodexWelcomeTerminalTitle", () => {
  test("should add a tui section when the config is empty", () => {
    expect(setCodexWelcomeTerminalTitle("")).toBe(
      ["[tui]", 'terminal_title = ["spinner", "thread"]', ""].join("\n"),
    );
  });

  test("should replace the current tui terminal title setting", () => {
    expect(
      setCodexWelcomeTerminalTitle(
        [
          'model = "gpt-5.4"',
          "",
          "[tui]",
          'theme = "inspired-github"',
          'terminal_title = ["thread"]',
          'status_line = ["model"]',
          "",
          '[projects."/workspace"]',
          'trust_level = "trusted"',
          "",
        ].join("\n"),
      ),
    ).toBe(
      [
        'model = "gpt-5.4"',
        "",
        "[tui]",
        'theme = "inspired-github"',
        'terminal_title = ["spinner", "thread"]',
        'status_line = ["model"]',
        "",
        '[projects."/workspace"]',
        'trust_level = "trusted"',
        "",
      ].join("\n"),
    );
  });

  test("should insert the terminal title when tui exists without it", () => {
    expect(
      setCodexWelcomeTerminalTitle(
        ['model = "gpt-5.4"', "", "[tui]", 'theme = "inspired-github"', ""].join("\n"),
      ),
    ).toBe(
      [
        'model = "gpt-5.4"',
        "",
        "[tui]",
        'theme = "inspired-github"',
        'terminal_title = ["spinner", "thread"]',
        "",
      ].join("\n"),
    );
  });

  test("should only touch terminal_title inside the tui section", () => {
    expect(
      setCodexWelcomeTerminalTitle(
        [
          "[profiles.deep-review]",
          'terminal_title = ["thread"]',
          'status_line = ["model"]',
          "",
          "[tui]",
          'theme = "dark"',
          "",
        ].join("\n"),
      ),
    ).toBe(
      [
        "[profiles.deep-review]",
        'terminal_title = ["thread"]',
        'status_line = ["model"]',
        "",
        "[tui]",
        'theme = "dark"',
        'terminal_title = ["spinner", "thread"]',
        "",
      ].join("\n"),
    );
  });

  test("should preserve an existing status line when setting terminal title", () => {
    expect(
      setCodexWelcomeTerminalTitle(
        [
          'model = "gpt-5.4"',
          "",
          "[tui]",
          'theme = "inspired-github"',
          'status_line = ["model"]',
          "",
        ].join("\n"),
      ),
    ).toBe(
      [
        'model = "gpt-5.4"',
        "",
        "[tui]",
        'theme = "inspired-github"',
        'status_line = ["model"]',
        'terminal_title = ["spinner", "thread"]',
        "",
      ].join("\n"),
    );
  });
});

describe("setCodexWelcomeStatusLine", () => {
  test("should add a tui section when the config is empty", () => {
    expect(setCodexWelcomeStatusLine("")).toBe(
      [
        "[tui]",
        'status_line = ["thread-title", "model-with-reasoning", "current-dir", "context-usage", "used-tokens", "weekly-limit"]',
        "",
      ].join("\n"),
    );
  });

  test("should replace the current tui status line setting", () => {
    expect(
      setCodexWelcomeStatusLine(
        [
          'model = "gpt-5.4"',
          "",
          "[tui]",
          'theme = "inspired-github"',
          'terminal_title = ["thread"]',
          'status_line = ["model"]',
          "",
        ].join("\n"),
      ),
    ).toBe(
      [
        'model = "gpt-5.4"',
        "",
        "[tui]",
        'theme = "inspired-github"',
        'terminal_title = ["thread"]',
        'status_line = ["thread-title", "model-with-reasoning", "current-dir", "context-usage", "used-tokens", "weekly-limit"]',
        "",
      ].join("\n"),
    );
  });

  test("should insert the status line when tui exists without it", () => {
    expect(
      setCodexWelcomeStatusLine(
        ['model = "gpt-5.4"', "", "[tui]", 'theme = "inspired-github"', ""].join("\n"),
      ),
    ).toBe(
      [
        'model = "gpt-5.4"',
        "",
        "[tui]",
        'theme = "inspired-github"',
        'status_line = ["thread-title", "model-with-reasoning", "current-dir", "context-usage", "used-tokens", "weekly-limit"]',
        "",
      ].join("\n"),
    );
  });

  test("should only touch status_line inside the tui section", () => {
    expect(
      setCodexWelcomeStatusLine(
        [
          "[profiles.deep-review]",
          'terminal_title = ["thread"]',
          'status_line = ["model"]',
          "",
          "[tui]",
          'theme = "dark"',
          "",
        ].join("\n"),
      ),
    ).toBe(
      [
        "[profiles.deep-review]",
        'terminal_title = ["thread"]',
        'status_line = ["model"]',
        "",
        "[tui]",
        'theme = "dark"',
        'status_line = ["thread-title", "model-with-reasoning", "current-dir", "context-usage", "used-tokens", "weekly-limit"]',
        "",
      ].join("\n"),
    );
  });

  test("should preserve an existing terminal title when setting status line", () => {
    expect(
      setCodexWelcomeStatusLine(
        [
          'model = "gpt-5.4"',
          "",
          "[tui]",
          'theme = "inspired-github"',
          'terminal_title = ["spinner", "thread"]',
          "",
        ].join("\n"),
      ),
    ).toBe(
      [
        'model = "gpt-5.4"',
        "",
        "[tui]",
        'theme = "inspired-github"',
        'terminal_title = ["spinner", "thread"]',
        'status_line = ["thread-title", "model-with-reasoning", "current-dir", "context-usage", "used-tokens", "weekly-limit"]',
        "",
      ].join("\n"),
    );
  });
});
