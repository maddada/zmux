import * as path from "node:path";

export type AgentShellIntegrationEnvironmentRequest = {
  shellIntegrationBinDir?: string;
  shellIntegrationZdotDir?: string;
};

export function createAgentShellIntegrationEnvironmentRequest(
  agentShellIntegration:
    | {
        binDir: string;
        zshDotDir: string;
      }
    | undefined,
): AgentShellIntegrationEnvironmentRequest {
  if (!agentShellIntegration) {
    return {};
  }

  return {
    shellIntegrationBinDir: agentShellIntegration.binDir,
    shellIntegrationZdotDir: agentShellIntegration.zshDotDir,
  };
}

export function applyAgentShellIntegrationEnvironment(
  environment: Record<string, string>,
  request: AgentShellIntegrationEnvironmentRequest,
): Record<string, string> {
  const nextEnvironment = {
    ...environment,
  };

  if (request.shellIntegrationBinDir) {
    nextEnvironment.PATH = `${request.shellIntegrationBinDir}${path.delimiter}${nextEnvironment.PATH ?? process.env.PATH ?? ""}`;
  }

  if (process.platform !== "win32" && request.shellIntegrationZdotDir) {
    nextEnvironment.ZDOTDIR = request.shellIntegrationZdotDir;
  }

  return nextEnvironment;
}
