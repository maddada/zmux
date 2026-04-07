# Changelog

All notable user-facing changes are documented in this file.

## 2.7.5 - 2026-04-08

- You can now mark sessions as favorites in the sidebar, making important sessions easier to keep visible and get back to quickly.
- Session drag and drop is safer and more predictable now, with explicit drop targets that reduce accidental moves while reorganizing the sidebar.
- The UI feels a bit snappier, with shorter tooltip delays so session details and controls appear faster.
- Session attention behavior is calmer and more deliberate now, reducing noisy attention states from very short-lived work.

## 2.7.0 - 2026-04-07

- VSmux Search is now built in, giving you an integrated conversation viewer with workspace bridges so it is easier to revisit and jump back into past agent work.
- Session management feels much more polished, with active-session sorting, live timestamps, stronger ordering and reload actions, and cleaner session card titles and browser grouping in the sidebar.
- Workspace terminal behavior is steadier overall, with better focus recovery, more reliable T3 clipboard writes, improved lag diagnostics, and richer backend activity tracking so session state stays fresher while you work.
- Built-in agent commands are more flexible now, including support for overriding the default built-in command definitions.

## 2.6.0 - 2026-04-06

- T3 session workflows are much more capable now, with stronger session management, thread-aware handling, and better coordination between the sidebar and workspace.
- Session cards and sidebar behavior feel more polished, including cleaner tooltip handling, better session metadata, and stronger title and interaction updates.
- Workspace session handling is more reliable overall, with continued improvements to terminal session coordination, history behavior, and multi-session state sync.

## 2.5.0 - 2026-04-06

- Workspace panels can now detect serious render lag and offer a cleaner reload path that brings the workspace back and refocuses the active session.
- Session cleanup is more reliable now: terminal runtimes are retired when sessions are removed, previous-session history is cleaner, and empty or noisy history entries are handled better.
- Multi-pane work feels steadier overall, with stronger pane ordering and visibility behavior plus more stable daemon ownership and workspace refresh handling.

## 2.4.0 - 2026-04-05

- Workspace terminals are now moving onto the Ghostty-based rendering path, with better terminal readiness handling, stronger reconnect behavior, and more stable rendering overall.
- The terminal experience is much more capable now, including replay support, zoom controls, auto-resume for visible sessions, and a new scroll-to-bottom-when-typing option.
- Workspace and session management feel more reliable, with better pane ordering and visibility handling, safer session dragging, improved preferred session titles, and cleaner full-reload and refresh behavior.

## 2.3.1 - 2026-04-03

- T3 sessions are much more capable now, with stronger embed/session management, improved RPC handling, and richer clipboard bridging so paste flows work better across the workspace and T3 panes.
- Workspace layout control is more direct, with visible split commands and shortcuts for common pane layouts like 3, 4, 6, and 9-way splits.
- Session state is more resilient overall, with better persisted terminal snapshots, cleaner sidebar/session group behavior, and more reliable terminal/runtime upgrades under the hood.
- Git actions are more dependable now when committing all current working-tree changes, so the Git button flow handles modified, deleted, renamed, and untracked files more cleanly.

## 2.2.0 - 2026-04-02

- Workspace terminals now support in-pane search, including next and previous match navigation plus case-sensitive and regex search options.
- Session restore behavior is more reliable now, with cleaner recovery of previous sessions and smoother terminal state handling while sessions come back.
- The terminal runtime is more capable and more stable under the hood thanks to updated terminal renderer integration, and VSmux should install more broadly across VS Code forks such as Windsurf, Cursor, and similar editors.

## 2.1.0 - 2026-03-31

- Workspace terminals are more polished and more reliable now, with better visibility recovery, refresh behavior, and reconnect handling when panes are shown again or focus moves around.
- Terminal presentation inside the workspace has been cleaned up, including updated terminal visuals and better title/state updates while sessions are running.
- Sidebar interactions feel safer overall, with sturdier drag and drop behavior around sessions, agents, and commands so reordering and organization flows are less flaky.

## 2.0.0 - 2026-03-31

- VSmux 2.0 delivers a much stronger sidebar interaction model, with more reliable drag and drop, safer session moves across groups, and a new sidebar state layer that keeps session cards and focus behavior more consistent.
- The workspace terminal experience is more capable now, including scroll-to-bottom and refresh controls, cleaner terminal updates, and better coordination between the workspace panel and the terminal host.
- Session handling is more polished overall, with stronger daemon and terminal activity tracking, better drop behavior around groups, and more resilient session presentation during rapid UI changes.

## 1.13.1 - 2026-03-30

- Sidebar drag and drop is more reliable now, especially when moving sessions into empty groups or rejecting drops outside valid group targets.
- Workspace focus handoff is more polished, with better sidebar-to-workspace focus syncing and group selection behavior.
- Session attention handling is a bit cleaner, including more deliberate completion-sound timing so transient state changes are less noisy.

## 1.13.0 - 2026-03-30

- VSmux now has a much more capable workspace experience, with a new terminal workspace panel, pane reordering, better terminal appearance controls, and a Ghostty-based terminal frontend.
- The sidebar is much more powerful: it can track live browser tabs, keep session agent launches persistent, surface daemon sessions, and offers richer Git actions directly inside VSmux.
- Session handling is more polished overall, with better browser grouping, terminal reattach behavior, focus management, activity detection, and optional terminal exit sounds.

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
