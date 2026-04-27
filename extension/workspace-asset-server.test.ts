import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("vscode", () => ({}));

import {
  areSharedT3EmbedAssetsCompatible,
  resolveEmbeddedAssetIndexSignature,
} from "./workspace-asset-server";

describe("resolveEmbeddedAssetIndexSignature", () => {
  test("reads the embedded script and stylesheet asset paths", () => {
    expect(
      resolveEmbeddedAssetIndexSignature(`<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/assets/index-new.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-new.css">
  </head>
</html>`),
    ).toEqual({
      scriptSrc: "/assets/index-new.js",
      styleHref: "/assets/index-new.css",
    });
  });

  test("returns nulls when the embedded asset references are missing", () => {
    expect(resolveEmbeddedAssetIndexSignature("<html><head></head></html>")).toEqual({
      scriptSrc: null,
      styleHref: null,
    });
  });
});

describe("areSharedT3EmbedAssetsCompatible", () => {
  const frameHostScript = "console.log('frame-host');";
  const expectedIndexHtml = `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/assets/index-new.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-new.css">
  </head>
</html>`;

  test("accepts a shared server that serves the same frame host and embed asset hashes", () => {
    expect(
      areSharedT3EmbedAssetsCompatible({
        actualFrameHostScript: frameHostScript,
        actualT3IndexHtml: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <script type="module" crossorigin src="/assets/index-new.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-new.css">
  </head>
</html>`,
        expectedFrameHostScript: frameHostScript,
        expectedT3IndexHtml: expectedIndexHtml,
      }),
    ).toBe(true);
  });

  test("rejects a shared server when the embed script hash is stale", () => {
    expect(
      areSharedT3EmbedAssetsCompatible({
        actualFrameHostScript: frameHostScript,
        actualT3IndexHtml: `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/assets/index-old.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-old.css">
  </head>
</html>`,
        expectedFrameHostScript: frameHostScript,
        expectedT3IndexHtml: expectedIndexHtml,
      }),
    ).toBe(false);
  });

  test("rejects a shared server when the frame host script differs", () => {
    expect(
      areSharedT3EmbedAssetsCompatible({
        actualFrameHostScript: "console.log('old-frame-host');",
        actualT3IndexHtml: expectedIndexHtml,
        expectedFrameHostScript: frameHostScript,
        expectedT3IndexHtml: expectedIndexHtml,
      }),
    ).toBe(false);
  });
});
