import type { SidebarSessionGroup, SidebarSessionItem } from "../shared/session-grid-contract";

type ConnectorEligibleSession = Pick<SidebarSessionItem, "sessionId">;

export function shouldShowSessionGroupConnector({
  groupKind,
  hasProjectEditor,
  sessions,
}: {
  groupKind: SidebarSessionGroup["kind"];
  hasProjectEditor?: boolean;
  sessions: readonly ConnectorEligibleSession[];
}): boolean {
  void groupKind;
  /**
   * CDXC:ProjectGroups 2026-05-06-19:01
   * Expanded project groups use the editor card as body content even before
   * they have sessions. Show the same left connector rail for that editor row
   * so empty and non-empty project groups collapse and read the same way.
   */
  if (hasProjectEditor === true) {
    return true;
  }

  return sessions.length > 0;
}
