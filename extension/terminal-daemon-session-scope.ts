import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";

const SESSION_SCOPE_SEPARATOR = "\u0000";

export function createTerminalDaemonSessionKey(workspaceId: string, sessionId: string): string {
  return `${workspaceId}${SESSION_SCOPE_SEPARATOR}${sessionId}`;
}

export function indexWorkspaceTerminalSnapshotsBySessionId(
  snapshots: readonly TerminalSessionSnapshot[],
  workspaceId: string,
): Map<string, TerminalSessionSnapshot> {
  return new Map(
    snapshots
      .filter((snapshot) => snapshot.workspaceId === workspaceId)
      .map((snapshot) => [snapshot.sessionId, snapshot]),
  );
}
