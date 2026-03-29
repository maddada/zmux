import { describe, expect, test, vi } from "vite-plus/test";

type Serializer = {
  deserializeWebviewPanel: (panel: MockWebviewPanel) => Promise<void>;
};

type MockDisposable = {
  dispose: ReturnType<typeof vi.fn>;
};

type MockWebview = {
  html: string;
  onDidReceiveMessage: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
  asWebviewUri: ReturnType<typeof vi.fn>;
};

type MockWebviewPanel = {
  active: boolean;
  dispose: ReturnType<typeof vi.fn>;
  iconPath?: unknown;
  onDidDispose: ReturnType<typeof vi.fn>;
  reveal: ReturnType<typeof vi.fn>;
  title: string;
  viewColumn?: number;
  visible: boolean;
  webview: MockWebview;
};

let registeredSerializer: Serializer | undefined;
let createdPanels: MockWebviewPanel[] = [];

vi.mock("vscode", () => ({
  Uri: {
    joinPath: (...parts: unknown[]) => parts,
  },
  ViewColumn: {
    Active: -1,
    One: 1,
  },
  window: {
    createWebviewPanel: vi.fn((_viewType: string, _title: string, viewColumn: number) => {
      const panel = createMockPanel({ viewColumn });
      createdPanels.push(panel);
      return panel;
    }),
    registerWebviewPanelSerializer: vi.fn((_viewType: string, serializer: Serializer) => {
      registeredSerializer = serializer;
      return createDisposable();
    }),
  },
}));

import { WorkspacePanelManager } from "./workspace-panel";

describe("WorkspacePanelManager", () => {
  test("should dispose duplicate restored workspace panels", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    const firstPanel = createMockPanel({ viewColumn: 1 });
    const duplicatePanel = createMockPanel({ active: true, viewColumn: 2, visible: true });

    await registeredSerializer?.deserializeWebviewPanel(firstPanel);
    await registeredSerializer?.deserializeWebviewPanel(duplicatePanel);

    expect(firstPanel.dispose).not.toHaveBeenCalled();
    expect(firstPanel.reveal).toHaveBeenCalledWith(2, false);
    expect(duplicatePanel.dispose).toHaveBeenCalledTimes(1);

    manager.dispose();
  });

  test("should reuse the restored panel when revealing the workspace", async () => {
    const manager = new WorkspacePanelManager({
      context: createMockContext(),
      onMessage: vi.fn(),
    });
    const restoredPanel = createMockPanel({ viewColumn: 3 });

    await registeredSerializer?.deserializeWebviewPanel(restoredPanel);
    await manager.reveal();

    expect(createdPanels).toHaveLength(0);
    expect(restoredPanel.reveal).toHaveBeenCalledWith(1, false);

    manager.dispose();
  });
});

function createMockContext() {
  return {
    extensionUri: { path: "/extension" },
  } as never;
}

function createMockPanel({
  active = false,
  viewColumn,
  visible = false,
}: {
  active?: boolean;
  viewColumn?: number;
  visible?: boolean;
} = {}): MockWebviewPanel {
  const disposables: Array<() => void> = [];
  const panel: MockWebviewPanel = {
    active,
    dispose: vi.fn(() => {
      for (const dispose of disposables) {
        dispose();
      }
    }),
    onDidDispose: vi.fn((listener: () => void) => {
      disposables.push(listener);
      return createDisposable();
    }),
    reveal: vi.fn(),
    title: "",
    viewColumn,
    visible,
    webview: {
      asWebviewUri: vi.fn((value: unknown) => value),
      html: "",
      onDidReceiveMessage: vi.fn(() => createDisposable()),
      postMessage: vi.fn(async () => true),
    },
  };

  return panel;
}

function createDisposable(): MockDisposable {
  return {
    dispose: vi.fn(),
  };
}
