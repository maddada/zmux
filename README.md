# VSmux: Manage all your CLI coding agents sessions without leaving your IDE.

> Current UI in v1.3 (still under development. Will be much nicer with time.)

![VSmux v1.3 Screenshot](media/1.3-screenshot.png)

---

Early version video showing the core experience of VSmux (will create a new video soon showing all of the new stuff):

https://x.com/i/status/2034602427442503890

---

## The shpeel:

This tool is for you if:

- You like to code using multiple agent CLIs in parallel.
- You don't want to be locked into a tool like conductor or superset or w/e.
- You don't want to be missing out on the new features that are coming to the CLIs first.
- You also love to be close to the code for some projects and review changes in your favorite editor (VS Code/Cursor/Antigravity/etc.)
- Like to use VS Code to edit the md files and prompts (ctrl+g) before sending them to the agent cli.

Then this is the extension for you! You get a very nice interface to work with your agents without having to jump between the editor and the ADE tool.

> Inspired by Antigravity agent panel, Codex app, T3Code, CMux, and Superset + many more.
>
> Based on zmx (tmux alternative) & ghostty 1.3. Persistent terminal sessions. Works with any agent CLI (Claude Code/Codex CLI/OpenCode/PI/etc.)

Btw can work with worktrees in VS Code very easily by enabling these setting:

---

## Recommended VS Code Setup

### 1. Enable Native Tabs

If you are on macOS, turn on VS Code's `window.nativeTabs` setting.

This makes it much easier to switch between projects, repos, and worktrees because each VS Code window can live in the same native tab strip. Instead of juggling separate windows, you can keep multiple VSmux workspaces open and move between them quickly with the normal macOS tab workflow.

### 2. Turn On Repositories Explorer for Worktrees

Enable `SCM > Repositories: Explorer`, and make sure `SCM > Repositories: Selection Mode` is set to `single`.

This exposes repository artifacts directly inside the Source Control UI, including branches, stashes, tags, and worktrees. It makes creating and managing Git worktrees much easier from the VS Code UI, without needing to drop into the terminal for every worktree action.

### 3. Set your $Editor in ~/.zshrc to your editor (code/cursor/etc.)

This lets you write your prompt inside your editor instead strugling with the annoying input box that these AI tools provide.
No more [50 lines pasted] nonsense. Paste all the lines you want and even select parts of them and use inline AI to edit those.

Gist on how to do this

---

## Companion App

VSmux works great with my other tool that shows all running agent sessions in a mini floating bar on macOS (with running/waiting/done indicators). Check it out here: https://github.com/maddada/agent-manager-x

---

## Contributions welcome 🙏🏻
