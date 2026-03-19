import { createHash } from "node:crypto";

const SESSION_NUMBER_PATTERN = /^session-(\d+)$/u;

export function parseZmxListSessionNames(output: string): string[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function toZmxSessionName(workspaceId: string, sessionId: string): string {
  const compactSessionId = getCompactSessionId(sessionId);
  return `vam2-${workspaceId}-${compactSessionId}`;
}

function getCompactSessionId(sessionId: string): string {
  const numberedSessionMatch = SESSION_NUMBER_PATTERN.exec(sessionId);
  if (numberedSessionMatch) {
    return `s${numberedSessionMatch[1]}`;
  }

  return createHash("sha1").update(sessionId).digest("hex").slice(0, 8);
}
