import { describe, expect, test } from "vitest";
import {
  buildSessionTitleTooltip,
  formatSessionHeadingText,
  getSessionCardTitleTooltip,
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

describe("getSessionCardTitleTooltip", () => {
  test("should always show the tooltip for unsynced user titles", () => {
    expect(
      getSessionCardTitleTooltip({
        session: {
          activityLabel: undefined,
          agentIcon: undefined,
          alias: "Session 1",
          detail: undefined,
          isPrimaryTitleTerminalTitle: false,
          primaryTitle: "A very long session title",
          sessionNumber: undefined,
          terminalTitle: undefined,
        },
        showDebugSessionNumbers: false,
      }),
    ).toEqual({
      headingText: "A very long session title ∗",
      tooltip: "A very long session title ∗ (Unsynced title)",
      tooltipWhen: "always",
    });
  });

  test("should include the unsynced label ahead of other tooltip metadata", () => {
    expect(
      getSessionCardTitleTooltip({
        session: {
          activityLabel: undefined,
          agentIcon: "codex",
          alias: "Session 1",
          detail: "OpenAI Codex / repo sweep",
          isPrimaryTitleTerminalTitle: false,
          primaryTitle: "A very long session title",
          sessionNumber: 3,
          terminalTitle: undefined,
        },
        showDebugSessionNumbers: true,
      }),
    ).toEqual({
      headingText: "A very long session title ∗",
      tooltip: "A very long session title ∗ (Unsynced title)\nrepo sweep\nSession number: 3",
      tooltipWhen: "always",
    });
  });

  test("should stop showing the unsynced marker once the terminal title matches", () => {
    expect(
      getSessionCardTitleTooltip({
        session: {
          activityLabel: undefined,
          agentIcon: "codex",
          alias: "Session 1",
          detail: undefined,
          isPrimaryTitleTerminalTitle: false,
          primaryTitle: "A very long session title",
          sessionNumber: undefined,
          terminalTitle: "A very long session title",
        },
        showDebugSessionNumbers: false,
      }),
    ).toEqual({
      headingText: "A very long session title",
      tooltip: undefined,
      tooltipWhen: "overflow",
    });
  });
});

describe("formatSessionHeadingText", () => {
  test("should append the unsynced marker when the displayed title comes from the user title", () => {
    expect(
      formatSessionHeadingText({
        alias: "Session 1",
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Claude Code",
      }),
    ).toBe("Claude Code ∗");
  });

  test("should keep terminal-derived titles unmarked", () => {
    expect(
      formatSessionHeadingText({
        alias: "Session 1",
        isPrimaryTitleTerminalTitle: true,
        primaryTitle: "Bug Fix",
      }),
    ).toBe("Bug Fix");
  });

  test("should append the unsynced label in tooltip mode", () => {
    expect(
      formatSessionHeadingText({
        alias: "Session 1",
        includeUnsyncedTitleLabel: true,
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Bug Fix",
      }),
    ).toBe("Bug Fix ∗ (Unsynced title)");
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
