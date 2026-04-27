import * as vscode from "vscode";
import {
  createSidebarCommandButtons,
  isDefaultSidebarCommandId,
  normalizeStoredSidebarCommandOrder,
  type SidebarActionType,
  type SidebarCommandButton,
  type StoredSidebarCommand,
} from "../shared/sidebar-commands";
import {
  DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  normalizeSidebarCommandIconColor,
  type SidebarCommandIcon,
} from "../shared/sidebar-command-icons";
import { getSidebarCommandProjectFamilyKey } from "./sidebar-command-storage-scope";
import {
  createSharedStorageKey,
  getGlobalSidebarCommandStorage,
  getProjectSidebarCommandStorage,
  getSidebarCommandStoreSnapshot,
  getWorkspaceSidebarCommandStorage,
  mergeStoredSidebarCommandOrder,
  mergeStoredSidebarCommands,
  removeSidebarCommandFromStorage,
  SHARED_SIDEBAR_COMMANDS_MIGRATION_KEY_PREFIX,
} from "./sidebar-command-stores";

export type SaveSidebarCommandInput = {
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  icon?: SidebarCommandIcon;
  iconColor?: string;
  isGlobal?: boolean;
  name: string;
  playCompletionSound: boolean;
  command?: string;
  url?: string;
};

export function getSidebarCommandButtons(context: vscode.ExtensionContext): SidebarCommandButton[] {
  const projectStore = getProjectSidebarCommandStorage(context);
  const globalStore = getGlobalSidebarCommandStorage(context);
  const projectSnapshot = getSidebarCommandStoreSnapshot(projectStore);
  const globalSnapshot = getSidebarCommandStoreSnapshot(globalStore);

  return createSidebarCommandButtons(
    mergeStoredSidebarCommands(globalSnapshot.commands, projectSnapshot.commands),
    mergeStoredSidebarCommandOrder(projectSnapshot.order, globalSnapshot.order),
    mergeStoredSidebarCommandOrder(
      projectSnapshot.deletedDefaultCommandIds,
      globalSnapshot.deletedDefaultCommandIds,
    ),
  );
}

export function getSidebarCommandButtonById(
  context: vscode.ExtensionContext,
  commandId: string,
): SidebarCommandButton | undefined {
  return getSidebarCommandButtons(context).find((command) => command.commandId === commandId);
}

export async function saveSidebarCommandPreference(
  context: vscode.ExtensionContext,
  input: SaveSidebarCommandInput,
): Promise<void> {
  const name = input.name.trim();
  const command = input.command?.trim();
  const icon = input.icon;
  const iconColor = icon
    ? (normalizeSidebarCommandIconColor(input.iconColor) ?? DEFAULT_SIDEBAR_COMMAND_ICON_COLOR)
    : undefined;
  const url = input.url?.trim();
  if (!name && !icon) {
    return;
  }

  if (input.actionType === "browser" && !url) {
    return;
  }

  if (input.actionType === "terminal" && !command) {
    return;
  }

  const currentCommandIds = getSidebarCommandButtons(context).map(
    (candidate) => candidate.commandId,
  );
  const targetStorage =
    input.isGlobal === true
      ? getGlobalSidebarCommandStorage(context)
      : getProjectSidebarCommandStorage(context);
  const otherStorage =
    input.isGlobal === true
      ? getProjectSidebarCommandStorage(context)
      : getGlobalSidebarCommandStorage(context);
  const targetSnapshot = getSidebarCommandStoreSnapshot(targetStorage);
  const otherSnapshot = getSidebarCommandStoreSnapshot(otherStorage);
  const storedCommands = targetSnapshot.commands;
  const storedOrder = targetSnapshot.order;
  const deletedDefaultCommandIds = targetSnapshot.deletedDefaultCommandIds;
  const commandId = input.commandId?.trim() || createCustomCommandId();
  const nextCommand: StoredSidebarCommand = {
    actionType: input.actionType,
    closeTerminalOnExit: input.actionType === "terminal" ? input.closeTerminalOnExit : false,
    commandId,
    isDefault: isDefaultSidebarCommandId(commandId),
    ...(input.isGlobal === true ? { isGlobal: true } : {}),
    name,
    playCompletionSound: input.actionType === "terminal" ? input.playCompletionSound : false,
    ...(icon ? { icon, iconColor } : {}),
    ...(input.actionType === "browser" ? { url } : { command }),
  };
  const existingIndex = storedCommands.findIndex((candidate) => candidate.commandId === commandId);
  const nextCommands =
    existingIndex >= 0
      ? storedCommands.map((candidate, index) =>
          index === existingIndex ? nextCommand : candidate,
        )
      : [...storedCommands, nextCommand];
  const nextOrder =
    existingIndex >= 0 || storedOrder.includes(commandId) || isDefaultSidebarCommandId(commandId)
      ? storedOrder
      : currentCommandIds.includes(commandId)
        ? currentCommandIds
        : [...currentCommandIds, commandId];

  await targetStorage.memento.update(targetStorage.commandsKey, nextCommands);
  if (nextOrder !== storedOrder) {
    await targetStorage.memento.update(targetStorage.orderKey, nextOrder);
  }
  if (isDefaultSidebarCommandId(commandId) && deletedDefaultCommandIds.includes(commandId)) {
    await targetStorage.memento.update(
      targetStorage.deletedDefaultCommandsKey,
      deletedDefaultCommandIds.filter((candidateCommandId) => candidateCommandId !== commandId),
    );
  }
  if (input.commandId) {
    await removeSidebarCommandFromStorage(otherStorage, otherSnapshot, commandId);
  }
}

