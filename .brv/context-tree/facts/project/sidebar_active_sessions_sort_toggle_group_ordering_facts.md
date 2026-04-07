---
title: Sidebar Active Sessions Sort Toggle Group Ordering Facts
tags: []
related:
  [
    architecture/terminal_workspace/sidebar_active_sessions_sort_toggle_group_ordering.md,
    architecture/terminal_workspace/sidebar_active_sessions_sort_mode.md,
  ]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T01:50:20.496Z"
updatedAt: "2026-04-07T01:50:20.496Z"
---

## Raw Concept

**Task:**
Capture concise factual statements about sidebar active sessions sort toggle group ordering and rendering behavior.

**Changes:**

- Recorded sort-scope and rendering-contract facts
- Recorded Storybook verification fixture fact

**Flow:**
sort mode selected -> group order preserved -> within-group order updated when applicable -> fixture verifies expected divergence

**Timestamp:** 2026-04-07

**Author:** RLM curation

## Narrative

### Structure

Facts grouped by subject: workspace_group_order, last_activity_sort_scope, session_group_section_order_source, storybook_active_sort_toggle_fixture. These facts capture the invariant that group order remains manual while activity-based sorting is constrained to the session level within each group.

### Dependencies

These facts depend on the SidebarApp-to-SessionGroupSection ordering contract being preserved in UI rendering code.

### Highlights

The fact set is optimized for recall of the sort toggle behavior, rendering source of truth, and the presence of the dedicated Storybook verification scenario.

## Facts

- **workspace_group_order**: Workspace groups stay manually ordered in all sidebar sort modes. [project]
- **last_activity_sort_scope**: When sort mode is lastActivity, only sessions within each group are reordered by lastInteractionAt. [project]
- **session_group_section_order_source**: SessionGroupSection must render orderedSessionIds passed from SidebarApp instead of always reading store sessionIdsByGroup. [project]
- **storybook_active_sort_toggle_fixture**: A Storybook ActiveSortToggle fixture/story keeps manual order intentionally different from activity order for verification. [project]
