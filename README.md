# VSmux - T3code & Agent CLIs Manager

> Manage all your CLI coding agent sessions without leaving your IDE.

Download links:

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://marketplace.visualstudio.com/items?itemName=maddada.VSmux">
        <img src="./media/readme-download-vscode-tile.png" alt="Visual Studio Code" width="80" /><br />
        <strong>Download for VS Code</strong><br />
        Extensions Marketplace
      </a>
    </td>
    <td align="center" width="50%">
      <a href="https://open-vsx.org/extension/maddada/VSmux">
        <img src="./media/readme-download-cursor-tile.png" alt="Cursor" width="80" />
        <img src="./media/readme-download-antigravity-tile.png" alt="Antigravity" width="80" />
        <img src="./media/readme-download-windsurf-tile.png" alt="Windsurf" width="80" />
        <br />
        <strong>Download for Cursor / Antigravity / Others</strong><br />
        Open VSX Registry
      </a>
    </td>
  </tr>
</table>

## Screenshot

<img width="1000" alt="2026-0ffsafssfffsfs4-14_sfsdCodedsds_12-52-3d7@2x" src="https://github.com/user-attachments/assets/9ea0bcd8-38ea-4f87-9d78-ba91e76088c2" />

---

## Recent Updates

### 4.4.0

- Managed embedded sessions can launch with bundled DP Code or bundled T3 Code, with better packaged-versus-checkout resolution.
- Embedded T3 reload, close, and thread-binding flows are safer and clearer, including visible reload state and confirmation before rebinding a live pane.

### 4.3.1

- Idle T3 sessions can join the opt-in auto-sleep flow.
- Sleeping T3 panes now tear down stale runtimes more cleanly and stay projected across inactive groups more reliably.

### 4.3.0

- Auto-sleep expanded to Claude and Codex sessions when `VSmux.backgroundSessionTimeoutMinutes` is enabled.
- Session handling is calmer overall, with double-click rename, steadier attention state, and better resume-command fallbacks for custom agents.

Full release notes: [CHANGELOG.md](./CHANGELOG.md)

## Early Version Demo Video (Will rerecord soon)

https://github.com/user-attachments/assets/5b41df9a-bb2e-45f3-b8bd-ed3d6b7e2968

---

## Who Is This For?

This extension is for you if:

- You like to code using multiple agent CLIs in parallel.
- You don't want to be locked into a tool like conductor or superset or w/e.
- You don't want to be missing out on the new features that are coming to the CLIs first.
- You also love to be close to the code for some projects and review changes in your favorite editor (VS Code/Cursor/Antigravity/etc.)
- Like to use VS Code to edit the md files and prompts (ctrl+g) before sending them to the agent cli.

Then this is the extension for you! You get a very nice interface to work with your agents without having to jump between the editor and the ADE tool.

> Inspired by Antigravity agent panel, Codex app, T3Code, CMux, and Superset + many more.

---

## Main Features at a Glance

- **Remote access**: Access your T3code & Agent CLI sessions from your phone/another machine (Overflow menu -> Remote Access)
- **Multiplexed Split Views**: Split your workspace into multiple panes (e.g., view 2 up to 9 sessions at once) to monitor and interact with several tasks simultaneously, complete with per-pane zoom controls for easier reading.
- **Unified Session Search & History**: Quickly search across all your sessions from various tools (WSL, Cloud Code, Codex) in one centralized location, rather than hunting through different tabs.
- **Session Management & Organization**: Group, sort manually, or organize your sessions by recent activity to maintain a tidy workspace.
- **Session Resumption**: Click on any past session from the history to instantly reload it and pick up exactly where you left off with the original AI agent.
- **Quick Search & Launch**: Start typing the name of a closed session to quickly locate and reload it using just your arrow keys and the Enter button.
- **Session Forking**: Branch off from an active session to retain its current context, allowing you to explore a new task or idea in a separate pane without altering the original chat.
- **RAM/Resource Saver (Sleep Mode)**: Put inactive sessions to sleep to instantly free up memory (noted as roughly a 25% drop in RAM usage), ensuring background tasks don't slow down your machine.
- **Customizable AI Agents**: Add, configure, and modify distinct profiles for various AI models. You can set up custom paths, run different agents side-by-side, or create specific profiles (like "work" vs. "personal").
- **Cross-Agent Context Handoff**: Transfer the context of an active conversation from one AI model (e.g., GPT) directly to another (e.g., Claude) to continue the work seamlessly.
- **Custom Action Buttons**: Map any terminal command to a clickable, draggable button. These custom actions can be configured to execute commands automatically, play a notification sound upon completion, or close when finished.
- **Pinned Prompts**: Save reusable prompts directly in the sidebar so common instructions stay available across projects without digging through old notes.
- **Integrated Browser**: Open web environments (like your localhost) directly within a VSmux pane. The browser remembers login states and includes a DevTools console, allowing you to select and send specific HTML elements directly to your AI agents.
- **Automated Git Operations**: Built-in actions to automatically generate commit messages and push code changes.
- **Code Change Monitoring**: Keep an eye on the codebase modifications your agents are making in a dedicated bottom-left panel while simultaneously directing other agents on separate tasks.
- **Customizable Settings**: A robust settings menu that allows you to heavily configure the extension to fit your specific workflow preferences.

---

## Getting Started

1. Open the Command Palette.
2. Run `VSmux: Open Workspace`.
3. Create your first session.
4. Use the sidebar and hotkeys to change the visible split count and jump between sessions and groups.

---

## Recommended VS Code Setup for Worktrees & Parallel Agents

### 1. Enable Native Tabs

If you are on macOS, turn on VS Code's `window.nativeTabs` setting.

This makes it much easier to switch between projects, repos, and worktrees because each VS Code window can live in the same native tab strip. Instead of juggling separate windows, you can keep multiple VSmux workspaces open and move between them quickly with the normal macOS tab workflow.

### 2. Turn On Repositories Explorer for Worktrees

Enable `SCM > Repositories: Explorer`, and make sure `SCM > Repositories: Selection Mode` is set to `single`.

This exposes repository artifacts directly inside the Source Control UI, including branches, stashes, tags, and worktrees. It makes creating and managing Git worktrees much easier from the VS Code UI, without needing to drop into the terminal for every worktree action.

### 3. Set your `$EDITOR` in `~/.zshrc` to your editor (code/cursor/etc.)

This lets you write your prompt inside your editor instead strugling with the annoying input box that these AI tools provide.
No more [50 lines pasted] nonsense. Paste all the lines you want and even select parts of them and use inline AI to edit those.

Gist on how to do this: https://gist.github.com/maddada/6eec96f4c8b467b81d69d291d4ac130e

## Companion App

VSmux works great with my other tool that shows all running agent sessions in a mini floating bar on macOS (with running/waiting/done indicators). Check it out here: https://github.com/maddada/agent-manager-x

## Contributions Welcome

Contributions welcome 🙏🏻
