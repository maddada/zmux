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

export const DEFAULT_BROWSER_ACTION_URL = "http://localhost:5173";
export const DEFAULT_BROWSER_LAUNCH_URL = "https://www.google.com";

export type DefaultSidebarCommandId = (typeof DEFAULT_SIDEBAR_COMMANDS)[number]["commandId"];
export type SidebarActionType = "browser" | "terminal";

export type SidebarCommandButton = {
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  command?: string;
  commandId: string;
  isDefault: boolean;
  name: string;
  url?: string;
};

export type StoredSidebarCommand = {
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId: string;
  isDefault: boolean;
  name: string;
  command?: string;
  url?: string;
};

export function getFirstBrowserSidebarCommandUrl(
  commands: readonly SidebarCommandButton[],
): string | undefined {
  return commands.find((command) => command.actionType === "browser")?.url;
}

export function createDefaultSidebarCommandButtons(): SidebarCommandButton[] {
  return DEFAULT_SIDEBAR_COMMANDS.map((command) => ({
    actionType: "terminal",
    closeTerminalOnExit: false,
    command: undefined,
    commandId: command.commandId,
    isDefault: true,
    name: command.name,
    url: undefined,
  }));
}

export function createSidebarCommandButtons(
  storedCommands: readonly StoredSidebarCommand[],
  storedOrder: readonly string[] = [],
  deletedDefaultCommandIds: readonly string[] = [],
): SidebarCommandButton[] {
  const storedCommandById = new Map(storedCommands.map((command) => [command.commandId, command]));
  const deletedDefaultCommandIdSet = new Set(
    normalizeStoredSidebarCommandOrder(deletedDefaultCommandIds),
  );
  const defaultButtons = DEFAULT_SIDEBAR_COMMANDS.reduce<SidebarCommandButton[]>(
    (buttons, command) => {
      if (deletedDefaultCommandIdSet.has(command.commandId)) {
        return buttons;
      }

      const storedCommand = storedCommandById.get(command.commandId);
      buttons.push(
        storedCommand ? normalizeStoredCommandButton(storedCommand) : defaultAction(command),
      );
      return buttons;
    },
    [],
  );

  const customButtons = storedCommands
    .filter((command) => !isDefaultSidebarCommandId(command.commandId))
    .map((command) => normalizeStoredCommandButton(command));

  return orderSidebarCommandButtons([...defaultButtons, ...customButtons], storedOrder);
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

    const partialItem = item as Partial<StoredSidebarCommand> & {
      actionType?: string;
      command?: string;
      url?: string;
    };
    const commandId = partialItem.commandId?.trim();
    const name = partialItem.name?.trim();
    const actionType = normalizeActionType(partialItem.actionType);
    const isDefault =
      partialItem.isDefault === true || (commandId ? isDefaultSidebarCommandId(commandId) : false);

    if (!commandId || !name || seenCommandIds.has(commandId)) {
      continue;
    }

    if (actionType === "browser") {
      const url = partialItem.url?.trim();
      if (!url) {
        continue;
      }

      normalizedCommands.push({
        actionType,
        closeTerminalOnExit: false,
        commandId,
        isDefault,
        name,
        url,
      });
      seenCommandIds.add(commandId);
      continue;
    }

    const command = partialItem.command?.trim();
    if (!command || typeof partialItem.closeTerminalOnExit !== "boolean") {
      continue;
    }

    normalizedCommands.push({
      actionType,
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

export function normalizeStoredSidebarCommandOrder(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  const normalizedOrder: string[] = [];
  const seenCommandIds = new Set<string>();

  for (const item of candidate) {
    if (typeof item !== "string") {
      continue;
    }

    const commandId = item.trim();
    if (!commandId || seenCommandIds.has(commandId)) {
      continue;
    }

    normalizedOrder.push(commandId);
    seenCommandIds.add(commandId);
  }

  return normalizedOrder;
}

function defaultAction(command: (typeof DEFAULT_SIDEBAR_COMMANDS)[number]): SidebarCommandButton {
  return {
    actionType: "terminal",
    closeTerminalOnExit: false,
    command: undefined,
    commandId: command.commandId,
    isDefault: true,
    name: command.name,
    url: undefined,
  };
}

function normalizeStoredCommandButton(command: StoredSidebarCommand): SidebarCommandButton {
  return command.actionType === "browser"
    ? {
        actionType: "browser",
        closeTerminalOnExit: false,
        command: undefined,
        commandId: command.commandId,
        isDefault: command.isDefault,
        name: command.name,
        url: command.url,
      }
    : {
        actionType: "terminal",
        closeTerminalOnExit: command.closeTerminalOnExit,
        command: command.command,
        commandId: command.commandId,
        isDefault: command.isDefault,
        name: command.name,
        url: undefined,
      };
}

function normalizeActionType(value: string | undefined): SidebarActionType {
  return value === "browser" ? "browser" : "terminal";
}

function orderSidebarCommandButtons(
  buttons: readonly SidebarCommandButton[],
  storedOrder: readonly string[],
): SidebarCommandButton[] {
  const buttonById = new Map(buttons.map((button) => [button.commandId, button] as const));
  const orderedButtons: SidebarCommandButton[] = [];

  for (const commandId of normalizeStoredSidebarCommandOrder(storedOrder)) {
    const button = buttonById.get(commandId);
    if (button) {
      orderedButtons.push(button);
    }
  }

  for (const button of buttons) {
    if (!orderedButtons.some((candidate) => candidate.commandId === button.commandId)) {
      orderedButtons.push(button);
    }
  }

  return orderedButtons;
}
