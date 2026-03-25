import * as vscode from "vscode";
import {
  createEditorLayoutPlan,
  type EditorLayout,
  type EditorLayoutGroup,
} from "../shared/editor-layout";
import type { TerminalViewMode } from "../shared/session-grid-contract";

export async function applyEditorLayout(
  visibleCount: number,
  viewMode: TerminalViewMode,
  options?: {
    joinAllGroups?: boolean;
  },
): Promise<void> {
  const layoutPlan = createEditorLayoutPlan(visibleCount, viewMode);
  if (options?.joinAllGroups !== false) {
    await vscode.commands.executeCommand("workbench.action.joinAllGroups");
  }
  await vscode.commands.executeCommand("vscode.setEditorLayout", layoutPlan.layout);
}

export async function doesCurrentEditorLayoutMatch(
  visibleCount: number,
  viewMode: TerminalViewMode,
): Promise<boolean> {
  try {
    const currentLayout = await vscode.commands.executeCommand<EditorLayout | undefined>(
      "vscode.getEditorLayout",
    );
    if (!isEditorLayout(currentLayout)) {
      return false;
    }

    const desiredLayout = createEditorLayoutPlan(visibleCount, viewMode).layout;
    return (
      JSON.stringify(normalizeEditorLayout(currentLayout)) ===
      JSON.stringify(normalizeEditorLayout(desiredLayout))
    );
  } catch {
    return false;
  }
}

export async function getCurrentEditorGroupCount(): Promise<number | undefined> {
  try {
    const currentLayout = await vscode.commands.executeCommand<EditorLayout | undefined>(
      "vscode.getEditorLayout",
    );
    if (!isEditorLayout(currentLayout)) {
      return undefined;
    }

    return countEditorLayoutLeafGroups(currentLayout);
  } catch {
    return undefined;
  }
}

function isEditorLayout(value: unknown): value is EditorLayout {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as EditorLayout).groups) &&
    ((value as EditorLayout).orientation === 0 || (value as EditorLayout).orientation === 1)
  );
}

function normalizeEditorLayout(layout: EditorLayout): {
  groups: Array<Record<string, unknown>>;
  orientation: 0 | 1;
} {
  return {
    groups: layout.groups.map((group) => normalizeEditorLayoutGroup(group)),
    orientation: layout.orientation,
  };
}

function normalizeEditorLayoutGroup(group: EditorLayoutGroup): Record<string, unknown> {
  if (!Array.isArray(group.groups) || group.groups.length === 0) {
    return {};
  }

  return {
    groups: group.groups.map((childGroup) => normalizeEditorLayoutGroup(childGroup)),
    orientation: group.orientation,
  };
}

function countEditorLayoutLeafGroups(layout: EditorLayout): number {
  return layout.groups.reduce((count, group) => count + countEditorLayoutGroupLeaves(group), 0);
}

function countEditorLayoutGroupLeaves(group: EditorLayoutGroup): number {
  if (!Array.isArray(group.groups) || group.groups.length === 0) {
    return 1;
  }

  return group.groups.reduce(
    (count, childGroup) => count + countEditorLayoutGroupLeaves(childGroup),
    0,
  );
}
