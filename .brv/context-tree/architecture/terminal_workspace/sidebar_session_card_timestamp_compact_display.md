---
title: Sidebar Session Card Timestamp Compact Display
tags: []
related:
  [
    architecture/terminal_workspace/sidebar_session_card_last_interaction_timestamps.md,
    facts/project/sidebar_session_card_last_interaction_timestamp_facts.md,
  ]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T02:07:57.727Z"
updatedAt: "2026-04-07T02:07:57.727Z"
---

## Raw Concept

**Task:**
Document the latest sidebar session-card timestamp presentation adjustment in the terminal workspace UI

**Changes:**

- Changed session-card timestamps to render only the compact relative value from formatRelativeTime(...).value
- Removed the ago suffix from session-card timestamps
- Moved the timestamp into .session-head on the same row as the title and actions
- Verified the UI change with tsconfig.extension typecheck and focused sidebar tests

**Flow:**
formatRelativeTime(...) -> use .value only -> render timestamp in .session-head -> validate with typecheck and focused sidebar tests

**Timestamp:** 2026-04-07

## Narrative

### Structure

The sidebar session-card header now places the timestamp inline within .session-head, between the title and the action controls. Instead of rendering a longer relative label, the UI uses only the compact value emitted by formatRelativeTime(...).value, such as 3h, 16h, or 5m.

### Dependencies

This presentation depends on the existing formatRelativeTime helper producing a compact value field and on the sidebar session-card header layout supporting inline placement between the title and actions. Verification depends on tsconfig.extension typecheck coverage and focused sidebar tests.

### Highlights

This is a follow-up timestamp presentation adjustment that makes the sidebar more compact and removes the ago suffix while preserving relative-time readability. The result is a tighter header row with the timestamp aligned directly with the session title and action affordances.

## Facts

- **sidebar_session_card_timestamp_format**: Sidebar session cards now display only the compact relative time value from formatRelativeTime(...).value without the ago suffix. [project]
- **sidebar_session_card_timestamp_layout**: The session-card timestamp has been moved into .session-head on the same header row as the title, between the title and actions. [project]
- **sidebar_timestamp_change_verification**: The change was verified with tsconfig.extension typecheck and focused sidebar tests. [project]