export async function deleteSidebarCommandPreference(
  context: vscode.ExtensionContext,
  commandId: string,
): Promise<void> {
  const commandButton = getSidebarCommandButtonById(context, commandId);
  const storage =
    commandButton?.isGlobal === true
      ? getGlobalSidebarCommandStorage(context)
      : getProjectSidebarCommandStorage(context);
  const snapshot = getSidebarCommandStoreSnapshot(storage);

  await removeSidebarCommandFromStorage(storage, snapshot, commandId);

  if (isDefaultSidebarCommandId(commandId) && storage.kind !== "global") {
    const deletedDefaultCommandIds = snapshot.deletedDefaultCommandIds;
    if (!deletedDefaultCommandIds.includes(commandId)) {
      await storage.memento.update(storage.deletedDefaultCommandsKey, [
        ...deletedDefaultCommandIds,
        commandId,
      ]);
    }
  }
}

export async function syncSidebarCommandOrderPreference(
  context: vscode.ExtensionContext,
  commandIds: readonly string[],
): Promise<void> {
  const storage = getProjectSidebarCommandStorage(context);
  const currentCommandIds = getSidebarCommandButtons(context).map((command) => command.commandId);
  const normalizedCommandIds = normalizeStoredSidebarCommandOrder(commandIds).filter((commandId) =>
    currentCommandIds.includes(commandId),
  );
  const nextOrder = [
    ...normalizedCommandIds,
    ...currentCommandIds.filter((commandId) => !normalizedCommandIds.includes(commandId)),
  ];

  await storage.memento.update(storage.orderKey, nextOrder);
}

export async function migrateSidebarCommandPreferences(
  context: vscode.ExtensionContext,
): Promise<void> {
  const projectStorage = getProjectSidebarCommandStorage(context);
  if (projectStorage.kind !== "shared") {
    return;
  }

  const migrationKey = createSharedStorageKey(
    SHARED_SIDEBAR_COMMANDS_MIGRATION_KEY_PREFIX,
    getSidebarCommandProjectFamilyKey(),
  );
  if (context.globalState.get<boolean>(migrationKey, false)) {
    return;
  }

  const legacyStorage = getWorkspaceSidebarCommandStorage(context);
  const legacySnapshot = getSidebarCommandStoreSnapshot(legacyStorage);
  if (
    legacySnapshot.commands.length === 0 &&
    legacySnapshot.order.length === 0 &&
    legacySnapshot.deletedDefaultCommandIds.length === 0
  ) {
    await context.globalState.update(migrationKey, true);
    return;
  }

  const projectSnapshot = getSidebarCommandStoreSnapshot(projectStorage);
  await projectStorage.memento.update(
    projectStorage.commandsKey,
    mergeStoredSidebarCommands(projectSnapshot.commands, legacySnapshot.commands),
  );
  await projectStorage.memento.update(
    projectStorage.orderKey,
    mergeStoredSidebarCommandOrder(projectSnapshot.order, legacySnapshot.order),
  );
  await projectStorage.memento.update(
    projectStorage.deletedDefaultCommandsKey,
    mergeStoredSidebarCommandOrder(
      projectSnapshot.deletedDefaultCommandIds,
      legacySnapshot.deletedDefaultCommandIds,
    ),
  );
  await context.globalState.update(migrationKey, true);
}

function createCustomCommandId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
