import { describe, expect, test } from "vite-plus/test";
import {
  coalesceWorkingStartedAtMs,
  getWorkingStartedAtMsFromText,
  parseWorkingForDurationMs,
} from "./t3-working-timer";

describe("parseWorkingForDurationMs", () => {
  test("should parse compact minute and second labels", () => {
    expect(parseWorkingForDurationMs("Working for 5m 12s")).toBe(312_000);
  });

  test("should parse mixed hour, minute, and second labels", () => {
    expect(parseWorkingForDurationMs("Working for 1h 5m 12s")).toBe(3_912_000);
  });

  test("should return undefined when no working timer is present", () => {
    expect(parseWorkingForDurationMs("Ready")).toBeUndefined();
  });
});

describe("getWorkingStartedAtMsFromText", () => {
  test("should derive a stable started-at timestamp from the timer text", () => {
    expect(
      getWorkingStartedAtMsFromText("Working for 4m 14s", Date.parse("2026-04-17T10:00:30.900Z")),
    ).toBe(Date.parse("2026-04-17T09:56:16.000Z"));
  });
});

describe("coalesceWorkingStartedAtMs", () => {
  test("should keep the previous timestamp when the next sample only jitters slightly", () => {
    expect(
      coalesceWorkingStartedAtMs({
        nextWorkingStartedAtMs: Date.parse("2026-04-17T09:56:16.000Z"),
        previousWorkingStartedAtMs: Date.parse("2026-04-17T09:56:15.000Z"),
      }),
    ).toBe(Date.parse("2026-04-17T09:56:15.000Z"));
  });

  test("should accept a new timestamp when the timer clearly restarted", () => {
    expect(
      coalesceWorkingStartedAtMs({
        nextWorkingStartedAtMs: Date.parse("2026-04-17T10:02:00.000Z"),
        previousWorkingStartedAtMs: Date.parse("2026-04-17T09:56:15.000Z"),
      }),
    ).toBe(Date.parse("2026-04-17T10:02:00.000Z"));
  });
});
