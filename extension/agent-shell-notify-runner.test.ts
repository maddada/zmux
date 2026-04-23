import { mkdtemp, readdir } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  claimAgentHookInvocation,
  getAgentHookInfo,
  resolvePersistedSessionStateForHook,
} from "./agent-shell-notify-runner";
import { getHookResponseForInput } from "./agent-shell-notify-runner";

describe("getAgentHookInfo", () => {
  test("extracts UserPromptSubmit prompts from JSON input", () => {
    expect(
      getAgentHookInfo(
        JSON.stringify({
          agent: "codex",
          hook_event_name: "UserPromptSubmit",
          prompt: 'can you fix the "rename" flow?',
          session_id: "session-123",
        }),
      ),
    ).toEqual({
      agentName: "codex",
      normalizedEvent: undefined,
      prompt: 'can you fix the "rename" flow?',
      rawEventName: "UserPromptSubmit",
      sessionId: "session-123",
      turnId: undefined,
    });
  });

  test("extracts turn identifiers from UserPromptSubmit payloads", () => {
    expect(
      getAgentHookInfo(
        JSON.stringify({
          agent: "codex",
          hook_event_name: "UserPromptSubmit",
          prompt: "hello",
          session_id: "session-123",
          turn_id: "turn-123",
        }),
      ),
    ).toEqual({
      agentName: "codex",
      normalizedEvent: undefined,
      prompt: "hello",
      rawEventName: "UserPromptSubmit",
      sessionId: "session-123",
      turnId: "turn-123",
    });
  });

  test("normalizes stop events from notify payloads", () => {
    expect(
      getAgentHookInfo(
        JSON.stringify({
          agent: "codex",
          type: "agent-turn-complete",
        }),
      ),
    ).toEqual({
      agentName: "codex",
      normalizedEvent: "stop",
      prompt: undefined,
      rawEventName: undefined,
      sessionId: undefined,
      turnId: undefined,
    });
  });
});

