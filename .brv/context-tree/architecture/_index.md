---
children_hash: 497a59d282a7234d9a54e983365afc36ce1dc2871eaa1c672b1909b5a88dd605
compression_ratio: 0.6887383356768503
condensation_order: 2
covers:
  [chat_history/_index.md, context.md, git_text_generation/_index.md, terminal_workspace/_index.md]
covers_token_total: 7823
summary_level: d2
token_count: 5388
type: summary
---

# architecture

Structural overview of the VSmux architecture domain covering three connected areas: `terminal_workspace`, `chat_history`, and `git_text_generation`. The domain centers on a detached terminal-workspace runtime with persistent session state, a webview-based conversation/search surface that can resume sessions back into terminals, and a shared text-generation pipeline used for git content and long session-title summarization.

## Domain scope

From `context.md`:

- Primary ownership: VSmux terminal workspace implementation
- Included:
  - terminal workspace rendering and pane lifecycle
  - runtime caching and visibility behavior
  - workspace message handling and pane ordering
  - backend daemon, leases, and persisted session state behavior
- Excluded:
  - unrelated editor features outside terminal workspace
  - generic terminal usage instructions

## Topic map

- `terminal_workspace/_index.md` — core runtime, daemon, persistence, sidebar/workspace UX, browser/T3 integration, session actions
- `chat_history/_index.md` — conversation viewer, browser-native search, resume-session flow, VSmux Search rename/package surfaces
- `git_text_generation/_index.md` — provider-backed text generation for commit messages, PR content, and session titles

## Cross-topic architecture

### Shared runtime relationships

- `chat_history/_index.md` depends on `terminal_workspace` to resume historical conversations into live terminal sessions.
- `git_text_generation/_index.md` connects to `terminal_workspace/session_rename_title_auto_summarization.md` via generated session-title constraints and sanitization.
- `terminal_workspace` supplies the runtime/session identity model that other topics consume:
  - session IDs as stable keys
  - normalized terminal titles for session-facing actions
  - provider-aware commands for resume/fork/reload flows

### Repeated architectural patterns

Across the topic summaries:

- authoritative state is kept separate from derived display state
- renderable persisted state is separated from transient/UI patch state
- UX mutations are guarded to avoid accidental churn
- runtimes are designed to survive reloads via detached backends, replay, and persisted snapshots
- session-facing operations use normalized/presentable identifiers, while raw runtime data remains available for lower-level logic

## terminal_workspace

`terminal_workspace/_index.md` is the architectural center of the domain. It defines the session/workspace model, the detached daemon/replay system, workspace/sidebar focus semantics, session ordering rules, browser/T3 integration, and external bridges.

### Baseline architecture

From `current_state.md` and the topic overview:

- Renderer/runtime split:
  - frontend: `workspace/terminal-runtime-cache.ts`, `workspace/terminal-pane.tsx`, `workspace/workspace-app.tsx`
  - backend/projection: `extension/native-terminal-workspace/workspace-pane-session-projection.ts`, `extension/daemon-terminal-workspace-backend.ts`
- Core invariants:
  - runtime cache key = `sessionId`
  - hidden connected panes remain mounted
  - PTY attach waits for appearance completion and stable size
  - session projection flattens sessions from all workspace groups
  - backend daemon is per-workspace
  - persisted disconnected state backfills sidebar metadata when daemon/runtime is unavailable

### Persistence and daemon model

Key entries:

- `terminal_persistence_across_reloads.md`
- `terminal_persistence_across_vs_code_reloads.md`

Main system components:

1. `SessionGridStore` snapshot persisted in `VSmux.sessionGridSnapshot`
2. detached per-workspace daemon hosting PTYs
3. restored webview that reconnects/replays via Restty

Important files:

- `extension/session-grid-store.ts`
- `extension/daemon-terminal-runtime.ts`
- `extension/terminal-daemon-process.ts`
- `extension/workspace-panel.ts`
- `workspace/terminal-runtime-cache.ts`

Important transport/runtime decisions:

- token-authenticated `/control` and `/session` sockets
- replay-before-live attach
- pending attach queue during replay
- `releaseCachedTerminalRuntime()` only detaches DOM
- `destroyCachedTerminalRuntime()` is required for full cleanup

Concrete thresholds retained in the architecture:

- control timeout: `3000ms`
- daemon ready timeout: `10000ms`
- owner heartbeat: `5000ms`
- attach ready timeout: `15000ms`
- ring buffer cap: `8 MiB`
- replay chunk size: `128 KiB`

