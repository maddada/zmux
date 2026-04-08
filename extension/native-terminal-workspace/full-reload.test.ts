import { describe, expect, test } from "vite-plus/test";
import { shouldSkipSessionForGroupFullReload } from "./full-reload";

describe("shouldSkipSessionForGroupFullReload", () => {
  test("should not skip idle sessions", () => {
    expect(shouldSkipSessionForGroupFullReload({ activity: "idle" })).toBe(false);
  });

  test("should skip sessions with a running indicator", () => {
    expect(shouldSkipSessionForGroupFullReload({ activity: "working" })).toBe(true);
  });

  test("should skip sessions with a done indicator", () => {
    expect(shouldSkipSessionForGroupFullReload({ activity: "attention" })).toBe(true);
  });
});
