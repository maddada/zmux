---
children_hash: 5ff3b63b9fa65a77422127383ad703fadfcccac8252144001fdc75b0aeae01d1
compression_ratio: 0.5211340206185567
condensation_order: 3
covers: [architecture/_index.md, facts/_index.md, terminal-workspace-current-state.md]
covers_token_total: 11640
summary_level: d3
token_count: 6066
type: summary
---

# VSmux Knowledge Structural Summary

This level combines three layers:

- `architecture/_index.md` — long-form architectural decisions and subsystem relationships
- `facts/_index.md` — stable quick-recall constants, identifiers, and capability matrices
- `terminal-workspace-current-state.md` — current implementation snapshot for terminal workspace behavior

Together they describe a VSmux system built around a detached per-workspace terminal runtime, a webview workspace using cached Restty terminals, a chat-history/search surface that can resume sessions, and a shared text-generation pipeline reused by git flows and session-title summarization.

## Top-level structure

### Core domains

- `architecture/_index.md`
  - `terminal_workspace/_index.md`
  - `chat_history/_index.md`
  - `git_text_generation/_index.md`
- `facts/_index.md`
  - `project/_index.md` and many fact leaf entries
- `terminal-workspace-current-state.md`

### Cross-domain pattern

Repeated across the entries:

- authoritative runtime state is separated from derived UI/display state
- detached backends plus replay enable survival across reloads
- session identity is anchored on stable `sessionId`
- terminal-facing UX prefers normalized/presentable titles while lower-level state retains raw runtime data
- durable state is replayed before transient patches
- sidebar/workspace mutations are guarded against accidental churn

## 1. Terminal workspace is the architectural center

Primary drill-down:

- `architecture/terminal_workspace/_index.md`
- `terminal-workspace-current-state.md`
- facts:
  - `terminal_workspace_facts.md`
  - `terminal_workspace_runtime_facts.md`
  - `terminal_persistence_reload_facts.md`
  - `terminal_persistence_across_vs_code_reloads_facts.md`

### Renderer/runtime model

The terminal renderer is `restty`, not xterm. Frontend runtimes are cached per `sessionId` in `workspace/terminal-runtime-cache.ts`, so switching sessions does not recreate the terminal or replay it unnecessarily. `terminal-workspace-current-state.md` adds that invalidation is generation-based via `renderNonce`, and explicit destroy messages prevent recycled `sessionId` values from inheriting old transcript state.

Key files repeatedly referenced:

- `workspace/terminal-runtime-cache.ts`
- `workspace/terminal-pane.tsx`
- `workspace/workspace-app.tsx`
- `extension/native-terminal-workspace/workspace-pane-session-projection.ts`
- `extension/daemon-terminal-workspace-backend.ts`
- `extension/session-grid-store.ts`
- `extension/daemon-terminal-runtime.ts`
- `extension/terminal-daemon-process.ts`
- `extension/workspace-panel.ts`

### Workspace pane projection and warm switching

`terminal_workspace/_index.md` and `terminal-workspace-current-state.md` agree on the main decision:

- session projection includes terminal sessions from all groups, not just the active group
- inactive panes stay mounted in the same layout slot
- visible split order comes from active-group `snapshot.visibleSessionIds`
- `localPaneOrder` is only a temporary optimistic override

This preserves warm terminals across same-group and cross-group switching, avoids reconnect churn, and keeps passive panes from jumping slots.

### Persistence and detached daemon model

Major sources:

- `terminal_persistence_across_reloads.md`
- `terminal_persistence_across_vs_code_reloads.md`
- corresponding `_facts.md` entries

Persistence stack:

1. `SessionGridStore` snapshot persisted under `VSmux.sessionGridSnapshot`
2. detached per-workspace daemon hosting PTYs
3. restored webview reconnecting and replaying terminal state

Key transport decisions:

- token-authenticated `/control` and `/session` sockets
- replay-before-live attach
- pending attach queue during replay
- DOM detach via `releaseCachedTerminalRuntime()`
- full cleanup only via `destroyCachedTerminalRuntime()`

Operational constants preserved across `architecture/_index.md` and `facts/_index.md`:

