---
children_hash: 87773e772894484abb9f4660786e15c1036b423d42719ca63c0880a69fdc588c
compression_ratio: 0.19076520290372487
condensation_order: 1
covers:
  [
    agent_manager_x_bridge_integration_facts.md,
    agent_manager_x_focus_path_without_sidebar_rehydration_facts.md,
    context.md,
    default_agent_commands_override_facts.md,
    git_text_generation_low_effort_provider_facts.md,
    restty_terminal_font_probing_defaults_facts.md,
    session_rename_title_auto_summarization_facts.md,
    sidebar_active_sessions_sort_mode_facts.md,
    sidebar_active_sessions_sort_mode_persistence_facts.md,
    sidebar_active_sessions_sort_toggle_group_ordering_facts.md,
    sidebar_browsers_empty_state_facts.md,
    sidebar_debug_console_suppression_facts.md,
    sidebar_double_click_session_creation_setting_facts.md,
    sidebar_drag_reorder_debug_logging_facts.md,
    sidebar_drag_reorder_large_group_preservation_facts.md,
    sidebar_drag_reorder_recovery_facts.md,
    sidebar_fork_session_behavior_facts.md,
    sidebar_group_full_reload_facts.md,
    sidebar_session_card_last_interaction_timestamp_facts.md,
    sidebar_session_card_timestamp_compact_display_facts.md,
    sidebar_session_fork_support_facts.md,
    simple_grouped_session_workspace_state_facts.md,
    t3_managed_runtime_upgrade_facts.md,
    terminal_activity_timestamp_reset_facts.md,
    terminal_persistence_across_vs_code_reloads_facts.md,
    terminal_persistence_reload_facts.md,
    terminal_title_normalization_facts.md,
    terminal_workspace_facts.md,
    terminal_workspace_runtime_facts.md,
    viewer_search_and_resume_actions_facts.md,
    vsmux_ai_devtools_integration_facts.md,
    vsmux_packaging_and_embed_validation_facts.md,
    vsmux_search_rename_facts.md,
    workspace_browser_t3_integration_facts.md,
    workspace_debug_console_suppression_facts.md,
    workspace_focus_and_drag_runtime_facts.md,
    workspace_focus_debugging_facts.md,
    workspace_panel_focus_hotkeys_facts.md,
    workspace_panel_startup_bootstrap_facts.md,
    workspace_panel_startup_without_loading_placeholder_facts.md,
    workspace_panel_startup_without_placeholder_facts.md,
    workspace_session_sleep_wake_support_facts.md,
    workspace_sidebar_interaction_facts.md,
  ]
covers_token_total: 33612
summary_level: d1
token_count: 6412
type: summary
---

# facts/project Structural Summary

## Scope

This topic is a compact fact bank for stable implementation details across VSmux terminal workspace, sidebar behavior, packaging/runtime integration, chat-history viewer, T3 integration, and agent command flows. It complements the richer `architecture/*` entries by isolating exact constants, file paths, message types, storage keys, and capability rules.

## Major clusters

### 1) Terminal workspace runtime, persistence, and bootstrap

Core runtime facts are spread across `terminal_workspace_facts.md`, `terminal_workspace_runtime_facts.md`, `terminal_persistence_reload_facts.md`, `terminal_persistence_across_vs_code_reloads_facts.md`, `workspace_panel_startup_bootstrap_facts.md`, `workspace_panel_startup_without_loading_placeholder_facts.md`, and `workspace_panel_startup_without_placeholder_facts.md`.

- Renderer/runtime:
  - Workspace terminal renderer is **Restty**.
  - Runtime cache is keyed by **sessionId**; runtimes are reused per session and invalidated by render nonce changes.
  - `releaseCachedTerminalRuntime` removes host when refCount reaches zero but does not destroy the runtime; `destroyCachedTerminalRuntime` fully destroys transport + Restty + host.
- Workspace panel:
  - Panel type is **`vsmux.workspace`**, title is **`VSmux`**.
  - `retainContextWhenHidden` is **false**.
  - Local resource roots include **`out/workspace`** and **`forks/t3code-embed/dist`**.
