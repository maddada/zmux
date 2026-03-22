import * as vscode from "vscode";
import { type TerminalViewMode, type VisibleSessionCount } from "../shared/session-grid-contract";
import { DebuggingStatusIndicator } from "./debugging-status-indicator";
import { NativeTerminalWorkspaceController, SESSIONS_VIEW_ID } from "./native-terminal-workspace";

const SESSION_CONTAINER_ID = "VSmuxSessions";

export function activate(context: vscode.ExtensionContext): void {
  const workspace = new NativeTerminalWorkspaceController(context);
  const debuggingStatusIndicator = new DebuggingStatusIndicator(workspace);

  context.subscriptions.push(
    workspace,
    debuggingStatusIndicator,
    vscode.window.registerWebviewViewProvider(SESSIONS_VIEW_ID, workspace.sidebarProvider),
    registerCommand("VSmux.openWorkspace", () => workspace.openWorkspace()),
    registerCommand("VSmux.openDebugInspector", () => workspace.openDebugInspector()),
    registerCommand("VSmux.openSettings", () => workspace.openSettings()),
    registerCommand("VSmux.createSession", () => workspace.createSession()),
    registerCommand("VSmux.revealSession", () => workspace.revealSession()),
    registerCommand("VSmux.restartSession", () => workspace.restartSessionFromCommand()),
    registerCommand("VSmux.renameActiveSession", () => workspace.promptRenameFocusedSession()),
    registerFocusGroupCommand("VSmux.focusGroup1", workspace, 1),
    registerFocusGroupCommand("VSmux.focusGroup2", workspace, 2),
    registerFocusGroupCommand("VSmux.focusGroup3", workspace, 3),
    registerFocusGroupCommand("VSmux.focusGroup4", workspace, 4),
    registerCommand("VSmux.focusUp", () => workspace.focusDirection("up")),
    registerCommand("VSmux.focusRight", () => workspace.focusDirection("right")),
    registerCommand("VSmux.focusDown", () => workspace.focusDirection("down")),
    registerCommand("VSmux.focusLeft", () => workspace.focusDirection("left")),
    registerSlotFocusCommand("VSmux.focusSessionSlot", workspace),
    registerVisibleCountCommand("VSmux.showOne", workspace, 1),
    registerVisibleCountCommand("VSmux.showTwo", workspace, 2),
    registerVisibleCountCommand("VSmux.showThree", workspace, 3),
    registerVisibleCountCommand("VSmux.showFour", workspace, 4),
    registerVisibleCountCommand("VSmux.showSix", workspace, 6),
    registerVisibleCountCommand("VSmux.showNine", workspace, 9),
    registerCommand("VSmux.toggleFullscreenSession", async () => {
      await workspace.toggleFullscreenSession();
      await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    }),
    registerViewModeCommand("VSmux.setHorizontalView", workspace, "horizontal"),
    registerViewModeCommand("VSmux.setVerticalView", workspace, "vertical"),
    registerViewModeCommand("VSmux.setGridView", workspace, "grid"),
    registerCommand("VSmux.resetWorkspace", () => workspace.resetWorkspace()),
  );

  void workspace.initialize().catch((error) => {
    void vscode.window.showErrorMessage(getErrorMessage(error));
  });
}

export function deactivate(): void {}

function registerCommand(command: string, callback: () => Promise<void> | void): vscode.Disposable {
  return vscode.commands.registerCommand(command, () => {
    void Promise.resolve(callback()).catch((error) => {
      void vscode.window.showErrorMessage(getErrorMessage(error));
    });
  });
}

function registerVisibleCountCommand(
  command: string,
  workspace: NativeTerminalWorkspaceController,
  visibleCount: VisibleSessionCount,
): vscode.Disposable {
  return registerCommand(command, async () => {
    await workspace.setVisibleCount(visibleCount);
    await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
  });
}

function registerFocusGroupCommand(
  command: string,
  workspace: NativeTerminalWorkspaceController,
  groupIndex: number,
): vscode.Disposable {
  return registerCommand(command, async () => {
    await workspace.focusGroupByIndex(groupIndex);
    await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
  });
}

function registerSlotFocusCommand(
  command: string,
  workspace: NativeTerminalWorkspaceController,
): vscode.Disposable {
  return vscode.commands.registerCommand(command, (slotNumber?: number) => {
    const resolvedSlotNumber = typeof slotNumber === "number" ? slotNumber : Number(slotNumber);
    if (!Number.isFinite(resolvedSlotNumber)) {
      return;
    }

    void workspace.focusSessionSlot(resolvedSlotNumber).catch((error) => {
      void vscode.window.showErrorMessage(getErrorMessage(error));
    });
  });
}

function registerViewModeCommand(
  command: string,
  workspace: NativeTerminalWorkspaceController,
  viewMode: TerminalViewMode,
): vscode.Disposable {
  return registerCommand(command, async () => {
    await workspace.setViewMode(viewMode);
    await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
