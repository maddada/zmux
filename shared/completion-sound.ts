export const COMPLETION_SOUND_OPTIONS = [
  {
    fileName: "arcade.mp3",
    label: "Arcade",
    value: "arcade",
  },
  {
    fileName: "codecompleteafrican.mp3",
    label: "African Code Complete",
    value: "codecompleteafrican",
  },
  {
    fileName: "codecompleteafrobeat.mp3",
    label: "Afrobeat Code Complete",
    value: "codecompleteafrobeat",
  },
  {
    fileName: "codecompleteedm.mp3",
    label: "EDM Code Complete",
    value: "codecompleteedm",
  },
  {
    fileName: "comebacktothecode.mp3",
    label: "Come Back To The Code",
    value: "comebacktothecode",
  },
  {
    fileName: "glass.mp3",
    label: "Glass",
    value: "glass",
  },
  {
    fileName: "ping.mp3",
    label: "Ping",
    value: "ping",
  },
  {
    fileName: "shamisen.mp3",
    label: "Shamisen",
    value: "shamisen",
  },
  {
    fileName: "supersetdoowap.mp3",
    label: "Superset Doo-Wap",
    value: "supersetdoowap",
  },
  {
    fileName: "supersetquick.mp3",
    label: "Superset Quick",
    value: "supersetquick",
  },
] as const;

export type CompletionSoundSetting = (typeof COMPLETION_SOUND_OPTIONS)[number]["value"];

export const DEFAULT_COMPLETION_SOUND: CompletionSoundSetting = "ping";

export function clampCompletionSoundSetting(value: string | undefined): CompletionSoundSetting {
  return (
    COMPLETION_SOUND_OPTIONS.find((option) => option.value === value)?.value ??
    DEFAULT_COMPLETION_SOUND
  );
}

export function getCompletionSoundLabel(value: CompletionSoundSetting): string {
  return (
    COMPLETION_SOUND_OPTIONS.find((option) => option.value === value)?.label ??
    getCompletionSoundLabel(DEFAULT_COMPLETION_SOUND)
  );
}

export function getCompletionSoundFileName(value: CompletionSoundSetting): string {
  return (
    COMPLETION_SOUND_OPTIONS.find((option) => option.value === value)?.fileName ??
    getCompletionSoundFileName(DEFAULT_COMPLETION_SOUND)
  );
}
