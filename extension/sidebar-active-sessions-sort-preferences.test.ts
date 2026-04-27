import { describe, expect, test, vi } from "vite-plus/test";
import {
  getSidebarActiveSessionsSortMode,
  saveSidebarActiveSessionsSortMode,
} from "./sidebar-active-sessions-sort-preferences";

vi.mock("vscode", () => ({}));

describe("sidebar active sessions sort preferences", () => {
  test("should default to last activity sort", () => {
    const context = createMockContext();

    expect(getSidebarActiveSessionsSortMode(context as never, "workspace-1")).toBe("lastActivity");
  });

  test("should persist last activity sort mode", async () => {
    const context = createMockContext();

    await saveSidebarActiveSessionsSortMode(context as never, "workspace-1", "lastActivity");

    expect(getSidebarActiveSessionsSortMode(context as never, "workspace-1")).toBe("lastActivity");
  });

  test("should ignore redundant writes", async () => {
    const context = createMockContext();

    await saveSidebarActiveSessionsSortMode(context as never, "workspace-1", "lastActivity");

    expect(context.workspaceState.update).not.toHaveBeenCalled();
  });

  test("should still honor a persisted manual sort mode", () => {
    const context = createMockContext();

    void context.workspaceState.update("zmux.sidebarActiveSessionsSortMode:workspace-1", "manual");

    expect(getSidebarActiveSessionsSortMode(context as never, "workspace-1")).toBe("manual");
  });
});

function createMockContext() {
  const storage = new Map<string, unknown>();

  return {
    workspaceState: {
      get: vi.fn((key: string) => storage.get(key)),
      update: vi.fn(async (key: string, value: unknown) => {
        if (value === undefined) {
          storage.delete(key);
          return;
        }

        storage.set(key, value);
      }),
    },
  };
}
