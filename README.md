# zmux

Standalone Electrobun/Bun port scaffold for the copied zmux workarea, terminal panes, and sessions sidebar.

## Development

```bash
bun install
bun start
```

The first launch starts with only the vertical workspace dock. Click `+` to choose a project folder; zmux then hydrates the copied sidebar and terminal workarea for that workspace.

## Upstream Sync

Synced through demo-project/zmux `4.9.0` for the sidebar action-control cleanup and terminal runtime diagnostics work. The VS Code extension packaging and marketplace metadata stay out of this standalone Electrobun port.

## Port Notes

- Runtime VS Code imports are removed from the standalone source path.
- Workspace switching keeps previous workspaces hot while the app process is alive.
- After restart, only the last accessed workspace wakes automatically; other workspaces stay sleeping until selected.
- The browser sidebar section is hidden for now.
- T3 embed code is copied and preserved, but full managed T3 runtime wiring is deferred.
