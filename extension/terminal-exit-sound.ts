import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import {
  getCompletionSoundFileName,
  type CompletionSoundSetting,
} from "../shared/completion-sound";

const execFileAsync = promisify(execFile);

export const CLOSE_TERMINAL_ON_EXIT_SOUND_VOLUME = 0.5;

type ExecFileLike = (
  file: string,
  args: readonly string[],
) => Promise<{
  stderr: string;
  stdout: string;
}>;

export async function playCloseTerminalOnExitSound(options: {
  extensionUri: vscode.Uri;
  sound: CompletionSoundSetting;
  platform?: NodeJS.Platform;
  runCommand?: ExecFileLike;
}): Promise<void> {
  if ((options.platform ?? process.platform) !== "darwin") {
    return;
  }

  try {
    await (options.runCommand ?? execFileAsync)("afplay", [
      "-v",
      String(CLOSE_TERMINAL_ON_EXIT_SOUND_VOLUME),
      getCloseTerminalOnExitSoundPath(options.extensionUri, options.sound),
    ]);
  } catch {
    // Ignore notification failures so terminal cleanup is never blocked.
  }
}

export function getCloseTerminalOnExitSoundPath(
  extensionUri: vscode.Uri,
  sound: CompletionSoundSetting,
): string {
  return vscode.Uri.joinPath(extensionUri, "media", "sounds", getCompletionSoundFileName(sound))
    .fsPath;
}
