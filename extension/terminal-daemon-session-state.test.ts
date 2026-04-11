import { describe, expect, test } from "vite-plus/test";
import {
  resolvePersistedSessionPresentationState,
  shouldPreferPersistedSessionPresentation,
} from "./terminal-daemon-session-state";

describe("resolvePersistedSessionPresentationState", () => {
  test("should preserve the current agent when there is no title-derived agent update", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "idle",
          lastActivityAt: "2026-04-08T10:00:00.000Z",
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
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Auto fix corruption",
    });
  });

  test("should prefer title-derived agent updates when they exist", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "idle",
          lastActivityAt: "2026-04-08T10:00:00.000Z",
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
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Auto fix corruption",
    });
  });

  test("should fall back to the persisted agent if the snapshot is missing one", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "attention",
          lastActivityAt: "2026-04-08T10:00:00.000Z",
          title: "Auto fix corruption",
        },
        {
          snapshotAgentStatus: "idle",
        },
      ),
    ).toEqual({
      agentName: "codex",
      agentStatus: "idle",
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Auto fix corruption",
    });
  });

  test("should preserve persisted OpenCode presentation instead of title-derived idle state", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "opencode",
          agentStatus: "attention",
          lastActivityAt: "2026-04-08T10:00:00.000Z",
          title: "Project overview question",
        },
        {
          liveTitle: "OC | Project overview question",
          snapshotAgentName: "opencode",
          snapshotAgentStatus: "idle",
          titleActivityAgentName: "opencode",
          titleActivityStatus: "idle",
        },
      ),
    ).toEqual({
      agentName: "opencode",
      agentStatus: "attention",
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Project overview question",
    });
  });
});

describe("shouldPreferPersistedSessionPresentation", () => {
  test("should prefer persisted presentation for OpenCode", () => {
    expect(
      shouldPreferPersistedSessionPresentation({
        agentName: "opencode",
        agentStatus: "idle",
        title: "Project overview question",
      }),
    ).toBe(true);
  });

  test("should not prefer persisted presentation for non-OpenCode agents", () => {
    expect(
      shouldPreferPersistedSessionPresentation({
        agentName: "codex",
        agentStatus: "idle",
        title: "Auto fix corruption",
      }),
    ).toBe(false);
  });
});
