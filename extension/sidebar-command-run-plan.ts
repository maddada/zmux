import * as path from "node:path";
import type { SidebarActionType, SidebarCommandRunMode } from "../shared/sidebar-commands";

export type SidebarCommandTerminalRunPlan =
  | {
      closeOnExit: boolean;
      presentation: "background-indicator";
      target: "zmux-terminal";
    }
  | {
      presentation: "sidebar-card";
      target: "zmux-terminal";
    };

export function getSidebarCommandTerminalRunPlan(
  actionType: SidebarActionType,
  closeTerminalOnExit: boolean,
  runMode: SidebarCommandRunMode = "default",
): SidebarCommandTerminalRunPlan | undefined {
  if (actionType !== "terminal") {
    return undefined;
  }

  if (runMode === "debug") {
    return {
      presentation: "sidebar-card",
      target: "zmux-terminal",
    };
  }

  return {
    closeOnExit: closeTerminalOnExit,
    presentation: "background-indicator",
    target: "zmux-terminal",
  };
}

export function getSidebarCommandWorkspaceSessionTitle(
  actionName: string,
  command: string,
  runMode: SidebarCommandRunMode = "default",
): string {
  const normalizedActionName = actionName.trim();
  const baseTitle =
    normalizedActionName.length > 0 ? normalizedActionName : command.trim().slice(0, 20);

  return runMode === "debug" ? `Debug: ${baseTitle}` : baseTitle;
}

export function getSidebarCommandTerminalExecutionText(
  shellPath: string,
  command: string,
  closeOnExit: boolean,
): string {
  if (!closeOnExit) {
    return command;
  }

  const shellName = path.basename(shellPath).toLowerCase();
  if (process.platform === "win32") {
    if (shellName === "cmd.exe" || shellName === "cmd") {
      return `(${command}) & exit /b %errorlevel%`;
    }

    return `${command}; exit $LASTEXITCODE`;
  }

  return `${command}; __zmux_exit=$?; exit $__zmux_exit`;
}
