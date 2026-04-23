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
  workspace: {
    getConfiguration: () => ({
      get: () => false,
    }),
    workspaceFolders: undefined,
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
  test("should ignore browser webviews whose labels do not look like urls", () => {
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

    expect(browserTabs).toEqual([]);
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

  test("should detect webview tabs whose labels start with http", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "https://example.com/docs",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "https://example.com/docs",
        inputKind: "webview",
        label: "https://example.com/docs",
        url: "https://example.com/docs",
        viewType: "simpleBrowser.view",
      }),
    );
  });

  test("should detect embedded http urls inside Storybook-style webview titles", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label:
              "Sidebar / Interactions - Inline Search Filters Groups In Place - Storybook (http://localhost:6006/?path=/story/sidebar-interactions--inline-search-filters-groups-in-place)",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail:
          "http://localhost:6006/?path=/story/sidebar-interactions--inline-search-filters-groups-in-place",
        inputKind: "webview",
        url: "http://localhost:6006/?path=/story/sidebar-interactions--inline-search-filters-groups-in-place",
        viewType: "simpleBrowser.view",
      }),
    );
  });

  test("should detect embedded Storybook urls on unknown-input tabs with noisy query separators", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: undefined,
            isActive: true,
            label:
              "Sidebar / Interactions - Toolbar Actions - Storybook (http://192.168.1.132:6007|? path%3D%2Fstory%2Fsidebar-interactions--toolbar-actions)",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://192.168.1.132:6007?path%3D%2Fstory%2Fsidebar-interactions--toolbar-actions",
        inputKind: "undefined",
        url: "http://192.168.1.132:6007?path%3D%2Fstory%2Fsidebar-interactions--toolbar-actions",
      }),
    );
  });

  test("should detect unknown-input titles with slashes when they contain an explicit http url", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: undefined,
            isActive: true,
            label: "Docs / Routing (https://example.com/docs/routing)",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "https://example.com/docs/routing",
        inputKind: "undefined",
        url: "https://example.com/docs/routing",
      }),
    );
  });

  test("should detect simple browser tabs whose labels are page titles", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "Google",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        inputKind: "webview",
        label: "Google",
        url: undefined,
        viewType: "simpleBrowser.view",
        viewColumn: 1,
      }),
    );
  });

  test("should detect unknown-input tabs whose labels look like browser page titles", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: undefined,
            isActive: true,
            label: "Google",
          },
          {
            input: undefined,
            isActive: false,
            label: "My App",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(2);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        inputKind: "undefined",
        label: "Google",
        url: undefined,
      }),
    );
    expect(browserTabs[1]).toEqual(
      expect.objectContaining({
        inputKind: "undefined",
        label: "My App",
        url: undefined,
      }),
    );
  });

  test("should detect webview tabs whose labels are localhost hosts", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "localhost:3000",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://localhost:3000",
        label: "localhost:3000",
        url: "http://localhost:3000",
      }),
    );
  });

  test("should detect webview tabs whose labels are ip hosts", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "127.0.0.1:4173/path",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://127.0.0.1:4173/path",
        label: "127.0.0.1:4173/path",
        url: "http://127.0.0.1:4173/path",
      }),
    );
  });

  test("should detect webview tabs whose labels are domain hosts", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "app.example.com:8080/dashboard",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://app.example.com:8080/dashboard",
        label: "app.example.com:8080/dashboard",
        url: "http://app.example.com:8080/dashboard",
      }),
    );
  });

  test("should detect bare domain labels on webview tabs", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "app.example.com",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://app.example.com",
        label: "app.example.com",
        url: "http://app.example.com",
      }),
    );
  });

  test("should detect bare domain labels on custom tabs", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputCustom(
              vscode.Uri.parse("vscode-webview://ignored"),
              "some.browser.tab",
            ),
            isActive: true,
            label: "www.google.com",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://www.google.com",
        inputKind: "custom",
        label: "www.google.com",
        url: "http://www.google.com",
      }),
    );
  });

  test("should detect wrapped localhost labels", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "[localhost:3000]",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://localhost:3000",
        label: "[localhost:3000]",
        url: "http://localhost:3000",
      }),
    );
  });

  test("should detect wrapped domain labels", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("simpleBrowser.view"),
            isActive: true,
            label: "(app.example.com/dashboard)",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toHaveLength(1);
    expect(browserTabs[0]).toEqual(
      expect.objectContaining({
        detail: "http://app.example.com/dashboard",
        label: "(app.example.com/dashboard)",
        url: "http://app.example.com/dashboard",
      }),
    );
  });

  test("should ignore text tabs whose labels look like dotted filenames", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputText(
              vscode.Uri.parse("file:///tmp/vite.debug-panel.config.ts"),
            ),
            isActive: true,
            label: "vite.debug-panel.config.ts",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore unknown-input tabs whose labels look like filenames", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: undefined,
            isActive: true,
            label: "vite.debug-panel.config.ts",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
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

  test("should ignore Claude Code editor panels", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("claudeVSCodePanel"),
            isActive: true,
            label: "Automate organizer onboarding",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore Claude plan preview panels", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("claudePlanPreview"),
            isActive: true,
            label: "Plan Preview",
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

  test("should ignore the VS Code Settings tab", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("workbench.editor.settings"),
            isActive: true,
            label: "Settings",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore the VS Code Keyboard Shortcuts tab", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("workbench.editor.keybindings"),
            isActive: true,
            label: "Keyboard Shortcuts",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore tabs whose title includes Extension:", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("workbench.extension.someExtension"),
            isActive: true,
            label: "Extension: Some Extension",
          },
        ],
        viewColumn: 1,
      } as never,
    ]);

    expect(browserTabs).toEqual([]);
  });

  test("should ignore tabs whose title starts with VSmux Search", () => {
    const browserTabs = getLiveBrowserTabs([
      {
        isActive: true,
        tabs: [
          {
            input: new vscode.TabInputWebview("workbench.vsmuxsearch.panel"),
            isActive: true,
            label: "VSmux Search - Network",
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
