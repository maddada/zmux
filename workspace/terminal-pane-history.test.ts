import { describe, expect, test } from "vite-plus/test";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";
import { getTerminalHistoryReplay } from "./terminal-pane-history";

describe("getTerminalHistoryReplay", () => {
  test("should wait for a state message that actually includes history", () => {
    const replay = getTerminalHistoryReplay(createSessionSnapshot(), false);

    expect(replay).toEqual({
      didApplyHistory: false,
    });
  });

  test("should apply replayed history once it is included", () => {
    const replay = getTerminalHistoryReplay(createSessionSnapshot({ history: "prompt\r\noutput\r\n" }), false);

    expect(replay).toEqual({
      didApplyHistory: true,
      history: "prompt\r\noutput\r\n",
    });
  });

  test("should treat an empty history replay as applied", () => {
    const replay = getTerminalHistoryReplay(createSessionSnapshot({ history: "" }), false);

    expect(replay).toEqual({
      didApplyHistory: true,
      history: "",
    });
  });
});

function createSessionSnapshot(
  overrides: Partial<TerminalSessionSnapshot> = {},
): TerminalSessionSnapshot {
  return {
    agentName: undefined,
    agentStatus: "idle",
    cols: 120,
    cwd: "/tmp",
    isAttached: true,
    restoreState: "live",
    rows: 34,
    sessionId: "session-1",
    shell: "/bin/zsh",
    startedAt: new Date(0).toISOString(),
    status: "running",
    workspaceId: "workspace-1",
    ...overrides,
  };
}
