import * as path from "node:path";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const REPRO_LOG_DIR_NAME = ".vsmux";
const REPRO_LOG_FILE_NAME = "xterm-resize-repro.log";

export function getXtermResizeReproLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, REPRO_LOG_DIR_NAME, REPRO_LOG_FILE_NAME);
}

export async function appendXtermResizeReproLog(
  workspaceRoot: string | undefined,
  event: string,
  details?: unknown,
): Promise<void> {
  await appendWorkspaceDebugLogLine({
    details,
    enabled: true,
    event,
    fileName: REPRO_LOG_FILE_NAME,
    workspaceRoot,
  });
}
