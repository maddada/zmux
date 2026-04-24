import { describe, expect, test } from "vitest";
import {
  createTerminalResizeStabilityState,
  evaluateTerminalResizeBounds,
} from "./terminal-resize-stability";

describe("evaluateTerminalResizeBounds", () => {
  test("rejects an implausible one-frame pane collapse", () => {
    const state = createTerminalResizeStabilityState();

    expect(evaluateTerminalResizeBounds(state, { height: 939, width: 561 }, 0)).toEqual({
      accept: true,
    });

    expect(evaluateTerminalResizeBounds(state, { height: 95, width: 133 }, 10)).toEqual({
      accept: false,
      reason: "transient-collapsed-bounds",
      retryAfterMs: 160,
    });

    expect(evaluateTerminalResizeBounds(state, { height: 939, width: 561 }, 20)).toEqual({
      accept: true,
    });
  });

  test("accepts a collapsed pane if it persists past the settle window", () => {
    const state = createTerminalResizeStabilityState();

    expect(evaluateTerminalResizeBounds(state, { height: 939, width: 561 }, 0)).toEqual({
      accept: true,
    });
    expect(evaluateTerminalResizeBounds(state, { height: 95, width: 133 }, 10).accept).toBe(false);

    expect(evaluateTerminalResizeBounds(state, { height: 94, width: 134 }, 180)).toEqual({
      accept: true,
    });
  });

  test("accepts normal pane size changes immediately", () => {
    const state = createTerminalResizeStabilityState();

    expect(evaluateTerminalResizeBounds(state, { height: 939, width: 561 }, 0)).toEqual({
      accept: true,
    });

    expect(evaluateTerminalResizeBounds(state, { height: 840, width: 520 }, 10)).toEqual({
      accept: true,
    });
  });
});