- Startup/bootstrap:
  - `openWorkspace` reveals the sidebar first.
  - Empty-state path: reveal sidebar -> create session -> reveal workspace panel.
  - Existing-session path: reveal sidebar -> refresh panel -> reveal panel -> refresh sidebar.
  - Bootstrap payload is injected into **`window.__VSMUX_WORKSPACE_BOOTSTRAP__`**.
  - Renderable buffered messages are `hydrate` and `sessionState`; replay order sends latest renderable state before transient state such as `terminalPresentationChanged`.
  - Duplicate stable state is suppressed unless `autoFocusRequest.requestId` is new.
- Focus/lag thresholds:
  - **`AUTO_FOCUS_ACTIVATION_GUARD_MS = 400`**.
  - Lag auto-reload is enabled with **`AUTO_RELOAD_ON_LAG = true`**.
  - Lag-triggered reload only fires while document visibility is visible.
- PTY/daemon persistence:
  - Terminal persistence uses a detached **per-workspace Node.js daemon**.
  - Workspace snapshot key is **`VSmux.sessionGridSnapshot`**.
  - Daemon state directory prefix: **`terminal-daemon-${workspaceId}`**.
  - Files: `daemon-info.json`, `daemon-launch.lock`, `terminal-daemon-debug.log`.
  - Protocol/auth:
    - WebSocket auth is required on **`/control`** and **`/session`**.
    - Requests expecting daemon responses must include a `requestId`.
  - Timeouts/limits:
    - control connect timeout **3000ms**
    - daemon ready timeout **10000ms**
    - attach ready timeout **15000ms**
    - stale launch lock **30000ms**
    - owner heartbeat interval **5000ms**
    - owner heartbeat timeout **20000ms**
    - owner startup grace **30000ms**
    - idle shutdown default **5 min**
    - ring buffer **8 MiB**
    - replay chunk **128 KiB**
  - Restore flow: workspaceState restore -> daemon reconnect -> session reconnect -> `terminalReady` handshake -> replay -> pending output flush.
  - Persisted session state provides fallback title/agent metadata when live daemon data is unavailable.

### 2) Workspace/sidebar focus, ordering, drag, and interaction rules

This cluster is captured by `workspace_focus_and_drag_runtime_facts.md`, `workspace_sidebar_interaction_facts.md`, `workspace_focus_debugging_facts.md`, `workspace_panel_focus_hotkeys_facts.md`, and several sidebar sort/reorder entries.

- Focus ownership:
  - `WorkspaceApp` owns authoritative focus decisions.
  - `TerminalPane` emits activation intent via `onActivate("pointer")` and fallback `onActivate("focusin")`.
  - T3 iframe focus message type is **`vsmuxT3Focus`**.
- Visible pane ordering:
  - Visible pane order comes from **active group `snapshot.visibleSessionIds`**.
  - `localPaneOrder` is only a temporary override within currently visible sessions.
- Workspace hotkeys:
  - Context key: **`vsmux.workspacePanelFocus`**.
  - Main when-clause: **`!inputFocus || terminalFocus || vsmux.workspacePanelFocus`**.
  - Directional focus hotkeys remain terminal-only with `terminalFocus`.
- Interaction thresholds:
  - Sidebar startup interaction block: **1500ms**
  - Sidebar reorder threshold: **8px**
  - Non-touch drag distance: **6px**
  - Touch drag activation: **250ms** delay, **5px** tolerance
  - Session card drag hold: **130ms** delay, **12px** tolerance
- Scroll/typing behavior:
  - Scroll-to-bottom UI shows beyond **200px** from bottom and hides below **40px**.
  - Typing auto-scroll uses a **450ms** burst window and triggers after **4** printable keystrokes.
- Lag detection:
  - Probe interval **50ms**, probe window **5000ms**, monitor window **10000ms**, warn threshold **250ms**, lag threshold **1000ms** overshoot under visible/focused conditions.
- Keyboard mappings:
  - `Shift+Enter` -> raw terminal input `\x1b[13;2u`
  - macOS `Meta+ArrowLeft/Right` -> `\x01` / `\x05`
  - macOS `Alt+ArrowLeft/Right` -> `\x1bb` / `\x1bf`
  - non-mac `Ctrl+ArrowLeft/Right` -> `\x1bb` / `\x1bf`

## Sidebar sorting, group order, and reorder semantics

### 3) Active sessions sort mode

