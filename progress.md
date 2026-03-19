# Progress

## Step 1 - Grid model and scaffolding

- Status: completed
- Goal: replace canvas-oriented workspace/contracts/package scaffolding with native terminal grid foundations.
- Planned files:
  - `package.json`
  - `extension/extension.ts`
  - `shared/session-grid-contract.ts`
  - `shared/terminal-host-protocol.ts`
- Verification:
  - grid snapshot contract added
  - package contributions replaced with the native workspace surface

## Step 2 - Native editor terminals

- Status: completed
- Goal: attach detached daemon sessions to native editor-area terminals and restore visible layout on activate.
- Verification:
  - detached daemon sessions now use `sessionId`
  - native editor-area terminal controller added

## Step 3 - Sidebar HUD and sessions list

- Status: completed
- Goal: add a left-sidebar webview with HUD summary and session actions.
- Verification:
  - sidebar webview provider added with HUD, visible-count controls, and session actions

## Step 4 - Cleanup and verification

- Status: completed
- Goal: remove remaining ghostty/webview build baggage, extract testable grid-state helpers, and run full checks.
- Verification:
  - canvas-only extension files deleted
  - dead `src/` canvas frontend deleted
  - `ghostty-web`, React, Tailwind, and webview-bundle dependencies removed from `package.json`
  - old frontend/config/assets removed: `components.json`, `index.html`, `vite.config.ts`, `vite.webview.config.ts`, `scripts/build-webview-for-debug.zsh`, `dist/webview/**`, `forks/ghostty-web/**`, and legacy `media/**` webview assets
  - pure grid-state helpers extracted to `shared/session-grid-state.ts`
  - targeted unit tests added in `shared/session-grid-state.test.ts`
  - reconnect logic now retries visible sessions that were cached as `disconnected` or `error`
  - explicit command-palette actions added for reveal session and restart session
  - stale compiled test artifact removed from `out/`
  - `vp check`: passed
  - `vp run compile`: passed
  - `vp test`: passed
  - `vp run vsix:package`: passed

## Step 5 - Compact sidebar interactions

- Status: completed
- Goal: replace sidebar session action buttons with direct card interactions and wire rename/close through workspace state plus the detached terminal host.
- Verification:
  - session cards now focus on single click, rename on double click, and close on top-right close button or middle click
  - sidebar no longer renders reveal/restart/focused/visible card controls
  - closing a session removes it from the stored grid, disposes any visible editor terminal projection, kills the daemon-backed shell when present, and refreshes the visible layout
  - renaming a visible session rebuilds its native terminal projection so the editor title updates
  - `vp check`: passed
  - `vp test`: passed
  - `vp run compile`: passed

## Step 6 - Sessions panel numbering

- Status: completed
- Goal: replace sidebar session identifiers with compact ordered numbers while still showing the session title separately.
- Verification:
  - sessions panel cards now render ordered `#1..#x` labels based on the current ordered session list
  - numbering naturally compacts after a session is closed because it is derived on each refresh
  - the session title remains visible on each card as secondary text instead of the primary identifier

## Step 7 - Background idle shutdown

- Status: completed
- Goal: let detached sessions expire after a configurable idle timeout once the last VS Code client disconnects.
- Verification:
  - added `VS-AGENT-MUX.backgroundSessionTimeoutMinutes` with a default of `0` for no expiry
  - terminal host protocol now supports live daemon configuration updates
  - the daemon starts a shutdown timer when the last authenticated client disconnects and cancels it on reconnect
  - when the timer expires, the daemon kills all tracked sessions and exits
  - `vp check`: passed
  - `vp run compile`: passed
  - `vp test`: passed

## Step 7 - Count, mode, and hotkey integration

- Status: completed
- Goal: expose `1/2/3/4/6/9` visible counts, `H/V/G` mode controls, and default hotkeys through the extension surface.
- Verification:
  - sidebar HUD now renders count buttons `1 2 3 4 6 9` plus mode buttons `H V G`
  - mode buttons post `setViewMode` and share selected-state styling with the count buttons
  - extension command registration now includes `showSix`, `showNine`, `setHorizontalView`, `setVerticalView`, and `setGridView`
  - package contributions now include the new commands and default `ctrl/cmd+alt` keybindings for counts and modes
  - `vp check`: passed
  - `vp test`: passed
  - `vp run compile`: passed

## Step 8 - React drag reorder sidebar

