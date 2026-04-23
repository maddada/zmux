import { describe, expect, test } from "vite-plus/test";
import { getWtermThemeCssVariables } from "./wterm-appearance";

describe("getWtermThemeCssVariables", () => {
  test("should map terminal theme colors into wterm CSS variables", () => {
    const cssVariables = getWtermThemeCssVariables({
      background: "#313233",
      black: "#010203",
      blue: "#040506",
      brightBlack: "#070809",
      brightBlue: "#0a0b0c",
      brightCyan: "#0d0e0f",
      brightGreen: "#101112",
      brightMagenta: "#131415",
      brightRed: "#161718",
      brightWhite: "#191a1b",
      brightYellow: "#1c1d1e",
      cursor: "#3a3b3c",
      cyan: "#1f2021",
      foreground: "#343536",
      green: "#222324",
      magenta: "#252627",
      red: "#28292a",
      selectionBackground: "rgba(1, 2, 3, 0.4)",
      white: "#2b2c2d",
      yellow: "#2e2f30",
    });

    expect(cssVariables["--term-bg"]).toBe("#313233");
    expect(cssVariables["--term-fg"]).toBe("#343536");
    expect(cssVariables["--term-cursor"]).toBe("#3a3b3c");
    expect(cssVariables["--term-selection-background"]).toBe("rgba(1, 2, 3, 0.4)");
    expect(cssVariables["--term-color-0"]).toBe("#010203");
    expect(cssVariables["--term-color-4"]).toBe("#040506");
    expect(cssVariables["--term-color-14"]).toBe("#0d0e0f");
  });
});
