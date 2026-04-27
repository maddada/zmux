import * as path from "node:path";
import { getDebuggingMode } from "./native-terminal-workspace/settings";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const REPRO_LOG_DIR_NAME = ".zmux";
const REPRO_LOG_FILE_NAME = "workspace-panel-blank-gray-repro.log";

export function getWorkspacePanelBlankGrayReproLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, REPRO_LOG_DIR_NAME, REPRO_LOG_FILE_NAME);
}

/**
 * CDXC:Workspace-panel 2026-04-24-19:20
 * Capture sparse extension/webview boot milestones for the restored-tab blank gray repro. This
 * writes only while zmux debugging is enabled and stays in the opened project's `.zmux` folder.
 */
export async function appendWorkspacePanelBlankGrayReproLog(
  workspaceRoot: string | undefined,
  event: string,
  details?: unknown,
): Promise<void> {
  await appendWorkspaceDebugLogLine({
    details,
    enabled: getDebuggingMode(),
    event,
    fileName: REPRO_LOG_FILE_NAME,
    workspaceRoot,
  });
}
