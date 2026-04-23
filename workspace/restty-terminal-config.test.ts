import { describe, expect, test } from "vite-plus/test";
import { getResttyFontSources } from "./restty-terminal-config";

describe("getResttyFontSources", () => {
  test("should return no local font sources when local fonts are unavailable", () => {
    const originalQueryLocalFonts = globalThis.queryLocalFonts;
    // Mirror the VS Code webview case where the capability is not available at all.
    Object.defineProperty(globalThis, "queryLocalFonts", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getResttyFontSources('"Fira Code", monospace')).toEqual([]);
    } finally {
      Object.defineProperty(globalThis, "queryLocalFonts", {
        configurable: true,
        value: originalQueryLocalFonts,
      });
    }
  });

  test("should ignore generic default families like xterm's monospace", () => {
    expect(getResttyFontSources("monospace")).toEqual([]);
  });

  test("should return no custom font sources when no font family is configured", () => {
    expect(getResttyFontSources(undefined)).toEqual([]);
  });

  test("should build local variants for custom font families", () => {
    const originalQueryLocalFonts = globalThis.queryLocalFonts;
    Object.defineProperty(globalThis, "queryLocalFonts", {
      configurable: true,
      value: async () => [],
    });

    try {
      expect(getResttyFontSources('"Fira Code", monospace')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "Fira Code Regular",
            matchers: expect.arrayContaining([
              "Fira Code",
              "FiraCode",
              "Fira Code regular",
              "FiraCoderegular",
            ]),
            required: false,
            type: "local",
          }),
          expect.objectContaining({
            label: "Fira Code Bold Italic",
            matchers: expect.arrayContaining(["Fira Code bold italic", "FiraCodebolditalic"]),
            required: false,
            type: "local",
          }),
        ]),
      );
    } finally {
      Object.defineProperty(globalThis, "queryLocalFonts", {
        configurable: true,
        value: originalQueryLocalFonts,
      });
    }
  });
});