- control timeout: `3000ms`
- daemon ready timeout: `10000ms`
- attach-ready timeout: `15000ms`
- owner heartbeat: `5000ms`
- replay chunk size: `128 KiB`
- ring buffer cap: `8 MiB`

`terminal-workspace-current-state.md` reinforces that VSmux uses a per-workspace daemon rather than one global daemon, because global sharing caused ownership conflicts and stale-daemon replacement problems.

### Reattach vs resume semantics

Current-state snapshot adds an important runtime contract:

- `createOrAttach` responses include `didCreateSession`
- if the daemon PTY is still live, VSmux must reattach rather than run resume commands
- resume commands run only when a replacement backend terminal was truly created

This complements `chat_history/_index.md`, where resume commands are used for reopening conversation-linked sessions, not for ordinary daemon reattachment.

## 2. Workspace bootstrap, focus, and reload behavior

Primary drill-down:

- `workspace_panel_startup_without_loading_placeholder.md`
- `workspace_panel_startup_without_placeholder.md`
- `workspace_focus_debugging.md`
- `workspace_focus_and_sidebar_drag_semantics.md`
- `workspace_sidebar_interaction_state.md`
- `workspace_panel_focus_hotkeys.md`
- facts bootstrap/focus entries

### Bootstrap and replay ordering

Workspace startup uses bootstrapped HTML with `window.__VSMUX_WORKSPACE_BOOTSTRAP__`. `WorkspacePanelManager` separates `latestRenderableMessage` from transient messages, and replay prioritizes durable state such as `hydrate` and `sessionState` before transient updates. One-shot `autoFocusRequest` values are stripped before replay.

Facts and current-state entries align on:

- `retainContextWhenHidden: false`
- full webview recreation is preferred over preserving a potentially degraded scheduler state
- stable renderable state is deduplicated while new auto-focus requests still pass through

### Focus ownership model

Authority split:

- `workspace/terminal-pane.tsx` emits activation intent from pointer capture and `focusin`
- `workspace/workspace-app.tsx` owns actual focus policy and decides whether to send `focusSession`

Related rules:

- `WorkspaceApp` is authoritative for focus
- visible split order follows active-group snapshot state
- stale local pending focus requests are cleared if server focus supersedes them
- `AUTO_FOCUS_ACTIVATION_GUARD_MS = 400`
- panel hotkey context key: `vsmux.workspacePanelFocus`
- T3-specific focus message: `vsmuxT3Focus`

### Lag detection and recovery

`terminal_pane_runtime_thresholds_and_behaviors.md` and `terminal-workspace-current-state.md` describe a recovery path:

- lag detection threshold is average scheduler overshoot of `1000ms`
- evaluated during the first `10000ms`
- scheduler probes run every `50ms` over `5000ms`, with warning at `250ms`
- auto reload is controlled by `AUTO_RELOAD_ON_LAG`
- reload is limited to once per workarea boot
- last active `sessionId` is preserved through reload so focus returns to the prior session

Current-state notes an older reload-notice UI still exists as dormant fallback if auto reload is disabled.

## 3. Sidebar ordering, dragging, and interaction safety

Primary drill-down:

- `sidebar_active_sessions_sort_mode.md`
- `sidebar_active_sessions_sort_mode_persistence.md`
- `sidebar_active_sessions_sort_toggle_group_ordering.md`
- `sidebar_drag_reorder_recovery.md`
- `sidebar_drag_reorder_debug_logging.md`
- fact counterparts

### Sort/order model

Stable behavior across architecture and facts:

- sort modes: `manual` and `lastActivity`
- sort mode is persisted per workspace in `workspaceState`
- group order remains manual even when `lastActivity` is active
- only sessions within a group reorder by `lastInteractionAt`
- missing timestamps fall back to `0`
- drag reorder is disabled outside `manual`
- `createDisplaySessionLayout` preserves `workspaceGroupIds`
- `SessionGroupSection` should render `orderedSessionIds` from `SidebarApp`

### Drag safety and observability

Guardrails retained:

- reorder requires real pointer movement over an `8px` threshold
- ordinary clicking must not mutate session order
- recovery logic can restore omitted sessions into authoritative order

