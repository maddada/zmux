import * as path from "node:path";
import { appendWorkspaceDebugLogLine } from "./workspace-debug-log";

const DEBUG_LOG_FILE_NAME = "agent-terminal-title-pipeline-debug.log";

type AppendAgentTerminalTitlePipelineDebugLogOptions = {
  details?: unknown;
  enabled: boolean;
  event: string;
  workspaceRoot: string | undefined;
};

export function getAgentTerminalTitlePipelineDebugLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".zmux", DEBUG_LOG_FILE_NAME);
}

export async function appendAgentTerminalTitlePipelineDebugLog(
  options: AppendAgentTerminalTitlePipelineDebugLogOptions,
): Promise<void> {
  await appendWorkspaceDebugLogLine({
    details: options.details,
    enabled: options.enabled,
    event: options.event,
    fileName: DEBUG_LOG_FILE_NAME,
    workspaceRoot: options.workspaceRoot,
  });
}
