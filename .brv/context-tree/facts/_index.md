---
children_hash: 0bd413ea2bb1ece629f0b83a1623f1af23eb5e3f3123214160e9b687bac34906
compression_ratio: 0.657880771271891
condensation_order: 2
covers: [context.md, project/_index.md]
covers_token_total: 5653
summary_level: d2
token_count: 3719
type: summary
---

# Facts Domain Structural Summary

## Domain Role

The `facts` domain is the repository’s quick-recall layer for stable, queryable implementation facts rather than long-form architecture. Within it, `project/_index.md` organizes concrete facts about runtime behavior, persistence, settings, identifiers, supported actions, and operational constants across VSmux, terminal workspace, sidebar UX, chat-history viewer, git text generation, and T3/embed integration.

## Primary Fact Clusters

### 1. Terminal workspace runtime, restore, and bootstrap

Drill down:

- `terminal_workspace_facts.md`
- `terminal_workspace_runtime_facts.md`
- `terminal_persistence_reload_facts.md`
- `terminal_persistence_across_vs_code_reloads_facts.md`
- `workspace_panel_startup_bootstrap_facts.md`
- `workspace_panel_startup_without_loading_placeholder_facts.md`
- `workspace_panel_startup_without_placeholder_facts.md`

Key structure:

- Workspace rendering uses **Restty** with runtime caching by `sessionId` in `workspace/terminal-runtime-cache.ts`.
- Panel/webview identity is stable: `vsmux.workspace`, title `VSmux`, `retainContextWhenHidden: false`.
- Bootstrap state is injected through `window.__VSMUX_WORKSPACE_BOOTSTRAP__`, and renderable state is replayed before transient messages.
- Persistence is split across `SessionGridStore`, detached per-workspace terminal daemon, and restored webview state.
- Workspace snapshot storage key is `VSmux.sessionGridSnapshot`.
- Restore path is: workspace state restore → daemon reconnect → session reconnect → `terminalReady` → replay/output flush.

Operational constants repeatedly referenced:

- auto-focus guard: `400ms`
- sidebar startup block: `1500ms`
- control connect timeout: `3000ms`
- ready timeout: `10000ms`
- attach-ready timeout: `15000ms`
- replay chunk size: `128 * 1024`
- history ring buffer: `8 * 1024 * 1024`
- heartbeat: `5000ms` interval / `20000ms` timeout / `30000ms` startup grace

Terminal environment invariants:

- PTYs use `xterm-256color`
- `LANG` is normalized to `en_US.UTF-8` when needed

### 2. Sidebar ordering, sort mode, drag/reorder, and interaction rules

Drill down:

- `sidebar_active_sessions_sort_mode_facts.md`
- `sidebar_active_sessions_sort_mode_persistence_facts.md`
- `sidebar_active_sessions_sort_toggle_group_ordering_facts.md`
- `sidebar_drag_reorder_debug_logging_facts.md`
- `sidebar_drag_reorder_recovery_facts.md`
- `workspace_sidebar_interaction_facts.md`
- `workspace_focus_and_drag_runtime_facts.md`

Core decisions:

- Active sessions support `manual` and `lastActivity` sort modes.
- Group order remains manually controlled even when `lastActivity` is enabled; only sessions within a group reorder by `lastInteractionAt`.
- Missing timestamps fall back to `0`.
- Drag/reorder is disabled outside manual mode.
- Browser groups are excluded from manual group drag behavior.

Stable message/API contracts:

- `toggleActiveSessionsSortMode`
- `syncGroupOrder`
- `moveSessionToGroup`
- `syncSessionOrder`

Recovery and observability:

- Drag recovery reconciles sanitized drag output with authoritative order and restores omitted sessions.
- Debug event `session.dragRecoveredOmittedSessions` marks omitted-session recovery.
- Debug capture covers events such as `session.dragStart`, `session.dragEnd`, `session.dragComputedOrder`, `session.dragIndicatorChanged`, and `store.syncSessionOrder`.

Input thresholds:

- pointer drag reorder threshold: `8px`
- non-touch activation distance: `6px`
- touch activation: `250ms`, tolerance `5`
- session-card drag hold: `130ms`, tolerance `12`

