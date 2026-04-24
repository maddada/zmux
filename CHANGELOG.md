# Changelog

All notable user-facing changes are documented in this file.

## 4.8.0 - 2026-04-24

- The terminal experience is steadier now across xterm, Ghostty/Restty, and WTerm paths, with better macOS shortcut handling, safer restore sizing, bundled font loading, and direct non-persistent terminal session behavior.
- VSmux now keeps workspace pane shortcuts aligned with the visible pane slots, so keyboard focus jumps target the same sessions you see in the workspace instead of being affected by sidebar activity sorting.
- Browser tab tracking is less jumpy now, especially for Storybook and other title-changing browser tabs whose labels briefly stop looking like URLs.
- Claude first-prompt rename tracking and hook setup are more reliable, with better diagnostics for prompt-submit handling and rename decisions when debugging is enabled.
- Sidebar and copy flows are clearer now: project paths, prompt copy buttons, T3 browser-access copy, empty browser groups, command indicators, and terminal action labels all have more deliberate feedback.
- Completion sounds have been refreshed with a larger built-in sound set, and changing completion sound settings can preview the selected sound without needing to wait for a session to finish.
- Local development and packaging should be faster now because the chat-history webview and managed T3 provider builds can reuse cached outputs when their inputs have not changed.

## 4.7.0 - 2026-04-23

- Managed embedded sessions are simpler now: VSmux now targets bundled or checkout-based T3 Code directly, without the older provider-switching path.
- Workspace and sidebar startup diagnostics are much stronger now, with focused repro logging for startup ordering, sidebar hydration, browser-tab detection, and terminal restart issues when debugging is enabled.
- Session lifecycle handling is steadier now across the board: first-prompt auto-renaming is smarter for Claude and Codex, non-persistent terminals can freeze and reopen more cleanly, and session state keeps richer metadata so restore and rename flows stay in sync.
- Sidebar search and session controls are more capable now, with fuzzier previous-session matching, browser-tab stickiness to avoid short-lived flapping, clearer command session indicators, and calmer browser-group open/collapse behavior.
- Session timeout behavior is easier to tune now: auto-sleep and detached background-session retention are configured separately, and new sessions default to the lighter non-persistent xterm path.

## 4.6.0 - 2026-04-22

- VSmux now has a richer prompt-editing flow in VS Code: you can pop open a dedicated prompt editor modal with `Ctrl+G`, work on longer prompts more comfortably, and press `Ctrl+G` again to save and close the editor back into the active session.
- Sidebar and workspace restore behavior are steadier now, especially during startup and reconnect flows, and the empty sidebar area offers clearer actions when you want to create something new from a blank state.
- Completion sounds are more customizable now, with several new built-in variants so it is easier to find a finish sound that fits your workflow.
- Workspace-side debug and repro logs are handled more cleanly now: VSmux keeps those `.vsmux/` traces out of Git automatically and captures better restart diagnostics when daemon/runtime reuse goes wrong.
- Auto-sleep now has its own `VSmux.autoSleepTimeoutMinutes` setting, separate from `VSmux.backgroundSessionTimeoutMinutes`, so idle-session sleeping and detached background-session retention can be configured independently.

## 4.5.1 - 2026-04-20

- Sidebar project headers can pick up macOS app icons from Xcode `AppIcon.appiconset` asset catalogs now, so native app workspaces show a much more recognizable icon instead of falling back to the generic placeholder.
- Embedded T3 server reuse is safer now because VSmux verifies that the shared frame-host script and embedded asset hashes still match the current build before attaching to an existing shared asset server.
- Workspace pane controls are clearer when using bundled `t3code`: VSmux now carries the active managed T3 provider into the webview state and hides the pane zoom controls for providers that do not support that zoom behavior.

## 4.5.0 - 2026-04-20

- The sidebar can show a project header card now, with the workspace name, path, detected app icon, and sibling Git worktrees. You can also hide that card with `VSmux.hideSidebarProjectHeader` if you prefer a denser layout.
- Sidebar actions are more capable now: terminal actions can target sibling worktrees directly from the context menu, command tooltips and accessibility labels are clearer, and success feedback lingers a little longer so finished runs are easier to notice.
- Browser-tab detection is broader and smarter now, so VSmux can recognize more Simple Browser and custom browser tabs from URLs, host-like labels, and page titles while ignoring file-like editor tabs more reliably.
- Workspace tab handling is steadier now: VSmux reuses and pins the workspace tab more deliberately, carries project favicon context into Agent Manager X, and waits for a fresh terminal frontend attachment more reliably after reloads.
- Runtime cleanup is more deliberate now: old helper processes from previous VSmux installs are pruned on startup, detached Unix agent wrappers clean up their full child process groups, and debug/repro logging is trimmed down to more focused workspace-side traces.

## 4.4.1 - 2026-04-19

