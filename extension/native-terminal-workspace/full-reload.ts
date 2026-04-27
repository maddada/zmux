import type { SidebarSessionItem } from "../../shared/session-grid-contract";

export function shouldSkipSessionForIndicatorProtectedGroupAction(
  session: Pick<SidebarSessionItem, "activity">,
): boolean {
  return session.activity === "working" || session.activity === "attention";
}

export function shouldSkipSessionForGroupFullReload(
  session: Pick<SidebarSessionItem, "activity" | "isSleeping">,
): boolean {
  return session.isSleeping === true || shouldSkipSessionForIndicatorProtectedGroupAction(session);
}
