import { describe, expect, test, vi } from "vite-plus/test";
import { createDisconnectedSessionSnapshot } from "./terminal-workspace-environment";
import {
  applyPersistedSessionStateToDisconnectedSnapshot,
  createPersistedSessionActivityChange,
  DaemonTerminalWorkspaceBackend,
  getSessionSnapshotPollIntervalMs,
  hasMeaningfulAgentPresentationChange,
  resolveSessionSnapshotPollState,
} from "./daemon-terminal-workspace-backend";

vi.mock("vscode", () => ({
  EventEmitter: class<T> {
    public readonly event = vi.fn();

    public fire(_value: T): void {}

    public dispose(): void {}
  },
  workspace: {
    getConfiguration: () => ({
      get: () => 5,
    }),
    workspaceFolders: undefined,
  },
}));

describe("applyPersistedSessionStateToDisconnectedSnapshot", () => {
  test("should carry persisted terminal title and agent state into a disconnected snapshot", () => {
    const snapshot = createDisconnectedSessionSnapshot("session-00", "workspace-1");

    expect(
      applyPersistedSessionStateToDisconnectedSnapshot(snapshot, {
        agentName: "codex",
        agentStatus: "attention",
        frozenAt: "2026-04-23T08:00:00.000Z",
        historyBase64: Buffer.from("prompt\r\noutput\r\n", "utf8").toString("base64"),
        title: "Claude Code / repo sweep",
      }),
    ).toEqual({
      ...snapshot,
      agentName: "codex",
      agentStatus: "attention",
      endedAt: "2026-04-23T08:00:00.000Z",
      history: "prompt\r\noutput\r\n",
      title: "Claude Code / repo sweep",
    });
  });
});

describe("hasMeaningfulAgentPresentationChange", () => {
  test("should return true when the agent status changes", () => {
    expect(
      hasMeaningfulAgentPresentationChange({
        agentNameChanged: false,
        agentStatusChanged: true,
      }),
    ).toBe(true);
  });

  test("should return true when the agent name changes", () => {
    expect(
      hasMeaningfulAgentPresentationChange({
        agentNameChanged: true,
        agentStatusChanged: false,
      }),
    ).toBe(true);
  });

  test("should return false for title-only presentation changes", () => {
    expect(
      hasMeaningfulAgentPresentationChange({
        agentNameChanged: false,
        agentStatusChanged: false,
      }),
    ).toBe(false);
  });
});

describe("createPersistedSessionActivityChange", () => {
  test("should mark completion activity when persisted state is attention", () => {
    expect(
      createPersistedSessionActivityChange("session-00", {
        agentName: "opencode",
        agentStatus: "attention",
      }),
    ).toEqual({
      didComplete: true,
      sessionId: "session-00",
    });
  });

  test("should leave non-completion activity unmarked", () => {
    expect(
      createPersistedSessionActivityChange("session-00", {
        agentName: "opencode",
        agentStatus: "working",
      }),
    ).toEqual({
      didComplete: false,
      sessionId: "session-00",
    });
  });
});

describe("getSessionSnapshotPollIntervalMs", () => {
  test("should stay fast when changes keep happening", () => {
    expect(getSessionSnapshotPollIntervalMs(0, 2)).toBe(500);
  });

  test("should back off after consecutive idle polls", () => {
    expect(getSessionSnapshotPollIntervalMs(1, 2)).toBe(1_000);
    expect(getSessionSnapshotPollIntervalMs(2, 2)).toBe(2_000);
    expect(getSessionSnapshotPollIntervalMs(99, 2)).toBe(2_000);
  });

  test("should use the most relaxed interval when there are no managed sessions", () => {
    expect(getSessionSnapshotPollIntervalMs(0, 0)).toBe(2_000);
  });
});

describe("resolveSessionSnapshotPollState", () => {
  test("should back off from the initial fast poll to one second after an idle cycle", () => {
    expect(
      resolveSessionSnapshotPollState({
        consecutiveIdlePolls: 0,
        didObserveChange: false,
        didResetCadenceDuringPoll: false,
        sessionCount: 2,
      }),
    ).toEqual({
      consecutiveIdlePolls: 1,
      delayMs: 1_000,
    });
  });

  test("should continue backing off to the relaxed cadence after repeated idle cycles", () => {
    expect(
      resolveSessionSnapshotPollState({
        consecutiveIdlePolls: 1,
        didObserveChange: false,
        didResetCadenceDuringPoll: false,
        sessionCount: 2,
      }),
    ).toEqual({
      consecutiveIdlePolls: 2,
      delayMs: 2_000,
    });
  });

  test("should return to a fast poll after observed changes", () => {
    expect(
      resolveSessionSnapshotPollState({
        consecutiveIdlePolls: 2,
        didObserveChange: true,
        didResetCadenceDuringPoll: false,
        sessionCount: 2,
      }),
    ).toEqual({
      consecutiveIdlePolls: 0,
      delayMs: 500,
    });
  });

  test("should honor resets that land during an in-flight poll", () => {
    expect(
      resolveSessionSnapshotPollState({
        consecutiveIdlePolls: 2,
        didObserveChange: false,
        didResetCadenceDuringPoll: true,
        sessionCount: 2,
      }),
    ).toEqual({
      consecutiveIdlePolls: 0,
      delayMs: 500,
    });
  });
});

describe("DaemonTerminalWorkspaceBackend.writeText", () => {
  test("should reset polling cadence after local writes", async () => {
    const backend = new DaemonTerminalWorkspaceBackend({
      context: {
        globalStorageUri: {
          fsPath: "/tmp/vsmux-tests",
        },
      } as never,
      ensureShellSpawnAllowed: async () => true,
      workspaceId: "workspace-1",
      workspaceRoot: "/tmp/vsmux-tests",
    });
    const runtimeWrite = vi.spyOn((backend as any).runtime, "write").mockResolvedValue(undefined);
    const resetPollingCadence = vi.spyOn(backend as any, "resetPollingCadence");

    await backend.writeText("session-1", "echo hello");

    expect(runtimeWrite).toHaveBeenCalledWith("workspace-1", "session-1", "echo hello\n");
    expect(resetPollingCadence).toHaveBeenCalledTimes(1);
  });
});
