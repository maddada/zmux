import type { SidebarSessionItem } from "../shared/session-grid-contract";

export type GroupSessionSummary = {
  indicatorActivity: "attention" | "working" | undefined;
};

export function getGroupSessionSummary(
  sessions: readonly SidebarSessionItem[],
): GroupSessionSummary {
  let hasWorking = false;
  let hasAttention = false;

  for (const session of sessions) {
    if (session.activity === "working") {
      hasWorking = true;
      continue;
    }

    if (session.activity === "attention") {
      hasAttention = true;
    }
  }

  return {
    indicatorActivity: hasAttention ? "attention" : hasWorking ? "working" : undefined,
  };
}