- Status: completed
- Goal: replace the inline sidebar script with a bundled React sidebar that supports local drag reorder and an explicit sync-to-panel action.
- Verification:
  - sidebar webview now loads a bundled React app built through `vite.sidebar.config.ts`
  - new sidebar source files added under `sidebar/` and bundled into `out/sidebar/sidebar.js` plus `out/sidebar/sidebar.css`
  - `extension/session-sidebar-view.ts` now serves the bundled webview assets instead of inline HTML/CSS/JS
  - added runtime deps `react`, `react-dom`, and `@dnd-kit/react`
  - added build-time deps `@vitejs/plugin-react`, `@types/react`, and `@types/react-dom`
  - `@dnd-kit/react` powers local drag reordering in the sidebar without immediately changing the displayed terminals
  - `Sync Positions` posts the committed full session order through `syncSessionOrder`
  - extension-side sidebar message validation now accepts `syncSessionOrder`
  - the sync action becomes disabled when the local order already matches the committed order
  - count buttons, mode buttons, focus/reveal, rename, close, and visible/hidden indicators remain available in the React sidebar
  - `vp check`: passed
  - `vp test`: passed
  - `vp run compile`: passed

## Step 9 - Resize replay guard

- Status: completed
- Goal: stop focus/layout churn from replaying duplicate prompt redraws into running sessions.
- Verification:
  - focus changes inside the same visible set now reuse existing terminal projections instead of rebuilding them
  - terminal resize callbacks now short-circuit identical dimensions and update local session dimensions before sending the resize
  - terminal bridge history replay is now guarded so a reused bridge only replays its saved buffer once

## Step 8 - Card-level visibility indicator

- Status: completed
- Goal: remove the HUD visible-slots summary and show visibility directly on each session card.
- Verification:
  - the sidebar HUD no longer renders the visible-slots section
  - each session card now shows a compact `Visible` or `Hidden` inline status next to its slot/status metadata
  - existing click, double-click, middle-click, close-button, count, and mode interactions remain intact

## Step 10 - Native terminal title sync

- Status: completed
- Goal: mirror owned native terminal title changes back into the stored session titles.
- Verification:
  - the workspace controller now listens to `window.onDidChangeTerminalState`
  - only terminals tracked in the extension's projection map can update a session title
  - terminal name changes persist through the session grid store and refresh the sidebar without rebuilding visible projections

## Step 11 - OSC title parsing for PTY terminals

- Status: completed
- Goal: update Pseudoterminal-backed session titles from OSC title escape sequences instead of relying on VS Code to infer them.
- Verification:
  - terminal bridge output now parses OSC `0` and `2` title sequences with BEL and ST terminators
  - parsed title sequences are stripped from bridged replay/live output before being written to the terminal UI
  - `Pseudoterminal.onDidChangeName` now emits parsed titles so the visible terminal editor title updates
  - parsed titles also persist back into the session grid store without rebuilding visible projections

## Step 11 - Sidebar HUD control polish

- Status: completed
- Goal: simplify the sidebar HUD and make the layout controls clearer and state-aware.
- Verification:
  - removed the focused-session title block from the HUD
  - added `Sessions Shown` above the visible count controls
  - added `Layout` above the `H/V/G` controls
  - layout controls now use Base UI tooltips from `@base-ui/react/tooltip` with labels `Horizontal`, `Vertical`, and `Grid`
  - when showing `1` session, all layout controls are disabled while the saved selection remains highlighted
  - when showing `2` sessions, `H` and `V` remain enabled while `G` is disabled but still rendered and can stay selected
  - `vp check`: passed
  - `vp test`: passed
  - `vp run compile`: passed

## Step 12 - Session card state styling

- Status: completed
- Goal: move visibility and focus indication onto the session cards themselves.
- Verification:
  - visible sessions now use the card background treatment instead of a separate inline `Visible/Hidden` badge
  - the focused session now uses a distinct outline/ring on the card so focus remains visible even when multiple sessions are shown
  - the compact sidebar card layout and existing interactions remain intact

## Step 13 - Automatic reorder sync

- Status: completed
- Goal: remove the manual reorder commit step so dragging a session card syncs the terminal order as soon as the drop finishes.
- Verification:
  - the sidebar no longer renders the `Sync Positions` button or keeps dirty/synced HUD state for reordering
  - drag end now updates the local draft order and immediately posts `syncSessionOrder` with the dropped order
  - server-state reconciliation remains intact so sidebar order still converges cleanly after hydrate/session updates

## Step 14 - Grid layout distinction and mode icons

- Status: completed
- Goal: make three-session grid view distinct from vertical mode and replace `H/V/G` text with layout icons.
- Verification:
  - three-session grid mode now uses a wrapped `2 + 1` layout instead of the same single-row arrangement as vertical mode
  - `shared/editor-layout.test.ts` now locks in the three-session grid row lengths and nested layout shape
  - the sidebar layout controls now render custom inline SVG icons instead of letter labels while keeping Base UI tooltips and selected-state styling intact

## Step 15 - Secondary sidebar default location

