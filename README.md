# ZMUX - Native Ghostty Fork with an IDE Integrated Agents Manager

<img width="1295" height="953" alt="image" src="https://github.com/user-attachments/assets/7ed8791d-eae2-4951-a417-27f4b217eb9e" />

## Install (macOS only for now. Need help with Windows/Linux ports)

```bash
brew install --cask maddada/tap/zmux
```

## Screenshots:

- Auto naming Codex/Claude/Gemini/Copilot terminal sessions (more soon).
- Auto sync of the terminal title and status with UI.
- Show status indicators for running/done.
- Allows up to 3x3 split and multiple groups per project each with different split

## Combined Mode (default, all projects in 1 sidebar):

<img width="3456" height="2234" alt="2026-05-06_zmux_01-50-19@2x" src="https://github.com/user-attachments/assets/4e9b06f4-a1d8-4f43-b77e-95c32f7ab566" />

## Separated Mode (each workspace is separate tab):

<img width="600" src="https://github.com/user-attachments/assets/61d2cdf4-dcaf-409a-a292-477e0f78baf5" />

## Shows a button on the attached IDE to show zmux.

- Follows your IDE size/position.
- Project in IDE & zmux is mirrored.
- Hotkey to hide/show.
- Click on your IDE to hide zmux

<img width="600" src="https://github.com/user-attachments/assets/e68f9cce-897b-4cc4-97fa-7d229fb62899" />

## Best features:

- Native Sparkle updates for macOS releases.
- Native T3 Code panes with managed runtime bootstrap, authenticated thread routing, and remote/browser access links.
- Optional Browser Panes mode opens browser actions as workspace panes with address navigation, reload, DevTools, React Grab, profiles, and favicon-backed sidebar cards.
- Sidebar Actions and Open In split controls can run the primary command or show React-rendered dropdown menus for Finder, Visual Studio Code, and Zed.
- Combined sidebar mode shows one project group per project across all projects, with Separated mode still available.
- Recent Projects keeps closed or empty combined-mode projects available with fuzzy project/path search.
- Previous Sessions can restore archived terminal sessions with agent identity, first-message metadata, title provenance, favorites, and resume inputs.
- Workspace theme menus can set preset themes or custom colors that tint the dock, project headers, and active workspace sidebar surfaces.
- Empty Combined-mode project and Chats groups auto-collapse while empty and expand when sessions appear.
- Sparse Combined sidebars stay pinned instead of rubber-banding when collapsed project lists fit the viewport.
- Project context menus can set project theme, copy path, open in Finder, open in a specific IDE, or close a project into Recent Projects.
- Native draggable workspace pane resizing for Ghostty and web panes.
- Native pane header drag-to-reorder across terminal, T3, and browser panes.
- Native T3 runtime retention keeps supervised T3 Code panes alive through startup/auth races and syncs thread changes back into the sidebar.
- Codex first-prompt auto-title hooks are installed into profile homes as well as the default Codex home.
- Native IDE attachment controls with an optional hidden title-bar attach button.
- Standard macOS app menu with Settings and Check for Updates.
- Focus-safe native layout sync avoids stealing typing focus during passive terminal status updates.
- Embedded Ghostty terminals strip inherited color-disabling environment keys so agent CLIs keep color output.
- Agent launch diagnostics record inherited color-related environment values for debugging monochrome CLI sessions.
- Workspace dock highlights the active project and dims inactive project icons.
- Rich text mode pop up (ctrl+g) <- in testing
- T3code sessions support <- in testing
- Much more!

## Integrates with Chrome Canary as the dedicated agent browser (instructions below)

Note: Would be really easy to add a browser like cmux does but it would be Safari which I don't like. Let me know if you really need this. 

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
