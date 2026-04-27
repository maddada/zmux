import * as path from "node:path";
import * as vscode from "vscode";
import { getPreferredSessionTitle, normalizeTerminalTitle } from "../shared/session-grid-contract";
import {
  getDefaultSidebarAgentByIcon,
  getDefaultSidebarAgentById,
  type SidebarAgentIcon,
} from "../shared/sidebar-agents";
import { getDefaultAgentCommand } from "./native-terminal-workspace/settings";
import { getWorkspaceStorageKey } from "./terminal-workspace-helpers";

const SESSION_AGENT_COMMANDS_KEY = "zmux.sessionAgentCommands";
export const OPENCODE_SESSION_LOOKUP_RUNNER_PATH = path.join(
  __dirname,
  "opencode-session-lookup-runner.js",
);

export type StoredSessionAgentLaunch = {
  agentId: string;
  command: string;
};

export type DetachedResumeAction = {
  shouldExecute: boolean;
  text: string;
};

export type ProgrammaticTerminalResumeStep = {
  data?: string;
  postDelayMs?: number;
  shouldExecute?: boolean;
  waitForAgentId?: "codex" | "claude" | "copilot" | "gemini" | "opencode";
};

export type ProgrammaticTerminalResumeAction = {
  steps: ProgrammaticTerminalResumeStep[];
};

const MOVE_CURSOR_TO_LINE_START_CONTROL = "\u0001";

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
      /**
       * CDXC:SessionRestore 2026-04-27-07:38
       * Claude session resume must use the long-form CLI flag that matches
       * native zmux reopen behavior: `claude --resume <session title>`.
       */
      return appendResumeTarget(`${agentCommand} --resume`, sessionTitle, terminalTitle);
    case "opencode":
      return buildOpenCodeResumeCommand(agentCommand, sessionTitle, terminalTitle, false);
    default:
      return undefined;
  }
}

export function buildForkAgentCommand(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
  sessionTitle: string | undefined,
  terminalTitle?: string,
): string | undefined {
  const agentId = resolveBuiltInAgentId(agentLaunch, agentIconId);
  const agentCommand = resolveAgentCommand(agentLaunch, agentIconId);
  const forkTitle = resolveResumeTitle(sessionTitle, terminalTitle);
  if (!agentId || !agentCommand || !forkTitle) {
    return undefined;
  }

  const quotedForkTitle = quoteForSingleShellArgument(forkTitle);
  switch (agentId) {
    case "codex":
      return `${agentCommand} fork ${quotedForkTitle}`;
    case "claude":
      return `${agentCommand} --fork-session -r ${quotedForkTitle}`;
    default:
      return undefined;
  }
}

export function buildProgrammaticResumeAction(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
  sessionTitle: string | undefined,
  terminalTitle?: string,
): ProgrammaticTerminalResumeAction | undefined {
  const agentId = resolveBuiltInAgentId(agentLaunch, agentIconId);
  const agentCommand = resolveAgentCommand(agentLaunch, agentIconId);
  if (!agentId || !agentCommand) {
    return undefined;
  }

  switch (agentId) {
    case "codex": {
      const text = appendResumeTarget(`${agentCommand} resume`, sessionTitle, terminalTitle);
      return {
        steps: [{ data: text, shouldExecute: true }],
      };
    }
    case "claude": {
      const text = appendResumeTarget(`${agentCommand} --resume`, sessionTitle, terminalTitle);
      return {
        steps: [{ data: text, shouldExecute: true }],
      };
    }
    case "opencode": {
      const text = buildOpenCodeResumeCommand(agentCommand, sessionTitle, terminalTitle, false);
      if (!text) {
        return undefined;
      }

      return {
        steps: [{ data: text, shouldExecute: true }],
      };
    }
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
  if (!agentCommand) {
    return undefined;
  }

  if (!agentId) {
    // For custom agents we do not know the resume syntax, so fall back to the
    // original launch command instead of failing the copy action entirely.
    return agentCommand;
  }

  switch (agentId) {
    case "codex":
      return appendResumeTarget(`${agentCommand} resume`, sessionTitle, terminalTitle);
    case "claude":
      return appendResumeTarget(`${agentCommand} --resume`, sessionTitle, terminalTitle);
    case "gemini":
      return `${agentCommand} --list-sessions && echo 'Enter ${agentCommand} -r id' to resume a session`;
    case "opencode":
      return buildOpenCodeResumeCommand(agentCommand, sessionTitle, terminalTitle, true);
    case "copilot":
      return `${agentCommand} --continue && echo 'Or use ${agentCommand} --resume to pick a session, or ${agentCommand} --resume SESSION-ID if you know it'`;
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
        text: appendResumeTarget(`${agentCommand} --resume`, sessionTitle, terminalTitle),
      };
    case "gemini":
      return {
        shouldExecute: false,
        text: `${agentCommand} -r `,
      };
    case "opencode":
      return buildDetachedOpenCodeResumeAction(agentCommand, sessionTitle, terminalTitle);
    case "copilot":
      return {
        shouldExecute: false,
        text: `${agentCommand} --resume `,
      };
    default:
      return undefined;
  }
}

