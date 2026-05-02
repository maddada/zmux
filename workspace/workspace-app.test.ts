import { describe, expect, test } from "vite-plus/test";
import { createSessionRecord } from "../shared/session-grid-contract";
import {
  createWorkspacePaneResizeRatios,
  getWorkspacePanePrimaryTitle,
  getWorkspaceShellPaddingTopPx,
  getWorkspaceShellPaneGapPx,
  resetWorkspacePaneResizeOrientation,
  resizeWorkspacePaneRatioBoundary,
} from "./workspace-app";

describe("getWorkspaceShellPaneGapPx", () => {
  test("should force a 1px inset in single-pane mode", () => {
    expect(getWorkspaceShellPaneGapPx(1, 24)).toBe(1);
  });

  test("should keep the configured gap in multi-pane mode", () => {
    expect(getWorkspaceShellPaneGapPx(2, 24)).toBe(24);
  });

  test("should fall back to the default gap in multi-pane mode when unset", () => {
    expect(getWorkspaceShellPaneGapPx(2, undefined)).toBe(12);
  });
});

describe("getWorkspaceShellPaddingTopPx", () => {
  test("should add 2px of extra top padding in single-pane mode", () => {
    expect(getWorkspaceShellPaddingTopPx(1, 24)).toBe(3);
  });

  test("should match the pane gap in multi-pane mode", () => {
    expect(getWorkspaceShellPaddingTopPx(2, 24)).toBe(24);
  });

  test("should fall back to the default gap in multi-pane mode when unset", () => {
    expect(getWorkspaceShellPaddingTopPx(2, undefined)).toBe(12);
  });
});

describe("getWorkspacePanePrimaryTitle", () => {
  test("should ignore the generic zmux terminal title", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(
      getWorkspacePanePrimaryTitle({
        isVisible: true,
        kind: "terminal",
        renderNonce: 0,
        sessionId: sessionRecord.sessionId,
        sessionRecord,
        terminalTitle: "zmux",
      }),
    ).toBe("00");
  });

  test("should ignore the default Windows PowerShell executable title", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(
      getWorkspacePanePrimaryTitle({
        isVisible: true,
        kind: "terminal",
        renderNonce: 0,
        sessionId: sessionRecord.sessionId,
        sessionRecord,
        terminalTitle: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe .",
      }),
    ).toBe("00");
  });

  test("should keep meaningful terminal titles", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(
      getWorkspacePanePrimaryTitle({
        isVisible: true,
        kind: "terminal",
        renderNonce: 0,
        sessionId: sessionRecord.sessionId,
        sessionRecord,
        terminalTitle: "Implement release checks",
      }),
    ).toBe("Implement release checks");
  });

  test("should keep explicit user titles authoritative for generic agents", () => {
    const sessionRecord = createSessionRecord(1, 0, {
      title: "Bug Fix",
    });

    expect(
      getWorkspacePanePrimaryTitle({
        isVisible: true,
        kind: "terminal",
        renderNonce: 0,
        sessionId: sessionRecord.sessionId,
        sessionRecord,
        terminalTitle: "Codex",
      }),
    ).toBe("Bug Fix");
  });
});

describe("workspace pane resize ratios", () => {
  test("should resize the requested boundary while preserving the total ratio", () => {
    const resized = resizeWorkspacePaneRatioBoundary([1, 1], 1, 100, 800, 220, 220);

    expect(resized[0]).toBeCloseTo(1.25);
    expect(resized[1]).toBeCloseTo(0.75);
    expect(resized[0] + resized[1]).toBeCloseTo(2);
  });

  test("should clamp resize boundaries to the configured minimum pane size", () => {
    const resized = resizeWorkspacePaneRatioBoundary([1, 1], 1, -400, 800, 220, 220);

    expect((resized[0] / (resized[0] + resized[1])) * 800).toBeCloseTo(220);
  });

  test("should reset only the requested resize orientation", () => {
    const ratios = createWorkspacePaneResizeRatios("layout", 2, 3);
    const adjusted = {
      ...ratios,
      columnRatios: [2, 1, 1],
      rowRatios: [3, 1],
    };

    expect(resetWorkspacePaneResizeOrientation(adjusted, "vertical")).toEqual({
      ...adjusted,
      columnRatios: [1, 1, 1],
    });
    expect(resetWorkspacePaneResizeOrientation(adjusted, "horizontal")).toEqual({
      ...adjusted,
      rowRatios: [1, 1],
    });
  });
});
