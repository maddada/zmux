import type { CompletionSoundSetting } from "../shared/completion-sound";

declare global {
  interface Window {
    __VS_AGENT_MUX_SOUND_URLS__?: Partial<Record<CompletionSoundSetting, string>>;
  }
}

const audioBySound = new Map<CompletionSoundSetting, HTMLAudioElement>();

export async function playCompletionSound(sound: CompletionSoundSetting): Promise<void> {
  const audio = getAudio(sound);
  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;

  try {
    await audio.play();
  } catch {
    // Ignore autoplay failures from the webview runtime.
  }
}

function getAudio(sound: CompletionSoundSetting): HTMLAudioElement | undefined {
  const existingAudio = audioBySound.get(sound);
  if (existingAudio) {
    return existingAudio;
  }

  const url = window.__VS_AGENT_MUX_SOUND_URLS__?.[sound];
  if (!url) {
    return undefined;
  }

  const audio = new Audio(url);
  audio.preload = "auto";
  audioBySound.set(sound, audio);
  return audio;
}
