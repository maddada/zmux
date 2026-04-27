import { describe, expect, test, vi } from "vite-plus/test";
import { createSessionRecord } from "../../shared/session-grid-contract";
import { getHtmlCacheKey, getRenderKey } from "./helpers";

vi.mock("vscode", () => ({}));

describe("t3 webview cache keys", () => {
  test("includes the bound thread id in the render key", () => {
    const sessionRecord = createSessionRecord(1, 0, {
      kind: "t3",
      t3: {
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3774",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      },
      title: "T3",
    });
    const nextSessionRecord = {
      ...sessionRecord,
      t3: {
        ...sessionRecord.t3,
        boundThreadId: "thread-2",
        threadId: "thread-2",
      },
    };

    expect(getRenderKey(sessionRecord)).not.toBe(getRenderKey(nextSessionRecord));
    expect(getHtmlCacheKey(sessionRecord)).not.toBe(getHtmlCacheKey(nextSessionRecord));
  });
});
