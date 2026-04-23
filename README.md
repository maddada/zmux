# VSmux - Agent CLIs & T3code Manager (in your IDE!)

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
        <br />
        <strong>Download for Cursor / Antigravity / Others</strong><br />
      </a>
    </td>
  </tr>
</table>

## Screenshot

### Revamped UI:

<img width="3456" height="2063" alt="image" src="https://github.com/user-attachments/assets/5fcb8a4c-ebb0-408b-908d-565ddb5bdd77" />

### Agent Manager X Companion mac app: Shows floating status indicators for all cli agents at all times

<img width="1293" height="837" alt="image" src="https://github.com/user-attachments/assets/bdfc2e70-fa5a-4311-8bde-1c4d203bd18c" />

### Main features:

<img width="1000" alt="2026-0ffsafssfffsfs4-14_sfsdCodedsds_12-52-3d7@2x" src="https://github.com/user-attachments/assets/9ea0bcd8-38ea-4f87-9d78-ba91e76088c2" />

## Early Version Demo Video (Will rerecord soon)

https://github.com/user-attachments/assets/5b41df9a-bb2e-45f3-b8bd-ed3d6b7e2968

## Companion App

VSmux works great with my other tool that shows all running agent sessions in a mini floating bar on macOS (with running/waiting/done indicators). Check it out here: https://github.com/maddada/agent-manager-x

## Recent Updates

### 4.4.0

- Managed embedded sessions launch with bundled T3 Code, with better packaged-versus-checkout resolution.
- Embedded T3 reload, close, and thread-binding flows are safer and clearer, including visible reload state and confirmation before rebinding a live pane.
- Auto-sleep and detached background-session retention now have separate settings, so you can tune one without changing the other.
- Idle T3 sessions can join the auto-sleep flow.
- Sleeping T3 panes now tear down stale runtimes more cleanly and stay projected across inactive groups more reliably.
- Auto-sleep expanded to Claude and Codex sessions when `VSmux.autoSleepTimeoutMinutes` is enabled.
- Session handling is calmer overall, with double-click rename, steadier attention state, and better resume-command fallbacks for custom agents.

Full release notes: [CHANGELOG.md](./CHANGELOG.md)

## Who Is This For?

This extension is for you if:

- You like to code using multiple agent CLIs in parallel.
- You don't want to be locked into a tool like conductor or superset or w/e.
- You don't want to be missing out on the new features that are coming to the CLIs first.
- You also love to be close to the code for some projects and review changes in your favorite editor (VS Code/Cursor/Antigravity/etc.)
- You like editing prompts in a real VS Code modal instead of fighting tiny CLI input boxes. Press `Ctrl+G` to open the rich prompt editor, then press `Ctrl+G` again to save and close it back into the active session.

Then this is the extension for you! You get a very nice interface to work with your agents without having to jump between the editor and the ADE tool.

## Main Features at a Glance

| Feature                   | Description                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| **Remote Access**         | Control your sessions from your phone or another computer                                 |
| **Split Views**           | Put terminals/t3code chats side-by-side to monitor multiple tasks at once                 |
| **Universal Search**      | Find and access all your tool sessions from one central location                          |
| **Session Organization**  | Group and sort your workspace to keep it clutter-free                                     |
| **Resume Sessions**       | Instantly reload past sessions to pick up exactly where you left off                      |
| **Quick Launch**          | Quickly find and reopen closed sessions using just your keyboard                          |
| **Rich Prompt Editor**    | Open a VS Code modal prompt editor with `Ctrl+G`, then press `Ctrl+G` again to save/close |
| **Session Forking**       | Branch off an active session into a new terminal without losing your original context     |
| **Sleep Mode**            | Suspend inactive sessions to free up memory and boost system performance                  |
| **Custom AI Profiles**    | Create and manage distinct profiles for different AI models and specific use cases        |
| **Agent Handoff**         | Seamlessly transfer a conversation's context from one AI model directly to another        |
| **Custom Action Buttons** | Turn any terminal command into a clickable, customizable shortcut                         |
| **Pinned Prompts**        | Save frequently used instructions in the sidebar for quick access across projects         |
| **Integrated Browser**    | Save bookmarks, open localhost, use DevTools, all without alt tabbing                     |
| **Automated Git**         | Use built-in tools to automatically generate commit messages and push code                |
| **Change Monitoring**     | Track AI-driven code edits in a dedicated panel while working on other tasks              |
| **Advanced Settings**     | Highly configure the tool to match your exact workflow needs                              |

# Recommended VS Code Setup for Worktrees & Parallel Agents

### 1. Enable Native Tabs

If you are on macOS, turn on VS Code's `window.nativeTabs` setting.

This makes it much easier to switch between projects, repos, and worktrees because each VS Code window can live in the same native tab strip. Instead of juggling separate windows, you can keep multiple VSmux workspaces open and move between them quickly with the normal macOS tab workflow.

### 2. Turn On Repositories Explorer for Worktrees

Enable `SCM > Repositories: Explorer`, and make sure `SCM > Repositories: Selection Mode` is set to `single`.

This exposes repository artifacts directly inside the Source Control UI, including branches, stashes, tags, and worktrees. It makes creating and managing Git worktrees much easier from the VS Code UI, without needing to drop into the terminal for every worktree action.

### 3. Set your `$EDITOR` in `~/.zshrc` to your editor (code/cursor/etc.)

This lets you write your prompt inside your editor instead strugling with the annoying input box that these AI tools provide.
No more [50 lines pasted] nonsense. Paste all the lines you want and even select parts of them and use inline AI to edit those.

VSmux also supports its own rich prompt editor inside the workspace flow: press `Ctrl+G` to open the VS Code modal editor for the active prompt, and press `Ctrl+G` again to save and close it when you are ready to send.

Gist on how to do this: https://gist.github.com/maddada/6eec96f4c8b467b81d69d291d4ac130e

# Contributions Welcome

- Adding more agents
- Bug fixes
- Adding features (Send an issue first so we can discuss if it's a large feature)
