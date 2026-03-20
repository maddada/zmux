export const DEFAULT_SIDEBAR_COMMANDS = [
  {
    commandId: "dev",
    name: "Dev",
  },
  {
    commandId: "build",
    name: "Build",
  },
  {
    commandId: "test",
    name: "Test",
  },
  {
    commandId: "setup",
    name: "Setup",
  },
] as const;

export type DefaultSidebarCommandId = (typeof DEFAULT_SIDEBAR_COMMANDS)[number]["commandId"];

export type SidebarCommandButton = {
  closeTerminalOnExit: boolean;
  command?: string;
  commandId: string;
  isDefault: boolean;
  name: string;
};

export type StoredSidebarCommand = {
  closeTerminalOnExit: boolean;
  command: string;
  commandId: string;
  isDefault: boolean;
  name: string;
};

export function createDefaultSidebarCommandButtons(): SidebarCommandButton[] {
  return DEFAULT_SIDEBAR_COMMANDS.map((command) => ({
    closeTerminalOnExit: false,
    command: undefined,
    commandId: command.commandId,
    isDefault: true,
    name: command.name,
  }));
}

export function createSidebarCommandButtons(
  storedCommands: readonly StoredSidebarCommand[],
): SidebarCommandButton[] {
  const storedCommandById = new Map(storedCommands.map((command) => [command.commandId, command]));
  const defaultButtons = DEFAULT_SIDEBAR_COMMANDS.map((command) => {
    const storedCommand = storedCommandById.get(command.commandId);
    if (!storedCommand) {
      return {
        closeTerminalOnExit: false,
        command: undefined,
        commandId: command.commandId,
        isDefault: true,
        name: command.name,
      };
    }

    return {
      closeTerminalOnExit: storedCommand.closeTerminalOnExit,
      command: storedCommand.command,
      commandId: storedCommand.commandId,
      isDefault: true,
      name: storedCommand.name,
    };
  });

  const customButtons = storedCommands
    .filter((command) => !isDefaultSidebarCommandId(command.commandId))
    .map((command) => ({
      closeTerminalOnExit: command.closeTerminalOnExit,
      command: command.command,
      commandId: command.commandId,
      isDefault: false,
      name: command.name,
    }));

  return [...defaultButtons, ...customButtons];
}

export function isDefaultSidebarCommandId(commandId: string): commandId is DefaultSidebarCommandId {
  return DEFAULT_SIDEBAR_COMMANDS.some((command) => command.commandId === commandId);
}

export function normalizeStoredSidebarCommands(candidate: unknown): StoredSidebarCommand[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  const normalizedCommands: StoredSidebarCommand[] = [];
  const seenCommandIds = new Set<string>();

  for (const item of candidate) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const partialItem = item as Partial<StoredSidebarCommand>;
    const commandId = partialItem.commandId?.trim();
    const name = partialItem.name?.trim();
    const command = partialItem.command?.trim();
    const isDefault =
      partialItem.isDefault === true || (commandId ? isDefaultSidebarCommandId(commandId) : false);

    if (
      !commandId ||
      !name ||
      !command ||
      typeof partialItem.closeTerminalOnExit !== "boolean" ||
      seenCommandIds.has(commandId)
    ) {
      continue;
    }

    normalizedCommands.push({
      closeTerminalOnExit: partialItem.closeTerminalOnExit,
      command,
      commandId,
      isDefault,
      name,
    });
    seenCommandIds.add(commandId);
  }

  return normalizedCommands;
}
