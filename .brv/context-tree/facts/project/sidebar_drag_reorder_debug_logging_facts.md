---
title: Sidebar Drag Reorder Debug Logging Facts
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T02:40:20.718Z"
updatedAt: "2026-04-07T02:40:20.718Z"
---

## Raw Concept

**Task:**
Capture project facts for sidebar drag reorder debug logging and VSmux log mirroring

**Changes:**

- Recorded drag reorder debug events and thresholds
- Recorded store mutation debug event payload fields
- Recorded VSmux debug output destinations and setting gates

**Files:**

- sidebar/sidebar-app.tsx
- extension/session-grid-store.ts
- extension/vsmux-debug-log.ts

**Flow:**
extract facts from curated change summary -> store as project facts for later recall

**Timestamp:** 2026-04-07

## Narrative

### Structure

This fact entry stores concrete settings, event names, storage keys, and message signatures from the sidebar drag reorder debugging update.

### Dependencies

Facts correspond to sidebar drag handling, SessionGridStore persistence, and VSmux debug logging configuration.

### Highlights

Includes manual-sort gating, sensor thresholds, snapshot storage key, output channel name, debug event names, and Desktop mirror destination.

## Facts

- **sidebar_drag_reorder_recovery_guard**: Sidebar drag reorder recovery guard was reverted. [project]
- **sidebar_debug_logging_gate**: Sidebar drag reorder debug logging is conditional on debuggingMode. [project]
- **sidebar_debug_message_type**: Sidebar debug logs are posted to the extension host with type "sidebarDebugLog". [project]
- **active_sessions_sort_mode_for_drag_reorder**: Drag reorder behavior only runs when activeSessionsSortMode equals "manual". [convention]
- **sidebar_startup_interaction_block_ms**: Sidebar startup interaction is blocked for 1500 ms. [project]
- **sidebar_pointer_drag_reorder_threshold_px**: Sidebar pointer drag reorder threshold is 8 px. [project]
- **touch_drag_activation**: Touch drag activation uses delay 250 with tolerance 5. [project]
- **pointer_drag_activation_distance**: Pointer drag activation uses distance 6. [project]
- **group_reorder_message**: Group reorder posts a syncGroupOrder message with groupIds. [project]
- **cross_group_move_message**: Cross-group session moves post a moveSessionToGroup message with groupId, sessionId, and targetIndex. [project]
- **within_group_reorder_message**: Within-group session reorder posts a syncSessionOrder message with groupId and sessionIds. [project]
- **sidebar_drag_debug_events**: Sidebar debug events include session.dragStart, session.dragEnd, session.dragEndIgnoredWithoutPointerMovement, session.dragComputedOrder, and session.dragIndicatorChanged. [project]
- **workspace_snapshot_key**: SessionGridStore persists grouped workspace snapshots under workspace state key VSmux.sessionGridSnapshot. [project]
- **store_sync_session_order_logging**: SessionGridStore logs previous and next snapshot summaries for syncSessionOrder. [project]
- **store_sync_group_order_logging**: SessionGridStore logs requestedGroupIds for syncGroupOrder. [project]
- **store_move_session_to_group_logging**: SessionGridStore logs previousGroupId and targetIndex for moveSessionToGroup. [project]
- **store_debug_events**: SessionGridStore emits debug events store.syncSessionOrder, store.syncGroupOrder, store.moveSessionToGroup, store.createGroupFromSession, and store.createGroup. [project]
- **vsmux_debugging_setting**: VSmux debug logging requires VS Code setting VSmux.debuggingMode. [environment]
- **vsmux_debug_output_channel**: VSmux debug output uses output channel name "VSmux Debug". [environment]
- **vsmux_debug_log_file_name**: VSmux debug log file name is vsmux-debug.log. [environment]
- **vsmux_desktop_debug_log_path**: VSmux debug logs are mirrored to ~/Desktop/vsmux-debug.log after initialization. [environment]
- **debug_log_file_write_queue**: Debug log file writes are serialized through fileWriteQueue. [project]
- **debug_log_line_format**: The debug log line format is ISO timestamp, event name, and optional serialized details. [project]
