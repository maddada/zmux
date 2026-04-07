---
title: Sidebar Active Sessions Sort Mode
tags: []
related:
  [
    architecture/terminal_workspace/context.md,
    facts/project/sidebar_active_sessions_sort_mode_facts.md,
  ]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: "2026-04-06T23:09:55.234Z"
updatedAt: "2026-04-06T23:52:15.814Z"
---

## Raw Concept

**Task:**
Document sidebar Active sessions sort behavior and ordering invariants for workspace groups and sessions

**Changes:**

- Added createDisplaySessionLayout to preserve workspaceGroupIds while deriving per-group session display order
- Implemented per-group lastInteractionAt sorting for non-manual mode
- Gated group and session drag-and-drop reordering to manual sort mode only
- Kept browser groups excluded from manual group drag handling

**Files:**

- sidebar/active-sessions-sort.ts
- sidebar/sidebar-app.tsx
- sidebar/session-group-section.tsx

**Flow:**
read activeSessionsSortMode and workspaceGroupIds -> createDisplaySessionLayout preserves group order -> derive per-group session order -> render effective groups -> allow drag reorder only when sort mode is manual

**Timestamp:** 2026-04-06

## Narrative

### Structure

The sidebar derives display ordering through createDisplaySessionLayout in sidebar/active-sessions-sort.ts. That helper always returns groupIds copied from workspaceGroupIds, while sessionIdsByGroup either mirrors the stored manual order or derives a per-group activity-sorted view. sidebar/sidebar-app.tsx computes effectiveGroupIds and effectiveSessionIdsByGroup from the current hud.activeSessionsSortMode, authoritative session ordering, session metadata, and workspaceGroupIds. session-group-section.tsx then renders orderedSessionIds from store state and disables sortable group behavior unless manual sorting is active.

### Dependencies

Activity sorting depends on SidebarSessionItem.lastInteractionAt and Date.parse producing a finite timestamp. The sidebar app depends on createWorkspaceSessionIdsByGroup to preserve the workspace group list even when a group has no sessions. Drag behavior depends on the activeSessionsSortMode flag in the sidebar store and on VS Code message dispatch for syncGroupOrder, moveSessionToGroup, and syncSessionOrder.

### Highlights

The Active header toggle changes only how sessions are ordered inside each workspace group; it never changes the order of workspace groups. In last-activity mode, sessions sort from newest to oldest by parsed lastInteractionAt, and ties fall back to the original manual session order. Missing sessions, missing timestamps, or invalid timestamps are treated as activity time 0. Drag-and-drop reorder affordances and reorder side effects are disabled outside manual mode, which keeps the derived activity view read-only.

### Rules

Keep workspace groups always manually sorted.
The `Active` header sort toggle must only reorder sessions inside each group by `lastInteractionAt`, newest to oldest, when enabled.
Do not reorder groups based on activity.
Manual group order must remain stable across both sort modes.

### Examples

Example: when activeSessionsSortMode is "manual", createDisplaySessionLayout returns groupIds equal to workspaceGroupIds and uses sessionIdsByGroup[groupId] ?? [] unchanged for each group. Example: when sort mode is not manual, a group session list is reordered with sortSessionIdsByLastActivity while groupIds still equals workspaceGroupIds. Example VS Code messages emitted during manual interactions are { type: "syncGroupOrder", groupIds: nextGroupIds }, { type: "moveSessionToGroup", groupId: nextGroupId, sessionId, targetIndex }, and { type: "syncSessionOrder", groupId: nextGroupId, sessionIds: nextSessionIds }.

## Facts

- **workspace_group_order**: Workspace groups remain manually ordered in both manual and last-activity sort modes. [project]
- **active_sessions_sort_scope**: The Active header sort toggle only reorders sessions within each group by lastInteractionAt from newest to oldest. [project]
- **display_group_ids_source**: createDisplaySessionLayout always returns groupIds copied from workspaceGroupIds. [project]
- **activity_sort_tiebreaker**: sortSessionIdsByLastActivity falls back to the original manual session order when timestamps are equal. [project]
- **missing_activity_timestamp_behavior**: getSessionLastActivityTime returns 0 when a session is missing, lastInteractionAt is missing, or the timestamp is invalid. [project]
- **drag_reorder_mode_gate**: Group and session drag-and-drop reordering are disabled outside manual sort mode. [project]
- **browser_group_drag_behavior**: Browser groups cannot use manual group drag behavior. [project]
- **active_sessions_sort_toggle_message**: The sidebar uses a toggleActiveSessionsSortMode message to switch sort modes from the Active header control. [project]
- **sidebar_reorder_messages**: Manual group reorder posts syncGroupOrder, cross-group session moves post moveSessionToGroup, and same-group session reorder posts syncSessionOrder. [project]