### Terminal pane behavior and rendering

Key entries:

- `terminal_pane_runtime_thresholds_and_behaviors.md`
- `restty_terminal_font_probing_defaults.md`

Retained runtime/UI rules:

- typing auto-scroll: 4 printable keys in 450ms
- scroll-to-bottom visibility: show at 200px, hide at 40px
- lag detection: 1000ms avg overshoot in 10000ms
- scheduler probe: every 50ms over 5000ms, warn at 250ms

Font-selection decision:

- `workspace/restty-terminal-config.ts` skips optional local font probing when using the bundled default stack:
  - `MesloLGL Nerd Font Mono`
  - `Menlo`
  - `Monaco`
  - `Courier New`
- custom font stacks still prepend local probes before Meslo fallback

### Workspace startup, focus, and hotkeys

Key entries:

- `workspace_panel_startup_without_loading_placeholder.md`
- `workspace_panel_startup_without_placeholder.md`
- `workspace_focus_debugging.md`
- `workspace_focus_and_sidebar_drag_semantics.md`
- `workspace_sidebar_interaction_state.md`
- `workspace_panel_focus_hotkeys.md`

Structural decisions:

- `openWorkspace` reveals the sidebar before panel creation/reveal
- `WorkspacePanelManager` stores `latestRenderableMessage` separately from transient messages
- bootstrapped HTML uses `window.__VSMUX_WORKSPACE_BOOTSTRAP__`
- replay order prioritizes durable state (`hydrate`, `sessionState`) before transient updates
- one-shot `autoFocusRequest` values are stripped before replay

Focus model:

- `WorkspaceApp` is authoritative for focus
- `TerminalPane` only emits activation intent
- visible split order comes from active group `snapshot.visibleSessionIds`
- stale local pending focus requests are cleared if server focus supersedes them
- `AUTO_FOCUS_ACTIVATION_GUARD_MS = 400`

T3-specific focus path:

- message type `vsmuxT3Focus`
- respects visibility and guard checks

Panel hotkey model:

- context key: `vsmux.workspacePanelFocus`
- workspace/session/layout hotkeys can run under `!inputFocus || terminalFocus || vsmux.workspacePanelFocus`
- directional focus remains terminal-only with `terminalFocus`

### Sidebar ordering, dragging, and interaction guards

Key entries:

- `sidebar_active_sessions_sort_mode.md`
- `sidebar_active_sessions_sort_mode_persistence.md`
- `sidebar_active_sessions_sort_toggle_group_ordering.md`
- `sidebar_drag_reorder_recovery.md`
- `sidebar_drag_reorder_debug_logging.md`
- `workspace_debug_console_suppression.md`
- `sidebar_double_click_session_creation_setting.md`
- `sidebar_browsers_empty_state.md`

Ordering model:

- sort modes: `manual`, `lastActivity`
- persisted per workspace in `workspaceState`
- `createDisplaySessionLayout` preserves `workspaceGroupIds`
- `lastActivity` reorders only within each group by `lastInteractionAt`
- manual group order stays stable across sort toggles
- drag reorder is disabled outside `manual`
- `SessionGroupSection` must use `orderedSessionIds` from `SidebarApp`

Drag semantics and instrumentation:

- reorder requires real pointer movement over an 8px threshold
- click-like interactions must not reorder
- recovery logic existed in `reconcileDraggedSessionOrder(...)`, then emphasis shifted toward richer debug logging
- debug events include:
  - `session.dragStart`
  - `session.dragComputedOrder`
  - `session.dragIndicatorChanged`
- store logs before/after summaries for reorder/group move operations
- debug output is mirrored to `~/Desktop/vsmux-debug.log`

Interaction guards:

- `sidebar/sidebar-debug.ts` no longer writes to browser console
- extension-side/sidebarDebugLog flow remains intact
- `VSmux.createSessionOnSidebarDoubleClick` defaults to `false`
- empty-space double-click creation is gated by blocking targets and startup guards
- empty browser groups suppress `.group-sessions`; non-browser groups still show `No sessions`

### Workspace state model

Key entries:

- `simple_grouped_session_workspace_state.md`
- `workspace_session_sleep_wake_support.md`

Core module:

- `shared/simple-grouped-session-workspace-state.ts`

Responsibilities include:

