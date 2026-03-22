"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const debugging_status_indicator_1 = require("./debugging-status-indicator");
const native_terminal_workspace_1 = require("./native-terminal-workspace");
const SESSION_CONTAINER_ID = "VSmuxSessions";
function activate(context) {
    const workspace = new native_terminal_workspace_1.NativeTerminalWorkspaceController(context);
    const debuggingStatusIndicator = new debugging_status_indicator_1.DebuggingStatusIndicator(workspace);
    context.subscriptions.push(workspace, debuggingStatusIndicator, vscode.window.registerWebviewViewProvider(native_terminal_workspace_1.SESSIONS_VIEW_ID, workspace.sidebarProvider), registerCommand("VSmux.openWorkspace", () => workspace.openWorkspace()), registerCommand("VSmux.openDebugInspector", () => workspace.openDebugInspector()), registerCommand("VSmux.openSettings", () => workspace.openSettings()), registerCommand("VSmux.createSession", () => workspace.createSession()), registerCommand("VSmux.revealSession", () => workspace.revealSession()), registerCommand("VSmux.restartSession", () => workspace.restartSessionFromCommand()), registerCommand("VSmux.renameActiveSession", () => workspace.promptRenameFocusedSession()), registerFocusGroupCommand("VSmux.focusGroup1", workspace, 1), registerFocusGroupCommand("VSmux.focusGroup2", workspace, 2), registerFocusGroupCommand("VSmux.focusGroup3", workspace, 3), registerFocusGroupCommand("VSmux.focusGroup4", workspace, 4), registerCommand("VSmux.focusUp", () => workspace.focusDirection("up")), registerCommand("VSmux.focusRight", () => workspace.focusDirection("right")), registerCommand("VSmux.focusDown", () => workspace.focusDirection("down")), registerCommand("VSmux.focusLeft", () => workspace.focusDirection("left")), registerSlotFocusCommand("VSmux.focusSessionSlot", workspace), registerVisibleCountCommand("VSmux.showOne", workspace, 1), registerVisibleCountCommand("VSmux.showTwo", workspace, 2), registerVisibleCountCommand("VSmux.showThree", workspace, 3), registerVisibleCountCommand("VSmux.showFour", workspace, 4), registerVisibleCountCommand("VSmux.showSix", workspace, 6), registerVisibleCountCommand("VSmux.showNine", workspace, 9), registerCommand("VSmux.toggleFullscreenSession", async () => {
        await workspace.toggleFullscreenSession();
        await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    }), registerViewModeCommand("VSmux.setHorizontalView", workspace, "horizontal"), registerViewModeCommand("VSmux.setVerticalView", workspace, "vertical"), registerViewModeCommand("VSmux.setGridView", workspace, "grid"), registerCommand("VSmux.resetWorkspace", () => workspace.resetWorkspace()));
    void workspace.initialize().catch((error) => {
        void vscode.window.showErrorMessage(getErrorMessage(error));
    });
}
function deactivate() { }
function registerCommand(command, callback) {
    return vscode.commands.registerCommand(command, () => {
        void Promise.resolve(callback()).catch((error) => {
            void vscode.window.showErrorMessage(getErrorMessage(error));
        });
    });
}
function registerVisibleCountCommand(command, workspace, visibleCount) {
    return registerCommand(command, async () => {
        await workspace.setVisibleCount(visibleCount);
        await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    });
}
function registerFocusGroupCommand(command, workspace, groupIndex) {
    return registerCommand(command, async () => {
        await workspace.focusGroupByIndex(groupIndex);
        await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    });
}
function registerSlotFocusCommand(command, workspace) {
    return vscode.commands.registerCommand(command, (slotNumber) => {
        const resolvedSlotNumber = typeof slotNumber === "number" ? slotNumber : Number(slotNumber);
        if (!Number.isFinite(resolvedSlotNumber)) {
            return;
        }
        void workspace.focusSessionSlot(resolvedSlotNumber).catch((error) => {
            void vscode.window.showErrorMessage(getErrorMessage(error));
        });
    });
}
function registerViewModeCommand(command, workspace, viewMode) {
    return registerCommand(command, async () => {
        await workspace.setViewMode(viewMode);
        await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    });
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=extension.js.map