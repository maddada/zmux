import { describe, expect, test } from "vite-plus/test";
import { ZMX_DOWNLOAD_URLS, getSupportedZmxTarget } from "./zmx-binary-helpers";

describe("zmx binary helpers", () => {
  test("should resolve download targets for supported platforms", () => {
    expect(getSupportedZmxTarget("darwin", "arm64")).toBe("darwin-arm64");
    expect(getSupportedZmxTarget("linux", "x64")).toBe("linux-x64");
  });

  test("should pin zmx download URLs for the supported targets", () => {
    expect(ZMX_DOWNLOAD_URLS["darwin-arm64"]).toContain("macos-aarch64.tar.gz");
    expect(ZMX_DOWNLOAD_URLS["linux-x64"]).toContain("linux-x86_64.tar.gz");
  });
});
