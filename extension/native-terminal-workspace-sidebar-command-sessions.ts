import * as vscode from "vscode";
import { getWorkspaceStorageKey } from "./terminal-workspace-helpers";

const SIDEBAR_COMMAND_SESSIONS_KEY = "VSmux.sidebarCommandSessions";

export type StoredSidebarCommandSession = {
  closeOnExit: boolean;
  commandId: string;
  sessionId: string;
};

export function loadStoredSidebarCommandSessions(
  context: vscode.ExtensionContext,
  workspaceId: string,
): Map<string, StoredSidebarCommandSession> {
  const storedValue = context.workspaceState.get<unknown>(
    getWorkspaceStorageKey(SIDEBAR_COMMAND_SESSIONS_KEY, workspaceId),
  );
  const entries = Array.isArray(storedValue) ? storedValue : [];
  const sessionsByCommandId = new Map<string, StoredSidebarCommandSession>();

  for (const entry of entries) {
    if (!isStoredSidebarCommandSession(entry)) {
      continue;
    }

    sessionsByCommandId.set(entry.commandId, {
      closeOnExit: entry.closeOnExit,
      commandId: entry.commandId,
      sessionId: entry.sessionId,
    });
  }

  return sessionsByCommandId;
}

export async function persistSidebarCommandSessions(
  context: vscode.ExtensionContext,
  workspaceId: string,
  sessionsByCommandId: ReadonlyMap<string, StoredSidebarCommandSession>,
): Promise<void> {
  await context.workspaceState.update(
    getWorkspaceStorageKey(SIDEBAR_COMMAND_SESSIONS_KEY, workspaceId),
    [...sessionsByCommandId.values()].map((session) => ({
      closeOnExit: session.closeOnExit,
      commandId: session.commandId,
      sessionId: session.sessionId,
    })),
  );
}

function isStoredSidebarCommandSession(value: unknown): value is StoredSidebarCommandSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredSidebarCommandSession>;
  return (
    typeof candidate.closeOnExit === "boolean" &&
    typeof candidate.commandId === "string" &&
    candidate.commandId.trim().length > 0 &&
    typeof candidate.sessionId === "string" &&
    candidate.sessionId.trim().length > 0
  );
}
