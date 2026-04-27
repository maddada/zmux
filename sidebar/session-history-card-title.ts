import type { SidebarPreviousSessionItem } from "../shared/session-grid-contract";

export function getSessionHistoryCardTitle(
  session: Pick<SidebarPreviousSessionItem, "alias" | "primaryTitle" | "terminalTitle">,
): string {
  const primaryTitle = session.primaryTitle?.trim();
  if (primaryTitle) {
    return primaryTitle;
  }

  const terminalTitle = session.terminalTitle?.trim();
  if (terminalTitle) {
    return terminalTitle;
  }

  return session.alias;
}
