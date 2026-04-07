---
title: Sidebar Drag Reorder Recovery Facts
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T02:05:56.265Z"
updatedAt: "2026-04-07T02:05:56.265Z"
---

## Raw Concept

**Task:**
Record factual details for sidebar drag reorder recovery behavior.

**Changes:**

- Stored recovery, sanitization, debug event, and drag threshold facts for sidebar reorder handling

**Files:**

- sidebar/sidebar-app.tsx
- sidebar/session-order-recovery.ts
- sidebar/session-order-recovery.test.ts

**Flow:**
authoritative order + drag result -> sanitize -> recover omitted sessions -> emit debug event if needed -> post reorder message

**Timestamp:** 2026-04-07

## Narrative

### Structure

This fact record captures the key operational details of the sidebar drag reorder recovery change so they remain easy to recall independently of the fuller architecture narrative.

### Dependencies

The facts rely on the sidebar using authoritative current session order as the baseline for reconciliation and on existing message posting paths for moveSessionToGroup and syncSessionOrder.

### Highlights

Includes the recovery debug event name, sanitization guarantees, original-group append behavior, and drag activation thresholds.

## Facts

- **sidebar_drag_order_recovery**: Sidebar drag reorder preserves omitted session IDs from the authoritative per-group order before posting syncSessionOrder. [project]
- **sidebar_drag_recovery_debug_event**: The sidebar emits debug-only event session.dragRecoveredOmittedSessions when omitted session IDs are recovered during drag reorder reconciliation. [project]
- **drag_result_sanitization**: reconcileDraggedSessionOrder sanitizes drag results by ignoring unknown session IDs and duplicate session IDs across all groups. [project]
- **recovered_session_append_rule**: Recovered omitted sessions are appended to the end of their original group after sanitized drag-result sessions. [project]
- **cross_group_move_behavior**: Cross-group drag moves still post moveSessionToGroup when the dragged session changes groups. [project]
- **sidebar_startup_interaction_block_ms**: SIDEBAR_STARTUP_INTERACTION_BLOCK_MS is 1500. [project]
- **sidebar_pointer_drag_reorder_threshold_px**: SIDEBAR_POINTER_DRAG_REORDER_THRESHOLD_PX is 8. [project]
- **sidebar_drag_sensor_constraints**: PointerSensor uses touch activation delay 250 with tolerance 5 and non-touch distance activation 6. [project]
