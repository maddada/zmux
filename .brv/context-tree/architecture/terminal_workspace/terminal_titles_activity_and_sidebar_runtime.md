---
title: Terminal Titles Activity And Sidebar Runtime
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: "2026-04-06T02:20:18.674Z"
updatedAt: "2026-04-06T23:43:44.533Z"
---

## Raw Concept

**Task:**
Document improved native terminal last-activity reset behavior for sidebar timestamps.

**Changes:**

- Refreshed activity timestamps on shell-integration command start events
- Refreshed activity timestamps on shell-integration command end events
- Preserved existing writeText and terminal-state activity refresh signals

**Files:**

- extension/native-terminal-workspace-backend.ts

**Flow:**
user command starts -> shell-integration start event refreshes activity timestamp -> command completes -> shell-integration end event refreshes activity timestamp -> sidebar timestamp reflects recent real activity

**Timestamp:** 2026-04-06

## Narrative

### Structure

Native terminal last-activity tracking in the backend now listens to VS Code shell-integration command lifecycle events in addition to prior writeText and terminal-state driven updates.

### Dependencies

Depends on shell-integration command start and command end events being available from VS Code terminal integration, alongside existing backend activity update paths.

### Highlights

Sidebar timestamps now snap back when users actually run commands and when work completes, which avoids the prior behavior where the timer mainly counted upward from the initial activity seed instead of reflecting real command execution.

## Facts

- **activity_timestamp_refresh_start_event**: Activity timestamps are refreshed on VS Code shell-integration command start events. [project]
- **activity_timestamp_refresh_end_event**: Activity timestamps are refreshed on VS Code shell-integration command end events. [project]
- **activity_timestamp_existing_signals**: Existing activity refresh signals include writeText and terminal-state signals. [project]
- **activity_timestamp_backend_file**: The change is implemented in extension/native-terminal-workspace-backend.ts. [project]
- **sidebar_timestamp_reset_behavior**: Sidebar timestamps should snap back on real user command execution and completed work instead of only counting upward after the initial activity seed. [project]
