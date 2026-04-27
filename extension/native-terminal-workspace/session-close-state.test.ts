import { describe, expect, test } from "vite-plus/test";
import {
  clearReusedSessionCloseState,
  finalizeClosingSessionCloseState,
  type SessionCloseStateStore,
} from "./session-close-state";

function createSessionCloseStateStore(): SessionCloseStateStore {
  return {
    closingSessionIds: new Set<string>(),
    recentlyClosedSessionExpiryBySessionId: new Map<string, number>(),
  };
}

describe("session close state", () => {
  test("clears stale close tracking when a session id is reused", () => {
    const sessionCloseStateStore = createSessionCloseStateStore();
    sessionCloseStateStore.closingSessionIds.add("session-01");
    sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.set("session-01", 123);

    clearReusedSessionCloseState(sessionCloseStateStore, "session-01");

    expect(sessionCloseStateStore.closingSessionIds.has("session-01")).toBe(false);
    expect(sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.has("session-01")).toBe(
      false,
    );
  });

  test("does not re-mark a reused live session as recently closed during close finalization", () => {
    const sessionCloseStateStore = createSessionCloseStateStore();
    sessionCloseStateStore.closingSessionIds.add("session-01");
    sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.set("session-01", 123);

    finalizeClosingSessionCloseState({
      hasReusedLiveSession: true,
      now: 500,
      recentlyClosedGraceMs: 1_000,
      rememberAsRecentlyClosed: true,
      sessionCloseStateStore,
      sessionId: "session-01",
    });

    expect(sessionCloseStateStore.closingSessionIds.has("session-01")).toBe(false);
    expect(sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.has("session-01")).toBe(
      false,
    );
  });

  test("marks a closed session as recently closed when its id has not been reused", () => {
    const sessionCloseStateStore = createSessionCloseStateStore();
    sessionCloseStateStore.closingSessionIds.add("session-01");

    finalizeClosingSessionCloseState({
      hasReusedLiveSession: false,
      now: 500,
      recentlyClosedGraceMs: 1_000,
      rememberAsRecentlyClosed: true,
      sessionCloseStateStore,
      sessionId: "session-01",
    });

    expect(sessionCloseStateStore.closingSessionIds.has("session-01")).toBe(false);
    expect(sessionCloseStateStore.recentlyClosedSessionExpiryBySessionId.get("session-01")).toBe(
      1_500,
    );
  });
});
