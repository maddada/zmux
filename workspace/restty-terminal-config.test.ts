import { describe, expect, test } from "vite-plus/test";
import { getResttyFontSources } from "./restty-terminal-config";

describe("getResttyFontSources", () => {
  test("should return bundled font sources when local fonts are unavailable", () => {
    const globalWithLocalFonts = globalThis as typeof globalThis & {
      queryLocalFonts?: unknown;
    };
    const originalQueryLocalFonts = globalWithLocalFonts.queryLocalFonts;
    // Mirror the VS Code webview case where the capability is not available at all.
    Object.defineProperty(globalThis, "queryLocalFonts", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getResttyFontSources('"Fira Code", monospace')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "Bundled JetBrains Mono",
            type: "url",
            url: expect.stringContaining("JetBrainsMono"),
          }),
          expect.objectContaining({
            label: "Bundled Meslo Nerd Font Mono",
            type: "url",
            url: expect.stringContaining("MesloLGLNerdFontMono-Regular"),
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

  test("should fall back to bundled sources for generic default families", () => {
    expect(getResttyFontSources("monospace")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Bundled JetBrains Mono",
          type: "url",
          url: expect.stringContaining("JetBrainsMono"),
        }),
      ]),
    );
  });

  test("should return bundled sources when no font family is configured", () => {
    expect(getResttyFontSources(undefined)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Bundled JetBrains Mono",
          type: "url",
          url: expect.stringContaining("JetBrainsMono"),
        }),
      ]),
    );
  });

  test("should build plain local sources for custom font families and append bundled fallbacks", () => {
    const globalWithLocalFonts = globalThis as typeof globalThis & {
      queryLocalFonts?: unknown;
    };
    const originalQueryLocalFonts = globalWithLocalFonts.queryLocalFonts;
    Object.defineProperty(globalThis, "queryLocalFonts", {
      configurable: true,
      value: async () => [],
    });

    try {
      expect(getResttyFontSources('"Fira Code", monospace')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "Fira Code",
            matchers: expect.arrayContaining(["Fira Code", "FiraCode"]),
            required: false,
            type: "local",
          }),
          expect.objectContaining({
            label: "Bundled Meslo Nerd Font Mono",
            type: "url",
            url: expect.stringContaining("MesloLGLNerdFontMono-Regular"),
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

  test("should not create bold-only sources that can override the configured regular family", () => {
    const globalWithLocalFonts = globalThis as typeof globalThis & {
      queryLocalFonts?: unknown;
    };
    const originalQueryLocalFonts = globalWithLocalFonts.queryLocalFonts;
    Object.defineProperty(globalThis, "queryLocalFonts", {
      configurable: true,
      value: async () => [],
    });

    try {
      expect(
        getResttyFontSources('"JetBrains Mono", "MesloLGL Nerd Font Mono", monospace').filter(
          (source) => /\bbold\b/i.test(source.label ?? ""),
        ),
      ).toEqual([]);
    } finally {
      Object.defineProperty(globalThis, "queryLocalFonts", {
        configurable: true,
        value: originalQueryLocalFonts,
      });
    }
  });
});
