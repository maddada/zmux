---
title: Sidebar Drag Reorder Recovery
tags: []
related:
  [
    architecture/terminal_workspace/workspace_focus_and_sidebar_drag_semantics.md,
    facts/project/workspace_focus_and_drag_runtime_facts.md,
  ]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T02:05:56.264Z"
updatedAt: "2026-04-07T02:05:56.264Z"
---

## Raw Concept

**Task:**
Add defensive reconciliation before syncing sidebar session drag reorder results so omitted authoritative sessions are preserved.

**Changes:**

- Added reconcileDraggedSessionOrder helper for per-group session order recovery
- Updated sidebar drag-end flow to reconcile raw drag output before syncSessionOrder
- Added debug-only session.dragRecoveredOmittedSessions event when omitted sessions are restored
- Added tests covering omitted tail sessions, intentional cross-group moves, and duplicate or unknown session IDs

**Files:**

- sidebar/sidebar-app.tsx
- sidebar/session-order-recovery.ts
- sidebar/session-order-recovery.test.ts

**Flow:**
drag end -> compute rawNextSessionIdsByGroup -> reconcileDraggedSessionOrder(current, rawNext) -> optionally emit session.dragRecoveredOmittedSessions -> detect group change -> post moveSessionToGroup or syncSessionOrder

**Timestamp:** 2026-04-07

**Patterns:**

- `session\.dragRecoveredOmittedSessions` - Debug sidebar event emitted when omitted session IDs are restored during drag reconciliation

## Narrative

### Structure

The sidebar drag-end handler in sidebar/sidebar-app.tsx now computes a raw reordered SessionIdsByGroup, passes it through reconcileDraggedSessionOrder, and only then decides whether to send moveSessionToGroup or syncSessionOrder to VS Code. The recovery logic lives in sidebar/session-order-recovery.ts and returns both recoveredSessionIds and reconciled sessionIdsByGroup. Tests in sidebar/session-order-recovery.test.ts cover the main recovery and sanitization scenarios.

### Dependencies

The reconciliation step depends on the current authoritative per-group session ordering already held by the sidebar. It integrates with existing drag helpers such as moveSessionIdsByDropTarget, move, findSessionGroupId, and haveSameSessionOrder, and with postSidebarDebugLog when debuggingMode is enabled.

### Highlights

The algorithm preserves omitted tail sessions in their original group, ignores unknown or duplicate session IDs from drag output, and does not undo intentional cross-group moves. Recovery visibility is intentionally limited to the debug-only session.dragRecoveredOmittedSessions log event. Additional drag configuration notes captured with this change include SIDEBAR_STARTUP_INTERACTION_BLOCK_MS = 1500, SIDEBAR_POINTER_DRAG_REORDER_THRESHOLD_PX = 8, touch pointer activation delay 250 with tolerance 5, and non-touch pointer distance activation 6.

### Rules

1. Build the union of group IDs from current and next order.
2. Build knownSessionIds from the current authoritative state.
3. Sanitize the drag result per group: ignore unknown session IDs and duplicate session IDs across all groups.
4. Track all listed session IDs in listedSessionIds.
5. For each group, compute preservedSessionIds = currentSessionIdsByGroup[groupId].filter(sessionId => !listedSessionIds.has(sessionId)).
6. Append preservedSessionIds to the end of their original group.
7. Post syncSessionOrder only after reconciliation.
8. If the dragged session changes groups, post moveSessionToGroup instead of syncSessionOrder.

### Examples

Example omitted-tail recovery: current group-1 = [session-1, session-2, session-3, session-4, session-5, session-6] and next group-1 = [session-2, session-1, session-3] yields recoveredSessionIds [session-4, session-5, session-6] and reconciled order [session-2, session-1, session-3, session-4, session-5, session-6]. Example cross-group move: moving session-2 from group-1 to group-2 keeps it in group-2 and does not restore it to group-1. Example duplicate and unknown handling: input [session-2, session-2, session-99] ignores the duplicate session-2 and unknown session-99, then restores omitted session-1 to the original group tail.

## Facts

- **sidebar_drag_order_recovery**: Sidebar drag reorder preserves omitted session IDs from the authoritative per-group order before posting syncSessionOrder. [project]
- **sidebar_drag_recovery_debug_event**: The sidebar emits debug-only event session.dragRecoveredOmittedSessions when omitted session IDs are recovered during drag reorder reconciliation. [project]
- **drag_result_sanitization**: reconcileDraggedSessionOrder sanitizes drag results by ignoring unknown session IDs and duplicate session IDs across all groups. [project]
- **recovered_session_append_rule**: Recovered omitted sessions are appended to the end of their original group after sanitized drag-result sessions. [project]
- **cross_group_move_behavior**: Cross-group drag moves still post moveSessionToGroup when the dragged session changes groups. [project]
- **sidebar_startup_interaction_block_ms**: SIDEBAR_STARTUP_INTERACTION_BLOCK_MS is 1500. [project]
- **sidebar_pointer_drag_reorder_threshold_px**: SIDEBAR_POINTER_DRAG_REORDER_THRESHOLD_PX is 8. [project]
- **sidebar_drag_sensor_constraints**: PointerSensor uses touch activation delay 250 with tolerance 5 and non-touch distance activation 6. [project]
