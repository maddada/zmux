import * as path from "node:path";
import { getDebuggingMode } from "./native-terminal-workspace/settings";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const REPRO_LOG_DIR_NAME = ".zmux";
const REPRO_LOG_FILE_NAME = "workspace-panel-startup-repro.log";

export function getWorkspacePanelStartupReproLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, REPRO_LOG_DIR_NAME, REPRO_LOG_FILE_NAME);
}

export async function appendWorkspacePanelStartupReproLog(
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