Important debug events:

- `session.dragStart`
- `session.dragEnd`
- `session.dragComputedOrder`
- `session.dragIndicatorChanged`
- `session.dragRecoveredOmittedSessions`
- `store.syncSessionOrder`

Logging is mirrored to `~/Desktop/vsmux-debug.log`, while `sidebar/sidebar-debug.ts` no longer writes to the browser console.

### Other interaction constraints

- `VSmux.createSessionOnSidebarDoubleClick` defaults to `false`
- empty-space double-click session creation is startup-guarded
- empty browser groups suppress `.group-sessions`
- non-browser groups still show `No sessions`

## 4. Workspace state normalization and sleep/wake model

Primary drill-down:

- `simple_grouped_session_workspace_state.md`
- `workspace_session_sleep_wake_support.md`
- fact counterparts

Main implementation:

- `shared/simple-grouped-session-workspace-state.ts`

### State invariants

Repeated rules:

- at least one group always exists
- default snapshot is created when missing
- browser sessions are stripped from workspace state normalization
- canonical session IDs derive from display IDs
- duplicate display IDs are repaired
- emptied active groups are retained
- fallback active-group selection prefers nearest previous non-empty group
- new sessions take the first free display ID
- requested ordering appends omitted groups
- fullscreen preserves/restores prior visible count
- `areSnapshotsEqual` uses JSON stringify equality

### Sleep/wake behavior

- sessions persist `isSleeping`
- sleeping sessions are excluded from focus and visible split calculations
- focusing a sleeping session wakes it
- group sleep applies to member sessions
- sleep applies only to non-browser sessions/groups
- sleeping terminal sessions dispose the live runtime surface while preserving session card and resume metadata

Sidebar messages include:

- `setSessionSleeping`
- `setGroupSleeping`
- `focusSession`

## 5. Titles, activity, timestamps, and sound are presentation-state subsystems

Primary drill-down:

- `terminal_title_normalization_and_session_actions.md`
- `title_activity_and_sidebar_runtime.md`
- `terminal_titles_activity_and_completion_sounds.md`
- `sidebar_session_card_last_interaction_timestamps.md`
- `sidebar_session_card_timestamp_compact_display.md`
- fact counterparts

### Title normalization

Core title function:

- `normalizeTerminalTitle()`

Rules preserved:

- leading status/progress symbols are stripped using regex beginning `^[\s\u2800-\u28ff...`
- titles beginning with `~` or `/` are treated as non-visible for preferred-title purposes
- preferred title precedence is visible terminal title → visible primary session title → undefined
- persistence stores normalized titles
- raw `liveTitle` is still retained for runtime activity derivation

Current-state also notes persisted state keeps:

- `agentName`
- `agentStatus`
- `title`

This allows sidebar cold-start correctness even without a live daemon.

### Activity and timestamp semantics

Activity is derived for providers including Claude, Codex, Gemini, and Copilot. Important rules:

- Claude/Codex require title transitions and a stale spinner timeout of `3s`
- attention requires a prior working phase of at least `3s`
- completion sounds are delayed by `1s`
- updates are sent as targeted presentation patches, not full rehydrates

`lastInteractionAt` drives both ordering and UI display:

- `0–15m` bright green
- `15–30m` faded green
- `30–60m` muted green
- `>1h` gray

Compact timestamp display later reduced to `formatRelativeTime(...).value` without `ago`, producing short labels like `5m`, `3h`, `16h`.

## 6. Session actions: rename, resume, fork, reload, default commands

Primary drill-down:

- `session_rename_title_auto_summarization.md`
- `default_agent_commands_overrides.md`
- `sidebar_session_fork_support.md`
- `sidebar_fork_session_behavior.md`
- `sidebar_group_full_reload.md`
- facts equivalents

### Rename auto-summarization

This feature bridges `terminal_workspace` and `git_text_generation`:

- summarization only runs when `title.trim().length > 25`
- generated title max length is `24`
- `GENERATED_SESSION_TITLE_MAX_LENGTH = 24`
- sanitization strips fences, quotes, extra whitespace, and punctuation
- truncation prefers whole words
- output should be plain text, 2–4 words, specific/scannable, no markdown/commentary

