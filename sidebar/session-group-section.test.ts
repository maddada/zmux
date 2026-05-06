import { describe, expect, test } from "vitest";
import {
  formatProjectEditorButtonLabel,
  getEmptyBrowserGroupExpandTooltip,
  shouldFocusGroupOnHeaderActivation,
} from "./session-group-section";

describe("getEmptyBrowserGroupExpandTooltip", () => {
  test("should block expanding an empty collapsed browser group", () => {
    expect(
      getEmptyBrowserGroupExpandTooltip({
        browserTabCount: 0,
        isBrowserGroup: true,
        isCollapsed: true,
      }),
    ).toBe("No browser tabs open");
  });

  test("should allow non-empty browser groups to expand normally", () => {
    expect(
      getEmptyBrowserGroupExpandTooltip({
        browserTabCount: 1,
        isBrowserGroup: true,
        isCollapsed: true,
      }),
    ).toBeUndefined();
  });

  test("should allow workspace groups to expand normally", () => {
    expect(
      getEmptyBrowserGroupExpandTooltip({
        browserTabCount: 0,
        isBrowserGroup: false,
        isCollapsed: true,
      }),
    ).toBeUndefined();
  });
});

describe("shouldFocusGroupOnHeaderActivation", () => {
  test("focuses empty combined project headers", () => {
    expect(
      shouldFocusGroupOnHeaderActivation({
        hasProjectContext: true,
        isActive: false,
        shouldSelectEmptyProject: true,
      }),
    ).toBe(true);
  });

  test("focuses inactive combined project headers with sessions", () => {
    expect(
      shouldFocusGroupOnHeaderActivation({
        hasProjectContext: true,
        isActive: false,
        shouldSelectEmptyProject: false,
      }),
    ).toBe(true);
  });

  test("does not refocus the active combined project header", () => {
    expect(
      shouldFocusGroupOnHeaderActivation({
        hasProjectContext: true,
        isActive: true,
        shouldSelectEmptyProject: false,
      }),
    ).toBe(false);
  });

  test("keeps separated workspace group headers collapse-only", () => {
    expect(
      shouldFocusGroupOnHeaderActivation({
        hasProjectContext: false,
        isActive: false,
        shouldSelectEmptyProject: false,
      }),
    ).toBe(false);
  });
});

describe("formatProjectEditorButtonLabel", () => {
  test("formats the compact files and changed-lines summary", () => {
    expect(
      formatProjectEditorButtonLabel({
        additions: 9,
        deletions: 11,
        files: 1,
        isLoading: false,
        isRepo: true,
      }),
    ).toBe("1 [+9 | -11]");
  });
});
