# Phase Progress And Decisions

## Current Goal

Close out the planned MVP phases from `mvp-plan.md` and keep the
implementation/docs aligned with the validated runtime behavior.

## Completed

- read the project and agent instructions relevant to TypeScript, React, and the
  Vite+ workflow
- ran `vp install`
- inspected the current repo shape and confirmed it was still the stock VS Code
  webview sample
- verified `vp build --watch` is available for a dedicated webview asset watcher
- inspected the installed `ghostty-web` package and confirmed Phase 1 can mount
  the real terminal renderer with placeholder/demo output
- moved the extension host implementation out of `src/` and into `extension/`
  so `src/` could become the actual Vite + shadcn frontend root
- added a shared canvas contract in `shared/canvas-contract.ts`
- wired a dedicated webview build config in `vite.webview.config.ts`
- initialized shadcn in Base UI mode with the `base-nova` preset
- added the Phase 1 baseline shell components through the shadcn registry flow:
  `button`, `tooltip`, `separator`, `card`, `badge`, `dropdown-menu`,
  `context-menu`, `dialog`, `tabs`, `scroll-area`, `skeleton`, and `empty`
- added shadcn `input` to support inline session renaming in tile headers
- replaced the sample VS-AGENT-MUX extension with an
  `VS-AGENT-MUX.openCanvasPanel` command and a reusable `WebviewPanel` host
- implemented a React canvas shell with toolbar, tile creation, tile focus,
  drag/resize, background pan, zoom controls, empty/loading states, and tile
  menus/context menus
- mounted real `ghostty-web` terminals in each tile with placeholder/demo output
  instead of fake terminal markup
- wired the extension host to persist workspace snapshots in `workspaceState`
  and rehydrate the panel on reopen/restore
- simplified the VS Code debug launch flow so `Run Extension` only runs the
  one-time webview build task before launch; extension watch stays manual to
  avoid the stuck launch behavior
- wrapped the debug webview build task in `scripts/build-webview-for-debug.zsh`
  so VS Code gets at most 5 seconds of prelaunch build time before the task
  exits
- fixed the canvas interaction layer so background dragging pans correctly,
  resize handles sit above the terminal surface, and Mac touchpad wheel/pinch
  gestures map to canvas pan and zoom
- lowered the minimum zoom to 25%, added double-click-to-rename on tile headers,
  and added tile-to-tile snapping during drag and resize
- added an `Auto align` toolbar action that snaps tiles into a cleaner layout
  while preserving the user's approximate row placement and size choices
- added a VS Code setting, `VS-AGENT-MUX.uiScale`, that controls the scale of
  the canvas UI chrome, and reduced the default tile size
- fixed `Auto align` so it infers rows from each tile's current `y` placement,
  snaps positions and dimensions to a grid, and only normalizes sizes when they
  are already close instead of collapsing everything into one compressed row
- updated `Auto align` again so it also infers shared columns from the starting
  `x` positions, reuses consistent column widths across rows, and regenerates
  the final layout from that inferred grid instead of doing row-local placement
- tightened `Auto align` column assignment so each row uses a contiguous span of
  inferred columns, which keeps the horizontal gaps uniform instead of leaving
  irregular empty-column holes inside a row
- smoothed canvas pinch zoom by removing coarse zoom rounding, normalizing wheel
  delta units, and increasing pinch sensitivity for Mac trackpad gestures
- fixed `Auto align` row placement so aligned rows use a consistent vertical gap
  instead of preserving oversized gaps from the original `y` positions
- updated `Auto align` so every tile in the same aligned row gets the same final
  height, instead of only using the tallest tile for row spacing
- replaced the old workspace-details dialog with a settings dialog that edits
  `VS-AGENT-MUX.uiScale` directly and lowered the default UI zoom to 0.60
- simplified the settings dialog by removing the stepper controls, extra reset
  action, and explanatory copy so it only exposes the saved UI zoom field
- added a versioned shared terminal-host protocol for daemon IPC and
  webview-extension terminal bridge messages
- added a detached local terminal-host daemon that owns PTY sessions through
  `@replit/ruspty`, persists per-session history/metadata under
  `globalStorageUri`, and serves a token-authenticated local socket protocol
- added an extension-side terminal session controller that reconciles canvas
  tiles to daemon sessions, batches terminal output to the webview, and
  debounces resize events before forwarding them to the PTY layer
- replaced the Phase 1 demo tile body with a live `ghostty-web` terminal that
  streams output from the extension bridge and sends keystrokes/resizes back to
  the extension host
- changed panel hydration so it now includes terminal session state alongside
  the persisted canvas snapshot and UI settings
- added an `VS-AGENT-MUX.terminalFontFamily` setting and defaulted terminal
  rendering to a Meslo Nerd Font stack
- added a real restart path for exited or failed tiles that recreates the
  daemon-backed session with the same tile ID
- added the first Phase 4 durability slice: the extension now drops the daemon
  connection when no host UI is active, the daemon keeps sessions alive behind a
  5-minute grace timer, and missing live sessions restore into a disconnected
  read-only tile state from persisted history instead of silently respawning
  shells
