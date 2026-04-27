import * as vscode from "vscode";
import { activate as activateChatHistory } from "../chat-history/src/extension/extension";
import { setChatHistoryzmuxTarget } from "./chat-history-zmux-bridge";
import { type VisibleSessionCount } from "../shared/session-grid-contract";
import { maybeAutoOpenSidebarViewsOnStartup } from "./auto-open-sidebar-views";
import { DebuggingStatusIndicator } from "./debugging-status-indicator";
import { NativeTerminalWorkspaceController, SESSIONS_VIEW_ID } from "./native-terminal-workspace";
import { initializeSharedWorkspaceAppearancePreferences } from "./shared-workspace-appearance-preferences";
import { runStaleVsmuxProcessJanitor } from "./stale-process-janitor";
import { appendTerminalRestartReproLog } from "./terminal-restart-repro-log";
import { getWorkspaceId } from "./terminal-workspace-environment";
import { initializezmuxDebugLog } from "./zmux-debug-log";
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
  initializezmuxDebugLog(context);
  activateChatHistory(context);
  initializeSharedWorkspaceAppearancePreferences(context);
  const workspace = new NativeTerminalWorkspaceController(context);
  activeWorkspaceController = workspace;
  setChatHistoryzmuxTarget(workspace);
  const debuggingStatusIndicator = new DebuggingStatusIndicator(workspace);

  context.subscriptions.push(
    {
      dispose: () => {
        setChatHistoryzmuxTarget(undefined);
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
    registerCommand("zmux.openWorkspace", () => workspace.openWorkspace()),
    registerCommand("zmux.saveAndClosePromptTempModal", () =>
      saveAndCloseActivePromptTempModalEditor(),
    ),
    registerCommand("zmux.revealWorkspaceInBackground", () =>
      workspace.revealWorkspaceInBackground(),
    ),
    registerCommand("zmux.openSettings", () => workspace.openSettings()),
    registerCommand("zmux.moveToSecondarySidebar", () =>
      workspace.moveSidebarToSecondarySidebar(),
    ),
    registerCommand("zmux.createSession", () => workspace.createSession()),
    registerCommand("zmux.revealSession", () => workspace.revealSession()),
    registerCommand("zmux.restartSession", () => workspace.restartSessionFromCommand()),
    registerCommand("zmux.renameActiveSession", () => workspace.promptRenameFocusedSession()),
    registerFocusGroupCommand("zmux.focusGroup1", workspace, 1),
    registerFocusGroupCommand("zmux.focusGroup2", workspace, 2),
    registerFocusGroupCommand("zmux.focusGroup3", workspace, 3),
    registerFocusGroupCommand("zmux.focusGroup4", workspace, 4),
    registerCommand("zmux.focusUp", () => workspace.focusDirection("up")),
    registerCommand("zmux.focusRight", () => workspace.focusDirection("right")),
    registerCommand("zmux.focusDown", () => workspace.focusDirection("down")),
    registerCommand("zmux.focusLeft", () => workspace.focusDirection("left")),
    registerCommand("zmux.focusPreviousSidebarSession", () =>
      workspace.focusAdjacentSidebarSession(-1),
    ),
    registerCommand("zmux.focusNextSidebarSession", () =>
      workspace.focusAdjacentSidebarSession(1),
    ),
    registerSlotFocusCommand("zmux.focusSessionSlot", workspace),
    registerVisibleCountCommand("zmux.showOne", workspace, 1),
    registerVisibleCountCommand("zmux.showTwo", workspace, 2),
    registerVisibleCountCommand("zmux.showThree", workspace, 3),
    registerVisibleCountCommand("zmux.showFour", workspace, 4),
    registerVisibleCountCommand("zmux.showSix", workspace, 6),
    registerVisibleCountCommand("zmux.showNine", workspace, 9),
    registerCommand("zmux.toggleFullscreenSession", async () => {
      await workspace.toggleFullscreenSession();
      await workspace.revealSidebar();
    }),
    registerCommand("zmux.resetWorkspace", () => workspace.resetWorkspace()),
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
  setChatHistoryzmuxTarget(undefined);
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
