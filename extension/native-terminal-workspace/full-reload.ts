import type { SidebarSessionItem } from "../../shared/session-grid-contract";

export function shouldSkipSessionForGroupFullReload(
  session: Pick<SidebarSessionItem, "activity">,
): boolean {
  return session.activity === "working" || session.activity === "attention";
}
