export type { AgentShellIntegration } from "./agent-shell-integration-setup";
import type { AgentShellIntegration } from "./agent-shell-integration-setup";
import { createAgentShellIntegration } from "./agent-shell-integration-setup";

export type { AgentLifecycleEvent, ParsedAgentControlChunk } from "./agent-shell-integration-parser";
export { detectCodexLifecycleEventFromLogLine, parseAgentControlChunk } from "./agent-shell-integration-parser";
export { getClaudeHookSettingsContent } from "./agent-shell-integration-content";

const integrationPromises = new Map<string, Promise<AgentShellIntegration>>();

export async function ensureAgentShellIntegration(
  daemonStateDir: string,
): Promise<AgentShellIntegration> {
  const cached = integrationPromises.get(daemonStateDir);
  if (cached) {
    return cached;
  }

  const pendingIntegration = createAgentShellIntegration(daemonStateDir);
  integrationPromises.set(daemonStateDir, pendingIntegration);

  try {
    return await pendingIntegration;
  } catch (error) {
    integrationPromises.delete(daemonStateDir);
    throw error;
  }
}
