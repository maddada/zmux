---
children_hash: 2f8c947028d3e2314dd405b108e4f8629417035b5d6797904b62263b609b775b
compression_ratio: 0.08289588041022075
condensation_order: 1
covers:
  [
    agent_manager_x_bridge_integration.md,
    agent_manager_x_focus_path_without_sidebar_rehydration.md,
    context.md,
    current_state.md,
    default_agent_commands_overrides.md,
    restty_terminal_font_probing_defaults.md,
    session_rename_title_auto_summarization.md,
    sidebar_active_sessions_sort_mode.md,
    sidebar_active_sessions_sort_mode_persistence.md,
    sidebar_active_sessions_sort_toggle_group_ordering.md,
    sidebar_browsers_empty_state.md,
    sidebar_double_click_session_creation_setting.md,
    sidebar_drag_reorder_debug_logging.md,
    sidebar_drag_reorder_large_group_preservation.md,
    sidebar_drag_reorder_recovery.md,
    sidebar_fork_session_behavior.md,
    sidebar_group_full_reload.md,
    sidebar_session_card_last_interaction_timestamps.md,
    sidebar_session_card_timestamp_compact_display.md,
    sidebar_session_fork_support.md,
    simple_grouped_session_workspace_state.md,
    t3_managed_runtime_upgrade_and_recovery.md,
    terminal_pane_runtime_thresholds_and_behaviors.md,
    terminal_persistence_across_reloads.md,
    terminal_persistence_across_vs_code_reloads.md,
    terminal_title_normalization_and_session_actions.md,
    terminal_titles_activity_and_completion_sounds.md,
    terminal_titles_activity_and_sidebar_runtime.md,
    title_activity_and_sidebar_runtime.md,
    vsix_packaging_and_t3_embed_validation.md,
    vsmux_ai_devtools_integration.md,
    workspace_browser_t3_integration.md,
    workspace_debug_console_suppression.md,
    workspace_focus_and_sidebar_drag_semantics.md,
    workspace_focus_debugging.md,
    workspace_panel_focus_hotkeys.md,
    workspace_panel_startup_without_loading_placeholder.md,
    workspace_panel_startup_without_placeholder.md,
    workspace_session_sleep_wake_support.md,
    workspace_sidebar_interaction_state.md,
  ]
covers_token_total: 57530
summary_level: d1
token_count: 4769
type: summary
---

# terminal_workspace

## Overview

This topic captures the current VSmux terminal workspace architecture across the extension host, detached per-workspace terminal daemon, workspace webview, sidebar UI, browser/T3 integrations, and session/action semantics. The main baseline is `current_state.md`, with most child entries refining one subsystem or behavior.

## Core runtime architecture

- `current_state.md` is the primary architecture snapshot:
  - Workspace terminal rendering uses **Restty**.
  - Runtime cache keys are **stable per `sessionId`** and invalidated by `renderNonce`.
  - Hidden panes stay **mounted and painted** behind the active pane.
  - Workspace projection includes sessions from **all groups**, not just active panes.
  - Backend runtime is a **per-workspace detached daemon** with renewed managed-session leases.
  - Persisted disconnected state preserves sidebar presentation when daemon state is unavailable.
- `terminal_pane_runtime_thresholds_and_behaviors.md` adds pane-level thresholds and rules:
  - PTY connect waits for **appearance completion** and **stable size**.
  - Stable sizing: up to **20 attempts**, succeeds after **2 identical measurements**.
  - Hidden panes are intentionally frozen after PTY startup.
  - Typing auto-scroll: **4 printable keys / 450 ms**.
  - Scroll-to-bottom hysteresis: show at **>200 px**, hide below **40 px**.
  - Lag detection: average overshoot **>=1000 ms** in a **10000 ms** window; scheduler probes every **50 ms** over **5000 ms**.
- `restty_terminal_font_probing_defaults.md` documents font source behavior:
  - Built-in default stack: **MesloLGL Nerd Font Mono, Menlo, Monaco, Courier New**.
  - If font family is unset or matches bundled default stack, Restty uses only the **bundled Meslo fallback URL font** and skips optional local probing.
  - Custom families still prepend an optional local source before fallback.

## Persistence and reload model