Documented in `sidebar_active_sessions_sort_mode_facts.md`, `sidebar_active_sessions_sort_mode_persistence_facts.md`, and `sidebar_active_sessions_sort_toggle_group_ordering_facts.md`.

- Sort mode values: **`manual`** and **`lastActivity`**.
- Sort mode is persisted per workspace in **VS Code `workspaceState`**.
- Invariant: **workspace group order stays manually ordered in all sort modes**.
- `lastActivity` only reorders **sessions within each group** by `lastInteractionAt`, newest first.
- Ties fall back to original manual session order.
- Missing/invalid activity timestamps fall back to **0**.
- Drag-and-drop reordering is disabled outside `manual` mode.
- Sidebar toggles sort mode by posting **`toggleActiveSessionsSortMode`**.
- Rendering contract: `SessionGroupSection` must render `orderedSessionIds` from `SidebarApp`, not always store order.
- Verification support exists as a dedicated **Storybook ActiveSortToggle fixture**.

### 4) Drag reorder, recovery, and large-group preservation

Covered by `sidebar_drag_reorder_debug_logging_facts.md`, `sidebar_drag_reorder_recovery_facts.md`, and `sidebar_drag_reorder_large_group_preservation_facts.md`.

- Reorder messages:
  - group reorder -> **`syncGroupOrder`**
  - cross-group move -> **`moveSessionToGroup`**
  - same-group reorder -> **`syncSessionOrder`**
- Recovery behavior:
  - Sidebar reconciles drag results against authoritative per-group order.
  - Unknown IDs and duplicates are sanitized away.
  - Omitted sessions are recovered and appended to the end of their original group.
  - Recovery emits debug-only event **`session.dragRecoveredOmittedSessions`**.
- Debug event set includes:
  - `session.dragStart`
  - `session.dragEnd`
  - `session.dragEndIgnoredWithoutPointerMovement`
  - `session.dragComputedOrder`
  - `session.dragIndicatorChanged`
- Store debug events include:
  - `store.syncSessionOrder`
  - `store.syncGroupOrder`
  - `store.moveSessionToGroup`
  - `store.createGroupFromSession`
  - `store.createGroup`
- Logging/output:
  - UI debug logs post type **`sidebarDebugLog`**.
  - Extension-side debug logging is gated by **`VSmux.debuggingMode`**.
  - Output channel: **`VSmux Debug`**
  - Mirrored log path: **`~/Desktop/vsmux-debug.log`**
  - File name: **`vsmux-debug.log`**
- Same-group large-group fix:
  - Reordering now uses a shared helper in `shared/session-order-reorder.ts`.
  - It preserves groups with **more than nine sessions**, avoiding the old 9-slot normalization path.
  - Canonical IDs use `session-${formatSessionDisplayId(displayId ?? 0)}`.
  - Browser sessions are excluded from reorder/normalization paths.
  - Reorder is rejected if lengths differ, duplicates exist, exact/canonical sets do not match, mapped lookup fails, mapped sessions duplicate, or order is unchanged.
  - Post-reorder visible sessions are the first `min(visibleCount, sessionIds.length)` IDs from incoming order.
  - Focus remains on the same session only if it stays visible; otherwise first visible session becomes focused.

### 5) Sidebar rendering and debug suppression

Tracked in `sidebar_browsers_empty_state_facts.md`, `sidebar_debug_console_suppression_facts.md`, and `workspace_debug_console_suppression_facts.md`.

- Empty browser groups:
  - Browser groups suppress `.group-sessions` entirely when empty to avoid extra layout gap.
  - Non-browser groups still show the **“No sessions”** empty drop target.
- Debug suppression:
  - `sidebar/sidebar-debug.ts` now makes `logSidebarDebug(enabled, _event, _payload?)` effectively a **no-op** for console output.
  - Message flow to the extension remains intact: `sidebarApp` still posts `sidebarDebugLog`.
  - Storybook still receives those messages, but browser console echo is suppressed.
  - Regression coverage exists in `sidebar/sidebar-debug.test.ts`.
  - `sidebar/sidebar-story-harness.tsx` uses `STORYBOOK_DRAG_SETTLE_DELAY_MS = 900`.

## Session activity timestamps and card display

### 6) Activity sourcing and timestamp presentation

From `sidebar_session_card_last_interaction_timestamp_facts.md`, `sidebar_session_card_timestamp_compact_display_facts.md`, and `terminal_activity_timestamp_reset_facts.md`.

