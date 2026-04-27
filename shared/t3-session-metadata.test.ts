import { describe, expect, test } from "vite-plus/test";
import {
  getT3SessionBoundThreadId,
  normalizeT3SessionMetadata,
  setT3SessionBoundThreadId,
} from "./t3-session-metadata";

describe("t3 session metadata", () => {
  test("backfills boundThreadId from legacy threadId", () => {
    expect(
      normalizeT3SessionMetadata({
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3774",
        threadId: "thread-1",
        workspaceRoot: "/workspace",
      }),
    ).toEqual({
      boundThreadId: "thread-1",
      projectId: "project-1",
      serverOrigin: "http://127.0.0.1:3774",
      threadId: "thread-1",
      workspaceRoot: "/workspace",
    });
  });

  test("prefers the explicit boundThreadId when present", () => {
    expect(
      getT3SessionBoundThreadId({
        boundThreadId: "thread-bound",
        projectId: "project-1",
        serverOrigin: "http://127.0.0.1:3774",
        threadId: "thread-legacy",
        workspaceRoot: "/workspace",
      }),
    ).toBe("thread-bound");
  });

  test("updates the persisted binding and mirrors the legacy threadId field", () => {
    expect(
      setT3SessionBoundThreadId(
        {
          boundThreadId: "thread-1",
          projectId: "project-1",
          serverOrigin: "http://127.0.0.1:3774",
          threadId: "thread-1",
          workspaceRoot: "/workspace",
        },
        "thread-2",
      ),
    ).toEqual({
      boundThreadId: "thread-2",
      projectId: "project-1",
      serverOrigin: "http://127.0.0.1:3774",
      threadId: "thread-2",
      workspaceRoot: "/workspace",
    });
  });
});
