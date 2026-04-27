import { describe, expect, test } from "vite-plus/test";
import {
  T3_THREAD_CHANGE_DEBOUNCE_MS,
  T3_THREAD_CHANGE_DEDUPE_MS,
  T3_THREAD_CHANGE_STARTUP_SUPPRESSION_MS,
  evaluateT3ThreadChangeGuard,
} from "./t3-thread-change-guard";

const baseInput = {
  currentThreadId: "thread-1",
  isClosing: false,
  isFocused: true,
  isInFlight: false,
  isVisible: true,
  nextThreadId: "thread-2",
  now: 10_000,
} as const;

describe("evaluateT3ThreadChangeGuard", () => {
  test("allows a focused visible thread change", () => {
    expect(evaluateT3ThreadChangeGuard(baseInput)).toEqual({
      allow: true,
      nextThreadId: "thread-2",
      reason: "allowed",
    });
  });

  test("blocks changes for closing sessions", () => {
    expect(
      evaluateT3ThreadChangeGuard({
        ...baseInput,
        isClosing: true,
      }),
    ).toEqual({
      allow: false,
      nextThreadId: "thread-2",
      reason: "sessionClosing",
    });
  });

  test("blocks hidden or unfocused sessions", () => {
    expect(
      evaluateT3ThreadChangeGuard({
        ...baseInput,
        isVisible: false,
      }).reason,
    ).toBe("sessionHidden");

    expect(
      evaluateT3ThreadChangeGuard({
        ...baseInput,
        isFocused: false,
      }).reason,
    ).toBe("sessionNotFocused");
  });

  test("blocks boot-time thread restores for freshly created sessions", () => {
    expect(
      evaluateT3ThreadChangeGuard({
        ...baseInput,
        now: 10_000,
        sessionCreatedAt: 10_000 - (T3_THREAD_CHANGE_STARTUP_SUPPRESSION_MS - 1),
      }),
    ).toEqual({
      allow: false,
      nextThreadId: "thread-2",
      reason: "sessionBootstrapping",
    });
  });

  test("blocks thread changes until a new session confirms its bound thread once", () => {
    expect(
      evaluateT3ThreadChangeGuard({
        ...baseInput,
        requiresInitialBoundThreadConfirmation: true,
      }),
    ).toEqual({
      allow: false,
      nextThreadId: "thread-2",
      reason: "awaitingInitialBoundThreadConfirmation",
    });
  });

  test("blocks duplicate thread changes inside the dedupe window", () => {
    expect(
      evaluateT3ThreadChangeGuard({
        ...baseInput,
        lastAcceptedAt: baseInput.now - (T3_THREAD_CHANGE_DEDUPE_MS - 1),
        lastAcceptedThreadId: "thread-2",
      }),
    ).toEqual({
      allow: false,
      nextThreadId: "thread-2",
      reason: "duplicateThreadChange",
    });
  });

  test("blocks new thread changes inside the debounce window", () => {
    expect(
      evaluateT3ThreadChangeGuard({
        ...baseInput,
        lastAcceptedAt: baseInput.now - (T3_THREAD_CHANGE_DEBOUNCE_MS - 1),
        lastAcceptedThreadId: "thread-3",
      }),
    ).toEqual({
      allow: false,
      nextThreadId: "thread-2",
      reason: "debouncedThreadChange",
    });
  });
});
