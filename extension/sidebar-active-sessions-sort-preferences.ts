import type * as vscode from "vscode";
import type { SidebarActiveSessionsSortMode } from "../shared/session-grid-contract";
import { getWorkspaceStorageKey } from "./terminal-workspace-environment";

const SIDEBAR_ACTIVE_SESSIONS_SORT_MODE_KEY = "VSmux.sidebarActiveSessionsSortMode";

export function getSidebarActiveSessionsSortMode(
  context: vscode.ExtensionContext,
  workspaceId: string,
): SidebarActiveSessionsSortMode {
  const storedValue = context.workspaceState.get<unknown>(
    getWorkspaceStorageKey(SIDEBAR_ACTIVE_SESSIONS_SORT_MODE_KEY, workspaceId),
  );
  return normalizeSidebarActiveSessionsSortMode(storedValue);
}

export async function saveSidebarActiveSessionsSortMode(
  context: vscode.ExtensionContext,
  workspaceId: string,
  sortMode: SidebarActiveSessionsSortMode,
): Promise<void> {
  const currentSortMode = getSidebarActiveSessionsSortMode(context, workspaceId);
  if (currentSortMode === sortMode) {
    return;
  }

  await context.workspaceState.update(
    getWorkspaceStorageKey(SIDEBAR_ACTIVE_SESSIONS_SORT_MODE_KEY, workspaceId),
    sortMode,
  );
}

function normalizeSidebarActiveSessionsSortMode(candidate: unknown): SidebarActiveSessionsSortMode {
  return candidate === "lastActivity" ? "lastActivity" : "manual";
}
