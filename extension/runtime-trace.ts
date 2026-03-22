import { appendFile, mkdir, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { getDefaultWorkspaceCwd } from "./terminal-workspace-helpers";

const SETTINGS_SECTION = "VSmux";
const DEBUGGING_MODE_SETTING = "debuggingMode";
const TRACE_DIRECTORY_NAME = "logs";

export class RuntimeTrace {
  private enabled: boolean;
  private pendingWrite: Promise<void> = Promise.resolve();

  public constructor(
    private readonly filePath: string,
    enabled = false,
  ) {
    this.enabled = enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      return;
    }

    this.pendingWrite = this.pendingWrite.then(async () => {
      try {
        await rm(this.filePath, { force: true });
      } catch {
        // Tracing is best-effort only.
      }
    });
  }

  public reset(): Promise<void> {
    this.pendingWrite = this.pendingWrite.then(async () => {
      try {
        if (!this.enabled) {
          await rm(this.filePath, { force: true });
          return;
        }

        await mkdir(path.dirname(this.filePath), { recursive: true });
        await writeFile(this.filePath, "", "utf8");
      } catch {
        // Tracing is best-effort only.
      }
    });

    return this.pendingWrite;
  }

  public log(tag: string, message: string, details?: unknown): Promise<void> {
    if (!this.enabled) {
      return this.pendingWrite;
    }

    const timestamp = new Date().toISOString();
    const serializedDetails = details === undefined ? "" : ` ${safeSerializeTraceDetails(details)}`;
    const line = `[${timestamp}] [${tag}] ${message}${serializedDetails}\n`;

    this.pendingWrite = this.pendingWrite.then(async () => {
      try {
        await appendFile(this.filePath, line, "utf8");
      } catch {
        // Tracing is best-effort only.
      }
    });

    return this.pendingWrite;
  }
}

export function createWorkspaceTrace(fileName: string): RuntimeTrace {
  return new RuntimeTrace(
    path.join(getDefaultWorkspaceCwd(), TRACE_DIRECTORY_NAME, fileName),
    getDebuggingModeEnabled(),
  );
}

export function getDebuggingModeEnabled(): boolean {
  return (
    vscode.workspace.getConfiguration(SETTINGS_SECTION).get<boolean>(DEBUGGING_MODE_SETTING) ??
    false
  );
}

function safeSerializeTraceDetails(details: unknown): string {
  try {
    return JSON.stringify(details);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      unserializable: true,
    });
  }
}
