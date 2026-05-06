import { describe, expect, test } from "vitest";
import { shouldShowSessionGroupConnector } from "./session-group-connector";

describe("shouldShowSessionGroupConnector", () => {
  test("should show the connector for browser groups with sessions", () => {
    expect(
      shouldShowSessionGroupConnector({
        groupKind: "browser",
        sessions: [
          {
            sessionId: "browser-1",
          },
        ],
      }),
    ).toBe(true);
  });

  test("should show the connector for any non-empty workspace group", () => {
    expect(
      shouldShowSessionGroupConnector({
        groupKind: "workspace",
        sessions: [
          {
            sessionId: "session-1",
          },
          {
            sessionId: "session-2",
          },
        ],
      }),
    ).toBe(true);
  });

  test("should show the connector for empty project groups with an editor card", () => {
    /**
     * CDXC:ProjectGroups 2026-05-06-19:01
     * The editor card is project body content. Empty project groups still need
     * the same left connector rail and collapse affordance as projects that
     * already contain terminal/browser sessions.
     */
    expect(
      shouldShowSessionGroupConnector({
        groupKind: "workspace",
        hasProjectEditor: true,
        sessions: [],
      }),
    ).toBe(true);
  });

  test("should not show the connector when a non-project group is empty", () => {
    expect(
      shouldShowSessionGroupConnector({
        groupKind: "workspace",
        sessions: [],
      }),
    ).toBe(false);
  });
});
