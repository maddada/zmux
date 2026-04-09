import { appendFile, mkdir } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  formatVscodeWorkspaceLogPrefix,
  getVscodeWorkspaceLogLabel,
} from "../shared/vscode-workspace-log-context";

const AGENT_TILER_WORKSPACE_LABEL = "agent-tiler";
const AGENT_TILER_FOCUS_TRACE_FILE_NAME = "vsmux-agent-tiler-focus.log";

let fileWriteQueue: Promise<void> = Promise.resolve();

export function logAgentTilerFocusTrace(event: string, details?: unknown): void {
  if (getVscodeWorkspaceLogLabel() !== AGENT_TILER_WORKSPACE_LABEL) {
    return;
  }

  const suffix = details === undefined ? "" : ` ${safeSerialize(details)}`;
  const line = `${new Date().toISOString()} ${formatVscodeWorkspaceLogPrefix()} ${event}${suffix}`;
  queueDesktopLogAppend(`${line}\n`);
}

function safeSerialize(details: unknown): string {
  try {
    return JSON.stringify(details);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
}

function queueDesktopLogAppend(text: string): void {
  const logFilePath = path.join(os.homedir(), "Desktop", AGENT_TILER_FOCUS_TRACE_FILE_NAME);

  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await mkdir(path.dirname(logFilePath), { recursive: true });
      await appendFile(logFilePath, text, "utf8");
    });
}