### Default command override system

Setting:

- `VSmux.defaultAgentCommands`

Built-in IDs:

- `t3`
- `codex`
- `copilot`
- `claude`
- `opencode`
- `gemini`

Rules:

- trimmed overrides; empty strings normalize to `null`
- explicit session commands take precedence
- sidebar defaults use overrides only when no stored default exists
- launch metadata persists under `VSmux.sessionAgentCommands`
- legacy stock commands can upgrade to configured aliases during resume/fork resolution

### Capability matrix

From architecture and facts:

- copy-resume / resume support: `codex`, `claude`, `copilot`, `gemini`, `opencode`
- fork support: `codex`, `claude`
- full reload support: `codex`, `claude`
- browser sessions cannot rename, fork, copy-resume, or full reload from sidebar menus

### Fork and full reload contracts

Sidebar message types:

- `forkSession`
- `fullReloadGroup`

Commands:

- `codex fork <title>`
- `claude --fork-session -r <title>`

Delayed rename:

- `/rename fork <title>`
- `FORK_RENAME_DELAY_MS = 4000`

Group full reload:

- shown for any non-browser group with sessions
- skips unsupported sessions
- can report partial success

## 7. Chat history / VSmux Search is the conversation viewer and resume surface

Primary drill-down:

- `chat_history/_index.md`
- `viewer_search_and_resume_actions.md`
- `vsmux_search_rename.md`
- related facts

### Viewer architecture

Implementation split:

- webview app: `chat-history/src/webview/App.tsx`
- search UI: `chat-history/src/webview/components/custom-ui/conversation/ConversationSearchBar.tsx`
- extension message handling / terminal launch: `chat-history/src/extension/extension.ts`
- sidebar/runtime rename surface: `chat-history/src/extension/SidebarViewProvider.ts`
- export naming/branding: `chat-history/src/webview/lib/export-utils.ts`

Lifecycle:

1. load conversation JSONL
2. parse entries and derive `source`, `sessionId`, optional `cwd`
3. enable search/resume when metadata is valid
4. webview posts messages like `ready`, `refreshConversation`, `resumeSession`
5. extension validates payload and launches a terminal
6. provider-specific resume command runs
7. conversation can be exported as branded markdown

### Search behavior

Search uses browser-native `window.find` with a custom find bar:

- `Cmd/Ctrl+F` opens search
- `Enter` = next
- `Shift+Enter` = previous
- `Escape` = close
- search wraps and resets selection/scroll on query changes
- explicit status exists for empty query and failed matches

Viewer lifecycle decision:

- `retainContextWhenHidden: false`

Error normalization:

- invalid JSONL/schema lines become `x-error` records

### Resume-session contract

`resumeSession` payload:

- `source`
- `sessionId`
- optional `cwd`

Availability requires:

- parsed `sessionId`
- inferred source from conversation path

Inference rules:

- `/.codex/`, `/.codex-profiles/` → `Codex`
- `/.claude/`, `/.claude-profiles/` → `Claude`

Commands:

- `claude --resume <sessionId>`
- `codex resume <sessionId>`

Other preserved details:

- IDs are quoted with `quoteShellLiteral`
- terminal opens in conversation `cwd` if available
- terminal name pattern is `AI DevTools Resume (<source>)`

### VSmux Search rename/package surface

From `vsmux_search_rename.md` and facts:

- command namespace: `VSmuxSearch.*`
- view ID: `VSmuxSearch.conversations`
- label: `VSmux Search`
- viewer panel type: `vsmuxSearchViewer`
- package name: `vsmux-search-vscode`
- display name: `VSmux Search`
- publisher: `vsmux-search`
- version: `1.1.0`
- activity bar container ID: `vsmux-search`

Preserved patterns:

- `^VSmuxSearch\..+$`
- `^onView:VSmuxSearch\.conversations$`
- `^vsmux-search-export-.+\.md$`

Filtering/export rules:

- recent-only cutoff is `7 days`
- cutoff applies only when no text filter is active
- filter debounce is `150ms`
- unknown tools are exported by default if unmapped
- export filename: `vsmux-search-export-${sessionId}.md`

