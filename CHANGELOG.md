# Changelog

## 1.1.0 - 2026-04-29

<!-- CDXC:Distribution 2026-04-29-08:42: Release notes for 1.1.0 must include
all user-facing commits after v1.0.4 so README, GitHub, and Homebrew release
metadata describe the same shipped behavior. -->

- Added full-window native modals for Find Previous Session and T3 Thread ID entry.
- Improved previous-session search launching by routing modal input through the sidebar/native command bridge.
- Improved T3 session thread binding controls in the native sidebar workflow.
- Fixed agent wrapper process launch so interactive CLIs stay attached to the foreground terminal TTY and receive resize signals.
- Added agent wrapper debug logging for TTY/process details used to diagnose resize and child-process issues.
- Fixed native embedded terminal layout to step pane sizes to whole Ghostty character cells, including configured terminal padding.
- Expanded native terminal resize diagnostics with core Ghostty grid, padding, backing-pixel, and pane geometry metrics.

## 1.0.4 - 2026-04-28

<!-- CDXC:Distribution 2026-04-28-06:27: Release notes for 1.0.4 must be
derived from the commits after v1.0.3 so README, GitHub, and Homebrew users see
the same user-facing feature set. -->

- Added configurable app hotkeys, including native AppKit handling while terminal panes have focus.
- Added saved first-message metadata for agent sessions and a copyable "View 1st Message" modal in active and previous session flows.
- Added terminal workspace background color settings and native pane-gap/background rendering.
- Added automatic Zed workspace syncing after zmux workspace switches, controlled by a setting.
- Added native main-window size persistence between launches.
- Added native terminal search bar rendering and focus preservation improvements for modal workflows.
- Improved sidebar sessions to default to last-activity ordering and keep agent-icon mode blank for iconless sessions until hover.
- Expanded command/workspace icon choices and kept the icon picker search fixed while the icon list scrolls.
- Removed T3 Code from default sidebar agents while preserving existing T3 session recognition.
- Improved Previous Sessions by using the search field for "Find Session" prompts and keeping the native full-window modal compact.
- Added Scratch Pad focus diagnostics to help trace terminal-first-responder focus steals without logging note text.

## 1.0.3 - 2026-04-28

<!-- CDXC:Distribution 2026-04-28-16:00: Release notes must summarize the
user-facing changes added after v1.0.2 so GitHub, README, and Homebrew release
metadata describe the same shipped behavior. -->

- Added native terminal title bars with rename, fork, reload, sleep, and close actions.
- Added visible native Ghostty scrollbars and disabled middle-click paste in embedded terminals.
- Added workspace configuration for dock name, theme, Tabler icon, and uploaded image.
- Added `zmux-dev` build/run flavor with separate diagnostics storage and shared workspace/session state.
- Added shared sidebar storage files for projects, previous sessions, and settings outside WKWebView localStorage.
- Added managed native sidebar action sessions with command run indicators and close-on-exit behavior.
- Improved first-prompt auto-title logic so meaningful existing titles are not overwritten.
- Improved session rename modal Enter-key submission.
- Improved IDE attachment settings so Zed and Zed Preview are distinguishable.
- Removed the browser section tab-count badge.
- Removed persistent helper terminal mode in favor of the embedded Ghostty SurfaceView backend.
