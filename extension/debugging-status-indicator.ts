import * as vscode from "vscode";
import type {
  NativeTerminalWorkspaceController,
  NativeTerminalWorkspaceDebugState,
} from "./native-terminal-workspace";

const SETTINGS_SECTION = "VS-AGENT-MUX";
const DEBUGGING_MODE_SETTING = "debuggingMode";

export class DebuggingStatusIndicator implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  public constructor(private readonly workspace: NativeTerminalWorkspaceController) {
    this.statusBarItem.name = "VS-AGENT-MUX Debugging";
    this.statusBarItem.command = "VS-AGENT-MUX.openSettings";

    this.disposables.push(
      this.statusBarItem,
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(getDebuggingModeConfigurationKey())) {
          this.refresh();
        }
      }),
    );

    this.refresh();
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  private refresh(): void {
    if (!getDebuggingMode()) {
      this.statusBarItem.hide();
      return;
    }

    const debugState = this.workspace.getDebuggingState();
    this.statusBarItem.text = `$(tools) MUX ${debugState.backend}`;
    this.statusBarItem.tooltip = createTooltip(debugState);
    this.statusBarItem.show();
  }
}

function createTooltip(debugState: NativeTerminalWorkspaceDebugState): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString(undefined, true);
  tooltip.isTrusted = true;
  tooltip.appendMarkdown("**VS-AGENT-MUX Debugging Mode**\n\n");
  tooltip.appendMarkdown(`Backend: \`${debugState.backend}\`\n\n`);
  tooltip.appendMarkdown(`Platform: \`${debugState.platform}\`\n\n`);
  tooltip.appendMarkdown(`Terminal UI path: \`${debugState.terminalUiPath}\`\n\n`);
  tooltip.appendMarkdown("Click to open VS-AGENT-MUX settings.");
  return tooltip;
}

function getDebuggingModeConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${DEBUGGING_MODE_SETTING}`;
}

function getDebuggingMode(): boolean {
  return (
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<boolean>(DEBUGGING_MODE_SETTING) ??
    false
  );
}
