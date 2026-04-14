import * as vscode from "vscode";
import {
  createDefaultSidebarSectionCollapseState,
  type SidebarCollapsibleSection,
  type SidebarSectionCollapseState,
} from "../shared/session-grid-contract";
import { getWorkspaceStorageKey } from "./terminal-workspace-environment";

const SIDEBAR_SECTION_COLLAPSE_STATE_KEY = "VSmux.sidebarSectionCollapseState";

export function getSidebarSectionCollapseState(
  context: vscode.ExtensionContext,
  workspaceId: string,
): SidebarSectionCollapseState {
  const storedValue = context.workspaceState.get<unknown>(
    getWorkspaceStorageKey(SIDEBAR_SECTION_COLLAPSE_STATE_KEY, workspaceId),
  );
  return normalizeSidebarSectionCollapseState(storedValue);
}

export async function saveSidebarSectionCollapsed(
  context: vscode.ExtensionContext,
  workspaceId: string,
  section: SidebarCollapsibleSection,
  collapsed: boolean,
): Promise<void> {
  const currentState = getSidebarSectionCollapseState(context, workspaceId);
  if (currentState[section] === collapsed) {
    return;
  }

  await context.workspaceState.update(
    getWorkspaceStorageKey(SIDEBAR_SECTION_COLLAPSE_STATE_KEY, workspaceId),
    {
      ...currentState,
      [section]: collapsed,
    },
  );
}

function normalizeSidebarSectionCollapseState(candidate: unknown): SidebarSectionCollapseState {
  const defaults = createDefaultSidebarSectionCollapseState();
  if (!candidate || typeof candidate !== "object") {
    return defaults;
  }

  const state = candidate as Partial<SidebarSectionCollapseState>;
  return {
    actions: typeof state.actions === "boolean" ? state.actions : defaults.actions,
    agents: typeof state.agents === "boolean" ? state.agents : defaults.agents,
  };
}
