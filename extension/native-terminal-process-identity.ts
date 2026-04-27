import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ManagedTerminalIdentity } from "./native-managed-terminal";

const execFileAsync = promisify(execFile);

export async function readManagedTerminalIdentityFromProcessId(
  processId: number,
): Promise<ManagedTerminalIdentity | undefined> {
  if (!Number.isInteger(processId) || processId <= 0 || process.platform === "win32") {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync("ps", [
      "eww",
      "-p",
      String(processId),
      "-o",
      "command=",
    ]);
    return parseManagedTerminalIdentity(stdout);
  } catch {
    return undefined;
  }
}

export function parseManagedTerminalIdentity(
  processCommandOutput: string,
): ManagedTerminalIdentity | undefined {
  const sessionId = readEnvironmentVariable(processCommandOutput, "zmux_SESSION_ID");
  const workspaceId = readEnvironmentVariable(processCommandOutput, "zmux_WORKSPACE_ID");
  if (!sessionId || !workspaceId) {
    return undefined;
  }

  return {
    sessionId,
    workspaceId,
  };
}

function readEnvironmentVariable(
  processCommandOutput: string,
  environmentKey: string,
): string | undefined {
  const match = processCommandOutput.match(
    new RegExp(`(?:^|\\s)${escapeRegularExpression(environmentKey)}=([^\\s]+)`),
  );
  return normalizeEnvironmentValue(match?.[1]);
}

function normalizeEnvironmentValue(value: string | null | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function escapeRegularExpression(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
