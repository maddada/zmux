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

  test("should not show the connector when the group is empty", () => {
    expect(
      shouldShowSessionGroupConnector({
        groupKind: "workspace",
        sessions: [],
      }),
    ).toBe(false);
  });
});
