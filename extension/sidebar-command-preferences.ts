import * as vscode from "vscode";
import {
  createSidebarCommandButtons,
  isDefaultSidebarCommandId,
  normalizeStoredSidebarCommandOrder,
  normalizeStoredSidebarCommands,
  type SidebarActionType,
  type SidebarCommandButton,
  type StoredSidebarCommand,
} from "../shared/sidebar-commands";
import {
  DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  normalizeSidebarCommandIconColor,
  type SidebarCommandIcon,
} from "../shared/sidebar-command-icons";

const SIDEBAR_COMMANDS_KEY = "VSmux.sidebarCommands";
const SIDEBAR_COMMAND_ORDER_KEY = "VSmux.sidebarCommandOrder";
const DELETED_DEFAULT_COMMANDS_KEY = "VSmux.deletedSidebarDefaultCommands";

export type SaveSidebarCommandInput = {
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  icon?: SidebarCommandIcon;
  iconColor?: string;
  name: string;
  playCompletionSound: boolean;
  command?: string;
  url?: string;
};

export function getSidebarCommandButtons(context: vscode.ExtensionContext): SidebarCommandButton[] {
  return createSidebarCommandButtons(
    getStoredSidebarCommands(context),
    getStoredSidebarCommandOrder(context),
    getDeletedDefaultCommandIds(context),
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
  const storedCommands = getStoredSidebarCommands(context);
  const storedOrder = getStoredSidebarCommandOrder(context);
  const deletedDefaultCommandIds = getDeletedDefaultCommandIds(context);
  const commandId = input.commandId?.trim() || createCustomCommandId();
  const nextCommand: StoredSidebarCommand = {
    actionType: input.actionType,
    closeTerminalOnExit: input.actionType === "terminal" ? input.closeTerminalOnExit : false,
    commandId,
    isDefault: isDefaultSidebarCommandId(commandId),
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
      : [...currentCommandIds, commandId];

  await context.workspaceState.update(SIDEBAR_COMMANDS_KEY, nextCommands);
  if (nextOrder !== storedOrder) {
    await context.workspaceState.update(SIDEBAR_COMMAND_ORDER_KEY, nextOrder);
  }
  if (isDefaultSidebarCommandId(commandId) && deletedDefaultCommandIds.includes(commandId)) {
    await context.workspaceState.update(
      DELETED_DEFAULT_COMMANDS_KEY,
      deletedDefaultCommandIds.filter((candidateCommandId) => candidateCommandId !== commandId),
    );
  }
}

export async function deleteSidebarCommandPreference(
  context: vscode.ExtensionContext,
  commandId: string,
): Promise<void> {
  const nextCommands = getStoredSidebarCommands(context).filter(
    (command) => command.commandId !== commandId,
  );
  await context.workspaceState.update(SIDEBAR_COMMANDS_KEY, nextCommands);
  const nextOrder = getStoredSidebarCommandOrder(context).filter(
    (candidateCommandId) => candidateCommandId !== commandId,
  );
  await context.workspaceState.update(SIDEBAR_COMMAND_ORDER_KEY, nextOrder);

  if (isDefaultSidebarCommandId(commandId)) {
    const deletedDefaultCommandIds = getDeletedDefaultCommandIds(context);
    if (!deletedDefaultCommandIds.includes(commandId)) {
      await context.workspaceState.update(DELETED_DEFAULT_COMMANDS_KEY, [
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
  const currentCommandIds = getSidebarCommandButtons(context).map((command) => command.commandId);
  const normalizedCommandIds = normalizeStoredSidebarCommandOrder(commandIds).filter((commandId) =>
    currentCommandIds.includes(commandId),
  );
  const nextOrder = [
    ...normalizedCommandIds,
    ...currentCommandIds.filter((commandId) => !normalizedCommandIds.includes(commandId)),
  ];

  await context.workspaceState.update(SIDEBAR_COMMAND_ORDER_KEY, nextOrder);
}

function getStoredSidebarCommands(context: vscode.ExtensionContext): StoredSidebarCommand[] {
  return normalizeStoredSidebarCommands(context.workspaceState.get(SIDEBAR_COMMANDS_KEY));
}

function getStoredSidebarCommandOrder(context: vscode.ExtensionContext): string[] {
  return normalizeStoredSidebarCommandOrder(context.workspaceState.get(SIDEBAR_COMMAND_ORDER_KEY));
}

function getDeletedDefaultCommandIds(context: vscode.ExtensionContext): string[] {
  return normalizeStoredSidebarCommandOrder(
    context.workspaceState.get(DELETED_DEFAULT_COMMANDS_KEY),
  );
}

function createCustomCommandId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
