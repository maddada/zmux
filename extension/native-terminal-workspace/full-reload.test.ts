import { describe, expect, test } from "vite-plus/test";
import { shouldSkipSessionForGroupFullReload } from "./full-reload";

describe("shouldSkipSessionForGroupFullReload", () => {
  test("should not skip idle sessions", () => {
    expect(shouldSkipSessionForGroupFullReload({ activity: "idle", isSleeping: false })).toBe(
      false,
    );
  });

  test("should skip sleeping sessions", () => {
    expect(shouldSkipSessionForGroupFullReload({ activity: "idle", isSleeping: true })).toBe(true);
  });

  test("should skip sessions with a running indicator", () => {
    expect(shouldSkipSessionForGroupFullReload({ activity: "working", isSleeping: false })).toBe(
      true,
    );
  });

  test("should skip sessions with a done indicator", () => {
    expect(shouldSkipSessionForGroupFullReload({ activity: "attention", isSleeping: false })).toBe(
      true,
    );
  });
});
