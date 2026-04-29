import { describe, expect, test } from "vitest";
import {
  mergeGhosttyConfigLines,
  ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES,
} from "./ghostty-config-actions";

describe("mergeGhosttyConfigLines", () => {
  test("applies recommended Ghostty settings without removing unrelated config", () => {
    /**
     * CDXC:GhosttySettings 2026-04-30-01:48
     * Applying recommended settings must replace zmux-managed Ghostty keys but
     * retain user-owned settings such as keybinds.
     */
    expect(
      mergeGhosttyConfigLines(
        [
          "keybind = cmd+t=new_tab",
          "theme = Dracula",
          "font-size = 18",
          "window-padding-x = 4",
        ].join("\n"),
        ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES,
      ),
    ).toContain(
      [
        "keybind = cmd+t=new_tab",
        "window-padding-x = 4",
        "# Applied by zmux:",
        "theme = GitHub Dark",
      ].join("\n"),
    );
  });

  test("resets zmux-managed Ghostty settings to defaults", () => {
    expect(
      mergeGhosttyConfigLines(
        ["theme = Dracula", "font-size = 18", "window-padding-x = 4"].join("\n"),
        [],
      ),
    ).toBe("window-padding-x = 4\n");
  });
});
