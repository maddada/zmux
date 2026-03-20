# VSmux

![VSmux demo](demo.gif)

VSmux turns VS Code into a fast multi-session terminal workspace. It keeps up to nine shell sessions organized in a logical `3x3` grid, lets you show `1`, `2`, `3`, `4`, `6`, or `9` sessions at a time, and gives you quick layout switching between horizontal, vertical, and grid views.

Unlike a normal terminal tab workflow, VSmux is built for keeping several long-running agent, coding, or shell sessions alive and easy to jump between. Sessions can stay attached to the workspace across reloads and restarts, and the sidebar gives you a compact control surface for focusing, renaming, reordering, and managing them.

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

This makes it much easier to switch between projects, repos, and worktrees because each VS Code window can live in the same native tab strip. Instead of juggling separate windows, you can keep multiple VSmux workspaces open and move between them quickly with the normal macOS tab workflow.

### 2. Turn On Repositories Explorer for Worktrees

Enable `SCM > Repositories: Explorer`, and make sure `SCM > Repositories: Selection Mode` is set to `single`.

This exposes repository artifacts directly inside the Source Control UI, including branches, stashes, tags, and worktrees. It makes creating and managing Git worktrees much easier from the VS Code UI, without needing to drop into the terminal for every worktree action.

## Recommended Hotkeys

On macOS, the extension ships with these default shortcuts:

- `ctrl + option + shift + 1` = focus group 1
- `ctrl + option + shift + 2` = focus group 2
- `ctrl + option + shift + 3` = focus group 3
- `ctrl + option + shift + 4` = focus group 4
- `cmd + option + 1` through `cmd + option + 9` = focus session slot 1 through 9 inside the active group
- `cmd + option + shift + 6` = show 6 sessions
- `cmd + option + shift + 9` = show 9 sessions
- `cmd + option + h` = horizontal layout
- `cmd + option + v` = vertical layout
- `cmd + option + g` = grid layout
- `cmd + option + r` = rename active session
- `cmd + option + f` = full screen the focused VSmux terminal session, or fall back to VS Code panel/editor maximize when a terminal is not focused
- `cmd + option + =` = increase terminal font size only
- `cmd + option + -` = decrease terminal font size only

On Windows and Linux, the extension uses the same defaults with `ctrl + alt` instead of `cmd + option`, and keeps `ctrl + alt + shift + 1..4` for group switching.

## Copy-Paste Keybindings JSON

Paste this into your VS Code `keybindings.json` on macOS (find replace cmd with ctrl on windows/linux):

```json
[
  {
    "key": "ctrl+alt+shift+1",
    "command": "VSmux.focusGroup1",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "ctrl+alt+shift+2",
    "command": "VSmux.focusGroup2",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "ctrl+alt+shift+3",
    "command": "VSmux.focusGroup3",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "ctrl+alt+shift+4",
    "command": "VSmux.focusGroup4",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+1",
    "command": "VSmux.focusSessionSlot",
    "args": 1,
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+2",
    "command": "VSmux.focusSessionSlot",
    "args": 2,
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+3",
    "command": "VSmux.focusSessionSlot",
    "args": 3,
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+4",
    "command": "VSmux.focusSessionSlot",
    "args": 4,
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+6",
    "command": "VSmux.showSix",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+9",
    "command": "VSmux.showNine",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+h",
    "command": "VSmux.setHorizontalView",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+v",
    "command": "VSmux.setVerticalView",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+g",
    "command": "VSmux.setGridView",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+r",
    "command": "VSmux.renameActiveSession",
    "when": "!inputFocus || terminalFocus"
  },
  {
    "key": "cmd+alt+f",
    "command": "VSmux.toggleFullscreenSession",
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
  },
  {
    "key": "cmd+alt+=",
    "command": "workbench.action.terminal.fontZoomIn",
    "when": "terminalFocus"
  },
  {
    "key": "cmd+alt+-",
    "command": "workbench.action.terminal.fontZoomOut",
    "when": "terminalFocus"
  }
]
```

## Getting Started

1. Open the Command Palette.
2. Run `VSmux: Open Workspace`.
3. Create your first session.
4. Use the sidebar and hotkeys to change the number of visible sessions and switch layouts.

## Settings

- `VSmux.backgroundSessionTimeoutMinutes`: controls how long detached background sessions stay alive after the last VSmux window disconnects
- `VSmux.sidebarTheme`: changes the sidebar theme preset
- `VSmux.experimentalZmxActionDelayMs`: experimental zmx-only debug delay added before each VSmux terminal UI action; set it to `1000` to slow the sequence by 1 second per step
- `VSmux.experimentalParkHiddenZmxTerminalsInPanel`: experimental zmx-only toggle that keeps hidden sessions alive in the bottom terminal panel and moves them into editor groups when they become visible
- `VSmux.showCloseButtonOnSessionCards`: shows or hides the close button on session cards
- `VSmux.sendRenameCommandOnSidebarRename`: stages `/rename <new name>` in the terminal when you rename from the sidebar
