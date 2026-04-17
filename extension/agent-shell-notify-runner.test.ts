import { describe, expect, test } from "vite-plus/test";
import { getAgentHookInfo, resolvePersistedSessionStateForHook } from "./agent-shell-notify-runner";
import { getHookResponseForInput } from "./agent-shell-notify-runner";

describe("getAgentHookInfo", () => {
  test("extracts UserPromptSubmit prompts from JSON input", () => {
    expect(
      getAgentHookInfo(
        JSON.stringify({
          agent: "codex",
          hook_event_name: "UserPromptSubmit",
          prompt: 'can you fix the "rename" flow?',
        }),
      ),
    ).toEqual({
      agentName: "codex",
      normalizedEvent: undefined,
      prompt: 'can you fix the "rename" flow?',
      rawEventName: "UserPromptSubmit",
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
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt: "how does terminal title syncing work in this project?",
        rawEventName: "UserPromptSubmit",
      },
    );

    expect(nextState.hasAutoTitleFromFirstPrompt).toBeUndefined();
    expect(nextState.pendingFirstPromptAutoRenamePrompt).toBe(
      "how does terminal title syncing work in this project?",
    );
    expect(nextState.title).toBe("Codex");
    expect(nextState.lastActivityAt).toEqual(expect.any(String));
  });

  test("does not queue another request once a first prompt rename is already pending", () => {
    const nextState = resolvePersistedSessionStateForHook(
      {
        agentName: "codex",
        agentStatus: "working",
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: "rename the controller session",
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt: "fix the workspace group ordering too",
        rawEventName: "UserPromptSubmit",
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
        hasAutoTitleFromFirstPrompt: undefined,
        pendingFirstPromptAutoRenamePrompt: undefined,
        title: "Codex",
      },
      {
        agentName: "codex",
        prompt: "/rename Better title",
        rawEventName: "UserPromptSubmit",
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
});