## 8. Git text generation is a shared shell-based provider pipeline

Primary drill-down:

- `git_text_generation/_index.md`
- `low_effort_provider_settings.md`
- facts:
  - `git_text_generation_low_effort_provider_facts.md`
  - `session_rename_title_auto_summarization_facts.md`

### Implementation and purpose

Core files:

- `extension/git/text-generation-utils.ts`
- `extension/git/text-generation.ts`
- `extension/git/text-generation.test.ts`
- `package.json`

Outputs:

- commit messages
- PR content
- session titles

The same pipeline is reused by session rename summarization, but session-title generation applies stricter output limits and higher-effort provider settings than git text generation.

### Execution flow

Flow retained across architecture and facts:

- build prompt
- append output instructions
- construct provider shell command
- run shell command
- read stdout or output file
- parse and sanitize result
- return generated artifact

Custom command behavior:

- supports `{outputFile}` and `{prompt}` placeholders
- if `{prompt}` is absent, a quoted prompt is appended automatically

### Provider defaults and settings

Settings:

- `VSmux.gitTextGenerationProvider`
- `VSmux.gitTextGenerationCustomCommand`

Supported providers:

- `codex | claude | custom`
- default provider: `codex`

Built-in low-effort settings as of `2026-04-06`:

- Codex: `exec codex -m gpt-5.4-mini -c model_reasoning_effort="low" exec -`
- Claude: `exec claude --model haiku --effort low -p ...`

Timeout:

- `180000ms`

### Parsing/output constraints

Fatal/error behavior:

- empty output is fatal
- non-zero exits are wrapped with provider-specific help/config text
- session titles are clamped to `GENERATED_SESSION_TITLE_MAX_LENGTH`

Important preserved regex/patterns:

- conventional commit subject: `^[a-z]+\([a-z0-9._/-]+\):\s+.+$`
- fenced output stripping: `^```(?:[a-z0-9_-]+)?\n([\s\S]*?)\n```$`
- patch file extraction: `^diff --git a\/(.+?) b\/(.+)$`
- safe unquoted shell args: `^[a-z0-9._-]+$`

Prompt constraints by output type remain stable:

- commit messages: conventional type, lowercase scope, imperative summary `<= 40` chars, optional 3–8 bullets
- PR content: concise title plus markdown `Summary` and `Testing`
- session titles: 2–4 words, no quotes/markdown/commentary, stay below tested `< 25 characters`

## 9. Browser/T3/embed/AI Devtools integrations extend the workspace model

Primary drill-down:

- `workspace_browser_t3_integration.md`
- `t3_managed_runtime_upgrade_and_recovery.md`
- `vsix_packaging_and_t3_embed_validation.md`
- `agent_manager_x_bridge_integration.md`
- `agent_manager_x_focus_path_without_sidebar_rehydration.md`
- `vsmux_ai_devtools_integration.md`
- corresponding fact entries

### Browser and T3 integration

Key decisions:

- browser groups exclude internal VSmux workspace tabs and T3-owned tabs
- restored workspace panel identity is standardized:
  - type `vsmux.workspace`
  - title `VSmux`
  - icon `media/icon.svg`
- T3 live activity flows via `T3ActivityMonitor`
- authoritative browser-group rendering uses `sessionIdsByGroup`

T3 runtime facts:

- managed endpoint: `127.0.0.1:3774`
- legacy endpoint: `3773`
- websocket URL: `ws://127.0.0.1:3774/ws`
- protocol behaviors include `Ping`, `Pong`, `Chunk`, `Ack`, `Exit`
- request IDs must match `^\d+$`

### Managed runtime upgrade / packaging

Upgrade and package-related preserved details:

- worktree-based upgrade flow copied back after validation
- managed runtime entrypoint: `forks/t3code-embed/upstream/apps/server/src/bin.ts`
- mixed-install recovery requires syncing upstream, overlay, and dist from a tested refresh worktree
- VSIX script: `scripts/vsix.mjs`
- modes: `package`, `install`
- installed VSIX asset hash is the source of truth when debugging stale T3 bundles

Packaged outputs include:

- `forks/t3code-embed/dist/**`
- `out/workspace/**`
- `out/**`
- `media/**`

