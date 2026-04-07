---
title: Sidebar Active Sessions Sort Mode Facts
tags: []
related: [architecture/terminal_workspace/sidebar_active_sessions_sort_mode.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: "2026-04-06T23:09:55.235Z"
updatedAt: "2026-04-06T23:52:15.816Z"
---

## Raw Concept

**Task:**
Capture factual invariants for sidebar Active sessions sort behavior

**Changes:**

- Recorded group-order invariants across sort modes
- Recorded per-group last activity sorting rules
- Recorded manual-only drag and reorder messaging behavior

**Files:**

- sidebar/active-sessions-sort.ts
- sidebar/sidebar-app.tsx
- sidebar/session-group-section.tsx

**Flow:**
workspaceGroupIds preserved -> per-group sessions either manual or activity sorted -> reorder interactions enabled only in manual mode -> VS Code messages sync manual order changes

**Timestamp:** 2026-04-06

## Narrative

### Structure

This fact entry stores the stable operational guarantees for the sidebar Active sessions sorting feature. It covers the source of truth for group ordering, the scope of activity-based sorting, timestamp fallback behavior, and the messages emitted for manual reorder operations.

### Dependencies

These facts rely on the sidebar store, SidebarSessionItem.lastInteractionAt values, and the UI message bridge to VS Code. They also rely on browser groups being treated separately from normal workspace groups during drag setup.

### Highlights

The key invariant is that switching sort modes never changes workspace group order. Activity sorting is constrained to sessions inside each group, and manual drag behavior is disabled whenever the derived activity view is active.

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