### 3. Session titles, rename, fork, reload, and command overrides

Drill down:

- `terminal_title_normalization_facts.md`
- `session_rename_title_auto_summarization_facts.md`
- `sidebar_session_fork_support_facts.md`
- `sidebar_fork_session_behavior_facts.md`
- `sidebar_group_full_reload_facts.md`
- `default_agent_commands_override_facts.md`

Title handling:

- Raw daemon titles are distinct from normalized display titles.
- `normalizeTerminalTitle` strips leading status/progress symbols with regex:
  - `^[\s\u2800-\u28ff·•⋅◦✳*✦◇🤖🔔]+`
- Path-like titles (`~`, `/...`) are treated as non-visible when computing preferred titles.
- Preferred title precedence is visible terminal title → visible primary session title → undefined.

Rename auto-summarization:

- Triggered only when `title.trim().length > 25`
- Output cap: `24` chars via `GENERATED_SESSION_TITLE_MAX_LENGTH = 24`
- Prompt constraints require plain text only, 2–4 words, no quotes/markdown/commentary

Provider/model split:

- Session title generation uses higher-effort settings
- Git text generation uses lower-effort settings
- Refer to `git_text_generation_low_effort_provider_facts.md` and `session_rename_title_auto_summarization_facts.md` for exact provider pairings

Agent command overrides:

- Setting: `VSmux.defaultAgentCommands`
- Defined in `extension/native-terminal-workspace/settings.ts` and `package.json`
- Built-ins include `t3`, `codex`, `copilot`, `claude`, `opencode`, `gemini`
- Empty override strings normalize to `null`
- Explicit session commands always take precedence
- Launch metadata is stored under `VSmux.sessionAgentCommands`

Capability matrix:

- Resume/copy-resume: `codex`, `claude`, `copilot`, `gemini`, `opencode`
- Fork: `codex`, `claude`
- Full reload: `codex`, `claude`
- Browser sessions cannot rename, fork, copy-resume, or full reload from sidebar menus

Fork/full reload specifics:

- Sidebar posts `forkSession` and `fullReloadGroup`
- Fork commands:
  - `codex fork <preferred title>`
  - `claude --fork-session -r <preferred title>`
- Delayed rename uses `/rename fork <preferred title>` after `FORK_RENAME_DELAY_MS = 4000`
- Group full reload skips unsupported sessions and reports partial success

### 4. Activity timestamps and session card display

Drill down:

- `sidebar_session_card_last_interaction_timestamp_facts.md`
- `sidebar_session_card_timestamp_compact_display_facts.md`
- `terminal_activity_timestamp_reset_facts.md`

Key facts:

- Session-card timestamps are compact (`5m`, `3h`, `16h`) and rendered in `.session-head`.
- Relative labels update every second.
- Age buckets drive color semantics:
  - `0–15m` bright green
  - `15–30m` faded green
  - `30–60m` muted green
  - `1h+` gray
- Activity refreshes on terminal writes, state changes, and VS Code shell integration command start/end events.
- Persisted session-state file mtimes are preferred as activity seeds; creation time is fallback only.

### 5. Agent Manager X bridge and focus integration

Drill down:

- `agent_manager_x_bridge_integration_facts.md`
- `agent_manager_x_focus_path_without_sidebar_rehydration_facts.md`

Bridge contract:

- Local broker endpoint: `ws://127.0.0.1:47652/vsmux`
- Handshake timeout: `3000ms`
- `perMessageDeflate` disabled
- Reconnect backoff doubles from `1000ms` to `5000ms` max
- Snapshots are in-memory only and sent only when socket is open and serialized content changed
- Incoming ping messages are ignored
- `focusSession` is gated by matching `workspaceId`

Focus-path refinement:

- `focusSessionFromAgentManagerX` in `extension/native-terminal-workspace/controller.ts` now focuses directly without forced sidebar rehydration/open
- This preserves focus behavior while removing sidebar reload artifacts

Related constants cross-referenced here:

- `DEFAULT_T3_ACTIVITY_WEBSOCKET_URL = ws://127.0.0.1:3774/ws`
- `COMMAND_TERMINAL_EXIT_POLL_MS = 250`
- `COMPLETION_SOUND_CONFIRMATION_DELAY_MS = 1000`
- `FORK_RENAME_DELAY_MS = 4000`
- `SIMPLE_BROWSER_OPEN_COMMAND = simpleBrowser.api.open`

### 6. T3 runtime, browser integration, packaging, and embed validation

Drill down:

- `workspace_browser_t3_integration_facts.md`
- `t3_managed_runtime_upgrade_facts.md`
- `vsmux_packaging_and_embed_validation_facts.md`

Browser/T3 integration:

- Internal VSmux workspace tabs and T3-owned tabs are excluded from browser sidebar groups.
- T3 activity flows through `T3ActivityMonitor` over `ws://127.0.0.1:3774/ws`.
- Monitor answers `Ping` with `pong` and debounces domain-event refreshes.
- T3 focus acknowledgement uses completion-marker-aware `acknowledgeThread`.

Managed runtime upgrade facts:

- Current embedded T3 runtime uses `127.0.0.1:3774`; legacy references may still mention `127.0.0.1:3773`.
- Effect RPC request IDs are numeric strings, not UUIDs.
- Managed runtime entrypoint: `forks/t3code-embed/upstream/apps/server/src/bin.ts`.
- Mixed-install recovery requires syncing upstream, overlay, and dist from a tested refresh worktree.

Extension/package identity:

- Display name: `VSmux - T3code & Agent CLIs Manager`
- Publisher: `maddada`
- Main entry: `./out/extension/extension.js`
- Activity Bar container/view: `VSmuxSessions` / `VSmux.sessions`
- Secondary container: `VSmuxSessionsSecondary`
- Activation events include:
  - `onStartupFinished`
  - `onView:VSmux.sessions`
  - `onWebviewPanel:vsmux.workspace`
- `pnpm` overrides replace `vite` and `vitest` with `@voidzero-dev` packages
- `restty@0.1.35` is patched
- Installed VSIX asset hash is treated as source of truth when diagnosing stale T3 bundles

### 7. Git text generation and shared summarization pipeline

Drill down:

- `git_text_generation_low_effort_provider_facts.md`
- `session_rename_title_auto_summarization_facts.md`

Shared patterns:

- Setting `VSmux.gitTextGenerationProvider` defaults to `codex`
- Supported values: `codex | claude | custom`
- Timeout: `180000ms`
- Built-in providers run in non-interactive shell mode
- Custom commands may emit through stdout or a temp output file
- Session rename summarization reuses the text-generation stack but with stricter prompt/output constraints and higher-effort model settings

### 8. Chat-history viewer, AI DevTools integration, and VSmux Search

Drill down:

- `viewer_search_and_resume_actions_facts.md`
- `vsmux_ai_devtools_integration_facts.md`
- `vsmux_search_rename_facts.md`

Viewer/search behavior:

- Search opens with `Cmd/Ctrl+F`, uses native `window.find`, and supports Enter / Shift+Enter / Escape.
- Resume is enabled only when source can be inferred from `filePath` and a `sessionId` is parsed.
- Source inference:
  - `/.codex/`, `/.codex-profiles/` → Codex
  - `/.claude/`, `/.claude-profiles/` → Claude
- Resume posts `resumeSession` with `source`, `sessionId`, and optional `cwd`
- Resume terminals execute:
  - `claude --resume <sessionId>`
  - `codex resume <sessionId>`
- Invalid JSONL/schema lines are surfaced as `x-error`

AI DevTools integration:

- VSmux remains the single shipped extension host
- `aiDevtools.conversations` is registered under `VSmuxSessions`, below `VSmux.sessions`
- Chat-history assets resolve from `chat-history/dist` and `chat-history/media`
- Build pipeline spans sidebar, debug panel, workspace, chat-history webview, TypeScript compile, and `vendor-runtime-deps`
- Viewer memory behavior depends on `retainContextWhenHidden: false`
- `ai-devtools.suspend` disposes the panel and clears cached provider state

VSmux Search rename:

