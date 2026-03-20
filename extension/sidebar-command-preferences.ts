import * as vscode from "vscode";
import {
  createSidebarCommandButtons,
  isDefaultSidebarCommandId,
  normalizeStoredSidebarCommands,
  type SidebarCommandButton,
  type StoredSidebarCommand,
} from "../shared/sidebar-commands";

const SIDEBAR_COMMANDS_KEY = "VSmux.sidebarCommands";

export type SaveSidebarCommandInput = {
  closeTerminalOnExit: boolean;
  command: string;
  commandId?: string;
  name: string;
};

export function getSidebarCommandButtons(
  context: vscode.ExtensionContext,
): SidebarCommandButton[] {
  return createSidebarCommandButtons(getStoredSidebarCommands(context));
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
  const command = input.command.trim();
  if (!name || !command) {
    return;
  }

  const storedCommands = getStoredSidebarCommands(context);
  const commandId = input.commandId?.trim() || createCustomCommandId();
  const nextCommand: StoredSidebarCommand = {
    closeTerminalOnExit: input.closeTerminalOnExit,
    command,
    commandId,
    isDefault: isDefaultSidebarCommandId(commandId),
    name,
  };
  const existingIndex = storedCommands.findIndex((candidate) => candidate.commandId === commandId);
  const nextCommands =
    existingIndex >= 0
      ? storedCommands.map((candidate, index) => (index === existingIndex ? nextCommand : candidate))
      : [...storedCommands, nextCommand];

  await context.workspaceState.update(SIDEBAR_COMMANDS_KEY, nextCommands);
}

export async function deleteSidebarCommandPreference(
  context: vscode.ExtensionContext,
  commandId: string,
): Promise<void> {
  const nextCommands = getStoredSidebarCommands(context).filter(
    (command) => command.commandId !== commandId,
  );
  await context.workspaceState.update(SIDEBAR_COMMANDS_KEY, nextCommands);
}

function getStoredSidebarCommands(context: vscode.ExtensionContext): StoredSidebarCommand[] {
  return normalizeStoredSidebarCommands(context.workspaceState.get(SIDEBAR_COMMANDS_KEY));
}

function createCustomCommandId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
