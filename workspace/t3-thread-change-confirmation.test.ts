import { describe, expect, test } from "vite-plus/test";
import {
  getT3ThreadChangeConfirmation,
  shouldEmitT3ThreadChangeAfterConfirmation,
} from "./t3-thread-change-confirmation";

describe("getT3ThreadChangeConfirmation", () => {
  test("prefers the navigation thread when both sources match", () => {
    expect(
      getT3ThreadChangeConfirmation({
        activeThreadId: "thread-2",
        navigationThreadId: "thread-2",
        pendingThreadId: "thread-2",
      }),
    ).toEqual({
      confirmationSource: "navigation",
      confirmedThreadId: "thread-2",
    });
  });

  test("confirms using the active thread when the iframe hash stays stale", () => {
    expect(
      getT3ThreadChangeConfirmation({
        activeThreadId: "thread-2",
        navigationThreadId: "thread-1",
        pendingThreadId: "thread-2",
      }),
    ).toEqual({
      confirmationSource: "activeThread",
      confirmedThreadId: "thread-2",
    });
  });

  test("returns undefined when neither source matches the pending thread", () => {
    expect(
      getT3ThreadChangeConfirmation({
        activeThreadId: "thread-3",
        navigationThreadId: "thread-1",
        pendingThreadId: "thread-2",
      }),
    ).toBeUndefined();
  });
});

describe("shouldEmitT3ThreadChangeAfterConfirmation", () => {
  test("only emits when the pane is both focused and visible", () => {
    expect(
      shouldEmitT3ThreadChangeAfterConfirmation({
        isFocusedPane: true,
        isVisiblePane: true,
      }),
    ).toBe(true);
    expect(
      shouldEmitT3ThreadChangeAfterConfirmation({
        isFocusedPane: false,
        isVisiblePane: true,
      }),
    ).toBe(false);
    expect(
      shouldEmitT3ThreadChangeAfterConfirmation({
        isFocusedPane: true,
        isVisiblePane: false,
      }),
    ).toBe(false);
  });
});