- group/session snapshot normalization
- canonical session IDs from display IDs
- duplicate display ID repair
- browser session removal
- active-group fallback when a group empties
- visible-session restoration per group
- create/move/remove/reorder helpers
- fullscreen restore state
- T3 metadata updates preserving identity

Key invariants:

- at least one group always exists
- emptied active group is retained
- fallback prefers nearest previous non-empty group
- new sessions take first free display ID
- `areSnapshotsEqual` uses JSON stringify equality

Sleep/wake semantics:

- session records persist `isSleeping`
- sleeping sessions are excluded from awake focus/visible calculations
- focusing a sleeping session wakes it
- group sleep/wake applies to all member sessions
- sleeping terminal sessions dispose live runtime surfaces while preserving resume metadata

### Titles, activity, timestamps, and sound

Key entries:

- `terminal_title_normalization_and_session_actions.md`
- `title_activity_and_sidebar_runtime.md`
- `terminal_titles_activity_and_completion_sounds.md`
- `terminal_titles_activity_and_sidebar_runtime.md`
- `sidebar_session_card_last_interaction_timestamps.md`
- `sidebar_session_card_timestamp_compact_display.md`

Title model:

- canonical sanitizer: `normalizeTerminalTitle()`
- visible titles exclude normalized titles beginning with `~` or `/`
- session-facing actions prefer normalized visible terminal title over user-entered session title
- persistence stores normalized titles
- controller still retains raw `liveTitle` for activity derivation

Activity/sound model:

- terminal titles are first-class presentation state
- activity is derived for Claude, Codex, Gemini, Copilot
- Claude/Codex require title transitions and a stale spinner timeout of 3s
- attention requires a prior working phase of at least 3s
- completion sounds are delayed by 1s
- sounds play via unlocked `AudioContext` using embedded data URLs
- title/activity updates are sent as targeted presentation patches, not full rehydrates

Timestamp UX:

- native terminal activity updates on shell-integration command start/end
- `lastInteractionAt` drives age buckets:
  - 0–15m bright green
  - 15–30m faded green
  - 30–60m muted green
  - > 1h gray
- UI updates every second
- compact display later reduced to `formatRelativeTime(...).value` without `ago`

### Session commands and provider-aware actions

Key entries:

- `session_rename_title_auto_summarization.md`
- `default_agent_commands_overrides.md`
- `sidebar_session_fork_support.md`
- `sidebar_fork_session_behavior.md`
- `sidebar_group_full_reload.md`

Rename/title summarization:

- summarization only when `title.trim().length > 25`
- max generated title length = `24`
- uses the `git_text_generation` pipeline
- sanitization removes fences, quotes, whitespace, punctuation
- truncation prefers whole words

Default command override system:

- setting: `VSmux.defaultAgentCommands`
- built-in ids:
  - `t3`
  - `codex`
  - `copilot`
  - `claude`
  - `opencode`
  - `gemini`
- trimmed overrides; empty strings normalize to `null`
- sidebar defaults use overrides only when no stored default exists
- legacy stock commands can upgrade to configured aliases for resume/fork resolution

Fork/reload behavior:

- fork support only for Codex/Claude terminal sessions with visible preferred titles
- sidebar message type: `forkSession`
- commands:
  - `codex fork <title>`
  - `claude --fork-session -r <title>`
- delayed fork rename:
  - `/rename fork <title>`
  - `FORK_RENAME_DELAY_MS = 4000`
- copy resume supports `codex`, `claude`, `copilot`, `gemini`, `opencode`
- full reload remains limited to Codex/Claude, but group Full reload is shown for any non-browser group with sessions and skips unsupported sessions with partial-success behavior

### Browser, T3, packaging, and external integrations

Key entries:

- `workspace_browser_t3_integration.md`
- `t3_managed_runtime_upgrade_and_recovery.md`
- `vsix_packaging_and_t3_embed_validation.md`
- `agent_manager_x_bridge_integration.md`
- `agent_manager_x_focus_path_without_sidebar_rehydration.md`
- `vsmux_ai_devtools_integration.md`

Browser/T3 integration:

- browser group excludes internal VSmux/T3-owned tabs
- restored workspace panel identity is standardized:
  - type `vsmux.workspace`
  - title `VSmux`
  - icon `media/icon.svg`
- T3 activity is live through `T3ActivityMonitor`
- sidebar browser-group rendering uses authoritative `sessionIdsByGroup`

