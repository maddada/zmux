---
title: Sidebar Active Sessions Sort Toggle Group Ordering
tags: []
related:
  [
    architecture/terminal_workspace/sidebar_active_sessions_sort_mode.md,
    facts/project/sidebar_active_sessions_sort_mode_facts.md,
  ]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T01:50:20.495Z"
updatedAt: "2026-04-07T01:50:20.495Z"
---

## Raw Concept

**Task:**
Document how the sidebar active sessions sort toggle preserves manual workspace group order while applying last-activity sorting within groups.

**Changes:**

- Kept workspace groups manually ordered in all sort modes
- Restricted lastActivity sorting to sessions within each group using lastInteractionAt
- Updated SessionGroupSection to render orderedSessionIds from SidebarApp
- Added Storybook ActiveSortToggle fixture and story for verification

**Flow:**
user toggles sidebar sort mode -> SidebarApp derives orderedSessionIds per group -> SessionGroupSection renders passed order -> Storybook fixture verifies manual group order differs from activity-based session order

**Timestamp:** 2026-04-07

**Author:** RLM curation

## Narrative

### Structure

The sidebar sorting behavior now separates group ordering from session ordering. Workspace groups retain their manual arrangement regardless of the selected sort mode, while session order can still be recomputed inside each group when last-activity sorting is active.

### Dependencies

Correct rendering depends on SidebarApp providing orderedSessionIds to SessionGroupSection. If SessionGroupSection reads store sessionIdsByGroup directly instead, the derived order is lost in both Storybook and runtime.

### Highlights

The change preserves user-managed workspace organization and still exposes recent activity within each group. A dedicated Storybook ActiveSortToggle fixture intentionally keeps manual order different from activity order so regressions are easy to detect during development.

## Facts

- **workspace_group_order**: Workspace groups stay manually ordered in all sidebar sort modes. [project]
- **last_activity_sort_scope**: When sort mode is lastActivity, only sessions within each group are reordered by lastInteractionAt. [project]
- **session_group_section_order_source**: SessionGroupSection must render orderedSessionIds passed from SidebarApp instead of always reading store sessionIdsByGroup. [project]
- **storybook_active_sort_toggle_fixture**: A Storybook ActiveSortToggle fixture/story keeps manual order intentionally different from activity order for verification. [project]
