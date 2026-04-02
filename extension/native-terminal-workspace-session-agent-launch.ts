import * as vscode from "vscode";
import {
  getVisiblePrimaryTitle,
  getVisibleTerminalTitle,
} from "../shared/session-grid-contract";
import {
  getDefaultSidebarAgentByIcon,
  getDefaultSidebarAgentById,
  type SidebarAgentIcon,
} from "../shared/sidebar-agents";
import { getWorkspaceStorageKey } from "./terminal-workspace-helpers";

const SESSION_AGENT_COMMANDS_KEY = "VSmux.sessionAgentCommands";

export type StoredSessionAgentLaunch = {
  agentId: string;
  command: string;
};

export type DetachedResumeAction = {
  shouldExecute: boolean;
  text: string;
};

export function buildResumeAgentCommand(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
  sessionTitle: string | undefined,
  terminalTitle?: string,
): string | undefined {
  const agentId = resolveBuiltInAgentId(agentLaunch, agentIconId);
  const agentCommand = resolveAgentCommand(agentLaunch, agentIconId);
  if (!agentCommand) {
    return undefined;
  }

  switch (agentId) {
    case "codex":
      return appendResumeTarget(`${agentCommand} resume`, sessionTitle, terminalTitle);
    case "claude":
      return appendResumeTarget(`${agentCommand} -r`, sessionTitle, terminalTitle);
    default:
      return undefined;
  }
}

export function buildCopyResumeCommandText(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
  sessionTitle: string | undefined,
  terminalTitle?: string,
): string | undefined {
  const agentId = resolveBuiltInAgentId(agentLaunch, agentIconId);
  const agentCommand = resolveAgentCommand(agentLaunch, agentIconId);
  if (!agentId || !agentCommand) {
    return undefined;
  }

  switch (agentId) {
    case "codex":
      return appendResumeTarget(`${agentCommand} resume`, sessionTitle, terminalTitle);
    case "claude":
      return appendResumeTarget(`${agentCommand} -r`, sessionTitle, terminalTitle);
    case "gemini":
      return `${agentCommand} --list-sessions && echo 'Enter ${agentCommand} -r id' to resume a session`;
    case "opencode":
      return `${agentCommand} list && echo 'Enter ${agentCommand} -s id' to resume a session`;
    default:
      return undefined;
  }
}

export function buildDetachedResumeAction(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
  sessionTitle: string | undefined,
  terminalTitle?: string,
): DetachedResumeAction | undefined {
  const agentCommand = resolveAgentCommand(agentLaunch, agentIconId);
  if (!agentCommand) {
    return undefined;
  }

  if (isCustomStoredAgentLaunch(agentLaunch)) {
    return {
      shouldExecute: false,
      text: agentCommand,
    };
  }

  const agentId = resolveBuiltInAgentId(agentLaunch, agentIconId);
  switch (agentId) {
    case "codex":
      return {
        shouldExecute: true,
        text: appendResumeTarget(`${agentCommand} resume`, sessionTitle, terminalTitle),
      };
    case "claude":
      return {
        shouldExecute: true,
        text: appendResumeTarget(`${agentCommand} -r`, sessionTitle, terminalTitle),
      };
    case "gemini":
      return {
        shouldExecute: false,
        text: `${agentCommand} -r `,
      };
    case "opencode":
      return {
        shouldExecute: false,
        text: `${agentCommand} -s `,
      };
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

function appendResumeTarget(
  commandPrefix: string,
  sessionTitle: string | undefined,
  terminalTitle?: string,
): string {
  const resumeTitle = resolveResumeTitle(sessionTitle, terminalTitle);
  return resumeTitle ? `${commandPrefix} ${quoteForSingleShellArgument(resumeTitle)}` : commandPrefix;
}

function resolveResumeTitle(
  sessionTitle: string | undefined,
  terminalTitle: string | undefined,
): string | undefined {
  const visibleTerminalTitle = getVisibleTerminalTitle(terminalTitle);
  if (visibleTerminalTitle) {
    return visibleTerminalTitle;
  }

  return getVisiblePrimaryTitle(sessionTitle?.trim() ?? "");
}

function resolveAgentCommand(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
): string | undefined {
  const command = agentLaunch?.command.trim();
  if (command) {
    return command;
  }

  return getDefaultSidebarAgentByIcon(agentIconId)?.command;
}

function resolveBuiltInAgentId(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
): "codex" | "claude" | "gemini" | "opencode" | undefined {
  const storedAgentId = normalizeStoredAgentId(agentLaunch?.agentId);
  if (storedAgentId) {
    return storedAgentId;
  }

  const sidebarAgent = getDefaultSidebarAgentByIcon(agentIconId);
  if (
    sidebarAgent?.agentId === "codex" ||
    sidebarAgent?.agentId === "claude" ||
    sidebarAgent?.agentId === "gemini" ||
    sidebarAgent?.agentId === "opencode"
  ) {
    return sidebarAgent.agentId;
  }

  return undefined;
}

function normalizeStoredAgentId(
  agentId: string | undefined,
): "codex" | "claude" | "gemini" | "opencode" | undefined {
  const normalizedAgentId = agentId?.trim().toLowerCase();
  const sidebarAgent = getDefaultSidebarAgentById(normalizedAgentId);
  if (
    sidebarAgent?.agentId === "codex" ||
    sidebarAgent?.agentId === "claude" ||
    sidebarAgent?.agentId === "gemini" ||
    sidebarAgent?.agentId === "opencode"
  ) {
    return sidebarAgent.agentId;
  }

  return undefined;
}

function isCustomStoredAgentLaunch(agentLaunch: StoredSessionAgentLaunch | undefined): boolean {
  const normalizedAgentId = agentLaunch?.agentId.trim().toLowerCase();
  return Boolean(normalizedAgentId && !normalizeStoredAgentId(normalizedAgentId));
}
