---
title: Sidebar Double Click Session Creation Setting
tags: []
related:
  [
    architecture/terminal_workspace/sidebar_browsers_empty_state.md,
    architecture/terminal_workspace/workspace_sidebar_interaction_state.md,
  ]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: "2026-04-07T01:48:18.678Z"
updatedAt: "2026-04-07T01:48:18.678Z"
---

## Raw Concept

**Task:**
Document the VSmux.createSessionOnSidebarDoubleClick setting and the gated empty-sidebar double-click session creation flow.

**Changes:**

- Added VSmux.createSessionOnSidebarDoubleClick configuration in package.json.
- Added CREATE_SESSION_ON_SIDEBAR_DOUBLE_CLICK_SETTING constant and getCreateSessionOnSidebarDoubleClick getter in extension/native-terminal-workspace/settings.ts.
- Extended SidebarHudState and createSidebarHudState to carry createSessionOnSidebarDoubleClick with a default of false.
- Updated sidebar/sidebar-app.tsx to gate empty-sidebar double-click session creation behind the HUD flag.

**Files:**

- package.json
- extension/native-terminal-workspace/settings.ts
- shared/session-grid-contract-ui.ts
- shared/session-grid-contract-sidebar.ts
- sidebar/sidebar-app.tsx

**Flow:**
package.json setting default false -> settings getter reads VSmux.createSessionOnSidebarDoubleClick -> createSidebarHudState injects flag into SidebarHudState -> SidebarHydrateMessage/SidebarSessionStateMessage carry hud -> sidebar root onDoubleClick checks flag and empty-space target -> requestNewSession posts createSession message

**Timestamp:** 2026-04-07

**Patterns:**

- `VSmux\.createSessionOnSidebarDoubleClick` - VS Code configuration key for gated sidebar empty-space double-click session creation
- `\[data-empty-space-blocking=\"true\"\]` - Marks sidebar elements that block empty-space double-click session creation

## Narrative

### Structure

The setting is defined in package.json, surfaced through extension/native-terminal-workspace/settings.ts, transported through shared sidebar HUD contracts, and consumed by sidebar/sidebar-app.tsx. SidebarHudState now includes createSessionOnSidebarDoubleClick, and createSidebarHudState threads the value through hydrate and session-state messages.

### Dependencies

The behavior depends on the VSmux settings section, the SidebarHydrateMessage and SidebarSessionStateMessage hud payloads, the existing createSession webview message, and the existing empty-space blocker selector logic in the React sidebar. Session creation still respects the startup interaction guard and the isSidebarInteractionBlocked check inside requestNewSession.

### Highlights

Before this change, double-clicking empty sidebar space created a new session unconditionally. After the change, the feature is opt-in because the configuration default, runtime getter fallback, and HUD default are all false. Empty-space detection is preserved by rejecting clicks on interactive controls and elements tagged with data-empty-space-blocking="true", including group create controls, empty-state containers, titlebar controls, scratch pad controls, and the overflow menu container.

### Rules

Double-clicking empty space in the sidebar creates a new session only if:

1. VSmux.createSessionOnSidebarDoubleClick is enabled.
2. The double click lands on sidebar empty space, not on an interactive or explicitly blocked element.
3. Sidebar interaction is not blocked by startup guard.

### Examples

Configuration example: "VSmux.createSessionOnSidebarDoubleClick": { "type": "boolean", "default": false }. Runtime path: getCreateSessionOnSidebarDoubleClick() -> createSidebarHudState(..., createSessionOnSidebarDoubleClick = false) -> SidebarHudState.createSessionOnSidebarDoubleClick -> handleSidebarDoubleClick() -> vscode.postMessage({ type: "createSession" }).

## Facts

- **sidebar_double_click_session_creation_setting**: VSmux adds a createSessionOnSidebarDoubleClick setting to gate empty-sidebar double-click session creation. [project]
- **sidebar_double_click_setting_default**: The VSmux.createSessionOnSidebarDoubleClick setting defaults to false in package.json. [project]
- **sidebar_double_click_runtime_default**: The runtime getter getCreateSessionOnSidebarDoubleClick reads the setting from the VSmux configuration section and falls back to false. [project]
- **sidebar_hud_double_click_flag**: SidebarHudState now carries createSessionOnSidebarDoubleClick and createSidebarHudState defaults it to false. [project]
- **sidebar_double_click_session_creation_conditions**: The sidebar React app creates a session on double click only when createSessionOnSidebarDoubleClick is true, the click lands on empty sidebar space, and sidebar interaction is not blocked. [project]
- **sidebar_create_session_message**: Double-click session creation still uses the existing createSession webview message. [project]
