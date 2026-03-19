import * as vscode from "vscode";
import { type TerminalViewMode, type VisibleSessionCount } from "../shared/session-grid-contract";
import { NativeTerminalWorkspaceController, SESSIONS_VIEW_ID } from "./native-terminal-workspace";

const SESSION_CONTAINER_ID = "agentCanvasXSessions";

export function activate(context: vscode.ExtensionContext): void {
  const workspace = new NativeTerminalWorkspaceController(context);

  context.subscriptions.push(
    workspace,
    vscode.window.registerWebviewViewProvider(SESSIONS_VIEW_ID, workspace.sidebarProvider),
    registerCommand("agentCanvasX.openWorkspace", () => workspace.openWorkspace()),
    registerCommand("agentCanvasX.openSettings", () => workspace.openSettings()),
    registerCommand("agentCanvasX.createSession", () => workspace.createSession()),
    registerCommand("agentCanvasX.revealSession", () => workspace.revealSession()),
    registerCommand("agentCanvasX.restartSession", () => workspace.restartSessionFromCommand()),
    registerCommand("agentCanvasX.renameActiveSession", () =>
      workspace.promptRenameFocusedSession(),
    ),
    registerFocusGroupCommand("agentCanvasX.focusGroup1", workspace, 1),
    registerFocusGroupCommand("agentCanvasX.focusGroup2", workspace, 2),
    registerFocusGroupCommand("agentCanvasX.focusGroup3", workspace, 3),
    registerFocusGroupCommand("agentCanvasX.focusGroup4", workspace, 4),
    registerCommand("agentCanvasX.focusUp", () => workspace.focusDirection("up")),
    registerCommand("agentCanvasX.focusRight", () => workspace.focusDirection("right")),
    registerCommand("agentCanvasX.focusDown", () => workspace.focusDirection("down")),
    registerCommand("agentCanvasX.focusLeft", () => workspace.focusDirection("left")),
    registerSlotFocusCommand("agentCanvasX.focusSessionSlot", workspace),
    registerVisibleCountCommand("agentCanvasX.showOne", workspace, 1),
    registerVisibleCountCommand("agentCanvasX.showTwo", workspace, 2),
    registerVisibleCountCommand("agentCanvasX.showThree", workspace, 3),
    registerVisibleCountCommand("agentCanvasX.showFour", workspace, 4),
    registerVisibleCountCommand("agentCanvasX.showSix", workspace, 6),
    registerVisibleCountCommand("agentCanvasX.showNine", workspace, 9),
    registerCommand("agentCanvasX.toggleFullscreenSession", async () => {
      await workspace.toggleFullscreenSession();
      await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    }),
    registerViewModeCommand("agentCanvasX.setHorizontalView", workspace, "horizontal"),
    registerViewModeCommand("agentCanvasX.setVerticalView", workspace, "vertical"),
    registerViewModeCommand("agentCanvasX.setGridView", workspace, "grid"),
    registerCommand("agentCanvasX.resetWorkspace", () => workspace.resetWorkspace()),
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