Managed T3 runtime upgrade/recovery:

- managed runtime: `127.0.0.1:3774`
- legacy runtime: `3773`
- websocket URL: `ws://127.0.0.1:3774/ws`
- request IDs must match `^\d+$`
- protocol behaviors include `Ping`, `Pong`, `Chunk`, `Ack`, `Exit`
- upgrade flow is worktree-based and copied back after validation

VSIX packaging/validation:

- script: `scripts/vsix.mjs`
- modes: `package`, `install`
- reinstall VSIX and verify installed T3 asset hash before UI debugging
- packaged outputs include:
  - `forks/t3code-embed/dist/**`
  - `out/workspace/**`
  - `out/**`
  - `media/**`

Agent Manager X bridge:

- bridge client: `extension/agent-manager-x-bridge.ts`
- controller integration: `extension/native-terminal-workspace/controller.ts`
- websocket: `ws://127.0.0.1:47652/vsmux`
- publishes normalized workspace/session snapshots
- accepts `focusSession`
- snapshots are in-memory, deduped by serialized payload, replayed after reconnect
- reconnect backoff: 1000ms doubling to 5000ms
- later refinement avoids forcing sidebar rehydration/open when focusing a target session

AI Devtools integration:

- VSmux remains the single shipped extension host
- `aiDevtools.conversations` is registered under `VSmuxSessions`
- root build includes `chat-history` webview output to `chat-history/dist`
- `activateChatHistory(context)` runs before workspace controller setup

## chat_history

`chat_history/_index.md` covers the conversation viewer and resume/search capabilities, plus the product/namespace rename to VSmux Search.

### Viewer architecture

Implementation split:

- webview state: `chat-history/src/webview/App.tsx`
- search UI: `chat-history/src/webview/components/custom-ui/conversation/ConversationSearchBar.tsx`
- extension message handling and terminal launch: `chat-history/src/extension/extension.ts`
- sidebar/runtime rename surfaces: `chat-history/src/extension/SidebarViewProvider.ts`
- export naming/branding: `chat-history/src/webview/lib/export-utils.ts`

End-to-end flow:

1. load conversation JSONL
2. parse entries and derive `source`, `sessionId`, optional `cwd`
3. enable viewer search and resume when metadata is valid
4. webview posts messages such as `ready`, `refreshConversation`, `resumeSession`
5. extension validates payload and opens a terminal
6. provider-specific resume command runs
7. conversation can be exported as branded markdown

### Search and lifecycle decisions

From `viewer_search_and_resume_actions.md`:

- search uses browser-native `window.find`
- Cmd/Ctrl+F opens the custom find bar
- Enter = next
- Shift+Enter = previous
- Escape = close
- search wraps and resets selection/scroll when query changes
- explicit status exists for empty query and failed matches

Lifecycle decision:

- viewer panel uses `retainContextWhenHidden: false`

Error normalization:

- JSONL parse/schema failures become `x-error` records

### Resume-session contract

`resumeSession` payload includes:

- `source`
- `sessionId`
- optional `cwd`

Availability requires:

- extracted `sessionId`
- inferred source from conversation path

Source inference rules:

- `/.codex/` and `/.codex-profiles/` → `Codex`
- `/.claude/` and `/.claude-profiles/` → `Claude`

Terminal execution rules:

- Claude: `claude --resume <sessionId>`
- Codex: `codex resume <sessionId>`
- IDs are quoted with `quoteShellLiteral`
- terminal opens in conversation `cwd` if available
- terminal name pattern: `AI DevTools Resume (<source>)`

### VSmux Search rename surfaces

From `vsmux_search_rename.md`:

Renamed identifiers:

- command namespace: `VSmuxSearch.*`
- view ID: `VSmuxSearch.conversations`
- view label: `VSmux Search`
- viewer panel type: `vsmuxSearchViewer`

Patterns preserved:

- `^VSmuxSearch\..+$`
- `^onView:VSmuxSearch\.conversations$`
- `^vsmux-search-export-.+\.md$`

Package/runtime facts:

- package name: `vsmux-search-vscode`
- display name: `VSmux Search`
- publisher: `vsmux-search`
- version: `1.1.0`
- activity bar container ID: `vsmux-search`
- activation event: `onView:VSmuxSearch.conversations`

Sidebar/runtime behavior under the rename:

- scans conversation folders
- supports refresh/reload
- toggles current-vs-all scope
- toggles recent-only vs all-time filtering
- opens viewer and optional resume
- exports markdown