- T3 remote-access links are more practical now: QR code and Copy link prefer your machine's Tailscale address when available, while Open link stays on the simpler LAN address when both routes exist.
- Refocusing sessions from the sidebar is steadier now, especially when clicking an already-focused card, because VSmux only re-reveals the workspace when its tab is not already the active editor tab.
- Storefront download links in the README and marketplace listing have been refreshed with clearer per-editor artwork for VS Code, Cursor, Antigravity, and Windsurf.

## 4.4.0 - 2026-04-19

- Managed embedded T3 launches are more flexible now: VSmux is better at resolving whether to use packaged assets, sibling checkouts, or a configured repo root for T3 Code.
- Embedded T3 sessions are much safer during close, reload, and restore flows now, with stronger bound-thread tracking, cleaner reload lifecycle handling, and better protection against stray thread changes while sessions are still starting or shutting down.
- Workspace and sidebar T3 surfaces are clearer now: reloading sessions can show their transient state directly in the UI, thread changes require confirmation before rebinding a live pane, and close/reload behavior is steadier while grouped sessions move around.
- T3 browser access links now prefer the local network path before Tailscale when both are available, which makes same-network phone testing faster while still keeping the Tailscale route available when you need it.
- Codex shell-hook delivery is more reliable now because prompt-submit hooks are deduplicated before they mutate session state, and older versioned VSmux hook command paths are normalized back onto the current hook runner automatically.

## 4.3.1 - 2026-04-17

- Idle T3 sessions now participate in the opt-in auto-sleep flow alongside Claude and Codex when the auto-sleep timeout is set to a non-zero value.
- Sleeping embedded T3 panes now destroy their cached runtime more cleanly, which helps avoid stale iframe state when a session sleeps and later wakes back up.
- Workspace pane projection now keeps T3 threads available even when they belong to an inactive group, so embedded T3 sessions remain projected while you focus other terminal groups.

## 4.3.0 - 2026-04-17

- Idle Claude and Codex sessions can auto-sleep now, but only when you opt in by setting the auto-sleep timeout to a non-zero value such as `20`, so the default behavior stays conservative while restore coverage for other agents continues to improve.
- Workspace attention handling is calmer now: done states wait for a meaningful acknowledgement like clicking, typing, or a short focus dwell before clearing, and embedded T3 sessions can derive a steadier working-started timestamp from the in-app timer.
- Terminal session cards can now open rename on double-click when `VSmux.renameSessionOnDoubleClick` is enabled, and T3 session cards have a simpler context menu that keeps remote access but removes the old manual thread-ID action.
- Codex sessions can now auto-rename from the first meaningful prompt, and `Copy Resume Command` falls back to the original launch command for custom agents whose resume syntax is not known to VSmux.

## 4.2.0 - 2026-04-17

- T3 browser access is more resilient now: VSmux can reuse shared browser-access session state across windows, recover cleanly when the shared browser-access port is already occupied by a reusable VSmux server, and keep remote T3 share links available with less setup friction.
- Embedded T3 paste flows are stronger on macOS now because VSmux can fall back to a native clipboard read for images, files, and text when the browser clipboard APIs return nothing.
- Workspace appearance controls behave better now: terminal font size and T3 zoom settings are cached more reliably, pane zoom controls support quick reset, and T3 thread navigation preserves session bindings by opening or focusing the matching session instead of mutating the current one in place.
- The sidebar has been polished again, with clearer top-toolbar button placement for search, previous sessions, and pinned prompts, calmer group header interactions, smoother browser-group behavior, improved icon choices, and a larger pinned-prompt editor.
- Agent shell hook responses are now handled more completely, which helps shell-driven state updates land more reliably across supported CLIs.

## 4.1.0 - 2026-04-16

- Pinned prompts are now available in the sidebar, so you can save, edit, and copy reusable prompts that stay available across projects.
- T3 browser access is more forgiving now: if you request remote access without an active T3 session, VSmux can start one for you first, and the shared browser-access endpoint now uses a stable server port and cleaner share URL.
- The bundled embedded server runtime is pruned more aggressively during packaging, which cuts a large amount of shipped runtime weight, and new rollback build/install commands make it easier to recover from bad local embed updates.

## 4.0.0 - 2026-04-16

- T3 sessions can now be opened outside the editor through a new remote-access flow, with QR codes plus VS Code external-link, Tailscale, LAN, and local-only fallback handling depending on what is available on your machine.
- Workspace panes are more convenient to control now, with inline zoom buttons for terminal font size and tooltip-backed pane actions for rename, fork, reload, sleep, and close.
- Session presentation is calmer and more informative now: cards default to agent icons instead of always showing timestamps, relative times are more compact, browser titles avoid unsynced markers, and generic bare agent titles like `Codex` or `Claude Code` are filtered out of visible session titles and saved history.
- Command buttons render more cleanly in dense sidebars now, including proper icon-only button sizing.

## 3.8.0 - 2026-04-16

