import { describe, expect, test } from "vite-plus/test";
import {
  buildGitTextGenerationShellCommand,
  parseGeneratedCommitMessageText,
  parseGeneratedPrContentText,
  parseGeneratedSessionTitleText,
} from "./text-generation-utils";

describe("buildGitTextGenerationShellCommand", () => {
  test("should build the pinned codex command for commit messages at medium effort", () => {
    expect(
      buildGitTextGenerationShellCommand(
        { customCommand: "", provider: "codex" },
        "prompt text",
        "/tmp/commitmessage.txt",
        "commit-message",
        "darwin",
      ),
    ).toBe(`exec codex -m gpt-5.4-mini -c 'model_reasoning_effort="medium"' exec -`);
  });

  test("should build the pinned claude command for pull requests at medium effort", () => {
    expect(
      buildGitTextGenerationShellCommand(
        { customCommand: "", provider: "claude" },
        "prompt text",
        "/tmp/commitmessage.txt",
        "pull-request",
        "darwin",
      ),
    ).toBe("exec claude --model haiku --effort medium -p 'prompt text'");
  });

  test("should keep session title generation on low effort", () => {
    expect(
      buildGitTextGenerationShellCommand(
        { customCommand: "", provider: "codex" },
        "prompt text",
        "/tmp/sessiontitle.txt",
        "session-title",
        "darwin",
      ),
    ).toBe(`exec codex -m gpt-5.4-mini -c 'model_reasoning_effort="low"' exec -`);
  });

  test("should omit exec for codex when running through windows powershell", () => {
    expect(
      buildGitTextGenerationShellCommand(
        { customCommand: "", provider: "codex" },
        "prompt text",
        "C:\\temp\\sessiontitle.txt",
        "session-title",
        "win32",
      ),
    ).toBe(`codex -m gpt-5.4-mini -c 'model_reasoning_effort="low"' exec -`);
  });

  test("should expand custom command placeholders", () => {
    expect(
      buildGitTextGenerationShellCommand(
        {
          customCommand: "my-generator --out {outputFile} --prompt {prompt}",
          provider: "custom",
        },
        "prompt text",
        "/tmp/commitmessage.txt",
        "commit-message",
        "darwin",
      ),
    ).toBe("my-generator --out '/tmp/commitmessage.txt' --prompt 'prompt text'");
  });

  test("should escape custom command placeholders for windows powershell", () => {
    expect(
      buildGitTextGenerationShellCommand(
        {
          customCommand: "my-generator --out {outputFile} --prompt {prompt}",
          provider: "custom",
        },
        "prompt it's long",
        "C:\\temp\\session title.txt",
        "session-title",
        "win32",
      ),
    ).toBe("my-generator --out 'C:\\temp\\session title.txt' --prompt 'prompt it''s long'");
  });
});

describe("parseGeneratedCommitMessageText", () => {
  test("should split the subject and body", () => {
    expect(
      parseGeneratedCommitMessageText(`feat(git): Improve commit message generation

- Add explicit provider settings for Claude and Codex.
- Read generated output from a temp file before cleanup.`),
    ).toEqual({
      body: [
        "- Add explicit provider settings for Claude and Codex.",
        "- Read generated output from a temp file before cleanup.",
      ].join("\n"),
      subject: "feat(git): Improve commit message generation",
    });
  });

  test("should preserve long commit subjects", () => {
    expect(
      parseGeneratedCommitMessageText(`feat(changes): Add chat history extension and workspace bridge integration

- Add a bridge between the workspace panel and chat history state.`),
    ).toEqual({
      body: "- Add a bridge between the workspace panel and chat history state.",
      subject: "feat(changes): Add chat history extension and workspace bridge integration",
    });
  });

  test("should strip markdown fences", () => {
    expect(
      parseGeneratedCommitMessageText(`\`\`\`
fix(git): Handle empty custom command

- Show a clear error when the provider is custom and the command is missing.
\`\`\``),
    ).toEqual({
      body: "- Show a clear error when the provider is custom and the command is missing.",
      subject: "fix(git): Handle empty custom command",
    });
  });
});

describe("parseGeneratedPrContentText", () => {
  test("should split the title and body", () => {
    expect(
      parseGeneratedPrContentText(`Improve git text generation settings

## Summary
- Add explicit Claude and Codex settings.

## Testing
- pnpm exec tsc -p ./tsconfig.extension.json --noEmit`),
    ).toEqual({
      body: [
        "## Summary",
        "- Add explicit Claude and Codex settings.",
        "",
        "## Testing",
        "- pnpm exec tsc -p ./tsconfig.extension.json --noEmit",
      ].join("\n"),
      title: "Improve git text generation settings",
    });
  });
});

describe("parseGeneratedSessionTitleText", () => {
  test("should read the first non-empty line", () => {
    expect(
      parseGeneratedSessionTitleText(`

Polish sidebar rename flow
Include nothing else
`),
    ).toBe("Polish sidebar rename");
  });

  test("should strip wrapping quotes and punctuation", () => {
    expect(parseGeneratedSessionTitleText(`"Fix pasted rename summaries."`)).toBe(
      "Fix pasted rename",
    );
  });

  test("should clamp long single words to under twenty five characters", () => {
    expect(parseGeneratedSessionTitleText("supercalifragilisticexpialidocious")).toBe(
      "supercalifragilisticexp",
    );
  });
});
