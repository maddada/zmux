import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { getVisibleTerminalTitle } from "../shared/session-grid-contract";
import type { TerminalAgentStatus } from "../shared/terminal-host-protocol";

export type PersistedSessionState = {
  agentName?: string;
  agentStatus: TerminalAgentStatus;
  hasAutoTitleFromFirstPrompt?: boolean;
  lastActivityAt?: string;
  pendingFirstPromptAutoRenamePrompt?: string;
  title?: string;
};

export type PersistedSessionStateSnapshot = {
  state: PersistedSessionState;
  updatedAtMs?: number;
};

const DEFAULT_PERSISTED_SESSION_STATE: PersistedSessionState = {
  agentName: undefined,
  agentStatus: "idle",
  hasAutoTitleFromFirstPrompt: undefined,
  lastActivityAt: undefined,
  pendingFirstPromptAutoRenamePrompt: undefined,
  title: undefined,
};

export function createDefaultPersistedSessionState(): PersistedSessionState {
  return {
    ...DEFAULT_PERSISTED_SESSION_STATE,
  };
}

export function parsePersistedSessionState(rawState: string): PersistedSessionState {
  let agentName: string | undefined;
  let agentStatus: TerminalAgentStatus = "idle";
  let hasAutoTitleFromFirstPrompt: boolean | undefined;
  let lastActivityAt: string | undefined;
  let pendingFirstPromptAutoRenamePrompt: string | undefined;
  let title: string | undefined;

  for (const line of rawState.split(/\r?\n/)) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();
    if (key === "agent") {
      agentName = value || undefined;
    }
    if (key === "title") {
      title = getVisibleTerminalTitle(value);
    }
    if (key === "lastActivityAt") {
      lastActivityAt = normalizePersistedTimestamp(value);
    }
    if (key === "pendingFirstPromptAutoRenamePrompt") {
      pendingFirstPromptAutoRenamePrompt = normalizePersistedSessionValue(value);
    }
    if (key === "autoTitleFromFirstPrompt") {
      hasAutoTitleFromFirstPrompt = value === "1" || /^true$/i.test(value) ? true : undefined;
    }
    if (key === "status" && (value === "idle" || value === "working" || value === "attention")) {
      agentStatus = value;
    }
  }

  return {
    agentName,
    agentStatus,
    hasAutoTitleFromFirstPrompt,
    lastActivityAt,
    pendingFirstPromptAutoRenamePrompt,
    title,
  };
}

export function serializePersistedSessionState(state: PersistedSessionState): string {
  return [
    `status=${state.agentStatus}`,
    `agent=${normalizePersistedSessionValue(state.agentName) ?? ""}`,
    `autoTitleFromFirstPrompt=${state.hasAutoTitleFromFirstPrompt ? "1" : ""}`,
    `lastActivityAt=${normalizePersistedTimestamp(state.lastActivityAt) ?? ""}`,
    `pendingFirstPromptAutoRenamePrompt=${normalizePersistedSessionValue(state.pendingFirstPromptAutoRenamePrompt) ?? ""}`,
    `title=${normalizePersistedSessionValue(getVisibleTerminalTitle(state.title)) ?? ""}`,
    "",
  ].join("\n");
}

export function haveSamePersistedSessionState(
  left: PersistedSessionState,
  right: PersistedSessionState,
): boolean {
  return (
    left.agentName === right.agentName &&
    left.agentStatus === right.agentStatus &&
    left.hasAutoTitleFromFirstPrompt === right.hasAutoTitleFromFirstPrompt &&
    left.lastActivityAt === right.lastActivityAt &&
    left.pendingFirstPromptAutoRenamePrompt === right.pendingFirstPromptAutoRenamePrompt &&
    left.title === right.title
  );
}

export async function readPersistedSessionStateFromFile(
  filePath: string,
): Promise<PersistedSessionState> {
  return (await readPersistedSessionStateSnapshotFromFile(filePath)).state;
}

export async function readPersistedSessionStateSnapshotFromFile(
  filePath: string,
): Promise<PersistedSessionStateSnapshot> {
  try {
    const [rawState, fileStat] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
    return {
      state: parsePersistedSessionState(rawState),
      updatedAtMs: Number.isFinite(fileStat.mtimeMs) ? fileStat.mtimeMs : undefined,
    };
  } catch {
    return {
      state: createDefaultPersistedSessionState(),
      updatedAtMs: undefined,
    };
  }
}

export async function writePersistedSessionStateToFile(
  filePath: string,
  state: PersistedSessionState,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });

  const tempFilePath = `${filePath}.tmp.${process.pid}`;
  await writeFile(tempFilePath, serializePersistedSessionState(state), "utf8");
  await rename(tempFilePath, filePath);
}

export async function updatePersistedSessionStateFile(
  filePath: string,
  updater: (state: PersistedSessionState) => PersistedSessionState,
): Promise<PersistedSessionState> {
  const currentState = await readPersistedSessionStateFromFile(filePath);
  const nextState = updater(currentState);
  if (haveSamePersistedSessionState(currentState, nextState)) {
    return currentState;
  }

  await writePersistedSessionStateToFile(filePath, nextState);
  return nextState;
}

export async function deletePersistedSessionStateFile(filePath: string): Promise<void> {
  await rm(filePath, { force: true }).catch(() => undefined);
}

function normalizePersistedSessionValue(value: string | undefined): string | undefined {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizePersistedTimestamp(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return undefined;
  }

  const timestampMs = Date.parse(normalizedValue);
  return Number.isFinite(timestampMs) ? new Date(timestampMs).toISOString() : undefined;
}
