---
title: Sidebar Double Click Session Creation Setting Facts
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T01:48:18.679Z"
updatedAt: "2026-04-07T01:48:18.679Z"
---

## Raw Concept

**Task:**
Capture project facts for the VSmux.createSessionOnSidebarDoubleClick feature gate.

**Changes:**

- Recorded default false configuration and runtime fallback behavior.
- Recorded HUD transport and React gating conditions.
- Recorded continued use of the createSession message.

**Files:**

- package.json
- extension/native-terminal-workspace/settings.ts
- shared/session-grid-contract-ui.ts
- shared/session-grid-contract-sidebar.ts
- sidebar/sidebar-app.tsx

**Flow:**
config key -> getter -> hud flag -> React handler -> createSession message

**Timestamp:** 2026-04-07

## Narrative

### Structure

This fact entry captures the configuration key, false-by-default gating, HUD transport field, and UI-side conditions for session creation on sidebar double click.

### Dependencies

These facts depend on the VSmux settings section, shared sidebar contracts, and the sidebar UI message posting path.

### Highlights

The feature is disabled by default and only activates on empty-space double clicks when interaction is allowed.

## Facts

- **sidebar_double_click_session_creation_setting**: VSmux adds a createSessionOnSidebarDoubleClick setting to gate empty-sidebar double-click session creation. [project]
- **sidebar_double_click_setting_default**: The VSmux.createSessionOnSidebarDoubleClick setting defaults to false in package.json. [project]
- **sidebar_double_click_runtime_default**: The runtime getter getCreateSessionOnSidebarDoubleClick reads the setting from the VSmux configuration section and falls back to false. [project]
- **sidebar_hud_double_click_flag**: SidebarHudState now carries createSessionOnSidebarDoubleClick and createSidebarHudState defaults it to false. [project]
- **sidebar_double_click_session_creation_conditions**: The sidebar React app creates a session on double click only when createSessionOnSidebarDoubleClick is true, the click lands on empty sidebar space, and sidebar interaction is not blocked. [project]
- **sidebar_create_session_message**: Double-click session creation still uses the existing createSession webview message. [project]
