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
              {
                toString: () => "http://localhost:5173",
              },
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
});
