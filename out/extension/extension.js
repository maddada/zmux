"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const native_terminal_workspace_1 = require("./native-terminal-workspace");
const SESSION_CONTAINER_ID = "agentCanvasXSessions";
function activate(context) {
    const workspace = new native_terminal_workspace_1.NativeTerminalWorkspaceController(context);
    context.subscriptions.push(workspace, vscode.window.registerWebviewViewProvider(native_terminal_workspace_1.SESSIONS_VIEW_ID, workspace.sidebarProvider), registerCommand("agentCanvasX.openWorkspace", () => workspace.openWorkspace()), registerCommand("agentCanvasX.openSettings", () => workspace.openSettings()), registerCommand("agentCanvasX.createSession", () => workspace.createSession()), registerCommand("agentCanvasX.revealSession", () => workspace.revealSession()), registerCommand("agentCanvasX.restartSession", () => workspace.restartSessionFromCommand()), registerCommand("agentCanvasX.renameActiveSession", () => workspace.promptRenameFocusedSession()), registerFocusGroupCommand("agentCanvasX.focusGroup1", workspace, 1), registerFocusGroupCommand("agentCanvasX.focusGroup2", workspace, 2), registerFocusGroupCommand("agentCanvasX.focusGroup3", workspace, 3), registerFocusGroupCommand("agentCanvasX.focusGroup4", workspace, 4), registerCommand("agentCanvasX.focusUp", () => workspace.focusDirection("up")), registerCommand("agentCanvasX.focusRight", () => workspace.focusDirection("right")), registerCommand("agentCanvasX.focusDown", () => workspace.focusDirection("down")), registerCommand("agentCanvasX.focusLeft", () => workspace.focusDirection("left")), registerSlotFocusCommand("agentCanvasX.focusSessionSlot", workspace), registerVisibleCountCommand("agentCanvasX.showOne", workspace, 1), registerVisibleCountCommand("agentCanvasX.showTwo", workspace, 2), registerVisibleCountCommand("agentCanvasX.showThree", workspace, 3), registerVisibleCountCommand("agentCanvasX.showFour", workspace, 4), registerVisibleCountCommand("agentCanvasX.showSix", workspace, 6), registerVisibleCountCommand("agentCanvasX.showNine", workspace, 9), registerCommand("agentCanvasX.toggleFullscreenSession", async () => {
        await workspace.toggleFullscreenSession();
        await vscode.commands.executeCommand(`workbench.view.extension.${SESSION_CONTAINER_ID}`);
    }), registerViewModeCommand("agentCanvasX.setHorizontalView", workspace, "horizontal"), registerViewModeCommand("agentCanvasX.setVerticalView", workspace, "vertical"), registerViewModeCommand("agentCanvasX.setGridView", workspace, "grid"), registerCommand("agentCanvasX.resetWorkspace", () => workspace.resetWorkspace()));
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