describe("getHookResponseForInput", () => {
  test("returns a valid Codex success payload for UserPromptSubmit", () => {
    expect(
      getHookResponseForInput(
        JSON.stringify({
          agent: "codex",
          hook_event_name: "UserPromptSubmit",
          prompt: "hello",
        }),
      ),
    ).toBe(JSON.stringify({ continue: true }));
  });

  test("does not emit hook JSON for watcher lifecycle payloads", () => {
    expect(
      getHookResponseForInput(
        JSON.stringify({
          agent: "codex",
          hook_event_name: "Stop",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("resolvePersistedSessionStateForHook", () => {
  test("queues a pending auto rename request for a generic Codex session", () => {
    const nextState = resolvePersistedSessionStateForHook(
      {
        agentName: "codex",
        agentStatus: "idle",
        agentSessionId: "session-top-level",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt: "how does terminal title syncing work in this project?",
        rawEventName: "UserPromptSubmit",
        sessionId: "session-top-level",
      },
    );

    expect(nextState.hasAutoTitleFromFirstPrompt).toBeUndefined();
    expect(nextState.pendingFirstPromptAutoRenamePrompt).toBe(
      "how does terminal title syncing work in this project?",
    );
    expect(nextState.title).toBe("Codex");
    expect(nextState.lastActivityAt).toEqual(expect.any(String));
  });

  test("queues a pending auto rename request for a generic Claude session", () => {
    const nextState = resolvePersistedSessionStateForHook(
      {
        agentName: "claude",
        agentStatus: "idle",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: "Claude Code",
      },
      {
        agentName: "claude",
        prompt: "can you explain how this repo is structured?",
        rawEventName: "UserPromptSubmit",
      },
    );

    expect(nextState.hasAutoTitleFromFirstPrompt).toBeUndefined();
    expect(nextState.pendingFirstPromptAutoRenamePrompt).toBe(
      "can you explain how this repo is structured?",
    );
    expect(nextState.title).toBe("Claude Code");
    expect(nextState.lastActivityAt).toEqual(expect.any(String));
  });

  test("does not queue another request once a first prompt rename is already pending", () => {
    const nextState = resolvePersistedSessionStateForHook(
      {
        agentName: "codex",
        agentStatus: "working",
        agentSessionId: "session-top-level",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: "rename the controller session",
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt: "fix the workspace group ordering too",
        rawEventName: "UserPromptSubmit",
        sessionId: "session-top-level",
      },
    );

    expect(nextState.pendingFirstPromptAutoRenamePrompt).toBe("rename the controller session");
    expect(nextState.title).toBe("Codex");
  });

  test("does not queue auto rename requests for slash commands", () => {
    const nextState = resolvePersistedSessionStateForHook(
      {
        agentName: "codex",
        agentStatus: "idle",
        agentSessionId: "session-top-level",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt: "/rename Better title",
        rawEventName: "UserPromptSubmit",
        sessionId: "session-top-level",
      },
    );

    expect(nextState.pendingFirstPromptAutoRenamePrompt).toBeUndefined();
    expect(nextState.title).toBe("Codex");
  });

  test("does not queue auto rename requests for prompts that mention inline slash commands", () => {
    const nextState = resolvePersistedSessionStateForHook(
      {
        agentName: "codex",
        agentStatus: "idle",
        agentSessionId: "session-top-level",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt:
          "add 1 more toggle here [Image #1] that makes it open as /rename Memory Consolidation Agent",
        rawEventName: "UserPromptSubmit",
        sessionId: "session-top-level",
      },
    );

    expect(nextState.pendingFirstPromptAutoRenamePrompt).toBeUndefined();
    expect(nextState.title).toBe("Codex");
  });

  test("updates lifecycle state for start and stop events", () => {
    const startState = resolvePersistedSessionStateForHook(
      {
        agentName: "codex",
        agentStatus: "idle",
        title: "Codex",
      },
      {
        agentName: "codex",
        normalizedEvent: "start",
      },
    );
    const stopState = resolvePersistedSessionStateForHook(startState, {
      agentName: "codex",
      normalizedEvent: "stop",
    });

    expect(startState.agentStatus).toBe("working");
    expect(stopState.agentStatus).toBe("attention");
  });

  test("ignores prompt submit hooks from a different Codex session id", () => {
    const nextState = resolvePersistedSessionStateForHook(
      {
        agentName: "codex",
        agentStatus: "idle",
        agentSessionId: "session-top-level",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt:
          "<permissions instructions>\nFilesystem sandboxing defines which files can be read or written.\n</permissions instructions>",
        rawEventName: "UserPromptSubmit",
        sessionId: "session-background-memory-agent",
      },
    );

    expect(nextState).toEqual({
      agentName: "codex",
      agentStatus: "idle",
      agentSessionId: "session-top-level",
      hasAutoTitleFromFirstPrompt: undefined,
      pendingFirstPromptAutoRenamePrompt: undefined,
      title: "Codex",
    });
  });
});

describe("claimAgentHookInvocation", () => {
  test("suppresses duplicate UserPromptSubmit deliveries for the same turn", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-hook-claim-"));
    const stateFilePath = path.join(tempDir, "session-00.state");
    const hookInfo = getAgentHookInfo(
      JSON.stringify({
        agent: "codex",
        hook_event_name: "UserPromptSubmit",
        prompt: "rename this session",
        turn_id: "turn-123",
      }),
    );

    await expect(claimAgentHookInvocation(hookInfo, stateFilePath)).resolves.toBe("acquired");
    await expect(claimAgentHookInvocation(hookInfo, stateFilePath)).resolves.toBe("duplicate");
  });

  test("keeps only the latest dedupe marker for a session", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-hook-claim-"));
    const stateFilePath = path.join(tempDir, "session-01.state");

    await expect(
      claimAgentHookInvocation(
        getAgentHookInfo(
          JSON.stringify({
            agent: "codex",
            hook_event_name: "UserPromptSubmit",
            prompt: "first prompt",
            turn_id: "turn-1",
          }),
        ),
        stateFilePath,
      ),
    ).resolves.toBe("acquired");

    await expect(
      claimAgentHookInvocation(
        getAgentHookInfo(
          JSON.stringify({
            agent: "codex",
            hook_event_name: "UserPromptSubmit",
            prompt: "second prompt",
            turn_id: "turn-2",
          }),
        ),
        stateFilePath,
      ),
    ).resolves.toBe("acquired");

    const dedupeMarkers = (await readdir(tempDir)).filter((entry) =>
      entry.includes(".hook-dedupe."),
    );
    expect(dedupeMarkers).toHaveLength(1);
    expect(dedupeMarkers[0]).toContain("turn-2");
  });
});
