import { describe, expect, test, vi } from "vite-plus/test";
import {
  CLOSE_TERMINAL_ON_EXIT_SOUND_VOLUME,
  getCloseTerminalOnExitSoundPath,
  playCloseTerminalOnExitSound,
} from "./terminal-exit-sound";

vi.mock("vscode", () => ({
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]) => ({
      fsPath: [base.fsPath, ...parts].join("/"),
    }),
  },
}));

describe("playCloseTerminalOnExitSound", () => {
  test("should play the configured bundled sound at 50% volume on macOS", async () => {
    const runCommand = vi.fn().mockResolvedValue({
      stderr: "",
      stdout: "",
    });
    const extensionUri = { fsPath: "/tmp/vsmux" } as never;
    const sound = "arcade";

    await playCloseTerminalOnExitSound({
      extensionUri,
      platform: "darwin",
      runCommand,
      sound,
    });

    expect(runCommand).toHaveBeenCalledWith("afplay", [
      "-v",
      String(CLOSE_TERMINAL_ON_EXIT_SOUND_VOLUME),
      getCloseTerminalOnExitSoundPath(extensionUri, sound),
    ]);
  });

  test("should skip playback on non-macOS platforms", async () => {
    const runCommand = vi.fn();

    await playCloseTerminalOnExitSound({
      extensionUri: { fsPath: "/tmp/vsmux" } as never,
      platform: "linux",
      runCommand,
      sound: "arcade",
    });

    expect(runCommand).not.toHaveBeenCalled();
  });

  test("should ignore playback failures", async () => {
    const runCommand = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(
      playCloseTerminalOnExitSound({
        extensionUri: { fsPath: "/tmp/vsmux" } as never,
        platform: "darwin",
        runCommand,
        sound: "arcade",
      }),
    ).resolves.toBeUndefined();
  });
});