Important filtering rule:

- recent-only cutoff is `Date.now() - 7 * 24 * 60 * 60 * 1000`
- only applies when `!this._showAllTime && !this._filterText`

Other retained decisions:

- live browser-tab filtering ignores VSmux Search labels
- export filename is `vsmux-search-export-${sessionId}.md`
- output is branded with VSMUX-SEARCH tags
- metadata/message categories are preserved
- Chrome MCP tools are mapped into grouped option keys
- unknown tools are included by default if unmapped

## git_text_generation

`git_text_generation/_index.md` captures the provider-backed shell execution path used for commit messages, PR content, and session-title generation.

### Implementation structure

Core files:

- `extension/git/text-generation-utils.ts`
- `extension/git/text-generation.ts`
- `extension/git/text-generation.test.ts`
- `package.json`

Related topic:

- `architecture/terminal_workspace/session_rename_title_auto_summarization`

Responsibilities:

- provider command construction
- prompt assembly and output instructions
- stdout/file output reading
- parsing and sanitization
- provider-specific error handling
- session title clamping

### Execution flow

From `low_effort_provider_settings.md`:

- build prompt
- append output instructions
- build provider shell command
- run shell command
- read output file or stdout
- parse/sanitize result
- return commit message, PR content, or session title

Custom-command behavior:

- supports `{outputFile}` and `{prompt}` expansion
- if `{prompt}` is missing, quoted prompt is appended automatically

### Provider configuration decisions

Built-in providers are pinned to low-effort settings as of `2026-04-06`.

Codex:

- command shape: `exec codex -m gpt-5.4-mini -c model_reasoning_effort="low" exec -`
- model: `gpt-5.4-mini`
- prompt transport: stdin via trailing `exec -`

Claude:

- command shape: `exec claude --model haiku --effort low -p ...`
- model: `haiku`
- prompt transport: CLI `-p`

Settings:

- `VSmux.gitTextGenerationProvider`
- `VSmux.gitTextGenerationCustomCommand`
- default provider: `codex`

Metadata/compatibility decisions:

- package metadata explicitly describes low-effort built-ins
- existing user-edited numeric session rename generation limits are preserved

### Dependencies and interfaces

Execution depends on:

- `runShellCommand` from `./process`
- temp helpers `mkdtemp`, `readFile`, `rm`
- shell quoting from `../agent-shell-integration-utils`
- `GENERATED_SESSION_TITLE_MAX_LENGTH` from native terminal workspace session-title generation

Public outputs:

- commit messages
- PR content
- session titles

### Parsing, patterns, and output constraints

Error and sanitization behavior:

- empty outputs are fatal for all generated artifact types
- non-zero exits are wrapped with provider-specific settings/help text
- session titles are clamped to `GENERATED_SESSION_TITLE_MAX_LENGTH`
- tested session title behavior stays under 25 characters
- timeout: `180000 ms`

Patterns preserved:

- conventional commit subject:
  - `^[a-z]+\([a-z0-9._/-]+\):\s+.+$`
- fenced-output stripping:
  - `^```(?:[a-z0-9_-]+)?\n([\s\S]*?)\n```$`
- patch file extraction:
  - `^diff --git a\/(.+?) b\/(.+)$`
- safe unquoted shell args:
  - `^[a-z0-9._-]+$`

Prompt constraints by output type:

- Commit messages:
  - conventional type required
  - short lowercase specific scope
  - imperative summary `<= 40` chars
  - 3–8 concise bullets when meaningful
  - no code fences or commentary
- PR content:
  - concise specific title
  - markdown body
  - short concrete `Summary` and `Testing`
  - no code fences or commentary
- Session titles:
  - prefer 2–4 words
  - specific and scannable
  - no quotes/markdown/commentary/trailing punctuation
  - stay below tested `< 25 characters` behavior and max-length clamp

## Drill-down guide

- Use `terminal_workspace/_index.md` for runtime architecture, persistence, focus rules, sidebar ordering, title/activity semantics, session commands, browser/T3 integration, and external bridges.
- Use `chat_history/_index.md` for conversation viewer flow, `window.find` search behavior, `resumeSession` payload/command construction, and the VSmux Search rename/package model.
- Use `git_text_generation/_index.md` for provider commands, low-effort defaults, output parsing rules, regex/pattern preservation, and the shared session-title generation pipeline.
