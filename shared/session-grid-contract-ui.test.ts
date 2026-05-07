import { describe, expect, test } from "vitest";
import {
  createSessionRecord,
  getPreferredSessionTitle,
  getSessionCardPrimaryTitle,
  getVisiblePrimaryTitle,
  getVisibleTerminalTitle,
  isGhostPlaceholderSessionTitle,
} from "./session-grid-contract-session";
import { createSidebarSessionItems } from "./session-grid-contract-ui";

describe("createSidebarSessionItems", () => {
  test("should expose browser favicon data and browser fallback icon through sidebar session items", () => {
    const faviconDataUrl = "data:image/png;base64,ZmF2aWNvbg==";
    const items = createSidebarSessionItems({
      focusedSessionId: "session-1",
      sessions: [
        createSessionRecord(1, 0, {
          browser: { faviconDataUrl, url: "https://example.com" },
          kind: "browser",
          title: "Example",
        }),
      ],
      viewMode: "grid",
      visibleCount: 1,
      visibleSessionIds: ["session-1"],
    });

    expect(items[0]?.agentIcon).toBe("browser");
    expect(items[0]?.faviconDataUrl).toBe(faviconDataUrl);
  });

  test("should treat Ghostty ghost titles as placeholders instead of persisted session names", () => {
    /**
     * CDXC:SessionTitleSync 2026-05-07-17:27
     * Reconnected zmx panes may report `👻` while the real title is still known
     * by the session record. The shared card/title contract must reject that
     * placeholder before it can replace the restored name or render as
     * `* Terminal Session` in the sidebar.
     */
    expect(isGhostPlaceholderSessionTitle("👻")).toBe(true);
    expect(isGhostPlaceholderSessionTitle("👻 Terminal Session")).toBe(true);
    expect(getVisibleTerminalTitle("👻")).toBeUndefined();
    expect(getVisibleTerminalTitle("👻 Terminal Session")).toBeUndefined();
    expect(getVisiblePrimaryTitle("👻")).toBeUndefined();
    expect(getPreferredSessionTitle("Persisted Codex Name", "👻")).toBe("Persisted Codex Name");
    expect(getSessionCardPrimaryTitle({ agentName: "codex", title: "👻" })).toBe("Codex Session");
  });
});
