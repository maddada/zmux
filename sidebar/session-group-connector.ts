import type { SidebarSessionGroup, SidebarSessionItem } from "../shared/session-grid-contract";

type ConnectorEligibleSession = Pick<SidebarSessionItem, "sessionId">;

export function shouldShowSessionGroupConnector({
  groupKind,
  sessions,
}: {
  groupKind: SidebarSessionGroup["kind"];
  sessions: readonly ConnectorEligibleSession[];
}): boolean {
  void groupKind;
  return sessions.length > 0;
}