- `terminal_persistence_across_reloads.md` and `terminal_persistence_across_vs_code_reloads.md` describe the reload-survival architecture:
  - Three-part system: **`SessionGridStore` + detached per-workspace daemon + restored webview/Restty renderers**.
  - Workspace layout persists in VS Code `workspaceState` under **`VSmux.sessionGridSnapshot`**.
  - PTYs live in a detached daemon with **token-authenticated `/control` and `/session` WebSocket endpoints**.
  - Reattach uses **terminalReady -> replay ring buffer -> pending attach queue flush -> live attachment**.
  - Replay limits: **8 MiB** ring buffer, **128 KiB** replay chunk size.
  - Runtime release vs destroy remains important:
    - `releaseCachedTerminalRuntime()` detaches DOM but keeps runtime cached.
    - `destroyCachedTerminalRuntime()` fully destroys transport/Restty/cache entry.
- `workspace_panel_startup_without_placeholder.md` and `workspace_panel_startup_without_loading_placeholder.md` refine startup UX:
  - `openWorkspace` reveals the sidebar first, then creates/refreshes session state before panel reveal.
  - Workspace HTML bootstraps from **`window.__VSMUX_WORKSPACE_BOOTSTRAP__`**.
  - Renderable messages are only **`hydrate`** and **`sessionState`**.
  - Replay order is fixed: latest renderable state first, then later transient updates like `terminalPresentationChanged`.
  - One-shot `autoFocusRequest` fields are stripped from buffered replay.
  - `AUTO_FOCUS_ACTIVATION_GUARD_MS = 400`.
  - `AUTO_RELOAD_ON_LAG = true`.

## Workspace layout, grouping, and focus semantics

- `simple_grouped_session_workspace_state.md` defines the grouped workspace state model:
  - Canonical session IDs use `session-${formatSessionDisplayId(displayId ?? 0)}`.
  - Snapshot normalization ensures at least one group, drops browser sessions, repairs duplicate display IDs, and canonicalizes IDs.
  - Empty active groups are retained; fallback activation prefers the **nearest previous non-empty group**, then next.
  - Visible split state is group-local and restored on group focus.
  - New sessions allocate the **first free display ID**, preserve split mode, and focus the new session.
  - Group creation/move/reorder/fullscreen/T3 metadata behavior is test-covered.
- `workspace_focus_and_sidebar_drag_semantics.md`, `workspace_sidebar_interaction_state.md`, and `workspace_focus_debugging.md` define interaction invariants:
  - Visible split-pane order comes from the active group’s **`snapshot.visibleSessionIds`**, not a filtered global order.
  - `WorkspaceApp` owns authoritative focus decisions; `TerminalPane` emits activation intent only (`pointer` / `focusin`).
  - Terminal pane activations can be ignored during header drag or active autofocus guard.
  - T3 iframe focus messages use **`type: "vsmuxT3Focus"`** and are ignored for hidden panes, already-focused panes, or autofocus-guard conflicts.
  - Sidebar session reorder must never happen on ordinary clicks; real pointer movement must cross **8 px**.
- `workspace_panel_focus_hotkeys.md` scopes hotkeys into the webview:
  - New context key: **`vsmux.workspacePanelFocus`**.
  - Synced from **`panel.active && panel.visible`**.
  - Workspace/session/layout hotkeys use:
    - `!inputFocus || terminalFocus || vsmux.workspacePanelFocus`
  - Directional focus hotkeys remain terminal-only via `terminalFocus`.

## Sidebar session ordering and drag behavior

- `sidebar_active_sessions_sort_mode_persistence.md`, `sidebar_active_sessions_sort_mode.md`, and `sidebar_active_sessions_sort_toggle_group_ordering.md` collectively define Active sorting:
  - Sort mode is per-workspace and persisted as **`manual`** or **`lastActivity`**.
  - The Active toggle only changes **session order within each group**.
  - Workspace group order always remains **manual/stable** across sort modes.
  - `createDisplaySessionLayout` always returns `groupIds` copied from `workspaceGroupIds`.
  - `lastActivity` sorting uses `lastInteractionAt` descending, with manual order as tie-breaker.
  - Missing/invalid timestamps are treated as **0**.
  - Group/session drag-reorder is disabled outside manual mode.
  - `SessionGroupSection` must render ordered session IDs passed from `SidebarApp`; the Storybook `ActiveSortToggle` fixture guards this.
