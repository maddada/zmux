import { describe, expect, test } from "vitest";
import { createSessionRecord } from "./session-grid-contract-session";
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
});
