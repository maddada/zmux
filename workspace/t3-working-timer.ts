const WORKING_FOR_PATTERN = /working for\s+((?:\d+\s*[dhms]\s*)+)/iu;
const DURATION_PART_PATTERN = /(\d+)\s*([dhms])/giu;
const SECOND_MS = 1_000;
const UNIT_MS = {
  d: 24 * 60 * 60 * 1_000,
  h: 60 * 60 * 1_000,
  m: 60 * 1_000,
  s: 1_000,
} as const;

export function parseWorkingForDurationMs(text: string): number | undefined {
  const match = text.match(WORKING_FOR_PATTERN);
  const durationLabel = match?.[1];
  if (!durationLabel) {
    return undefined;
  }

  let durationMs = 0;
  let foundDurationPart = false;
  for (const durationPart of durationLabel.matchAll(DURATION_PART_PATTERN)) {
    const amount = Number(durationPart[1]);
    const unit = durationPart[2]?.toLowerCase() as keyof typeof UNIT_MS | undefined;
    if (!Number.isFinite(amount) || !unit) {
      continue;
    }

    durationMs += amount * UNIT_MS[unit];
    foundDurationPart = true;
  }

  return foundDurationPart ? durationMs : undefined;
}

export function getWorkingStartedAtMsFromText(text: string, now = Date.now()): number | undefined {
  const durationMs = parseWorkingForDurationMs(text);
  if (durationMs === undefined) {
    return undefined;
  }

  return Math.floor((now - durationMs) / SECOND_MS) * SECOND_MS;
}

export function coalesceWorkingStartedAtMs(args: {
  jitterWindowMs?: number;
  nextWorkingStartedAtMs: number | undefined;
  previousWorkingStartedAtMs: number | undefined;
}): number | undefined {
  if (args.nextWorkingStartedAtMs === undefined || args.previousWorkingStartedAtMs === undefined) {
    return args.nextWorkingStartedAtMs;
  }

  const jitterWindowMs = args.jitterWindowMs ?? 2_000;
  return Math.abs(args.nextWorkingStartedAtMs - args.previousWorkingStartedAtMs) <= jitterWindowMs
    ? args.previousWorkingStartedAtMs
    : args.nextWorkingStartedAtMs;
}
