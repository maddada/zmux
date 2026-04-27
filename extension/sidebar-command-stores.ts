import type * as vscode from "vscode";
import {
  normalizeStoredSidebarCommandOrder,
  normalizeStoredSidebarCommands,
  type StoredSidebarCommand,
} from "../shared/sidebar-commands";
import {
  getSidebarCommandProjectFamilyKey,
  shouldShareSidebarCommandsAcrossWorktrees,
} from "./sidebar-command-storage-scope";

const SIDEBAR_COMMANDS_KEY = "zmux.sidebarCommands";
const SIDEBAR_COMMAND_ORDER_KEY = "zmux.sidebarCommandOrder";
const DELETED_DEFAULT_COMMANDS_KEY = "zmux.deletedSidebarDefaultCommands";
const GLOBAL_SIDEBAR_COMMANDS_KEY = "zmux.globalSidebarCommands";
const GLOBAL_SIDEBAR_COMMAND_ORDER_KEY = "zmux.globalSidebarCommandOrder";
const GLOBAL_DELETED_DEFAULT_COMMANDS_KEY = "zmux.globalDeletedSidebarDefaultCommands";
const SHARED_SIDEBAR_COMMANDS_KEY_PREFIX = "zmux.sharedSidebarCommands";
const SHARED_SIDEBAR_COMMAND_ORDER_KEY_PREFIX = "zmux.sharedSidebarCommandOrder";
const SHARED_DELETED_DEFAULT_COMMANDS_KEY_PREFIX = "zmux.sharedDeletedSidebarDefaultCommands";

export const SHARED_SIDEBAR_COMMANDS_MIGRATION_KEY_PREFIX = "zmux.sharedSidebarCommandsMigration";

export type SidebarCommandStorage = {
  commandsKey: string;
  deletedDefaultCommandsKey: string;
  isGlobal: boolean;
  kind: "global" | "shared" | "workspace";
  memento: vscode.Memento;
  orderKey: string;
};

export type SidebarCommandStoreSnapshot = {
  commands: StoredSidebarCommand[];
  deletedDefaultCommandIds: string[];
  order: string[];
};

export function getSidebarCommandStoreSnapshot(
  storage: SidebarCommandStorage,
): SidebarCommandStoreSnapshot {
  return {
    commands: getStoredSidebarCommands(storage),
    deletedDefaultCommandIds: getDeletedDefaultCommandIds(storage),
    order: getStoredSidebarCommandOrder(storage),
  };
}

export function getProjectSidebarCommandStorage(
  context: vscode.ExtensionContext,
): SidebarCommandStorage {
  return shouldShareSidebarCommandsAcrossWorktrees()
    ? getSharedSidebarCommandStorage(context)
    : getWorkspaceSidebarCommandStorage(context);
}

export function getWorkspaceSidebarCommandStorage(
  context: vscode.ExtensionContext,
): SidebarCommandStorage {
  return {
    commandsKey: SIDEBAR_COMMANDS_KEY,
    deletedDefaultCommandsKey: DELETED_DEFAULT_COMMANDS_KEY,
    isGlobal: false,
    kind: "workspace",
    memento: context.workspaceState,
    orderKey: SIDEBAR_COMMAND_ORDER_KEY,
  };
}

export function getGlobalSidebarCommandStorage(
  context: vscode.ExtensionContext,
): SidebarCommandStorage {
  return {
    commandsKey: GLOBAL_SIDEBAR_COMMANDS_KEY,
    deletedDefaultCommandsKey: GLOBAL_DELETED_DEFAULT_COMMANDS_KEY,
    isGlobal: true,
    kind: "global",
    memento: context.globalState,
    orderKey: GLOBAL_SIDEBAR_COMMAND_ORDER_KEY,
  };
}

export async function removeSidebarCommandFromStorage(
  storage: SidebarCommandStorage,
  snapshot: SidebarCommandStoreSnapshot,
  commandId: string,
): Promise<void> {
  const nextCommands = snapshot.commands.filter((command) => command.commandId !== commandId);
  if (nextCommands.length !== snapshot.commands.length) {
    await storage.memento.update(storage.commandsKey, nextCommands);
  }

  const nextOrder = snapshot.order.filter((candidateCommandId) => candidateCommandId !== commandId);
  if (nextOrder.length !== snapshot.order.length) {
    await storage.memento.update(storage.orderKey, nextOrder);
  }
}

export function mergeStoredSidebarCommands(
  first: readonly StoredSidebarCommand[],
  second: readonly StoredSidebarCommand[],
): StoredSidebarCommand[] {
  const commandById = new Map<string, StoredSidebarCommand>();
  for (const command of first) {
    commandById.set(command.commandId, command);
  }
  for (const command of second) {
    commandById.set(command.commandId, command);
  }
  return Array.from(commandById.values());
}

export function mergeStoredSidebarCommandOrder(
  first: readonly string[],
  second: readonly string[],
): string[] {
  const mergedOrder: string[] = [];
  for (const commandId of normalizeStoredSidebarCommandOrder([...first, ...second])) {
    if (!mergedOrder.includes(commandId)) {
      mergedOrder.push(commandId);
    }
  }
  return mergedOrder;
}

export function createSharedStorageKey(prefix: string, familyKey: string): string {
  return `${prefix}:${familyKey}`;
}

function getStoredSidebarCommands(storage: SidebarCommandStorage): StoredSidebarCommand[] {
  const commands = normalizeStoredSidebarCommands(storage.memento.get(storage.commandsKey));
  return storage.isGlobal
    ? commands.map((command) => ({
        ...command,
        isGlobal: true,
      }))
    : commands.map((command) => {
        const normalizedCommand = { ...command };
        delete normalizedCommand.isGlobal;
        return normalizedCommand;
      });
}

function getStoredSidebarCommandOrder(storage: SidebarCommandStorage): string[] {
  return normalizeStoredSidebarCommandOrder(storage.memento.get(storage.orderKey));
}

function getDeletedDefaultCommandIds(storage: SidebarCommandStorage): string[] {
  return normalizeStoredSidebarCommandOrder(storage.memento.get(storage.deletedDefaultCommandsKey));
}

function getSharedSidebarCommandStorage(context: vscode.ExtensionContext): SidebarCommandStorage {
  const familyKey = getSidebarCommandProjectFamilyKey();
  return {
    commandsKey: createSharedStorageKey(SHARED_SIDEBAR_COMMANDS_KEY_PREFIX, familyKey),
    deletedDefaultCommandsKey: createSharedStorageKey(
      SHARED_DELETED_DEFAULT_COMMANDS_KEY_PREFIX,
      familyKey,
    ),
    isGlobal: false,
    kind: "shared",
    memento: context.globalState,
    orderKey: createSharedStorageKey(SHARED_SIDEBAR_COMMAND_ORDER_KEY_PREFIX, familyKey),
  };
}
