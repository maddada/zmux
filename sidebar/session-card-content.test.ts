import { describe, expect, test } from "vitest";
import { buildSessionTitleTooltip } from "./session-card-content";

describe("buildSessionTitleTooltip", () => {
  test("should collapse duplicate heading and secondary lines", () => {
    expect(
      buildSessionTitleTooltip({
        headingText: "Browser ignore",
        secondaryText: "Browser ignore",
      }),
    ).toBe("Browser ignore");
  });

  test("should keep unique metadata lines in order", () => {
    expect(
      buildSessionTitleTooltip({
        debugSessionNumberTooltip: "Session number: 02",
        headingText: "Browser ignore",
        secondaryText: "https://example.com",
      }),
    ).toBe("Browser ignore\nhttps://example.com\nSession number: 02");
  });

  test("should trim values before deduping", () => {
    expect(
      buildSessionTitleTooltip({
        debugSessionNumberTooltip: " Session number: 02 ",
        headingText: " Browser ignore ",
        secondaryText: "Browser ignore",
      }),
    ).toBe("Browser ignore\nSession number: 02");
  });
});
