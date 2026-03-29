import { describe, expect, test } from "vite-plus/test";
import {
  extractLatestTerminalTitleFromVtHistory,
  parseTerminalTitleFromOutputChunk,
} from "./terminal-workspace-history";

describe("terminal title history parsing", () => {
  test("should extract the latest terminal title from vt history", () => {
    const history =
      "\u001b]0;Claude Code\u0007hello\u001b]2;Codex \u2838\u0007world";

    expect(extractLatestTerminalTitleFromVtHistory(history)).toBe("Codex ⠸");
  });

  test("should parse a split osc title sequence across output chunks", () => {
    const firstChunk = parseTerminalTitleFromOutputChunk("", "\u001b]0;Cod");
    expect(firstChunk.title).toBeUndefined();
    expect(firstChunk.carryover).toBe("\u001b]0;Cod");

    const secondChunk = parseTerminalTitleFromOutputChunk(firstChunk.carryover, "ex \u2838\u0007");
    expect(secondChunk.title).toBe("Codex ⠸");
    expect(secondChunk.carryover).toBe("");
  });

  test("should preserve a trailing escape between chunks", () => {
    const firstChunk = parseTerminalTitleFromOutputChunk("", "\u001b");
    expect(firstChunk.title).toBeUndefined();
    expect(firstChunk.carryover).toBe("\u001b");

    const secondChunk = parseTerminalTitleFromOutputChunk(
      firstChunk.carryover,
      "]2;Claude Code ·\u0007",
    );
    expect(secondChunk.title).toBe("Claude Code ·");
    expect(secondChunk.carryover).toBe("");
  });
});