- Activity signal/source:
  - Terminal activity now refreshes from persisted session-state file mtimes when agent status/title changes.
  - Additional refresh triggers in `extension/native-terminal-workspace-backend.ts` include shell-integration **command start** and **command end** events, alongside existing `writeText` and terminal-state signals.
  - Fallback is session creation time only when no better activity signal exists.
- Relative-time updates:
  - Sidebar uses a **1-second UI tick** to keep labels live.
- Color model:
  - 0–15 min: bright green
  - 15–30 min: slightly faded green
  - 30–60 min: more muted green
  - > 1 hour: gray
- Card layout/display:
  - Session cards now show only the compact `formatRelativeTime(...).value` (e.g. `5m`, `3h`) with no “ago”.
  - Timestamp moved into `.session-head` on the same row as title and actions.
- Verification:
  - Storybook preserves `lastInteractionAt`.
  - Playwriter verification confirmed color separation and advancing relative labels.
  - The compact display change was verified with extension typecheck and focused sidebar tests.

## Session actions, titles, agent commands, and sleep/wake

### 7) Session fork, full reload, copy resume, detached resume

Summarized across `sidebar_session_fork_support_facts.md`, `sidebar_fork_session_behavior_facts.md`, `sidebar_group_full_reload_facts.md`, and `terminal_title_normalization_facts.md`.

- Capability matrix:
  - Copy resume: **codex, claude, copilot, gemini, opencode**
  - Fork: **codex, claude**
  - Full reload: **codex, claude**
  - Browser sessions cannot rename, fork, copy resume, or full reload.
- Fork flow:
  - Sidebar posts **`forkSession`**.
  - Controller creates a sibling terminal session directly after the source session.
  - Reuses source agent metadata from `sidebarAgentIconBySessionId` and `sessionAgentLaunchBySessionId`.
  - Commands:
    - Codex: **`codex fork <preferred title>`**
    - Claude: **`claude --fork-session -r <preferred title>`**
  - After **`FORK_RENAME_DELAY_MS = 4000`**, controller sends `/rename fork <preferred title>`.
  - Validation error text: **“Fork is only available for Codex and Claude sessions that have a visible title.”**
- Group full reload:
  - Group context menu shows **Full reload** for any non-browser group with sessions.
  - UI posts **`fullReloadGroup`** with `groupId`.
  - Controller reloads only sessions for which `getFullReloadResumeCommand` returns a command.
  - Unsupported sessions are skipped; partial success surfaces reloaded/skipped counts.
  - Runtime flow: restart each eligible session, write resume command, call `afterStateChange` once after loop.
- Detached resume:
  - Auto-executes for Codex and Claude.
  - Gemini, Copilot, Opencode, and custom commands are prefill-only.

### 8) Title normalization and rename summarization

From `terminal_title_normalization_facts.md` and `session_rename_title_auto_summarization_facts.md`.

- Title normalization:
  - `normalizeTerminalTitle` trims titles and strips leading status/progress markers.
  - Marker regex: **`^[\s\u2800-\u28ff·•⋅◦✳*✦◇🤖🔔]+`**
  - Titles starting with `~` or `/` are treated as non-visible by `getVisibleTerminalTitle`.
  - Preferred title precedence: visible terminal title -> visible primary session title -> undefined.
  - Persisted title is normalized on parse and serialization.
- Persisted presentation precedence:
  - Title: liveTitle -> lastKnownPersistedTitle -> currentState.title
  - Agent name: title activity -> snapshot -> current state
  - Agent status: title activity -> snapshot -> current state
- Rename behavior:
  - Terminal rename writes `/rename` with normalized terminal title, falling back to trimmed session title.
  - Rename prompt prefers visible normalized terminal title.
- Auto-summarization:
  - Summary threshold is **25** characters (`SESSION_RENAME_SUMMARY_THRESHOLD = 25`).
  - Generated title max length is **24** (`GENERATED_SESSION_TITLE_MAX_LENGTH = 24`).
  - Summarization occurs only when `title.trim().length > 25`.
  - Output is sanitized and clamped to 24 chars; truncation prefers whole words.
  - Prompt rules: plain text only, no quotes/markdown/commentary/ending punctuation; prefer **2–4 words**.
  - Providers:
    - Codex uses **`gpt-5.4-mini`** with **high** reasoning effort
    - Claude uses **haiku** with **high** effort
  - Git generation timeout reused here is **180000ms**.

