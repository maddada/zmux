# Agent Canvas X

![Agent Canvas X demo](demo.gif)

Agent Canvas X turns VS Code into a fast multi-session terminal workspace. It keeps up to nine shell sessions organized in a logical `3x3` grid, lets you show `1`, `2`, `3`, `4`, `6`, or `9` sessions at a time, and gives you quick layout switching between horizontal, vertical, and grid views.

Unlike a normal terminal tab workflow, Agent Canvas X is built for keeping several long-running agent, coding, or shell sessions alive and easy to jump between. Sessions can stay attached to the workspace across reloads and restarts, and the sidebar gives you a compact control surface for focusing, renaming, reordering, and managing them.

## What It Does

- Creates a dedicated multi-session terminal workspace inside VS Code
- Shows sessions in native editor-area terminals instead of a custom terminal UI
- Supports `1 / 2 / 3 / 4 / 6 / 9` visible-session layouts
- Lets you switch layouts instantly between horizontal, vertical, and grid modes
- Keeps session order and focus state organized from the sidebar
- Supports session nicknames, drag reordering, restart, reveal, and reset actions
- Can keep detached sessions alive after reloads and restart them into place on reopen
- Places the sessions view in the right-side secondary sidebar for quick access

## Recommended VS Code Setup

### 1. Enable Native Tabs

If you are on macOS, turn on VS Code's `window.nativeTabs` setting.

This makes it much easier to switch between projects, repos, and worktrees because each VS Code window can live in the same native tab strip. Instead of juggling separate windows, you can keep multiple Agent Canvas X workspaces open and move between them quickly with the normal macOS tab workflow.

### 2. Turn On Repositories Explorer for Worktrees

Enable `SCM > Repositories: Explorer`, and make sure `SCM > Repositories: Selection Mode` is set to `single`.

This exposes repository artifacts directly inside the Source Control UI, including branches, stashes, tags, and worktrees. It makes creating and managing Git worktrees much easier from the VS Code UI, without needing to drop into the terminal for every worktree action.

## Recommended Hotkeys

On macOS, the extension ships with these default shortcuts:

- `cmd + option + 1` = show 1 session
- `cmd + option + 2` = show 2 sessions
- `cmd + option + 3` = show 3 sessions
- `cmd + option + 4` = show 4 sessions
- `cmd + option + 6` = show 6 sessions
- `cmd + option + 9` = show 9 sessions
- `cmd + option + h` = horizontal layout
- `cmd + option + v` = vertical layout
- `cmd + option + g` = grid layout
- `cmd + option + r` = rename active session
- `cmd + option + f` = full screen the focused Agent Canvas X terminal session, or fall back to VS Code panel/editor maximize when a terminal is not focused

On Windows and Linux, the extension uses the same defaults with `ctrl + alt` instead of `cmd + option`.

## Copy-Paste Keybindings JSON

Paste this into your VS Code `keybindings.json` on macOS (find replace cmd with ctrl on windows/linux):

```json
[
  {
    "key": "cmd+alt+1",
    "command": "agentCanvasX.showOne",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+2",
    "command": "agentCanvasX.showTwo",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+3",
    "command": "agentCanvasX.showThree",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+4",
    "command": "agentCanvasX.showFour",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+6",
    "command": "agentCanvasX.showSix",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+9",
    "command": "agentCanvasX.showNine",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+h",
    "command": "agentCanvasX.setHorizontalView",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+v",
    "command": "agentCanvasX.setVerticalView",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+g",
    "command": "agentCanvasX.setGridView",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+r",
    "command": "agentCanvasX.renameActiveSession",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+f",
    "command": "agentCanvasX.toggleFullscreenSession",
    "when": "terminalFocus"
  },
  {
    "key": "cmd+alt+f",
    "command": "workbench.action.toggleMaximizedPanel",
    "when": "panelFocus && !terminalFocus"
  },
  {
    "key": "cmd+alt+f",
    "command": "workbench.action.toggleMaximizeEditorGroup",
    "when": "!panelFocus && !terminalFocus"
  }
]
```

## Getting Started

1. Open the Command Palette.
2. Run `Agent Canvas X: Open Workspace`.
3. Create your first session.
4. Use the sidebar and hotkeys to change the number of visible sessions and switch layouts.

## Settings

- `agentCanvasX.backgroundSessionTimeoutMinutes`: controls how long detached background sessions stay alive after the last Agent Canvas X window disconnects
- `agentCanvasX.sidebarTheme`: changes the sidebar theme preset
- `agentCanvasX.showCloseButtonOnSessionCards`: shows or hides the close button on session cards
- `agentCanvasX.sendRenameCommandOnSidebarRename`: stages `/rename <new name>` in the terminal when you rename from the sidebar
