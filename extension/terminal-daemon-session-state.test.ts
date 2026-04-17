import { describe, expect, test } from "vite-plus/test";
import {
  resolvePresentedSessionTitle,
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
          hasAutoTitleFromFirstPrompt: undefined,
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
      hasAutoTitleFromFirstPrompt: undefined,
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
          hasAutoTitleFromFirstPrompt: undefined,
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
      hasAutoTitleFromFirstPrompt: undefined,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Auto fix corruption",
    });
  });

  test("should not replace a persisted title with a bare agent title", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "working",
          lastActivityAt: "2026-04-08T10:00:00.000Z",
          title: "Auto fix corruption",
        },
        {
          liveTitle: "⠸ Codex",
          snapshotAgentName: "codex",
          snapshotAgentStatus: "working",
          titleActivityAgentName: "codex",
          titleActivityStatus: "working",
        },
      ),
    ).toEqual({
      agentName: "codex",
      agentStatus: "working",
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Auto fix corruption",
    });
  });

  test("should keep an empty persisted title empty when the live title is a bare agent title", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: undefined,
          agentStatus: "idle",
          lastActivityAt: "2026-04-08T10:00:00.000Z",
          title: undefined,
        },
        {
          liveTitle: "Claude",
          titleActivityAgentName: "claude",
          titleActivityStatus: "idle",
        },
      ),
    ).toEqual({
      agentName: "claude",
      agentStatus: "idle",
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: undefined,
    });
  });

  test("should fall back to the persisted agent if the snapshot is missing one", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "attention",
          hasAutoTitleFromFirstPrompt: undefined,
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
      hasAutoTitleFromFirstPrompt: undefined,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Auto fix corruption",
    });
  });

  test("keeps the first prompt auto title while Codex is still generic", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "attention",
          hasAutoTitleFromFirstPrompt: true,
          lastActivityAt: "2026-04-08T10:00:00.000Z",
          title: "Project overview question",
        },
        {
          liveTitle: "OpenAI Codex",
          snapshotAgentStatus: "idle",
        },
      ),
    ).toEqual({
      agentName: "codex",
      agentStatus: "idle",
      hasAutoTitleFromFirstPrompt: true,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Project overview question",
    });
  });

  test("allows a meaningful live Codex title to replace the first prompt fallback", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "codex",
          agentStatus: "attention",
          hasAutoTitleFromFirstPrompt: true,
          lastActivityAt: "2026-04-08T10:00:00.000Z",
          title: "Project overview question",
        },
        {
          liveTitle: "Audit sidebar title syncing",
          snapshotAgentStatus: "idle",
        },
      ),
    ).toEqual({
      agentName: "codex",
      agentStatus: "idle",
      hasAutoTitleFromFirstPrompt: true,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Audit sidebar title syncing",
    });
  });

  test("should preserve persisted OpenCode presentation instead of title-derived idle state", () => {
    expect(
      resolvePersistedSessionPresentationState(
        {
          agentName: "opencode",
          agentStatus: "attention",
          hasAutoTitleFromFirstPrompt: undefined,
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
      hasAutoTitleFromFirstPrompt: undefined,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      title: "Project overview question",
    });
  });
});

describe("resolvePresentedSessionTitle", () => {
  test("prefers the auto title while Codex still reports a generic live title", () => {
    expect(
      resolvePresentedSessionTitle(
        {
          agentName: "codex",
          agentStatus: "working",
          hasAutoTitleFromFirstPrompt: true,
          title: "Review terminal title sync",
        },
        {
          liveTitle: "⠸ Codex",
        },
      ),
    ).toBe("Review terminal title sync");
  });
});

describe("shouldPreferPersistedSessionPresentation", () => {
  test("should prefer persisted presentation for OpenCode", () => {
    expect(
      shouldPreferPersistedSessionPresentation({
        agentName: "opencode",
        agentStatus: "idle",
        hasAutoTitleFromFirstPrompt: undefined,
        title: "Project overview question",
      }),
    ).toBe(true);
  });

  test("should not prefer persisted presentation for non-OpenCode agents", () => {
    expect(
      shouldPreferPersistedSessionPresentation({
        agentName: "codex",
        agentStatus: "idle",
        hasAutoTitleFromFirstPrompt: true,
        title: "Auto fix corruption",
      }),
    ).toBe(false);
  });
});
