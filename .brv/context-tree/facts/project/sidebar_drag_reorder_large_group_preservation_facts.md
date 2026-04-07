---
title: Sidebar Drag Reorder Large Group Preservation Facts
tags: []
related: [architecture/terminal_workspace/sidebar_drag_reorder_large_group_preservation.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T02:51:06.558Z"
updatedAt: "2026-04-07T02:51:06.558Z"
---

## Raw Concept

**Task:**
Capture factual project details about same-group session reorder behavior after the shared helper update.

**Changes:**

- Recorded shared reorder helper adoption in simple and grouped workspace flows
- Recorded large-group preservation beyond nine sessions
- Recorded canonical ID and reorder validation rules

**Files:**

- shared/session-order-reorder.ts
- shared/simple-grouped-session-workspace-state.ts
- shared/grouped-session-workspace-state-session-actions.ts

**Flow:**
reorder request -> validate incoming IDs -> reorder mapped sessions -> reindex -> update visible/focused session state

**Timestamp:** 2026-04-07

## Narrative

### Structure

This fact entry captures the runtime invariants introduced or reaffirmed by the shared reorder helper used for same-group session ordering. It focuses on canonical ID construction, browser-session exclusion, validation gates, and post-reorder visibility/focus rules across simple and grouped workspace state handling.

### Dependencies

These facts depend on the shared reorder helper implementation and the workspace normalization utilities that consume its output. They also depend on regression tests that verify behavior for exact IDs, canonical IDs, focus retention, and groups larger than nine sessions.

### Highlights

The most important fact is that same-group reorder no longer loses sessions when a group exceeds nine entries. Reorder now succeeds only when the incoming IDs exactly describe the current session set, and it computes post-reorder visible/focused state deterministically from the incoming order and visible count.

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
