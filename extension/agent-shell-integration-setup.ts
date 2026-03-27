import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import {
  getAgentWrapperCmdContent,
  getAgentWrapperShellScriptContent,
  getClaudeHookSettingsContent,
  getClaudeNotifyCommandContent,
  getOpenCodePluginContent,
  getZshEnvShimContent,
  getZshPassThroughShimContent,
  getZshRcShimContent,
} from "./agent-shell-integration-content";

export type AgentShellIntegration = {
  binDir: string;
  claudeSettingsPath: string;
  notifyPath: string;
  opencodeConfigDir: string;
  zshDotDir: string;
};

const AGENT_SHELL_DIR_NAME = "agent-shell-integration";
const CLAUDE_SETTINGS_FILE_NAME = "settings.json";
const CLAUDE_NOTIFY_SCRIPT_STEM = "notify";
const NOTIFY_RUNNER_FILE_NAME = "agent-shell-notify-runner.js";
const OPENCODE_PLUGIN_FILE_NAME = "VSmux-notify.js";
const WRAPPER_RUNNER_FILE_NAME = "agent-shell-wrapper-runner.js";

export async function createAgentShellIntegration(
  daemonStateDir: string,
): Promise<AgentShellIntegration> {
  const integrationRoot = path.join(daemonStateDir, AGENT_SHELL_DIR_NAME);
  const binDir = path.join(integrationRoot, "bin");
  const hooksDir = path.join(integrationRoot, "hooks");
  const claudeConfigDir = path.join(hooksDir, "claude");
  const claudeSettingsPath = path.join(claudeConfigDir, CLAUDE_SETTINGS_FILE_NAME);
  const notifyPath = path.join(__dirname, NOTIFY_RUNNER_FILE_NAME);
  const wrapperRunnerPath = path.join(__dirname, WRAPPER_RUNNER_FILE_NAME);
  const claudeNotifyCommandPath = path.join(
    claudeConfigDir,
    process.platform === "win32"
      ? `${CLAUDE_NOTIFY_SCRIPT_STEM}.cmd`
      : `${CLAUDE_NOTIFY_SCRIPT_STEM}.sh`,
  );
  const opencodeConfigDir = path.join(hooksDir, "opencode");
  const opencodePluginDir = path.join(opencodeConfigDir, "plugin");
  const opencodePluginPath = path.join(opencodePluginDir, OPENCODE_PLUGIN_FILE_NAME);
  const zshDotDir = path.join(integrationRoot, "zsh");

  await mkdir(binDir, { recursive: true });
  await mkdir(hooksDir, { recursive: true });
  await mkdir(claudeConfigDir, { recursive: true });
  await mkdir(opencodePluginDir, { recursive: true });
  await mkdir(zshDotDir, { recursive: true });

  await writeFileIfChanged(
    claudeNotifyCommandPath,
    getClaudeNotifyCommandContent(notifyPath),
    process.platform === "win32" ? 0o644 : 0o755,
  );
  await writeFileIfChanged(
    claudeSettingsPath,
    getClaudeHookSettingsContent(claudeNotifyCommandPath, process.platform),
    0o644,
  );

  for (const agentName of ["claude", "codex", "gemini", "opencode"] as const) {
    await writeFileIfChanged(
      path.join(binDir, agentName),
      getAgentWrapperShellScriptContent(agentName, {
        binDir,
        claudeSettingsPath,
        notifyPath,
        opencodeConfigDir,
        wrapperRunnerPath,
      }),
      0o755,
    );
    if (process.platform === "win32") {
      await writeFileIfChanged(
        path.join(binDir, `${agentName}.cmd`),
        getAgentWrapperCmdContent(agentName, {
          binDir,
          claudeSettingsPath,
          notifyPath,
          opencodeConfigDir,
          wrapperRunnerPath,
        }),
        0o644,
      );
    }
  }

  await writeFileIfChanged(
    opencodePluginPath,
    getOpenCodePluginContent(notifyPath, process.execPath),
    0o644,
  );
  await writeFileIfChanged(path.join(zshDotDir, ".zshenv"), getZshEnvShimContent(), 0o644);
  await writeFileIfChanged(
    path.join(zshDotDir, ".zprofile"),
    getZshPassThroughShimContent(".zprofile"),
    0o644,
  );
  await writeFileIfChanged(path.join(zshDotDir, ".zshrc"), getZshRcShimContent(binDir), 0o644);
  await writeFileIfChanged(
    path.join(zshDotDir, ".zlogin"),
    getZshPassThroughShimContent(".zlogin"),
    0o644,
  );
  await writeFileIfChanged(
    path.join(zshDotDir, ".zlogout"),
    getZshPassThroughShimContent(".zlogout"),
    0o644,
  );

  return {
    binDir,
    claudeSettingsPath,
    notifyPath,
    opencodeConfigDir,
    zshDotDir,
  };
}

async function writeFileIfChanged(filePath: string, content: string, mode: number): Promise<void> {
  let existingContent: string | undefined;
  try {
    existingContent = await readFile(filePath, "utf8");
  } catch {
    existingContent = undefined;
  }

  if (existingContent !== content) {
    await writeFile(filePath, content, { mode });
  }
}
