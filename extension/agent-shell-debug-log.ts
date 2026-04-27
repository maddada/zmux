export async function appendAgentShellDebugLog(
  _event: string,
  _details?: unknown,
  _logFilePath = process.env.zmux_AGENT_SHELL_DEBUG_LOG_PATH?.trim(),
): Promise<void> {}
