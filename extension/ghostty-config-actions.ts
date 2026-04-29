import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import * as vscode from "vscode";
import {
  GHOSTTY_SETTINGS_DOCS_URL,
  mergeGhosttyConfigLines,
  ZMUX_GHOSTTY_MANAGED_CONFIG_KEYS,
  ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES,
} from "../shared/ghostty-config-actions";

/**
 * CDXC:GhosttySettings 2026-04-30-01:48
 * VS Code-hosted settings buttons must use Ghostty's platform config path
 * instead of the macOS native host path so the same controls work on Linux and
 * Windows extension sessions.
 */
export async function applyRecommendedGhosttySettings(): Promise<void> {
  await writeManagedGhosttyConfig([...ZMUX_RECOMMENDED_GHOSTTY_CONFIG_LINES]);
}

export async function resetGhosttySettingsToDefault(): Promise<void> {
  await writeManagedGhosttyConfig([]);
}

export async function openGhosttySettingsDocs(): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(GHOSTTY_SETTINGS_DOCS_URL));
}

export async function openGhosttyConfigFile(): Promise<void> {
  const configPath = resolveGhosttyConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, await readFile(configPath, "utf8").catch(() => ""), "utf8");
  await vscode.window.showTextDocument(vscode.Uri.file(configPath), { preview: false });
}

async function writeManagedGhosttyConfig(managedLines: readonly string[]): Promise<void> {
  const configPath = resolveGhosttyConfigPath();
  const existingConfig = await readFile(configPath, "utf8").catch(() => "");
  const nextConfig = mergeGhosttyConfigLines(
    existingConfig,
    managedLines,
    ZMUX_GHOSTTY_MANAGED_CONFIG_KEYS,
  );
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, nextConfig, "utf8");
}

function resolveGhosttyConfigPath(): string {
  const configuredPath = process.env.GHOSTTY_CONFIG_PATH?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  if (process.platform === "darwin") {
    return path.join(
      homedir(),
      "Library",
      "Application Support",
      "com.mitchellh.ghostty",
      "config",
    );
  }

  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA ?? path.join(homedir(), "AppData", "Roaming"),
      "ghostty",
      "config",
    );
  }

  return path.join(
    process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config"),
    "ghostty",
    "config",
  );
}
