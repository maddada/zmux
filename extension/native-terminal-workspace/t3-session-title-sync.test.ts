import { describe, expect, test } from "vite-plus/test";
import {
  shouldAutoPersistT3SessionTitle,
  shouldResetAutoPersistedT3SessionTitle,
} from "./t3-session-title-sync";

describe("t3 session title sync helpers", () => {
  test("auto-persists a live title when the stored title is still default", () => {
    expect(
      shouldAutoPersistT3SessionTitle({
        nextLiveTitle: "Project Overview",
        persistedTitle: "T3 Code",
        previousLiveTitle: undefined,
      }),
    ).toBe(true);
  });

  test("does not overwrite a manual rename with a later live title", () => {
    expect(
      shouldAutoPersistT3SessionTitle({
        nextLiveTitle: "Project Overview",
        persistedTitle: "My Custom Name",
        previousLiveTitle: "Earlier Title",
      }),
    ).toBe(false);
  });

  test("resets an auto-synced stored title when the next thread is untitled", () => {
    expect(
      shouldResetAutoPersistedT3SessionTitle({
        persistedTitle: "Project Overview",
        previousLiveTitle: "Project Overview",
      }),
    ).toBe(true);
  });

  test("does not reset a manual rename when the next thread is untitled", () => {
    expect(
      shouldResetAutoPersistedT3SessionTitle({
        persistedTitle: "My Custom Name",
        previousLiveTitle: "Project Overview",
      }),
    ).toBe(false);
  });
});
