import { describe, expect, test } from "vite-plus/test";
import { resolvePersistedSessionPresentationState } from "./terminal-daemon-session-state";

describe("resolvePersistedSessionPresentationState", () => {
  test("should preserve the current agent when there is no title-derived agent update", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "idle",
          title: "Auto fix corruption",
        },
        {
          lastKnownPersistedTitle: "Auto fix corruption",
          snapshotAgentName: "codex",
          snapshotAgentStatus: "idle",
        },
      ),
    ).toEqual({
      agentName: "codex",
      agentStatus: "idle",
      title: "Auto fix corruption",
    });
  });

  test("should prefer title-derived agent updates when they exist", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "idle",
          title: "Auto fix corruption",
        },
        {
          liveTitle: "⠦ Auto fix corruption",
          snapshotAgentName: "codex",
          snapshotAgentStatus: "working",
          titleActivityAgentName: "claude",
          titleActivityStatus: "working",
        },
      ),
    ).toEqual({
      agentName: "claude",
      agentStatus: "working",
      title: "⠦ Auto fix corruption",
    });
  });

  test("should fall back to the persisted agent if the snapshot is missing one", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "attention",
          title: "Auto fix corruption",
        },
        {
          snapshotAgentStatus: "idle",
        },
      ),
    ).toEqual({
      agentName: "codex",
      agentStatus: "idle",
      title: "Auto fix corruption",
    });
  });
});
