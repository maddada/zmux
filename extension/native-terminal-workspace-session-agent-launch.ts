import * as vscode from "vscode";
import { isNumericSessionAlias } from "../shared/session-grid-contract";
import { getWorkspaceStorageKey } from "./terminal-workspace-helpers";

const SESSION_AGENT_COMMANDS_KEY = "VSmux.sessionAgentCommands";

export type StoredSessionAgentLaunch = {
  agentId: string;
  command: string;
};

export function buildResumeAgentCommand(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  sessionAlias: string | undefined,
): string | undefined {
  const agentId = agentLaunch?.agentId.trim().toLowerCase();
  const agentCommand = agentLaunch?.command.trim();
  const normalizedAlias = normalizeResumeAlias(sessionAlias);
  if (!agentCommand) {
    return undefined;
  }

  switch (agentId) {
    case "codex":
      return normalizedAlias
        ? `${agentCommand} resume ${quoteForSingleShellArgument(normalizedAlias)}`
        : undefined;
    case "claude":
      return normalizedAlias
        ? `${agentCommand} -r ${quoteForSingleShellArgument(normalizedAlias)}`
        : undefined;
    case "opencode":
      return `${agentCommand} --continue`;
    default:
      return undefined;
  }
}

export function buildCopyResumeCommandText(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: string | undefined,
  sessionAlias: string | undefined,
): string | undefined {
  const normalizedAlias = normalizeResumeAlias(sessionAlias);
  if (!normalizedAlias) {
    return undefined;
  }

  const agentId = agentLaunch?.agentId.trim().toLowerCase() ?? agentIconId?.trim().toLowerCase();
  const agentCommand = agentLaunch?.command.trim();

  switch (agentId) {
    case "codex":
      return `${agentCommand || "codex"} resume ${quoteForSingleShellArgument(normalizedAlias)}`;
    case "claude":
      return `${agentCommand || "claude"} -r ${quoteForSingleShellArgument(normalizedAlias)}`;
    case "opencode":
      return normalizedAlias;
    default:
      return undefined;
  }
}

export function loadStoredSessionAgentLaunches(
  context: vscode.ExtensionContext,
  workspaceId: string,
): Map<string, StoredSessionAgentLaunch> {
  const launches = new Map<string, StoredSessionAgentLaunch>();
  const storedCommands = context.workspaceState.get<Record<string, unknown>>(
    getWorkspaceStorageKey(SESSION_AGENT_COMMANDS_KEY, workspaceId),
    {},
  );

  for (const [sessionId, storedLaunch] of Object.entries(storedCommands)) {
    const normalizedSessionId = sessionId.trim();
    const normalizedLaunch = normalizeStoredSessionAgentLaunch(storedLaunch);
    if (!normalizedSessionId || !normalizedLaunch) {
      continue;
    }

    launches.set(normalizedSessionId, normalizedLaunch);
  }

  return launches;
}

export async function persistSessionAgentLaunches(
  context: vscode.ExtensionContext,
  workspaceId: string,
  launches: ReadonlyMap<string, StoredSessionAgentLaunch>,
): Promise<void> {
  await context.workspaceState.update(
    getWorkspaceStorageKey(SESSION_AGENT_COMMANDS_KEY, workspaceId),
    Object.fromEntries(launches),
  );
}

function normalizeStoredSessionAgentLaunch(
  candidate: unknown,
): StoredSessionAgentLaunch | undefined {
  if (typeof candidate === "string") {
    const normalizedCommand = candidate.trim();
    if (!normalizedCommand) {
      return undefined;
    }

    return {
      agentId: "codex",
      command: normalizedCommand,
    };
  }

  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const partialLaunch = candidate as Partial<StoredSessionAgentLaunch>;
  const agentId = partialLaunch.agentId?.trim();
  const command = partialLaunch.command?.trim();
  if (!agentId || !command) {
    return undefined;
  }

  return {
    agentId,
    command,
  };
}

function quoteForSingleShellArgument(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function normalizeResumeAlias(sessionAlias: string | undefined): string | undefined {
  const normalizedAlias = sessionAlias?.trim();
  if (!normalizedAlias || isNumericSessionAlias(normalizedAlias)) {
    return undefined;
  }

  return normalizedAlias;
}