### 9) Default agent command overrides

In `default_agent_commands_override_facts.md`.

- Setting: **`VSmux.defaultAgentCommands`** is an application-scope object setting.
- Built-in keys default to `null` for **t3, codex, copilot, claude, opencode, gemini**.
- Normalization trims values; empty strings normalize to `null`.
- Sidebar default-agent buttons use configured overrides only when no stored default preference exists.
- Session/fork/resume command resolution upgrades legacy stock commands to configured aliases only when stored command exactly matches the built-in default.
- Explicit stored session commands stay authoritative.
- Legacy string-only stored session launches normalize to `agentId: codex`.
- Built-in session launch support covers **codex, claude, copilot, gemini, opencode**, but **not t3**.

### 10) Session sleep/wake and grouped workspace state

Mainly `workspace_session_sleep_wake_support_facts.md` and `simple_grouped_session_workspace_state_facts.md`.

- Sleep/wake:
  - Sessions persist an **`isSleeping`** flag.
  - Sleeping sessions are excluded from focus and visible split calculations.
  - Focusing a sleeping session wakes it.
  - Group sleep/wake applies to all sessions in a group.
  - Sleep actions apply only to **non-browser** sessions/groups.
  - Sleeping disposes live terminal runtime/surface but keeps session card + resume metadata.
  - Sidebar messages: `setSessionSleeping`, `setGroupSleeping`, `focusSession`.
- Simple grouped workspace state:
  - Implemented in `shared/simple-grouped-session-workspace-state.ts`.
  - Normalization ensures at least one group via `createDefaultGroupedSessionWorkspaceSnapshot()` / empty default main group.
  - Browser sessions are removed during normalization.
  - Canonical session IDs use `session-${formatSessionDisplayId(displayId ?? 0)}`.
  - Emptied active groups are retained; fallback prefers nearest previous non-empty group.
  - Group-local `visibleSessionIds` are preserved/restored when switching groups.
  - `visibleCount === 1` yields `[focusedSessionId]`.
  - New sessions allocate the **first free display ID**.
  - Moving a session to another group activates destination group and focuses moved session.
  - Group reordering appends any unlisted existing groups after requested order.
  - Fullscreen toggle stores/restores `fullscreenRestoreVisibleCount`.
  - Equality uses `JSON.stringify(left) === JSON.stringify(right)`.

## Agent Manager X bridge and focus path

### 11) Agent Manager X integration

From `agent_manager_x_bridge_integration_facts.md` and `agent_manager_x_focus_path_without_sidebar_rehydration_facts.md`.

- Broker endpoint: **`ws://127.0.0.1:47652/vsmux`**
- Handshake timeout: **3000ms**
- `perMessageDeflate` is disabled.
- Reconnect backoff: **1000ms**, doubling to **5000ms** cap.
- Snapshots are in-memory only, not persisted to disk.
- Snapshots are sent only when:
  - a latest snapshot exists
  - socket is open
  - serialized snapshot changed
- Incoming `ping` is ignored.
- `focusSession` is executed only when incoming `workspaceId` matches latest snapshot `workspaceId`.
- Controller constructs `AgentManagerXBridgeClient`, logs via `logVSmuxDebug`, and publishes a snapshot during `initialize()`.
- Focus-path adjustment:
  - `focusSessionFromAgentManagerX` now focuses the target session directly.
  - Broker-driven jumps no longer force sidebar container opening first.
  - This removes visible sidebar reload/rehydration while preserving workspace focus behavior.
- Related constants noted in the same controller:
  - `DEFAULT_T3_ACTIVITY_WEBSOCKET_URL = ws://127.0.0.1:3774/ws`
  - `COMMAND_TERMINAL_EXIT_POLL_MS = 250`
  - `COMPLETION_SOUND_CONFIRMATION_DELAY_MS = 1000`
  - `FORK_RENAME_DELAY_MS = 4000`
  - `SIMPLE_BROWSER_OPEN_COMMAND = simpleBrowser.api.open`

## Browser/T3 integration, runtime upgrade, and packaging

### 12) Browser + T3 integration

