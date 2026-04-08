import { describe, expect, test } from "vitest";
import {
  buildSessionTitleTooltip,
  getSessionTitleTooltipOptions,
  getSessionTooltipSecondaryText,
} from "./session-card-content";

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

describe("getSessionTitleTooltipOptions", () => {
  test("should force the same title tooltip content to appear when requested", () => {
    expect(
      getSessionTitleTooltipOptions({
        alwaysShowTitleTooltip: true,
        headingText: "A very long session title",
        titleTooltip: "A very long session title",
      }),
    ).toEqual({
      tooltip: "A very long session title",
      tooltipWhen: "always",
    });
  });

  test("should keep plain title-only tooltips overflow-triggered by default", () => {
    expect(
      getSessionTitleTooltipOptions({
        alwaysShowTitleTooltip: false,
        headingText: "A very long session title",
        titleTooltip: "A very long session title",
      }),
    ).toEqual({
      tooltip: undefined,
      tooltipWhen: "overflow",
    });
  });
});

describe("getSessionTooltipSecondaryText", () => {
  test("should omit agent-only detail labels from tooltips", () => {
    expect(
      getSessionTooltipSecondaryText({
        activityLabel: undefined,
        agentIcon: "codex",
        detail: "OpenAI Codex",
        terminalTitle: undefined,
      }),
    ).toBeUndefined();
  });

  test("should strip agent prefixes from tooltip detail text", () => {
    expect(
      getSessionTooltipSecondaryText({
        activityLabel: undefined,
        agentIcon: "claude",
        detail: "Claude Code / visual diff / attention state",
        terminalTitle: undefined,
      }),
    ).toBe("visual diff / attention state");
  });

  test("should fall back to non-agent activity labels", () => {
    expect(
      getSessionTooltipSecondaryText({
        activityLabel: "Needs attention",
        agentIcon: "codex",
        detail: "OpenAI Codex",
        terminalTitle: undefined,
      }),
    ).toBe("Needs attention");
  });
});
