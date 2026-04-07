---
title: Sidebar Drag Reorder Large Group Preservation
tags: []
related:
  [
    architecture/terminal_workspace/sidebar_drag_reorder_recovery.md,
    architecture/terminal_workspace/simple_grouped_session_workspace_state.md,
    facts/project/sidebar_drag_reorder_recovery_facts.md,
  ]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T02:51:06.557Z"
updatedAt: "2026-04-07T02:51:06.557Z"
---

## Raw Concept

**Task:**
Document the shared session reorder helper used by sidebar and grouped workspace same-group reordering.

**Changes:**

- Added shared reorderGroupSessions helper in shared/session-order-reorder.ts
- Updated syncSessionOrderInSimpleWorkspace() to use the shared helper and normalize the result snapshot
- Updated syncSessionOrderInWorkspace() to use the shared helper for grouped workspace reorder
- Preserved same-group reorder behavior for groups with more than nine sessions by avoiding 9-slot grid normalization

**Files:**

- shared/session-order-reorder.ts
- shared/simple-grouped-session-workspace-state.ts
- shared/grouped-session-workspace-state-session-actions.ts
- shared/simple-grouped-session-workspace-state.test.ts
- shared/grouped-session-workspace-state.test.ts

**Flow:**
sidebar/group reorder request -> normalize current sessions excluding browser sessions -> validate incoming exact or canonical session IDs -> map reordered sessions -> reindex sessions -> derive visibleSessionIds and focusedSessionId -> write normalized group snapshot back to workspace

**Timestamp:** 2026-04-07

## Narrative

### Structure

Session reordering now routes through a dedicated shared/session-order-reorder.ts helper instead of relying on session-grid snapshot reordering for same-group manual order updates. The helper builds an ordered non-browser session list, validates the incoming IDs against either exact current session IDs or canonical IDs derived from display IDs, then reindexes sessions and returns a replacement snapshot. The simple grouped workspace store uses this helper inside syncSessionOrderInSimpleWorkspace(), while grouped workspace session actions use it inside syncSessionOrderInWorkspace().

### Dependencies

The reorder helper depends on createDefaultSessionGridSnapshot(), getOrderedSessions(), formatSessionDisplayId(), and reindexSessionsInOrder(). Simple workspace normalization still relies on normalizeGroupSnapshot(), getSlotPosition(), focus/visible session helpers, and fallback active-group selection when awake sessions disappear. Tests cover both simple and grouped workspace variants to confirm reorder semantics, focus rules, visibility updates, and large-group preservation.

### Highlights

The main fix is that same-group manual reorder no longer goes through the grid-normalization path that effectively imposed a nine-slot behavior. Reordering now preserves every session in groups larger than nine, including a verified 10-session case with exact output ordering 0,2,3,1,4,5,6,7,8,9. Browser sessions remain excluded from reorder and normalization, canonical session IDs continue to use session-${formatSessionDisplayId(displayId ?? 0)}, and focus is retained only when the focused session remains visible after reorder.

### Examples

Example reorder validation rejects updates when the incoming ID list changes length, contains duplicates, fails to match the current exact/canonical session set, resolves the same session twice, or leaves the order unchanged. In the simple workspace test, input order [1,0,2] yields sessionIds [1,0,2], slotIndex [0,1,2], visible IDs [1,0], and focus remaining on 0. In the large-group regression test, a 10-session group preserves all sessions after reorder instead of collapsing through a 9-slot grid path.

## Facts

- **simple_workspace_reorder_strategy**: Sidebar/session reordering now uses a shared direct-array reorder helper for same-group manual order changes in the simple runtime store. [project]
- **reorder_large_group_preservation**: The shared reorder helper preserves groups with more than nine sessions by avoiding the 9-slot grid normalization path. [project]
- **grouped_workspace_reorder_strategy**: Grouped workspace session reorder now uses the same reorder helper for same-group reorder semantics. [project]
- **canonical_session_id_format**: Canonical session IDs use the format session-${formatSessionDisplayId(displayId ?? 0)}. [project]
- **browser_session_reorder_exclusion**: Browser sessions are excluded from reorder and normalization paths. [project]
- **reorder_id_matching_modes**: Reorder accepts either exact current session IDs or canonical IDs derived from display IDs. [project]
- **reorder_rejection_conditions**: Reorder is rejected when incoming IDs differ in length, contain duplicates, do not match the current exact or canonical set, fail mapped lookup, duplicate a mapped session, or leave order unchanged. [project]
- **reorder_result_visibility**: Reorder reindexes sessions via reindexSessionsInOrder and sets visibleSessionIds to the first min(snapshot.visibleCount, sessionIds.length) IDs from the incoming order. [project]
- **reorder_focus_rule**: Focused session stays focused after reorder only if it remains visible; otherwise the first visible session becomes focused. [project]
- **same_group_reorder_bug**: The fixed bug was same-group manual reorder routing through session-grid snapshot normalization, which effectively constrained behavior to a 9-slot grid path. [project]
