import type { SessionRecord } from "../shared/session-grid-contract";

const VT_TEXT_ACTIVITY_TAIL_LENGTH = 4000;
const CODEX_WORKING_TEXT_MARKER = "esc to interrupt)";
const CODEX_WORKING_SNIPPET_LENGTH = 220;
const ESCAPE_SEQUENCE_PATTERN = "\\u001b";
const BELL_SEQUENCE_PATTERN = "\\u0007";
const OSC_PREFIX = "\u001b]";
const ESCAPE = "\u001b";
const MAX_TITLE_STREAM_CARRYOVER_CHARS = 4096;
const OSC_SEQUENCE_PATTERN = new RegExp(
  `${ESCAPE_SEQUENCE_PATTERN}\\][\\s\\S]*?(?:${BELL_SEQUENCE_PATTERN}|${ESCAPE_SEQUENCE_PATTERN}\\\\)`,
  "gu",
);
const DCS_SEQUENCE_PATTERN = new RegExp(
  `${ESCAPE_SEQUENCE_PATTERN}P[\\s\\S]*?${ESCAPE_SEQUENCE_PATTERN}\\\\`,
  "gu",
);
const CSI_SEQUENCE_PATTERN = new RegExp(`${ESCAPE_SEQUENCE_PATTERN}\\[[0-?]*[ -/]*[@-~]`, "gu");
const SINGLE_ESCAPE_SEQUENCE_PATTERN = new RegExp(`${ESCAPE_SEQUENCE_PATTERN}[@-_]`, "gu");
const OTHER_CONTROL_SEQUENCE_PATTERN = new RegExp(
  String.raw`[\u0000-\u0008\u000b-\u001a\u001c-\u001f\u007f]`,
  "gu",
);

export function extractLatestTerminalTitleFromVtHistory(history: string): string | undefined {
  let index = 0;
  let latestTitle: string | undefined;

  while (index < history.length) {
    if (history[index] !== "\u001b" || history[index + 1] !== "]") {
      index += 1;
      continue;
    }

    const controlStart = index;
    const terminator = findOscTerminator(history, controlStart + 2);
    if (!terminator) {
      break;
    }

    const controlBody = history.slice(controlStart + 2, terminator.contentEnd);
    const separatorIndex = controlBody.indexOf(";");
    const command = separatorIndex >= 0 ? controlBody.slice(0, separatorIndex) : controlBody;
    const title =
      separatorIndex >= 0
        ? normalizePersistedSessionValue(controlBody.slice(separatorIndex + 1))
        : undefined;
    if ((command === "0" || command === "2") && title) {
      latestTitle = title;
    }

    index = terminator.sequenceEnd;
  }

  return latestTitle;
}

export function parseTerminalTitleFromOutputChunk(
  carryover: string,
  chunk: string,
): {
  carryover: string;
  title?: string;
} {
  const combinedOutput = `${carryover}${chunk}`;
  return {
    carryover: getTerminalTitleStreamCarryover(combinedOutput),
    title: extractLatestTerminalTitleFromVtHistory(combinedOutput),
  };
}

export function extractTerminalTextTailFromVtHistory(history: string): string | undefined {
  const strippedHistory = stripTerminalControlSequences(history);
  return normalizePersistedSessionValue(strippedHistory.slice(-VT_TEXT_ACTIVITY_TAIL_LENGTH));
}

export function extractClaudeCodeTitleFromVtHistory(history: string): string | undefined {
  const tailText = extractTerminalTextTailFromVtHistory(history);
  if (!tailText) {
    return undefined;
  }

  const match = /([✳*·]?\s*Claude Code)(?:\s+v[\w.-]+)?/iu.exec(tailText);
  return normalizePersistedSessionValue(match?.[1]);
}

export function hasInterruptStatusInVtHistory(history: string): boolean {
  const tailText = extractTerminalTextTailFromVtHistory(history);
  if (!tailText) {
    return false;
  }

  const lowerTailText = tailText.toLowerCase();
  const markerIndex = lowerTailText.lastIndexOf(CODEX_WORKING_TEXT_MARKER);
  if (markerIndex < 0) {
    return false;
  }

  const snippet = tailText.slice(
    Math.max(0, markerIndex - CODEX_WORKING_SNIPPET_LENGTH),
    markerIndex + CODEX_WORKING_TEXT_MARKER.length,
  );

  return /\([^)]*esc to interrupt\)/iu.test(snippet) && /[a-z]/iu.test(snippet);
}

export function hasCodexWorkingStatusInVtHistory(
  history: string,
  title?: string,
  agentName?: string,
): boolean {
  const normalizedTitle = title?.trim().toLowerCase();
  const normalizedAgentName = agentName?.trim().toLowerCase();
  if (!normalizedTitle?.includes("codex") && normalizedAgentName !== "codex") {
    return false;
  }

  return hasInterruptStatusInVtHistory(history);
}

export function getSessionNumber(sessionId: string): number | undefined {
  const match = /^session-(\d+)$/.exec(sessionId);
  if (!match) {
    return undefined;
  }

  const sessionNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(sessionNumber) && sessionNumber > 0 ? sessionNumber : undefined;
}

export function getSessionTabTitle(session: SessionRecord): string {
  const alias = session.alias.trim();
  return alias.length > 0 ? alias : session.title;
}

function normalizePersistedSessionValue(value: string | undefined): string | undefined {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function stripTerminalControlSequences(history: string): string {
  return history
    .replace(OSC_SEQUENCE_PATTERN, " ")
    .replace(DCS_SEQUENCE_PATTERN, " ")
    .replace(CSI_SEQUENCE_PATTERN, "")
    .replace(SINGLE_ESCAPE_SEQUENCE_PATTERN, "")
    .replace(OTHER_CONTROL_SEQUENCE_PATTERN, " ")
    .replace(/\r/gu, "\n");
}

function findOscTerminator(
  data: string,
  startIndex: number,
): { contentEnd: number; sequenceEnd: number } | undefined {
  for (let index = startIndex; index < data.length; index += 1) {
    const currentCharacter = data[index];
    if (currentCharacter === "\u0007") {
      return {
        contentEnd: index,
        sequenceEnd: index + 1,
      };
    }

    if (currentCharacter === "\u001b" && data[index + 1] === "\\") {
      return {
        contentEnd: index,
        sequenceEnd: index + 2,
      };
    }
  }

  return undefined;
}

function getTerminalTitleStreamCarryover(history: string): string {
  const lastOscStart = history.lastIndexOf(OSC_PREFIX);
  if (lastOscStart >= 0 && !findOscTerminator(history, lastOscStart + OSC_PREFIX.length)) {
    return history.slice(Math.max(0, lastOscStart, history.length - MAX_TITLE_STREAM_CARRYOVER_CHARS));
  }

  if (history.endsWith(OSC_PREFIX)) {
    return OSC_PREFIX;
  }

  if (history.endsWith(ESCAPE)) {
    return ESCAPE;
  }

  return "";
}
