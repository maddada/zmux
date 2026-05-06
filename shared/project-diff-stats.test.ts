import { describe, expect, test } from "vitest";
import {
  createDefaultSidebarProjectDiffStats,
  mergeSidebarProjectDiffStats,
  parseGitNumstatDiffStats,
  parseGitZeroDelimitedPaths,
  parseWcLineCountStdout,
} from "./project-diff-stats";

describe("parseGitNumstatDiffStats", () => {
  test("counts changed files and tracked line stats", () => {
    expect(parseGitNumstatDiffStats("9\t11\tsrc/app.ts\n-\t-\timage.png\n")).toEqual({
      additions: 9,
      deletions: 11,
      files: 2,
      isLoading: false,
      isRepo: true,
    });
  });
});

describe("parseGitZeroDelimitedPaths", () => {
  test("keeps spaces in untracked file paths", () => {
    expect(parseGitZeroDelimitedPaths("new file.ts\0nested/other.ts\0")).toEqual([
      "new file.ts",
      "nested/other.ts",
    ]);
  });
});

describe("parseWcLineCountStdout", () => {
  test("uses the total line when wc receives multiple files", () => {
    expect(parseWcLineCountStdout("       4 a.ts\n      10 b.ts\n      14 total\n")).toBe(14);
  });

  test("sums single-file chunks without a total row", () => {
    expect(parseWcLineCountStdout("       7 new file.ts\n")).toBe(7);
  });
});

describe("mergeSidebarProjectDiffStats", () => {
  test("combines tracked and untracked stats", () => {
    expect(
      mergeSidebarProjectDiffStats(parseGitNumstatDiffStats("1\t2\ttracked.ts\n"), {
        ...createDefaultSidebarProjectDiffStats(),
        additions: 5,
        files: 2,
        isRepo: true,
      }),
    ).toEqual({
      additions: 6,
      deletions: 2,
      files: 3,
      isLoading: false,
      isRepo: true,
    });
  });
});
