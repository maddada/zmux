import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  buildSessionTitleTooltip,
  formatSessionHeadingText,
  getSessionCardTitleTooltip,
  getSessionTitleTooltipOptions,
  getSessionTooltipSecondaryText,
  SessionCardContent,
  SessionFloatingAgentIcon,
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
    ).toBe("Browser ignore\n\nhttps://example.com\n\nSession number: 02");
  });

  test("should separate metadata block lines with blank lines", () => {
    expect(
      buildSessionTitleTooltip({
        debugSessionNumberTooltip: "Session number: 02",
        headingText: "Browser ignore",
        secondaryText: "https://example.com\nzmx session: zmux-session-1",
      }),
    ).toBe(
      "Browser ignore\n\nhttps://example.com\n\nzmx session: zmux-session-1\n\nSession number: 02",
    );
  });

  test("should trim values before deduping", () => {
    expect(
      buildSessionTitleTooltip({
        debugSessionNumberTooltip: " Session number: 02 ",
        headingText: " Browser ignore ",
        secondaryText: "Browser ignore",
      }),
    ).toBe("Browser ignore\n\nSession number: 02");
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
      headingText: "∗ A very long session title",
      tooltip: "∗ A very long session title (Unsynced title)",
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
          sessionNumber: "3",
          terminalTitle: undefined,
        },
        showDebugSessionNumbers: true,
      }),
    ).toEqual({
      headingText: "∗ A very long session title",
      tooltip: "∗ A very long session title (Unsynced title)\n\nrepo sweep\n\nSession number: 3",
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

  test("should swap ghost placeholder card titles to the non-persistent terminal session title", () => {
    expect(
      getSessionCardTitleTooltip({
        session: {
          activityLabel: undefined,
          agentIcon: undefined,
          alias: "Session 1",
          detail: undefined,
          isPrimaryTitleTerminalTitle: true,
          primaryTitle: "👻",
          sessionNumber: undefined,
          terminalTitle: "👻",
        },
        showDebugSessionNumbers: false,
      }),
    ).toEqual({
      headingText: "∗ Terminal Session",
      tooltip: "∗ Terminal Session (Unsynced title)",
      tooltipWhen: "always",
    });
  });

  test("should keep browser titles unmarked in the browser area", () => {
    expect(
      getSessionCardTitleTooltip({
        session: {
          activityLabel: undefined,
          agentIcon: "browser",
          alias: "Docs",
          detail: "https://example.com",
          kind: "browser",
          isPrimaryTitleTerminalTitle: false,
          primaryTitle: "Project docs",
          sessionKind: "browser",
          sessionNumber: undefined,
          terminalTitle: undefined,
        },
        showDebugSessionNumbers: false,
      }),
    ).toEqual({
      headingText: "Project docs",
      tooltip: "Project docs\n\nhttps://example.com",
      tooltipWhen: "always",
    });
  });

  test("should include persistence provider session names in the tooltip", () => {
    expect(
      getSessionCardTitleTooltip({
        session: {
          activityLabel: undefined,
          agentIcon: "codex",
          alias: "Session 1",
          detail: "OpenAI Codex",
          isPrimaryTitleTerminalTitle: true,
          primaryTitle: "Fix restore",
          sessionNumber: undefined,
          sessionPersistenceName: "zmux-session-1",
          sessionPersistenceProvider: "zmx",
          terminalTitle: undefined,
        },
        showDebugSessionNumbers: false,
      }),
    ).toEqual({
      headingText: "Fix restore",
      tooltip: "Fix restore\n\nzmx session: zmux-session-1",
      tooltipWhen: "always",
    });
  });
});