- Status: completed
- Goal: make the VS-AGENT-MUX sessions surface appear in the right-side secondary sidebar by default instead of the left activity bar.
- Verification:
  - the extension now contributes its custom view container through `contributes.viewsContainers.secondarySidebar`
  - the existing `VS-AGENT-MUXSessions` container id and `VS-AGENT-MUX.sessions` view id stay unchanged, so reveal commands continue to target the same view container

## Step 14 - HUD row stacking

- Status: completed
- Goal: keep the `Sessions Shown` and `Layout` control groups on separate rows in the sidebar HUD while preserving compact button rows within each section.
- Verification:
  - the HUD control wrapper now stacks the two sections vertically instead of placing them side by side
  - each control section still renders its buttons in a compact horizontal row when the sidebar width allows

## Step 15 - Inline session rename and compact cards

- Status: completed
- Goal: make double-click rename work directly inside the session card and finish compressing the sidebar cards into a two-line layout.
- Verification:
  - double clicking a session card now swaps the `#n` label for an inline text input inside that card
  - the inline rename field auto-focuses, selects the current title, saves on `Enter` and blur, and cancels on `Escape`
  - the existing `renameSession` sidebar message is still used; renaming only changes the session title, not the display number
  - session cards no longer render the slot label such as `R1C1`
  - the compact card body now renders as two lines: header row plus a single summary line containing title and status

## Step 16 - Double-click rename focus handling

- Status: completed
- Goal: stop single-click terminal activation from stealing focus before inline rename can open on double click.
- Verification:
  - sidebar session activation now distinguishes single click from double click with a short delayed single-click dispatch
  - double click cancels the pending single-click activation, opens inline rename, and still marks the session active through a preserve-focus terminal activation path
  - the extension now accepts an optional `preserveFocus` flag on `focusSession` sidebar messages and threads it through to visible terminal activation

## Step 17 - Dual-name session cards

- Status: completed
- Goal: split session naming into terminal-driven primary titles plus editable aliases, and simplify the card state treatment.
- Verification:
  - `SessionRecord` now persists both a primary `title` and a secondary `alias`
  - new sessions receive a deterministic default alias generated automatically at creation time
  - terminal title sync now updates only the primary title, while double-click rename edits only the alias
  - sidebar cards no longer render `#1/#2/...` labels or visible `running/stopped` text
  - session cards now fade visually when the backing session is not running
  - sidebar cards now render three compact lines: primary terminal title, alias/nickname, and slot label
  - `vp check`: passed
  - `vp test`: passed
  - `vp run compile`: passed

## Step 18 - Title-hover rename affordance

- Status: completed
- Goal: remove delayed single-click activation and move inline rename onto the nickname row itself.
- Verification:
  - session cards now activate immediately on single click without the delayed focus timer
  - session cards now use a pointer cursor instead of a grab cursor
  - hovering the nickname row reveals a lightweight caret affordance
  - clicking the nickname row enters inline rename mode without activating the terminal
  - clicking anywhere else on the card still activates the corresponding terminal immediately

## Step 19 - Rename target correction

- Status: completed
- Goal: move the hover caret and click-to-rename affordance from the secondary nickname row onto the terminal name row.
- Verification:
  - the session head now renders the primary terminal title as the rename trigger next to the close button
  - hovering or focusing the terminal title row reveals the caret affordance
  - clicking the terminal title row enters inline rename mode without activating the terminal
  - clicking elsewhere on the card still activates the terminal immediately

## Step 20 - Text-cursor rename affordance

- Status: completed
- Goal: remove the visual caret affordance from the terminal name row and rely on the mouse cursor to signal inline renaming.
- Verification:
  - the terminal name row no longer renders a caret icon
  - hovering the terminal name now uses the `text` cursor instead of an icon affordance
  - click-to-rename on the terminal name row remains intact

## Step 21 - Shortcut hint polish

- Status: completed
- Goal: make the per-session shortcut hint read like a compact hotkey badge in the bottom-right corner of each card.
- Verification:
  - session shortcut labels now use compact symbol text such as `⌘⌥1`
  - the shortcut hint now renders in very small muted text aligned to the bottom right of the card
  - the card layout and interactions remain unchanged

## Step 22 - Alias-first card rows

- Status: completed
- Goal: make the alias the editable first row and show the terminal-driven primary title only when it contains a real terminal-set value.
- Verification:
  - the editable alias now renders on the first row of the card and remains the only text changed by sidebar rename
  - the terminal-driven primary title now renders as the second row and is hidden when it only contains placeholder values such as `Session 1`
  - both the shared sidebar item shaping and the extension-side sidebar item creation now use the same helper to suppress placeholder primary titles
  - the compact shortcut hint remains in the bottom-right corner of the card
