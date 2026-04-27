import { normalizeTerminalTitle } from "../../shared/session-grid-contract";

export function isDefaultT3SessionTitle(title: string | undefined): boolean {
  const normalizedTitle = title?.trim().toLowerCase();
  return !normalizedTitle || normalizedTitle === "t3 code";
}

export function shouldAutoPersistT3SessionTitle(options: {
  nextLiveTitle: string | undefined;
  persistedTitle: string | undefined;
  previousLiveTitle: string | undefined;
}): boolean {
  const nextLiveTitle = normalizeTerminalTitle(options.nextLiveTitle);
  if (!nextLiveTitle) {
    return false;
  }

  if (isDefaultT3SessionTitle(options.persistedTitle)) {
    return true;
  }

  const persistedTitle = normalizeTerminalTitle(options.persistedTitle);
  const previousLiveTitle = normalizeTerminalTitle(options.previousLiveTitle);
  return Boolean(previousLiveTitle) && persistedTitle === previousLiveTitle;
}

export function shouldResetAutoPersistedT3SessionTitle(options: {
  persistedTitle: string | undefined;
  previousLiveTitle: string | undefined;
}): boolean {
  if (isDefaultT3SessionTitle(options.persistedTitle)) {
    return false;
  }

  const persistedTitle = normalizeTerminalTitle(options.persistedTitle);
  const previousLiveTitle = normalizeTerminalTitle(options.previousLiveTitle);
  return Boolean(previousLiveTitle) && persistedTitle === previousLiveTitle;
}
