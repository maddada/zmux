import * as vscode from "vscode";
import { type TerminalViewMode, type VisibleSessionCount } from "../shared/session-grid-contract";
import { DebuggingStatusIndicator } from "./debugging-status-indicator";
import { NativeTerminalWorkspaceController, SESSIONS_VIEW_ID } from "./native-terminal-workspace";

const SESSION_CONTAINER_ID = "VS-AGENT-MUXSessions";

export function activate(context: vscode.ExtensionContext): void {
  const workspace = new NativeTerminalWorkspaceController(context);
  const debuggingStatusIndicator = new DebuggingStatusIndicator(workspace);

  context.subscriptions.push(
    workspace,
    debuggingStatusIndicator,
    vscode.window.registerWebviewViewProvider(SESSIONS_VIEW_ID, workspace.sidebarProvider),
    registerCommand("VS-AGENT-MUX.openWorkspace", () => workspace.openWorkspace()),
    registerCommand("VS-AGENT-MUX.openSettings", () => workspace.openSettings()),
    registerCommand("VS-AGENT-MUX.createSession", () => workspace.createSession()),
    registerCommand("VS-AGENT-MUX.revealSession", () => workspace.revealSession()),
    registerCommand("VS-AGENT-MUX.restartSession", () => workspace.restartSessionFromCommand()),
    registerCommand("VS-AGENT-MUX.renameActiveSession", () =>
      workspace.promptRenameFocusedSession(),
    ),
    registerFocusGroupCommand("VS-AGENT-MUX.focusGroup1", workspace, 1),
    registerFocusGroupCommand("VS-AGENT-MUX.focusGroup2", workspace, 2),
    registerFocusGroupCommand("VS-AGENT-MUX.focusGroup3", workspace, 3),
    registerFocusGroupCommand("VS-AGENT-MUX.focusGroup4", workspace, 4),
    registerCommand("VS-AGENT-MUX.focusUp", () => workspace.focusDirection("up")),
    registerCommand("VS-AGENT-MUX.focusRight", () => workspace.focusDirection("right")),
    registerCommand("VS-AGENT-MUX.focusDown", () => workspace.focusDirection("down")),
    registerCommand("VS-AGENT-MUX.focusLeft", () => workspace.focusDirection("left")),
    registerSlotFocusCommand("VS-AGENT-MUX.focusSessionSlot", workspace),
    registerVisibleCountCommand("VS-AGENT-MUX.showOne", workspace, 1),
    registerVisibleCountCommand("VS-AGENT-MUX.showTwo", workspace, 2),
    registerVisibleCountCommand("VS-AGENT-MUX.showThree", workspace, 3),
    registerVisibleCountCommand("VS-AGENT-MUX.showFour", workspace, 4),
    registerVisibleCountCommand("VS-AGENT-MUX.showSix", workspace, 6),
    registerVisibleCountCommand("VS-AGENT-MUX.showNine", workspace, 9),
    registerCommand("VS-AGENT-MUX.toggleFullscreenSession", async () => {
      await workspace.toggleFullscreenSession();
      await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    }),
    registerViewModeCommand("VS-AGENT-MUX.setHorizontalView", workspace, "horizontal"),
    registerViewModeCommand("VS-AGENT-MUX.setVerticalView", workspace, "vertical"),
    registerViewModeCommand("VS-AGENT-MUX.setGridView", workspace, "grid"),
    registerCommand("VS-AGENT-MUX.resetWorkspace", () => workspace.resetWorkspace()),
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
