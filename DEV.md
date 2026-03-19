# Development Guide

This repo is now extension-only. There is no separate canvas app or terminal webview bundle.

## Project Shape

- `extension/`: VS Code extension host code
- `shared/`: shared contracts and pure grid-state logic
- `out/`: compiled extension output
- `media/VS-AGENT-MUX.svg`: activity-bar icon

## Setup

Run this once after pulling changes:

```bash
vp install
```

## Local Development

1. Run `vp run watch` in a terminal if you want automatic extension recompiles.
2. Press `F5` in VS Code to launch an Extension Development Host.
3. In the Extension Development Host, run `VS-AGENT-MUX: Open Workspace`.

If the Extension Development Host does not pick up a rebuild automatically, run
`Developer: Reload Window` there.

## Validation

```bash
vp check
vp run compile
vp test
```

Current note:

- `vp test` runs the unit tests for the pure grid-state logic in `shared/session-grid-state.ts`.
- `VS-AGENT-MUX.backgroundSessionTimeoutMinutes` controls how long the detached daemon keeps sessions alive after the last VS Code client disconnects. `0` disables expiry.

Testing scope:

- slot allocation stays row-major across the `3x3` grid
- visible-count normalization keeps focus visible
- revealing an offscreen session swaps it into the focused visible pane
- directional navigation follows the logical grid first, then nearest fallback

## Packaging

```bash
vp run vsix:package
vp run vsix:install
```
