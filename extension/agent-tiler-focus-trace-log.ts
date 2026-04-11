import { getVscodeWorkspaceLogLabel } from "../shared/vscode-workspace-log-context";
import { logVSmuxReproTrace } from "./vsmux-debug-log";

const AGENT_TILER_WORKSPACE_LABEL = "agent-tiler";
const AGENT_TILER_FOCUS_TRACE_FILE_NAME = "vsmux-agent-tiler-focus.log";

export function logAgentTilerFocusTrace(event: string, details?: unknown): void {
  if (getVscodeWorkspaceLogLabel() !== AGENT_TILER_WORKSPACE_LABEL) {
    return;
  }

  logVSmuxReproTrace(event, {
    details,
    legacyLogFileName: AGENT_TILER_FOCUS_TRACE_FILE_NAME,
  });
}
