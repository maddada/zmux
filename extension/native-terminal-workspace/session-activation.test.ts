import { describe, expect, test } from "vite-plus/test";
import { createSessionRecord } from "../../shared/session-grid-contract";
import { createSessionActivationPlan } from "./session-activation";

describe("createSessionActivationPlan", () => {
  test("should cold-start and resume an inactive terminal session", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(
      createSessionActivationPlan(sessionRecord, {
        hasLiveBrowserTab: false,
        hasLiveT3Panel: false,
        hasLiveTerminal: false,
        hasStoredAgentLaunch: true,
        isAlreadyFocused: false,
        isT3Running: false,
      }),
    ).toEqual({
      shouldCreateOrAttachTerminal: true,
      shouldFocusStoredSession: true,
      shouldNoop: false,
      shouldRefreshAfterActivation: true,
      shouldResumeAgentAfterReveal: true,
    });
  });

  test("should still cold-start a focused inactive terminal session", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(
      createSessionActivationPlan(sessionRecord, {
        hasLiveBrowserTab: false,
        hasLiveT3Panel: false,
        hasLiveTerminal: false,
        hasStoredAgentLaunch: true,
        isAlreadyFocused: true,
        isT3Running: false,
      }),
    ).toEqual({
      shouldCreateOrAttachTerminal: true,
      shouldFocusStoredSession: false,
      shouldNoop: false,
      shouldRefreshAfterActivation: true,
      shouldResumeAgentAfterReveal: true,
    });
  });

  test("should cold-start a plain terminal session without a resume command", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(
      createSessionActivationPlan(sessionRecord, {
        hasLiveBrowserTab: false,
        hasLiveT3Panel: false,
        hasLiveTerminal: false,
        hasStoredAgentLaunch: false,
        isAlreadyFocused: true,
        isT3Running: false,
      }),
    ).toEqual({
      shouldCreateOrAttachTerminal: true,
      shouldFocusStoredSession: false,
      shouldNoop: false,
      shouldRefreshAfterActivation: true,
      shouldResumeAgentAfterReveal: false,
    });
  });

  test("should reopen a focused browser session when its tab is gone", () => {
    const sessionRecord = createSessionRecord(1, 0, {
      browser: { url: "https://example.com" },
      kind: "browser",
      title: "Browser",
    });

    expect(
      createSessionActivationPlan(sessionRecord, {
        hasLiveBrowserTab: false,
        hasLiveT3Panel: false,
        hasLiveTerminal: false,
        hasStoredAgentLaunch: false,
        isAlreadyFocused: true,
        isT3Running: false,
      }),
    ).toEqual({
      shouldCreateOrAttachTerminal: false,
      shouldFocusStoredSession: false,
      shouldNoop: false,
      shouldRefreshAfterActivation: true,
      shouldResumeAgentAfterReveal: false,
    });
  });

  test("should reopen a focused t3 session when the panel is gone", () => {
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });

    expect(
      createSessionActivationPlan(sessionRecord, {
        hasLiveBrowserTab: false,
        hasLiveT3Panel: false,
        hasLiveTerminal: false,
        hasStoredAgentLaunch: false,
        isAlreadyFocused: true,
        isT3Running: true,
      }),
    ).toEqual({
      shouldCreateOrAttachTerminal: false,
      shouldFocusStoredSession: false,
      shouldNoop: false,
      shouldRefreshAfterActivation: true,
      shouldResumeAgentAfterReveal: false,
    });
  });

  test("should reopen a focused t3 session when the runtime is down", () => {
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3773",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3 Code",
    });

    expect(
      createSessionActivationPlan(sessionRecord, {
        hasLiveBrowserTab: false,
        hasLiveT3Panel: true,
        hasLiveTerminal: false,
        hasStoredAgentLaunch: false,
        isAlreadyFocused: true,
        isT3Running: false,
      }),
    ).toEqual({
      shouldCreateOrAttachTerminal: false,
      shouldFocusStoredSession: false,
      shouldNoop: false,
      shouldRefreshAfterActivation: true,
      shouldResumeAgentAfterReveal: false,
    });
  });

  test("should noop for a focused session that already has a live surface", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(
      createSessionActivationPlan(sessionRecord, {
        hasLiveBrowserTab: false,
        hasLiveT3Panel: false,
        hasLiveTerminal: true,
        hasStoredAgentLaunch: true,
        isAlreadyFocused: true,
        isT3Running: false,
      }),
    ).toEqual({
      shouldCreateOrAttachTerminal: false,
      shouldFocusStoredSession: false,
      shouldNoop: true,
      shouldRefreshAfterActivation: false,
      shouldResumeAgentAfterReveal: false,
    });
  });
});
