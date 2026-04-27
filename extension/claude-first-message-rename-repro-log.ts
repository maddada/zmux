import * as path from "node:path";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const REPRO_LOG_DIR_NAME = ".zmux";
const REPRO_LOG_FILE_NAME = "claude-first-message-rename-repro.log";

type AppendClaudeFirstMessageRenameReproLogOptions = {
  details?: unknown;
  enabled: boolean;
  event: string;
  workspaceRoot: string | undefined;
};

export function getClaudeFirstMessageRenameReproLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, REPRO_LOG_DIR_NAME, REPRO_LOG_FILE_NAME);
}

export async function appendClaudeFirstMessageRenameReproLog(
  options: AppendClaudeFirstMessageRenameReproLogOptions,
): Promise<void> {
  await appendWorkspaceDebugLogLine({
    details: options.details,
    enabled: options.enabled,
    event: options.event,
    fileName: REPRO_LOG_FILE_NAME,
    workspaceRoot: options.workspaceRoot,
  });
}