- Sidebar actions are more flexible now: custom actions can be marked global so they appear in every VSmux project, while project actions can be shared across Git worktrees from the same repository.
- Existing workspace actions migrate into the new shared action storage automatically, so upgrading should keep your current command buttons intact.
- Browser and session groups collapse more intelligently, including better handling for empty browser groups and newly added browser sessions.
- Workspace terminals now have scroll-to-top controls alongside scroll-to-bottom, making long terminal history easier to navigate.
- Sidebar section headers, group icons, toolbar buttons, and welcome copy have been polished for a clearer day-to-day workflow.

## 3.7.0 - 2026-04-14

- The sidebar has a broader visual refresh now, with cleaner group panels, more polished session cards, and a more cohesive overall layout.
- Agent and command sections behave better in dense layouts, with improved button-grid behavior and steadier hover and drag interactions.
- Grouped sessions are easier to scan, thanks to clearer connectors, refined status anchoring, and smoother expand/collapse behavior.
- Session title handling is a bit smarter now, so generated titles line up more cleanly with the refreshed sidebar presentation.

## 3.6.0 - 2026-04-14

- Session groups are easier to manage now, with collapsible group headers so you can fold sections down and keep larger sidebars under control.
- Sidebar navigation feels smoother because the focused session scrolls into view automatically when focus changes.
- Session cards and group panels have been visually refined with cleaner spacing, hover states, and clearer controls for a more polished browsing experience.
- Agent and command buttons feel more reliable during drag, reorder, and hover interactions, especially in denser sidebar layouts.

## 3.5.0 - 2026-04-14

- Runtime setup and daemon transport are more resilient now, so VSmux should recover and connect more reliably when the embedded runtime needs to install or restart.
- Sidebar reordering is sturdier across sessions, agents, and commands, with clearer sync behavior after drag-and-drop changes.
- The sidebar UI has been refreshed with cleaner group panels, calmer spacing, and smoother session browsing so larger session lists feel easier to scan.
- Live terminal and session activity state is tracked more accurately, which helps idle and active states stay in sync with what is actually happening.

## 3.4.1 - 2026-04-14

- Workspace terminals now default to a lighter text weight and a slightly roomier line height, so the terminal view should feel easier to read out of the box.
- Collapsed group summaries are more accurate now because they follow real session activity state instead of stale lifecycle-only state.

## 3.4.0 - 2026-04-13

- Inline session search is easier to use now, with keyboard selection so you can move through search results without leaving the keyboard.
- Session rename behavior is smarter and more reliable, with improved lifecycle tracking so workspace state stays in sync more cleanly while sessions change.
- Runtime packaging is more self-contained now, with bundled T3 server and terminal assets to make the embedded runtime path more dependable.
- Conversation/history surfaces are a bit leaner internally, including cleanup of an unused sidebar wrapper in the chat-history flow.

## 3.3.0 - 2026-04-13

- VSmux startup and workspace recovery are more reliable now, with fixes for blank startup tabs, steadier webview initialization, and better handling around workspace message timing.
- Workspace controls are more capable, including pane rename, fork, and sleep actions plus improved recovery for hidden xterm panes after reconnects.
- The sidebar feels more polished, with better session ordering and title handling, clearer unsynced/search states, richer agent and action menus, and updated session-group controls and summaries.
- Terminal customization is more flexible now with font presets for common mono stacks, plus stronger cross-platform shell behavior for Windows and PowerShell flows.

## 3.2.0 - 2026-04-11

- Startup is more reliable now: VSmux is less likely to open into a blank tab, especially during initial workspace load.
- Workspace webview message handling is more robust, with better timing around HTML assignment and webview initialization so the workspace comes up more consistently.

## 3.1.1 - 2026-04-11

- Opencode session status is more reliable now, with the running and done indicator working more consistently in the UI.
- Completion sounds for Opencode sessions now fire correctly when work finishes, so it is easier to notice done states without watching the sidebar constantly.

## 3.1.0 - 2026-04-11

- Session and history search is much more capable now, with inline session search in the sidebar plus clearer previous-session search prompts when you need to find older work quickly.
- The workspace terminal stack is more powerful and more stable, with improved daemon shell integration, xterm-based terminal support, stronger scrollback handling, and better session helpers under the hood.
- T3 embedding is more reliable now thanks to authenticated embed bootstrap and authorization fixes for embedded proxy requests.
- Session restore, title detection, pane controls, and sidebar interactions have all been refined, making recovery and day-to-day workspace navigation feel smoother.

## 3.0.0 - 2026-04-09

- VSmux 3.0 is a major stability step for the workspace runtime, with stronger pane visibility handling, more stable terminal host ownership, cleaner reload behavior, and better runtime reuse across session changes.
- Previous-session recovery is much more capable now, including type-to-search in the history view and a more usable modal layout when you have a lot of saved sessions.
- Session presentation feels more polished overall, with better agent-aware terminal titles, calmer activity timing, trimmed tooltip labels, cleaner daemon/session headers, and improved drag indicators in the sidebar.
- Workspace panes are more predictable during focus and layout changes, thanks to stable pane targets, hidden-pane retention, and more deliberate session projection behavior.

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
