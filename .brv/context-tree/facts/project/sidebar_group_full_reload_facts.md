---
title: Sidebar Group Full Reload Facts
tags: []
related: [architecture/terminal_workspace/sidebar_group_full_reload.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: "2026-04-07T01:47:04.639Z"
updatedAt: "2026-04-07T02:07:20.894Z"
---

## Raw Concept

**Task:**
Capture factual recall items for sidebar group Full reload visibility and execution behavior

**Changes:**

- Recorded new group Full reload visibility rule
- Recorded per-session eligibility and skip behavior
- Recorded follow-up user messaging for partial success

**Files:**

- sidebar/session-group-section.tsx
- extension/native-terminal-workspace/controller.ts

**Flow:**
sidebar eligibility check -> webview fullReloadGroup message -> controller filters terminal sessions -> eligible sessions restart and resume -> skipped sessions reported

**Timestamp:** 2026-04-07

## Narrative

### Structure

This fact entry stores the concrete rules, message shapes, and runtime behavior for the group Full reload action so the behavior can be recalled without rereading implementation notes.

### Dependencies

Facts depend on the sidebar group section UI and the native terminal workspace controller implementation.

### Highlights

The key shift is that action visibility is broader while execution remains constrained to supported Codex and Claude terminal sessions.

## Facts

- **group_full_reload_visibility**: Group context menu shows Full reload for any non-browser group that has sessions. [project]
- **group_full_reload_availability_logic**: Full reload group availability in the sidebar is computed as groupSessions.length > 0 and browser groups are excluded separately. [project]
- **full_reload_group_message**: The sidebar posts a fullReloadGroup webview message with groupId when the group Full reload action is triggered. [project]
- **full_reload_group_eligibility**: Controller fullReloadGroup reloads only terminal sessions that return a resume command from getFullReloadResumeCommand. [project]
- **full_reload_group_skip_behavior**: Unsupported sessions are skipped during group full reload instead of hiding the group action entirely. [project]
- **full_reload_group_partial_success_message**: When some sessions are skipped, the controller shows a partial-success message reporting reloaded and skipped counts. [project]
- **full_reload_group_execution_flow**: Group full reload restarts each eligible session, writes its resume command, and calls afterStateChange once after the loop. [project]
