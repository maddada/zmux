import { describe, expect, test } from "vite-plus/test";
import {
  resolveT3SessionLifecycleState,
  resolveTerminalSessionLifecycleState,
} from "./session-indicator-state";

describe("resolveTerminalSessionLifecycleState", () => {
  test("should mark live terminal sessions as running", () => {
    expect(
      resolveTerminalSessionLifecycleState({
        hasLiveRuntime: true,
        isSleeping: false,
        status: "running",
      }),
    ).toBe("running");
  });

  test("should mark running terminals without a live runtime as done", () => {
    expect(
      resolveTerminalSessionLifecycleState({
        hasLiveRuntime: false,
        isSleeping: false,
        status: "running",
      }),
    ).toBe("done");
  });

  test("should mark non-live terminal sessions as done", () => {
    expect(
      resolveTerminalSessionLifecycleState({
        hasLiveRuntime: false,
        isSleeping: false,
        status: "exited",
      }),
    ).toBe("done");
  });

  test("should mark errored terminal sessions as error", () => {
    expect(
      resolveTerminalSessionLifecycleState({
        hasLiveRuntime: false,
        isSleeping: false,
        status: "error",
      }),
    ).toBe("error");
  });
});

describe("resolveT3SessionLifecycleState", () => {
  test("should mark live t3 sessions as running", () => {
    expect(
      resolveT3SessionLifecycleState({
        isRunning: true,
        isSleeping: false,
      }),
    ).toBe("running");
  });

  test("should mark errored t3 sessions as error", () => {
    expect(
      resolveT3SessionLifecycleState({
        isRunning: false,
        isSleeping: false,
      }),
    ).toBe("error");
  });
});
