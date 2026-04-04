import type { ExtensionContext } from "vscode";
import { getWorkspaceStorageKey } from "../terminal-workspace-environment";

const WORKSPACE_PANE_ORDER_BY_GROUP_KEY = "VSmux.workspacePaneOrderByGroup";

type WorkspacePaneOrderByGroup = Record<string, string[]>;

export function getWorkspacePaneOrderPreference(
  context: ExtensionContext,
  workspaceId: string,
  groupId: string,
): string[] {
  return getWorkspacePaneOrderByGroup(context, workspaceId)[groupId] ?? [];
}

export async function syncWorkspacePaneOrderPreference(
  context: ExtensionContext,
  workspaceId: string,
  groupId: string,
  sessionIds: readonly string[],
): Promise<boolean> {
  const currentOrders = getWorkspacePaneOrderByGroup(context, workspaceId);
  const currentGroupOrder = currentOrders[groupId] ?? [];
  const nextGroupOrder = normalizeWorkspacePaneOrder(sessionIds);
  if (areStringArraysEqual(currentGroupOrder, nextGroupOrder)) {
    return false;
  }

  await context.workspaceState.update(getWorkspacePaneOrderStorageKey(workspaceId), {
    ...currentOrders,
    [groupId]: nextGroupOrder,
  });
  return true;
}

export async function deleteWorkspacePaneOrderPreference(
  context: ExtensionContext,
  workspaceId: string,
  groupId: string,
): Promise<void> {
  const currentOrders = getWorkspacePaneOrderByGroup(context, workspaceId);
  if (!(groupId in currentOrders)) {
    return;
  }

  const { [groupId]: _removedOrder, ...nextOrders } = currentOrders;
  await context.workspaceState.update(
    getWorkspacePaneOrderStorageKey(workspaceId),
    Object.keys(nextOrders).length > 0 ? nextOrders : undefined,
  );
}

function getWorkspacePaneOrderByGroup(
  context: ExtensionContext,
  workspaceId: string,
): WorkspacePaneOrderByGroup {
  return normalizeWorkspacePaneOrderByGroup(
    context.workspaceState.get<unknown>(getWorkspacePaneOrderStorageKey(workspaceId)),
  );
}

function getWorkspacePaneOrderStorageKey(workspaceId: string): string {
  return getWorkspaceStorageKey(WORKSPACE_PANE_ORDER_BY_GROUP_KEY, workspaceId);
}

function normalizeWorkspacePaneOrderByGroup(candidate: unknown): WorkspacePaneOrderByGroup {
  if (!candidate || typeof candidate !== "object") {
    return {};
  }

  const nextOrders: WorkspacePaneOrderByGroup = {};
  for (const [groupId, sessionIds] of Object.entries(candidate)) {
    if (typeof groupId !== "string" || groupId.length === 0) {
      continue;
    }

    const normalizedSessionIds = normalizeWorkspacePaneOrder(sessionIds);
    if (normalizedSessionIds.length === 0) {
      continue;
    }

    nextOrders[groupId] = normalizedSessionIds;
  }

  return nextOrders;
}

function normalizeWorkspacePaneOrder(sessionIds: readonly unknown[]): string[] {
  const normalizedSessionIds: string[] = [];

  for (const sessionId of sessionIds) {
    if (
      typeof sessionId !== "string" ||
      sessionId.length === 0 ||
      normalizedSessionIds.includes(sessionId)
    ) {
      continue;
    }

    normalizedSessionIds.push(sessionId);
  }

  return normalizedSessionIds;
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