- Stable identifiers include:
  - `VSmuxSearch.conversations`
  - `VSmux Search`
  - `vsmux-search-vscode`
  - `vsmux-search`
  - `vsmuxSearchViewer`
  - export prefix `vsmux-search-export-`
- Recent filter cutoff: `7 days`
- Filter debounce: `150ms`
- Unknown tools export by default when not mapped

### 9. Workspace state normalization and sleep/wake model

Drill down:

- `simple_grouped_session_workspace_state_facts.md`
- `workspace_session_sleep_wake_support_facts.md`

Workspace state model:

- Main implementation: `shared/simple-grouped-session-workspace-state.ts`
- Normalization guarantees:
  - default snapshot creation when missing
  - at least one group
  - browser sessions stripped
  - session IDs canonicalized from display IDs
  - duplicate display IDs repaired
- Behavioral rules:
  - emptied groups are retained
  - fallback active-group selection prefers nearest previous non-empty group
  - visible-session behavior depends on `visibleCount`
  - new sessions take first free display ID
  - moved sessions activate/focus destination group
  - requested group ordering appends omitted groups
  - fullscreen preserves/restores prior visible count

Sleep/wake:

- Sessions persist `isSleeping`
- Sleeping sessions are excluded from focus and visible split calculations
- Focusing a sleeping session wakes it
- Group sleep applies to all group sessions
- Sleep applies only to non-browser sessions/groups
- Sleeping disposes live terminal runtime/surface but preserves session card and resume metadata
- Sidebar messages include `setSessionSleeping`, `setGroupSleeping`, and `focusSession`

### 10. Restty font probing defaults

Drill down:

- `restty_terminal_font_probing_defaults_facts.md`

Defaults:

- `DEFAULT_TERMINAL_FONT_FAMILIES`:
  - `MesloLGL Nerd Font Mono`
  - `Menlo`
  - `Monaco`
  - `Courier New`
- `DEFAULT_LOCAL_FONT_MATCHERS`:
  - `MesloLGL Nerd Font Mono`
  - `MesloLGL Nerd Font`
- Unset/default font-family uses only Meslo fallback URL source
- Custom font-family retains optional local font source with `required: false`

## Cross-Cutting Invariants

### Stable identifiers and storage keys

Repeated across entries:

- workspace state key: `VSmux.sessionGridSnapshot`
- session launch metadata: `VSmux.sessionAgentCommands`
- workspace bootstrap global: `window.__VSMUX_WORKSPACE_BOOTSTRAP__`
- workspace panel type: `vsmux.workspace`
- debug message type: `sidebarDebugLog`
- session/group action messages: `forkSession`, `fullReloadGroup`, `createSession`, `resumeSession`

### Repeated operational defaults

The same constants recur across runtime and UX facts:

- `400ms` auto-focus guard
- `1500ms` sidebar startup interaction block
- `8px` reorder threshold
- `6px` non-touch drag activation
- `250ms` touch activation delay with tolerance `5`
- `130ms` session-card drag hold with tolerance `12`
- `3000ms` control/bridge handshake timeout
- `4000ms` fork rename delay
- `180000ms` git text generation timeout
- T3 websocket endpoint `ws://127.0.0.1:3774/ws`

## Suggested Drill-Down Paths

- Runtime persistence and restore: `terminal_persistence_across_vs_code_reloads_facts.md`, `terminal_persistence_reload_facts.md`
- Startup/bootstrap behavior: `workspace_panel_startup_bootstrap_facts.md`, `workspace_panel_startup_without_loading_placeholder_facts.md`
- Sort/reorder correctness: `sidebar_active_sessions_sort_mode_facts.md`, `sidebar_drag_reorder_recovery_facts.md`
- Title and action behavior: `terminal_title_normalization_facts.md`, `sidebar_session_fork_support_facts.md`, `sidebar_group_full_reload_facts.md`
- Search/viewer/resume flows: `viewer_search_and_resume_actions_facts.md`, `vsmux_ai_devtools_integration_facts.md`, `vsmux_search_rename_facts.md`
- T3/embed/package details: `workspace_browser_t3_integration_facts.md`, `t3_managed_runtime_upgrade_facts.md`, `vsmux_packaging_and_embed_validation_facts.md`
