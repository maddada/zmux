---
title: Terminal Activity Timestamp Reset Facts
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-06T23:43:44.537Z"
updatedAt: "2026-04-06T23:43:44.537Z"
---

## Raw Concept

**Task:**
Record factual details about terminal activity timestamp refresh triggers.

**Changes:**

- Added shell-integration command start as a refresh trigger
- Added shell-integration command end as a refresh trigger

**Files:**

- extension/native-terminal-workspace-backend.ts

**Flow:**
activity signal received -> refresh timestamp -> sidebar reflects newer last-activity time

**Timestamp:** 2026-04-06

## Narrative

### Structure

This facts entry isolates the concrete refresh triggers and intent behind the native terminal last-activity update.

### Dependencies

Tied to backend terminal activity tracking and sidebar timestamp presentation.

### Highlights

The grouped fact subjects are: activity_timestamp_refresh_start_event, activity_timestamp_refresh_end_event, activity_timestamp_existing_signals, activity_timestamp_backend_file, sidebar_timestamp_reset_behavior.

## Facts

- **activity_timestamp_refresh_start_event**: Activity timestamps are refreshed on VS Code shell-integration command start events. [project]
- **activity_timestamp_refresh_end_event**: Activity timestamps are refreshed on VS Code shell-integration command end events. [project]
- **activity_timestamp_existing_signals**: Existing activity refresh signals include writeText and terminal-state signals. [project]
- **activity_timestamp_backend_file**: The change is implemented in extension/native-terminal-workspace-backend.ts. [project]
- **sidebar_timestamp_reset_behavior**: Sidebar timestamps should snap back on real user command execution and completed work instead of only counting upward after the initial activity seed. [project]
