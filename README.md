# zmux - The IDE Integrated Agents Manager (CLIs & T3code) 

Native ghostty terminals multiplexer and agent clis manager that in


## Shows a button on the attached IDE to show zmux. Follows your IDE size/position. Project in IDE & zmux is mirrored. Hotkey to hide/show.
Click on your IDE to hide zmux

<img width="600" src="https://github.com/user-attachments/assets/e68f9cce-897b-4cc4-97fa-7d229fb62899" />

## Native Ghostty terminals that integrate that integrate with the sidebar
Auto naming Codex/Claude/Gemini/Copilot terminal sessions (more soon). Auto sync of the terminal title and status with UI. Show status indicators for running/done. 

<img width="600" src="https://github.com/user-attachments/assets/61d2cdf4-dcaf-409a-a292-477e0f78baf5" />

## Allows up to 3x3 split and multiple groups per project each with different split

<img width="600" src="https://github.com/user-attachments/assets/c223f789-d7ce-4f85-a742-3ed4f2368b51" />

## Integrates very well with Chrome Canary as the integrated browser (use it specifically for your agent)

<img width="600" src="https://github.com/user-attachments/assets/77f8cd07-e3fc-4c3f-9006-18c1835ff36f" />

### MCP setting to make Chrome Canary always used by your agent:

1. Ask the agent to use "Chrome Devtools MCP"
2. Enable remote debugging on Chrome Canary
3. Set your mcp to use canary channel:

#### For Claude Code:
~/.claude.json
```
{
  ...
  "mcpServers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--channel=canary",
        "--autoConnect"
      ],
      "env": {}
    },
    ...
  },
  ...
```

#### For Codex:
~/.codex/config.toml
```
[mcp_servers.chrome-devtools]
command = "npx"
enabled = true
args = [ "chrome-devtools-mcp@latest", "--auto-connect", "--channel=canary" ]
```

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