describe("SessionFloatingAgentIcon", () => {
  test("should render a browser favicon when the browser session has one", () => {
    const faviconDataUrl = "data:image/png;base64,ZmF2aWNvbg==";
    const markup = renderToStaticMarkup(
      createElement(SessionFloatingAgentIcon, {
        agentIcon: "browser",
        faviconDataUrl,
      }),
    );

    expect(markup).toContain('data-icon-variant="favicon"');
    expect(markup).toContain(`src="${faviconDataUrl}"`);
  });

  test("should render the browser fallback icon when no favicon is available", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionFloatingAgentIcon, {
        agentIcon: "browser",
      }),
    );

    expect(markup).toContain('data-agent-icon="browser"');
    expect(markup).not.toContain("data-icon-variant");
  });

  test("should render a subtle persistence provider badge when a provider session is stored", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionFloatingAgentIcon, {
        agentIcon: "codex",
        sessionPersistenceName: "zmux-session-1",
        sessionPersistenceProvider: "zmx",
      }),
    );

    expect(markup).toContain("session-persistence-provider-badge");
    expect(markup).toContain('data-provider="zmx"');
    expect(markup).toContain(">z</span>");
  });

  test("should render the persistence badge as soon as the provider is known", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionFloatingAgentIcon, {
        agentIcon: "codex",
        sessionPersistenceProvider: "tmux",
      }),
    );

    expect(markup).toContain("session-persistence-provider-badge");
    expect(markup).toContain('data-provider="tmux"');
    expect(markup).toContain(">t</span>");
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
    ).toBe("∗ Claude Code");
  });

  test("should append the unsynced marker when showing placeholder session titles", () => {
    expect(
      formatSessionHeadingText({
        alias: "s-260427-090032-rma",
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Terminal Session",
      }),
    ).toBe("∗ Terminal Session");
    expect(
      formatSessionHeadingText({
        alias: "s-260427-090032-rma",
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Codex Session",
      }),
    ).toBe("∗ Codex Session");
  });

  test("should swap ghost placeholder titles to the existing unsynced marker", () => {
    expect(
      formatSessionHeadingText({
        alias: "s-260427-090032-rma",
        isPrimaryTitleTerminalTitle: true,
        primaryTitle: "👻 Terminal Session",
        terminalTitle: "👻 Terminal Session",
      }),
    ).toBe("∗ Terminal Session");
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

  test("should keep t3 titles unmarked even when they do not match the synced terminal title", () => {
    expect(
      formatSessionHeadingText({
        agentIcon: "t3",
        alias: "Session 1",
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Refactor auth flow",
        terminalTitle: "Thread 12345678",
      }),
    ).toBe("Refactor auth flow");
  });

  test("should append the unsynced label in tooltip mode", () => {
    expect(
      formatSessionHeadingText({
        alias: "Session 1",
        includeUnsyncedTitleLabel: true,
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Bug Fix",
      }),
    ).toBe("∗ Bug Fix (Unsynced title)");
  });

  test("should not append the unsynced marker for browser sessions", () => {
    expect(
      formatSessionHeadingText({
        agentIcon: "browser",
        alias: "Docs",
        kind: "browser",
        isPrimaryTitleTerminalTitle: false,
        primaryTitle: "Project docs",
        sessionKind: "browser",
      }),
    ).toBe("Project docs");
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

describe("SessionCardContent", () => {
  test("should show the terminal icon for agentless terminal sessions and reveal time on hover", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionCardContent, {
        session: {
          activity: "idle",
          activityLabel: undefined,
          alias: "00",
          column: 0,
          isFocused: false,
          isRunning: true,
          isVisible: true,
          lastInteractionAt: "2026-04-18T10:00:00.000Z",
          row: 0,
          sessionId: "session-1",
          sessionKind: "terminal",
          shortcutLabel: "1",
        },
        showCloseButton: false,
        showDebugSessionNumbers: false,
        showHotkeys: false,
        showLastInteractionTime: false,
      }),
    );

    expect(markup).toContain('data-default-trailing-display="icon"');
    expect(markup).toContain('data-hover-trailing-display="time"');
    expect(markup).toContain('data-agent-icon="terminal"');
    expect(markup).toContain("session-last-interaction-time");
    expect(markup).toContain("session-header-agent-tabler-icon");
  });

  test("should reveal the agent icon on hover when last active is the selected default mode", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionCardContent, {
        session: {
          activity: "idle",
          activityLabel: undefined,
          agentIcon: "codex",
          alias: "00",
          column: 0,
          isFocused: false,
          isRunning: true,
          isVisible: true,
          lastInteractionAt: "2026-04-18T10:00:00.000Z",
          row: 0,
          sessionId: "session-1",
          shortcutLabel: "1",
        },
        showCloseButton: false,
        showDebugSessionNumbers: false,
        showHotkeys: false,
        showLastInteractionTime: true,
      }),
    );

    expect(markup).toContain('data-default-trailing-display="time"');
    expect(markup).toContain('data-hover-trailing-display="icon"');
    expect(markup).toContain("session-last-interaction-time");
    expect(markup).toContain("session-header-agent-icon");
  });

  test("should render a spinner instead of the header agent icon while reloading", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionCardContent, {
        session: {
          activity: "idle",
          activityLabel: undefined,
          agentIcon: "codex",
          alias: "00",
          column: 0,
          isFocused: false,
          isReloading: true,
          isRunning: true,
          isVisible: true,
          row: 0,
          sessionId: "session-1",
          shortcutLabel: "1",
        },
        showCloseButton: false,
        showDebugSessionNumbers: false,
        showHotkeys: false,
      }),
    );

    expect(markup).toContain("session-header-reloading-icon");
    expect(markup).not.toContain("session-header-agent-icon");
  });

  test("should keep the reloading spinner visible on hover instead of swapping to last active time", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionCardContent, {
        session: {
          activity: "idle",
          activityLabel: undefined,
          agentIcon: "codex",
          alias: "00",
          column: 0,
          isFocused: false,
          isReloading: true,
          isRunning: true,
          isVisible: true,
          lastInteractionAt: "2026-04-18T10:00:00.000Z",
          row: 0,
          sessionId: "session-1",
          shortcutLabel: "1",
        },
        showCloseButton: false,
        showDebugSessionNumbers: false,
        showHotkeys: false,
      }),
    );

    expect(markup).toContain('data-default-trailing-display="icon"');
    expect(markup).toContain('data-hover-trailing-display="icon"');
    expect(markup).toContain("session-last-interaction-time");
    expect(markup).toContain("session-header-reloading-icon");
  });

  test("should render the same header spinner while Codex first-prompt rename loading is active", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionCardContent, {
        session: {
          activity: "idle",
          activityLabel: undefined,
          agentIcon: "codex",
          alias: "00",
          column: 0,
          isFocused: false,
          isGeneratingFirstPromptTitle: true,
          isRunning: true,
          isVisible: true,
          row: 0,
          sessionId: "session-1",
          shortcutLabel: "1",
        },
        showCloseButton: false,
        showDebugSessionNumbers: false,
        showHotkeys: false,
      }),
    );

    expect(markup).toContain("session-header-reloading-icon");
    expect(markup).not.toContain("session-header-agent-icon");
  });
});

describe("SessionFloatingAgentIcon", () => {
  test("should keep showing the floating agent icon instead of a reload spinner", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionFloatingAgentIcon, {
        agentIcon: "codex",
        isReloading: true,
      }),
    );

    expect(markup).toContain("session-floating-agent-icon");
    expect(markup).not.toContain("session-floating-reloading-icon");
  });
});
