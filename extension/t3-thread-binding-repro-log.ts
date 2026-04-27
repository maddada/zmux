import * as path from "node:path";

const REPRO_LOG_DIR_NAME = ".zmux";
const REPRO_LOG_FILE_NAME = "t3-thread-binding-repro.log";

export function getT3ThreadBindingReproLogPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, REPRO_LOG_DIR_NAME, REPRO_LOG_FILE_NAME);
}

export async function appendT3ThreadBindingReproLog(
  _workspaceRoot: string,
  _event: string,
  _details?: unknown,
): Promise<void> {}
