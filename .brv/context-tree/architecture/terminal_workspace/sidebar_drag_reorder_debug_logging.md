---
title: Sidebar Drag Reorder Debug Logging
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
createdAt: "2026-04-07T02:40:20.715Z"
updatedAt: "2026-04-07T02:40:20.715Z"
---

## Raw Concept

**Task:**
Document sidebar drag reorder debugging changes and VSmux debug log mirroring for repro collection

**Changes:**

- Reverted the sidebar drag reorder recovery guard
- Added focused drag-order debug logging in the sidebar drag lifecycle
- Added SessionGridStore snapshot transition debug logging for group and session order mutations
- Mirrored VSmux debug output to ~/Desktop/vsmux-debug.log for easier repro collection

**Files:**

- sidebar/sidebar-app.tsx
- extension/session-grid-store.ts
- extension/vsmux-debug-log.ts

**Flow:**
pointerdown captures session target -> drag lifecycle resolves drop target and logs state -> sidebar posts sync/move messages -> SessionGridStore mutates snapshot and logs previous/next summaries -> log writer appends ISO timestamped lines to output channel and file mirrors

**Timestamp:** 2026-04-07

**Patterns:**

- `^\d{4}-\d{2}-\d{2}T[^ ]+ [A-Za-z0-9._-]+(?: .*)?$` - VSmux debug log line format with ISO timestamp, event name, and optional serialized details

## Narrative

### Structure

The sidebar webview keeps manual-sort drag state in refs for group IDs, session IDs by group, pointer-down target, and pointer drag movement. Drag start, move, over, and end handlers resolve drop targets with sidebar DnD helpers, emit debug events through the sidebar debug bridge when debuggingMode is enabled, and post reorder messages back to the extension host. The extension-side SessionGridStore persists a grouped workspace snapshot under VSmux.sessionGridSnapshot and now logs previous and next snapshot summaries around syncSessionOrder, syncGroupOrder, moveSessionToGroup, createGroupFromSession, and createGroup mutations.

### Dependencies

Sidebar drag reorder instrumentation depends on manual active session sorting, @dnd-kit sensors, sidebar debug logging through logSidebarDebug plus vscode.postMessage({ type: "sidebarDebugLog" }), and extension-side VSmux debug logging gated by the VSmux.debuggingMode setting. File mirroring depends on initializeVSmuxDebugLog configuring both the extension global storage path and the Desktop destination, then queueDebugLogFileAppend serializing appendFile writes behind fileWriteQueue.

### Highlights

The recovery guard was intentionally removed so repro work is driven by detailed logs instead of automatic recovery behavior. Sidebar logs now include session.dragStart, session.dragEnd, session.dragEndIgnoredWithoutPointerMovement, session.dragComputedOrder, and session.dragIndicatorChanged, while store logs capture changed status, requested IDs, missing or extra session IDs, previousGroupId, targetIndex, and summarized before/after snapshots. Debug output is written to the VS Code output channel named VSmux Debug and mirrored to ~/Desktop/vsmux-debug.log to make external repro artifact collection easier.

### Rules

Drag reorder behavior only runs when activeSessionsSortMode === "manual". Drag end for sessions is ignored when there is no sourceData, when a pointer drag had a start point but did not actually move, when the event is canceled, when resolvedSessionDropTarget === null, when there is neither targetData nor a resolved drop target, or when the resulting order does not change. Logging is disabled unless VSmux.debuggingMode is enabled.

### Examples

Sidebar posts { type: "syncGroupOrder", groupIds } for group reorder, { type: "moveSessionToGroup", groupId, sessionId, targetIndex } for cross-group moves, and { type: "syncSessionOrder", groupId, sessionIds } for within-group reorder. Touch dragging uses a 250 ms delay with tolerance 5, pointer dragging uses activation distance 6, the sidebar blocks startup interaction for 1500 ms, and pointer movement must exceed the 8 px reorder threshold to count as movement intent.

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
