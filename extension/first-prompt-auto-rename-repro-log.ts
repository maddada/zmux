import * as path from "node:path";
import { getDaemonSafeDebuggingMode } from "./daemon-debugging-mode";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const REPRO_LOG_DIR_NAME = ".vsmux";
const REPRO_LOG_FILE_NAME = "first-prompt-auto-rename-repro.log";

export function getFirstPromptAutoRenameReproLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, REPRO_LOG_DIR_NAME, REPRO_LOG_FILE_NAME);
}

export async function appendFirstPromptAutoRenameReproLog(
  workspaceRoot: string | undefined,
  event: string,
  details?: unknown,
): Promise<void> {
  await appendWorkspaceDebugLogLine({
    details,
    enabled: getDaemonSafeDebuggingMode(),
    event,
    fileName: REPRO_LOG_FILE_NAME,
    workspaceRoot,
  });
}
