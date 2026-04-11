import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const { appendLineMock, clearMock, debuggingModeRef, disposeMock, workspaceNameRef } = vi.hoisted(
  () => ({
    appendLineMock: vi.fn(),
    clearMock: vi.fn(),
    debuggingModeRef: { current: true },
    disposeMock: vi.fn(),
    workspaceNameRef: { current: "agent-tiler" },
  }),
);

vi.mock("vscode", () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: appendLineMock,
      clear: clearMock,
      dispose: disposeMock,
    })),
  },
  workspace: {
    get name() {
      return workspaceNameRef.current;
    },
    getConfiguration: vi.fn(() => ({
      get: vi.fn(() => debuggingModeRef.current),
    })),
    workspaceFile: undefined,
    workspaceFolders: undefined,
  },
}));

import {
  disposeVSmuxDebugLog,
  logVSmuxDebug,
  logVSmuxReproTrace,
  resetVSmuxDebugLog,
} from "./vsmux-debug-log";

describe("logVSmuxDebug", () => {
  beforeEach(() => {
    appendLineMock.mockReset();
    clearMock.mockReset();
    disposeMock.mockReset();
    debuggingModeRef.current = true;
    workspaceNameRef.current = "agent-tiler";
    resetVSmuxDebugLog();
    disposeVSmuxDebugLog();
  });

  test("should include the VS Code workspace name in the debug log line", () => {
    logVSmuxDebug("daemon.runtime.ensureDaemonProcess.start", {
      sessionId: "session-1",
    });

    expect(appendLineMock).toHaveBeenCalledTimes(1);
    expect(appendLineMock.mock.calls[0]?.[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T.* \[workspace:agent-tiler\] daemon\.runtime\.ensureDaemonProcess\.start {"sessionId":"session-1"}$/,
    );
  });

  test("should stay quiet when debugging mode is disabled", () => {
    debuggingModeRef.current = false;

    logVSmuxDebug("daemon.runtime.ensureDaemonProcess.start");

    expect(appendLineMock).not.toHaveBeenCalled();
  });

  test("should always write repro traces and include the project name", () => {
    debuggingModeRef.current = false;

    logVSmuxReproTrace("repro.controller.focusSession.start", {
      sessionId: "session-9",
    });

    expect(appendLineMock).toHaveBeenCalledTimes(1);
    expect(appendLineMock.mock.calls[0]?.[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T.* \[workspace:agent-tiler\] repro\.controller\.focusSession\.start {"projectName":"agent-tiler","sessionId":"session-9"}$/,
    );
  });
});
