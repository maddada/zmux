import type * as vscode from "vscode";
import { getSidebarCommandProjectFamilyKey } from "./sidebar-command-storage-scope";
import { createSharedStorageKey } from "./sidebar-command-stores";

const SHARED_WORKSPACE_APPEARANCE_KEY_PREFIX = "VSmux.sharedWorkspaceAppearance";

type SharedWorkspaceAppearancePreferenceKey = "t3ZoomPercent" | "terminalFontSize";

type SharedWorkspaceAppearanceSnapshot = Partial<
  Record<SharedWorkspaceAppearancePreferenceKey, number>
>;

let sharedWorkspaceAppearanceContext: vscode.ExtensionContext | undefined;
let sharedWorkspaceAppearanceSnapshotCache: SharedWorkspaceAppearanceSnapshot | undefined;

export function initializeSharedWorkspaceAppearancePreferences(
  context: vscode.ExtensionContext,
): void {
  sharedWorkspaceAppearanceContext = context;
  sharedWorkspaceAppearanceSnapshotCache = normalizeSharedWorkspaceAppearanceSnapshot(
    getStoredSharedWorkspaceAppearanceSnapshot(),
  );
}

export function getSharedWorkspaceAppearancePreference(
  key: SharedWorkspaceAppearancePreferenceKey,
): number | undefined {
  return getSharedWorkspaceAppearanceSnapshot()[key];
}

export async function setSharedWorkspaceAppearancePreference(
  key: SharedWorkspaceAppearancePreferenceKey,
  value: number,
): Promise<void> {
  const context = sharedWorkspaceAppearanceContext;
  if (!context) {
    return;
  }

  const currentSnapshot = normalizeSharedWorkspaceAppearanceSnapshot(
    getSharedWorkspaceAppearanceSnapshot(),
  );
  if (currentSnapshot[key] === value) {
    return;
  }

  const nextSnapshot = {
    ...currentSnapshot,
    [key]: value,
  };
  sharedWorkspaceAppearanceSnapshotCache = nextSnapshot;
  await context.globalState.update(getSharedWorkspaceAppearanceStorageKey(), nextSnapshot);
}

export async function clearSharedWorkspaceAppearancePreference(
  key: SharedWorkspaceAppearancePreferenceKey,
): Promise<void> {
  const context = sharedWorkspaceAppearanceContext;
  if (!context) {
    return;
  }

  const currentSnapshot = normalizeSharedWorkspaceAppearanceSnapshot(
    getSharedWorkspaceAppearanceSnapshot(),
  );
  if (!(key in currentSnapshot)) {
    return;
  }

  const { [key]: _removedValue, ...nextSnapshot } = currentSnapshot;
  sharedWorkspaceAppearanceSnapshotCache = nextSnapshot;
  await context.globalState.update(
    getSharedWorkspaceAppearanceStorageKey(),
    Object.keys(nextSnapshot).length > 0 ? nextSnapshot : undefined,
  );
}

function getSharedWorkspaceAppearanceSnapshot(): SharedWorkspaceAppearanceSnapshot {
  if (sharedWorkspaceAppearanceSnapshotCache) {
    return sharedWorkspaceAppearanceSnapshotCache;
  }

  const snapshot = normalizeSharedWorkspaceAppearanceSnapshot(
    getStoredSharedWorkspaceAppearanceSnapshot(),
  );
  sharedWorkspaceAppearanceSnapshotCache = snapshot;
  return snapshot;
}

function getStoredSharedWorkspaceAppearanceSnapshot(): unknown {
  return sharedWorkspaceAppearanceContext?.globalState.get(
    getSharedWorkspaceAppearanceStorageKey(),
  );
}

function getSharedWorkspaceAppearanceStorageKey(): string {
  return createSharedStorageKey(
    SHARED_WORKSPACE_APPEARANCE_KEY_PREFIX,
    getSidebarCommandProjectFamilyKey(),
  );
}

function normalizeSharedWorkspaceAppearanceSnapshot(
  candidate: unknown,
): SharedWorkspaceAppearanceSnapshot {
  if (!candidate || typeof candidate !== "object") {
    return {};
  }

  const normalizedSnapshot: SharedWorkspaceAppearanceSnapshot = {};
  const terminalFontSize = readNumber(candidate, "terminalFontSize");
  if (terminalFontSize !== undefined) {
    normalizedSnapshot.terminalFontSize = terminalFontSize;
  }

  const t3ZoomPercent = readNumber(candidate, "t3ZoomPercent");
  if (t3ZoomPercent !== undefined) {
    normalizedSnapshot.t3ZoomPercent = t3ZoomPercent;
  }

  return normalizedSnapshot;
}

function readNumber(candidate: unknown, key: string): number | undefined {
  if (!candidate || typeof candidate !== "object" || !(key in candidate)) {
    return undefined;
  }

  const value = (candidate as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