- `sidebar_drag_reorder_recovery.md`, `sidebar_drag_reorder_debug_logging.md`, and `sidebar_drag_reorder_large_group_preservation.md` cover reorder resilience:
  - `reconcileDraggedSessionOrder(...)` restores omitted authoritative sessions before posting `syncSessionOrder`.
  - Unknown and duplicate session IDs in drag output are ignored.
  - Recovered omitted sessions append to the tail of their original group.
  - Cross-group moves still post `moveSessionToGroup`.
  - Debug-only recovery event: **`session.dragRecoveredOmittedSessions`**.
  - Drag logging adds sidebar lifecycle events plus `SessionGridStore` before/after summaries for `syncSessionOrder`, `syncGroupOrder`, `moveSessionToGroup`, `createGroupFromSession`, and `createGroup`.
  - Debug output goes to the **VSmux Debug** output channel and mirrors to **`~/Desktop/vsmux-debug.log`** when `VSmux.debuggingMode` is enabled.
  - Shared helper `shared/session-order-reorder.ts` now preserves same-group reorder for groups with **more than 9 sessions**, avoiding prior 9-slot normalization collapse.
- `workspace_debug_console_suppression.md` notes that browser console echoing for sidebar debug logs was suppressed:
  - `sidebar/sidebar-debug.ts` is now effectively a no-op for console output.
  - `sidebarDebugLog` messaging path is preserved for extension/Storybook flows.

## Session titles, activity, timestamps, and sounds

- `title_activity_and_sidebar_runtime.md` and `terminal_titles_activity_and_completion_sounds.md` define title-driven activity:
  - Terminal titles are first-class presentation state from daemon snapshots.
  - Visible title precedence: **manual title -> terminal title -> alias**.
  - CLI activity is derived from title markers for Claude, Codex, Gemini, and Copilot.
  - Claude/Codex require observed title transitions and use a **3 s stale-spinner timeout**.
  - Gemini/Copilot do not use stale-spinner guarding.
  - Attention only surfaces after at least **3 s** of prior working.
  - Completion sounds are delayed by **1 s**, embedded as data URLs, and played through unlocked `AudioContext`.
  - High-frequency title/activity changes use targeted presentation patches instead of full rehydrates.
- `terminal_title_normalization_and_session_actions.md` centralizes title sanitation:
  - Canonical sanitizer: **`normalizeTerminalTitle()`**.
  - Leading status/progress glyphs are stripped with the unicode-aware pattern beginning `^[\s\u2800-\u28ff·•⋅◦✳*✦◇🤖🔔]+`.
  - Titles beginning with `~` or `/` are hidden from visible/resumable flows.
  - Persistence normalizes titles on parse and serialize.
  - Session-facing actions (rename/resume/fork/full reload/detached resume) prefer normalized visible terminal titles, while raw daemon titles remain in memory for activity detection.
- `session_rename_title_auto_summarization.md` documents rename summarization:
  - Titles are summarized only when `title.trim().length > 25`.
  - Threshold: **25 chars**; generated output clamp: **24 chars**.
  - Prompt rules enforce plain text, specific/scannable wording, no quotes/markdown/commentary, no ending punctuation, preferably **2–4 words**.
  - Output parsing uses the first non-empty line, strips code fences/quotes, collapses whitespace, and truncates whole-word-first.
  - Provider execution reuses git text generation with **180000 ms** timeout.
- `terminal_titles_activity_and_sidebar_runtime.md` adds native terminal activity refresh from shell integration:
  - Last activity now refreshes on command **start** and **end** events, in addition to writeText and terminal-state signals.
- `sidebar_session_card_last_interaction_timestamps.md` and `sidebar_session_card_timestamp_compact_display.md` cover sidebar time UX:
  - Sidebar timestamps update via a **1 s tick**.
  - Color bands are discrete:
    - 0–15 min bright green
    - 15–30 min slightly faded green
    - 30–60 min more muted green
    - > 1 hour gray
  - Terminal activity can seed/refresh from persisted session-state file mtimes.
  - Compact display now uses only `formatRelativeTime(...).value` (e.g. `5m`, `3h`) with no `ago` suffix.
  - Timestamp moved into `.session-head` inline with title/actions.

## Session actions: rename, resume, fork, reload, sleep/wake

