# zmux CLI

`scripts/zmux-cli.mjs` is a local debugging CLI for driving a running zmux app from the terminal.

It connects to the native host WebSocket bridge on `127.0.0.1:58743`, forwards commands into the sidebar runtime, and returns JSON. The goal is to create repeatable repros without manually clicking the app.

```sh
bun run cli -- state
# or
node scripts/zmux-cli.mjs state
```

## Requirements

- Start zmux first. The CLI talks to the running app; it does not launch it.
- Rebuild/restart zmux after changing the native host or sidebar command handler.
- Use `--port <number>` if the native bridge port changes.

## Session Actions

```sh
bun run cli -- create-session "Shell"
bun run cli -- create-session "Setup" --input "pwd"
bun run cli -- create-agent codex
bun run cli -- create-agent claude --group-id group-2
bun run cli -- run-agent codex
bun run cli -- run-command dev
```

`create-agent` and `run-agent` use the same configured sidebar agent button data as the UI.

## Focus And Navigation

```sh
bun run cli -- state
bun run cli -- focus-session s-260427-063318-da1
bun run cli -- focus-session --index 0
bun run cli -- focus-session --session-number 2
bun run cli -- focus-group group-2
bun run cli -- switch-project --path /Users/madda/dev/_active/zmux
bun run cli -- add-project /Users/madda/dev/_active/agent-tiler --name agent-tiler
```

## Sidebar Buttons

```sh
bun run cli -- click-button agent codex
bun run cli -- click-button command test
bun run cli -- click-button section agents
bun run cli -- toggle-section actions --collapsed true
bun run cli -- set-visible-count 2
bun run cli -- set-view-mode grid
bun run cli -- move-sidebar
```

Button commands call the same sidebar runtime paths as the UI button handlers.

## Terminal Input

```sh
bun run cli -- send-text s-260427-063318-da1 "hello"
bun run cli -- send-enter s-260427-063318-da1
bun run cli -- send-key s-260427-063318-da1 ctrl-c
bun run cli -- send-key s-260427-063318-da1 escape
bun run cli -- rename-command s-260427-063318-da1 "Investigate logs"
```

`rename-command` writes `/rename <title>`, waits one second, then sends Enter through the native Enter path.

## Session Management

```sh
bun run cli -- rename-session s-260427-063318-da1 "Local title"
bun run cli -- sleep-session s-260427-063318-da1 true
bun run cli -- favorite-session s-260427-063318-da1 true
bun run cli -- fork-session s-260427-063318-da1
bun run cli -- restart-session s-260427-063318-da1
bun run cli -- reload-session s-260427-063318-da1
bun run cli -- close-session s-260427-063318-da1
```

## Assertions

```sh
bun run cli -- assert-card s-260427-063318-da1 --agent-icon codex --agent-name codex --visible true
bun run cli -- wait-for s-260427-063318-da1 --agent-icon codex --timeout-ms 8000
```

These commands exit nonzero when the assertion fails.

## Evidence Capture

```sh
bun run cli -- screenshot ~/.zmux/cli/current.png
bun run cli -- logs --file agent-detection-debug.log --lines 200
bun run cli -- logs --file agent-detection-debug.log --grep sidebarCardProjection --json
bun run cli -- bundle ~/.zmux/cli/repro-agent-icon --lines 500
```

`bundle` writes:

- `state.json`
- `logs.json`
- `screenshot.png`

## Example Repro

```sh
bun run cli -- create-agent codex
bun run cli -- wait-for --index 0 --agent-icon codex --agent-name codex --timeout-ms 8000
bun run cli -- screenshot ~/.zmux/cli/codex-agent-card.png
bun run cli -- logs --file agent-detection-debug.log --lines 120
```

This creates a Codex session, waits until the sidebar card projection has Codex identity, captures the UI, and prints recent agent-detection logs.
