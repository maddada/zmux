import { describe, expect, test } from "vite-plus/test";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";
import {
  createTerminalDaemonSessionKey,
  indexWorkspaceTerminalSnapshotsBySessionId,
} from "./terminal-daemon-session-scope";

describe("createTerminalDaemonSessionKey", () => {
  test("should namespace the same session id across workspaces", () => {
    expect(createTerminalDaemonSessionKey("workspace-a", "session-1")).not.toBe(
      createTerminalDaemonSessionKey("workspace-b", "session-1"),
    );
  });
});

describe("indexWorkspaceTerminalSnapshotsBySessionId", () => {
  test("should only index snapshots that belong to the requested workspace", () => {
    const snapshots = [
      createSnapshot("workspace-a", "session-1"),
      createSnapshot("workspace-b", "session-1"),
      createSnapshot("workspace-a", "session-2"),
    ];

    expect(indexWorkspaceTerminalSnapshotsBySessionId(snapshots, "workspace-a")).toEqual(
      new Map([
        ["session-1", snapshots[0]],
        ["session-2", snapshots[2]],
      ]),
    );
  });
});

function createSnapshot(workspaceId: string, sessionId: string): TerminalSessionSnapshot {
  return {
    agentName: undefined,
    agentStatus: "idle",
    cols: 120,
    cwd: "/tmp",
    isAttached: false,
    restoreState: "live",
    rows: 34,
    sessionId,
    shell: "/bin/zsh",
    startedAt: new Date(0).toISOString(),
    status: "running",
    title: sessionId,
    workspaceId,
  };
}
