import { describe, expect, test } from "vite-plus/test";
import { createSessionRecord } from "../../shared/session-grid-contract";
import { createSessionRenamePlan } from "./session-rename";

describe("createSessionRenamePlan", () => {
  test("should focus and scroll an inactive terminal session after rename", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(createSessionRenamePlan(sessionRecord, "session-2")).toEqual({
      shouldFocusRenamedSession: true,
      shouldScrollRenamedSessionToBottom: true,
    });
  });

  test("should not refocus or scroll the active terminal session after rename", () => {
    const sessionRecord = createSessionRecord(1, 0);

    expect(createSessionRenamePlan(sessionRecord, sessionRecord.sessionId)).toEqual({
      shouldFocusRenamedSession: false,
      shouldScrollRenamedSessionToBottom: false,
    });
  });

  test("should not refocus or scroll t3 sessions after rename", () => {
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

    expect(createSessionRenamePlan(sessionRecord, "session-2")).toEqual({
      shouldFocusRenamedSession: false,
      shouldScrollRenamedSessionToBottom: false,
    });
  });

  test("should focus but not scroll inactive browser sessions after rename", () => {
    const sessionRecord = createSessionRecord(1, 0, {
      browser: { url: "https://example.com" },
      kind: "browser",
      title: "Browser",
    });

    expect(createSessionRenamePlan(sessionRecord, "session-2")).toEqual({
      shouldFocusRenamedSession: true,
      shouldScrollRenamedSessionToBottom: false,
    });
  });
});