export function buildManualResumePrefillAction(
  sessionTitle: string | undefined,
  terminalTitle?: string,
): DetachedResumeAction | undefined {
  const resumeTitle = resolveResumeTitle(sessionTitle, terminalTitle);
  if (!resumeTitle) {
    return undefined;
  }

  return {
    shouldExecute: false,
    // Best-effort shell navigation: Ctrl+A moves the cursor to the start of the input line
    // in common readline-style shells after we prefill the quoted session name.
    text: `${quoteForSingleShellArgument(resumeTitle)}${MOVE_CURSOR_TO_LINE_START_CONTROL}`,
  };
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
  return resumeTitle
    ? `${commandPrefix} ${quoteForSingleShellArgument(resumeTitle)}`
    : commandPrefix;
}

function buildOpenCodeResumeCommand(
  agentCommand: string,
  sessionTitle: string | undefined,
  terminalTitle?: string,
  allowManualFallback = false,
): string | undefined {
  const resumeTitle = resolveResumeTitle(sessionTitle, terminalTitle);
  if (!resumeTitle) {
    return allowManualFallback
      ? `${agentCommand} session list && echo 'Enter ${agentCommand} -s id' to resume a session`
      : undefined;
  }

  return `${agentCommand} -s "$(${agentCommand} session list --format json | ${quoteForSingleShellArgument(process.execPath)} ${quoteForSingleShellArgument(OPENCODE_SESSION_LOOKUP_RUNNER_PATH)} ${quoteForSingleShellArgument(resumeTitle)})"`;
}

function buildDetachedOpenCodeResumeAction(
  agentCommand: string,
  sessionTitle: string | undefined,
  terminalTitle?: string,
): DetachedResumeAction | undefined {
  const resumeCommand = buildOpenCodeResumeCommand(
    agentCommand,
    sessionTitle,
    terminalTitle,
    false,
  );
  if (!resumeCommand) {
    return undefined;
  }

  return {
    shouldExecute: true,
    text: resumeCommand,
  };
}

function resolveResumeTitle(
  sessionTitle: string | undefined,
  terminalTitle: string | undefined,
): string | undefined {
  return normalizeTerminalTitle(getPreferredSessionTitle(sessionTitle, terminalTitle));
}

function resolveAgentCommand(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
): string | undefined {
  const builtInAgentId = resolveBuiltInAgentId(agentLaunch, agentIconId);
  const configuredDefaultCommand = builtInAgentId
    ? getDefaultAgentCommand(builtInAgentId)
    : undefined;
  const builtInDefaultCommand = builtInAgentId
    ? getDefaultSidebarAgentById(builtInAgentId)?.command
    : undefined;
  const storedCommand = agentLaunch?.command.trim();
  if (storedCommand) {
    if (
      configuredDefaultCommand &&
      builtInDefaultCommand &&
      storedCommand === builtInDefaultCommand
    ) {
      return configuredDefaultCommand;
    }

    return storedCommand;
  }

  return configuredDefaultCommand ?? getDefaultSidebarAgentByIcon(agentIconId)?.command;
}

function resolveBuiltInAgentId(
  agentLaunch: StoredSessionAgentLaunch | undefined,
  agentIconId: SidebarAgentIcon | undefined,
): "codex" | "claude" | "copilot" | "gemini" | "opencode" | undefined {
  const storedAgentId = normalizeStoredAgentId(agentLaunch?.agentId);
  if (storedAgentId) {
    return storedAgentId;
  }

  const sidebarAgent = getDefaultSidebarAgentByIcon(agentIconId);
  if (
    sidebarAgent?.agentId === "codex" ||
    sidebarAgent?.agentId === "claude" ||
    sidebarAgent?.agentId === "copilot" ||
    sidebarAgent?.agentId === "gemini" ||
    sidebarAgent?.agentId === "opencode"
  ) {
    return sidebarAgent.agentId;
  }

  return undefined;
}

function normalizeStoredAgentId(
  agentId: string | undefined,
): "codex" | "claude" | "copilot" | "gemini" | "opencode" | undefined {
  const normalizedAgentId = agentId?.trim().toLowerCase();
  const sidebarAgent = getDefaultSidebarAgentById(normalizedAgentId);
  if (
    sidebarAgent?.agentId === "codex" ||
    sidebarAgent?.agentId === "claude" ||
    sidebarAgent?.agentId === "copilot" ||
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
