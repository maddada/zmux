import type * as vscode from "vscode";

const SESSION_ID_ENV_KEY = "zmux_SESSION_ID";
const SESSION_STATE_FILE_ENV_KEY = "zmux_SESSION_STATE_FILE";
const WORKSPACE_ID_ENV_KEY = "zmux_WORKSPACE_ID";
const WORKSPACE_ROOT_ENV_KEY = "zmux_WORKSPACE_ROOT";

export type ManagedTerminalIdentity = {
  sessionId: string;
  workspaceId: string;
};

export function createManagedTerminalEnvironment(
  workspaceId: string,
  sessionId: string,
  sessionStateFilePath: string,
  workspaceRoot?: string,
): Record<string, string> {
  const normalizedWorkspaceRoot = normalizeEnvironmentValue(workspaceRoot);
  return {
    [SESSION_ID_ENV_KEY]: sessionId,
    [SESSION_STATE_FILE_ENV_KEY]: sessionStateFilePath,
    [WORKSPACE_ID_ENV_KEY]: workspaceId,
    ...(normalizedWorkspaceRoot ? { [WORKSPACE_ROOT_ENV_KEY]: normalizedWorkspaceRoot } : {}),
  };
}

export function getManagedTerminalIdentity(
  terminal: vscode.Terminal,
): ManagedTerminalIdentity | undefined {
  const creationOptions = terminal.creationOptions;
  if ("pty" in creationOptions) {
    return undefined;
  }

  const environment = creationOptions.env;
  if (!environment) {
    return undefined;
  }

  const sessionId = normalizeEnvironmentValue(environment[SESSION_ID_ENV_KEY]);
  const workspaceId = normalizeEnvironmentValue(environment[WORKSPACE_ID_ENV_KEY]);
  if (!sessionId || !workspaceId) {
    return undefined;
  }

  return {
    sessionId,
    workspaceId,
  };
}

function normalizeEnvironmentValue(value: string | null | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}
