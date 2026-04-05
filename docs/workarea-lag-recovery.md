# Workarea Lag Recovery

## Issue

VSmux can occasionally open a workspace webview in a degraded scheduler state. When that happens:

- terminal typing feels delayed or sticky
- terminal animations lag
- the rest of VS Code can still feel mostly normal
- closing and reopening the VSmux workarea immediately fixes it

The problem reproduced with both xterm.js and Restty, which strongly suggests the root issue is in the VS Code webview runtime or its timer scheduling behavior rather than in one specific terminal renderer.

## What Was Added

We added startup diagnostics and a recovery path with two modes:

- detect severe timer starvation during the first 10 seconds after a workarea boot
- automatically reload the workarea when that lag pattern is detected
- keep the older in-workarea notice UI available as a dormant fallback
- preserve focus on the last active terminal session after the reload
- keep debug logs that show when detection and reload happened

Relevant files:

- [workspace/workspace-app.tsx](/Users/madda/dev/_active/agent-tiler/workspace/workspace-app.tsx)
- [workspace/terminal-pane.tsx](/Users/madda/dev/_active/agent-tiler/workspace/terminal-pane.tsx)
- [extension/native-terminal-workspace/controller.ts](/Users/madda/dev/_active/agent-tiler/extension/native-terminal-workspace/controller.ts)
- [shared/workspace-panel-contract.ts](/Users/madda/dev/_active/agent-tiler/shared/workspace-panel-contract.ts)

## Why This Approach

The most reliable user workaround was already "close and reopen the workarea." The current fix automates that same recovery path instead of trying to patch around a webview runtime state that appears to live below app logic.

This is intentionally narrow:

- detection only watches startup, because the bug shows up on workarea initialization
- recovery only reloads once per boot
- the reload preserves the terminal session that was active when lag was detected

## Logs To Look For

Useful debug markers include:

- `terminal.schedulerLagDetected`
- `workspace.lagAutoReload`
- `controller.reloadWorkspacePanel.start`
- `controller.reloadWorkspacePanel.complete`
- `focus.autoFocusGuardArmed`

## How To Disable Auto Reload Later

If the workaround is no longer needed:

1. Open [workspace/workspace-app.tsx](/Users/madda/dev/_active/agent-tiler/workspace/workspace-app.tsx).
2. Change `AUTO_RELOAD_ON_LAG` from `true` to `false`.
3. Rebuild and reinstall the extension.

With that flag set to `false`, lag detection stops auto-reloading and the older reload notice UI becomes active again.
