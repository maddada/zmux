import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("vscode", () => ({
  TabInputCustom: class TabInputCustom {
    public constructor(
      public readonly uri: { toString: (skipEncoding?: boolean) => string },
      public readonly viewType: string,
    ) {}
  },
  TabInputText: class TabInputText {
    public constructor(public readonly uri: { toString: (skipEncoding?: boolean) => string }) {}
  },
  TabInputTextDiff: class TabInputTextDiff {
    public constructor(
      public readonly original: { toString: (skipEncoding?: boolean) => string },
      public readonly modified: { toString: (skipEncoding?: boolean) => string },
    ) {}
  },
  TabInputWebview: class TabInputWebview {
    public constructor(public readonly viewType: string) {}
  },
  Uri: {
    parse(value: string) {
      const schemeSeparatorIndex = value.indexOf(":");
      return {
        scheme: schemeSeparatorIndex >= 0 ? value.slice(0, schemeSeparatorIndex) : "",
        toString: () => value,
      };
    },
  },
  window: {
    tabGroups: {
      all: [],
    },
  },
}));

import * as vscode from "vscode";
import { getLiveBrowserTabs } from "./live-browser-tabs";

describe("getLiveBrowserTabs", () => {
  test("should detect Simple Browser webview tabs", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "Simple Browser",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        inputKind: "webview",
        label: "Simple Browser",
        viewType: "simpleBrowser.view",
        viewColumn: 1,
      }),
    );
  });

  test("should detect custom tabs backed by http urls", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: false,
        tabs: [
          {
            input: new vscode.TabInputCustom(
              vscode.Uri.parse("http://localhost:5173"),
              "test.browser",
            ),
            isActive: false,
            label: "localhost",
          },
        ],
        viewColumn: 2,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://localhost:5173",
        inputKind: "custom",
        label: "localhost",
        url: "http://localhost:5173",
        viewColumn: 2,
      }),
    );
  });

  test("should ignore VSmux T3 webviews", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("VSmux.t3Session"),
            isActive: true,
            label: "T3",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore VS Code diff editors", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputTextDiff(
              vscode.Uri.parse("file:///tmp/original.ts"),
              vscode.Uri.parse("file:///tmp/modified.ts"),
            ),
            isActive: true,
            label: "original.ts ↔ modified.ts",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore tabs whose title includes (Working Tree)", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("git.diff"),
            isActive: true,
            label: "foo.ts (Working Tree)",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore the VS Code Welcome tab", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("workbench.welcomePage"),
            isActive: true,
            label: "Welcome",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore the VSmux workspace webview", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("vsmux.workspace"),
            isActive: true,
            label: "VSmux",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore restored VSmux custom tabs without an http url", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputCustom(
              vscode.Uri.parse("vscode-webview://workspace-panel"),
              "some.restored.custom",
            ),
            isActive: true,
            label: "VSmux",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore VSmux localhost asset tabs", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputCustom(
              vscode.Uri.parse("http://127.0.0.1:41111/workspace/index.html"),
              "simpleBrowser.view",
            ),
            isActive: true,
            label: "VSmux",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should still allow real browser tabs titled VSmux", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputCustom(
              vscode.Uri.parse("https://example.com/vsmux"),
              "simpleBrowser.view",
            ),
            isActive: true,
            label: "VSmux",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "https://example.com/vsmux",
        label: "VSmux",
      }),
    );
  });
});