From `workspace_browser_t3_integration_facts.md` and `t3_managed_runtime_upgrade_facts.md`.

- Browser policy:
  - Browser sidebar excludes internal VSmux workspace and T3-owned tabs.
- Workspace panel:
  - Restoration identity remains `vsmux.workspace` / `VSmux`.
- T3 monitoring:
  - Activity state is websocket-backed via `T3ActivityMonitor`.
  - Responds to `Ping` with `pong`.
  - Refreshes are debounced on domain-event chunks.
  - Focus acknowledgement uses completion-marker-aware acknowledge-thread behavior.
- Managed T3 runtime:
  - Updated runtime endpoint: **`127.0.0.1:3774`**
  - Legacy runtime endpoint: **`127.0.0.1:3773`**
  - Real websocket path is **`/ws`**
  - Effect RPC uses **numeric string IDs**, not UUIDs
  - Entrypoint: `forks/t3code-embed/upstream/apps/server/src/bin.ts`
  - Mixed-install recovery requires syncing upstream, overlay, and dist from tested refresh worktree.

### 13) Packaging, VSIX validation, and extension metadata

From `vsmux_packaging_and_embed_validation_facts.md`, `vsmux_ai_devtools_integration_facts.md`, and `vsmux_search_rename_facts.md`.

- Root extension identity:
  - Display name: **`VSmux - T3code & Agent CLIs Manager`**
  - Publisher: **`maddada`**
  - Main entry: **`./out/extension/extension.js`**
  - Icon: `media/VSmux-marketplace-icon.png`
  - Version: **2.6.0**
  - VS Code engine: **`^1.100.0`**
  - Package manager: **`pnpm@10.14.0`**
- View/container ids:
  - Primary container: **`VSmuxSessions`**
  - Primary view: **`VSmux.sessions`**
  - Secondary container: **`VSmuxSessionsSecondary`**
  - ai-devtools sidebar view: **`aiDevtools.conversations`** under `VSmuxSessions`
- Activation events:
  - `onStartupFinished`
  - `onView:VSmux.sessions`
  - `onWebviewPanel:vsmux.workspace`
- Build pipeline:
  - `build:extension` runs sidebar build, debug-panel build, workspace build, chat-history webview build, TS compilation, and vendor runtime deps.
  - Chat-history webview build outputs to **`chat-history/dist`**.
  - Asset roots are `chat-history/dist` and `chat-history/media`.
  - Chat-history webview uses **Tailwind CLI** + **esbuild**.
  - Extension TS include covers `extension`, `shared`, and `chat-history/src/extension`.
  - Extension target is **ES2024**; chat-history webview target is **es2020** IIFE.
- Packaging/dependency notes:
  - `vite` overridden to `npm:@voidzero-dev/vite-plus-core@latest`
  - `vitest` overridden to `npm:@voidzero-dev/vite-plus-test@latest`
  - `restty@0.1.35` patched via `patches/restty@0.1.35.patch`
- Embed validation signal:
  - Installed VSIX assets are authoritative when diagnosing embed drift; mismatched built asset hashes indicate stale install/reinstall need.
- Shared config facts:
  - `VSmux.gitTextGenerationProvider` default is `codex`, enum `codex|claude|custom`
  - `VSmux.sendRenameCommandOnSidebarRename` defaults to `true`

## Git text generation and viewer/search integration

### 14) Git text generation

From `git_text_generation_low_effort_provider_facts.md`.

- Setting: **`VSmux.gitTextGenerationProvider`** defaults to `codex`.
- Providers supported: `codex`, `claude`, `custom`.
- Built-ins:
  - Codex -> **`gpt-5.4-mini`** with `model_reasoning_effort="low"`
  - Claude -> **haiku** with `--effort low`
- Execution:
  - Timeout: **180000ms**
  - Codex provider uses **stdin** and non-interactive shell mode.
  - Custom commands may emit to temp file or stdout.
- Numeric session rename limits were intentionally preserved during the provider update.

### 15) Chat-history / VSmux Search / viewer resume

From `viewer_search_and_resume_actions_facts.md` and `vsmux_search_rename_facts.md`.

- Search/viewer:
  - Conversation viewer opens a custom find bar on **Cmd/Ctrl+F**.
  - Search uses native **`window.find`**.
  - Enter = next, Shift+Enter = previous, Escape = close.
  - Viewer panel uses `retainContextWhenHidden: false`.