- added untrusted-workspace shell gating so new terminal spawns and restarts
  require an explicit one-time approval before VS-AGENT-MUX launches shells in
  an untrusted workspace
- added the contributed bottom-panel host plus single-active-host handoff
  commands for moving the canvas between the editor panel and bottom panel
- fixed host handoff so bottom-panel to panel moves no longer recreate live
  sessions or clear terminal state during hydrate/teardown races
- validated the installed VSIX path so packaged builds include the required
  `ghostty-web` WASM asset and local `ruspty` runtime pieces
- verified the planned MVP runtime flows manually, including live input/output,
  restart, reload/reattach, host switching, grace-window survival, disconnected
  restore behavior, and trusted/untrusted shell gating

## Decisions

- move the extension host out of `src/` instead of nesting the webview app
  elsewhere; this lets shadcn and Vite use the standard Vite app layout
- keep the extension host build isolated through `tsconfig.extension.json` and
  use `vite.webview.config.ts` for the frontend bundle
- keep long-running watch tasks out of the `F5` prelaunch chain; a one-time
  webview build is acceptable, but extension watch stays manual because the task
  handoff was causing debug launch to get stuck
- guard the one-time debug webview build with a 5-second wrapper so the launch
  is not blocked indefinitely if VS Code keeps the task open
- use the `base-nova` shadcn preset for Phase 1 Base UI
- build the webview into `dist/webview` and have the extension host serve those
  fixed assets with a CSP-safe HTML wrapper
- persist canvas state through the extension host and webview local state on a
  short debounce instead of every pointer event
- use a real `ghostty-web` terminal per tile in read-only demo mode so Phase 1
  validates renderer lifecycle before PTY integration
- use tile-aware hit testing for background pan instead of relying on
  `event.target === event.currentTarget`, because transformed canvas layers and
  overlay elements break that assumption
- treat touchpad wheel events as viewport pan and `ctrl+wheel` pinch gestures as
  cursor-centered zoom on the canvas surface
- keep pinch zoom continuous by avoiding coarse zoom quantization and normalizing
  wheel delta modes before applying the sensitivity multiplier
- keep tile titles editable inline with a controlled rename state rather than a
  separate dialog, because rename is a direct tile operation
- snap tile edges to neighboring tile edges during drag and bottom-right resize
  when they fall within a small threshold, rather than using a coarse grid
- treat `Auto align` as a position-preserving cleanup pass: infer rows from the
  user's approximate `y` placements, snap layout to a coarse grid, keep the
  tallest tile as the row height, and only harmonize sizes that are already
  close to the row median
- infer global column anchors for `Auto align` from the starting `x` positions,
  then place every row against those shared column widths and `x` offsets so
  rows line up as a real grid while staying near the original layout
- keep `Auto align` spacing uniform by assigning each row to one contiguous run
  of inferred columns instead of letting rows skip columns and create oversized
  gaps between neighboring tiles
- use the starting layout to infer row order, but regenerate final row `y`
  positions with a uniform vertical gap so `Auto align` does not keep accidental
  large spaces between rows
- when `Auto align` resolves a row, apply one shared row height to every tile in
  that row so neighboring terminals line up cleanly along both top and bottom
- source UI chrome scale from a contributed VS Code setting and push it through
  the extension-to-webview hydrate payload so changes apply without rebuilding
- let the webview settings dialog update `VS-AGENT-MUX.uiScale` directly so the
  canvas chrome can be tuned in-app while still persisting to VS Code settings
- keep the settings dialog minimal: numeric input plus save action, with a bit
  more breathing room under the sidebar settings trigger row
- reduce default tile dimensions and the auto-align layout dimensions so the
  canvas starts denser by default
- keep the existing snapshot-driven tile lifecycle for now and infer terminal
  session creation/destruction in the extension host by reconciling tile IDs,
  rather than introducing a separate create-tile RPC before the rest of Phase 2
  is stable
- launch the terminal-host daemon as a detached Node child process supervised by
  the extension host and communicate over a token-authenticated local socket, so
  terminal sessions can outlive a single webview instance without requiring the
  webview to know anything about daemon lifecycle
- use `@replit/ruspty` as the PTY backend for the daemon and keep a tiny local
  shim so the extension always imports the wrapper API instead of the raw native
  binding entrypoint
- keep terminal output out of React state after initial hydration and stream it
  directly into each `ghostty-web` instance via window messages, so the canvas
  does not rerender on every PTY data burst

## Validation

- `vp run compile` passes
- `vp check` passes
- `vp build --config vite.webview.config.ts` passes
- `vp test` currently exits with "No test files found"
- webview build currently emits a large `index.js` bundle because `ghostty-web`
  is included eagerly; this remains true after the live-terminal wiring and
  should be revisited if startup cost becomes noticeable

## Open Work

- add automated tests for host handoff, reload/reattach, and disconnected
  restore flows to reduce regression risk
- decide whether to lazy-load `ghostty-web` or split bundle chunks now that the
  installed VSIX path and runtime behavior are stable
