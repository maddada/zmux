import { describe, expect, test, vi } from "vite-plus/test";
import {
  deleteWorkspacePaneOrderPreference,
  getWorkspacePaneOrderPreference,
  syncWorkspacePaneOrderPreference,
} from "./workspace-pane-order-preferences";

vi.mock("vscode", () => ({}));

describe("workspace pane order preferences", () => {
  test("should store normalized pane order per group", async () => {
    const context = createMockContext();

    await expect(
      syncWorkspacePaneOrderPreference(context as never, "workspace-1", "group-1", [
        "session-2",
        "",
        "session-1",
        "session-2",
      ]),
    ).resolves.toBe(true);

    expect(getWorkspacePaneOrderPreference(context as never, "workspace-1", "group-1")).toEqual([
      "session-2",
      "session-1",
    ]);
    await expect(
      syncWorkspacePaneOrderPreference(context as never, "workspace-1", "group-1", [
        "session-2",
        "session-1",
      ]),
    ).resolves.toBe(false);
  });

  test("should delete the stored order for a removed group", async () => {
    const context = createMockContext();

    await syncWorkspacePaneOrderPreference(context as never, "workspace-1", "group-1", [
      "session-1",
    ]);
    await syncWorkspacePaneOrderPreference(context as never, "workspace-1", "group-2", [
      "session-2",
    ]);

    await deleteWorkspacePaneOrderPreference(context as never, "workspace-1", "group-1");

    expect(getWorkspacePaneOrderPreference(context as never, "workspace-1", "group-1")).toEqual([]);
    expect(getWorkspacePaneOrderPreference(context as never, "workspace-1", "group-2")).toEqual([
      "session-2",
    ]);
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
