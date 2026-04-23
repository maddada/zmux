import * as vscode from "vscode";
import { activate as activateChatHistory } from "../chat-history/src/extension/extension";
import { setChatHistoryVSmuxTarget } from "./chat-history-vsmux-bridge";
import { type VisibleSessionCount } from "../shared/session-grid-contract";
import { maybeAutoOpenSidebarViewsOnStartup } from "./auto-open-sidebar-views";
import { DebuggingStatusIndicator } from "./debugging-status-indicator";
import { NativeTerminalWorkspaceController, SESSIONS_VIEW_ID } from "./native-terminal-workspace";
import { initializeSharedWorkspaceAppearancePreferences } from "./shared-workspace-appearance-preferences";
import { runStaleVsmuxProcessJanitor } from "./stale-process-janitor";
import { appendTerminalRestartReproLog } from "./terminal-restart-repro-log";
import { getWorkspaceId } from "./terminal-workspace-environment";
import { initializeVSmuxDebugLog } from "./vsmux-debug-log";
import {
  registerModalPromptEditorInterceptor,
  saveAndCloseActivePromptTempModalEditor,
} from "./modal-prompt-editor-interceptor";

let activeWorkspaceController: NativeTerminalWorkspaceController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const workspaceId = getWorkspaceId();
  void appendTerminalRestartReproLog(workspaceRoot, "extension.activate.start", {
    extensionHostPid: process.pid,
    extensionVersion: context.extension.packageJSON.version,
    workspaceFolderCount: vscode.workspace.workspaceFolders?.length ?? 0,
  });
  initializeVSmuxDebugLog(context);
  activateChatHistory(context);
  initializeSharedWorkspaceAppearancePreferences(context);
  const workspace = new NativeTerminalWorkspaceController(context);
  activeWorkspaceController = workspace;
  setChatHistoryVSmuxTarget(workspace);
  const debuggingStatusIndicator = new DebuggingStatusIndicator(workspace);

  context.subscriptions.push(
    {
      dispose: () => {
        setChatHistoryVSmuxTarget(undefined);
      },
    },
    workspace,
    debuggingStatusIndicator,
    registerModalPromptEditorInterceptor(),
    vscode.window.registerWebviewViewProvider(SESSIONS_VIEW_ID, workspace.sidebarProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
    registerCommand("VSmux.openWorkspace", () => workspace.openWorkspace()),
    registerCommand("VSmux.saveAndClosePromptTempModal", () =>
      saveAndCloseActivePromptTempModalEditor(),
    ),
    registerCommand("VSmux.revealWorkspaceInBackground", () =>
      workspace.revealWorkspaceInBackground(),
    ),
    registerCommand("VSmux.openSettings", () => workspace.openSettings()),
    registerCommand("VSmux.moveToSecondarySidebar", () =>
      workspace.moveSidebarToSecondarySidebar(),
    ),
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
    registerCommand("VSmux.focusPreviousSidebarSession", () =>
      workspace.focusAdjacentSidebarSession(-1),
    ),
    registerCommand("VSmux.focusNextSidebarSession", () =>
      workspace.focusAdjacentSidebarSession(1),
    ),
    registerSlotFocusCommand("VSmux.focusSessionSlot", workspace),
    registerVisibleCountCommand("VSmux.showOne", workspace, 1),
    registerVisibleCountCommand("VSmux.showTwo", workspace, 2),
    registerVisibleCountCommand("VSmux.showThree", workspace, 3),
    registerVisibleCountCommand("VSmux.showFour", workspace, 4),
    registerVisibleCountCommand("VSmux.showSix", workspace, 6),
    registerVisibleCountCommand("VSmux.showNine", workspace, 9),
    registerCommand("VSmux.toggleFullscreenSession", async () => {
      await workspace.toggleFullscreenSession();
      await workspace.revealSidebar();
    }),
    registerCommand("VSmux.resetWorkspace", () => workspace.resetWorkspace()),
  );

  void (async () => {
    try {
      await runStaleVsmuxProcessJanitor(context, workspaceId, workspaceRoot);
      await workspace.initialize();
      await maybeAutoOpenSidebarViewsOnStartup(workspace);
      await appendTerminalRestartReproLog(workspaceRoot, "extension.activate.complete", {
        extensionHostPid: process.pid,
        extensionVersion: context.extension.packageJSON.version,
      });
    } catch (error) {
      await appendTerminalRestartReproLog(workspaceRoot, "extension.activate.failed", {
        error: getErrorMessage(error),
        extensionHostPid: process.pid,
      });
      void vscode.window.showErrorMessage(getErrorMessage(error));
    }
  })();
}

export async function deactivate(): Promise<void> {
  const workspace = activeWorkspaceController;
  activeWorkspaceController = undefined;
  setChatHistoryVSmuxTarget(undefined);
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  await appendTerminalRestartReproLog(workspaceRoot, "extension.deactivate.start", {
    extensionHostPid: process.pid,
    hasWorkspaceController: workspace !== undefined,
  });
  if (!workspace) {
    return;
  }

  await workspace.releaseForDeactivation().catch(() => undefined);
  await appendTerminalRestartReproLog(workspaceRoot, "extension.deactivate.complete", {
    extensionHostPid: process.pid,
  });
}

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
    await workspace.revealSidebar();
  });
}

function registerFocusGroupCommand(
  command: string,
  workspace: NativeTerminalWorkspaceController,
  groupIndex: number,
): vscode.Disposable {
  return registerCommand(command, async () => {
    await workspace.focusGroupByIndex(groupIndex);
    await workspace.revealSidebar();
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
