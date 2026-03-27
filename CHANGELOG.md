# Changelog

All notable user-facing changes are documented in this file.

## 1.12.1 - 2026-03-27

- Fixed installation compatibility for Cursor builds based on VS Code 1.105.x, so VSmux should install again on Cursor 2.6.21 and similar versions.

## 1.12.0 - 2026-03-27

- VSmux is much more stable now when restoring focus and reconciling sessions, especially during rapid session switching and code-mode recovery. This should behave more reliably on both macOS and Windows.
- Gemini is now available as a built-in sidebar agent alongside the existing agent launchers.
- Sidebar agents are much more flexible: built-in agents can be hidden or customized, custom variants can reuse built-in agent types, and agent buttons can be reordered directly from the sidebar.

## 1.11.2 - 2026-03-27

- VSmux is much more stable now when reconciling and moving native terminal sessions. This should behave more reliably on both macOS and Windows.
- Terminal tabs are targeted more accurately, so focusing a session or moving it between panes is less likely to land on the wrong tab.
- Fast follow-up layout changes now cancel stale session work more cleanly, reducing focus and pane-sync glitches during rapid session switching.

## 1.11.1 - 2026-03-27

- VSmux is much more stable now, with a focused fix for grouped session state and session moves. This should behave more reliably on both macOS and Windows.
- Session drag, reorder, and create-group flows are more dependable, especially when the sidebar and workspace need to stay in sync after changes.

## 1.11.0 - 2026-03-27

- VSmux is much more stable now, with a major rework of session projection, focus, restore, and layout reconciliation. This should behave much better on both macOS and Windows.
- Grouped sessions and split mode are more polished, with better session activation, visibility handling, restore behavior, and previous-session recovery.
- Browser sessions and embedded T3 sessions are more reliable, especially when reusing tabs, restoring sessions, and keeping the correct session visible and focused.
- The sidebar UI has been refreshed across session cards, toolbars, overlays, modals, and commands, making multi-session workflows clearer and easier to manage.

## 1.9.0 - 2026-03-23

- Added a quick way to copy a session's resume command from the session context menu.
