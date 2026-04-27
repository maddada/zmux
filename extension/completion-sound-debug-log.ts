import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const DEBUG_LOG_FILE_NAME = "completion-sound-debug.log";

type AppendCompletionSoundDebugLogOptions = {
  details?: unknown;
  enabled: boolean;
  event: string;
  workspaceRoot: string | undefined;
};

/**
 * CDXC:Completion-sound 2026-04-25-09:36
 * Completion sounds cross the daemon/controller/sidebar/audio boundary. Keep a
 * dedicated workspace log so missed sounds can be traced without mixing with
 * terminal title or Claude status indicator diagnostics.
 */
export async function appendCompletionSoundDebugLog(
  options: AppendCompletionSoundDebugLogOptions,
): Promise<void> {
  await appendWorkspaceDebugLogLine({
    details: options.details,
    enabled: options.enabled,
    event: options.event,
    fileName: DEBUG_LOG_FILE_NAME,
    workspaceRoot: options.workspaceRoot,
  });
}
