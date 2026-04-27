import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const DEBUG_LOG_FILE_NAME = "claude-indicator-status-debug.log";

type AppendClaudeIndicatorStatusDebugLogOptions = {
  details?: unknown;
  enabled: boolean;
  event: string;
  workspaceRoot: string | undefined;
};

/**
 * CDXC:Claude-session-status 2026-04-25-08:43
 * Claude running/done indicator debugging needs a dedicated file that records
 * raw terminal titles and the final display activity without mixing with rename
 * or generic terminal-title logs.
 */
export async function appendClaudeIndicatorStatusDebugLog(
  options: AppendClaudeIndicatorStatusDebugLogOptions,
): Promise<void> {
  await appendWorkspaceDebugLogLine({
    details: options.details,
    enabled: options.enabled,
    event: options.event,
    fileName: DEBUG_LOG_FILE_NAME,
    workspaceRoot: options.workspaceRoot,
  });
}
