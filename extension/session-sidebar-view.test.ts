import { describe, expect, test, vi } from "vite-plus/test";
import { isSidebarMessage, shouldBypassSidebarMessageQueue } from "./session-sidebar-view";

vi.mock("vscode", () => ({
  extensions: {
    all: [],
    getExtension: () => undefined,
  },
  Uri: {
    joinPath: (...parts: unknown[]) => parts,
  },
}));

describe("isSidebarMessage", () => {
  test("should accept runSidebarCommand messages with a debug run mode", () => {
    expect(
      isSidebarMessage({
        commandId: "build",
        runMode: "debug",
        type: "runSidebarCommand",
      }),
    ).toBe(true);
  });

  test("should reject runSidebarCommand messages with an unknown run mode", () => {
    expect(
      isSidebarMessage({
        commandId: "build",
        runMode: "inspect",
        type: "runSidebarCommand",
      }),
    ).toBe(false);
  });

  test("should accept forkSession messages with a session id", () => {
    expect(
      isSidebarMessage({
        sessionId: "session-7",
        type: "forkSession",
      }),
    ).toBe(true);
  });

  test("should reject forkSession messages without a session id", () => {
    expect(
      isSidebarMessage({
        sessionId: "",
        type: "forkSession",
      }),
    ).toBe(false);
  });

  test("should accept setT3SessionThreadId messages with a session id", () => {
    expect(
      isSidebarMessage({
        sessionId: "session-7",
        type: "setT3SessionThreadId",
      }),
    ).toBe(true);
  });

  test("should reject setT3SessionThreadId messages without a session id", () => {
    expect(
      isSidebarMessage({
        sessionId: "",
        type: "setT3SessionThreadId",
      }),
    ).toBe(false);
  });

  test("should accept setSessionFavorite messages with a boolean favorite value", () => {
    expect(
      isSidebarMessage({
        favorite: true,
        sessionId: "session-7",
        type: "setSessionFavorite",
      }),
    ).toBe(true);
  });

  test("should reject setSessionFavorite messages without a boolean favorite value", () => {
    expect(
      isSidebarMessage({
        favorite: "yes",
        sessionId: "session-7",
        type: "setSessionFavorite",
      }),
    ).toBe(false);
  });
});

describe("shouldBypassSidebarMessageQueue", () => {
  test("should bypass focusSession messages", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        sessionId: "session-7",
        type: "focusSession",
      }),
    ).toBe(true);
  });

  test("should bypass sidebar repro log messages", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        details: {
          sessionId: "session-7",
        },
        event: "repro.sidebarSessionFocusRequested",
        type: "sidebarDebugLog",
      }),
    ).toBe(true);
  });

  test("should keep renameSession messages queued", () => {
    expect(
      shouldBypassSidebarMessageQueue({
        sessionId: "session-7",
        title: "Rename this session",
        type: "renameSession",
      }),
    ).toBe(false);
  });
});
