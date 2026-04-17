import { describe, expect, test, vi } from "vite-plus/test";
import {
  GENERATED_SESSION_TITLE_MAX_LENGTH,
  GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH,
  SESSION_RENAME_SUMMARY_THRESHOLD,
  resolveSessionRenameTitleFromPrompt,
  resolveSessionRenameTitle,
  shouldSummarizeSessionRenameTitle,
} from "./session-title-generation";

describe("shouldSummarizeSessionRenameTitle", () => {
  test("should skip summarization at the threshold", () => {
    expect(shouldSummarizeSessionRenameTitle("x".repeat(SESSION_RENAME_SUMMARY_THRESHOLD))).toBe(
      false,
    );
  });

  test("should summarize when the trimmed title exceeds the threshold", () => {
    expect(
      shouldSummarizeSessionRenameTitle(`  ${"x".repeat(SESSION_RENAME_SUMMARY_THRESHOLD + 1)} `),
    ).toBe(true);
  });
});

describe("resolveSessionRenameTitle", () => {
  test("should return the trimmed title when summarization is not needed", async () => {
    const generateTitle = vi.fn(async () => "Ignored");

    await expect(
      resolveSessionRenameTitle(
        {
          cwd: "/workspace",
          settings: { customCommand: "", provider: "codex" },
          title: "  Tidy name  ",
        },
        generateTitle,
      ),
    ).resolves.toBe("Tidy name");

    expect(generateTitle).not.toHaveBeenCalled();
  });

  test("should generate a session title when the title is long", async () => {
    const generateTitle = vi.fn(async () => "Fix sidebar rename");

    await expect(
      resolveSessionRenameTitle(
        {
          cwd: "/workspace",
          settings: { customCommand: "", provider: "claude" },
          title: "Paste this whole paragraph about the bug and the intended fix please",
        },
        generateTitle,
      ),
    ).resolves.toBe("Fix sidebar rename");

    expect(generateTitle).toHaveBeenCalledWith({
      cwd: "/workspace",
      settings: { customCommand: "", provider: "claude" },
      sourceText: "Paste this whole paragraph about the bug and the intended fix please",
    });
  });

  test("should send only the first 250 characters to the generator", async () => {
    const generateTitle = vi.fn(async () => "Fix sidebar rename");
    const title = `  ${"x".repeat(GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH + 25)}  `;

    await expect(
      resolveSessionRenameTitle(
        {
          cwd: "/workspace",
          settings: { customCommand: "", provider: "claude" },
          title,
        },
        generateTitle,
      ),
    ).resolves.toBe("Fix sidebar rename");

    expect(generateTitle).toHaveBeenCalledWith({
      cwd: "/workspace",
      settings: { customCommand: "", provider: "claude" },
      sourceText: "x".repeat(GENERATED_SESSION_TITLE_SOURCE_MAX_LENGTH),
    });
  });

  test("should expose a generated title max length under the summarize threshold", () => {
    expect(GENERATED_SESSION_TITLE_MAX_LENGTH).toBeLessThan(SESSION_RENAME_SUMMARY_THRESHOLD);
  });
});

describe("resolveSessionRenameTitleFromPrompt", () => {
  test("should always generate a session title from the first prompt text", async () => {
    const generateTitle = vi.fn(async () => "Project overview and improvements");

    await expect(
      resolveSessionRenameTitleFromPrompt(
        {
          cwd: "/workspace",
          prompt: "what's this project about? and how can we improve it",
          settings: { customCommand: "", provider: "codex" },
        },
        generateTitle,
      ),
    ).resolves.toBe("Project overview and improvements");

    expect(generateTitle).toHaveBeenCalledWith({
      cwd: "/workspace",
      settings: { customCommand: "", provider: "codex" },
      sourceText: "what's this project about? and how can we improve it",
    });
  });
});