### Agent Manager X bridge

Key files/contracts:

- `extension/agent-manager-x-bridge.ts`
- `extension/native-terminal-workspace/controller.ts`
- websocket: `ws://127.0.0.1:47652/vsmux`

Behavior:

- publishes normalized workspace/session snapshots
- accepts `focusSession`
- snapshots are in-memory only
- deduped by serialized payload
- replayed after reconnect
- reconnect backoff doubles from `1000ms` to `5000ms`
- `focusSession` is gated by matching `workspaceId`

Refinement captured in `agent_manager_x_focus_path_without_sidebar_rehydration.md`:

- focusing through Agent Manager X no longer forces sidebar rehydration/open

### AI Devtools integration

Preserved facts:

- VSmux remains the single shipped extension host
- `aiDevtools.conversations` is registered under `VSmuxSessions`
- chat-history assets build to `chat-history/dist`
- `activateChatHistory(context)` runs before workspace controller setup
- `ai-devtools.suspend` disposes the panel and clears cached provider state

## 10. Facts domain is the quick-recall mirror of architecture

Primary drill-down:

- `facts/_index.md`

The `facts` domain condenses stable identifiers, thresholds, API/message names, storage keys, supported-provider matrices, and transport constants from the architecture entries. It is especially useful for:

- runtime/persistence constants
- sidebar reorder thresholds and drag timings
- command/action support matrices
- storage keys such as `VSmux.sessionGridSnapshot` and `VSmux.sessionAgentCommands`
- stable message names including `forkSession`, `fullReloadGroup`, `resumeSession`, `sidebarDebugLog`
- package identity and activation events
- T3 websocket and bridge endpoints

## Key cross-entry relationships

### Chat history ↔ terminal workspace

- `chat_history/_index.md` depends on terminal workspace/session identity to resume historical conversations into live terminals.
- `resumeSession` launches provider-specific commands, while `terminal-workspace-current-state.md` clarifies that ordinary daemon reconnect should use reattach instead of resume.

### Git text generation ↔ session rename

- `git_text_generation/_index.md` supplies the shell/provider pipeline used by `session_rename_title_auto_summarization.md`.
- Git generation uses low-effort built-ins; session rename reuses the stack with stricter title constraints and higher-effort model settings.

### Architecture ↔ facts

- `architecture/_index.md` explains why systems behave as they do.
- `facts/_index.md` preserves the operative values, identifiers, and support matrices that implement those choices.

### Current state ↔ architecture

- `terminal-workspace-current-state.md` is the implementation-oriented snapshot of the terminal workspace, emphasizing warm-pane projection, focus ownership, daemon lifetime, lag recovery, hidden-pane stability, and reattach semantics already scaffolded in `architecture/terminal_workspace/_index.md`.

## Suggested drill-down map

- Terminal runtime/persistence/replay:
  - `terminal_workspace/_index.md`
  - `terminal_persistence_across_reloads.md`
  - `terminal_persistence_across_vs_code_reloads.md`
  - `terminal-workspace-current-state.md`
- Focus/startup/reload:
  - `workspace_panel_startup_without_placeholder.md`
  - `workspace_focus_debugging.md`
  - `workspace_panel_focus_hotkeys.md`
- Sidebar correctness:
  - `sidebar_active_sessions_sort_mode.md`
  - `sidebar_drag_reorder_recovery.md`
  - `sidebar_drag_reorder_debug_logging.md`
- Titles/actions:
  - `terminal_title_normalization_and_session_actions.md`
  - `session_rename_title_auto_summarization.md`
  - `sidebar_session_fork_support.md`
  - `sidebar_group_full_reload.md`
- Search/resume/viewer:
  - `chat_history/_index.md`
  - `viewer_search_and_resume_actions.md`
  - `vsmux_search_rename.md`
- Text generation:
  - `git_text_generation/_index.md`
  - `low_effort_provider_settings.md`
- Integration surfaces:
  - `workspace_browser_t3_integration.md`
  - `t3_managed_runtime_upgrade_and_recovery.md`
  - `agent_manager_x_bridge_integration.md`
  - `vsmux_ai_devtools_integration.md`
