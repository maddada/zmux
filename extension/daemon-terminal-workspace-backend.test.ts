import { describe, expect, test, vi } from "vite-plus/test";
import { createDisconnectedSessionSnapshot } from "./terminal-workspace-environment";
import {
  applyPersistedSessionStateToDisconnectedSnapshot,
  createPersistedSessionActivityChange,
  hasMeaningfulAgentPresentationChange,
} from "./daemon-terminal-workspace-backend";

vi.mock("vscode", () => ({
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
        title: "Claude Code",
      }),
    ).toEqual({
      ...snapshot,
      agentName: "codex",
      agentStatus: "attention",
      title: "Claude Code",
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