- Resume action:
  - Resume button is enabled only when source can be inferred from `filePath` and a `sessionId` is found.
  - Source inference:
    - `/.codex/`, `/.codex-profiles/` -> Codex
    - `/.claude/`, `/.claude-profiles/` -> Claude
  - Webview posts `resumeSession` with source, sessionId, optional cwd.
  - Commands:
    - Claude -> `claude --resume <sessionId>`
    - Codex -> `codex resume <sessionId>`
  - Execution uses `quoteShellLiteral`.
  - Terminal name: **`AI DevTools Resume (<source>)`**
  - Invalid JSONL/schema failures become **`x-error`** records.
- VSmux Search rename:
  - View id: **`VSmuxSearch.conversations`**
  - Label: **`VSmux Search`**
  - Standalone package: **`vsmux-search-vscode`**
  - Publisher: **`vsmux-search`**
  - Activity bar container: **`vsmux-search`**
  - Viewer panel type: **`vsmuxSearchViewer`**
  - Export filename prefix: **`vsmux-search-export-`**
  - Recent cutoff: **7 days**
  - Filter debounce: **150ms**
  - Unknown tools are exported by default if they do not map to an option key.

## Terminal font probing defaults

### 16) Restty font probing

From `restty_terminal_font_probing_defaults_facts.md`.

- `DEFAULT_TERMINAL_FONT_FAMILIES`:
  - MesloLGL Nerd Font Mono
  - Menlo
  - Monaco
  - Courier New
- `DEFAULT_LOCAL_FONT_MATCHERS`:
  - MesloLGL Nerd Font Mono
  - MesloLGL Nerd Font
- Bundled default or unset font family returns only the Meslo fallback URL source.
- Custom font-family config preserves optional local font source with `required: false`.

## Cross-cutting patterns and relationships

### Repeated architectural patterns

- **Per-workspace scoping** recurs across daemon runtime, workspace state persistence, sort-mode persistence, and bridge snapshot routing.
- **False-by-default / memory-saving webviews** recur for workspace panel and viewer (`retainContextWhenHidden: false`).
- **Manual order preservation** is a strong invariant:
  - workspace group ordering survives sort toggles
  - last-activity sorting is display-only
  - manual reorder state is not overwritten by derived order
- **Authoritative source vs derived UI state** appears repeatedly:
  - sidebar drag reconciliation uses authoritative current group order
  - session/group rendering uses passed ordered IDs
  - workspace panel replay prioritizes renderable canonical state
- **Capability-gated agent actions** are centralized around agent icon / launch metadata:
  - fork + full reload only for Codex/Claude
  - copy resume broader
  - browser sessions excluded from most terminal-specific actions
- **Normalization/canonicalization** is a common safety mechanism:
  - terminal titles
  - default agent commands
  - persisted session values
  - canonical session IDs from display IDs
  - drag result sanitization

## Drill-down map

For deeper detail, drill into these child entries by concern:

- Runtime/persistence: `terminal_workspace_facts.md`, `terminal_persistence_across_vs_code_reloads_facts.md`, `workspace_panel_startup_without_loading_placeholder_facts.md`
- Focus/interaction: `workspace_focus_and_drag_runtime_facts.md`, `workspace_sidebar_interaction_facts.md`, `workspace_panel_focus_hotkeys_facts.md`
- Sorting/reorder: `sidebar_active_sessions_sort_mode_facts.md`, `sidebar_drag_reorder_recovery_facts.md`, `sidebar_drag_reorder_large_group_preservation_facts.md`
- Session actions/titles: `sidebar_session_fork_support_facts.md`, `sidebar_group_full_reload_facts.md`, `terminal_title_normalization_facts.md`, `session_rename_title_auto_summarization_facts.md`
- Agent/T3 integration: `agent_manager_x_bridge_integration_facts.md`, `agent_manager_x_focus_path_without_sidebar_rehydration_facts.md`, `workspace_browser_t3_integration_facts.md`, `t3_managed_runtime_upgrade_facts.md`
- Packaging/search/viewer: `vsmux_packaging_and_embed_validation_facts.md`, `vsmux_ai_devtools_integration_facts.md`, `viewer_search_and_resume_actions_facts.md`, `vsmux_search_rename_facts.md`
