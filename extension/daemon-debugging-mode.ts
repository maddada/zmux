const DAEMON_DEBUGGING_MODE_ENV_KEY = "zmux_DEBUGGING_MODE";

export function getDaemonSafeDebuggingMode(): boolean {
  const rawValue = process.env[DAEMON_DEBUGGING_MODE_ENV_KEY]?.trim().toLowerCase();
  return rawValue === "1" || rawValue === "true";
}

export function getDaemonDebuggingModeEnv(): Record<string, string> {
  return {
    [DAEMON_DEBUGGING_MODE_ENV_KEY]: String(getExtensionHostDebuggingMode()),
  };
}

function getExtensionHostDebuggingMode(): boolean {
  try {
    const vscode = require("vscode") as typeof import("vscode");
    return vscode.workspace.getConfiguration("zmux").get<boolean>("debuggingMode", false) ?? false;
  } catch {
    return false;
  }
}
