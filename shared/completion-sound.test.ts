import { describe, expect, test } from "vite-plus/test";
import {
  DEFAULT_COMPLETION_SOUND,
  clampCompletionSoundSetting,
  getCompletionSoundFileName,
  getCompletionSoundLabel,
} from "./completion-sound";

describe("completion sound settings", () => {
  test("should keep supported sound ids", () => {
    expect(clampCompletionSoundSetting('glass')).toBe('glass');
  });

  test("should fall back to the default sound for unknown ids", () => {
    expect(clampCompletionSoundSetting(undefined)).toBe(DEFAULT_COMPLETION_SOUND);
    expect(clampCompletionSoundSetting("nope")).toBe(DEFAULT_COMPLETION_SOUND);
  });

  test("should expose labels and filenames for supported sounds", () => {
    expect(getCompletionSoundLabel("ping")).toBe("Ping");
    expect(getCompletionSoundFileName("ping")).toBe("ping.mp3");
  });
});
