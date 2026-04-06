import { describe, expect, test } from "vite-plus/test";
import { getResttyFontSources } from "./restty-terminal-config";

describe("getResttyFontSources", () => {
  test("should skip optional local font probing for the bundled default stack", () => {
    expect(
      getResttyFontSources('"MesloLGL Nerd Font Mono", Menlo, Monaco, "Courier New", monospace'),
    ).toEqual([
      expect.objectContaining({
        label: "Meslo fallback",
        type: "url",
      }),
    ]);
  });

  test("should skip optional local font probing when no font family is configured", () => {
    expect(getResttyFontSources(undefined)).toEqual([
      expect.objectContaining({
        label: "Meslo fallback",
        type: "url",
      }),
    ]);
  });

  test("should keep optional local probing for custom font families", () => {
    expect(getResttyFontSources('"Fira Code", monospace')).toEqual([
      {
        label: "Configured font",
        matchers: ["Fira Code"],
        required: false,
        type: "local",
      },
      expect.objectContaining({
        label: "Meslo fallback",
        type: "url",
      }),
    ]);
  });
});
