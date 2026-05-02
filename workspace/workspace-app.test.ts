import { describe, expect, test } from "vite-plus/test";
import { createSessionRecord } from "../shared/session-grid-contract";
import {
  getWorkspacePanePrimaryTitle,
  getWorkspaceShellPaddingTopPx,
  getWorkspaceShellPaneGapPx,
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
