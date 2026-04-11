import { describe, expect, test } from "vite-plus/test";
import { getResttyFontSources } from "./restty-terminal-config";

describe("getResttyFontSources", () => {
  test("should build local sources for each configured family in the default stack", () => {
    expect(
      getResttyFontSources('"MesloLGL Nerd Font Mono", Menlo, Monaco, "Courier New", monospace'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "MesloLGL Nerd Font Mono Regular",
          matchers: expect.arrayContaining(["MesloLGL Nerd Font Mono", "MesloLGLNerdFontMono"]),
          required: false,
          type: "local",
        }),
        expect.objectContaining({
          label: "Menlo Bold",
          matchers: expect.arrayContaining(["Menlo bold", "Menlobold"]),
          required: false,
          type: "local",
        }),
        expect.objectContaining({
          label: "Meslo fallback regular",
          type: "url",
        }),
        expect.objectContaining({
          label: "Meslo fallback bold",
          type: "url",
        }),
      ]),
    );
  });

  test("should keep bundled Meslo fallbacks when no font family is configured", () => {
    expect(getResttyFontSources(undefined)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Meslo fallback regular",
          type: "url",
        }),
        expect.objectContaining({
          label: "Meslo fallback bold",
          type: "url",
        }),
      ]),
    );
  });

  test("should build local variants for custom font families", () => {
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
        expect.objectContaining({
          label: "Meslo fallback regular",
          type: "url",
        }),
      ]),
    );
  });
});