- `sidebar_session_fork_support.md` and `sidebar_fork_session_behavior.md` define fork/resume/reload/sidebar menu behavior:
  - Fork is supported only for **Codex** and **Claude** terminal sessions with a visible title.
  - Sidebar message: **`{ type: "forkSession", sessionId }`**.
  - Forked session is created in the same group directly after the source, reusing source agent icon/launch metadata.
  - Fork commands:
    - Codex: `codex fork <title>`
    - Claude: `claude --fork-session -r <title>`
  - Delayed rename after fork:
    - `/rename fork <preferred title>`
    - `FORK_RENAME_DELAY_MS = 4000`
  - Copy resume supports **codex, claude, copilot, gemini, opencode**.
  - Full reload remains limited to **codex and claude**.
  - Browser sessions cannot rename/fork/copy-resume/full-reload.
- `sidebar_group_full_reload.md` expands reload at group level:
  - Group context menu shows **Full reload** for any non-browser group with sessions.
  - Sidebar posts **`fullReloadGroup`** with `groupId`.
  - Controller reloads only terminal sessions whose `getFullReloadResumeCommand(...)` returns a command.
  - Mixed-support groups are allowed: eligible sessions reload, ineligible ones are skipped with a partial-success info message.
- `default_agent_commands_overrides.md` describes `VSmux.defaultAgentCommands`:
  - Application-scope setting for built-in agent IDs: **t3, codex, copilot, claude, opencode, gemini**.
  - Override values are trimmed; empty strings normalize to `null`.
  - Sidebar default buttons use configured overrides only when no stored default preference exists.
  - Resume/fork resolution upgrades only legacy stored stock commands to configured aliases; explicit custom commands remain authoritative.
  - Legacy string-only launch values normalize to `{ agentId: "codex", command }`.
- `workspace_session_sleep_wake_support.md` adds sleep/wake:
  - Session records persist **`isSleeping`**.
  - Sleeping sessions are excluded from focus and visible split calculations.
  - Focusing a sleeping session wakes it.
  - Group sleep/wake toggles all sessions in the group.
  - Sleeping terminal sessions dispose their live runtime surface but keep session metadata for resume/reattach.
  - Sidebar messages include `setSessionSleeping`, `setGroupSleeping`, and `focusSession`.

## Browser and workspace-sidebar behavior

- `workspace_browser_t3_integration.md` defines browser/T3/workspace integration:
  - Browser sidebar group ID: **`browser-tabs`**.
  - Internal VSmux workspace and T3-owned tabs are excluded from the Browsers group.
  - Restored workspace panel identity is standardized:
    - panel type: **`vsmux.workspace`**
    - title: **`VSmux`**
    - icon: **`media/icon.svg`**
  - T3 activity is websocket-backed instead of assumed idle.
  - Sidebar uses authoritative `sessionIdsByGroup` for workspace groups to avoid transient `No sessions` placeholders.
- `sidebar_browsers_empty_state.md` refines empty browser group rendering:
  - Empty browser groups do **not** render `.group-sessions`.
  - This removes the extra layout gap under the browser-group header.
  - Non-browser empty groups still render the **No sessions** drop target.
- `sidebar_double_click_session_creation_setting.md` gates empty-space double-click creation:
  - New config: **`VSmux.createSessionOnSidebarDoubleClick`**.
  - Default is **false** in `package.json` and runtime getter fallback.
  - Carried through `SidebarHudState`.
  - Sidebar only posts `createSession` on double-click when:
    - setting is enabled,
    - click lands on empty sidebar space,
    - startup interaction guard is not blocking.
  - Empty-space blockers include `[data-empty-space-blocking="true"]`.

## Agent Manager X bridge

- `agent_manager_x_bridge_integration.md` introduces a live local bridge:
  - File: `extension/agent-manager-x-bridge.ts`
  - Connects to **`ws://127.0.0.1:47652/vsmux`**
  - `NativeTerminalWorkspaceController` owns one `AgentManagerXBridgeClient`.
  - Publishes normalized `workspaceSnapshot` payloads with workspace/session metadata.
  - Snapshots send only when:
    - latest snapshot exists,
    - socket is `OPEN`,
    - serialized payload differs from `lastSentSerializedSnapshot`.
  - Reconnect backoff: **1000 ms**, doubling to **5000 ms** max.
  - Snapshots are in-memory only, not persisted.
  - Inbound `focusSession` commands are executed only if `workspaceId` matches the latest snapshot’s workspace ID.
- `agent_manager_x_focus_path_without_sidebar_rehydration.md` refines broker-driven focus:
  - `focusSessionFromAgentManagerX` now focuses the target session directly.
  - Avoids forcing the sidebar container open first.
  - Prevents visible sidebar reload/re-hydration while preserving workspace focus behavior.

