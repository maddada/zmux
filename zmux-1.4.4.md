# zmux 1.4.4

- Added Combined sidebar mode so native zmux can show one project group per project across all projects, while preserving Separated mode for the previous per-project layout.
- Added a Recent Projects drawer with fuzzy project/path search and startup cleanup for empty combined-mode projects.
- Added project context actions for opening project config, setting project theme, copying the project path, opening the folder in Finder, opening it in the selected IDE, and closing projects into Recent Projects.
- Improved native T3 Code runtime handling so fresh supervised runtimes are retained during startup/auth races, with explicit stop still available for recovery.
- Improved T3 thread changes by creating and syncing sidebar cards when the native host receives thread-change events.
- Fixed sidebar resize drags to use stable window coordinates so the sidebar does not jump while dragging.
- Added color-environment diagnostics for agent launches so monochrome CLI sessions can be traced to inherited terminal environment values.
- Added long-paste rename handling that summarizes pasted session text before syncing the rename into the agent CLI.
