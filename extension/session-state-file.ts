import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { normalizeTerminalTitle } from "../shared/session-grid-contract";
import type { TerminalAgentStatus } from "../shared/terminal-host-protocol";

export type PersistedSessionState = {
  agentName?: string;
  agentStatus: TerminalAgentStatus;
  title?: string;
};

const DEFAULT_PERSISTED_SESSION_STATE: PersistedSessionState = {
  agentName: undefined,
  agentStatus: "idle",
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
  let title: string | undefined;

  for (const line of rawState.split(/\r?\n/)) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();
    if (key === "agent") {
      agentName = value || undefined;
    }
    if (key === "title") {
      title = normalizeTerminalTitle(value);
    }
    if (key === "status" && (value === "idle" || value === "working" || value === "attention")) {
      agentStatus = value;
    }
  }

  return {
    agentName,
    agentStatus,
    title,
  };
}

export function serializePersistedSessionState(state: PersistedSessionState): string {
  return [
    `status=${state.agentStatus}`,
    `agent=${normalizePersistedSessionValue(state.agentName) ?? ""}`,
    `title=${normalizePersistedSessionValue(normalizeTerminalTitle(state.title)) ?? ""}`,
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
    left.title === right.title
  );
}

export async function readPersistedSessionStateFromFile(
  filePath: string,
): Promise<PersistedSessionState> {
  try {
    const rawState = await readFile(filePath, "utf8");
    return parsePersistedSessionState(rawState);
  } catch {
    return createDefaultPersistedSessionState();
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