## T3 runtime and browser embed

- `t3_managed_runtime_upgrade_and_recovery.md` is the main T3 runtime ops guide:
  - Managed updated runtime now launches vendored upstream server entrypoint:
    - `forks/t3code-embed/upstream/apps/server/src/bin.ts`
  - Updated managed runtime uses **127.0.0.1:3774**; legacy runtime remains **3773**.
  - Required websocket endpoint: **`ws://127.0.0.1:3774/ws`**
  - RPC request IDs must be **numeric strings** (`^\d+$`), not UUIDs/labels.
  - Protocol requires Ping/Pong and streaming subscription handling via Chunk/Ack/Exit.
  - Build script `scripts/build-t3-embed.mjs` copies overlay into upstream, rebuilds web assets, and prunes sourcemaps/MSW assets.
  - Recovery for mixed-install failures is to sync `forks/t3code-embed/upstream`, `overlay`, and `dist` from a tested worktree back into main, reinstall, and restart the managed runtime.
- `workspace_browser_t3_integration.md` complements this with live monitor details:
  - T3 snapshot RPC method: **`orchestration.getSnapshot`**
  - Domain event subscription: **`subscribeOrchestrationDomainEvents`**
  - Defaults:
    - request timeout **15000 ms**
    - reconnect delay **1500 ms**
    - refresh debounce **100 ms**
- `vsix_packaging_and_t3_embed_validation.md` documents packaging/validation:
  - VSIX workflow is via **`scripts/vsix.mjs`** with modes `package` and `install`.
  - Build step: `pnpm run compile`
  - Package command uses `vp exec vsce package ...`
  - Install command uses `<vscodeCli> --install-extension <vsixPath> --force`
  - Critical debug rule: verify installed T3 asset hash under `~/.vscode/extensions/maddada.vsmux-*/forks/t3code-embed/dist/assets/index-*.js` before debugging webview behavior.
  - Documents mismatch between worktree asset hash and stale installed VSIX.
- `vsmux_ai_devtools_integration.md` adds packaged chat-history tooling:
  - VSmux remains the single shipped extension host.
  - Registers **`aiDevtools.conversations`** under the existing `VSmuxSessions` sidebar container.
  - Adds build/package output under `chat-history/dist` plus chat-history media.
  - Root extension build now includes the chat-history webview build.

## Cross-cutting constants and APIs

- Common message types and commands recur across entries:
  - Webview/extension messages:
    - `focusSession`
    - `syncPaneOrder`
    - `syncSessionOrder`
    - `moveSessionToGroup`
    - `fullReloadGroup`
    - `toggleActiveSessionsSortMode`
    - `sidebarDebugLog`
    - `createSession`
  - Workspace webview accepts:
    - `ready`, `workspaceDebugLog`, `reloadWorkspacePanel`, `focusSession`, `closeSession`, `fullReloadSession`, `syncPaneOrder`, `syncSessionOrder`
- Common timing/config facts repeated across the topic:
  - `AUTO_FOCUS_ACTIVATION_GUARD_MS = 400`
  - Sidebar startup interaction block: **1500 ms**
  - Sidebar drag reorder threshold: **8 px**
  - `DEFAULT_T3_ACTIVITY_WEBSOCKET_URL = ws://127.0.0.1:3774/ws`

## Recommended drill-downs

- Start with `current_state.md` for the overall architecture.
- Drill into:
  - persistence: `terminal_persistence_across_reloads.md`, `terminal_persistence_across_vs_code_reloads.md`
  - workspace startup/focus: `workspace_panel_startup_without_placeholder.md`, `workspace_focus_debugging.md`
  - sidebar ordering/reorder: `sidebar_active_sessions_sort_mode.md`, `sidebar_drag_reorder_recovery.md`, `sidebar_drag_reorder_large_group_preservation.md`
  - titles/activity: `title_activity_and_sidebar_runtime.md`, `terminal_title_normalization_and_session_actions.md`, `session_rename_title_auto_summarization.md`
  - actions: `sidebar_session_fork_support.md`, `sidebar_group_full_reload.md`, `workspace_session_sleep_wake_support.md`
  - integrations: `workspace_browser_t3_integration.md`, `agent_manager_x_bridge_integration.md`, `t3_managed_runtime_upgrade_and_recovery.md`, `vsmux_ai_devtools_integration.md`
