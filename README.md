# zmux - The IDE Integrated Agents Manager (CLIs & T3code)

Native ghostty terminals multiplexer and agent clis manager that integates with your IDE! (see screenshots)

## Install (macOS only for now. Need help with Windows/Linux ports)

```bash
brew install --cask maddada/tap/zmux
```

## Native Ghostty terminals that integrate that integrate with the sidebar
- Auto naming Codex/Claude/Gemini/Copilot terminal sessions (more soon).
- Auto sync of the terminal title and status with UI.
- Show status indicators for running/done.
- Allows up to 3x3 split and multiple groups per project each with different split

<img width="600" src="https://github.com/user-attachments/assets/61d2cdf4-dcaf-409a-a292-477e0f78baf5" />

## Shows a button on the attached IDE to show zmux.

- Follows your IDE size/position.
- Project in IDE & zmux is mirrored.
- Hotkey to hide/show.
- Click on your IDE to hide zmux

<img width="600" src="https://github.com/user-attachments/assets/e68f9cce-897b-4cc4-97fa-7d229fb62899" />

## Best features:

- Use the Ghostty (native) in a very organized way with splits/groups/workspaces
- Uses your own ghostty configuration out of the box
- Stay close to the code and edit it easily with the IDE attachment integration (Zed, VS Code, more soon!)
- Integrates with Chrome Canary as the "Agent Browser" (instructions below)
- Automatic agent session naming (Claude / Codex / Others)
- Automatic session resuming on restart
- Search all previous sessions
- Supports all agent clis (Codex/Claude/Pi/OpenCode/Copilot/Gemini/More) <- Please ask if missing any features
- 1 click actions (run commands, tests, etc.)
- Notification sounds for agent status or command completion
- Floating status indicators for all agents using companion app: (github.com/maddada/agent-manager-x)
- Rich text mode pop up (ctrl+g) <- in testing
- T3code sessions support <- in testing
- Much more!

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
bun storybook
```
