---
title: Sidebar Session Card Timestamp Compact Display Facts
tags: []
related:
  [
    architecture/terminal_workspace/sidebar_session_card_timestamp_compact_display.md,
    architecture/terminal_workspace/sidebar_session_card_last_interaction_timestamps.md,
  ]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T02:07:57.728Z"
updatedAt: "2026-04-07T02:07:57.728Z"
---

## Raw Concept

**Task:**
Capture factual details of the updated sidebar session-card timestamp format and layout

**Changes:**

- Timestamp shows only compact relative value
- Ago suffix removed
- Timestamp moved to header row within .session-head
- Verification completed with typecheck and focused tests

**Flow:**
relative time formatted -> compact value selected -> header placement updated -> verification run

**Timestamp:** 2026-04-07

## Narrative

### Structure

These facts describe the current presentation of timestamps on sidebar session cards after the latest UI adjustment. They focus on the display string, element placement, and verification steps.

### Dependencies

The facts depend on the sidebar session-card UI, formatRelativeTime helper behavior, and test and typecheck validation workflows.

### Highlights

Compact values like 3h, 16h, and 5m are now the intended user-facing form for session-card timestamps, and the timestamp shares the same header row as the session title.

## Facts

- **sidebar_session_card_timestamp_format**: Sidebar session cards now display only the compact relative time value from formatRelativeTime(...).value without the ago suffix. [project]
- **sidebar_session_card_timestamp_layout**: The session-card timestamp has been moved into .session-head on the same header row as the title, between the title and actions. [project]
- **sidebar_timestamp_change_verification**: The change was verified with tsconfig.extension typecheck and focused sidebar tests. [project]
