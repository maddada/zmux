# Native VS Code Terminal Main Panel Plan

This note narrows the earlier native terminal layout options down to the parts that matter for the current direction.

## Goal

Replace the infinite canvas and custom `ghostty-web` terminal surface with VS Code's built-in terminals in the main editor area.

The target behavior is:

- a logical grid of up to `3x3` virtual terminals
- only `1`, `2`, `3`, or `4` terminals visible at a time
- fast jumping between terminals
- a floating status bar similar to the current app
- terminal sessions that stay alive across VS Code restarts
- a left sidebar panel that lists active sessions

## Relevant Platform Constraints

VS Code can place terminals in the editor area and split them relative to existing groups, but it does not expose freeform `x/y/width/height` placement.

That means:

- a fixed visible layout is realistic
- a logical virtual grid is realistic
- a true infinite canvas is not

For this plan, that is acceptable because the goal is no longer freeform spatial placement. The goal is a structured native terminal workspace in the main panel.

## Recommended Model

### 1. Logical `3x3` Virtual Grid

Keep a logical grid of up to `9` terminal slots in extension state.

Each slot should have:

- a stable logical coordinate such as `(row, column)`
- a persistent session identity
- metadata such as title, status, last activity, and visibility

This gives a stable virtual layout even when only some terminals are visible.

### 2. Visible Layouts Of `1-4` Terminals

Only materialize a small visible window in the editor area.

Recommended initial layouts:

- `1-up`: one terminal
- `2-up`: two side-by-side terminals
- `3-up`: three columns
- `4-up`: `2x2`

This matches the requirement to see `1`, `2`, `3`, or `4` terminals at a time while keeping all rendering native.

### 3. Main Panel Only

All visible terminals should live in the editor area.

Do not use the bottom terminal panel for this feature. The extension should create and manage editor-area terminals only.

## Navigation Model

The virtual grid should behave like a navigable workspace rather than a canvas.

Recommended interactions:

- jump directly to a terminal by slot or session
- move focus with directional commands
- switch which logical terminals are currently visible
- reveal a selected session from the sidebar panel

The important point is that navigation moves through a logical grid, not through a pannable surface.

## Persistence Across VS Code Restarts

If terminals need to survive a full VS Code restart, they should not be owned only by the VS Code window process.

The safest direction is to keep the current detached terminal-host model:

- run PTY sessions in a separate daemon process
- persist session metadata and history outside the webview
- reconnect from the extension when VS Code starts again
- recreate the visible editor-area terminals and bind them back to existing sessions

This is consistent with the current VS-AGENT-MUX architecture, where terminal sessions already live in a detached host process and can outlive a single UI instance.

The native-terminal version should keep that durability property and change only the presentation layer.

## Floating Status Bar

Keep a floating status bar overlay similar to the current app.

It should stay lightweight and focus on the visible workspace state, for example:

- current layout mode
- focused terminal
- visible slot range or selection
- session status indicators

This bar should complement the native terminals, not replace them.

## Left Sidebar Sessions Panel

Add a contributed view in the primary left sidebar that lists all active sessions.

The first version can stay simple and show:

- session name
- running state
- logical grid position
- whether the session is currently visible

Useful actions for the first pass:

- focus or reveal session
- restart session
- jump to session slot

This sidebar becomes the main overview for all active sessions while the editor area remains focused on the currently visible `1-4` terminals.

## What This Plan Does Not Need

This direction does not need:

- infinite canvas behavior
- arbitrary drag-to-position geometry
- mouse panning across a large terminal field
- all `9` terminals visible at once

Those ideas belong to the old canvas model, not the native-terminal model.

## Bottom Line

The cleanest native direction is:

- a logical `3x3` virtual terminal grid
- `1-4` visible terminals in editor groups
- editor-area only
- daemon-backed terminal persistence across restarts
- a floating status bar
- a left sidebar sessions panel

That preserves the structured multi-terminal workflow while dropping the complexity of the infinite canvas and custom terminal renderer.
