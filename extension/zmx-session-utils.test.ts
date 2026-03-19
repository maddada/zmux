import { describe, expect, test } from "vite-plus/test";
import { parseZmxListSessionNames, toZmxSessionName } from "./zmx-session-utils";

describe("zmx session helpers", () => {
  test("should namespace zmx session names with a compact workspace-scoped format", () => {
    expect(toZmxSessionName("abc123", "session-2")).toBe("vam2-abc123-s2");
  });

  test("should hash non-standard session ids into compact zmx session names", () => {
    expect(toZmxSessionName("abc123", "custom-session-id")).toMatch(/^vam2-abc123-[0-9a-f]{8}$/u);
  });

  test("should parse zmx list output into trimmed session names", () => {
    expect(parseZmxListSessionNames("\nfoo\r\nbar\n\nbaz\n")).toEqual(["foo", "bar", "baz"]);
  });
});
