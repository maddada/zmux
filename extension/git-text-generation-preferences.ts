import * as vscode from "vscode";
import {
  DEFAULT_GIT_TEXT_GENERATION_PROVIDER,
  normalizeGitTextGenerationProvider,
  type GitTextGenerationSettings,
} from "../shared/git-text-generation-provider";
import {
  GIT_TEXT_GENERATION_CUSTOM_COMMAND_SETTING,
  GIT_TEXT_GENERATION_PROVIDER_SETTING,
  SETTINGS_SECTION,
} from "./native-terminal-workspace/settings";

export function getGitTextGenerationSettings(): GitTextGenerationSettings {
  const configuration = vscode.workspace.getConfiguration(SETTINGS_SECTION);
  const provider = normalizeGitTextGenerationProvider(
    configuration.get<string>(
      GIT_TEXT_GENERATION_PROVIDER_SETTING,
      DEFAULT_GIT_TEXT_GENERATION_PROVIDER,
    ),
  );
  const customCommand =
    configuration.get<string>(GIT_TEXT_GENERATION_CUSTOM_COMMAND_SETTING, "") ?? "";

  return {
    customCommand: customCommand.trim(),
    provider,
  };
}

export function hasConfiguredGitTextGenerationProvider(
  settings: GitTextGenerationSettings = getGitTextGenerationSettings(),
): boolean {
  return settings.provider !== "custom" || Boolean(settings.customCommand);
}
