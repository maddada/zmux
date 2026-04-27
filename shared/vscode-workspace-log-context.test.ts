import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("vscode", () => ({
  workspace: {
    name: undefined,
    workspaceFile: undefined,
    workspaceFolders: undefined,
  },
}));

import {
  NO_VSCODE_WORKSPACE_LOG_LABEL,
  resolveVscodeWorkspaceLogLabel,
} from "./vscode-workspace-log-context";

describe("resolveVscodeWorkspaceLogLabel", () => {
  test("should prefer the VS Code workspace name when available", () => {
    expect(
      resolveVscodeWorkspaceLogLabel({
        name: "Client Workspace",
        workspaceFilePath: "/Users/example/dev/client.code-workspace",
        workspaceFolderName: "client",
        workspaceFolderPath: "/Users/example/dev/client",
      }),
    ).toBe("Client Workspace");
  });

  test("should fall back to the workspace file name without the extension", () => {
    expect(
      resolveVscodeWorkspaceLogLabel({
        workspaceFilePath: "/Users/example/dev/client.code-workspace",
      }),
    ).toBe("client");
  });

  test("should fall back to the first workspace folder name", () => {
    expect(
      resolveVscodeWorkspaceLogLabel({
        workspaceFolderName: "client-folder",
      }),
    ).toBe("client-folder");
  });

  test("should fall back to the first workspace folder basename", () => {
    expect(
      resolveVscodeWorkspaceLogLabel({
        workspaceFolderPath: "/Users/example/dev/client-from-path",
      }),
    ).toBe("client-from-path");
  });

  test("should use a stable placeholder when there is no workspace context", () => {
    expect(resolveVscodeWorkspaceLogLabel({})).toBe(NO_VSCODE_WORKSPACE_LOG_LABEL);
  });
});
