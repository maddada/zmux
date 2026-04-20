import type { SidebarCommandButton } from "../shared/sidebar-commands";

function getTrimmedCommandTitle(command: SidebarCommandButton): string | undefined {
  const trimmedName = command.name.trim();
  return trimmedName.length > 0 ? trimmedName : undefined;
}

function getCommandTargetCopy(command: SidebarCommandButton): string | undefined {
  const targetCopy =
    command.actionType === "browser" ? command.url?.trim() : command.command?.trim();
  return targetCopy && targetCopy.length > 0 ? targetCopy : undefined;
}

export function getCommandButtonTooltip(command: SidebarCommandButton): string {
  const title = getTrimmedCommandTitle(command);
  const targetCopy = getCommandTargetCopy(command);

  if (!targetCopy) {
    return title ? `Configure ${title}` : "Configure action";
  }

  return title ? `${title}\n${targetCopy}` : targetCopy;
}

export function getCommandButtonAriaLabel(command: SidebarCommandButton): string {
  const title = getTrimmedCommandTitle(command);
  const targetCopy = getCommandTargetCopy(command);

  if (!targetCopy) {
    return title ? `Configure ${title}` : "Configure action";
  }

  if (title) {
    return command.actionType === "browser" ? `Open ${title}` : `Run ${title}`;
  }

  return command.actionType === "browser" ? `Open ${targetCopy}` : `Run ${targetCopy}`;
}
